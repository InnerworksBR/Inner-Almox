# Inner Almox EasyPanel Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Inner Almox Web, API, Worker, dedicated Redis, and dedicated Supabase stack into the isolated EasyPanel project `inner-almox`, then verify the first tenant can use it safely.

**Architecture:** Keep the existing pnpm monorepo and development Compose file. Build separate production images for Next.js, Fastify, and BullMQ Worker from the repository root; run them in a new EasyPanel project with private Redis and a separate self-hosted Supabase stack. Route browser traffic through temporary HTTPS hosts, keep secrets at runtime in EasyPanel, and migrate only the new empty database.

**Tech Stack:** Node.js 22, pnpm 10.26.2, Next.js 16 standalone output, Fastify 5, tsup, Supabase self-hosted Docker Compose, PostgreSQL migrations, Redis 8, BullMQ 6, Vitest, Docker, EasyPanel.

**Spec:** `docs/superpowers/specs/2026-10-13-easypanel-deployment-design.md`

## Global Constraints

- Use a separate EasyPanel project named `inner-almox`, with its own Supabase and Redis, and temporary HTTPS hosts.
- Do not alter existing EasyPanel projects, databases, Redis services, domains, volumes, or secrets.
- Use Node.js 22 and the repository's pnpm 10.26.2 lockfile.
- Keep `service_role`, database/JWT/Redis passwords, and SMTP credentials on the server only; never name them `NEXT_PUBLIC_*`.
- Publish only Web, API, and the Supabase gateway over HTTPS; do not publish PostgreSQL, Redis, Studio, or auxiliary Supabase ports.
- Keep public signup disabled and the email provider and email confirmation enabled so invitation-based access works.
- Keep `WEB_ORIGINS` restricted to the single public Web origin in the initial environment.
- Apply migrations only to the new empty Supabase database; never use `db reset` remotely or load the local development seed.
- Use the same public Supabase gateway URL for Web, API, and Worker so Auth token issuer validation remains consistent.
- Preserve persistent volumes during rollback; never delete a volume to recover from a failed deployment.
- Do not enable auto-deploy or add a permanent DNS domain in this rollout.

---

## File and service map

| Path or service | Responsibility |
| --- | --- |
| `apps/api/src/services/bootstrap-first-tenant.ts` | Testable, idempotent application of the initial tenant-admin membership through the existing privileged RPC |
| `apps/api/src/scripts/bootstrap-first-tenant.ts` | One-shot runtime entry point reading target tenant and invited admin from environment |
| `apps/api/test/bootstrap-first-tenant.test.ts` | Unit coverage for safe bootstrap, no-op, and failure cases |
| `apps/api/package.json` | Build the bootstrap entry alongside the API and expose its one-shot runtime command |
| `apps/web/next.config.ts` | Enable standalone output and trace workspace files from monorepo root |
| `infra/docker/web.Dockerfile` | Build and run the standalone Next.js Web image |
| `infra/docker/api.Dockerfile` | Build the Fastify bundle and install only API production dependencies |
| `infra/docker/worker.Dockerfile` | Build the Worker bundle and install only Worker production dependencies |
| `.dockerignore` | Exclude credentials, docs, tests, local state, generated output, and worktrees from Docker build contexts |
| `.env.example` | Document development/production variable names and the public-vs-secret boundary without values |
| `infra/docker/README.md` | Document image build commands and local image health checks |
| `docs/deployment/easypanel.md` | Operator runbook for variables, service topology, migrations, bootstrap, validation, backups, and rollback |
| EasyPanel project `inner-almox` | Isolated project containing `supabase`, `redis`, `api`, `worker`, and `web` services |

Keep the root `docker-compose.yml` as the local development Redis setup. It is not the production EasyPanel topology.

## Execution tasks

### Task 1: Add the guarded first-tenant bootstrap command

