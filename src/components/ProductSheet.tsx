import { useEffect, useMemo, useState } from "react";
import { lookupBarcode } from "../../core/openFoodFacts.ts";
import { scoreProduct } from "../../core/scoring/index.ts";
import { BAND_COLOR, bandFor } from "../../core/scoring/bands.ts";
import { findAlternatives, type Alternative } from "../../core/alternatives.ts";
import { defaultPortion, macrosForPortion } from "../../core/nutrition.ts";
import { isoDate, makeId } from "../../core/diary.ts";
import type { DiaryEntry, HealthScore, Product } from "../../core/types.ts";
import { ScoreRing, ScorePill } from "../ui/ScoreRing.tsx";
import { AlertIcon, CheckIcon, LeafIcon, XIcon } from "../ui/icons.tsx";
import { ProductDetails } from "./ProductDetails.tsx";
import { useStore } from "../store.tsx";

type State =
  | { phase: "loading" }
  | { phase: "notfound" }
  | { phase: "error" }
  | { phase: "ready"; product: Product; score: HealthScore };

const RISK_LABEL = ["No risk", "Limited risk", "Moderate risk", "High risk"];
const RISK_COLOR = ["#1fab54", "#8bca3e", "#f59e36", "#ee3a3a"];
const MEALS: DiaryEntry["meal"][] = ["breakfast", "lunch", "dinner", "snack"];

