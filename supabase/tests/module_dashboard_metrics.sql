begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '26000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'dashboard@example.test', '', now(), '{}', '{}', now(), now());

insert into public.tenants(id, slug, legal_name) values
  ('16000000-0000-4000-8000-000000000001', 'module-dashboard-a', 'Module Dashboard A'),
  ('16000000-0000-4000-8000-000000000002', 'module-dashboard-b', 'Module Dashboard B');
insert into public.branches(id, tenant_id, code, name)
values ('66000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'HQ', 'Matriz');
insert into public.locations(id, tenant_id, branch_id, code, name, type)
values ('67000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', '66000000-0000-4000-8000-000000000001', 'ROOM', 'Sala', 'room');
insert into public.stock_locations(id, tenant_id, location_id, name, code)
values ('68000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', '67000000-0000-4000-8000-000000000001', 'Principal', 'MAIN');
insert into public.stock_products(id, tenant_id, code, name, unit, minimum_stock, average_cost)
values ('69000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'P-1', 'Produto', 'UN', 10, 5);
insert into public.stock_balances(tenant_id, product_id, stock_location_id, quantity)
values ('16000000-0000-4000-8000-000000000001', '69000000-0000-4000-8000-000000000001', '68000000-0000-4000-8000-000000000001', 3);
insert into public.assets(id, tenant_id, description, status, purchase_value, location_id)
values ('56000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'Notebook', 'in_use', 2500, '67000000-0000-4000-8000-000000000001');
insert into public.asset_movements(id, tenant_id, asset_id, type, performed_by)
values ('57000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', '56000000-0000-4000-8000-000000000001', 'delivery', '26000000-0000-4000-8000-000000000001');
insert into public.vehicles(id, tenant_id, plate, brand, model, status)
values ('76000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'ABC1D23', 'Marca', 'Modelo', 'available');
insert into public.assets(id, tenant_id, description, status)
values ('56000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000002', 'Ativo de outro tenant', 'available');

select is(
  (public.get_module_metrics('16000000-0000-4000-8000-000000000001', 'patrimonio')->'metrics'->>'total')::integer,
  1,
  'module dashboard counts only tenant assets'
);
select is(
  public.get_module_metrics('16000000-0000-4000-8000-000000000001', 'almoxarifado')->'metrics'->>'products_active',
  '1',
  'stock metrics expose active products'
);
select is(
  public.get_module_metrics('16000000-0000-4000-8000-000000000001', 'frota')->'metrics'->>'vehicles',
  '1',
  'fleet metrics expose tenant vehicles'
);
select throws_ok(
  $$select public.get_module_metrics('16000000-0000-4000-8000-000000000001', 'invalid')$$,
  '22023',
  'unsupported dashboard module',
  'unknown modules are rejected'
);

select * from finish();
rollback;
