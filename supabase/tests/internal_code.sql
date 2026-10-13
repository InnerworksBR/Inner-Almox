begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.tenants(id,slug,legal_name)
values('15000000-0000-4000-8000-000000000001','internal-code-test','Internal Code Test');

insert into public.branches(id,tenant_id,code,name)
values('65000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','MANUAL','Matriz');
select is((select code from public.branches where id='65000000-0000-4000-8000-000000000001'),'FIL-000001','Branch code is generated automatically');

insert into public.branches(id,tenant_id,code,name)
values('65000000-0000-4000-8000-000000000002','15000000-0000-4000-8000-000000000001','OTHER-MANUAL','Filial');
select is((select code from public.branches where id='65000000-0000-4000-8000-000000000002'),'FIL-000002','Client supplied branch code is replaced');

select throws_ok(
  $$update public.branches set code='MANUAL-EDIT' where id='65000000-0000-4000-8000-000000000001'$$,
  '23514',
  'code is system managed',
  'Branch code cannot be edited'
);

insert into public.departments(id,tenant_id,code,name)
values('66000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','MANUAL','Tecnologia');
select is((select code from public.departments where id='66000000-0000-4000-8000-000000000001'),'SET-000001','Department code is generated automatically');

insert into public.cost_centers(id,tenant_id,code,name)
values('67000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','MANUAL','Operação');
select is((select code from public.cost_centers where id='67000000-0000-4000-8000-000000000001'),'CC-000001','Cost center code is generated automatically');

insert into public.locations(id,tenant_id,branch_id,code,name,type)
values('68000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','65000000-0000-4000-8000-000000000001','MANUAL','Sala','room');
select is((select code from public.locations where id='68000000-0000-4000-8000-000000000001'),'LOC-000001','Location code is generated automatically');

insert into public.stock_locations(id,tenant_id,location_id,code,name)
values('69000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000001','MANUAL','Principal');
select is((select code from public.stock_locations where id='69000000-0000-4000-8000-000000000001'),'EST-000001','Stock location code is generated automatically');

insert into public.stock_products(id,tenant_id,code,name,unit)
values('6a000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','MANUAL','Teclado','UN');
select is((select code from public.stock_products where id='6a000000-0000-4000-8000-000000000001'),'PRO-000001','Product code is generated automatically');

insert into public.tenants(id,slug,legal_name)
values('15000000-0000-4000-8000-000000000002','internal-code-test-b','Internal Code Test B');
insert into public.branches(id,tenant_id,name)
values('65000000-0000-4000-8000-000000000003','15000000-0000-4000-8000-000000000002','Outra matriz');
select is((select code from public.branches where id='65000000-0000-4000-8000-000000000003'),'FIL-000001','Internal code sequence is isolated by tenant');

select * from finish();
rollback;