export function ProductSheet({ barcode, onClose }: { barcode: string; onClose: () => void }) {
  const { addEntry } = useStore();
  // `code` is stateful so tapping an alternative navigates within the sheet.
  const [code, setCode] = useState(barcode);
  const [state, setState] = useState<State>({ phase: "loading" });
  const [portion, setPortion] = useState(100);
  const [meal, setMeal] = useState<DiaryEntry["meal"]>(guessMeal());
  const [logged, setLogged] = useState(false);
  const [alts, setAlts] = useState<Alternative[] | "loading" | null>(null);

  useEffect(() => {
    let alive = true;
    setState({ phase: "loading" });
    setAlts(null);
    setLogged(false);
    lookupBarcode(code)
      .then((res) => {
        if (!alive) return;
        if (!res.found || !res.product) return setState({ phase: "notfound" });
        const score = scoreProduct(res.product);
        setState({ phase: "ready", product: res.product, score });
        setPortion(defaultPortion(res.product));
        // Only hunt for swaps when there's clear room to improve.
        if ((res.product.kind === "food" || res.product.kind === "beverage") && score.value < 75) {
          setAlts("loading");
          findAlternatives(res.product, score.value)
            .then((a) => alive && setAlts(a))
            .catch(() => alive && setAlts([]));
        }
      })
      .catch(() => alive && setState({ phase: "error" }));
    return () => {
      alive = false;
    };
  }, [code]);

  const macros = useMemo(() => {
    if (state.phase !== "ready") return null;
    return macrosForPortion(state.product.nutriments, portion);
  }, [state, portion]);

  function logIt() {
    if (state.phase !== "ready" || !macros) return;
    const now = Date.now();
    const entry: DiaryEntry = {
      id: makeId(now),
      date: isoDate(now),
      createdAt: now,
      title: state.product.name,
      imageUrl: state.product.imageUrl,
      via: "barcode",
      meal,
      macros,
      healthScore: state.score.value,
      scoreBand: state.score.band,
    };
    addEntry(entry);
    setLogged(true);
    setTimeout(onClose, 650);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="animate-rise flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-paper sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <span className="text-xs font-medium text-muted">#{code}</span>
          <button onClick={onClose} className="rounded-full bg-black/5 p-1.5" aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5">
          {state.phase === "loading" && <Centered>Looking up product…</Centered>}
          {state.phase === "notfound" && (
            <Centered>
              <p className="font-semibold">Product not found</p>
              <p className="mt-1 text-sm text-muted">
                This barcode isn’t in the Open Food Facts database yet.
              </p>
            </Centered>
          )}
          {state.phase === "error" && <Centered>Something went wrong. Check your connection.</Centered>}

          {state.phase === "ready" && (
            <Ready
              product={state.product}
              score={state.score}
              portion={portion}
              setPortion={setPortion}
              meal={meal}
              setMeal={setMeal}
              macros={macros}
              logged={logged}
              onLog={logIt}
              alts={alts}
              onPick={setCode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center text-muted">{children}</div>;
}

function Ready({
  product,
  score,
  portion,
  setPortion,
  meal,
  setMeal,
  macros,
  logged,
  onLog,
  alts,
  onPick,
}: {
  product: Product;
  score: HealthScore;
  portion: number;
  setPortion: (n: number) => void;
  meal: DiaryEntry["meal"];
  setMeal: (m: DiaryEntry["meal"]) => void;
  macros: ReturnType<typeof macrosForPortion> | null;
  logged: boolean;
  onLog: () => void;
  alts: Alternative[] | "loading" | null;
  onPick: (barcode: string) => void;
}) {
  return (
    <>
      {/* header: image + name + ring */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <LeafIcon />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold leading-tight">{product.name}</h3>
          {product.brand && <p className="truncate text-sm text-muted">{product.brand}</p>}
          {product.quantity && <p className="text-xs text-muted">{product.quantity}</p>}
        </div>
        <ScoreRing value={score.value} size={84} />
      </div>

      {/* factor breakdown */}
      <div className="mt-5 space-y-3">
        {score.factors.map((f) => (
          <div key={f.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{f.label}</span>
              <span className="text-muted">{f.detail}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/8">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${f.value}%`, backgroundColor: BAND_COLOR[bandFor(f.value)] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* highlights */}
      {score.highlights.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {score.highlights.map((h) => (
            <span
              key={h.label}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                h.good ? "bg-brand/12 text-brand-dark" : "bg-score-poor/15 text-[#b5651d]"
              }`}
            >
              {h.good ? <CheckIcon size={13} /> : <AlertIcon size={13} />}
              {h.label}
            </span>
          ))}
        </div>
      )}

      {/* concerns */}
      {score.concerns.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold">Flagged ingredients</h4>
          <div className="space-y-2">
            {score.concerns.map((c) => (
              <div key={c.code} className="flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: RISK_COLOR[c.risk] }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs" style={{ color: RISK_COLOR[c.risk] }}>
                      {RISK_LABEL[c.risk]}
                    </span>
                  </div>
                  {c.detail && <p className="text-xs text-muted">{c.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* healthier alternatives */}
      {alts === "loading" && (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted">
          <LeafIcon size={16} className="animate-pulse text-brand" />
          Finding healthier swaps…
        </div>
      )}
      {Array.isArray(alts) && alts.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5">
            <LeafIcon size={16} className="text-brand-dark" />
            <h4 className="text-sm font-semibold">Better alternatives</h4>
          </div>
          <div className="space-y-2">
            {alts.map((a) => (
              <button
                key={a.product.barcode}
                onClick={() => onPick(a.product.barcode)}
                className="flex w-full items-center gap-3 rounded-xl bg-white p-2.5 text-left ring-1 ring-black/5 transition active:scale-[0.99] active:bg-black/5"
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-paper">
                  {a.product.imageUrl ? (
                    <img src={a.product.imageUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <LeafIcon size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.product.name}</p>
                  {a.product.brand && <p className="truncate text-xs text-muted">{a.product.brand}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-brand-dark">+{a.score - score.value}</span>
                  <ScorePill value={a.score} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* detailed Oasis-style breakdown */}
      <ProductDetails product={product} score={score} portionGrams={portion} />

      {/* log to diary */}
      <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Add to diary</span>
          {macros && <span className="text-sm font-bold">{macros.calories} kcal</span>}
        </div>

        <div className="mb-3 flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={portion}
            onChange={(e) => setPortion(Number(e.target.value))}
            className="flex-1 accent-[var(--color-brand)]"
          />
          <span className="w-16 text-right text-sm tabular-nums text-muted">{portion} g</span>
        </div>

        {macros && (
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <Macro label="Protein" value={macros.protein} />
            <Macro label="Carbs" value={macros.carbs} />
            <Macro label="Fat" value={macros.fat} />
          </div>
        )}

        <div className="mb-3 flex gap-1.5">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize ${
                meal === m ? "bg-ink text-cloud" : "bg-black/5 text-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={onLog}
          disabled={logged}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white transition active:scale-[0.98] disabled:bg-brand-dark"
        >
          {logged ? (
            <>
              <CheckIcon size={18} /> Logged
            </>
          ) : (
            "Log it"
          )}
        </button>
      </div>
    </>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-paper py-2">
      <div className="text-sm font-bold tabular-nums">{value}g</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function guessMeal(): DiaryEntry["meal"] {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}
