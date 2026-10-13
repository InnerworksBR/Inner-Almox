import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({ auth: { getSession: vi.fn() } })
}));

import { normalizarValorDoCampo, RecordForm } from "./record-form";

describe("RecordForm", () => {
  it("preenche os dados do ativo no modo de edição", () => {
    const markup = renderToStaticMarkup(
      <RecordForm
        title="Ativos"
        description="Controle todo o ciclo de vida dos bens individualizados."
        singular="ativo"
        path="patrimonio/ativos"
        mode="edit"
        record={{
          id: "asset-123",
          internal_code: "ATV-000123",
          description: "Notebook Dell Latitude 7450",
          responsible_user_id: "user-123",
          profiles: { full_name: "Cristian Paxur de Araujo Alexandre" }
        }}
      />
    );

    expect(markup).toContain("Editar cadastro");
    expect(markup).toContain('value="ATV-000123"');
    expect(markup).toContain("Notebook Dell Latitude 7450");
    expect(markup).toContain("Altere o responsável por uma movimentação patrimonial.");
    expect(markup).not.toContain('name="responsible_user_id"');
    expect(markup).toContain("Salvar alterações");
  });

  it("exibe código de filial somente como leitura e não permite informá-lo", () => {
    const markup = renderToStaticMarkup(
      <RecordForm
        title="Filiais"
        description="Organize unidades e estabelecimentos da empresa."
        singular="filial"
        path="admin/filiais"
      />
    );

    expect(markup).toContain("Código interno");
    expect(markup).toContain("Gerado automaticamente após salvar");
    expect(markup).not.toContain('name="code"');
  });

  it("exibe código de produto somente como leitura na edição", () => {
    const markup = renderToStaticMarkup(
      <RecordForm
        title="Produtos"
        description="Cadastre produtos, unidades, limites e regras de lote."
        singular="produto"
        path="almoxarifado/produtos"
        mode="edit"
        record={{ id: "product-123", code: "PRO-000123", name: "Teclado", unit: "UN" }}
      />
    );

    expect(markup).toContain('value="PRO-000123"');
    expect(markup).not.toContain('name="code"');
  });

  it("serializa datetime-local como ISO com timezone antes de enviar", () => {
    const local = "2026-09-24T14:00";

    expect(normalizarValorDoCampo("datetime-local", local)).toBe(new Date(local).toISOString());
  });
});
