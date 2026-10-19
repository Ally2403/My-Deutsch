-- RF-27 · record_lookup: crea, incrementa sin duplicar, aísla por usuario y exige sesión.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
insert into public.lexicon (lemma, pos, genders) values ('gehen', 'verb', '{}');
create temp table lx as select id from public.lexicon where lemma = 'gehen';
grant all on lx to authenticated;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select lives_ok($$select public.record_lookup((select id from lx), null, 3, 'Er geht nach Hause.')$$, 'primera consulta');
select is((select lookups from public.user_words), 1, 'contador 1 y estado «seen»');
select is((select status from public.user_words), 'seen', 'estado inicial: vista');
select public.record_lookup((select id from lx), null, 9, 'Otra oración.');
select is((select count(*)::int from public.user_words), 1, 'no crea duplicados (RN-06)');
select is((select lookups from public.user_words), 2, 'la segunda consulta incrementa el contador');
select is((select first_sentence from public.user_words), 'Er geht nach Hause.', 'conserva la primera oración (RN-05)');

select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.user_words), 0, 'B no ve el diccionario de A');

select * from finish();
rollback;
