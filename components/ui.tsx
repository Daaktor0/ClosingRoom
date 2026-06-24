import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Flag,
  Loader,
  Lock,
  Scale,
  Search,
  User
} from "lucide-react";
import { formatDate, getComputedDueDate, getComputedStatutoryDate } from "@/lib/dateUtils";
import { glossary } from "@/lib/glossary";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const naturalStatusPath: TaskStatus[] = ["Not Started", "In Progress", "Under Review", "Completed"];

const statusPillMeta: Record<TaskStatus, { color: string; icon: typeof CheckCircle2 }> = {
  "Not Started": { color: "var(--status-grey)", icon: CircleDashed },
  "In Progress": { color: "var(--status-amber)", icon: Loader },
  "With Client": { color: "var(--status-blue)", icon: User },
  "With Investor Counsel": { color: "var(--status-blue)", icon: Scale },
  "Under Review": { color: "var(--status-blue)", icon: Search },
  Completed: { color: "var(--status-green)", icon: CheckCircle2 },
  Waived: { color: "var(--status-grey)", icon: CircleSlash },
  "Converted to CS": { color: "var(--status-grey)", icon: ArrowUpRight },
  Blocked: { color: "var(--status-red)", icon: Ban },
  "Not Applicable": { color: "var(--status-grey)", icon: CircleSlash }
};

export type DeadlinePairTask = Pick<Task, "timeline" | "customOffsetDays" | "filing" | "statutoryDeadlineNote">;

export function getNextNaturalStatus(status: TaskStatus): TaskStatus | null {
  const index = naturalStatusPath.indexOf(status);
  if (index === -1 || index === naturalStatusPath.length - 1) return null;
  return naturalStatusPath[index + 1];
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("card p-5", className)}>{children}</section>;
}

