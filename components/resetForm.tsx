"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePassword } from "@/app/login/actions";
import { PASSWORD_HINT, passwordError } from "@/lib/auth";
export function ResetForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const pass = String(new FormData(e.currentTarget).get("pass") ?? "");
    const passErr = passwordError(pass);
    if (passErr) return setError(passErr);
    setBusy(true);
    setError("");
    const res = await updatePassword(pass);
    if (res.status === "error") {
      setBusy(false);
      return setError(res.message);
    }
    router.push("/");
    router.refresh();
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">NUEVA CONTRASEÑA</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            RECUPERAR ACCESO
          </div>
        </div>
        {error && (
          <div className="contact-error" role="alert">
            [ERROR] {error}
          </div>
        )}
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="pass">Nueva contraseña</label>
            <input
              id="pass"
              name="pass"
              type="password"
              autoFocus
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}
          >
            {PASSWORD_HINT}
          </div>
          <button
            className="btn lg"
            type="submit"
            disabled={busy}
            style={{ width: "100%" }}
          >
            {busy ? "GUARDANDO…" : "CAMBIAR CONTRASEÑA"}
          </button>
        </form>
      </div>
    </div>
  );
}
