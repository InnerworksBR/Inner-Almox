begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','22000000-0000-4000-8000-000000000001','authenticated','authenticated','workflows@example.test','',now(),'{}','{}',now(),now());
insert into public.tenants(id,slug,legal_name) values('12000000-0000-4000-8000-000000000001','workflow-test','Workflow Test');
insert into public.tenant_memberships(id,tenant_id,user_id,status) values('32000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','active');
insert into public.branches(id,tenant_id,code,name) values('43000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','HQ','Matriz');
insert into public.locations(id,tenant_id,branch_id,code,name,type) values('44000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','43000000-0000-4000-8000-000000000001','ROOM','Sala','room');
insert into public.asset_categories(id,tenant_id,name) values('53000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','Computadores');
insert into public.assets(id,tenant_id,description,category_id,location_id,qr_token)
values('54000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','Notebook','53000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000001','55000000-0000-4000-8000-000000000001');
insert into public.asset_movements(id,tenant_id,asset_id,type,performed_by,new_responsible_user_id)
values('56000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001','delivery','22000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001');
insert into public.inventory_campaigns(id,tenant_id,name,type,starts_at,ends_at,created_by)
values('57000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','Anual','assets',current_date,current_date + 5,'22000000-0000-4000-8000-000000000001');
insert into public.stock_products(id,tenant_id,code,name,unit,minimum_stock)
values('63000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','P-100','Cabo de rede','UN',10);
insert into public.stock_locations(id,tenant_id,location_id,name,code) values('66000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000001','Estoque','MAIN');
select public.record_stock_movement('12000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000001','66000000-0000-4000-8000-000000000001','purchase_in',5,'22000000-0000-4000-8000-000000000001');
insert into public.stock_requisitions(id,tenant_id,number,requested_by,purpose)
values('64000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','REQ-100','22000000-0000-4000-8000-000000000001','Instalação');
insert into public.warranties(id,tenant_id,asset_id,type,ends_at)
values('65000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001','manufacturer',current_date + 30);
insert into public.vehicles(id,tenant_id,plate,brand,model,current_mileage)
values('72000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','XYZ1A23','Marca','Modelo',100);
insert into public.vehicle_drivers(id,tenant_id,membership_id,license_number,category,expires_at)
values('73000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','12345678900','B',current_date + 365);
insert into public.vehicle_usages(id,tenant_id,vehicle_id,driver_id,initial_mileage,destination,purpose)
values('74000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001',100,'Cliente','Visita');

select lives_ok($$select public.issue_asset_term('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','56000000-0000-4000-8000-000000000001','delivery')$$,'Term is issued from an immutable movement');
insert into public.asset_movements(id,tenant_id,asset_id,type,performed_by)
values('56000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001','return','22000000-0000-4000-8000-000000000001');
select lives_ok($$select public.issue_asset_term('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','56000000-0000-4000-8000-000000000002','return')$$,'Term without a new responsible user is issued to the actor');
select ok((select issued_to='22000000-0000-4000-8000-000000000001' from public.asset_terms where movement_id='56000000-0000-4000-8000-000000000002'),'Issued term is visible in the actor personal terms');
select ok((select public.validate_asset_term(validation_code) ->> 'valid' = 'true' from public.asset_terms where tenant_id='12000000-0000-4000-8000-000000000001' limit 1),'Public validation confirms the issued term');
select is(public.start_inventory_campaign('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000001'),1,'Starting inventory creates the expected asset');
select lives_ok($$select public.scan_inventory_asset('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000001','55000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000001','good')$$,'Inventory accepts an asset QR scan');
select is((select result from public.inventory_items where campaign_id='57000000-0000-4000-8000-000000000001'),'located','Scan reconciles the expected location');
select is(public.complete_inventory_campaign('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000001'),0,'Completing a fully scanned campaign has no missing assets');
select lives_ok($$select public.transition_stock_requisition('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','64000000-0000-4000-8000-000000000001','requested')$$,'A draft requisition can be submitted');
select throws_ok($$select public.transition_stock_requisition('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','64000000-0000-4000-8000-000000000001','delivered')$$,'23514','invalid requisition transition','Invalid requisition transition is blocked');
select is(public.refresh_tenant_alerts('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001'),2,'Warranty and low-stock alerts are generated');
select lives_ok($$select public.record_vehicle_checklist('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000001','checkout','{"tires":true,"lights":true}'::jsonb)$$,'Vehicle checklist is persisted');
select lives_ok($$select public.create_stock_requisition('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','REQ-101','Instalação','[{"product_id":"63000000-0000-4000-8000-000000000001","quantity":2}]'::jsonb)$$,'Requisition with items is created atomically');
select lives_ok($$select public.transition_stock_requisition('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001',(select id from public.stock_requisitions where number='REQ-101'),'approved')$$,'Requested requisition can be approved');
select lives_ok($$select public.fulfill_stock_requisition('12000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001',(select id from public.stock_requisitions where number='REQ-101'),'66000000-0000-4000-8000-000000000001','[{"product_id":"63000000-0000-4000-8000-000000000001","quantity":2}]'::jsonb)$$,'Fulfilling a requisition reduces stock atomically');
select is((select status from public.stock_requisitions where number='REQ-101'),'delivered','Fully fulfilled requisition is marked delivered');

select * from finish();
rollback;
