"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/login/actions";
import type { SessionUser } from "@/lib/auth";

export function Nav({ user = null }: { user?: SessionUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const inicio = pathname === "/";
  const biblioteca = pathname.startsWith("/biblioteca") || pathname.startsWith("/juegos");
  const salon = pathname.startsWith("/salon");
  const about = pathname.startsWith("/about");
  const auth = pathname.startsWith("/login");
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={inicio ? "active" : ""}>Inicio</Link>
          <Link href="/biblioteca" className={biblioteca ? "active" : ""}>Biblioteca</Link>
          <Link href="/salon" className={salon ? "active" : ""}>Salón de la Fama</Link>
          <Link href="/about" className={about ? "active" : ""}>Acerca de</Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <div className="auth-btn auth-session">
            {user.username ? (
              <span className="auth-user">{user.username}</span>
            ) : (
              <Link href="/login/username" className="btn">Elegir username</Link>
            )}
            <form action={signOut}>
              <button className="btn ghost" type="submit">Salir</button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="btn auth-btn">Iniciar Sesión</Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">≡</button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <Link href="/" className={inicio ? "active" : ""} onClick={close}>Inicio</Link>
        <Link href="/biblioteca" className={biblioteca ? "active" : ""} onClick={close}>Biblioteca</Link>
        <Link href="/salon" className={salon ? "active" : ""} onClick={close}>Salón de la Fama</Link>
        <Link href="/about" className={about ? "active" : ""} onClick={close}>Acerca de</Link>
        {user ? (
          <>
            {user.username ? (
              <span className="auth-user">{user.username}</span>
            ) : (
              <Link href="/login/username" onClick={close}>Elegir username</Link>
            )}
            <form action={signOut}>
              <button className="auth-link" type="submit">Salir</button>
            </form>
          </>
        ) : (
          <Link href="/login" className={auth ? "active" : ""} onClick={close}>Iniciar Sesión</Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
