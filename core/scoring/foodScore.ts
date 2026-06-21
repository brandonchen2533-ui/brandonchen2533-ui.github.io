import type { HealthScore, Highlight, Product, ScoreFactor } from "../types.ts";
import { bandFor, clamp } from "./bands.ts";
import { analyzeAdditives, additiveScore } from "./additives.ts";
import { computeNutriScore } from "./nutriScore.ts";

// ── Food / beverage health score ──────────────────────────────────────────
// Weighted blend (Yuka-inspired):
//   nutritional quality  60%
//   additives            30%
//   organic bonus        10%
// NOVA processing level nudges the nutritional component.

function highlightsFor(p: Product): Highlight[] {
  const out: Highlight[] = [];
  const n = p.nutriments;
  if (!n) return out;
  if ((n.proteins ?? 0) >= 8) out.push({ label: "High in protein", good: true });
  if ((n.fiber ?? 0) >= 6) out.push({ label: "High in fiber", good: true });
  if ((n.sugars ?? 0) >= 22.5) out.push({ label: "High in sugar", good: false });
  if ((n.saturatedFat ?? 0) >= 5) out.push({ label: "High in saturated fat", good: false });
  const salt = n.salt ?? (n.sodium ?? 0) * 2.5;
  if (salt >= 1.5) out.push({ label: "High in salt", good: false });
  if (p.labels?.some((l) => /organic|bio/i.test(l))) out.push({ label: "Organic", good: true });
  if (p.novaGroup === 4) out.push({ label: "Ultra-processed", good: false });
  return out;
}

export function scoreFood(p: Product): HealthScore {
  const n = p.nutriments ?? {};
  const nutri = computeNutriScore(n, p.kind === "beverage");

  // NOVA adjustment: ultra-processed foods lose up to 12 pts of nutritional value.
  const novaPenalty = p.novaGroup === 4 ? 12 : p.novaGroup === 3 ? 5 : 0;
  const nutritional = clamp(nutri.quality - novaPenalty);

  const concerns = analyzeAdditives(p.additiveTags);
  const additives = additiveScore(concerns);

  const isOrganic = p.labels?.some((l) => /organic|bio|eco/i.test(l)) ?? false;
  const organic = isOrganic ? 100 : 0;

  const factors: ScoreFactor[] = [
    {
      label: "Nutritional quality",
      weight: 0.6,
      value: nutritional,
      detail: `Nutri-Score ${nutri.grade}${p.novaGroup ? ` · NOVA ${p.novaGroup}` : ""}`,
    },
    {
      label: "Additives",
      weight: 0.3,
      value: additives,
      detail: concerns.length ? `${concerns.length} additive${concerns.length > 1 ? "s" : ""}` : "None detected",
    },
    {
      label: "Organic",
      weight: 0.1,
      value: organic,
      detail: isOrganic ? "Certified organic" : "Not organic",
    },
  ];

  const value = Math.round(factors.reduce((s, f) => s + f.value * f.weight, 0));

  return {
    value,
    band: bandFor(value),
    factors,
    concerns,
    highlights: highlightsFor(p),
  };
}
