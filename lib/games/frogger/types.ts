export type Direction = "up" | "down" | "left" | "right";
export type EntityType = "car" | "truck" | "log" | "turtle";
export type Entity = {
  col: number; // celdas (puede ser fraccionaria)
  width: number; // celdas
  type: EntityType;
  phase?: number; // solo tortugas: ms dentro del ciclo de inmersión
  submerged?: boolean;
};
export type Lane = {
  row: number;
  speed: number; // celdas por segundo
  dir: 1 | -1;
  entities: Entity[];
};
export type Frog = {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms
  targetCol: number;
  targetRow: number;
};
