# SPEC 09 — Gamepad táctil para móviles

> **Status:** Approved
> **Depends on:** SPEC 04 (`GamePlayer`), SPEC 06 (registro de juegos)
> **Date:** 2026-10-16
> **Objective:** Mostrar bajo el canvas, solo en dispositivos táctiles, un gamepad en pantalla cuyos botones emiten teclas sintéticas para que los juegos se puedan jugar sin teclado.

---

## Scope

**In:**

- Componente `components/gamepad.tsx` renderizado por `GamePlayer` justo debajo del marco CRT del canvas.
- Visible solo con `@media (pointer: coarse)` (CSS puro, sin JS de detección ni riesgo de hidratación); oculto en escritorio.
- Los botones disparan `KeyboardEvent` (`keydown` al presionar, `keyup` al soltar) con `code` en `window`. **No se modifica ningún motor de juego.**
- Layout por juego, declarado en el registro (`pad` en cada entrada de `REAL_GAMES`). **El implementador infiere los botones de cada juego leyendo sus controles actuales (teclas que lee su motor y avisos/ayudas de controles existentes); esta spec no los enumera.** Cada juego muestra solo los botones que usa.
- Juegos sin motor real (simulados): gamepad genérico (cruceta de 4 direcciones + botones A/B) que emite las teclas pero **sin efecto**, porque la simulación no las lee.
- Eliminar el aviso `REQUIERE TECLADO` y su CSS (`.keyboard-notice` y su `@media`), que deja de ser cierto.
- Pausa y reinicio siguen en el HUD/overlays actuales de `GamePlayer`; el gamepad no tiene botón de pausa.
- Botones mantenidos: pointer events (`pointerdown`/`pointerup`/`pointercancel`/`pointerleave`), `touch-action: none`, sin selección de texto ni menú contextual, `preventDefault` para evitar scroll/zoom.

**Out of scope (para specs futuras):**

- Swipe o gestos sobre el canvas.
- Vibración háptica, sonido de botones.
- Soporte de la Gamepad API (mandos Bluetooth/USB).
- Gamepad personalizable (posición, tamaño, zurdos).
- Layout específico para orientación horizontal (solo debe no romperse).
- Cambiar los controles o la jugabilidad de cualquier juego.
- Detección por ancho de pantalla o `userAgent`.

---

## Data model

```ts
// lib/games/pads.ts (tipos y layout genérico; sin DOM)
export type PadButton = {
  code: string; // KeyboardEvent.code que se emite (p. ej. "ArrowLeft", "Space")
  label: string; // texto/glifo visible
  area: "dpad" | "action"; // izquierda (cruceta) o derecha (acciones)
  pos?: "up" | "down" | "left" | "right"; // posición dentro de la cruceta
};
export type PadLayout = PadButton[];
export const GENERIC_PAD: PadLayout; // cruceta 4 dirs + A + B
// components/games/registry.ts → RealGame gana: pad: PadLayout
```

