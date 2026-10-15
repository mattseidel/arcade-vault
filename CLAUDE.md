# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online platform to play games and compete for the highest score. UI is in Spanish (README too). Pages exist for home, about/contacto, biblioteca, juegos, salón de la fama and login; only one real game (Asteroids) is implemented.

The project follows Spec Driven Design (`/spec` and `/spec-impl` workflow; specs live in `specs/NN-*.md` and mark their own `Status`, `Depends on` and out-of-scope items — read the relevant one before changing a feature) using skills from `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`).

## Skills
usa siempre el /frontend-design para diseñar la interfaz de usuario

## Playwright
Guarda todos los screenshots de Playwright en `.playwright-screenshots/` (usa ese directorio en el `filename` de `browser_take_screenshot`).

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)

No test runner is configured yet.

## Stack and gotchas

- Next.js 16.4 / React 19.3, App Router (`app/`), TypeScript, Tailwind v4. Path alias `@/*` → repo root.
- **Next.js here differs from training data.** Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before writing Next code.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`. `cacheComponents` changes caching/dynamic-rendering semantics, so check the docs before using data fetching or request APIs.
- Tailwind is wired through Turbopack rules (`@tailwindcss/turbopack` loader for `*.css`) rather than PostCSS; styles live in `app/globals.css`.
- Layout props use the globally typed helper `LayoutProps<"/">` (no import needed).

## Architecture

- **Catalog**: `lib/games.ts` (`GAMES`) is the static game list; routes are `app/juegos/[id]` (detail) and `app/juegos/[id]/jugar` (player). `components/game-player.tsx` is the shared CRT-framed player (HUD, pause, game-over modal); games other than `rocas` still run a decorative simulation.
- **Asteroids**: `lib/games/asteroids/` is a DOM-free engine (`createAsteroids(canvas, callbacks)` → `start/pause/resume/restart/destroy`) reporting through `onStats` / `onGameOver(finalScore)`. `components/games/asteroidsCanvas.tsx` mounts it; `GamePlayer` owns all HUD/overlays. New games should follow this split. Reference sources to port are in `references/started-games/`; UI mockups in `references/templates/`.
- **Scores (in progress)**: `lib/scores.ts` only produces deterministic fake rows (`seededScores`) used by `components/hall-of-fame.tsx` (`/salon`); "GUARDAR PUNTUACIÓN" in the player is still visual. The planned scoreboard stores each player's best score per game, with a player-chosen name, in Supabase.
- **Supabase**: `utils/supabase/client.ts` (browser) and `utils/supabase/server.ts` (takes the `cookies()` store) wrap `@supabase/ssr`. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`; `.env.local` is git-ignored). The Supabase MCP server is configured in `.mcp.json`; use it for schema/migrations. Supabase skills are in `.claude/skills/`.
- **Contact form**: `components/about/contact-form.tsx` → server action `app/about/actions.ts` → Resend (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`).
- **Hooks** (`.claude/settings.json`): after every Write/Edit, `.claude/hooks/format.mjs` runs Prettier and ESLint `--fix` (lint errors are fed back to you), and a sound plays on Stop.
