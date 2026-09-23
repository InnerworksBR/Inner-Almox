-- O responsavel do ativo era um uuid solto: aceitava qualquer valor, inclusive de
-- outro tenant, e impedia o banco de devolver o nome da pessoa junto do ativo.
-- A constraint entra como "not valid" e e validada em seguida, para que a migration
-- falhe de forma clara caso exista dado antigo inconsistente, sem travar a tabela.
alter table public.assets
  add constraint assets_responsible_user_id_fkey
  foreign key (responsible_user_id) references public.profiles(id) on delete set null
  not valid;

alter table public.assets validate constraint assets_responsible_user_id_fkey;

create index if not exists assets_responsible_user_idx on public.assets (responsible_user_id);
