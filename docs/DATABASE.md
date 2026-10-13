# Banco de dados

PostgreSQL é gerenciado pelo Supabase. Não há Prisma; o esquema completo vive em `supabase/migrations`.

## Domínios

- Fundação: tenants, domínios, branding, settings, módulos, profiles, memberships, roles e auditoria.
- Organização: filiais, setores, centros de custo, localizações e fornecedores.
- Patrimônio: categorias, ativos, campos personalizados, arquivos, movimentações, termos, garantias e manutenção.
- Almoxarifado: produtos, locais, lotes, saldos, movimentações e requisições com itens.
- Frota: veículos, motoristas, autorizações, reservas, utilizações, checklists, combustível, despesas, multas, ocorrências e documentos.
- Inventário e plataforma: campanhas/itens, notificações/templates, jobs, administradores globais, planos e auditoria global.

As funções de consulta principais incluem `get_module_metrics(uuid,text)` para os dashboards por
módulo, `list_tenant_users(uuid,text)` para usuários com busca por nome/e-mail/matrícula e
`pending_alert_emails(uuid)` para destinatários de e-mail ainda não enviados. Templates de e-mail
para `warranty_expiry` e `low_stock` são criados desabilitados por padrão.

`background_jobs.tenant_id` é anulável para execuções de plataforma; a FK para `tenants` permanece
ativa quando o valor é informado. O índice `background_jobs_created_at_idx` sustenta consultas
recentes de jobs e a probe de saúde do worker. A RLS continua impedindo que sessões autenticadas
leiam jobs sem tenant.

Toda tabela de negócio possui `tenant_id`. Relacionamentos importantes usam `(tenant_id, id)` em foreign keys compostas, impedindo vínculos cruzados mesmo pela service role.

## Regras no banco

- Movimentações patrimoniais e de estoque são imutáveis.
- Saídas não geram saldo negativo, inclusive quando a linha de saldo ainda não existe: o gatilho materializa o saldo, valida e só então grava.
- Transferências debitam e creditam na mesma transação.
- Quilometragem nunca regride.
- Retirada valida disponibilidade, CNH, categoria, autorização e documentos.
- Requisições respeitam uma máquina de estados e o atendimento não supera a quantidade aprovada.
- Inventários materializam o esperado, reconciliam QR Codes e registram ausências/divergências.
- Termos possuem snapshot e código único de validação.
- Auditorias tenant e plataforma são imutáveis.
- Códigos internos de filiais, setores, centros de custo, localizações, estoques e produtos são gerados pelo banco, isolados por tenant e imutáveis; o mesmo vale para o código interno dos ativos.

## RLS e Storage

RLS está habilitado em todas as tabelas expostas. Policies são deny-by-default e verificam membership ativa. Ativos, movimentações patrimoniais, termos, requisições, itens de requisição e notificações também aplicam escopo por papel/usuário dentro do próprio tenant. `anon` acessa somente funções públicas explicitamente concedidas. O bucket `tenant-documents` é privado; upload e download usam autorização Fastify e URLs assinadas curtas, com caminho iniciado pelo UUID do tenant.

## Migrations e testes

As migrations `20260819*` implementam a fundação. As `20260824*` adicionam organização, domínios de negócio, usuários, operações críticas, métricas, workflows, painel global, transferências e requisições. As `20260924*` e `20260925*` completam códigos internos, métricas de módulo, registro de jobs, paginação de usuários e entrega deduplicada de alertas por e-mail.

Testes pgTAP:

- `rls_isolation.sql`: isolamento A/B e privilégios.
- `business_rules.sql`: saldo, transferência, imutabilidade e quilometragem.
- `mvp_workflows.sql`: termos, inventários, alertas, checklists e requisições.
- `role_scoped_reads.sql`: privacidade entre usuários do mesmo tenant.
- `stock_inventory.sql`: contagem física, divergência e produto inesperado.
- `internal_code.sql`: geração, isolamento por tenant e imutabilidade dos códigos internos.
- `module_dashboard_metrics.sql`: métricas e séries mensais dos três módulos.
- `background_jobs_registry.sql`: jobs globais, FK, índice e isolamento.
- `user_listing_pagination.sql`: busca da RPC de usuários.
- `alert_email_delivery.sql`: templates, destinatários por papel e deduplicação de e-mail.

Execute com `pnpm db:test` enquanto o Supabase local estiver ativo.
