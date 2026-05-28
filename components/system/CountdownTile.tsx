"use client";

function tone(days: number | null): { color: string; bg: string } {
  if (days === null) return { color: "var(--status-grey)", bg: "color-mix(in srgb, var(--status-grey) 10%, transparent)" };
  if (days <= 2) return { color: "var(--status-red)", bg: "color-mix(in srgb, var(--status-red) 12%, transparent)" };
  if (days <= 7) return { color: "var(--status-amber)", bg: "color-mix(in srgb, var(--status-amber) 12%, transparent)" };
  return { color: "var(--status-green)", bg: "color-mix(in srgb, var(--status-green) 12%, transparent)" };
}

function countdownText(days: number | null): string {
  if (days === null) return "No date";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

export function CountdownTile({
  label,
  sublabel,
  dateLabel,
  days
}: {
  label: string;
  sublabel?: string;
  dateLabel?: string;
  days: number | null;
}) {
  const { color, bg } = tone(days);
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: color, background: bg }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
        <span className="font-mono text-2xl font-semibold tabular-nums leading-none" style={{ color }}>
          {days === null ? "--" : days < 0 ? `-${Math.abs(days)}` : days}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium" style={{ color }}>{countdownText(days)}</p>
      {sublabel ? <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">{sublabel}</p> : null}
      {dateLabel ? <p className="mt-1 text-xs text-[var(--muted)]">{dateLabel}</p> : null}
    </div>
  );
}
