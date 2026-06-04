"use client";

import { GitBranch, TriangleAlert } from "lucide-react";
import { Badge, Card, SectionHeader, TaskRef } from "@/components/ui";
import { getDependencyWarnings } from "@/lib/rules";
import type { Task } from "@/lib/types";

export function DependencyLens({ tasks, allTasks }: { tasks: Task[]; allTasks: Task[] }) {
  const visibleIds = new Set(tasks.map((task) => task.id));
  const warnings = getDependencyWarnings(allTasks).filter((warning) => visibleIds.has(warning.blockedTaskId));
  const tasksById = new Map(allTasks.map((task) => [task.id, task]));
  const linked = tasks.filter((task) => task.dependencies.length > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <SectionHeader eyebrow="Sequencing lens" title="Warnings" action={<Badge tone={warnings.length ? "danger" : "success"}>{warnings.length}</Badge>} />
        <div className="grid gap-2">
          {warnings.length ? warnings.map((warning) => (
            <div key={warning.id} className="rounded-md border border-red-700/30 bg-red-700/10 p-3">
              <p className="flex items-start gap-2 text-sm font-medium text-[var(--danger)]"><TriangleAlert size={16} />{warning.label}</p>
            </div>
          )) : <p className="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">No broken sequencing detected for this filter.</p>}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Critical path" title="Dependency Map" />
        <div className="grid gap-3">
          {linked.length ? linked.map((task) => (
            <div key={task.id} className="rounded-md border border-[var(--line)] p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><GitBranch size={16} className="text-[var(--accent)]" /><TaskRef task={task} /></p>
              <div className="flex flex-wrap gap-2">
                {task.dependencies.map((dependency) => {
                  const prerequisite = tasksById.get(dependency.taskId);
                  return (
                    <Badge key={dependency.taskId} tone={prerequisite && ["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(prerequisite.status) ? "success" : "warning"}>
                      {prerequisite?.serialNumber ?? dependency.taskId}: {dependency.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )) : (
            <p className="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">No dependency-linked tasks match this filter.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
