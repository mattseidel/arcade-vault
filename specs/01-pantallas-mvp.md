# SPEC 01 — Pantallas visuales del MVP

> **Status:** Implemented
> **Depends on:** Ninguna (los estilos base ya viven en `app/globals.css` y `app/layout.tsx`, rama `01-styles`)
> **Date:** 2026-10-14
> **Objective:** Implementar en Next.js las 5 pantallas de `references/templates/` (Biblioteca, Detalle, Reproductor, Login, Salón de la Fama) con navegación y datos mock, sin lógica de juego real ni persistencia.

---

## Scope

**In:**

- Layout compartido: `Nav` (logo, links, contador de créditos, botón "Iniciar Sesión", menú móvil) y footer, en `app/layout.tsx`.
- Biblioteca (`/`): hero, buscador, chips de categoría, grilla de tarjetas con efecto tilt, estado vacío "NO HAY RESULTADOS".
- Detalle de juego (`/juegos/[id]`): portada, tags, descripción, stats, botones, leaderboard top 10 mock.
- Reproductor (`/juegos/[id]/jugar`): HUD, marco CRT, arena decorativa, simulación de puntuación, pausa, modal "FIN DEL JUEGO".
- Login / Crear cuenta (`/login`): tabs, formulario, "Jugar como invitado", botones sociales decorativos.
- Salón de la Fama (`/salon`): tabs por juego, podio top 3, tabla top 12.
- Datos mock tipados en `lib/games.ts` y `lib/scores.ts`.
- Estilos de las pantallas faltantes en `app/globals.css`, tomados de `references/templates/styles.css` (solo lo que no exista ya).
- Rutas reales de App Router; `notFound()` si el `id` no existe.

**Out of scope (para specs futuras):**

- Cualquier juego jugable (Bloque Buster, Caída, etc.).
- Autenticación real, sesión de usuario, cookies, OAuth (Google/GitHub son botones decorativos).
- Persistencia de puntuaciones o usuario (ni `localStorage` ni backend).
- Fila "TU MEJOR MARCA" del Salón y nombre de usuario en el Nav (dependen de sesión).
- Base de datos / API para juegos y rankings.
- Contador de créditos funcional (se muestra el texto fijo `CRÉDITOS · 03`).
- Tests automatizados (no hay runner configurado).

---

## Data model

```ts
// lib/games.ts
export type GameColor = "cyan" | "magenta" | "green" | "yellow";
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;          // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;       // descripción corta (tarjeta)
  long: string;        // descripción larga (detalle)
  cat: Category;
  cover: string;       // clase CSS: "cover-bricks", "cover-tetro", ...
  color: GameColor;    // color del botón JUGAR
  best: number;
  plays: string;       // "12.4K"
};

export const GAMES: Game[];                  // 8 juegos, copiados de data.jsx
export const CATS: ("TODOS" | Category)[];

// lib/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string };
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, sin Math.random
```

Convenciones:

- `seededScores` debe ser puro y determinista para no causar errores de hidratación.
- Números formateados con `toLocaleString("es-ES")`.
- Seeds como en el template: detalle `id.length * 17 + 3` (10 filas); salón `id.length * 23 + 7` (12 filas).

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` sobre App Router, `cacheComponents`, `generateStaticParams` y `params` asíncronos (ver `AGENTS.md`). Usar el skill `/frontend-design` para la UI (ver `CLAUDE.md`).

1. Crear `lib/games.ts` y `lib/scores.ts` con tipos y datos del template. Verificar: `npm run lint` pasa.
2. Crear `components/nav.tsx` (client: link activo con `usePathname`, menú móvil) y montarlo con el footer en `app/layout.tsx`. Verificar: el Nav se ve en `/`, con links a `/` y `/salon`.
3. Portar estilos faltantes de `references/templates/styles.css` a `app/globals.css` (tarjetas, detalle, player/CRT, modal, auth, podio/tabla). Verificar: la app compila sin errores de CSS.
4. Biblioteca en `app/page.tsx` + `components/game-card.tsx` (client, tilt) + `components/library-filters.tsx` (client, búsqueda + chips). Verificar: filtrar por texto y categoría; estado vacío.
5. Detalle en `app/juegos/[id]/page.tsx` con `generateStaticParams` y `notFound()`. Verificar: clic en una tarjeta abre el detalle; un id inválido da 404.
6. Reproductor en `app/juegos/[id]/jugar/page.tsx` + `components/game-player.tsx` (client: score, nivel, pausa, fin, modal, guardar sin persistir). Verificar: puntuación sube, pausa la detiene, FIN abre el modal.
7. Login en `app/login/page.tsx` + `components/auth-form.tsx` (client: tabs, campo email solo en "Crear cuenta"; submit e invitado navegan a `/`). Verificar: ambos botones llevan a `/`.
8. Salón en `app/salon/page.tsx` + `components/hall-of-fame.tsx` (client: tabs por juego, podio, tabla). Verificar: cambiar de tab cambia los datos.
9. Revisión responsive (menú hamburguesa, grillas) a ~375px y 1280px.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` muestra 8 tarjetas y el hero "ARCADE VAULT".
- [ ] Buscar "glo" en `/` deja solo la tarjeta GLOTÓN.
- [ ] Elegir el chip PUZZLE deja solo CAÍDA.
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en una tarjeta o en su botón JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/no-existe` muestra la página 404 (con `cacheComponents` el status HTTP es 200 por streaming; `noindex` incluido).
- [ ] `/juegos/<id>` muestra portada, tags, descripción, 3 stats y 10 filas de leaderboard, con los 3 primeros resaltados.
- [ ] "JUGAR AHORA" navega a `/juegos/<id>/jugar`; "VOLVER AL VAULT" a `/`.
- [ ] En el reproductor la puntuación aumenta sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR continúa.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN muestra "PUNTUACIÓN GUARDADA_" y no escribe en `localStorage`.
- [ ] En el modal, "JUGAR DE NUEVO" reinicia a 0 y "VOLVER AL VAULT" navega a `/`. SALIR del HUD navega a `/juegos/<id>`.
- [ ] `/login` alterna entre "Iniciar sesión" y "Crear cuenta"; el campo de correo solo aparece en la segunda.
- [ ] Enviar el formulario y "JUGAR COMO INVITADO" navegan a `/`.
- [ ] `/salon` muestra podio (02, 01, 03), 12 filas y cambia de datos al cambiar de juego.
- [ ] El Nav marca "Biblioteca" activo en `/`, `/juegos/*` y "Salón de la Fama" en `/salon`.
- [ ] A 375px de ancho el Nav muestra el botón hamburguesa y abre/cierra el panel lateral.
- [ ] No hay errores de hidratación ni warnings en la consola del navegador en ninguna de las 5 pantallas.

---

## Decisions

- **Sí:** rutas reales de App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/login`, `/salon`). URLs compartibles y aprovecha el framework.
- **No:** SPA con hash como en el template. Desperdicia Next.js y rompe el botón atrás/compartir.
- **Sí:** solo visual, sin persistencia. Evita decidir un modelo de usuario/puntajes antes de tener backend.
- **No:** `localStorage` (`av_user`, `av_scores`) del template. Se descarta junto con la fila "TU MEJOR MARCA" y el nombre en el Nav.
- **Sí:** mantener la simulación del Reproductor (score aleatorio, pausa, modal). Valida el flujo completo de pantalla sin escribir juegos.
- **Sí:** datos mock en TypeScript tipado (`lib/`). Fácil de reemplazar por API/DB después.
- **No:** JSON estático. Menos tipado, mismo costo de reemplazo.
- **Sí:** componentes server por defecto; `"use client"` solo donde hay estado (Nav, filtros, tarjeta con tilt, reproductor, auth, salón).
- **Sí:** los textos de la UI quedan en español, como en el template.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `cacheComponents` cambia la semántica de rutas dinámicas y `params` | Leer la doc de `node_modules/next/dist/docs/` antes del paso 5; usar `generateStaticParams` con los 8 ids. |
| Errores de hidratación por `Math.random` o fechas en render | `seededScores` determinista; el `Math.random` del reproductor solo corre dentro de `useEffect`. |
| `globals.css` ya tiene estilos de `01-styles` y puede duplicarlos | En el paso 3 comparar con el template y añadir solo lo faltante. |
| Los templates dependen de React global (`window.X`) | Reescribir como módulos TSX con imports; no copiar los `window.Nav = Nav`. |

---

## What is **not** in this spec

- Juegos reales.
- Autenticación, sesión o OAuth.
- Persistencia de usuario o puntuaciones.
- Backend, base de datos o API.
- Tests automatizados.
- Contador de créditos funcional.
