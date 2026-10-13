create or replace function public.get_module_metrics(target_tenant_id uuid, module text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if module not in ('patrimonio', 'almoxarifado', 'frota') then
    raise exception 'unsupported dashboard module' using errcode = '22023';
  end if;

  if module = 'patrimonio' then
    return jsonb_build_object(
      'module', module,
      'metrics', jsonb_build_object(
        'total', (select count(*) from public.assets where tenant_id = target_tenant_id and status not in ('disposed', 'sold', 'donated')),
        'in_use', (select count(*) from public.assets where tenant_id = target_tenant_id and status = 'in_use'),
        'available', (select count(*) from public.assets where tenant_id = target_tenant_id and status = 'available'),
        'maintenance', (select count(*) from public.assets where tenant_id = target_tenant_id and status in ('in_maintenance', 'awaiting_maintenance')),
        'value', (select coalesce(sum(purchase_value), 0) from public.assets where tenant_id = target_tenant_id and status not in ('disposed', 'sold', 'donated'))
      ),
      'distribution', coalesce((
        select jsonb_agg(jsonb_build_object('key', status_key, 'label', label, 'value', value) order by position)
        from (
          values
            ('in_use', 'Em uso', (select count(*) from public.assets where tenant_id = target_tenant_id and status = 'in_use'), 1),
            ('available', 'Disponíveis', (select count(*) from public.assets where tenant_id = target_tenant_id and status = 'available'), 2),
            ('maintenance', 'Em manutenção', (select count(*) from public.assets where tenant_id = target_tenant_id and status in ('in_maintenance', 'awaiting_maintenance')), 3),
            ('other', 'Outras situações', (select count(*) from public.assets where tenant_id = target_tenant_id and status not in ('disposed', 'sold', 'donated', 'in_use', 'available', 'in_maintenance', 'awaiting_maintenance')), 4)
        ) as statuses(status_key, label, value, position)
      ), '[]'::jsonb),
      'monthly', coalesce((
        select jsonb_agg(jsonb_build_object(
          'month', to_char(month_start, 'YYYY-MM'),
          'label', to_char(month_start, 'Mon/YY'),
          'values', jsonb_build_object('movements', (
            select count(*) from public.asset_movements movement
            where movement.tenant_id = target_tenant_id
              and movement.occurred_at >= month_start
              and movement.occurred_at < month_start + interval '1 month'
          ))
        ) order by month_start)
        from generate_series(
          date_trunc('month', current_date) - interval '5 months',
          date_trunc('month', current_date),
          interval '1 month'
        ) as months(month_start)
      ), '[]'::jsonb)
    );
  end if;

  if module = 'almoxarifado' then
    return jsonb_build_object(
      'module', module,
      'metrics', jsonb_build_object(
        'stock_value', (select coalesce(sum(balance.quantity * product.average_cost), 0) from public.stock_balances balance join public.stock_products product on product.tenant_id = balance.tenant_id and product.id = balance.product_id where balance.tenant_id = target_tenant_id),
        'products_active', (select count(*) from public.stock_products where tenant_id = target_tenant_id and status = 'active'),
        'below_minimum', (select count(*) from public.stock_products product where product.tenant_id = target_tenant_id and product.status = 'active' and coalesce((select sum(balance.quantity) from public.stock_balances balance where balance.tenant_id = product.tenant_id and balance.product_id = product.id), 0) < product.minimum_stock),
        'batches_expiring', (select count(*) from public.stock_batches where tenant_id = target_tenant_id and expires_at between current_date and current_date + 30)
      ),
      'distribution', coalesce((
        select jsonb_agg(jsonb_build_object('key', category_key, 'label', label, 'value', value) order by label)
        from (
          select coalesce(category.id::text, 'uncategorized') as category_key,
                 coalesce(category.name, 'Sem categoria') as label,
                 count(*) as value
          from public.stock_products product
          left join public.stock_categories category on category.tenant_id = product.tenant_id and category.id = product.category_id
          where product.tenant_id = target_tenant_id and product.status = 'active'
          group by category.id, category.name
        ) as categories
      ), '[]'::jsonb),
      'monthly', coalesce((
        select jsonb_agg(jsonb_build_object(
          'month', to_char(month_start, 'YYYY-MM'),
          'label', to_char(month_start, 'Mon/YY'),
          'values', jsonb_build_object(
            'entries', (select coalesce(sum(movement.quantity), 0) from public.stock_movements movement where movement.tenant_id = target_tenant_id and movement.type in ('purchase_in', 'return_in', 'positive_adjustment', 'transfer_in') and movement.occurred_at >= month_start and movement.occurred_at < month_start + interval '1 month'),
            'exits', (select coalesce(sum(movement.quantity), 0) from public.stock_movements movement where movement.tenant_id = target_tenant_id and movement.type in ('consumption_out', 'requisition_out', 'loss_out', 'negative_adjustment', 'transfer_out') and movement.occurred_at >= month_start and movement.occurred_at < month_start + interval '1 month')
          )
        ) order by month_start)
        from generate_series(
          date_trunc('month', current_date) - interval '5 months',
          date_trunc('month', current_date),
          interval '1 month'
        ) as months(month_start)
      ), '[]'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'module', module,
    'metrics', jsonb_build_object(
      'vehicles', (select count(*) from public.vehicles where tenant_id = target_tenant_id and status not in ('sold', 'returned_to_lessor')),
      'available', (select count(*) from public.vehicles where tenant_id = target_tenant_id and status = 'available'),
      'in_use', (select count(*) from public.vehicles where tenant_id = target_tenant_id and status = 'in_use'),
      'expired_documents', (select count(*) from public.vehicle_documents where tenant_id = target_tenant_id and status = 'valid' and expires_at < current_date),
      'cost', (select coalesce(sum(fueling.total_amount), 0) from public.vehicle_fuelings fueling where fueling.tenant_id = target_tenant_id) +
              (select coalesce(sum(expense.amount), 0) from public.vehicle_expenses expense where expense.tenant_id = target_tenant_id) +
              (select coalesce(sum(fine.amount), 0) from public.vehicle_fines fine where fine.tenant_id = target_tenant_id and fine.status <> 'cancelled')
    ),
    'distribution', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', status,
        'label', case status
          when 'available' then 'Disponível'
          when 'in_use' then 'Em uso'
          when 'reserved' then 'Reservado'
          when 'in_maintenance' then 'Em manutenção'
          when 'unavailable' then 'Indisponível'
          when 'damaged' then 'Danificado'
          else status
        end,
        'value', total
      ) order by status)
      from (
        select status, count(*) as total
        from public.vehicles
        where tenant_id = target_tenant_id and status not in ('sold', 'returned_to_lessor')
        group by status
      ) as vehicle_statuses
    ), '[]'::jsonb),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', to_char(month_start, 'YYYY-MM'),
        'label', to_char(month_start, 'Mon/YY'),
        'values', jsonb_build_object(
          'cost',
          (select coalesce(sum(fueling.total_amount), 0) from public.vehicle_fuelings fueling where fueling.tenant_id = target_tenant_id and fueling.occurred_at >= month_start and fueling.occurred_at < month_start + interval '1 month') +
          (select coalesce(sum(expense.amount), 0) from public.vehicle_expenses expense where expense.tenant_id = target_tenant_id and expense.occurred_at >= month_start::date and expense.occurred_at < (month_start + interval '1 month')::date) +
          (select coalesce(sum(fine.amount), 0) from public.vehicle_fines fine where fine.tenant_id = target_tenant_id and fine.status <> 'cancelled' and fine.occurred_at >= month_start and fine.occurred_at < month_start + interval '1 month')
        )
      ) order by month_start)
      from generate_series(
        date_trunc('month', current_date) - interval '5 months',
        date_trunc('month', current_date),
        interval '1 month'
      ) as months(month_start)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_module_metrics(uuid, text) from public;
grant execute on function public.get_module_metrics(uuid, text) to service_role;
