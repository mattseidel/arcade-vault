# SPEC 12 — Medidas de seguridad básicas

> **Status:** Accepted
> **Depends on:** SPEC 05 (`scores`), SPEC 10 (`profiles`, Auth, `PASSWORD_MIN`), SPEC 11 (`submit_score(text, integer)`)
> **Date:** 2026-10-16
> **Objective:** Cerrar el checklist de `specs/security/security-checklist.md`: RLS verificado y versionado, política de contraseñas y signups reforzada en Supabase Auth, headers de seguridad en Next.js y los avisos del linter de Supabase resueltos o documentados.

---

## Scope

**In:**

- **RLS:** verificar que `scores`, `profiles` y `hello` tienen RLS activo y dejarlo versionado con una migración idempotente (`enable row level security`). No existe tabla `games` (el catálogo es estático en `lib/games.ts`); no se crea.
- **Política de contraseña:** mínimo 8 caracteres y al menos una minúscula, una mayúscula, un número y un carácter especial.
  - Panel de Supabase (manual): Auth → Sign In / Providers → Email → Minimum password length = 8 y Password requirements = "Lowercase, uppercase letters, digits and symbols".
  - App: una única función `passwordError(pass)` en `lib/auth.ts` (junto a `PASSWORD_MIN`) que devuelve el mensaje en español del primer requisito incumplido o `null`; sustituye las comprobaciones de longitud actuales en `components/auth-form.tsx`, `components/resetForm.tsx` (texto de ayuda incluido) y los dos sitios de `app/login/actions.ts`. Se usa en cliente y servidor.
  - "Carácter especial" = uno de ``!@#$%^&*()_+-=[]{};':"|<>?,./`~\``, el mismo conjunto que acepta Supabase, para que app y panel no discrepen.
- **Leaked password protection:** el proyecto está en plan Free, donde no está disponible. Queda documentado como pendiente (se activa al pasar a Pro); no se bloquea la spec por ello.
- **Límite de signups por IP:** ajuste manual en el panel (Auth → Rate Limits → "Rate limit for sign-ups and sign-ins") con un valor explícito, anotado en la spec.
- **Headers de seguridad** en `next.config.ts` (`headers()` para `/(.*)`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains` y `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **Aviso `authenticated_security_definer_function_executable`** sobre `submit_score`: se acepta como falso positivo intencional y se documenta aquí (ver Decisions).
- Re-ejecutar `get_advisors` (security) al final; el único aviso restante permitido es el de `submit_score` (más leaked password protection mientras sea Free).

**Out of scope (para specs futuras):**

- `Content-Security-Policy` (requiere nonces/`proxy.ts` y pruebas extensas con `cacheComponents`, juegos y Supabase).
- Crear una tabla `games` en base de datos.
- CAPTCHA, rate limit propio en aplicación, anti-trampas en puntuaciones, MFA.
- Pasar el proyecto a plan Pro.
- Tests automatizados.

---

## Data model

No introduce datos nuevos. Solo una migración defensiva:

```sql
-- supabase/migrations/<timestamp>_enableRls.sql  (idempotente)
alter table public.scores   enable row level security;
alter table public.profiles enable row level security;
alter table public.hello    enable row level security;
```

Headers (estructura, sin lógica nueva):

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];
// headers: async () => [{ source: "/(.*)", headers: securityHeaders }]
```

---

## Implementation plan

> Antes del paso 2: leer `node_modules/next/dist/docs/` (config `headers`) por las diferencias de esta versión de Next.

1. **RLS.** Con `list_tables` confirmar `rls_enabled = true` en las tres tablas; aplicar la migración `enableRls` (`apply_migration`) y copiar el SQL a `supabase/migrations/`. Verificar: `list_tables` sigue mostrando RLS activo y `/salon` sigue leyendo `scores` con la clave publishable.
2. **Headers.** Añadir `securityHeaders` y `headers()` a `next.config.ts`. Verificar: `npm run build` pasa; `curl -I http://localhost:3000/` (dev o `npm start`) devuelve los cinco headers; login, OAuth, juegos y `/salon` siguen funcionando.
3. **Política de contraseña en la app.** Añadir `passwordError` a `lib/auth.ts` y usarla en `auth-form.tsx`, `resetForm.tsx` y `app/login/actions.ts` (registro y restablecimiento); actualizar el texto de ayuda de `resetForm.tsx` y del formulario de registro con los requisitos. Verificar: `npm run lint` y `tsc` pasan; `Abcdefg1` (sin especial), `abcdefg1!` (sin mayúscula), `ABCDEFG1!` (sin minúscula), `Abcdefgh!` (sin número) y `Ab1!` (corta) se rechazan en cliente y en servidor; `Abcdef1!` se acepta.
4. **Auth en el panel de Supabase (manual, lo hace el usuario).** Fijar longitud mínima en 8, requisitos de contraseña (minúscula, mayúscula, número, símbolo) y un límite explícito de signups/sign-ins por IP (valor anotado en esta spec al hacerlo). Verificar: registrarse directamente contra la API de Auth (`/auth/v1/signup` con la clave publishable) con una contraseña de 7 caracteres o sin alguno de los cuatro tipos es rechazado.
5. **Leaked password protection.** Dejar registrado en esta spec que queda pendiente por plan Free; no hay cambios de código.
6. **Linter.** Ejecutar `get_advisors` (security). Verificar: solo aparecen el aviso aceptado de `submit_score` y el de leaked password protection.

