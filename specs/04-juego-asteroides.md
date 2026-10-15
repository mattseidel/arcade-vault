# SPEC 04 — Juego Asteroides en el reproductor

> **Status:** Approved
> **Depends on:** SPEC 01 (`components/game-player.tsx`, `app/juegos/[id]/jugar/page.tsx`, `lib/games.ts`, estilos CRT en `app/globals.css`)
> **Date:** 2026-10-15
> **Objective:** Portar el juego de `references/started-games/02-asteroids` a un módulo TypeScript y jugarlo en `/juegos/rocas/jugar` dentro del `GamePlayer` de la plataforma, con puntuación, vidas y nivel reales.

---

## Scope

**In:**

- Motor del juego en TypeScript sin globales ni DOM propio (`lib/games/asteroids/`), portado de `game.js`: nave, balas, asteroides (3 tamaños con división), partículas, power-up de triple disparo, vidas, niveles, invencibilidad al reaparecer, espacio toroidal, canvas lógico fijo de 800×600.
- Componente cliente `components/games/asteroidsCanvas.tsx` que monta el canvas, crea el motor y lo destruye al desmontar (listeners de teclado y `requestAnimationFrame` incluidos).
- Integración con `GamePlayer` para el id `rocas`: el canvas reemplaza la arena decorativa dentro del marco CRT; HUD (jugador, puntuación, vidas, nivel), PAUSA, FIN y modal "FIN DEL JUEGO" son los de la plataforma, alimentados por callbacks del motor.
- Se eliminan del canvas el HUD y el overlay "GAME OVER" del original (los dibuja la plataforma). El HUD del canvas solo conserva el contador del triple disparo (`3x 4.2s`), que la plataforma no tiene.
- Estética original: líneas blancas sobre negro, llama naranja, power-up cian, dentro del marco CRT neón.
- Controles solo de teclado (←/→ o A/D rotar, ↑ o W propulsar, Espacio disparar; `S` sin función), con `preventDefault` en esas teclas mientras el juego está activo para que la página no haga scroll. En pantallas táctiles sin teclado se muestra un aviso "REQUIERE TECLADO".
- Pausa real: PAUSA congela el motor; REANUDAR continúa donde estaba. "JUGAR DE NUEVO" reinicia el motor.
- Canvas escalado por CSS al ancho disponible del marco CRT, manteniendo la proporción 4:3.
- Los demás juegos del catálogo mantienen la simulación actual de `GamePlayer`.

**Out of scope (para specs futuras):**

- Guardar la puntuación (en Supabase o donde sea): "GUARDAR PUNTUACIÓN" sigue siendo visual, como en SPEC 01.
- Controles táctiles / botones en pantalla para móvil.
- Recolorear el juego con la paleta neón o añadir `shadowBlur`.
- Sonido y música.
- OVNIs (mencionados en `games.ts` como texto; el juego de referencia no los implementa).
- Portar Tetris y Arkanoid (`references/started-games/03-tetris`, `04-arkanoid`).
- Ranking real del juego en el Salón de la Fama.
- Tests automatizados.

---

## Data model

```ts
// lib/games/asteroids/types.ts
export type AsteroidsStats = { score: number; lives: number; level: number };

export type AsteroidsCallbacks = {
  onStats: (s: AsteroidsStats) => void; // cuando cambia score, lives o level
  onGameOver: (finalScore: number) => void; // una sola vez por partida
};
```

```ts
// lib/games/asteroids/engine.ts
export type AsteroidsEngine = {
  start(): void; // inicia el loop (rAF) y los listeners de teclado
  pause(): void;
  resume(): void;
  restart(): void; // nueva partida: 3 vidas, nivel 1, score 0
  destroy(): void; // detiene el loop y quita los listeners
};

export function createAsteroids(
  canvas: HTMLCanvasElement,
  cb: AsteroidsCallbacks,
): AsteroidsEngine;
```

```ts
// Constantes portadas tal cual de game.js (lib/games/asteroids/constants.ts)
export const W = 800;
export const H = 600;
export const RADII = [0, 16, 30, 50]; // índice = tamaño 1, 2, 3
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20]; // pequeño 100, mediano 50, grande 20
```

Convenciones:

- Coordenadas con origen arriba a la izquierda; unidades en px y px/s, `dt` en segundos con tope de 50 ms (igual que el original).
- El estado vive dentro del cierre de `createAsteroids`; no hay variables globales ni acceso a `window` fuera de `start`/`destroy`.
- El motor no depende de React; `GamePlayer` solo lo ve a través de `AsteroidsEngine` y los callbacks.
- `GamePlayer` decide qué arena mostrar por `id === "rocas"`; no se añade un campo nuevo a `Game`.
- Sin `Math.random` en el render de React; el azar solo ocurre dentro del motor, ya en el cliente.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` sobre Client Components y `cacheComponents` según `AGENTS.md`. Usar el skill `/frontend-design` para cualquier ajuste visual del marco/aviso (ver `CLAUDE.md`).

1. Crear `lib/games/asteroids/constants.ts` y `types.ts`. Verificar: `npm run lint` pasa.
2. Crear `lib/games/asteroids/engine.ts` portando `game.js` a TypeScript (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, input, update, draw, loop) sin HUD de score/vidas/nivel ni overlay "GAME OVER"; emitir `onStats` y `onGameOver`; implementar `pause/resume/restart/destroy`. Si supera ~300 líneas, partir en `entities.ts` y `engine.ts`. Verificar: `npm run lint` y `tsc` pasan.
3. Crear `components/games/asteroidsCanvas.tsx` (client): `<canvas width=800 height=600>`, `useEffect` que crea el motor, lo arranca y llama `destroy()` en el cleanup; props `paused`, `runKey` (para reiniciar) y los callbacks. Verificar: lint pasa y no hay doble loop con Strict Mode (el cleanup limpia).
4. Integrar en `components/game-player.tsx`: si `id === "rocas"`, renderizar `AsteroidsCanvas` en lugar de la arena decorativa y reemplazar el `setInterval` simulado por `onStats`/`onGameOver` (vidas con `"♥ ".repeat(lives)`, nivel del motor, `over` al terminar). Para los demás ids el comportamiento no cambia. Verificar: `/juegos/rocas/jugar` muestra el juego y los otros juegos siguen simulando.
5. Conectar PAUSA/REANUDAR, FIN (termina la partida con la puntuación actual) y "JUGAR DE NUEVO" con el motor; el overlay "EN PAUSA" existente se muestra sobre el canvas. Verificar: PAUSA congela asteroides y nave; REANUDAR continúa; "JUGAR DE NUEVO" empieza en 0 con 3 vidas.
6. Estilos en `app/globals.css`: canvas al 100% del ancho de `.crt-screen` con `aspect-ratio: 4 / 3` y `image-rendering` por defecto; aviso "REQUIERE TECLADO" visible solo con `@media (pointer: coarse)`. Verificar: a 375px y 1280px el canvas no desborda y mantiene 4:3.
7. Evitar el scroll por teclado: `preventDefault` en `ArrowUp/Down/Left/Right`, `KeyW/KeyA/KeyS/KeyD` y `Space` (ignorando eventos que vienen de un `input`/`textarea`) mientras el motor está corriendo y el juego no está en pausa ni con el modal abierto. Verificar: jugar con flechas, WASD y espacio no desplaza la página y se puede escribir en el input de iniciales del modal.
8. Revisión con Playwright en `.playwright-screenshots/`: capturas del juego en curso, pausa y modal de fin de juego, a ~375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/rocas/jugar` muestra un canvas con la nave en el centro, 4 asteroides grandes y nivel 01, puntuación 0 y 3 vidas en el HUD de la plataforma.
- [ ] ← y → (o A y D) rotan la nave, ↑ (o W) la propulsa (con llama naranja) y Espacio dispara una bala.
- [ ] Destruir un asteroide grande suma exactamente 20 puntos, uno mediano 50 y uno pequeño 100; el HUD de la plataforma refleja la cifra.
- [ ] Un asteroide grande se parte en 2 medianos, un mediano en 2 pequeños y un pequeño desaparece.
- [ ] La nave, las balas y los asteroides que salen por un borde reaparecen por el opuesto.
- [ ] Chocar con un asteroide resta una vida en el HUD, la nave reaparece al centro a los 2 s y parpadea durante 3 s sin poder morir.
- [ ] Destruir todos los asteroides sube el nivel en el HUD y genera `3 + nivel` asteroides grandes.
- [ ] Al perder la tercera vida aparece el modal "FIN DEL JUEGO" con la puntuación final correcta.
- [ ] El botón FIN abre el modal con la puntuación actual.
- [ ] PAUSA congela el juego y muestra "EN PAUSA"; REANUDAR continúa sin saltos de posición.
- [ ] "JUGAR DE NUEVO" inicia una partida con puntuación 0, 3 vidas y nivel 01.
- [ ] Recoger el power-up cian `3x` activa el triple disparo y el contador `3x N.Ns` aparece en el canvas durante 5 s.
- [ ] "GUARDAR PUNTUACIÓN" muestra "PUNTUACIÓN GUARDADA_" sin llamadas de red.
- [ ] Pulsar flechas, WASD y Espacio durante la partida no desplaza la página.
- [ ] Salir de la pantalla (SALIR, VOLVER AL VAULT o navegación) detiene el loop: sin `requestAnimationFrame` ni listeners de teclado residuales (comprobable en DevTools: el juego anterior no reacciona al teclado en otra página).
- [ ] Los demás juegos (`/juegos/caida/jugar`, etc.) siguen con la simulación actual.
- [ ] A 375px el canvas no genera scroll horizontal y mantiene proporción 4:3; con `pointer: coarse` aparece el aviso "REQUIERE TECLADO".
- [ ] No hay errores de hidratación ni warnings en la consola en `/juegos/rocas/jugar`, tampoco en desarrollo con Strict Mode.

