-- RF-13 · RN-10: un libro «processing» cuyo runner se perdió (cancelado, agotado a los 300 min o
-- sin que fail_book corra) quedaba sin salida: request_retry solo rescataba los «queued» y el índice
-- jobs_one_active_per_user daba 'busy' para siempre. Ahora también se considera atascado un libro
-- «processing» cuyo último job empezó hace más de 6 h (el workflow vence a los 300 min); su job
-- viejo se cierra con error 'stalled'. Todo lo demás de request_retry queda igual.
create or replace function public.request_retry(p_book uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  b public.books%rowtype;
  last_job public.jobs%rowtype;
  stale boolean := false;
  stalled boolean := false;
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
  elsif b.status = 'processing' then
    select * into last_job from public.jobs where book_id = b.id order by created_at desc limit 1;
    stalled := found and last_job.status = 'processing' and last_job.started_at is not null
      and last_job.started_at < now() - interval '6 hours';
  end if;
  if not (b.status = 'error' or stale or stalled) then
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
  elsif stalled then
    update public.jobs set status = 'error', error = 'stalled', finished_at = now()
    where id = last_job.id and status = 'processing';
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

-- create or replace conserva los permisos; se reafirman por claridad.
revoke execute on function public.request_retry(uuid) from public, anon, authenticated;
grant execute on function public.request_retry(uuid) to authenticated;
