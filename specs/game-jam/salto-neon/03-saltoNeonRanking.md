# SPEC GJ-3 — Salto Neón: ranking en Supabase

> **Status:** Implemented
> **Depends on:** SPEC GJ-2 (velocidad, niveles y puntuación), SPEC 05 (ranking), SPEC 06 (registro de juegos), `lib/games.ts` (id `salto-neon`)
> **Date:** 2026-10-15
> **Objective:** Guardar la mejor puntuación de cada jugador de Salto Neón en Supabase y mostrar el top 12 real en la pestaña SALTO NEÓN del Salón de la Fama.

---

## Scope

**In:**

- Añadir `"salto-neon"` a `RANKED_GAMES` (`lib/games.ts`); debe coincidir con `submit_score`.
- Migración `allowSaltoNeonScores` que extiende `submit_score` con `'salto-neon'`, conservando el resto de la función tal cual (copia en `supabase/migrations/<timestamp>_allowSaltoNeonScores.sql`, mismo patrón que `20261015210000_allowSerpentinaScores.sql`).
- Guardado vía la server action existente `app/juegos/[id]/jugar/actions.ts` (`saveScore`): nombre `^[A-Z0-9_ ]{1,10}$`, puntuación entera 1–10.000.000. Sin cambios en la acción (ya lee `RANKED_GAMES`).
- Pestaña SALTO NEÓN de `/salon` con datos reales (`getTopScores`), top 12; `app/salon/page.tsx` ya itera `RANKED_GAMES`.
- Modal de guardado y pantalla "FIN DEL JUEGO" de `GamePlayer` sin cambios.

**Out of scope (para specs futuras):** anti-trampas/rate limit, Auth, historial de partidas, ranking por distancia u orbes por separado, tablas diaria/semanal, ficha `/juegos/salto-neon` con ranking real (sigue con `seededScores`, como los demás juegos).

---

## Data model

```ts
// lib/games.ts
export const RANKED_GAMES = [
  "rocas",
  "caida",
  "bloque-buster",
  "serpentina",
  "salto-neon",
] as const;
```

```sql
-- supabase/migrations/<timestamp>_allowSaltoNeonScores.sql
-- create or replace function public.submit_score(p_game_id text, p_player_name text, p_score integer)
--   misma firma, mismo cuerpo, security definer, search_path = '' y grants;
--   la lista pasa a ('rocas', 'caida', 'bloque-buster', 'serpentina', 'salto-neon')
```

**Convenciones:** la tabla `scores` (PK `game_id, player_name`) guarda la mejor puntuación por jugador y juego; no hay cambios de esquema, solo se amplía la lista permitida en `submit_score`. `game_id = "salto-neon"`. La puntuación enviada es la de `onGameOver(finalScore)` del motor (GJ-2), siempre ≥ 64 al chocar; pulsar FIN antes de recorrer 1 m da 0, que la acción y la BD rechazan como en el resto de juegos. Si otro juego se añade a `submit_score` antes que este, la migración parte de la lista vigente en la BD, no de la de este spec. Los juegos fuera de `RANKED_GAMES` siguen usando `seededScores`.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Server Actions, `cacheComponents`) y `.claude/skills/arcade-game/references/integration.md`. No hay UI nueva: no requiere `/frontend-design`. Usar el skill `supabase` para la migración.

