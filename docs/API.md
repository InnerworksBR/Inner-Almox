# API

Base local: `http://localhost:3333`. Erros usam `{ "error": { "code", "message" }, "requestId" }`. Rotas tenant-scoped exigem `Authorization: Bearer <JWT>` e resolvem o tenant pelo hostname normalizado (`Host` ou `x-tenant-hostname`). O hostname seleciona o contexto; membership ativa continua obrigatória.

## Infraestrutura e contexto

- `GET /health`
- `GET /v1/context`
- `POST /v1/foundation/jobs`
- `GET /v1/dashboard`

## Organização e usuários

- CRUD (`GET`, `POST`, `PATCH /:id`): `/v1/branches`, `/departments`, `/cost-centers`, `/locations`, `/suppliers`
- `GET /v1/users`
- `POST /v1/users/invitations`
- `PATCH /v1/users/:id/status`
- `GET|PATCH /v1/tenant/configuration`

## Patrimônio e manutenção

- CRUD: `/v1/assets`, `/asset-categories`, `/warranties`, `/maintenance/plans`, `/maintenance/orders`, `/maintenance/costs`
- Campos/arquivos: `/v1/assets/custom-fields`, `/assets/custom-values`, `/assets/files`
- `POST /v1/asset-movements`
- `GET /v1/asset-movements`, `/asset-terms`
- `POST /v1/asset-movements/:id/terms`
- `POST /v1/asset-terms/:id/accept`
- `GET /v1/asset-terms/:id/pdf`
- `GET /v1/assets/:id/qr?format=svg|png`
- `GET /v1/assets/qr/:token`
- `POST /v1/assets/qr-labels`
- Público: `GET /v1/public/documents/:code`

## Almoxarifado

- CRUD: `/v1/stock/categories`, `/stock/locations`, `/stock/products`, `/stock/batches`, `/stock/requisitions`, `/stock/requisition-items`
- `GET|POST /v1/stock/movements`
- `POST /v1/stock/transfers`
- `POST /v1/stock/requisitions/with-items`
- `POST /v1/stock/requisitions/:id/status`
- `POST /v1/stock/requisitions/:id/fulfill`

Entradas, saídas, transferências e atendimento são transacionais. Saldo negativo é bloqueado no banco.

## Frota

- CRUD: `/v1/fleet/vehicles`, `/drivers`, `/authorizations`, `/reservations`, `/documents`, `/fuelings`, `/expenses`, `/fines`, `/incidents`
- `GET /v1/fleet/usages`
- `POST /v1/fleet/usages/checkout`
- `POST /v1/fleet/usages/:id/return`
- `POST /v1/fleet/usages/:id/checklists`

## Inventário, arquivos, alertas e relatórios

- CRUD: `/v1/inventories`
- `POST /v1/inventories/:id/start`, `/scans/assets`, `/scans/stock`, `/complete`
- `GET /v1/notifications` e `POST /v1/notifications/:id/read`
- `POST /v1/files/sign-upload`, `/sign-download`
- `GET /v1/notifications`; `POST /v1/notifications/refresh`
- `GET /v1/reports/:domain?format=csv|xlsx`
- Visões pessoais: `/v1/my/assets`, `/my/terms`, `/my/requisitions`
- Auditoria: `GET /v1/audit`

## Administração InnerWorks

Estas rotas usam autorização global, independente dos papéis do tenant:

- `GET|POST /v1/platform/tenants`; `PATCH /v1/platform/tenants/:id`
- `GET|POST /v1/platform/domains`; `POST /v1/platform/domains/:id/verify`
- `GET|POST /v1/platform/plans`
- `GET /v1/platform/modules`; `PUT /v1/platform/tenants/:id/modules`
- `GET /v1/platform/health`, `/jobs`, `/logs`

IDs de tenant enviados por clientes nunca substituem o tenant derivado nas rotas de negócio. A service role é usada apenas internamente após autenticação e autorização.
