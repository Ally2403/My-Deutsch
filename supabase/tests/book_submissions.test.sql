-- RF-11 · Solicitudes de libro pendientes y huella verificada por el servidor (RN-02, RN-10).
-- Ejecutar con `supabase test db` o dentro de una transacción con pgTAP; termina con rollback.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

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

-- Archivos ya subidos a Storage por A, B y C.
insert into storage.objects (bucket_id, name, owner) values
  ('uploads', 'aaaaaaaa-0000-0000-0000-000000000001/a.pdf', null),
  ('uploads', 'bbbbbbbb-0000-0000-0000-000000000002/b.pdf', null),
  ('uploads', 'bbbbbbbb-0000-0000-0000-000000000002/b2.pdf', null),
  ('uploads', 'cccccccc-0000-0000-0000-000000000003/c.pdf', null);

-- A crea un grupo y B se une; C crea el suyo.
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
create temp table ctx as select public.create_group('Curso B1') as gid;
create temp table codes as select invite_code as code from public.groups where id = (select gid from ctx);
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
create temp table ctx_b as select public.create_group('Otro curso') as gid;
select public.join_group((select code from codes));
select pg_temp.act_as('cccccccc-0000-0000-0000-000000000003');
create temp table ctx_c as select public.create_group('Curso C') as gid;
grant all on ctx, codes, ctx_b, ctx_c to public;

-- Rechazos de submit_book.
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select throws_ok(
  format('select public.submit_book(%L, %L, %L)', (select gid from ctx), 'Libro',
         'bbbbbbbb-0000-0000-0000-000000000002/b.pdf'),
  '42501', 'forbidden', 'la ruta de subida debe ser del propio usuario');
select pg_temp.act_as('cccccccc-0000-0000-0000-000000000003');
select throws_ok(
  format('select public.submit_book(%L, %L, %L)', (select gid from ctx), 'Libro',
         'cccccccc-0000-0000-0000-000000000003/c.pdf'),
  '42501', 'forbidden', 'quien no es miembro del grupo no puede subir');
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select throws_ok(
  format('select public.submit_book(%L, %L, %L)', (select gid from ctx), 'Libro',
         'aaaaaaaa-0000-0000-0000-000000000001/no-existe.pdf'),
  'P0002', 'upload_missing', 'el archivo debe existir en Storage');
select throws_ok(
  format('select public.submit_book(%L, %L, %L)', (select gid from ctx), '   ',
         'aaaaaaaa-0000-0000-0000-000000000001/a.pdf'),
  'P0001', 'invalid_title', 'el título no puede estar vacío');

-- Una solicitud válida solo queda pendiente: no crea libros ni vínculos (RN-02).
create temp table s1 as select public.submit_book(
  (select gid from ctx), 'Libro', 'aaaaaaaa-0000-0000-0000-000000000001/a.pdf') as id;
grant all on s1 to public;
select isnt((select id from s1), null, 'submit_book devuelve el id de la solicitud');
select pg_temp.reset_role();
select is((select count(*)::int from public.books) + (select count(*)::int from public.group_books), 0,
  'RN-02: submit_book no crea libros ni vínculos');

-- RN-10: una solicitud pendiente cuenta como libro en proceso.
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select throws_ok(
  format('select public.submit_book(%L, %L, %L)', (select gid from ctx), 'Otro',
         'aaaaaaaa-0000-0000-0000-000000000001/a.pdf'),
  'P0001', 'busy', 'RN-10: segunda solicitud mientras hay una pendiente');

-- Funciones de servidor y tabla: cerradas para usuarios.
select throws_ok(
  format('select public.finalize_submission(%L, repeat(%L, 64))', (select id from s1), 'a'),
  '42501', null, 'un usuario no puede finalizar una solicitud');
select throws_ok(
  format('insert into public.book_submissions (group_id, user_id, title, upload_path) values (%L, %L, %L, %L)',
         (select gid from ctx), 'aaaaaaaa-0000-0000-0000-000000000001', 'X', 'x'),
  '42501', null, 'un usuario no inserta solicitudes directamente');
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.book_submissions), 0, 'otro usuario no ve la solicitud');

-- El servidor verifica la huella y crea el libro (RN-02).
select pg_temp.as_service();
create temp table f1 as select public.finalize_submission((select id from s1), repeat('a', 64)) as r;
select is((select (r ->> 'reused')::boolean from f1), false, 'huella nueva: libro nuevo');
select is((select status from public.books), 'queued', 'el libro nace en cola');
select is((select count(*)::int from public.jobs), 1, 'se crea un job');
select is((select status from public.book_submissions where id = (select id from s1)), 'verified',
  'la solicitud queda verificada');
select throws_ok(
  format('select public.finalize_submission(%L, repeat(%L, 64))', (select id from s1), 'a'),
  'P0001', 'not_pending', 'no se finaliza dos veces');

-- B sube el mismo archivo a otro grupo: se reutiliza el libro, sin job nuevo.
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
create temp table s2 as select public.submit_book(
  (select gid from ctx_b), 'Libro', 'bbbbbbbb-0000-0000-0000-000000000002/b.pdf') as id;
grant all on s2 to public;
select pg_temp.as_service();
create temp table f2 as select public.finalize_submission((select id from s2), repeat('a', 64)) as r;
select is((select (r ->> 'reused')::boolean from f2), true, 'RN-02: misma huella reutiliza el libro');
select is((select count(*)::int from public.jobs), 1, 'no se crea otro job');
select is((select count(*)::int from public.group_books), 2, 'el libro queda en los dos grupos');

-- RN-10 también se comprueba al finalizar.
select pg_temp.act_as('cccccccc-0000-0000-0000-000000000003');
create temp table s3 as select public.submit_book(
  (select gid from ctx_c), 'Otro libro', 'cccccccc-0000-0000-0000-000000000003/c.pdf') as id;
grant all on s3 to public;
select pg_temp.reset_role();
insert into public.books (sha256, title, uploaded_by, status)
  values (repeat('e', 64), 'En proceso', 'cccccccc-0000-0000-0000-000000000003', 'processing');
insert into public.jobs (book_id, requested_by, status)
  select id, 'cccccccc-0000-0000-0000-000000000003', 'processing' from public.books where sha256 = repeat('e', 64);
select pg_temp.as_service();
select is((public.finalize_submission((select id from s3), repeat('c', 64)) ->> 'rejected'), 'busy',
  'RN-10: no se crea un segundo libro en proceso');
select is((select status from public.book_submissions where id = (select id from s3)), 'rejected',
  'la solicitud rechazada queda marcada');

-- reject_submission.
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
create temp table s4 as select public.submit_book(
  (select gid from ctx_b), 'Libro 2', 'bbbbbbbb-0000-0000-0000-000000000002/b2.pdf') as id;
grant all on s4 to public;
select pg_temp.as_service();
select public.reject_submission((select id from s4), 'no_es_pdf');
select is((select status || ':' || error from public.book_submissions where id = (select id from s4)),
  'rejected:no_es_pdf', 'reject_submission guarda el motivo');

select pg_temp.reset_role();
select * from finish();
rollback;
