"""Genera las 3 páginas sintéticas de public/demo/ (imagen WebP + JSON de tokens).

Texto propio e inventado: no sale de ningún libro (el repositorio es público).
Uso: uv run --with pillow python worker/tools/make_demo_pages.py
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1600, 2263
MARGIN_X, TOP, LINE_STEP, FONT_SIZE = 160, 220, 130, 68
OUT = Path(__file__).resolve().parents[2] / "public" / "demo"
FONT_PATHS = [
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]

# Entradas de léxico (id → entrada). `g` solo en sustantivos; vacío = solo plural.
LEX = {
    101: dict(lemma="Tisch", pos="noun", g=["m"], pl="Tische", senses=[("mesa", False)]),
    102: dict(lemma="Lampe", pos="noun", g=["f"], pl="Lampen", senses=[("lámpara", False)]),
    103: dict(lemma="Berlin", pos="propn", senses=[("Berlín", False)]),
    104: dict(lemma="fahren", pos="verb", senses=[("ir (en vehículo)", False), ("conducir", False)]),
    105: dict(lemma="stehen", pos="verb", senses=[("estar de pie", False), ("estar (situado)", False)]),
    106: dict(lemma="neu", pos="adj", senses=[("nuevo", False)]),
    107: dict(lemma="gehen", pos="verb", senses=[("ir", False), ("caminar", False)]),
    108: dict(lemma="Teil", pos="noun", g=["m", "n"], pl="Teile", senses=[("parte", False), ("pieza", True)]),
    109: dict(lemma="Leute", pos="noun", g=[], senses=[("gente", False)]),
    110: dict(lemma="normalerweise", pos="adv", senses=[("normalmente", True)]),
    111: dict(lemma="warten", pos="verb", senses=[("esperar", False)]),
    112: dict(lemma="anrufen", pos="verb", senses=[("llamar (por teléfono)", False)]),
    431: dict(lemma="Haus", pos="noun", g=["n"], pl="Häuser", senses=[("casa", False), ("edificio", False)]),
}

# Cada palabra: texto, id de léxico, forma `f`, clave `k` para parejas separables
# y `hy` para las dos mitades de una palabra cortada con guion.
PAGE_1 = [
    [dict(t="Der"), dict(t="Tisch", l=101), dict(t="steht", l=105), dict(t="im"), dict(t="Haus.", l=431)],
    [dict(t="Die"), dict(t="Lampe", l=102), dict(t="und"), dict(t="die"), dict(t="Häuser", l=431, f="pl"), dict(t="sind"), dict(t="neu.", l=106)],
    [dict(t="Anna"), dict(t="fährt", l=104), dict(t="nach"), dict(t="Berlin.", l=103)],
]
PAGE_2 = [
    [dict(t="Er"), dict(t="ruft", l=112, k="a"), dict(t="sie"), dict(t="morgen"), dict(t="an.", l=112, pair="a")],
    [dict(t="Gestern"), dict(t="ging", l=107, f="pret"), dict(t="er"), dict(t="nach"), dict(t="Hause.")],
    [dict(t="Das"), dict(t="Teil", l=108), dict(t="kostet"), dict(t="wenig.")],
    [dict(t="Die"), dict(t="Leute", l=109, f="pl"), dict(t="warten", l=111), dict(t="Normaler-", hy="first", t_full="Normalerweise", l=110)],
    [dict(t="weise", hy="second"), dict(t="nicht"), dict(t="lange.")],
]
PAGES = {1: PAGE_1, 2: PAGE_2, 3: []}


def load_font() -> ImageFont.FreeTypeFont:
    for p in FONT_PATHS:
        if Path(p).exists():
            return ImageFont.truetype(p, FONT_SIZE)
    raise SystemExit("No se encontró una fuente con soporte de ä/ö/ü/ß")


def rel(x0: float, y0: float, x1: float, y1: float) -> list[float]:
    return [round(x0 / W, 4), round(y0 / H, 4), round((x1 - x0) / W, 4), round((y1 - y0) / H, 4)]


def build_text_page(lines, font):
    img = Image.new("RGB", (W, H), "#fbf8f1")
    draw = ImageDraw.Draw(img)
    asc, desc = font.getmetrics()
    space = draw.textlength(" ", font=font)
    tokens, line_ranges, keys, pending_hy = [], [], {}, None

    for row, words in enumerate(lines):
        y = TOP + row * LINE_STEP
        x = MARGIN_X
        first = len(tokens) if not (words and words[0].get("hy") == "second") else len(tokens) - 1
        for w in words:
            width = draw.textlength(w["t"], font=font)
            draw.text((x, y), w["t"], font=font, fill="#1b1b1b")
            box = rel(x, y, x + width, y + asc + desc)
            if w.get("hy") == "second":
                tokens[pending_hy]["b2"] = box
                x += width + space
                continue
            tok = dict(t=w.get("t_full", w["t"]), b=box)
            for key in ("l", "f"):
                if key in w:
                    tok[key] = w[key]
            if w.get("hy") == "first":
                pending_hy = len(tokens)
            if "k" in w:
                keys[w["k"]] = len(tokens)
            if "pair" in w:
                tok["sep"] = keys[w["pair"]]
                tokens[keys[w["pair"]]]["sep"] = len(tokens)
            tokens.append(tok)
            x += width + space
        line_ranges.append([first, len(tokens) - 1])
    return img, tokens, line_ranges


def build_illustration_page():
    img = Image.new("RGB", (W, H), "#fbf8f1")
    d = ImageDraw.Draw(img)
    box = (200, 500, 1400, 1500)
    d.rectangle(box, fill="#dbe7f3", outline="#2b4a6b", width=8)
    d.ellipse((420, 650, 760, 990), fill="#f2c94c")
    d.polygon([(200, 1500), (700, 1000), (1000, 1300), (1200, 1100), (1400, 1500)], fill="#6aa36f")
    return img, [box[0] / W, box[1] / H, (box[2] - box[0]) / W, (box[3] - box[1]) / H]


def lex_json(tokens):
    ids = {t["l"] for t in tokens if "l" in t}
    out = {}
    for i in sorted(ids):
        e = dict(LEX[i])
        e["senses"] = [dict(es=es, m=m) for es, m in e["senses"]]
        out[str(i)] = e
    return out


# RF-34: huecos de ejemplo para probar los campos de ejercicio sin libro real.
DEMO_FIELDS = {1: [[0.1, 0.9, 0.3, 0.02], [0.55, 0.9, 0.3, 0.02]]}


# RF-47: traducción por oración escrita a mano (la demo no usa el modelo).
DEMO_SENTS = {
    1: [
        dict(r=[0, 4], es="La mesa está en la casa."),
        dict(r=[5, 11], es="La lámpara y las casas son nuevas."),
        dict(r=[12, 15], es="Anna viaja a Berlín."),
    ],
    2: [
        dict(r=[0, 4], es="Él la llama mañana."),
        dict(r=[5, 9], es="Ayer él se fue a casa."),
        dict(r=[10, 13], es="La pieza cuesta poco."),
        dict(r=[14, 19], es="La gente normalmente no espera mucho."),
    ],
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    font = load_font()
    for n, lines in PAGES.items():
        if lines:
            img, tokens, line_ranges = build_text_page(lines, font)
            images = []
        else:
            img, ibox = build_illustration_page()
            tokens, line_ranges, images = [], [], [[round(v, 4) for v in ibox]]
        data = dict(
            v=1,
            size=[W, H],
            lines=line_ranges,
            paragraphs=[[0, len(tokens) - 1]] if tokens else [],
            images=images,
            fields=DEMO_FIELDS.get(n, []),
            tokens=tokens,
            lex=lex_json(tokens),
        )
        if n in DEMO_SENTS:
            data["sents"] = DEMO_SENTS[n]
        img.save(OUT / f"page-{n}.webp", "WEBP", quality=70, method=6)
        (OUT / f"page-{n}.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )
        print(f"pagina {n}: {len(tokens)} tokens, {(OUT / f'page-{n}.webp').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
