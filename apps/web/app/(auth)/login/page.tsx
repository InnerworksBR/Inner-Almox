import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/brand/brand-logo";

export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}) {
  const next=(await searchParams).next;
  return (
    <main className="login-page">
      <section className="login-visual" aria-label="InnerWorks — Apaixonados por tecnologia">
        <div className="login-visual__shade" />
      </section>
      <section className="login-panel">
        <div className="login-card">
          <BrandLogo compact priority />
          <span className="eyebrow">Portal corporativo</span>
          <h1>Bem-vindo de volta</h1>
          <p className="login-card__intro">Entre com suas credenciais para acessar o Inner Almox.</p>
          <LoginForm next={next} />
          <footer className="login-security-note"><span aria-hidden="true">✓</span><div><strong>Ambiente protegido</strong><small>Sessão autenticada e dados isolados por empresa.</small></div></footer>
        </div>
      </section>
    </main>
  );
}
