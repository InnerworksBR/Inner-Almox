import { afterEach, describe, expect, it, vi } from "vitest";
import { createAlertRefreshProcessor } from "../src/processors/alerts";

describe("createAlertRefreshProcessor", () => {
  afterEach(() => vi.restoreAllMocks());

  it("registra uma execução derivada para cada tenant atualizado", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: "10000000-0000-0000-0000-000000000001" },
        { id: "10000000-0000-0000-0000-000000000002" }
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response("2", { status: 200 }))
      .mockResolvedValueOnce(new Response("[]", { status: 200 }))
      .mockResolvedValueOnce(new Response("1", { status: 200 }))
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));
    const jobRegistry = { recordTenantScan: vi.fn(async () => undefined) };
    const processor = createAlertRefreshProcessor({
      supabaseUrl: "http://supabase.local",
      serviceRoleKey: "service-key",
      jobRegistry
    });

    await expect(processor({ id: "job-1", attemptsMade: 0, data: { requestedAt: "2026-09-25T12:00:00.000Z" } })).resolves.toEqual({ tenants: 2, notifications: 3 });
    expect(jobRegistry.recordTenantScan).toHaveBeenCalledTimes(2);
    expect(jobRegistry.recordTenantScan).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tenantId: "10000000-0000-0000-0000-000000000001",
      externalJobId: "job-1:10000000-0000-0000-0000-000000000001",
      status: "completed",
      result: { notifications: 2 }
    }));
  });

  it("registra falha do tenant antes de relançar o erro", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "10000000-0000-0000-0000-000000000001" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response("falha", { status: 500 }));
    const jobRegistry = { recordTenantScan: vi.fn(async () => undefined) };
    const processor = createAlertRefreshProcessor({
      supabaseUrl: "http://supabase.local",
      serviceRoleKey: "service-key",
      jobRegistry
    });

    await expect(processor({ id: "job-2", attemptsMade: 0, data: { requestedAt: "2026-09-25T12:00:00.000Z" } })).rejects.toThrow("Falha ao atualizar alertas");
    expect(jobRegistry.recordTenantScan).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", tenantId: "10000000-0000-0000-0000-000000000001" }));
  });

  it("publica um e-mail por destinatário pendente e respeita a deduplicação do banco", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "10000000-0000-0000-0000-000000000001" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response("2", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { tenant_id: "10000000-0000-0000-0000-000000000001", user_id: "20000000-0000-0000-0000-000000000001", recipient_email: "admin@example.com", type: "warranty_expiry", title: "Garantia", message: "Vence", subject: "Garantia", body: "Vence", entity_type: "warranty", entity_id: "w-1" },
        { tenant_id: "10000000-0000-0000-0000-000000000001", user_id: "20000000-0000-0000-0000-000000000002", recipient_email: "asset@example.com", type: "warranty_expiry", title: "Garantia", message: "Vence", subject: "Garantia", body: "Vence", entity_type: "warranty", entity_id: "w-1" }
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "10000000-0000-0000-0000-000000000001" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response("0", { status: 200 }))
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));
    const publishNotification = vi.fn(async () => "mail-job");
    const processor = createAlertRefreshProcessor({
      supabaseUrl: "http://supabase.local",
      serviceRoleKey: "service-key",
      publishNotification
    });
    const job = { id: "job-mail", attemptsMade: 0, data: { requestedAt: "2026-09-25T12:00:00.000Z" } };

    await processor(job);
    await processor(job);

    expect(publishNotification).toHaveBeenCalledTimes(2);
    expect(publishNotification).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tenantId: "10000000-0000-0000-0000-000000000001",
      recipientEmail: "admin@example.com",
      channel: "email",
      type: "warranty_expiry"
    }));
  });
});
