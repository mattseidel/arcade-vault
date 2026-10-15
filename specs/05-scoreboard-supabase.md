# SPEC 05 — Scoreboard con Supabase

> **Status:** Approved
> **Depends on:** SPEC 01 (`components/game-player.tsx`, `components/hall-of-fame.tsx`, `lib/scores.ts`, `app/salon/page.tsx`), SPEC 04 (juego `rocas`, callback `onGameOver`)
> **Date:** 2026-10-15
> **Objective:** Guardar en Supabase la mejor puntuación de cada jugador (identificado por el nombre que escribe al terminar) en el juego `rocas` y mostrar ese ranking real en el Salón de la Fama.

---

## Scope

**In:**

- Tabla `public.scores` en Supabase con una fila por `(game_id, player_name)` que guarda solo la mejor puntuación.
- Función SQL `public.submit_score(p_game_id, p_player_name, p_score)` que valida los datos y hace upsert solo si la nueva puntuación supera a la guardada. Devuelve `{ improved, best }`.
- RLS activada: lectura pública, ninguna política de escritura directa sobre la tabla. La escritura solo ocurre a través de `submit_score`.
- Server Action `saveScore` que valida en el servidor y llama a `submit_score` con el cliente de `utils/supabase/server.ts`.
- Botón "GUARDAR PUNTUACIÓN" del modal "FIN DEL JUEGO" funcional **solo para `rocas`**: estados guardando, nuevo récord, no supera tu marca y error con reintento.
- Pestaña ROCAS del Salón de la Fama leyendo el top 12 real de Supabase, con estado vacío (sin partidas) y podio que admite menos de 3 filas.
- Nombre: se mantiene el input actual (mayúsculas, máximo 10 caracteres, por defecto `INVITADO`); el servidor valida `^[A-Z0-9_ ]{1,10}$`, recorta espacios y rechaza vacío.
- Archivo `supabase/migrations/<timestamp>_create_scores.sql` con la migración aplicada, como registro en el repo.

**Out of scope (para specs futuras):**

- Supabase Auth, perfiles o login real: el nombre no está reservado, cualquiera puede usar el de otro.
- Guardar puntuación de los juegos simulados (`bloque-buster`, `caida`, etc.): mantienen el "guardado" visual de SPEC 01.
- Historial de partidas (una fila por partida).
- Anti-trampas reales (validar la partida en servidor, replays, firmas), rate limit, CAPTCHA.
- Moderación o filtro de nombres ofensivos.
- Ranking por periodo (semanal/mensual) y paginación más allá del top 12.
- Actualizar el campo `best` de `lib/games.ts` con datos reales.
- Tests automatizados.

---

## Data model

```sql
-- supabase/migrations/<timestamp>_create_scores.sql
create table public.scores (
  game_id     text        not null,
  player_name text        not null check (player_name ~ '^[A-Z0-9_ ]{1,10}$'),
  score       integer     not null check (score between 1 and 10000000),
  updated_at  timestamptz not null default now(),
  primary key (game_id, player_name)
);

create index scores_game_score_idx on public.scores (game_id, score desc);

alter table public.scores enable row level security;
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
-- sin políticas de insert/update/delete: la escritura solo pasa por submit_score
```

```sql
-- security definer, search_path fijo; devuelve improved=true si insertó o subió la marca
create function public.submit_score(p_game_id text, p_player_name text, p_score integer)
returns table (improved boolean, best integer);
-- valida p_game_id = 'rocas', nombre y rango; upsert con "where excluded.score > scores.score"
-- grant execute a anon y authenticated; revoke execute a public
```

```ts
// lib/scores.ts (se mantiene ScoreRow y seededScores; ScoreRow no cambia)
export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};

export type SaveScoreResult =
  | { status: "saved"; improved: boolean; best: number }
  | { status: "error"; message: string };
```

Convenciones:

- `date` de `ScoreRow` = `updated_at` formateado `dd/mm/aaaa` en UTC (igual que `seededScores`), sin `toLocaleString` dependiente de la zona para evitar errores de hidratación.
- `player_name` se guarda en mayúsculas; la clave `(game_id, player_name)` hace que `PX_KAI` y `px_kai` sean el mismo jugador.
- `lib/scores.ts` lo importa un componente cliente, por eso las consultas a Supabase van en `lib/scores-db.ts` (importa `next/headers` vía `utils/supabase/server.ts`) y no en `lib/scores.ts`.
- `game_id` es el `id` de `lib/games.ts`. La lista de juegos que aceptan guardado vive dentro de `submit_score` (`'rocas'`) y se amplía con una migración cuando se porte otro juego.

---

## Implementation plan

