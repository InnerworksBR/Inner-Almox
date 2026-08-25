create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit logs are immutable' using errcode = '55000';
end;
$$;

revoke all on function public.prevent_audit_log_mutation() from public;

create trigger audit_logs_prevent_update
  before update on public.audit_logs
  for each row execute function public.prevent_audit_log_mutation();
create trigger audit_logs_prevent_delete
  before delete on public.audit_logs
  for each row execute function public.prevent_audit_log_mutation();

insert into storage.buckets (id, name, public, file_size_limit)
values ('tenant-documents', 'tenant-documents', false, 52428800)
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit;

-- No direct object policies are created in Sprint 0. Without a policy, access is
-- denied by default. Future APIs must issue short-lived signed URLs after checking
-- both membership and tenant ownership of the requested object.
