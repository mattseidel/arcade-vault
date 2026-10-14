# SPEC 03 — Acerca de y formulario de contacto

> **Status:** Implemented
> **Depends on:** SPEC 01 (`components/nav.tsx`, estilos base en `app/globals.css`), SPEC 02 (`components/home/reveal.tsx`)
> **Date:** 2026-10-14
> **Objective:** Implementar la página "Acerca de" de `references/templates/home-about/about.jsx` en `/about`, con el formulario de contacto enviando el correo real a `matseiw@gmail.com` mediante Resend.

---

## Scope

**In:**

- Página `/about` idéntica al template: sección "Acerca de" (kicker, título, misión, 3 highlights con iconos pixel), divisor de píxeles animado y sección "Contacto" (intro con 3 tips + formulario).
- Formulario con campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶ ENVIAR MENSAJE", animación `shake` si faltan campos y terminal de éxito ("VAULT-OS // TERMINAL") con "ENVIAR OTRO MENSAJE".
- Envío real con Resend desde una Server Action (`"use server"`), con validación en el servidor.
- Protección anti-spam: campo honeypot oculto + límites de longitud y formato de email en el servidor.
- Estado de error: si Resend falla, el formulario conserva lo escrito y muestra un aviso estilo terminal (`[ERROR] No se pudo enviar el mensaje.`) con opción de reintentar. La terminal de éxito solo aparece si Resend confirma el envío.
- Correo enviado a `matseiw@gmail.com`, con `Reply-To` = correo del visitante y asunto `Contacto Arcade Vault: <nombre>`.
- Link "Acerca de" en el Nav (`/about`), activo solo en `/about`.
- Animación `reveal` en el divisor y la sección de contacto (reutiliza `components/home/reveal.tsx`).
- Estilos de `references/templates/home-about/styles.css` (`.about-*`, `.highlight*`, `.hl-*`, `.about-divider`, `.div-*`, `.contact-*`, `.tip*`, `.terminal-success`, `.term-*`, `.shake`) portados a `app/globals.css`, solo lo que no exista.
- Dependencia `resend` y variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`; archivo `.env.example` documentándolas.

**Out of scope (para specs futuras):**

- Guardar los mensajes en base de datos o historial.
- Rate limit por IP (requiere almacén externo).
- CAPTCHA (Turnstile, reCAPTCHA).
- Correo de confirmación/autorrespuesta al visitante.
- Dominio propio verificado en Resend (se usa el remitente `noreply@resend.dev`).
- Plantilla HTML del correo (se envía texto plano).
- Tests automatizados.

---

## Data model

```ts
// lib/contact.ts
export type ContactInput = { name: string; email: string; msg: string };

export type ContactState =
  | { status: "idle" }
  | { status: "sent"; name: string }
  | { status: "error"; message: string; values: ContactInput };

export const LIMITS = { name: 80, email: 120, msg: 2000 };
```

```ts
// app/about/actions.ts  ("use server")
export async function sendContact(prev: ContactState, form: FormData): Promise<ContactState>;
```

Campos del `FormData`: `name`, `email`, `msg` y `website` (honeypot; si llega con valor se responde `sent` sin enviar nada).

Variables de entorno (`.env.local`, no versionado):

```
RESEND_API_KEY=re_...
CONTACT_TO_EMAIL=matseiw@gmail.com
CONTACT_FROM_EMAIL=noreply@resend.dev
```

Convenciones:

- Validación en el servidor: los tres campos obligatorios tras `trim()`, email con formato válido, longitudes dentro de `LIMITS`.
- El mensaje del visitante se envía como texto plano (`text`), nunca como HTML, para evitar inyección.
- `name` se limpia de saltos de línea antes de ir al asunto.
- La API key nunca llega al cliente (sin prefijo `NEXT_PUBLIC_`).
- Textos de la UI en español, como el template.

---

## Implementation plan

> Antes del paso 1: leer `node_modules/next/dist/docs/` sobre Server Actions, formularios y `cacheComponents` según `AGENTS.md`. Usar el skill `/frontend-design` para la UI (ver `CLAUDE.md`).

1. Instalar `resend` (`npm i resend`) y crear `.env.example`; confirmar que `.env*.local` está en `.gitignore`. Verificar: `npm run lint` pasa.
2. Crear `lib/contact.ts` con tipos y `LIMITS`. Verificar: `npm run lint` pasa.
3. Portar a `app/globals.css` los estilos de About/Contacto, comparando antes con lo existente. Incluir `prefers-reduced-motion` para el divisor y `shake`. Verificar: la app compila sin errores de CSS.
4. Crear `app/about/actions.ts` con `sendContact`: honeypot, validación, envío con Resend (`from`, `to`, `replyTo`, `subject`, `text`), manejo de error. Verificar: `npm run lint` pasa.
5. Crear `components/about/highlight-icon.tsx` (server, los 3 iconos SVG del template) y `components/about/contact-form.tsx` (client, `useActionState`: campos controlados, `shake` si faltan campos antes de enviar, estados idle/pending/sent/error, terminal de éxito con "ENVIAR OTRO MENSAJE", honeypot oculto con `aria-hidden` y `tabIndex={-1}`). Verificar: lint pasa.
6. Crear `app/about/page.tsx` (server) componiendo hero, highlights, divisor y contacto con `Reveal`. Verificar: `/about` renderiza ambas secciones.
7. Añadir el link "Acerca de" al Nav (`components/nav.tsx`), activo en `/about`, también en el menú móvil. Verificar: el link navega a `/about` y los demás activos no cambian.
8. Prueba real: con `RESEND_API_KEY` en `.env.local`, enviar un mensaje desde `/about` y comprobar que llega a `matseiw@gmail.com` con Reply-To correcto. Probar también clave inválida y honeypot relleno.
9. Revisión responsive a ~375px y 1280px y capturas con Playwright en `.playwright-screenshots/`. Verificar: sin scroll horizontal, `contact-grid` colapsa a una columna.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/about` muestra el título "ACERCA DE ARCADE VAULT", el texto de misión y 3 highlights (corazón, navegador, planta) con los textos del template.
- [ ] `/about` muestra el divisor con 24 píxeles animados y la sección "CONTÁCTANOS" con 3 tips.
- [ ] Enviar el formulario con algún campo vacío no llama a Resend y aplica la animación `shake`.
- [ ] Enviar nombre, correo válido y mensaje con `RESEND_API_KEY` válida entrega un correo a `matseiw@gmail.com` con asunto `Contacto Arcade Vault: <nombre>` y el mensaje en el cuerpo.
- [ ] Al responder ese correo, el destinatario es el correo escrito por el visitante (Reply-To).
- [ ] Tras el envío exitoso aparece la terminal con "MENSAJE RECIBIDO… GRACIAS, <NOMBRE EN MAYÚSCULAS>."; "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [ ] Con una `RESEND_API_KEY` inválida aparece `[ERROR] No se pudo enviar el mensaje.`, los campos conservan lo escrito y no aparece la terminal de éxito.
- [ ] Un POST con el campo `website` relleno no envía correo y no muestra error.
- [ ] Un mensaje de más de 2000 caracteres o un correo con formato inválido es rechazado por el servidor (no por el navegador únicamente).
- [ ] Mientras se envía, el botón queda deshabilitado (sin doble envío).
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente ni en el HTML servido.
- [ ] El Nav muestra "Acerca de" activo solo en `/about`, también en el menú móvil.
- [ ] Con `prefers-reduced-motion: reduce` el divisor y las secciones son visibles sin animación.
- [ ] A 375px no hay scroll horizontal y el formulario ocupa una sola columna.
- [ ] No hay errores de hidratación ni warnings en la consola en `/about`.

