import type { SkinId } from "../types";
export type Palette = {
  road: string;
  river: string;
  riverLine: string; // reflejos del agua
  safe: string; // filas seguras (inicio y medio) y fondo de la fila de bocas
  mouth: string;
  mouthEdge: string;
  frog: string;
  frogDark: string;
  eye: string;
  pupil: string;
  cars: string[]; // un color por carril de carretera
  glass: string;
  truck: string;
  cab: string;
  log: string;
  logLine: string;
  turtle: string;
  shell: string;
  text: string;
  barOk: string;
  barWarn: string;
  barBad: string;
  laneLine: string;
  glow: number; // shadowBlur; 0 = sin glow
  pixel: boolean; // true: formas rectas, sin arcos ni alfa
};
export const PALETTES: Record<SkinId, Palette> = {
  // aspecto original del juego
  clasico: {
    road: "#0c0c10",
    river: "#0a2a5a",
    riverLine: "rgba(120,180,255,0.25)",
    safe: "#0b4a1c",
    mouth: "#3ddc5a",
    mouthEdge: "#f5c518",
    frog: "#39ff6a",
    frogDark: "#1a9c3c",
    eye: "#ffffff",
    pupil: "#000000",
    cars: ["#e63946", "#f5c518", "#2a7fff", "#e63946", "#f5c518"],
    glass: "#9fd4ff",
    truck: "#9aa0a6",
    cab: "#d8dce0",
    log: "#7a4a1f",
    logLine: "#4d2d10",
    turtle: "#2ecc71",
    shell: "#1e8e4f",
    text: "#ffffff",
    barOk: "#39ff6a",
    barWarn: "#f5c518",
    barBad: "#e63946",
    laneLine: "rgba(245,197,24,0.5)",
    glow: 0,
    pixel: false,
  },
  // sintético: negro azulado, líneas de luz y glow fuerte
  neon: {
    road: "#05020f",
    river: "#02051f",
    riverLine: "rgba(0,229,255,0.35)",
    safe: "#1a0640",
    mouth: "#0a0a2a",
    mouthEdge: "#ff2bd6",
    frog: "#39ff14",
    frogDark: "#1fa800",
    eye: "#ffffff",
    pupil: "#000000",
    cars: ["#ff2bd6", "#00e5ff", "#ffe600", "#ff9d00", "#7a2cff"],
    glass: "#05020f",
    truck: "#7a2cff",
    cab: "#00e5ff",
    log: "#ff9d00",
    logLine: "#7a3d00",
    turtle: "#00e5ff",
    shell: "#0077aa",
    text: "#00e5ff",
    barOk: "#39ff14",
    barWarn: "#ffe600",
    barBad: "#ff2bd6",
    laneLine: "rgba(255,43,214,0.6)",
    glow: 18,
    pixel: false,
  },
  // 4 verdes tipo Game Boy, sin glow ni alfa, formas rectas
  retro: {
    road: "#0f380f",
    river: "#306230",
    riverLine: "#0f380f",
    safe: "#1b4d1b",
    mouth: "#9bbc0f",
    mouthEdge: "#e0f8d0",
    frog: "#e0f8d0",
    frogDark: "#8bac0f",
    eye: "#0f380f",
    pupil: "#e0f8d0",
    cars: ["#8bac0f", "#e0f8d0", "#9bbc0f", "#8bac0f", "#e0f8d0"],
    glass: "#0f380f",
    truck: "#8bac0f",
    cab: "#e0f8d0",
    log: "#8bac0f",
    logLine: "#306230",
    turtle: "#9bbc0f",
    shell: "#0f380f",
    text: "#e0f8d0",
    barOk: "#e0f8d0",
    barWarn: "#9bbc0f",
    barBad: "#8bac0f",
    laneLine: "#306230",
    glow: 0,
    pixel: true,
  },
};
