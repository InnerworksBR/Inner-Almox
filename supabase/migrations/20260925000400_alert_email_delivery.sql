create or replace function public.pending_alert_emails(target_tenant_id uuid)
returns table(
  notification_id uuid,
  tenant_id uuid,
  user_id uuid,
  recipient_email text,
  type text,
  title text,
  message text,
  subject text,
  body text,
  entity_type text,
  entity_id text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct
    notification.id,
    notification.tenant_id,
    membership.user_id,
    auth_user.email,
    notification.type,
    notification.title,
    notification.message,
    coalesce(template.subject, notification.title),
    template.body,
    notification.entity_type,
    notification.entity_id
  from public.notifications notification
  join public.notification_templates template
    on template.tenant_id = notification.tenant_id
   and template.event_key = notification.type
   and template.channel = 'email'
   and template.enabled
  join public.tenant_memberships membership
    on membership.tenant_id = notification.tenant_id
   and membership.status = 'active'
  join public.membership_roles membership_role
    on membership_role.membership_id = membership.id
  join auth.users auth_user on auth_user.id = membership.user_id
  where notification.tenant_id = target_tenant_id
    and notification.channel = 'internal'
    and notification.created_at::date = current_date
    and auth_user.email is not null
    and (
      (notification.type = 'warranty_expiry' and membership_role.role in ('tenant_admin', 'asset_manager'))
      or (notification.type = 'low_stock' and membership_role.role in ('tenant_admin', 'warehouse_manager'))
    )
    and not exists (
      select 1
      from public.notifications delivered
      where delivered.tenant_id = notification.tenant_id
        and delivered.user_id = membership.user_id
        and delivered.channel = 'email'
        and delivered.type = notification.type
        and delivered.entity_id is not distinct from notification.entity_id
        and delivered.created_at::date = current_date
    );
$$;

revoke all on function public.pending_alert_emails(uuid) from public;
grant execute on function public.pending_alert_emails(uuid) to service_role;

insert into public.notification_templates (tenant_id, event_key, channel, subject, body, enabled)
select tenant.id, event.event_key, 'email', event.subject, event.body, false
from public.tenants tenant
cross join (values
  ('warranty_expiry', 'Garantia próxima do vencimento', 'Um ativo possui garantia próxima do vencimento.'),
  ('low_stock', 'Estoque abaixo do mínimo', 'Um produto está abaixo do estoque mínimo.')
) as event(event_key, subject, body)
on conflict (tenant_id, event_key, channel) do nothing;

create or replace function public.provision_tenant(
  tenant_slug text,
  tenant_legal_name text,
  tenant_product_name text,
  tenant_hostname text,
  tenant_plan text,
  limit_users integer default null,
  limit_assets integer default null,
  limit_vehicles integer default null,
  limit_storage_bytes bigint default null,
  primary_color_value text default null,
  secondary_color_value text default null,
  enabled_modules text[] default '{}',
  domain_verified boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_tenant_id uuid;
declare module_key_value text;
begin
  insert into public.tenants(slug,legal_name,product_name,plan,user_limit,asset_limit,vehicle_limit,storage_limit_bytes)
  values(lower(trim(tenant_slug)),trim(tenant_legal_name),nullif(trim(tenant_product_name),''),tenant_plan,limit_users,limit_assets,limit_vehicles,limit_storage_bytes)
  returning id into new_tenant_id;
  insert into public.tenant_domains(tenant_id,hostname,is_primary,verified_at)
  values(new_tenant_id,lower(trim(trailing '.' from tenant_hostname)),true,case when domain_verified then now() else null end);
  insert into public.tenant_branding(tenant_id,product_name,primary_color,secondary_color)
  values(new_tenant_id,nullif(trim(tenant_product_name),''),primary_color_value,secondary_color_value);
  foreach module_key_value in array enabled_modules loop
    insert into public.tenant_modules(tenant_id,module_key,enabled) values(new_tenant_id,module_key_value,true);
  end loop;
  insert into public.notification_templates (tenant_id, event_key, channel, subject, body, enabled)
  values
    (new_tenant_id, 'warranty_expiry', 'email', 'Garantia próxima do vencimento', 'Um ativo possui garantia próxima do vencimento.', false),
    (new_tenant_id, 'low_stock', 'email', 'Estoque abaixo do mínimo', 'Um produto está abaixo do estoque mínimo.', false)
  on conflict (tenant_id, event_key, channel) do nothing;
  return new_tenant_id;
end; $$;

revoke all on function public.provision_tenant(text,text,text,text,text,integer,integer,integer,bigint,text,text,text[],boolean) from public;
grant execute on function public.provision_tenant(text,text,text,text,text,integer,integer,integer,bigint,text,text,text[],boolean) to service_role;
