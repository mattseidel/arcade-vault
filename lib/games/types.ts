export type GameStats = { score: number; lives: number; level: number };
export type GameCallbacks = {
  onStats: (s: GameStats) => void; // cuando cambia score, lives o level
  onGameOver: (finalScore: number) => void; // una sola vez por partida
};
export type GameEngine = {
  start(): void; // inicia el loop (rAF) y los listeners de teclado
  pause(): void;
  resume(): void;
  restart(): void; // nueva partida desde cero
  setSkin?(skin: SkinId): void; // cambia la skin en caliente, sin reiniciar
  destroy(): void; // detiene el loop y quita los listeners
};
// Skins visuales: única lista permitida (solo afectan al dibujo)
export const SKINS = ["clasico", "neon", "retro"] as const;
export type SkinId = (typeof SKINS)[number];
// aux: canvas opcional de apoyo (p. ej. "siguiente pieza"); skin por defecto "clasico"
export type CreateGame = (
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
  aux?: HTMLCanvasElement | null,
  skin?: SkinId,
) => GameEngine;
