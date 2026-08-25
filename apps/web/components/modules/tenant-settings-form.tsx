"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface Configuration { legal_name?:string; product_name?:string; branding?:{product_name?:string;primary_color?:string;secondary_color?:string;logo_path?:string}|null }

function configurationFrom(value:unknown):Configuration{
  if(typeof value!=="object"||value===null||!("data" in value)||typeof value.data!=="object"||value.data===null)return{};
  return value.data;
}

export function TenantSettingsForm(){
  const [configuration,setConfiguration]=useState<Configuration>({});
  const [message,setMessage]=useState("Carregando configurações…");
  const [pending,setPending]=useState(false);
  const base=(process.env.NEXT_PUBLIC_API_URL??"http://localhost:3333").replace(/\/$/,"");
  useEffect(()=>{void (async()=>{const {data:{session}}=await createBrowserSupabaseClient().auth.getSession();if(!session){setMessage("Sessão expirada.");return;}try{const response=await fetch(`${base}/v1/tenant/configuration`,{headers:{authorization:`Bearer ${session.access_token}`,"x-tenant-hostname":window.location.hostname}});if(!response.ok)throw new Error();const body:unknown=await response.json();setConfiguration(configurationFrom(body));setMessage("");}catch{setMessage("Não foi possível carregar as configurações.");}})();},[base]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);setMessage("");const form=new FormData(event.currentTarget);const payload:Record<string,string>={};for(const key of ["legal_name","product_name","logo_path","primary_color","secondary_color"]){const value=form.get(key);if(typeof value==="string"&&value.trim())payload[key]=value.trim();}try{const {data:{session}}=await createBrowserSupabaseClient().auth.getSession();if(!session)throw new Error("Sessão expirada.");const response=await fetch(`${base}/v1/tenant/configuration`,{method:"PATCH",headers:{authorization:`Bearer ${session.access_token}`,"content-type":"application/json","x-tenant-hostname":window.location.hostname},body:JSON.stringify(payload)});if(!response.ok){const body:unknown=await response.json();const detail=typeof body==="object"&&body!==null&&"error" in body&&typeof body.error==="object"&&body.error!==null&&"message" in body.error&&typeof body.error.message==="string"?body.error.message:"Não foi possível salvar.";throw new Error(detail);}setMessage("Configurações salvas. Recarregue a página para aplicar a marca.");}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível salvar.");}finally{setPending(false);}}
  const branding=configuration.branding;
  return <section className="settings-grid"><aside className="settings-menu"><button className="settings-menu__active" type="button">Identidade visual</button><button type="button" disabled>Módulos</button><button type="button" disabled>Alertas</button></aside><form className="panel settings-form" onSubmit={submit}><div><span className="panel__eyebrow">White-label</span><h2>Marca do tenant</h2><p>Nome, logotipo local e cores aplicados ao ambiente atual.</p></div><label>Razão social<input name="legal_name" defaultValue={configuration.legal_name??""} required /></label><label>Nome do produto<input name="product_name" defaultValue={branding?.product_name??configuration.product_name??""} required /></label><label>Caminho do logotipo<input name="logo_path" defaultValue={branding?.logo_path??""} placeholder="/brand/minha-logo.png" /></label><div className="form-grid"><label>Cor principal<input name="primary_color" type="color" defaultValue={branding?.primary_color??"#176b4d"} /></label><label>Cor secundária<input name="secondary_color" type="color" defaultValue={branding?.secondary_color??"#b8d925"} /></label></div>{message?<p className="message" role="status">{message}</p>:null}<div className="form-actions"><button type="submit" disabled={pending}>{pending?"Salvando…":"Salvar alterações"}</button></div></form></section>;
}
