"use server";

import { Resend } from "resend";
import { LIMITS, type ContactInput, type ContactState } from "@/lib/contact";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message: string, values: ContactInput): ContactState {
  return { status: "error", message, values };
}

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const values: ContactInput = {
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
    msg: String(form.get("msg") ?? "").trim(),
  };

  // honeypot: un bot lo rellena; se responde "sent" sin enviar nada
  if (String(form.get("website") ?? "") !== "") return { status: "sent", name: values.name };

  if (!values.name || !values.email || !values.msg) return fail("Completa todos los campos.", values);
  if (!EMAIL_RE.test(values.email)) return fail("El correo electrónico no es válido.", values);
  if (
    values.name.length > LIMITS.name ||
    values.email.length > LIMITS.email ||
    values.msg.length > LIMITS.msg
  ) {
    return fail("Algún campo supera el largo permitido.", values);
  }

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error("[contact] faltan variables de entorno de Resend");
    return fail("No se pudo enviar el mensaje.", values);
  }

  try {
    const { error } = await new Resend(RESEND_API_KEY).emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: values.email,
      subject: `Contacto Arcade Vault: ${values.name.replace(/[\r\n]+/g, " ")}`,
      text: `De: ${values.name} <${values.email}>\n\n${values.msg}`,
    });
    if (error) {
      console.error("[contact] Resend:", error);
      return fail("No se pudo enviar el mensaje.", values);
    }
  } catch (e) {
    console.error("[contact] Resend:", e);
    return fail("No se pudo enviar el mensaje.", values);
  }

  return { status: "sent", name: values.name };
}
