import type { Macros, ScoreBand } from "./types.ts";
import { bandFor } from "./scoring/bands.ts";

// ── Photo → nutrition estimation (Cal AI style) ───────────────────────────
// The web client posts a meal photo to /api/estimate (Claude vision). If the
// server isn't running or has no API key, we fall back to a local stub so the
// whole flow still works with zero setup.

export interface PhotoEstimate {
  title: string;
  items: string[];
  macros: Macros;
  /** Health-quality score 0–100 for the meal. */
  healthScore: number;
  scoreBand: ScoreBand;
  /** 0–1 model confidence. */
  confidence: number;
  /** True when produced by the local stub (no real vision call). */
  stub: boolean;
}

const STUB_MEALS: Omit<PhotoEstimate, "stub" | "scoreBand">[] = [
  { title: "Grilled chicken bowl", items: ["Grilled chicken", "Brown rice", "Broccoli", "Olive oil"], macros: { calories: 520, protein: 42, carbs: 48, fat: 16 }, healthScore: 78, confidence: 0.62 },
  { title: "Cheeseburger & fries", items: ["Beef patty", "Cheese", "Bun", "Fries"], macros: { calories: 890, protein: 34, carbs: 78, fat: 48 }, healthScore: 28, confidence: 0.6 },
  { title: "Garden salad with salmon", items: ["Salmon", "Mixed greens", "Avocado", "Vinaigrette"], macros: { calories: 430, protein: 33, carbs: 14, fat: 27 }, healthScore: 82, confidence: 0.64 },
  { title: "Pasta bolognese", items: ["Spaghetti", "Beef sauce", "Parmesan"], macros: { calories: 670, protein: 28, carbs: 82, fat: 22 }, healthScore: 48, confidence: 0.58 },
  { title: "Oatmeal with berries", items: ["Oats", "Blueberries", "Banana", "Almond butter"], macros: { calories: 380, protein: 12, carbs: 62, fat: 11 }, healthScore: 74, confidence: 0.6 },
];

/** Deterministic-ish pick so repeated identical inputs feel stable. */
function pickStub(seed: number): PhotoEstimate {
  const base = STUB_MEALS[seed % STUB_MEALS.length];
  return { ...base, scoreBand: bandFor(base.healthScore), stub: true };
}

function seedFromImage(dataUrl: string): number {
  let h = 0;
  // sample a slice of the base64 to vary the result by image
  const slice = dataUrl.slice(-128);
  for (let i = 0; i < slice.length; i++) h = (h * 31 + slice.charCodeAt(i)) >>> 0;
  return h;
}

export function localStubEstimate(imageDataUrl: string): PhotoEstimate {
  return pickStub(seedFromImage(imageDataUrl));
}

/** Post the photo to the AI endpoint; fall back to the stub on any failure. */
export async function estimatePhoto(imageDataUrl: string): Promise<PhotoEstimate> {
  try {
    const res = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as Partial<PhotoEstimate>;
    if (!data.macros || typeof data.healthScore !== "number") throw new Error("bad payload");
    return {
      title: data.title ?? "Meal",
      items: data.items ?? [],
      macros: data.macros,
      healthScore: data.healthScore,
      scoreBand: bandFor(data.healthScore),
      confidence: data.confidence ?? 0.7,
      stub: false,
    };
  } catch {
    return localStubEstimate(imageDataUrl);
  }
}
