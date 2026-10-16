# SPEC GJ-2 — Salto Neón: velocidad, niveles, orbes y feedback

> **Status:** Implemented
> **Depends on:** SPEC GJ-1 (motor de Salto Neón), SPEC 04 (`GamePlayer`)
> **Date:** 2026-10-15
> **Objective:** Añadir a Salto Neón niveles por distancia con velocidad creciente, un obstáculo nuevo que obliga a no saltar, orbes de bonus y feedback visual, para que cada partida produzca una puntuación comparable.

---

## Scope

**In:**

- Niveles por distancia: **nivel = 1 + ⌊metros / 500⌋**. Velocidad de la pista `360 + 30 × (nivel − 1)` px/s, tope 720 px/s (nivel 13). El cambio de velocidad es inmediato al subir de nivel.
- Obstáculo nuevo **viga** colgante (120×180, de `y = 220` a `y = 400`): se pasa quedándose en el suelo; saltar debajo de ella mata. Aparece desde el nivel 3 con probabilidad 25 % por obstáculo (el 75 % restante se reparte igual entre pincho, pincho doble y bloque). Nunca dos vigas seguidas.
- Hueco previo a una viga: mínimo 1,2 s (en vez de 0,95 s), para que el jugador haya aterrizado antes de que llegue.
- Orbes: en cada hueco tras un obstáculo que no sea viga, 30 % de probabilidad de un orbe en el punto medio del hueco, centro a `y = 350` (130 px sobre el suelo, solo alcanzable saltando), radio 10 px. Recogerlo suma **+100**.
- Puntuación completa: **score = metros + 100 × orbes recogidos**. Sin vidas (decisión de GJ-1).
- Feedback visual (en el canvas):
  - Rotación del cubo de 180° durante cada salto (solo visual; la hitbox sigue alineada a los ejes).
  - Texto "+100" amarillo que sube 30 px y se desvanece en 500 ms al recoger un orbe.
  - Texto "NIVEL <n>" centrado en `y = 200`, cyan, visible 1000 ms al subir de nivel.
  - Fondo parallax: siluetas de edificios (rectángulos magenta al 25 % de opacidad, alturas 60–200 px) entre `y = 280` y el suelo, desplazándose al 25 % de la velocidad de la pista.
  - Choque: el cubo estalla en 16 partículas cyan durante 600 ms; la pista se detiene en el frame del choque.
- `onStats` emite `{ score, lives: 0, level }` con el nivel real.

**Out of scope (para specs futuras):** ranking y Supabase (SPEC GJ-3), sonido, controles táctiles, salto variable, power-ups (escudo, imán), vidas, combos de orbes, récord local en `localStorage`.

---

## Data model

```ts
// lib/games/saltoNeon/constants.ts (añadidos a GJ-1)
export const METERS_PER_LEVEL = 500;
export const SPEED_STEP = 30, // px/s por nivel
  MAX_SPEED = 720;
export const BEAM = { w: 120, top: 220, bottom: 400 } as const; // viga
export const BEAM_FROM_LEVEL = 3,
  BEAM_CHANCE = 0.25,
  BEAM_MIN_GAP_S = 1.2;
export const ORB_CHANCE = 0.3,
  ORB_Y = 350,
  ORB_R = 10,
  ORB_POINTS = 100;
export const LEVEL_TEXT_MS = 1000,
  ORB_TEXT_MS = 500,
  DEATH_MS = 600,
  DEATH_PARTICLES = 16;
export const PARALLAX_FACTOR = 0.25;
// lib/games/saltoNeon/types.ts (amplía GJ-1)
export type ObstacleKind = "spike" | "doubleSpike" | "block" | "beam";
export type Orb = { x: number; taken: boolean };
// lib/games/saltoNeon/engine.ts — misma firma que GJ-1
export function createSaltoNeon(
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
): GameEngine;
```

