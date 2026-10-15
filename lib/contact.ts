export type ContactInput = { name: string; email: string; msg: string };

export type ContactState =
  | { status: "idle" }
  | { status: "sent"; name: string }
  | { status: "error"; message: string; values: ContactInput };

export const LIMITS = { name: 80, email: 120, msg: 2000 };
