import { useState } from "react";
import { useStore } from "../store.tsx";
import { DEFAULT_GOALS } from "../../core/diary.ts";
import type { Goals } from "../../core/types.ts";
import { LeafIcon, ScanIcon, CameraIcon, CheckIcon } from "../ui/icons.tsx";

type GoalKind = "lose" | "maintain" | "gain";

const PRESETS: Record<GoalKind, { label: string; desc: string; calories: number }> = {
  lose: { label: "Lose weight", desc: "Gentle calorie deficit", calories: 1700 },
  maintain: { label: "Maintain", desc: "Stay where you are", calories: 2100 },
  gain: { label: "Build muscle", desc: "Slight surplus, high protein", calories: 2500 },
};

/** Split calories into macros: 30% protein, 45% carbs, 25% fat. */
function macrosFromCalories(cal: number): Omit<Goals, "qualityTarget"> {
  return {
    calories: cal,
    protein: Math.round((cal * 0.3) / 4),
    carbs: Math.round((cal * 0.45) / 4),
    fat: Math.round((cal * 0.25) / 9),
  };
}

export function Onboarding() {
  const { finishOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<GoalKind>("maintain");
  const [calories, setCalories] = useState(PRESETS.maintain.calories);

  function choose(k: GoalKind) {
    setKind(k);
    setCalories(PRESETS[k].calories);
    setStep(2);
  }

  function done() {
    finishOnboarding({ ...macrosFromCalories(calories), qualityTarget: DEFAULT_GOALS.qualityTarget });
  }

  const macros = macrosFromCalories(calories);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      {step === 0 && (
        <div className="animate-rise flex flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand text-white shadow-lg shadow-brand/30">
              <LeafIcon size={40} />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">LOUIS</h1>
            <p className="mt-2 text-muted">Eat clean. Track easy.</p>

            <div className="mt-10 w-full space-y-3 text-left">
              <Feature icon={<ScanIcon size={20} />} title="Scan any product" desc="Get a 0–100 health score, additives & alternatives." />
              <Feature icon={<CameraIcon size={20} />} title="Snap your meals" desc="AI estimates calories & macros from a photo." />
              <Feature icon={<CheckIcon size={20} />} title="One daily diary" desc="See how much you eat and how good it is for you." />
            </div>
          </div>
          <button onClick={() => setStep(1)} className="mt-8 w-full rounded-2xl bg-brand py-4 font-semibold text-white active:scale-[0.99]">
            Get started
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="animate-rise flex flex-1 flex-col">
          <h2 className="text-2xl font-bold">What’s your goal?</h2>
          <p className="mt-1 text-muted">We’ll set a starting calorie target you can tweak anytime.</p>
          <div className="mt-6 space-y-3">
            {(Object.keys(PRESETS) as GoalKind[]).map((k) => (
              <button
                key={k}
                onClick={() => choose(k)}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left ring-1 ring-black/5 active:bg-black/5"
              >
                <div>
                  <p className="font-semibold">{PRESETS[k].label}</p>
                  <p className="text-sm text-muted">{PRESETS[k].desc}</p>
                </div>
                <span className="text-sm font-medium text-muted">{PRESETS[k].calories} kcal</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-rise flex flex-1 flex-col">
          <h2 className="text-2xl font-bold">Your daily target</h2>
          <p className="mt-1 text-muted">{PRESETS[kind].label} · adjust to fit you.</p>

          <div className="mt-8 text-center">
            <span className="text-5xl font-bold tabular-nums">{calories}</span>
            <span className="ml-1 text-lg text-muted">kcal</span>
          </div>
          <input
            type="range"
            min={1200}
            max={3500}
            step={50}
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            className="mt-6 w-full accent-[var(--color-brand)]"
          />

          <div className="mt-8 grid grid-cols-3 gap-3">
            <GoalStat label="Protein" value={`${macros.protein}g`} />
            <GoalStat label="Carbs" value={`${macros.carbs}g`} />
            <GoalStat label="Fat" value={`${macros.fat}g`} />
          </div>

          <div className="flex-1" />
          <button onClick={done} className="mt-8 w-full rounded-2xl bg-brand py-4 font-semibold text-white active:scale-[0.99]">
            Start tracking
          </button>
        </div>
      )}
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand-dark">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
    </div>
  );
}

function GoalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-black/5">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
