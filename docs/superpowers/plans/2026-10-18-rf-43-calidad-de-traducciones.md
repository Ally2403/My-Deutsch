# RF-43 Calidad de las traducciones — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Meta:** Que la primera acepción de cada palabra sea su traducción corriente al español (_die Hilfe → ayuda_) y que las demás vengan de definiciones inglesas limpias, sin fórmulas de definición.

**Arquitectura:** (1) Una sonda alemana (sustantivo con artículo, verbo en «Ich möchte …») se traduce de→es con Opus-MT y su salida se normaliza y valida; da la acepción principal. (2) Las glosas inglesas de Wiktionary se limpian (`glosses.py`), se traducen en→es con Opus-MT (verbos con «I want to …») y dan las acepciones secundarias. (3) Opus-MT se convierte una vez a CTranslate2 int8 desde archivos con revisión y SHA-256 fijados, y se guarda en caché de Actions. Reemplaza a Argos (ADR-007).

**Tecnología:** Python 3.12, CTranslate2 (ya presente por Argos), `transformers` (solo tokenizador en uso; conversión al aprovisionar), `sentencepiece`, `httpx` (ya es dependencia), pytest, ruff.

**Especificación:** [RF-43](../../requisitos/funcionales/RF-43-calidad-de-las-traducciones.md) y la prueba comparativa de la sesión del 2026-10-18 (Argos vs. Opus-MT de→es / en→es sobre 40 palabras; resultados en la Tarea 1, ADR-007).

## Restricciones globales

- Sin red al consultar una palabra (RNF-01): todo se traduce en el worker, nunca en el cliente.
- Costo cero: modelos gratuitos (Opus-MT, CC-BY 4.0) y plan gratuito de Actions; el modelo convertido va en caché.
- Un modelo nuevo se instala solo si la revisión y el SHA-256 de cada archivo coinciden con los fijados en el repositorio; si no, falla cerrado (igual que Argos hoy).
- Las acepciones automáticas siguen marcadas `m: true`; máximo 5 acepciones (`MAX_SENSES`); el JSON de página v1 no cambia.
- Código en inglés, textos y documentación en español; commits pequeños que citan `RF-43`; **sin `Co-Authored-By` ni mención a Claude** (CLAUDE.md).
- No cambiar una decisión de un ADR sin un ADR nuevo (ADR-007 reemplaza la parte de traducción de ADR-003).
- Tests: `./worker/run.sh uv run pytest` (Docker) y `./worker/run.sh uv run ruff check`. Los tests con modelos reales llevan `@pytest.mark.slow`.

## Enfoque de revisión

- El traductor devuelve vacío, basura o lanza excepción → no hay acepción principal ni se rompe la página; quedan las de Wiktionary/glosas.
- La salida de la sonda no tiene la forma esperada (_hoffen → «Espero que sí.»_, _aufstehen → «Levántate»_) → se descarta, nunca se muestra.
- Glosas que son solo paréntesis o fórmulas («(in various phrases)», «a thing or person that helps») → se descartan; nunca aparecen traducidas.
- La traducción es igual a la palabra alemana (modelo no tradujo) → se descarta.
- El modelo no está instalado o la huella no coincide → el worker falla con un mensaje claro, sin descargar nada en uso.

## Estructura de archivos

- Crear `worker/lexicon/glosses.py` — limpia glosas inglesas (función pura).
- Crear `worker/lexicon/probes.py` — construye sondas y normaliza/valida salidas (funciones puras).
- Modificar `worker/lexicon/translate.py` — protocolo `Translator`, `NullTranslator`, `senses_for`; se elimina todo lo de Argos.
- Crear `worker/lexicon/opus.py` — `OpusTranslator` (CTranslate2) y aprovisionamiento con huellas fijadas.
- Modificar `worker/pyproject.toml`, `worker/uv.lock`, `worker/run.sh`, `worker/pipeline/run.py`, `worker/publish/__main__.py`, `.github/workflows/process-book.yml`.
- Tests: `worker/tests/test_glosses.py`, `test_probes.py`, `test_translate.py` (reescrito), `test_opus.py`; ajustar los traductores falsos de `test_run.py` y `test_page_json.py`.
- Documentos: `docs/decisiones/ADR-007-traduccion-opus-mt.md`, notas en ADR-003, `CLAUDE.md`, `docs/03-modulos-y-arquitectura.md`, RF-21, RF-43, `docs/ESTADO.md`.

---

### Tarea 1: ADR-007 y documentos

**Archivos:**

