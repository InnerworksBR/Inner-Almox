drop function if exists public.list_tenant_users(uuid);

create or replace function public.list_tenant_users(
  target_tenant_id uuid,
  search text default null
)
returns table(
  membership_id uuid, user_id uuid, email text, full_name text, phone text, employee_number text,
  employee_position text, branch_id uuid, department_id uuid, cost_center_id uuid, membership_status text, roles text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.user_id, u.email, p.full_name, p.phone, m.employee_number, m.position,
    m.branch_id, m.department_id, m.cost_center_id, m.status,
    coalesce(array_agg(r.role order by r.role) filter(where r.role is not null), '{}'::text[])
  from public.tenant_memberships m
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  left join public.membership_roles r on r.membership_id = m.id
  where m.tenant_id = target_tenant_id
    and (
      nullif(trim(search), '') is null
      or p.full_name ilike '%' || trim(search) || '%'
      or u.email ilike '%' || trim(search) || '%'
      or m.employee_number ilike '%' || trim(search) || '%'
    )
  group by m.id, u.email, p.full_name, p.phone;
$$;

revoke all on function public.list_tenant_users(uuid, text) from public;
grant execute on function public.list_tenant_users(uuid, text) to service_role;
