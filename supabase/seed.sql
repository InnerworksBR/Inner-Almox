insert into public.tenants (id, slug, legal_name, product_name, status, plan)
values (
  '00000000-0000-0000-0000-000000000001',
  'innerworks',
  'InnerWorks Soluções em Tecnologia',
  'Inner Almox',
  'active',
  'internal'
)
on conflict (id) do nothing;

insert into public.tenant_domains (tenant_id, hostname, is_primary, verified_at)
values
  ('00000000-0000-0000-0000-000000000001', 'localhost', true, now()),
  ('00000000-0000-0000-0000-000000000001', 'api.localhost', false, now())
on conflict (hostname) do nothing;

insert into public.tenant_branding (
  tenant_id, product_name, primary_color, secondary_color
)
values (
  '00000000-0000-0000-0000-000000000001', 'Inner Almox', '#176B4D', '#17221D'
)
on conflict (tenant_id) do nothing;

insert into public.tenant_settings (tenant_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (tenant_id) do nothing;
