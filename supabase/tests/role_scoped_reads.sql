begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','21000000-0000-0000-0000-000000000001','authenticated','authenticated','employee-one@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','21000000-0000-0000-0000-000000000002','authenticated','authenticated','employee-two@example.test','',now(),'{}','{}',now(),now());

insert into public.tenants(id,slug,legal_name) values ('11000000-0000-0000-0000-000000000001','role-scope-test','Role Scope Test');
insert into public.tenant_memberships(id,tenant_id,user_id,status,joined_at) values
('31000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','active',now()),
('31000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','active',now());
insert into public.membership_roles(membership_id,role) values
('31000000-0000-0000-0000-000000000001','employee'),('31000000-0000-0000-0000-000000000002','employee');

insert into public.assets(id,tenant_id,description,responsible_user_id) values
('51000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','Ativo próprio','21000000-0000-0000-0000-000000000001'),
('51000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','Ativo alheio','21000000-0000-0000-0000-000000000002');
insert into public.asset_terms(tenant_id,asset_id,type,validation_code,content_snapshot,issued_to) values
('11000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','delivery','OWN-TERM','{}','21000000-0000-0000-0000-000000000001'),
('11000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000002','delivery','OTHER-TERM','{}','21000000-0000-0000-0000-000000000002');
insert into public.stock_requisitions(id,tenant_id,number,requested_by,purpose) values
('61000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','OWN-REQ','21000000-0000-0000-0000-000000000001','Uso próprio'),
('61000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','OTHER-REQ','21000000-0000-0000-0000-000000000002','Uso alheio');
insert into public.notifications(tenant_id,user_id,type,title,message) values
('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','own','Própria','Mensagem'),
('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','other','Alheia','Mensagem'),
('11000000-0000-0000-0000-000000000001',null,'broadcast','Geral','Mensagem');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000001',true);

select is((select count(*)::integer from public.assets),1,'Employee sees only own asset');
select is((select internal_code from public.assets),'ATV-000001','Employee cannot read another employee asset');
select is((select count(*)::integer from public.asset_terms),1,'Employee sees only own term');
select is((select validation_code from public.asset_terms),'OWN-TERM','Employee cannot read another employee term');
select is((select count(*)::integer from public.stock_requisitions),1,'Employee sees only own requisition');
select is((select count(*)::integer from public.notifications),2,'Employee sees own and broadcast notifications only');

select * from finish();
rollback;
