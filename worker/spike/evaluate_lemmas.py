"""Mide la lematización de spaCy contra lemma_gold.tsv, en contexto (RF-23).

Uso: uv run python evaluate_lemmas.py [--ocr ocr]
"""

import argparse
import pickle
import time
from pathlib import Path

import spacy

from spike.lexicon import FormIndex, resolve


def load_gold(path: Path) -> dict[str, set[str]]:
    gold = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#"):
            form, lemmas = line.split("\t")
            gold[form] = {lemma.lower() for lemma in lemmas.split("|")}
    return gold


def load_index() -> FormIndex:
    cache = Path("data/lexicon/forms.pickle")
    if cache.exists():
        return pickle.loads(cache.read_bytes())
    t0 = time.perf_counter()
    index = FormIndex.from_kaikki(Path("data/lexicon/de.jsonl.gz"))
    cache.write_bytes(pickle.dumps(index))
    print(f"Índice: {len(index.forms)} formas, {len(index.lemmas)} lemas "
          f"({time.perf_counter() - t0:.0f} s)")
    return index


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ocr", default="ocr")
    ap.add_argument("--spacy-only", action="store_true")
    args = ap.parse_args()
    gold = load_gold(Path("lemma_gold.tsv"))
    nlp = spacy.load("de_core_news_md")
    index = None if args.spacy_only else load_index()
    predicted: dict[str, str] = {}
    for f in sorted(Path("data", args.ocr).glob("[0-9][0-9][0-9].txt")):
        for t in nlp(f.read_text(encoding="utf-8")):
            if t.text in gold and t.text not in predicted:
                predicted[t.text] = resolve(t.text, t.pos_, t.lemma_, index) if index else t.lemma_
    missing = [f for f in gold if f not in predicted]
    errors = [(f, predicted[f], "|".join(sorted(gold[f]))) for f in predicted
              if predicted[f].lower() not in gold[f]]
    ok = len(predicted) - len(errors)
    print(f"Formas evaluadas: {len(predicted)} (sin encontrar en el texto: {missing})")
    print(f"Correctas: {ok}/{len(predicted)} = {ok / len(predicted):.1%}")
    for form, got, want in errors:
        print(f"  {form}: obtenido={got}  esperado={want}")


if __name__ == "__main__":
    main()
