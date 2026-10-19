-- RF-09 · RN-08 · RN-09: acciones de administración de un grupo. Solo las puede invocar un
-- administrador del grupo; si no lo es, el servidor responde 42501 («forbidden», 403 en la API).

create function public.remove_member(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_group_admin(p_group) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'use_leave_group' using errcode = 'P0001';
  end if;
  -- El diccionario personal no depende del grupo: se conserva (RF-09 c2).
  delete from public.group_members where group_id = p_group and user_id = p_user;
end $$;

create function public.set_member_role(p_group uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_group_admin(p_group) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  update public.group_members set role = p_role where group_id = p_group and user_id = p_user;
  -- Un grupo siempre conserva al menos un administrador (RN-08).
  if not exists (
    select 1 from public.group_members where group_id = p_group and role = 'admin'
  ) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
end $$;

create function public.delete_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_group_admin(p_group) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Cascada: miembros y vínculos con libros; los libros sin grupo quedan en período de
  -- recuperación de 7 días (RN-11).
  delete from public.groups where id = p_group;
end $$;

revoke execute on function
  public.remove_member(uuid, uuid), public.set_member_role(uuid, uuid, text),
  public.delete_group(uuid)
  from public, anon;
grant execute on function
  public.remove_member(uuid, uuid), public.set_member_role(uuid, uuid, text),
  public.delete_group(uuid)
  to authenticated;
