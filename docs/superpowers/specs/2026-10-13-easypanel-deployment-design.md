# Implantação isolada do Inner Almox no EasyPanel

Data: 2026-10-13
Status: aguardando revisão do usuário
Branch de trabalho: feat/easypanel-deployment

## Objetivo

Preparar a primeira implantação do Inner Almox no EasyPanel em um projeto próprio, sem compartilhar ou alterar as instalações já existentes. A primeira versão usará hosts HTTPS temporários fornecidos pelo EasyPanel; domínio próprio fica para uma etapa posterior.

## Decisões confirmadas

- Criar um projeto EasyPanel separado, com o nome `inner-almox`.
- Provisionar uma instalação Supabase dedicada e um Redis dedicado e persistente.
- Executar Web, API e Worker como serviços separados, ligados apenas pela rede privada do projeto quando possível.
- Usar hosts `easypanel.host` gerados pelo EasyPanel. O host público de API e o host público do gateway Supabase precisam existir porque o navegador os acessa.
- Não alterar os projetos, bancos, Redis, domínios, volumes ou segredos existentes no EasyPanel.
- Não adicionar domínio próprio nem automatizar deploy por push nesta etapa.
- Guardar segredos exclusivamente no gerenciador de variáveis do EasyPanel; nunca em Git, imagens, logs ou variáveis públicas do Next.js.

## Estado do repositório que orienta o desenho

- A aplicação é um monorepo pnpm com Next.js em `apps/web`, Fastify em `apps/api` e BullMQ em `apps/worker`.
- `docker-compose.yml` atualmente fornece apenas Redis para desenvolvimento. Ainda não existem Dockerfiles de produção.
- O exemplo de ambiente define `APP_URL`, `API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, variáveis privadas do Supabase e Redis, opções de fila, SMTP, URLs públicas de documentos/QR Code e e-mails de administradores globais.
- A API responde em `GET /health`. A página de saúde administrativa também verifica Banco, Redis, Storage e atividade recente do Worker.
- A API deriva o endereço de callback de convites, QR Codes e documentos do primeiro endereço em `WEB_ORIGINS`; em produção esse primeiro valor precisa ser a origem pública HTTPS do Web.
- O Supabase local mantém confirmação por e-mail ativa. O produto prevê login, convites e recuperação de senha, então esses fluxos precisam ser verificados na configuração self-hosted.

## Topologia proposta

No projeto EasyPanel `inner-almox`:

| Serviço | Exposição | Persistência e função |
| --- | --- | --- |
| Web | Host HTTPS temporário público | Interface Next.js; usa a URL pública da API e a URL pública do Supabase |
| API | Host HTTPS temporário público, com CORS restrito ao host Web | Fastify; `GET /health`; usa Supabase e Redis dedicados |
| Worker | Sem porta pública | BullMQ; envia alertas e registra jobs usando os mesmos Supabase e Redis dedicados |
| Redis | Apenas rede privada | Redis dedicado, senha exclusiva e volume persistente |
| Supabase | Publicar somente o gateway HTTPS | Stack oficial self-hosted do EasyPanel, isolada; persistir Postgres e Storage; painel administrativo sem host público aberto |

O navegador chama API e Supabase através dos hosts públicos com TLS. API e Worker usarão a URL canônica HTTPS do gateway Supabase também, garantindo que emissão e validação de tokens compartilhem o mesmo issuer. Usar nome DNS privado para o gateway só será considerado se um teste confirmar equivalência do issuer/JWT e a resolução entre redes do EasyPanel.

A stack Supabase deve vir do template oficial disponível na instalação EasyPanel no momento da implantação, sem copiar a stack existente. Fixar a versão/referência do template usada e configurar credenciais novas. Não publicar diretamente PostgreSQL, Redis interno do Supabase, Studio ou serviços auxiliares.

## Imagens de produção

Antes de criar os serviços de aplicação, implementar três imagens de produção a partir da raiz do monorepo:

- Web: imagem multi-stage Node.js 22 e pnpm, build do workspace e execução otimizada do Next.js. Os valores públicos `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_API_URL` precisam estar disponíveis durante o build, pois podem ser embutidos nos bundles do navegador. Não incluir chaves secretas na etapa de build.
- API: imagem multi-stage que compila `apps/api` e executa o bundle de produção, escutando em `0.0.0.0` na porta configurada (3333 por padrão).
- Worker: imagem multi-stage que compila `apps/worker` e executa o processo sem expor porta.

Adicionar `.dockerignore` na raiz para excluir `.git`, worktrees, dependências locais, builds e arquivos `.env`. Os serviços devem usar contexto de build na raiz para respeitar o workspace pnpm. Definir usuário não-root quando compatível com as imagens e diretórios de runtime.

## Configuração e fronteira de segredos

Valores públicos, fornecidos ao build Web:

- `NEXT_PUBLIC_SUPABASE_URL`: host público HTTPS do gateway Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon/publicável daquela instalação.
- `NEXT_PUBLIC_API_URL`: host HTTPS público da API.

Web em runtime:

- `NODE_ENV=production`, `APP_URL` com a origem pública do Web e `API_URL` com o endereço público da API quando SSR precisar chamar API.

API:

- `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3333`, `TRUST_PROXY=true`.
- `WEB_ORIGINS` contendo apenas a origem HTTPS pública do Web; manter essa origem como primeiro e único valor nesta implantação inicial.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` da instalação nova.
- `REDIS_URL` privado para Redis novo, com senha.
- `QUEUE_VALIDATION_ENABLED=true`.
- `PLATFORM_ADMIN_EMAILS` com o endereço real aprovado para o primeiro administrador global; substituir o valor local de exemplo.
- `DOCUMENT_PUBLIC_URL` e `QR_CODE_BASE_URL` apontando para a origem pública HTTPS do Web.

