# Progresso do MVP

## Concluído

- [x] Sprint 0 — monorepo, Next.js, Fastify, Worker, Supabase, Redis, Auth, multi-tenancy, RLS, auditoria e white-label básico.
- [x] Sprint 1 — estrutura empresarial, usuários, convites, papéis e fornecedores.
- [x] Sprint 2 — categorias, ativos, arquivos privados e QR Code individual/em lote.
- [x] Sprint 3 — movimentações imutáveis, termos, aceite, PDF e validação pública.
- [x] Sprint 4 — garantias, alertas, ordens, planos e custos de manutenção.
- [x] Sprint 5 — produtos, locais, lotes, saldos, entradas, saídas, transferências e requisições transacionais.
- [x] Sprint 6 — veículos, motoristas, autorizações, reservas, retiradas, devoluções, quilometragem e checklists.
- [x] Sprint 7 — abastecimentos, despesas, multas e ocorrências.
- [x] Sprint 8 — campanhas, lista esperada, leitura QR, divergências e encerramento.
- [x] Sprint 9 (base comercial) — painel global, provisionamento de tenants, domínios, planos, limites, módulos, saúde, jobs e logs.
- [x] CSV/XLSX auditado, dashboard, notificações internas, agenda horária e SMTP opcional.
- [x] Campos relacionais com seletores carregados pela API nas principais operações.
- [x] Ações contextuais para termos, QR, etiquetas, anexos, inventários, requisições e relatórios.
- [x] Lint, TypeScript, testes, builds de produção e 43 testes pgTAP aprovados.

## Ajustes antes de homologação

- [ ] Evoluir seletores simples para busca assíncrona quando o volume de cadastros exigir.
- [ ] Adicionar progresso e prévia ao upload já vinculado automaticamente ao registro.
- [ ] Completar teste end-to-end autenticado no navegador em desktop e mobile.
- [ ] Configurar SMTP real e validar entregabilidade.
- [ ] Executar homologação com usuários de cada papel e medir metas de desempenho/acessibilidade.
- [ ] Configurar domínio, TLS, backups, observabilidade e CI/CD do ambiente de produção.

Uma funcionalidade só deve ser marcada como homologada após validação por usuário responsável, mesmo quando implementação e testes automatizados já estiverem concluídos.
