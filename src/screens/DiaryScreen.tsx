import { useMemo, useState } from "react";
import { useStore } from "../store.tsx";
import { isoDate, loggingStreak, pctOf, summarizeDay } from "../../core/diary.ts";
import type { DiaryEntry } from "../../core/types.ts";
import { ScorePill } from "../ui/ScoreRing.tsx";
import { BAND_COLOR, bandFor, BAND_LABEL } from "../../core/scoring/bands.ts";
import { FlameIcon, XIcon, CameraIcon, ScanIcon, CogIcon } from "../ui/icons.tsx";
import { SettingsSheet } from "../components/SettingsSheet.tsx";

const MEAL_ORDER: DiaryEntry["meal"][] = ["breakfast", "lunch", "dinner", "snack"];

export function DiaryScreen() {
  const { entries, goals, removeEntry } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = isoDate(Date.now());
  const day = useMemo(() => summarizeDay(entries, today), [entries, today]);
  const streak = useMemo(() => loggingStreak(entries, Date.now()), [entries]);

  const calPct = pctOf(day.macros.calories, goals.calories);
  const remaining = goals.calories - day.macros.calories;

  const byMeal = MEAL_ORDER.map((m) => ({
    meal: m,
    items: day.entries.filter((e) => e.meal === m),
  })).filter((g) => g.items.length);

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      {/* header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()}</p>
          <h1 className="text-2xl font-bold">Today</h1>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-[#fff3e0] px-3 py-1.5 text-[#e8730c]">
              <FlameIcon size={18} />
              <span className="text-sm font-bold">{streak}</span>
            </div>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full bg-white p-2 text-muted ring-1 ring-black/5 active:bg-black/5"
            aria-label="Settings"
          >
            <CogIcon size={20} />
          </button>
        </div>
      </div>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}

      {/* calorie hero */}
      <div className="rounded-3xl bg-ink p-5 text-cloud">
        <div className="flex items-center gap-5">
          <CalorieRing pct={calPct} />
          <div className="flex-1">
            <p className="text-3xl font-bold leading-none tabular-nums">
              {day.macros.calories}
              <span className="ml-1 text-base font-medium text-white/50">/ {goals.calories}</span>
            </p>
            <p className="mt-1 text-sm text-white/60">kcal eaten</p>
            <p className="mt-2 text-sm font-medium" style={{ color: remaining >= 0 ? "#8bca3e" : "#f59e36" }}>
              {remaining >= 0 ? `${remaining} kcal left` : `${-remaining} kcal over`}
            </p>
          </div>
        </div>

        {/* macros */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <MacroBar label="Protein" value={day.macros.protein} goal={goals.protein} color="#5db3ff" />
          <MacroBar label="Carbs" value={day.macros.carbs} goal={goals.carbs} color="#f5b942" />
          <MacroBar label="Fat" value={day.macros.fat} goal={goals.fat} color="#ff7eb3" />
        </div>
      </div>

      {/* diet quality */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div>
          <p className="text-sm font-semibold">Diet quality</p>
          <p className="text-xs text-muted">
            {day.avgScore != null ? "Average score of today’s food" : "Log food to see your score"}
          </p>
        </div>
        {day.avgScore != null ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: BAND_COLOR[bandFor(day.avgScore)] }}>
              {day.avgScore}
            </span>
            <span className="text-xs font-medium" style={{ color: BAND_COLOR[bandFor(day.avgScore)] }}>
              {BAND_LABEL[bandFor(day.avgScore)]}
            </span>
          </div>
        ) : (
          <span className="text-2xl font-bold text-muted">—</span>
        )}
      </div>

      {/* entries */}
      {day.entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 space-y-5">
          {byMeal.map((group) => (
            <div key={group.meal}>
              <h3 className="mb-2 px-1 text-sm font-semibold capitalize text-muted">{group.meal}</h3>
              <div className="space-y-2">
                {group.items.map((e) => (
                  <EntryRow key={e.id} entry={e} onRemove={() => removeEntry(e.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, onRemove }: { entry: DiaryEntry; onRemove: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-paper">
        {entry.imageUrl ? (
          <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            {entry.via === "barcode" ? <ScanIcon size={18} /> : <CameraIcon size={18} />}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.title}</p>
        <p className="text-xs text-muted">
          {entry.macros.calories} kcal · P{entry.macros.protein} C{entry.macros.carbs} F{entry.macros.fat}
        </p>
      </div>
      {typeof entry.healthScore === "number" && <ScorePill value={entry.healthScore} />}
      <button
        onClick={onRemove}
        className="rounded-full p-1 text-muted opacity-0 transition group-hover:opacity-100"
        aria-label="Remove"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}

function CalorieRing({ pct }: { pct: number }) {
  const size = 84;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, pct) / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct > 100 ? "#f59e36" : "#1fab54"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none">{pct}%</span>
      </div>
    </div>
  );
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = pctOf(value, goal);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-white/60">{label}</span>
        <span className="text-xs font-medium tabular-nums text-white/80">{value}g</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center gap-2 text-center text-muted">
      <div className="flex gap-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
          <ScanIcon />
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
          <CameraIcon />
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-ink">Nothing logged yet</p>
      <p className="max-w-[14rem] text-xs">Scan a barcode or snap a photo with the + button to start your day.</p>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
