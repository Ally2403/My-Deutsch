-- RNF-06 · Políticas RLS, funciones de grupo y libro, y Storage (RN-03, RN-04, RN-08, RN-09, RN-10, RN-11).

-- ---------------------------------------------------------------- ayudantes (evitan recursión en RLS)
create function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members where group_id = gid and user_id = (select auth.uid())
  );
$$;

create function public.is_group_admin(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create function public.can_read_book(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_books gb
    join public.group_members gm on gm.group_id = gb.group_id
    where gb.book_id = bid and gm.user_id = (select auth.uid())
  );
$$;

create function public.shares_group_with(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on b.group_id = a.group_id
    where a.user_id = (select auth.uid()) and b.user_id = uid
  );
$$;

-- ---------------------------------------------------------------- privilegios mínimos
-- Sin acceso anónimo. El usuario autenticado solo lee, salvo donde se concede algo más abajo.
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant update (name) on public.groups to authenticated;
grant update (display_name, avatar_url, level, prefs) on public.profiles to authenticated;
grant delete on public.group_books to authenticated;
grant insert, update, delete on public.user_words, public.reading_progress,
  public.annotations to authenticated;

-- ---------------------------------------------------------------- políticas
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_group_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy groups_select on public.groups for select to authenticated
  using (public.is_group_member(id));
create policy groups_update on public.groups for update to authenticated
  using (public.is_group_admin(id)) with check (public.is_group_admin(id));

create policy group_members_select on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy group_books_select on public.group_books for select to authenticated
  using (public.is_group_member(group_id));
-- Quitar un libro de un grupo: quien lo subió o un administrador (RN-08).
create policy group_books_delete on public.group_books for delete to authenticated
  using (public.is_group_admin(group_id)
         or (added_by = (select auth.uid()) and public.is_group_member(group_id)));

create policy books_select on public.books for select to authenticated
  using (public.can_read_book(id));
create policy jobs_select on public.jobs for select to authenticated
  using (public.can_read_book(book_id));
create policy pages_select on public.pages for select to authenticated
  using (public.can_read_book(book_id));

create policy lexicon_select on public.lexicon for select to authenticated using (true);

create policy user_words_own on public.user_words for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy reading_progress_own on public.reading_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_read_book(book_id));

create policy annotations_own on public.annotations for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_read_book(book_id));

-- ---------------------------------------------------------------- RN-11: período de recuperación
create function public.touch_book_retention() returns trigger
language plpgsql security definer set search_path = '' as $$
declare bid uuid := coalesce(new.book_id, old.book_id);
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.group_books where book_id = bid) then
      update public.books set delete_after = now() + interval '7 days' where id = bid;
    end if;
  else
    update public.books set delete_after = null where id = bid;
  end if;
  return null;
end $$;
create trigger group_books_retention after insert or delete on public.group_books
  for each row execute function public.touch_book_retention();

-- ---------------------------------------------------------------- grupos (RN-08, RN-09)
create function public.gen_invite_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end $$;

create function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare gid uuid; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.groups (name, invite_code, created_by)
  values (btrim(p_name), public.gen_invite_code(), uid) returning id into gid;
  insert into public.group_members (group_id, user_id, role) values (gid, uid, 'admin');
  return gid;
end $$;

create function public.join_group(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare gid uuid; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select id into gid from public.groups where invite_code = upper(btrim(p_code));
  if gid is null then raise exception 'invalid_code' using errcode = 'P0002'; end if;
  if exists (select 1 from public.group_members where group_id = gid and user_id = uid) then
    return gid;
  end if;
  if (select count(*) from public.group_members where group_id = gid) >= 50 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, uid);
  return gid;
end $$;

create function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  delete from public.group_members where group_id = p_group and user_id = uid;
  if not found then return; end if;
  if not exists (select 1 from public.group_members where group_id = p_group) then
    delete from public.groups where id = p_group;
  elsif not exists (
    select 1 from public.group_members where group_id = p_group and role = 'admin'
  ) then
    update public.group_members set role = 'admin'
    where (group_id, user_id) = (
      select group_id, user_id from public.group_members
      where group_id = p_group order by joined_at limit 1
    );
  end if;
end $$;

create function public.regenerate_invite(p_group uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  if not public.is_group_admin(p_group) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  code := public.gen_invite_code();
  update public.groups set invite_code = code where id = p_group;
  return code;
end $$;

-- ---------------------------------------------------------------- libros (RN-02, RN-10)
create function public.submit_book(
  p_group uuid, p_sha256 text, p_title text, p_upload_path text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  b public.books%rowtype;
  jid uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_group_member(p_group) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_upload_path not like uid::text || '/%' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into b from public.books where sha256 = p_sha256;
  if found and b.status in ('ready', 'queued', 'processing') then
    insert into public.group_books (group_id, book_id, added_by)
    values (p_group, b.id, uid) on conflict do nothing;
    return jsonb_build_object('book_id', b.id, 'reused', true, 'status', b.status);
  end if;

  -- RN-10: un solo libro en procesamiento por usuario.
  if exists (
    select 1 from public.jobs where requested_by = uid and status in ('queued', 'processing')
  ) then
    raise exception 'busy' using errcode = 'P0001';
  end if;

  if found then  -- libro en error o eliminado: se vuelve a procesar
    update public.books set status = 'queued', upload_path = p_upload_path,
      delete_after = null, uploaded_by = uid where id = b.id;
  else
    insert into public.books (sha256, title, uploaded_by, upload_path)
    values (p_sha256, btrim(p_title), uid, p_upload_path) returning * into b;
  end if;
  insert into public.jobs (book_id, requested_by) values (b.id, uid) returning id into jid;
  insert into public.group_books (group_id, book_id, added_by)
  values (p_group, b.id, uid) on conflict do nothing;
  return jsonb_build_object('book_id', b.id, 'job_id', jid, 'reused', false, 'status', 'queued');
end $$;

-- ---------------------------------------------------------------- Storage (RNF-06 criterio 2)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('uploads', 'uploads', false, 52428800, array['application/pdf']),
  ('pages', 'pages', false, 5242880, array['image/webp', 'application/json']);

create function public.storage_book_readable(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare folder text := split_part(object_name, '/', 1);
begin
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_read_book(folder::uuid);
end $$;

create policy pages_read on storage.objects for select to authenticated
  using (bucket_id = 'pages' and public.storage_book_readable(name));
create policy uploads_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy uploads_select on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy uploads_delete on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and split_part(name, '/', 1) = (select auth.uid())::text);

-- ---------------------------------------------------------------- permisos de ejecución
-- Las funciones nacen ejecutables por todos; solo los usuarios con sesión pueden llamarlas.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_group(text), public.join_group(text),
  public.leave_group(uuid), public.regenerate_invite(uuid),
  public.submit_book(uuid, text, text, text), public.storage_book_readable(text),
  public.is_group_member(uuid), public.is_group_admin(uuid), public.can_read_book(uuid),
  public.shares_group_with(uuid) to authenticated;
