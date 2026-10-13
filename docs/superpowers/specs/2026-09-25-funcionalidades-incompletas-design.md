# Fechamento das funcionalidades incompletas — Design

> Especificação derivada de `C:/Users/CristianPaxur/Downloads/Funcionalidades-Incompletas.md`.
> O arquivo de origem é tratado como requisito de produto; suas instruções operacionais não
> substituem as regras de `AGENTS.md`.

**Data:** 25/09/2026  
**Branch de implementação:** `feat/funcionalidades-incompletas`  
**Fonte de verdade funcional:** `docs/PRD.md` e a lista de funcionalidades incompletas

## Objetivo

Fechar as lacunas que deixam dashboards, saúde, jobs, permissões, listagens administrativas e
notificações de e-mail sem comportamento funcional, preservando o isolamento multi-tenant, as
operações críticas no Fastify e o histórico auditável.

## Escopo

1. Dashboards reais de Patrimônio, Almoxarifado e Frota.
2. Saúde real de banco, Redis, Storage e Worker.
3. Registro do ciclo de vida dos jobs e das varreduras por tenant.
4. Matriz somente leitura dos oito perfis definidos no PRD §7.
5. Busca, ordenação e paginação server-side em Usuários e no painel da plataforma.
6. Publicação e deduplicação de notificações de e-mail.
7. Testes críticos e documentação de API, banco, tarefas e auditoria.

## Fora do escopo

- Progresso e prévia de upload de anexos.
- Criação ou edição de perfis personalizados.
- Homologação manual por papel, metas de desempenho/acessibilidade e preparação de produção.
- Domínio, TLS, SMTP real, backups, observabilidade e CI/CD de produção.
- Merge ou abertura de Pull Request do trabalho anterior.

## Decisões e invariantes

- A implementação parte da branch nova criada a partir do estado atual de
  `feat/redesenho-e-cadastros`; as alterações não commitadas existentes não serão revertidas nem
  incluídas automaticamente no commit desta especificação.
- O tenant usado em consultas tenant-scoped continuará sendo resolvido pelo contexto autenticado;
  nenhum `tenant_id` vindo do cliente será usado para autorizar acesso.
- O service role permanecerá restrito à API e ao worker.
- Migrations serão aditivas e versionadas em `supabase/migrations`; Prisma não será introduzido.
- Templates de e-mail serão criados desabilitados (`enabled = false`). Nenhum e-mail será publicado
  até um administrador habilitar o evento.
- O endpoint geral `GET /v1/dashboard` continuará estável; os dashboards de módulo usarão um
  endpoint novo e não alterarão o contrato já consumido pelo painel geral.
- Jobs sem tenant representam processamento da plataforma. A coluna `background_jobs.tenant_id`
  aceitará `NULL`, e a política RLS existente continuará impedindo que membros autenticados vejam
  linhas sem tenant; o worker/API com service role poderá gravá-las e o painel da plataforma poderá
  consultá-las.
- Históricos de jobs e notificações de e-mail serão preservados; deduplicação será feita por
  consulta/constraint lógica, sem apagar histórico.

## Arquitetura proposta

### 1. Dashboards de módulo

Adicionar uma função SQL `get_module_metrics(target_tenant_id uuid, module text)` que valide o
módulo e retorne um objeto JSONB estável:

```json
{
  "module": "patrimonio",
  "metrics": {
    "total": 0,
    "in_use": 0,
    "available": 0,
    "maintenance": 0,
    "value": 0
  },
  "distribution": [
    { "key": "in_use", "label": "Em uso", "value": 0 }
  ],
  "monthly": [
    { "month": "2026-04", "label": "abr/26", "values": { "total": 0 } }
  ]
}
```

O conjunto de chaves varia por módulo, mas a forma permanece a mesma:

- Patrimônio: total, em uso, disponíveis, em manutenção e valor; distribuição de status; contagem
  mensal de movimentações.
- Almoxarifado: valor em estoque, produtos ativos, abaixo do mínimo e lotes vencendo; distribuição
  por categoria; entradas e saídas mensais.
