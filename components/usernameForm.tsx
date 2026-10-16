"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimUsername } from "@/app/login/actions";
import { USERNAME_RE } from "@/lib/auth";
export function UsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!USERNAME_RE.test(username))
      return setError("Usa 1–10 caracteres: A-Z, 0-9 o _.");
    setBusy(true);
    setError("");
    const res = await claimUsername(username);
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
          <h2 className="neon-cyan">ELIGE TU USERNAME</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            SERÁ TU NOMBRE EN EL SALÓN DE LA FAMA
          </div>
        </div>
        {error && (
          <div className="contact-error" role="alert">
            [ERROR] {error}
          </div>
        )}
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              value={username}
              maxLength={10}
              autoFocus
              autoComplete="username"
              autoCapitalize="characters"
              placeholder="PX_KAI"
              onChange={(e) => {
                setUsername(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                );
                setError("");
              }}
            />
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}
          >
            1–10 caracteres: A-Z, 0-9 y _. No se puede cambiar después.
          </div>
          <button
            className="btn lg"
            type="submit"
            disabled={busy}
            style={{ width: "100%" }}
          >
            {busy ? "GUARDANDO…" : "CONFIRMAR USERNAME"}
          </button>
        </form>
      </div>
    </div>
  );
}
