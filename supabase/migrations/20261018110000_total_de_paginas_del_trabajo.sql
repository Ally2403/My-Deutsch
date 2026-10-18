-- RF-13: total de páginas del trabajo para mostrar «Procesando X/Y».
-- El worker lo fija al abrir el PDF (hojas, estimación) y lo corrige al terminar (páginas finales).
alter table public.jobs add column pages_total int check (pages_total > 0);
