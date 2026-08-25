-- Fluxos críticos restantes do MVP: termos, inventário, requisições e alertas.

create or replace function public.issue_asset_term(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_movement_id uuid,
  term_type text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare movement_record public.asset_movements%rowtype;
declare asset_record public.assets%rowtype;
declare term_id uuid;
declare code text;
begin
  select * into movement_record from public.asset_movements
  where tenant_id = target_tenant_id and id = target_movement_id;
  if not found then raise exception 'movement not found' using errcode = 'P0002'; end if;
  select * into asset_record from public.assets
  where tenant_id = target_tenant_id and id = movement_record.asset_id;
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  insert into public.asset_terms (
    tenant_id, movement_id, asset_id, type, validation_code, content_snapshot, issued_to
  ) values (
    target_tenant_id, movement_record.id, asset_record.id, term_type, code,
    jsonb_build_object(
      'asset', jsonb_build_object('internal_code', asset_record.internal_code, 'asset_number', asset_record.asset_number, 'description', asset_record.description, 'condition', asset_record.condition),
      'movement', jsonb_build_object('type', movement_record.type, 'occurred_at', movement_record.occurred_at, 'origin', movement_record.origin, 'destination', movement_record.destination),
      'issued_at', now(), 'issued_by', actor_user_id
    ),
    movement_record.new_responsible_user_id
  ) returning id into term_id;
  return term_id;
end; $$;

create or replace function public.validate_asset_term(validation_code_value text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'valid', true,
    'code', term.validation_code,
    'type', term.type,
    'issued_at', term.created_at,
    'accepted_at', term.accepted_at,
    'tenant', tenant.legal_name,
    'content', term.content_snapshot
  )
  from public.asset_terms term
  join public.tenants tenant on tenant.id = term.tenant_id
  where term.validation_code = upper(trim(validation_code_value))
    and tenant.status = 'active'
  limit 1;
$$;

create or replace function public.accept_asset_term(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_term_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  update public.asset_terms
  set accepted_at = coalesce(accepted_at, now())
  where tenant_id = target_tenant_id and id = target_term_id and issued_to = actor_user_id;
  if not found then raise exception 'term not found or not assigned' using errcode = 'P0002'; end if;
  return target_term_id;
end; $$;

create or replace function public.start_inventory_campaign(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_campaign_id uuid
) returns integer
language plpgsql security definer set search_path = '' as $$
declare campaign_type text;
declare inserted_count integer;
begin
  select type into campaign_type from public.inventory_campaigns
  where tenant_id = target_tenant_id and id = target_campaign_id and status in ('draft', 'planned');
  if not found then raise exception 'campaign cannot be started' using errcode = '23514'; end if;

  if campaign_type = 'assets' then
    insert into public.inventory_items (tenant_id, campaign_id, asset_id, expected_location_id)
    select target_tenant_id, target_campaign_id, asset.id, asset.location_id
    from public.assets asset
    where asset.tenant_id = target_tenant_id
      and asset.status not in ('disposed', 'sold', 'donated')
      and not exists (
        select 1 from public.inventory_items item
        where item.tenant_id = target_tenant_id and item.campaign_id = target_campaign_id and item.asset_id = asset.id
      );
  else
    insert into public.inventory_items (tenant_id, campaign_id, product_id, expected_quantity)
    select target_tenant_id, target_campaign_id, balance.product_id, sum(balance.quantity)
    from public.stock_balances balance
    where balance.tenant_id = target_tenant_id
    group by balance.product_id
    having not exists (
      select 1 from public.inventory_items item
      where item.tenant_id = target_tenant_id and item.campaign_id = target_campaign_id and item.product_id = balance.product_id
    );
  end if;
  get diagnostics inserted_count = row_count;
  update public.inventory_campaigns set status = 'active'
  where tenant_id = target_tenant_id and id = target_campaign_id;
  return inserted_count;
end; $$;

create or replace function public.scan_inventory_asset(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_campaign_id uuid,
  asset_qr_token uuid,
  target_location_id uuid default null,
  condition_value text default null,
  notes_value text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare found_asset public.assets%rowtype;
declare item_id uuid;
declare item_result text;
begin
  if not exists (select 1 from public.inventory_campaigns where tenant_id = target_tenant_id and id = target_campaign_id and type = 'assets' and status = 'active') then
    raise exception 'campaign is not active' using errcode = '23514';
  end if;
  select * into found_asset from public.assets where tenant_id = target_tenant_id and qr_token = asset_qr_token;
  if not found then raise exception 'asset not found' using errcode = 'P0002'; end if;
  item_result := case
    when condition_value = 'damaged' then 'damaged'
    when target_location_id is distinct from found_asset.location_id then 'wrong_location'
    else 'located'
  end;
  update public.inventory_items set
    scanned_location_id = target_location_id,
    scanned_condition = condition_value,
    scanned_by = actor_user_id,
    scanned_at = now(),
    result = item_result,
    notes = notes_value
  where tenant_id = target_tenant_id and campaign_id = target_campaign_id and asset_id = found_asset.id
  returning id into item_id;
  if item_id is null then
    insert into public.inventory_items (tenant_id, campaign_id, asset_id, scanned_location_id, scanned_condition, scanned_by, scanned_at, result, notes)
    values (target_tenant_id, target_campaign_id, found_asset.id, target_location_id, condition_value, actor_user_id, now(), 'unregistered', notes_value)
    returning id into item_id;
  end if;
  return item_id;
end; $$;

create or replace function public.complete_inventory_campaign(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_campaign_id uuid
) returns integer
language plpgsql security definer set search_path = '' as $$
declare missing_count integer;
begin
  update public.inventory_items set result = 'not_found'
  where tenant_id = target_tenant_id and campaign_id = target_campaign_id and result = 'pending';
  get diagnostics missing_count = row_count;
  update public.inventory_campaigns set status = 'completed'
  where tenant_id = target_tenant_id and id = target_campaign_id and status in ('active', 'reconciling');
  if not found then raise exception 'campaign cannot be completed' using errcode = '23514'; end if;
  return missing_count;
end; $$;

create or replace function public.transition_stock_requisition(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_requisition_id uuid,
  target_status text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare current_status text;
declare allowed boolean;
begin
  select status into current_status from public.stock_requisitions
  where tenant_id = target_tenant_id and id = target_requisition_id for update;
  if not found then raise exception 'requisition not found' using errcode = 'P0002'; end if;
  allowed := (current_status, target_status) in (
    ('draft','requested'), ('requested','awaiting_approval'), ('requested','approved'),
    ('awaiting_approval','approved'), ('awaiting_approval','rejected'),
    ('approved','separating'), ('separating','ready'), ('ready','delivered'),
    ('ready','partially_fulfilled'), ('draft','cancelled'), ('requested','cancelled'),
    ('awaiting_approval','cancelled'), ('approved','cancelled')
  );
  if not allowed then raise exception 'invalid requisition transition' using errcode = '23514'; end if;
  update public.stock_requisitions set
    status = target_status,
    approved_by = case when target_status = 'approved' then actor_user_id else approved_by end,
    approved_at = case when target_status = 'approved' then now() else approved_at end,
    delivered_at = case when target_status in ('delivered','partially_fulfilled') then now() else delivered_at end
  where tenant_id = target_tenant_id and id = target_requisition_id;
  return target_requisition_id;
end; $$;

create or replace function public.record_vehicle_checklist(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_usage_id uuid,
  phase_value text,
  answers_value jsonb,
  notes_value text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare checklist_id uuid;
begin
  if jsonb_typeof(answers_value) <> 'object' then raise exception 'answers must be an object' using errcode = '23514'; end if;
  insert into public.vehicle_checklists (tenant_id, usage_id, phase, answers, notes, completed_by)
  select target_tenant_id, target_usage_id, phase_value, answers_value, notes_value, actor_user_id
  where exists (select 1 from public.vehicle_usages where tenant_id = target_tenant_id and id = target_usage_id)
  returning id into checklist_id;
  if checklist_id is null then raise exception 'usage not found' using errcode = 'P0002'; end if;
  return checklist_id;
end; $$;

create or replace function public.refresh_tenant_alerts(
  target_tenant_id uuid,
  actor_user_id uuid
) returns integer
language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  insert into public.notifications (tenant_id, type, title, message, entity_type, entity_id)
  select target_tenant_id, 'warranty_expiry', 'Garantia próxima do vencimento',
    asset.description || ' vence em ' || warranty.ends_at::text, 'warranty', warranty.id::text
  from public.warranties warranty join public.assets asset on asset.tenant_id = warranty.tenant_id and asset.id = warranty.asset_id
  where warranty.tenant_id = target_tenant_id and warranty.status = 'active'
    and warranty.ends_at between current_date and current_date + 90
    and not exists (select 1 from public.notifications notification where notification.tenant_id = target_tenant_id and notification.type = 'warranty_expiry' and notification.entity_id = warranty.id::text and notification.created_at::date = current_date)
  union all
  select target_tenant_id, 'low_stock', 'Estoque abaixo do mínimo',
    product.name || ' está com saldo abaixo do mínimo', 'stock_product', product.id::text
  from public.stock_products product
  left join public.stock_balances balance on balance.tenant_id = product.tenant_id and balance.product_id = product.id
  where product.tenant_id = target_tenant_id and product.status = 'active'
  group by product.id, product.name, product.minimum_stock
  having coalesce(sum(balance.quantity), 0) <= product.minimum_stock
    and not exists (select 1 from public.notifications notification where notification.tenant_id = target_tenant_id and notification.type = 'low_stock' and notification.entity_id = product.id::text and notification.created_at::date = current_date);
  get diagnostics inserted_count = row_count;
  return inserted_count;
end; $$;

revoke all on function public.issue_asset_term(uuid,uuid,uuid,text) from public;
revoke all on function public.validate_asset_term(text) from public;
revoke all on function public.accept_asset_term(uuid,uuid,uuid) from public;
revoke all on function public.start_inventory_campaign(uuid,uuid,uuid) from public;
revoke all on function public.scan_inventory_asset(uuid,uuid,uuid,uuid,uuid,text,text) from public;
revoke all on function public.complete_inventory_campaign(uuid,uuid,uuid) from public;
revoke all on function public.transition_stock_requisition(uuid,uuid,uuid,text) from public;
revoke all on function public.record_vehicle_checklist(uuid,uuid,uuid,text,jsonb,text) from public;
revoke all on function public.refresh_tenant_alerts(uuid,uuid) from public;

grant execute on function public.validate_asset_term(text) to anon, authenticated;
grant execute on function public.issue_asset_term(uuid,uuid,uuid,text) to service_role;
grant execute on function public.accept_asset_term(uuid,uuid,uuid) to service_role;
grant execute on function public.start_inventory_campaign(uuid,uuid,uuid) to service_role;
grant execute on function public.scan_inventory_asset(uuid,uuid,uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.complete_inventory_campaign(uuid,uuid,uuid) to service_role;
grant execute on function public.transition_stock_requisition(uuid,uuid,uuid,text) to service_role;
grant execute on function public.record_vehicle_checklist(uuid,uuid,uuid,text,jsonb,text) to service_role;
grant execute on function public.refresh_tenant_alerts(uuid,uuid) to service_role;
