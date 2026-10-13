# Fechamento das funcionalidades incompletas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Entregar dashboards de módulo, saúde, jobs, permissões, listagens administrativas paginadas e e-mails de alertas funcionais, com testes e documentação atualizados.

**Architecture:** Implementar seis fatias verticais na ordem de dependência definida na especificação. SQL/RPCs permanecem a fonte dos agregados e da deduplicação; Fastify valida contexto, módulos e consultas; o worker registra jobs e publica e-mails; o Next.js renderiza os contratos tipados com componentes server/client pequenos. As alterações devem conviver com o working tree já modificado, sem resetar ou sobrescrever mudanças anteriores.

**Tech Stack:** TypeScript estrito, Fastify, Zod, Next.js App Router, React, Recharts, Supabase PostgreSQL/RLS/PostgREST, BullMQ, Redis, Vitest, pgTAP, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-25-funcionalidades-incompletas-design.md`

## Global Constraints

- A implementação parte da branch nova criada a partir do estado atual de `feat/redesenho-e-cadastros`; as alterações não commitadas existentes não serão revertidas nem incluídas automaticamente no commit desta especificação.
- O tenant usado em consultas tenant-scoped continuará sendo resolvido pelo contexto autenticado; nenhum `tenant_id` vindo do cliente será usado para autorizar acesso.
- O service role permanecerá restrito à API e ao worker.
- Migrations serão aditivas e versionadas em `supabase/migrations`; Prisma não será introduzido.
- Templates de e-mail serão criados desabilitados (`enabled = false`). Nenhum e-mail será publicado até um administrador habilitar o evento.
- O endpoint geral `GET /v1/dashboard` continuará estável; os dashboards de módulo usarão um endpoint novo e não alterarão o contrato já consumido pelo painel geral.
- Jobs sem tenant representam processamento da plataforma. A coluna `background_jobs.tenant_id` aceitará `NULL`, e a política RLS existente continuará impedindo que membros autenticados vejam linhas sem tenant; o worker/API com service role poderá gravá-las e o painel da plataforma poderá consultá-las.
- Históricos de jobs e notificações de e-mail serão preservados; deduplicação será feita por consulta/constraint lógica, sem apagar histórico.
- Não executar `git reset`, `git checkout --`, `git clean`, `git stash` ou qualquer operação que descarte o working tree.
- Antes de escrever produção em cada fatia, escrever um teste que falhe pelo comportamento ausente e executar o teste para confirmar a falha esperada.

## Working-tree safety

Antes da primeira implementação, registrar somente em memória a saída de `git status --short --branch` e `git diff --stat`. Os arquivos já modificados incluem rotas, serviços, componentes web, documentação e migrations que se sobrepõem ao escopo. Ao editar um desses arquivos, preservar todo o comportamento já presente e revisar `git diff` para separar mentalmente a alteração nova das mudanças anteriores. Não adicionar o conjunto inteiro ao stage; esta execução pode permanecer sem commits para não incorporar trabalho anterior por acidente.

### Task 1: Dashboard de módulo — contrato SQL e API

**Files:**
- Create: `supabase/migrations/20260925000100_module_dashboard_metrics.sql`
- Create: `supabase/tests/module_dashboard_metrics.sql`
- Modify: `apps/api/src/services/dashboard-service.ts`
- Modify: `apps/api/src/modules/dashboard/routes.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/test/dashboard-service.test.ts`
- Modify: `apps/api/test/app.test.ts`

**Interfaces:**
- Consumes: `target_tenant_id` derivado de `request.tenantContext`, `DashboardService.metrics()` existente e tabelas dos domínios de negócio.
- Produces: `DashboardModule = "patrimonio" | "almoxarifado" | "frota"`; `DashboardModuleResult = { module, metrics, distribution, monthly }`; `DashboardService.moduleMetrics(tenantId, module)`; `GET /v1/dashboard/:module`.

- [x] **Step 1: Escrever o teste de serviço para o novo RPC.**

Em `apps/api/test/dashboard-service.test.ts`, mockar `globalThis.fetch` e exigir URL, método, corpo e parsing:

```ts
const response = new Response(JSON.stringify({
  module: "patrimonio",
  metrics: { total: 2, in_use: 1, available: 1, maintenance: 0, value: 1000 },
  distribution: [{ key: "in_use", label: "Em uso", value: 1 }],
  monthly: [{ month: "2026-09", label: "set/26", values: { movements: 1 } }]
}), { status: 200, headers: { "Content-Type": "application/json" } });
vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

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
```

- [x] **Step 2: Executar o teste e confirmar RED.**

Run: `pnpm --filter @inner-almox/api test -- dashboard-service.test.ts`

Expected: FAIL porque `moduleMetrics` e o RPC ainda não existem. Se falhar antes por import/setup, corrigir o teste até a mensagem apontar para a interface ausente.

- [x] **Step 3: Escrever o teste de rota para módulo válido e inválido.**

Adicionar em `apps/api/test/app.test.ts` um fake de `DashboardService` com `metrics` e `moduleMetrics` espiáveis. Cobrir:

```ts
it("carrega dashboard do módulo usando o tenant do contexto", async () => {
  const dashboard = {
    metrics: vi.fn(async () => ({})),
    moduleMetrics: vi.fn(async (_tenantId: string, module: string) => ({
      module,
      metrics: { total: 2 },
      distribution: [],
      monthly: []
    }))
  } satisfies DashboardService;
  const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), dashboardService: dashboard });

  const response = await app.inject({
    method: "GET",
    url: "/v1/dashboard/patrimonio",
    headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ data: { module: "patrimonio", metrics: { total: 2 }, distribution: [], monthly: [] } });
  expect(dashboard.moduleMetrics).toHaveBeenCalledWith(tenantA.tenantId, "patrimonio");
  await app.close();
});

