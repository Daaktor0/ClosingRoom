"use client";

import { Flame } from "lucide-react";
import { Badge, Card, ProgressBar, SectionHeader, TaskRef } from "@/components/ui";
import { riskCategories } from "@/lib/constants";
import { isTaskComplete } from "@/lib/rules";
import type { Task } from "@/lib/types";
import { percent } from "@/lib/utils";

export function RiskLens({ tasks }: { tasks: Task[] }) {
  const max = Math.max(...riskCategories.map((risk) => tasks.filter((task) => task.riskCategory === risk).length), 1);

  return (
    <Card>
      <SectionHeader eyebrow="Risk lens" title="Risk Heatmap" />
      <p className="mb-4 text-sm text-[var(--muted)]">Risk distribution for the current Closing Table filter. Completed tasks remain included so the open count has context.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {riskCategories.map((risk) => {
          const riskTasks = tasks.filter((task) => task.riskCategory === risk);
          const open = riskTasks.filter((task) => !isTaskComplete(task));
          const intensity = percent(riskTasks.length, max);
          const highTone = risk === "Closing blocker" || risk === "Regulatory filing risk" || risk === "Legal validity risk";
          return (
            <div key={risk} className="subtle-card p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold"><Flame size={17} className={highTone ? "text-[var(--danger)]" : "text-[var(--accent)]"} />{risk}</p>
                <Badge tone={open.length ? (highTone ? "danger" : "warning") : "success"}>{open.length} open</Badge>
              </div>
              <ProgressBar value={intensity} />
              <div className="mt-3 grid gap-2">
                {riskTasks.length ? riskTasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-[var(--line)] p-2 text-xs">
                    <p className="font-medium"><TaskRef task={task} /></p>
                    <p className="mt-1 text-[var(--muted)]">{task.status}</p>
                  </div>
                )) : (
                  <p className="rounded-md border border-dashed border-[var(--line)] p-2 text-xs text-[var(--muted)]">No tasks in this category for the current filter.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
