-- RF-48 · card_state y review_log: aislamiento, anon, idempotencia por id y borrado en cascada.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
insert into public.lexicon (lemma, pos, genders) values ('zzz_prueba_repaso', 'verb', '{}');
create temp table lx as select id from public.lexicon where lemma = 'zzz_prueba_repaso';
grant all on lx to authenticated;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.card_state (user_id, lexicon_id, due, state)
  values ('aaaaaaaa-0000-0000-0000-000000000001', (select id from lx), now(), 0);
insert into public.review_log (id, user_id, lexicon_id, rating, reviewed_at, state_before)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', (select id from lx), 3, now(), 0);
insert into public.review_log (id, user_id, lexicon_id, rating, reviewed_at, state_before)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', (select id from lx), 3, now(), 0)
  on conflict (id) do nothing;
select is((select count(*)::int from public.review_log), 1, 'reenviar la misma reseña no duplica');
select throws_ok($$insert into public.review_log (id, user_id, lexicon_id, rating, reviewed_at, state_before)
  values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', (select id from lx), 5, now(), 0)$$,
  '23514', null, 'la calificación va de 1 a 4');
select throws_ok($$insert into public.card_state (user_id, lexicon_id, due, state)
  values ('bbbbbbbb-0000-0000-0000-000000000002', (select id from lx), now(), 0)$$,
  '42501', null, 'A no escribe tarjetas de B');

select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.card_state), 0, 'B no ve las tarjetas de A');
select is((select count(*)::int from public.review_log), 0, 'B no ve el historial de A');
with u as (update public.card_state set reps = 9 returning 1)
select is((select count(*)::int from u), 0, 'B no modifica tarjetas de A');

reset role;
set local role anon;
select throws_ok($$select count(*) from public.card_state$$, '42501', null, 'anon no lee tarjetas');
select throws_ok($$select count(*) from public.review_log$$, '42501', null, 'anon no lee el historial');

reset role;
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select count(*)::int from public.card_state) + (select count(*)::int from public.review_log), 0, 'borrar la cuenta borra sus filas');

select * from finish();
rollback;
