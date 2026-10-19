#!/usr/bin/env bash
# RNF-13 c2: restaura un respaldo cifrado en una base local y compara las filas de user_words.
# Uso: BACKUP_PASSPHRASE=... scripts/restaurar-respaldo.sh respaldo-AAAAMMDD.dump.gpg [conteo_esperado]
# Necesita Postgres 17 local (psql, pg_restore, createdb) y gpg. Crea y borra la base «md_restore».
set -euo pipefail
file="${1:?falta el archivo .dump.gpg}"
expected="${2:-}"
: "${BACKUP_PASSPHRASE:?falta BACKUP_PASSPHRASE}"
db=md_restore
tmp="$(mktemp)"
trap 'rm -f "$tmp" "$tmp.log"; dropdb --if-exists "$db" >/dev/null 2>&1 || true' EXIT

gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 --decrypt --output "$tmp" "$file" 3<<<"$BACKUP_PASSPHRASE"
dropdb --if-exists "$db"
createdb "$db"
# Lo mínimo que el esquema public espera de Supabase: el esquema auth con users y las funciones auth.*
psql -q -v ON_ERROR_STOP=1 "$db" <<'SQL'
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin;
exception when duplicate_object then null; end $$;
SQL
# Las filas de auth.users no están en el respaldo de public: se crean las que user_words/profiles referencian.
pg_restore --no-owner --no-privileges --disable-triggers -d "$db" "$tmp" 2>"$tmp.log" || true
count="$(psql -Atq "$db" -c 'select count(*) from public.user_words')"
echo "user_words restauradas: $count"
if [ -n "$expected" ] && [ "$count" != "$expected" ]; then
  echo "ERROR: se esperaban $expected filas" >&2
  exit 1
fi
