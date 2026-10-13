import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app";
import { AppError } from "../src/errors/app-error";
import type { InviteUserInput, UserAdminService, UserListOptions, UserListResult } from "../src/services/user-admin-service";
import type {
  ContextResolver,
  QueuePublisher,
  ResolveContextInput,
  TenantContext,
  ValidationJobInput
} from "../src/types/context";
import type { ListOptions, ListResult, ResourcePayload, TenantResourceService, TenantResourceTable } from "../src/services/tenant-resource-service";
import type { DashboardModule, DashboardModuleResult, DashboardService } from "../src/services/dashboard-service";
import type { PlatformAdminService, PlatformListOptions, PlatformListResult, TenantProvisionInput } from "../src/services/platform-admin-service";
import { PlatformHealthService } from "../src/services/platform-health-service";

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

class FakePlatformAdminService implements PlatformAdminService {
  async authorize(accessToken: string): Promise<string> {
    if (accessToken !== "platform-token") throw new AppError("Acesso negado.", 403, "PLATFORM_ADMIN_REQUIRED");
    return "platform-user";
  }
  readonly list = vi.fn(async (_collection: string, _options?: PlatformListOptions): Promise<PlatformListResult> => ({ linhas: [{ id: "platform-row" }], total: 25 }));
  async provision(_userId: string, _input: TenantProvisionInput): Promise<unknown> { return {}; }
  async updateTenant(_userId: string, _tenantId: string, _input: Record<string, unknown>): Promise<Record<string, unknown>> { return {}; }
  async addDomain(_userId: string, _tenantId: string, _hostname: string, _isPrimary: boolean, _verified: boolean): Promise<Record<string, unknown>> { return {}; }
  async verifyDomain(_userId: string, _domainId: string): Promise<Record<string, unknown>> { return {}; }
  async savePlan(_userId: string, _input: Record<string, unknown>): Promise<Record<string, unknown>> { return {}; }
  async setModules(_userId: string, _tenantId: string, _modules: Array<{ module_key: string; enabled: boolean }>): Promise<void> { return undefined; }
}

type DirectUserPayload = {
  email: string;
  fullName: string;
  password: string;
  roles: string[];
  employee: ResourcePayload;
};

class FakeUserAdminService implements UserAdminService {
  readonly list = vi.fn(async (_tenantId: string, _options?: UserListOptions): Promise<UserListResult> => ({ linhas: [], total: 25 }));
  readonly invite = vi.fn(async (_tenantId: string, _requestedBy: string, input: InviteUserInput): Promise<ResourcePayload> => ({
    id: "60000000-0000-4000-8000-000000000002",
    email: input.email,
    full_name: input.fullName,
    roles: input.roles,
    status: "invited"
  }));
  readonly create = vi.fn(async (_tenantId: string, _requestedBy: string, input: DirectUserPayload): Promise<ResourcePayload> => ({
    id: "60000000-0000-4000-8000-000000000001",
    email: input.email,
    full_name: input.fullName,
    roles: input.roles,
    status: "active"
  }));
  readonly changeStatus = vi.fn(async (): Promise<ResourcePayload> => ({ id: "60000000-0000-4000-8000-000000000003", status: "active" }));
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
  it("permite preflight para atualizações via PATCH", async () => {
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher() });
    const response = await app.inject({
      method: "OPTIONS",
      url: "/v1/assets/50000000-0000-4000-8000-000000000002",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "PATCH",
        "access-control-request-headers": "authorization,content-type,x-tenant-hostname"
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain("PATCH");
    await app.close();
  });

