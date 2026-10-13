# Automatic Asset Internal Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate each asset's internal code automatically in the database, expose it as read-only, and keep the patrimonial number as the only manually entered identifier.

**Architecture:** A PostgreSQL trigger allocates a tenant-scoped sequence in a counter table and writes an immutable `ATV-000001`-style code on every asset insert. The Fastify contract rejects client-provided or updated `internal_code`, while the web form omits it and explains that the value is generated after saving.

**Tech Stack:** Supabase PostgreSQL migrations and pgTAP, Fastify/Zod, Next.js/React, Vitest, pnpm.

**Spec:** `docs/PRD.md`, asset registration and traceability requirements.

## Global Constraints

- Preserve multi-tenant isolation; the generated sequence is scoped by `tenant_id`.
- Keep `internal_code` unique and immutable; do not expose service-role capabilities to the frontend.
- Keep `asset_number` (patrimonial number) manually editable/optional.
- Do not use Prisma; keep schema changes in `supabase/migrations`.
- Do not commit the local Supabase port override in `supabase/config.toml` without explicit authorization.

### Task 1: Add failing API and database behavior tests

**Files:**
- Modify: `apps/api/test/app.test.ts`
- Create: `supabase/tests/asset_internal_code.sql`

**Interfaces:**
- The API must accept an asset creation payload without `internal_code`.
- The API must reject a client-supplied or updated `internal_code` with `PROTECTED_FIELD`.
- The database must return sequential tenant-scoped codes matching `ATV-` plus six digits and reject direct edits.

- [x] **Step 1: Write the failing Vitest cases** for creating an asset without `internal_code`, rejecting it on create, and rejecting it on update.
- [x] **Step 2: Run `pnpm --filter @inner-almox/api test -- app.test.ts`** and confirm the new cases fail because the current schema requires/permits the field incorrectly.
- [x] **Step 3: Write the failing pgTAP test** that inserts two assets, checks `ATV-000001`/`ATV-000002`, and asserts an update raises SQLSTATE `23514`.
- [x] **Step 4: Run `supabase test db`** and confirm the new database assertions fail before the migration exists.

### Task 2: Implement tenant-scoped immutable code generation

**Files:**
- Create: `supabase/migrations/20260924000100_automatic_asset_internal_code.sql`
- Modify: `supabase/tests/business_rules.sql`
- Modify: `supabase/tests/mvp_workflows.sql`
- Modify: `supabase/tests/role_scoped_reads.sql`
- Modify: `supabase/tests/rls_isolation.sql`
- Modify: `infra/scripts/acceptance.mjs`

**Interfaces:**
- Add `public.asset_code_counters(tenant_id, next_value)`.
- Add `public.next_asset_internal_code(uuid) returns text`.
- Add a `BEFORE INSERT OR UPDATE` trigger on `public.assets`.

- [x] **Step 1: Add the counter table, allocator function, and trigger**; allocate under row-level conflict locking so concurrent inserts cannot duplicate codes.
- [x] **Step 2: Preserve legacy non-empty codes while making every new insert automatic**, and reject any update that changes `internal_code`.
- [x] **Step 3: Run the focused pgTAP test** and verify it passes.
- [x] **Step 4: Update fixtures and acceptance flow** to stop supplying manual internal codes and assert the generated format instead.
- [x] **Step 5: Run the full database tests**; feature-specific and workflow tests pass, with one pre-existing RLS test retaining its prior error-message mismatch.

### Task 3: Enforce the contract in Fastify

**Files:**
- Modify: `apps/api/src/modules/business/routes.ts`
- Modify: `apps/api/test/app.test.ts`

**Interfaces:**
- `POST /v1/assets` accepts asset data without `internal_code` and returns the generated field from persistence.
- `POST /v1/assets` and `PATCH /v1/assets/:id` return `422 PROTECTED_FIELD` if the request tries to set `internal_code`.

- [x] **Step 1: Make `internal_code` optional in the incoming Zod schema** and add it to `protectedOnCreate.assets` and `protectedOnUpdate.assets`.
- [x] **Step 2: Run the focused API tests** and verify they pass.
- [x] **Step 3: Run the complete API test suite** and verify no regression in asset permissions or list queries.

### Task 4: Make the web flow display-only

**Files:**
- Modify: `apps/web/components/modules/record-form.tsx`

**Interfaces:**
- The new asset form must not render an editable `internal_code` input or include it in the POST payload.
- The form must tell the user that the internal code is generated automatically and shown after saving.
- The patrimonial number remains an editable field.

- [x] **Step 1: Remove the editable field from the asset form and add a read-only explanatory panel.**
- [x] **Step 2: Run web typecheck and build** to verify the form remains valid.
- [x] **Step 3: Run the integrated API/login smoke check** and confirm a created asset returns a generated code.

### Task 5: Final verification

**Files:**
- Verify only; no additional source files.

- [x] **Step 1: Run `pnpm lint`**.
- [x] **Step 2: Run `pnpm typecheck`**.
- [x] **Step 3: Run `pnpm test`**.
- [x] **Step 4: Run `pnpm build`**.
- [x] **Step 5: Check `git diff` and `git status`**, confirming only intended feature files plus the local Supabase port override are changed.
