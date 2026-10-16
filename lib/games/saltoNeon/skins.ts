import type { SkinId } from "../types";
export type Palette = {
  bg: string;
  building: string; // relleno de los edificios del fondo
  buildingLine: string | null; // si existe, edificios solo con contorno
  ground: string; // línea del suelo y obstáculos
  grid: string;
  orb: string;
  player: string;
  text: string; // texto "NIVEL n"
  glow: number; // shadowBlur; 0 = sin glow
  pixel: boolean; // true: formas escalonadas, esquinas duras, sin alfa
};
export const PALETTES: Record<SkinId, Palette> = {
  // aspecto original del juego
  clasico: {
    bg: "#05030f",
    building: "rgba(255,43,214,0.25)",
    buildingLine: null,
    ground: "#ff2bd6",
    grid: "rgba(255,43,214,0.3)",
    orb: "#ffe600",
    player: "#00f5ff",
    text: "#00f5ff",
    glow: 12,
    pixel: false,
  },
  // sintético: violeta/lima sobre negro azulado, glow fuerte, ciudad en alambre
  neon: {
    bg: "#02010c",
    building: "rgba(0,0,0,0)",
    buildingLine: "#7a2cff",
    ground: "#39ff14",
    grid: "rgba(122,44,255,0.55)",
    orb: "#ff9d00",
    player: "#00e5ff",
    text: "#39ff14",
    glow: 28,
    pixel: false,
  },
  // 5 colores tipo Game Boy, sin glow ni alfa, formas de píxel
  retro: {
    bg: "#0f380f",
    building: "#1b4d1b",
    buildingLine: null,
    ground: "#8bac0f",
    grid: "#306230",
    orb: "#e0f8d0",
    player: "#9bbc0f",
    text: "#e0f8d0",
    glow: 0,
    pixel: true,
  },
};
