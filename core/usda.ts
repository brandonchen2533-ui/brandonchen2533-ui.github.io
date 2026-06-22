import type { Nutriments, Product } from "./types.ts";

// ── USDA FoodData Central client ──────────────────────────────────────────
// Adds the generic / whole-food coverage Open Food Facts lacks (e.g. "chicken
// breast", "banana", "white rice"). Free public API, CORS-enabled. A DEMO_KEY
// works out of the box (rate-limited); the web layer can inject a free key.

let apiKey = "DEMO_KEY";
export function setUsdaKey(key: string | undefined): void {
  if (key) apiKey = key;
}

const FDC = "https://api.nal.usda.gov/fdc/v1/foods/search";

// USDA nutrient ids → our per-100g fields.
const N_ENERGY = 1008;
const N_PROTEIN = 1003;
const N_FAT = 1004;
const N_CARBS = 1005;
const N_FIBER = 1079;
const N_SUGARS = 2000; // "Sugars, total including NLEA"
const N_SUGARS_ALT = 1063;
const N_SATFAT = 1258;
const N_SODIUM = 1093; // mg

interface FdcNutrient {
  nutrientId: number;
  value: number;
}
interface FdcFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  foodNutrients?: FdcNutrient[];
}

// Curated generic datasets rank above branded entries.
const TYPE_RANK: Record<string, number> = {
  Foundation: 0,
  "SR Legacy": 1,
  "Survey (FNDDS)": 2,
  Branded: 3,
};

function mapNutriments(list: FdcNutrient[] = []): Nutriments {
  const by = new Map(list.map((n) => [n.nutrientId, n.value]));
  const sodiumMg = by.get(N_SODIUM);
  return {
    energyKcal: by.get(N_ENERGY),
    proteins: by.get(N_PROTEIN),
    fat: by.get(N_FAT),
    carbohydrates: by.get(N_CARBS),
    fiber: by.get(N_FIBER),
    sugars: by.get(N_SUGARS) ?? by.get(N_SUGARS_ALT),
    saturatedFat: by.get(N_SATFAT),
    sodium: sodiumMg != null ? sodiumMg / 1000 : undefined, // mg → g
  };
}

/** Title-case ALL-CAPS branded descriptions; leave normal text alone. */
function tidyName(s: string): string {
  if (s === s.toUpperCase()) {
    return s
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }
  return s.trim();
}

/** Search USDA for foods. Returns lightweight Products, generic foods first. */
export async function searchUsda(query: string, signal?: AbortSignal, pageSize = 15): Promise<Product[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${FDC}?api_key=${apiKey}&query=${encodeURIComponent(q)}&pageSize=${pageSize}`;

  const res = await fetch(url, { signal }).catch(() => null);
  if (!res || !res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { foods?: FdcFood[] };
  const foods = data.foods ?? [];

  return foods
    .slice()
    .sort((a, b) => (TYPE_RANK[a.dataType ?? ""] ?? 9) - (TYPE_RANK[b.dataType ?? ""] ?? 9))
    .map((f) => ({
      barcode: `usda:${f.fdcId}`,
      name: tidyName(f.description),
      brand: f.brandOwner || f.brandName || undefined,
      kind: "food" as const,
      nutriments: mapNutriments(f.foodNutrients),
      source: "usda" as const,
    }))
    .filter((p) => p.nutriments.energyKcal != null || p.nutriments.proteins != null);
}
