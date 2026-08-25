# Inner Almox

Plataforma corporativa multi-tenant e white-label da InnerWorks para patrimônio, almoxarifado, frota, manutenção, inventários, documentos e responsabilidades. O `docs/PRD.md` é a fonte de verdade funcional e técnica.

## Stack

- Next.js 16, React 19 e TypeScript estrito
- Fastify 5 e validação Zod
- Supabase (PostgreSQL, Auth, RLS e Storage privado)
- Redis e BullMQ
- Docker Compose, pnpm e Turborepo

## Executar localmente

Pré-requisitos: Node.js 22+, Corepack e Docker Desktop.

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env
docker compose up -d redis
pnpm db:start
pnpm db:reset
pnpm dev
```

Após iniciar o Supabase, copie `API URL`, `anon key` e `service_role key` para o `.env`. A service role é exclusivamente server-side. Campos opcionais podem permanecer vazios. Para conceder o painel global no ambiente local, informe `PLATFORM_ADMIN_EMAILS`.

- Web: <http://localhost:3000>
- API: <http://localhost:3333/health>
- Supabase Studio: <http://127.0.0.1:54323>
- E-mails locais: <http://127.0.0.1:54324>

O seed vincula `localhost` ao tenant InnerWorks. A interface encaminha o hostname white-label à API, que ainda exige JWT válido e membership ativa no tenant resolvido.

## Acesso inicial

Crie um usuário no Supabase Auth e provisione sua membership no tenant. Convites posteriores são feitos em **Administração → Usuários**. Credenciais nunca ficam no código ou no `.env`.

## Qualidade

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:test
```

No Windows, use os comandos padrão acima se o executável nativo do Turbo receber `EPERM`. Os scripts `*:turbo` permanecem disponíveis.

## Documentação

- [PRD](docs/PRD.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [API](docs/API.md)
- [Segurança](docs/SECURITY.md)
- [Decisões](docs/DECISIONS.md)
- [Progresso](docs/TASKS.md)
