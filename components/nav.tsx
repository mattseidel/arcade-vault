"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const biblioteca = pathname === "/" || pathname.startsWith("/juegos");
  const salon = pathname.startsWith("/salon");
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
          <Link href="/" className={biblioteca ? "active" : ""}>Biblioteca</Link>
          <Link href="/salon" className={salon ? "active" : ""}>Salón de la Fama</Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        <Link href="/login" className="btn auth-btn">Iniciar Sesión</Link>
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">≡</button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <Link href="/" className={biblioteca ? "active" : ""} onClick={close}>Biblioteca</Link>
        <Link href="/salon" className={salon ? "active" : ""} onClick={close}>Salón de la Fama</Link>
        <Link href="/login" className={auth ? "active" : ""} onClick={close}>Iniciar Sesión</Link>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
