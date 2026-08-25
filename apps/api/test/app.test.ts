import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app";
import { AppError } from "../src/errors/app-error";
import type {
  ContextResolver,
  QueuePublisher,
  ResolveContextInput,
  TenantContext,
  ValidationJobInput
} from "../src/types/context";
import type { ResourcePayload, TenantResourceService, TenantResourceTable } from "../src/services/tenant-resource-service";

const tenantA: TenantContext = {
  tenantId: "10000000-0000-0000-0000-000000000001",
  tenantSlug: "tenant-a",
  userId: "20000000-0000-0000-0000-000000000001",
  membershipId: "30000000-0000-0000-0000-000000000001",
  roles: ["tenant_admin"]
};

class FakeResolver implements ContextResolver {
  async resolve(input: ResolveContextInput): Promise<TenantContext> {
    if (input.accessToken === "token-a" && input.hostname === "tenant-a.localhost") return tenantA;
    throw new AppError("Usuário não pertence a este tenant.", 403, "TENANT_ACCESS_DENIED");
  }
}

class FakePublisher implements QueuePublisher {
  readonly publishValidation = vi.fn(async (_input: ValidationJobInput) => "job-1");
  async close() {}
}

class FakeResourceService implements TenantResourceService {
  readonly list = vi.fn(async (_table: TenantResourceTable, _tenantId: string): Promise<ResourcePayload[]> => []);
  readonly create = vi.fn(async (_table: TenantResourceTable, tenantId: string, _userId: string, payload: ResourcePayload): Promise<ResourcePayload> => ({ id: "40000000-0000-0000-0000-000000000001", tenant_id: tenantId, ...payload }));
  readonly update = vi.fn(async (_table: TenantResourceTable, tenantId: string, _userId: string, id: string, payload: ResourcePayload): Promise<ResourcePayload> => ({ id, tenant_id: tenantId, ...payload }));
}

const testEnv = {
  NODE_ENV: "test" as const,
  HOST: "127.0.0.1",
  PORT: 3333,
  TRUST_PROXY: false,
  WEB_ORIGINS: "http://localhost:3000",
  REDIS_URL: "redis://localhost:6379",
  QUEUE_VALIDATION_ENABLED: true,
  PLATFORM_ADMIN_EMAILS: "",
  DOCUMENT_PUBLIC_URL: undefined
};

describe("API foundation", () => {
  it("responds to the health check", async () => {
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher() });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  }, 15_000);

  it("requires authentication for tenant context", async () => {
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher() });
    const response = await app.inject({ method: "GET", url: "/v1/context", headers: { host: "tenant-a.localhost" } });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("rejects a user from another tenant", async () => {
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher() });
    const response = await app.inject({
      method: "GET",
      url: "/v1/context",
      headers: { host: "tenant-b.localhost", authorization: "Bearer token-a" }
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: { code: "TENANT_ACCESS_DENIED" } });
    await app.close();
  });

  it("derives queued tenant and user from authenticated context", async () => {
    const publisher = new FakePublisher();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: publisher });
    const response = await app.inject({
      method: "POST",
      url: "/v1/foundation/jobs",
      headers: { host: "TENANT-A.LOCALHOST:3333", authorization: "Bearer token-a" },
      payload: { message: "ping" }
    });
    expect(response.statusCode).toBe(202);
    expect(publisher.publishValidation).toHaveBeenCalledWith({
      tenantId: tenantA.tenantId,
      requestedBy: tenantA.userId,
      message: "ping"
    });
    await app.close();
  });

  it("does not accept a client-provided tenant id", async () => {
    const publisher = new FakePublisher();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: publisher });
    const response = await app.inject({
      method: "POST",
      url: "/v1/foundation/jobs",
      headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" },
      payload: { message: "ping", tenantId: "tenant-b" }
    });
    expect(response.statusCode).toBe(400);
    expect(publisher.publishValidation).not.toHaveBeenCalled();
    await app.close();
  });

  it("derives the tenant when creating an organization resource", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "POST", url: "/v1/branches", headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }, payload: { code: "HQ", name: "Matriz", tenant_id: "tenant-b" } });
    expect(response.statusCode).toBe(201);
    expect(resources.create).toHaveBeenCalledWith("branches", tenantA.tenantId, tenantA.userId, { code: "HQ", name: "Matriz" });
    expect(response.json()).toMatchObject({ data: { tenant_id: tenantA.tenantId } });
    await app.close();
  });

  it("rejects invalid organization payloads before persistence", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "POST", url: "/v1/branches", headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }, payload: { code: "", name: "X" } });
    expect(response.statusCode).toBe(422);
    expect(resources.create).not.toHaveBeenCalled();
    await app.close();
  });
});
