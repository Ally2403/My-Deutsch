-- RNF-06 · Aislamiento de datos (RLS) y reglas de grupo/libro. Ejecutar con `supabase test db`
-- o dentro de una transacción con pgTAP; termina siempre con rollback.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

-- Usuarios: A (admin), B (miembro), C (ajeno), D (para el grupo lleno).
insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

select is((select count(*)::int from public.profiles where id::text like '%-0000-0000-0000-00000000000_'), 3,
  'el disparador crea un perfil por usuario');

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;
create function pg_temp.reset_role() returns void language plpgsql as $$
begin reset role; end $$;

-- A crea un grupo; B se une con el código (RF-06, RF-07).
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
create temp table ctx as select public.create_group('Curso B1') as gid;
grant all on ctx to authenticated;
select is((select count(*)::int from public.group_members where role = 'admin'), 1, 'quien crea el grupo es su administrador');
select matches((select invite_code from public.groups limit 1), '^[A-HJ-NP-Z2-9]{8}$', 'código de 8 caracteres sin 0/O/1/I');

create temp table codes as select invite_code as code from public.groups limit 1;
grant all on codes to authenticated;

select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select lives_ok(format('select public.join_group(%L)', (select code from codes)), 'B se une con un código válido');
select lives_ok(format('select public.join_group(%L)', (select code from codes)), 'unirse dos veces no falla ni duplica');
select is((select count(*)::int from public.group_members), 2, 'sin membresía duplicada');
select is(public.join_group('ZZZZZZZZ'), null, 'código inexistente devuelve null (RNF-17)');

-- Libro subido por A: el servidor calcula la huella (RN-02) y solo se procesa uno a la vez (RN-10).
select pg_temp.reset_role();
insert into storage.objects (bucket_id, name, owner) values
  ('uploads', 'aaaaaaaa-0000-0000-0000-000000000001/x.pdf', null),
  ('uploads', 'aaaaaaaa-0000-0000-0000-000000000001/y.pdf', null),
  ('uploads', 'bbbbbbbb-0000-0000-0000-000000000002/x.pdf', null);
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
create temp table pend as select public.submit_book(
  (select gid from ctx), 'Libro', 'aaaaaaaa-0000-0000-0000-000000000001/x.pdf') as id;
grant all on pend to authenticated, service_role;
select throws_ok(
  format('select public.submit_book(%L, %L, %L)', (select gid from ctx), 'Otro',
         'aaaaaaaa-0000-0000-0000-000000000001/y.pdf'),
  'P0001', 'busy', 'RN-10: segunda solicitud mientras hay una pendiente');
select throws_ok(
  format('select public.submit_book(%L, %L, %L)', (select gid from ctx), 'X',
         'bbbbbbbb-0000-0000-0000-000000000002/x.pdf'),
  '42501', 'forbidden', 'la ruta de subida debe ser del propio usuario');
select pg_temp.reset_role();
set local role service_role;
create temp table sub as select public.finalize_submission((select id from pend), repeat('a', 64)) as r;
reset role;
grant all on sub to authenticated;
select is((select (r ->> 'reused')::boolean from sub), false, 'primer envío crea el libro');

select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
create temp table pend_b as select public.submit_book(
  (select gid from ctx), 'Libro', 'bbbbbbbb-0000-0000-0000-000000000002/x.pdf') as id;
grant all on pend_b to service_role;
select pg_temp.reset_role();
set local role service_role;
select is((public.finalize_submission((select id from pend_b), repeat('a', 64)) ->> 'reused')::boolean,
  true, 'RN-02: misma huella reutiliza el libro');
reset role;

-- Datos personales de A (RN-04).
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.reset_role();
insert into public.lexicon (lemma, pos, genders) values ('Haus', 'noun', '{n}');
insert into public.pages (book_id, number, width, height, image_path, tokens_path)
  select (r ->> 'book_id')::uuid, 1, 1600, 2263, 'x/1.webp', 'x/1.json' from sub;
insert into storage.objects (bucket_id, name, owner)
  select 'pages', (r ->> 'book_id') || '/1.webp', null from sub;
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.user_words (user_id, lexicon_id) select 'aaaaaaaa-0000-0000-0000-000000000001', id from public.lexicon;
insert into public.reading_progress (user_id, book_id, last_page)
  select 'aaaaaaaa-0000-0000-0000-000000000001', (r ->> 'book_id')::uuid, 3 from sub;
insert into public.annotations (user_id, book_id, page, x, y, text)
  select 'aaaaaaaa-0000-0000-0000-000000000001', (r ->> 'book_id')::uuid, 1, 0.1, 0.2, 'respuesta' from sub;

select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.user_words), 0, 'B no ve el diccionario de A');
select is((select count(*)::int from public.reading_progress), 0, 'B no ve el progreso de A');
select is((select count(*)::int from public.annotations), 0, 'B no ve las anotaciones de A');
select is((select count(*)::int from public.pages), 1, 'B (miembro) sí ve las páginas del libro');

-- Ajeno: no ve libros, páginas ni archivos (RN-03).
select pg_temp.act_as('cccccccc-0000-0000-0000-000000000003');
select is((select count(*)::int from public.books), 0, 'C no ve libros');
select is((select count(*)::int from public.pages), 0, 'C no ve páginas');
select is((select count(*)::int from storage.objects where bucket_id = 'pages'), 0, 'C no ve archivos del libro en Storage');
select throws_ok($$insert into public.books (sha256, title) values (repeat('d', 64), 'x')$$, '42501', null, 'nadie crea libros directamente');
select throws_ok($$insert into public.groups (name, invite_code) values ('x', 'AAAAAAAA')$$, '42501', null, 'nadie crea grupos directamente');

-- Miembro sí lee archivos; anónimo nada.
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from storage.objects where bucket_id = 'pages'), 1, 'B (miembro) sí lee los archivos');
select pg_temp.reset_role();
set local role anon;
select throws_ok($$select * from public.books$$, '42501', null, 'anónimo sin acceso a libros');

select * from finish();
rollback;
