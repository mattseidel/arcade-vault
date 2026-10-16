# SPEC GJ-1 — Salto Neón (runner de un botón): motor jugable

> **Status:** Implemented
> **Depends on:** SPEC 04 (motor/`GamePlayer`), SPEC 06 (registro de juegos), `lib/games.ts` (id nuevo `salto-neon`)
> **Date:** 2026-10-15
> **Objective:** Añadir Salto Neón al catálogo y crear su motor TypeScript (un cubo neón corre solo por una pista infinita y salta obstáculos con una sola tecla), jugable en `/juegos/salto-neon/jugar` dentro de `GamePlayer`, sin guardar puntuaciones todavía.

---

## Scope

**In:**

- Entrada nueva en `GAMES` (`lib/games.ts`), añadida **al final** del array (no cambia la portada, que usa `GAMES.slice(0, 6)`, ni la pestaña inicial del Salón, que es `GAMES[0]`):
  `{ id: "salto-neon", title: "SALTO NEÓN", short: "Un botón. Una pista infinita. Cero perdón.", long: "Un cubo de luz corre sin freno por una autopista de neón. Pulsa para saltar pinchos y bloques que surgen de la oscuridad. Cuanto más lejos llegas, más rápido corre el mundo.", cat: "ARCADE", cover: "cover-salto", color: "magenta", best: 12650, plays: "3.7K" }`.
- Clase `.cover-salto` en `app/globals.css` (junto a `.cover-rana`), mismo patrón que las otras portadas (`background` + `::after` con gradientes): suelo de rejilla magenta, cubo cyan en el aire y un pincho triangular. Sin imágenes.
- Motor TS sin globales ni DOM (`lib/games/saltoNeon/`), canvas lógico fijo 800×600 (4:3 como `rocas`).
- Mecánica núcleo: el jugador es un cubo de 40×40 px fijo en `x = 160`; la pista se desplaza a la izquierda a 360 px/s constantes; suelo en `y = 480`. Un salto por pulsación, solo apoyado en el suelo; gravedad constante. Sin doble salto.
- Obstáculos en el suelo, uno a la vez por hueco, elegidos al azar con igual probabilidad: **pincho** (30×40), **pincho doble** (60×40) y **bloque** (40×60). La separación entre el inicio de un obstáculo y el siguiente es un tiempo al azar entre 0,95 s y 1,8 s multiplicado por la velocidad. El primero aparece en `x = 1000`.
- Tocar cualquier obstáculo termina la partida (sin vidas).
- Puntuación provisional: **1 punto por metro** recorrido, con 1 m = 10 px (36 puntos/s a 360 px/s). La puntuación completa llega en GJ-2.
- Dibujo con primitivas de canvas en estilo neón (`shadowBlur`): cubo cyan, pinchos y bloques magenta, línea de suelo magenta con rejilla de líneas verticales cada 40 px que se desplaza con la pista. Sin assets.
- Entrada en `REAL_GAMES` (800×600, `lives: false`). **No** entra en `RANKED_GAMES`.
- HUD/PAUSA/FIN/modal son los de `GamePlayer`; el canvas no dibuja score/nivel ni "GAME OVER".
- Controles de teclado: Espacio, ↑ o W para saltar; P / Esc pausa. Aviso "REQUIERE TECLADO" en táctil (ya lo pinta `GamePlayer`).

**Out of scope (para specs futuras):** velocidad creciente, niveles, orbes, puntuación completa, viga colgante y feedback visual (SPEC GJ-2); ranking y Supabase (SPEC GJ-3); controles táctiles, sonido, salto variable por pulsación larga, skins.

---

## Data model