- Crear: `docs/decisiones/ADR-007-traduccion-opus-mt.md`
- Modificar: `docs/decisiones/ADR-003-lexico-wiktionary-bajo-demanda.md` (línea de estado), `CLAUDE.md:21`, `docs/03-modulos-y-arquitectura.md:20`

- [ ] **Paso 1: Escribir ADR-007** («Estado: Aceptada (2026-10-18) · Reemplaza: el punto 3 de ADR-003 (Argos) · Requisitos: RF-43, RF-21»). Contexto: con Argos el 100 % de las acepciones eran traducción automática de una glosa inglesa suelta y _Hilfe_ salía «el acto de ayudar» (Argos nunca produce «ayuda»; los verbos sueltos salen como gerundios). Decisión: Opus-MT de→es y en→es (Helsinki-NLP, CC-BY 4.0) convertidos a CTranslate2 int8; acepción principal por sonda alemana; glosas inglesas limpias como secundarias; revisión y SHA-256 por archivo fijados. Incluye la tabla de la prueba (Hilfe→ayuda, Schatz→tesoro, Angst→miedo, Eindruck→impresión, anfangen→empezar/comenzar, aufstehen→levantarse) y consecuencias (más lento que Argos, hay que reprocesar los libros, atribución CC-BY en `docs/`).
- [ ] **Paso 2:** Añadir a ADR-003 la nota «Punto 3 reemplazado por ADR-007»; en `CLAUDE.md` y `docs/03-…` cambiar «Argos en→es» / «Argos» por «Opus-MT de→es y en→es».
- [ ] **Paso 3: Commit**

```bash
git add docs CLAUDE.md
git commit -m "RF-43: ADR-007 reemplaza Argos por Opus-MT para las acepciones"
```

---

### Tarea 2: Limpieza de glosas inglesas

**Archivos:**

- Crear: `worker/lexicon/glosses.py`
- Test: `worker/tests/test_glosses.py`

**Interfaces:**

- Produce: `clean_glosses(glosses: list[str]) -> list[str]` — fragmentos cortos, únicos (sin distinguir mayúsculas), en el orden de aparición.

- [ ] **Paso 1: Escribir los tests que fallan** (`test_glosses.py`), cada uno con sus aserciones exactas:
  - `clean_glosses(["the act of helping, assistance", "a thing or person that helps"]) == ["assistance"]`
  - `clean_glosses(["to begin; to commence", "to start"]) == ["to begin", "to commence", "to start"]` (conserva «to »; lo trata la sonda)
  - `clean_glosses(["house, building", "home (in various phrases)"]) == ["house", "building", "home"]`
  - `clean_glosses(["(in various phrases)"]) == []`
  - `clean_glosses(["sit well with [with dative ‘someone’]"]) == ["sit well with"]`
  - `clean_glosses(["time of day (clipping of Uhrzeit)"]) == ["time of day"]`
  - `clean_glosses(["a", "A"]) == ["a"]`
  - `clean_glosses(["x" * 41]) == []`
- [ ] **Paso 2: Ejecutar** `./worker/run.sh uv run pytest tests/test_glosses.py -v` → FALLA (módulo no existe).
- [ ] **Paso 3: Implementar `clean_glosses`** en `worker/lexicon/glosses.py`: quitar `(...)` y `[...]`, separar por `;` y `,`, recortar, y descartar los fragmentos vacíos, de más de 40 caracteres o que empiecen por fórmula de definición (`the act/process/state/fact/quality/condition of`, `a/the thing|person|someone|something that|who`, `one who`, `used (in|as|to)`, `clipping of`); quitar repetidos ignorando mayúsculas.
- [ ] **Paso 4: Ejecutar** el mismo comando → PASA.
- [ ] **Paso 5: Commit** `RF-43: limpieza de glosas inglesas` (`git add worker/lexicon/glosses.py worker/tests/test_glosses.py`).

---

### Tarea 3: Sondas y normalización de salidas

**Archivos:**

- Crear: `worker/lexicon/probes.py`
- Test: `worker/tests/test_probes.py`

**Interfaces:**

- Produce: `german_probe(lemma: str, pos: str, genders: list[str]) -> str`; `english_probe(gloss: str, pos: str) -> str`; `clean_output(text: str, pos: str, source: str) -> str | None` (None = descartar).