---

## Acceptance criteria

- [ ] `scores`, `profiles` y `hello` tienen `rls_enabled = true` y existe la migración `enableRls` en `supabase/migrations/`.
- [ ] Con la clave publishable, `select` sobre `scores` funciona y `insert`/`update`/`delete` directos sobre `scores` y `profiles` ajenos fallan.
- [ ] Una respuesta de cualquier página incluye los cinco headers de seguridad con los valores indicados.
- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Login con correo, OAuth, guardado de puntuación y `/salon` siguen funcionando con los headers activos; sin errores nuevos en consola.
- [ ] Registro y restablecimiento rechazan, en cliente y en servidor, contraseñas con menos de 8 caracteres o sin minúscula, mayúscula, número o carácter especial, con un mensaje en español que indica el requisito faltante; `Abcdef1!` se acepta.
- [ ] Un registro directo contra la API de Auth con contraseña de 7 caracteres o sin alguno de los cuatro tipos es rechazado; una que cumple todo se acepta.
- [ ] Existe una sola implementación de la regla (`passwordError` en `lib/auth.ts`); no quedan comprobaciones `pass.length < PASSWORD_MIN` sueltas.
- [ ] El panel de Supabase muestra longitud mínima = 8, requisitos de contraseña activados y el límite de signups por IP configurado con el valor anotado en esta spec.
- [ ] `get_advisors` (security) no muestra avisos distintos del de `submit_score` (aceptado) y leaked password protection (pendiente por plan Free).

---

## Decisions

- **Sí:** no crear la tabla `games`. El checklist la nombra pero el catálogo es estático; crearla sería otra spec sin necesidad actual.
- **Sí:** migración `enableRls` idempotente aunque RLS ya esté activo. Deja el estado versionado y reproducible en otros entornos.
- **Sí:** aceptar el aviso de `submit_score` accesible por `authenticated`. Necesita `security definer` para escribir en `scores` sin políticas de escritura; valida `auth.uid()`, juego permitido y rango, y `anon` no puede ejecutarla.
- **No:** pasar a `security invoker` con políticas de INSERT/UPDATE. Abriría escritura directa sobre `scores` y rompería el diseño de SPEC 11.
- **Sí:** leaked password protection queda pendiente (plan Free). Se activa al pasar a Pro; la validación de 8 caracteres de la app y del panel cubre mientras tanto lo mínimo.
- **Sí:** añadir HSTS y `Permissions-Policy` a los tres headers del checklist. Cambio pequeño y de bajo riesgo.
- **No:** CSP en esta spec. Con `cacheComponents` y los scripts inline de Next exigiría nonces y puede romper juegos o Supabase.
- **Sí:** reglas de complejidad (minúscula, mayúscula, número, especial) en app y panel. Decisión del usuario; el panel es la barrera real y la app da el mensaje claro antes de llamar a la API.
- **Sí:** una sola función `passwordError` compartida por los cuatro puntos de validación. Evita que cliente, servidor y restablecimiento discrepen.
- **Sí:** conjunto de especiales igual al de Supabase. Un conjunto más amplio en la app dejaría pasar contraseñas que el panel rechaza con un error genérico.
- **Sí:** los ajustes de Auth son manuales en el panel; la MCP de Supabase no los cambia. La spec fija los valores y cómo verificarlos.

---

## Risks

| Riesgo                                                                        | Mitigación                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `X-Frame-Options: DENY` rompe alguna vista embebida (previews, iframes)       | El sitio no se embebe; verificar juegos y `/salon` tras el cambio.                   |
| HSTS en dominios de desarrollo/previews queda cacheado por el navegador       | Solo se aplica por HTTPS; en `localhost` por HTTP el navegador lo ignora.            |
| Límite de signups por IP demasiado bajo bloquea usuarios tras NAT compartida  | Valor moderado, anotado en la spec y ajustable desde el panel.                       |
| Sin leaked password protection se aceptan contraseñas filtradas               | Pendiente documentado hasta pasar a Pro; mínimo de 8 caracteres en app y panel.      |
| Política del panel distinta de la de la app (longitud o conjunto de símbolos) | Criterios de aceptación comprueban ambos lados con las mismas contraseñas de prueba. |
| Usuarios existentes con contraseñas que no cumplen la nueva política          | No se invalidan; la regla aplica solo al registrar y al restablecer.                 |
| La sintaxis de `headers()` difiere en esta versión de Next                    | Leer la documentación en `node_modules/next/dist/docs/` antes del paso 2.            |

---

## What is **not** in this spec

- CSP, CAPTCHA, rate limit propio, MFA o anti-trampas.
- Tabla `games` en base de datos.
- Cambio de plan de Supabase.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propia spec.
