import { createAsteroids } from "@/lib/games/asteroids/engine";
import { H, W } from "@/lib/games/asteroids/constants";
import { createCaida } from "@/lib/games/caida/engine";
import { BLOCK, COLS, ROWS } from "@/lib/games/caida/constants";
import { createBloqueBuster } from "@/lib/games/bloqueBuster/engine";
import { H as BH, W as BW } from "@/lib/games/bloqueBuster/constants";
import { createSerpentina } from "@/lib/games/serpentina/engine";
import { H as SH, W as SW } from "@/lib/games/serpentina/constants";
import { createSaltoNeon } from "@/lib/games/saltoNeon/engine";
import { H as NH, W as NW } from "@/lib/games/saltoNeon/constants";
import type { PadLayout } from "@/lib/games/pads";
import type { CreateGame } from "@/lib/games/types";
export type RealGame = {
  create: CreateGame;
  width: number;
  height: number;
  lives: boolean; // false: el HUD oculta las vidas
  skins?: boolean; // el motor soporta SkinId (clasico/neon/retro)
  aux?: { width: number; height: number }; // canvas de apoyo (siguiente pieza)
  pad: PadLayout; // botones del gamepad táctil (teclas que lee el motor)
};
export const REAL_GAMES: Record<string, RealGame> = {
  rocas: {
    create: createAsteroids,
    width: W,
    height: H,
    lives: true,
    pad: [
      {
        code: "ArrowLeft",
        label: "GIRAR IZQUIERDA",
        area: "dpad",
        pos: "left",
      },
      {
        code: "ArrowRight",
        label: "GIRAR DERECHA",
        area: "dpad",
        pos: "right",
      },
      { code: "ArrowUp", label: "PROPULSAR", area: "dpad", pos: "up" },
      { code: "Space", label: "DISPARO", area: "action" },
    ],
  },
  "bloque-buster": {
    create: createBloqueBuster,
    width: BW,
    height: BH,
    lives: true,
    pad: [
      { code: "ArrowLeft", label: "IZQUIERDA", area: "dpad", pos: "left" },
      { code: "ArrowRight", label: "DERECHA", area: "dpad", pos: "right" },
    ],
  },
  serpentina: {
    create: createSerpentina,
    width: SW,
    height: SH,
    lives: false,
    pad: [
      { code: "ArrowUp", label: "ARRIBA", area: "dpad", pos: "up" },
      { code: "ArrowLeft", label: "IZQUIERDA", area: "dpad", pos: "left" },
      { code: "ArrowRight", label: "DERECHA", area: "dpad", pos: "right" },
      { code: "ArrowDown", label: "ABAJO", area: "dpad", pos: "down" },
    ],
  },
  "salto-neon": {
    create: createSaltoNeon,
    width: NW,
    height: NH,
    lives: false,
    skins: true,
    pad: [{ code: "Space", label: "SALTAR", area: "action" }],
  },
  caida: {
    create: createCaida,
    width: COLS * BLOCK,
    height: ROWS * BLOCK,
    lives: false,
    aux: { width: 4 * BLOCK, height: 4 * BLOCK },
    pad: [
      { code: "ArrowLeft", label: "IZQUIERDA", area: "dpad", pos: "left" },
      { code: "ArrowRight", label: "DERECHA", area: "dpad", pos: "right" },
      { code: "ArrowDown", label: "BAJAR", area: "dpad", pos: "down" },
      { code: "KeyX", label: "ROTAR", area: "action" }, // A
      { code: "Space", label: "SOLTAR", area: "action" }, // B: caída instantánea
    ],
  },
};