it("recusa módulo de dashboard desconhecido", async () => {
  const dashboard = { metrics: vi.fn(async () => ({})), moduleMetrics: vi.fn(async () => ({})) } satisfies DashboardService;
  const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), dashboardService: dashboard });
  const response = await app.inject({ method: "GET", url: "/v1/dashboard/desconhecido", headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" } });
  expect(response.statusCode).toBe(422);
  expect(dashboard.moduleMetrics).not.toHaveBeenCalled();
  await app.close();
});
```

- [x] **Step 4: Executar os testes de rota e confirmar RED.**

Run: `pnpm --filter @inner-almox/api test -- app.test.ts`

Expected: os dois testes novos falham porque a rota ainda só aceita `/v1/dashboard` e o contrato não foi implementado; os testes anteriores continuam executáveis.

- [x] **Step 5: Criar a migration SQL do agregado.**

Em `20260925000100_module_dashboard_metrics.sql`, criar `get_module_metrics(target_tenant_id uuid, module text) returns jsonb` como `security definer`, `stable`, `set search_path = ''`, revogar execução pública e conceder apenas a `service_role`.

Implementar as três branches com `jsonb_build_object` e séries geradas por `generate_series(current_date - interval '5 months', current_date, interval '1 month')`, sempre restringindo por `tenant_id = target_tenant_id`:

```sql
-- Forma comum esperada pela API:
jsonb_build_object(
  'module', module,
  'metrics', jsonb_build_object(...),
  'distribution', coalesce((select jsonb_agg(...)), '[]'::jsonb),
  'monthly', coalesce((select jsonb_agg(... order by month_start)), '[]'::jsonb)
)
```

Usar os status já presentes nas migrations existentes: `in_use`, `available`, `in_maintenance`/`awaiting_maintenance` para patrimônio; saldo agregado de `stock_balances`, categorias de `stock_products`, tipos de entrada/saída de `stock_movements` para almoxarifado; `available`/`in_use` e `vehicle_documents` para frota. Para custo mensal, somar `vehicle_fuelings.total_amount`, `vehicle_expenses.amount` e `vehicle_fines.amount`. A função deve retornar zeros e arrays vazios quando não houver registros.

- [x] **Step 6: Criar o teste pgTAP do agregado.**

Em `supabase/tests/module_dashboard_metrics.sql`, inserir fixtures determinísticas em dois tenants, chamar a função com o tenant A e validar com `is()`/`ok()` que:

```sql
select is((public.get_module_metrics('12000000-0000-0000-0000-000000000001','patrimonio')->'metrics'->>'total')::integer, 1, 'module dashboard counts only tenant assets');
select is(public.get_module_metrics('12000000-0000-0000-0000-000000000001','almoxarifado')->'metrics'->>'products_active', '1', 'stock metrics expose active products');
select is(public.get_module_metrics('12000000-0000-0000-0000-000000000001','frota')->'metrics'->>'total', '1', 'fleet metrics expose tenant vehicles');
select throws_ok($$select public.get_module_metrics('12000000-0000-0000-0000-000000000001','invalid')$$, '22023', 'unsupported dashboard module', 'unknown modules are rejected');
```

Usar `begin; ... rollback;` e os UUIDs/roles já utilizados nos testes existentes; não depender do estado do banco local.

- [x] **Step 7: Implementar o contrato TypeScript e a rota.**

Em `dashboard-service.ts`, definir os tipos dos quatro campos, adicionar `moduleMetrics` à interface e às classes Supabase/unconfigured. A implementação deve POSTar para `/rest/v1/rpc/get_module_metrics`, rejeitar resposta que não seja objeto JSON e lançar `DASHBOARD_FAILED`/`INVALID_DASHBOARD_RESPONSE` como o método geral.

Em `dashboard/routes.ts`, adicionar:

```ts
const dashboardModule = z.enum(["patrimonio", "almoxarifado", "frota"]);
app.get("/v1/dashboard/:module", { preHandler: requireTenantContext(contextResolver) }, async (request) => {
  const context = request.tenantContext;
  if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
  const params = dashboardModule.safeParse((request.params as { module?: string }).module);
  if (!params.success) throw new AppError("Módulo de dashboard inválido.", 422, "INVALID_DASHBOARD_MODULE");
  return { data: await dashboardService.moduleMetrics(context.tenantId, params.data) };
});
```

Registrar nada além do serviço já injetado por `buildApp`; o endpoint geral deve continuar chamando `metrics` sem alteração de contrato.

- [x] **Step 8: Executar os testes verdes da fatia.**

Run: `pnpm --filter @inner-almox/api test -- dashboard-service.test.ts app.test.ts`

Expected: testes do serviço e das duas rotas passam; o teste SQL ficará para `pnpm db:test` após todas as migrations da execução.

### Task 2: Dashboards de módulo — interface web

**Files:**
- Create: `apps/web/components/dashboard/monthly-bar-chart.tsx`
- Modify: `apps/web/components/dashboard/status-donut.tsx`
- Modify: `apps/web/components/modules/module-dashboard.tsx`
- Modify: `apps/web/components/modules/module-dashboard.test.tsx`
- Modify: `apps/web/lib/format.ts` only if a formatter existente não cobrir o valor exibido

**Interfaces:**
- Consumes: `fetchTenantRecord("dashboard/${domain}")` e `DashboardModuleResult` serializável.
- Produces: cartões, distribuição e barras mensais reais para os três domínios, com estado vazio determinístico.

- [x] **Step 1: Escrever testes web que exigem o endpoint específico e dados reais.**

Atualizar `apps/web/components/modules/module-dashboard.test.tsx` para mockar o retorno comum:

```ts
fetchTenantRecordMock.mockResolvedValue({
  module: "patrimonio",
  metrics: { total: 4, in_use: 2, available: 1, maintenance: 1, value: 2500 },
  distribution: [
    { key: "in_use", label: "Em uso", value: 2 },
    { key: "available", label: "Disponíveis", value: 1 },
    { key: "maintenance", label: "Em manutenção", value: 1 }
  ],
  monthly: [{ month: "2026-09", label: "set/26", values: { movements: 3 } }]
});
const markup = renderToStaticMarkup(await ModuleDashboard({ domain: "patrimonio" }));
expect(fetchTenantRecordMock).toHaveBeenCalledWith("dashboard/patrimonio");
expect(markup).toContain(">4<");
expect(markup).toContain("Evolução no período");
expect(markup).toContain("Em manutenção");
expect(markup).not.toContain("Os indicadores serão calculados a partir das movimentações reais.");
```

Adicionar casos equivalentes para estoque (`stock_value`, `products_active`, `below_minimum`, `batches_expiring`) e frota (`vehicles`, `available`, `in_use`, `expired_documents`, `cost`), além de um caso de resposta nula que exibe zeros sem lançar exceção.

- [x] **Step 2: Executar os testes web e confirmar RED.**

Run: `pnpm --filter @inner-almox/web test -- components/modules/module-dashboard.test.tsx`

Expected: falha porque o componente ainda chama `fetchTenantRecord("dashboard")` e usa os campos planos do dashboard geral.

- [x] **Step 3: Criar o gráfico mensal isolado como componente client-side.**

Em `monthly-bar-chart.tsx`, usar `"use client"` e `BarChart`, `Bar`, `CartesianGrid`, `ResponsiveContainer`, `Tooltip`, `XAxis` e `YAxis` do Recharts. Definir:

```ts
export interface MonthlySeriesPoint {
  month: string;
  label: string;
  values: Record<string, number>;
}

