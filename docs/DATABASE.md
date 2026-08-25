# Banco de dados

PostgreSQL é gerenciado pelo Supabase. Não há Prisma; o esquema completo vive em `supabase/migrations`.

## Domínios

- Fundação: tenants, domínios, branding, settings, módulos, profiles, memberships, roles e auditoria.
- Organização: filiais, setores, centros de custo, localizações e fornecedores.
- Patrimônio: categorias, ativos, campos personalizados, arquivos, movimentações, termos, garantias e manutenção.
- Almoxarifado: produtos, locais, lotes, saldos, movimentações e requisições com itens.
- Frota: veículos, motoristas, autorizações, reservas, utilizações, checklists, combustível, despesas, multas, ocorrências e documentos.
- Inventário e plataforma: campanhas/itens, notificações/templates, jobs, administradores globais, planos e auditoria global.

Toda tabela de negócio possui `tenant_id`. Relacionamentos importantes usam `(tenant_id, id)` em foreign keys compostas, impedindo vínculos cruzados mesmo pela service role.

## Regras no banco

- Movimentações patrimoniais e de estoque são imutáveis.
- Saídas não geram saldo negativo.
- Transferências debitam e creditam na mesma transação.
- Quilometragem nunca regride.
- Retirada valida disponibilidade, CNH, categoria, autorização e documentos.
- Requisições respeitam uma máquina de estados e o atendimento não supera a quantidade aprovada.
- Inventários materializam o esperado, reconciliam QR Codes e registram ausências/divergências.
- Termos possuem snapshot e código único de validação.
- Auditorias tenant e plataforma são imutáveis.

## RLS e Storage

RLS está habilitado em todas as tabelas expostas. Policies são deny-by-default e verificam membership ativa. Ativos, movimentações patrimoniais, termos, requisições, itens de requisição e notificações também aplicam escopo por papel/usuário dentro do próprio tenant. `anon` acessa somente funções públicas explicitamente concedidas. O bucket `tenant-documents` é privado; upload e download usam autorização Fastify e URLs assinadas curtas, com caminho iniciado pelo UUID do tenant.

## Migrations e testes

As migrations `20260819*` implementam a fundação. As `20260824*` adicionam organização, domínios de negócio, usuários, operações críticas, métricas, workflows, painel global, transferências e requisições.

Testes pgTAP:

- `rls_isolation.sql`: isolamento A/B e privilégios.
- `business_rules.sql`: saldo, transferência, imutabilidade e quilometragem.
- `mvp_workflows.sql`: termos, inventários, alertas, checklists e requisições.
- `role_scoped_reads.sql`: privacidade entre usuários do mesmo tenant.
- `stock_inventory.sql`: contagem física, divergência e produto inesperado.

Execute com `pnpm db:test` enquanto o Supabase local estiver ativo.
