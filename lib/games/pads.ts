export type PadButton = {
  code: string; // KeyboardEvent.code que se emite (p. ej. "ArrowLeft", "Space")
  label: string; // cruceta: aria-label; acción: rótulo bajo el botón (A = 1.ª acción, B = 2.ª)
  area: "dpad" | "action"; // izquierda (cruceta) o derecha (acciones)
  pos?: "up" | "down" | "left" | "right"; // posición dentro de la cruceta
};
export type PadLayout = PadButton[];
export const GENERIC_PAD: PadLayout = [
  { code: "ArrowUp", label: "ARRIBA", area: "dpad", pos: "up" },
  { code: "ArrowLeft", label: "IZQUIERDA", area: "dpad", pos: "left" },
  { code: "ArrowRight", label: "DERECHA", area: "dpad", pos: "right" },
  { code: "ArrowDown", label: "ABAJO", area: "dpad", pos: "down" },
  { code: "KeyZ", label: "A", area: "action" },
  { code: "KeyX", label: "B", area: "action" },
];
