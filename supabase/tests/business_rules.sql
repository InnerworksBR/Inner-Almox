begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','21000000-0000-4000-8000-000000000001','authenticated','authenticated','rules@example.test','',now(),'{}','{}',now(),now());
insert into public.tenants(id,slug,legal_name) values('11000000-0000-4000-8000-000000000001','rules-test','Rules Test');
insert into public.branches(id,tenant_id,code,name) values('41000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','HQ','Matriz');
insert into public.locations(id,tenant_id,branch_id,code,name,type) values('42000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','STOCK','Estoque','stock');
insert into public.locations(id,tenant_id,branch_id,code,name,type) values('42000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','STOCK2','Estoque 2','stock');
insert into public.asset_categories(id,tenant_id,name) values('51000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','Equipamentos');
insert into public.assets(id,tenant_id,internal_code,description,category_id) values('52000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','AT-1','Notebook','51000000-0000-4000-8000-000000000001');
insert into public.stock_locations(id,tenant_id,location_id,name,code) values('61000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001','Principal','MAIN');
insert into public.stock_locations(id,tenant_id,location_id,name,code) values('61000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000002','Secundário','SECOND');
insert into public.stock_locations(id,tenant_id,location_id,name,code) values('61000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000002','Vazio','EMPTY');
insert into public.stock_products(id,tenant_id,code,name,unit) values('62000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','P-1','Cabo','UN');
insert into public.vehicles(id,tenant_id,plate,brand,model,current_mileage) values('71000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','ABC1D23','Marca','Modelo',1000);

select lives_ok($$select public.record_stock_movement('11000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','purchase_in',10,'21000000-0000-4000-8000-000000000001')$$,'Stock entry is accepted');
select throws_ok($$select public.record_stock_movement('11000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','consumption_out',11,'21000000-0000-4000-8000-000000000001')$$,'23514');
select lives_ok($$select public.transfer_stock('11000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002',3,'21000000-0000-4000-8000-000000000001')$$,'Stock transfer is atomic');
select is((select quantity from public.stock_balances where stock_location_id='61000000-0000-4000-8000-000000000002'),3::numeric,'Stock transfer credits the destination');
select throws_ok($$update public.vehicles set current_mileage=999 where id='71000000-0000-4000-8000-000000000001'$$,'23514','vehicle mileage cannot regress','Vehicle mileage cannot regress');
select public.record_asset_movement('11000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001','delivery','21000000-0000-4000-8000-000000000001');
select throws_ok($$delete from public.asset_movements where tenant_id='11000000-0000-4000-8000-000000000001'$$,'55000','audit logs are immutable','Asset movement history is immutable');

-- Correcoes da auditoria: saida em local sem saldo previo e bloqueada.
select throws_ok(
  $$select public.record_stock_movement('11000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000003','consumption_out',1,'21000000-0000-4000-8000-000000000001')$$,
  '23514','stock movement would result in negative balance','Saida em estoque sem saldo previo e bloqueada');
select throws_ok(
  $$select public.transfer_stock('11000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000001',5,'21000000-0000-4000-8000-000000000001')$$,
  '23514','stock movement would result in negative balance','Transferencia a partir de estoque vazio e bloqueada');
select is(
  (select coalesce(sum(quantity),0) from public.stock_balances where stock_location_id='61000000-0000-4000-8000-000000000001'),
  7::numeric,'Transferencia bloqueada nao credita o destino');

select * from finish();
rollback;
