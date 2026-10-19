/**
 * RF-45: partícula y raíz de un verbo separable (vor·gehen), para mostrarlo en el panel de palabra.
 * Es la lista de `SEPARABLE_PARTICLES` del worker (RN-07) sin las partículas que también son
 * prefijos inseparables (durch-, über-, um-, unter-, wieder-, zwischen-): ahí partir sería engañar.
 */
const PARTICLES = [
  "ab",
  "an",
  "auf",
  "aus",
  "bei",
  "dar",
  "ein",
  "empor",
  "entgegen",
  "fern",
  "fest",
  "fort",
  "frei",
  "gegenüber",
  "heim",
  "her",
  "herab",
  "heran",
  "herauf",
  "heraus",
  "herein",
  "herum",
  "herunter",
  "hin",
  "hinaus",
  "hinein",
  "hinunter",
  "hinzu",
  "hoch",
  "los",
  "mit",
  "nach",
  "nieder",
  "offen",
  "statt",
  "teil",
  "vor",
  "voran",
  "voraus",
  "vorbei",
  "vorüber",
  "weg",
  "weiter",
  "zu",
  "zurück",
  "zusammen",
].sort((a, b) => b.length - a.length); // la más larga primero: «heraus» antes que «her»

/** Verbos que empiezan como uno separable pero no lo son. */
const NOT_SEPARABLE = new Set([
  "ankern",
  "antworten",
  "einen",
  "einigen",
  "herrschen",
  "hindern",
  "zucken",
  "zuckern",
  "zurren",
]);

const MIN_STEM = 4; // «hin·ken» no existe: la raíz de un verbo separable tiene al menos 4 letras…
const SHORT_STEMS = new Set(["tun"]); // …salvo «an·tun», «zu·tun»

export function splitSeparable(
  lemma: string,
  pos: string,
): [string, string] | null {
  if (pos !== "verb") return null;
  const lower = lemma.toLowerCase();
  // «hinter-» es un prefijo inseparable (hinterlassen, hinterfragen).
  if (
    NOT_SEPARABLE.has(lower) ||
    lower.endsWith("ieren") ||
    lower.startsWith("hinter")
  )
    return null;
  for (const p of PARTICLES) {
    if (!lower.startsWith(p)) continue;
    const stem = lower.slice(p.length);
    if (stem.length >= MIN_STEM || SHORT_STEMS.has(stem))
      return [lemma.slice(0, p.length), lemma.slice(p.length)];
  }
  return null;
}
