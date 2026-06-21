import { useState } from "react";
import { useStore } from "../store.tsx";
import type { Goals } from "../../core/types.ts";
import { CheckIcon, XIcon, TargetIcon } from "../ui/icons.tsx";

/** 30% protein / 45% carbs / 25% fat split (matches onboarding). */
function macrosFromCalories(cal: number): Omit<Goals, "qualityTarget"> {
  return {
    calories: cal,
    protein: Math.round((cal * 0.3) / 4),
    carbs: Math.round((cal * 0.45) / 4),
    fat: Math.round((cal * 0.25) / 9),
  };
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { goals, setGoals, entries, removeEntry } = useStore();
  const [draft, setDraft] = useState<Goals>(goals);
  const [saved, setSaved] = useState(false);

  function setCalories(cal: number) {
    // Re-split macros from the new calorie target so they stay consistent.
    setDraft((d) => ({ ...d, ...macrosFromCalories(cal) }));
  }

  function save() {
    setGoals(draft);
    setSaved(true);
    setTimeout(onClose, 500);
  }

  function clearAll() {
    if (!confirm("Delete all logged entries? This can’t be undone.")) return;
    entries.forEach((e) => removeEntry(e.id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="animate-rise flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-paper sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-lg font-bold">Your goals</h2>
          <button onClick={onClose} className="rounded-full bg-black/5 p-1.5" aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6">
          {/* calorie target */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Daily calories</span>
              <span className="text-2xl font-bold tabular-nums">
                {draft.calories}
                <span className="ml-1 text-sm font-normal text-muted">kcal</span>
              </span>
            </div>
            <input
              type="range"
              min={1200}
              max={3500}
              step={50}
              value={draft.calories}
              onChange={(e) => setCalories(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--color-brand)]"
            />
          </div>

          {/* macros */}
          <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <p className="mb-3 text-sm font-semibold">Macro targets</p>
            <Stepper label="Protein" value={draft.protein} suffix="g" onChange={(v) => setDraft((d) => ({ ...d, protein: v }))} />
            <Stepper label="Carbs" value={draft.carbs} suffix="g" onChange={(v) => setDraft((d) => ({ ...d, carbs: v }))} />
            <Stepper label="Fat" value={draft.fat} suffix="g" onChange={(v) => setDraft((d) => ({ ...d, fat: v }))} />
            <p className="mt-2 text-xs text-muted">
              Auto-set from calories; nudge any value to customize.
            </p>
          </div>

          {/* quality target */}
          <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <TargetIcon size={16} className="text-brand-dark" /> Diet quality target
              </span>
              <span className="text-lg font-bold tabular-nums">{draft.qualityTarget}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.qualityTarget}
              onChange={(e) => setDraft((d) => ({ ...d, qualityTarget: Number(e.target.value) }))}
              className="mt-3 w-full accent-[var(--color-brand)]"
            />
            <p className="mt-1 text-xs text-muted">Aim for an average food score this high or better.</p>
          </div>

          <button
            onClick={save}
            disabled={saved}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white transition active:scale-[0.98] disabled:bg-brand-dark"
          >
            {saved ? (
              <>
                <CheckIcon size={18} /> Saved
              </>
            ) : (
              "Save goals"
            )}
          </button>

          <button onClick={clearAll} className="mt-3 w-full rounded-xl py-2.5 text-sm font-medium text-score-bad active:bg-black/5">
            Clear all logged data
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ label, value, suffix, onChange }: { label: string; value: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - 5))} className="h-7 w-7 rounded-full bg-black/5 text-lg leading-none">
          −
        </button>
        <span className="w-14 text-center text-sm font-semibold tabular-nums">
          {value}
          <span className="ml-0.5 text-xs font-normal text-muted">{suffix}</span>
        </span>
        <button onClick={() => onChange(value + 5)} className="h-7 w-7 rounded-full bg-black/5 text-lg leading-none">
          +
        </button>
      </div>
    </div>
  );
}
