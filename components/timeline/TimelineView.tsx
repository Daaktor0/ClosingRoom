"use client";

import { CalendarDays } from "lucide-react";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { formatDate, getComputedDueDate, timelineBuckets } from "@/lib/dateUtils";
import { useDealStore } from "@/lib/store";

export function TimelineView() {
  const { deal } = useDealStore();

  return (
    <Card>
      <SectionHeader eyebrow="Timeline" title="X-relative Deal Timeline" />
      <div className="grid gap-4 xl:grid-cols-6">
        {timelineBuckets.map((bucket) => {
          const tasks = deal.tasks.filter((task) => task.timeline === bucket);
          return (
            <div key={bucket} className="subtle-card min-h-64 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{bucket}</p>
                  <p className="text-xs text-[var(--muted)]">{tasks.length} items</p>
                </div>
                <CalendarDays size={17} className="text-[var(--accent)]" />
              </div>
              <div className="grid gap-2">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge tone={task.priority === "Critical" ? "danger" : "neutral"}>{task.serialNumber}</Badge>
                      <span className="text-xs text-[var(--muted)]">{formatDate(getComputedDueDate(task, deal.closingDateX))}</span>
                    </div>
                    <p className="text-sm leading-snug">{task.action}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">{task.owner} · {task.status}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
