-- RNF-06 · Funciones de disparador y utilidades internas: nadie las llama por la API.
revoke execute on function public.handle_new_user(), public.touch_book_retention(),
  public.rls_auto_enable(), public.gen_invite_code() from public, anon, authenticated;
