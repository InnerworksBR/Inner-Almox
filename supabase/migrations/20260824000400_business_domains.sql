-- Sprints 2 a 8: domínios de patrimônio, estoque, frota, manutenção e inventário.
-- Todos os relacionamentos de negócio usam tenant_id também na FK para impedir
-- associações cruzadas mesmo quando executadas pela service role.

create table public.asset_categories (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  parent_id uuid, name text not null, description text, status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, id), unique (tenant_id, name),
  foreign key (tenant_id, parent_id) references public.asset_categories(tenant_id, id) on delete restrict
);

create table public.assets (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  internal_code text not null, asset_number text, serial_number text, category_id uuid, brand text, model text,
  description text not null, condition text not null default 'good' check (condition in ('new','good','fair','poor','damaged')),
  status text not null default 'available' check (status in ('available','in_use','reserved','loaned','in_maintenance','awaiting_maintenance','in_transfer','lost','damaged','obsolete','disposed','sold','donated')),
  branch_id uuid, location_id uuid, department_id uuid, cost_center_id uuid, responsible_user_id uuid, supplier_id uuid,
  purchase_date date, purchase_value numeric(14,2) check (purchase_value is null or purchase_value >= 0), invoice_number text,
  warranty_starts_at date, warranty_ends_at date, estimated_life_months integer check (estimated_life_months is null or estimated_life_months > 0),
  notes text, qr_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, id), unique (tenant_id, internal_code), unique (tenant_id, qr_token),
  foreign key (tenant_id, category_id) references public.asset_categories(tenant_id, id) on delete restrict,
  foreign key (tenant_id, branch_id) references public.branches(tenant_id, id) on delete restrict,
  foreign key (tenant_id, location_id) references public.locations(tenant_id, id) on delete restrict,
  foreign key (tenant_id, department_id) references public.departments(tenant_id, id) on delete restrict,
  foreign key (tenant_id, cost_center_id) references public.cost_centers(tenant_id, id) on delete restrict,
  foreign key (tenant_id, supplier_id) references public.suppliers(tenant_id, id) on delete set null,
  check (warranty_ends_at is null or warranty_starts_at is null or warranty_ends_at >= warranty_starts_at)
);
create unique index assets_asset_number_unique on public.assets(tenant_id, asset_number) where asset_number is not null;
create unique index assets_serial_number_unique on public.assets(tenant_id, serial_number) where serial_number is not null;

create table public.asset_custom_fields (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid, name text not null, field_key text not null, field_type text not null check (field_type in ('text','number','date','boolean','select')),
  options jsonb not null default '[]'::jsonb, required boolean not null default false, position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (tenant_id,id), unique(tenant_id,field_key),
  foreign key (tenant_id,category_id) references public.asset_categories(tenant_id,id) on delete cascade
);
create table public.asset_custom_values (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_id uuid not null, field_id uuid not null, value jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(asset_id,field_id),
  foreign key (tenant_id,asset_id) references public.assets(tenant_id,id) on delete cascade,
  foreign key (tenant_id,field_id) references public.asset_custom_fields(tenant_id,id) on delete cascade
);
create table public.asset_files (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_id uuid not null, kind text not null check (kind in ('image','invoice','warranty','contract','manual','report','certificate','other')),
  name text not null, storage_path text not null, mime_type text, size_bytes bigint check (size_bytes is null or size_bytes >= 0), expires_at date,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,asset_id) references public.assets(tenant_id,id) on delete cascade
);
create table public.asset_movements (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  asset_id uuid not null, type text not null check (type in ('delivery','return','loan','department_transfer','branch_transfer','reservation','maintenance_out','maintenance_return','disposal','sale','donation','loss')),
  origin jsonb not null default '{}'::jsonb, destination jsonb not null default '{}'::jsonb,
  previous_responsible_user_id uuid references public.profiles(id) on delete set null, new_responsible_user_id uuid references public.profiles(id) on delete set null,
  performed_by uuid not null references public.profiles(id) on delete restrict, reason text, previous_condition text, new_condition text,
  occurred_at timestamptz not null default now(), accepted_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,asset_id) references public.assets(tenant_id,id) on delete restrict
);
create table public.asset_terms (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  movement_id uuid, asset_id uuid, type text not null, validation_code text not null, storage_path text,
  content_snapshot jsonb not null, issued_to uuid references public.profiles(id) on delete restrict, accepted_at timestamptz,
  created_at timestamptz not null default now(), unique(tenant_id,id), unique(validation_code),
  foreign key (tenant_id,movement_id) references public.asset_movements(tenant_id,id) on delete restrict,
  foreign key (tenant_id,asset_id) references public.assets(tenant_id,id) on delete restrict
);

