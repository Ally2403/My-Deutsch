-- RF-13 · jobs.pages_total: total de páginas para mostrar «Procesando X/Y».
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

select has_column('public', 'jobs', 'pages_total', 'jobs tiene pages_total');

insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
insert into public.books (id, sha256, title)
  values ('dddddddd-0000-0000-0000-000000000001', repeat('a', 64), 'Libro');

select throws_ok(
  $$insert into public.jobs (book_id, pages_total) values ('dddddddd-0000-0000-0000-000000000001', 0)$$,
  '23514', null, 'pages_total = 0 viola el check');
select lives_ok(
  $$insert into public.jobs (book_id, pages_total) values ('dddddddd-0000-0000-0000-000000000001', 10)$$,
  'pages_total = 10 es válido');

select * from finish();
rollback;
