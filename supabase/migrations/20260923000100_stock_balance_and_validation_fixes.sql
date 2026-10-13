-- Correcoes apontadas pela auditoria do MVP (docs/AUDITORIA-MVP.md).
--
-- 1. Saidas de estoque em um local que ainda nao possui linha de saldo passavam
--    silenciosamente: o gatilho inseria greatest(delta, 0), ou seja zero, e a
--    verificacao seguinte nunca encontrava saldo negativo. Na pratica, uma
--    transferencia a partir de um estoque vazio criava saldo no destino.
-- 2. A funcao validate_asset_term nao tinha permissao para a service role, que e
--    justamente quem a API usa, entao a validacao publica de termos respondia 500.

create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare delta numeric(14,3);
declare saldo_atual numeric(14,3);
begin
  delta := case
    when new.type in ('purchase_in','return_in','positive_adjustment','transfer_in') then new.quantity
    when new.type in ('reservation','inventory') then 0
    else -new.quantity
  end;

  -- Garante a linha de saldo sem ainda aplicar o movimento.
  insert into public.stock_balances(tenant_id,product_id,stock_location_id,batch_id,quantity)
  values(new.tenant_id,new.product_id,new.stock_location_id,new.batch_id,0)
  on conflict (tenant_id,product_id,stock_location_id,coalesce(batch_id,'00000000-0000-0000-0000-000000000000'::uuid))
  do nothing;

  -- Trava a linha de saldo antes de decidir, para nao competir com outra transacao.
  select quantity into saldo_atual
  from public.stock_balances
  where tenant_id = new.tenant_id
    and product_id = new.product_id
    and stock_location_id = new.stock_location_id
    and batch_id is not distinct from new.batch_id
  for update;

  if saldo_atual is null then
    raise exception 'stock balance row not found for movement' using errcode = '23514';
  end if;
  -- A validacao vem antes da escrita para devolver o erro de negocio, e nao a
  -- violacao da restricao da coluna.
  if saldo_atual + delta < 0 then
    raise exception 'stock movement would result in negative balance' using errcode = '23514';
  end if;

  update public.stock_balances
  set quantity = saldo_atual + delta, updated_at = now()
  where tenant_id = new.tenant_id
    and product_id = new.product_id
    and stock_location_id = new.stock_location_id
    and batch_id is not distinct from new.batch_id;
  return new;
end; $$;

revoke all on function public.apply_stock_movement() from public;

grant execute on function public.validate_asset_term(text) to service_role;
