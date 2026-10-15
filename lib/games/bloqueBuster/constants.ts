export const W = 800;
export const H = 600;
export const PADDLE_SPEED = 400;
export const PADDLE = { w: 81, h: 14, y: 560 };
export const BALL = 16;
export const BASE_VX = 200;
export const BASE_VY = -300;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const ORIGIN_X = 80;
export const ORIGIN_Y = 80;
export const BLOCK_SCORE = 10;
export const LIVES = 3;
export const EXPLOSION_MS = 150;
export const SPRITE_URL = "/games/bloqueBuster/spritesheet.png";
export type Frame = { sx: number; sy: number; sw: number; sh: number };
export type BlockColor =
  "gray" | "red" | "cyan" | "green" | "magenta" | "yellow" | "hotpink";
// fila del spritesheet por color (bloque en x=32, explosión en x=256 + 32·frame)
const ROW_Y: Record<BlockColor, number> = {
  gray: 288,
  red: 176,
  cyan: 192,
  green: 208,
  magenta: 224,
  yellow: 240,
  hotpink: 256,
};
export const blockSprite = (c: BlockColor): Frame => ({
  sx: 32,
  sy: ROW_Y[c],
  sw: 32,
  sh: 16,
});
// ponytail: la explosión "gray" reutiliza la fila roja, igual que el original
export const explosionFrame = (c: BlockColor, i: number): Frame => ({
  sx: 256 + 32 * i,
  sy: c === "gray" ? ROW_Y.red : ROW_Y[c],
  sw: 32,
  sh: 16,
});
export const PADDLE_SPRITE: Frame = { sx: 32, sy: 112, sw: 162, sh: 14 };
export const BALL_SPRITE: Frame = { sx: 32, sy: 32, sw: 16, sh: 16 };