- [ ] **Paso 1: Escribir los tests que fallan** (`test_probes.py`):
  - `german_probe("Hilfe", "noun", ["f"]) == "die Hilfe"`; `german_probe("Schatz", "noun", ["m"]) == "der Schatz"`; `german_probe("Haus", "noun", ["n"]) == "das Haus"`; sustantivo sin género: `german_probe("Leute", "noun", []) == "Leute"`; `german_probe("aufstehen", "verb", []) == "Ich möchte aufstehen."`; `german_probe("schön", "adj", []) == "schön"`.
  - `english_probe("to get up", "verb") == "I want to get up."`; `english_probe("start", "verb") == "I want to start."`; `english_probe("house", "noun") == "house"`.
  - `clean_output`: `("la ayuda","noun","Hilfe") == "ayuda"`; `("Ayuda","noun","Hilfe") == "ayuda"`; `("la asistencia:","noun","Hilfe") == "asistencia"`; `("Quiero levantarme.","verb","aufstehen") == "levantarse"`; `("Quiero irme.","verb","gehen") == "irse"`; `("Quiero comprenderlo.","verb","verstehen") == "comprender"`; `("Quiero tener esperanza.","verb","hoffen") == "tener esperanza"`; `("Espero que sí.","verb","hoffen") is None`; `("Levántate","verb","aufstehen") is None`; `("Sin embargo,","adv","trotzdem") == "sin embargo"`; `("hermosa","adj","schön") == "hermosa"`; `("Cariño.","noun","Schatz") == "cariño"`; `("Haus","noun","Haus") is None` (igual a la fuente); `("  ","adj","x") is None`.
- [ ] **Paso 2: Ejecutar** `./worker/run.sh uv run pytest tests/test_probes.py -v` → FALLA.
- [ ] **Paso 3: Implementar** las tres funciones. `german_probe`: artículo según el primer género (`m→der`, `f→die`, `n→das`). `english_probe`: para verbos quita un «to » inicial y envuelve en «I want to … .». `clean_output`: recorta espacios y `.,:;`, quita artículo español inicial en sustantivos (`el|la|los|las|un|una`), quita «Quiero|Quisiera|Deseo » inicial en verbos, convierte `…(ar|er|ir)me → …(ar|er|ir)se` y quita `lo|la|te` finales de un infinitivo, pone en minúscula la primera letra; en verbos acepta solo si la primera palabra es un infinitivo (`^[a-zñáéíóú]+(ar|er|ir|ír)(se)?$`); devuelve None si queda vacío o igual a `source` (sin distinguir mayúsculas).
- [ ] **Paso 4: Ejecutar** → PASA.
- [ ] **Paso 5: Commit** `RF-43: sondas y normalización de las traducciones`.

---

### Tarea 4: `senses_for` con acepción principal y glosas limpias

**Archivos:**

- Modificar: `worker/lexicon/translate.py` (quitar Argos; nuevo protocolo; reescribir `senses_for`), `worker/tests/test_translate.py` (reescribir), traductores falsos de `worker/tests/test_run.py` y `worker/tests/test_page_json.py`
- Consume: `clean_glosses`, `german_probe`, `english_probe`, `clean_output`.

**Interfaces:**

- Produce: `class Translator(Protocol)` con `from_german(self, text: str) -> str` y `from_english(self, text: str) -> str`; `NullTranslator` (ambos devuelven `""`); `senses_for(entry: Entry, translator: Translator) -> list[dict]` con `{"es": str, "m": bool}`.
- Orden de acepciones: (1) `entry.glosses_es` con `m: False`; (2) la principal (`from_german(german_probe(...))` → `clean_output`) con `m: True`; (3) cada fragmento de `clean_glosses(entry.glosses_en)` → `from_english(english_probe(...))` → `clean_output`. Sin repetidos (sin distinguir mayúsculas), máximo `MAX_SENSES`; una excepción del traductor omite solo esa acepción.

- [ ] **Paso 1: Escribir los tests que fallan** con un `Fake` de dos tablas (`german`, `english`; si falta la clave devuelve `""`):
  - Hilfe (`noun`, `["f"]`, `en=["the act of helping, assistance","a thing or person that helps"]`), `german={"die Hilfe":"la ayuda"}`, `english={"assistance":"Asistencia"}` → `[{"es":"ayuda","m":True},{"es":"asistencia","m":True}]`.
  - Con `es=["casa"]` en Wiktionary: la primera es `{"es":"casa","m":False}` y la principal automática va después.
  - Verbo anfangen: `german={"Ich möchte anfangen.":"Quiero empezar."}`, `english={"I want to begin.":"Quiero comenzar."}`, `en=["to begin"]` → `["empezar","comenzar"]` (todos `m: True`).
  - Principal descartada (`german={"Ich möchte hoffen.":"Espero que sí."}`, `en=["hope"]`, `english={"I want to hope.":"Quiero esperar."}`) → `["esperar"]`.
  - Repetidos: principal «ayuda» y glosa que también da «Ayuda» → una sola.
  - Máximo cinco con 9 glosas distintas.
  - Un traductor que lanza `RuntimeError` en `from_german` no impide las glosas; si lanza en ambos → solo las de Wiktionary.
  - Entrada compuesta sin glosas (`en=[]`) con principal válida → solo la principal.
  - `NullTranslator` → solo las de Wiktionary.
