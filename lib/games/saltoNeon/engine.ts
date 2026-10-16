import {
  BASE_SPEED,
  BEAM,
  BEAM_CHANCE,
  BEAM_FROM_LEVEL,
  BEAM_MIN_GAP_S,
  DEATH_MS,
  DEATH_PARTICLES,
  FIRST_OBSTACLE_X,
  GRAVITY,
  GROUND_Y,
  H,
  HITBOX_INSET,
  JUMP_BUFFER_MS,
  JUMP_VELOCITY,
  LEVEL_TEXT_MS,
  MAX_GAP_S,
  MAX_SPEED,
  METERS_PER_LEVEL,
  MIN_GAP_S,
  OBSTACLES,
  ORB_CHANCE,
  ORB_POINTS,
  ORB_R,
  ORB_TEXT_MS,
  ORB_Y,
  PARALLAX_FACTOR,
  PLAYER_SIZE,
  PLAYER_X,
  PX_PER_METER,
  SPEED_STEP,
  STATS_EVERY_MS,
  W,
} from "./constants";
import type { Obstacle, ObstacleKind, Orb } from "./types";
import type { GameCallbacks, GameEngine } from "../types";
type Particle = { x: number; y: number; vx: number; vy: number };
type Floater = { x: number; y: number; t: number };
type Building = { x: number; w: number; h: number };
const GROUND_TOP = GROUND_Y - PLAYER_SIZE; // y del cubo apoyado
const JUMP_KEYS = ["Space", "ArrowUp", "KeyW"];
const BASIC: ObstacleKind[] = ["spike", "doubleSpike", "block"];
const BG_PERIOD = W + 200;
export function createSaltoNeon(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  let y = GROUND_TOP;
  let vy = 0;
  let airT = 0;
  let buffer = 0; // ms restantes de la pulsación guardada
  let dist = 0;
  let orbsTaken = 0;
  let lvl = 1;
  let obstacles: Obstacle[] = [];
  let orbs: Orb[] = [];
  let lastX = 0;
  let lastKind: ObstacleKind | null = null;
  let particles: Particle[] = [];
  let floaters: Floater[] = [];
  let buildings: Building[] = [];
  let levelTextT = 0;
  let deathT = 0;
  let dying = false;
  let over = false;
  let paused = false;
  let statsT = 0;
  let rafId = 0;
  let lastTime: number | null = null;
  let last = { score: -1, level: -1 };
  const meters = () => Math.floor(dist / PX_PER_METER);
  const score = () => meters() + ORB_POINTS * orbsTaken;
  const level = () => 1 + Math.floor(meters() / METERS_PER_LEVEL);
  const speed = () =>
    Math.min(MAX_SPEED, BASE_SPEED + SPEED_STEP * (level() - 1));
  const emit = () => {
    const s = score();
    const l = level();
    if (s === last.score && l === last.level) return;
    if (l === last.level && statsT < STATS_EVERY_MS) return;
    statsT = 0;
    last = { score: s, level: l };
    cb.onStats({ score: s, lives: 0, level: l });
  };
  const finish = () => {
    over = true;
    statsT = STATS_EVERY_MS;
    emit();
    cb.onGameOver(score());
  };
  function spawn() {
    const beam =
      level() >= BEAM_FROM_LEVEL &&
      lastKind !== "beam" &&
      Math.random() < BEAM_CHANCE;
    const kind: ObstacleKind = beam
      ? "beam"
      : BASIC[Math.floor(Math.random() * BASIC.length)];
    const minGap = beam ? BEAM_MIN_GAP_S : MIN_GAP_S;
    const gapPx = (minGap + Math.random() * (MAX_GAP_S - minGap)) * speed();
    const x = lastKind === null ? FIRST_OBSTACLE_X : lastX + gapPx;
    // orbe en el punto medio del hueco, salvo tras una viga
    if (lastKind !== null && lastKind !== "beam" && Math.random() < ORB_CHANCE)
      orbs.push({ x: (lastX + x) / 2, taken: false });
    const w = kind === "beam" ? BEAM.w : OBSTACLES[kind].w;
    obstacles.push({ kind, x, w });
    lastX = x;
    lastKind = kind;
  }
  function initGame() {
    y = GROUND_TOP;
    vy = 0;
    airT = 0;
    buffer = 0;
    dist = 0;
    orbsTaken = 0;
    lvl = 1;
    obstacles = [];
    orbs = [];
    lastKind = null;
    particles = [];
    floaters = [];
    levelTextT = 0;
    deathT = 0;
    dying = false;
    over = false;
    statsT = STATS_EVERY_MS;
    last = { score: -1, level: -1 };
    buildings = [];
    for (let x = 0; x < BG_PERIOD;) {
      const w = 50 + Math.random() * 70;
      buildings.push({ x, w, h: 60 + Math.random() * 140 });
      x += w + 10 + Math.random() * 30;
    }
    while (lastKind === null || lastX < W + 400) spawn();
    emit();
  }
  // hitbox del obstáculo: [x, y, w, h]
  function box(o: Obstacle): [number, number, number, number] {
    if (o.kind === "beam") return [o.x, BEAM.top, o.w, BEAM.bottom - BEAM.top];
    const h = OBSTACLES[o.kind].h;
    if (o.kind === "block") return [o.x, GROUND_Y - h, o.w, h];
    // pinchos: núcleo central más pequeño que el dibujo
    return [o.x + 6, GROUND_Y - 28, o.w - 12, 28];
  }
  function die() {
    dying = true;
    const cx = PLAYER_X + PLAYER_SIZE / 2;
    const cy = y + PLAYER_SIZE / 2;
    particles = Array.from({ length: DEATH_PARTICLES }, (_, i) => {
      const a = (i / DEATH_PARTICLES) * Math.PI * 2 + Math.random() * 0.4;
      const v = 150 + Math.random() * 250;
      return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v };
    });
  }
  function jump() {
    vy = -JUMP_VELOCITY;
    airT = 0;
    buffer = 0;
  }
  function update(dt: number) {
    const ms = dt * 1000;
    statsT += ms;
    if (dying) {
      deathT += ms;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (deathT >= DEATH_MS) finish();
      return;
    }
    buffer = Math.max(0, buffer - ms);
    levelTextT = Math.max(0, levelTextT - ms);
    // salto
    const wasAir = y < GROUND_TOP;
    vy += GRAVITY * dt;
    y += vy * dt;
    airT += dt;
    if (y >= GROUND_TOP) {
      y = GROUND_TOP;
      vy = 0;
      if (wasAir && buffer > 0) jump();
    }
    // avance
    const step = speed() * dt;
    dist += step;
    for (const o of obstacles) o.x -= step;
    for (const o of orbs) o.x -= step;
    lastX -= step;
    obstacles = obstacles.filter((o) => o.x + o.w > -50);
    orbs = orbs.filter((o) => o.x > -50 && !o.taken);
    while (lastX < W + 400) spawn();
    if (level() > lvl) {
      lvl = level();
      levelTextT = LEVEL_TEXT_MS;
    }
    // orbes: círculo contra el cubo completo
    for (const o of orbs) {
      const nx = Math.max(PLAYER_X, Math.min(o.x, PLAYER_X + PLAYER_SIZE));
      const ny = Math.max(y, Math.min(ORB_Y, y + PLAYER_SIZE));
      if ((o.x - nx) ** 2 + (ORB_Y - ny) ** 2 <= ORB_R ** 2) {
        o.taken = true;
        orbsTaken++;
        floaters.push({ x: o.x, y: ORB_Y, t: 0 });
      }
    }
    floaters.forEach((f) => (f.t += ms));
    floaters = floaters.filter((f) => f.t < ORB_TEXT_MS);
    // colisión: cubo reducido contra obstáculos
    const px = PLAYER_X + HITBOX_INSET;
    const py = y + HITBOX_INSET;
    const ps = PLAYER_SIZE - 2 * HITBOX_INSET;
    for (const o of obstacles) {
      const [bx, by, bw, bh] = box(o);
      if (px < bx + bw && px + ps > bx && py < by + bh && py + ps > by) {
        die();
        break;
      }
    }
    emit();
  }
  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#05030f";
    ctx.fillRect(0, 0, W, H);
    // parallax: edificios al 25 % de la velocidad de la pista
    const off = (dist * PARALLAX_FACTOR) % BG_PERIOD;
    ctx.fillStyle = "rgba(255,43,214,0.25)";
    for (const b of buildings) {
      let bx = b.x - off;
      if (bx + b.w < 0) bx += BG_PERIOD;
      ctx.fillRect(bx, GROUND_Y - b.h, b.w, b.h);
    }
    // suelo con rejilla que se desplaza con la pista
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#ff2bd6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,43,214,0.3)";
    ctx.beginPath();
    for (let x = -(dist % 40); x < W; x += 40) {
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 30, H);
    }
    ctx.stroke();
    // obstáculos
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ff2bd6";
    for (const o of obstacles) {
      if (o.kind === "beam") {
        ctx.fillRect(o.x, BEAM.top, o.w, BEAM.bottom - BEAM.top);
      } else if (o.kind === "block") {
        ctx.fillRect(o.x, GROUND_Y - 60, o.w, 60);
      } else {
        const n = o.kind === "doubleSpike" ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const sx = o.x + i * 30;
          ctx.beginPath();
          ctx.moveTo(sx, GROUND_Y);
          ctx.lineTo(sx + 15, GROUND_Y - 40);
          ctx.lineTo(sx + 30, GROUND_Y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    // orbes
    ctx.shadowColor = "#ffe600";
    ctx.fillStyle = "#ffe600";
    for (const o of orbs) {
      ctx.beginPath();
      ctx.arc(o.x, ORB_Y, ORB_R, 0, Math.PI * 2);
      ctx.fill();
    }
    // cubo (gira 180° por salto) o explosión
    ctx.shadowColor = "#00f5ff";
    ctx.fillStyle = "#00f5ff";
    if (!dying) {
      const ang = y < GROUND_TOP ? Math.min(1, airT / 0.75) * Math.PI : 0;
      ctx.save();
      ctx.translate(PLAYER_X + PLAYER_SIZE / 2, y + PLAYER_SIZE / 2);
      ctx.rotate(ang);
      ctx.fillRect(
        -PLAYER_SIZE / 2,
        -PLAYER_SIZE / 2,
        PLAYER_SIZE,
        PLAYER_SIZE,
      );
      ctx.restore();
    } else {
      ctx.globalAlpha = Math.max(0, 1 - deathT / DEATH_MS);
      for (const p of particles) ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
    // textos
    ctx.textAlign = "center";
    ctx.font = "bold 20px monospace";
    for (const f of floaters) {
      ctx.globalAlpha = 1 - f.t / ORB_TEXT_MS;
      ctx.fillStyle = "#ffe600";
      ctx.fillText(`+${ORB_POINTS}`, f.x, f.y - 30 * (f.t / ORB_TEXT_MS));
    }
    if (levelTextT > 0) {
      ctx.globalAlpha = Math.min(1, levelTextT / 300);
      ctx.font = "bold 36px monospace";
      ctx.fillStyle = "#00f5ff";
      ctx.fillText(`NIVEL ${lvl}`, W / 2, 200);
    }
    ctx.globalAlpha = 1;
  }
  // ── Entrada ─────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
    if (!JUMP_KEYS.includes(e.code) || paused || over || dying) return;
    e.preventDefault();
    if (e.repeat) return;
    if (y >= GROUND_TOP) jump();
    else buffer = JUMP_BUFFER_MS;
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
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
