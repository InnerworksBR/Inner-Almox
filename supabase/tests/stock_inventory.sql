begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','23000000-0000-4000-8000-000000000001','authenticated','authenticated','stock-inventory@example.test','',now(),'{}','{}',now(),now());
insert into public.tenants(id,slug,legal_name) values('13000000-0000-4000-8000-000000000001','stock-inventory-test','Stock Inventory Test');
insert into public.stock_products(id,tenant_id,code,name,unit) values
('63000000-0000-4000-8000-000000000011','13000000-0000-4000-8000-000000000001','P-1','Produto esperado','UN'),
('63000000-0000-4000-8000-000000000012','13000000-0000-4000-8000-000000000001','P-2','Produto inesperado','UN');
insert into public.inventory_campaigns(id,tenant_id,name,type,starts_at,ends_at,status,created_by)
values('57000000-0000-4000-8000-000000000011','13000000-0000-4000-8000-000000000001','Contagem','stock',current_date,current_date+1,'active','23000000-0000-4000-8000-000000000001');
insert into public.inventory_items(tenant_id,campaign_id,product_id,expected_quantity)
values('13000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000011','63000000-0000-4000-8000-000000000011',10);

select lives_ok($$select public.scan_inventory_stock('13000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000011','63000000-0000-4000-8000-000000000011',8)$$,'Stock count is accepted');
select is((select result from public.inventory_items where product_id='63000000-0000-4000-8000-000000000011'),'divergent_quantity','Different quantity is marked divergent');
select lives_ok($$select public.scan_inventory_stock('13000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000011','63000000-0000-4000-8000-000000000012',2)$$,'Unexpected product can be counted');
select is((select result from public.inventory_items where product_id='63000000-0000-4000-8000-000000000012'),'unregistered','Unexpected product is marked unregistered');

select * from finish();
rollback;
