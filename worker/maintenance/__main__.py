"""Mantenimiento diario (Actions): limpieza RN-11 y actividad que evita la pausa del plan gratuito.

Uso: python -m maintenance        (necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)
Los registros llevan solo identificadores de libro y conteos: el repositorio es público.
"""

import os
import sys

from publish.client import Supabase, SupabaseError


def purge_expired(client: Supabase) -> tuple[int, int]:
    """Libros vencidos (sin grupo hace > 7 días): fila primero, archivos después. Devuelve
    (libros eliminados, archivos eliminados). Un fallo en un libro no detiene a los demás."""
    books = files = 0
    for book_id in client.expired_book_ids():
        try:
            if not client.delete_expired_book(book_id):
                continue  # se volvió a vincular a un grupo: no se toca
            books += 1
            files += client.delete_book_files(book_id)
        except SupabaseError as exc:
            print(f"purge {book_id}: {exc}", file=sys.stderr)
    return books, files


def main() -> int:
    missing = [k for k in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not os.environ.get(k)]
    if missing:
        print(f"Faltan variables: {', '.join(missing)}", file=sys.stderr)
        return 2
    client = Supabase(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    books, files = purge_expired(client)
    print(f"Limpieza RN-11: {books} libros y {files} archivos eliminados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
