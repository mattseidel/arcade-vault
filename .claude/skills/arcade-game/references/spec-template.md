# Plantilla de spec para un juego nuevo

Copia a `specs/NN-juego-<id>.md`, sustituye lo que está entre `<>` y borra lo que no aplique. Formato idéntico a `specs/04-juego-asteroides.md` y `05-scoreboard-supabase.md`; el contenido va en español.

````markdown
# SPEC NN — Juego <Título> en el reproductor

> **Status:** Draft
> **Depends on:** SPEC 04 (motor/`GamePlayer`), SPEC 05 (ranking), `lib/games.ts` (id `<id>`)
> **Date:** <YYYY-MM-DD>
> **Objective:** Portar <origen: references/started-games/NN-x | juego nuevo> a un módulo TypeScript, jugarlo en `/juegos/<id>/jugar` dentro de `GamePlayer` y guardar la mejor puntuación de cada jugador en Supabase.

---

## Scope

**In:**

- Motor TS sin globales ni DOM (`lib/games/<id>/`), canvas lógico fijo <W>×<H>, mecánicas: <lista>.
- Entrada en el registro de juegos reales (`REAL_GAMES`) y en `RANKED_GAMES`.
- HUD/PAUSA/FIN/modal son los de `GamePlayer`; el canvas no dibuja score/vidas/nivel ni "GAME OVER".
- Controles de teclado: <teclas>. Aviso "REQUIERE TECLADO" en táctil.
- Migración que añade `'<id>'` a `submit_score`; pestaña <TÍTULO> del Salón con datos reales.
- <Paso 0 si aplica: refactor a registro (`REAL_GAMES`, `RANKED_GAMES`, `game-canvas.tsx`), sin cambio de comportamiento para `rocas`.>

**Out of scope (para specs futuras):** controles táctiles, sonido, anti-trampas/rate limit, Auth, historial de partidas, <extras del original que no se portan>.

---

## Data model

```ts
// lib/games/<id>/constants.ts — portadas tal cual de game.js
// lib/games/<id>/engine.ts
export function create<Nombre>(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine;
```

Convenciones: unidades, `dt` con tope 50 ms, qué se emite en `lives`/`level` si el juego no los tiene, `game_id = "<id>"`.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Client Components, Server Actions, `cacheComponents`). Usar `/frontend-design` para cualquier UI nueva.

0. <Refactor a registro, solo si `rocas` sigue hardcodeado.> Verificar: `rocas` se comporta igual; lint y `tsc` pasan.
1. Crear `constants.ts` y `types.ts`. Verificar: lint pasa.
2. Crear `engine.ts` (y `entities.ts`) portando el original; `onStats`/`onGameOver`, `pause/resume/restart/destroy`. Verificar: lint y `tsc` pasan.
3. Registrar el juego en `REAL_GAMES` y `RANKED_GAMES`. Verificar: `/juegos/<id>/jugar` muestra el juego; los simulados siguen igual.
4. Estilos del canvas (aspect-ratio, aviso de teclado). Verificar: sin desborde a 375px y 1280px.
5. Migración `allow_<id>_scores` con el MCP de Supabase + copia a `supabase/migrations/`. Verificar: `submit_score` mejora/no mejora/rechaza; `get_advisors` limpio; borrar filas de prueba.
6. Revisión con Playwright en `.playwright-screenshots/`: partida, pausa, modal, guardado (récord y no-récord), `/salon` con 0, 1 y 12+ filas, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] <Criterios de mecánica, uno por regla del juego, con cifras exactas.>
- [ ] PAUSA congela; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero.
- [ ] Al terminar aparece "FIN DEL JUEGO" con la puntuación correcta; FIN abre el modal con la actual.
- [ ] Guardar crea/actualiza la fila `<id> / <NOMBRE> / <score>`; menor puntuación muestra `▸ TU MEJOR MARCA ES <n>_` sin cambiar la fila.
- [ ] Error de red: `[ERROR] No se pudo guardar la puntuación.`, nombre conservado, reintento posible.
- [ ] `/salon`, pestaña <TÍTULO>, muestra el top 12 real; vacío → "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO".
- [ ] No regresión: `rocas` y los juegos simulados se comportan como antes.
- [ ] Flechas/WASD/Espacio no hacen scroll; el input de iniciales funciona.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **Sí/No:** <decisión> — <motivo>. (Mínimo: id del catálogo, estética, qué se conserva del HUD original, qué se emite en `lives`/`level`.)

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
| <riesgo propio del juego>                                  | <mitigación>                                        |

---

## What is **not** in this spec

<Repetir los puntos Out of scope.>
````
