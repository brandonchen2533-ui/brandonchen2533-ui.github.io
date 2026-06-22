// ── LOUIS core domain types ───────────────────────────────────────────────
// Framework-free. Shared by the web app today and a React Native port later.

/** A product category drives which scoring model is used. */
export type ProductKind = "food" | "beverage" | "cosmetic" | "supplement";

/** Nutrition facts, normalized to "per 100g / 100ml" for scoring. */
export interface Nutriments {
  /** Energy in kcal per 100g/ml. */
  energyKcal?: number;
  /** Energy in kJ per 100g/ml (used by Nutri-Score). */
  energyKj?: number;
  sugars?: number; // g
  saturatedFat?: number; // g
  fat?: number; // g
  salt?: number; // g
  sodium?: number; // g
  fiber?: number; // g
  proteins?: number; // g
  carbohydrates?: number; // g
  /** Estimated % of fruit / vegetable / nut / legume content (0–100). */
  fruitsVegNuts?: number;
}

/** One ingredient/additive flagged during analysis. */
export interface Concern {
  code: string; // e.g. "E150d" or "PARABEN"
  name: string;
  /** 0 = none, 1 = limited, 2 = moderate, 3 = high. */
  risk: 0 | 1 | 2 | 3;
  detail?: string;
}

/** A positive callout (high protein, organic, etc). */
export interface Highlight {
  label: string;
  good: boolean;
}

/** A normalized product, independent of where it came from. */
export interface Product {
  barcode: string;
  name: string;
  brand?: string;
  kind: ProductKind;
  imageUrl?: string;
  quantity?: string;
  ingredientsText?: string;
  nutriments?: Nutriments;
  /** Raw additive codes detected (e.g. ["en:e150d", "en:e951"]). */
  additiveTags?: string[];
  labels?: string[]; // e.g. ["organic", "vegan"]
  categoryTags?: string[]; // e.g. ["en:chocolate-spreads"]
  allergens?: string[]; // e.g. ["milk", "nuts"]
  /** Serving size as labelled, e.g. "30 g". */
  servingSize?: string;
  /** Open Food Facts' per-nutrient level assessment. */
  nutrientLevels?: Partial<Record<"fat" | "saturatedFat" | "sugars" | "salt", NutrientLevel>>;
  novaGroup?: 1 | 2 | 3 | 4; // food processing level
  source: "openfoodfacts" | "usda" | "manual" | "photo";
}

/** Low / moderate / high assessment for a single nutrient. */
export type NutrientLevel = "low" | "moderate" | "high";

/** Score band — five Yuka-style tiers. */
export type ScoreBand = "bad" | "poor" | "ok" | "good" | "excellent";

/** A single weighted contributor to the final score. */
export interface ScoreFactor {
  label: string;
  /** Share of the final score this factor represents (0–1). */
  weight: number;
  /** This factor's own quality, 0–100. */
  value: number;
  detail?: string;
}

/** The full health assessment for a product. */
export interface HealthScore {
  /** Final 0–100 score. */
  value: number;
  band: ScoreBand;
  factors: ScoreFactor[];
  concerns: Concern[];
  highlights: Highlight[];
}

/** Estimated macros for a logged item (shared by barcode + photo flows). */
export interface Macros {
  calories: number; // kcal for the logged portion
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

/** One entry in the daily diary. */
export interface DiaryEntry {
  id: string;
  /** ISO date "YYYY-MM-DD" this entry is logged under. */
  date: string;
  createdAt: number; // epoch ms
  title: string;
  imageUrl?: string;
  /** "barcode" if scanned, "photo" if AI-estimated, "manual" if typed. */
  via: "barcode" | "photo" | "manual";
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  macros: Macros;
  /** Health score 0–100 if known (always set for barcode, optional for photo). */
  healthScore?: number;
  scoreBand?: ScoreBand;
  /** Free-text items the AI/user identified. */
  items?: string[];
}

/** A user's daily targets. */
export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Minimum average health score the user is aiming for (0–100). */
  qualityTarget: number;
}
