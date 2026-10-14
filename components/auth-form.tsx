"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("in");

  // ponytail: sin autenticación real (fuera de alcance del spec 01), solo navega
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.16em", marginTop: 6 }}>
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button type="button" className={tab === "in" ? "on" : ""} onClick={() => setTab("in")}>
            INICIAR SESIÓN
          </button>
          <button type="button" className={tab === "up" ? "on" : ""} onClick={() => setTab("up")}>
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="user">Usuario</label>
            <input id="user" name="user" placeholder="px_kai" />
          </div>
          {tab === "up" && (
            <div className="field slide-in">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" placeholder="jugador@vault.gg" />
            </div>
          )}
          <div className="field">
            <label htmlFor="pass">Contraseña</label>
            <input id="pass" name="pass" type="password" placeholder="••••••••" />
          </div>

          <button className="btn lg" type="submit" style={{ width: "100%", marginTop: 8 }}>
            {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        <Link href="/" className="btn ghost" style={{ width: "100%", marginTop: 10 }}>
          JUGAR COMO INVITADO
        </Link>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button">◆  GOOGLE</button>
          <button className="btn ghost" type="button">▣  GITHUB</button>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
