# Auditoria funcional do MVP

Execução em 23/09/2026, no ambiente local, contra a API e o banco reais. O objetivo foi responder,
seção por seção, se o sistema entrega o que o [PRD](PRD.md) promete.

> **Situação em 23/09/2026:** as cinco falhas confirmadas (F1 a F5) foram corrigidas no mesmo dia e
> o roteiro de aceite passou a aprovar **95 de 95 critérios**. As lacunas de interface (A1 a A5)
> continuam abertas. O histórico abaixo foi mantido como registro do que foi encontrado.

## Resumo

| Indicador | Resultado |
|---|---|
| Critérios de aceite executados (PRD §35, §41 e SECURITY.md) | 94 |
| Critérios aprovados | 89 de 94 na auditoria; **95 de 95 após as correções** |
| Falhas confirmadas | 5, **todas corrigidas** |
| Telas do menu verificadas | 50 |
| Telas que abrem sem erro | **50 (100%)** |
| Telas sem backend próprio | 3 |
| Listagens que compartilham endpoint sem filtro | 4 |

O núcleo de negócio está sólido: cadastro, movimentação, termos, estoque, frota, inventário,
relatórios e isolamento entre tenants funcionam de ponta a ponta. As falhas se concentram em
**autorização de leitura**, em **uma regra de saldo** e na **camada de apresentação**, que exibe
pouca informação útil nas tabelas.

## Como foi testado

1. **Roteiro de aceite automatizado** — [`infra/scripts/acceptance.mjs`](../infra/scripts/acceptance.mjs)
   percorre os critérios do PRD §35 na ordem natural de uso, com JWT real e dois papéis
   (`tenant_admin` e um `employee` criado na hora). Reexecutável a qualquer momento:

   ```bash
   node --env-file=.env infra/scripts/acceptance.mjs
   ```

2. **Varredura das 50 telas** — navegação autenticada em cada rota do menu, verificando código de
   resposta, presença de dados, estado das colunas e disponibilidade das ações.

## Resultado por seção do PRD

| Seção | Critérios | Situação |
|---|---|---|
| §35 Tenant e white-label | 8/8 | Provisionamento, domínio, planos, módulos e branding funcionando |
| §35 Usuários e perfis | 3/3 | Listagem, convite e vínculo com papéis |
| §35 Estrutura organizacional | 6/6 | Filiais, setores, centros de custo, localizações e fornecedores |
| §35 Patrimônio | 12/13 | Falha apenas na validação pública do termo |
| §35 Garantia e manutenção | 6/6 | Garantia, ordem, custos, plano preventivo e alerta automático |
| §35 Almoxarifado | 11/11 | Entrada, saída, bloqueio de saldo negativo, transferência, lote e requisição |
| §35 Frota | 14/14 | Veículo, motorista, autorização, retirada, devolução, km, custos e ocorrências |
| §35 Inventário | 8/8 | Campanhas de ativos e de estoque, leitura de QR, divergência e encerramento |
| §35 Relatórios e auditoria | 9/9 | CSV e XLSX nos 6 domínios, exportação auditada e dashboard |
| §35 Isolamento entre tenants | 4/4 | Nenhum vazamento; acesso cruzado bloqueado com 403 |
| SECURITY.md Escopo por papel | 4/7 | **3 falhas** |
| §41 Regras críticas | 4/5 | **1 falha** |

## Falhas confirmadas

### F1 — A validação pública de documentos nunca funcionou · CORRIGIDO

`GET /v1/public/documents/:code` responde **HTTP 500**, o que quebra a tela `/validar` e o critério
"termos e documentos deverão possuir código de validação" (PRD §41).

**Causa:** a função `validate_asset_term` recebeu permissão para `anon` e `authenticated`, mas não
para `service_role`
([20260824000650_mvp_workflows.sql:253](../supabase/migrations/20260824000650_mvp_workflows.sql:253)),
e é justamente com a service role que a API a chama
([critical-operations-service.ts:35](../apps/api/src/services/critical-operations-service.ts:35)).
Comprovação: a mesma chamada devolve `42501 permission denied` com a service role e `200` com a
chave anônima.

### F2 — A auditoria fica exposta a qualquer membro do tenant · CORRIGIDO

`GET /v1/audit` exige apenas autenticação
([business/routes.ts:76](../apps/api/src/modules/business/routes.ts:76)), enquanto o
[SECURITY.md](SECURITY.md) determina acesso restrito a `tenant_admin` e `auditor`. Um `employee`
recebeu **HTTP 200** com a trilha completa.

### F3 — As listagens ignoram o escopo por papel · CORRIGIDO

A migration [20260824000850](../supabase/migrations/20260824000850_role_aware_read_policies.sql)
restringe, via RLS, o que um colaborador enxerga. Só que a API consulta o banco com a **service
role**, que contorna o RLS, e as rotas de listagem não reaplicam esse escopo. Resultado prático: um
`employee` chamou `GET /v1/assets` e recebeu **todos** os ativos do tenant, não apenas os seus. A
proteção existe no banco, mas não no caminho que a interface usa.

### F4 — Edição direta contorna a máquina de estados da requisição · CORRIGIDO

`PATCH /v1/stock/requisitions/:id` aceita o papel `employee` e permite gravar `status` diretamente
([business/routes.ts:82](../apps/api/src/modules/business/routes.ts:82)). Um colaborador aprovou
uma requisição que não era dele, sem passar por `transition_stock_requisition` nem pela checagem de
gestor que existe na rota oficial de transição. O mesmo vale para `approved_quantity` nos itens.

### F5 — Transferência a partir de estoque vazio cria saldo do nada · CORRIGIDO

Transferir de um estoque sem nenhum saldo retornou **HTTP 201** e creditou o destino.

