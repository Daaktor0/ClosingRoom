"use client";

import { CheckCircle2, Flag, GitBranch, Landmark, Scale, TriangleAlert } from "lucide-react";
import { Badge, StatusPill, TaskRef } from "@/components/ui";
import { phases } from "@/lib/constants";
import { formatDate } from "@/lib/dateUtils";
import type { TimelineModel, TimelineTaskRow } from "@/lib/timeline";
import type { Dependency, Phase, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const preClosePhases = phases.filter((phase) => phase !== "Post-Closing Actions");

export function SequenceFlow({
  model,
  selectedTaskId,
  onSelectTask
}: {
  model: TimelineModel;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) {
  const taskById = new Map(model.allRows.map((row) => [row.task.id, row.task]));
  const brokenDependencyIds = new Set(model.dependencyWarnings.map((warning) => `${warning.prerequisiteTaskId}->${warning.blockedTaskId}`));

  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Act I - Before Close</p>
            <h3 className="font-display text-2xl font-semibold">Sequence to Closing Date X</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{model.stats.preClose} pre-close items</Badge>
            <Badge tone={model.stats.blockers ? "danger" : "success"}>{model.stats.blockers} blockers</Badge>
            <Badge tone={model.dependencyWarnings.length ? "warning" : "success"}>{model.dependencyWarnings.length} sequencing flags</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(190px,0.42fr)]">
        {preClosePhases.map((phase) => (
          <SequenceColumn
            key={phase}
            phase={phase}
            rows={model.preCloseRowsByPhase[phase]}
            taskById={taskById}
            brokenDependencyIds={brokenDependencyIds}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
          />
        ))}

        <ClosePivot closingDate={model.closingDate} />
      </div>
    </section>
  );
}

function SequenceColumn({
  phase,
  rows,
  taskById,
  brokenDependencyIds,
  selectedTaskId,
  onSelectTask
}: {
  phase: Phase;
  rows: TimelineTaskRow[];
  taskById: Map<string, Task>;
  brokenDependencyIds: Set<string>;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--background)]">
      <div className="border-b border-[var(--line)] p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-lg font-semibold leading-tight">{phase}</p>
          <Badge>{rows.length}</Badge>
        </div>
      </div>

      <div className="grid gap-2 p-2">
        {rows.length ? rows.map((row) => (
          <SequenceNode
            key={row.task.id}
            row={row}
            taskById={taskById}
            brokenDependencyIds={brokenDependencyIds}
            selected={selectedTaskId === row.task.id}
            onSelectTask={onSelectTask}
          />
        )) : (
          <p className="rounded-md border border-dashed border-[var(--line)] p-3 text-sm text-[var(--muted)]">No pre-close items in this phase.</p>
        )}
      </div>
    </div>
  );
}

function SequenceNode({
  row,
  taskById,
  brokenDependencyIds,
  selected,
  onSelectTask
}: {
  row: TimelineTaskRow;
  taskById: Map<string, Task>;
  brokenDependencyIds: Set<string>;
  selected: boolean;
  onSelectTask: (taskId: string) => void;
}) {
  const task = row.task;

  return (
    <button
      type="button"
      onClick={() => onSelectTask(task.id)}
      className={cn(
        "rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-left shadow-sm transition hover:bg-[var(--panel-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        row.isCritical ? "border-l-4 border-l-[var(--foreground)]" : "border-l-4 border-l-transparent",
        row.isBlocker ? "bg-red-700/5" : "",
        selected ? "ring-2 ring-[var(--accent)]/45" : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold leading-snug"><TaskRef task={task} /></p>
        {row.isComplete ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--success)]" aria-hidden /> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusPill status={task.status} />
        {row.isBlocker ? <Badge tone="danger"><TriangleAlert size={12} />Blocker</Badge> : null}
        {row.isCritical ? <Badge><Scale size={12} />Critical</Badge> : null}
        {task.dependencies.length ? <Badge tone={row.dependencyWarnings.length ? "warning" : "neutral"}><GitBranch size={12} />Sequencing</Badge> : null}
      </div>

      {task.dependencies.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.dependencies.map((dependency) => (
            <BlockedByTag
              key={`${dependency.taskId}->${task.id}`}
              dependency={dependency}
              taskId={task.id}
              taskById={taskById}
              broken={brokenDependencyIds.has(`${dependency.taskId}->${task.id}`)}
            />
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-xs text-[var(--muted)]">{task.owner}</p>
    </button>
  );
}

function BlockedByTag({
  dependency,
  taskId,
  taskById,
  broken
}: {
  dependency: Dependency;
  taskId: string;
  taskById: Map<string, Task>;
  broken: boolean;
}) {
  const prerequisite = taskById.get(dependency.taskId);
  const label = prerequisite?.serialNumber ?? dependency.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.68rem] font-medium",
        broken
          ? "border-red-700/30 bg-red-700/10 text-[var(--danger)]"
          : "border-[var(--line)] bg-[var(--panel-strong)] text-[var(--muted)]"
      )}
      title={dependency.label}
      data-blocked-task={taskId}
    >
      <Flag size={11} aria-hidden />
      blocked by {label}
    </span>
  );
}

function ClosePivot({ closingDate }: { closingDate: Date | null }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-md border border-[var(--accent)]/35 bg-teal-700/10 p-4 text-center text-[var(--accent)]">
      <div>
        <Landmark className="mx-auto mb-3" size={24} aria-hidden />
        <p className="font-display text-3xl font-semibold leading-none">◆</p>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em]">Close X</p>
        <p className="mt-2 font-measure text-xs tabular-nums">{formatDate(closingDate)}</p>
      </div>
    </div>
  );
}
