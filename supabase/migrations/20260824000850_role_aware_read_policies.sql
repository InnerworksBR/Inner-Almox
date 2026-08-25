-- Restringe dados pessoais dentro do tenant. Gestores mantêm a visão operacional;
-- colaboradores comuns veem somente registros ligados ao próprio usuário.

drop policy assets_select_member on public.assets;
create policy assets_select_scoped on public.assets for select to authenticated using (
  public.has_tenant_role(tenant_id, array['tenant_admin','asset_manager','maintenance_manager','auditor']::text[])
  or (public.is_tenant_member(tenant_id) and responsible_user_id = (select auth.uid()))
);

drop policy asset_movements_select_member on public.asset_movements;
create policy asset_movements_select_scoped on public.asset_movements for select to authenticated using (
  public.has_tenant_role(tenant_id, array['tenant_admin','asset_manager','maintenance_manager','auditor']::text[])
  or (
    public.is_tenant_member(tenant_id)
    and (previous_responsible_user_id = (select auth.uid()) or new_responsible_user_id = (select auth.uid()) or performed_by = (select auth.uid()))
  )
);

drop policy asset_terms_select_member on public.asset_terms;
create policy asset_terms_select_scoped on public.asset_terms for select to authenticated using (
  public.has_tenant_role(tenant_id, array['tenant_admin','asset_manager','auditor']::text[])
  or (public.is_tenant_member(tenant_id) and issued_to = (select auth.uid()))
);

drop policy stock_requisitions_select_member on public.stock_requisitions;
create policy stock_requisitions_select_scoped on public.stock_requisitions for select to authenticated using (
  public.has_tenant_role(tenant_id, array['tenant_admin','warehouse_manager','department_manager','auditor']::text[])
  or (public.is_tenant_member(tenant_id) and requested_by = (select auth.uid()))
);

drop policy stock_requisition_items_select_member on public.stock_requisition_items;
create policy stock_requisition_items_select_scoped on public.stock_requisition_items for select to authenticated using (
  public.has_tenant_role(tenant_id, array['tenant_admin','warehouse_manager','department_manager','auditor']::text[])
  or exists (
    select 1 from public.stock_requisitions requisition
    where requisition.tenant_id = stock_requisition_items.tenant_id
      and requisition.id = stock_requisition_items.requisition_id
      and requisition.requested_by = (select auth.uid())
  )
);

drop policy notifications_select_member on public.notifications;
create policy notifications_select_scoped on public.notifications for select to authenticated using (
  public.is_tenant_member(tenant_id)
  and (user_id is null or user_id = (select auth.uid()) or public.has_tenant_role(tenant_id, array['tenant_admin','auditor']::text[]))
);
