-- Códigos internos dos cadastros: gerados automaticamente, únicos por tenant e imutáveis.

create table public.internal_code_counters (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_key text not null,
  next_value bigint not null default 1 check (next_value > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, resource_key)
);

alter table public.internal_code_counters enable row level security;
revoke all on table public.internal_code_counters from public, anon, authenticated, service_role;

insert into public.internal_code_counters (tenant_id, resource_key, next_value)
select tenant_id, 'branches', coalesce(max(substring(code from 5)::bigint), 0) + 1
from public.branches
where code ~ '^FIL-[0-9]+$'
group by tenant_id
on conflict (tenant_id, resource_key) do update
set next_value = greatest(public.internal_code_counters.next_value, excluded.next_value), updated_at = now();

insert into public.internal_code_counters (tenant_id, resource_key, next_value)
select tenant_id, 'departments', coalesce(max(substring(code from 5)::bigint), 0) + 1
from public.departments
where code ~ '^SET-[0-9]+$'
group by tenant_id
on conflict (tenant_id, resource_key) do update
set next_value = greatest(public.internal_code_counters.next_value, excluded.next_value), updated_at = now();

insert into public.internal_code_counters (tenant_id, resource_key, next_value)
select tenant_id, 'cost_centers', coalesce(max(substring(code from 4)::bigint), 0) + 1
from public.cost_centers
where code ~ '^CC-[0-9]+$'
group by tenant_id
on conflict (tenant_id, resource_key) do update
set next_value = greatest(public.internal_code_counters.next_value, excluded.next_value), updated_at = now();

insert into public.internal_code_counters (tenant_id, resource_key, next_value)
select tenant_id, 'locations', coalesce(max(substring(code from 5)::bigint), 0) + 1
from public.locations
where code ~ '^LOC-[0-9]+$'
group by tenant_id
on conflict (tenant_id, resource_key) do update
set next_value = greatest(public.internal_code_counters.next_value, excluded.next_value), updated_at = now();

insert into public.internal_code_counters (tenant_id, resource_key, next_value)
select tenant_id, 'stock_locations', coalesce(max(substring(code from 5)::bigint), 0) + 1
from public.stock_locations
where code ~ '^EST-[0-9]+$'
group by tenant_id
on conflict (tenant_id, resource_key) do update
set next_value = greatest(public.internal_code_counters.next_value, excluded.next_value), updated_at = now();

insert into public.internal_code_counters (tenant_id, resource_key, next_value)
select tenant_id, 'stock_products', coalesce(max(substring(code from 5)::bigint), 0) + 1
from public.stock_products
where code ~ '^PRO-[0-9]+$'
group by tenant_id
on conflict (tenant_id, resource_key) do update
set next_value = greatest(public.internal_code_counters.next_value, excluded.next_value), updated_at = now();

create or replace function public.next_internal_code(target_tenant_id uuid, target_resource_key text, target_prefix text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  allocated bigint;
begin
  if target_tenant_id is null or target_resource_key is null or target_prefix is null then
    raise exception 'tenant, resource and prefix are required' using errcode = '23514';
  end if;

  insert into public.internal_code_counters (tenant_id, resource_key, next_value)
  values (target_tenant_id, target_resource_key, 2)
  on conflict (tenant_id, resource_key) do update
    set next_value = public.internal_code_counters.next_value + 1,
        updated_at = now()
  returning next_value into allocated;

  return target_prefix || '-' || lpad((allocated - 1)::text, 6, '0');
end;
$$;

create or replace function public.assign_internal_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_prefix text;
begin
  target_prefix := case tg_table_name
    when 'branches' then 'FIL'
    when 'departments' then 'SET'
    when 'cost_centers' then 'CC'
    when 'locations' then 'LOC'
    when 'stock_locations' then 'EST'
    when 'stock_products' then 'PRO'
    else null
  end;

  if target_prefix is null then
    raise exception 'unsupported internal code table: %', tg_table_name using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    new.code := public.next_internal_code(new.tenant_id, tg_table_name, target_prefix);
  elsif new.code is distinct from old.code then
    raise exception 'code is system managed' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.next_internal_code(uuid, text, text) from public;
revoke all on function public.assign_internal_code() from public;

drop trigger if exists branches_assign_internal_code on public.branches;
create trigger branches_assign_internal_code
before insert or update on public.branches
for each row execute function public.assign_internal_code();

drop trigger if exists departments_assign_internal_code on public.departments;
create trigger departments_assign_internal_code
before insert or update on public.departments
for each row execute function public.assign_internal_code();

drop trigger if exists cost_centers_assign_internal_code on public.cost_centers;
create trigger cost_centers_assign_internal_code
before insert or update on public.cost_centers
for each row execute function public.assign_internal_code();

drop trigger if exists locations_assign_internal_code on public.locations;
create trigger locations_assign_internal_code
before insert or update on public.locations
for each row execute function public.assign_internal_code();

drop trigger if exists stock_locations_assign_internal_code on public.stock_locations;
create trigger stock_locations_assign_internal_code
before insert or update on public.stock_locations
for each row execute function public.assign_internal_code();

drop trigger if exists stock_products_assign_internal_code on public.stock_products;
create trigger stock_products_assign_internal_code
before insert or update on public.stock_products
for each row execute function public.assign_internal_code();