export function MonthlyBarChart({ data, series }: {
  data: MonthlySeriesPoint[];
  series: Array<{ key: string; label: string; color: string }>;
}) { /* renderiza uma barra por série e uma mensagem quando todos os valores são zero */ }
```

Não fazer fetch no client; todos os dados devem ser props da página server-side. Escapar séries ausentes com `0` e manter o gráfico responsivo.

- [x] **Step 4: Generalizar `StatusDonut` e substituir o texto provisório.**

Adicionar uma prop opcional `unidade?: string` ao `StatusDonut`, com default `ativos`, para estoque/frota não exibirem texto incorreto. Reescrever `ModuleDashboard` com um mapa de configuração por domínio: títulos, ação, labels dos cinco cartões, cores, chaves das métricas e séries mensais. Usar `formatarMoeda`/`formatarNumero` em vez de `String(...)`, e construir a distribuição diretamente da resposta RPC.

O estado vazio deve renderizar os mesmos cartões com zero, o `StatusDonut` vazio e a mensagem `Cadastre registros para ver aqui a distribuição.`. Não manter o componente de linha fixa nem “Aguardando dados”.

- [x] **Step 5: Executar testes, typecheck e build web.**

Run: `pnpm --filter @inner-almox/web test -- components/modules/module-dashboard.test.tsx`

Expected: PASS.

Run: `pnpm --filter @inner-almox/web typecheck`

Expected: PASS sem erros de tipos Recharts/React.

### Task 3: Jobs — schema e registro no worker

**Files:**
- Create: `supabase/migrations/20260925000200_background_jobs_registry.sql`
- Create: `supabase/tests/background_jobs_registry.sql`
- Create: `apps/worker/src/services/job-registry.ts`
- Create: `apps/worker/src/services/job-events.ts`
- Create: `apps/worker/test/job-registry.test.ts`
- Create: `apps/worker/test/job-events.test.ts`
- Modify: `apps/worker/src/worker.ts`
- Modify: `apps/worker/src/processors/alerts.ts`
- Modify: `apps/worker/test/foundation.test.ts`

**Interfaces:**
- Consumes: `Job` do BullMQ, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, resultado/erro dos três workers.
- Produces: `JobRegistry`, `attachJobEvents`, linhas `background_jobs` com `processing/completed/failed`, e registros por tenant da varredura.

- [x] **Step 1: Escrever testes RED do registry.**

Criar `job-registry.test.ts` com `fetch` mockado. O teste de início deve esperar um POST a `background_jobs` com `queue`, `type`, `external_job_id`, `tenant_id`, `attempts`, `status: "processing"` e `started_at`; o teste de conclusão deve usar o ID retornado pelo primeiro POST e esperar PATCH com `status: "completed"`, `result` e `completed_at`; o teste de falha deve persistir somente `error_message` truncada e `status: "failed"`.

O teste por tenant deve chamar:

```ts
await registry.recordTenantScan({
  queue: "inner-almox-alert-refresh",
  type: "refresh-tenant-alerts",
  externalJobId: "job-1:tenant-1",
  tenantId: "10000000-0000-0000-0000-000000000001",
  attempts: 1,
  status: "completed",
  result: { notifications: 2 }
});
expect(fetchMock).toHaveBeenCalledWith("http://supabase.local/rest/v1/background_jobs", expect.objectContaining({ method: "POST" }));
```

- [x] **Step 2: Executar o teste do registry e confirmar RED.**

Run: `pnpm --filter @inner-almox/worker test -- job-registry.test.ts`

Expected: FAIL porque os arquivos e métodos do registry ainda não existem.

- [x] **Step 3: Escrever testes RED dos handlers de eventos.**

Em `job-events.test.ts`, criar um fake de worker com `on(event, handler)` e um fake registry. Chamar `attachJobEvents(fakeWorker, "foundation-validation", registry)` e invocar os handlers capturados com um job que tenha `id`, `name`, `data.tenantId`, `attemptsMade`, `opts.attempts`.

Asserções mínimas:

```ts
expect(registry.start).toHaveBeenCalledWith(expect.objectContaining({ queue: "foundation-validation", externalJobId: "42", type: "validate-foundation", tenantId: tenantA }));
expect(registry.complete).toHaveBeenCalledWith(expect.objectContaining({ externalJobId: "42", result: { accepted: true } }));
expect(registry.fail).toHaveBeenCalledWith(expect.objectContaining({ externalJobId: "42", error: expect.any(Error) }));
```

- [x] **Step 4: Executar os handlers e confirmar RED.**

Run: `pnpm --filter @inner-almox/worker test -- job-events.test.ts`

Expected: FAIL por ausência de `attachJobEvents` e da interface do registry.

- [x] **Step 5: Aplicar a migration do schema.**

Em `20260925000200_background_jobs_registry.sql`, executar:

```sql
alter table public.background_jobs alter column tenant_id drop not null;
create index if not exists background_jobs_created_at_idx on public.background_jobs (created_at desc);
```

Não remover a foreign key nem afrouxar as políticas RLS. Em `supabase/tests/background_jobs_registry.sql`, inserir uma linha com `tenant_id null`, confirmar que ela é aceita para `service_role`, e confirmar que uma sessão `authenticated` sem tenant não enxerga a linha. Usar `begin/rollback`.

- [x] **Step 6: Implementar `JobRegistry` com PostgREST.**

Criar tipos explícitos para `JobLifecycleInput`, `JobTenantScanInput` e `JobRegistry`. O construtor deve normalizar a URL e montar headers com service role. `start` fará POST `Prefer: return=representation`, guardará o UUID retornado, e `complete`/`fail` farão PATCH filtrando por `id`. Quando o ID não estiver no mapa em memória, consultar `queue=eq...&external_job_id=eq...&order=created_at.desc&limit=1` antes do PATCH. Limitar `error_message` a 2000 caracteres e serializar somente dados JSON seguros.

- [x] **Step 7: Implementar `attachJobEvents` e conectar os três workers.**

`attachJobEvents` deve registrar `active`, `completed` e `failed`, usando `job.name` como tipo, `String(job.id)` como ID externo e `job.attemptsMade + 1` como tentativas. Capturar erros do registry com log estruturado sem interromper o handler original.

Em `worker.ts`, criar um registry compartilhado quando Supabase estiver configurado, anexá-lo a `worker`, `notificationWorker` e `alertWorker`, e fechá-lo no shutdown se houver recursos. O worker deve continuar iniciando mesmo sem credenciais apenas quando o fluxo anterior já permitia; nesse caso o registry vira no-op explícito.

- [x] **Step 8: Registrar cada tenant na varredura de alertas.**

Alterar `createAlertRefreshProcessor` para receber um `jobRegistry` opcional. Depois de cada `refresh_tenant_alerts` bem-sucedido, chamar `recordTenantScan` com `tenantId`, `queue: ALERT_REFRESH_QUEUE`, `type: "refresh-tenant-alerts"`, ID externo `${job.id}:${tenantId}`, status `completed` e o contador retornado. Se a chamada desse tenant falhar, gravar status `failed` com a mensagem e relançar o erro. Atualizar o teste do processador para cobrir dois tenants e exigir duas linhas derivadas.

- [x] **Step 9: Executar testes do worker.**

Run: `pnpm --filter @inner-almox/worker test`

Expected: testes existentes e novos passam, sem chamadas reais a Redis/SMTP/Supabase.

### Task 4: Saúde real da plataforma

**Files:**
- Create: `apps/api/src/services/platform-health-service.ts`
- Create: `apps/api/test/platform-health-service.test.ts`
- Modify: `apps/api/src/services/redis-queue-publisher.ts`
- Modify: `apps/api/src/modules/platform/routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/test/app.test.ts`
- Modify: `apps/web/lib/columns.ts`
- Modify: `apps/web/lib/module-catalog.ts`

**Interfaces:**
- Consumes: `RedisQueuePublisher.ping()`, Supabase REST/Storage com service role, `PlatformAdminService.authorize()`.
- Produces: `PlatformHealthService.check(): Promise<HealthLine[]>`; `GET /v1/platform/health` com uma linha por dependência.

- [x] **Step 1: Escrever teste RED do serviço de probes.**

Criar `platform-health-service.test.ts` com probes injetáveis. Cobrir sucesso total e falha isolada:

```ts
const result = await service.check();
expect(result).toHaveLength(4);
expect(result.map((line) => line.servico)).toEqual(["Banco", "Redis", "Storage", "Worker"]);
expect(result.every((line) => line.estado === "healthy")).toBe(true);
expect(result.every((line) => typeof line.latencia_ms === "number" && line.latencia_ms >= 0)).toBe(true);