create table public.warranties (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_id uuid not null, supplier_id uuid, type text not null, provider text, starts_at date, ends_at date not null,
  coverage text, document_path text, notes text, status text not null default 'active' check (status in ('active','expired','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,asset_id) references public.assets(tenant_id,id) on delete cascade,
  foreign key (tenant_id,supplier_id) references public.suppliers(tenant_id,id) on delete set null,
  check (starts_at is null or ends_at >= starts_at)
);
create table public.maintenance_plans (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_id uuid not null, name text not null, criterion text not null check (criterion in ('date','days','mileage','hours','cycles','manufacturer')),
  interval_value integer, next_due_at date, next_due_measure numeric(14,2), instructions text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,asset_id) references public.assets(tenant_id,id) on delete cascade
);
create table public.maintenance_orders (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  number text not null, asset_id uuid not null, plan_id uuid, supplier_id uuid,
  type text not null check (type in ('preventive','corrective','inspection','calibration','revision','cleaning','update','part_replacement')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  reported_problem text not null, diagnosis text, solution text, assigned_to uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now(), expected_at timestamptz, completed_at timestamptz,
  parts_cost numeric(14,2) not null default 0 check(parts_cost >= 0), service_cost numeric(14,2) not null default 0 check(service_cost >= 0),
  downtime_minutes integer check(downtime_minutes is null or downtime_minutes >= 0),
  status text not null default 'open' check(status in ('open','analysis','awaiting_approval','awaiting_supplier','awaiting_part','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,number),
  foreign key (tenant_id,asset_id) references public.assets(tenant_id,id) on delete restrict,
  foreign key (tenant_id,plan_id) references public.maintenance_plans(tenant_id,id) on delete set null,
  foreign key (tenant_id,supplier_id) references public.suppliers(tenant_id,id) on delete set null
);
create table public.maintenance_costs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_id uuid not null, description text not null, category text not null, amount numeric(14,2) not null check(amount >= 0), occurred_at date not null default current_date,
  created_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,order_id) references public.maintenance_orders(tenant_id,id) on delete restrict
);

create table public.stock_categories (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  parent_id uuid, name text not null, status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,name),
  foreign key (tenant_id,parent_id) references public.stock_categories(tenant_id,id) on delete restrict
);
create table public.stock_locations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid not null, name text not null, code text not null, status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,code),
  foreign key (tenant_id,location_id) references public.locations(tenant_id,id) on delete restrict
);
create table public.stock_products (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null, sku text, name text not null, category_id uuid, unit text not null, brand text, manufacturer text,
  minimum_stock numeric(14,3) not null default 0 check(minimum_stock >= 0), maximum_stock numeric(14,3) check(maximum_stock is null or maximum_stock >= minimum_stock),
  reorder_point numeric(14,3) check(reorder_point is null or reorder_point >= 0), average_cost numeric(14,4) not null default 0 check(average_cost >= 0),
  batch_control boolean not null default false, expiry_control boolean not null default false, preferred_supplier_id uuid,
  barcode text, image_path text, status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,code),
  foreign key (tenant_id,category_id) references public.stock_categories(tenant_id,id) on delete restrict,
  foreign key (tenant_id,preferred_supplier_id) references public.suppliers(tenant_id,id) on delete set null
);
create unique index stock_products_sku_unique on public.stock_products(tenant_id,sku) where sku is not null;
create table public.stock_batches (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  product_id uuid not null, stock_location_id uuid not null, supplier_id uuid, number text not null, received_at date not null default current_date,
  expires_at date, unit_cost numeric(14,4) not null default 0 check(unit_cost >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,product_id,number),
  foreign key (tenant_id,product_id) references public.stock_products(tenant_id,id) on delete restrict,
  foreign key (tenant_id,stock_location_id) references public.stock_locations(tenant_id,id) on delete restrict,
  foreign key (tenant_id,supplier_id) references public.suppliers(tenant_id,id) on delete set null
);
create table public.stock_balances (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null, stock_location_id uuid not null, batch_id uuid, quantity numeric(14,3) not null default 0 check(quantity >= 0),
  updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,product_id) references public.stock_products(tenant_id,id) on delete cascade,
  foreign key (tenant_id,stock_location_id) references public.stock_locations(tenant_id,id) on delete cascade,
  foreign key (tenant_id,batch_id) references public.stock_batches(tenant_id,id) on delete cascade
);
create unique index stock_balances_unique_scope on public.stock_balances(tenant_id,product_id,stock_location_id,coalesce(batch_id,'00000000-0000-0000-0000-000000000000'::uuid));
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  product_id uuid not null, stock_location_id uuid not null, batch_id uuid,
  type text not null check(type in ('purchase_in','return_in','positive_adjustment','consumption_out','requisition_out','loss_out','negative_adjustment','transfer_in','transfer_out','reservation','inventory')),
  quantity numeric(14,3) not null check(quantity > 0), unit_cost numeric(14,4) check(unit_cost is null or unit_cost >= 0), document_number text,
  department_id uuid, cost_center_id uuid, requested_by uuid references public.profiles(id) on delete set null, performed_by uuid not null references public.profiles(id) on delete restrict,
  reason text, occurred_at timestamptz not null default now(), created_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,product_id) references public.stock_products(tenant_id,id) on delete restrict,
  foreign key (tenant_id,stock_location_id) references public.stock_locations(tenant_id,id) on delete restrict,
  foreign key (tenant_id,batch_id) references public.stock_batches(tenant_id,id) on delete restrict,
  foreign key (tenant_id,department_id) references public.departments(tenant_id,id) on delete set null,
  foreign key (tenant_id,cost_center_id) references public.cost_centers(tenant_id,id) on delete set null
);
create table public.stock_requisitions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  number text not null, requested_by uuid not null references public.profiles(id) on delete restrict, department_id uuid, cost_center_id uuid,
  purpose text not null, status text not null default 'draft' check(status in ('draft','requested','awaiting_approval','approved','rejected','separating','ready','delivered','partially_fulfilled','cancelled')),
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz, delivered_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,number),
  foreign key (tenant_id,department_id) references public.departments(tenant_id,id) on delete restrict,
  foreign key (tenant_id,cost_center_id) references public.cost_centers(tenant_id,id) on delete restrict
);
create table public.stock_requisition_items (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  requisition_id uuid not null, product_id uuid not null, requested_quantity numeric(14,3) not null check(requested_quantity > 0),
  approved_quantity numeric(14,3) check(approved_quantity is null or approved_quantity >= 0), delivered_quantity numeric(14,3) not null default 0 check(delivered_quantity >= 0), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(requisition_id,product_id),
  foreign key (tenant_id,requisition_id) references public.stock_requisitions(tenant_id,id) on delete restrict,
  foreign key (tenant_id,product_id) references public.stock_products(tenant_id,id) on delete restrict
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  plate text not null, renavam text, chassis text, brand text not null, model text not null, model_year integer, color text, type text, fuel_type text,
  capacity integer, branch_id uuid, cost_center_id uuid, status text not null default 'available' check(status in ('available','in_use','reserved','in_maintenance','unavailable','damaged','sold','returned_to_lessor')),
  current_mileage numeric(14,1) not null default 0 check(current_mileage >= 0), acquired_at date, purchase_value numeric(14,2), ownership_type text, lessor text, policy_number text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,plate),
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  foreign key (tenant_id,cost_center_id) references public.cost_centers(tenant_id,id) on delete restrict
);
create table public.vehicle_drivers (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid not null references public.tenant_memberships(id) on delete cascade, license_number text not null, category text not null,
  expires_at date not null, restrictions text[], status text not null default 'active' check(status in ('active','suspended','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,membership_id)
);
create table public.vehicle_authorizations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  driver_id uuid not null, vehicle_id uuid, vehicle_type text, valid_from date not null default current_date, valid_until date, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,driver_id) references public.vehicle_drivers(tenant_id,id) on delete cascade,
  foreign key (tenant_id,vehicle_id) references public.vehicles(tenant_id,id) on delete cascade
);
create table public.vehicle_reservations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  vehicle_id uuid not null, driver_id uuid not null, starts_at timestamptz not null, ends_at timestamptz not null, destination text, purpose text not null,
  status text not null default 'requested' check(status in ('requested','approved','rejected','cancelled','in_use','completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,vehicle_id) references public.vehicles(tenant_id,id) on delete restrict,
  foreign key (tenant_id,driver_id) references public.vehicle_drivers(tenant_id,id) on delete restrict,
  check(ends_at > starts_at)
);
create table public.vehicle_usages (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  vehicle_id uuid not null, driver_id uuid not null, reservation_id uuid, checked_out_at timestamptz not null default now(), returned_at timestamptz,
  initial_mileage numeric(14,1) not null check(initial_mileage >= 0), final_mileage numeric(14,1), destination text, purpose text, cost_center_id uuid,
  initial_fuel_level smallint check(initial_fuel_level between 0 and 100), final_fuel_level smallint check(final_fuel_level between 0 and 100),
  damages text, notes text, status text not null default 'active' check(status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,vehicle_id) references public.vehicles(tenant_id,id) on delete restrict,
  foreign key (tenant_id,driver_id) references public.vehicle_drivers(tenant_id,id) on delete restrict,
  foreign key (tenant_id,reservation_id) references public.vehicle_reservations(tenant_id,id) on delete set null,
  foreign key (tenant_id,cost_center_id) references public.cost_centers(tenant_id,id) on delete restrict,
  check(final_mileage is null or final_mileage >= initial_mileage), check(returned_at is null or returned_at >= checked_out_at)
);
create table public.vehicle_checklists (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  usage_id uuid not null, phase text not null check(phase in ('checkout','return')), answers jsonb not null, notes text,
  completed_by uuid not null references public.profiles(id) on delete restrict, completed_at timestamptz not null default now(), unique(tenant_id,id), unique(usage_id,phase),
  foreign key (tenant_id,usage_id) references public.vehicle_usages(tenant_id,id) on delete restrict
);
create table public.vehicle_fuelings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  vehicle_id uuid not null, driver_id uuid, occurred_at timestamptz not null, station text, fuel_type text not null,
  liters numeric(12,3) not null check(liters > 0), unit_price numeric(12,4) not null check(unit_price >= 0), total_amount numeric(14,2) not null check(total_amount >= 0),
  mileage numeric(14,1) not null check(mileage >= 0), receipt_path text, cost_center_id uuid,
  created_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,vehicle_id) references public.vehicles(tenant_id,id) on delete restrict,
  foreign key (tenant_id,driver_id) references public.vehicle_drivers(tenant_id,id) on delete set null,
  foreign key (tenant_id,cost_center_id) references public.cost_centers(tenant_id,id) on delete restrict
);
create table public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  vehicle_id uuid not null, type text not null check(type in ('toll','parking','washing','fine','insurance','licensing','tire','maintenance','rental','other')),
  description text not null, amount numeric(14,2) not null check(amount >= 0), occurred_at date not null, supplier_id uuid, cost_center_id uuid, receipt_path text,
  created_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,vehicle_id) references public.vehicles(tenant_id,id) on delete restrict,
  foreign key (tenant_id,supplier_id) references public.suppliers(tenant_id,id) on delete set null,
  foreign key (tenant_id,cost_center_id) references public.cost_centers(tenant_id,id) on delete restrict
);
create table public.vehicle_fines (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  vehicle_id uuid not null, driver_id uuid, occurred_at timestamptz not null, location text, type text not null, amount numeric(14,2) not null check(amount >= 0), points integer check(points between 0 and 20),
  document_path text, status text not null default 'open' check(status in ('open','appealed','paid','cancelled')), payment_responsible text, due_at date, appeal_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,vehicle_id) references public.vehicles(tenant_id,id) on delete restrict,
  foreign key (tenant_id,driver_id) references public.vehicle_drivers(tenant_id,id) on delete set null
);
create table public.vehicle_incidents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  vehicle_id uuid not null, driver_id uuid, type text not null check(type in ('accident','damage','theft','breakdown','misuse','mileage_divergence','out_of_fuel','late_return')),
  occurred_at timestamptz not null, description text not null, location text, status text not null default 'open' check(status in ('open','investigating','resolved','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,vehicle_id) references public.vehicles(tenant_id,id) on delete restrict,
  foreign key (tenant_id,driver_id) references public.vehicle_drivers(tenant_id,id) on delete set null
);
create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  vehicle_id uuid not null, type text not null, number text, issued_at date, expires_at date, storage_path text not null, status text not null default 'valid' check(status in ('valid','expired','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,vehicle_id) references public.vehicles(tenant_id,id) on delete cascade
);

create table public.inventory_campaigns (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null, type text not null default 'assets' check(type in ('assets','stock')), starts_at date not null, ends_at date not null,
  scope jsonb not null default '{}'::jsonb, rules jsonb not null default '{}'::jsonb, status text not null default 'draft' check(status in ('draft','planned','active','reconciling','completed','cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), check(ends_at >= starts_at)
);
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
  campaign_id uuid not null, asset_id uuid, product_id uuid, expected_location_id uuid, expected_quantity numeric(14,3),
  scanned_location_id uuid, scanned_quantity numeric(14,3), scanned_condition text, scanned_by uuid references public.profiles(id) on delete set null, scanned_at timestamptz,
  result text not null default 'pending' check(result in ('pending','located','not_found','wrong_location','wrong_responsible','damaged','unlabeled','unregistered','duplicate','divergent_quantity')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
  foreign key (tenant_id,campaign_id) references public.inventory_campaigns(tenant_id,id) on delete restrict,
  foreign key (tenant_id,asset_id) references public.assets(tenant_id,id) on delete restrict,
  foreign key (tenant_id,product_id) references public.stock_products(tenant_id,id) on delete restrict,
  foreign key (tenant_id,expected_location_id) references public.locations(tenant_id,id) on delete restrict,
  foreign key (tenant_id,scanned_location_id) references public.locations(tenant_id,id) on delete restrict,
  check((asset_id is not null)::integer + (product_id is not null)::integer = 1)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade, type text not null, title text not null, message text not null,
  entity_type text, entity_id text, channel text not null default 'internal' check(channel in ('internal','email')),
  read_at timestamptz, sent_at timestamptz, created_at timestamptz not null default now(), unique(tenant_id,id)
);
create table public.notification_templates (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_key text not null, channel text not null check(channel in ('internal','email')), subject text, body text not null, enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id), unique(tenant_id,event_key,channel)
);
create table public.background_jobs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  queue text not null, external_job_id text, type text not null, payload jsonb not null default '{}'::jsonb, result jsonb,
  status text not null default 'queued' check(status in ('queued','processing','completed','failed','cancelled')), attempts integer not null default 0,
  error_message text, requested_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz,
  unique(tenant_id,id)
);

-- Históricos operacionais são imutáveis.
create trigger asset_movements_prevent_update before update on public.asset_movements for each row execute function public.prevent_audit_log_mutation();
create trigger asset_movements_prevent_delete before delete on public.asset_movements for each row execute function public.prevent_audit_log_mutation();
create trigger stock_movements_prevent_update before update on public.stock_movements for each row execute function public.prevent_audit_log_mutation();
create trigger stock_movements_prevent_delete before delete on public.stock_movements for each row execute function public.prevent_audit_log_mutation();

create or replace function public.prevent_vehicle_mileage_regression()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.current_mileage < old.current_mileage then raise exception 'vehicle mileage cannot regress' using errcode = '23514'; end if;
  return new;
end; $$;
revoke all on function public.prevent_vehicle_mileage_regression() from public;
create trigger vehicles_prevent_mileage_regression before update of current_mileage on public.vehicles for each row execute function public.prevent_vehicle_mileage_regression();

create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare delta numeric(14,3);
begin
  delta := case
    when new.type in ('purchase_in','return_in','positive_adjustment','transfer_in') then new.quantity
    when new.type in ('reservation','inventory') then 0
    else -new.quantity
  end;
  insert into public.stock_balances(tenant_id,product_id,stock_location_id,batch_id,quantity)
  values(new.tenant_id,new.product_id,new.stock_location_id,new.batch_id,greatest(delta,0))
  on conflict (tenant_id,product_id,stock_location_id,coalesce(batch_id,'00000000-0000-0000-0000-000000000000'::uuid))
  do update set quantity = public.stock_balances.quantity + delta, updated_at = now();
  if exists(select 1 from public.stock_balances b where b.tenant_id=new.tenant_id and b.product_id=new.product_id and b.stock_location_id=new.stock_location_id and b.batch_id is not distinct from new.batch_id and b.quantity < 0)
  then raise exception 'stock movement would result in negative balance' using errcode='23514'; end if;
  return new;
end; $$;
revoke all on function public.apply_stock_movement() from public;
create trigger stock_movements_apply after insert on public.stock_movements for each row execute function public.apply_stock_movement();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'asset_categories','assets','asset_custom_fields','asset_custom_values','asset_files','asset_movements','asset_terms',
    'warranties','maintenance_plans','maintenance_orders','maintenance_costs','stock_categories','stock_locations','stock_products',
    'stock_batches','stock_balances','stock_movements','stock_requisitions','stock_requisition_items','vehicles','vehicle_drivers',
    'vehicle_authorizations','vehicle_reservations','vehicle_usages','vehicle_checklists','vehicle_fuelings','vehicle_expenses',
    'vehicle_fines','vehicle_incidents','vehicle_documents','inventory_campaigns','inventory_items','notifications','notification_templates','background_jobs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_tenant_member(tenant_id))', table_name || '_select_member', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format('create index %I on public.%I (tenant_id)', table_name || '_tenant_idx', table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'asset_categories','assets','asset_custom_fields','asset_custom_values','warranties','maintenance_plans','maintenance_orders',
    'stock_categories','stock_locations','stock_products','stock_batches','stock_requisitions','stock_requisition_items','vehicles',
    'vehicle_drivers','vehicle_authorizations','vehicle_reservations','vehicle_usages','vehicle_fines','vehicle_incidents','vehicle_documents',
    'inventory_campaigns','inventory_items','notification_templates'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end $$;

grant usage, select on all sequences in schema public to service_role;
