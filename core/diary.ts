import type { DiaryEntry, Goals, Macros } from "./types.ts";
import { addMacros, emptyMacros } from "./nutrition.ts";

// ── Diary aggregation (framework-free) ────────────────────────────────────

/** Local ISO date "YYYY-MM-DD" for a given epoch ms (defaults to now). */
export function isoDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DaySummary {
  date: string;
  macros: Macros;
  entries: DiaryEntry[];
  /** Average health score across entries that have one (0–100), or null. */
  avgScore: number | null;
}

export function summarizeDay(entries: DiaryEntry[], date: string): DaySummary {
  const todays = entries.filter((e) => e.date === date);
  const macros = todays.reduce((acc, e) => addMacros(acc, e.macros), emptyMacros());
  const scored = todays.filter((e) => typeof e.healthScore === "number");
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, e) => s + (e.healthScore ?? 0), 0) / scored.length)
    : null;
  return { date, macros, entries: todays, avgScore };
}

/** Percentage of a goal met (capped at 999 to avoid runaway bars). */
export function pctOf(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(999, Math.round((value / goal) * 100));
}

export const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 120,
  carbs: 220,
  fat: 65,
  qualityTarget: 60,
};

/**
 * Consecutive-day logging streak ending today (or yesterday if nothing yet
 * today). Counts back while each prior day has at least one entry.
 */
export function loggingStreak(entries: DiaryEntry[], todayMs: number): number {
  const days = new Set(entries.map((e) => e.date));
  let streak = 0;
  let cursor = todayMs;
  // If nothing logged today, start counting from yesterday.
  if (!days.has(isoDate(cursor))) cursor -= 86_400_000;
  while (days.has(isoDate(cursor))) {
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}

/** Simple unique id (no crypto dependency for RN portability). */
let counter = 0;
export function makeId(seedMs: number): string {
  counter = (counter + 1) % 100000;
  return `${seedMs.toString(36)}-${counter.toString(36)}`;
}
