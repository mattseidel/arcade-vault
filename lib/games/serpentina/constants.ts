export const CELL = 40;
export const COLS = 20;
export const ROWS = 15;
export const W = COLS * CELL;
export const H = ROWS * CELL;
export const START_LEN = 3;
export const BASE_STEP_MS = 140;
export const MIN_STEP_MS = 70;
export const STEP_DELTA_MS = 10;
export const FRUITS_PER_LEVEL = 5;
export const POINTS = 10;
export const SPRITE_URL = "/games/serpentina/fruits.png";
// Atlas portado de references/started-games/snake-assets/sprites.js (fila pixel-art)
type Frame = { x: number; y: number; w: number; h: number };
const row = (xs: [number, number][]): Frame[] =>
  xs.map(([x, w]) => ({ x, y: 136, w, h: 160 }));
export const FRUITS: Frame[] = row([
  [34, 110],
  [186, 150],
  [378, 110],
  [540, 130],
  [712, 130],
  [894, 110],
  [1066, 110],
  [1228, 130],
  [1400, 130],
  [1582, 110],
  [1734, 150],
  [1906, 150],
  [2068, 170],
  [2250, 140],
  [2432, 130],
  [2604, 130],
  [2786, 110],
  [2948, 130],
  [3110, 150],
  [3302, 110],
  [3454, 150],
  [3637, 130],
]);
