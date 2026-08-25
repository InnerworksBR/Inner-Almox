import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand/brand-logo";
import { fetchTenantRecord } from "@/lib/api/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function text(record:Record<string,unknown>,key:string){const value=record[key];return typeof value==="string"||typeof value==="number"?String(value):"—"}

export default async function AssetQrPage({params}:{params:Promise<{token:string}>}){
  const supabase=await createServerSupabaseClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/login?next=/q/${encodeURIComponent((await params).token)}`);
  const{token}=await params;const asset=await fetchTenantRecord(`assets/qr/${encodeURIComponent(token)}`);
  return <main><section className="card validation-card"><BrandLogo compact priority/><span className="eyebrow">Identificação patrimonial</span>{asset?<><h2>{text(asset,"description")}</h2><p>Consulta segura realizada pelo QR Code do ativo.</p><div className="validation-result validation-result--valid"><dl><dt>Código</dt><dd>{text(asset,"internal_code")}</dd><dt>Patrimônio</dt><dd>{text(asset,"asset_number")}</dd><dt>Marca / modelo</dt><dd>{text(asset,"brand")} {text(asset,"model")}</dd><dt>Condição</dt><dd>{text(asset,"condition")}</dd><dt>Status</dt><dd>{text(asset,"status")}</dd><dt>Garantia</dt><dd>{text(asset,"warranty_ends_at")}</dd></dl></div><div className="actions"><Link href={`/patrimonio/ativos`}>Abrir no patrimônio</Link><Link href="/dashboard">Ir ao dashboard</Link></div></>:<><h2>Ativo não localizado</h2><p>O QR Code é inválido, pertence a outro tenant ou sua conta não possui acesso.</p><div className="actions"><Link href="/dashboard">Voltar ao dashboard</Link></div></>}</section></main>;
}
