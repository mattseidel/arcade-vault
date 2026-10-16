import {
  GOAL_STARTS,
  GOAL_W,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
} from "./constants";
import type { Entity, Frog, Lane } from "./types";
// ponytail: la rana es 1 celda; al subirse a un tronco su col deja de ser entera,
// así que se compara el centro (soporte) o la celda con un margen (carretera)
const INSET = 0.15;
export function roadCollision(frog: Frog, lanes: Lane[]): boolean {
  if (frog.row < ROW_ROAD_TOP || frog.row > ROW_ROAD_BOT) return false;
  const l = frog.col + INSET;
  const r = frog.col + 1 - INSET;
  return lanes.some(
    (lane) =>
      lane.row === frog.row &&
      lane.entities.some((e) => l < e.col + e.width && r > e.col),
  );
}
// entidad que sostiene a la rana en el río (null = cae al agua o tortuga sumergida)
export function getSupport(
  frog: Frog,
  lanes: Lane[],
): { lane: Lane; entity: Entity } | null {
  if (frog.row < ROW_RIVER_TOP || frog.row > ROW_RIVER_BOT) return null;
  const c = frog.col + 0.5;
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    for (const entity of lane.entities)
      if (c >= entity.col && c < entity.col + entity.width)
        return entity.submerged ? null : { lane, entity };
  }
  return null;
}
// índice de la boca que cubre la columna de la rana, o -1 si cae entre bocas
export function goalIndex(frog: Frog): number {
  const c = frog.col + 0.5;
  return GOAL_STARTS.findIndex((s) => c >= s && c < s + GOAL_W);
}
