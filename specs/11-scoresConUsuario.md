# SPEC 11 — Puntuaciones vinculadas al usuario

> **Status:** Approved
> **Depends on:** SPEC 05 (`scores`, `submit_score`, `saveScore`), SPEC 10 (`profiles`, sesión)
> **Date:** 2026-10-16
> **Objective:** Guardar automáticamente al terminar la partida la puntuación de los usuarios con sesión, vinculada a su `user_id` y con su `username` como nombre en el ranking, conservando las filas anteriores como legado.

---

## Scope

**In:**

- Migración de `public.scores`: nueva columna `user_id` (nula en filas legado), PK sustituida por `id uuid` e índices únicos parciales.
- Nueva `submit_score(p_game_id, p_score)` que toma al jugador de `auth.uid()` y su `username` de `profiles`; solo `authenticated`. Se elimina la versión de tres argumentos.
- Misma lista de juegos permitidos que hoy (los seis de `RANKED_GAMES`) y mismo rango de puntuación.
- `saveScore(gameId, score)` en `app/juegos/[id]/jugar/actions.ts` sin parámetro de nombre; devuelve un estado nuevo `needs_login` sin sesión o sin perfil.
- Guardado automático en `components/game-player.tsx`: al terminar la partida de un juego de `RANKED_GAMES`, con sesión y perfil se llama a `saveScore(gameId, score)` sin intervención del jugador, **siempre** (sea o no récord; la base decide con su upsert condicional). Una sola llamada por partida, sin dobles envíos.
- Modal "FIN DEL JUEGO" con sesión y perfil: sin input de nombre ni botón "GUARDAR PUNTUACIÓN". Muestra el `username` y el estado: `▸ GUARDANDO…_`, `▸ NUEVO RÉCORD PERSONAL_`, `▸ TU MEJOR MARCA ES <best>_` o `[ERROR] No se pudo guardar la puntuación.` con un botón "REINTENTAR" (sin reintentos automáticos).
- Modal como invitado: "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" con enlace a `/login`; sin llamadas al servidor. Con sesión sin perfil: enlace a `/login/username`; tampoco guarda.
- Los juegos no incluidos en `RANKED_GAMES` mantienen el comportamiento actual del modal.
- Las filas existentes (`user_id` nulo) se conservan, se siguen mostrando en `/salon` y no se pueden reclamar ni modificar.
- Las pestañas de `/salon` y `getTopScores` siguen igual (leen `player_name`).

**Out of scope (para specs futuras):**

- Reclamar o migrar filas legado a una cuenta.
- Historial de partidas, perfil con estadísticas, ranking por periodo.
- Anti-trampas, rate limit, filtro de nombres.
- Cambiar el `username` (sigue inmutable por SPEC 10).
- Guardar puntuación de juegos simulados.
- Tests automatizados.

---

## Data model

```sql
-- supabase/migrations/<timestamp>_scoresUserId.sql
alter table public.scores add column id uuid not null default gen_random_uuid();
alter table public.scores add column user_id uuid references auth.users (id) on delete set null;
alter table public.scores drop constraint scores_pkey;
alter table public.scores add primary key (id);

-- un registro por jugador y juego, para registrados y para legado
create unique index scores_user_game_key   on public.scores (game_id, user_id)     where user_id is not null;
create unique index scores_legacy_name_key on public.scores (game_id, player_name) where user_id is null;
```

```sql
drop function public.submit_score(text, text, integer);

-- security definer, search_path fijo; auth.uid() + profiles.username; upsert por (game_id, user_id)
create function public.submit_score(p_game_id text, p_score integer)
returns table (improved boolean, best integer);
-- valida juego permitido, rango 1..10000000, sesión y perfil existentes
-- revoke execute from public, anon; grant execute to authenticated
```

```ts
// lib/scores.ts
export type SaveScoreResult =
  | { status: "saved"; improved: boolean; best: number }
  | { status: "needs_login" }
  | { status: "error"; message: string };
```

