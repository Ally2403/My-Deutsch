export type Gender = "m" | "n" | "f";

const ARTICLE: Record<Gender, string> = { m: "der", n: "das", f: "die" };

export type GenderInfo =
  | { kind: "colored"; gender: Gender; article: string; multiple: boolean; articles: string[] }
  | { kind: "plural-only" }
  | { kind: "none" };

function isGender(g: string): g is Gender {
  return g === "m" || g === "n" || g === "f";
}

/** RN-01: el color depende del género del lema en singular, no del artículo del texto. */
export function genderInfo(entry: { pos: string; genders: readonly string[] }): GenderInfo {
  if (entry.pos !== "noun") return { kind: "none" };
  const genders = entry.genders.filter(isGender);
  if (genders.length === 0) return { kind: "plural-only" };
  const articles = genders.map((g) => ARTICLE[g]);
  return {
    kind: "colored",
    gender: genders[0],
    article: articles[0],
    multiple: genders.length > 1,
    articles,
  };
}