- Frota: veículos, disponíveis, em uso e documentos vencidos; distribuição por status; custos
  mensais somando abastecimentos, despesas e multas.

A API adicionará `GET /v1/dashboard/:module`, validando `module` com `z.enum` antes de chamar o
serviço. O serviço continuará usando PostgREST/RPC com service role e validará a forma mínima da
resposta antes de entregá-la.

No web, `ModuleDashboard` consumirá o endpoint específico do domínio. Os cartões usarão os
formatadores existentes, a distribuição será exibida com `StatusDonut` e a série mensal será um
gráfico de barras isolado em componente client-side para manter a página principal como componente
de servidor. O estado vazio exibirá zeros e uma mensagem contextual, sem texto fixo que simule
dados futuros.

### 2. Jobs e saúde

Criar `apps/worker/src/services/job-registry.ts` como único adaptador de persistência de jobs. Ele
usará PostgREST e oferecerá operações equivalentes a:

- registrar o início (`processing`) com fila, tipo, `external_job_id`, payload sanitizado, tentativas
  e `started_at`;
- atualizar conclusão (`completed`) com resultado e `completed_at`;
- atualizar falha (`failed`) com mensagem limitada, tentativas e `completed_at`;
- registrar uma execução derivada por tenant durante a varredura de alertas.

Os três `Worker` de `apps/worker/src/worker.ts` compartilharão o registry nos eventos `active`,
`completed` e `failed`. O identificador externo será o ID do BullMQ; atualizações localizarão a linha
criada no início e terão fallback seguro para não perder uma conclusão após reinício do processo.
O registry nunca gravará credenciais nem payloads sensíveis.

A migration de jobs fará `tenant_id` aceitar nulo e criará índice em `created_at`. O processador de
alertas manterá a varredura atual, mas registrará uma linha tenant-scoped para cada tenant consultado,
com status e resultado próprios.

Criar um serviço de probes na API, injetável em `buildApp`, com quatro verificações independentes:

| Serviço | Verificação |
|---|---|
| Banco | `GET /rest/v1/tenants?select=id&limit=1` |
| Redis | `ping` na conexão mantida por `RedisQueuePublisher` |
| Storage | leitura do bucket `tenant-documents` |
| Worker | último `background_jobs.completed_at` concluído dentro da última hora |

Cada probe mede a duração com `performance.now()`. A execução usa `Promise.allSettled`, retorna uma
linha por serviço com `servico`, `estado`, `latencia_ms` e `verificado_em`, e nunca cancela as outras
linhas quando uma dependência falha. `healthy` representa sucesso; `degraded` representa worker sem
execução recente; `failed` representa erro de consulta/conexão. O painel usa o catálogo existente
para mapear `superadmin/saude` para `platform/health` e inclui a coluna de latência.

### 3. Permissões

Criar `apps/web/lib/permissions.ts` com os oito papéis do PRD:

`tenant_admin`, `asset_manager`, `warehouse_manager`, `fleet_manager`, `maintenance_manager`,
`department_manager`, `employee` e `auditor`.

O catálogo será somente leitura e organizará cada papel por módulos e ações textuais transcritas do
PRD §7. `PermissionsMatrix` exibirá um cartão por papel, as ações por módulo e a contagem de
usuários que possuem o papel. Para a contagem completa, o componente buscará páginas sucessivas de
`/v1/users` até alcançar o total retornado pela API. Nenhuma ação de criação, edição ou exclusão de
perfil será exposta.

`ModulePage` tratará `admin/permissoes` como componente próprio. O item deixará de possuir
`primaryAction: "Novo perfil"` e não será tratado como uma coleção CRUD.

### 4. Busca e paginação

Usuários passarão a usar um contrato comum de listagem:

```json
{ "data": [], "total": 0, "pagina": 1, "tamanho": 25 }
```

`list_tenant_users` será substituída por uma assinatura que recebe `target_tenant_id` e texto de
busca, filtrando `full_name`, e-mail e matrícula. A API aplicará limite/offset na chamada RPC,
enviará `Prefer: count=exact`, lerá `Content-Range` e limitará tamanho/página de forma consistente
com `TenantResourceService`.