**Files:**
- Create: `apps/api/src/services/bootstrap-first-tenant.ts`
- Create: `apps/api/src/scripts/bootstrap-first-tenant.ts`
- Create: `apps/api/test/bootstrap-first-tenant.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Consumes: tenant UUID, invited administrator email, and a `BootstrapFirstTenantPort` exposing `findUserIdByEmail(email)`, `findMembershipRoles(tenantId, userId)`, and `provisionMembership(tenantId, userId)`.
- Produces: `bootstrapFirstTenantAdmin({ tenantId, email }, port): Promise<"created" | "already-member">`; the Supabase adapter invokes `provision_tenant_membership` with `target_roles: ["tenant_admin"]` and `employee_data: {}`.

- [ ] **Step 1: Write unit tests for creation, safe repeat, and refusal cases.**

Use fake ports; do not call Supabase from unit tests. Cover: passing the trimmed, lowercase email to the lookup; creating a missing membership; returning `already-member` without mutation when the user already has `tenant_admin`; refusing to replace an existing membership with different roles; failing without calling the RPC when no invited Auth user exists; propagating the RPC error. In the Supabase adapter, normalize each returned Auth user's email before comparing it to the normalized requested email.

```ts
const port: BootstrapFirstTenantPort = {
  findUserIdByEmail: vi.fn(async () => "10000000-0000-0000-0000-000000000001"),
  findMembershipRoles: vi.fn(async () => null),
  provisionMembership: vi.fn(async () => undefined)
};

await expect(bootstrapFirstTenantAdmin({
  tenantId: "20000000-0000-0000-0000-000000000001",
  email: "admin@example.com"
}, port)).resolves.toBe("created");

expect(port.provisionMembership).toHaveBeenCalledWith(
  "20000000-0000-0000-0000-000000000001",
  "10000000-0000-0000-0000-000000000001"
);
```

- [ ] **Step 2: Run the focused tests and confirm they fail for the missing service.**

Run: `pnpm --filter @inner-almox/api test -- bootstrap-first-tenant.test.ts`\
Expected: FAIL because `bootstrapFirstTenantAdmin` and `BootstrapFirstTenantPort` do not exist.

- [ ] **Step 3: Implement the bootstrap port and policy.**

Normalize the requested e-mail with trim/lowercase. The adapter must find an exact normalized match using paginated Supabase Admin Auth user listing, read membership roles for the supplied tenant/user pair, and call the existing RPC only if no membership exists. If an existing membership lacks `tenant_admin`, fail without changing roles. Do not log the service-role key, access token, SMTP values, or full Auth user record.

- [ ] **Step 4: Add the one-shot CLI.**

Read and validate `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BOOTSTRAP_TENANT_ID`, and `BOOTSTRAP_ADMIN_EMAIL`. Create a non-persistent Supabase client, run the service, log only the outcome and tenant UUID, and exit nonzero on validation or RPC failure. Update the API build script to compile both `src/server.ts` and `src/scripts/bootstrap-first-tenant.ts` as ESM, verify the CLI output path, and add package script `bootstrap:first-tenant` that runs that compiled entry.

- [ ] **Step 5: Compile and rerun focused and API tests.**

Run: `pnpm --filter @inner-almox/api typecheck`\
Run: `pnpm --filter @inner-almox/api test -- bootstrap-first-tenant.test.ts`\
Run: `pnpm --filter @inner-almox/api test`\
Expected: typecheck succeeds and all API tests pass.

### Task 2: Produce the standalone Web image

**Files:**
- Modify: `apps/web/next.config.ts`
- Create: `infra/docker/web.Dockerfile`
- Modify: `.dockerignore`
- Test: `pnpm --filter @inner-almox/web build`

**Interfaces:**
- Consumes build-only public values `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL`; consumes runtime `API_URL`, `APP_URL`, and `PLATFORM_ADMIN_EMAILS`.
- Produces a non-root Node.js 22 image exposing port 3000 and starting the generated standalone server with `HOSTNAME=0.0.0.0`.

- [ ] **Step 1: Enable standalone mode, workspace-root tracing, and the Docker context boundary.**

Preserve existing Next configuration. Add `output: "standalone"` and set `outputFileTracingRoot` to the repository root resolved from `apps/web/next.config.ts`. Create `.dockerignore` before running any image build. Exclude `.git`, `.worktrees`, all `node_modules`, `.next`, `dist`, `coverage`, tests, `docs`, `supabase`, `infra/scripts`, local `.env` files, and OS/editor metadata. Keep workspace manifests, lockfile, app source, `apps/web/public`, and required build configs in the context.

- [ ] **Step 2: Build Web with public test URLs and verify standalone artifacts.**

Run: `pnpm --filter @inner-almox/web build` with syntactically valid HTTPS test origins and a non-secret anon-key test value. Expected: build succeeds and Next emits the standalone server plus static assets. Do not use a service-role key as a build argument.

- [ ] **Step 3: Add the multi-stage Web Dockerfile.**

Use the root as context; enable Corepack; install from `pnpm-lock.yaml` using `pnpm install --frozen-lockfile`; build only `@inner-almox/web`; pass the three public values as build arguments; copy standalone output and `public`/static files into a Node.js 22 runtime stage; run as `node`; expose 3000; set the command to `node server.js` from the generated application directory.

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @inner-almox/web build
```

