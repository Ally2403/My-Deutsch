-- RNF-06 · Esquema base de My-Deutsch (docs/04-modelo-de-datos.md). Toda tabla lleva RLS.

-- ---------------------------------------------------------------- perfiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  level text check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Crea el perfil al registrarse (correo o Google).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- grupos
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.groups enable row level security;

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);
alter table public.group_members enable row level security;

-- ---------------------------------------------------------------- libros
create table public.books (
  id uuid primary key default gen_random_uuid(),
  sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  title text not null check (char_length(title) between 1 and 200),
  page_count int check (page_count > 0),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'ready', 'error', 'deleted')),
  ocr_confidence real,
  uploaded_by uuid references auth.users (id) on delete set null,
  upload_path text,
  created_at timestamptz not null default now(),
  delete_after timestamptz
);
alter table public.books enable row level security;

create table public.group_books (
  group_id uuid not null references public.groups (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (group_id, book_id)
);
create index group_books_book_idx on public.group_books (book_id);
alter table public.group_books enable row level security;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  pages_done int not null default 0,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'ready', 'error')),
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index jobs_book_idx on public.jobs (book_id);
create index jobs_requested_by_idx on public.jobs (requested_by, status);
alter table public.jobs enable row level security;

create table public.pages (
  book_id uuid not null references public.books (id) on delete cascade,
  number int not null check (number > 0),
  printed_number int,
  width int not null,
  height int not null,
  image_path text not null,
  tokens_path text not null,
  ocr_confidence real,
  primary key (book_id, number)
);
alter table public.pages enable row level security;

-- ---------------------------------------------------------------- léxico
create table public.lexicon (
  id bigint generated always as identity primary key,
  lemma text not null,
  pos text not null,
  genders text[] not null default '{}' check (genders <@ array['m', 'f', 'n']),
  plural text,
  senses jsonb not null default '[]'::jsonb,
  source text,
  unique (lemma, pos)
);
alter table public.lexicon enable row level security;

-- ---------------------------------------------------------------- datos personales (RN-04)
create table public.user_words (
  user_id uuid not null references auth.users (id) on delete cascade,
  lexicon_id bigint not null references public.lexicon (id) on delete cascade,
  status text not null default 'seen' check (status in ('seen', 'known')),
  lookups int not null default 1 check (lookups >= 0),
  first_book_id uuid references public.books (id) on delete set null,
  first_page int,
  first_sentence text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, lexicon_id)
);
alter table public.user_words enable row level security;

create table public.reading_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  last_page int not null default 1 check (last_page > 0),
  pages_read int[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
alter table public.reading_progress enable row level security;

create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  page int not null check (page > 0),
  x real not null check (x between 0 and 1),
  y real not null check (y between 0 and 1),
  w real check (w between 0 and 1),
  text text not null check (char_length(text) <= 2000),
  kind text not null default 'free' check (kind in ('free', 'field')),
  updated_at timestamptz not null default now()
);
create index annotations_page_idx on public.annotations (user_id, book_id, page);
alter table public.annotations enable row level security;