O `PlatformAdminService` passará a receber busca, ordenação, direção, página e tamanho. Um mapa
backend-only definirá por coleção os campos permitidos:

- tenants: razão social e slug;
- domínios: hostname;
- planos: código e nome;
- módulos: chave do módulo;
- jobs: fila e tipo;
- logs: ação e entidade.

O serviço montará apenas filtros whitelisted, usará `Prefer: count=exact` e devolverá o mesmo
contrato de listagem. As rotas validarão query params com Zod. As nove entradas atuais de
`rotasSemBusca` sairão do conjunto; permissões será uma exceção visual própria e saúde continuará
retornando somente suas quatro linhas, com paginação visual de uma página.

### 5. E-mail de alertas

Uma migration criará `pending_alert_emails(target_tenant_id uuid)`, retornando notificações do dia
que possuem template de e-mail habilitado e ainda não têm uma linha correspondente em
`notifications` com `channel = 'email'`. O resultado conterá o evento, título, mensagem, assunto,
corpo e destinatário.

Os destinatários serão:

- todos os membros ativos com `tenant_admin`;
- o gestor do domínio do evento, quando aplicável (`asset_manager` para garantia e
  `warehouse_manager` para estoque), sem duplicar pessoas que já sejam administradoras.

A migration semeará, para tenants existentes, templates de `warranty_expiry` e `low_stock` com
`enabled = false`. A função de provisionamento de tenant também garantirá esses defaults para novos
tenants sem habilitá-los.

O processador de alertas chamará a RPC após `refresh_tenant_alerts` e publicará um job em
`inner-almox-notifications` por destinatário, com `channel: "email"`. O consumidor SMTP existente
continuará enviando e gravando a notificação enviada; a RPC excluirá esses registros em execuções
subsequentes. Falhas de publicação devem fazer o ciclo do job de alertas falhar para serem visíveis
no registry, sem marcar o envio como concluído.

## Segurança e consistência

- Migrations concederão execução das novas funções somente a `service_role`.
- A função de métricas receberá o tenant já resolvido no Fastify; não confiará em tenant enviado pela
  URL ou body além do módulo validado.
- `background_jobs` sem tenant continuarão invisíveis ao papel `authenticated` pela condição RLS.
- Consultas de usuário manterão o `target_tenant_id` derivado do contexto da requisição.
- Campos de busca/ordenação serão whitelisted no backend para evitar injeção de operadores PostgREST.
- Mensagens de erro de jobs serão limitadas e não conterão segredos de conexão.
- A deduplicação de e-mail considerará tenant, evento, entidade, destinatário e data do alerta.

## Verificação

Testes automatizados a acrescentar ou atualizar:

- API: rota de dashboard por módulo, rejeição de módulo inválido, contratos de saúde, paginação e
  contagem de usuários, paginação/whitelist da plataforma.
- Worker: registry nos eventos, registro por tenant da varredura e publicação de um destinatário por
  alerta.
- Web: dashboard com métricas/status/série, matriz com os oito papéis e contagem de usuários,
  catálogo sem ação de perfil personalizado.
- Banco/pgTAP: métricas por módulo, `tenant_id` nulo em jobs, isolamento, RPC de usuários e
  `pending_alert_emails` sem duplicação após a segunda varredura.

Verificação final prevista:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm db:test
pnpm build
node --env-file=.env infra/scripts/acceptance.mjs
```

Além dos comandos, será feita validação funcional local para os três dashboards, jobs/saúde,
permissões, busca/paginação e deduplicação no Mailpit, conforme o roteiro da especificação de origem.

## Ordem de implementação

1. Dashboard de módulo e contrato SQL/API/web.
2. Registry de jobs, migration e integração do worker.
3. Probes de saúde e tela de saúde.
4. Matriz de permissões.
5. Busca/paginação de usuários e plataforma.
6. E-mail de alertas e deduplicação.
7. Documentação, testes integrados e verificação completa.
