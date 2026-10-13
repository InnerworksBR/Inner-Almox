import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseDashboardService } from "../src/services/dashboard-service";

describe("SupabaseDashboardService.moduleMetrics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("consulta o RPC específico do módulo e valida a resposta", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      module: "patrimonio",
      metrics: { total: 2, in_use: 1, available: 1, maintenance: 0, value: 1000 },
      distribution: [{ key: "in_use", label: "Em uso", value: 1 }],
      monthly: [{ month: "2026-09", label: "set/26", values: { movements: 1 } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const service = new SupabaseDashboardService("http://supabase.local", "service-key");
    await expect(service.moduleMetrics("10000000-0000-0000-0000-000000000001", "patrimonio"))
      .resolves.toMatchObject({ module: "patrimonio", metrics: { total: 2 } });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://supabase.local/rest/v1/rpc/get_module_metrics",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          target_tenant_id: "10000000-0000-0000-0000-000000000001",
          module: "patrimonio"
        })
      })
    );
  });
});