---

## Decisions

- **Sí:** el juego se conecta al id existente `rocas` de `lib/games.ts`. Ya está en el catálogo, con portada y descripción; no se crea un juego duplicado.
- **Sí:** motor en TypeScript puro (`lib/games/asteroids/`) desacoplado de React. Facilita reutilizar el patrón para Tetris y Arkanoid y evita meter el loop dentro de `useEffect`.
- **No:** copiar `game.js` a `public/` y cargarlo con `<script>` o `<iframe>`. Usa globales y su propio HUD, no puede hablar con el HUD/modal de la plataforma y rompe con rutas cliente de Next.js.
- **Sí:** reutilizar el shell de `GamePlayer` (HUD, PAUSA, FIN, modal) y quitar el HUD/overlay del canvas. Una sola UI coherente con el resto de juegos.
- **No:** dejar el juego autónomo con su HUD propio. Dejaría PAUSA/FIN/modal sin función para este juego.
- **Sí:** se conserva el contador `3x` dentro del canvas. La plataforma no tiene dónde mostrarlo y es información útil para jugar.
- **Sí:** estética original (blanco sobre negro). Fiel al clásico y sin riesgo de rendimiento.
- **No:** recolorear con neón / `shadowBlur`. Decisión del usuario; se puede revisar en otra spec.
- **Sí:** solo teclado con aviso en táctil. El juego original no tiene controles táctiles y diseñarlos es una pieza aparte.
- **Sí:** no persistir la puntuación. Supabase aún no tiene esquema, RLS ni auth de jugador definidos; va en otra spec.
- **Sí:** canvas lógico fijo 800×600 escalado por CSS. Mantiene la física idéntica al original en cualquier tamaño.
- **Sí:** `GamePlayer` discrimina por `id === "rocas"`. Es la solución más corta con un solo juego real; cuando haya 2 o 3 se refactoriza a un registro de juegos en otra spec.

---

## Risks

| Riesgo                                                                             | Mitigación                                                                                                                   |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode monta/desmonta dos veces y deja dos loops o listeners duplicados | `destroy()` cancela `requestAnimationFrame` y quita los listeners; criterio de aceptación sin errores en desarrollo.         |
| `Math.random` y `performance.now` en SSR provocan errores de hidratación           | El motor solo se crea dentro de `useEffect`; ningún dato aleatorio se renderiza en servidor.                                 |
| Las flechas y Espacio hacen scroll o activan botones enfocados                     | `preventDefault` solo mientras el juego está activo; quitar el foco del botón PAUSA tras pulsarlo.                           |
| Pestaña en segundo plano genera un `dt` enorme                                     | Se mantiene el tope de 50 ms del original; además se pausa el motor al perder visibilidad (`document.visibilitychange`).     |
| `cacheComponents` y componentes cliente con canvas en una ruta con `Suspense`      | Leer la doc antes del paso 1; `AsteroidsCanvas` es client component dentro del `Suspense` que ya existe en `jugar/page.tsx`. |
| Las flechas pasan también al modal "FIN DEL JUEGO" (input de iniciales)            | El motor deja de capturar teclas en `onGameOver`; `preventDefault` solo con el juego en curso.                               |

---

## What is **not** in this spec

- Guardar la puntuación en Supabase o en cualquier otro almacén.
- Controles táctiles o botones en pantalla.
- Recolorear el juego con la paleta neón.
- Sonido, música u OVNIs.
- Portar Tetris o Arkanoid.
- Ranking real del juego en el Salón de la Fama.
- Tests automatizados.