> Antes del paso 3: leer `node_modules/next/dist/docs/` sobre Server Actions y `cacheComponents` según `AGENTS.md` (el cliente de servidor usa `cookies()`, que es dinámico y debe ir dentro de `Suspense`). Usar el skill `/frontend-design` para el estado vacío del Salón y los mensajes del modal (ver `CLAUDE.md`).

1. Aplicar la migración con el MCP de Supabase (`apply_migration`, nombre `create_scores`) y copiar el SQL a `supabase/migrations/<timestamp>_create_scores.sql`. Verificar: `list_tables` muestra `scores` con RLS activa; `get_advisors` (security) sin avisos nuevos; en `execute_sql`, `select * from submit_score('rocas','TEST',100)` devuelve `improved = true`, repetirlo con 50 devuelve `improved = false, best = 100`; borrar la fila de prueba.
2. Crear `lib/scores-db.ts` con `getTopScores(gameId, limit = 12): Promise<ScoreRow[]>` (select ordenado por `score desc, updated_at asc`, calcula `rank` y `date`). Verificar: `npm run lint` y `tsc` pasan.
3. Crear `app/juegos/[id]/jugar/actions.ts` (`"use server"`) con `saveScore(gameId, name, score): Promise<SaveScoreResult>`: normaliza el nombre (trim + mayúsculas), valida regex, rango de `score` entero y `gameId === "rocas"`, llama al RPC `submit_score` y mapea errores a `{ status: "error" }` con mensaje genérico. Verificar: lint pasa.
4. Integrar en `components/game-player.tsx`: para `isRocas`, "GUARDAR PUNTUACIÓN" llama a `saveScore`; estados `idle | saving | saved | error`; mensajes `▸ NUEVO RÉCORD PERSONAL_`, `▸ TU MEJOR MARCA ES <best>_` y `[ERROR] No se pudo guardar la puntuación.` con el botón activo para reintentar y lo escrito conservado. Los demás ids mantienen el guardado visual. Verificar: en `/juegos/rocas/jugar`, terminar la partida y guardar crea la fila (`select` en Supabase); en `/juegos/caida/jugar` no hay llamada de red.
5. Hacer que `app/salon/page.tsx` cargue `getTopScores("rocas")` dentro de `Suspense` y lo pase a `HallOfFame` como prop `realRows: Record<string, ScoreRow[]>`. Verificar: la página compila y `/salon` carga sin errores en consola.
6. Adaptar `components/hall-of-fame.tsx`: si el `tab` está en `realRows` usa esas filas, si no `seededScores`; con 0 filas muestra estado vacío "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO"; el podio y la tabla toleran 1 o 2 filas. Verificar: ROCAS muestra los datos reales, el resto de pestañas sigue igual; con la tabla vacía no hay errores.
7. Revisión con Playwright en `.playwright-screenshots/`: modal guardado (récord y no-récord), error simulado (URL de Supabase inválida), `/salon` pestaña ROCAS con 0, 1 y 12+ filas, a ~375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La tabla `public.scores` existe con RLS activa y `get_advisors` (security) no reporta tablas sin RLS ni funciones sin `search_path`.
- [ ] Con la clave publishable, `insert`, `update` y `delete` directos sobre `scores` fallan; `select` funciona.
- [ ] `submit_score('rocas','AAA',100)` crea la fila; luego `('rocas','AAA',50)` devuelve `improved = false, best = 100` y no modifica la fila; luego `('rocas','AAA',200)` devuelve `improved = true, best = 200`.
- [ ] `submit_score` rechaza `game_id` distinto de `rocas`, nombre vacío o con caracteres fuera de `A-Z0-9_ `, nombre de más de 10 caracteres, `score` ≤ 0 o > 10.000.000.
- [ ] En `/juegos/rocas/jugar`, al terminar con 1.000 puntos y guardar como `ZED`, aparece `▸ NUEVO RÉCORD PERSONAL_` y existe la fila `rocas / ZED / 1000`.
- [ ] Jugar de nuevo y guardar como `ZED` con menos puntos muestra `▸ TU MEJOR MARCA ES 1.000_` y la fila no cambia.
- [ ] Guardar como `zed` (minúsculas, el input las pasa a mayúsculas) actualiza la misma fila, no crea otra.
- [ ] Si la petición falla, el modal muestra `[ERROR] No se pudo guardar la puntuación.`, conserva el nombre escrito y el botón permite reintentar.
- [ ] Mientras guarda, el botón queda deshabilitado (sin doble envío).
- [ ] En los demás juegos (`/juegos/caida/jugar`, etc.) "GUARDAR PUNTUACIÓN" sigue mostrando "PUNTUACIÓN GUARDADA_" sin llamadas de red.
- [ ] `/salon`, pestaña ROCAS, muestra las filas de Supabase ordenadas por puntuación descendente, máximo 12, con nombre, puntuación y fecha `dd/mm/aaaa`.
- [ ] Con la tabla vacía, ROCAS muestra "AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO" sin errores; con 1 o 2 filas el podio no rompe.
- [ ] Las demás pestañas de `/salon` siguen mostrando `seededScores`.
- [ ] Una puntuación guardada aparece en `/salon` al recargar, sin reconstruir la app.
- [ ] No hay errores de hidratación ni warnings en consola en `/salon` y `/juegos/rocas/jugar`.
- [ ] `.env.example` y `.env.local` no incluyen ninguna clave nueva (solo se usan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

---

## Decisions

- **Sí:** el jugador se identifica por `(game_id, nombre)` sin login. Es lo que permite el MVP; Auth requiere login real, perfiles y reservar nombres, y va en otra spec.
- **No:** una fila por partida con el máximo calculado al leer. Más filas y consultas para un resultado que solo necesita el mejor valor.
- **Sí:** PK compuesta `(game_id, player_name)` y upsert condicional. Garantiza "solo la mejor marca" en la base, no en el cliente.
- **Sí:** nombre en mayúsculas, `A-Z0-9_ `, 1–10 caracteres. Coincide con el input actual (`toUpperCase().slice(0, 10)`) y con el estilo de `seededScores`.
- **Sí:** solo `rocas`, con `game_id` en la tabla. Es el único juego real; los simulados generarían datos sin sentido. Añadir otro juego es una migración de una línea en `submit_score`.
- **Sí:** RLS con lectura pública y sin políticas de escritura; la escritura pasa por `submit_score` (`security definer`). Evita que el navegador inserte filas arbitrarias directamente en la tabla.
- **Sí:** `submit_score` valida por sí misma y se concede a `anon`. La Server Action centraliza validación y manejo de errores, pero la garantía real vive en la base de datos.
- **No:** clave secreta (`service_role`) en la Server Action. Añade un secreto sin ganar seguridad real: la puntuación sigue viniendo del cliente.
- **Sí:** consultas a Supabase en `lib/scores-db.ts`, separado de `lib/scores.ts`. `hall-of-fame.tsx` (cliente) importa `seededScores` de `lib/scores.ts` y no debe arrastrar `next/headers`.
- **Sí:** solo pestaña ROCAS con datos reales; las demás siguen con `seededScores` hasta tener juego.
- **Sí:** el servidor lee con el cliente de `utils/supabase/server.ts` dentro de `Suspense` (lectura dinámica, siempre fresca). Es lo más corto y compatible con `cacheComponents`; cachear el top con `use cache` se puede revisar si hay carga.
- **Sí:** la migración se aplica con el MCP de Supabase y se copia a `supabase/migrations/`. El repo no tiene CLI de Supabase configurada y el SQL queda versionado.
- **No:** tocar la tabla `public.hello` existente; no pertenece a este feature.

---

## Risks

| Riesgo                                                                                    | Mitigación                                                                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede llamar al RPC con la clave publishable y enviar una puntuación inventada | Rango 1–10.000.000 en la base; se acepta como límite del MVP. Anti-trampas y rate limit quedan para otra spec. |
| Alguien usa el nombre de otro jugador y le pisa la marca                                  | Solo puede subirla, nunca bajarla. Reservar nombres requiere Auth (otra spec).                                 |
| Nombres ofensivos en el ranking público                                                   | Charset limitado a `A-Z0-9_ ` y 10 caracteres; sin filtro de palabras en esta spec.                            |
| `cookies()` en `/salon` fuera de `Suspense` rompe el build con `cacheComponents`          | Leer la doc antes del paso 3 y envolver la lectura en `Suspense`, como en `jugar/page.tsx`.                    |
| `lib/scores.ts` acaba importando código de servidor en el bundle del cliente              | Las consultas viven en `lib/scores-db.ts`; el build falla si se importa desde un componente cliente.           |
| Empates en puntuación producen un orden inestable                                         | Orden `score desc, updated_at asc`: gana quien llegó primero.                                                  |
| La contraseña de BD aparece en `.env.example` versionado                                  | No forma parte de esta spec, pero conviene rotarla y vaciar el valor; esta spec no usa `SUPABASE_DB_PASSWORD`. |

---

## What is **not** in this spec

- Login, perfiles o nombres reservados con Supabase Auth.
- Guardar puntuación de los juegos simulados.
- Historial de partidas por jugador.
- Anti-trampas, rate limit, CAPTCHA o filtro de nombres ofensivos.
- Ranking semanal/mensual o paginación del Salón de la Fama.
- Actualizar `best` de `lib/games.ts` con datos reales.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propia spec.
