# Worker de procesamiento (entrega 1: local) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un worker en Python que convierte un PDF escaneado en páginas listas para el lector (imagen WebP + JSON de tokens v1 con lema, tipo, género, significados y verbos separables), reanudable por página, ejecutado en local sobre `samples/Der Schatz-3-7.pdf`, y verlo en el lector con páginas reales.

**Architecture:** Dos paquetes en `worker/` (como indica `docs/03`): `lexicon/` construye una vez un SQLite compacto desde el volcado de kaikki.org (formas → lema y entradas con género, plural y acepciones) y lo consulta; `pipeline/` hace PDF → páginas lógicas → OCR → tokens → análisis → JSON/WebP. El código probado del spike (`pages`, `hyphen`, resolución de lemas) se copia al paquete nuevo; `worker/spike/` queda congelado como registro del experimento.

**Tech Stack:** Python 3.12 con `uv`, PyMuPDF, Tesseract `deu` (en Docker, imagen `mydeutsch-spike`), spaCy `de_core_news_md`, Pillow (WebP), Argos Translate en→es, SQLite (stdlib), pytest, ruff.

**Spec:** diseño aprobado en la conversación del 2026-10-17; `docs/requisitos/funcionales/RF-12`, `RF-38`, `RF-39`, `RF-23`, `RF-24`; `RNF-03`, `RNF-04`; `docs/decisiones/ADR-002`, `ADR-003`, `ADR-005`; formato de página en `docs/04-modelo-de-datos.md`; resultados en `docs/spike-fase-2.md`.

## Global Constraints

- Documentación y mensajes en español; identificadores y código en inglés. Commits `RF-12: ...` en la rama `feat/RF-12-worker-pipeline`; **sin** `Co-Authored-By` ni "Generated with" (CLAUDE.md regla 6).
- Repositorio público: **nunca** versionar PDF, imágenes de páginas, texto OCR ni JSON de páginas de libros. `samples/`, `worker/.local/` y `worker/**/data/` están ignorados. Los datos de prueba versionados son texto sintético propio.
- ADR-002: el worker **no escribe en logs** texto OCR, palabras ni imágenes; solo identificadores, números de página, tiempos y métricas agregadas.
- Imágenes WebP de **1 600 px de ancho y ≤ 250 KB** por página. Coordenadas relativas 0–1 con 4 decimales.
- OCR: Tesseract `--oem 1 --psm 3`, 300 DPI, escala de grises, sin preprocesamiento (ADR-005).
- Orden de resolución de lemas (ADR-003): tabla de formas → lema de spaCy con tipo → reglas de respaldo (compuestos, participio-adjetivo, zu-infinitivo) → la propia forma. Se excluyen las entradas `alt-of`.
- Significado en español: traducción española de Wiktionary si existe; si no, Argos en→es con `m: true`. Máximo 5 acepciones (RN-12).
- Tipos de palabra del JSON: `noun, propn, verb, adj, adv, prep, pron, det, conj, num, part, intj`. Géneros `m|f|n`; solo plural = `g: []`. Etiquetas de forma `f`: `pret, part, pres, pl, comp, sup`.
- Python con tipado, `ruff` (line-length 100) y `pytest` limpios. Los tests que necesitan Tesseract o spaCy llevan la marca `slow`.

## Review Focus

- Hoja sin texto (solo ilustración o en blanco): produce una página con `tokens: []` válida, sin error.
- Palabra con guion al final de la **última** línea de la página (sin línea siguiente): se conserva tal cual, no se pierde ni falla.
- Falla a mitad del libro (excepción en la página N): al reintentar continúa en N y las anteriores no se vuelven a procesar.
- Los registros de log no contienen texto de las páginas (prueba que captura el log).
- Una página cuyo WebP no baja de 250 KB con calidad mínima: se reduce la calidad hasta cumplir o falla con mensaje claro, nunca escribe una imagen mayor.
- Palabras sin entrada en el léxico (nombres, errores del OCR): el token queda sin `l` y la página sigue siendo válida.

---

### Task 1: Proyecto del worker y módulos reutilizados

**Files:**

