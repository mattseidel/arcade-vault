import { createAsteroids } from "@/lib/games/asteroids/engine";
import { H, W } from "@/lib/games/asteroids/constants";
import { createCaida } from "@/lib/games/caida/engine";
import { BLOCK, COLS, ROWS } from "@/lib/games/caida/constants";
import { createBloqueBuster } from "@/lib/games/bloqueBuster/engine";
import { H as BH, W as BW } from "@/lib/games/bloqueBuster/constants";
import type { CreateGame } from "@/lib/games/types";
export type RealGame = {
  create: CreateGame;
  width: number;
  height: number;
  lives: boolean; // false: el HUD oculta las vidas
  aux?: { width: number; height: number }; // canvas de apoyo (siguiente pieza)
};
export const REAL_GAMES: Record<string, RealGame> = {
  rocas: { create: createAsteroids, width: W, height: H, lives: true },
  "bloque-buster": {
    create: createBloqueBuster,
    width: BW,
    height: BH,
    lives: true,
  },
  caida: {
    create: createCaida,
    width: COLS * BLOCK,
    height: ROWS * BLOCK,
    lives: false,
    aux: { width: 4 * BLOCK, height: 4 * BLOCK },
  },
};