redisProbe.mockRejectedValueOnce(new Error("ECONNREFUSED"));
const degraded = await service.check();
expect(degraded.find((line) => line.servico === "Redis")).toMatchObject({ estado: "failed" });
expect(degraded.filter((line) => line.servico !== "Redis").every((line) => line.estado === "healthy")).toBe(true);
```

- [x] **Step 2: Executar o teste e confirmar RED.**

Run: `pnpm --filter @inner-almox/api test -- platform-health-service.test.ts`

Expected: FAIL porque o serviço de probes e `HealthLine` ainda não existem.

- [x] **Step 3: Expor `ping` sem quebrar o publisher.**

Adicionar a `RedisQueuePublisher`:

```ts
async ping(): Promise<void> {
  await this.connection.connect().catch((error) => {
    if (!String(error).includes("already connecting") && !String(error).includes("already open")) throw error;
  });
  const result = await this.connection.ping();
  if (result !== "PONG") throw new Error("Redis não respondeu PONG.");
}
```

Preferir uma interface pequena `RedisHealthProbe` para o serviço não depender da classe concreta; o método `close()` existente deve continuar funcionando.

- [x] **Step 4: Implementar as quatro probes independentes.**

Em `platform-health-service.ts`, definir `HealthState = "healthy" | "degraded" | "failed"` e `HealthLine`. Medir cada probe com `performance.now()`, converter duração para `Math.round`, e executar com `Promise.all`/`Promise.allSettled`. Banco consulta `tenants?select=id&limit=1`; Storage consulta `storage/v1/bucket/tenant-documents`; Worker consulta `background_jobs?select=completed_at&status=eq.completed&completed_at=gte.${isoUmaHoraAtras}&order=completed_at.desc&limit=1`. Se não houver job recente, retornar `degraded`; exceções de qualquer probe retornam `failed` apenas para aquela linha.

- [x] **Step 5: Conectar o serviço à rota com fake injetável.**

Adicionar `platformHealthService?: PlatformHealthService` a `BuildAppOptions`, criar a implementação Supabase quando as credenciais existirem e uma implementação não configurada que retorne quatro linhas `failed` quando não existirem. Alterar `platformRoutes` para receber o serviço e trocar o objeto fixo por `await platformHealthService.check()` depois de `admin(request)`.

Adicionar teste em `app.test.ts` que injeta um fake, chama `/v1/platform/health` com o token de plataforma aceito pelo fake e confirma que o retorno é `{ data: [ ...4 linhas ] }`, sem consultar o objeto hard-coded.

- [x] **Step 6: Atualizar a tela de saúde.**

Em `columns.ts`, adicionar `latencia_ms` à rota `superadmin/saude` como `tipo: "numero"` e marcar `verificado_em` como `tipo: "datahora"`. Em `module-catalog.ts`, mapear `"superadmin/saude": "platform/health"`. Manter os códigos `servico`, `estado`, `latencia_ms`, `verificado_em` no retorno para `DataTable`.

- [x] **Step 7: Executar testes da API e typecheck.**

Run: `pnpm --filter @inner-almox/api test -- platform-health-service.test.ts app.test.ts`

Expected: PASS.

Run: `pnpm --filter @inner-almox/api typecheck`

Expected: PASS.

### Task 5: Matriz de permissões somente leitura

**Files:**
- Create: `apps/web/lib/permissions.ts`
- Create: `apps/web/lib/permissions.test.ts`
- Create: `apps/web/components/modules/permissions-matrix.tsx`
- Create: `apps/web/components/modules/permissions-matrix.test.tsx`
- Modify: `apps/web/components/modules/module-page.tsx`
- Modify: `apps/web/lib/module-catalog.ts`
- Modify: `apps/web/lib/columns.ts`

**Interfaces:**
- Consumes: oito papéis do PRD §7 e páginas `{ data, total }` de `/v1/users`.
- Produces: `rolePermissions`, `PermissionsMatrix`, contagem real por papel e ausência da ação `Novo perfil`.

- [x] **Step 1: Escrever testes RED do catálogo.**

Em `permissions.test.ts`, importar `rolePermissions` e testar exatamente oito chaves e as ações principais:

```ts
expect(Object.keys(rolePermissions)).toHaveLength(8);
expect(rolePermissions.tenant_admin.modules).toContainEqual(expect.objectContaining({ key: "admin", actions: expect.arrayContaining(["Gerenciar usuários", "Gerenciar permissões"]) }));
expect(rolePermissions.asset_manager.modules).toContainEqual(expect.objectContaining({ key: "patrimonio", actions: expect.arrayContaining(["Cadastrar ativos", "Executar inventários"]) }));
expect(rolePermissions.auditor.modules).toContainEqual(expect.objectContaining({ key: "auditoria", actions: expect.arrayContaining(["Visualizar históricos", "Exportar relatórios autorizados"]) }));
expect(getModuleDefinition("admin/permissoes").primaryAction).toBeUndefined();
```

- [x] **Step 2: Executar e confirmar RED.**

Run: `pnpm --filter @inner-almox/web test -- lib/permissions.test.ts`

Expected: FAIL porque o catálogo não existe e a ação ainda está no catálogo atual.

- [x] **Step 3: Implementar o catálogo estático.**

Criar tipos `PermissionRole`, `PermissionModule` e `RolePermissionDefinition`. Preencher os oito papéis com as ações do PRD §7, agrupando por `admin`, `patrimonio`, `almoxarifado`, `frota`, `manutencao`, `setor` e `auditoria`. Não incluir mutações para `auditor`; não incluir perfis customizados, formulário ou endpoint CRUD.

- [x] **Step 4: Escrever teste RED do componente.**

Mockar `fetchTenantCollection` para devolver duas páginas:

```ts
fetchTenantCollectionMock
  .mockResolvedValueOnce({ data: [{ roles: ["tenant_admin", "employee"] }], total: 3, available: true })
  .mockResolvedValueOnce({ data: [{ roles: ["employee", "auditor"] }, { roles: ["asset_manager"] }], total: 3, available: true });
