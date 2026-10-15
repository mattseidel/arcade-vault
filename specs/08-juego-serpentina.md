# SPEC 08 — Juego Serpentina (Snake) en el reproductor

> **Status:** Implemented
> **Depends on:** SPEC 04 (motor/`GamePlayer`), SPEC 05 (ranking), SPEC 06 (registro de juegos), `lib/games.ts` (id `serpentina`)
> **Date:** 2026-10-15
> **Objective:** Crear Snake como módulo TypeScript usando los sprites de `references/started-games/snake-assets` (no hay `game.js` de origen), jugarlo en `/juegos/serpentina/jugar` dentro de `GamePlayer` y guardar la mejor puntuación de cada jugador en Supabase.

---

## Scope

**In:**

- Motor TS sin globales ni DOM (`lib/games/serpentina/`), canvas lógico fijo 800×600 (grilla 20×15 de celdas de 40 px, 4:3 como `rocas`).
- Mecánicas: serpiente de 3 segmentos que avanza por pasos de grilla, una fruta a la vez en celda libre, comer = +10 puntos y +1 segmento, morir al chocar con pared o con el propio cuerpo. Sin vidas.
- Frutas: sprites de `fruits.png` (fila pixel-art, 22 frutas de `sprites.js` portadas a `lib/games/serpentina/sprites.ts`); cada fruta nueva es una al azar. Cabeza/cuerpo de la serpiente dibujados con rectángulos neón verdes (no hay sprites de serpiente).
- Entrada en `REAL_GAMES` y en `RANKED_GAMES`.
- HUD/PAUSA/FIN/modal son los de `GamePlayer`; el canvas no dibuja score/nivel ni "GAME OVER".
- Controles de teclado: flechas o WASD para girar, P / Esc pausa. Aviso "REQUIERE TECLADO" en táctil.
- Migración que añade `'serpentina'` a `submit_score`; pestaña SERPENTINA del Salón con datos reales.

**Out of scope (para specs futuras):** controles táctiles/swipe, sonido, modo sin paredes (wrap), obstáculos, frutas especiales, anti-trampas/rate limit, Auth, historial de partidas.

---

## Data model

```ts
// lib/games/serpentina/constants.ts
export const CELL = 40,
  COLS = 20,
  ROWS = 15;
export const W = COLS * CELL,
  H = ROWS * CELL;
export const START_LEN = 3;
export const BASE_STEP_MS = 140,
  MIN_STEP_MS = 70,
  STEP_DELTA_MS = 10;
export const FRUITS_PER_LEVEL = 5,
  POINTS = 10;
// lib/games/serpentina/sprites.ts — SPRITE_ATLAS portado de sprites.js (22 frutas)
// lib/games/serpentina/engine.ts
export function createSerpentina(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine;
```

Convenciones: `dt` con tope 50 ms acumulado contra el intervalo de paso; **nivel = 1 + ⌊frutas / 5⌋**, el intervalo baja 10 ms por nivel (140 → mínimo 70 ms). `onStats` emite `{ score, lives: 0, level }` (el registro pone `lives: false`, el HUD oculta vidas). `onGameOver(score)` una sola vez, al chocar o al llenar la grilla. Un giro por paso: se encola (máx. 2) y se ignora la reversa de 180°. `game_id = "serpentina"`. El azar (posición/tipo de fruta) vive solo dentro del motor. `fruits.png` (3790×442) se copia a `public/games/serpentina/fruits.png` y se carga en `start()`; hasta que cargue, la fruta se dibuja como círculo magenta.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Client Components, Server Actions, `cacheComponents`). El canvas 4:3 ya existe; no hay UI nueva que requiera `/frontend-design`.

