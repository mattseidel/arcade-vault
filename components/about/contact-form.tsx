"use client";

import { useActionState, useState } from "react";
import { sendContact } from "@/app/about/actions";
import { LIMITS, type ContactInput, type ContactState } from "@/lib/contact";

const EMPTY: ContactInput = { name: "", email: "", msg: "" };
const IDLE: ContactState = { status: "idle" };

// "ENVIAR OTRO MENSAJE" remonta el formulario (key) para reiniciar useActionState
export function ContactForm() {
  const [round, setRound] = useState(0);
  return <Form key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function Form({ onAgain }: { onAgain: () => void }) {
  const [state, action, pending] = useActionState(sendContact, IDLE);
  const [form, setForm] = useState<ContactInput>(EMPTY);
  const [shake, setShake] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      e.preventDefault();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} action={action} onSubmit={onSubmit} noValidate>
      {state.status !== "sent" ? (
        <>
          {state.status === "error" && (
            <div className="contact-error" role="alert">
              [ERROR] {state.message} Inténtalo de nuevo.
            </div>
          )}
          <div className="hp" aria-hidden="true">
            <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <div className="field">
            <label htmlFor="c-name">NOMBRE</label>
            <input id="c-name" name="name" value={form.name} maxLength={LIMITS.name} placeholder="px_kai"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="c-email">CORREO ELECTRÓNICO</label>
            <input id="c-email" name="email" type="email" value={form.email} maxLength={LIMITS.email} placeholder="jugador@vault.gg"
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="c-msg">MENSAJE</label>
            <textarea id="c-msg" name="msg" rows={5} value={form.msg} maxLength={LIMITS.msg} placeholder="Cuéntanos qué tienes en mente…"
              onChange={(e) => setForm({ ...form, msg: e.target.value })} />
          </div>
          <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={pending}>
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">&gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.<span className="caret">_</span></div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onAgain}>ENVIAR OTRO MENSAJE</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
