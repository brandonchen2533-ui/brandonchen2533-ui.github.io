import type { Nutriments, Product, ProductKind } from "./types.ts";
import { cacheGet, cacheSet } from "./cache.ts";

// ── Open Food Facts client ────────────────────────────────────────────────
// Free, open barcode database (food, beverages, cosmetics via Open Beauty
// Facts). We normalize their loose schema into our Product type.

const OFF = "https://world.openfoodfacts.org";
const OBF = "https://world.openbeautyfacts.org";

interface OffProduct {
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  quantity?: string;
  serving_size?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  additives_tags?: string[];
  labels_tags?: string[];
  allergens_tags?: string[];
  nova_group?: number;
  categories_tags?: string[];
  nutriments?: Record<string, number>;
  nutrient_levels?: Record<string, string>;
}

function mapNutrientLevels(raw: Record<string, string> = {}): Product["nutrientLevels"] {
  const valid = (s?: string): s is "low" | "moderate" | "high" =>
    s === "low" || s === "moderate" || s === "high";
  const out: NonNullable<Product["nutrientLevels"]> = {};
  if (valid(raw["fat"])) out.fat = raw["fat"];
  if (valid(raw["saturated-fat"])) out.saturatedFat = raw["saturated-fat"];
  if (valid(raw["sugars"])) out.sugars = raw["sugars"];
  if (valid(raw["salt"])) out.salt = raw["salt"];
  return Object.keys(out).length ? out : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}

function mapNutriments(raw: Record<string, number> = {}): Nutriments {
  return {
    energyKcal: num(raw["energy-kcal_100g"]),
    energyKj: num(raw["energy-kj_100g"] ?? raw["energy_100g"]),
    sugars: num(raw["sugars_100g"]),
    saturatedFat: num(raw["saturated-fat_100g"]),
    fat: num(raw["fat_100g"]),
    salt: num(raw["salt_100g"]),
    sodium: num(raw["sodium_100g"]),
    fiber: num(raw["fiber_100g"]),
    proteins: num(raw["proteins_100g"]),
    carbohydrates: num(raw["carbohydrates_100g"]),
    fruitsVegNuts: num(raw["fruits-vegetables-nuts-estimate-from-ingredients_100g"]),
  };
}

function inferKind(cats: string[] = []): ProductKind {
  const joined = cats.join(" ");
  if (/beverage|drink|water|soda|juice/i.test(joined)) return "beverage";
  if (/supplement|vitamin/i.test(joined)) return "supplement";
  return "food";
}

export interface LookupResult {
  found: boolean;
  product?: Product;
}

async function fetchFrom(base: string, barcode: string, kind?: ProductKind): Promise<Product | null> {
  const url = `${base}/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, { headers: { "User-Agent": "LOUIS-App/0.1 (health scanner)" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;

  return {
    barcode,
    name: p.product_name?.trim() || "Unknown product",
    brand: p.brands?.split(",")[0]?.trim(),
    kind: kind ?? inferKind(p.categories_tags),
    imageUrl: p.image_front_url || p.image_url,
    quantity: p.quantity,
    servingSize: p.serving_size,
    ingredientsText: p.ingredients_text_en || p.ingredients_text,
    nutriments: mapNutriments(p.nutriments),
    additiveTags: p.additives_tags,
    labels: p.labels_tags?.map((l) => l.replace(/^en:/, "")),
    categoryTags: p.categories_tags,
    allergens: p.allergens_tags?.map((a) => a.replace(/^en:/, "")),
    nutrientLevels: mapNutrientLevels(p.nutrient_levels),
    novaGroup: (p.nova_group as Product["novaGroup"]) || undefined,
    source: "openfoodfacts",
  };
}

/**
 * Find healthier products in the same category. Searches Open Food Facts by the
 * product's most specific category, returns lightweight Product candidates.
 * Scoring/filtering is left to the caller (keeps this module score-agnostic).
 */
export async function searchCategory(categoryTag: string, pageSize = 24): Promise<Product[]> {
  const url =
    `${OFF}/api/v2/search?categories_tags_en=${encodeURIComponent(categoryTag.replace(/^en:/, ""))}` +
    `&fields=code,product_name,brands,image_front_url,nutriments,additives_tags,labels_tags,nova_group,categories_tags,quantity` +
    `&sort_by=unique_scans_n&page_size=${pageSize}`;

  // OFF's search endpoint is load-shedding-prone (intermittent 503s). Retry a
  // couple of times with backoff before giving up.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { headers: { "User-Agent": "LOUIS-App/0.1 (health scanner)" } }).catch(() => null);
    if (res && res.ok) break;
    if (res && res.status < 500) break; // client error → don't retry
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  if (!res || !res.ok) return [];

  const data = (await res.json().catch(() => ({}))) as { products?: (OffProduct & { code?: string })[] };
  if (!data.products) return [];

  return data.products
    .filter((p) => p.product_name && p.code && p.nutriments)
    .map((p) => ({
      barcode: String(p.code),
      name: p.product_name!.trim(),
      brand: p.brands?.split(",")[0]?.trim(),
      kind: inferKind(p.categories_tags),
      imageUrl: p.image_front_url || p.image_url,
      quantity: p.quantity,
      nutriments: mapNutriments(p.nutriments),
      additiveTags: p.additives_tags,
      labels: p.labels_tags?.map((l) => l.replace(/^en:/, "")),
      categoryTags: p.categories_tags,
      novaGroup: (p.nova_group as Product["novaGroup"]) || undefined,
      source: "openfoodfacts" as const,
    }));
}

/** Look up a barcode across Open Food Facts, then Open Beauty Facts. */
export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  const clean = barcode.replace(/\D/g, "");
  if (!clean) return { found: false };

  // Serve from cache when available — instant repeat scans, and keeps previously
  // scanned products working even if OFF is unreachable.
  const cached = cacheGet<Product>(`off:2:${clean}`);
  if (cached) return { found: true, product: cached };

  // Try food first; fall back to beauty (cosmetics) database.
  const food = await fetchFrom(OFF, clean).catch(() => null);
  if (food && food.name !== "Unknown product") {
    cacheSet(`off:2:${clean}`, food);
    return { found: true, product: food };
  }

  const beauty = await fetchFrom(OBF, clean, "cosmetic").catch(() => null);
  if (beauty) {
    cacheSet(`off:2:${clean}`, beauty);
    return { found: true, product: beauty };
  }

  if (food) return { found: true, product: food };
  return { found: false };
}
