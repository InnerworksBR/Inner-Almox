import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupabasePlatformAdminService } from "../src/services/platform-admin-service";

function requestUrlOf(value: string | URL | Request | undefined): string {
  if (typeof value === "string") return value;
  if (value instanceof URL) return value.toString();
  return value?.url ?? "";
}

describe("SupabasePlatformAdminService.list", () => {
  const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("pesquisa e pagina apenas nos campos permitidos", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([{ legal_name: "Inner" }]), {
      status: 200,
      headers: { "Content-Range": "2-3/4", "Content-Type": "application/json" }
    }));
    const service = new SupabasePlatformAdminService("http://supabase.local", "anon-key", "service-key", []);

    const result = await service.list("tenants", { busca: "inner", ordenar: "legal_name", direcao: "asc", pagina: 2, tamanho: 2 });
    const requestUrl = requestUrlOf(fetchMock.mock.calls[0]?.[0]);

    expect(result).toEqual({ linhas: [{ legal_name: "Inner" }], total: 4 });
    expect(decodeURIComponent(requestUrl)).toContain("select=*");
    expect(decodeURIComponent(requestUrl)).toContain("legal_name.ilike.*inner*");
    expect(decodeURIComponent(requestUrl)).toContain("slug.ilike.*inner*");
    expect(decodeURIComponent(requestUrl)).toContain("order=legal_name.asc.nullslast");
    expect(decodeURIComponent(requestUrl)).toContain("limit=2");
    expect(decodeURIComponent(requestUrl)).toContain("offset=2");
    const requestInit = fetchMock.mock.calls[0]?.[1];
    const requestHeaders = requestInit?.headers as Record<string, string> | undefined;
    expect(requestHeaders?.prefer).toBe("count=exact");
  });

  it("ignora ordenação fora da whitelist", async () => {
    fetchMock.mockResolvedValueOnce(new Response("[]", { status: 200, headers: { "Content-Range": "*/0" } }));
    const service = new SupabasePlatformAdminService("http://supabase.local", "anon-key", "service-key", []);

    await service.list("background_jobs", { ordenar: "senha", direcao: "asc" });

    const requestUrl = requestUrlOf(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).not.toContain("senha");
    expect(decodeURIComponent(requestUrl)).toContain("order=created_at.desc");
  });
});
