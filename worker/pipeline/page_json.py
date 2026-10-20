"""Ensambla el JSON de página v1 (docs/04-modelo-de-datos.md) y lo valida igual que `parsePage`."""

from collections.abc import Iterable

from lexicon.resolve import compound_entry
from lexicon.store import Lexicon
from lexicon.translate import MAX_SENSES, Translator, probes_for, senses_for
from pipeline.analyze import Analyzed
from pipeline.geometry import Box, RawToken

FORM_TAGS = {"pret", "part", "pres", "pl", "comp", "sup"}


class LexRegistry:
    """Ids de léxico estables dentro de un libro. Los ids se reasignan a los de Postgres al
    publicar (entrega 2); aquí solo deben ser únicos y consistentes entre páginas."""

    def __init__(self) -> None:
        self._ids: dict[str, int] = {}
        self._entries: dict[int, dict] = {}

    def resolve(self, lemma: str, pos: str, lex: Lexicon, translator: Translator) -> int | None:
        key = f"{lemma}|{pos}"
        if key in self._ids:
            return self._ids[key]
        entry = self._entry_for(lemma, pos, lex)
        if entry is None:
            return None
        data: dict = {"lemma": lemma, "pos": pos}
        if pos == "noun":
            data["g"] = list(entry.genders)
            if entry.plural:
                data["pl"] = entry.plural
        data["senses"] = senses_for(entry, translator)
        new_id = max(self._entries, default=0) + 1
        self._ids[key] = new_id
        self._entries[new_id] = data
        return new_id

    @staticmethod
    def _entry_for(lemma: str, pos: str, lex: Lexicon):
        entry = lex.entry(lemma, pos)
        if entry is None and pos == "noun":
            entry = compound_entry(lemma, lex)  # género y plural de su última palabra
        return entry

    def warm(self, analyzed: Iterable[Analyzed], lex: Lexicon, translator: Translator) -> None:
        """RNF-18: traduce por lote las acepciones de los lemas nuevos de la página antes de
        resolverlos; el resultado es el mismo, con una sola llamada al modelo."""
        warm = getattr(translator, "warm", None)
        if warm is None:
            return
        german: list[str] = []
        english: list[str] = []
        seen: set[str] = set()
        for an in analyzed:
            if not (an.lemma and an.pos):
                continue
            key = f"{an.lemma}|{an.pos}"
            if key in self._ids or key in seen:
                continue
            seen.add(key)
            entry = self._entry_for(an.lemma, an.pos, lex)
            if entry is not None:
                de, en = probes_for(entry)
                german += de
                english += en
        warm(german, english)

    def entry(self, entry_id: int) -> dict:
        return self._entries[entry_id]

    def to_dict(self) -> dict:
        return {"ids": self._ids, "entries": {str(i): e for i, e in self._entries.items()}}

    @classmethod
    def from_dict(cls, data: dict) -> "LexRegistry":
        ids = dict(data["ids"])
        entries = {int(i): e for i, e in data["entries"].items()}
        values = list(ids.values())
        if len(set(values)) != len(values) or set(values) != set(entries):
            raise ValueError("Registro de léxico inconsistente: ids repetidos o sin entrada")
        if any(not isinstance(v, int) or isinstance(v, bool) or v < 1 for v in values):
            raise ValueError(
                "Registro de léxico inconsistente: los ids deben ser enteros positivos"
            )
        reg = cls()
        reg._ids = ids
        reg._entries = entries
        return reg


def _ranges(values: Iterable[int]) -> list[list[int]]:
    """Rangos inclusivos [primero, último] de tokens consecutivos con el mismo valor."""
    out: list[list[int]] = []
    previous = None
    for i, v in enumerate(values):
        if v != previous:
            out.append([i, i])
            previous = v
        else:
            out[-1][1] = i
    return out


