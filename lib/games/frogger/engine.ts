import {
  CELL,
  COLS,
  GOAL_STARTS,
  GOAL_W,
  JUMP_MS,
  LIVES,
  POINTS_GOAL,
  POINTS_ROUND,
  POINTS_ROW,
  POINTS_TIME,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_SAFE_MID,
  ROW_START,
  START_COL,
  STATS_EVERY_MS,
  TIME_BASE_S,
  TIME_MIN_S,
  TIME_STEP_S,
  TURTLE_SUBMERGED_MS,
  TURTLE_VISIBLE_MS,
  W,
} from "./constants";
import { getSupport, goalIndex, roadCollision } from "./collisions";
import { buildLanes, LOOP } from "./lanes";
import type { Direction, Entity, Frog, Lane } from "./types";
import type { GameCallbacks, GameEngine, SkinId } from "../types";
import { PALETTES } from "./skins";
const KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const DELTA: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const ANGLE: Record<Direction, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};
const CYCLE = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
const timeFor = (lvl: number) =>
  Math.max(TIME_MIN_S, TIME_BASE_S - TIME_STEP_S * (lvl - 1)) * 1000;
const newFrog = (): Frog => ({
  col: START_COL,
  row: ROW_START,
  animating: false,
  animT: 0,
  targetCol: START_COL,
  targetRow: ROW_START,
});
export function createFrogger(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
  _aux?: HTMLCanvasElement | null,
  skin: SkinId = "clasico",
): GameEngine {
  let pal = PALETTES[skin];
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  let frog = newFrog();
  let facing: Direction = "up";
  let pendingDir: Direction | null = null;
  let lanes: Lane[] = [];
  let goals: boolean[] = [];
  let bestRow = ROW_START; // fila más alta alcanzada en la ronda
  let score = 0;
  let lives = LIVES;
  let level = 1;
  let time = 0; // ms restantes de la ronda
  let timeMax = 0;
  let over = false;
  let paused = false;
  let statsT = 0;
  let rafId = 0;
  let lastTime: number | null = null;
  let last = { score: -1, lives: -1, level: -1 };
  const emit = () => {
    if (score === last.score && lives === last.lives && level === last.level)
      return;
    if (statsT < STATS_EVERY_MS && lives === last.lives && level === last.level)
      return;
    statsT = 0;
    last = { score, lives, level };
    cb.onStats({ score, lives, level });
  };
  function initGame() {
    frog = newFrog();
    facing = "up";
    pendingDir = null;
    score = 0;
    lives = LIVES;
    level = 1;
    lanes = buildLanes(level);
    goals = GOAL_STARTS.map(() => false);
    bestRow = ROW_START;
    timeMax = time = timeFor(level);
    over = false;
    statsT = STATS_EVERY_MS;
    last = { score: -1, lives: -1, level: -1 };
    emit();
  }
  function resetFrog() {
    frog = newFrog();
    facing = "up";
    pendingDir = null;
    timeMax = time = timeFor(level);
  }
  // se llama al ocupar la 5ª boca; suma +200 y arranca la ronda siguiente
  function completeRound() {
    score += POINTS_ROUND;
    level++;
    goals = GOAL_STARTS.map(() => false);
    bestRow = ROW_START;
    lanes = buildLanes(level);
    resetFrog();
    statsT = STATS_EVERY_MS; // el cambio de nivel se notifica sin esperar
    emit();
  }
  function killFrog() {
    lives--;
    statsT = STATS_EVERY_MS;
    if (lives > 0) {
      resetFrog();
      emit();
      return;
    }
    lives = 0;
    over = true;
    emit(); // onStats con lives 0 antes de onGameOver
    cb.onGameOver(score);
  }
  function reachGoal() {
    const i = goalIndex(frog);
    if (i < 0 || goals[i]) return killFrog(); // entre bocas o boca ya ocupada
    goals[i] = true;
    score += POINTS_GOAL + Math.floor(time / 1000) * POINTS_TIME;
    if (goals.every(Boolean)) completeRound();
    else resetFrog();
  }
  function land() {
    frog.col = frog.targetCol;
    frog.row = frog.targetRow;
    frog.animating = false;
    if (frog.row < bestRow) {
      score += POINTS_ROW * (bestRow - frog.row);
      bestRow = frog.row;
    }
    if (frog.row === ROW_GOALS) reachGoal();
  }
  // con la rana quieta: atropello, caída al agua y arrastre por troncos/tortugas
  function checkSurface(dt: number) {
    if (roadCollision(frog, lanes)) return killFrog();
    if (frog.row < ROW_RIVER_TOP || frog.row > ROW_RIVER_BOT) return;
    const s = getSupport(frog, lanes);
    if (!s) return killFrog(); // agua o tortuga sumergida
    frog.col += s.lane.speed * s.lane.dir * dt;
    const c = frog.col + 0.5;
    if (c < 0 || c >= COLS) killFrog(); // arrastrada fuera del río
  }
  function moveEntity(lane: Lane, e: Entity, dt: number, ms: number) {
    e.col += lane.speed * lane.dir * dt;
    // sale por un lado y reaparece LOOP celdas atrás (ver lanes.ts)
    if (lane.dir === 1 && e.col >= COLS) e.col -= LOOP;
    else if (lane.dir === -1 && e.col + e.width <= 0) e.col += LOOP;
    if (e.type === "turtle") {
      e.phase = ((e.phase ?? 0) + ms) % CYCLE;
      e.submerged = e.phase >= TURTLE_VISIBLE_MS;
    }
  }
  function startJump(dir: Direction) {
    const [dc, dr] = DELTA[dir];
    // sobre un tronco col es fraccionaria: el salto vuelve a la rejilla
    const tc = Math.round(frog.col) + dc;
    const tr = frog.row + dr;
    // la rana no sale por los bordes laterales ni por arriba/abajo
    if (tc < 0 || tc >= COLS || tr < ROW_GOALS || tr > ROW_START) return;
    facing = dir;
    frog.animating = true;
    frog.animT = 0;
    frog.targetCol = tc;
    frog.targetRow = tr;
  }
  function update(dt: number) {
    const ms = dt * 1000;
    statsT += ms;
    for (const lane of lanes)
      for (const e of lane.entities) moveEntity(lane, e, dt, ms);
    time = Math.max(0, time - ms);
    if (!frog.animating && pendingDir) {
      startJump(pendingDir);
      pendingDir = null;
    }
    if (frog.animating) {
      frog.animT += ms;
      if (frog.animT >= JUMP_MS) land();
    }
    if (!over && !frog.animating) checkSurface(dt);
    if (!over && time <= 0) killFrog();
    emit();
  }
  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    const { pixel, glow } = pal;
    const dot = (cx: number, cy: number, r: number) => {
      if (pixel)
        ctx.fillRect(Math.round(cx - r), Math.round(cy - r), r * 2, r * 2);
      else {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    // zonas de fondo
    const zone = (r0: number, r1: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, r0 * CELL, W, (r1 - r0 + 1) * CELL);
    };
    zone(ROW_GOALS, ROW_GOALS, pal.safe);
    zone(ROW_RIVER_TOP, ROW_RIVER_BOT, pal.river);
    zone(ROW_SAFE_MID, ROW_SAFE_MID, pal.safe);
    zone(ROW_ROAD_TOP, ROW_ROAD_BOT, pal.road);
    zone(ROW_START, ROW_START, pal.safe);
    // reflejos del agua y rayas de carril
    ctx.fillStyle = pal.riverLine;
    for (let r = ROW_RIVER_TOP; r <= ROW_RIVER_BOT; r++)
      for (let x = (r % 2) * 40; x < W; x += 80)
        ctx.fillRect(x, r * CELL + 19, 20, 2);
    ctx.fillStyle = pal.laneLine;
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++)
      for (let x = 0; x < W; x += 40) ctx.fillRect(x + 8, r * CELL - 1, 24, 2);
    // bocas destino (en la mitad inferior de la fila 0; arriba va el HUD)
    GOAL_STARTS.forEach((c, i) => {
      const x = c * CELL;
      ctx.fillStyle = pal.mouth;
      ctx.fillRect(x, 18, GOAL_W * CELL, CELL - 18);
      ctx.strokeStyle = pal.mouthEdge;
      ctx.lineWidth = pixel ? 3 : 2;
      ctx.strokeRect(x + 1, 19, GOAL_W * CELL - 2, CELL - 20);
      if (goals[i]) {
        ctx.fillStyle = pal.frog;
        dot(x + CELL, 30, 8);
      }
    });
    // entidades (en neon cada una brilla con su propio color)
    ctx.shadowBlur = glow;
    lanes.forEach((lane) => {
      const y = lane.row * CELL;
      const roadIdx = lane.row - ROW_ROAD_TOP;
      for (const e of lane.entities) {
        const x = pixel ? Math.round(e.col * CELL) : e.col * CELL;
        const w = e.width * CELL;
        if (e.type === "log") {
          ctx.shadowColor = pal.log;
          ctx.fillStyle = pal.log;
          ctx.fillRect(x, y + 6, w, CELL - 12);
          ctx.fillStyle = pal.logLine;
          for (let lx = x + 12; lx < x + w - 4; lx += 16)
            ctx.fillRect(lx, y + 10, 2, CELL - 20);
        } else if (e.type === "turtle") {
          ctx.shadowColor = pal.turtle;
          // retro sin alfa: sumergida = silueta sólida del color de los reflejos
          ctx.globalAlpha = e.submerged && !pixel ? 0.3 : 1;
          for (let i = 0; i < e.width; i++) {
            ctx.fillStyle = e.submerged && pixel ? pal.riverLine : pal.turtle;
            dot(x + i * CELL + CELL / 2, y + CELL / 2, 15);
            if (!e.submerged) {
              ctx.fillStyle = pal.shell;
              dot(x + i * CELL + CELL / 2, y + CELL / 2, 9);
            }
          }
          ctx.globalAlpha = 1;
        } else {
          const front = lane.dir === 1 ? x + w : x;
          ctx.fillStyle = e.type === "truck" ? pal.truck : pal.cars[roadIdx];
          ctx.shadowColor = ctx.fillStyle;
          ctx.fillRect(x + 2, y + 8, w - 4, CELL - 16);
          if (e.type === "truck") {
            ctx.fillStyle = pal.cab;
            ctx.fillRect(
              lane.dir === 1 ? x + w - CELL : x + 2,
              y + 8,
              CELL - 2,
              CELL - 16,
            );
          }
          ctx.fillStyle = pal.glass;
          ctx.fillRect(
            front - lane.dir * 12 - (lane.dir === 1 ? 8 : 0),
            y + 12,
            8,
            CELL - 24,
          );
          ctx.fillStyle = pal.road;
          for (let wx = x + 10; wx < x + w - 6; wx += 22) {
            dot(wx, y + 8, 4);
            dot(wx, y + CELL - 8, 4);
          }
        }
      }
    });
    // rana (interpola la posición y se agranda a mitad del salto)
    const t = frog.animating ? Math.min(1, frog.animT / JUMP_MS) : 0;
    const fx = (frog.col + (frog.targetCol - frog.col) * t) * CELL + CELL / 2;
    const fy = (frog.row + (frog.targetRow - frog.row) * t) * CELL + CELL / 2;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(ANGLE[facing]);
    const s = 1 + 0.25 * Math.sin(Math.PI * t);
    ctx.scale(s, s);
    ctx.shadowColor = pal.frog;
    ctx.shadowBlur = glow;
    ctx.fillStyle = pal.frogDark;
    if (frog.animating) {
      // patas extendidas
      ctx.fillRect(-16, -14, 6, 8);
      ctx.fillRect(10, -14, 6, 8);
      ctx.fillRect(-16, 8, 6, 8);
      ctx.fillRect(10, 8, 6, 8);
    } else {
      ctx.fillRect(-15, -10, 5, 6);
      ctx.fillRect(10, -10, 5, 6);
      ctx.fillRect(-15, 6, 5, 6);
      ctx.fillRect(10, 6, 5, 6);
    }
    ctx.fillStyle = pal.frog;
    if (pixel) ctx.fillRect(-12, -14, 24, 28);
    else {
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const ex of [-7, 7]) {
      ctx.fillStyle = pal.eye;
      dot(ex, -9, 4);
      ctx.fillStyle = pal.pupil;
      dot(ex, -10, 2);
    }
    ctx.restore();
    ctx.shadowBlur = 0;
    // HUD interno: puntos, nivel y vidas arriba; barra de tiempo en el borde
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = pal.text;
    ctx.textAlign = "left";
    ctx.fillText(String(score), 8, 14);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, W / 2, 14);
    ctx.fillStyle = pal.frog;
    for (let i = 0; i < lives; i++) dot(W - 14 - i * 18, 9, 5);
    const ratio = timeMax ? time / timeMax : 0;
    ctx.fillStyle =
      ratio > 0.5 ? pal.barOk : ratio > 0.25 ? pal.barWarn : pal.barBad;
    ctx.fillRect(0, 0, W * ratio, 4);
  }
  // ── Entrada ─────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
    const dir = KEYS[e.code];
    if (!dir || paused || over) return;
    e.preventDefault();
    if (e.repeat) return;
    pendingDir = dir;
  };
  const onVisibility = () => {
    if (document.hidden) lastTime = null;
  };
  // ── Loop ────────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!paused && !over) {
      // dt con tope de 50 ms para evitar saltos al volver de una pestaña inactiva
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50) / 1000;
      update(dt);
    }
    lastTime = ts;
    draw();
  }
  return {
    start() {
      window.addEventListener("keydown", onKeyDown);
      document.addEventListener("visibilitychange", onVisibility);
      initGame();
      rafId = requestAnimationFrame(loop);
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      lastTime = null;
    },
    restart() {
      initGame();
      lastTime = null;
    },
    setSkin(s) {
      pal = PALETTES[s];
      draw(); // repinta ya, también en pausa
    },
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
