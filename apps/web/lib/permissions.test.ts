import { describe, expect, it } from "vitest";
import { getModuleDefinition } from "./module-catalog";
import { rolePermissions } from "./permissions";

describe("catálogo de permissões", () => {
  it("define exatamente os oito papéis do PRD", () => {
    expect(Object.keys(rolePermissions)).toHaveLength(8);
    expect(rolePermissions.tenant_admin.modules).toContainEqual(expect.objectContaining({
      key: "admin",
      actions: expect.arrayContaining(["Gerenciar usuários", "Gerenciar permissões"]) as unknown
    }));
    expect(rolePermissions.asset_manager.modules).toContainEqual(expect.objectContaining({
      key: "patrimonio",
      actions: expect.arrayContaining(["Cadastrar ativos", "Executar inventários"]) as unknown
    }));
    expect(rolePermissions.auditor.modules).toContainEqual(expect.objectContaining({
      key: "auditoria",
      actions: expect.arrayContaining(["Visualizar históricos", "Exportar relatórios autorizados"]) as unknown
    }));
    expect(getModuleDefinition("admin/permissoes").primaryAction).toBeUndefined();
  });
});
