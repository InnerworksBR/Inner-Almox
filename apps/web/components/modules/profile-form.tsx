"use client";

import { useEffect, useState, type FormEvent } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface Profile {
  full_name: string;
  phone: string;
  email: string;
}

function textValue(value: unknown, key: string): string {
  if (typeof value !== "object" || value === null || !(key in value)) return "";
  const field = value[key as keyof typeof value];
  return typeof field === "string" ? field : "";
}

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile>({ full_name: "", phone: "", email: "" });
  const [message, setMessage] = useState("Carregando perfil…");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setMessage("Sessão expirada. Entre novamente.");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        setMessage("Não foi possível carregar o perfil.");
        return;
      }
      const profileData: unknown = data;
      setProfile({
        full_name: textValue(profileData, "full_name"),
        phone: textValue(profileData, "phone"),
        email: user.email ?? ""
      });
      setMessage("");
    })();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sessão expirada. Entre novamente.");
      setPending(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name.trim(), phone: profile.phone.trim() || null })
      .eq("id", user.id);
    if (error) {
      setMessage("Não foi possível salvar o perfil.");
    } else {
      setMessage("Perfil salvo com sucesso.");
    }
    setPending(false);
  }

  return (
    <section className="settings-grid">
      <aside className="settings-menu">
        <button className="settings-menu__active" type="button">Dados pessoais</button>
        <button type="button" disabled>Preferências</button>
      </aside>
      <form className="panel settings-form" onSubmit={submit}>
        <div>
          <span className="panel__eyebrow">Minha conta</span>
          <h2>Perfil pessoal</h2>
          <p>Atualize os dados exibidos nas operações e comunicações do sistema.</p>
        </div>
        <label>Nome completo<input name="full_name" value={profile.full_name} onChange={(event) => setProfile((current) => ({ ...current, full_name: event.target.value }))} required minLength={2} /></label>
        <label>E-mail<input name="email" type="email" value={profile.email} readOnly /></label>
        <label>Telefone<input name="phone" type="tel" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} placeholder="(11) 00000-0000" /></label>
        {message ? <p className="message" role="status">{message}</p> : null}
        <div className="form-actions"><button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar alterações"}</button></div>
      </form>
    </section>
  );
}
