import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseUserAdminService } from "../src/services/user-admin-service";
import type { ResourcePayload } from "../src/services/tenant-resource-service";

const authUserId = "70000000-0000-4000-8000-000000000001";
const tenantId = "10000000-0000-0000-0000-000000000001";
const requestedBy = "20000000-0000-0000-0000-000000000001";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function createInput(): { email: string; fullName: string; password: string; roles: string[]; employee: ResourcePayload } {
  return { email: "novo@empresa.com", fullName: "Novo Usuário", password: "senha-segura", roles: ["employee"], employee: {} };
}

function directCreate(service: SupabaseUserAdminService, input = createInput()): Promise<ResourcePayload> {
  const method = (service as unknown as { create?: (tenant: string, requester: string, data: typeof input) => Promise<ResourcePayload> }).create;
  expect(method).toEqual(expect.any(Function));
  return method!.call(service, tenantId, requestedBy, input);
}

describe("SupabaseUserAdminService.create", () => {
  const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cria Auth, provisiona vínculo, audita sem senha e retorna campos públicos", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(201, { id: authUserId }))
      .mockResolvedValueOnce(jsonResponse(200, "80000000-0000-4000-8000-000000000001"))
      .mockResolvedValueOnce(jsonResponse(201, {}));

    const service = new SupabaseUserAdminService("http://supabase.local", "service-key", "http://localhost:3001/auth/callback");
    const result = await directCreate(service);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://supabase.local/auth/v1/admin/users", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "novo@empresa.com", password: "senha-segura", email_confirm: true, user_metadata: { full_name: "Novo Usuário" } })
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://supabase.local/rest/v1/rpc/provision_tenant_membership", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "http://supabase.local/rest/v1/audit_logs", expect.objectContaining({ method: "POST" }));
    const auditBody = fetchMock.mock.calls[2]?.[1]?.body;
    expect(typeof auditBody).toBe("string");
    if (typeof auditBody === "string") expect(JSON.parse(auditBody)).not.toHaveProperty("password");
    expect(result).toEqual({ id: authUserId, email: "novo@empresa.com", full_name: "Novo Usuário", roles: ["employee"], status: "active" });
  });

  it("remove Auth quando o vínculo não pode ser provisionado", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(201, { id: authUserId }))
      .mockResolvedValueOnce(jsonResponse(500, { message: "membership failed" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const service = new SupabaseUserAdminService("http://supabase.local", "service-key", "http://localhost:3001/auth/callback");
    await expect(directCreate(service)).rejects.toMatchObject({ code: "MEMBERSHIP_PROVISION_FAILED" });
    expect(fetchMock).toHaveBeenNthCalledWith(3, `http://supabase.local/auth/v1/admin/users/${authUserId}`, expect.objectContaining({ method: "DELETE" }));
  });

  it("converte e-mail duplicado do Auth em conflito", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { msg: "User already registered" }));
    const service = new SupabaseUserAdminService("http://supabase.local", "service-key", "http://localhost:3001/auth/callback");
    await expect(directCreate(service)).rejects.toMatchObject({ statusCode: 409, code: "USER_ALREADY_EXISTS" });
  });
});
