# SPEC GJ-1 — Ranaria (Frogger): motor jugable

> **Status:** Draft
> **Depends on:** SPEC 04 (motor/`GamePlayer`), SPEC 06 (registro de juegos), `lib/games.ts` (id `ranaria`)
> **Date:** 2026-10-15
> **Objective:** Crear el motor TypeScript de Ranaria (cruzar calle y río hasta los nenúfares) y jugarlo en `/juegos/ranaria/jugar` dentro de `GamePlayer`, sin guardar puntuaciones todavía.

---

## Scope

**In:**

- Motor TS sin globales ni DOM (`lib/games/ranaria/`), canvas lógico fijo 800×600 (grilla 16×12 de celdas de 50 px, 4:3 como `rocas`).
- Filas (de arriba a abajo): 0 meta con 5 nenúfares, 1–5 río (troncos), 6 mediana segura, 7–11 calle (coches); la rana empieza en la fila 11, columna 8 (centro).
- Mecánicas: un salto de 1 celda por pulsación (instantáneo, sin repetir al mantener); un coche que toca la rana la mata; en el río, la rana muere si no está sobre un tronco y se desplaza con él; salir por los bordes laterales la mata; alcanzar un nenúfar libre la devuelve al inicio; 3 vidas.
- Carriles: 5 de calle y 5 de río con sentido alterno y velocidad fija por carril (ver Data model); objetos que reaparecen por el lado opuesto al salir.
- Dibujo con rectángulos neón (rana verde, coches magenta/cyan, troncos amarillos, agua azul oscuro); sin assets.
- Entrada en `REAL_GAMES` (800×600, `lives: true`). **No** entra en `RANKED_GAMES`.
- HUD/PAUSA/FIN son los de `GamePlayer`; el canvas no dibuja score/vidas ni "GAME OVER".
- Controles de teclado: flechas o WASD para saltar, P / Esc pausa. Aviso "REQUIERE TECLADO" en táctil.

**Out of scope (para specs futuras):** niveles y dificultad creciente, temporizador, puntuación completa y bonus (SPEC GJ-2); ranking y Supabase (SPEC GJ-3); tortugas que se hunden, cocodrilos, moscas, controles táctiles, sonido.

---

## Data model

```ts
// lib/games/ranaria/constants.ts
export const CELL = 50,
  COLS = 16,
  ROWS = 12;
export const W = COLS * CELL,
  H = ROWS * CELL;
export const START_COL = 8,
  START_ROW = 11,
  LIVES = 3;
export const HOME_COLS = [1, 4, 7, 10, 13]; // columnas de los 5 nenúfares (fila 0)
// px/s; el signo es el sentido. Filas 1–5 río, 7–11 calle
export const LANES: Record<
  number,
  { speed: number; len: number; gap: number; kind: "log" | "car" }
>;
// lib/games/ranaria/engine.ts
export function createRanaria(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine;
```

Convenciones: unidades en px y ms; `dt` con tope 50 ms; el movimiento de objetos es continuo (px/s) y el de la rana por celdas. `LANES` define por carril `speed` (60–180 px/s), `len` (1–4 celdas), `gap` (celdas libres entre objetos) y `kind`; el valor exacto de cada carril se fija al implementar dentro de esos rangos y queda en `constants.ts`. Con una rana sobre un tronco, `x += speed·dt`; al salir de los bordes (`x < 0` o `x ≥ W`) muere. `onStats` emite `{ score: 0, lives, level: 1 }` al perder una vida (la puntuación llega en GJ-2). `onGameOver(score)` una sola vez, al perder la 3.ª vida. `game_id = "ranaria"`. Sin azar: los carriles se generan de forma determinista con `len`/`gap`.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Client Components, `cacheComponents`). El canvas 4:3 ya existe; no hay UI nueva que requiera `/frontend-design`.