```ts
// lib/games/saltoNeon/constants.ts
export const W = 800,
  H = 600;
export const GROUND_Y = 480; // y del suelo (borde superior de la pista)
export const PLAYER_X = 160,
  PLAYER_SIZE = 40,
  HITBOX_INSET = 6; // px que se recortan por lado al colisionar
export const GRAVITY = 2400, // px/s²
  JUMP_VELOCITY = 900; // px/s hacia arriba → altura máx. ≈ 169 px, 0,75 s en el aire
export const JUMP_BUFFER_MS = 100;
export const BASE_SPEED = 360; // px/s
export const MIN_GAP_S = 0.95,
  MAX_GAP_S = 1.8;
export const FIRST_OBSTACLE_X = 1000;
export const PX_PER_METER = 10;
export const STATS_EVERY_MS = 100;
export const OBSTACLES = {
  spike: { w: 30, h: 40 },
  doubleSpike: { w: 60, h: 40 },
  block: { w: 40, h: 60 },
} as const;
// lib/games/saltoNeon/types.ts
export type ObstacleKind = keyof typeof OBSTACLES;
export type Obstacle = { kind: ObstacleKind; x: number; w: number; h: number };
// lib/games/saltoNeon/engine.ts
export function createSaltoNeon(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine;
```

**Convenciones:** unidades en px, px/s y ms; `dt` con tope de 50 ms. Física por frame: `vy += GRAVITY·dt`, `y += vy·dt`, al tocar `GROUND_Y` se apoya (`vy = 0`). Pulsar salto en el aire guarda la intención 100 ms (`JUMP_BUFFER_MS`) y salta al aterrizar si sigue vigente; `keydown` con `e.repeat` se ignora (mantener no repite). Colisión AABB: el cubo se reduce 6 px por lado (28×28); el pincho usa un rectángulo central de 18×28 px apoyado en el suelo (el pincho doble, 48×28); el bloque usa su rectángulo completo. `score = ⌊distancia / 10⌋`. `onStats` emite `{ score, lives: 0, level: 1 }` como máximo cada 100 ms cuando cambia el score (el registro pone `lives: false`, el HUD oculta vidas), y siempre una vez con el valor final justo antes de `onGameOver`. `onGameOver(score)` se llama **una sola vez**, en el frame de la colisión. El primer obstáculo llega al jugador tras ≈ 2,3 s, así que toda partida termina con ≥ 64 puntos. `game_id = "salto-neon"`. El azar (`Math.random`: tipo de obstáculo y hueco) vive solo dentro del motor.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Client Components, `cacheComponents`). La portada `.cover-salto` es UI nueva: diseñarla con `/frontend-design`. El canvas 4:3 ya existe.

