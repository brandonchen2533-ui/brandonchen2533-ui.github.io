import { BAND_COLOR, BAND_LABEL, bandFor } from "../../core/scoring/index.ts";

interface Props {
  /** 0–100 score. */
  value: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}

/** Circular health-score ring, colored by band (Yuka-style). */
export function ScoreRing({ value, size = 96, stroke = 8, showLabel = true }: Props) {
  const band = bandFor(value);
  const color = BAND_COLOR[band];
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6e9e2" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold leading-none" style={{ fontSize: size * 0.3, color }}>
          {Math.round(value)}
        </span>
        {showLabel && (
          <span className="mt-0.5 font-medium" style={{ fontSize: size * 0.11, color }}>
            {BAND_LABEL[band]}
          </span>
        )}
      </div>
    </div>
  );
}

/** A slim horizontal score pill for compact lists. */
export function ScorePill({ value }: { value: number }) {
  const band = bandFor(value);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: BAND_COLOR[band] }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {Math.round(value)}
    </span>
  );
}
