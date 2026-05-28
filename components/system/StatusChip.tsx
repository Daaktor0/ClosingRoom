"use client";

import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Loader,
  Scale,
  Search,
  User
} from "lucide-react";
import type { TaskStatus } from "@/lib/types";

const STATUS_META: Record<TaskStatus, { color: string; icon: typeof CheckCircle2 }> = {
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

export function StatusChip({ status, size = 14 }: { status: TaskStatus; size?: number }) {
  const meta = STATUS_META[status] ?? STATUS_META["Not Started"];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        color: meta.color,
        borderColor: meta.color,
        background: `color-mix(in srgb, ${meta.color} 10%, transparent)`
      }}
    >
      <Icon size={size} aria-hidden />
      {status}
    </span>
  );
}
