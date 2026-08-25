create or replace function public.scan_inventory_stock(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_campaign_id uuid,
  target_product_id uuid,
  counted_quantity numeric
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare item_id uuid;
declare expected numeric(14,3);
begin
  if counted_quantity < 0 then raise exception 'counted quantity cannot be negative' using errcode = '23514'; end if;
  if not exists (
    select 1 from public.inventory_campaigns
    where tenant_id = target_tenant_id and id = target_campaign_id and type = 'stock' and status = 'active'
  ) then raise exception 'campaign is not active' using errcode = '23514'; end if;
  if not exists (select 1 from public.stock_products where tenant_id = target_tenant_id and id = target_product_id) then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  select expected_quantity into expected from public.inventory_items
  where tenant_id = target_tenant_id and campaign_id = target_campaign_id and product_id = target_product_id
  for update;

  if found then
    update public.inventory_items set
      scanned_quantity = counted_quantity,
      scanned_by = actor_user_id,
      scanned_at = now(),
      result = case when expected is not distinct from counted_quantity then 'located' else 'divergent_quantity' end
    where tenant_id = target_tenant_id and campaign_id = target_campaign_id and product_id = target_product_id
    returning id into item_id;
  else
    insert into public.inventory_items(tenant_id,campaign_id,product_id,scanned_quantity,scanned_by,scanned_at,result)
    values(target_tenant_id,target_campaign_id,target_product_id,counted_quantity,actor_user_id,now(),'unregistered')
    returning id into item_id;
  end if;
  return item_id;
end; $$;

revoke all on function public.scan_inventory_stock(uuid,uuid,uuid,uuid,numeric) from public;
grant execute on function public.scan_inventory_stock(uuid,uuid,uuid,uuid,numeric) to service_role;