  it("responds to the health check", async () => {
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher() });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  }, 15_000);

  it("retorna probes reais na saúde da plataforma", async () => {
    const platformHealthService = new PlatformHealthService({
      probes: {
        Banco: async () => undefined,
        Redis: async () => undefined,
        Storage: async () => undefined,
        Worker: async () => "healthy"
      }
    });
    const app = await buildApp({
      env: testEnv,
      contextResolver: new FakeResolver(),
      queuePublisher: new FakePublisher(),
      platformService: new FakePlatformAdminService(),
      platformHealthService
    });

    const response = await app.inject({ method: "GET", url: "/v1/platform/health", headers: { authorization: "Bearer platform-token" } });

    expect(response.statusCode).toBe(200);
    const healthBody = JSON.parse(response.body) as { data: unknown };
    expect(healthBody.data).toHaveLength(4);
    expect(healthBody.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ servico: "Banco", estado: "healthy" }),
      expect.objectContaining({ servico: "Worker", latencia_ms: expect.any(Number) as unknown, verificado_em: expect.any(String) as unknown })
    ]));
    await app.close();
  });

  it("lista recursos da plataforma com busca e paginação", async () => {
    const platformService = new FakePlatformAdminService();
    const app = await buildApp({
      env: testEnv,
      contextResolver: new FakeResolver(),
      queuePublisher: new FakePublisher(),
      platformService
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/platform/tenants?busca=inner&ordenar=legal_name&direcao=asc&pagina=2&tamanho=10",
      headers: { authorization: "Bearer platform-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [{ id: "platform-row" }], total: 25, pagina: 2, tamanho: 10 });
    expect(platformService.list).toHaveBeenCalledWith("tenants", { busca: "inner", ordenar: "legal_name", direcao: "asc", pagina: 2, tamanho: 10 });
    await app.close();
  });

  it("carrega dashboard do módulo usando o tenant do contexto", async () => {
    const moduleMetrics = vi.fn(async (_tenantId: string, module: DashboardModule): Promise<DashboardModuleResult> => ({
      module,
      metrics: { total: 2 },
      distribution: [],
      monthly: []
    }));
    const dashboard: DashboardService = {
      metrics: vi.fn(async () => ({})),
      moduleMetrics
    };
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), dashboardService: dashboard });

    const response = await app.inject({
      method: "GET",
      url: "/v1/dashboard/patrimonio",
      headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { module: "patrimonio", metrics: { total: 2 }, distribution: [], monthly: [] } });
    expect(moduleMetrics).toHaveBeenCalledWith(tenantA.tenantId, "patrimonio");
    await app.close();
  });

  it("recusa módulo de dashboard desconhecido", async () => {
    const moduleMetrics = vi.fn(async (): Promise<DashboardModuleResult> => ({ module: "patrimonio", metrics: {}, distribution: [], monthly: [] }));
    const dashboard: DashboardService = {
      metrics: vi.fn(async () => ({})),
      moduleMetrics
    };
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), dashboardService: dashboard });
    const response = await app.inject({
      method: "GET",
      url: "/v1/dashboard/desconhecido",
      headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }
    });
    expect(response.statusCode).toBe(422);
    expect(moduleMetrics).not.toHaveBeenCalled();
    await app.close();
  });

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
    const response = await app.inject({ method: "POST", url: "/v1/branches", headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }, payload: { name: "Matriz", tenant_id: "tenant-b" } });
    expect(response.statusCode).toBe(201);
    expect(resources.create).toHaveBeenCalledWith("branches", tenantA.tenantId, tenantA.userId, { name: "Matriz" });
    expect(response.json()).toMatchObject({ data: { tenant_id: tenantA.tenantId } });
    await app.close();
  });

  it("recusa código manual em cadastro de organização", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "POST", url: "/v1/branches", headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }, payload: { code: "HQ", name: "Matriz" } });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: "PROTECTED_FIELD" } });
    expect(resources.create).not.toHaveBeenCalled();
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

  it("consulta um ativo por id para abrir sua edição", async () => {
    const resources = new FakeResourceService();
    resources.list.mockResolvedValueOnce({ linhas: [{ id: "50000000-0000-4000-8000-000000000002", description: "Notebook" }], total: 1 });
    const app = await build(resources);
    const resposta = await app.inject({ method: "GET", url: "/v1/assets/50000000-0000-4000-8000-000000000002", headers: admin });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toMatchObject({ data: { id: "50000000-0000-4000-8000-000000000002", description: "Notebook" } });
    expect(resources.list).toHaveBeenCalledWith("assets", tenantA.tenantId, { escopo: { id: "50000000-0000-4000-8000-000000000002" }, tamanho: 1 });
    await app.close();
  });

  it("mantém o bloqueio de detalhe para recursos sem escopo pessoal", async () => {
    const resources = new FakeResourceService();
    const app = await build(resources);
    const resposta = await app.inject({ method: "GET", url: "/v1/stock/requisition-items/50000000-0000-4000-8000-000000000002", headers: colaborador });

    expect(resposta.statusCode).toBe(403);
    expect(resposta.json()).toMatchObject({ error: { code: "PERMISSION_DENIED" } });
    expect(resources.list).not.toHaveBeenCalled();
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

  it("aceita cadastro de ativo sem código interno", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "POST", url: "/v1/assets", headers: admin, payload: { description: "Notebook gerado" } });
    expect(response.statusCode).toBe(201);
    expect(resources.create).toHaveBeenCalledWith("assets", tenantA.tenantId, tenantA.userId, { description: "Notebook gerado" });
    await app.close();
  });

  it("recusa código interno informado no cadastro de ativo", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "POST", url: "/v1/assets", headers: admin, payload: { internal_code: "MANUAL-1", description: "Notebook manual" } });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: "PROTECTED_FIELD" } });
    expect(resources.create).not.toHaveBeenCalled();
    await app.close();
  });

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

  it("recusa alteração do código interno do ativo", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "PATCH", url: "/v1/assets/50000000-0000-4000-8000-000000000002", headers: admin, payload: { internal_code: "MANUAL-2" } });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: "PROTECTED_FIELD" } });
    expect(resources.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("recusa código manual de produto no cadastro", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "POST", url: "/v1/stock/products", headers: admin, payload: { code: "PRD-MANUAL", name: "Teclado", unit: "UN" } });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: "PROTECTED_FIELD" } });
    expect(resources.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("recusa alteração do código de produto", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({ method: "PATCH", url: "/v1/stock/products/50000000-0000-4000-8000-000000000002", headers: admin, payload: { code: "PRD-MANUAL" } });
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

describe("Cadastros com identificadores PostgreSQL", () => {
  const admin = { host: "tenant-a.localhost", authorization: "Bearer token-a" };

  it("aceita a matrícula UUID legada do administrador ao cadastrar motorista", async () => {
    const resources = new FakeResourceService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({
      method: "POST",
      url: "/v1/fleet/drivers",
      headers: admin,
      payload: {
        membership_id: "22222222-2222-2222-2222-222222222222",
        license_number: "QA-CNH-001",
        category: "B",
        expires_at: "2028-09-24"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(resources.create).toHaveBeenCalledWith(
      "vehicle_drivers",
      tenantA.tenantId,
      tenantA.userId,
      expect.objectContaining({ membership_id: "22222222-2222-2222-2222-222222222222" })
    );
    await app.close();
  });

  it("permite marcar uma notificação global como lida", async () => {
    const resources = new FakeResourceService();
    resources.list.mockResolvedValueOnce({
      linhas: [{ id: "50000000-0000-4000-8000-000000000001", user_id: null }],
      total: 1
    });
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), resourceService: resources });
    const response = await app.inject({
      method: "POST",
      url: "/v1/notifications/50000000-0000-4000-8000-000000000001/read",
      headers: admin
    });

    expect(response.statusCode).toBe(200);
    expect(resources.update).toHaveBeenCalledWith(
      "notifications",
      tenantA.tenantId,
      tenantA.userId,
      "50000000-0000-4000-8000-000000000001",
      expect.objectContaining({ read_at: expect.any(String) as unknown })
    );
    await app.close();
  });
});

describe("Cadastro direto de usuários", () => {
  it("lista usuários com busca, paginação e total", async () => {
    const users = new FakeUserAdminService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), userAdminService: users });
    const response = await app.inject({
      method: "GET",
      url: "/v1/users?busca=ana&pagina=2&tamanho=10",
      headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [], total: 25, pagina: 2, tamanho: 10 });
    expect(users.list).toHaveBeenCalledWith(tenantA.tenantId, { busca: "ana", pagina: 2, tamanho: 10 });
    await app.close();
  });

  it("cria usuário diretamente com senha inicial", async () => {
    const users = new FakeUserAdminService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), userAdminService: users });
    const response = await app.inject({
      method: "POST",
      url: "/v1/users",
      headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" },
      payload: { email: "novo@empresa.com", full_name: "Novo Usuário", password: "senha-segura", roles: ["employee"] }
    });
    expect(response.statusCode).toBe(201);
    expect(users.create).toHaveBeenCalledWith(
      tenantA.tenantId,
      tenantA.userId,
      expect.objectContaining({ email: "novo@empresa.com", fullName: "Novo Usuário", password: "senha-segura", roles: ["employee"] })
    );
    const body: unknown = JSON.parse(response.body);
    expect(body).toMatchObject({ data: { status: "active", email: "novo@empresa.com" } });
    if (typeof body === "object" && body !== null && "data" in body) expect(body.data).not.toHaveProperty("password");
    await app.close();
  });

  it("recusa cadastro direto por colaborador", async () => {
    const users = new FakeUserAdminService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), userAdminService: users });
    const response = await app.inject({
      method: "POST",
      url: "/v1/users",
      headers: { host: "tenant-a.localhost", authorization: "Bearer token-colaborador" },
      payload: { email: "novo@empresa.com", full_name: "Novo Usuário", password: "senha-segura", roles: ["employee"] }
    });
    expect(response.statusCode).toBe(403);
    expect(users.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("recusa senha curta antes da persistência", async () => {
    const users = new FakeUserAdminService();
    const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), userAdminService: users });
    const response = await app.inject({
      method: "POST",
      url: "/v1/users",
      headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" },
      payload: { email: "novo@empresa.com", full_name: "Novo Usuário", password: "curta", roles: ["employee"] }
    });
    expect(response.statusCode).toBe(422);
    expect(users.create).not.toHaveBeenCalled();
    await app.close();
  });
});
