# Respaldo y restauración (RNF-13)

## Qué se respalda
El esquema `public` de Supabase (perfiles, grupos, libros, diccionario personal, progreso, anotaciones, etc.), cada domingo a las 06:17 UTC, con el workflow `respaldo.yml`. Se cifra con GPG (AES-256) y queda como artefacto privado de Actions, **30 días**. Los archivos de Storage (imágenes de páginas) no entran: se regeneran reprocesando el libro.

## Configuración (una vez, la hace la usuaria)
1. Supabase → *Connect* → **Session pooler** → copia la cadena (IPv4) y guárdala como secreto `SUPABASE_DB_URL` del repositorio.
2. Inventa una frase larga y guárdala como secreto `BACKUP_PASSPHRASE` **y** en tu gestor de contraseñas: sin ella no se puede abrir ningún respaldo.
3. Actions → *respaldo* → *Run workflow* para probar la primera vez.

## Restaurar
1. Descarga el artefacto desde Actions (`respaldo-AAAAMMDD`) y descomprime el `.dump.gpg`.
2. Con Postgres 17 local: `BACKUP_PASSPHRASE=... scripts/restaurar-respaldo.sh respaldo-AAAAMMDD.dump.gpg [filas_esperadas]`.
   El script crea una base temporal, restaura y cuenta `user_words`; con el segundo argumento falla si no coincide (RNF-13 c2).
3. Para restaurar de verdad en Supabase, usa `pg_restore --no-owner -d "$SUPABASE_DB_URL"` sobre una base vacía y revisa antes las políticas RLS (`supabase/tests/rls.test.sql`).
