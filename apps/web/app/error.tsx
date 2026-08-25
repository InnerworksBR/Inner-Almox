"use client";

export default function GlobalError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main>
      <section className="card" role="alert">
        <h2>Não foi possível carregar esta página.</h2>
        <p>Tente novamente. Se o problema continuar, contate o administrador.</p>
        <button type="button" onClick={reset}>Tentar novamente</button>
      </section>
    </main>
  );
}
