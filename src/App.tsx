import { lazy, Suspense, useState } from "react";
import { StoreProvider, useStore } from "./store.tsx";
import { Onboarding } from "./screens/Onboarding.tsx";
import { DiaryScreen } from "./screens/DiaryScreen.tsx";
import { HistoryScreen } from "./screens/HistoryScreen.tsx";
import { HomeIcon, ListIcon, PlusIcon, ScanIcon, CameraIcon, XIcon } from "./ui/icons.tsx";

// Lazy-loaded: the scanner pulls in the heavy ZXing library, the others are
// only needed once the user starts adding food. Keeps the initial bundle small.
const BarcodeScanner = lazy(() => import("./components/BarcodeScanner.tsx").then((m) => ({ default: m.BarcodeScanner })));
const ProductSheet = lazy(() => import("./components/ProductSheet.tsx").then((m) => ({ default: m.ProductSheet })));
const CameraCapture = lazy(() => import("./components/CameraCapture.tsx").then((m) => ({ default: m.CameraCapture })));
const FoodSearch = lazy(() => import("./components/FoodSearch.tsx").then((m) => ({ default: m.FoodSearch })));

type Tab = "diary" | "history";
type Overlay = null | "actions" | "scanner" | "photo" | "search" | { kind: "product"; barcode: string };

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { onboarded } = useStore();
  const [tab, setTab] = useState<Tab>("diary");
  const [overlay, setOverlay] = useState<Overlay>(null);

  if (!onboarded) return <Onboarding />;

  return (
    <div className="min-h-full">
      {tab === "diary" ? <DiaryScreen /> : <HistoryScreen />}

      {/* bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-around px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <NavButton active={tab === "diary"} onClick={() => setTab("diary")} icon={<HomeIcon />} label="Today" />
          <button
            onClick={() => setOverlay("actions")}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 active:scale-95"
            aria-label="Add food"
          >
            <PlusIcon size={28} />
          </button>
          <NavButton active={tab === "history"} onClick={() => setTab("history")} icon={<ListIcon />} label="History" />
        </div>
      </nav>

      {/* action chooser */}
      {overlay === "actions" && (
        <ActionSheet
          onClose={() => setOverlay(null)}
          onScan={() => setOverlay("scanner")}
          onPhoto={() => setOverlay("photo")}
          onSearch={() => setOverlay("search")}
        />
      )}

      <Suspense fallback={<OverlayLoading />}>
        {overlay === "scanner" && (
          <BarcodeScanner
            onClose={() => setOverlay(null)}
            onDetected={(barcode) => setOverlay({ kind: "product", barcode })}
          />
        )}

        {overlay && typeof overlay === "object" && overlay.kind === "product" && (
          <ProductSheet barcode={overlay.barcode} onClose={() => setOverlay(null)} />
        )}

        {overlay === "photo" && <CameraCapture onClose={() => setOverlay(null)} />}

        {overlay === "search" && (
          <FoodSearch
            onClose={() => setOverlay(null)}
            onPick={(barcode) => setOverlay({ kind: "product", barcode })}
          />
        )}
      </Suspense>
    </div>
  );
}

function OverlayLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-sm text-white/80">
      Loading…
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex w-16 flex-col items-center gap-0.5 py-1 ${active ? "text-brand-dark" : "text-muted"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function ActionSheet({
  onClose,
  onScan,
  onPhoto,
  onSearch,
}: {
  onClose: () => void;
  onScan: () => void;
  onPhoto: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="animate-rise w-full max-w-md rounded-t-3xl bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add to diary</h2>
          <button onClick={onClose} className="rounded-full bg-black/5 p-1.5" aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>
        {/* search bar — tapping opens full search */}
        <button
          onClick={onSearch}
          className="mb-3 flex w-full items-center gap-2 rounded-xl bg-white px-3 py-3 text-left text-sm text-muted ring-1 ring-black/5 active:bg-black/5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          Search foods by name…
        </button>
        <div className="grid grid-cols-2 gap-3">
          <ActionCard icon={<ScanIcon size={28} />} title="Scan barcode" desc="Health score & additives" onClick={onScan} />
          <ActionCard icon={<CameraIcon size={28} />} title="Snap a meal" desc="AI calories & macros" onClick={onPhoto} />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left ring-1 ring-black/5 transition active:scale-[0.98] active:bg-black/5"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12 text-brand-dark">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted">{desc}</span>
    </button>
  );
}
