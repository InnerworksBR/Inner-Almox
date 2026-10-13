import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseJobRegistry } from "../src/services/job-registry";

describe("SupabaseJobRegistry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockFetch = () => {
    const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("registra início e conclusão do ciclo de vida", async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "job-record-1" }]), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const registry = new SupabaseJobRegistry("http://supabase.local", "service-key");

    await registry.start({ queue: "foundation-validation", type: "validate-foundation", externalJobId: "42", tenantId: "tenant-1", attempts: 1, payload: { message: "safe" } });
    await registry.complete({ queue: "foundation-validation", externalJobId: "42", result: { accepted: true }, completedAt: "2026-09-25T12:00:00.000Z" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://supabase.local/rest/v1/background_jobs", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"status":"processing"') as unknown
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://supabase.local/rest/v1/background_jobs?id=eq.job-record-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ status: "completed", result: { accepted: true }, completed_at: "2026-09-25T12:00:00.000Z" })
    }));
  });

  it("trunca e persiste falha e registra varredura tenant-scoped", async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "job-record-2" }]), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const registry = new SupabaseJobRegistry("http://supabase.local", "service-key");

    await registry.start({ queue: "inner-almox-alert-refresh", type: "refresh-all-tenants", externalJobId: "job-1", tenantId: null, attempts: 2 });
    await registry.fail({ queue: "inner-almox-alert-refresh", externalJobId: "job-1", error: new Error("x".repeat(3000)), completedAt: "2026-09-25T12:00:00.000Z" });

    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("background_jobs?id=eq.job-record-2"), expect.objectContaining({
      body: expect.stringContaining('"status":"failed"') as unknown
    }));
    const failureBody = fetchMock.mock.calls[1]?.[1]?.body;
    const failureText = typeof failureBody === "string" ? failureBody : JSON.stringify(failureBody) ?? "";
    expect(failureText.length).toBeGreaterThan(0);
    expect(failureText).not.toContain("x".repeat(3000));
  });

  it("grava uma execução derivada por tenant", async () => {
    const fetchMock = mockFetch().mockResolvedValue(new Response(JSON.stringify([{ id: "tenant-job-1" }]), { status: 201 }));
    const registry = new SupabaseJobRegistry("http://supabase.local", "service-key");

    await registry.recordTenantScan({
      queue: "inner-almox-alert-refresh",
      type: "refresh-tenant-alerts",
      externalJobId: "job-1:tenant-1",
      tenantId: "10000000-0000-0000-0000-000000000001",
      attempts: 1,
      status: "completed",
      result: { notifications: 2 }
    });

    expect(fetchMock).toHaveBeenCalledWith("http://supabase.local/rest/v1/background_jobs", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"tenant_id":"10000000-0000-0000-0000-000000000001"') as unknown
    }));
  });
});
