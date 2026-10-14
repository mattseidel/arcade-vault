# SPEC 02 — Homepage (landing)

> **Status:** Approved
> **Depends on:** SPEC 01 (`lib/games.ts`, `components/nav.tsx`, `components/game-card.tsx`, estilos base en `app/globals.css`)
> **Date:** 2026-10-14
> **Objective:** Implementar la landing de `references/templates/home-about/home.jsx` en `/` con datos mock, moviendo la Biblioteca a `/biblioteca`.

---

## Scope

**In:**

- Homepage en `/` con las 7 secciones del template: Hero (siluetas flotantes, título, CTAs, "DESLIZA"), ¿Por qué Arcade Vault? (4 feature cards con iconos pixel), Juegos disponibles (6 mini-cards + "VER TODOS LOS JUEGOS"), Stats (3 bloques), Actividad en vivo (últimas puntuaciones + top jugadores hoy), Precios + FAQ, CTA final.
- Animación `reveal` (IntersectionObserver) en las secciones.
- Mover la Biblioteca de `/` a `/biblioteca` (`app/biblioteca/page.tsx`).
- Actualizar el Nav: añadir link "Inicio" (`/`); "Biblioteca" apunta a `/biblioteca` y se marca activo en `/biblioteca` y `/juegos/*`; el logo lleva a `/`.
- Actualizar enlaces que hoy apuntan a `/` como Biblioteca: `hall-of-fame.tsx` ("VOLVER A LA BIBLIOTECA") y los "VOLVER AL VAULT" de `app/juegos/[id]/page.tsx` y `components/game-player.tsx` pasan a `/biblioteca`. Tras login/invitado (`auth-form.tsx`) se mantiene `/`.
- Datos mock tipados en `lib/home.ts` (features, stats, actividad, top jugadores, FAQ, beneficios del plan).
- Estilos de la landing portados de `references/templates/home-about/styles.css` a `app/globals.css` (solo lo que no exista).
- Componentes de la landing en `components/home/`.

**Out of scope (para specs futuras):**

- Página "Acerca de" (`about.jsx`) y su link en el Nav.
- Backend, API o datos reales de actividad/ranking (todo mock estático, textos "hace X min" fijos).
- Autenticación real; "CREAR CUENTA" solo navega a `/login`.
- Sistema de planes o pagos (la sección Precios es solo informativa).
- Contador de créditos funcional y nombre de usuario en el Nav.
- Tests automatizados.

---

## Data model

```ts
// lib/home.ts
import type { GameColor } from "@/lib/games";

export type Feature = { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; color: GameColor };
export type HomeStat = { n: string; unit: string; sub: string };
export type Activity = { player: string; game: string; score: number; when: string; color: GameColor };
export type TopPlayer = { rank: number; player: string; score: number };
export type Faq = { q: string; a: string };

export const FEATURES: Feature[];       // 4, copiados de home.jsx
export const HOME_STATS: HomeStat[];    // 3
export const ACTIVITY: Activity[];      // 7
export const TOP_TODAY: TopPlayer[];    // 5
export const PLAN_PERKS: string[];      // 6 beneficios del plan único
export const FAQS: Faq[];               // 3
```

Convenciones:

- Los juegos de "Juegos disponibles" salen de `GAMES.slice(0, 6)` (SPEC 01); no se duplican.
- Números con `toLocaleString("es-ES")`.
- Sin `Math.random` ni fechas en render (evita errores de hidratación).

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (App Router, `cacheComponents`) según `AGENTS.md`. Usar el skill `/frontend-design` para la UI (ver `CLAUDE.md`).