Worker:

- `NODE_ENV=production`, `REDIS_URL`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` da instalação nova.
- Configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM` somente após receber credenciais aprovadas. Os mesmos dados de SMTP serão necessários para os e-mails de confirmação, convite e recuperação do Supabase Auth.

Supabase e Redis:

- Gerar segredos independentes para Postgres, JWT/Auth, chaves anon/service-role, dashboard e senha Redis. Guardá-los em EasyPanel; não reutilizar qualquer segredo do projeto `innerworks`.
- Persistir o banco Supabase, o Storage e os dados do Redis conforme o suporte do template, com política de backup documentada antes do uso com dados reais.

Chaves `service_role`, senhas, SMTP e JWT são somente de servidor. Nunca definir nomes `NEXT_PUBLIC_*` para esses valores.

## Auth, URLs e onboarding

- Configurar `SITE_URL`/site URL com a origem HTTPS temporária do Web e permitir os retornos de convite e recuperação em `/auth/callback`.
- Manter confirmação de e-mail ativa.
- Como o produto usa convites, impedir cadastro público e manter o provedor de e-mail habilitado. No Supabase self-hosted, separar “desabilitar signup público” de “desabilitar o provedor de e-mail”; testar convite administrativo, confirmação, recuperação e login antes de abrir o ambiente.
- Não ativar OAuth Microsoft nesta primeira implantação.
- E-mail SMTP é uma dependência para convites, confirmação, recuperação de senha e alertas. Não reutilizar credenciais SMTP de outra stack sem decisão explícita; sem credenciais, marcar esses fluxos como bloqueados e não declarar o ambiente pronto para uso.
- Criar o usuário inicial por convite administrativo do Supabase usando um endereço real definido pelo usuário. Configurar o mesmo endereço em `PLATFORM_ADMIN_EMAILS`; no primeiro acesso administrativo, a API registra o usuário em `platform_admins`. Depois do login, criar o primeiro tenant pelo fluxo da plataforma e associá-lo ao host Web temporário, sem gravar usuário/senha inicial em documentação.
- O fluxo de criação da plataforma não inclui automaticamente o usuário na membership do tenant. Antes de testar as telas do tenant, implementar um comando de bootstrap único e explicitamente escopado que localize o usuário convidado, chame a RPC privilegiada existente `provision_tenant_membership` com a role `tenant_admin` e encerre sem manter uma rota pública de bootstrap. Validar host/TLS antes de marcar o domínio como verificado. Não escrever diretamente em tabelas de negócio nem expor service role ao navegador.

## Dados, migrações e segurança

- Inicializar exclusivamente o novo projeto Supabase.
- Aplicar migrations versionadas de `supabase/migrations` à base vazia e conferir o resultado com `supabase migration list`/verificação equivalente.
- Não executar `db reset` em ambiente remoto, não carregar seed de desenvolvimento e não executar DDL ou mutations em instalações existentes.
- Confirmar políticas RLS, bucket privado `tenant-documents`, URLs assinadas, roles iniciais e isolamento por tenant antes da homologação.
- Permitir tráfego público apenas para Web, API e gateway Supabase. Banco e Redis não recebem portas públicas.
- Restringir CORS da API ao host Web. Usar HTTPS em todos os hosts públicos e testar redirecionamentos de auth.
- Configurar o reverse proxy como confiável somente porque EasyPanel termina TLS; confirmar que `TRUST_PROXY=true` produz o protocolo/host corretos.

