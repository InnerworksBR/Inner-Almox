-- Transferência atômica e proteções adicionais da retirada de veículos.

create or replace function public.transfer_stock(
  target_tenant_id uuid,
  target_product_id uuid,
  source_stock_location_id uuid,
  destination_stock_location_id uuid,
  movement_quantity numeric,
  actor_user_id uuid,
  source_batch_id uuid default null,
  destination_batch_id uuid default null,
  movement_reason text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare outgoing_id uuid;
declare incoming_id uuid;
begin
  if source_stock_location_id = destination_stock_location_id then raise exception 'source and destination must differ' using errcode='22023'; end if;
  if movement_quantity <= 0 then raise exception 'quantity must be positive' using errcode='22023'; end if;
  insert into public.stock_movements(tenant_id,product_id,stock_location_id,batch_id,type,quantity,performed_by,reason)
  values(target_tenant_id,target_product_id,source_stock_location_id,source_batch_id,'transfer_out',movement_quantity,actor_user_id,movement_reason)
  returning id into outgoing_id;
  insert into public.stock_movements(tenant_id,product_id,stock_location_id,batch_id,type,quantity,performed_by,reason)
  values(target_tenant_id,target_product_id,destination_stock_location_id,destination_batch_id,'transfer_in',movement_quantity,actor_user_id,movement_reason)
  returning id into incoming_id;
  return jsonb_build_object('outgoing_movement_id',outgoing_id,'incoming_movement_id',incoming_id);
end; $$;

revoke all on function public.transfer_stock(uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,text) from public;
grant execute on function public.transfer_stock(uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,text) to service_role;

create or replace function public.checkout_vehicle(
  target_tenant_id uuid, target_vehicle_id uuid, target_driver_id uuid, actor_user_id uuid,
  initial_mileage_value numeric, destination_value text, purpose_value text,
  target_cost_center_id uuid default null, fuel_level_value integer default null, target_reservation_id uuid default null
)
returns uuid language plpgsql security definer set search_path='' as $$
declare vehicle_row public.vehicles%rowtype; driver_row public.vehicle_drivers%rowtype; usage_id uuid; actor_is_manager boolean;
begin
  select * into vehicle_row from public.vehicles where tenant_id=target_tenant_id and id=target_vehicle_id for update;
  if not found or vehicle_row.status <> 'available' then raise exception 'vehicle unavailable' using errcode='55000'; end if;
  select * into driver_row from public.vehicle_drivers where tenant_id=target_tenant_id and id=target_driver_id and status='active';
  if not found or driver_row.expires_at < current_date then raise exception 'driver not authorized' using errcode='55000'; end if;
  if lower(coalesce(vehicle_row.type,'')) in ('motorcycle','motorbike','moto','motocicleta') and position('A' in upper(driver_row.category))=0
    then raise exception 'driver category incompatible' using errcode='55000'; end if;
  if exists(select 1 from public.vehicle_documents document where document.tenant_id=target_tenant_id and document.vehicle_id=target_vehicle_id and document.status<>'cancelled' and document.expires_at<current_date)
    then raise exception 'vehicle document expired' using errcode='55000'; end if;
  select exists(select 1 from public.tenant_memberships m join public.membership_roles r on r.membership_id=m.id
    where m.tenant_id=target_tenant_id and m.user_id=actor_user_id and m.status='active' and r.role in ('tenant_admin','fleet_manager')) into actor_is_manager;
  if not actor_is_manager and not exists(select 1 from public.tenant_memberships m where m.id=driver_row.membership_id and m.user_id=actor_user_id and m.tenant_id=target_tenant_id)
    then raise exception 'cannot checkout for another driver' using errcode='42501'; end if;
  if not exists(select 1 from public.vehicle_authorizations a where a.tenant_id=target_tenant_id and a.driver_id=target_driver_id and a.active
    and (a.vehicle_id is null or a.vehicle_id=target_vehicle_id) and a.valid_from<=current_date and (a.valid_until is null or a.valid_until>=current_date))
    then raise exception 'vehicle authorization missing' using errcode='55000'; end if;
  if initial_mileage_value < vehicle_row.current_mileage then raise exception 'mileage cannot regress' using errcode='23514'; end if;
  insert into public.vehicle_usages(tenant_id,vehicle_id,driver_id,reservation_id,initial_mileage,destination,purpose,cost_center_id,initial_fuel_level)
  values(target_tenant_id,target_vehicle_id,target_driver_id,target_reservation_id,initial_mileage_value,destination_value,purpose_value,target_cost_center_id,fuel_level_value)
  returning id into usage_id;
  update public.vehicles set status='in_use',current_mileage=initial_mileage_value where tenant_id=target_tenant_id and id=target_vehicle_id;
  return usage_id;
end $$;

revoke all on function public.checkout_vehicle(uuid,uuid,uuid,uuid,numeric,text,text,uuid,integer,uuid) from public;
grant execute on function public.checkout_vehicle(uuid,uuid,uuid,uuid,numeric,text,text,uuid,integer,uuid) to service_role;
