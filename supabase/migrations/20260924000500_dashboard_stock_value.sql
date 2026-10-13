create or replace function public.get_dashboard_metrics(target_tenant_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'total_assets',(select count(*) from public.assets where tenant_id=target_tenant_id and status not in ('disposed','sold','donated')),
    'asset_value',(select coalesce(sum(purchase_value),0) from public.assets where tenant_id=target_tenant_id and status not in ('disposed','sold','donated')),
    'assets_in_use',(select count(*) from public.assets where tenant_id=target_tenant_id and status='in_use'),
    'assets_available',(select count(*) from public.assets where tenant_id=target_tenant_id and status='available'),
    'assets_in_maintenance',(select count(*) from public.assets where tenant_id=target_tenant_id and status in ('in_maintenance','awaiting_maintenance')),
    'assets_without_responsible',(select count(*) from public.assets where tenant_id=target_tenant_id and responsible_user_id is null and status='in_use'),
    'assets_without_location',(select count(*) from public.assets where tenant_id=target_tenant_id and location_id is null),
    'warranties_expiring',(select count(*) from public.warranties where tenant_id=target_tenant_id and status='active' and ends_at between current_date and current_date+30),
    'maintenance_overdue',(select count(*) from public.maintenance_orders where tenant_id=target_tenant_id and status not in ('completed','cancelled') and expected_at<now()),
    'stock_value',(select coalesce(sum(balance.quantity * coalesce(nullif(product.average_cost,0), costs.average_cost, 0)),0)
      from public.stock_balances balance
      join public.stock_products product on product.tenant_id=balance.tenant_id and product.id=balance.product_id
      left join lateral (
        select sum(m.quantity * m.unit_cost) / nullif(sum(m.quantity),0) as average_cost
        from public.stock_movements m
        where m.tenant_id=balance.tenant_id and m.product_id=balance.product_id and m.unit_cost is not null
          and m.type in ('purchase_in','return_in','positive_adjustment','transfer_in')
      ) costs on true
      where balance.tenant_id=target_tenant_id),
    'stock_products_active',(select count(*) from public.stock_products where tenant_id=target_tenant_id and status='active'),
    'stock_below_minimum',(select count(*) from public.stock_products p where p.tenant_id=target_tenant_id and p.status='active' and coalesce((select sum(b.quantity) from public.stock_balances b where b.tenant_id=p.tenant_id and b.product_id=p.id),0)<p.minimum_stock),
    'batches_expiring',(select count(*) from public.stock_batches where tenant_id=target_tenant_id and expires_at between current_date and current_date+30),
    'total_vehicles',(select count(*) from public.vehicles where tenant_id=target_tenant_id and status not in ('sold','returned_to_lessor')),
    'vehicles_available',(select count(*) from public.vehicles where tenant_id=target_tenant_id and status='available'),
    'vehicles_in_use',(select count(*) from public.vehicles where tenant_id=target_tenant_id and status='in_use'),
    'expired_vehicle_documents',(select count(*) from public.vehicle_documents where tenant_id=target_tenant_id and status='valid' and expires_at<current_date),
    'unread_notifications',(select count(*) from public.notifications where tenant_id=target_tenant_id and read_at is null)
  );
$$;
revoke all on function public.get_dashboard_metrics(uuid) from public;
grant execute on function public.get_dashboard_metrics(uuid) to service_role;
