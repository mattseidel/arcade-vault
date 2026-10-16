export const USERNAME_RE = /^[A-Z0-9_]{1,10}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_HINT =
  "Mínimo 8 caracteres, con minúscula, mayúscula, número y símbolo.";
// Símbolos = los mismos que acepta Supabase Auth (ver SPEC 12).
const PASSWORD_RULES: [RegExp, string][] = [
  [/[a-z]/, "una minúscula"],
  [/[A-Z]/, "una mayúscula"],
  [/[0-9]/, "un número"],
  [/[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/, "un carácter especial"],
];
/** Mensaje del primer requisito incumplido, o null si la contraseña es válida. */
export const passwordError = (pass: string) => {
  if (pass.length < PASSWORD_MIN)
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  const miss = PASSWORD_RULES.find(([re]) => !re.test(pass));
  return miss ? `La contraseña debe incluir ${miss[1]}.` : null;
};
// Solo rutas internas: empieza por "/" y no por "//" ni "/\" (evita open redirect).
export const safeNext = (next: string | null | undefined) =>
  next && /^\/(?![/\\])/.test(next) ? next : "/";
export type AuthResult =
  | { status: "ok" }
  | { status: "needs_username" } // sesión creada pero sin perfil
  | { status: "error"; message: string };
export type SessionUser = { id: string; username: string | null }; // null = sin perfil