const markup = renderToStaticMarkup(await PermissionsMatrix());
expect(fetchTenantCollectionMock).toHaveBeenNthCalledWith(1, "users", { pagina: "1", tamanho: "100" });
expect(fetchTenantCollectionMock).toHaveBeenNthCalledWith(2, "users", { pagina: "2", tamanho: "100" });
expect(markup).toContain("tenant_admin");
expect(markup).toContain(">2<");
expect(markup).toContain("asset_manager");
```

- [x] **Step 5: Executar e confirmar RED.**

Run: `pnpm --filter @inner-almox/web test -- components/modules/permissions-matrix.test.tsx`

Expected: FAIL porque o componente e a coleta paginada ainda não existem.

- [x] **Step 6: Implementar `PermissionsMatrix` e integrar a rota.**

Implementar helper server-side que busca `/v1/users` em páginas de 100 até `pagina * tamanho >= total`, agregando `roles` sem confiar em nomes de campos alternativos. Renderizar cartão por papel com nome, descrição, total e lista de módulos/ações em HTML sem botões de mutação.

Em `ModulePage`, antes do fluxo de `DataTable`, retornar `<PermissionsMatrix />` para `admin/permissoes`. Remover `primaryAction: "Novo perfil"` e a entrada de `admin/permissoes` do fluxo de coleção. Manter as colunas como fallback apenas para não quebrar imports, sem renderizá-las.

- [x] **Step 7: Executar testes web.**

Run: `pnpm --filter @inner-almox/web test -- lib/permissions.test.ts components/modules/permissions-matrix.test.tsx`

Expected: PASS.

### Task 6: Busca e paginação em Usuários

**Files:**
- Create: `supabase/migrations/20260925000300_user_listing_pagination.sql`
- Create: `supabase/tests/user_listing_pagination.sql`
- Create: `apps/api/test/user-admin-pagination.test.ts`
- Modify: `apps/api/src/services/user-admin-service.ts`
- Modify: `apps/api/src/modules/users/routes.ts`
- Modify: `apps/api/test/app.test.ts`
- Modify: `apps/web/lib/columns.ts`
- Modify: `apps/web/components/modules/module-page.tsx`

**Interfaces:**
- Consumes: `target_tenant_id`, `busca`, `pagina`, `tamanho`.
- Produces: `UserListOptions`, `ListResult`, RPC `list_tenant_users(uuid, text)` e resposta `{ data, total, pagina, tamanho }`.

- [x] **Step 1: Escrever testes RED da lista de usuários no serviço.**

Em `user-admin-pagination.test.ts`, mockar primeiro uma resposta com `Content-Range: 0-1/5` e uma linha. Chamar:

```ts
const result = await service.list("10000000-0000-0000-0000-000000000001", { busca: "ana", pagina: 2, tamanho: 1 });
expect(result).toEqual({ linhas: [expect.objectContaining({ full_name: "Ana" })], total: 5 });
expect(fetchMock).toHaveBeenCalledWith(
  "http://supabase.local/rest/v1/rpc/list_tenant_users?limit=1&offset=1",
  expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ target_tenant_id: "10000000-0000-0000-0000-000000000001", search: "ana" }),
    headers: expect.objectContaining({ prefer: "count=exact" })
  })
);
```

- [x] **Step 2: Executar e confirmar RED.**

Run: `pnpm --filter @inner-almox/api test -- user-admin-pagination.test.ts`

Expected: FAIL porque `list` ainda recebe apenas tenant e retorna array.

- [x] **Step 3: Escrever testes RED da rota.**

Alterar o fake `UserAdminService` para retornar `ListResult` e adicionar em `app.test.ts`:

```ts
const response = await app.inject({
  method: "GET",
  url: "/v1/users?busca=ana&pagina=2&tamanho=10",
  headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" }
});
expect(response.json()).toEqual({ data: [], total: 25, pagina: 2, tamanho: 10 });
expect(users.list).toHaveBeenCalledWith(tenantA.tenantId, { busca: "ana", pagina: 2, tamanho: 10 });
```

- [x] **Step 4: Implementar migration e pgTAP da RPC.**

Em `20260925000300_user_listing_pagination.sql`, `drop function public.list_tenant_users(uuid)`, criar `list_tenant_users(target_tenant_id uuid, search text default null)` com o mesmo conjunto de colunas, aplicar `ilike` em `full_name`, `auth.users.email` e `employee_number`, e manter `where m.tenant_id = target_tenant_id`. Revogar execução pública e conceder a `service_role`.

Em `user_listing_pagination.sql`, inserir três usuários, chamar a RPC com busca `ana`, e testar que somente o nome/e-mail/matrícula correspondente aparece. Usar a função antiga apenas para fixtures se necessário, antes da nova migration não é permitido; o teste roda sobre todo o schema migrado.

- [x] **Step 5: Implementar o serviço e rota.**

Adicionar:

```ts
export interface UserListOptions { busca?: string; pagina?: number; tamanho?: number }
export interface UserListResult { linhas: ResourcePayload[]; total: number }
list(tenantId: string, options?: UserListOptions): Promise<UserListResult>;
```

No serviço, normalizar tamanho entre 1 e 100, página mínima 1, POSTar a RPC com `limit`/`offset` na query string, `Prefer: count=exact`, e extrair o total de `Content-Range`. Na rota, validar query com Zod (`busca` string até 120, `pagina`/`tamanho` inteiros positivos), chamar o serviço com contexto e devolver `{ data: linhas, total, pagina, tamanho }`.

- [x] **Step 6: Adaptar o web sem reintroduzir busca falsa.**

Garantir que `fetchTenantCollection("users", parametros)` preserve `total` da resposta e que `ModulePage` passe `busca`, `pagina`, `tamanho` para `admin/usuarios`. Remover `admin/usuarios` de `rotasSemBusca`. A tabela deve exibir busca, paginação e o total real.

- [x] **Step 7: Executar os testes da lista.**

Run: `pnpm --filter @inner-almox/api test -- user-admin-pagination.test.ts app.test.ts`

Expected: PASS.

### Task 7: Busca e paginação no painel da plataforma

**Files:**
- Create: `apps/api/src/services/platform-query-config.ts`
- Create: `apps/api/test/platform-admin-service.test.ts`
- Modify: `apps/api/src/services/platform-admin-service.ts`
- Modify: `apps/api/src/modules/platform/routes.ts`
- Modify: `apps/api/test/app.test.ts`
- Modify: `apps/web/lib/columns.ts`
- Modify: `apps/web/lib/module-catalog.ts`
- Modify: `apps/web/components/modules/module-page.tsx`

**Interfaces:**
- Consumes: `PlatformCollection`, query `{ busca, ordenar, direcao, pagina, tamanho }`.
- Produces: `PlatformListOptions`, `PlatformListResult`, whitelist por coleção e resposta comum de coleção.

- [x] **Step 1: Escrever teste RED da whitelist.**

Em `platform-admin-service.test.ts`, mockar resposta `Content-Range: 0-1/4` e chamar `list("tenants", { busca: "inner", ordenar: "legal_name", direcao: "asc", pagina: 2, tamanho: 2 })`. Exigir URL com `select=*`, `legal_name.ilike.*inner*`, `slug.ilike.*inner*`, `order=legal_name.asc.nullslast`, `limit=2`, `offset=2`, e header `prefer: count=exact`. Adicionar teste que um campo `ordenar=senha` cai na ordem padrão e nunca aparece na query.

- [x] **Step 2: Executar e confirmar RED.**

Run: `pnpm --filter @inner-almox/api test -- platform-admin-service.test.ts`

Expected: FAIL porque `PlatformAdminService.list` ainda aceita somente a coleção e fixa `limit=200`.

- [x] **Step 3: Implementar configuração e consulta administrativa.**

Criar `platform-query-config.ts` com `select`, `pesquisaveis`, `ordenaveis` e `ordemPadrao` para `tenants`, `tenant_domains`, `platform_plans`, `tenant_modules`, `background_jobs` e `platform_audit_logs`. Usar exatamente:

```ts
tenants: ["legal_name", "slug"]
tenant_domains: ["hostname"]
platform_plans: ["code", "name"]
tenant_modules: ["module_key"]
background_jobs: ["queue", "type"]
platform_audit_logs: ["action", "entity_type"]
```

Montar `or=(campo.ilike.*termo*,...)` somente com campos da whitelist, escapar `,()"*\\`, e ignorar ordenação desconhecida. Usar `Prefer: count=exact`, ler `Content-Range` e retornar `{ linhas, total }`.

