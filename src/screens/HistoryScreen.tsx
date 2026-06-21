import { useMemo } from "react";
import { useStore } from "../store.tsx";
import { isoDate, summarizeDay } from "../../core/diary.ts";
import { BAND_COLOR, bandFor } from "../../core/scoring/bands.ts";

export function HistoryScreen() {
  const { entries, goals } = useStore();

  const days = useMemo(() => {
    const unique = Array.from(new Set(entries.map((e) => e.date))).sort((a, b) => (a < b ? 1 : -1));
    return unique.map((d) => summarizeDay(entries, d));
  }, [entries]);

  const today = isoDate(Date.now());

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="mb-5 text-2xl font-bold">History</h1>

      {days.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">Your logged days will show up here.</p>
      ) : (
        <div className="space-y-2">
          {days.map((d) => {
            const over = d.macros.calories > goals.calories;
            return (
              <div key={d.date} className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{d.date === today ? "Today" : formatDate(d.date)}</p>
                  <p className="text-xs text-muted">
                    {d.entries.length} item{d.entries.length !== 1 ? "s" : ""} ·{" "}
                    <span className={over ? "text-score-poor" : ""}>{d.macros.calories} kcal</span>
                  </p>
                </div>
                {d.avgScore != null && (
                  <div className="text-right">
                    <span className="text-xl font-bold" style={{ color: BAND_COLOR[bandFor(d.avgScore)] }}>
                      {d.avgScore}
                    </span>
                    <p className="text-[10px] uppercase tracking-wide text-muted">quality</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