- [ ] **Paso 2: Ejecutar** `./worker/run.sh uv run pytest tests/test_translate.py -v` → FALLA.
- [ ] **Paso 3: Implementar** lo anterior en `translate.py`; adaptar `FakeTranslator` de `test_run.py` y `test_page_json.py` a `from_german`/`from_english` (devuelven `f"es:{text}"` en ambos). Quitar `ArgosTranslator`, `provision_model`, `ARGOS_MODEL_SHA256`, `verify_sha256`, `expected_sha256`, `_load_translation` y sus tests (la verificación de huellas pasa a la Tarea 5).
- [ ] **Paso 4: Ejecutar** `./worker/run.sh uv run pytest -m "not slow" -q` → todo PASA; `./worker/run.sh uv run ruff check` limpio.
- [ ] **Paso 5: Commit** `RF-43: acepción principal por sonda alemana y glosas limpias`.

---

### Tarea 5: `OpusTranslator` y aprovisionamiento verificado

**Archivos:**

- Crear: `worker/lexicon/opus.py`; Test: `worker/tests/test_opus.py`
- Modificar: `worker/pyproject.toml` (extra `opus = ["ctranslate2>=4,<5", "transformers>=4.44", "sentencepiece>=0.2"]`, extra `opus-convert = ["torch", "transformers>=4.44", "sentencepiece>=0.2"]`, índice CPU de PyTorch en `[tool.uv]` para `torch`; se elimina el extra `argos`), `worker/uv.lock`, `worker/run.sh` (volumen `mydeutsch-models:/root/.local/share/mydeutsch-models` en lugar del de Argos)

**Interfaces:**

- Produce: `MODELS_DIR: Path` (`~/.local/share/mydeutsch-models`); `MODEL_PINS: dict[str, ModelPin]` con claves `"de-es"` y `"en-es"` (`ModelPin(repo: str, revision: str, files: dict[str, str])`, archivo → SHA-256); `verify_files(directory: Path, pin: ModelPin) -> None` (lanza `ValueError` «La huella SHA-256 … no coincide» y exige que estén todos los archivos); `provision(print_hash: bool = False) -> dict[str, dict[str, str]]`; `class OpusTranslator` con `__init__(models_dir: Path = MODELS_DIR)` que lanza `RuntimeError("… no está instalado …")` si falta algún modelo, y los métodos `from_german` / `from_english`.

- [ ] **Paso 1: Escribir los tests que fallan** (`test_opus.py`, sin modelos reales):
  - `verify_files` pasa con archivos correctos; falla con `ValueError` si cambia un byte o si falta un archivo; no instala nada (la conversión no se llama).
  - `provision` con descarga y conversión falsas (monkeypatch de `_download` y `_convert`): con huellas correctas convierte; con una incorrecta lanza `ValueError` y `_convert` no se invoca (cubre la ventana TOCTOU: se verifica y convierte la misma copia privada en un directorio temporal).
  - `provision(print_hash=True)` devuelve las huellas obtenidas y no convierte.
  - Los `MODEL_PINS` tienen revisión de 40 hex y huellas de 64 hex.
  - `OpusTranslator(tmp_path)` con el directorio vacío lanza `RuntimeError` con «no está instalado».
  - `@pytest.mark.slow`: con los modelos instalados, `OpusTranslator().from_german("die Hilfe").lower()` contiene `"ayuda"`.
