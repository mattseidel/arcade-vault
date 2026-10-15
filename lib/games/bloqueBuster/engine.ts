import {
  BALL,
  BALL_SPRITE,
  BASE_VX,
  BASE_VY,
  BLOCK_H,
  BLOCK_SCORE,
  BLOCK_W,
  EXPLOSION_MS,
  H,
  LIVES,
  ORIGIN_X,
  ORIGIN_Y,
  PADDLE,
  PADDLE_SPEED,
  PADDLE_SPRITE,
  SPRITE_URL,
  W,
  blockSprite,
  explosionFrame,
  type BlockColor,
  type Frame,
} from "./constants";
import { LEVELS, SPEEDS } from "./levels";
import type { GameCallbacks, GameEngine } from "../types";
type Block = { x: number; y: number; color: BlockColor; alive: boolean };
type Explosion = { x: number; y: number; color: BlockColor; elapsed: number };
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]);
export function createBloqueBuster(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const paddle = { x: 0 };
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = LIVES;
  let level = 1;
  let over = false;
  let paused = false;
  let rafId = 0;
  let lastTime: number | null = null;
  let last = { score: -1, lives: -1, level: -1 };
  let sheet: HTMLImageElement | null = null;
  const keys = { left: false, right: false };
  const emitStats = () => {
    if (score === last.score && lives === last.lives && level === last.level)
      return;
    last = { score, lives, level };
    cb.onStats({ score, lives, level });
  };
  function resetBall() {
    const speed = SPEEDS[level - 1];
    ball.x = paddle.x + (PADDLE.w - BALL) / 2;
    ball.y = PADDLE.y - BALL;
    ball.vx = BASE_VX * speed;
    ball.vy = BASE_VY * speed;
  }
  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].map((b) => ({
      x: ORIGIN_X + b.col * BLOCK_W,
      y: ORIGIN_Y + b.row * BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    resetBall();
  }
  function initGame() {
    score = 0;
    lives = LIVES;
    over = false;
    paddle.x = (W - PADDLE.w) / 2;
    loadLevel(1);
    emitStats();
  }
  function finish() {
    over = true;
    emitStats();
    cb.onGameOver(score);
  }
  // ── Física ──────────────────────────────────────────────────────────────────
  function hitBlock(b: Block) {
    b.alive = false;
    explosions.push({ x: b.x, y: b.y, color: b.color, elapsed: 0 });
    score += BLOCK_SCORE;
    // rebota en el eje de menor solapamiento (el original siempre invertía vy)
    const ox = Math.min(ball.x + BALL - b.x, b.x + BLOCK_W - ball.x);
    const oy = Math.min(ball.y + BALL - b.y, b.y + BLOCK_H - ball.y);
    if (ox < oy) ball.vx = -ball.vx;
    else ball.vy = -ball.vy;
    if (blocks.every((k) => !k.alive)) {
      if (level < LEVELS.length) loadLevel(level + 1);
      else finish();
    }
  }
  function update(dt: number) {
    if (keys.left) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.right)
      paddle.x = Math.min(W - PADDLE.w, paddle.x + PADDLE_SPEED * dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + BALL >= W) {
      ball.x = W - BALL;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }
    if (
      ball.vy > 0 &&
      ball.x + BALL > paddle.x &&
      ball.x < paddle.x + PADDLE.w &&
      ball.y + BALL >= PADDLE.y &&
      ball.y + BALL <= PADDLE.y + PADDLE.h + 8
    ) {
      ball.y = PADDLE.y - BALL;
      ball.vy = -Math.abs(ball.vy);
    }
    // un bloque por frame
    const hit = blocks.find(
      (b) =>
        b.alive &&
        ball.x < b.x + BLOCK_W &&
        ball.x + BALL > b.x &&
        ball.y < b.y + BLOCK_H &&
        ball.y + BALL > b.y,
    );
    if (hit) hitBlock(hit);
    for (const e of explosions) e.elapsed += dt * 1000;
    explosions = explosions.filter((e) => e.elapsed < EXPLOSION_MS);
    if (!over && ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        finish();
      } else resetBall();
    }
    emitStats();
  }
  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (!sheet) return;
    const img = sheet;
    const blit = (f: Frame, x: number, y: number, w: number, h: number) =>
      ctx.drawImage(img, f.sx, f.sy, f.sw, f.sh, x, y, w, h);
    for (const b of blocks)
      if (b.alive) blit(blockSprite(b.color), b.x, b.y, BLOCK_W, BLOCK_H);
    for (const e of explosions) {
      const i = Math.min(Math.floor((e.elapsed / EXPLOSION_MS) * 4), 3);
      blit(explosionFrame(e.color, i), e.x, e.y, BLOCK_W, BLOCK_H);
    }
    blit(PADDLE_SPRITE, paddle.x, PADDLE.y, PADDLE.w, PADDLE.h);
    blit(BALL_SPRITE, ball.x, ball.y, BALL, BALL);
  }
  // ── Entrada ─────────────────────────────────────────────────────────────────
  const setKey = (e: KeyboardEvent, down: boolean) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = down;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = down;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
    if (paused || over) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    setKey(e, true);
  };
  const onKeyUp = (e: KeyboardEvent) => setKey(e, false);
  const onVisibility = () => {
    if (document.hidden) keys.left = keys.right = false;
  };
  // ── Loop ────────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!paused && !over) {
      // dt con tope de 50 ms para evitar saltos al volver de una pestaña inactiva
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      update(dt);
    }
    lastTime = ts;
    draw();
  }
  return {
    start() {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      document.addEventListener("visibilitychange", onVisibility);
      const img = new Image();
      img.onload = () => (sheet = img);
      img.src = SPRITE_URL;
      initGame();
      rafId = requestAnimationFrame(loop);
    },
    pause() {
      paused = true;
      keys.left = keys.right = false;
    },
    resume() {
      paused = false;
      lastTime = null; // sin salto de tiempo tras la pausa
    },
    restart() {
      keys.left = keys.right = false;
      initGame();
      lastTime = null;
    },
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
