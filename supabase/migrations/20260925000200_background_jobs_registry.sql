alter table public.background_jobs
  alter column tenant_id drop not null;

create index if not exists background_jobs_created_at_idx
  on public.background_jobs (created_at desc);
