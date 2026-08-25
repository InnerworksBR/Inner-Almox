# Registro de decisões

## ADR-001 — Perfis globais e memberships por tenant

**Status:** aceita. O PRD define `profiles` globais e `tenant_memberships` por empresa. O usuário é identificado por `auth.users.id`; papéis pertencem à membership, nunca ao perfil global.

## ADR-002 — Resolução pública e limitada de domínio

**Status:** aceita. A API precisa descobrir o tenant antes de consultar a membership. A função `resolve_tenant_context` é `security definer`, aceita apenas hostname, exige domínio verificado/tenant ativo e retorna exclusivamente ID, slug, nomes e branding. Nenhum dado de negócio é exposto.

## ADR-003 — Escritas administrativas somente pelo backend

**Status:** aceita. Embora o Supabase permita acesso direto, a Sprint 0 concede a usuários apenas leituras protegidas e atualização do próprio perfil. Provisionamento, memberships, branding e auditoria usarão Fastify com autorização explícita e service role server-side.

## ADR-004 — Variáveis públicas do Next.js

**Status:** aceita. `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `API_URL` do PRD são server-side. Next.js precisa de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_API_URL` para incorporar valores permitidos no browser. A service role não possui equivalente público.

## ADR-005 — Supabase CLI e Redis não duplicados

**Status:** aceita. Supabase local é iniciado pela CLI oficial, enquanto `docker-compose.yml` inicia Redis. Isso evita dois bancos/PostgREST/Auth concorrentes e segue a orientação da tarefa.

## ADR-006 — Pacotes futuros permanecem sem abstrações prematuras

**Status:** aceita. Os diretórios previstos no PRD existem e documentam sua finalidade, mas só receberão código quando houver reutilização concreta entre aplicações.

## ADR-007 — pnpm como fallback de orquestração local

**Status:** aceita. O Turborepo permanece configurado e disponível nos scripts `*:turbo`, mas os comandos padrão usam a recursão nativa do pnpm. Essa decisão evita que políticas locais do Windows que bloqueiem o binário nativo do Turbo impeçam todo o desenvolvimento. API e worker carregam opcionalmente o `.env` da raiz com `node --env-file-if-exists`. O Next.js carrega o mesmo arquivo em `next.config.ts`, pois argumentos `--env-file` não são permitidos no `NODE_OPTIONS` de seus processos filhos. Não há dependência de `dotenv` nem duplicação de credenciais.

## ADR-008 — Operações críticas em funções SQL transacionais

**Status:** aceita. Movimentações, transferências, inventários, termos e atendimento de requisições podem alterar múltiplos registros. Essas regras são executadas em funções PostgreSQL chamadas pelo Fastify para garantir atomicidade, bloqueios consistentes, saldo não negativo e histórico auditável.

## ADR-009 — Leitura sensível ao papel dentro do tenant

**Status:** aceita. RLS por `tenant_id` é necessária, mas não suficiente para dados pessoais. Colaboradores veem somente ativos atribuídos, termos emitidos, requisições próprias e notificações próprias ou gerais. Perfis de gestão e auditoria recebem visibilidade ampliada conforme o domínio operacional.

## ADR-010 — Upload direto com autorização temporária

**Status:** aceita. A API valida tenant, papel, entidade e caminho antes de emitir uma URL assinada. O navegador envia o binário diretamente ao Storage e registra os metadados pela API. Isso reduz carga no Fastify sem expor a service role.
