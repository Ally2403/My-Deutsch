-- RF-11 · RN-02: el libro se vincula al grupo solo cuando el servidor calcula la huella del
-- archivo subido. submit_book ya no confía en la huella que envía el navegador.

drop function public.submit_book(uuid, text, text, text);

create table public.book_submissions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  upload_path text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  book_id uuid references public.books (id) on delete set null,
  error text,
  created_at timestamptz not null default now()
);
create index book_submissions_user_idx on public.book_submissions (user_id, status, created_at);
alter table public.book_submissions enable row level security;
revoke all on public.book_submissions from anon, authenticated;
grant select on public.book_submissions to authenticated;
create policy book_submissions_select on public.book_submissions for select to authenticated
  using (user_id = (select auth.uid()));

-- El usuario registra la solicitud después de subir el PDF a su carpeta de Storage.
create function public.submit_book(p_group uuid, p_title text, p_upload_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  sid uuid;
  t text := btrim(p_title);
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_group_member(p_group) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_upload_path not like uid::text || '/%' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if t is null or char_length(t) not between 1 and 200 then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from storage.objects where bucket_id = 'uploads' and name = p_upload_path
  ) then
    raise exception 'upload_missing' using errcode = 'P0002';
  end if;

  -- RN-10: un solo libro en proceso por usuario; una solicitud pendiente reciente cuenta.
  if exists (
    select 1 from public.jobs where requested_by = uid and status in ('queued', 'processing')
  ) or exists (
    select 1 from public.book_submissions
    where user_id = uid and status = 'pending' and created_at > now() - interval '15 minutes'
  ) then
    raise exception 'busy' using errcode = 'P0001';
  end if;

  insert into public.book_submissions (group_id, user_id, title, upload_path)
  values (p_group, uid, t, p_upload_path) returning id into sid;
  return sid;
end $$;

-- Solo el servidor (service role), con la huella que él mismo calculó del archivo.
create function public.finalize_submission(p_submission uuid, p_sha256 text) returns jsonb
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
    raise exception 'not_pending' using errcode = 'P0001';
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

  if exists_already then  -- libro en error o eliminado: se vuelve a procesar
    update public.books set status = 'queued', upload_path = s.upload_path,
      delete_after = null, uploaded_by = s.user_id where id = b.id;
  else
    insert into public.books (sha256, title, uploaded_by, upload_path)
    values (p_sha256, s.title, s.user_id, s.upload_path) returning * into b;
  end if;
  insert into public.jobs (book_id, requested_by) values (b.id, s.user_id) returning id into jid;
  insert into public.group_books (group_id, book_id, added_by)
  values (s.group_id, b.id, s.user_id) on conflict do nothing;
  update public.book_submissions set status = 'verified', book_id = b.id where id = s.id;
  return jsonb_build_object('book_id', b.id, 'job_id', jid, 'reused', false, 'status', 'queued',
                            'upload_path', s.upload_path);
end $$;

create function public.reject_submission(p_submission uuid, p_reason text) returns void
language sql security definer set search_path = '' as $$
  update public.book_submissions set status = 'rejected', error = p_reason
  where id = p_submission and status = 'pending';
$$;

revoke execute on function public.submit_book(uuid, text, text),
  public.finalize_submission(uuid, text), public.reject_submission(uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_book(uuid, text, text) to authenticated;
grant execute on function public.finalize_submission(uuid, text),
  public.reject_submission(uuid, text) to service_role;
