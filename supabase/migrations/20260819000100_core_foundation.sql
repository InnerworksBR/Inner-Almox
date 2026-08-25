create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique,
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 200),
  product_name text,
  status text not null default 'active' check (status in ('active', 'suspended', 'inactive')),
  plan text not null default 'internal',
  user_limit integer check (user_limit is null or user_limit > 0),
  asset_limit integer check (asset_limit is null or asset_limit > 0),
  vehicle_limit integer check (vehicle_limit is null or vehicle_limit > 0),
  storage_limit_bytes bigint check (storage_limit_bytes is null or storage_limit_bytes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_slug_format check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  hostname extensions.citext not null unique,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_domains_hostname_format check (
    hostname::text = lower(hostname::text)
    and hostname::text ~ '^[a-z0-9]+(?:[.-][a-z0-9]+)*$'
  )
);

create unique index tenant_domains_one_primary_per_tenant
  on public.tenant_domains (tenant_id) where is_primary;
create index tenant_domains_tenant_id_idx on public.tenant_domains (tenant_id);

create table public.tenant_branding (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  product_name text,
  logo_path text,
  favicon_path text,
  login_image_path text,
  primary_color text check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_key),
  constraint tenant_modules_key_format check (module_key ~ '^[a-z][a-z0-9_-]*$')
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended', 'inactive')),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index tenant_memberships_user_id_idx on public.tenant_memberships (user_id);
create index tenant_memberships_tenant_status_idx on public.tenant_memberships (tenant_id, status);

create table public.membership_roles (
  membership_id uuid not null references public.tenant_memberships(id) on delete cascade,
  role text not null check (role in (
    'tenant_admin', 'asset_manager', 'warehouse_manager', 'fleet_manager',
    'maintenance_manager', 'department_manager', 'employee', 'auditor'
  )),
  created_at timestamptz not null default now(),
  primary key (membership_id, role)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  previous_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank check (char_length(trim(action)) > 0),
  constraint audit_logs_entity_not_blank check (char_length(trim(entity_type)) > 0)
);

create index audit_logs_tenant_created_idx on public.audit_logs (tenant_id, created_at desc);
create index audit_logs_tenant_entity_idx on public.audit_logs (tenant_id, entity_type, entity_id);
create index audit_logs_user_idx on public.audit_logs (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();
create trigger tenant_domains_set_updated_at before update on public.tenant_domains
  for each row execute function public.set_updated_at();
create trigger tenant_branding_set_updated_at before update on public.tenant_branding
  for each row execute function public.set_updated_at();
create trigger tenant_settings_set_updated_at before update on public.tenant_settings
  for each row execute function public.set_updated_at();
create trigger tenant_modules_set_updated_at before update on public.tenant_modules
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger tenant_memberships_set_updated_at before update on public.tenant_memberships
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    join public.tenants tenant on tenant.id = membership.tenant_id
    where membership.tenant_id = target_tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and tenant.status = 'active'
  );
$$;

create or replace function public.has_tenant_role(target_tenant_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    join public.membership_roles membership_role on membership_role.membership_id = membership.id
    join public.tenants tenant on tenant.id = membership.tenant_id
    where membership.tenant_id = target_tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and tenant.status = 'active'
      and membership_role.role = any(allowed_roles)
  );
$$;

create or replace function public.resolve_tenant_context(requested_hostname text)
returns table (
  tenant_id uuid,
  tenant_slug text,
  legal_name text,
  product_name text,
  logo_path text,
  favicon_path text,
  primary_color text,
  secondary_color text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    tenant.id,
    tenant.slug::text,
    tenant.legal_name,
    coalesce(branding.product_name, tenant.product_name, tenant.legal_name),
    branding.logo_path,
    branding.favicon_path,
    branding.primary_color,
    branding.secondary_color
  from public.tenant_domains domain
  join public.tenants tenant on tenant.id = domain.tenant_id
  left join public.tenant_branding branding on branding.tenant_id = tenant.id
  where domain.hostname = lower(trim(trailing '.' from requested_hostname))::extensions.citext
    and domain.verified_at is not null
    and tenant.status = 'active'
    and char_length(requested_hostname) <= 253
    and requested_hostname !~ '[/\\@]'
  limit 1;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.has_tenant_role(uuid, text[]) from public;
revoke all on function public.resolve_tenant_context(text) from public;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, text[]) to authenticated;
grant execute on function public.resolve_tenant_context(text) to anon, authenticated;

alter table public.tenants enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.tenant_branding enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.tenant_modules enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.membership_roles enable row level security;
alter table public.audit_logs enable row level security;

create policy tenants_select_member on public.tenants for select to authenticated
  using (public.is_tenant_member(id));
create policy tenant_domains_select_member on public.tenant_domains for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy tenant_branding_select_member on public.tenant_branding for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy tenant_settings_select_member on public.tenant_settings for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy tenant_modules_select_member on public.tenant_modules for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy profiles_select_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy memberships_select_authorized on public.tenant_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_tenant_role(tenant_id, array['tenant_admin']::text[])
  );
create policy membership_roles_select_authorized on public.membership_roles for select to authenticated
  using (exists (
    select 1 from public.tenant_memberships membership
    where membership.id = membership_id
      and (
        membership.user_id = (select auth.uid())
        or public.has_tenant_role(membership.tenant_id, array['tenant_admin']::text[])
      )
  ));
create policy audit_logs_select_authorized on public.audit_logs for select to authenticated
  using (public.has_tenant_role(tenant_id, array['tenant_admin', 'auditor']::text[]));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.tenants, public.tenant_domains, public.tenant_branding,
  public.tenant_settings, public.tenant_modules, public.profiles,
  public.tenant_memberships, public.membership_roles, public.audit_logs to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