Complete the final stage with only standalone runtime files, set `PORT=3000` and `HOSTNAME=0.0.0.0`, create the Next cache directory owned by `node`, add an HTTP health check for `/login`, and do not copy any `.env` file.

- [ ] **Step 4: Build and run the image locally.**

Run: `docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://supabase.example.easypanel.host --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=local-public-test-key --build-arg NEXT_PUBLIC_API_URL=https://api.example.easypanel.host -f infra/docker/web.Dockerfile -t inner-almox-web:verify .`\
Run: `docker run --rm -d --name inner-almox-web-verify -p 3003:3000 inner-almox-web:verify`\
Check: `Invoke-WebRequest http://127.0.0.1:3003/login -UseBasicParsing` returns HTTP 200. Stop only the named verification container with `docker stop inner-almox-web-verify`.

### Task 3: Produce the API and Worker images

**Files:**
- Create: `infra/docker/api.Dockerfile`
- Create: `infra/docker/worker.Dockerfile`
- Modify: `.dockerignore`
- Test: `pnpm --filter @inner-almox/api build`
- Test: `pnpm --filter @inner-almox/worker build`

**Interfaces:**
- API image starts `dist/server.js`, listens on port 3333, and reports `GET /health`.
- Worker image starts `dist/worker.js`, opens no public port, and connects only to the dedicated Redis and Supabase configured at runtime.

- [ ] **Step 1: Build the current API and Worker bundles.**

Run: `pnpm --filter @inner-almox/api build`\
Run: `pnpm --filter @inner-almox/worker build`\
Expected: `apps/api/dist/server.js` and `apps/worker/dist/worker.js` exist.

- [ ] **Step 2: Add an API multi-stage Dockerfile.**

Use Node.js 22 and the lockfile from the repository root. Compile API plus its bootstrap entry in the builder. Use `pnpm --filter @inner-almox/api --prod deploy --legacy /prod` for its production dependency tree because the current workspace does not enable injected workspace packages. Copy `/prod` and `dist` into the runtime stage; run as `node`; expose 3333; set command `node dist/server.js`; add a Docker health check that requests `http://127.0.0.1:3333/health`.

- [ ] **Step 3: Add a Worker multi-stage Dockerfile.**

Compile `apps/worker`; use `pnpm --filter @inner-almox/worker --prod deploy --legacy /prod`; copy production dependencies and `dist/worker.js` to a Node.js 22 runtime stage; run as `node`; expose no ports; start with `node dist/worker.js`. Add a process liveness health check without exposing a new HTTP route.

- [ ] **Step 4: Build both images in Docker and verify their runtime commands.**

Run: `docker build -f infra/docker/api.Dockerfile -t inner-almox-api:verify .`\
Run: `docker build -f infra/docker/worker.Dockerfile -t inner-almox-worker:verify .`\
Expected: both builds exit 0. Start the API image with test-only Supabase/Redis URLs and call `/health`; start the Worker only when the local Redis endpoint is available and verify it connects, then stop the named containers.

### Task 4: Document the runtime contract and operations

**Files:**
- Modify: `.env.example`
- Modify: `infra/docker/README.md`
- Create: `docs/deployment/easypanel.md`

**Interfaces:**
- `.env.example` remains value-free and development-safe.
- The runbook names each variable, the service that receives it, whether it is build-time public or runtime secret, and where its value comes from.

- [ ] **Step 1: Verify `.dockerignore` still has the exact build boundary.**

Confirm `.dockerignore` excludes `.git`, `.worktrees`, `node_modules`, `**/node_modules`, `**/.next`, `**/dist`, `coverage`, `**/test`, `**/__tests__`, `docs`, `supabase`, `infra/scripts`, local `.env` files, and OS/editor metadata. Keep workspace manifests, lockfile, `apps/**/src`, `apps/web/public`, and required build configs in the context. Make any correction before building images.

