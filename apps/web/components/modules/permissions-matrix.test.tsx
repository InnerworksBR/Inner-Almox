import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTenantCollection } from "@/lib/api/server";
import { PermissionsMatrix } from "./permissions-matrix";

vi.mock("@/lib/api/server", () => ({ fetchTenantCollection: vi.fn() }));

const fetchTenantCollectionMock = vi.mocked(fetchTenantCollection);

describe("PermissionsMatrix", () => {
  beforeEach(() => fetchTenantCollectionMock.mockReset());

  it("agrega contagens por papel usando todas as páginas de usuários", async () => {
    fetchTenantCollectionMock
      .mockResolvedValueOnce({ data: [{ roles: ["tenant_admin", "employee"] }], total: 3, available: true })
      .mockResolvedValueOnce({ data: [{ roles: ["employee", "auditor"] }, { roles: ["asset_manager"] }], total: 3, available: true });

    const markup = renderToStaticMarkup(await PermissionsMatrix());

    expect(fetchTenantCollectionMock).toHaveBeenNthCalledWith(1, "users", { pagina: "1", tamanho: "100" });
    expect(fetchTenantCollectionMock).toHaveBeenNthCalledWith(2, "users", { pagina: "2", tamanho: "100" });
    expect(markup).toContain("tenant_admin");
    expect(markup).toContain(">2<");
    expect(markup).toContain("asset_manager");
    expect(markup).not.toContain("Novo perfil");
  });
});
