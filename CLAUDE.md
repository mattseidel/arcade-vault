# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online platform to play games and compete for the highest score. Early stage — still the create-next-app scaffold (`app/page.tsx`, `app/layout.tsx`); no game/scoring code yet. README is in Spanish.

The project follows Spec Driven Design (`/spec` and `/spec-impl` workflow) using skills from `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`).

## Skills
usa siempre el /frontend-design para diseñar la interfaz de usuario

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
