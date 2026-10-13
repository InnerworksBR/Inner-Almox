begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

set local role service_role;

insert into public.background_jobs (
  tenant_id, queue, external_job_id, type, status, payload
) values (
  null, 'platform-health', 'health-check-1', 'platform-health-check', 'completed', '{}'
);

select ok(
  exists(select 1 from public.background_jobs where external_job_id = 'health-check-1' and tenant_id is null),
  'Jobs de plataforma aceitam tenant_id nulo'
);
select ok(
  exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'background_jobs_created_at_idx'),
  'Jobs possuem índice por created_at'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select is(
  (select count(*)::integer from public.background_jobs where external_job_id = 'health-check-1'),
  0,
  'Usuários autenticados não enxergam jobs sem tenant'
);
select ok(
  exists(
    select 1
    from pg_constraint
    where conrelid = 'public.background_jobs'::regclass
      and contype = 'f'
      and conname = 'background_jobs_tenant_id_fkey'
  ),
  'A referência de tenant dos jobs permanece protegida'
);

select * from finish();
rollback;
