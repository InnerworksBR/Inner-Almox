begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.tenants (id, slug, legal_name) values
  ('10000000-0000-0000-0000-000000000001', 'tenant-a-test', 'Tenant A'),
  ('10000000-0000-0000-0000-000000000002', 'tenant-b-test', 'Tenant B');

insert into public.tenant_settings (tenant_id, settings) values
  ('10000000-0000-0000-0000-000000000001', '{"owner":"A"}'),
  ('10000000-0000-0000-0000-000000000002', '{"owner":"B"}');

insert into public.tenant_memberships (id, tenant_id, user_id, status, joined_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'active', now()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'active', now());

insert into public.membership_roles (membership_id, role) values
  ('30000000-0000-0000-0000-000000000001', 'tenant_admin'),
  ('30000000-0000-0000-0000-000000000002', 'tenant_admin');

insert into public.branches (id, tenant_id, code, name) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A-HQ', 'Matriz A'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'B-HQ', 'Matriz B');

insert into public.asset_categories (id, tenant_id, name) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Notebooks A'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Notebooks B');

insert into public.assets (tenant_id, category_id, description, branch_id) values
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Ativo A', '40000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'Ativo B', '40000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select is((select count(*)::integer from public.tenants), 1, 'User A sees exactly one tenant');
select is((select count(*)::integer from public.tenants where id = '10000000-0000-0000-0000-000000000002'), 0, 'User A cannot read Tenant B');
select is((select count(*)::integer from public.tenant_settings), 1, 'User A sees one tenant settings row');
select is((select settings ->> 'owner' from public.tenant_settings), 'A', 'User A sees only Tenant A settings');
select is((select count(*)::integer from public.branches), 1, 'User A sees only its branch');
select is((select count(*)::integer from public.assets), 1, 'User A sees only its asset');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

select is((select count(*)::integer from public.tenants), 1, 'User B sees exactly one tenant');
select is((select count(*)::integer from public.tenants where id = '10000000-0000-0000-0000-000000000001'), 0, 'User B cannot read Tenant A');
select is((select count(*)::integer from public.tenant_settings), 1, 'User B sees one tenant settings row');
select is((select settings ->> 'owner' from public.tenant_settings), 'B', 'User B sees only Tenant B settings');
select is((select count(*)::integer from public.branches), 1, 'User B sees only its branch');
select is((select count(*)::integer from public.assets), 1, 'User B sees only its asset');
select throws_ok(
  $$insert into public.branches (tenant_id, code, name) values ('10000000-0000-0000-0000-000000000002', 'NO', 'Direct write')$$,
  '42501',
  'new row violates row-level security policy for table "branches"',
  'Authenticated users cannot bypass Fastify for writes'
);

select * from finish();
rollback;
