import { useEffect, useRef, useState } from "react";
import { searchProducts } from "../../core/openFoodFacts.ts";
import { scoreProduct } from "../../core/scoring/index.ts";
import type { Product } from "../../core/types.ts";
import { ScorePill } from "../ui/ScoreRing.tsx";
import { XIcon, LeafIcon } from "../ui/icons.tsx";

interface Props {
  onPick: (barcode: string) => void;
  onClose: () => void;
}

type State =
  | { phase: "idle" }
  | { phase: "searching" }
  | { phase: "results"; items: { product: Product; score: number }[] }
  | { phase: "empty" };

export function FoodSearch({ onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search, cancelling superseded requests.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState({ phase: "idle" });
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setState({ phase: "searching" });
      try {
        const products = await searchProducts(q, controller.signal);
        if (controller.signal.aborted) return;
        if (!products.length) return setState({ phase: "empty" });
        const items = products
          .map((product) => ({ product, score: scoreProduct(product).value }))
          .sort((a, b) => b.score - a.score);
        setState({ phase: "results", items });
      } catch {
        if (!controller.signal.aborted) setState({ phase: "empty" });
      }
    }, 400);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      {/* search header */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods, e.g. greek yogurt"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear" className="text-muted">
              <XIcon size={16} />
            </button>
          )}
        </div>
        <button onClick={onClose} className="px-1 text-sm font-medium text-muted">
          Cancel
        </button>
      </div>

      {/* results */}
      <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {state.phase === "idle" && (
          <p className="mt-16 text-center text-sm text-muted">
            Type a food name to search millions of products.
          </p>
        )}
        {state.phase === "searching" && (
          <div className="mt-16 flex items-center justify-center gap-2 text-sm text-muted">
            <LeafIcon size={16} className="animate-pulse text-brand" />
            Searching…
          </div>
        )}
        {state.phase === "empty" && (
          <p className="mt-16 text-center text-sm text-muted">
            No matches. Try a different term, or scan the barcode.
          </p>
        )}
        {state.phase === "results" && (
          <div className="space-y-2 py-1">
            {state.items.map(({ product, score }) => (
              <button
                key={product.barcode}
                onClick={() => onPick(product.barcode)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left ring-1 ring-black/5 transition active:scale-[0.99] active:bg-black/5"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-paper">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <LeafIcon size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  {product.brand && <p className="truncate text-xs text-muted">{product.brand}</p>}
                </div>
                <ScorePill value={score} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
