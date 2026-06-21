import type { Concern, HealthScore, Highlight, Product, ScoreFactor } from "../types.ts";
import { bandFor } from "./bands.ts";

// ── Cosmetic / supplement ingredient risk model ───────────────────────────
// Yuka-cosmetics style: scan the ingredient list for flagged substances,
// each with a risk tier, then derive a score from the worst offenders.

interface IngredientFlag {
  pattern: RegExp;
  name: string;
  risk: 1 | 2 | 3;
  detail: string;
}

const FLAGS: IngredientFlag[] = [
  { pattern: /paraben/i, name: "Parabens", risk: 3, detail: "Preservative; suspected endocrine disruptor." },
  { pattern: /\bphenoxyethanol\b/i, name: "Phenoxyethanol", risk: 2, detail: "Preservative; restricted for infants." },
  { pattern: /\b(methylisothiazolinone|mit|mi)\b/i, name: "Methylisothiazolinone", risk: 3, detail: "Strong contact allergen." },
  { pattern: /\bfragrance|parfum\b/i, name: "Fragrance", risk: 2, detail: "Undisclosed mix; common allergen." },
  { pattern: /\bbht\b/i, name: "BHT", risk: 2, detail: "Antioxidant; possible endocrine effects." },
  { pattern: /\btriclosan\b/i, name: "Triclosan", risk: 3, detail: "Antibacterial; endocrine & resistance concerns." },
  { pattern: /\b(sodium lauryl sulfate|sls)\b/i, name: "Sodium Lauryl Sulfate", risk: 2, detail: "Irritant surfactant." },
  { pattern: /\b(aluminum|aluminium)\b.*\b(chlorohydrate|zirconium)\b/i, name: "Aluminium salts", risk: 2, detail: "Antiperspirant active under debate." },
  { pattern: /\bphthalate|dep\b/i, name: "Phthalates", risk: 3, detail: "Plasticizer; endocrine disruptor." },
  { pattern: /\bpolyethylene glycol|peg-\d/i, name: "PEG compounds", risk: 1, detail: "May carry processing impurities." },
  { pattern: /\bsilica|titanium dioxide\b/i, name: "Titanium dioxide", risk: 2, detail: "Nanoparticle inhalation concern." },
  { pattern: /\bformaldehyde|dmdm hydantoin\b/i, name: "Formaldehyde releaser", risk: 3, detail: "Releases formaldehyde over time." },
];

export function scoreCosmetic(p: Product): HealthScore {
  const text = p.ingredientsText ?? "";
  const concerns: Concern[] = [];
  for (const f of FLAGS) {
    if (f.pattern.test(text)) {
      concerns.push({ code: f.name.toUpperCase().replace(/\s/g, "_"), name: f.name, risk: f.risk, detail: f.detail });
    }
  }

  // Start at 100, subtract for each flagged ingredient by severity.
  let penalty = 0;
  for (const c of concerns) penalty += c.risk === 3 ? 35 : c.risk === 2 ? 16 : 7;
  const value = Math.max(0, Math.round(100 - penalty));

  const highlights: Highlight[] = [];
  if (!concerns.length && text) highlights.push({ label: "No flagged ingredients", good: true });
  if (p.labels?.some((l) => /organic|natural|bio/i.test(l))) highlights.push({ label: "Natural / organic label", good: true });
  if (!text) highlights.push({ label: "Ingredient list unavailable", good: false });

  const factors: ScoreFactor[] = [
    {
      label: "Ingredient safety",
      weight: 1,
      value,
      detail: concerns.length ? `${concerns.length} flagged ingredient${concerns.length > 1 ? "s" : ""}` : "No flags",
    },
  ];

  return { value, band: bandFor(value), factors, concerns, highlights };
}