- Create: `worker/pyproject.toml`, `worker/pipeline/__init__.py`, `worker/lexicon/__init__.py`, `worker/pipeline/pages.py`, `worker/pipeline/hyphen.py`, `worker/tests/test_pages.py`, `worker/tests/test_hyphen.py`, `worker/README.md`
- Modify: `.gitignore` (añadir `worker/.local/`)

**Interfaces:**

- Produces: `pipeline.pages.{find_spine, split_spread, infer_printed_numbers, downscale, footer_band}` y `pipeline.hyphen.{Token, join_hyphenated}` con las mismas firmas que en `worker/spike/spike/`.

- [ ] **Step 1: Copiar** `pages.py`, `hyphen.py` y sus tests desde `worker/spike` (ajustando imports `spike.` → `pipeline.`) y crear `pyproject.toml` (dependencias del spike + `pillow`, grupo `dev` con pytest y ruff, `pythonpath = ["."]`, marca `slow`).
- [ ] **Step 2: Run** `./worker/run.sh uv run pytest` (nuevo `run.sh` copiado de `worker/spike/run.sh` apuntando a `/repo/worker`). Expected: los tests copiados PASS.
- [ ] **Step 3: Commit** `RF-12: proyecto del worker con módulos de páginas y guiones del spike`.

### Task 2: Constructor del léxico (SQLite)

**Files:**

- Create: `worker/lexicon/build.py`, `worker/lexicon/store.py`, `worker/tests/test_lexicon_build.py`, `worker/tests/fixtures/kaikki_mini.jsonl` (≈ 12 entradas **inventadas** en el formato de kaikki: sustantivo con género y plural, solo plural, verbo con formas, entrada `form-of`, entrada `alt-of`, nombre propio, adjetivo, con y sin traducción `es`)

**Interfaces:**

- Produces:

  ```python
  # build.py
  def build_lexicon(dump: Path, out: Path) -> None  # SQLite: forms(form, lemma, pos), entries(lemma, pos, genders, plural, glosses_en, glosses_es)
  # store.py
  @dataclass(frozen=True)
  class Entry: lemma: str; pos: str; genders: list[str]; plural: str | None; glosses_en: list[str]; glosses_es: list[str]
  class Lexicon:
      def __init__(self, path: Path): ...
      def lookup_form(self, form: str) -> set[tuple[str, str]]   # {(lema, tipo)}
      def is_lemma(self, word: str) -> bool
      def entry(self, lemma: str, pos: str) -> Entry | None
  ```

  Reglas: tipos de kaikki → tipos del JSON (`name` → `propn`, etc.); géneros desde las etiquetas `masculine|feminine|neuter`; solo plural (`plural-only` o sin género) → `[]`; plural desde la forma con etiqueta `plural` y `nominative`; hasta 5 glosas.

- [ ] **Step 1: Failing tests** `test_lexicon_build.py`: construye con la fixture y comprueba `lookup_form("Häuser") == {("Haus","noun")}`; `entry("Haus","noun").genders == ["n"]` y `plural == "Häuser"`; la solo plural tiene `genders == []`; una entrada `alt-of` no aparece en `lookup_form`; una entrada `form-of` aporta su forma al lema de origen y no crea entrada propia; máximo 5 glosas; `is_lemma("Haus")` y `not is_lemma("Häuser")`.
- [ ] **Step 2: Run** `./worker/run.sh uv run pytest worker/tests/test_lexicon_build.py` → FAIL (módulos inexistentes).
- [ ] **Step 3: Implement** `build_lexicon` en una pasada de streaming sobre el `.jsonl.gz`/`.jsonl` (misma lógica de exclusión que `spike/lexicon.py::FormIndex.from_kaikki`) e insertar por lotes; `Lexicon` con consultas parametrizadas y caché LRU de `lookup_form`.
- [ ] **Step 4: Run** los tests → PASS.
- [ ] **Step 5: Commit** `RF-12: constructor del léxico en SQLite (formas, géneros, plural, acepciones)`.

### Task 3: Resolución de lemas sobre el léxico

**Files:**

- Create: `worker/lexicon/resolve.py`, `worker/tests/test_resolve.py`
- Copy: casos de `worker/spike/tests/test_lexicon.py` (con la fixture de Task 2 ampliada si hace falta)

