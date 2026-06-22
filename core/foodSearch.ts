import type { Product } from "./types.ts";
import { searchProducts } from "./openFoodFacts.ts";
import { searchUsda } from "./usda.ts";

// ── Unified food search ───────────────────────────────────────────────────
// Combines Open Food Facts (packaged/branded products with barcodes) with USDA
// FoodData Central (generic & whole foods) for MyFitnessPal-style coverage.

function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18);
}

/**
 * Search both databases in parallel and merge. Generic USDA foods are
 * interleaved first so whole foods (banana, chicken breast) surface even when
 * Open Food Facts only has packaged variants. Caller scores/sorts the result.
 */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<Product[]> {
  const [usda, off] = await Promise.all([
    searchUsda(query, signal).catch(() => []),
    searchProducts(query, signal).catch(() => []),
  ]);

  // Interleave USDA-first, dedupe by similar name.
  const seen = new Set<string>();
  const merged: Product[] = [];
  const max = Math.max(usda.length, off.length);
  for (let i = 0; i < max; i++) {
    for (const p of [usda[i], off[i]]) {
      if (!p) continue;
      const k = nameKey(p.name);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(p);
    }
  }
  return merged;
}
