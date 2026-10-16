export const USERNAME_RE = /^[A-Z0-9_]{1,10}$/;
export const PASSWORD_MIN = 8;
// Solo rutas internas: empieza por "/" y no por "//" ni "/\" (evita open redirect).
export const safeNext = (next: string | null | undefined) =>
  next && /^\/(?![/\\])/.test(next) ? next : "/";
export type AuthResult =
  | { status: "ok" }
  | { status: "needs_username" } // sesión creada pero sin perfil
  | { status: "error"; message: string };
export type SessionUser = { id: string; username: string | null }; // null = sin perfil
