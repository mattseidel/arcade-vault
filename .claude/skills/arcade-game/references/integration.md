# Integración de un juego en Arcade Vault

Estado de partida (spec 04/05 implementadas): `rocas` es el único juego real y está hardcodeado en cuatro sitios. Verifica con `grep -rn "rocas\|isRocas" components app lib supabase` si el refactor a registro ya se hizo.

## 1. Contrato genérico — `lib/games/types.ts`

```ts
export type GameStats = { score: number; lives: number; level: number };
export type GameCallbacks = {
  onStats: (s: GameStats) => void; // cuando cambia score, lives o level
  onGameOver: (finalScore: number) => void; // una sola vez por partida
};
export type GameEngine = {
  start(): void; // loop (rAF) + listeners
  pause(): void;
  resume(): void;
  restart(): void; // nueva partida desde cero
  destroy(): void; // detiene loop y quita listeners
};
export type CreateGame = (
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
) => GameEngine;
```

`lib/games/asteroids/types.ts` pasa a reexportar estos tipos con los alias `AsteroidsStats`, `AsteroidsCallbacks`, `AsteroidsEngine` (no se rompen imports).

## 2. Registro (bootstrap, una sola vez)

| Pieza                                                                               | Cambio                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games.ts`                                                                      | `export const RANKED_GAMES = ["rocas"] as const;` — importable desde servidor y cliente (sin canvas).                                                                                                       |
| `components/games/registry.ts` (`"use client"` no hace falta, solo importa motores) | `export const REAL_GAMES: Record<string, { create: CreateGame; width: number; height: number }> = { rocas: { create: createAsteroids, width: W, height: H } };`                                             |
| `components/games/asteroidsCanvas.tsx` → `game-canvas.tsx`                          | Mismas refs/efectos que hoy, pero recibe `create`, `width`, `height` por props. Mantén `cbRef`, efecto de `paused` y de `runKey`.                                                                           |
| `components/game-player.tsx`                                                        | `const real = REAL_GAMES[id]` sustituye a `isRocas` (canvas, aviso de teclado, nivel del motor, desactivar el `setInterval` simulado). Guardado real si `(RANKED_GAMES as readonly string[]).includes(id)`. |
| `app/juegos/[id]/jugar/actions.ts`                                                  | `if (!RANKED_GAMES.includes(gameId as never) ...) return fail();` en vez de `gameId !== "rocas"`.                                                                                                           |
| `app/salon/page.tsx`                                                                | `const entries = await Promise.all(RANKED_GAMES.map(async (id) => [id, await getTopScores(id)] as const)); return <HallOfFame realRows={Object.fromEntries(entries)} />;`                                   |
| `components/hall-of-fame.tsx`                                                       | Sin cambios: ya usa `realRows[tab] ?? seededScores(...)` y tiene estado vacío.                                                                                                                              |

Un juego puede ser real sin ranking (sale de `REAL_GAMES` pero no de `RANKED_GAMES`): entonces "GUARDAR PUNTUACIÓN" sigue siendo visual.

## 3. Migración por juego nuevo

`supabase/migrations/<timestamp>_allow_<id>_scores.sql` — recrea la función cambiando solo la guarda. Conserva el cuerpo vigente en `supabase/migrations/20261015140531_create_scores.sql` (léelo; si hay migraciones posteriores, parte de la última versión de la función).

```sql
create or replace function public.submit_score(p_game_id text, p_player_name text, p_score integer)
returns table (improved boolean, best integer)
language plpgsql security definer set search_path = ''
as $$
-- ...mismo cuerpo...
  if p_game_id is null or p_game_id not in ('rocas', '<id>') then
    raise exception 'invalid game';
  end if;
-- ...
$$;
-- create or replace conserva los grants, pero comprueba con get_advisors
```

Aplícala con `mcp__supabase__apply_migration` (nombre `allow_<id>_scores`) y copia el SQL al repo. Verifica con `execute_sql`:

1. `select * from submit_score('<id>','TEST',100)` → `improved = true`.
2. Con `50` → `improved = false, best = 100`.
3. Un `game_id` no permitido → error `invalid game`.
4. `delete from scores where player_name = 'TEST'`.
5. `get_advisors` (security) sin avisos nuevos.

## 4. Portado desde `references/started-games`

| Elemento del original                          | En el motor TS                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Constantes sueltas (`const W = 800`)           | `constants.ts`, valores idénticos                                 |
| Clases/objetos de entidades                    | `entities.ts` (o dentro de `engine.ts` si es corto)               |
| `document.getElementById('score')`, overlays   | Eliminar; llamar `cb.onStats` / `cb.onGameOver`                   |
| Teclas con `window.addEventListener` global    | Dentro de `start()`, quitadas en `destroy()`                      |
| `requestAnimationFrame(loop)`                  | Guarda el id; cancélalo en `pause`/`destroy`; reanuda en `resume` |
| Reinicio por `location.reload()` o init global | `restart()` que reinicia el estado del cierre                     |

Fuentes disponibles: `02-asteroids` (ya portado), `03-tetris` (canvas 300×600 + preview, sin vidas), `04-arkanoid` (con `levels.js` y `assets/`; los assets estáticos van en `public/`). Un canvas auxiliar (p. ej. "siguiente pieza") se dibuja desde el mismo motor sobre un segundo canvas opcional o se omite; decídelo en la spec.

## 5. Checklist de no regresión

- [ ] `rocas`: juega, pausa, game over, guarda y aparece en `/salon`.
- [ ] Juegos simulados: `setInterval` intacto, "PUNTUACIÓN GUARDADA_" sin llamadas de red.
- [ ] Nuevo juego: Strict Mode sin loops duplicados; al salir de la página no reacciona al teclado.
- [ ] Sin errores de hidratación en `/juegos/<id>/jugar` ni `/salon`.
- [ ] `npm run lint` y `npm run build` limpios; `.env.example` sin claves nuevas.
