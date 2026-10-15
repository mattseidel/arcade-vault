# SPEC 07 — Juego Bloque Buster (Arkanoid) en el reproductor

> **Status:** Approved
> **Depends on:** SPEC 04 (motor/`GamePlayer`), SPEC 05 (ranking), SPEC 06 (registro de juegos), `lib/games.ts` (id `bloque-buster`)
> **Date:** 2026-10-15
> **Objective:** Portar `references/started-games/04-arkanoid` a un módulo TypeScript, jugarlo en `/juegos/bloque-buster/jugar` dentro de `GamePlayer` y guardar la mejor puntuación de cada jugador en Supabase.

---

## Scope

**In:**

- Motor TS sin globales ni DOM (`lib/games/bloqueBuster/`), canvas lógico fijo 800×600, mecánicas del original: paleta 81×14 a 400 px/s, pelota 16×16, 5 niveles de 10×6 celdas de 64×24 (origen x=80, y=80), velocidad base (200, −300) × multiplicador de nivel `[1, 1.10, 1.21, 1.33, 1.46]`, 10 puntos por bloque, 3 vidas, rebote en paredes/techo/paleta, pelota perdida → −1 vida y reinicio sobre la paleta, nivel completo → siguiente, nivel 5 completo → fin de partida (victoria).
- Layouts de los 5 niveles portados tal cual de `levels.js` (pirámide, tablero, huecos, marco con cruz).
- Sprites del original (spritesheet) y explosión de 4 frames / 150 ms al romper un bloque.
- Entrada en el registro de juegos reales (`REAL_GAMES`) y en `RANKED_GAMES`.
- HUD/PAUSA/FIN/modal son los de `GamePlayer`; el canvas no dibuja score/vidas/nivel ni "GAME OVER" / "¡Completaste el juego!".
- Controles de teclado: ← → o A D mover, P / Esc pausa. Aviso "REQUIERE TECLADO" en táctil.
- Migración que añade `'bloque-buster'` a `submit_score`; pestaña BLOQUE BUSTER del Salón con datos reales.

**Out of scope (para specs futuras):** controles táctiles, mouse, sonido (`ball-bounce.mp3`, `break-sound.mp3`), anti-trampas/rate limit, Auth, historial de partidas, botones "Saltar al nivel" del menú de pausa (herramienta de desarrollo), ángulo de rebote según el punto de la paleta, power-ups.

---

## Data model

```ts
// lib/games/bloqueBuster/constants.ts — portadas de game.js
export const W = 800,
  H = 600;
export const SPEEDS = [1, 1.1, 1.21, 1.33, 1.46];
// lib/games/bloqueBuster/levels.ts — LEVELS: { col, row, color }[][] generado como en levels.js
// lib/games/bloqueBuster/engine.ts
export function createBloqueBuster(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine;
```

Convenciones: unidades en px y ms; `dt` con tope 50 ms (el original no lo tenía); `game_id = "bloque-buster"`. `onStats` emite `{ score, lives, level }` al cambiar cualquiera; `onGameOver(score)` una sola vez, al perder la última vida o al limpiar el nivel 5. Azar: ninguno. El spritesheet se copia a `public/games/bloqueBuster/spritesheet.png` y se carga dentro de `start()`; mientras no cargue, el motor no dibuja bloques.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Client Components, Server Actions, `cacheComponents`). El canvas 4:3 ya existe; no hay UI nueva que requiera `/frontend-design`.

