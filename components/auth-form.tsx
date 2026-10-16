"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  checkUsername,
  requestReset,
  signIn,
  signInWithOAuth,
  signUp,
} from "@/app/login/actions";
import { PASSWORD_MIN, USERNAME_RE, type AuthResult } from "@/lib/auth";
type Mode = "in" | "up" | "recover";
export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("in");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    params.get("error") === "auth"
      ? "No se pudo completar el acceso. Inténtalo de nuevo."
      : "",
  );
  const [sent, setSent] = useState(false);
  const [username, setUsername] = useState("");
  const [userHint, setUserHint] = useState("");
  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setSent(false);
    setUserHint("");
  };
  const finish = (res: AuthResult) => {
    if (res.status === "error") return setError(res.message);
    router.push(res.status === "needs_username" ? "/login/username" : "/");
    router.refresh();
  };
  const verifyUsername = async () => {
    if (!username) return setUserHint("");
    const res = await checkUsername(username);
    setUserHint(res.status === "error" ? res.message : "");
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    const pass = String(f.get("pass") ?? "");
    setError("");
    if (mode !== "in" && mode !== "up") {
      setBusy(true);
      const res = await requestReset(email);
      setBusy(false);
      return res.status === "error" ? setError(res.message) : setSent(true);
    }
    if (mode === "up") {
      if (!USERNAME_RE.test(username))
        return setError("Usa 1–10 caracteres: A-Z, 0-9 o _.");
      if (pass.length < PASSWORD_MIN)
        return setError(
          `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
        );
    }
    setBusy(true);
    const res =
      mode === "in"
        ? await signIn(email, pass)
        : await signUp(username, email, pass);
    setBusy(false);
    finish(res);
  };
  const oauth = async (provider: "google" | "github") => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await signInWithOAuth(provider); // en éxito redirige fuera de la página
    setBusy(false);
    if (res?.status === "error") setError(res.message);
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            {mode === "recover"
              ? "RECUPERAR ACCESO"
              : "ACCESO AL SISTEMA · v2.6"}
          </div>
        </div>
        {mode !== "recover" && (
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "in" ? "on" : ""}
              onClick={() => switchMode("in")}
            >
              INICIAR SESIÓN
            </button>
            <button
              type="button"
              className={mode === "up" ? "on" : ""}
              onClick={() => switchMode("up")}
            >
              CREAR CUENTA
            </button>
          </div>
        )}
        {error && (
          <div className="contact-error" role="alert">
            [ERROR] {error}
          </div>
        )}
        {sent ? (
          <div className="auth-sent" role="status">
            ▸ SI EL CORREO ESTÁ REGISTRADO, TE ENVIAMOS UN ENLACE PARA CAMBIAR
            LA CONTRASEÑA_
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            {mode === "up" && (
              <div className="field slide-in">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  value={username}
                  maxLength={10}
                  autoComplete="username"
                  autoCapitalize="characters"
                  placeholder="PX_KAI"
                  onChange={(e) => {
                    setUsername(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                    );
                    setUserHint("");
                  }}
                  onBlur={verifyUsername}
                />
                {userHint && <span className="field-hint">{userHint}</span>}
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jugador@vault.gg"
              />
            </div>
            {mode !== "recover" && (
              <div className="field">
                <label htmlFor="pass">Contraseña</label>
                <input
                  id="pass"
                  name="pass"
                  type="password"
                  autoComplete={
                    mode === "in" ? "current-password" : "new-password"
                  }
                  placeholder="••••••••"
                />
              </div>
            )}
            <button
              className="btn lg"
              type="submit"
              disabled={busy}
              style={{ width: "100%", marginTop: 8 }}
            >
              {busy
                ? "PROCESANDO…"
                : mode === "in"
                  ? "ENTRAR AL VAULT"
                  : mode === "up"
                    ? "CREAR Y JUGAR"
                    : "ENVIAR ENLACE"}
            </button>
          </form>
        )}
        {mode === "in" && (
          <button
            type="button"
            className="auth-link"
            onClick={() => switchMode("recover")}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {mode === "recover" && (
          <button
            type="button"
            className="auth-link"
            onClick={() => switchMode("in")}
          >
            ◂ Volver a iniciar sesión
          </button>
        )}
        {mode !== "recover" && (
          <>
            <Link
              href="/"
              className="btn ghost"
              style={{ width: "100%", marginTop: 10 }}
            >
              JUGAR COMO INVITADO
            </Link>
            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
              <button
                className="btn ghost"
                type="button"
                disabled={busy}
                onClick={() => oauth("google")}
              >
                ◆ GOOGLE
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={busy}
                onClick={() => oauth("github")}
              >
                ▣ GITHUB
              </button>
            </div>
          </>
        )}
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
