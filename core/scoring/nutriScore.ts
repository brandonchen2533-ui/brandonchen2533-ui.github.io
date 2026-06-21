import type { Nutriments } from "../types.ts";

// ── Nutri-Score (2017 food algorithm) ─────────────────────────────────────
// Computes the official A–E grade from per-100g nutriments, then we map that
// onto a 0–100 nutritional-quality value. Beverages use a separate table but
// for v1 we apply the solid-food table to everything (good enough, documented).

function pointsFromThresholds(value: number, thresholds: number[]): number {
  // thresholds ascending; returns count of thresholds the value exceeds.
  let pts = 0;
  for (const t of thresholds) if (value > t) pts++;
  return pts;
}

const ENERGY_KJ = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
const SUGARS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
const SAT_FAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SODIUM_MG = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];

// Beverages use a much harsher energy/sugar table — a sugary soda should land
// in the worst grades, matching how Yuka rates them.
const BEV_ENERGY_KJ = [30, 90, 150, 210, 240, 270, 300, 330, 360, 390];
const BEV_SUGARS = [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15];

const FIBER = [0.9, 1.9, 2.8, 3.7, 4.7]; // AOAC
const PROTEIN = [1.6, 3.2, 4.8, 6.4, 8];

export interface NutriScoreResult {
  /** Raw Nutri-Score points (lower is better; roughly -15..+40). */
  points: number;
  grade: "A" | "B" | "C" | "D" | "E";
  /** 0–100 nutritional quality, 100 = best. */
  quality: number;
}

export function computeNutriScore(n: Nutriments, isBeverage = false): NutriScoreResult {
  const energyKj = n.energyKj ?? (n.energyKcal != null ? n.energyKcal * 4.184 : 0);
  const sodiumMg = (n.sodium != null ? n.sodium : (n.salt ?? 0) / 2.5) * 1000;

  const negative =
    pointsFromThresholds(energyKj, isBeverage ? BEV_ENERGY_KJ : ENERGY_KJ) +
    pointsFromThresholds(n.sugars ?? 0, isBeverage ? BEV_SUGARS : SUGARS) +
    pointsFromThresholds(n.saturatedFat ?? 0, SAT_FAT) +
    pointsFromThresholds(sodiumMg, SODIUM_MG);

  const fruitPct = n.fruitsVegNuts ?? 0;
  const fruitPoints = fruitPct > 80 ? 5 : fruitPct > 60 ? 2 : fruitPct > 40 ? 1 : 0;
  const fiberPoints = pointsFromThresholds(n.fiber ?? 0, FIBER);
  const proteinPointsRaw = pointsFromThresholds(n.proteins ?? 0, PROTEIN);

  // Official rule: if negative >= 11 and fruit points < 5, protein doesn't count.
  const proteinCounts = negative < 11 || fruitPoints === 5;
  const positive = fruitPoints + fiberPoints + (proteinCounts ? proteinPointsRaw : 0);

  const points = negative - positive;

  let grade: NutriScoreResult["grade"];
  if (isBeverage) {
    // Beverage grade boundaries (water is the only A; handled by callers).
    if (points <= 1) grade = "B";
    else if (points <= 5) grade = "C";
    else if (points <= 9) grade = "D";
    else grade = "E";
  } else if (points <= -1) grade = "A";
  else if (points <= 2) grade = "B";
  else if (points <= 10) grade = "C";
  else if (points <= 18) grade = "D";
  else grade = "E";

  // Map points (-15 best .. +40 worst) onto 0–100.
  const quality = Math.round(Math.max(0, Math.min(100, ((18 - points) / 33) * 100)));

  return { points, grade, quality };
}
