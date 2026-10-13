import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchTenantRecordMock } = vi.hoisted(() => ({
  fetchTenantRecordMock: vi.fn()
}));

vi.mock("@/lib/api/server", () => ({ fetchTenantRecord: fetchTenantRecordMock }));

import { ModuleDashboard } from "./module-dashboard";

describe("ModuleDashboard", () => {
  beforeEach(() => {
    fetchTenantRecordMock.mockReset();
  });

  it("exibe métricas, distribuição e série mensal reais de patrimônio", async () => {
    fetchTenantRecordMock.mockResolvedValue({
      module: "patrimonio",
      metrics: { total: 4, in_use: 2, available: 1, maintenance: 1, value: 2500 },
      distribution: [
        { key: "in_use", label: "Em uso", value: 2 },
        { key: "available", label: "Disponíveis", value: 1 },
        { key: "maintenance", label: "Em manutenção", value: 1 }
      ],
      monthly: [{ month: "2026-09", label: "set/26", values: { movements: 3 } }]
    });

    const markup = renderToStaticMarkup(await ModuleDashboard({ domain: "patrimonio" }));

    expect(fetchTenantRecordMock).toHaveBeenCalledWith("dashboard/patrimonio");
    expect(markup).toContain(">4<");
    expect(markup).toContain("Evolução no período");
    expect(markup).toContain("Em manutenção");
    expect(markup).not.toContain("Os indicadores serão calculados a partir das movimentações reais.");
  });

  it("exibe os indicadores reais do almoxarifado", async () => {
    fetchTenantRecordMock.mockResolvedValue({
      module: "almoxarifado",
      metrics: { stock_value: 1500, products_active: 4, below_minimum: 1, batches_expiring: 2 },
      distribution: [{ key: "uncategorized", label: "Sem categoria", value: 4 }],
      monthly: [{ month: "2026-09", label: "set/26", values: { entries: 10, exits: 2 } }]
    });

    const markup = renderToStaticMarkup(await ModuleDashboard({ domain: "almoxarifado" }));

    expect(fetchTenantRecordMock).toHaveBeenCalledWith("dashboard/almoxarifado");
    expect(markup).toContain("Produtos ativos");
    expect(markup).toContain("Abaixo do mínimo");
    expect(markup).toContain("R$");
    expect(markup).toContain(">4<");
  });

  it("exibe os indicadores reais da frota", async () => {
    fetchTenantRecordMock.mockResolvedValue({
      module: "frota",
      metrics: { vehicles: 3, available: 2, in_use: 1, expired_documents: 1, cost: 900 },
      distribution: [{ key: "available", label: "Disponível", value: 2 }],
      monthly: [{ month: "2026-09", label: "set/26", values: { cost: 900 } }]
    });

    const markup = renderToStaticMarkup(await ModuleDashboard({ domain: "frota" }));

    expect(fetchTenantRecordMock).toHaveBeenCalledWith("dashboard/frota");
    expect(markup).toContain("Veículos");
    expect(markup).toContain("Disponíveis");
    expect(markup).toContain("Documentos vencidos");
    expect(markup).toContain(">3<");
  });

  it("mantém estado vazio sem dados simulados", async () => {
    fetchTenantRecordMock.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await ModuleDashboard({ domain: "patrimonio" }));

    expect(markup).toContain(">0<");
    expect(markup).toContain("Cadastre registros para ver aqui a distribuição.");
    expect(markup).not.toContain("Aguardando dados");
  });
});