**Convenciones:** unidades en px, px/s y ms; `dt` con tope de 50 ms. La distancia se integra con la velocidad del nivel actual (`dist += speed·dt`); `metros = ⌊dist / 10⌋`. Los huecos siguen definidos en segundos × velocidad en el momento de generarlos. La viga colisiona con su rectángulo completo contra la hitbox del cubo (28×28); de pie, la parte superior de la hitbox está en `y = 446`, 46 px por debajo de la viga; en cualquier salto, la hitbox sube por encima de `y = 400` y la toca. El orbe colisiona círculo contra el rectángulo completo del cubo (40×40, más generoso que los obstáculos). `onStats` emite como máximo cada 100 ms si cambia el score, **inmediatamente** si cambia el nivel, y siempre el valor final antes de `onGameOver`. `onGameOver(score)` se llama **una sola vez**, al terminar la animación de choque de 600 ms (que se congela en PAUSA). Durante esa animación se ignora la entrada. `game_id = "salto-neon"`. El azar (tipo de obstáculo, hueco, orbe, alturas de edificios) vive solo dentro del motor.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/`. Todo el feedback se dibuja en el canvas con el estilo neón de GJ-1; no hay UI de plataforma nueva, así que no requiere `/frontend-design`.

0. Verificar que GJ-1 está implementada y que `/juegos/salto-neon/jugar` funciona.
1. Añadir las constantes y tipos nuevos y el estado (`dist`, `level`, `speed`, `orbs[]`, `orbsTaken`, `deathT`, `levelTextT`, textos flotantes, edificios). Verificar: lint pasa.
2. Implementar niveles y velocidad con tope; emitir `onStats` con el nivel. Verificar: `tsc` pasa; el HUD muestra NIVEL 02 a los 500 m.
3. Implementar la viga (probabilidad desde nivel 3, hueco previo de 1,2 s, nunca dos seguidas). Verificar: quedarse en el suelo la pasa; saltar debajo mata.
4. Implementar orbes y la fórmula de score completa. Verificar: recoger un orbe suma exactamente 100.
5. Implementar feedback: rotación, "+100", "NIVEL n", parallax y animación de choque con `onGameOver` diferido. Verificar: sin salto de tiempo tras pausa ni cambio de pestaña; `onGameOver` llega 600 ms después del choque.
6. Revisión con Playwright en `.playwright-screenshots/`: nivel 2, viga, orbe recogido, texto de nivel, choque, a 375px y 1280px. Verificar: sin errores en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] El nivel sube cada 500 m (nivel 2 a 500 m, nivel 3 a 1000 m) y el HUD lo muestra en cuanto cambia.
- [ ] La velocidad es 360 px/s en nivel 1, 390 en nivel 2, 660 en nivel 11 y queda en 720 desde el nivel 13.
- [ ] No aparece ninguna viga antes del nivel 3; nunca hay dos vigas seguidas; el hueco previo a una viga es ≥ 1,2 s.
- [ ] Quedarse en el suelo pasa la viga; saltar mientras está sobre el cubo termina la partida.
- [ ] Los orbes aparecen a 130 px sobre el suelo, nunca en el hueco que sigue a una viga; recoger uno suma 100 y muestra "+100" 500 ms.
- [ ] Score = metros + 100 × orbes (p. ej. 1.234 m y 3 orbes → 1.534).
- [ ] Al subir de nivel aparece "NIVEL <n>" 1000 ms; el cubo gira 180° en cada salto; el fondo se desplaza al 25 % de la velocidad de la pista.
- [ ] Al chocar, el cubo estalla en 16 partículas durante 600 ms y luego aparece "FIN DEL JUEGO"; `onGameOver(score)` se llama una sola vez con el total.
- [ ] PAUSA congela pista, animaciones y textos; REANUDAR continúa sin saltos; "JUGAR DE NUEVO" empieza de cero (nivel 1, 360 px/s, 0 puntos, sin orbes).
- [ ] No regresión: GJ-1 sigue válida y `rocas`, `caida`, `bloque-buster`, `serpentina` y los simulados se comportan como antes.
- [ ] Espacio/flechas/W no hacen scroll.
- [ ] Salir de la página detiene el loop y los listeners; sin errores de hidratación ni warnings (Strict Mode).

---

## Decisions

- **Nivel por distancia (500 m):** ≈ 14 s por nivel al principio, ≈ 7 s al tope; la curva se nota sin ser abrupta. Alternativa: nivel por tiempo, equivalente pero menos legible en el HUD.
- **Tope de 720 px/s:** a esa velocidad el vuelo cubre 540 px y el hueco mínimo 684 px; sigue siendo jugable. Alternativa: sin tope, partidas imposibles y ranking sin sentido.
- **Viga como segunda decisión:** con un solo botón, la única variedad posible es "saltar o no saltar"; la viga añade el "no". Alternativa: obstáculos más altos que exigen saltar antes, menos claros visualmente.
- **Orbes a 130 px:** obligan a saltar sin obstáculo, arriesgando caer encima del siguiente; premian riesgo. Alternativa: orbes en el suelo, puntos gratis.
- **+100 por orbe, 1 por metro:** un orbe vale 10 m; la distancia domina el ranking y los orbes desempatan. Alternativa: multiplicador por nivel, infla mucho las marcas altas.
- **Sin vidas:** mantiene el ritmo "un toque y fin" de GJ-1. Alternativa: escudo como power-up, en una spec futura.
- **`onGameOver` tras 600 ms:** la explosión se ve antes del modal. Alternativa: llamarlo en el frame del choque, el modal tapa el feedback.
- **`dt` máximo 50 ms:** a 720 px/s el avance por frame es ≤ 36 px, menor que los 46 px de solape cubo+pincho; no hay túnel.

---

## Risks

| Riesgo                                                      | Mitigación                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Strict Mode deja dos loops/listeners                        | `destroy()` cancela rAF y quita listeners                        |
| `Math.random`/`performance.now` rompen la hidratación       | El motor solo se crea en `useEffect`                             |
| Espacio/flechas hacen scroll o activan botones              | `preventDefault` solo jugando; blur del botón PAUSA              |
| Pestaña en segundo plano genera un `dt` enorme              | Tope de 50 ms + pausa en `visibilitychange`                      |
| Puntuación inventada vía RPC con la clave publishable       | Rango 1–10.000.000 en la BD (se aplica en GJ-3); límite MVP      |
| Viga justo tras un salto, imposible de evitar               | Hueco previo ≥ 1,2 s > 0,75 s de vuelo; nunca dos vigas seguidas |
| Orbe que obliga a saltar bajo una viga                      | Sin orbes en el hueco que sigue a una viga                       |
| `onGameOver` doble (choque + FIN o restart en la animación) | Bandera `ended` por partida; `restart()` la reinicia             |
| `onStats` cada frame provoca renders en `GamePlayer`        | Máximo cada 100 ms salvo cambio de nivel y valor final           |

---

## What is **not** in this spec

Ranking y Supabase (GJ-3), sonido, controles táctiles, salto variable, power-ups, vidas, combos de orbes y récord local.
