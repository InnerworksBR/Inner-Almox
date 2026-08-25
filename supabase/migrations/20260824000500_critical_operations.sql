-- Operações críticas atômicas. Chamadas apenas pela API com service role.

create or replace function public.record_asset_movement(
  target_tenant_id uuid, target_asset_id uuid, movement_type text, actor_user_id uuid,
  movement_reason text default null, destination_data jsonb default '{}'::jsonb,
  new_responsible_id uuid default null, new_condition_value text default null
)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_asset public.assets%rowtype; movement_id uuid; next_status text;
begin
  select * into current_asset from public.assets where tenant_id=target_tenant_id and id=target_asset_id for update;
  if not found then raise exception 'asset not found' using errcode='P0002'; end if;
  if movement_type not in ('delivery','return','loan','department_transfer','branch_transfer','reservation','maintenance_out','maintenance_return','disposal','sale','donation','loss')
    then raise exception 'invalid movement type' using errcode='22023'; end if;
  next_status := case movement_type when 'delivery' then 'in_use' when 'return' then 'available' when 'loan' then 'loaned'
    when 'reservation' then 'reserved' when 'maintenance_out' then 'in_maintenance' when 'maintenance_return' then 'available'
    when 'disposal' then 'disposed' when 'sale' then 'sold' when 'donation' then 'donated' when 'loss' then 'lost' else 'in_transfer' end;
  insert into public.asset_movements(tenant_id,asset_id,type,origin,destination,previous_responsible_user_id,new_responsible_user_id,performed_by,reason,previous_condition,new_condition)
  values(target_tenant_id,target_asset_id,movement_type,jsonb_build_object('branch_id',current_asset.branch_id,'location_id',current_asset.location_id,'department_id',current_asset.department_id),
    destination_data,current_asset.responsible_user_id,new_responsible_id,actor_user_id,movement_reason,current_asset.condition,coalesce(new_condition_value,current_asset.condition)) returning id into movement_id;
  update public.assets set status=next_status,
    responsible_user_id=case when movement_type in ('return','disposal','sale','donation','loss') then null else coalesce(new_responsible_id,responsible_user_id) end,
    branch_id=coalesce(nullif(destination_data->>'branch_id','')::uuid,branch_id),
    location_id=coalesce(nullif(destination_data->>'location_id','')::uuid,location_id),
    department_id=coalesce(nullif(destination_data->>'department_id','')::uuid,department_id),
    condition=coalesce(new_condition_value,condition) where tenant_id=target_tenant_id and id=target_asset_id;
  return movement_id;
end $$;

create or replace function public.record_stock_movement(
  target_tenant_id uuid, target_product_id uuid, target_stock_location_id uuid, movement_type text,
  movement_quantity numeric, actor_user_id uuid, target_batch_id uuid default null,
  movement_unit_cost numeric default null, movement_document text default null, movement_reason text default null,
  target_department_id uuid default null, target_cost_center_id uuid default null
)
returns uuid language plpgsql security definer set search_path='' as $$
declare movement_id uuid;
begin
  if movement_quantity <= 0 then raise exception 'quantity must be positive' using errcode='22023'; end if;
  insert into public.stock_movements(tenant_id,product_id,stock_location_id,batch_id,type,quantity,unit_cost,document_number,department_id,cost_center_id,performed_by,reason)
  values(target_tenant_id,target_product_id,target_stock_location_id,target_batch_id,movement_type,movement_quantity,movement_unit_cost,movement_document,target_department_id,target_cost_center_id,actor_user_id,movement_reason)
  returning id into movement_id;
  return movement_id;
end $$;

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

create or replace function public.return_vehicle(
  target_tenant_id uuid, target_usage_id uuid, actor_user_id uuid, final_mileage_value numeric,
  fuel_level_value integer default null, damages_value text default null, notes_value text default null
)
returns numeric language plpgsql security definer set search_path='' as $$
declare usage_row public.vehicle_usages%rowtype; actor_is_manager boolean;
begin
  select * into usage_row from public.vehicle_usages where tenant_id=target_tenant_id and id=target_usage_id and status='active' for update;
  if not found then raise exception 'active usage not found' using errcode='P0002'; end if;
  select exists(select 1 from public.tenant_memberships m join public.membership_roles r on r.membership_id=m.id
    where m.tenant_id=target_tenant_id and m.user_id=actor_user_id and m.status='active' and r.role in ('tenant_admin','fleet_manager')) into actor_is_manager;
  if not actor_is_manager and not exists(select 1 from public.vehicle_drivers d join public.tenant_memberships m on m.id=d.membership_id
    where d.id=usage_row.driver_id and d.tenant_id=target_tenant_id and m.user_id=actor_user_id)
    then raise exception 'cannot return another driver usage' using errcode='42501'; end if;
  if final_mileage_value < usage_row.initial_mileage then raise exception 'mileage cannot regress' using errcode='23514'; end if;
  update public.vehicle_usages set returned_at=now(),final_mileage=final_mileage_value,final_fuel_level=fuel_level_value,damages=damages_value,notes=notes_value,status='completed'
    where tenant_id=target_tenant_id and id=target_usage_id;
  update public.vehicles set status='available',current_mileage=final_mileage_value where tenant_id=target_tenant_id and id=usage_row.vehicle_id;
  return final_mileage_value-usage_row.initial_mileage;
end $$;

revoke all on function public.record_asset_movement(uuid,uuid,text,uuid,text,jsonb,uuid,text) from public;
revoke all on function public.record_stock_movement(uuid,uuid,uuid,text,numeric,uuid,uuid,numeric,text,text,uuid,uuid) from public;
revoke all on function public.checkout_vehicle(uuid,uuid,uuid,uuid,numeric,text,text,uuid,integer,uuid) from public;
revoke all on function public.return_vehicle(uuid,uuid,uuid,numeric,integer,text,text) from public;
grant execute on function public.record_asset_movement(uuid,uuid,text,uuid,text,jsonb,uuid,text) to service_role;
grant execute on function public.record_stock_movement(uuid,uuid,uuid,text,numeric,uuid,uuid,numeric,text,text,uuid,uuid) to service_role;
grant execute on function public.checkout_vehicle(uuid,uuid,uuid,uuid,numeric,text,text,uuid,integer,uuid) to service_role;
grant execute on function public.return_vehicle(uuid,uuid,uuid,numeric,integer,text,text) to service_role;
