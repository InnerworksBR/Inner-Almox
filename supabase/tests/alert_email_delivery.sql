begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '24000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '24000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'asset@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '24000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'warehouse@example.com', '', now(), '{}', '{}', now(), now());
update public.profiles set full_name = case id
  when '24000000-0000-4000-8000-000000000001'::uuid then 'Admin'
  when '24000000-0000-4000-8000-000000000002'::uuid then 'Asset Manager'
  when '24000000-0000-4000-8000-000000000003'::uuid then 'Warehouse Manager'
end
where id in ('24000000-0000-4000-8000-000000000001','24000000-0000-4000-8000-000000000002','24000000-0000-4000-8000-000000000003');
insert into public.tenants (id, slug, legal_name) values
  ('14000000-0000-4000-8000-000000000001', 'alert-email-test', 'Alert Email Test');
insert into public.tenant_memberships (id, tenant_id, user_id, status) values
  ('34000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'active'),
  ('34000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000002', 'active'),
  ('34000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000003', 'active');
insert into public.membership_roles (membership_id, role) values
  ('34000000-0000-4000-8000-000000000001', 'tenant_admin'),
  ('34000000-0000-4000-8000-000000000002', 'asset_manager'),
  ('34000000-0000-4000-8000-000000000003', 'warehouse_manager');
insert into public.notification_templates (tenant_id, event_key, channel, subject, body, enabled) values
  ('14000000-0000-4000-8000-000000000001', 'warranty_expiry', 'email', 'Garantia', 'Mensagem', false),
  ('14000000-0000-4000-8000-000000000001', 'low_stock', 'email', 'Estoque', 'Mensagem', false);
insert into public.notifications (tenant_id, type, title, message, entity_type, entity_id, channel) values
  ('14000000-0000-4000-8000-000000000001', 'warranty_expiry', 'Garantia', 'Vence em breve', 'warranty', 'warranty-1', 'internal'),
  ('14000000-0000-4000-8000-000000000001', 'low_stock', 'Estoque', 'Abaixo do mínimo', 'stock_product', 'product-1', 'internal');

set local role service_role;
select is((select count(*) from public.pending_alert_emails('14000000-0000-4000-8000-000000000001')), 0::bigint, 'Templates desabilitados não geram e-mails');
update public.notification_templates set enabled = true where tenant_id = '14000000-0000-4000-8000-000000000001' and event_key = 'warranty_expiry';
select is((select count(*) from public.pending_alert_emails('14000000-0000-4000-8000-000000000001')), 2::bigint, 'Template de garantia retorna administrador e gestor de patrimônio');
select is((select count(*) from public.pending_alert_emails('14000000-0000-4000-8000-000000000001') where recipient_email = 'admin@example.com'), 1::bigint, 'Administrador recebe um e-mail');
insert into public.notifications (tenant_id, user_id, type, title, message, entity_type, entity_id, channel, sent_at)
values ('14000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'warranty_expiry', 'Garantia', 'Vence em breve', 'warranty', 'warranty-1', 'email', now());
select is((select count(*) from public.pending_alert_emails('14000000-0000-4000-8000-000000000001') where recipient_email = 'admin@example.com'), 0::bigint, 'Destinatário já enviado não é duplicado');

select * from finish();
rollback;
