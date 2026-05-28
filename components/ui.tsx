import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("card p-4", className)}>{children}</section>;
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
        {eyebrow ? <p className="mb-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{eyebrow}</p> : null}
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  className?: string;
}) {
  const toneClass = {
    neutral: "bg-[var(--panel-strong)] text-[var(--foreground)]",
    success: "border-green-700/30 bg-green-700/10 text-[var(--success)]",
    warning: "border-yellow-700/30 bg-yellow-700/10 text-[var(--warning)]",
    danger: "border-red-700/30 bg-red-700/10 text-[var(--danger)]",
    accent: "border-teal-700/30 bg-teal-700/10 text-[var(--accent)]"
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
    primary: "border-transparent bg-[var(--foreground)] text-[var(--background)] hover:opacity-90",
    secondary: "border-[var(--line)] bg-[var(--panel)] text-[var(--foreground)] hover:bg-[var(--panel-strong)]",
    ghost: "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--panel-strong)]",
    danger: "border-red-700/30 bg-red-700/10 text-[var(--danger)] hover:bg-red-700/15"
  };

  return (
    <button
      className={cn("inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition", variants[variant], className)}
      {...props}
    >
      {children}
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
  "min-h-9 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm";

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
