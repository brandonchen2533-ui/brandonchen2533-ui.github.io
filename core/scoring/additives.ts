import type { Concern } from "../types.ts";

// ── Additive risk database ────────────────────────────────────────────────
// A curated subset of E-numbers with a risk tier (0–3) and a short note.
// Codes are stored normalized (uppercase, no "en:" prefix, no dots).

interface AdditiveInfo {
  name: string;
  risk: 0 | 1 | 2 | 3;
  detail: string;
}

const ADDITIVES: Record<string, AdditiveInfo> = {
  // High risk
  E102: { name: "Tartrazine", risk: 3, detail: "Azo dye linked to hyperactivity in children." },
  E110: { name: "Sunset Yellow", risk: 3, detail: "Azo dye; possible hyperactivity effects." },
  E129: { name: "Allura Red", risk: 3, detail: "Azo dye; restricted in some countries." },
  E133: { name: "Brilliant Blue", risk: 2, detail: "Synthetic dye." },
  E150C: { name: "Caramel III", risk: 2, detail: "Ammonia caramel; may contain 4-MEI." },
  E150D: { name: "Caramel IV", risk: 2, detail: "Sulphite ammonia caramel; may contain 4-MEI." },
  E249: { name: "Potassium nitrite", risk: 3, detail: "Nitrite; nitrosamine formation risk." },
  E250: { name: "Sodium nitrite", risk: 3, detail: "Curing salt; linked to processed-meat risk." },
  E320: { name: "BHA", risk: 3, detail: "Antioxidant; possible endocrine effects." },
  E321: { name: "BHT", risk: 2, detail: "Synthetic antioxidant." },
  E319: { name: "TBHQ", risk: 3, detail: "Petroleum-derived preservative." },
  E621: { name: "Monosodium glutamate", risk: 2, detail: "Flavour enhancer (MSG)." },
  E627: { name: "Disodium guanylate", risk: 1, detail: "Flavour enhancer, paired with MSG." },
  E631: { name: "Disodium inosinate", risk: 1, detail: "Flavour enhancer, paired with MSG." },
  E951: { name: "Aspartame", risk: 2, detail: "Sweetener under ongoing safety review." },
  E954: { name: "Saccharin", risk: 2, detail: "Artificial sweetener." },
  E211: { name: "Sodium benzoate", risk: 2, detail: "Preservative; benzene risk with vit C." },

  // Moderate / limited
  E120: { name: "Cochineal", risk: 1, detail: "Natural red dye; allergen for some." },
  E160A: { name: "Beta-carotene", risk: 0, detail: "Natural colour (provitamin A)." },
  E296: { name: "Malic acid", risk: 0, detail: "Acidity regulator; naturally occurring." },
  E330: { name: "Citric acid", risk: 0, detail: "Common acidifier; low concern." },
  E300: { name: "Ascorbic acid", risk: 0, detail: "Vitamin C; antioxidant." },
  E322: { name: "Lecithins", risk: 0, detail: "Emulsifier, often from soy/sunflower." },
  E440: { name: "Pectin", risk: 0, detail: "Natural gelling agent." },
  E412: { name: "Guar gum", risk: 1, detail: "Thickener; high amounts may cause bloating." },
  E415: { name: "Xanthan gum", risk: 1, detail: "Thickener; generally well tolerated." },
  E471: { name: "Mono/diglycerides", risk: 1, detail: "Emulsifier; may contain trans fats." },
  E407: { name: "Carrageenan", risk: 2, detail: "Thickener; gut-inflammation debate." },
  E950: { name: "Acesulfame K", risk: 1, detail: "Artificial sweetener." },
  E955: { name: "Sucralose", risk: 1, detail: "Artificial sweetener." },
  E202: { name: "Potassium sorbate", risk: 1, detail: "Preservative; low concern." },
};

/** Normalize an additive tag from any source to a lookup key. */
export function normalizeAdditive(tag: string): string {
  return tag.replace(/^en:/i, "").replace(/[.\s-]/g, "").toUpperCase();
}

// Additives commonly written by NAME in ingredient lists (esp. North American
// products) rather than as E-numbers. Mapped to their E-code so they pick up
// the right risk tier above.
const NAME_TO_CODE: { pattern: RegExp; code: string }[] = [
  { pattern: /\bmonosodium glutamate\b|\bMSG\b/i, code: "E621" },
  { pattern: /\bdisodium guanylate\b/i, code: "E627" },
  { pattern: /\bdisodium inosinate\b/i, code: "E631" },
  { pattern: /\bTBHQ\b|tertiary butylhydroquinone/i, code: "E319" },
  { pattern: /\bBHA\b|butylated hydroxyanisole/i, code: "E320" },
  { pattern: /\bBHT\b|butylated hydroxytoluene/i, code: "E321" },
  { pattern: /\bsodium nitrite\b/i, code: "E250" },
  { pattern: /\bsodium benzoate\b/i, code: "E211" },
  { pattern: /\bpotassium sorbate\b/i, code: "E202" },
  { pattern: /\baspartame\b/i, code: "E951" },
  { pattern: /\bsucralose\b/i, code: "E955" },
  { pattern: /\bacesulfame\b/i, code: "E950" },
  { pattern: /\bsaccharin\b/i, code: "E954" },
  { pattern: /\bcarrageenan\b/i, code: "E407" },
  { pattern: /\btartrazine\b|\byellow\s*(no\.?\s*)?5\b/i, code: "E102" },
  { pattern: /\bsunset yellow\b|\byellow\s*(no\.?\s*)?6\b/i, code: "E110" },
  { pattern: /\ballura red\b|\bred\s*(no\.?\s*)?40\b/i, code: "E129" },
  { pattern: /\bbrilliant blue\b|\bblue\s*(no\.?\s*)?1\b/i, code: "E133" },
];

/**
 * Detect additive E-codes directly from an ingredient list — both bare
 * E-numbers (e.g. "E150c", "E 621") and common names ("MSG", "Yellow 5").
 * This mirrors how Yuka reads ingredients, catching products Open Food Facts
 * didn't fully tag.
 */
export function additivesFromText(text = ""): string[] {
  if (!text) return [];
  const codes = new Set<string>();
  // Bare E-numbers, tolerant of spacing/case: E150c, E 621, e-621
  for (const m of text.matchAll(/\bE\s?-?\s?(\d{3,4}[a-z]{0,2})\b/gi)) {
    codes.add(`E${m[1].toUpperCase()}`);
  }
  // Named additives
  for (const { pattern, code } of NAME_TO_CODE) {
    if (pattern.test(text)) codes.add(code);
  }
  return [...codes];
}

/** Resolve raw additive tags into Concerns (best-effort; unknown = limited). */
export function analyzeAdditives(tags: string[] = []): Concern[] {
  const seen = new Set<string>();
  const out: Concern[] = [];
  for (const raw of tags) {
    const code = normalizeAdditive(raw);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const info = ADDITIVES[code];
    if (info) {
      out.push({ code, name: info.name, risk: info.risk, detail: info.detail });
    } else if (/^E\d{3}/.test(code)) {
      out.push({ code, name: `Additive ${code}`, risk: 1, detail: "Additive present; limited data." });
    }
  }
  return out;
}

/**
 * Additive sub-score 0–100 (100 = no concerning additives).
 * Each risk tier removes points; high-risk additives are heavily penalized.
 */
export function additiveScore(concerns: Concern[]): number {
  let penalty = 0;
  for (const c of concerns) {
    penalty += c.risk === 3 ? 40 : c.risk === 2 ? 18 : c.risk === 1 ? 6 : 0;
  }
  return Math.max(0, 100 - penalty);
}
