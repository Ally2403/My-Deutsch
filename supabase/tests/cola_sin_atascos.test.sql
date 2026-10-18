-- RF-11 · RF-13 · RN-10: un job activo por usuario en la base, finalize idempotente y request_retry.
-- Ejecutar con `supabase test db` o dentro de una transacción con pgTAP; termina con rollback.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('dddddddd-0000-0000-0000-000000000004', 'd@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'e@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('ffffffff-0000-0000-0000-000000000006', 'f@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;
create function pg_temp.reset_role() returns void language plpgsql as $$
begin reset role; end $$;
create function pg_temp.as_service() returns void language plpgsql as $$
begin
  reset role;
  set local role service_role;
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  reset role;
  set local role anon;
end $$;

-- Archivos subidos a Storage.
insert into storage.objects (bucket_id, name, owner) values
  ('uploads', 'eeeeeeee-0000-0000-0000-000000000005/e.pdf', null),
  ('uploads', 'aaaaaaaa-0000-0000-0000-000000000001/a1.pdf', null),
  ('uploads', 'aaaaaaaa-0000-0000-0000-000000000001/a2.pdf', null),
  ('uploads', 'bbbbbbbb-0000-0000-0000-000000000002/b9.pdf', null),
  ('uploads', 'dddddddd-0000-0000-0000-000000000004/d7.pdf', null),
  ('uploads', 'ffffffff-0000-0000-0000-000000000006/f6.pdf', null);

-- Grupo G (admin A; miembros B, D, F; C es administradora) y grupo GE de E.
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
create temp table ctx as select public.create_group('Curso B1') as gid;
create temp table codes as select invite_code as code from public.groups where id = (select gid from ctx);
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select public.join_group((select code from codes));
select pg_temp.act_as('cccccccc-0000-0000-0000-000000000003');
select public.join_group((select code from codes));
select pg_temp.act_as('dddddddd-0000-0000-0000-000000000004');
select public.join_group((select code from codes));
select pg_temp.act_as('ffffffff-0000-0000-0000-000000000006');
select public.join_group((select code from codes));
select pg_temp.act_as('eeeeeeee-0000-0000-0000-000000000005');
create temp table ctx_e as select public.create_group('Curso E') as gid;
grant all on ctx, codes, ctx_e to public;
select pg_temp.reset_role();
update public.group_members set role = 'admin'
  where group_id = (select gid from ctx) and user_id = 'cccccccc-0000-0000-0000-000000000003';

-- finalize_submission es idempotente y el índice único protege RN-10.
select pg_temp.act_as('eeeeeeee-0000-0000-0000-000000000005');
create temp table s1 as select public.submit_book(
  (select gid from ctx_e), 'Libro E', 'eeeeeeee-0000-0000-0000-000000000005/e.pdf') as id;
grant all on s1 to public;
select pg_temp.as_service();
create temp table f1 as select public.finalize_submission((select id from s1), repeat('1', 64)) as r;
select is((select (r ->> 'reused')::boolean from f1), false, 'la primera finalización crea el libro');
select is(public.finalize_submission((select id from s1), repeat('1', 64)) ->> 'rejected', 'not_pending',
  'la segunda finalización devuelve not_pending sin lanzar');
select pg_temp.reset_role();
select throws_ok(
  format('insert into public.jobs (book_id, requested_by) values (%L, %L)',
         (select (r ->> 'book_id')::uuid from f1), 'eeeeeeee-0000-0000-0000-000000000005'),
  '23505', null, 'RN-10: la base impide dos jobs activos del mismo usuario');

-- Permisos de finalize_submission.
select pg_temp.as_anon();
select throws_ok(
  format('select public.finalize_submission(%L, repeat(%L, 64))', (select id from s1), 'a'),
  '42501', null, 'anon no puede finalizar');
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select throws_ok(
  format('select public.finalize_submission(%L, repeat(%L, 64))', (select id from s1), 'a'),
  '42501', null, 'authenticated no puede finalizar');

-- Libros de prueba para request_retry (en el grupo G).
select pg_temp.reset_role();
insert into public.books (id, sha256, title, uploaded_by, upload_path, status) values
  ('b0000001-0000-0000-0000-000000000000', repeat('a', 64), 'L1 error', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/a1.pdf', 'error'),
  ('b0000002-0000-0000-0000-000000000000', repeat('b', 64), 'L2 error', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/a2.pdf', 'error'),
  ('b0000005-0000-0000-0000-000000000000', repeat('c', 64), 'L5 listo', 'bbbbbbbb-0000-0000-0000-000000000002', null, 'ready'),
  ('b0000006-0000-0000-0000-000000000000', repeat('d', 64), 'L6 en cola reciente', 'ffffffff-0000-0000-0000-000000000006', 'ffffffff-0000-0000-0000-000000000006/f6.pdf', 'queued'),
  ('b0000007-0000-0000-0000-000000000000', repeat('e', 64), 'L7 en cola vieja', 'dddddddd-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000004/d7.pdf', 'queued'),
  ('b0000008-0000-0000-0000-000000000000', repeat('f', 64), 'L8 procesando', 'bbbbbbbb-0000-0000-0000-000000000002', null, 'processing'),
  ('b0000009-0000-0000-0000-000000000000', repeat('9', 64), 'L9 error', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002/b9.pdf', 'error'),
  ('b0000010-0000-0000-0000-000000000000', repeat('8', 64), 'L10 sin archivo', 'bbbbbbbb-0000-0000-0000-000000000002', null, 'error');
insert into public.group_books (group_id, book_id, added_by)
  select (select gid from ctx), id, uploaded_by from public.books where id::text like 'b00000%';
insert into public.jobs (book_id, requested_by, status, error, created_at, started_at) values
  ('b0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 'error', 'x', now() - interval '1 hour', now() - interval '1 hour'),
  ('b0000002-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 'error', 'x', now() - interval '1 hour', now() - interval '1 hour'),
  ('b0000006-0000-0000-0000-000000000000', 'ffffffff-0000-0000-0000-000000000006', 'queued', null, now() - interval '1 minute', null),
  ('b0000007-0000-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000004', 'queued', null, now() - interval '10 minutes', null),
  ('b0000008-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000002', 'processing', null, now() - interval '3 minutes', now() - interval '2 minutes');

-- Errores de request_retry.
select pg_temp.act_as(null);
select throws_ok($$select public.request_retry('b0000001-0000-0000-0000-000000000000')$$,
  '28000', 'not_authenticated', 'sin sesión no se reintenta');
select pg_temp.act_as('eeeeeeee-0000-0000-0000-000000000005');
select throws_ok($$select public.request_retry('b0000001-0000-0000-0000-000000000000')$$,
  '42501', 'forbidden', 'quien no puede leer el libro no reintenta');
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select throws_ok($$select public.request_retry('b0000001-0000-0000-0000-000000000000')$$,
  '42501', 'forbidden', 'un miembro que no lo subió ni administra no reintenta');
select throws_ok($$select public.request_retry('b0000005-0000-0000-0000-000000000000')$$,
  'P0001', 'not_retryable', 'un libro listo no se reintenta');
select pg_temp.act_as('ffffffff-0000-0000-0000-000000000006');
select throws_ok($$select public.request_retry('b0000006-0000-0000-0000-000000000000')$$,
  'P0001', 'not_retryable', 'un libro en cola con job reciente no se reintenta');
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select throws_ok($$select public.request_retry('b0000010-0000-0000-0000-000000000000')$$,
  'P0002', 'upload_missing', 'sin archivo en Storage no se reintenta');

-- Reintentos válidos.
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
create temp table r1 as select public.request_retry('b0000001-0000-0000-0000-000000000000') as r;
grant all on r1 to public;
select is((select status from public.books where id = 'b0000001-0000-0000-0000-000000000000'), 'queued',
  'quien lo subió reintenta: el libro vuelve a la cola');
select is((select count(*)::int from public.jobs
  where id = (select (r ->> 'job_id')::uuid from r1) and requested_by = 'aaaaaaaa-0000-0000-0000-000000000001' and status = 'queued'),
  1, 'se crea un job nuevo a nombre de quien reintenta');
select pg_temp.act_as('cccccccc-0000-0000-0000-000000000003');
create temp table r2 as select public.request_retry('b0000002-0000-0000-0000-000000000000') as r;
grant all on r2 to public;
select is((select requested_by from public.jobs where id = (select (r ->> 'job_id')::uuid from r2)),
  'cccccccc-0000-0000-0000-000000000003'::uuid, 'una administradora del grupo puede reintentar');
select pg_temp.act_as('dddddddd-0000-0000-0000-000000000004');
create temp table r3 as select public.request_retry('b0000007-0000-0000-0000-000000000000') as r;
grant all on r3 to public;
select isnt((select r ->> 'job_id' from r3), null, 'job perdido (en cola > 5 min sin iniciar) se reintenta');
select is((select count(*)::int from public.jobs
  where book_id = 'b0000007-0000-0000-0000-000000000000' and status in ('queued', 'processing')),
  1, 'el job perdido queda reemplazado: un solo job activo');

-- RN-10: otro job activo del usuario.
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select throws_ok($$select public.request_retry('b0000009-0000-0000-0000-000000000000')$$,
  'P0001', 'busy', 'RN-10: con otro job activo no se reintenta');
select is((select status from public.books where id = 'b0000009-0000-0000-0000-000000000000'), 'error',
  'el rechazo por busy no cambia el libro');

select pg_temp.reset_role();
select * from finish();
rollback;
