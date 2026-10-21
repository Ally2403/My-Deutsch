-- RF-51 · books.pipeline_version: aditiva, por omisión 1, mínimo 1 y sin cambiar la RLS de books.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

select has_column('public', 'books', 'pipeline_version', 'books tiene pipeline_version');
select col_not_null('public', 'books', 'pipeline_version', 'pipeline_version no admite nulos');
select col_default_is('public', 'books', 'pipeline_version', '1', 'por omisión vale 1');

insert into public.books (id, sha256, title)
  values ('dddddddd-0000-0000-0000-000000000002', repeat('b', 64), 'Libro');

select is(
  (select pipeline_version from public.books where id = 'dddddddd-0000-0000-0000-000000000002'),
  1, 'un libro nuevo queda en versión 1');
select lives_ok(
  $$update public.books set pipeline_version = 2 where id = 'dddddddd-0000-0000-0000-000000000002'$$,
  'se puede subir a 2');
select throws_ok(
  $$update public.books set pipeline_version = 0 where id = 'dddddddd-0000-0000-0000-000000000002'$$,
  '23514', null, 'pipeline_version = 0 viola el check');

select * from finish();
rollback;
