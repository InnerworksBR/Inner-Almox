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
import type { ListOptions, ListResult, ResourcePayload, TenantResourceService, TenantResourceTable } from "../src/services/tenant-resource-service";

const tenantA: TenantContext = {
  tenantId: "10000000-0000-0000-0000-000000000001",
  tenantSlug: "tenant-a",
  userId: "20000000-0000-0000-0000-000000000001",
  membershipId: "30000000-0000-0000-0000-000000000001",
  roles: ["tenant_admin"]
};

const colaboradorA: TenantContext = {
  tenantId: tenantA.tenantId,
  tenantSlug: tenantA.tenantSlug,
  userId: "20000000-0000-0000-0000-000000000009",
  membershipId: "30000000-0000-0000-0000-000000000009",
  roles: ["employee"]
};

class FakeResolver implements ContextResolver {
  async resolve(input: ResolveContextInput): Promise<TenantContext> {
    if (input.hostname !== "tenant-a.localhost") throw new AppError("Usuário não pertence a este tenant.", 403, "TENANT_ACCESS_DENIED");
    if (input.accessToken === "token-a") return tenantA;
    if (input.accessToken === "token-colaborador") return colaboradorA;
    throw new AppError("Usuário não pertence a este tenant.", 403, "TENANT_ACCESS_DENIED");
  }
}

class FakePublisher implements QueuePublisher {
  readonly publishValidation = vi.fn(async (_input: ValidationJobInput) => "job-1");
  async close() {}
}

class FakeResourceService implements TenantResourceService {
  readonly list = vi.fn(async (_table: TenantResourceTable, _tenantId: string, _options?: ListOptions): Promise<ListResult> => ({ linhas: [], total: 0 }));
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

describe("Escopo de leitura por papel", () => {
  const admin = { host: "tenant-a.localhost", authorization: "Bearer token-a" };
  const colaborador = { host: "tenant-a.localhost", authorization: "Bearer token-colaborador" };

  async function build(resources: FakeResourceService) {
    return buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
  }

  it("mantém a auditoria restrita aos perfis autorizados", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    expect((await app.inject({ method: "GET", url: "/v1/audit", headers: admin })).statusCode).toBe(200);
    const negado = await app.inject({ method: "GET", url: "/v1/audit", headers: colaborador });
    expect(negado.statusCode).toBe(403);
    expect(negado.json()).toMatchObject({ error: { code: "PERMISSION_DENIED" } });
    await app.close();
  });

  it("limita a listagem de ativos do colaborador aos que são responsabilidade dele", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    await app.inject({ method: "GET", url: "/v1/assets", headers: colaborador });
    expect(resources.list).toHaveBeenCalledWith("assets", tenantA.tenantId, expect.objectContaining({ escopo: { responsible_user_id: colaboradorA.userId } }));
    resources.list.mockClear();
    await app.inject({ method: "GET", url: "/v1/assets", headers: admin });
    expect(resources.list.mock.calls.at(-1)?.[2]?.escopo).toBeUndefined();
    await app.close();
  });

  it("limita o histórico de movimentações do colaborador ao que o envolve", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    await app.inject({ method: "GET", url: "/v1/asset-movements", headers: colaborador });
    expect(resources.list).toHaveBeenCalledWith("asset_movements", tenantA.tenantId, expect.objectContaining({
      escopo: { or: `(performed_by.eq.${colaboradorA.userId},new_responsible_user_id.eq.${colaboradorA.userId},previous_responsible_user_id.eq.${colaboradorA.userId})` }
    }));
    await app.close();
  });

  it("aplica a visão pessoal mesmo para quem administra o tenant", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    await app.inject({ method: "GET", url: "/v1/my/assets", headers: admin });
    expect(resources.list).toHaveBeenCalledWith("assets", tenantA.tenantId, expect.objectContaining({ escopo: { responsible_user_id: tenantA.userId } }));
    await app.close();
  });
});

