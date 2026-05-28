"use client";

import { Flame } from "lucide-react";
import { Badge, Card, ProgressBar, SectionHeader } from "@/components/ui";
import { riskCategories } from "@/lib/constants";
import { useDealStore } from "@/lib/store";
import { percent } from "@/lib/utils";

export function RiskHeatmap() {
  const { deal } = useDealStore();
  const max = Math.max(...riskCategories.map((risk) => deal.tasks.filter((task) => task.riskCategory === risk).length), 1);

  return (
    <Card>
      <SectionHeader eyebrow="Risk" title="Risk Heatmap" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {riskCategories.map((risk) => {
          const tasks = deal.tasks.filter((task) => task.riskCategory === risk);
          const open = tasks.filter((task) => !["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status));
          const intensity = percent(tasks.length, max);
          const highTone = risk === "Closing blocker" || risk === "Regulatory filing risk" || risk === "Legal validity risk";
          return (
            <div key={risk} className="subtle-card p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold"><Flame size={17} className={highTone ? "text-[var(--danger)]" : "text-[var(--accent)]"} />{risk}</p>
                <Badge tone={open.length ? (highTone ? "danger" : "warning") : "success"}>{open.length} open</Badge>
              </div>
              <ProgressBar value={intensity} />
              <div className="mt-3 grid gap-2">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-[var(--line)] p-2 text-xs">
                    <p className="font-medium">{task.serialNumber} · {task.status}</p>
                    <p className="mt-1 text-[var(--muted)]">{task.action}</p>
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
