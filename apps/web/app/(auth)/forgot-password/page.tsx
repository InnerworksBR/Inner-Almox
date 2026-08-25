import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function ForgotPasswordPage() {
  return (
    <main>
      <section className="card">
        <BrandLogo compact priority />
        <h2>Recuperar senha</h2>
        <PasswordRecoveryForm />
      </section>
    </main>
  );
}