0. Registro ya hecho (SPEC 06): nada que refactorizar. Verificar que `rocas` y `caida` siguen igual al final.
1. Crear `constants.ts`, `levels.ts` y `types.ts`; copiar el spritesheet a `public/games/bloqueBuster/`. Verificar: lint pasa.
2. Crear `engine.ts` portando el original; `onStats`/`onGameOver`, `pause/resume/restart/destroy`, `visibilitychange`, tope de `dt`. Verificar: lint y `tsc` pasan.
3. Registrar el juego en `REAL_GAMES` (800×600, `lives: true`) y `RANKED_GAMES`. Verificar: `/juegos/bloque-buster/jugar` muestra el juego; los simulados siguen igual.
4. Estilos del canvas: 800×600 es 4:3, debería reutilizar los de `rocas`; solo ajustar si hay desborde a 375px y 1280px.
5. Migración `allowBloqueBusterScores` con el MCP de Supabase + copia a `supabase/migrations/`. Verificar: `submit_score` mejora/no mejora/rechaza; `get_advisors` limpio; borrar filas de prueba.
6. Revisión con Playwright en `.playwright-screenshots/`: partida, pausa, modal, guardado (récord y no-récord), `/salon` con 0, 1 y 12+ filas, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Cada bloque roto suma 10 puntos; la paleta se mueve a 400 px/s sin salir del canvas.
- [ ] La pelota rebota en paredes, techo y paleta; al caer por abajo resta una vida y reaparece sobre la paleta.
- [ ] Los 5 niveles tienen los layouts de `levels.js` y la velocidad `200/−300 × [1, 1.10, 1.21, 1.33, 1.46]`.
- [ ] Limpiar un nivel carga el siguiente (mantiene puntos y vidas); limpiar el 5 termina la partida.
- [ ] Perder las 3 vidas termina la partida; `onGameOver` se llama una sola vez.
- [ ] Cada bloque roto muestra la explosión de 4 frames durante 150 ms.
- [ ] PAUSA congela; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero (nivel 1, 3 vidas, 0 puntos).
- [ ] Al terminar aparece "FIN DEL JUEGO" con la puntuación correcta; FIN abre el modal con la actual.
- [ ] Guardar crea/actualiza la fila `bloque-buster / <NOMBRE> / <score>`; menor puntuación muestra `▸ TU MEJOR MARCA ES <n>_` sin cambiar la fila.
- [ ] Error de red: `[ERROR] No se pudo guardar la puntuación.`, nombre conservado, reintento posible.
- [ ] `/salon`, pestaña BLOQUE BUSTER, muestra el top 12 real; vacío → "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO".
- [ ] No regresión: `rocas`, `caida` y los juegos simulados se comportan como antes.
- [ ] Flechas/A/D no hacen scroll; el input de iniciales funciona.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **id `bloque-buster`:** ya existe en el catálogo (ARCADE, cyan, `cover-bricks`); es el `game_id` de la BD y no cambia después.
- **Sprites vs. rectángulos:** se usa el spritesheet del original (es la identidad visual del juego) en lugar de rectángulos neón; coste: un PNG en `public/` y una carga de imagen. Alternativa: `fillRect` con glow, sin assets.
- **Colisión con bloques:** el original siempre invierte `vy`, incluso en golpes laterales. Se invierte el eje de menor solapamiento (unas 4 líneas más); sigue siendo un bloque por frame.
- **Sin ángulo en la paleta:** la pelota conserva `vx` fijo como en el original; añadir control por zona de impacto queda para otra spec.
- **Sin mouse:** el original mueve la paleta con el ratón; se omite para mantener la regla "solo teclado" de la plataforma.
- **Victoria:** limpiar el nivel 5 llama a `onGameOver(score)`; `GamePlayer` muestra "FIN DEL JUEGO" igual que en derrota (sin pantalla de victoria propia).
- **HUD:** puntos, vidas y nivel (1–5) los pinta `GamePlayer`; el canvas no dibuja el HUD del original.
- **`dt` máximo 50 ms:** evita que la pelota atraviese bloques tras volver de una pestaña en segundo plano.

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
| Pelota atraviesa bloques/paleta a velocidad alta           | Tope de `dt` 50 ms (≈ 22 px/frame a 1.46×, < 24 px) |
| Spritesheet aún sin cargar al empezar                      | El motor no dibuja bloques hasta `onload`           |
| Pelota que rebota en bucle horizontal sin bajar            | Se acepta: `vy` nunca es 0 y la paleta la devuelve  |

---

## What is **not** in this spec

Controles táctiles, mouse, sonido, anti-trampas/rate limit, Auth, historial de partidas, "Saltar al nivel", ángulo de rebote en la paleta y power-ups.