- [ ] **Step 2: Update `.env.example` without adding credentials.**

Ensure it lists the existing public Web build variables, Web runtime `API_URL` and `PLATFORM_ADMIN_EMAILS`, API and Worker runtime variables, SMTP variables, `BOOTSTRAP_TENANT_ID`, and `BOOTSTRAP_ADMIN_EMAIL`. Keep secret values empty and preserve the current local defaults for ports.

- [ ] **Step 3: Replace the Docker README placeholder.**

Document root-context build commands for all three Dockerfiles, the public build-argument boundary for Web, the API health endpoint, and the fact that root `docker-compose.yml` remains local Redis only.

- [ ] **Step 4: Write the EasyPanel operator runbook.**

Record the exact service names, ports, exposure, and storage:

| Service | Name | Port | Public route | Persistent data |
| --- | --- | --- | --- | --- |
| Web | `web` | 3000 | temporary HTTPS host | none |
| API | `api` | 3333 | temporary HTTPS host | none |
| Worker | `worker` | none | none | none |
| Redis | `redis` | 6379 | none | Redis volume |
| Supabase | `supabase` | official template gateway | temporary HTTPS host on gateway only | Postgres and Storage volumes |

Include the EasyPanel project isolation, disabled auto-deploy, the full variable-to-service table, private Redis URL use, Auth site/redirect allowlist, email/signup settings, SMTP prerequisite, migration commands, bootstrap command, acceptance checks, backup/restore notes, log redaction, and non-destructive rollback. Use variable names and commands only; include no generated values or secrets.

- [ ] **Step 5: Review the operator instructions against application code.**

Confirm `API_URL` is the server-side URL used by `apps/web/lib/api/server.ts`; `NEXT_PUBLIC_API_URL` is the browser URL; `PLATFORM_ADMIN_EMAILS` reaches both Web and API; `WEB_ORIGINS` is the exact Web origin; and Supabase Auth allows `/auth/callback` for invite and recovery.

### Task 5: Run release and image security checks

**Files:**
- Test: the three production Dockerfiles
- Test: generated image contents and public Web assets
- Modify: only files required to fix a failing check from Tasks 1–4

- [ ] **Step 1: Run repository quality checks.**

