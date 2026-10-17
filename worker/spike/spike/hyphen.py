"""Unión de palabras cortadas con guion al final de línea (RF-39)."""

from dataclasses import dataclass, field

HYPHENS = ("-", "¬", "­")
CONJUNCTIONS = {"und", "oder", "bzw.", "bis", "sowie", "als", "noch"}


@dataclass
class Token:
    text: str
    parts: list[tuple[int, int]] = field(default_factory=list)  # (línea, palabra)


def _breaks(word: str) -> bool:
    return len(word) > 1 and word.endswith(HYPHENS) and word[-2].isalpha()


def join_hyphenated(lines: list[list[str]], known: set[str]) -> list[Token]:
    """Aplana las líneas en tokens uniendo las palabras partidas entre líneas.

    `known` son formas del léxico en minúsculas; desempatan "E-Mail" frente a "Email".
    """
    out: list[Token] = []
    skip: tuple[int, int] | None = None
    for li, words in enumerate(lines):
        for wi, word in enumerate(words):
            if (li, wi) == skip:
                continue
            last = wi == len(words) - 1
            nxt = lines[li + 1][0] if last and li + 1 < len(lines) and lines[li + 1] else None
            if nxt and _breaks(word) and nxt.lower() not in CONJUNCTIONS and nxt[0].isalpha():
                stem = word[:-1]
                if nxt[0].isupper():
                    text = f"{stem}-{nxt}"
                else:
                    joined, dashed = stem + nxt, f"{stem}-{nxt}"
                    keep = joined.lower() not in known and dashed.lower() in known
                    text = dashed if keep else joined
                out.append(Token(text, [(li, wi), (li + 1, 0)]))
                skip = (li + 1, 0)
            else:
                out.append(Token(word, [(li, wi)]))
    return out
