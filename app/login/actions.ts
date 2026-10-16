"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { PASSWORD_MIN, USERNAME_RE, type AuthResult } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const err = (message: string): AuthResult => ({ status: "error", message });
const GENERIC = "Algo salió mal. Inténtalo de nuevo.";
const TAKEN = "Ese username ya está en uso.";
const norm = (v: unknown) => String(v ?? "").trim();
const normUser = (v: unknown) => norm(v).toUpperCase();
async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
async function client() {
  return createClient(await cookies());
}
export async function checkUsername(username: string): Promise<AuthResult> {
  const name = normUser(username);
  if (!USERNAME_RE.test(name)) return err("Usa 1–10 caracteres: A-Z, 0-9 o _.");
  const supabase = await client();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", name)
    .maybeSingle();
  if (error) return err(GENERIC);
  return data ? err(TAKEN) : { status: "ok" };
}
export async function claimUsername(username: string): Promise<AuthResult> {
  const name = normUser(username);
  if (!USERNAME_RE.test(name)) return err("Usa 1–10 caracteres: A-Z, 0-9 o _.");
  const supabase = await client();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Inicia sesión para elegir tu username.");
  const { error } = await supabase
    .from("profiles")
    .insert({ id: user.id, username: name });
  if (error) return err(error.code === "23505" ? TAKEN : GENERIC);
  return { status: "ok" };
}
export async function signUp(
  username: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const name = normUser(username);
  const mail = norm(email);
  if (!USERNAME_RE.test(name)) return err("Usa 1–10 caracteres: A-Z, 0-9 o _.");
  if (!EMAIL_RE.test(mail)) return err("Correo no válido.");
  if (String(password ?? "").length < PASSWORD_MIN)
    return err(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
  const taken = await checkUsername(name);
  if (taken.status !== "ok") return taken;
  const supabase = await client();
  const { data, error } = await supabase.auth.signUp({ email: mail, password });
  if (error?.code === "email_address_invalid") return err("Correo no válido.");
  if (error?.code === "weak_password")
    return err("Contraseña demasiado débil.");
  // identities vacío = el correo ya existía (Supabase no lo delata con error)
  if (!error && data.user?.identities?.length === 0)
    return err(
      "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.",
    );
  if (error || !data.user) {
    console.error("signUp:", error?.code, error?.message);
    return err(
      `No se pudo crear la cuenta (${error?.code ?? "sin respuesta"}).`,
    );
  }
  if (!data.session) return err("Revisa tu correo para confirmar tu cuenta.");
  // Carrera: otro usuario pudo tomar el username entre la comprobación y el insert
  const claimed = await claimUsername(name);
  return claimed.status === "ok" ? claimed : { status: "needs_username" };
}
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const mail = norm(email);
  if (!EMAIL_RE.test(mail) || !password)
    return err("Correo o contraseña incorrectos.");
  const supabase = await client();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: mail,
    password,
  });
  if (error || !data.user) return err("Correo o contraseña incorrectos.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  return profile ? { status: "ok" } : { status: "needs_username" };
}
export async function signInWithOAuth(
  provider: "google" | "github",
): Promise<AuthResult> {
  if (provider !== "google" && provider !== "github") return err(GENERIC);
  const supabase = await client();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await origin()}/auth/callback` },
  });
  if (error || !data.url) return err("No se pudo iniciar el acceso externo.");
  redirect(data.url);
}
export async function requestReset(email: string): Promise<AuthResult> {
  const mail = norm(email);
  if (!EMAIL_RE.test(mail)) return err("Correo no válido.");
  const supabase = await client();
  await supabase.auth.resetPasswordForEmail(mail, {
    redirectTo: `${await origin()}/auth/callback?next=/auth/reset`,
  });
  // Siempre ok: no revela si el correo existe
  return { status: "ok" };
}
export async function updatePassword(password: string): Promise<AuthResult> {
  if (String(password ?? "").length < PASSWORD_MIN)
    return err(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
  const supabase = await client();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("El enlace caducó. Solicita uno nuevo.");
  const { error } = await supabase.auth.updateUser({ password });
  return error ? err("No se pudo cambiar la contraseña.") : { status: "ok" };
}
export async function signOut() {
  const supabase = await client();
  await supabase.auth.signOut();
  redirect("/");
}
