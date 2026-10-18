-- RN-10 · RF-11 · RF-13: cola sin atascos y reintento.
-- 1) La base impide dos jobs activos del mismo usuario.
-- 2) finalize_submission es idempotente: no_pending/busy se devuelven, no se lanzan.
-- 3) request_retry: reintento de un libro en error o con el disparo perdido.

create unique index jobs_one_active_per_user on public.jobs (requested_by)
  where status in ('queued', 'processing');

create or replace function public.finalize_submission(p_submission uuid, p_sha256 text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.book_submissions%rowtype;
  b public.books%rowtype;
  jid uuid;
  exists_already boolean;
begin
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_sha' using errcode = 'P0001';
  end if;
  select * into s from public.book_submissions where id = p_submission for update;
  if not found or s.status <> 'pending' then
    return jsonb_build_object('rejected', 'not_pending');
  end if;
  if not exists (
    select 1 from public.group_members where group_id = s.group_id and user_id = s.user_id
  ) then
    update public.book_submissions set status = 'rejected', error = 'forbidden' where id = s.id;
    return jsonb_build_object('rejected', 'forbidden');
  end if;

  select * into b from public.books where sha256 = p_sha256;
  exists_already := found;
  if exists_already and b.status in ('ready', 'queued', 'processing') then
    insert into public.group_books (group_id, book_id, added_by)
    values (s.group_id, b.id, s.user_id) on conflict do nothing;
    update public.book_submissions set status = 'verified', book_id = b.id where id = s.id;
    return jsonb_build_object('book_id', b.id, 'reused', true, 'status', b.status,
                              'upload_path', s.upload_path);
  end if;

  if exists (
    select 1 from public.jobs where requested_by = s.user_id and status in ('queued', 'processing')
  ) then
    update public.book_submissions set status = 'rejected', error = 'busy' where id = s.id;
    return jsonb_build_object('rejected', 'busy');
  end if;

  begin
    if exists_already then  -- libro en error o eliminado: se vuelve a procesar
      update public.books set status = 'queued', upload_path = s.upload_path,
        delete_after = null, uploaded_by = s.user_id where id = b.id;
    else
      insert into public.books (sha256, title, uploaded_by, upload_path)
      values (p_sha256, s.title, s.user_id, s.upload_path)
      on conflict (sha256) do nothing returning * into b;
      if not found then
        -- otro proceso creó el mismo libro a la vez: se reutiliza el suyo
        select * into b from public.books where sha256 = p_sha256;
        insert into public.group_books (group_id, book_id, added_by)
        values (s.group_id, b.id, s.user_id) on conflict do nothing;
        update public.book_submissions set status = 'verified', book_id = b.id where id = s.id;
        return jsonb_build_object('book_id', b.id, 'reused', true, 'status', b.status,
                                  'upload_path', s.upload_path);
      end if;
    end if;
    insert into public.jobs (book_id, requested_by) values (b.id, s.user_id) returning id into jid;
  exception when unique_violation then
    -- carrera con otro job activo del mismo usuario (índice jobs_one_active_per_user)
    update public.book_submissions set status = 'rejected', error = 'busy' where id = s.id;
    return jsonb_build_object('rejected', 'busy');
  end;
  insert into public.group_books (group_id, book_id, added_by)
  values (s.group_id, b.id, s.user_id) on conflict do nothing;
  update public.book_submissions set status = 'verified', book_id = b.id where id = s.id;
  return jsonb_build_object('book_id', b.id, 'job_id', jid, 'reused', false, 'status', 'queued',
                            'upload_path', s.upload_path);
end $$;

-- Reintento por quien subió el libro o por un administrador de un grupo que lo tiene.
create function public.request_retry(p_book uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  b public.books%rowtype;
  last_job public.jobs%rowtype;
  stale boolean := false;
  jid uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.can_read_book(p_book) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into b from public.books where id = p_book for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  if b.uploaded_by is distinct from uid and not exists (
    select 1 from public.group_books gb
    join public.group_members gm on gm.group_id = gb.group_id
    where gb.book_id = b.id and gm.user_id = uid and gm.role = 'admin'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if b.status = 'queued' then
    select * into last_job from public.jobs where book_id = b.id order by created_at desc limit 1;
    stale := found and last_job.started_at is null
      and last_job.created_at < now() - interval '5 minutes';
  end if;
  if not (b.status = 'error' or stale) then
    raise exception 'not_retryable' using errcode = 'P0001';
  end if;

  if b.upload_path is null or not exists (
    select 1 from storage.objects where bucket_id = 'uploads' and name = b.upload_path
  ) then
    raise exception 'upload_missing' using errcode = 'P0002';
  end if;

  -- El job perdido se cierra para no bloquear a su dueño (RN-10); si luego falla por 'busy',
  -- la excepción deshace este cambio.
  if stale then
    update public.jobs set status = 'error', error = 'superseded', finished_at = now()
    where book_id = b.id and status = 'queued' and started_at is null;
  end if;

  if exists (
    select 1 from public.jobs where requested_by = uid and status in ('queued', 'processing')
  ) then
    raise exception 'busy' using errcode = 'P0001';
  end if;

  insert into public.jobs (book_id, requested_by) values (b.id, uid) returning id into jid;
  update public.books set status = 'queued' where id = b.id;
  return jsonb_build_object('book_id', b.id, 'job_id', jid);
end $$;

revoke execute on function public.finalize_submission(uuid, text),
  public.request_retry(uuid) from public, anon, authenticated;
grant execute on function public.finalize_submission(uuid, text) to service_role;
grant execute on function public.request_retry(uuid) to authenticated;
