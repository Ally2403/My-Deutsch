-- RF-13 · RN-10: request_retry también rescata un libro «processing» cuyo job empezó hace más de 6 h
-- (runner de Actions cancelado o agotado: fail_book no corre). El job viejo queda en error 'stalled'.
-- Ejecutar con `supabase test db` o dentro de una transacción con pgTAP; termina con rollback.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'a@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-0000000000b2', 'b@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-0000000000c3', 'c@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('dddddddd-0000-0000-0000-0000000000d4', 'd@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;
create function pg_temp.reset_role() returns void language plpgsql as $$
begin reset role; end $$;

insert into storage.objects (bucket_id, name, owner) values
  ('uploads', 'aaaaaaaa-0000-0000-0000-0000000000a1/p7.pdf', null),
  ('uploads', 'bbbbbbbb-0000-0000-0000-0000000000b2/p1.pdf', null),
  ('uploads', 'cccccccc-0000-0000-0000-0000000000c3/pn.pdf', null),
  ('uploads', 'dddddddd-0000-0000-0000-0000000000d4/pq.pdf', null);

-- Grupo con A (admin), B, C y D.
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
create temp table ctx as select public.create_group('Curso B1') as gid;
create temp table codes as select invite_code as code from public.groups where id = (select gid from ctx);
grant all on ctx, codes to public;
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-0000000000b2');
select public.join_group((select code from codes));
select pg_temp.act_as('cccccccc-0000-0000-0000-0000000000c3');
select public.join_group((select code from codes));
select pg_temp.act_as('dddddddd-0000-0000-0000-0000000000d4');
select public.join_group((select code from codes));

select pg_temp.reset_role();
insert into public.books (id, sha256, title, uploaded_by, upload_path, status) values
  ('c0000007-0000-0000-0000-000000000000', repeat('1', 64), 'P7 procesando hace 7 h', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1/p7.pdf', 'processing'),
  ('c0000001-0000-0000-0000-000000000000', repeat('2', 64), 'P1 procesando hace 1 h', 'bbbbbbbb-0000-0000-0000-0000000000b2', 'bbbbbbbb-0000-0000-0000-0000000000b2/p1.pdf', 'processing'),
  ('c0000009-0000-0000-0000-000000000000', repeat('3', 64), 'PN procesando sin inicio', 'cccccccc-0000-0000-0000-0000000000c3', 'cccccccc-0000-0000-0000-0000000000c3/pn.pdf', 'processing'),
  ('c0000006-0000-0000-0000-000000000000', repeat('4', 64), 'PQ procesando justo bajo 6 h', 'dddddddd-0000-0000-0000-0000000000d4', 'dddddddd-0000-0000-0000-0000000000d4/pq.pdf', 'processing');
insert into public.group_books (group_id, book_id, added_by)
  select (select gid from ctx), id, uploaded_by from public.books where id::text like 'c000000%';
insert into public.jobs (book_id, requested_by, status, created_at, started_at) values
  ('c0000007-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'processing', now() - interval '7 hours', now() - interval '7 hours'),
  ('c0000001-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-0000000000b2', 'processing', now() - interval '1 hour', now() - interval '1 hour'),
  ('c0000009-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-0000000000c3', 'processing', now() - interval '8 hours', null),
  ('c0000006-0000-0000-0000-000000000000', 'dddddddd-0000-0000-0000-0000000000d4', 'processing', now() - interval '5 hours 59 minutes', now() - interval '5 hours 59 minutes');

-- Un libro procesando hace 1 h, sin inicio o justo bajo 6 h no se reintenta.
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-0000000000b2');
select throws_ok($$select public.request_retry('c0000001-0000-0000-0000-000000000000')$$,
  'P0001', 'not_retryable', 'procesando desde hace 1 h: no se reintenta');
select pg_temp.act_as('cccccccc-0000-0000-0000-0000000000c3');
select throws_ok($$select public.request_retry('c0000009-0000-0000-0000-000000000000')$$,
  'P0001', 'not_retryable', 'procesando sin started_at: no se reintenta');
select pg_temp.act_as('dddddddd-0000-0000-0000-0000000000d4');
select throws_ok($$select public.request_retry('c0000006-0000-0000-0000-000000000000')$$,
  'P0001', 'not_retryable', 'procesando desde hace 5 h 59 min: no se reintenta');

-- Un tercero no puede rescatar el libro ajeno.
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-0000000000b2');
select throws_ok($$select public.request_retry('c0000007-0000-0000-0000-000000000000')$$,
  '42501', 'forbidden', 'un miembro que no lo subió ni administra no rescata el libro');

-- Procesando desde hace 7 h: se rescata.
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
create temp table r1 as select public.request_retry('c0000007-0000-0000-0000-000000000000') as r;
grant all on r1 to public;
select isnt((select r ->> 'job_id' from r1), null, 'procesando desde hace 7 h: el reintento devuelve un job nuevo');
select pg_temp.reset_role();
select is((select error from public.jobs
  where book_id = 'c0000007-0000-0000-0000-000000000000' and id <> (select (r ->> 'job_id')::uuid from r1)),
  'stalled', 'el job viejo queda en error con error = stalled (no superseded)');
select is((select status from public.jobs
  where book_id = 'c0000007-0000-0000-0000-000000000000' and id <> (select (r ->> 'job_id')::uuid from r1)),
  'error', 'el job viejo ya no está activo');
select is((select count(*)::int from public.jobs
  where book_id = 'c0000007-0000-0000-0000-000000000000' and status in ('queued', 'processing')),
  1, 'queda un solo job activo (el nuevo)');
select is((select status from public.books where id = 'c0000007-0000-0000-0000-000000000000'), 'queued',
  'el libro vuelve a la cola');

select * from finish();
rollback;
