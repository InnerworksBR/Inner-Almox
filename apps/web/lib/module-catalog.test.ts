import { describe, expect, it } from "vitest";

import { apiEndpointByModule, getModuleDefinition } from "./module-catalog";

describe("catálogo de módulos", () => {
  it("expõe o cadastro de estoques do almoxarifado", () => {
    expect(getModuleDefinition("almoxarifado/estoques").primaryAction).toBe("Novo estoque");
    expect(apiEndpointByModule["almoxarifado/estoques"]).toBe("stock/locations");
  });

  it("expõe o cadastro de autorizações da frota", () => {
    expect(getModuleDefinition("frota/autorizacoes").primaryAction).toBe("Nova autorização");
    expect(apiEndpointByModule["frota/autorizacoes"]).toBe("fleet/authorizations");
  });
});
