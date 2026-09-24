# Cadastro Direto de Usuários — Especificação de Design

**Data:** 2026-09-24  
**Status:** Aguardando revisão do usuário  
**Escopo:** Administração de usuários do tenant

## Objetivo

Permitir que um administrador crie um usuário diretamente, sem depender de convite por e-mail, informando uma senha inicial. O fluxo de convite existente continuará disponível como alternativa.

## Experiência do usuário

A tela `/admin/usuarios` exibirá duas ações:

- **Cadastrar usuário:** abre o cadastro direto com nome, e-mail, senha, confirmação da senha, perfil e vínculos organizacionais.
- **Convidar usuário:** mantém o fluxo existente, no qual o usuário recebe um e-mail e define a própria senha.

No cadastro direto, a confirmação da senha será validada no navegador e a senha inicial será enviada somente por HTTPS ao backend. A senha não será exibida na listagem, retornada pela API, incluída na auditoria ou armazenada fora do Supabase Auth.

## API e autorização

Será criada a rota protegida `POST /v1/users`, disponível apenas para usuários com o papel `tenant_admin`.

Payload aceito:

```json
{
  "email": "colaborador@empresa.com",
  "full_name": "Nome do Colaborador",
  "password": "senha-inicial-segura",
  "roles": ["employee"],
  "employee_number": "MAT-001",
  "position": "Analista",
  "branch_id": "uuid-opcional",
  "department_id": "uuid-opcional",
  "cost_center_id": "uuid-opcional",
  "admission_date": "2026-09-24"
}
```

Regras:

- `email`, `full_name`, `password` e pelo menos um `role` são obrigatórios.
- A senha terá no mínimo 8 caracteres.
- Os mesmos papéis e limites organizacionais já usados no convite serão reaproveitados.
- A rota nunca aceitará `tenant_id` vindo do cliente; o tenant será derivado da sessão.
- E-mail já cadastrado retornará `409 USER_ALREADY_EXISTS`.
- Payload inválido retornará `422 VALIDATION_ERROR`.
- O convite continuará em `POST /v1/users/invitations` sem alteração de comportamento.

## Fluxo de provisionamento

1. O Fastify valida sessão, tenant, papel, payload e senha.
2. O serviço server-side chama o endpoint administrativo do Supabase Auth para criar o usuário com `email_confirm: true`, senha inicial e `full_name` no metadata.
3. O serviço chama a função existente `provision_tenant_membership` para criar ou atualizar o vínculo como `active` e gravar os papéis e dados organizacionais.
4. O serviço registra auditoria com a ação `create.user`, contendo e-mail, identificador do usuário e papéis, sem a senha.
5. A resposta retorna somente dados públicos do usuário e o status `active`.

Se a criação do vínculo falhar depois que o usuário Auth foi criado, o serviço tentará excluir o usuário Auth recém-criado antes de retornar `500 MEMBERSHIP_PROVISION_FAILED`. Assim, o fluxo não deixa um usuário sem vínculo no tenant.

## Frontend

O formulário direto será um componente próprio, para não misturar a semântica de senha com o formulário genérico de convite. O roteamento usará `/admin/usuarios/novo?modo=direto`; o caminho sem o parâmetro continuará representando o convite atual.

O formulário:

- enviará `POST /v1/users` com o token da sessão e o hostname do tenant;
- exigirá confirmação local da senha antes do envio;
- manterá os seletores de filial, setor e centro de custo já usados no cadastro de usuário;
- após sucesso, retornará à listagem `/admin/usuarios` e exibirá o novo usuário como `Ativo`.

## Testes e documentação

- Testes de rota: autorização de tenant admin, validação de senha, criação direta, duplicidade e ausência de senha na resposta/auditoria.
- Testes do serviço: criação Auth, provisionamento de membership e rollback quando o provisionamento falhar.
- Teste de frontend/typecheck/build para os dois botões e o formulário direto.
- Atualização de `docs/API.md` com `POST /v1/users` e distinção em relação ao convite.

## Segurança e limites

- A service role permanecerá exclusivamente no backend.
- O administrador que cria o usuário será registrado pelo `requestedBy` da sessão.
- Não será implementada, nesta etapa, troca obrigatória de senha no primeiro acesso; o usuário poderá alterá-la pelo fluxo existente de recuperação/atualização de senha.
- Não haverá alteração no modelo de dados nem nova tabela; o provisionamento continuará usando Supabase Auth e `tenant_memberships`.
