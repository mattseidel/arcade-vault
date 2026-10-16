# SPEC 10 — Registro, login y sesión con Supabase Auth

> **Status:** Approved
> **Depends on:** SPEC 01 (`app/login/page.tsx`, `components/auth-form.tsx`, `components/nav.tsx`), SPEC 05 (`utils/supabase/server.ts` y `client.ts`)
> **Date:** 2026-10-16
> **Objective:** Reemplazar el formulario de login simulado por autenticación real con Supabase Auth (correo + contraseña, Google, GitHub y recuperación de contraseña), un `username` único por jugador y la sesión visible en la barra de navegación.

---

## Scope

**In:**

- Pantalla `/login` (ya existe, solo estética) con tres modos: iniciar sesión (correo + contraseña), crear cuenta (username + correo + contraseña) y recuperar contraseña (correo).
- Botones **GOOGLE** y **GITHUB** funcionales (OAuth de Supabase), ambos con el mismo flujo de callback y de elección de `username`.
- Tabla `public.profiles` con el `username` del jugador: único sin distinguir mayúsculas, se elige una sola vez y no se puede cambiar.
- Página `/login/username` donde elige su `username` cualquier usuario con sesión que aún no tenga perfil (usuarios de Google, o registro cuyo username fue ocupado en una carrera).
- Ruta `/auth/callback` (Route Handler) que canjea el `code` de Supabase por sesión (OAuth y enlaces de correo) y redirige.
- Página `/auth/reset` para fijar la nueva contraseña tras abrir el enlace del correo.
- Cierre de sesión (Server Action `signOut`).
- Refresco de sesión por `proxy.ts` (Next 16 sustituye a `middleware`) con `@supabase/ssr`.
- Barra de navegación (`components/nav.tsx`, escritorio y panel móvil): sin sesión muestra "Iniciar Sesión"; con sesión muestra el `username` y "Salir"; con sesión sin perfil muestra "Elegir username".
- Botón "JUGAR COMO INVITADO" se mantiene (navega a `/`).
- Sin confirmación de correo: el registro deja la sesión iniciada.
- Contraseña: mínimo 8 caracteres, validada en cliente y servidor.
- Mensajes de error en español, genéricos donde exponer el detalle revelaría si un correo existe.
- Pasos manuales de configuración en Supabase y Google Cloud documentados en esta spec (ver "Configuración externa").

**Out of scope (para specs futuras):**

- Vincular puntuaciones a la cuenta, reservar nombres en el ranking y cambiar el guardado de `submit_score` (SPEC 11).
- Rutas protegidas o página de perfil (todo el sitio sigue siendo público).
- Confirmación de correo, cambio de correo, cambio de contraseña con sesión iniciada y eliminación de cuenta.
- Otros proveedores OAuth además de Google y GitHub; vincular varias identidades a una misma cuenta; magic link; MFA.
- Cambiar el `username` o avatar; perfil público.
- CAPTCHA, rate limit propio y SMTP personalizado.
- Tests automatizados.

---

## Data model

```sql
-- supabase/migrations/<timestamp>_create_profiles.sql
create table public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  username   text        not null check (username ~ '^[A-Z0-9_]{1,10}$'),
  created_at timestamptz not null default now()
);

create unique index profiles_username_key on public.profiles (username);

alter table public.profiles enable row level security;
create policy "profiles_select_public" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
-- sin políticas de update/delete: el username es inmutable
```

```ts
// lib/auth.ts (tipos y validación sin DOM ni next/headers; lo importan cliente y servidor)
export const USERNAME_RE = /^[A-Z0-9_]{1,10}$/;
export const PASSWORD_MIN = 8;

export type AuthResult =
  | { status: "ok" }
  | { status: "needs_username" } // sesión creada pero sin perfil
  | { status: "error"; message: string };

export type SessionUser = { id: string; username: string | null }; // null = sin perfil
```

Convenciones:

- `username` se normaliza con `trim().toUpperCase()` antes de validar y guardar; así `px_kai` y `PX_KAI` son el mismo (el índice único sobre el valor en mayúsculas cubre el "sin distinguir mayúsculas"). Mismo charset que el ranking de SPEC 05, sin espacios.
- El registro envía solo correo y contraseña a `supabase.auth.signUp`; el perfil se crea después con la Server Action `claimUsername` (inserta con la sesión del usuario, bajo la política `profiles_insert_own`). Un único camino para email y Google.
- Server Actions en `app/login/actions.ts`: `signIn`, `signUp`, `signInWithOAuth(provider: "google" | "github")`, `requestReset`, `updatePassword`, `claimUsername`, `checkUsername`, `signOut`. Todas validan en servidor; los errores devuelven `AuthResult`, no lanzan.
- Lectura de la sesión en servidor con `supabase.auth.getUser()` (no `getSession()`), vía `utils/supabase/server.ts`.
- Las rutas `/auth/callback` y `/auth/reset` reciben `?next=` solo con rutas internas (empieza por `/` y no por `//`).

---

## Configuración externa (pasos manuales previos, no son código)

1. Supabase → Authentication → Providers → Email: desactivar **Confirm email**.
2. Supabase → Authentication → URL Configuration: Site URL `http://localhost:3000` y Redirect URLs `http://localhost:3000/auth/callback` (añadir la URL de producción cuando exista).
3. Google Cloud Console → crear credenciales OAuth (Web), con redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`; copiar Client ID y Secret en Supabase → Providers → Google.
4. GitHub → Settings → Developer settings → OAuth Apps → New: Homepage `http://localhost:3000`, Authorization callback URL `https://<project-ref>.supabase.co/auth/v1/callback`; copiar Client ID y generar Client Secret en Supabase → Providers → GitHub.
5. Sin esos pasos 1–2 el registro/login por correo no es verificable; sin el 3 solo falla GOOGLE y sin el 4 solo falla GITHUB (el resto de la spec es verificable).

---

## Implementation plan

> Antes del paso 3: leer `node_modules/next/dist/docs/` sobre `proxy`, Route Handlers, Server Actions, `cacheComponents` y `redirect` según `AGENTS.md`. Leer la skill `supabase` (sección Auth / `@supabase/ssr`). Usar `/frontend-design` para los nuevos estados del formulario, `/login/username` y `/auth/reset`, respetando el estilo CRT/neón existente (ver `CLAUDE.md`). Archivos nuevos en camelCase.

