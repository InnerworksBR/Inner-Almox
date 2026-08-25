import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

interface ValidationResult {
  valid?: boolean;
  code?: string;
  type?: string;
  tenant?: string;
  issued_at?: string;
  accepted_at?: string | null;
}

async function validate(code: string): Promise<ValidationResult | null> {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/v1/public/documents/${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("data" in body) || typeof body.data !== "object" || body.data === null) return null;
    return body.data;
  } catch { return null; }
}

export default async function ValidateDocumentPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const code = (await searchParams).code?.trim() ?? "";
  const result = code ? await validate(code) : undefined;
  return <main><section className="card validation-card"><BrandLogo compact priority /><span className="eyebrow">Validação pública</span><h2>Validar termo ou documento</h2><p>Digite o código impresso no documento para confirmar sua autenticidade.</p><form method="get"><label>Código de validação<input name="code" defaultValue={code} minLength={8} maxLength={80} required placeholder="Ex.: 4A7C91D20B3E44AF" /></label><button type="submit">Validar documento</button></form>{result===null?<div className="validation-result validation-result--invalid"><strong>Documento não localizado</strong><span>Confira o código informado e tente novamente.</span></div>:result?<div className="validation-result validation-result--valid"><strong>Documento autêntico</strong><dl><dt>Empresa</dt><dd>{result.tenant}</dd><dt>Código</dt><dd>{result.code}</dd><dt>Tipo</dt><dd>{result.type}</dd><dt>Emissão</dt><dd>{result.issued_at?new Date(result.issued_at).toLocaleString("pt-BR"):"—"}</dd><dt>Aceite</dt><dd>{result.accepted_at?new Date(result.accepted_at).toLocaleString("pt-BR"):"Pendente"}</dd></dl></div>:null}<div className="actions"><Link href="/login">Voltar ao acesso</Link></div></section></main>;
}