0. Verificar que GJ-2 está implementada y que `onGameOver` entrega la puntuación total. Verificar: una partida completa termina en "FIN DEL JUEGO" con puntos.
1. Inspeccionar `submit_score` actual con el MCP de Supabase (`list_migrations`, `execute_sql` con `pg_get_functiondef`) para conservar su firma y reglas. Verificar: se conoce la lista vigente de juegos permitidos.
2. Aplicar la migración `allowSaltoNeonScores` con el MCP y guardar la copia en `supabase/migrations/`. Verificar con `execute_sql`: `submit_score('salto-neon','QA_SN',500)` devuelve `improved = true, best = 500`; con 300 devuelve `false, 500`; con 0 o nombre `qa-sn!` lanza excepción; `get_advisors` (seguridad) sin avisos nuevos.
3. Añadir `"salto-neon"` a `RANKED_GAMES`. Verificar: `tsc` pasa y GUARDAR PUNTUACIÓN hace la llamada real al terminar una partida.
4. Confirmar que `/salon` pestaña SALTO NEÓN lee de `getTopScores`. Verificar: top 12 real y estado vacío.
5. Borrar las filas de prueba de `scores` (`game_id = 'salto-neon'` creadas en QA).
6. Revisión con Playwright en `.playwright-screenshots/`: partida, pausa, modal, guardado (récord y no-récord), error de red, `/salon` con 0, 1 y 12+ filas, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Terminar una partida de Salto Neón abre "FIN DEL JUEGO" con la puntuación correcta; FIN abre el modal con la puntuación actual.
- [ ] Guardar crea/actualiza la fila `salto-neon / <NOMBRE> / <score>` y muestra `▸ NUEVO RÉCORD PERSONAL_`.
- [ ] Una puntuación menor muestra `▸ TU MEJOR MARCA ES <n>_` sin cambiar la fila.
- [ ] Nombre inválido (fuera de `^[A-Z0-9_ ]{1,10}$`) o puntuación fuera de 1–10.000.000 es rechazado por la acción y por la BD.
- [ ] Error de red: `[ERROR] No se pudo guardar la puntuación.`, nombre conservado, reintento posible.
- [ ] `/salon`, pestaña SALTO NEÓN, muestra el top 12 real ordenado por puntuación descendente; vacío → "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO".
- [ ] `get_advisors` (seguridad) sin avisos nuevos tras la migración; las filas de prueba están borradas.
- [ ] PAUSA congela; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero y permite guardar otra vez.
- [ ] No regresión: `rocas`, `caida`, `bloque-buster`, `serpentina` guardan igual y los juegos simulados conservan `seededScores` sin llamadas de red.
- [ ] El input de iniciales acepta W y espacios; Espacio/flechas no hacen scroll.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **Misma tabla y RPC:** `scores` + `submit_score` ya resuelven "mejor marca por jugador"; solo se amplía la lista. Alternativa: una tabla por juego, más migraciones sin beneficio.
- **Sin ranking por distancia:** el score ya es casi todo distancia (1 punto/m) más orbes. Alternativa: columna `meters`, requiere cambio de esquema.
- **Rango 1–10.000.000 en BD:** igual que los otros juegos; es el límite del MVP porque la clave publishable permite llamar al RPC directamente. Una partida real ronda 500–8.000 puntos.
- **Sin anti-trampas:** el motor corre en el cliente y la puntuación es confiable solo por convención. Alternativa: validar en servidor la duración de la partida, fuera de alcance.
- **Borrar filas de prueba:** la BD es compartida; no se dejan datos de QA en el Salón.

---

## Risks

| Riesgo                                                       | Mitigación                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| Strict Mode deja dos loops/listeners                         | `destroy()` cancela rAF y quita listeners                     |
| `Math.random`/`performance.now` rompen la hidratación        | El motor solo se crea en `useEffect`                          |
| Espacio/flechas hacen scroll o activan botones               | `preventDefault` solo jugando; blur del botón PAUSA           |
| Pestaña en segundo plano genera un `dt` enorme               | Tope de 50 ms + pausa en `visibilitychange`                   |
| Puntuación inventada vía RPC con la clave publishable        | Rango 1–10.000.000 en la BD; límite del MVP                   |
| `cookies()` en `/salon` fuera de `Suspense` rompe el build   | Lectura dentro de `Suspense`                                  |
| `RANKED_GAMES` y `submit_score` desincronizados              | Se cambian en el mismo PR; criterio de aceptación de guardado |
| La migración pisa reglas o juegos actuales de `submit_score` | Paso 1: leer la función vigente antes de reescribirla         |
| El guion de `salto-neon` rompe algún filtro o regex          | El id ya es kebab-case como `bloque-buster`, que funciona     |

---

## What is **not** in this spec

Anti-trampas/rate limit, Auth, historial de partidas, ranking por distancia u orbes, tablas diaria/semanal y ranking real en la ficha del juego.
