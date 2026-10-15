import {
  BLOCK,
  COLORS,
  COLS,
  KICKS,
  LINE_SCORES,
  PIECES,
  ROWS,
} from "./constants";
import type { GameCallbacks, GameEngine } from "../types";
type Piece = { shape: number[][]; x: number; y: number };
const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyX",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);
const rotateCW = (shape: number[][]) => {
  const rows = shape.length;
  const cols = shape[0].length;
  const out = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out[c][rows - 1 - r] = shape[r][c];
  return out;
};
const randomPiece = (): Piece => {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
};
export function createCaida(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
  nextCanvas?: HTMLCanvasElement | null,
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const nextCtx = nextCanvas?.getContext("2d") ?? null;
  let board: number[][] = [];
  let current: Piece;
  let next: Piece;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = 1000;
  let dropAccum = 0;
  let over = false;
  let paused = false;
  let rafId = 0;
  let lastTime: number | null = null;
  let last = { score: -1, level: -1 };
  const emitStats = () => {
    if (score === last.score && level === last.level) return;
    last = { score, level };
    cb.onStats({ score, lives: 0, level });
  };
  const collide = (shape: number[][], ox: number, oy: number) => {
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    return false;
  };
  const ghostY = () => {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  };
  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (!cleared) return;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  }
  function spawn() {
    current = next;
    next = randomPiece();
    drawNext();
    if (collide(current.shape, current.x, current.y)) {
      over = true;
      emitStats();
      cb.onGameOver(score);
    }
  }
  function lockPiece() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c] && current.y + r >= 0)
          board[current.y + r][current.x + c] = current.shape[r][c];
    clearLines();
    spawn();
    emitStats();
  }
  function initGame() {
    board = Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropAccum = 0;
    over = false;
    next = randomPiece();
    spawn();
    emitStats();
  }
  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    const typing = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA";
    if (typing || paused || over) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
      case "KeyD":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
      case "KeyS":
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
          score += 1;
        } else lockPiece();
        break;
      case "ArrowUp":
      case "KeyW":
      case "KeyX": {
        const rotated = rotateCW(current.shape);
        for (const k of KICKS) {
          if (!collide(rotated, current.x + k, current.y)) {
            current.shape = rotated;
            current.x += k;
            break;
          }
        }
        break;
      }
      case "Space": {
        const gy = ghostY();
        score += (gy - current.y) * 2;
        current.y = gy;
        lockPiece();
        break;
      }
    }
    emitStats();
    if (!over) draw();
  };
  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBlock(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    idx: number,
    alpha = 1,
  ) {
    if (!idx) return;
    c.globalAlpha = alpha;
    c.fillStyle = COLORS[idx] ?? "#fff";
    c.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    c.fillStyle = "rgba(255,255,255,0.12)";
    c.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 4);
    c.globalAlpha = 1;
  }
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
    }
    ctx.stroke();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c]);
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++) {
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], 0.2);
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c]);
      }
  }
  function drawNext() {
    if (!nextCtx || !nextCanvas) return;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const s = next.shape;
    const offX = Math.floor((4 - s[0].length) / 2);
    const offY = Math.floor((4 - s.length) / 2);
    for (let r = 0; r < s.length; r++)
      for (let c = 0; c < s[r].length; c++)
        drawBlock(nextCtx, offX + c, offY + r, s[r][c]);
  }
  // ── Loop ────────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (paused || over) return;
    // dt con tope de 50 ms para evitar saltos al volver de una pestaña inactiva
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
    lastTime = ts;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
    if (!over) draw();
  }
  return {
    start() {
      window.addEventListener("keydown", onKeyDown);
      initGame();
      draw();
      rafId = requestAnimationFrame(loop);
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      lastTime = null; // sin salto de tiempo tras la pausa
    },
    restart() {
      initGame();
      draw();
      lastTime = null;
    },
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
