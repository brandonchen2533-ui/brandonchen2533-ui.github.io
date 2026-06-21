import type { Product } from "./types.ts";
import { searchCategory } from "./openFoodFacts.ts";
import { scoreProduct } from "./scoring/index.ts";

export interface Alternative {
  product: Product;
  score: number;
}

/** Category tags from most specific (last) to broader (earlier). */
function categoriesDeepFirst(p: Product): string[] {
  const tags = (p.categoryTags?.filter((t) => t.startsWith("en:")) ?? []).slice();
  return tags.reverse();
}

/** Collapse near-identical product names (e.g. two "Coca-Cola Zero" variants). */
function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14);
}

/**
 * Healthier products in the same category, scored and ranked.
 * Tries the most specific category first; if it yields too few better options,
 * climbs to broader parent categories (how Yuka surfaces real swaps).
 */
export async function findAlternatives(
  product: Product,
  currentScore: number,
  limit = 3,
  margin = 5
): Promise<Alternative[]> {
  const categories = categoriesDeepFirst(product).slice(0, 3);
  if (!categories.length) return [];

  const seenCodes = new Set<string>([product.barcode]);
  const seenNames = new Set<string>([nameKey(product.name)]);
  const scored: Alternative[] = [];

  for (const category of categories) {
    const candidates = await searchCategory(category).catch(() => []);
    for (const c of candidates) {
      if (seenCodes.has(c.barcode)) continue;
      seenCodes.add(c.barcode);
      const nk = nameKey(c.name);
      if (seenNames.has(nk)) continue;
      const s = scoreProduct(c);
      if (s.value >= currentScore + margin) {
        seenNames.add(nk);
        scored.push({ product: c, score: s.value });
      }
    }
    if (scored.length >= limit) break; // enough from this (specific) level
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