export function SectionHeader({
  eyebrow,
  title,
  action
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p> : null}
        <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Masthead({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  className
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{subtitle}</p> : null}
        {children ? <div className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function BriefHeadline({
  children,
  kicker,
  className
}: {
  children: React.ReactNode;
  kicker?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-5xl", className)}>
      {kicker ? <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">{kicker}</p> : null}
      <p className="font-display text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">{children}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent" | "statutory";
  className?: string;
}) {
  const toneClass = {
    neutral: "bg-[var(--panel-strong)] text-[var(--foreground)]",
    success: "border-green-700/30 bg-green-700/10 text-[var(--success)]",
    warning: "border-yellow-700/30 bg-yellow-700/10 text-[var(--warning)]",
    danger: "border-red-700/30 bg-red-700/10 text-[var(--danger)]",
    accent: "border-teal-700/30 bg-teal-700/10 text-[var(--accent)]",
    statutory: "border-orange-900/30 bg-orange-900/10 text-[var(--statutory-hard-stop)]"
  }[tone];

  return <span className={cn("badge", toneClass, className)}>{children}</span>;
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = {
    primary: "border-transparent bg-[var(--accent)] text-[var(--background)] hover:brightness-95",
    secondary: "border-[var(--line)] bg-[var(--panel)] text-[var(--foreground)] hover:bg-[var(--panel-strong)]",
    ghost: "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--panel-strong)]",
    danger: "border-red-700/30 bg-red-700/10 text-[var(--danger)] hover:bg-red-700/15"
  };

  return (
    <button
      className={cn("inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55", variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusPill({
  status,
  onAdvance,
  disabled = false,
  size = "sm",
  className
}: {
  status: TaskStatus;
  onAdvance?: (nextStatus: TaskStatus) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = statusPillMeta[status] ?? statusPillMeta["Not Started"];
  const Icon = meta.icon;
  const nextStatus = getNextNaturalStatus(status);
  const pillClass = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-full border font-medium transition",
    size === "md" ? "min-h-9 px-3 py-1.5 text-sm" : "min-h-7 px-2.5 py-1 text-xs",
    onAdvance ? "cursor-pointer hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55" : "",
    className
  );
  const style = {
    color: meta.color,
    borderColor: meta.color,
    background: `color-mix(in srgb, ${meta.color} 10%, transparent)`
  };
  const content = (
    <>
      <Icon size={size === "md" ? 15 : 13} aria-hidden />
      <span>{status}</span>
    </>
  );

  if (!onAdvance) {
    return (
      <span className={pillClass} style={style}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={pillClass}
      style={style}
      disabled={disabled || !nextStatus}
      title={nextStatus ? `Advance to ${nextStatus}` : "Use the more states menu for this status"}
      aria-label={nextStatus ? `Advance status from ${status} to ${nextStatus}` : `Status is ${status}`}
      onClick={() => {
        if (nextStatus) onAdvance(nextStatus);
      }}
    >
      {content}
    </button>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-[var(--panel-strong)]", className)} aria-label={`${value}% complete`}>
      <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Field({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1 text-sm", className)}>
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-9 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm transition focus:border-[var(--accent)]";

function statutoryRelationalLabel(task: DeadlinePairTask): string | null {
  if (task.statutoryDeadlineNote) return task.statutoryDeadlineNote;
  if (!task.filing) return null;
  if (!task.filing.statutoryDays) return `${task.filing.form} - ${task.filing.authority}`;
  return `${task.filing.statutoryDays} days from ${task.filing.statutoryTrigger ?? "statutory trigger"}`;
}

export function StatutoryStop({
  label,
  dateLabel,
  note,
  compact = false,
  className
}: {
  label: string;
  dateLabel?: string;
  note?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex items-start gap-2 rounded-md border bg-orange-900/10 text-[var(--statutory-hard-stop)]", compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm", className)}
      style={{ borderColor: "color-mix(in srgb, var(--statutory-hard-stop) 38%, transparent)" }}
    >
      <Lock size={compact ? 13 : 15} className="mt-0.5 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-semibold">
          <Flag size={compact ? 12 : 14} aria-hidden />
          <span>{label}</span>
          <span className="rounded-full border px-1.5 py-0.5 text-[0.65rem] uppercase leading-none">Hard</span>
        </span>
        {dateLabel ? <span className="mt-1 block font-measure text-xs tabular-nums">{dateLabel}</span> : null}
        {note ? <span className="mt-1 block text-xs leading-relaxed opacity-85">{note}</span> : null}
      </span>
    </div>
  );
}

export function DeadlinePair({
  task,
  closingDateX,
  compact = false,
  className
}: {
  task: DeadlinePairTask;
  closingDateX: string;
  compact?: boolean;
  className?: string;
}) {
  const internalDate = getComputedDueDate(task, closingDateX);
  const statutoryDate = getComputedStatutoryDate(task, closingDateX);
  const relationalStatutory = statutoryRelationalLabel(task);
  const hasStatutory = Boolean(statutoryDate || relationalStatutory || task.filing);
  const itemClass = compact ? "gap-0.5 px-2.5 py-1.5" : "gap-1 px-3 py-2";

  return (
    <div className={cn("inline-grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", !hasStatutory ? "sm:grid-cols-1" : "", className)}>
      <div className={cn("grid rounded-md border border-teal-700/25 bg-teal-700/10 text-[var(--accent)]", itemClass)}>
        <span className="text-[0.65rem] font-semibold uppercase">Internal target</span>
        <span className={cn("font-measure font-semibold tabular-nums", compact ? "text-xs" : "text-sm")}>{formatDate(internalDate)}</span>
      </div>
      {hasStatutory ? (
        <div
          className={cn("grid rounded-md border bg-orange-900/10 text-[var(--statutory-hard-stop)]", itemClass)}
          style={{ borderColor: "color-mix(in srgb, var(--statutory-hard-stop) 38%, transparent)" }}
        >
          <span className="text-[0.65rem] font-semibold uppercase">{statutoryDate ? "Statutory hard-stop" : "Statutory trigger"}</span>
          <span className={cn("font-measure font-semibold tabular-nums", compact ? "text-xs" : "text-sm")}>
            {statutoryDate ? formatDate(statutoryDate) : relationalStatutory ?? "No calendar date"}
          </span>
          {!statutoryDate ? <span className="text-[0.65rem] font-medium uppercase opacity-80">Not plotted on calendar axis</span> : null}
        </div>
      ) : null}
    </div>
  );
}

// Inline term definition (recognition over recall): a dotted-underline anchor
// that reveals the glossary entry on hover, replacing the old chip wall. Define
// a term where it first appears instead of forcing users to memorise jargon.
export function Term({
  name,
  children,
  className
}: {
  name: keyof typeof glossary;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip label={glossary[name]}>
      <span
        className={cn(
          "cursor-help underline decoration-dotted decoration-[var(--muted)]/60 underline-offset-4",
          className
        )}
      >
        {children ?? name}
      </span>
    </Tooltip>
  );
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-md border border-[var(--line)] bg-[var(--panel)] p-2 text-xs leading-relaxed text-[var(--foreground)] shadow-xl group-hover:block">
        {label}
      </span>
    </span>
  );
}

// --- Task identity (TaskRef) ---------------------------------------------
// Progressive disclosure of a task's identity: a human-readable label by
// default, the full action text on hover, and the serial/form demoted to
// quiet anchors. Use `full` for no-hover surfaces where the complete action
// must be visible. Derive-from-action so it works with zero new data entry;
// pass `title` to override with a curated short title where one exists.
// CONFIDENTIALITY: only the standard checklist `action` is ever shown here —
// never `notes`/`comments` (status-only free text stays out of the tooltip).

export type TaskRefTask = Pick<Task, "serialNumber" | "action" | "filing">;

const CLAUSE_BOUNDARY = /[,;:]|\sand\s|\sincluding\s|\s&\s/i;

export function deriveTaskLabel(action: string, maxChars = 52): string {
  const trimmed = action.trim();
  if (!trimmed) return "";
  const boundary = trimmed.search(CLAUSE_BOUNDARY);
  let label = boundary > 0 ? trimmed.slice(0, boundary) : trimmed;
  if (label.length > maxChars) {
    label = `${label.slice(0, maxChars).replace(/\s+\S*$/, "").trimEnd()}…`;
  }
  return label.replace(/[\s.,;:&-]+$/, "").trim() || trimmed;
}

export function TaskRef({
  task,
  title,
  full: showFull = false,
  showForm = true,
  showSerial = true,
  className,
  labelClassName
}: {
  task: TaskRefTask;
  /** Curated short title; wins over the derived label when provided. */
  title?: string;
  /** Show the complete action text without tooltip-dependent truncation. */
  full?: boolean;
  showForm?: boolean;
  showSerial?: boolean;
  className?: string;
  labelClassName?: string;
}) {
  const full = task.action.trim();
  const label = (showFull ? full : title ?? deriveTaskLabel(full)).trim() || task.serialNumber;
  const hidesText = !showFull && label !== full;
  const form = task.filing?.form;

  const body = (
    <span className={cn("inline-flex min-w-0 items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "min-w-0",
          hidesText && "cursor-help underline decoration-dotted decoration-[var(--muted)]/60 underline-offset-4",
          labelClassName
        )}
      >
        {label}
      </span>
      {showForm && form ? (
        <span className="font-measure shrink-0 rounded border border-[var(--line)] px-1 py-0.5 text-[0.62em] font-medium uppercase tracking-wide text-[var(--accent)]">
          {form}
        </span>
      ) : null}
      {showSerial ? (
        <span className="font-measure shrink-0 text-[0.66em] font-medium text-[var(--muted)] opacity-70">{task.serialNumber}</span>
      ) : null}
    </span>
  );

  if (!hidesText) return body;
  return <Tooltip label={full}>{body}</Tooltip>;
}
