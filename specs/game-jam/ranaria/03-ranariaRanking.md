# SPEC GJ-3 — Ranaria: ranking en Supabase

> **Status:** Draft
> **Depends on:** SPEC GJ-2 (puntuación y niveles), SPEC 05 (ranking), SPEC 06 (registro de juegos), `lib/games.ts` (id `ranaria`)
> **Date:** 2026-10-15
> **Objective:** Guardar la mejor puntuación de cada jugador de Ranaria en Supabase y mostrar el top 12 real en la pestaña RANARIA del Salón de la Fama.

---

## Scope

**In:**

- Añadir `"ranaria"` a `RANKED_GAMES` (`lib/games.ts`); debe coincidir con `submit_score`.
- Migración `allowRanariaScores` que extiende `submit_score` con `'ranaria'` (copia en `supabase/migrations/`, mismo patrón que `*allow*Scores.sql`).
- Guardado vía server action existente `app/juegos/[id]/jugar/actions.ts` (`saveScore`): nombre `^[A-Z0-9_ ]{1,10}$`, puntuación entera 1–10.000.000.
- Pestaña RANARIA de `/salon` con datos reales (`getTopScores`), top 12.
- Modal de guardado y pantalla "FIN DEL JUEGO" de `GamePlayer` sin cambios.

**Out of scope (para specs futuras):** anti-trampas/rate limit, Auth, historial de partidas, ranking por nivel alcanzado, tabla semanal/diaria.

---

## Data model

```ts
// lib/games.ts
export const RANKED_GAMES = [
  "rocas",
  "caida",
  "bloque-buster",
  "serpentina",
  "ranaria",
] as const;
```

```sql
-- supabase/migrations/<timestamp>_allowRanariaScores.sql
-- create or replace function submit_score(...)  -- misma firma; la lista de game_id permitidos incluye 'ranaria'
```

Convenciones: tabla `scores` (PK `game_id, player_name`) guarda la mejor puntuación por jugador y juego; no hay cambios de esquema, solo se amplía la lista permitida en `submit_score`. `game_id = "ranaria"`. La puntuación enviada es la de `onGameOver(finalScore)` del motor (GJ-2). Los juegos fuera de `RANKED_GAMES` siguen usando `seededScores`.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Server Actions, `cacheComponents`) y `.claude/skills/arcade-game/references/integration.md`. No hay UI nueva: no requiere `/frontend-design`. Usar el skill `supabase` para la migración.

0. Verificar que GJ-2 está implementada y que `onGameOver` entrega la puntuación total. Verificar: partida completa termina en "FIN DEL JUEGO" con puntos.
1. Inspeccionar `submit_score` actual con el MCP de Supabase (`list_migrations`, `execute_sql`) para conservar su firma y reglas. Verificar: se conoce la lista vigente de juegos permitidos.
2. Aplicar la migración `allowRanariaScores` con el MCP y guardar la copia en `supabase/migrations/`. Verificar: `submit_score` mejora/no mejora/rechaza; `get_advisors` limpio.
3. Añadir `"ranaria"` a `RANKED_GAMES`. Verificar: `tsc` pasa y el modal de guardado aparece al terminar una partida de Ranaria.
4. Confirmar que `/salon` pestaña RANARIA lee de `getTopScores` (sin cambios si el Salón itera `RANKED_GAMES`). Verificar: top 12 real y estado vacío.
5. Borrar las filas de prueba de `scores`.
6. Revisión con Playwright en `.playwright-screenshots/`: partida, pausa, modal, guardado (récord y no-récord), error de red, `/salon` con 0, 1 y 12+ filas, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Terminar una partida de Ranaria abre "FIN DEL JUEGO"; FIN abre el modal con la puntuación actual.
- [ ] Guardar crea/actualiza la fila `ranaria / <NOMBRE> / <score>`.
- [ ] Una puntuación menor muestra `▸ TU MEJOR MARCA ES <n>_` sin cambiar la fila.
- [ ] Nombre inválido (fuera de `^[A-Z0-9_ ]{1,10}$`) o puntuación fuera de 1–10.000.000 es rechazado por la acción y por la BD.
- [ ] Error de red: `[ERROR] No se pudo guardar la puntuación.`, nombre conservado, reintento posible.
- [ ] `/salon`, pestaña RANARIA, muestra el top 12 real ordenado por puntuación descendente; vacío → "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO".
- [ ] `get_advisors` (seguridad) sin avisos nuevos tras la migración.
- [ ] No regresión: `rocas`, `caida`, `bloque-buster`, `serpentina` guardan igual y los juegos simulados conservan `seededScores`.
- [ ] El input de iniciales funciona y las flechas no hacen scroll.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **Misma tabla y RPC:** `scores` + `submit_score` ya resuelven "mejor marca por jugador"; solo se amplía la lista. Alternativa: una tabla por juego, más migraciones sin beneficio.
- **Sin ranking por nivel:** el score ya refleja el nivel (+1000 por nivel completado). Alternativa: columna `level`, requiere cambio de esquema.
- **Rango 1–10.000.000 en BD:** igual que los otros juegos; es el límite del MVP porque la clave publishable permite llamar al RPC directamente.
- **Sin anti-trampas:** el motor corre en el cliente y la puntuación es confiable solo por convención; queda fuera de alcance.
- **Borrar filas de prueba:** la BD es compartida; no se dejan datos de QA en el Salón.

---

## Risks

| Riesgo                                                     | Mitigación                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| Strict Mode deja dos loops/listeners                       | `destroy()` cancela rAF y quita listeners                     |
| `Math.random`/`performance.now` rompen la hidratación      | El motor solo se crea en `useEffect`                          |
| Flechas hacen scroll o activan botones                     | `preventDefault` solo jugando; blur del botón PAUSA           |
| Pestaña en segundo plano genera un `dt` enorme             | Tope de 50 ms + pausa en `visibilitychange`                   |
| Puntuación inventada vía RPC con la clave publishable      | Rango 1–10.000.000 en la BD; límite del MVP                   |
| `cookies()` en `/salon` fuera de `Suspense` rompe el build | Lectura dentro de `Suspense`                                  |
| `RANKED_GAMES` y `submit_score` desincronizados            | Se cambian en el mismo PR; criterio de aceptación de guardado |
| La migración pisa reglas actuales de `submit_score`        | Paso 1: leer la función vigente antes de reescribirla         |

---

## What is **not** in this spec

Anti-trampas/rate limit, Auth, historial de partidas, ranking por nivel y tablas semanales/diarias.