Set only non-secret public build values for this local check:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://supabase.invalid"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "non-secret-build-test-key"
$env:NEXT_PUBLIC_API_URL = "https://api.invalid"
$env:API_URL = "http://api:3333"
$env:PLATFORM_ADMIN_EMAILS = "admin@example.invalid"
pnpm lint
pnpm typecheck
pnpm test
pnpm build
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL,Env:NEXT_PUBLIC_SUPABASE_ANON_KEY,Env:NEXT_PUBLIC_API_URL,Env:API_URL,Env:PLATFORM_ADMIN_EMAILS
```

Expected: all commands exit 0. The current baseline is 82 application tests. Never add `SUPABASE_SERVICE_ROLE_KEY` or a database URL to this build shell.

- [ ] **Step 2: Build all three final images from a clean Docker context.**

Run the Web, API, and Worker Docker build commands from `infra/docker/README.md`. Expected: each Dockerfile installs from the frozen root lockfile and starts its documented process in the final runtime stage.

- [ ] **Step 3: Check image and bundle boundaries.**

Create a temporary root `.env.production.local` file containing only the non-secret sentinel `SERVER_ROLE_CANARY_NOT_A_REAL_SECRET`, build the images, then remove that file. Search image file lists and Web static output for the sentinel and `.env` files. Expected: neither appears in an image, no server key is present in `.next/static`, and Web build arguments contain only public values. Inspect Docker history to confirm no runtime secret was passed to a build layer.

- [ ] **Step 4: Check development remains unchanged.**

Run: `docker compose config`\
Expected: the existing local Redis Compose configuration still validates and exposes Redis only for local development.

### Task 6: EasyPanel read-only preflight

**Files:** none; do not mutate EasyPanel during this task.

- [ ] **Step 1: Confirm project name availability.**

List projects and services. Confirm no project named `inner-almox` exists and record only resource names/statuses, never environment values.

- [ ] **Step 2: Confirm server capacity.**

Inspect current CPU, memory, and disk use and the resource needs shown by the EasyPanel Supabase template. If a dedicated Supabase installation would reduce or destabilize an existing service, stop before project creation and report the measured blocker.

- [ ] **Step 3: Confirm template and service capabilities.**

Check the current EasyPanel Supabase template version, persistent volume support, private service addressing, public gateway port, and HTTPS host generation. Confirm Redis can use a dedicated password and volume without a public port.

### Task 7: Create the isolated data services

**External effects:** Creating Redis or Compose resources starts a deployment. Run this task only after the deployment change list is concrete and approved.

- [ ] **Step 1: Create EasyPanel project `inner-almox`.**

Use the exact lower-case project name. Verify its isolated Docker network and confirm no existing project was selected.

- [ ] **Step 2: Create dedicated Redis.**

Use service name `redis`, generate a unique Redis password, disable published/external port access, enable persistence and health checking, and record the private connection host without printing its password.

- [ ] **Step 3: Install a new official Supabase self-hosted template in the new project.**

Generate new database, JWT, anon, service-role, dashboard, and other template-required secrets. Use separate persistent Postgres and Storage volumes. Route only the gateway HTTPS endpoint publicly; keep PostgreSQL, internal Redis, Studio, and auxiliary services private.

- [ ] **Step 4: Record generated hosts for application configuration.**

Record the Web origin, API origin, and Supabase gateway origin. Confirm the Supabase gateway is HTTPS and only its gateway port is public. Configure Auth after the Web host is assigned in Task 8; do not invite users yet.

### Task 8: Attach and deploy application services

**External effects:** Each Git-backed application service can build and start on creation. Complete its source, domain, build values, runtime environment, and health settings before triggering its first deploy.

- [ ] **Step 1: Create unconfigured app shells and resolve temporary hosts.**

Create empty Web, API, and Worker app-service shells without Git source or deployment. Assign temporary host mappings only to `web:3000` and `api:3333`; obtain the Supabase gateway host from the new Supabase stack. Record the exact origins returned by EasyPanel. Do not add a permanent domain or expose service ports directly. Confirm TLS after the first configured deployment, before inviting users or enabling tenant domains.

- [ ] **Step 2: Configure Auth, API, and Worker runtime.**

Set Supabase Auth `SITE_URL` and the invite/recovery callback allowlist to the exact Web origin and `/auth/callback`; disable public signup, keep email auth and confirmation enabled, and configure SMTP only from the approved new credentials. Set API to port 3333, `HOST=0.0.0.0`, `TRUST_PROXY=true`, and `WEB_ORIGINS` equal to the exact generated Web origin with no additional origin. Set `SUPABASE_URL` to the same canonical public gateway URL used by Web and Worker, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, the private authenticated `REDIS_URL`, `QUEUE_VALIDATION_ENABLED=true`, approved `PLATFORM_ADMIN_EMAILS`, and `DOCUMENT_PUBLIC_URL`/`QR_CODE_BASE_URL` to the Web origin. Set Worker to the same canonical `SUPABASE_URL`, the same private `REDIS_URL`, and server-only `SUPABASE_SERVICE_ROLE_KEY`; add SMTP only after approved credentials are available.

- [ ] **Step 3: Verify the untouched target database before migration.**

Connect only to the new project database. Confirm the database is empty of application tables and has no user data. Record the target project and connection identity without recording the password.

- [ ] **Step 4: Apply and list versioned migrations on the new database only.**

Provide the new database URL via a protected environment variable named `SUPABASE_DB_URL`, never print it, and run:

```powershell
pnpm exec supabase migration list --db-url $env:SUPABASE_DB_URL
pnpm exec supabase db push --db-url $env:SUPABASE_DB_URL
pnpm exec supabase migration list --db-url $env:SUPABASE_DB_URL
Remove-Item Env:SUPABASE_DB_URL
```

Expected: all repository migrations are listed as applied to this new database. Stop immediately if the endpoint or project identity does not match `inner-almox`.

- [ ] **Step 5: Configure Web and image builds, then attach source.**

Build Web with the assigned public Supabase URL, anon key, and API URL. Set Web runtime `APP_URL` to the Web origin, `API_URL` to the API origin for server-side requests, and `PLATFORM_ADMIN_EMAILS` to the approved administrator list. Configure the API and Worker Dockerfile builds with root repository context and their runtime variables. Disable automatic deploy/webhooks. Only after migrations, domains, build settings, and runtime environment are complete, attach Git source `InnerworksBR/Inner-Almox` at the approved, merged `main` commit to the empty app shells; if attaching source does not start a build automatically, trigger one manual deploy per service. Never attach the feature branch directly to production.

- [ ] **Step 6: Create and associate the first platform/tenant administrator.**

Invite the approved admin email using Supabase Auth administration; accept the invite at the Web host; ensure the exact address is in API and Web `PLATFORM_ADMIN_EMAILS`; provision the first tenant using the platform UI; verify its host DNS/TLS; mark the tenant domain verified; run `node dist/scripts/bootstrap-first-tenant.js` inside the trusted API runtime with `BOOTSTRAP_TENANT_ID` and `BOOTSTRAP_ADMIN_EMAIL`; confirm the command reports success without printing credentials.

### Task 9: Production smoke tests and handoff

**Files:**
- Modify: `docs/deployment/easypanel.md` with the deployed version, actual generated hosts, check results, backup evidence, and redacted timestamps

- [ ] **Step 1: Verify public and private health.**

Confirm Web login returns 200; API `/health` returns `{"status":"ok"}`; Supabase Auth, REST, and Storage respond; Redis is reachable only from the private project network; Worker process is healthy. Run one controlled BullMQ job so the admin health panel records recent Worker activity.

- [ ] **Step 2: Verify auth and tenant operations.**

Test invitation acceptance, email confirmation, sign-in, recovery callback, admin-only authorization, tenant membership, one authorized API read/write, CORS from the exact Web origin, rejection of another origin, and RLS/tenant isolation.

- [ ] **Step 3: Verify file, queue, and secret handling.**

Exercise private bucket upload and signed download; enqueue and complete a test job; review logs and public Web assets for bearer tokens, service role, database/JWT/Redis secrets, SMTP credentials, and the test canary.

- [ ] **Step 4: Verify persistence and backup recovery path.**

Restart Web/API/Worker, then Redis and Supabase only after checks and a fresh backup. Confirm application records and uploaded object metadata persist. Record the backup identifier and the available restore procedure without publishing credentials.

- [ ] **Step 5: Record readiness and remaining blockers.**

Update the runbook with version/commit, hosts, service health, migration result, test result, backup evidence, and pending SMTP/admin items. Do not mark ready for users until invitation, recovery, storage, and queue checks pass.

## Rollback checklist

1. If an app image fails, stop/revert only the affected Web/API/Worker version and retain all service volumes.
2. If new Supabase/Redis fail before migrations, stop their services but preserve their volumes for diagnosis.
3. If a migration fails, stop the app rollout and preserve database state; do not run remote reset, drop statements, or restore over the database automatically.
4. If an Auth host or redirect is wrong, disable the affected Web/API route until the host and allowlist match; do not broaden CORS or Auth redirects to wildcards.
5. Use a restore only from a verified backup and only after a separate explicit recovery decision.

## Plan self-review

- Spec coverage: isolation, Web/API/Worker images, Next build-time public variables, API runtime variables, SMTP, Auth signup/redirect behavior, private Redis, self-hosted Supabase, migrations, RLS/storage, first platform admin, tenant membership bootstrap, health, backup, and rollback each map to Tasks 1–9.
- Placeholder scan: no task uses TBD/TODO or asks the implementer to invent unspecified service names, ports, variable names, or commands. Generated EasyPanel hostnames are explicitly obtained and recorded at Task 8 because they do not exist before resource creation.
- Type consistency: Task 1 defines the single bootstrap port and outcome values used by its tests, CLI, and runbook.
- Workspace packaging: pnpm 10.26.2 rejects default deploy for this non-injected workspace. A local Windows probe of `--legacy` reached materialization but failed with `EPERM chmod`; Docker uses Linux, so confirm `--legacy` in Linux image builds. If Linux also rejects it, stop before provisioning, enable `injectWorkspacePackages: true` in `pnpm-workspace.yaml`, regenerate the lockfile with the same pnpm version, and rerun all quality checks before using default deploy.
- Next standalone source: use `outputFileTracingRoot` for the monorepo and copy generated standalone/static/public output as documented by [Next.js output configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
- Docker client and daemon are available locally as Docker 29.7.2; run actual Linux image builds before EasyPanel provisioning.
