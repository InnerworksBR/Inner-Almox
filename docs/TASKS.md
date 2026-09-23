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

## Redesenho da interface (23/09/2026)

- [x] Fundação em Tailwind 4 e shadcn/ui, com a paleta InnerWorks e suporte a tema claro e escuro.
- [x] Sidebar com ícones, grupos que abrem e fecham, modo recolhido no desktop e gaveta no celular.
- [x] Topbar com busca, alternância de tema, sino com contagem real e menu da conta.
- [x] Dashboard ligado aos indicadores reais, com gráfico de distribuição, pendências, movimentações recentes e atalhos.
- [x] Listagens migradas: colunas ligadas ao campo real, nomes no lugar de identificadores, status e
      datas em português, busca, ordenação e paginação server-side, e filtro próprio nas telas que
      compartilhavam endpoint.
- [x] Formulários de cadastro migrados: seletor de vínculo com busca no lugar dos campos de UUID,
      vínculos que faltavam acrescentados (o ativo agora nasce com categoria, filial, localização,
      setor, centro de custo, responsável e fornecedor), visual novo, observações gravadas e erro
      destacado no campo recusado, com mensagens em português.
- [ ] Levar busca e paginação também às rotas de usuários e do painel da plataforma.

## Ajustes antes de homologação

A [auditoria funcional](AUDITORIA-MVP.md) de 23/09/2026 aprovou 89 dos 94 critérios do PRD e
listou as correções por prioridade. As cinco falhas encontradas foram corrigidas no mesmo dia e o
roteiro passou a aprovar 95 de 95 critérios. Seguem pendentes as lacunas de interface: colunas que
não exibem o dado, listagens que compartilham endpoint, telas sem backend e dashboards de módulo.

- [ ] Adicionar progresso e prévia ao upload já vinculado automaticamente ao registro.
- [ ] Completar teste end-to-end autenticado no navegador em desktop e mobile.
- [ ] Configurar SMTP real e validar entregabilidade.
- [ ] Executar homologação com usuários de cada papel e medir metas de desempenho/acessibilidade.
- [ ] Configurar domínio, TLS, backups, observabilidade e CI/CD do ambiente de produção.

Uma funcionalidade só deve ser marcada como homologada após validação por usuário responsável, mesmo quando implementação e testes automatizados já estiverem concluídos.
