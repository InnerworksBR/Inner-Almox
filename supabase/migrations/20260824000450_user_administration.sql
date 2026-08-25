-- Administração de usuários executada exclusivamente pela service role via Fastify.
create or replace function public.provision_tenant_membership(
  target_tenant_id uuid,
  target_user_id uuid,
  target_roles text[],
  employee_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_membership_id uuid;
  invalid_role text;
begin
  if not exists(select 1 from public.tenants where id=target_tenant_id and status='active') then
    raise exception 'tenant not found or inactive' using errcode='P0002';
  end if;
  select role into invalid_role from unnest(target_roles) role
    where role not in ('tenant_admin','asset_manager','warehouse_manager','fleet_manager','maintenance_manager','department_manager','employee','auditor') limit 1;
  if invalid_role is not null or cardinality(target_roles)=0 then raise exception 'invalid roles' using errcode='22023'; end if;

  insert into public.tenant_memberships(
    tenant_id,user_id,status,joined_at,employee_number,position,branch_id,department_id,cost_center_id,admission_date
  ) values (
    target_tenant_id,target_user_id,'active',now(),nullif(employee_data->>'employee_number',''),nullif(employee_data->>'position',''),
    nullif(employee_data->>'branch_id','')::uuid,nullif(employee_data->>'department_id','')::uuid,
    nullif(employee_data->>'cost_center_id','')::uuid,nullif(employee_data->>'admission_date','')::date
  )
  on conflict (tenant_id,user_id) do update set
    status='active', joined_at=coalesce(public.tenant_memberships.joined_at,now()), employee_number=excluded.employee_number,
    position=excluded.position, branch_id=excluded.branch_id, department_id=excluded.department_id,
    cost_center_id=excluded.cost_center_id, admission_date=excluded.admission_date
  returning id into new_membership_id;

  delete from public.membership_roles where membership_roles.membership_id=new_membership_id;
  insert into public.membership_roles(membership_id,role) select new_membership_id,role from unnest(target_roles) role;
  return new_membership_id;
end;
$$;

create or replace function public.list_tenant_users(target_tenant_id uuid)
returns table(
  membership_id uuid, user_id uuid, email text, full_name text, phone text, employee_number text,
  employee_position text, branch_id uuid, department_id uuid, cost_center_id uuid, membership_status text, roles text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id,m.user_id,u.email,p.full_name,p.phone,m.employee_number,m.position,m.branch_id,m.department_id,m.cost_center_id,m.status,
    coalesce(array_agg(r.role order by r.role) filter(where r.role is not null),'{}'::text[])
  from public.tenant_memberships m
  join public.profiles p on p.id=m.user_id
  join auth.users u on u.id=m.user_id
  left join public.membership_roles r on r.membership_id=m.id
  where m.tenant_id=target_tenant_id
  group by m.id,u.email,p.full_name,p.phone;
$$;

revoke all on function public.provision_tenant_membership(uuid,uuid,text[],jsonb) from public;
revoke all on function public.list_tenant_users(uuid) from public;
grant execute on function public.provision_tenant_membership(uuid,uuid,text[],jsonb) to service_role;
grant execute on function public.list_tenant_users(uuid) to service_role;
