import { useRef, useState } from "react";
import { estimatePhoto, type PhotoEstimate } from "../../core/photoEstimate.ts";
import { isoDate, makeId } from "../../core/diary.ts";
import type { DiaryEntry } from "../../core/types.ts";
import { ScoreRing } from "../ui/ScoreRing.tsx";
import { CameraIcon, CheckIcon, XIcon, BoltIcon } from "../ui/icons.tsx";
import { downscaleDataUrl } from "../util/image.ts";
import { useStore } from "../store.tsx";

type Phase =
  | { k: "idle" }
  | { k: "estimating"; image: string }
  | { k: "result"; image: string; est: PhotoEstimate }
  | { k: "error" };

const MEALS: DiaryEntry["meal"][] = ["breakfast", "lunch", "dinner", "snack"];

export function CameraCapture({ onClose }: { onClose: () => void }) {
  const { addEntry } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });
  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [meal, setMeal] = useState<DiaryEntry["meal"]>(guessMeal());
  const [logged, setLogged] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      // Downscale before sending/storing (faster upload, smaller localStorage).
      const image = await downscaleDataUrl(raw);
      setPhase({ k: "estimating", image });
      try {
        const est = await estimatePhoto(image);
        setMacros(est.macros);
        setPhase({ k: "result", image, est });
      } catch {
        setPhase({ k: "error" });
      }
    };
    reader.readAsDataURL(file);
  }

  function logIt() {
    if (phase.k !== "result") return;
    const now = Date.now();
    addEntry({
      id: makeId(now),
      date: isoDate(now),
      createdAt: now,
      title: phase.est.title,
      imageUrl: phase.image,
      via: "photo",
      meal,
      macros,
      healthScore: phase.est.healthScore,
      scoreBand: phase.est.scoreBand,
      items: phase.est.items,
    });
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
          <h2 className="text-base font-semibold">Snap your meal</h2>
          <button onClick={onClose} className="rounded-full bg-black/5 p-1.5" aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

        <div className="overflow-y-auto px-5 pb-5">
          {phase.k === "idle" && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-black/15 bg-white py-14 text-muted active:bg-black/5"
            >
              <CameraIcon size={40} />
              <span className="text-sm font-medium">Take or choose a photo</span>
              <span className="text-xs">AI estimates calories &amp; macros</span>
            </button>
          )}

          {phase.k === "estimating" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <img src={phase.image} alt="" className="h-44 w-full rounded-2xl object-cover" />
              <div className="flex items-center gap-2 text-sm text-muted">
                <BoltIcon size={16} className="animate-pulse text-brand" />
                Analyzing your plate…
              </div>
            </div>
          )}

          {phase.k === "error" && (
            <div className="py-16 text-center text-muted">Couldn’t read that image. Try another.</div>
          )}

          {phase.k === "result" && (
            <>
              <img src={phase.image} alt="" className="h-44 w-full rounded-2xl object-cover" />
              <div className="mt-4 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold">{phase.est.title}</h3>
                  <p className="truncate text-sm text-muted">{phase.est.items.join(" · ")}</p>
                  <p className="mt-1 text-xs text-muted">
                    {phase.est.stub ? "Estimated (demo AI)" : "AI estimate"} ·{" "}
                    {Math.round(phase.est.confidence * 100)}% confidence
                  </p>
                </div>
                <ScoreRing value={phase.est.healthScore} size={72} />
              </div>

              {/* editable macros */}
              <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Adjust if needed</span>
                  <span className="text-lg font-bold tabular-nums">{macros.calories} kcal</span>
                </div>
                <Field label="Calories" value={macros.calories} step={10} suffix="kcal" onChange={(v) => setMacros((m) => ({ ...m, calories: v }))} />
                <Field label="Protein" value={macros.protein} step={1} suffix="g" onChange={(v) => setMacros((m) => ({ ...m, protein: v }))} />
                <Field label="Carbs" value={macros.carbs} step={1} suffix="g" onChange={(v) => setMacros((m) => ({ ...m, carbs: v }))} />
                <Field label="Fat" value={macros.fat} step={1} suffix="g" onChange={(v) => setMacros((m) => ({ ...m, fat: v }))} />
              </div>

              <div className="mt-3 flex gap-1.5">
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
                onClick={logIt}
                disabled={logged}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white transition active:scale-[0.98] disabled:bg-brand-dark"
              >
                {logged ? (
                  <>
                    <CheckIcon size={18} /> Logged
                  </>
                ) : (
                  "Log meal"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - step))} className="h-7 w-7 rounded-full bg-black/5 text-lg leading-none">
          −
        </button>
        <span className="w-16 text-center text-sm font-semibold tabular-nums">
          {value}
          <span className="ml-0.5 text-xs font-normal text-muted">{suffix}</span>
        </span>
        <button onClick={() => onChange(value + step)} className="h-7 w-7 rounded-full bg-black/5 text-lg leading-none">
          +
        </button>
      </div>
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
