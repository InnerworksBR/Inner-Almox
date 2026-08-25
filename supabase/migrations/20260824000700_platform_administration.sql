-- Administração global da plataforma. Estas tabelas não são dados de negócio de
-- um tenant; por isso, possuem políticas globais exclusivas da equipe InnerWorks.

create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_-]*$'),
  name text not null,
  description text,
  user_limit integer check (user_limit is null or user_limit > 0),
  asset_limit integer check (asset_limit is null or asset_limit > 0),
  vehicle_limit integer check (vehicle_limit is null or vehicle_limit > 0),
  storage_limit_bytes bigint check (storage_limit_bytes is null or storage_limit_bytes > 0),
  module_keys text[] not null default '{}',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = (select auth.uid()) and status = 'active'
  );
$$;

create or replace function public.prevent_platform_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'platform audit logs are immutable' using errcode = '55000';
end; $$;

create trigger platform_admins_updated before update on public.platform_admins for each row execute function public.set_updated_at();
create trigger platform_plans_updated before update on public.platform_plans for each row execute function public.set_updated_at();
create trigger platform_audit_no_update before update on public.platform_audit_logs for each row execute function public.prevent_platform_audit_mutation();
create trigger platform_audit_no_delete before delete on public.platform_audit_logs for each row execute function public.prevent_platform_audit_mutation();

alter table public.platform_admins enable row level security;
alter table public.platform_plans enable row level security;
alter table public.platform_audit_logs enable row level security;
create policy platform_admins_read_self on public.platform_admins for select to authenticated using (user_id = (select auth.uid()) and status = 'active');
create policy platform_plans_read_admin on public.platform_plans for select to authenticated using (public.is_platform_admin());
create policy platform_audit_read_admin on public.platform_audit_logs for select to authenticated using (public.is_platform_admin());

revoke all on function public.is_platform_admin() from public;
revoke all on function public.prevent_platform_audit_mutation() from public;
grant execute on function public.is_platform_admin() to authenticated;
grant select on public.platform_admins, public.platform_plans, public.platform_audit_logs to authenticated;
grant all on public.platform_admins, public.platform_plans, public.platform_audit_logs to service_role;
grant usage, select on sequence public.platform_audit_logs_id_seq to service_role;

insert into public.platform_plans(code,name,description,user_limit,asset_limit,vehicle_limit,storage_limit_bytes,module_keys)
values
  ('internal','InnerWorks','Uso interno com todos os módulos',null,null,null,null,array['assets','maintenance','stock','fleet','inventories','reports']),
  ('starter','Starter','Operação essencial',10,500,5,5368709120,array['assets','stock','reports']),
  ('business','Business','Operação completa',50,5000,30,53687091200,array['assets','maintenance','stock','fleet','inventories','reports'])
on conflict (code) do nothing;

create or replace function public.provision_tenant(
  tenant_slug text,
  tenant_legal_name text,
  tenant_product_name text,
  tenant_hostname text,
  tenant_plan text,
  limit_users integer default null,
  limit_assets integer default null,
  limit_vehicles integer default null,
  limit_storage_bytes bigint default null,
  primary_color_value text default null,
  secondary_color_value text default null,
  enabled_modules text[] default '{}',
  domain_verified boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_tenant_id uuid;
declare module_key_value text;
begin
  insert into public.tenants(slug,legal_name,product_name,plan,user_limit,asset_limit,vehicle_limit,storage_limit_bytes)
  values(lower(trim(tenant_slug)),trim(tenant_legal_name),nullif(trim(tenant_product_name),''),tenant_plan,limit_users,limit_assets,limit_vehicles,limit_storage_bytes)
  returning id into new_tenant_id;
  insert into public.tenant_domains(tenant_id,hostname,is_primary,verified_at)
  values(new_tenant_id,lower(trim(trailing '.' from tenant_hostname)),true,case when domain_verified then now() else null end);
  insert into public.tenant_branding(tenant_id,product_name,primary_color,secondary_color)
  values(new_tenant_id,nullif(trim(tenant_product_name),''),primary_color_value,secondary_color_value);
  foreach module_key_value in array enabled_modules loop
    insert into public.tenant_modules(tenant_id,module_key,enabled) values(new_tenant_id,module_key_value,true);
  end loop;
  return new_tenant_id;
end; $$;

revoke all on function public.provision_tenant(text,text,text,text,text,integer,integer,integer,bigint,text,text,text[],boolean) from public;
grant execute on function public.provision_tenant(text,text,text,text,text,integer,integer,integer,bigint,text,text,text[],boolean) to service_role;
