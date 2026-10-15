import type { BlockColor } from "./constants";
export type Cell = { col: number; row: number; color: BlockColor };
export const SPEEDS = [1, 1.1, 1.21, 1.33, 1.46];
const grid = (pick: (col: number, row: number) => BlockColor | null) => {
  const out: Cell[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const color = pick(col, row);
      if (color) out.push({ col, row, color });
    }
  return out;
};
const rows1: BlockColor[] = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
];
const rows2: BlockColor[] = [
  "gray",
  "cyan",
  "hotpink",
  "yellow",
  "magenta",
  "green",
];
const rows4: BlockColor[] = [
  "cyan",
  "magenta",
  "green",
  "yellow",
  "hotpink",
  "red",
];
const pyStart = [4, 3, 2, 1, 0, 0];
const pyEnd = [5, 6, 7, 8, 9, 9];
const gaps4 = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];
export const LEVELS: Cell[][] = [
  grid((_, r) => rows1[r]),
  grid((c, r) => (c >= pyStart[r] && c <= pyEnd[r] ? rows2[r] : null)),
  grid((c, r) => ((c + r) % 2 === 0 ? (r < 3 ? "yellow" : "magenta") : null)),
  grid((c, r) => (gaps4[r].includes(c) ? null : rows4[r])),
  grid((c, r) => {
    const frame = c === 0 || c === 9 || r === 0 || r === 5;
    const cross = c === 4 || r === 2;
    return frame || cross ? (cross && !frame ? "hotpink" : "cyan") : null;
  }),
];