1. Mover la Biblioteca: crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (dejar `app/page.tsx` temporalmente igual). Verificar: `/biblioteca` muestra las 8 tarjetas y los filtros.
2. Actualizar enlaces: Nav (link "Inicio", activo de Biblioteca en `/biblioteca` y `/juegos/*`, logo a `/`), `hall-of-fame.tsx`, `app/juegos/[id]/page.tsx`, `components/game-player.tsx`. Verificar: `npm run lint` pasa y ningún "VOLVER" lleva a `/` esperando Biblioteca.
3. Crear `lib/home.ts` con tipos y datos del template. Verificar: `npm run lint` pasa.
4. Portar a `app/globals.css` los estilos de la landing (`.home-*`, `.silo`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.ticker`, `.top-*`, `.price-*`, `.faq-*`, `.final-*`, `.reveal`), comparando antes con lo existente. Incluir `prefers-reduced-motion` para `.reveal` y siluetas. Verificar: la app compila sin errores de CSS.
5. Crear `components/home/` : `floating-silhouettes.tsx`, `feature-icon.tsx` (server), `mini-card.tsx` (`Link` a `/juegos/<id>`), `reveal.tsx` (client, IntersectionObserver que añade `.in`, reemplaza el hook `useReveal`). Verificar: lint pasa.
6. Reemplazar `app/page.tsx` por la landing componiendo las 7 secciones (server component; solo `reveal` es client). CTAs con `Link`: "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS" → `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS" → `/login`; "VER SALÓN" → `/salon`; "INSERTAR MONEDA" → `/biblioteca`. Verificar: `/` renderiza todas las secciones.
7. Revisión responsive a ~375px y 1280px y capturas con Playwright en `.playwright-screenshots/`. Verificar: sin scroll horizontal, grillas colapsan, Nav con hamburguesa.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` muestra el hero con el título "EL ARCADE CLÁSICO ESTÁ DE VUELTA" y las 8 siluetas decorativas.
- [ ] `/` muestra 4 feature cards, 6 mini-cards, 3 stats, 7 filas de últimas puntuaciones, 5 filas de top jugadores, la tarjeta de precio `$0` con 6 beneficios, 3 preguntas FAQ y el CTA final.
- [ ] Las secciones con `reveal` aparecen (clase `in`) al entrar en viewport.
- [ ] Clic en una mini-card navega a `/juegos/<id>`.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" navegan a `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS" a `/login`; "VER SALÓN" a `/salon`.
- [ ] `/biblioteca` muestra las 8 tarjetas, el buscador y los chips con el mismo comportamiento que en SPEC 01.
- [ ] El Nav tiene "Inicio" activo solo en `/`, "Biblioteca" activo en `/biblioteca` y `/juegos/*`, y "Salón de la Fama" activo en `/salon`. No hay link "Acerca de".
- [ ] "VOLVER AL VAULT" (detalle y reproductor) y "VOLVER A LA BIBLIOTECA" (salón) navegan a `/biblioteca`.
- [ ] Con `prefers-reduced-motion: reduce` las secciones son visibles sin animación.
- [ ] A 375px no hay scroll horizontal y el Nav muestra el botón hamburguesa.
- [ ] No hay errores de hidratación ni warnings en la consola en `/` ni en `/biblioteca`.

---

## Decisions

- **Sí:** homepage en `/` y Biblioteca en `/biblioteca`. Coincide con el template (Inicio ≠ Biblioteca) y la raíz es la landing natural.
- **No:** homepage en `/inicio`. La landing no sería la raíz del sitio.
- **No:** incluir "Acerca de" en esta spec. Es otra pantalla; evita ampliar el alcance y dejar un link a una página inexistente.
- **Sí:** datos mock estáticos en `lib/home.ts`. Mismo criterio que SPEC 01; fácil de sustituir por API.
- **No:** derivar actividad/top de `seededScores`. Acopla la landing a los rankings y pierde los nombres del template.
- **Sí:** todas las secciones del template, con `reveal` y siluetas, incluida Precios/FAQ (informativa, sin lógica de planes).
- **Sí:** server components por defecto; `"use client"` solo en `reveal.tsx`. El template usaba un hook global; aquí se aísla en un wrapper.
- **Sí:** CTAs como `Link` en lugar de `navigate()` del template.
- **Sí:** textos en español, como en el template y SPEC 01.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Mover la Biblioteca rompe enlaces que apuntan a `/` | Paso 2 actualiza todos los usos conocidos (`nav`, `hall-of-fame`, detalle, reproductor); grep de `href="/"` antes de cerrar. |
| `.reveal` deja contenido invisible si el JS falla o no hay IntersectionObserver | Aplicar el ocultado solo cuando el cliente ya montó, y override con `prefers-reduced-motion`. |
| Estilos del template chocan con los existentes en `globals.css` | Comparar antes de portar (paso 4); añadir solo lo faltante. |
| Animaciones de siluetas pesadas en móvil | Revisar en paso 7; reducir o ocultar siluetas por media query si hay jank. |
| `cacheComponents` y el uso de `Link`/hooks en server components | Leer la doc antes del paso 1; mantener la landing como server component estático. |

---

## What is **not** in this spec

- Página "Acerca de".
- Datos reales de actividad o ranking.
- Autenticación, planes o pagos.
- Contador de créditos funcional.
- Tests automatizados.
