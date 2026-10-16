import {
  ROW_RIVER_TOP,
  ROW_ROAD_TOP,
  SPEED_PER_LEVEL,
  TURTLE_SUBMERGED_MS,
  TURTLE_VISIBLE_MS,
} from "./constants";
import type { Entity, EntityType, Lane } from "./types";
// Longitud del bucle de cada carril (≥ COLS + el ancho máximo): al salir por un
// lado la entidad reaparece LOOP celdas atrás, así los huecos se conservan.
export const LOOP = 20;
// [tipo, ancho, hueco posterior]; ancho + hueco suman LOOP por carril
type Pat = [EntityType, number, number];
type Def = { row: number; speed: number; dir: 1 | -1; pat: Pat[] };
const ROAD: Def[] = [
  {
    row: ROW_ROAD_TOP,
    speed: 2,
    dir: -1,
    pat: [
      ["car", 1, 4],
      ["car", 1, 4],
      ["car", 1, 4],
      ["car", 1, 4],
    ],
  },
  {
    row: ROW_ROAD_TOP + 1,
    speed: 1.5,
    dir: 1,
    pat: [
      ["truck", 3, 7],
      ["truck", 3, 7],
    ],
  },
  {
    row: ROW_ROAD_TOP + 2,
    speed: 3,
    dir: -1,
    pat: [
      ["car", 1, 3],
      ["car", 1, 3],
      ["car", 1, 3],
      ["car", 1, 3],
      ["car", 1, 3],
    ],
  },
  {
    row: ROW_ROAD_TOP + 3,
    speed: 2.5,
    dir: 1,
    pat: [
      ["truck", 2, 3],
      ["car", 1, 4],
      ["truck", 2, 3],
      ["car", 1, 4],
    ],
  },
  {
    row: ROW_ROAD_TOP + 4,
    speed: 4,
    dir: -1,
    pat: [
      ["car", 1, 4],
      ["car", 1, 4],
      ["car", 1, 4],
      ["car", 1, 4],
    ],
  },
];
const RIVER: Def[] = [
  {
    row: ROW_RIVER_TOP,
    speed: 1.2,
    dir: 1,
    pat: [
      ["log", 4, 3],
      ["log", 4, 3],
      ["log", 3, 3],
    ],
  },
  {
    row: ROW_RIVER_TOP + 1,
    speed: 1.6,
    dir: -1,
    pat: [
      ["turtle", 2, 3],
      ["turtle", 2, 3],
      ["turtle", 2, 3],
      ["turtle", 2, 3],
    ],
  },
  {
    row: ROW_RIVER_TOP + 2,
    speed: 2.4,
    dir: 1,
    pat: [
      ["log", 4, 4],
      ["log", 4, 4],
      ["log", 2, 2],
    ],
  },
  {
    row: ROW_RIVER_TOP + 3,
    speed: 1,
    dir: -1,
    pat: [
      ["log", 2, 3],
      ["log", 2, 3],
      ["log", 2, 3],
      ["log", 2, 3],
    ],
  },
  {
    row: ROW_RIVER_TOP + 4,
    speed: 1.8,
    dir: 1,
    pat: [
      ["turtle", 3, 4],
      ["turtle", 3, 4],
      ["turtle", 3, 3],
    ],
  },
  {
    row: ROW_RIVER_TOP + 5,
    speed: 2.8,
    dir: -1,
    pat: [
      ["log", 3, 3],
      ["log", 3, 3],
      ["log", 3, 5],
    ],
  },
];
const CYCLE = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
export function buildLanes(level: number): Lane[] {
  const k = SPEED_PER_LEVEL ** (level - 1);
  return [...RIVER, ...ROAD].map(({ row, speed, dir, pat }) => {
    let col = 0;
    const entities: Entity[] = pat.map(([type, width, gap], i) => {
      const e: Entity = { col, width, type };
      if (type === "turtle") {
        e.phase = (i * 1500) % CYCLE; // grupos desfasados
        e.submerged = e.phase >= TURTLE_VISIBLE_MS;
      }
      col += width + gap;
      return e;
    });
    return { row, speed: speed * k, dir, entities };
  });
}