**Causa:** em `apply_stock_movement`
([business_domains.sql:332](../supabase/migrations/20260824000400_business_domains.sql:332)),
quando ainda não existe linha de saldo, a saída insere `greatest(delta, 0)`, ou seja, zero — e a
verificação seguinte só rejeita saldo negativo, que nunca chega a ocorrer. O bloqueio funciona
quando já existe saldo (testado e aprovado), mas não quando a linha é criada na hora.

## O que foi corrigido

| # | Correção | Onde |
|---|---|---|
| F1 | `validate_asset_term` concedida à service role | [20260923000100](../supabase/migrations/20260923000100_stock_balance_and_validation_fixes.sql) |
| F2 | Auditoria restrita a `tenant_admin` e `auditor` | `modules/business/routes.ts` |
| F3 | Escopo por papel nas listagens, espelhando o RLS | `modules/business/routes.ts`, `tenant-resource-service.ts` |
| F4 | Campos de fluxo protegidos e edição restrita a gestores | `modules/business/routes.ts` |
| F5 | `apply_stock_movement` valida o saldo antes de gravar | [20260923000100](../supabase/migrations/20260923000100_stock_balance_and_validation_fixes.sql) |

Cobertura de testes adicionada: 8 casos em `apps/api/test/app.test.ts` (escopo por papel e campos
protegidos) e 3 em `supabase/tests/business_rules.sql` (saída e transferência sem saldo prévio).

Detalhe de projeto em F4: a proteção distingue criação de edição. O PRD prevê quilometragem e
responsável na ficha de cadastro, então esses campos continuam aceitos no `POST`; o que passou a ser
recusado é alterá-los depois por `PATCH`, fora da movimentação ou da retirada que os controla.

## Lacunas de interface

### A1 — As tabelas não mostram os dados que já possuem · CORRIGIDO

Este é o problema mais visível no uso diário. Em uma amostra de 10 listagens, **26 de 56 colunas
apareceram como travessão e outras 4 exibiram UUID cru**, mesmo com a informação presente no
registro.

| Tela | O que aparece na primeira linha |
|---|---|
| Movimentações | Tipo, Ativo, Origem, Destino e Responsável vazios (5 de 7 colunas) |
| Auditoria | Usuário, Ação, Entidade e Identificador vazios (4 de 5) |
| Tenants | Tenant, Domínio, Plano e Uso vazios (4 de 5) |
| Motoristas | Motorista, CNH e Validade vazios |
| Ativos | Responsável e Localização como UUID |
| Produtos | Saldo e Local vazios |

**Causa:** `displayValue` ([module-page.tsx:51](../apps/web/components/modules/module-page.tsx:51))
tenta adivinhar o campo a partir do rótulo em português, com uma lista curta de candidatos. Rótulos
como "Tipo", "Ação" e "Plano" nunca encontram `type`, `action` e `plan`. E, para campos que são
chaves estrangeiras, falta trazer o nome da entidade em lugar do identificador.

### A2 — Quatro listagens mostram o mesmo conteúdo · CORRIGIDO

Entradas, Saídas e Transferências exibem as mesmas 7 linhas, porque todas apontam para
`stock/movements` sem filtrar por tipo. O mesmo acontece com Retiradas e Devoluções (`fleet/usages`)
e com os dois Inventários (`inventories`).

### A3 — Três telas sem backend

- **Permissões** e **Saúde**: não têm endpoint no catálogo e renderizam tabela vazia.
- **Jobs**: tem endpoint, mas a tabela `background_jobs` nunca recebe escrita em nenhum ponto da API
  ou do worker, então a tela fica permanentemente vazia.

### A4 — Dashboards ainda são maquete · PARCIALMENTE RESOLVIDO

O dashboard geral foi refeito em 23/09/2026 e passou a consumir os indicadores reais, com gráfico de
distribuição, painel de pendências, movimentações recentes e atalhos. Os dashboards de Patrimônio, Almoxarifado e Frota exibem apenas travessões
([module-dashboard.tsx](../apps/web/components/modules/module-dashboard.tsx)).

### A5 — O canal de e-mail não tem quem o acione

O worker sabe processar notificações por e-mail, mas nenhuma parte da API publica na fila
`inner-almox-notifications`. Os alertas só existem como notificação interna.

## Correções sugeridas, por prioridade

| # | Correção | Onde | Impacto |
|---|---|---|---|
| ~~1 a 5~~ | ~~Defeitos de autorização, de fluxo e de saldo~~ | concluídos em 23/09/2026 | — |
| ~~6 e 7~~ | ~~Colunas por campo real e filtros das listagens compartilhadas~~ | concluídos em 23/09/2026 | — |
| 6 | Mapear colunas por campo real e resolver nomes de chaves estrangeiras | `module-page.tsx`, `module-catalog.ts` | Usabilidade |
| 7 | Filtrar as listagens que hoje compartilham endpoint | `module-catalog.ts` e rotas da API | Usabilidade |
| 8 | Registrar jobs em `background_jobs` e publicar notificações na fila | API e worker | Completude |
| 9 | Ligar os dashboards de módulo a dados reais | `module-dashboard.tsx`, dashboard geral | Valor percebido |

Os itens 1 a 5 eram defeitos, já corrigidos. Os itens 6 a 9 são funcionalidades que nunca foram
concluídas e seguem pendentes.

## Observação operacional

Durante os testes, o processo da API reiniciou sozinho diversas vezes. O `node --watch` está
reagindo a alterações em arquivos de outros pacotes do monorepo, o que derruba a API por alguns
segundos. Não afeta produção, mas atrapalha o desenvolvimento e exigiu repetição automática de
chamadas no roteiro de aceite.