- [ ] **Paso 2: Ejecutar** `./worker/run.sh uv run pytest tests/test_opus.py -v` → FALLA.
- [ ] **Paso 3: Implementar `opus.py`.** Descarga con `httpx` desde `https://huggingface.co/{repo}/resolve/{revision}/{archivo}` a un directorio temporal privado; verifica; convierte esa misma copia con `ctranslate2.converters.TransformersConverter(...).convert(destino, quantization="int8")`; copia `source.spm`, `target.spm` y los archivos del tokenizador al destino. Para los pesos prefiere `model.safetensors`; si la revisión solo trae `pytorch_model.bin`, fija ese archivo (torch ≥ 2.6 carga con `weights_only`). `OpusTranslator` carga `ctranslate2.Translator(dir, device="cpu", compute_type="int8")` y el tokenizador `MarianTokenizer` (según la receta oficial de CTranslate2 para Opus-MT: tokens = `convert_ids_to_tokens(encode(texto))`, `beam_size=4`, `max_decoding_length=40`). CLI: `python -m lexicon.opus provision [--print-hash]`.
- [ ] **Paso 4: Fijar las huellas reales:** `./worker/run.sh uv run --extra opus --extra opus-convert python -m lexicon.opus provision --print-hash`, copiar `revision` y `files` a `MODEL_PINS`, y ejecutar `provision` de nuevo (instala de verdad). Confirmar el test lento: `./worker/run.sh uv run --extra opus pytest tests/test_opus.py -m slow -v` → PASA.
- [ ] **Paso 5: Ejecutar** `./worker/run.sh uv run pytest -m "not slow" -q` y `ruff check` → limpios.
- [ ] **Paso 6: Commit** `RF-43: Opus-MT con CTranslate2 y huellas fijadas`.

---

### Tarea 6: Conexión en el pipeline, el publicador y Actions

**Archivos:**

- Modificar: `worker/pipeline/run.py:21,218` y `worker/publish/__main__.py:24-26` (usar `OpusTranslator`), `.github/workflows/process-book.yml`, `worker/README.md` (si menciona Argos), comandos con `--extra argos` en la documentación → `--extra opus`
- Test: ajustar `worker/tests/test_run.py` si importa Argos.

- [ ] **Paso 1:** Sustituir `ArgosTranslator` por `OpusTranslator` en `pipeline.run` (opción `--no-translate` intacta) y `publish.__main__`.
- [ ] **Paso 2:** En `process-book.yml`: la caché pasa a `~/.local/share/mydeutsch-models` con clave `opus-${{ hashFiles('worker/lexicon/opus.py') }}`; `uv sync --extra opus --extra opus-convert`; el paso de aprovisionamiento ejecuta `uv run --extra opus --extra opus-convert python -m lexicon.opus provision`; el paso final usa `--extra opus`. Mantener las SHA de las acciones tal cual.
- [ ] **Paso 3: Ejecutar** `./worker/run.sh uv run pytest -m "not slow" -q` y `ruff check` → limpios; revisar con `git diff` que no quede ninguna referencia a `argos` salvo notas históricas de ADR.
- [ ] **Paso 4: Commit** `RF-43: el worker y el workflow usan Opus-MT`.

---

### Tarea 7: Verificación real y cierre

**Archivos:**

- Modificar: `docs/requisitos/funcionales/RF-43-calidad-de-las-traducciones.md` (estado y verificación), `docs/requisitos/INDEX.md`, `docs/requisitos/funcionales/RF-21-consultar-palabra.md` (nota de Argos), `docs/ESTADO.md`

- [ ] **Paso 1: Procesar el libro de muestra** con traducción: `./worker/run.sh uv run --extra opus python -m pipeline.run --pdf "../samples/Der Schatz-3-7.pdf" --out .local/out-rf43 --lexicon .local/lexicon.sqlite --force`. Anotar el tiempo total (RNF-04; antes ≈ 275 s por 10 páginas) y el porcentaje de entradas con al menos una acepción (antes 98,3 %).
- [ ] **Paso 2:** Generar una tabla de ≥ 40 lemas (sustantivos, verbos separables, adjetivos, adverbios) con sus acepciones, tomada de `.local/out-rf43` (`lex` de las páginas), y mostrársela a la usuaria para que marque las dudosas (criterio 1: ≥ 90 % con primera acepción correcta). Si el tiempo supera RNF-04 de forma relevante, añadir un `lru_cache` por texto en `OpusTranslator` antes de cerrar.
- [ ] **Paso 3:** Comprobar el criterio 2 con una consulta sobre el JSON generado: ninguna acepción contiene «acto de», «persona o cosa que» ni paréntesis; criterio 5: todas llevan `"m": true`.
- [ ] **Paso 4:** Actualizar RF-43 (cada criterio ✅/⚠ con su evidencia y lo que no se pudo verificar), el INDEX (estado «Hecho» solo si la usuaria aprobó la tabla), RF-21 y `docs/ESTADO.md` (qué se hizo; **reprocesar los libros ya subidos** con «Reintentar» o el borrado/resubida; siguiente paso: RF-24).
- [ ] **Paso 5: Commit** `RF-43: verificación y estado` y abrir PR `RF-43: calidad de las traducciones` (sin atribución a Claude).