- [x] **Step 4: Atualizar a interface, serviço e rota.**

Alterar `PlatformAdminService.list(collection, options)` para retornar `ListResult`. Em `platform/routes.ts`, validar query params com um schema compartilhado, chamar `platformService.list` e devolver `{ data: linhas, total, pagina, tamanho }`. A rota de health deve continuar chamando o serviço de saúde e devolver suas quatro linhas; se receber busca/paginação, filtrar/paginar somente as quatro linhas em memória para que a tabela não exiba controles enganosos.

- [x] **Step 5: Ligar todas as nove rotas do catálogo.**

Remover `admin/usuarios`, `admin/permissoes`, `superadmin/tenants`, `superadmin/dominios`, `superadmin/planos`, `superadmin/modulos`, `superadmin/saude`, `superadmin/jobs` e `superadmin/logs` de `rotasSemBusca`. Manter `admin/permissoes` como exceção visual de `PermissionsMatrix`. Adicionar `latencia_ms` e `verificado_em` às colunas de saúde, garantir `superadmin/saude -> platform/health`, e não adicionar endpoint CRUD para permissões.

- [x] **Step 6: Executar testes da plataforma e web.**

Run: `pnpm --filter @inner-almox/api test -- platform-admin-service.test.ts app.test.ts`

Expected: PASS.

