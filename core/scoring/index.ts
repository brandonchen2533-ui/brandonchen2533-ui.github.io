import type { HealthScore, Product } from "../types.ts";
import { scoreFood } from "./foodScore.ts";
import { scoreCosmetic } from "./cosmeticsScore.ts";

export * from "./bands.ts";
export { computeNutriScore } from "./nutriScore.ts";
export { analyzeAdditives } from "./additives.ts";

/** Score any product, dispatching on its kind. */
export function scoreProduct(p: Product): HealthScore {
  switch (p.kind) {
    case "cosmetic":
    case "supplement":
      return scoreCosmetic(p);
    case "food":
    case "beverage":
    default:
      return scoreFood(p);
  }
}
