import {
  BASE_STEP_MS,
  CELL,
  COLS,
  FRUITS,
  FRUITS_PER_LEVEL,
  H,
  MIN_STEP_MS,
  POINTS,
  ROWS,
  SPRITE_URL,
  START_LEN,
  STEP_DELTA_MS,
  W,
} from "./constants";
import type { GameCallbacks, GameEngine } from "../types";
type Cell = { x: number; y: number };
const DIRS: Record<string, Cell> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};
export function createSerpentina(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  let snake: Cell[] = []; // cabeza en [0]
  let dir: Cell = { x: 1, y: 0 };
  let queue: Cell[] = []; // giros pendientes (máx. 2)
  let fruit: Cell = { x: 0, y: 0 };
  let fruitSprite = 0;
  let eaten = 0;
  let score = 0;
  let acc = 0;
  let over = false;
  let paused = false;
  let rafId = 0;
  let lastTime: number | null = null;
  let last = { score: -1, level: -1 };
  let sheet: HTMLImageElement | null = null;
  const level = () => 1 + Math.floor(eaten / FRUITS_PER_LEVEL);
  const stepMs = () =>
    Math.max(MIN_STEP_MS, BASE_STEP_MS - (level() - 1) * STEP_DELTA_MS);
  const emitStats = () => {
    if (score === last.score && level() === last.level) return;
    last = { score, level: level() };
    cb.onStats({ score, lives: 0, level: level() });
  };
  const finish = () => {
    over = true;
    emitStats();
    cb.onGameOver(score);
  };
  function placeFruit(): boolean {
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    if (!free.length) return false;
    fruit = free[Math.floor(Math.random() * free.length)];
    fruitSprite = Math.floor(Math.random() * FRUITS.length);
    return true;
  }
  function initGame() {
    const y = Math.floor(ROWS / 2);
    snake = Array.from({ length: START_LEN }, (_, i) => ({
      x: START_LEN + 1 - i,
      y,
    }));
    dir = { x: 1, y: 0 };
    queue = [];
    eaten = 0;
    score = 0;
    acc = 0;
    over = false;
    placeFruit();
    emitStats();
  }
  function step() {
    if (queue.length) dir = queue.shift()!;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const grows = head.x === fruit.x && head.y === fruit.y;
    // la cola se mueve este paso, salvo que coma
    const body = grows ? snake : snake.slice(0, -1);
    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= COLS ||
      head.y >= ROWS ||
      body.some((s) => s.x === head.x && s.y === head.y)
    ) {
      finish();
      return;
    }
    snake.unshift(head);
    if (!grows) {
      snake.pop();
      return;
    }
    eaten++;
    score += POINTS;
    emitStats();
    if (!placeFruit()) finish(); // grilla llena: victoria
  }
  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,255,120,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, H);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(W, y * CELL + 0.5);
    }
    ctx.stroke();
    const fx = fruit.x * CELL;
    const fy = fruit.y * CELL;
    if (sheet) {
      const f = FRUITS[fruitSprite];
      const k = (CELL * 0.9) / Math.max(f.w, f.h);
      const w = f.w * k;
      const h = f.h * k;
      ctx.drawImage(
        sheet,
        f.x,
        f.y,
        f.w,
        f.h,
        fx + (CELL - w) / 2,
        fy + (CELL - h) / 2,
        w,
        h,
      );
    } else {
      ctx.fillStyle = "#ff2bd6";
      ctx.beginPath();
      ctx.arc(fx + CELL / 2, fy + CELL / 2, CELL * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = "#39ff88";
    ctx.shadowBlur = 10;
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#b6ffd2" : "#39ff88";
      ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
    });
    ctx.shadowBlur = 0;
  }
  // ── Entrada ─────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
    const d = DIRS[e.code];
    if (!d || paused || over) return;
    e.preventDefault();
    const prev = queue.length ? queue[queue.length - 1] : dir;
    // sin reversa de 180° ni repetir la misma dirección
    if (
      (d.x === -prev.x && d.y === -prev.y) ||
      (d.x === prev.x && d.y === prev.y)
    )
      return;
    if (queue.length < 2) queue.push(d);
  };
  const onVisibility = () => {
    if (document.hidden) lastTime = null;
  };
  // ── Loop ────────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!paused && !over) {
      // dt con tope de 50 ms para evitar saltos al volver de una pestaña inactiva
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
      acc += dt;
      while (acc >= stepMs() && !over) {
        acc -= stepMs();
        step();
      }
    }
    lastTime = ts;
    draw();
  }
  return {
    start() {
      window.addEventListener("keydown", onKeyDown);
      document.addEventListener("visibilitychange", onVisibility);
      const img = new Image();
      img.onload = () => (sheet = img);
      img.src = SPRITE_URL;
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
