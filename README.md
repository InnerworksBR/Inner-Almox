# Inner Almox — PRD Técnico

**Produto:** Inner Almox
**Empresa:** InnerWorks Soluções em Tecnologia
**Status:** Em desenvolvimento
**Versão:** 1.0

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
