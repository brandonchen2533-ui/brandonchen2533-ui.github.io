import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { XIcon } from "../ui/icons.tsx";

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

const SAMPLE = [
  { code: "3017620422003", label: "Nutella" },
  { code: "5449000000996", label: "Coca-Cola" },
  { code: "7622210449283", label: "Oreo" },
  { code: "3229820129488", label: "Bjorg muesli" },
];

/** Camera barcode scanner with a typed-entry fallback. */
export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);
    const reader = new BrowserMultiFormatReader(hints);
    let stopped = false;
    let controls: { stop: () => void } | undefined;

    const onResult = (result: { getText: () => string } | undefined) => {
      if (result && !stopped) {
        stopped = true;
        controls?.stop();
        onDetected(result.getText());
      }
    };

    // Explicitly request the REAR camera — otherwise phones default to the
    // front/selfie camera, which can't scan a barcode.
    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        onResult
      )
      .then((c) => {
        controls = c;
        setStarting(false);
      })
      .catch((e: unknown) => {
        // Fall back to the default camera if the environment constraint fails.
        reader
          .decodeFromVideoDevice(undefined, videoRef.current!, onResult)
          .then((c) => {
            controls = c;
            setStarting(false);
          })
          .catch(() => {
            setStarting(false);
            setError(
              e instanceof DOMException && e.name === "NotAllowedError"
                ? "Camera permission denied. Enter a barcode below instead."
                : "No camera available. Enter a barcode below instead."
            );
          });
      });

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-cloud">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <h2 className="text-base font-semibold">Scan a barcode</h2>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Close">
          <XIcon size={20} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {/* viewfinder */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-72 rounded-2xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
        </div>
        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            Starting camera…
          </div>
        )}
      </div>

      <div className="space-y-3 bg-ink-soft px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {error && <p className="text-sm text-score-poor">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const code = manual.replace(/\D/g, "");
            if (code) onDetected(code);
          }}
          className="flex gap-2"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="Enter barcode number"
            className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:bg-white/15"
          />
          <button type="submit" className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold">
            Go
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-white/50">Try:</span>
          {SAMPLE.map((s) => (
            <button
              key={s.code}
              onClick={() => onDetected(s.code)}
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 active:bg-white/20"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
