"use client";

import { useRouter } from "next/navigation";
import { useState,type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function PasswordUpdateForm({invite=false}:{invite?:boolean}){
  const router=useRouter();const [pending,setPending]=useState(false);const [message,setMessage]=useState<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);setMessage(null);const form=new FormData(event.currentTarget);const password=form.get("password");const confirmation=form.get("confirmation");if(typeof password!=="string"||password.length<8){setPending(false);setMessage("A senha deve possuir pelo menos 8 caracteres.");return;}if(password!==confirmation){setPending(false);setMessage("As senhas não coincidem.");return;}const {error}=await createBrowserSupabaseClient().auth.updateUser({password});setPending(false);if(error){setMessage("Não foi possível definir a senha. Solicite um novo link.");return;}router.replace("/dashboard");router.refresh();}
  return <form onSubmit={submit}><label>Nova senha<input name="password" type="password" minLength={8} autoComplete="new-password" required/></label><label>Confirmar senha<input name="confirmation" type="password" minLength={8} autoComplete="new-password" required/></label>{message?<p className="message" role="alert">{message}</p>:null}<button type="submit" disabled={pending}>{pending?"Salvando…":invite?"Aceitar convite e entrar":"Atualizar senha"}</button></form>;
}