describe("Consulta das listagens", () => {
  const admin = { host: "tenant-a.localhost", authorization: "Bearer token-a" };
  const colaborador = { host: "tenant-a.localhost", authorization: "Bearer token-colaborador" };

  async function build(resources: FakeResourceService) {
    return buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
  }

  it("repassa busca, página, tamanho e ordenação", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    const resposta = await app.inject({ method: "GET", url: "/v1/assets?busca=notebook&pagina=3&tamanho=10&ordenar=internal_code&direcao=asc", headers: admin });
    expect(resposta.statusCode).toBe(200);
    expect(resources.list).toHaveBeenCalledWith("assets", tenantA.tenantId, expect.objectContaining({
      busca: "notebook", pagina: 3, tamanho: 10, ordenar: "internal_code", direcao: "asc"
    }));
    expect(resposta.json()).toMatchObject({ total: 0, pagina: 3, tamanho: 10 });
    await app.close();
  });

  it("aceita filtro previsto para a tabela", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    const resposta = await app.inject({ method: "GET", url: "/v1/stock/movements?type=purchase_in", headers: admin });
    expect(resposta.statusCode).toBe(200);
    expect(resources.list).toHaveBeenCalledWith("stock_movements", tenantA.tenantId, expect.objectContaining({ filtros: { type: "purchase_in" } }));
    await app.close();
  });

  it("recusa filtro que não pertence à listagem", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    const resposta = await app.inject({ method: "GET", url: "/v1/assets?senha=x", headers: admin });
    expect(resposta.statusCode).toBe(422);
    expect(resposta.json()).toMatchObject({ error: { code: "FILTER_NOT_ALLOWED" } });
    expect(resources.list).not.toHaveBeenCalled();
    await app.close();
  });

  it("recusa ordenação por campo não liberado", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    const resposta = await app.inject({ method: "GET", url: "/v1/assets?ordenar=notes", headers: admin });
    expect(resposta.statusCode).toBe(422);
    expect(resposta.json()).toMatchObject({ error: { code: "ORDER_NOT_ALLOWED" } });
    await app.close();
  });

  it("mantém o escopo do colaborador mesmo com busca", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    await app.inject({ method: "GET", url: "/v1/assets?busca=notebook", headers: colaborador });
    expect(resources.list).toHaveBeenCalledWith("assets", tenantA.tenantId, expect.objectContaining({
      busca: "notebook", escopo: { responsible_user_id: colaboradorA.userId }
    }));
    await app.close();
  });
});

describe("Campos protegidos pelo fluxo", () => {
  const admin = { host: "tenant-a.localhost", authorization: "Bearer token-a" };
  const colaborador = { host: "tenant-a.localhost", authorization: "Bearer token-colaborador" };
  const requisicao = "50000000-0000-4000-8000-000000000001";

  it("recusa mudança de status da requisição pelo cadastro genérico", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "PATCH", url: `/v1/stock/requisitions/${requisicao}`, headers: admin, payload: { status: "approved" } });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: "PROTECTED_FIELD" } });
    expect(resources.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("impede que o colaborador edite requisições", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "PATCH", url: `/v1/stock/requisitions/${requisicao}`, headers: colaborador, payload: { purpose: "Outro objetivo" } });
    expect(response.statusCode).toBe(403);
    expect(resources.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("recusa mudar status e responsável do ativo fora da movimentação", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "PATCH", url: "/v1/assets/50000000-0000-4000-8000-000000000002", headers: admin, payload: { status: "in_use" } });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: "PROTECTED_FIELD" } });
    expect(resources.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("mantém a quilometragem disponível no cadastro do veículo", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const criacao = await app.inject({ method: "POST", url: "/v1/fleet/vehicles", headers: admin, payload: { plate: "ABC1D23", brand: "Fiat", model: "Strada", current_mileage: 15000 } });
    expect(criacao.statusCode).toBe(201);
    const edicao = await app.inject({ method: "PATCH", url: "/v1/fleet/vehicles/50000000-0000-4000-8000-000000000003", headers: admin, payload: { current_mileage: 20000 } });
    expect(edicao.statusCode).toBe(422);
    await app.close();
  });
});
