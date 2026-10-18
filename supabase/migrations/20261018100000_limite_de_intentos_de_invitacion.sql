-- RNF-17 · Límite de intentos fallidos al unirse a un grupo (RN-03, RN-09).
-- Un código inexistente devuelve null en vez de lanzar: una excepción deshace la
-- transacción y el intento fallido no quedaría registrado.

create table public.join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index join_attempts_user_idx on public.join_attempts (user_id, attempted_at);
alter table public.join_attempts enable row level security;
-- Solo join_group (security definer) la toca: nadie más tiene privilegios ni políticas.
revoke all on public.join_attempts from anon, authenticated;

create or replace function public.join_group(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare gid uuid; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  delete from public.join_attempts
  where user_id = uid and attempted_at < now() - interval '1 day';
  if (
    select count(*) from public.join_attempts
    where user_id = uid and attempted_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select id into gid from public.groups where invite_code = upper(btrim(p_code));
  if gid is null then
    insert into public.join_attempts (user_id) values (uid);
    return null;
  end if;
  if exists (select 1 from public.group_members where group_id = gid and user_id = uid) then
    return gid;
  end if;
  if (select count(*) from public.group_members where group_id = gid) >= 50 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, uid);
  return gid;
end $$;
