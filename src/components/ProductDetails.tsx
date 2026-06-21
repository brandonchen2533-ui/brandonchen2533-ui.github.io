import type { HealthScore, NutrientLevel, Nutriments, Product } from "../../core/types.ts";

// ── Oasis-style detailed product breakdown ────────────────────────────────
// Full nutrition panel (per serving + per 100g) with high/moderate/low flags,
// allergens, the complete ingredient list, and a transparent "how is this
// scored" methodology section.

const LEVEL_COLOR: Record<NutrientLevel, string> = {
  low: "#1fab54",
  moderate: "#f59e36",
  high: "#ee3a3a",
};

function LevelBadge({ level }: { level?: NutrientLevel }) {
  if (!level) return null;
  return (
    <span
      className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white"
      style={{ backgroundColor: LEVEL_COLOR[level] }}
    >
      {level}
    </span>
  );
}

function fmt(v: number | undefined, unit: string, factor = 1): string {
  if (v == null) return "—";
  const n = v * factor;
  return `${n >= 10 ? Math.round(n) : Math.round(n * 10) / 10}${unit}`;
}

interface Row {
  label: string;
  key: keyof Nutriments;
  unit: string;
  indent?: boolean;
  level?: NutrientLevel;
}

export function ProductDetails({
  product,
  score,
  portionGrams,
}: {
  product: Product;
  score: HealthScore;
  portionGrams: number;
}) {
  const n = product.nutriments;
  const lv = product.nutrientLevels;
  const factor = portionGrams / 100;

  const rows: Row[] = [
    { label: "Energy", key: "energyKcal", unit: " kcal" },
    { label: "Fat", key: "fat", unit: "g", level: lv?.fat },
    { label: "saturates", key: "saturatedFat", unit: "g", indent: true, level: lv?.saturatedFat },
    { label: "Carbohydrate", key: "carbohydrates", unit: "g" },
    { label: "sugars", key: "sugars", unit: "g", indent: true, level: lv?.sugars },
    { label: "Fiber", key: "fiber", unit: "g" },
    { label: "Protein", key: "proteins", unit: "g" },
    { label: "Salt", key: "salt", unit: "g", level: lv?.salt },
  ];

  const hasNutrition = n && Object.values(n).some((v) => v != null);

  return (
    <div className="mt-5 space-y-3">
      {/* Nutrition facts panel */}
      {hasNutrition && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className="text-sm font-semibold">Nutrition facts</h4>
            <div className="flex gap-6 text-[11px] font-medium uppercase tracking-wide text-muted">
              <span className="w-14 text-right">{portionGrams}g</span>
              <span className="w-14 text-right">100g</span>
            </div>
          </div>
          <div className="divide-y divide-black/5">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-1.5 text-sm">
                <span className={`flex items-center ${r.indent ? "pl-3 text-muted" : "font-medium"}`}>
                  {r.indent ? "of which " : ""}
                  {r.label}
                  <LevelBadge level={r.level} />
                </span>
                <div className="flex gap-6 tabular-nums">
                  <span className="w-14 text-right">{fmt(n?.[r.key], r.unit, factor)}</span>
                  <span className="w-14 text-right text-muted">{fmt(n?.[r.key], r.unit)}</span>
                </div>
              </div>
            ))}
          </div>
          {product.servingSize && (
            <p className="mt-2 text-xs text-muted">Labelled serving: {product.servingSize}</p>
          )}
        </section>
      )}

      {/* Allergens */}
      {product.allergens && product.allergens.length > 0 && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <h4 className="mb-2 text-sm font-semibold">Allergens</h4>
          <div className="flex flex-wrap gap-2">
            {product.allergens.map((a) => (
              <span key={a} className="rounded-full bg-score-poor/15 px-3 py-1 text-xs font-medium capitalize text-[#b5651d]">
                {a.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Full ingredients */}
      {product.ingredientsText && (
        <details className="group rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
            Ingredients
            <span className="text-muted transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-muted">{product.ingredientsText}</p>
        </details>
      )}

      {/* How is this scored — transparent methodology */}
      <details className="group rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
          How is this scored?
          <span className="text-muted transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-3 space-y-2 text-sm text-muted">
          <p>
            The <span className="font-semibold text-ink">{score.value}/100</span> score is a weighted blend:
          </p>
          <ul className="space-y-1.5">
            {score.factors.map((f) => (
              <li key={f.label} className="flex items-baseline justify-between">
                <span>
                  {f.label} <span className="text-xs">({Math.round(f.weight * 100)}%)</span>
                </span>
                <span className="font-medium text-ink">
                  {Math.round(f.value)}/100
                  <span className="ml-1 text-xs text-muted">× {f.weight}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-black/5 pt-2 text-xs">
            Nutritional quality uses the official Nutri-Score algorithm (energy, sugar, saturated fat &
            salt vs. fiber, protein & fruit content), adjusted for NOVA processing level. Additive and
            ingredient risks come from a curated safety database. Data from Open Food Facts.
          </p>
        </div>
      </details>
    </div>
  );
}
