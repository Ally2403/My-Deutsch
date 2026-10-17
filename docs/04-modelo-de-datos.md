# 04 · Modelo de datos

```mermaid
erDiagram
  profiles ||--o{ group_members : pertenece
  groups ||--o{ group_members : tiene
  groups ||--o{ group_books : contiene
  books ||--o{ group_books : "vinculado a"
  books ||--o{ jobs : "procesado por"
  books ||--o{ pages : tiene
  profiles ||--o{ user_words : guarda
  lexicon ||--o{ user_words : "lema de"
  profiles ||--o{ reading_progress : registra
  books ||--o{ reading_progress : sobre
  profiles ||--o{ annotations : escribe
  pages ||--o{ annotations : sobre

  profiles {
    uuid id PK "= auth.users.id"
    text display_name
    text avatar_url
    text level "A1..C2"
    jsonb prefs "tema, colorear, marcas, fuente"
    timestamptz created_at
  }
  groups {
    uuid id PK
    text name
    text invite_code UK "8 chars, RN-09"
    uuid created_by FK
    timestamptz created_at
  }
  group_members {
    uuid group_id PK,FK
    uuid user_id PK,FK
    text role "admin | member"
    timestamptz joined_at
  }
  books {
    uuid id PK
    text sha256 UK "RN-02"
    text title
    int page_count
    text status "queued|processing|ready|error|deleted"
    real ocr_confidence
    uuid uploaded_by FK
    timestamptz delete_after "RN-11"
  }
  group_books {
    uuid group_id PK,FK
    uuid book_id PK,FK
    uuid added_by FK
    timestamptz added_at
  }
  jobs {
    uuid id PK
    uuid book_id FK
    uuid requested_by FK
    int pages_done
    text status
    text error
    timestamptz started_at
    timestamptz finished_at
  }
  pages {
    uuid book_id PK,FK
    int number PK
    int printed_number "nullable, RF-38"
    int width
    int height
    text image_path "pages/{book}/{n}.webp"
    text tokens_path "pages/{book}/{n}.json"
    real ocr_confidence
  }
  lexicon {
    bigint id PK
    text lemma
    text pos "noun|verb|adj|adv|..."
    text[] genders "m|f|n"
    text plural
    jsonb senses "[{es, en, machine}] max 5"
    text source "wiktionary rev"
  }
  user_words {
    uuid user_id PK,FK
    bigint lexicon_id PK,FK
    text status "seen | known"
    int lookups
    uuid first_book_id FK "nullable (RN-11)"
    int first_page
    text first_sentence
    timestamptz first_seen_at
    timestamptz last_seen_at
  }
  reading_progress {
    uuid user_id PK,FK
    uuid book_id PK,FK
    int last_page
    int[] pages_read "RN-14"
    timestamptz updated_at
  }
  annotations {
    uuid id PK
    uuid user_id FK
    uuid book_id FK
    int page
    real x "0..1"
    real y "0..1"
    real w
    text text
    text kind "free | field"
    timestamptz updated_at
  }
```

## Archivo de tokens por página (`pages/{book}/{n}.json`)

No se guarda en Postgres: se sirve desde Storage como archivo estático (rápido y con caché), lo que mantiene la base de datos pequeña.

```json
{
  "v": 1,
  "size": [1600, 2263],
  "lines": [[0, 12], [13, 25]],
  "paragraphs": [[0, 25]],
  "images": [[0.08, 0.55, 0.84, 0.30]],
  "fields": [[0.12, 0.71, 0.30, 0.02]],
  "tokens": [
    { "t": "Häuser", "b": [0.112, 0.081, 0.064, 0.018], "l": 431, "c": 0.97 },
    { "t": "ging",   "b": [0.30, 0.12, 0.04, 0.018],  "l": 902, "f": "pret" },
    { "t": "Normalerweise", "b": [0.80, 0.30, 0.12, 0.018], "b2": [0.10, 0.32, 0.03, 0.018], "l": 1205 }
  ],
  "lex": {
    "431": { "lemma": "Haus", "pos": "noun", "g": ["n"], "pl": "Häuser",
             "senses": [{ "es": "casa", "m": false }, { "es": "edificio", "m": false }] },
    "902": { "lemma": "anrufen", "pos": "verb", "senses": [{ "es": "llamar (por teléfono)", "m": false }] }
  }
}
```
`b` = caja relativa [x, y, ancho, alto] (0–1) · `l` = id de léxico · `c` = confianza del OCR · `sep` = índice del token pareja de un verbo separable · `b2` = caja de la segunda parte de una palabra cortada con guion al final de línea (RF-39) · `m` = traducción automática · `f` = forma del token respecto a su lema (`pret` pretérito, `part` participio, `pres` presente, `pl` plural, `comp` comparativo, `sup` superlativo; RF-21).

`lines` y `paragraphs` son rangos `[primer, último]` de índices de `tokens`, **ambos inclusivos**. `lib/domain/page.ts` (`parsePage`) valida el archivo: `v` igual a 1, cajas entre 0 y 1, cada `l` presente en `lex`, `sep` dentro de los tokens, `f` conocida y máximo 5 acepciones por entrada (RN-12).

`number` es el índice de la página lógica (una hoja doble del PDF produce dos, RF-38) y `printed_number` el número impreso en el pie, si se detecta.

## Políticas RLS (resumen)
- `profiles`: cada usuario lee y edita la suya; los miembros de un grupo en común pueden leer `display_name` y `avatar_url`.
- `groups`, `group_members`, `group_books`: lectura para miembros; escritura de administración solo para `role = 'admin'` (las funciones `join_group(code)` y `leave_group(id)` son `security definer` y aplican RN-08 y RN-09).
- `books`, `pages`, `jobs`: lectura si existe una fila en `group_books` de un grupo del usuario; escritura solo con el service role (worker).
- `lexicon`: lectura para cualquier usuario autenticado; escritura solo con el service role.
- `user_words`, `reading_progress`, `annotations`: `user_id = auth.uid()` para todas las operaciones (RN-04).
- Storage `pages/`: lectura con la misma condición que `books`; `uploads/`: cada usuario escribe solo en `uploads/{auth.uid()}/`.
