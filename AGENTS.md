# Inner Almox — orientações para agentes

Antes de decisões de arquitetura ou regras de negócio, leia `docs/PRD.md`. O PRD é a principal fonte de verdade.

## Stack

- Next.js, React e TypeScript (App Router)
- Fastify e Node.js
- Supabase PostgreSQL, Auth, Storage e RLS
- Redis e BullMQ
- Docker e Docker Compose
- pnpm e Turborepo

## Regras obrigatórias

- Não utilizar Prisma.
- Manter migrations SQL versionadas em `supabase/migrations`.
- Toda tabela de negócio deve possuir `tenant_id`.
- Aplicar RLS deny-by-default quando pertinente.
- Nunca expor a service role no frontend.
- Manter lógica crítica e autorização no Fastify.
- Derivar e validar o tenant pelo domínio e contexto autenticado; não confiar no `tenant_id` do cliente.
- Impedir acesso entre tenants e adicionar testes para esse isolamento.
- Preservar históricos e auditar operações aplicáveis.
- Validar todas as entradas e tratar erros de maneira consistente.
- Manter TypeScript estrito, evitar `any`, duplicação e dependências desnecessárias.
- Adicionar testes para regras críticas e atualizar a documentação afetada.

## Definition of Done

Uma tarefa só está concluída quando compila, passa por lint, typecheck e testes relevantes, possui validação e tratamento de erros, respeita RLS/multi-tenancy e tem a documentação pertinente atualizada.
