-- Requisição com itens e atendimento atômico com baixa de estoque.

create or replace function public.create_stock_requisition(
  target_tenant_id uuid,
  actor_user_id uuid,
  requisition_number text,
  purpose_value text,
  items_value jsonb,
  target_department_id uuid default null,
  target_cost_center_id uuid default null
) returns uuid
language plpgsql security definer set search_path='' as $$
declare requisition_id uuid; item jsonb;
begin
  if jsonb_typeof(items_value)<>'array' or jsonb_array_length(items_value)=0 then raise exception 'requisition items required' using errcode='22023'; end if;
  insert into public.stock_requisitions(tenant_id,number,requested_by,department_id,cost_center_id,purpose,status)
  values(target_tenant_id,trim(requisition_number),actor_user_id,target_department_id,target_cost_center_id,trim(purpose_value),'requested') returning id into requisition_id;
  for item in select * from jsonb_array_elements(items_value) loop
    if coalesce((item->>'quantity')::numeric,0)<=0 then raise exception 'item quantity must be positive' using errcode='22023'; end if;
    insert into public.stock_requisition_items(tenant_id,requisition_id,product_id,requested_quantity,notes)
    values(target_tenant_id,requisition_id,(item->>'product_id')::uuid,(item->>'quantity')::numeric,nullif(trim(item->>'notes'),''));
  end loop;
  insert into public.notifications(tenant_id,type,title,message,entity_type,entity_id)
  values(target_tenant_id,'requisition_requested','Nova requisição de material','A requisição '||trim(requisition_number)||' aguarda análise.','stock_requisition',requisition_id::text);
  return requisition_id;
end $$;

create or replace function public.fulfill_stock_requisition(
  target_tenant_id uuid,
  actor_user_id uuid,
  target_requisition_id uuid,
  target_stock_location_id uuid,
  deliveries_value jsonb
) returns uuid
language plpgsql security definer set search_path='' as $$
declare requisition_status text; delivery jsonb; item_record public.stock_requisition_items%rowtype; quantity_value numeric; remaining numeric; all_fulfilled boolean;
begin
  select status into requisition_status from public.stock_requisitions where tenant_id=target_tenant_id and id=target_requisition_id for update;
  if not found then raise exception 'requisition not found' using errcode='P0002'; end if;
  if requisition_status not in ('approved','separating','ready','partially_fulfilled') then raise exception 'requisition cannot be fulfilled' using errcode='23514'; end if;
  if jsonb_typeof(deliveries_value)<>'array' or jsonb_array_length(deliveries_value)=0 then raise exception 'deliveries required' using errcode='22023'; end if;
  for delivery in select * from jsonb_array_elements(deliveries_value) loop
    quantity_value:=coalesce((delivery->>'quantity')::numeric,0);
    select * into item_record from public.stock_requisition_items where tenant_id=target_tenant_id and requisition_id=target_requisition_id and product_id=(delivery->>'product_id')::uuid for update;
    if not found or quantity_value<=0 then raise exception 'invalid delivery item' using errcode='22023'; end if;
    remaining:=coalesce(item_record.approved_quantity,item_record.requested_quantity)-item_record.delivered_quantity;
    if quantity_value>remaining then raise exception 'delivery exceeds approved quantity' using errcode='23514'; end if;
    insert into public.stock_movements(tenant_id,product_id,stock_location_id,batch_id,type,quantity,requested_by,performed_by,reason)
    values(target_tenant_id,item_record.product_id,target_stock_location_id,nullif(delivery->>'batch_id','')::uuid,'requisition_out',quantity_value,(select requested_by from public.stock_requisitions where id=target_requisition_id),actor_user_id,'Atendimento da requisição '||target_requisition_id::text);
    update public.stock_requisition_items set delivered_quantity=delivered_quantity+quantity_value where id=item_record.id;
  end loop;
  select bool_and(delivered_quantity>=coalesce(approved_quantity,requested_quantity)) into all_fulfilled from public.stock_requisition_items where tenant_id=target_tenant_id and requisition_id=target_requisition_id;
  update public.stock_requisitions set status=case when all_fulfilled then 'delivered' else 'partially_fulfilled' end,delivered_at=case when all_fulfilled then now() else delivered_at end where tenant_id=target_tenant_id and id=target_requisition_id;
  insert into public.notifications(tenant_id,user_id,type,title,message,entity_type,entity_id)
  select target_tenant_id,requested_by,'requisition_fulfilled','Requisição atualizada',case when all_fulfilled then 'Sua requisição foi entregue.' else 'Sua requisição foi atendida parcialmente.' end,'stock_requisition',target_requisition_id::text from public.stock_requisitions where id=target_requisition_id;
  return target_requisition_id;
end $$;

revoke all on function public.create_stock_requisition(uuid,uuid,text,text,jsonb,uuid,uuid) from public;
revoke all on function public.fulfill_stock_requisition(uuid,uuid,uuid,uuid,jsonb) from public;
grant execute on function public.create_stock_requisition(uuid,uuid,text,text,jsonb,uuid,uuid) to service_role;
grant execute on function public.fulfill_stock_requisition(uuid,uuid,uuid,uuid,jsonb) to service_role;
