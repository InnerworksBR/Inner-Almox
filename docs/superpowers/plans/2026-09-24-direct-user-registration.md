# Direct User Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a tenant administrator to create an active user directly with an initial password while preserving the existing invitation flow.

**Architecture:** Add a protected `POST /v1/users` route backed by the existing `UserAdminService`. The service creates a confirmed Supabase Auth user, provisions the existing tenant membership, audits the action without the password, and deletes the Auth user if membership provisioning fails. The web app gets a dedicated direct-registration form and two actions on the users list.

**Tech Stack:** Fastify, Zod, Supabase Auth Admin API, Supabase REST/RPC, Next.js/React, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-24-direct-user-registration-design.md`

## Global Constraints

- Keep `POST /v1/users/invitations` unchanged for e-mail invitations.
- Only `tenant_admin` may create users, and tenant identity must come from the authenticated context.
- The service role remains backend-only; the browser never receives it.
- The initial password must be at least 8 characters, must not be logged or audited, and must never be returned by the API.
- A membership-provisioning failure must not leave the newly-created Auth user orphaned.
- Do not add a database table or change the existing membership RPC.
- Do not commit the local Supabase port override in `supabase/config.toml`.

---

### Task 1: Add failing API and service tests

**Files:**
- Modify: `apps/api/test/app.test.ts`
- Create: `apps/api/test/user-admin-service.test.ts`

**Interfaces:**
- The route consumes `UserAdminService.create(tenantId, requestedBy, input)`.
- The service input is `{ email, fullName, password, roles, employee }`.
- The route returns `{ data: { id, email, full_name, roles, status: "active" } }` without a password.

- [x] **Step 1: Extend the API test fake with the direct-create method.**

Import `UserAdminService`, `InviteUserInput`, and `DirectUserInput` as types and add a complete fake service next to the existing resource fake in `apps/api/test/app.test.ts`:

```ts
class FakeUserAdminService implements UserAdminService {
  readonly list = vi.fn(async (): Promise<ResourcePayload[]> => []);
  readonly invite = vi.fn(async (_tenantId: string, _requestedBy: string, input: InviteUserInput): Promise<ResourcePayload> => ({
    id: "60000000-0000-4000-8000-000000000002",
    email: input.email,
    full_name: input.fullName,
    roles: input.roles,
    status: "invited"
  }));
  readonly create = vi.fn(async (_tenantId: string, _requestedBy: string, input: DirectUserInput): Promise<ResourcePayload> => ({
    id: "60000000-0000-4000-8000-000000000001",
    email: input.email,
    full_name: input.fullName,
    roles: input.roles,
    status: "active"
  }));
  readonly changeStatus = vi.fn(async (): Promise<ResourcePayload> => ({ id: "60000000-0000-4000-8000-000000000003", status: "active" }));
}
```

- [x] **Step 2: Write the failing route tests for direct creation.**

Add tests that build `buildApp({ userAdminService: fake })` and assert:

```ts
it("cria usuário diretamente com senha inicial", async () => {
  const users = new FakeUserAdminService();
  const app = await buildApp({
    env: testEnv,
    contextResolver: new FakeResolver(),
    queuePublisher: new FakePublisher(),
    userAdminService: users
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/users",
    headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" },
    payload: { email: "novo@empresa.com", full_name: "Novo Usuário", password: "senha-segura", roles: ["employee"] }
  });

  expect(response.statusCode).toBe(201);
  expect(users.create).toHaveBeenCalledWith(
    tenantA.tenantId,
    tenantA.userId,
    expect.objectContaining({ email: "novo@empresa.com", fullName: "Novo Usuário", password: "senha-segura", roles: ["employee"] })
  );
  expect(response.json()).toMatchObject({ data: { status: "active", email: "novo@empresa.com" } });
  expect(response.json().data).not.toHaveProperty("password");
  await app.close();
});

it("recusa cadastro direto por colaborador", async () => {
  const users = new FakeUserAdminService();
  const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), userAdminService: users });
  const response = await app.inject({
    method: "POST",
    url: "/v1/users",
    headers: { host: "tenant-a.localhost", authorization: "Bearer token-colaborador" },
    payload: { email: "novo@empresa.com", full_name: "Novo Usuário", password: "senha-segura", roles: ["employee"] }
  });
  expect(response.statusCode).toBe(403);
  expect(users.create).not.toHaveBeenCalled();
  await app.close();
});