Convenciones:

- Hay dos conjuntos de filas que no se cruzan: con `user_id` (registrados) y sin él (legado). Un nombre puede aparecer en ambos; se acepta.
- `player_name` de una fila nueva = `profiles.username` en el momento de guardar; como el username es inmutable no hay que sincronizarlo.
- La RLS de lectura pública no cambia; sigue sin haber políticas de escritura directa.
- La lista de juegos permitidos se copia de la última migración (`allowFroggerScores`); ampliar la lista sigue siendo una migración.

---

## Implementation plan

> Antes del paso 3: leer `node_modules/next/dist/docs/` (Server Actions) y la skill `supabase`. Usar `/frontend-design` para el modal en sus estados (guardando, récord, no supera la marca, error con reintento, invitado, sin perfil).

1. Aplicar la migración (`apply_migration`, `scoresUserId`) y copiar el SQL a `supabase/migrations/`. Verificar: filas existentes intactas con `user_id` nulo; `get_advisors` (security) sin avisos nuevos.
2. Crear la nueva `submit_score(p_game_id, p_score)` en la misma migración o en otra (`submitScoreAuth`), con la lista de juegos de `allowFroggerScores`. Verificar con `execute_sql` simulando `auth.uid()`: crea fila, repetir con menos puntos devuelve `improved = false`, con más sube; como `anon` el `execute` está denegado.
3. Actualizar `app/juegos/[id]/jugar/actions.ts`: `saveScore(gameId, score)` valida juego y puntuación, comprueba sesión y perfil con `getUser()`, devuelve `needs_login` si faltan y llama al RPC. Verificar: lint y `tsc` pasan.
4. Actualizar `SaveScoreResult` en `lib/scores.ts` y adaptar `components/game-player.tsx`: leer el `username` de la sesión (prop desde un Server Component dentro de `Suspense`) y, en `onGameOver` de un juego ranked con sesión y perfil, llamar a `saveScore` automáticamente una sola vez por partida (guarda de un `ref` que se reinicia al reiniciar la partida, segura con Strict Mode). Eliminar el input de nombre y el botón de guardar en ese caso; mostrar los estados del modal (`▸ GUARDANDO…_`, `▸ NUEVO RÉCORD PERSONAL_`, `▸ TU MEJOR MARCA ES <best>_`, `[ERROR] No se pudo guardar la puntuación.` + "REINTENTAR"). Verificar: con sesión se guarda sin pulsar nada; como invitado no hay llamada de red.
5. Revisión con Playwright en `.playwright-screenshots/`: modal con sesión, invitado y sin perfil, `/salon` mostrando legado y registrados, a ~375 px y 1280 px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Las filas anteriores a la migración siguen existiendo con `user_id` nulo y aparecen en `/salon`.
- [ ] La función `submit_score(text, text, integer)` ya no existe; `submit_score(text, integer)` no es ejecutable por `anon`.
- [ ] Con sesión como `ZED`, al terminar una partida con puntos la fila se crea sin pulsar ningún botón, con `user_id` del usuario y `player_name = 'ZED'`; aparece `▸ NUEVO RÉCORD PERSONAL_`.
- [ ] Terminar otra partida con menos puntos guarda automáticamente, muestra `▸ TU MEJOR MARCA ES <best>_` y la fila no cambia; con más puntos la actualiza (sin crear otra).
- [ ] Por cada partida terminada se hace exactamente una llamada a `saveScore` (también con Strict Mode); reiniciar y volver a terminar hace una nueva.
- [ ] Mientras guarda el modal muestra `▸ GUARDANDO…_`; si la petición falla muestra `[ERROR] No se pudo guardar la puntuación.` y un botón "REINTENTAR" que vuelve a enviar la misma puntuación; no hay reintentos automáticos.
- [ ] Una partida con 0 puntos no llama a `saveScore`.
- [ ] Como invitado, el modal muestra "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" con enlace a `/login` y no se hace ninguna llamada a `saveScore`/`submit_score`.
- [ ] Con sesión sin perfil, el modal enlaza a `/login/username` y no guarda.
- [ ] Llamar al RPC directamente con la clave publishable sin sesión falla.
- [ ] Un usuario no puede escribir ni modificar la fila de otro ni una fila legado.
- [ ] Para usuarios con sesión el modal ya no tiene input de nombre ni botón "GUARDAR PUNTUACIÓN" en los juegos ranked.
- [ ] Los seis juegos de `RANKED_GAMES` guardan; un `game_id` fuera de la lista se rechaza.
- [ ] `/salon` muestra registrados y legado ordenados por puntuación, máximo 12 por pestaña.
- [ ] No hay errores de hidratación ni warnings en consola en `/salon` y `/juegos/<id>/jugar`.

