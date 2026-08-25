# Arquitetura do Inner Almox

O PRD é a fonte principal de verdade. A solução é um monorepo pnpm composto por:

```text
Navegador -> Next.js -> Fastify -> Supabase/PostgreSQL
                            |----> Redis/BullMQ -> Worker -> SMTP
```

## Aplicações

- `apps/web`: Next.js App Router, interface responsiva, autenticação Supabase SSR, navegação por perfil e identidade visual do tenant.
- `apps/api`: Fastify modular, validação Zod, autorização, resolução do tenant, operações críticas, arquivos, relatórios e administração da plataforma.
- `apps/worker`: BullMQ para alertas e notificações internas ou por e-mail, com retries e execução periódica.

## Domínios

A API separa autenticação, organização, patrimônio, manutenção, estoque, frota, inventários, relatórios, arquivos, dashboard e administração da plataforma. Operações críticas que afetam mais de uma tabela usam funções SQL transacionais, como transferências de estoque, atendimento de requisições e movimentações de ativos.

## Contexto multi-tenant

1. O Next.js envia o JWT do usuário e o hostname atual.
2. O Fastify normaliza o hostname e resolve apenas domínio verificado de tenant ativo.
3. O Supabase Auth valida o JWT.
4. A API confirma uma membership ativa e carrega os papéis daquele vínculo.
5. A rota recebe `tenantId`, usuário, membership e roles derivados do contexto validado.

Nenhuma rota protegida aceita `tenant_id` enviado pelo cliente como fonte de autoridade. Em produção, cabeçalhos de proxy só devem ser confiados quando `TRUST_PROXY=true` estiver configurado em infraestrutura controlada.

## Isolamento e autorização

Todas as tabelas de negócio possuem `tenant_id`, índices por tenant e RLS habilitada. As chaves estrangeiras compostas com `(tenant_id, id)` impedem relações cruzadas mesmo em operações server-side.

O acesso direto com anon key fica sujeito a políticas deny-by-default. Além da separação entre empresas, ativos atribuídos, termos, requisições, itens e notificações possuem leitura sensível ao papel: gestores autorizados veem o domínio; colaboradores veem somente os próprios registros. Escritas de negócio passam pelo Fastify e a service role nunca é exposta ao navegador.

## Auditoria e imutabilidade

Movimentações patrimoniais e de estoque são imutáveis. Operações sensíveis geram trilhas de auditoria; registros de auditoria não podem ser alterados ou removidos. Regras de saldo, quilometragem, habilitação, documentos, aceite e transições de status são verificadas no backend e/ou no PostgreSQL.

## Arquivos, relatórios e QR

Uploads usam URLs assinadas e caminhos isolados por tenant. Downloads também são temporários e autorizados. Termos são produzidos em PDF, etiquetas podem ser geradas em lote e relatórios são exportados em CSV ou XLSX com mitigação de fórmulas maliciosas. A validação documental pública expõe somente o snapshot necessário.

## Desenvolvimento e implantação

O Supabase local é iniciado pela CLI oficial; o Docker Compose fornece Redis. Turborepo e pnpm coordenam `dev`, `build`, `lint`, `typecheck` e `test`. Credenciais SMTP, domínios, TLS, observabilidade e CI/CD são configurações de ambiente necessárias antes da homologação produtiva.
