export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
// índice 0 = vacío; 1–8 = I, O, T, S, Z, J, L, N (tuerca)
export const COLORS: (string | null)[] = [
  null,
  "#4dd0e1",
  "#ffd54f",
  "#ba68c8",
  "#81c784",
  "#e57373",
  "#90caf9",
  "#ffb74d",
  "#9e9e9e",
];
export const PIECES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const KICKS = [0, -1, 1, -2, 2];