---

## Decisions

- **Sí:** solo usuarios con sesión guardan. Decisión del usuario; hace que el ranking tenga dueños reales.
- **No:** invitados guardando por nombre libre. Reintroduce la suplantación que esta spec elimina.
- **Sí:** guardado automático al terminar la partida (decisión del usuario). Quita un paso al jugador y el nombre ya no hace falta porque viene del perfil.
- **Sí:** enviar siempre la puntuación, sea o no récord. La base ya hace el upsert condicional y el cliente no necesita conocer la marca previa.
- **Sí:** botón "REINTENTAR" ante error, sin reintentos automáticos. Evita bucles y llamadas repetidas si el servidor está caído.
- **Sí:** no enviar puntuaciones de 0. El rango de `submit_score` es 1..10.000.000 y una llamada así solo daría error.
- **Sí:** conservar filas legado con `user_id` nulo. No se pierde historia y no hay que decidir a quién pertenece.
- **No:** reclamar filas legado. Sin verificar propiedad cualquiera reclamaría marcas ajenas; otra spec si se necesita.
- **No:** borrar el ranking. Pérdida irreversible innecesaria.
- **Sí:** PK `id` + índices únicos parciales. Permite que coexistan registrados y legado con el mismo nombre sin colisión de clave.
- **Sí:** `submit_score` deduce jugador y nombre de `auth.uid()`. El cliente no puede suplantar a otro ni inventar nombres.
- **Sí:** eliminar la firma antigua de tres argumentos. Dejarla abierta a `anon` anula el cambio.
- **Sí:** `on delete set null` sobre `user_id`. Borrar una cuenta conserva la marca como legado.

---

## Risks

| Riesgo                                                                   | Mitigación                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Cambiar la PK con filas existentes                                       | La columna `id` se rellena con `default gen_random_uuid()`; verificar conteo de filas antes/después. |
| Un registrado y una fila legado con el mismo nombre confunden el ranking | Se acepta; reclamación o reserva de nombres legado queda para otra spec.                             |
| Puntuación inventada vía RPC con sesión válida                           | Mismo límite que SPEC 05 (rango); anti-trampas fuera de alcance.                                     |
| Pérdida de la puntuación al terminar la partida sin sesión               | El modal ofrece ir a `/login`; la partida no se conserva (se acepta).                                |
| Leer la sesión en el player rompe `cacheComponents`                      | Leer `getUser` en un Server Component dentro de `Suspense` y pasar el `username` como prop.          |
| Doble guardado por Strict Mode o `onGameOver` repetido                   | Guarda con `ref` por partida, reiniciada al reiniciar; criterio de aceptación de una sola llamada.   |
| La sesión caduca durante la partida y el guardado automático falla       | `saveScore` devuelve `needs_login`; el modal muestra el enlace a `/login` en lugar del error.        |

---

## What is **not** in this spec

- Reclamar filas legado, historial, estadísticas o perfil.
- Cambiar el username, ranking por periodo o paginación.
- Anti-trampas, rate limit o filtro de nombres.
- Guardar puntuación de juegos simulados.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propia spec.