it("recusa senha curta antes da persistência", async () => {
  const users = new FakeUserAdminService();
  const app = await buildApp({ env: testEnv, contextResolver: new FakeResolver(), queuePublisher: new FakePublisher(), userAdminService: users });
  const response = await app.inject({
    method: "POST",
    url: "/v1/users",
    headers: { host: "tenant-a.localhost", authorization: "Bearer token-a" },
    payload: { email: "novo@empresa.com", full_name: "Novo Usuário", password: "curta", roles: ["employee"] }
  });
  expect(response.statusCode).toBe(422);
  expect(users.create).not.toHaveBeenCalled();
  await app.close();
});
```

- [x] **Step 3: Run the focused API tests and verify RED.**

Run `pnpm --filter @inner-almox/api test -- app.test.ts`.

Expected result: the new route tests fail because `UserAdminService` has no `create` method and `POST /v1/users` is not registered. Existing tests must remain green.

- [x] **Step 4: Write failing service tests for Auth creation, membership provisioning, audit, and rollback.**

Create `apps/api/test/user-admin-service.test.ts` with a small `Response` helper and mocked `fetch`. Cover these exact calls:

```ts
const service = new SupabaseUserAdminService("http://supabase.local", "service-key", "http://localhost:3001/auth/callback");

await service.create("10000000-0000-0000-0000-000000000001", "20000000-0000-0000-0000-000000000001", {
  email: "novo@empresa.com",
  fullName: "Novo Usuário",
  password: "senha-segura",
  roles: ["employee"],
  employee: {}
});

expect(fetchMock).toHaveBeenNthCalledWith(1, "http://supabase.local/auth/v1/admin/users", expect.objectContaining({
  method: "POST",
  body: JSON.stringify({ email: "novo@empresa.com", password: "senha-segura", email_confirm: true, user_metadata: { full_name: "Novo Usuário" } })
}));
expect(fetchMock).toHaveBeenNthCalledWith(2, "http://supabase.local/rest/v1/rpc/provision_tenant_membership", expect.objectContaining({ method: "POST" }));
expect(fetchMock).toHaveBeenNthCalledWith(3, "http://supabase.local/rest/v1/audit_logs", expect.objectContaining({ method: "POST" }));
expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).not.toHaveProperty("password");
```

Add a second test where the membership response is not OK and assert that `DELETE http://supabase.local/auth/v1/admin/users/70000000-0000-4000-8000-000000000001` is called before the service throws `MEMBERSHIP_PROVISION_FAILED`. Add a third test for Auth `422` mapping to `USER_ALREADY_EXISTS`.

- [x] **Step 5: Run the service tests and verify RED.**

Run `pnpm --filter @inner-almox/api test -- user-admin-service.test.ts`.

Expected result: the tests fail because the direct service method and cleanup flow do not exist yet; failures must be implementation failures, not malformed test setup.

---

### Task 2: Implement the backend direct-registration contract

**Files:**
- Modify: `apps/api/src/services/user-admin-service.ts`
- Modify: `apps/api/src/modules/users/routes.ts`
- Modify: `apps/api/test/app.test.ts`
- Modify: `apps/api/test/user-admin-service.test.ts`

**Interfaces:**
- Add `DirectUserInput` with `email`, `fullName`, `password`, `roles`, and `employee`.
- Add `create(tenantId: string, requestedBy: string, input: DirectUserInput): Promise<ResourcePayload>` to `UserAdminService` and `UnconfiguredUserAdminService`.
- Register `POST /v1/users` before the invitation route using the existing tenant authentication and `tenant_admin` authorization hooks.

- [x] **Step 1: Add the direct-user input type and service interface method.**

In `user-admin-service.ts`, define:

```ts
export interface DirectUserInput {
  email: string;
  fullName: string;
  password: string;
  roles: string[];
  employee: ResourcePayload;
}
```

Add `create(...)` to both the interface and the unconfigured implementation. The unconfigured implementation must return the existing `USER_ADMIN_UNCONFIGURED` error.

- [x] **Step 2: Implement Auth creation and duplicate-email mapping.**

Add `SupabaseUserAdminService.create(...)` that POSTs to `/auth/v1/admin/users` with `email`, `password`, `email_confirm: true`, and `user_metadata.full_name`. Map an Auth `422` response to `AppError("Este e-mail já está cadastrado ou é inválido.", 409, "USER_ALREADY_EXISTS")`; map other non-2xx responses to `USER_CREATE_FAILED`.

- [x] **Step 3: Provision the membership and implement cleanup on failure.**

After receiving the Auth user ID, call the existing `provision_tenant_membership` RPC with `target_tenant_id`, `target_user_id`, `target_roles`, and `employee_data`. If it fails, issue `DELETE /auth/v1/admin/users/{userId}` and throw `MEMBERSHIP_PROVISION_FAILED`. Do not include the password in any thrown message or cleanup payload.

- [x] **Step 4: Audit and return only public fields.**

Call `audit` with action `create.user`, entity type `tenant_membership`, the membership ID returned by the RPC, and `{ email, roles }`. Return `{ id, email, full_name, roles, status: "active" }`.

- [x] **Step 5: Add the Zod schema and route.**

In `apps/api/src/modules/users/routes.ts`, define the direct schema by extending the invitation fields with `password: z.string().min(8)`. Add:

```ts
app.post("/v1/users", { preHandler: [authenticate, authorize] }, async (request, reply) => {
  const context = request.tenantContext;
  if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
  const parsed = directUserSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError("Dados do cadastro são inválidos.", 422, "VALIDATION_ERROR");
  const { email, full_name: fullName, password, roles, ...employee } = parsed.data;
  const data = await userAdminService.create(context.tenantId, context.userId, { email, fullName, password, roles, employee });
  return reply.status(201).send({ data });
});
```

The route must derive tenant and requester from `request.tenantContext`; it must not pass a client-supplied `tenant_id` to the service.

- [x] **Step 6: Run the focused API and service tests and verify GREEN.**

Run `pnpm --filter @inner-almox/api test -- app.test.ts user-admin-service.test.ts`.

Expected result: all direct-registration tests and all pre-existing API tests pass.

---

### Task 3: Add the direct-registration UI flow

**Files:**
- Create: `apps/web/components/modules/direct-user-form.tsx`
- Modify: `apps/web/components/modules/module-page.tsx`
- Modify: `apps/web/app/(dashboard)/[...slug]/page.tsx`
- Modify: `apps/web/lib/module-catalog.ts`

**Interfaces:**
- `DirectUserForm` accepts `{ title, description, singular }` or uses the users module copy directly.
- The page selects the form when `path === "admin/usuarios/novo"` and `modo=direto`.
- The existing `/admin/usuarios/novo` path without `modo=direto` remains the invitation form.

- [x] **Step 1: Add two actions to the users list header.**

Update `ModulePage` so `path === "admin/usuarios"` renders:

```tsx
<div className="flex flex-wrap gap-2">
  <Link href="/admin/usuarios/novo?modo=direto" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-dark">
    <CirclePlus className="size-4" aria-hidden="true" /> Cadastrar usuário
  </Link>
  <Link href="/admin/usuarios/novo" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-surface-muted">
    Convidar usuário
  </Link>
</div>
```

Keep the generic primary-action rendering for every other module. Update the users module description/copy to mention that both options are available and set the primary label to `Cadastrar usuário`.

- [x] **Step 2: Route the direct mode from the catch-all page.**

In `apps/web/app/(dashboard)/[...slug]/page.tsx`, read `searchParams` once, derive `modo`, and render `DirectUserForm` only when `path === "admin/usuarios/novo" && modo === "direto"`. Keep `RecordForm` for all other `/novo` paths.

- [x] **Step 3: Implement the direct user form with local password confirmation.**

Create `DirectUserForm` with fields for `full_name`, `email`, `password`, `password_confirmation`, `employee_number`, `position`, `role`, `branch_id`, `department_id`, and `cost_center_id`. Reuse the existing `RelationSelect`, Supabase browser session lookup, API base URL, `x-tenant-hostname`, field-error parsing, and redirect patterns from `RecordForm`.

Before `fetch`, reject mismatched passwords with the message `As senhas não coincidem.`. Send only the API payload fields (never `password_confirmation`) to `/v1/users`; on success call `router.push("/admin/usuarios")` and `router.refresh()`.

- [x] **Step 4: Run web typecheck and build.**

Run `pnpm --filter @inner-almox/web typecheck` and `pnpm --filter @inner-almox/web build`.

Expected result: both commands pass and the form compiles with the existing Tailwind/component conventions.

---

### Task 4: Document the endpoint and verify integrated behavior

**Files:**
- Modify: `docs/API.md`
- Modify: `docs/superpowers/plans/2026-09-24-direct-user-registration.md`

**Interfaces:**
- API documentation must distinguish direct creation from invitation.
- Plan checkboxes must record the commands and observed outcomes.

- [x] **Step 1: Document `POST /v1/users`.**

Under “Organização e usuários”, add `POST /v1/users` with a short note that it creates an active, confirmed user with an administrator-supplied initial password, while `/v1/users/invitations` sends an e-mail invitation.

- [x] **Step 2: Run the full API and web test suites.**

Run `pnpm test` and confirm the API, worker, and web test commands complete successfully.

- [x] **Step 3: Run lint, typecheck, and production build.**

Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`. Fix only issues caused by this feature; do not revert the existing automatic asset-code changes or local Supabase port override.

- [x] **Step 4: Execute the local direct-registration smoke test.**

With Redis, Supabase, API, and web running, authenticate as `admin@innerworks.local`, call `POST http://localhost:3333/v1/users` with a disposable unique e-mail and password, verify the response contains `status: "active"` and no password, verify the user appears in `GET /v1/users`, then delete only that disposable Auth user and membership through the local service-role cleanup path.

- [x] **Step 5: Review the final diff and status.**

Run `git diff --check`, `git status --short --branch`, and `git diff --stat`. Confirm that only the direct-registration files, the design/plan documentation, and previously-existing local changes are present; do not stage or modify `supabase/config.toml` unless explicitly requested.