Convenciones: un botón mantenido emite un solo `keydown` (sin `repeat`) y un `keyup` al soltar, o al ocurrir `pointercancel`/`pointerleave`/`blur` de ventana y al desmontar (nunca queda una tecla "atascada"). Los eventos se crean con `new KeyboardEvent(type, { code, key, bubbles: true })` y se despachan en `window`. Los motores ya ignoran la entrada en pausa o fin de partida; no hay estado nuevo en ningún motor.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` (Client Components). Usar `/frontend-design` para el aspecto del gamepad (estilo CRT neón del sitio) y consultar `references/templates/` por si hay mockup.

1. Crear `lib/games/pads.ts` con `PadButton`, `PadLayout` y `GENERIC_PAD`. Verificar: `npm run lint` y `tsc` pasan.
2. Inventariar los controles de cada entrada de `REAL_GAMES` (teclas que lee su motor) y añadir `pad` a `RealGame` con el layout de cada una. Verificar: `tsc` pasa y cada layout solo usa teclas que el motor correspondiente realmente lee.
3. Crear `components/gamepad.tsx` (Client Component) con la emisión `keydown`/`keyup` y la limpieza de teclas pulsadas al desmontar/`blur`; sin estilos aún. Verificar: renderizado temporal, los botones disparan eventos (consola).
4. Estilos en `app/globals.css`: `.gamepad { display: none }` y dentro de `@media (pointer: coarse)` `display: grid`; cruceta a la izquierda, acciones a la derecha, botones mínimo 56 px, `touch-action: none`, `user-select: none`. Verificar: a 375 px no hay scroll horizontal y los botones se alcanzan con los pulgares.
5. Integrar en `components/game-player.tsx`: renderizar `<Gamepad layout={real ? real.pad : GENERIC_PAD} />` bajo el marco; quitar `REQUIERE TECLADO` y `.keyboard-notice`. Verificar: en escritorio no cambia nada; con emulación táctil aparece el gamepad en todo juego real y en uno simulado.
6. Revisión con Playwright (emulación móvil, `hasTouch`) en `.playwright-screenshots/`: gamepad de cada juego real, uno simulado, y escritorio sin gamepad. Verificar: sin errores en consola ni warnings de Strict Mode.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Con `pointer: coarse` aparece el gamepad debajo del canvas en `/juegos/<id>/jugar`; con `pointer: fine` (escritorio) está oculto (`display: none`).
- [ ] El texto `REQUIERE TECLADO` ya no aparece en ningún dispositivo.
- [ ] En cada juego real, cada botón del gamepad produce el mismo efecto que la tecla que emite en escritorio.
- [ ] Cada juego real expone todas las acciones de su teclado necesarias para jugar una partida completa (sin teclado).
- [ ] Los botones mantenidos actúan mientras se mantienen y cesan al soltar.
- [ ] Los juegos simulados muestran el gamepad genérico y no producen errores.
- [ ] Soltar el dedo fuera del botón, o `pointercancel`, emite el `keyup` (la tecla no se queda atascada).
- [ ] Pulsar botones no hace scroll, zoom ni selecciona texto; el input de iniciales del modal sigue funcionando con teclado virtual.
- [ ] A 375 px de ancho no hay scroll horizontal y cada botón mide ≥ 48 px.
- [ ] No se modificó ningún archivo dentro de `lib/games/<juego>/`.
- [ ] No regresión en escritorio: teclado, HUD, pausa y modal de puntuación funcionan como antes.
- [ ] Salir de la página no deja teclas pulsadas ni listeners (Strict Mode).

---

## Decisions

- **Sí:** teclas sintéticas en `window`. Los motores ya leen `e.code`; cero cambios en ellos y funciona con juegos futuros que usen teclado.
- **No:** añadir `input(action, down)` al contrato `GameEngine`. Obligaría a tocar todos los motores; se puede revisar si las teclas sintéticas dan problemas.
- **Sí:** detección con CSS `@media (pointer: coarse)`. Sin JS ni hidratación; el repo ya usa ese media query. Un portátil con táctil + ratón principal no lo verá, es aceptable.
- **No:** detección por ancho o `userAgent`. Un escritorio estrecho vería el gamepad; el `userAgent` es frágil.
- **Sí:** layout por juego en el registro (`pad`), inferido por el implementador desde los controles existentes. Decisión del usuario: la spec no nombra juegos ni botones concretos.
- **Sí:** gamepad genérico (sin efecto) en juegos simulados. Decisión del usuario, por consistencia visual; si resulta confuso, ocultarlo allí en otra spec.
- **Sí:** pausa y reinicio se quedan en el HUD. Evita duplicar controles y botones fáciles de tocar por error.
- **Sí:** eliminar `REQUIERE TECLADO`. Pasa a ser falso al existir gamepad.

---

## Risks

| Riesgo                                                                             | Mitigación                                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Tecla atascada si el dedo sale del botón o llega una llamada/notificación          | `pointercancel`, `pointerleave` y `blur` emiten `keyup`; limpieza al desmontar |
| Un motor ignora eventos sintéticos (`isTrusted`)                                   | Verificar en el paso 3 que ningún motor lo comprueba                           |
| Layout inferido omite una acción necesaria                                         | Paso 2 exige contrastar con las teclas que lee cada motor                      |
| El gamepad empuja el canvas fuera de la vista en pantallas bajas                   | Verificar a 375×667 y en horizontal sin romper (sin layout dedicado)           |
| `preventDefault` en `pointerdown` bloquea el foco del input de iniciales del modal | `preventDefault` solo sobre los botones del gamepad; verificar el foco         |
| Doble toque rápido en iOS provoca zoom                                             | `touch-action: none` en el gamepad                                             |

---

## What is **not** in this spec

- Swipe/gestos sobre el canvas, háptica y sonido.
- Gamepad API (mandos físicos) y gamepad configurable.
- Layout dedicado de orientación horizontal.
- Cambios en motores, controles o jugabilidad de los juegos.
- Detección de móvil por ancho o `userAgent`.