1. Aplicar la migración con el MCP de Supabase (`apply_migration`, nombre `create_profiles`) y copiar el SQL a `supabase/migrations/<timestamp>_create_profiles.sql`. Verificar: `list_tables` muestra `profiles` con RLS; `get_advisors` (security) sin avisos nuevos.
2. Crear `lib/auth.ts` (constantes y tipos). Verificar: `npm run lint` y `tsc` pasan.
3. Crear `proxy.ts` en la raíz que refresca la sesión con `@supabase/ssr` (patrón `updateSession`, matcher que excluye estáticos). Verificar: `npm run dev` arranca y las páginas existentes cargan igual.
4. Crear `app/auth/callback/route.ts`: canjea `code` con `exchangeCodeForSession`; si el usuario no tiene perfil redirige a `/login/username`, si no a `next` (por defecto `/`); ante error redirige a `/login?error=auth`. Verificar: lint pasa.
5. Crear `app/login/actions.ts` con las ocho Server Actions descritas. `signUp` hace `signUp` + `claimUsername`; si el username ya existe devuelve `needs_username`. `signInWithOAuth` y `requestReset` usan `redirectTo` hacia `/auth/callback` (reset con `next=/auth/reset`). Verificar: lint pasa; `signIn` con credenciales inválidas devuelve `error` sin lanzar.
6. Reescribir `components/auth-form.tsx` con los tres modos (`in | up | recover`), campos nuevos (correo en inicio de sesión; username + correo + contraseña en registro), enlace "¿Olvidaste tu contraseña?", estados `idle | loading | error`, botón deshabilitado mientras envía, comprobación de username al salir del campo (`checkUsername`), y conectar los botones GOOGLE y GITHUB a `signInWithOAuth`. Verificar: crear cuenta real con correo deja sesión iniciada y fila en `profiles`.
7. Crear `app/login/username/page.tsx` (+ componente cliente de formulario) que llama a `claimUsername`; si no hay sesión redirige a `/login`, si ya hay perfil redirige a `/`. Verificar: un usuario sin perfil elige username y llega a `/`.
8. Crear `app/auth/reset/page.tsx` (+ formulario) que llama a `updatePassword`; sin sesión de recuperación redirige a `/login`. Verificar: flujo completo "olvidé contraseña" → correo → nueva contraseña → entrar con ella.
9. Mostrar la sesión en la nav: componente de servidor `components/navSession.tsx` (lee `getUser` + `profiles`) dentro de `<Suspense>` y entregado a `Nav` como slot (escritorio y panel móvil) porque `Nav` es cliente y `cookies()` es dinámico con `cacheComponents`. Incluye "Salir" (`signOut`). Verificar: sin sesión "Iniciar Sesión"; con sesión `username` + "Salir"; recargar mantiene la sesión.
10. Revisión con Playwright en `.playwright-screenshots/`: los tres modos de `/login`, errores, `/login/username`, `/auth/reset`, nav con y sin sesión, a ~375 px y 1280 px. Verificar: sin errores ni warnings de hidratación en consola.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La tabla `public.profiles` existe con RLS activa y `get_advisors` (security) no reporta avisos nuevos.
- [ ] Con la clave publishable, `update` y `delete` sobre `profiles` fallan; `insert` con un `id` distinto de `auth.uid()` falla.
- [ ] Crear una cuenta con `zed`, correo válido y contraseña de 8+ caracteres deja la sesión iniciada, crea `profiles.username = 'ZED'` y redirige a `/`.
- [ ] Registrar `Zed` o `zed` cuando `ZED` existe muestra "Ese username ya está en uso" y no crea cuenta nueva si se detecta antes (`checkUsername`); si la colisión ocurre en carrera, el usuario queda con sesión y es enviado a `/login/username`.
- [ ] Username fuera de `^[A-Z0-9_]{1,10}$` (espacios, tildes, más de 10) o contraseña de menos de 8 caracteres se rechaza en cliente y en servidor.
- [ ] Iniciar sesión con correo y contraseña correctos funciona; con credenciales erróneas muestra un mensaje genérico sin indicar si el correo existe.
- [ ] "JUGAR COMO INVITADO" sigue navegando a `/` sin sesión y todo el sitio sigue accesible sin iniciar sesión.
- [ ] Los botones GOOGLE y GITHUB inician el flujo OAuth y, al volver por `/auth/callback`, un usuario nuevo llega a `/login/username` y uno con perfil a `/` (verificable solo con la configuración externa 3 y 4 respectivamente).
- [ ] Desde `/login`, "¿Olvidaste tu contraseña?" envía el correo; el enlace abre `/auth/reset`, la nueva contraseña permite iniciar sesión y la anterior ya no.
- [ ] `/login/username` con perfil ya existente redirige a `/`; sin sesión redirige a `/login`. El `username` no se puede cambiar una vez creado.
- [ ] La nav (escritorio y panel móvil) muestra "Iniciar Sesión" sin sesión, el `username` y "Salir" con sesión, y "Elegir username" con sesión sin perfil.
- [ ] "Salir" cierra la sesión y la nav vuelve a "Iniciar Sesión" tras recargar.
- [ ] La sesión persiste al recargar la página y entre pestañas.
- [ ] `?next=` con URL externa o `//host` se ignora y se redirige a `/`.
- [ ] No hay errores de hidratación ni warnings en consola en `/login`, `/` y `/salon`.
- [ ] `.env.example` no incluye claves nuevas (solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`); ningún secreto de Google aparece en el repo.
- [ ] `submit_score`, `lib/scores-db.ts` y los motores de juego no se modificaron.

---

## Decisions

- **Sí:** correo + contraseña con `username` aparte. Supabase Auth identifica por correo; el username es el nombre público en el ranking.
- **No:** login por username con correo sintético. Rompe la recuperación de contraseña real, que sí se pidió.
- **Sí:** `username` único, en mayúsculas, inmutable, charset del ranking sin espacios. Evita sincronizar nombres ya escritos en `scores` (SPEC 11) y reutiliza la validación existente.
- **Sí:** perfil creado por Server Action `claimUsername` y no por trigger en `auth.users`. Un solo camino para correo y Google, y sin lógica oculta en la base; coste: puede existir un usuario sin perfil temporalmente, resuelto con `/login/username`.
- **No:** trigger `on auth.users insert`. Un username repetido haría fallar el registro con un error opaco de base de datos.
- **Sí:** Google OAuth incluido, con pasos manuales documentados. El usuario aún no tiene las credenciales; el resto se puede verificar sin ellas.
- **Sí:** GitHub OAuth incluido junto a Google (decisión posterior del usuario). Comparte `signInWithOAuth` y el mismo callback, así que el coste extra es solo configuración externa.
- **No:** vincular identidades. Si el mismo correo entra por Google y por GitHub, Supabase decide cómo se enlazan; gestionarlo explícitamente va en otra spec.
- **Sí:** sin confirmación de correo. Registro inmediato, coherente con un juego casual; se puede activar luego sin cambiar el modelo.
- **Sí:** nada protegido. El invitado sigue jugando; la sesión solo cambia la nav aquí. El efecto sobre el guardado de puntuaciones va en SPEC 11.
- **Sí:** `proxy.ts` para refrescar tokens y `getUser()` en servidor. `getSession()` no valida el JWT en servidor.
- **Sí:** contraseña mínima de 8 validada por la app, aunque Supabase permita 6 por defecto.
- **Sí:** Nav recibe la sesión como slot de servidor dentro de `Suspense`. `Nav` es cliente y leer `cookies()` es dinámico con `cacheComponents`.
- **No:** tocar `submit_score`, `scores` ni los juegos. Decisión del usuario: dividir en dos specs; la vinculación es SPEC 11.

---

## Risks

| Riesgo                                                                        | Mitigación                                                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "Confirm email" sigue activo en Supabase y el registro no deja sesión         | Paso manual 1; `signUp` detecta ausencia de sesión y muestra "Revisa tu correo" en lugar de fallar. |
| SMTP por defecto de Supabase limita los correos de recuperación (muy pocos/h) | Se acepta en desarrollo; SMTP propio queda fuera de alcance.                                        |
| Usuario con sesión pero sin perfil (cierra la pestaña antes de elegir)        | La nav muestra "Elegir username" y `/login` con sesión redirige a `/login/username`.                |
| Open redirect vía `?next=`                                                    | Solo se aceptan rutas que empiezan por `/` y no por `//`.                                           |
| Enumeración de cuentas por mensajes de error                                  | Mensajes genéricos en inicio de sesión y recuperación (siempre "si existe, enviamos un correo").    |
| `cookies()` en `Nav`/layout rompe el build con `cacheComponents`              | Lectura de sesión solo en `navSession.tsx` dentro de `Suspense`; leer la doc antes del paso 3.      |
| Callback OAuth falla por Redirect URL no registrada                           | Paso manual 2; `/auth/callback` redirige a `/login?error=auth` con mensaje visible.                 |

---

## What is **not** in this spec

- Vincular puntuaciones a usuarios o reservar nombres en el ranking (SPEC 11).
- Rutas protegidas, perfil, cambio de username/correo/contraseña con sesión, eliminar cuenta.
- Confirmación de correo, magic link, MFA y proveedores OAuth distintos de Google y GitHub.
- CAPTCHA, rate limit propio, SMTP personalizado.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propia spec.
