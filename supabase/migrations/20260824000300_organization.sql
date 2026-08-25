-- Sprint 1: estrutura empresarial e dados do colaborador.
-- Escritas permanecem restritas à service role e devem passar pela API Fastify.

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  manager_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  check (char_length(trim(code)) between 1 and 30),
  check (char_length(trim(name)) between 2 and 160)
);

create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  manager_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  check (char_length(trim(name)) between 2 and 160)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete restrict,
  parent_id uuid references public.departments(id) on delete restrict,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  code text not null,
  name text not null,
  manager_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  check (char_length(trim(name)) between 2 and 160),
  check (parent_id is null or parent_id <> id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete restrict,
  parent_id uuid references public.locations(id) on delete restrict,
  code text not null,
  name text not null,
  type text not null default 'room' check (type in ('building', 'floor', 'room', 'warehouse', 'garage', 'stock', 'other')),
  path text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  check (char_length(trim(name)) between 2 and 160),
  check (parent_id is null or parent_id <> id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  tax_id text,
  email text,
  phone text,
  contact_name text,
  categories text[] not null default '{}',
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(legal_name)) between 2 and 200)
);

alter table public.tenant_memberships
  add column employee_number text,
  add column position text,
  add column branch_id uuid references public.branches(id) on delete set null,
  add column department_id uuid references public.departments(id) on delete set null,
  add column cost_center_id uuid references public.cost_centers(id) on delete set null,
  add column manager_membership_id uuid references public.tenant_memberships(id) on delete set null,
  add column admission_date date,
  add column termination_date date,
  add column driver_license_number text,
  add column driver_license_category text,
  add column driver_license_expires_at date,
  add constraint memberships_employment_dates check (
    termination_date is null or admission_date is null or termination_date >= admission_date
  );

create unique index tenant_memberships_employee_number_unique
  on public.tenant_memberships (tenant_id, employee_number)
  where employee_number is not null;

create index branches_tenant_status_idx on public.branches (tenant_id, status);
create index departments_tenant_branch_idx on public.departments (tenant_id, branch_id, status);
create index cost_centers_tenant_status_idx on public.cost_centers (tenant_id, status);
create index locations_tenant_branch_idx on public.locations (tenant_id, branch_id, status);
create index suppliers_tenant_status_idx on public.suppliers (tenant_id, status);

create trigger branches_set_updated_at before update on public.branches
  for each row execute function public.set_updated_at();
create trigger departments_set_updated_at before update on public.departments
  for each row execute function public.set_updated_at();
create trigger cost_centers_set_updated_at before update on public.cost_centers
  for each row execute function public.set_updated_at();
create trigger locations_set_updated_at before update on public.locations
  for each row execute function public.set_updated_at();
create trigger suppliers_set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.branches enable row level security;
alter table public.departments enable row level security;
alter table public.cost_centers enable row level security;
alter table public.locations enable row level security;
alter table public.suppliers enable row level security;

create policy branches_select_member on public.branches for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy departments_select_member on public.departments for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy cost_centers_select_member on public.cost_centers for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy locations_select_member on public.locations for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy suppliers_select_member on public.suppliers for select to authenticated
  using (public.is_tenant_member(tenant_id));

grant select on public.branches, public.departments, public.cost_centers,
  public.locations, public.suppliers to authenticated;
grant all on public.branches, public.departments, public.cost_centers,
  public.locations, public.suppliers to service_role;
