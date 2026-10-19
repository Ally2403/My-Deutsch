-- RF-27 · RN-05 · RN-06: cada consulta de una palabra crea o actualiza su entrada en el
-- diccionario personal. `security invoker`: la política `user_words_own` (RN-04) sigue mandando.
create or replace function public.record_lookup(
  p_lexicon_id bigint, p_book_id uuid, p_page int, p_sentence text
) returns void
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.user_words (user_id, lexicon_id, first_book_id, first_page, first_sentence)
  values (
    uid, p_lexicon_id,
    case when p_book_id is not null and public.can_read_book(p_book_id) then p_book_id end,
    case when p_page > 0 then p_page end,
    left(p_sentence, 500)
  )
  on conflict (user_id, lexicon_id) do update
    set lookups = public.user_words.lookups + 1, last_seen_at = now();
end $$;

revoke execute on function public.record_lookup(bigint, uuid, int, text) from public, anon;
grant execute on function public.record_lookup(bigint, uuid, int, text) to authenticated;