---

## Decisions

- **Sí:** ruta `/about` (elegida por el usuario, coincide con el nombre del template) aunque el resto de rutas esté en español.
- **Sí:** Server Action. Sin endpoint público que mantener, la API key queda en el servidor y la validación es server-side.
- **No:** Route Handler `app/api/contacto`. Más código para el mismo resultado.
- **Sí:** destinatario fijo por variable de entorno `CONTACT_TO_EMAIL=matseiw@gmail.com`. Cambiarlo no requiere tocar código.
- **Sí:** remitente `noreply@resend.dev` por variable `CONTACT_FROM_EMAIL` (decisión del usuario). Sin dominio propio por ahora.
- **Sí:** `Reply-To` = correo del visitante. Responder desde Gmail contesta directo al visitante.
- **Sí:** honeypot + validación server-side. Sin dependencias ni estado.
- **No:** rate limit por IP ni CAPTCHA. Requieren infraestructura; otra spec si hay abuso.
- **Sí:** mostrar error y conservar lo escrito si Resend falla. Mostrar éxito falso perdería mensajes sin que el usuario lo sepa.
- **Sí:** correo en texto plano. Evita inyección HTML y no necesita plantilla.
- **No:** guardar mensajes en base de datos. El correo es el registro.
- **Sí:** reutilizar `components/home/reveal.tsx` en lugar de repetir el hook `useReveal` del template.
- **Sí:** el link "Acerca de" entra al Nav ahora (SPEC 02 lo dejó fuera hasta que la página existiera).

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `noreply@resend.dev` puede no ser aceptado como remitente de pruebas por Resend (la documentación usa `onboarding@resend.dev`) | Verificar en el paso 8; si Resend lo rechaza, cambiar solo `CONTACT_FROM_EMAIL=onboarding@resend.dev`. |
| Sin dominio verificado, Resend solo entrega al correo de la cuenta de Resend | `matseiw@gmail.com` debe ser el correo de la cuenta; si no, la entrega falla y se ve el estado de error (paso 8 lo detecta). |
| Bots que no rellenan el honeypot o spam manual | Aceptado para el MVP; escalar a CAPTCHA o rate limit en otra spec. |
| Secreto `RESEND_API_KEY` filtrado en el repo | `.env*.local` en `.gitignore`; solo `.env.example` sin valores reales se versiona. |
| `cacheComponents` afecta Server Actions y formularios en páginas estáticas | Leer la doc antes del paso 1; mantener `/about` como server component y el formulario como único client component. |
| Estilos del template chocan con los existentes en `globals.css` | Comparar antes de portar (paso 3); añadir solo lo faltante. |

---

## What is **not** in this spec

- Guardar mensajes en base de datos.
- Rate limit por IP o CAPTCHA.
- Autorrespuesta al visitante o correo HTML con plantilla.
- Dominio propio verificado en Resend.
- Tests automatizados.