0. Registro ya hecho (SPEC 06): nada que refactorizar. Verificar al final que `rocas`, `caida`, `bloque-buster` y `serpentina` siguen igual.
1. Añadir la entrada `salto-neon` al final de `GAMES` y la clase `.cover-salto` en `app/globals.css`. Verificar: `/biblioteca` muestra la tarjeta y `/juegos/salto-neon` la ficha con su portada; la portada (`/`) no cambia.
2. Crear `constants.ts` y `types.ts` en `lib/games/saltoNeon/`. Verificar: lint pasa.
3. Crear `engine.ts`: física del salto con buffer, generación de obstáculos, colisión, distancia/score, dibujo neón; `start/pause/resume/restart/destroy`, pausa en `visibilitychange`, tope de `dt`, `preventDefault` de Espacio/↑/W solo jugando e ignorando `input`/`textarea`. Verificar: lint y `tsc` pasan.
4. Registrar en `REAL_GAMES` (`create: createSaltoNeon`, 800×600, `lives: false`). Verificar: `/juegos/salto-neon/jugar` muestra el juego; los simulados siguen igual.
5. Estilos del canvas: reutilizar los 4:3 de `rocas`; solo ajustar si hay desborde a 375px y 1280px.
6. Revisión con Playwright en `.playwright-screenshots/`: tarjeta en biblioteca, ficha, partida, salto, pausa, choque y modal, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] `salto-neon` aparece en `/biblioteca` (filtros TODOS y ARCADE) con la portada `.cover-salto`; la portada de inicio sigue mostrando los mismos 6 juegos.
- [ ] El cubo (40×40) está fijo en `x = 160` sobre el suelo `y = 480` y la pista avanza a 360 px/s (el score sube 36 puntos/s).
- [ ] Espacio, ↑ y W hacen saltar; el salto alcanza ≈ 169 px de altura y dura ≈ 0,75 s; no hay doble salto y mantener la tecla no repite.
- [ ] Pulsar hasta 100 ms antes de aterrizar salta al tocar el suelo; pulsar antes de eso no hace nada.
- [ ] Los obstáculos son solo pincho (30×40), pincho doble (60×40) y bloque (40×60); el primero aparece en `x = 1000` y la separación entre obstáculos está siempre entre 0,95 s y 1,8 s de recorrido (342–648 px).
- [ ] Todos los obstáculos se pueden saltar con un salto pulsado a tiempo.
- [ ] Tocar un obstáculo termina la partida; `onGameOver` se llama una sola vez con un score ≥ 64.
- [ ] PAUSA congela pista y salto; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero (0 puntos, primer obstáculo en `x = 1000`).
- [ ] Al terminar aparece "FIN DEL JUEGO" con la puntuación correcta; el guardado es solo visual (sin llamada de red: el juego aún no es ranked).
- [ ] No regresión: `rocas`, `caida`, `bloque-buster`, `serpentina` y los juegos simulados se comportan como antes.
- [ ] Espacio/flechas/W no hacen scroll ni reactivan PAUSA; el input de iniciales acepta W y espacios.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **id nuevo `salto-neon`:** ningún juego del catálogo es un runner; se añade al final de `GAMES` para no alterar portada ni Salón. Es el `game_id` de la BD y no cambia después. Alternativa: reutilizar `ranaria` (también salta), pero es otro género.
- **Carpeta `lib/games/saltoNeon/` en camelCase:** convención de archivos nuevos (como `bloqueBuster/`); el id de catálogo sigue en kebab-case.
- **Canvas 800×600 (4:3):** reutiliza los estilos de `rocas`; el aire sobre el suelo deja sitio a la viga de GJ-2. Alternativa: 16:9 apaisado, más natural para un runner pero exige CSS nuevo.
- **Huecos en segundos, no en px:** `gap = t × velocidad` mantiene el juego justo cuando GJ-2 acelere (0,95 s > 0,75 s en el aire). Alternativa: px fijos, que se vuelven imposibles a alta velocidad.
- **Buffer de salto de 100 ms:** perdona pulsar un pelo antes de aterrizar, clave en un juego de un botón. Alternativa: sin buffer, se pierden saltos y se siente injusto.
- **Hitbox reducida:** 6 px por lado del cubo y núcleo del pincho; los roces visuales no matan. Alternativa: hitbox exacta, más frustrante.
- **Sin vidas:** un toque y fin, como el género; el HUD muestra puntos y nivel (`lives: false`, como `caida`). Alternativa: 3 vidas, alarga partidas pero diluye la tensión.
- **Score por metros ya en GJ-1:** permite probar el HUD y el modal desde el primer spec; GJ-2 lo completa. Alternativa: score 0 hasta GJ-2.
- **`onStats` cada 100 ms:** el score cambia casi cada frame; limitarlo evita 60 renders/s de `GamePlayer`. Alternativa: emitir cada frame.

---

## Risks

| Riesgo                                                 | Mitigación                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| Strict Mode deja dos loops/listeners                   | `destroy()` cancela rAF y quita listeners                        |
| `Math.random`/`performance.now` rompen la hidratación  | El motor solo se crea en `useEffect`                             |
| Espacio/flechas hacen scroll o activan botones         | `preventDefault` solo jugando; blur del botón PAUSA              |
| Pestaña en segundo plano genera un `dt` enorme         | Tope de 50 ms + pausa en `visibilitychange`                      |
| Obstáculo imposible por hueco demasiado corto          | Hueco mínimo 0,95 s > 0,75 s de vuelo; revisado en QA            |
| El cubo atraviesa un obstáculo fino con un `dt` grande | Con `dt` ≤ 50 ms avanza ≤ 18 px/frame, menor que 28 px de hitbox |
| Score final desfasado por el throttle de `onStats`     | `onStats` final forzado antes de `onGameOver`                    |
| Tecla W/Espacio bloqueada en el input de iniciales     | Ignorar eventos con foco en `input`/`textarea`                   |

---

## What is **not** in this spec

Velocidad creciente, niveles, orbes, viga colgante, puntuación completa y feedback visual (GJ-2), ranking/Supabase (GJ-3), controles táctiles, sonido, salto variable y skins.
