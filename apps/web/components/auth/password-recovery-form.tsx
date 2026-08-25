"use client";

import { useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const emailValue = form.get("email");
    if (typeof emailValue !== "string") {
      setPending(false);
      setMessage("Endereço de e-mail inválido.");
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`;
    await createBrowserSupabaseClient().auth.resetPasswordForEmail(emailValue, { redirectTo });
    setPending(false);
    setMessage("Se o endereço estiver cadastrado, enviaremos as instruções de recuperação.");
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
      {message ? <p aria-live="polite">{message}</p> : null}
      <button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar instruções"}</button>
    </form>
  );
}
