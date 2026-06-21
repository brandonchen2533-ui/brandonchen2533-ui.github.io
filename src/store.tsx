import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DiaryEntry, Goals } from "../core/types.ts";
import { DEFAULT_GOALS } from "../core/diary.ts";

// ── Persisted app state ───────────────────────────────────────────────────

const KEY = "louis.state.v1";

interface PersistShape {
  entries: DiaryEntry[];
  goals: Goals;
  onboarded: boolean;
}

function load(): PersistShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistShape>;
      return {
        entries: parsed.entries ?? [],
        goals: { ...DEFAULT_GOALS, ...(parsed.goals ?? {}) },
        onboarded: parsed.onboarded ?? false,
      };
    }
  } catch {
    /* ignore corrupt state */
  }
  return { entries: [], goals: DEFAULT_GOALS, onboarded: false };
}

interface Store {
  entries: DiaryEntry[];
  goals: Goals;
  onboarded: boolean;
  addEntry: (e: DiaryEntry) => void;
  removeEntry: (id: string) => void;
  setGoals: (g: Goals) => void;
  finishOnboarding: (g: Goals) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, []);
  const [entries, setEntries] = useState<DiaryEntry[]>(initial.entries);
  const [goals, setGoalsState] = useState<Goals>(initial.goals);
  const [onboarded, setOnboarded] = useState<boolean>(initial.onboarded);

  useEffect(() => {
    const data: PersistShape = { entries, goals, onboarded };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full / unavailable */
    }
  }, [entries, goals, onboarded]);

  const value: Store = {
    entries,
    goals,
    onboarded,
    addEntry: (e) => setEntries((prev) => [e, ...prev]),
    removeEntry: (id) => setEntries((prev) => prev.filter((x) => x.id !== id)),
    setGoals: setGoalsState,
    finishOnboarding: (g) => {
      setGoalsState(g);
      setOnboarded(true);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
