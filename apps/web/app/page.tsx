import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function HomePage() {
  return (
    <main>
      <section className="card">
        <BrandLogo priority />
        <span className="eyebrow">Inner Almox</span>
        <h1>Gestão integrada para tudo que mantém sua operação em movimento.</h1>
        <p>
          Patrimônio, almoxarifado, frota e manutenção em uma plataforma segura,
          multiempresa e preparada para crescer com a sua operação.
        </p>
        <div className="actions">
          <Link href="/login">Entrar</Link>
          <Link href="/dashboard">Acessar plataforma</Link>
        </div>
      </section>
    </main>
  );
}