**Interfaces:**

- Consumes: `Lexicon` (Task 2).
- Produces: `resolve(text: str, spacy_pos: str, spacy_lemma: str, lex: Lexicon) -> tuple[str, str | None]` → `(lema, tipo)` donde `tipo` es `None` si el lema es la propia forma sin entrada. Misma lógica y orden que `spike/lexicon.py::resolve`; devuelve además el tipo elegido.

- [ ] **Step 1: Failing tests**: «Häuser»/NOUN → `("Haus","noun")`; «ging»/VERB → `("gehen","verb")`; «Kunstschätze» → `("Kunstschatz","noun")` por compuesto; «abgestimmter» ADJ → `abgestimmt`; zu-infinitivo «herumzustänkern» → `herumstänkern`; forma desconocida → `(forma, None)`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** adaptando `_from_table`, `_compound` y respaldos a las consultas de `Lexicon`. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `RF-23: resolución de lemas sobre el léxico SQLite`.

### Task 4: Significados en español (Argos)

**Files:**

- Create: `worker/lexicon/translate.py`, `worker/tests/test_translate.py`

**Interfaces:**

- Produces:

  ```python
  class Translator(Protocol): def translate(self, text: str) -> str
  class ArgosTranslator:  # instala el modelo en→es la primera vez; offline después
  def senses_for(entry: Entry, translator: Translator) -> list[dict]  # [{"es": str, "m": bool}], máx. 5
  ```

  `senses_for` usa `glosses_es` (`m: False`) y completa con glosas inglesas traducidas (`m: True`) hasta 5, sin duplicados.

- [ ] **Step 1: Failing tests** con un `FakeTranslator`: usa solo las traducciones de Wiktionary si hay ≥ 5; completa con traducidas marcadas `m: True`; elimina duplicados sin distinguir mayúsculas; nunca más de 5; una glosa vacía se omite; un traductor que lanza excepción deja la acepción fuera sin romper.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `senses_for` y `ArgosTranslator` (`argostranslate`, añadido a las dependencias). **Step 4: Run** → PASS (el test real de Argos va con marca `slow`: «house» → contiene «casa»).
- [ ] **Step 5: Commit** `RF-21: acepciones en español con traducción automática marcada`.

### Task 5: Geometría del OCR, ruido y tokens

**Files:**

- Create: `worker/pipeline/ocr.py`, `worker/pipeline/geometry.py`, `worker/pipeline/noise.py`, `worker/tests/test_geometry.py`, `worker/tests/test_noise.py`

**Interfaces:**

- Produces:

  ```python
  # ocr.py (de run_ocr.py del spike)
  def tesseract(png: bytes, *args: str) -> str
  def osd_rotation(png: bytes) -> int
  def to_png(gray: np.ndarray) -> bytes
  def ocr_words(png: bytes, psm: str = "3") -> list[dict]
  # geometry.py
  @dataclass class Word: text: str; box: tuple[float, float, float, float]; conf: float; line: int; par: int
  def words_from_rows(rows: list[dict], width: int, height: int) -> list[Word]   # cajas relativas 0–1, 4 decimales, recortadas al rango
  @dataclass class RawToken: text: str; box: Box; box2: Box | None; conf: float; line: int; par: int
  def build_tokens(words: list[Word], known: Callable[[str], bool]) -> list[RawToken]  # une guiones con hyphen.join_hyphenated; box2 = caja de la 2.ª parte
  # noise.py
  def drop_noise(words: list[Word]) -> list[Word]
  ```

  Reglas de `drop_noise` (hallazgos 2 y 3 del spike): fuera las palabras sin ninguna letra ni dígito; fuera las de solo puntos/guiones; fuera las que están en el 5 % exterior del ancho y tienen `conf < 60` o ≤ 3 caracteres.

- [ ] **Step 1: Failing tests** (sin Tesseract, con filas TSV sintéticas): `words_from_rows` convierte píxeles a relativos y recorta `1.02 → 1.0`; `build_tokens` une «Substan-» + «tiv» en un token con `box2`; **guion en la última línea sin siguiente** se conserva como token único; `drop_noise` quita «.........», «=», «ı8» a 2 % del borde y conserva «Haus» y el número de ejercicio «3» en el centro.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `RF-12, RF-39: OCR a tokens con cajas relativas, guiones y filtro de ruido`.

