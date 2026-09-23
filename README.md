# Inner Almox — PRD Técnico

**Produto:** Inner Almox
**Empresa:** InnerWorks Soluções em Tecnologia
**Status:** Em desenvolvimento
**Versão:** 1.0

> Vai rodar o projeto pela primeira vez? Comece em [12. Como rodar localmente](#12-como-rodar-localmente).

## 1. Visão

O **Inner Almox** é uma plataforma corporativa SaaS, multi-tenant e white-label para gestão centralizada de patrimônio, almoxarifado, manutenção, frota, inventário e documentos.

Cada empresa cliente será um tenant independente, com usuários, identidade visual, configurações e dados isolados.

---

## 2. Objetivo

Centralizar o controle de:

* Ativos e responsáveis;
* Localizações;
* Entradas, saídas e movimentações;
* Estoque e requisições;
* Garantias e manutenções;
* Veículos, quilometragem e despesas;
* Inventários;
* Documentos;
* Auditoria e relatórios.

---

## 3. Stack

### Front-end

* Next.js
* React
* TypeScript

### Backend

* Node.js
* Fastify
* TypeScript

### Dados

* Supabase PostgreSQL
* Supabase Auth
* Supabase Storage
* Row-Level Security

### Processamento

* Redis
* BullMQ

### Infraestrutura

* Docker
* pnpm
* Turborepo

---

## 4. Arquitetura

```text
Usuário
   ↓
Next.js
   ↓
Fastify API
   ↓
Supabase
```

Processamentos assíncronos serão executados por workers com Redis e BullMQ.

O projeto será organizado em monorepo:

```text
apps/
├── web
├── api
└── worker

packages/
supabase/
docs/
infra/
```

---

## 5. Multi-Tenant

Todas as tabelas de negócio deverão possuir:

```text
tenant_id
```

O isolamento entre empresas será garantido por:

* RLS no Supabase;
* validação no Fastify;
* autenticação e autorização;
* testes automatizados.

Nenhum tenant poderá acessar dados pertencentes a outro tenant.

---

## 6. Módulos Principais

### Patrimônio

Cadastro de ativos, localização, responsável, documentos, QR Code e movimentações.

### Almoxarifado

Produtos, estoque, entradas, saídas, transferências e requisições.

### Manutenção

Ordens de serviço, preventivas, corretivas, custos e histórico.

### Frota

Veículos, motoristas, retiradas, devoluções, checklists, quilometragem, abastecimentos e despesas.

### Inventário

Campanhas, leitura de QR Code, divergências e relatórios.

### Administração

Usuários, permissões, filiais, setores, centros de custo, fornecedores e configurações.

---

## 7. Segurança

Requisitos obrigatórios:

* HTTPS em produção;
* RLS;
* validação de entrada;
* controle de permissões;
* secrets fora do repositório;
* Service Role somente no backend;
* auditoria de operações críticas;
* isolamento entre tenants.

---

## 8. MVP

O MVP deverá entregar:

* autenticação;
* multi-tenant;
* white-label básico;
* usuários e permissões;
* estrutura empresarial;
* patrimônio;
* QR Code;
* movimentações;
* manutenção;
* almoxarifado;
* frota;
* inventário;
* alertas;
* dashboards;
* relatórios;
* auditoria.

---

## 9. Regras Técnicas

* Supabase será utilizado para banco e autenticação.
* Prisma não será utilizado.
* Migrations ficarão em `supabase/migrations`.
* Toda tabela de negócio possuirá `tenant_id`.
* Operações críticas deverão passar pelo Fastify.
* Service Role nunca poderá ser exposta no front-end.
* Movimentações e históricos críticos deverão ser preservados.
* Quilometragem não poderá regredir.
* Estoque negativo exigirá permissão específica.
* Processamentos pesados deverão utilizar filas.

---

## 10. Critério de Conclusão

Uma funcionalidade será considerada pronta quando:

* possuir validação;
* possuir tratamento de erros;
* respeitar permissões;
* respeitar isolamento por tenant;
* possuir RLS quando aplicável;
* possuir testes para regras críticas;
* funcionar em desktop e mobile;
* estiver documentada.

---

## 11. Resultado Esperado

O Inner Almox deverá permitir que a InnerWorks e futuros clientes controlem ativos, materiais e veículos durante todo o seu ciclo de vida, mantendo rastreabilidade, segurança, histórico e isolamento completo entre empresas.

---

## 12. Como rodar localmente

Pré-requisitos: Node.js 22 ou superior, Corepack e Docker Desktop em execução.

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env
docker compose up -d redis
pnpm db:start
pnpm db:reset
pnpm dev
```

Depois que o Supabase subir, copie `API URL`, `anon key` e `service_role key` para o `.env`. A
service role é exclusivamente server-side e nunca vai para o frontend. Campos opcionais podem ficar
vazios. Para liberar o painel global no ambiente local, preencha `PLATFORM_ADMIN_EMAILS`.

| Serviço | Endereço |
|---|---|
| Web | <http://localhost:3000> |
| API | <http://localhost:3333/health> |
| Supabase Studio | <http://127.0.0.1:54323> |
| E-mails locais | <http://127.0.0.1:54324> |

O seed vincula `localhost` ao tenant InnerWorks. A interface encaminha o hostname white-label à API,
que continua exigindo JWT válido e membership ativa no tenant resolvido.

### Primeiro acesso

Crie um usuário no Supabase Auth e provisione a membership no tenant. Os convites seguintes são
feitos em **Administração → Usuários**. Credenciais nunca ficam no código nem no `.env` versionado.

### Qualidade

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm db:test
pnpm build
```

O roteiro de aceitação do PRD roda com `node --env-file=.env infra/scripts/acceptance.mjs`.

No Windows, use os comandos acima se o executável nativo do Turbo devolver `EPERM`; os scripts
`*:turbo` continuam disponíveis. O `pnpm dev` do frontend usa webpack em vez de Turbopack, e o
motivo está registrado em [docs/DECISIONS.md](docs/DECISIONS.md).

---

## 13. Documentação

| Documento | Conteúdo |
|---|---|
| [PRD](docs/PRD.md) | Fonte de verdade funcional e técnica |
| [Arquitetura](docs/ARCHITECTURE.md) | Estrutura do monorepo e fluxo entre as aplicações |
| [Banco de dados](docs/DATABASE.md) | Tabelas, funções e políticas de RLS |
| [API](docs/API.md) | Rotas, parâmetros de consulta e formato dos erros |
| [Segurança](docs/SECURITY.md) | Multi-tenancy, papéis e isolamento |
| [Decisões](docs/DECISIONS.md) | Registros de decisão de arquitetura |
| [Progresso](docs/TASKS.md) | O que está pronto e o que falta |
| [Auditoria do MVP](docs/AUDITORIA-MVP.md) | Conferência dos critérios do PRD |
