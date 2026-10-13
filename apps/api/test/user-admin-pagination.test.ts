import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseUserAdminService } from "../src/services/user-admin-service";

describe("SupabaseUserAdminService.list", () => {
  const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("aplica busca, página e total retornado pelo Content-Range", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([{ full_name: "Ana" }]), {
      status: 200,
      headers: { "Content-Range": "0-1/5", "Content-Type": "application/json" }
    }));
    const service = new SupabaseUserAdminService("http://supabase.local", "service-key", "http://localhost/callback");

    const result = await service.list("10000000-0000-0000-0000-000000000001", { busca: "ana", pagina: 2, tamanho: 1 });

    expect(result).toEqual({ linhas: [expect.objectContaining({ full_name: "Ana" })], total: 5 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://supabase.local/rest/v1/rpc/list_tenant_users?limit=1&offset=1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ target_tenant_id: "10000000-0000-0000-0000-000000000001", search: "ana" }),
        headers: expect.objectContaining({ prefer: "count=exact" }) as unknown
      })
    );
  });
});
