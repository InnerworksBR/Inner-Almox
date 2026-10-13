begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.tenants(id,slug,legal_name)
values('14000000-0000-4000-8000-000000000001','asset-code-test','Asset Code Test');

insert into public.assets(id,tenant_id,description)
values('54000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','Primeiro ativo');
select is(
  (select internal_code from public.assets where id='54000000-0000-4000-8000-000000000001'),
  'ATV-000001',
  'First asset receives the first automatic internal code'
);

insert into public.assets(id,tenant_id,internal_code,description)
values('54000000-0000-4000-8000-000000000002','14000000-0000-4000-8000-000000000001','MANUAL-2','Segundo ativo');
select is(
  (select internal_code from public.assets where id='54000000-0000-4000-8000-000000000002'),
  'ATV-000002',
  'Client supplied internal code is replaced by the automatic code'
);

select throws_ok(
  $$update public.assets set internal_code='MANUAL-3' where id='54000000-0000-4000-8000-000000000001'$$,
  '23514',
  'internal_code is system managed',
  'Internal code cannot be edited'
);

insert into public.tenants(id,slug,legal_name)
values('14000000-0000-4000-8000-000000000002','asset-code-test-b','Asset Code Test B');
insert into public.assets(id,tenant_id,description)
values('54000000-0000-4000-8000-000000000003','14000000-0000-4000-8000-000000000002','Primeiro ativo do segundo tenant');
select is(
  (select internal_code from public.assets where id='54000000-0000-4000-8000-000000000003'),
  'ATV-000001',
  'Each tenant has its own internal code sequence'
);

select * from finish();
rollback;