def build_page(
    size: tuple[int, int],
    tokens: list[RawToken],
    analyzed: list[Analyzed],
    lex: Lexicon,
    translator: Translator,
    registry: LexRegistry,
    fields: list[Box] | None = None,
    images: list[Box] | None = None,
) -> dict:
    out_tokens: list[dict] = []
    used: set[int] = set()
    for tk, an in zip(tokens, analyzed, strict=True):
        item: dict = {"t": tk.text, "b": list(tk.box)}
        if tk.box2:
            item["b2"] = list(tk.box2)
        if an.lemma and an.pos:
            entry_id = registry.resolve(an.lemma, an.pos, lex, translator)
            if entry_id is not None:
                item["l"] = entry_id
                used.add(entry_id)
        item["c"] = round(min(max(tk.conf, 0.0), 100.0) / 100, 2)
        if an.sep is not None:
            item["sep"] = an.sep
        if an.form:
            item["f"] = an.form
        out_tokens.append(item)
    return {
        "v": 1,
        "size": [size[0], size[1]],
        "lines": _ranges(t.line for t in tokens),
        "paragraphs": _ranges(t.par for t in tokens),
        "images": [list(b) for b in images or []],
        "fields": [list(f) for f in fields or []],
        "tokens": out_tokens,
        "lex": {str(i): registry.entry(i) for i in sorted(used)},
    }


def _fail(msg: str) -> None:
    raise ValueError(f"Página inválida: {msg}")


def _is_int(x: object) -> bool:
    return type(x) is int


def _is_num(x: object) -> bool:
    return type(x) in (int, float)


def _check_box(box: object, what: str) -> None:
    ok = isinstance(box, list) and len(box) == 4
    if not (ok and all(_is_num(n) and 0 <= n <= 1 for n in box)):
        _fail(f"caja inválida en {what}")


def _list(page: dict, key: str) -> list:
    value = page.get(key)
    if not isinstance(value, list):
        _fail(f"{key} debe ser una lista")
    return value


def validate_page(page: object) -> None:
    """Mismas reglas que `parsePage` (lib/domain/page.ts). Solo escapa `ValueError`."""
    try:
        _validate(page)
    except ValueError:
        raise
    except (TypeError, KeyError, AttributeError, IndexError) as exc:
        raise ValueError(f"Página inválida: estructura inesperada ({type(exc).__name__})") from exc


def _validate(page: object) -> None:
    if not isinstance(page, dict):
        _fail("no es un objeto")
    if not _is_int(page.get("v")) or page["v"] != 1:
        _fail("versión no soportada")
    size = page.get("size")
    if not (isinstance(size, list) and len(size) == 2 and all(_is_num(n) and n > 0 for n in size)):
        _fail("size inválido")
    lex = page.get("lex")
    if not isinstance(lex, dict):
        _fail("lex debe ser un objeto")
    for key, entry in lex.items():
        if not isinstance(entry, dict):
            _fail(f"entrada de léxico {key} inválida")
        if not isinstance(entry.get("lemma"), str) or not isinstance(entry.get("pos"), str):
            _fail(f"entrada de léxico {key} inválida")
        senses = entry.get("senses")
        if not isinstance(senses, list) or len(senses) > MAX_SENSES:
            _fail(f"más de {MAX_SENSES} acepciones en la entrada {key}")
        for s in senses:
            if not (
                isinstance(s, dict) and isinstance(s.get("es"), str) and type(s.get("m")) is bool
            ):
                _fail(f"acepción inválida en la entrada {key}")
        g = entry.get("g", [])
        if not (isinstance(g, list) and all(x in ("m", "f", "n") for x in g)):
            _fail(f"géneros inválidos en la entrada {key}")
    tokens = _list(page, "tokens")
    for i, t in enumerate(tokens):
        if not isinstance(t, dict) or not isinstance(t.get("t"), str):
            _fail(f"token {i} inválido")
        _check_box(t.get("b"), f"token {i}")
        if "b2" in t:
            _check_box(t["b2"], f"token {i} (b2)")
        if "l" in t and not (_is_int(t["l"]) and str(t["l"]) in lex):
            _fail(f"el id de léxico del token {i} no existe en lex")
        if "sep" in t and not (_is_int(t["sep"]) and 0 <= t["sep"] < len(tokens)):
            _fail(f"sep fuera de rango en el token {i}")
        if "f" in t and t["f"] not in FORM_TAGS:
            _fail(f"forma desconocida en el token {i}")
    for name in ("lines", "paragraphs"):
        for r in _list(page, name):
            ok = isinstance(r, list) and len(r) == 2 and all(_is_int(x) for x in r)
            if not (ok and 0 <= r[0] <= r[1] < len(tokens)):
                _fail(f"índice fuera de los tokens en {name}")
    for name in ("images", "fields"):
        for b in _list(page, name):
            _check_box(b, name)
