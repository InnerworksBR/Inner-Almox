-- Código interno de ativo: gerado automaticamente, único por tenant e imutável.

create table public.asset_code_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  next_value bigint not null default 1 check (next_value > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.asset_code_counters enable row level security;
revoke all on table public.asset_code_counters from public, anon, authenticated, service_role;

insert into public.asset_code_counters (tenant_id, next_value)
select tenant_id,
       coalesce(max(substring(internal_code from 5)::bigint), 0) + 1
from public.assets
where internal_code ~ '^ATV-[0-9]+$'
group by tenant_id
on conflict (tenant_id) do update
set next_value = greatest(public.asset_code_counters.next_value, excluded.next_value),
    updated_at = now();

create or replace function public.next_asset_internal_code(target_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  allocated bigint;
begin
  if target_tenant_id is null then
    raise exception 'tenant is required' using errcode = '23514';
  end if;

  insert into public.asset_code_counters (tenant_id, next_value)
  values (target_tenant_id, 2)
  on conflict (tenant_id) do update
    set next_value = public.asset_code_counters.next_value + 1,
        updated_at = now()
  returning next_value into allocated;

  return 'ATV-' || lpad((allocated - 1)::text, 6, '0');
end;
$$;

create or replace function public.assign_asset_internal_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.internal_code := public.next_asset_internal_code(new.tenant_id);
  elsif new.internal_code is distinct from old.internal_code then
    raise exception 'internal_code is system managed' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.next_asset_internal_code(uuid) from public;
revoke all on function public.assign_asset_internal_code() from public;

drop trigger if exists assets_assign_internal_code on public.assets;
create trigger assets_assign_internal_code
before insert or update on public.assets
for each row execute function public.assign_asset_internal_code();
