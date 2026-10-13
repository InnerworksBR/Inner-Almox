-- Termos emitidos sem responsável explícito devem aparecer em "Meus termos".

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
    coalesce(movement_record.new_responsible_user_id, actor_user_id)
  ) returning id into term_id;
  return term_id;
end; $$;

revoke all on function public.issue_asset_term(uuid,uuid,uuid,text) from public;
grant execute on function public.issue_asset_term(uuid,uuid,uuid,text) to service_role;
