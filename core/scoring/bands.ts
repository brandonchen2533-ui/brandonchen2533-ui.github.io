import type { ScoreBand } from "../types.ts";

/** Map a 0–100 score to one of five bands. */
export function bandFor(score: number): ScoreBand {
  if (score >= 75) return "excellent";
  if (score >= 50) return "good";
  if (score >= 25) return "ok";
  if (score >= 10) return "poor";
  return "bad";
}

export const BAND_LABEL: Record<ScoreBand, string> = {
  excellent: "Excellent",
  good: "Good",
  ok: "Mediocre",
  poor: "Poor",
  bad: "Bad",
};

/** Hex color per band — mirrors the design tokens in index.css. */
export const BAND_COLOR: Record<ScoreBand, string> = {
  excellent: "#1fab54",
  good: "#8bca3e",
  ok: "#f4cf3a",
  poor: "#f59e36",
  bad: "#ee3a3a",
};

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}
