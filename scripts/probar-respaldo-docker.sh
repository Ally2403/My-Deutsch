#!/usr/bin/env bash
# RNF-13: prueba de ida y vuelta del respaldo en un Postgres 17 desechable (Docker): migraciones -> datos
# -> pg_dump -> cifrado -> scripts/restaurar-respaldo.sh. Uso (desde la raíz del repo): scripts/probar-respaldo-docker.sh
cd "$(dirname "$0")/.." && inner="$(mktemp)" && sed -n "/^#INNER/,\$p" "$0" | tail -n +2 > "$inner" && MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W 2>/dev/null || pwd):/w" -v "$inner:/rt.sh" postgres:17 bash /rt.sh; exit $?
#INNER
set -euo pipefail
apt-get update -qq >/dev/null && apt-get install -y -qq gnupg >/dev/null
su postgres -c "initdb -D /tmp/pg >/dev/null && pg_ctl -D /tmp/pg -l /tmp/pg.log -w start >/dev/null"
export PGUSER=postgres PGHOST=/var/run/postgresql
createdb src
psql -q -v ON_ERROR_STOP=1 src <<'SQL'
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create role authenticated nologin; create role anon nologin; create role service_role nologin;
create function public.rls_auto_enable() returns void language sql as $$ select $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n,'/') $$;
SQL
for f in /w/supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 src -f "$f" >/dev/null || { echo "MIGRACION FALLO: $f"; exit 1; }; done
psql -q -v ON_ERROR_STOP=1 src <<'SQL'
insert into auth.users (email) select 'u'||g||'@x.co' from generate_series(1,3) g;
insert into public.lexicon (lemma,pos) select 'Wort'||g,'noun' from generate_series(1,50) g;
insert into public.user_words (user_id, lexicon_id) select u.id, l.id from auth.users u cross join public.lexicon l;
SQL
pg_dump src --schema=public --format=custom --no-owner --no-privileges --file=/tmp/respaldo.dump
pg_restore --list /tmp/respaldo.dump | grep -q "TABLE DATA public user_words" && echo "toc ok"
echo "frase de prueba" > /tmp/pass
gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 --output /tmp/respaldo-x.dump.gpg /tmp/respaldo.dump 3<<<"frase de prueba"
BACKUP_PASSPHRASE="frase de prueba" bash /w/scripts/restaurar-respaldo.sh /tmp/respaldo-x.dump.gpg 150
echo "--- esperando fallo con conteo erroneo"
BACKUP_PASSPHRASE="frase de prueba" bash /w/scripts/restaurar-respaldo.sh /tmp/respaldo-x.dump.gpg 999 || echo "falla como se espera"
echo "--- frase incorrecta"
BACKUP_PASSPHRASE="otra" bash /w/scripts/restaurar-respaldo.sh /tmp/respaldo-x.dump.gpg 2>&1 | tail -2 || echo "no abre sin la frase"
