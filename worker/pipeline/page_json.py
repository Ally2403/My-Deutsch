"""Ensambla el JSON de página v1 (docs/04-modelo-de-datos.md) y lo valida igual que `parsePage`."""

from collections.abc import Iterable

from lexicon.store import Lexicon
from lexicon.translate import MAX_SENSES, Translator, senses_for
from pipeline.analyze import Analyzed
from pipeline.geometry import RawToken

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
        entry = lex.entry(lemma, pos)
        if entry is None:
            return None
        data: dict = {"lemma": lemma, "pos": pos}
        if pos == "noun":
            data["g"] = list(entry.genders)
            if entry.plural:
                data["pl"] = entry.plural
        data["senses"] = senses_for(entry, translator)
        new_id = len(self._ids) + 1
        self._ids[key] = new_id
        self._entries[new_id] = data
        return new_id

    def entry(self, entry_id: int) -> dict:
        return self._entries[entry_id]

    def to_dict(self) -> dict:
        return {"ids": self._ids, "entries": {str(i): e for i, e in self._entries.items()}}

    @classmethod
    def from_dict(cls, data: dict) -> "LexRegistry":
        reg = cls()
        reg._ids = dict(data["ids"])
        reg._entries = {int(i): e for i, e in data["entries"].items()}
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
        "images": [],
        "fields": [],
        "tokens": out_tokens,
        "lex": {str(i): registry.entry(i) for i in sorted(used)},
    }


def _fail(msg: str) -> None:
    raise ValueError(f"Página inválida: {msg}")


def _check_box(box: object, what: str) -> None:
    ok = isinstance(box, list) and len(box) == 4
    if not (ok and all(isinstance(n, int | float) and 0 <= n <= 1 for n in box)):
        _fail(f"caja inválida en {what}")


def validate_page(page: dict) -> None:
    """Mismas reglas que `parsePage` (lib/domain/page.ts)."""
    if page.get("v") != 1:
        _fail("versión no soportada")
    size = page.get("size")
    if not (isinstance(size, list) and len(size) == 2 and all(n > 0 for n in size)):
        _fail("size inválido")
    lex = page.get("lex", {})
    for key, entry in lex.items():
        if not isinstance(entry.get("lemma"), str) or not isinstance(entry.get("pos"), str):
            _fail(f"entrada de léxico {key} inválida")
        senses = entry.get("senses")
        if not isinstance(senses, list) or len(senses) > MAX_SENSES:
            _fail(f"más de {MAX_SENSES} acepciones en la entrada {key}")
        if not all(isinstance(s.get("es"), str) and isinstance(s.get("m"), bool) for s in senses):
            _fail(f"acepción inválida en la entrada {key}")
        if not set(entry.get("g", [])) <= {"m", "f", "n"}:
            _fail(f"géneros inválidos en la entrada {key}")
    tokens = page.get("tokens", [])
    for i, t in enumerate(tokens):
        if not isinstance(t.get("t"), str):
            _fail(f"token {i} inválido")
        _check_box(t.get("b"), f"token {i}")
        if "b2" in t:
            _check_box(t["b2"], f"token {i} (b2)")
        if "l" in t and str(t["l"]) not in lex:
            _fail(f"el id de léxico {t['l']} del token {i} no existe en lex")
        if "sep" in t and not (isinstance(t["sep"], int) and 0 <= t["sep"] < len(tokens)):
            _fail(f"sep fuera de rango en el token {i}")
        if "f" in t and t["f"] not in FORM_TAGS:
            _fail(f"forma desconocida en el token {i}")
    for name in ("lines", "paragraphs"):
        for r in page.get(name, []):
            ok = len(r) == 2 and 0 <= r[0] <= r[1] < len(tokens)
            if not ok:
                _fail(f"índice fuera de los tokens en {name}")
    for name in ("images", "fields"):
        for b in page.get(name, []):
            _check_box(b, name)
