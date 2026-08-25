# Segurança

## Modelo de confiança

- Frontend, headers e payloads são não confiáveis.
- O hostname seleciona o tenant, mas JWT válido e membership ativa concedem o acesso.
- O header `x-tenant-hostname` suporta web e API em hosts separados; spoofing não concede acesso porque a membership é verificada depois da resolução.
- RLS é a última barreira, inclusive quando o Fastify já autorizou a operação.
- Operações críticas passam por schemas estritos, papéis e funções SQL transacionais.

## Isolamento e privilégios

Tabelas tenant-scoped carregam `tenant_id`, índices correspondentes e RLS. Escritas de negócio não são concedidas diretamente a `authenticated`; passam pela API. A service role nunca usa prefixo `NEXT_PUBLIC_`, nunca vai ao navegador e não deve aparecer em logs/jobs.

Visões pessoais filtram `responsible_user_id`, `issued_to` ou `requested_by`. Auditoria é limitada a `tenant_admin` e `auditor`. Administração global usa `platform_admins` ou a lista explícita de bootstrap `PLATFORM_ADMIN_EMAILS` e mantém trilha separada.

## Arquivos e documentos

- Bucket privado, limite de tamanho e caminhos prefixados pelo tenant.
- URLs assinadas expiram em cinco minutos.
- Código público de termo retorna apenas snapshot emitido; não dá acesso ao tenant.
- CSV neutraliza células iniciadas por caracteres de fórmula.
- PDFs e QR Codes são gerados server-side após autorização.

## Domínios e proxy

Domínios precisam estar verificados para resolver tenants. `TRUST_PROXY=false` é o padrão; habilite somente atrás de proxy controlado que sobrescreva headers encaminhados. Configure CORS com origens exatas em `WEB_ORIGINS`.

## Checklist de mudanças

1. Incluir `tenant_id`, FK composta e índice.
2. Habilitar RLS antes de expor a tabela.
3. Derivar tenant do contexto; nunca do corpo.
4. Validar payload e papel no Fastify.
5. Colocar regras concorrentes/críticas em transações SQL.
6. Auditar sem guardar segredos.
7. Adicionar testes de isolamento e regras críticas.
