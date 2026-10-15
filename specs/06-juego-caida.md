# SPEC 06 — Juego Caída (Tetris) en el reproductor

> **Status:** Implemented
> **Depends on:** SPEC 04 (motor/`GamePlayer`), SPEC 05 (ranking), `lib/games.ts` (id `caida`)
> **Date:** 2026-10-15
> **Objective:** Portar `references/started-games/03-tetris` a un módulo TypeScript, jugarlo en `/juegos/caida/jugar` dentro de `GamePlayer` y guardar la mejor puntuación de cada jugador en Supabase.

---

## Scope

**In:**

- Motor TS sin globales ni DOM (`lib/games/caida/`), canvas lógico fijo 300×600 (10×20 celdas de 30 px), mecánicas del original: 8 piezas (I, O, T, S, Z, J, L y la "tuerca" N), rotación horaria con wall kicks `[0,-1,1,-2,2]`, ghost piece (alpha 0.2), soft drop (+1/fila), hard drop (+2/celda), puntos por líneas `[0,100,300,500,800] × nivel`, nivel = `floor(líneas/10)+1`, intervalo `max(100, 1000 − (nivel−1)×90)` ms.
- Vista previa de la siguiente pieza: segundo canvas opcional 120×120 dibujado por el mismo motor (ver Decisions).
- Entrada en el registro de juegos reales (`REAL_GAMES`) y en `RANKED_GAMES`.
- HUD/PAUSA/FIN/modal son los de `GamePlayer`; el canvas no dibuja score/nivel ni "GAME OVER".
- Controles: ← → o A D mover, ↓ o S soft drop, ↑ / W / X rotar, Espacio hard drop, P pausa. Aviso "REQUIERE TECLADO" en táctil.
- Migración que añade `'caida'` a `submit_score`; pestaña CAÍDA del Salón con datos reales.
- Paso 0: refactor a registro (`REAL_GAMES`, `RANKED_GAMES`, `game-canvas.tsx`, contrato genérico `lib/games/types.ts`), sin cambio de comportamiento para `rocas` (hoy sigue hardcodeado en `game-player.tsx`, `actions.ts`, `salon/page.tsx` y `submit_score`).

**Out of scope (para specs futuras):** controles táctiles, sonido, anti-trampas/rate limit, Auth, historial de partidas, tema claro/oscuro del original (`localStorage`), contador de líneas en el HUD de la plataforma, cola de varias piezas siguientes, hold.

---

## Data model

```ts
// lib/games/caida/constants.ts — portadas tal cual de game.js
export const COLS = 10,
  ROWS = 20,
  BLOCK = 30;
export const COLORS, PIECES, LINE_SCORES;
// lib/games/caida/engine.ts
export function createCaida(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
  nextCanvas?: HTMLCanvasElement | null,
): GameEngine;
```

Convenciones: unidades en celdas y ms; `dt` con tope 50 ms (el original acumulaba sin tope); `game_id = "caida"`. `onStats` emite `{ score, lives: 0, level }` al cambiar cualquiera; `onGameOver(score)` una vez cuando una pieza nueva colisiona al aparecer. Azar (`Math.random`) solo dentro del motor, ya en cliente.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Client Components, Server Actions, `cacheComponents`). Usar `/frontend-design` para cualquier UI nueva (hueco de "siguiente pieza").

0. Refactor a registro según `.claude/skills/arcade-game/references/integration.md`: `lib/games/types.ts`, `RANKED_GAMES`, `components/games/registry.ts`, `asteroidsCanvas.tsx` → `game-canvas.tsx`, `game-player.tsx` (`real` en vez de `isRocas`), `actions.ts`, `salon/page.tsx`. Verificar: `rocas` se comporta igual; lint y `tsc` pasan.
1. Crear `constants.ts` y `types.ts`. Verificar: lint pasa.
2. Crear `engine.ts` portando el original; `onStats`/`onGameOver`, `pause/resume/restart/destroy`, `visibilitychange`. Verificar: lint y `tsc` pasan.
3. Registrar `caida` en `REAL_GAMES` (300×600) y `RANKED_GAMES`. Verificar: `/juegos/caida/jugar` muestra el juego; los simulados siguen igual.
4. Estilos del canvas (aspect-ratio 1:2, preview de siguiente pieza, aviso de teclado). Verificar: sin desborde a 375px y 1280px.
5. Migración `allow_caida_scores` con el MCP de Supabase + copia a `supabase/migrations/`. Verificar: `submit_score` mejora/no mejora/rechaza; `get_advisors` limpio; borrar filas de prueba.
6. Revisión con Playwright en `.playwright-screenshots/`: partida, pausa, modal, guardado (récord y no-récord), `/salon` con 0, 1 y 12+ filas, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Tablero 10×20; 8 tipos de pieza, incluida la tuerca N 3×3.
- [ ] 1/2/3/4 líneas dan 100/300/500/800 × nivel; soft drop +1 por fila; hard drop +2 por celda.
- [ ] Nivel sube cada 10 líneas; intervalo de caída `max(100, 1000 − (nivel−1)×90)` ms.
- [ ] Rotar junto a pared o pila aplica kicks `[0,-1,1,-2,2]`; si ninguno cabe, no rota.
- [ ] El ghost se dibuja donde caería la pieza.
- [ ] PAUSA congela; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero.
- [ ] Al terminar aparece "FIN DEL JUEGO" con la puntuación correcta; FIN abre el modal con la actual.
- [ ] Guardar crea/actualiza la fila `caida / <NOMBRE> / <score>`; menor puntuación muestra `▸ TU MEJOR MARCA ES <n>_` sin cambiar la fila.
- [ ] Error de red: `[ERROR] No se pudo guardar la puntuación.`, nombre conservado, reintento posible.
- [ ] `/salon`, pestaña CAÍDA, muestra el top 12 real; vacío → "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO".
- [ ] No regresión: `rocas` y los juegos simulados se comportan como antes.
- [ ] Flechas/Espacio no hacen scroll; el input de iniciales funciona.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **id `caida`:** ya existe en el catálogo (PUZZLE, magenta, `cover-tetro`); es el `game_id` de la BD y no cambia después.
- **Pieza N (tuerca):** se conserva; es seña del original aunque no sea Tetris estándar.
- **Estética:** colores de piezas del original sobre el fondo CRT de la plataforma; sin tema claro propio.
- **HUD:** el original muestra puntos, líneas y nivel. La plataforma muestra puntos, vidas y nivel: se emite `lives: 0` y `GamePlayer` oculta el bloque de vidas cuando el juego real no tiene (cambio pequeño en el paso 0/3); las líneas no se muestran.
- **Siguiente pieza:** se dibuja en un segundo canvas 120×120 junto al tablero (`nextCanvas` opcional en el motor). Alternativa: omitirla; pierde jugabilidad, no recomendada.
- **Game over sin vidas:** termina cuando la pieza nueva colisiona al aparecer, como el original.
- **`dt` máximo 50 ms:** evita saltos de caída tras volver de una pestaña en segundo plano.

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
| Canvas 1:2 alto desborda en móvil/pantallas bajas          | Aspect-ratio por CSS limitado por `max-height`      |
| Segundo canvas de preview no montado al crear el motor     | `GameCanvas` pasa el ref del preview tras montar    |
| Refactor del paso 0 rompe `rocas`                          | Comprobar `rocas` antes de seguir                   |

---

## What is **not** in this spec

Controles táctiles, sonido, anti-trampas/rate limit, Auth, historial de partidas, tema claro/oscuro del original, contador de líneas en el HUD, cola de piezas siguientes y hold.