### Task 6: Análisis (tipo, lema, forma, verbos separables)

**Files:**

- Create: `worker/pipeline/analyze.py`, `worker/tests/test_analyze.py`

**Interfaces:**

- Consumes: `RawToken` (Task 5), `Lexicon`, `resolve` (Task 3).
- Produces:

  ```python
  @dataclass class Analyzed: lemma: str | None; pos: str | None; form: str | None; sep: int | None
  def form_tag(morph: dict[str, str], pos: str, text: str, lemma: str) -> str | None   # pret|part|pres|pl|comp|sup
  def analyze(tokens: list[RawToken], nlp, lex: Lexicon) -> list[Analyzed]
  ```

  `analyze` construye un `Doc` de spaCy con una palabra por token (puntuación exterior retirada) para conservar el alineamiento, ejecuta el resto de componentes, resuelve el lema con `resolve`, calcula `form_tag` desde la morfología y detecta verbos separables con la relación `svp` (`sep` = índice del token pareja, simétrico; el lema es prefijo + verbo si existe en el léxico, p. ej. `anrufen`).

- [ ] **Step 1: Failing tests**: `form_tag({"Tense":"Past","VerbForm":"Fin"}, "VERB", "ging", "gehen") == "pret"`; participio → `part`; `{"Number":"Plur"}` en sustantivo con forma distinta del lema → `pl`; forma igual al lema → `None`; `Degree=Cmp` → `comp`. Prueba `slow` con spaCy real: «Er ruft sie morgen an.» → `ruft` y `an.` con `sep` mutuo y lema `anrufen`; «Normalerweise» sin falla; la puntuación pegada («Haus.») no cambia el lema.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `RF-12, RF-24: análisis morfológico, formas y verbos separables`.

### Task 7: Ensamblado del JSON de página y validación

**Files:**

- Create: `worker/pipeline/page_json.py`, `worker/pipeline/image.py`, `worker/tests/test_page_json.py`, `worker/tests/test_image.py`

**Interfaces:**

- Consumes: `RawToken`, `Analyzed`, `Entry`, `senses_for`.
- Produces:

  ```python
  class LexRegistry:  # ids de léxico estables dentro del libro
      def id_for(self, lemma: str, pos: str) -> int
  def build_page(size: tuple[int, int], tokens: list[RawToken], analyzed: list[Analyzed],
                 lex: Lexicon, translator: Translator, registry: LexRegistry) -> dict   # JSON v1
  def validate_page(page: dict) -> None   # mismas reglas que parsePage (lib/domain/page.ts); lanza ValueError
  def render_webp(gray: np.ndarray, width: int = 1600, max_bytes: int = 250 * 1024) -> bytes
  ```

  `lines`/`paragraphs` son rangos **inclusivos** de índices de tokens (a partir de `line` y `par` de cada token). Las entradas de `lex` solo incluyen los ids usados en esa página. Una página sin tokens es válida. `render_webp` baja la calidad de 80 a 40 hasta cumplir `max_bytes`; si no se logra, lanza `ValueError` con el tamaño obtenido.

- [ ] **Step 1: Failing tests**: página con «Häuser» devuelve `lex[str(id)]` con `lemma "Haus"`, `g ["n"]`, `pl "Häuser"` y ≤ 5 acepciones; token sin entrada queda sin `l`; `lines` inclusivos y dentro del número de tokens; `validate_page` rechaza una caja `1.2`, un `l` ausente de `lex`, 6 acepciones y `v != 1`; `render_webp` de una imagen de ruido grande respeta ≤ 250 KB o lanza el error indicado; 1 600 px de ancho.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `RF-12: ensamblado del JSON de página v1, validación y WebP ≤ 250 KB`.

### Task 8: Orquestación reanudable y línea de comandos

**Files:**

- Create: `worker/pipeline/run.py`, `worker/tests/test_run.py`

**Interfaces:**

