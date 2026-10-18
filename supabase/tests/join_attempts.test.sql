-- RNF-17 · Límite de intentos fallidos de join_group. Ejecutar con `supabase test db`
-- o dentro de una transacción con pgTAP; termina siempre con rollback.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('dddddddd-0000-0000-0000-000000000004', 'd@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;
create function pg_temp.reset_role() returns void language plpgsql as $$
begin reset role; end $$;

select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
create temp table ctx as select public.create_group('Curso B1') as gid;
create temp table codes as select invite_code as code from public.groups where id = (select gid from ctx);
grant all on ctx, codes to authenticated;
select isnt((select code from codes), null, 'el grupo de prueba tiene código');

-- B falla: un código inexistente devuelve null (lanzar deshacería el registro del intento).
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select is(public.join_group('ZZZZZZZZ'), null, 'RNF-17: código inexistente devuelve null');
select pg_temp.reset_role();
select is((select count(*)::int from public.join_attempts
  where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 1, 'el intento fallido queda registrado');

-- Nueve fallos más: ya son 10 y B queda bloqueado, incluso con un código válido.
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
do $$ begin
  for i in 1..9 loop perform public.join_group('YYYYYYYY'); end loop;
end $$;
select throws_ok(
  format('select public.join_group(%L)', (select code from codes)),
  'P0001', 'too_many_attempts', '10 fallos en una hora bloquean aunque el código sea válido');

-- Un intento exitoso no cuenta.
select pg_temp.act_as('cccccccc-0000-0000-0000-000000000003');
select lives_ok(format('select public.join_group(%L)', (select code from codes)), 'C se une con un código válido');
select pg_temp.reset_role();
select is((select count(*)::int from public.join_attempts
  where user_id = 'cccccccc-0000-0000-0000-000000000003'), 0, 'los intentos exitosos no cuentan');

-- Los intentos de hace más de una hora ya no bloquean.
insert into public.join_attempts (user_id, attempted_at)
  select 'dddddddd-0000-0000-0000-000000000004', now() - interval '2 hours' from generate_series(1, 12);
select pg_temp.act_as('dddddddd-0000-0000-0000-000000000004');
select lives_ok(format('select public.join_group(%L)', (select code from codes)), 'intentos de hace 2 h no bloquean');

-- Un usuario no ve la tabla de intentos.
select throws_ok($$select * from public.join_attempts$$, '42501', null, 'authenticated no lee join_attempts');

select pg_temp.reset_role();
select * from finish();
rollback;