## Validação e critérios de aceite

Pré-condição de build:

1. `pnpm install --frozen-lockfile`.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`.
3. Construir localmente as três imagens finais a partir do contexto e Dockerfiles usados pelo EasyPanel.
4. Verificar que nenhuma chave de servidor, `.env` ou dado local aparece nas imagens ou no diff Git.

Validação após provisionamento e antes de declarar pronto:

1. Confirmar reinício dos serviços e persistência de dados após restart controlado.
2. Validar `/health` público da API e status do Web, API, Supabase Auth/REST/Storage e Redis privado.
3. Confirmar página de saúde administrativa. Worker recém-iniciado pode aparecer `degraded` até concluir um job; executar um job controlado e então confirmar a atividade registrada.
4. Convidar o endereço inicial pelo Supabase, aceitar o convite no host Web, confirmar o primeiro acesso de plataforma e provisionar o primeiro tenant com o host Web temporário. Só marcá-lo verificado após validar DNS/TLS; executar então o bootstrap único da membership tenant_admin. Verificar também confirmação e recuperação de senha.
5. Testar CORS entre o host Web e o host API, rejeição de outra origem, acesso ao bucket privado e upload/download assinado.
6. Rodar operações de fumaça para tenant e uma fila BullMQ de teste; conferir que nenhum serviço acessa dados de outro tenant.
7. Confirmar que logs não incluem bearer tokens, service role, senha ou credenciais SMTP.
8. Fazer ou verificar um backup restaurável do Supabase antes de cadastrar dados reais.

Critérios de pronto: builds reproduzíveis; serviços saudáveis; login e convites operacionais; migrations e RLS conferidos; storage e fila funcionais; segredos restritos; persistência e backup verificados. Sem SMTP ou sem endereço de administrador aprovado, a configuração pode ser provisionada, mas a homologação funcional fica pendente.

## Sequência de entrega, rollback e limites

1. Depois desta especificação ser revisada, criar um plano de implementação e validar os Dockerfiles/configuração em CI/local.
2. Antes de qualquer criação de projeto ou serviço que possa iniciar deploy no EasyPanel, obter aprovação explícita do usuário para o conjunto concreto de serviços e alterações.
3. Após aprovação, criar os recursos no projeto vazio `inner-almox`, gerar e armazenar segredos novos, configurar os hosts temporários e implantar Supabase, Redis, API, Worker e Web em etapas.
4. Aplicar migrations apenas na base nova após validar URL/projeto e confirmar uma base vazia.
5. Se uma implantação falhar, interromper/reverter a versão da aplicação; preservar volumes e a base para diagnóstico. Nunca apagar volumes ou executar reset remoto como rollback.
6. Não criar domínio DNS, enviar e-mails reais, reutilizar SMTP de outro serviço, habilitar auto-deploy, nem apagar/editar as stacks existentes durante essa etapa.

## Decisões ainda necessárias antes de homologação

- E-mail que deve constar em `PLATFORM_ADMIN_EMAILS` e ser usado no bootstrap do administrador.
- Provedor e credenciais SMTP aprovadas para Auth e alertas; podem ser fornecidas depois do provisionamento, antes dos testes de convite/recuperação.
- Capacidade de CPU, memória e armazenamento disponível para uma stack Supabase adicional. Confirmar no EasyPanel antes da criação, sem reduzir recursos das instalações existentes.
- Disponibilidade do endereço final de cada host temporário e do host privado Redis depois que os serviços forem criados.

## Fora de escopo nesta etapa

- Alterar código de negócio ou schema além do mínimo necessário para imagens, checks operacionais e documentação de implantação.
- Migração de dados de outra instalação Supabase.
- Configuração de domínio definitivo, OAuth Microsoft, alertas externos, Sentry ou CI/CD automático.
- Publicar/compartilhar credenciais ou fazer deploy antes do aceite do plano de implantação.

## Fontes de decisão

- PRD do repositório: login, convites, confirmação, SMTP, Docker e responsabilidades da arquitetura.
- Exemplo real de ambiente: `.env.example`.
- Configuração Supabase local: `supabase/config.toml`.
- Auth self-hosted: [Supabase Auth Self-hosting Config](https://supabase.com/docs/guides/self-hosting/auth/config).
- Auth por convite e estado do signup: [Supabase Users and invitations](https://supabase.com/docs/guides/auth/users) e [Supabase Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration).