- Consumes: todo lo anterior.
- Produces:

  ```python
  def process_pdf(pdf: Path, out: Path, *, lex: Lexicon, nlp, translator: Translator,
                  ocr: Callable[[bytes], list[dict]] = ..., log: logging.Logger = ...) -> dict  # resumen: páginas, confianza media, segundos
  # CLI: python -m pipeline.run libro.pdf --out .local/book --lexicon .local/lexicon.sqlite
  ```

  Escribe `out/pages/{n}.webp`, `out/pages/{n}.json`, `out/manifest.json` (por página: `number`, `printed_number`, `width`, `height`, `ocr_confidence`) y `out/progress.json`. Una página se omite si su JSON ya existe y valida. El parámetro `ocr` se inyecta para poder probar sin Tesseract.

- [ ] **Step 1: Failing tests** (con `ocr` simulado y léxico de la fixture): procesa un PDF sintético de 3 hojas (una doble página → 4 páginas lógicas, una en blanco → `tokens: []`); si `ocr` lanza en la página 3, `process_pdf` falla y las páginas 1–2 quedan escritas; al reintentar **no llama a `ocr` para las páginas 1–2** y completa; **los registros de log no contienen ninguna palabra del texto**; el manifiesto tiene números impresos inferidos con `infer_printed_numbers`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (con `time.perf_counter` para segundos por página; log solo con número de página, conteos y tiempos). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `RF-12: procesamiento reanudable por página con manifiesto y CLI`.

### Task 9: Ejecución real sobre el PDF de prueba y lectura en el lector

**Files:**

- Create: `app/lector/local/page.tsx`, `app/lector/local/local-reader.tsx`, `lib/domain/local-book.test.ts`, `scripts/link-local-book.mjs`
- Modify: `worker/README.md` (cómo reproducir), `docs/requisitos/funcionales/RF-12-*.md`, `docs/requisitos/INDEX.md`, `docs/ESTADO.md`, `.gitignore` (`public/local-book/`)

**Interfaces:**

- Consumes: archivos de `worker/.local/book/pages/` copiados (o enlazados) a `public/local-book/` por `scripts/link-local-book.mjs`.
- Produces: ruta `/lector/local` (solo desarrollo: responde 404 si `NODE_ENV === "production"` o si `public/local-book/manifest.json` no existe) que usa `PageReader` con `total` del manifiesto.

- [ ] **Step 1: Construir el léxico** (una vez): descargar/usar `worker/spike/data/lexicon/de.jsonl.gz` y ejecutar `./worker/run.sh uv run python -m lexicon.build ...` → `worker/.local/lexicon.sqlite`. Registrar tamaño y tiempo.
- [ ] **Step 2: Procesar** `samples/Der Schatz-3-7.pdf` con la CLI. Expected: 10 páginas, todas con JSON válido; registrar segundos por página y confianza media.
- [ ] **Step 3: Failing test** `local-book.test.ts` (Vitest, entorno node): si existe `public/local-book/`, cada `pages/{n}.json` pasa `parsePage` (se omite si no existe).
- [ ] **Step 4: Implement** la ruta local y el script; abrir `/lector/local`, navegar las 10 páginas y capturar pantallas.
- [ ] **Step 5: Medir y reportar** sobre las páginas de referencia: (a) alineación caja/tinta ≤ 2 % del ancho (el e2e de `e2e/lector.spec.ts` adaptado a la ruta local, o script equivalente), (b) % de tokens con letras que obtuvieron lema y entrada, (c) % de sustantivos con género, (d) precisión de palabras contra `worker/spike/data/gt` (RNF-03), (e) lista de palabras sin entrada (solo conteos en el reporte público; la lista concreta queda en local).
- [ ] **Step 6: Actualizar documentación**: estado de RF-12 (criterios 1, 2 y 4 verificados en local; 3 y la publicación a Storage quedan para la entrega 2), `INDEX.md`, `ESTADO.md` con medidas y lo no verificado.
- [ ] **Step 7: Run** `pnpm typecheck && pnpm lint && pnpm test` y `./worker/run.sh uv run pytest && ./worker/run.sh uv run ruff check` → todo verde (skill `verification-before-completion`).
- [ ] **Step 8: Commit** `RF-12: ejecución sobre el PDF de prueba y lector local de páginas reales`.