0. Registro ya hecho (SPEC 06): nada que refactorizar. Verificar al final que `rocas`, `caida` y `bloque-buster` siguen igual.
1. Crear `constants.ts`, `sprites.ts` y `types.ts`; copiar `fruits.png` a `public/games/serpentina/`. Verificar: lint pasa.
2. Crear `engine.ts`; `onStats`/`onGameOver`, `pause/resume/restart/destroy`, `visibilitychange`, tope de `dt`. Verificar: lint y `tsc` pasan.
3. Registrar en `REAL_GAMES` (800×600, `lives: false`) y `RANKED_GAMES`. Verificar: `/juegos/serpentina/jugar` muestra el juego; los simulados siguen igual.
4. Estilos del canvas: reutiliza los 4:3 de `rocas`; solo ajustar si hay desborde a 375px y 1280px.
5. Migración `allowSerpentinaScores` con el MCP de Supabase + copia a `supabase/migrations/`. Verificar: `submit_score` mejora/no mejora/rechaza; `get_advisors` limpio; borrar filas de prueba.
6. Revisión con Playwright en `.playwright-screenshots/`: partida, pausa, modal, guardado (récord y no-récord), `/salon` con 0, 1 y 12+ filas, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] La serpiente empieza con 3 segmentos, avanza una celda por paso y no puede girar 180°.
- [ ] Comer una fruta suma 10 puntos y alarga 1 segmento; la nueva fruta aparece siempre en celda libre.
- [ ] Cada 5 frutas sube el nivel y el paso se acorta 10 ms (mínimo 70 ms).
- [ ] Chocar con pared o con el cuerpo termina la partida; `onGameOver` se llama una sola vez.
- [ ] PAUSA congela; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero (3 segmentos, 0 puntos, nivel 1).
- [ ] Al terminar aparece "FIN DEL JUEGO" con la puntuación correcta; FIN abre el modal con la actual.
- [ ] Guardar crea/actualiza la fila `serpentina / <NOMBRE> / <score>`; menor puntuación muestra `▸ TU MEJOR MARCA ES <n>_` sin cambiar la fila.
- [ ] Error de red: `[ERROR] No se pudo guardar la puntuación.`, nombre conservado, reintento posible.
- [ ] `/salon`, pestaña SERPENTINA, muestra el top 12 real; vacío → "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO".
- [ ] No regresión: `rocas`, `caida`, `bloque-buster` y los juegos simulados se comportan como antes.
- [ ] Flechas/WASD no hacen scroll; el input de iniciales funciona.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **id `serpentina`:** ya existe en el catálogo (ARCADE, green, `cover-snake`); es el `game_id` de la BD y no cambia después.
- **Sin origen `game.js`:** solo hay sprites; las reglas son las del Snake clásico (muerte en paredes, +1 por fruta). Alternativa: modo "wrap" sin paredes.
- **Sprites de fruta, serpiente con rectángulos:** el atlas solo trae frutas; la serpiente usa `fillRect` con glow verde, coherente con el estilo CRT neón.
- **Fila pixel-art del atlas:** `sprites.js` apunta a la fila y=136–295 (estilo pixel-art), con anchos 110–170 px; se escala al lado de la celda manteniendo proporción.
- **Nivel por frutas, sin vidas:** el HUD muestra puntos y nivel; `lives: false` oculta vidas (como `caida`).
- **Movimiento por pasos de grilla (no continuo):** más simple y es la sensación clásica; el tope de `dt` evita varios pasos tras volver de una pestaña.
- **Cola de giros (máx. 2):** evita perder giros rápidos y que dos giros en un mismo paso causen una reversa letal.
- **Victoria:** llenar la grilla (300 celdas) llama a `onGameOver(score)` como una derrota normal.

---

## Risks

| Riesgo                                                     | Mitigación                                          |
| ---------------------------------------------------------- | --------------------------------------------------- |
| Strict Mode deja dos loops/listeners                       | `destroy()` cancela rAF y quita listeners           |
| `Math.random`/`performance.now` rompen la hidratación      | El motor solo se crea en `useEffect`                |
| Flechas/Espacio hacen scroll o activan botones             | `preventDefault` solo jugando; blur del botón PAUSA |
| Pestaña en segundo plano genera un `dt` enorme             | Tope de 50 ms + pausa en `visibilitychange`         |
| Puntuación inventada vía RPC con la clave publishable      | Rango 1–10.000.000 en la BD; límite del MVP         |
| `cookies()` en `/salon` fuera de `Suspense` rompe el build | Lectura dentro de `Suspense`                        |
| Doble giro en un paso → reversa y muerte injusta           | Cola de giros validada contra la última dirección   |
| Fruta aparece sobre la serpiente / bucle si no hay hueco   | Elegir entre celdas libres; sin hueco = victoria    |
| Sprite aún sin cargar al empezar                           | Círculo de respaldo hasta `onload`                  |

---

## What is **not** in this spec

Controles táctiles/swipe, sonido, modo wrap, obstáculos, frutas especiales, anti-trampas/rate limit, Auth e historial de partidas.
