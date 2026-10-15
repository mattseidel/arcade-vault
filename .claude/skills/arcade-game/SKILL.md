---
name: arcade-game
description: Crea, porta o integra un juego jugable con su ranking (leaderboard / salón de la fama) en Arcade Vault. Úsalo siempre que el usuario pida portar o añadir un juego (tetris, arkanoid, asteroides u otro nuevo), convertir un juego de references/started-games en TypeScript, hacer que un juego del catálogo deje de ser simulado, o guardar puntuaciones de un juego en Supabase, aunque no diga "skill" ni "ranking".
---

# arcade-game

Añade un juego real a la plataforma: motor TS sin DOM + canvas cliente dentro de `GamePlayer` + puntuación guardada en Supabase y visible en `/salon`. Se basa en `specs/04-juego-asteroides.md` (motor/jugador) y `specs/05-scoreboard-supabase.md` (ranking); léelas si dudas de una decisión, ya están implementadas para `rocas`.

El proyecto sigue Spec Driven Design, así que **primero spec, luego código**.

## Flujo

1. **Origen.** Si el juego viene de `references/started-games/NN-*`, lee su `game.js`, `index.html` y `CLAUDE.md`/`README.md` (controles, constantes, HUD, game-over). Si es nuevo, acuerda con el usuario la mecánica mínima. Los fuentes de referencia usan globales y su propio HUD: se portan, nunca se cargan con `<script>`/`<iframe>` (no pueden hablar con el HUD/modal de la plataforma).
2. **Catálogo.** Busca en `lib/games.ts` un `id` que encaje (p. ej. tetris → `caida`, arkanoid → `bloque-buster`, asteroides → `rocas`). Si no hay, añade la entrada (`cover`, `color`, `cat`). Confirma el id con el usuario: es el `game_id` de la base de datos y no debería cambiar después.
3. **Spec.** Crea `specs/NN-juego-<id>.md` (siguiente número libre) con `references/spec-template.md`, `Status: Draft`. **Para y pide aprobación** antes de escribir código.
4. **Bootstrap del registro.** Si el código aún tiene `isRocas` / `"rocas"` hardcodeado (`components/game-player.tsx`, `app/juegos/[id]/jugar/actions.ts`, `app/salon/page.tsx`, `submit_score`), el paso 0 de la spec es refactorizarlo a registro, tal como describe `references/integration.md`. Se hace una sola vez; con el registro ya hecho, un juego nuevo es una entrada + una migración. Comprueba con `rocas` que no hay regresión antes de seguir.
5. **Implementar** en este orden, verificando cada paso con `npm run lint` / `tsc`:
   1. `lib/games/<id>/constants.ts`, `types.ts`, `engine.ts` (+ `entities.ts` si pasa de ~300 líneas).
   2. Entrada en el registro de juegos reales y, si guarda puntuación, en `RANKED_GAMES`.
   3. Estilos del canvas en `app/globals.css` si el aspect-ratio difiere de 4:3.
   4. Migración `submit_score` (ver `references/integration.md`), aplicada con el MCP de Supabase y copiada a `supabase/migrations/`.
6. **Verificar y cerrar.** `npm run lint`, `npm run build`, pruebas SQL del RPC, y revisión con Playwright (capturas en `.playwright-screenshots/`, 375px y 1280px, consola sin errores). Marca la spec `Status: Implemented`, y actualiza la sección Architecture de `CLAUDE.md` si cambió el patrón.

## Reglas del motor (y por qué)

- **Contrato único** `createGame(canvas, { onStats, onGameOver }) → { start, pause, resume, restart, destroy }`. `GamePlayer` es genérico solo si todos los juegos hablan igual.
- **Sin globales ni DOM propio**; el estado vive en el cierre. `window`/`document` solo dentro de `start`/`destroy`.
- **Quita HUD de score/vidas/nivel y el overlay "GAME OVER" del canvas**: los pinta `GamePlayer`. Conserva solo información sin hueco en la plataforma (p. ej. contador de power-up). Emite `onStats` al cambiar y `onGameOver(finalScore)` una sola vez por partida. Si el juego no tiene vidas o niveles, decide en la spec qué valor fijo emitir.
- **Azar y `performance.now` solo dentro del motor**, ya en cliente; si no, hidratación rota.
- **`destroy()` cancela `requestAnimationFrame` y quita todos los listeners**: React Strict Mode monta dos veces y dejaría dos loops.
- **`preventDefault` en las teclas del juego solo mientras se juega** (no en pausa, no tras game over, ignorando `input`/`textarea`) para evitar scroll sin bloquear el campo de iniciales.
- **Pausa también en `document.visibilitychange`** y `dt` con tope de 50 ms, para que una pestaña en segundo plano no dé un salto.
- **Canvas lógico fijo** escalado por CSS al ancho del marco CRT: la física no depende del tamaño de pantalla.
- **Solo teclado**: en táctil se muestra el aviso "REQUIERE TECLADO"; los controles táctiles son otra spec.

## Reglas del ranking (y por qué)

- Un juego solo guarda puntuación si está en la lista permitida de `submit_score`; la garantía real vive en la base de datos, la Server Action solo valida de antemano.
- Una fila por `(game_id, player_name)` con la mejor marca; el nombre se normaliza a mayúsculas `^[A-Z0-9_ ]{1,10}$`.
- No uses `service_role` ni añadas variables de entorno nuevas.
- Las consultas a Supabase van en `lib/scores-db.ts` (arrastra `next/headers`), nunca en `lib/scores.ts`, que importa un componente cliente.
- La lectura en `/salon` va dentro de `Suspense` (`cacheComponents` hace dinámico `cookies()`).
- Los juegos aún simulados conservan el guardado visual y no deben hacer llamadas de red.

## Convenciones del repo

- Antes de escribir código Next, lee la guía relevante en `node_modules/next/dist/docs/` (`AGENTS.md`: esta versión difiere de lo que sabes).
- Para cualquier UI nueva (estado vacío, avisos, marco), usa `/frontend-design`.
- UI y mensajes en español; reutiliza las clases existentes (`.crt`, `.modal`, `.toast-saved`, `.hall-empty`).
