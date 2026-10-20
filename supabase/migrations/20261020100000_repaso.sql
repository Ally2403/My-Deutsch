-- RF-48 · RN-04: repaso con tarjetas (FSRS). Migración aditiva: solo tablas nuevas.
create table public.card_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  lexicon_id bigint not null references public.lexicon (id) on delete cascade,
  due timestamptz not null,
  stability real not null default 0,
  difficulty real not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state smallint not null default 0 check (state between 0 and 3),
  last_review timestamptz,
  primary key (user_id, lexicon_id)
);
create index card_state_user_due_idx on public.card_state (user_id, due);
alter table public.card_state enable row level security;

create table public.review_log (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lexicon_id bigint not null references public.lexicon (id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  reviewed_at timestamptz not null,
  state_before smallint not null check (state_before between 0 and 3)
);
create index review_log_user_reviewed_idx on public.review_log (user_id, reviewed_at);
create index review_log_lexicon_idx on public.review_log (lexicon_id);
alter table public.review_log enable row level security;

revoke all on public.card_state, public.review_log from anon, authenticated;
grant select, insert, update, delete on public.card_state, public.review_log to authenticated;

create policy card_state_own on public.card_state for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy review_log_own on public.review_log for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
