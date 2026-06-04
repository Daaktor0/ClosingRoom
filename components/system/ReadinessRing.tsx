"use client";

function ringColor(score: number, ready: boolean): string {
  if (ready) return "var(--status-green)";
  if (score >= 60) return "var(--status-amber)";
  return "var(--status-red)";
}

export function ReadinessRing({
  score,
  ready,
  size = 168,
  label = "Closing readiness"
}: {
  score: number;
  ready: boolean;
  size?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = ringColor(clamped, ready);

  return (
    <div className="inline-flex flex-col items-center gap-2" role="img" aria-label={`${label}: ${clamped}%`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--panel-strong)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease-out, stroke 300ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-measure text-4xl font-semibold tabular-nums" style={{ color }}>
            {clamped}
            <span className="text-xl">%</span>
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-[0.14em]" style={{ color }}>
            {ready ? "Ready" : "Not ready"}
          </span>
        </div>
      </div>
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>
    </div>
  );
}
