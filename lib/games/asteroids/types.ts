export type AsteroidsStats = { score: number; lives: number; level: number };

export type AsteroidsCallbacks = {
  onStats: (s: AsteroidsStats) => void; // cuando cambia score, lives o level
  onGameOver: (finalScore: number) => void; // una sola vez por partida
};

export type AsteroidsEngine = {
  start(): void; // inicia el loop (rAF) y los listeners de teclado
  pause(): void;
  resume(): void;
  restart(): void; // nueva partida: 3 vidas, nivel 1, score 0
  destroy(): void; // detiene el loop y quita los listeners
};
