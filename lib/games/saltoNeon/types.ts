export type ObstacleKind = "spike" | "doubleSpike" | "block" | "beam";
export type Obstacle = { kind: ObstacleKind; x: number; w: number };
export type Orb = { x: number; taken: boolean };
