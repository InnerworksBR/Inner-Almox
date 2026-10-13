begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '23000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ana.nome@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '23000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'email.match@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '23000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'matricula@example.test', '', now(), '{}', '{}', now(), now());

update public.profiles set full_name = case id
  when '23000000-0000-4000-8000-000000000001'::uuid then 'Ana Nome'
  when '23000000-0000-4000-8000-000000000002'::uuid then 'Carlos Silva'
  when '23000000-0000-4000-8000-000000000003'::uuid then 'Bruno Souza'
end
where id in (
  '23000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000002',
  '23000000-0000-4000-8000-000000000003'
);
insert into public.tenants (id, slug, legal_name) values
  ('13000000-0000-4000-8000-000000000001', 'users-pagination-test', 'Users Pagination Test');
insert into public.tenant_memberships (id, tenant_id, user_id, status, employee_number) values
  ('33000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'active', 'EMP-001'),
  ('33000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000002', 'active', 'EMP-002'),
  ('33000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000003', 'active', 'ANA-MATRICULA');

set local role service_role;

select is((select count(*)::integer from public.list_tenant_users('13000000-0000-4000-8000-000000000001', 'ana')), 2, 'Busca encontra nome e matrícula');
select is((select count(*)::integer from public.list_tenant_users('13000000-0000-4000-8000-000000000001', 'email.match')), 1, 'Busca encontra e-mail');
select is((select full_name from public.list_tenant_users('13000000-0000-4000-8000-000000000001', 'ANA-MATRICULA')), 'Bruno Souza', 'Busca retorna a pessoa da matrícula');
select is((select count(*)::integer from public.list_tenant_users('13000000-0000-4000-8000-000000000001', 'não-encontrado')), 0, 'Busca sem correspondência retorna vazio');

select * from finish();
rollback;
