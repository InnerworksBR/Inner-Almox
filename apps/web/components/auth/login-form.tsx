"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm({next="/dashboard"}:{next?:string}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const emailValue = form.get("email");
    const passwordValue = form.get("password");
    if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
      setPending(false);
      setError("Dados de acesso inválidos.");
      return;
    }

    const { error: authError } = await createBrowserSupabaseClient().auth.signInWithPassword({
      email: emailValue,
      password: passwordValue
    });
    setPending(false);

    if (authError) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.replace(next.startsWith("/")&&!next.startsWith("//")?next:"/dashboard");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="login-field"><span>E-mail corporativo</span><div className="login-input"><span aria-hidden="true">@</span><input name="email" type="email" autoComplete="email" placeholder="nome@empresa.com" required /></div></label>
      <label className="login-field"><span>Senha</span><div className="login-input"><span aria-hidden="true">●</span><input name="password" type={showPassword?"text":"password"} autoComplete="current-password" placeholder="Digite sua senha" required /><button className="password-toggle" type="button" aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?"Ocultar":"Mostrar"}</button></div></label>
      <div className="login-form__options"><span>Use o acesso fornecido pela sua empresa.</span><Link href="/forgot-password">Esqueci minha senha</Link></div>
      {error ? <p className="message login-message" role="alert">{error}</p> : null}
      <button className="login-submit" type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar no Inner Almox"}</button>
    </form>
  );
}