Run: `pnpm --filter @inner-almox/web test -- lib/module-catalog.test.ts lib/module-path.test.ts components/modules/permissions-matrix.test.tsx`

Expected: PASS, incluindo a ausência de `primaryAction` de permissões e a presença dos endpoints administrativos.

### Task 8: E-mail de alertas e deduplicação

**Files:**
- Create: `supabase/migrations/20260925000400_alert_email_delivery.sql`
- Create: `supabase/tests/alert_email_delivery.sql`
- Create: `apps/worker/test/alerts.test.ts`
- Modify: `apps/worker/src/processors/alerts.ts`
- Modify: `apps/worker/src/worker.ts`
- Modify: `apps/worker/src/queues/notifications.ts` only if the publisher input needs a shared type
- Modify: `apps/worker/test/notifications.test.ts`

**Interfaces:**
- Consumes: `refresh_tenant_alerts`, `notification_templates`, `notifications`, membership roles, `auth.users.email`.
- Produces: `pending_alert_emails(uuid)`, um job `email-alert` por destinatário na fila `inner-almox-notifications`, e nenhuma duplicata na segunda varredura.

- [x] **Step 1: Escrever o teste pgTAP RED da RPC e dedupe.**

Em `alert_email_delivery.sql`, criar um tenant com administrador, gestor de patrimônio e gestor de estoque, inserir duas notificações internas do dia e templates de e-mail inicialmente desabilitados. Testar que a RPC retorna zero com templates desabilitados; habilitar somente `warranty_expiry` e testar um destinatário administrador e o `asset_manager`, sem duplicar quem acumula os papéis. Inserir uma notificação `channel = 'email'` para um destinatário, chamar novamente e confirmar que ele não aparece.

Asserções mínimas:

```sql
select is((select count(*) from public.pending_alert_emails('12000000-0000-0000-0000-000000000001')), 0::bigint, 'disabled email templates do not produce jobs');
select is((select count(*) from public.pending_alert_emails('12000000-0000-0000-0000-000000000001')), 2::bigint, 'enabled warranty template returns admin and asset manager');
select is((select count(*) from public.pending_alert_emails('12000000-0000-0000-0000-000000000001') where recipient_email = 'admin@example.com'), 1::bigint, 'administrator receives one email');
```

- [x] **Step 2: Executar o teste SQL e confirmar RED.**

Run: `pnpm db:test -- --file supabase/tests/alert_email_delivery.sql` (ou o comando equivalente aceito pela versão local da Supabase CLI).

Expected: FAIL porque a RPC não existe. Se a CLI não aceitar filtro de arquivo, rodar `pnpm db:test` após adicionar o arquivo e confirmar que a falha é da função ausente.

- [x] **Step 3: Implementar migration da RPC e templates.**

Criar `pending_alert_emails(target_tenant_id uuid)` como `security definer`, retornando `notification_id`, `tenant_id`, `user_id`, `recipient_email`, `type`, `title`, `message`, `subject`, `body`, `entity_type` e `entity_id`. Filtrar notificações internas criadas no dia, template habilitado e ausência de uma linha de e-mail para o mesmo tenant, usuário, tipo, entidade e data. Construir recipients por `tenant_admin` e pelo gestor de domínio (`asset_manager` para `warranty_expiry`, `warehouse_manager` para `low_stock`) usando `distinct` e `auth.users.email`.

Semear em todos os tenants existentes os eventos `warranty_expiry` e `low_stock` com `channel = 'email'`, assunto/corpo padrão e `enabled = false`, usando `on conflict (tenant_id,event_key,channel) do nothing`. Acrescentar os mesmos defaults ao fluxo `provision_tenant` para novos tenants, sem habilitar.

- [x] **Step 4: Escrever teste RED do publisher de e-mail.**

