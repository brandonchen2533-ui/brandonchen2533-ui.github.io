import type { Macros, Nutriments, Product } from "./types.ts";

// ── Macro helpers ─────────────────────────────────────────────────────────
// Convert per-100g nutriments into macros for a chosen portion size.

export function macrosForPortion(n: Nutriments | undefined, grams: number): Macros {
  const factor = grams / 100;
  const kcal =
    n?.energyKcal != null
      ? n.energyKcal
      : // derive from macros if energy missing (4/4/9 kcal per g)
        4 * (n?.proteins ?? 0) + 4 * (n?.carbohydrates ?? 0) + 9 * (n?.fat ?? 0);
  return {
    calories: Math.round(kcal * factor),
    protein: round1((n?.proteins ?? 0) * factor),
    carbs: round1((n?.carbohydrates ?? 0) * factor),
    fat: round1((n?.fat ?? 0) * factor),
  };
}

export function emptyMacros(): Macros {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein: round1(a.protein + b.protein),
    carbs: round1(a.carbs + b.carbs),
    fat: round1(a.fat + b.fat),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Default portion guess (grams) for a product, used to prefill the logger. */
export function defaultPortion(p: Product): number {
  if (p.kind === "beverage") return 250;
  return 100;
}