0. Registro ya hecho (SPEC 06): nada que refactorizar. Verificar al final que `rocas`, `caida`, `bloque-buster` y `serpentina` siguen igual.
1. Crear `constants.ts` y `types.ts`. Verificar: lint pasa.
2. Crear `engine.ts`: carriles, salto, colisiones, arrastre por tronco, vidas; `pause/resume/restart/destroy`, `visibilitychange`, tope de `dt`. Verificar: lint y `tsc` pasan.
3. Registrar en `REAL_GAMES` (800×600, `lives: true`). Verificar: `/juegos/ranaria/jugar` muestra el juego; los simulados siguen igual.
4. Estilos: reutilizar los 4:3 de `rocas`; solo ajustar si hay desborde a 375px y 1280px.
5. Revisión con Playwright en `.playwright-screenshots/`: partida, pausa, muerte por coche, muerte por agua, llegada al nenúfar, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] La rana aparece en fila 11, columna 8 y salta exactamente 50 px por pulsación; mantener la tecla no repite el salto.
- [ ] La rana no puede salir del canvas por arriba/abajo; por los lados solo muere si es arrastrada por un tronco.
- [ ] Tocar un coche resta una vida y devuelve la rana al inicio.
- [ ] En las filas 1–5, estar fuera de un tronco resta una vida; sobre un tronco, la rana se mueve a su velocidad.
- [ ] Alcanzar un nenúfar libre devuelve la rana al inicio sin perder vida; saltar a la fila 0 fuera de un nenúfar resta una vida.
- [ ] Perder las 3 vidas termina la partida; `onGameOver` se llama una sola vez.
- [ ] PAUSA congela coches y troncos; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero (3 vidas, rana en el inicio).
- [ ] Al terminar aparece "FIN DEL JUEGO"; el modal de guardado no aparece (juego aún no ranked).
- [ ] No regresión: `rocas`, `caida`, `bloque-buster`, `serpentina` y los juegos simulados se comportan como antes.
- [ ] Flechas/WASD no hacen scroll.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **id `ranaria`:** ya existe en el catálogo (ARCADE, green, `cover-rana`); es el `game_id` de la BD y no cambia después.
- **Salto por celda, objetos continuos:** la rana va por grilla (control preciso, clásico); coches y troncos se mueven en px/s para un movimiento fluido. Alternativa: todo por pasos de grilla, más simple pero menos fiel.
- **Colisión por solapamiento de rectángulos:** la rana (36×36 px, centrada en su celda) contra el rectángulo del objeto; margen que perdona roces. Alternativa: celda completa, más estricta.
- **Sin tortugas ni cocodrilos:** solo troncos en el río para el MVP; los extras van en una spec futura.
- **Rectángulos neón:** coherente con el estilo CRT y sin assets. Alternativa: sprites pixel-art, coste de PNG y carga.
- **Vidas, no tiempo:** el HUD muestra vidas; el temporizador llega con GJ-2.
- **`dt` máximo 50 ms:** evita que un tronco o coche "teletransporte" tras volver de una pestaña en segundo plano.

---

## Risks

| Riesgo                                                | Mitigación                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| Strict Mode deja dos loops/listeners                  | `destroy()` cancela rAF y quita listeners                     |
| `Math.random`/`performance.now` rompen la hidratación | El motor solo se crea en `useEffect`                          |
| Flechas hacen scroll o activan botones                | `preventDefault` solo jugando; blur del botón PAUSA           |
| Pestaña en segundo plano genera un `dt` enorme        | Tope de 50 ms + pausa en `visibilitychange`                   |
| Rana arrastrada fuera del canvas por un tronco        | Muerte al cruzar `x < 0` o `x ≥ W`; comprobación cada frame   |
| Salto a un tronco que sale del borde injusto          | Margen de 1 celda de tronco visible antes de que sea saltable |
| Carriles imposibles por mala combinación de `gap`     | `gap` mínimo de 2 celdas en calle y 1 en río, revisado en QA  |

---

## What is **not** in this spec

Niveles y dificultad creciente, temporizador, puntuación y bonus, ranking/Supabase, tortugas, cocodrilos, moscas, controles táctiles y sonido.
