# SPEC GJ-2 — Ranaria: puntuación, temporizador y niveles

> **Status:** Draft
> **Depends on:** SPEC GJ-1 (motor de Ranaria), SPEC 04 (`GamePlayer`)
> **Date:** 2026-10-15
> **Objective:** Añadir a Ranaria puntuación, temporizador por vida y niveles con dificultad creciente, para que cada partida produzca una puntuación comparable.

---

## Scope

**In:**

- Puntuación: +10 por cada salto hacia una fila **más alta que la máxima alcanzada en esa vida**; +50 por llegar a un nenúfar; bonus de tiempo `10 × segundos restantes` (redondeo hacia abajo) al llegar; +1000 al ocupar el 5.º nenúfar.
- Temporizador de 30 s por intento (reinicia al perder una vida o llegar a un nenúfar); llegar a 0 resta una vida. Barra de tiempo dibujada en el canvas (la fila inferior del HUD de `GamePlayer` no muestra tiempo).
- Niveles: al ocupar los 5 nenúfares, nivel +1, nenúfares se vacían, rana al inicio. Multiplicador de velocidad de todos los carriles `1 + 0.15 × (nivel − 1)`, tope ×2.2 (nivel 9).
- Vida extra al alcanzar 5.000 puntos (una sola vez por partida).
- Feedback visual: parpadeo de 400 ms de la rana al morir, nenúfar ocupado dibujado con rana pequeña.
- `onStats` emite `{ score, lives, level }` en cada cambio.

**Out of scope (para specs futuras):** ranking y Supabase (SPEC GJ-3), tortugas que se hunden, cocodrilos, moscas bonus, sonido, controles táctiles, más vidas extra.

---

## Data model

```ts
// lib/games/ranaria/constants.ts (añadidos a GJ-1)
export const TIME_PER_TRY_MS = 30_000;
export const POINTS_ROW = 10,
  POINTS_HOME = 50,
  POINTS_ALL_HOMES = 1000,
  POINTS_PER_SECOND = 10;
export const SPEED_STEP = 0.15,
  SPEED_CAP = 2.2;
export const EXTRA_LIFE_AT = 5000;
export const DEATH_FLASH_MS = 400;
// lib/games/ranaria/engine.ts — misma firma que GJ-1
export function createRanaria(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine;
```

Convenciones: **nivel** empieza en 1; velocidad efectiva por carril = `speed × min(1 + 0.15·(nivel−1), 2.2)`. `bestRow` guarda la fila más alta alcanzada en el intento actual y se reinicia con cada respawn (evita puntuar saltando adelante y atrás). El temporizador se descuenta con `dt` ya topado a 50 ms y se congela en PAUSA y durante el parpadeo de muerte. `onStats` solo emite cuando cambia `score`, `lives` o `level`; `onGameOver(score)` una sola vez al perder la última vida. Sin azar. Todo queda dentro del motor; `GamePlayer` solo muestra los valores.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/`. La barra de tiempo es parte del canvas y sigue el estilo de GJ-1; no hay UI de plataforma nueva, así que no requiere `/frontend-design`.

0. Verificar que GJ-1 está implementada y que `/juegos/ranaria/jugar` funciona.
1. Añadir las constantes nuevas y el estado (`score`, `level`, `bestRow`, `timeLeft`, `homes[5]`, `extraLifeGiven`). Verificar: lint pasa.
2. Implementar puntuación, bonus de tiempo y vida extra; emitir `onStats`. Verificar: `tsc` pasa y la puntuación del HUD cambia al saltar.
3. Implementar temporizador (barra en el canvas, muerte a 0) y parpadeo de muerte. Verificar: sin salto de tiempo tras pausa ni cambio de pestaña.
4. Implementar progresión de nivel (vaciar nenúfares, multiplicador de velocidad con tope). Verificar: nivel 2 va a ×1.15 y nivel 9 queda en ×2.2.
5. Revisión con Playwright en `.playwright-screenshots/`: puntuación tras saltos, nenúfar ocupado, nivel 2, tiempo agotado, vida extra, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Un salto a una fila nueva suma 10; volver atrás y avanzar de nuevo en el mismo intento no suma.
- [ ] Llegar a un nenúfar suma 50 + `10 × segundos restantes` (p. ej. con 20 s restantes: 50 + 200).
- [ ] Ocupar el 5.º nenúfar suma 1000 adicionales, sube el nivel a 2 y vacía los nenúfares.
- [ ] El temporizador parte en 30 s, baja en tiempo real, se congela en PAUSA y al llegar a 0 resta una vida.
- [ ] Al subir de nivel, los carriles se mueven `1 + 0.15·(nivel−1)` veces más rápido, con tope ×2.2.
- [ ] Al llegar a 5.000 puntos se gana una vida (una sola vez por partida).
- [ ] `onStats` emite `{ score, lives, level }` correctos; `onGameOver(score)` se llama una sola vez con el total.
- [ ] PAUSA congela; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero (nivel 1, 3 vidas, 0 puntos, 30 s).
- [ ] No regresión: GJ-1 sigue válida y `rocas`, `caida`, `bloque-buster`, `serpentina` y los simulados se comportan como antes.
- [ ] Flechas/WASD no hacen scroll.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **Puntos por fila máxima:** premia avanzar, no oscilar. Alternativa: +10 por cualquier salto adelante, explotable.
- **Bonus de tiempo en vez de puntos por segundo vivo:** premia la rapidez y mantiene el score cerca de 1000–2000 por nivel. Alternativa: sin bonus, menos diferenciación en el ranking.
- **Tope de velocidad ×2.2:** garantiza que los niveles altos sigan siendo posibles (coche más rápido ≈ 400 px/s, 8 celdas/s). Alternativa: sin tope, partidas infinitas imposibles.
- **Una vida extra a 5.000:** alarga partidas buenas sin romper el ranking. Alternativa: sin vidas extra.
- **Temporizador por intento, no por nivel:** cada vida mantiene la tensión. Alternativa: 60 s por nivel, menos presión.
- **Barra de tiempo en el canvas:** la plataforma solo muestra puntos, vidas y nivel; ampliar `GamePlayer` queda para otra spec.
- **`dt` máximo 50 ms:** el temporizador no se agota de golpe tras volver de una pestaña en segundo plano.

---

## Risks

| Riesgo                                                       | Mitigación                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| Strict Mode deja dos loops/listeners                         | `destroy()` cancela rAF y quita listeners                     |
| `Math.random`/`performance.now` rompen la hidratación        | El motor solo se crea en `useEffect`                          |
| Flechas hacen scroll o activan botones                       | `preventDefault` solo jugando; blur del botón PAUSA           |
| Pestaña en segundo plano genera un `dt` enorme               | Tope de 50 ms + pausa en `visibilitychange`                   |
| Puntuación inventada vía RPC con la clave publishable        | Rango 1–10.000.000 en la BD (se aplica en GJ-3); límite MVP   |
| Granja de puntos oscilando entre filas                       | `bestRow` por intento; solo cuenta una fila más alta que ella |
| Niveles altos injugables por velocidad                       | Tope ×2.2 y `gap` mínimo de GJ-1 intacto                      |
| `onStats` emitido cada frame provoca renders en `GamePlayer` | Emitir solo si cambia `score`, `lives` o `level`              |

---

## What is **not** in this spec

Ranking y Supabase (SPEC GJ-3), tortugas, cocodrilos, moscas bonus, sonido, controles táctiles, más vidas extra y mostrar el tiempo en el HUD de la plataforma.
