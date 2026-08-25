-- Chaves candidatas usadas por FKs compostas dos módulos de negócio.
-- Mantidas em migration separada porque a Sprint 1 já pode estar aplicada.
alter table public.branches add constraint branches_tenant_id_id_unique unique (tenant_id, id);
alter table public.departments add constraint departments_tenant_id_id_unique unique (tenant_id, id);
alter table public.cost_centers add constraint cost_centers_tenant_id_id_unique unique (tenant_id, id);
alter table public.locations add constraint locations_tenant_id_id_unique unique (tenant_id, id);
alter table public.suppliers add constraint suppliers_tenant_id_id_unique unique (tenant_id, id);