Em `apps/worker/test/alerts.test.ts`, mockar três respostas: tenants, refresh RPC e `pending_alert_emails` com dois destinatários. Injetar `publishNotification = vi.fn(async () => "mail-job")` e exigir duas chamadas com `channel: "email"`, destinatários distintos, `type`, título, mensagem, entidade e tenant corretos. Executar o processador duas vezes com a segunda RPC vazia e exigir que o publisher não seja chamado novamente.

- [x] **Step 5: Executar e confirmar RED.**

Run: `pnpm --filter @inner-almox/worker test -- alerts.test.ts`

Expected: FAIL porque o processador ainda não chama `pending_alert_emails` nem recebe um publisher.

- [x] **Step 6: Injetar publisher na varredura e ligar à fila.**

Alterar `createAlertRefreshProcessor` para aceitar:

```ts
publishNotification?: (input: NotificationJobInput) => Promise<string>;
```

Após cada `refresh_tenant_alerts`, chamar `POST /rest/v1/rpc/pending_alert_emails` com `target_tenant_id`. Para cada linha, exigir `recipient_email` e publicar um `NotificationJobInput` com `channel: "email"`; se o publisher não estiver configurado, não fingir envio: lançar erro configuracional quando houver pendências.

Em `worker.ts`, criar `const notificationQueue = new Queue<NotificationJobInput>(NOTIFICATION_QUEUE, { connection })`, passar `input => notificationQueue.add("email-alert", input, { attempts: 3, backoff: { type: "exponential", delay: 1000 } })` ao processador de alertas e fechar a fila no shutdown. O consumidor existente continuará responsável por SMTP e persistência da linha `notifications`.

- [x] **Step 7: Executar testes do worker e do banco.**

Run: `pnpm --filter @inner-almox/worker test`

Expected: PASS, incluindo notificação interna existente, publisher de dois destinatários e dedupe.

Run: `pnpm db:test`

Expected: PASS para as migrations e testes pgTAP existentes e novos.

### Task 9: Documentação e verificação integrada

**Files:**
- Modify: `docs/API.md`
- Modify: `docs/DATABASE.md`
- Modify: `docs/TASKS.md`
- Modify: `docs/AUDITORIA-MVP.md`
- Modify: `apps/api/test/app.test.ts` only for final contract assertions that remain uncovered
- Modify: `infra/scripts/acceptance.mjs` only if the existing acceptance flow needs the new endpoint shape

**Interfaces:**
- Consumes: contratos implementados nas tarefas 1–8.
- Produces: documentação sincronizada e evidência de lint, typecheck, testes, banco, build e acceptance.

- [x] **Step 1: Atualizar API e banco com os contratos finais.**

Em `docs/API.md`, documentar `GET /v1/dashboard/:module`, `GET /v1/platform/health`, `GET /v1/users` com `busca/pagina/tamanho`, e os retornos de listagem `{ data, total, pagina, tamanho }`. Em `docs/DATABASE.md`, documentar `get_module_metrics`, `list_tenant_users(uuid,text)`, `pending_alert_emails`, `background_jobs.tenant_id` anulável e o índice por `created_at`.

- [x] **Step 2: Atualizar progresso sem marcar homologação manual como concluída.**

Em `docs/TASKS.md`, marcar como implementadas as buscas/paginação administrativas, dashboards de módulo, jobs/saúde, permissões e e-mail, mas manter pendentes homologação por papel, acessibilidade/desempenho, SMTP real e produção. Em `docs/AUDITORIA-MVP.md`, fechar A3, A4 e A5 somente como resolvidas por implementação automatizada, registrando que os cenários manuais da seção “Fora desta etapa” continuam fora.

- [x] **Step 3: Rodar as verificações completas.**

Run: `pnpm lint`

Expected: exit 0 e nenhum erro ESLint.

Run: `pnpm typecheck`

Expected: exit 0 em API, web e worker.

Run: `pnpm test`

Expected: todos os testes Vitest passam.

Run: `pnpm db:test`

Expected: todos os testes pgTAP passam, incluindo isolamento e dedupe.

Run: `pnpm build`

Expected: builds de API, web e worker passam.

Run: `node --env-file=.env infra/scripts/acceptance.mjs`

Expected: roteiro de aceite existente passa sem regressões.

- [ ] **Step 4: Executar smoke tests funcionais locais (parcial; jornadas autenticadas e homologação manual pendentes).**

Com Redis, Supabase, API, worker e web locais ativos:

1. Abrir `/patrimonio`, `/almoxarifado` e `/frota`; cadastrar um ativo descartável e confirmar o total e a série alterados.
2. Aguardar ou disparar a varredura; abrir `/superadmin/jobs` e confirmar job global, linhas por tenant e uma falha persistida quando o worker falhar controladamente.
3. Abrir `/superadmin/saude`, parar somente Redis, recarregar e confirmar uma linha `Redis` `failed` sem impedir as outras três.
4. Abrir `/admin/permissoes` e confirmar oito cartões e contagens compatíveis com `/admin/usuarios`.
5. Pesquisar/paginar em `/admin/usuarios` e `/superadmin/tenants` encontrando registros fora da primeira página.
6. Habilitar `warranty_expiry`, rodar a varredura, confirmar mensagem no Mailpit e linha `channel = 'email'`; repetir a varredura e confirmar nenhum segundo envio.

Não remover os ativos locais `AT-TESTE-01` e `AT-NOTAS-01` nesta tarefa, pois a especificação de origem deixou essa limpeza para decisão separada.

- [x] **Step 5: Revisar diff sem incorporar o baseline.**

Run: `git diff --check`

Expected: sem whitespace errors.

Run: `git status --short --branch`

Expected: branch `feat/funcionalidades-incompletas`, arquivos do baseline ainda presentes e arquivos novos/modificados desta implementação identificáveis.

Run: `git diff --stat`

Expected: alterações restritas às superfícies listadas neste plano, além das alterações pré-existentes já registradas antes da execução.

Se algum arquivo pré-existente aparecer como sobrescrito além das linhas necessárias, parar e revisar o diff antes de continuar; não usar comandos destrutivos para “limpar” o resultado.
