"use client";

import { CalendarClock, CheckCircle2, ChevronDown, ChevronRight, FileCheck2, Flag, GitBranch, MoreHorizontal, Scale, TriangleAlert } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Badge, Button, DeadlinePair, Field, StatusPill, TaskRef, inputClass } from "@/components/ui";
import { confidentialityReminder, documentStatuses, phases, STATUS_NOTE_MAX_LENGTH, statutoryVerificationDisclaimer, taskStatuses } from "@/lib/constants";
import { deadlineCountdownLabel, formatDate, getComputedDueDate, isOverdue } from "@/lib/dateUtils";
import { getCriticalPathTasks, getDependencyWarnings, isTaskComplete } from "@/lib/rules";
import { useDealStore } from "@/lib/store";
import type { DependencyWarning, DocumentStatus, Task, TaskStatus } from "@/lib/types";
import { useDismissable } from "@/lib/useDismissable";
import { cn } from "@/lib/utils";

const naturalStatuses: TaskStatus[] = ["Not Started", "In Progress", "Under Review", "Completed"];
const sideStatuses = taskStatuses.filter((status) => !naturalStatuses.includes(status));

export function RunSheet({ tasks, allTasks, closingDateX }: { tasks: Task[]; allTasks: Task[]; closingDateX: string }) {
  const { updateTaskStatus, updateTaskEvidence, updateDocumentStatus, updateTaskNotes } = useDealStore();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const criticalIds = useMemo(() => new Set(getCriticalPathTasks(allTasks).map((task) => task.id)), [allTasks]);
  const dependencyWarnings = useMemo(() => getDependencyWarnings(allTasks), [allTasks]);
  const warningsByTask = useMemo(() => {
    const map = new Map<string, DependencyWarning[]>();
    for (const warning of dependencyWarnings) {
      const list = map.get(warning.blockedTaskId) ?? [];
      list.push(warning);
      map.set(warning.blockedTaskId, list);
    }
    return map;
  }, [dependencyWarnings]);
  const taskById = useMemo(() => new Map(allTasks.map((task) => [task.id, task])), [allTasks]);
  const sortedTasks = useMemo(
    () => tasks.slice().sort((a, b) => compareRunSheetTasks(a, b, closingDateX, criticalIds, warningsByTask)),
    [closingDateX, criticalIds, tasks, warningsByTask]
  );

  const grouped = phases.map((item) => ({
    phase: item,
    tasks: sortedTasks.filter((task) => task.phase === item)
  })).filter(({ tasks }) => tasks.length > 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4">
        {grouped.length ? grouped.map(({ phase, tasks }) => (
          <section key={phase} className="rounded-md border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Run Sheet</p>
                <h3 className="font-display text-xl font-semibold">{phase}</h3>
              </div>
              <Badge>{tasks.length}</Badge>
            </div>
            <div className="grid gap-3 p-3 lg:grid-cols-2 2xl:grid-cols-3">
              {tasks.map((task) => (
                <RunSheetCard
                  key={task.id}
                  task={task}
                  closingDateX={closingDateX}
                  isCritical={criticalIds.has(task.id)}
                  dependencyWarnings={warningsByTask.get(task.id) ?? []}
                  taskById={taskById}
                  menuOpen={openMenuId === task.id}
                  expanded={expandedTaskId === task.id}
                  onToggleMenu={() => setOpenMenuId((value) => (value === task.id ? null : task.id))}
                  onDismissMenu={() => setOpenMenuId(null)}
                  onToggleExpanded={() => setExpandedTaskId((value) => (value === task.id ? null : task.id))}
                  onStatusChange={(status) => {
                    updateTaskStatus(task.id, status);
                    setOpenMenuId(null);
                  }}
                  onToggleEvidence={() => updateTaskEvidence(task.id, { satisfied: !task.evidence.satisfied })}
                  onExternalLinkChange={(externalLink) => updateTaskEvidence(task.id, { externalLink })}
                  onDocumentStatusChange={(documentStatus) => updateDocumentStatus(task.id, documentStatus)}
                  onNotesChange={(notes) => updateTaskNotes(task.id, notes)}
                />
              ))}
            </div>
          </section>
        )) : (
          <p className="rounded-md border border-dashed border-[var(--line)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">No tasks match the current Closing Table filter.</p>
        )}
      </div>
    </div>
  );
}

function RunSheetCard({
  task,
  closingDateX,
  isCritical,
  dependencyWarnings,
  taskById,
  menuOpen,
  expanded,
  onToggleMenu,
  onDismissMenu,
  onToggleExpanded,
  onStatusChange,
  onToggleEvidence,
  onExternalLinkChange,
  onDocumentStatusChange,
  onNotesChange
}: {
  task: Task;
  closingDateX: string;
  isCritical: boolean;
  dependencyWarnings: DependencyWarning[];
  taskById: Map<string, Task>;
  menuOpen: boolean;
  expanded: boolean;
  onToggleMenu: () => void;
  onDismissMenu: () => void;
  onToggleExpanded: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onToggleEvidence: () => void;
  onExternalLinkChange: (externalLink: string) => void;
  onDocumentStatusChange: (documentStatus: DocumentStatus) => void;
  onNotesChange: (notes: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const overdue = isOverdue(task, closingDateX);
  const countdown = deadlineCountdownLabel(task, closingDateX);
  const complete = isTaskComplete(task);
  useDismissable(menuRef, onDismissMenu, menuOpen);

  return (
    <article
      className={cn(
        "relative flex min-h-[23rem] flex-col rounded-md border border-[var(--line)] bg-[var(--background)] p-4 shadow-sm",
        isCritical ? "border-l-4 border-l-[var(--foreground)]" : "border-l-4 border-l-transparent",
        task.blocker && !complete ? "bg-red-700/5" : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug"><TaskRef task={task} /></p>
          <p className="mt-1 text-xs text-[var(--muted)]">{task.owner}</p>
        </div>
        <div className="flex shrink-0 items-start gap-1.5">
          <StatusPill status={task.status} onAdvance={onStatusChange} />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              className="inline-flex min-h-7 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)] px-2 text-[var(--muted)] transition hover:bg-[var(--panel-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              aria-label="More status options"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen ? <SideStateMenu current={task.status} onSelect={onStatusChange} /> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.blocker && !complete ? <Badge tone="danger"><TriangleAlert size={12} />Blocker</Badge> : null}
        {isCritical ? <Badge><Scale size={12} />Critical path</Badge> : null}
        {dependencyWarnings.length ? <Badge tone="warning"><GitBranch size={12} />Sequencing</Badge> : null}
        {overdue ? <Badge tone="danger"><CalendarClock size={12} />Overdue</Badge> : null}
        {task.filing ? <Badge tone="statutory">{task.filing.form}</Badge> : null}
      </div>

      <DeadlinePair task={task} closingDateX={closingDateX} compact className="mt-4" />
      {countdown ? <p className="mt-2 font-measure text-xs text-[var(--muted)]">{formatDate(getComputedDueDate(task, closingDateX))} - {countdown}</p> : null}

      <div className="mt-4 grid gap-2 text-xs text-[var(--muted)]">
        <p>Document: <span className="font-medium text-[var(--foreground)]">{task.documentStatus}</span></p>
        <p>Reviewer: <span className="font-medium text-[var(--foreground)]">{task.reviewer}</span></p>
      </div>

      {task.dependencies.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.dependencies.map((dependency) => {
            const prerequisite = taskById.get(dependency.taskId);
            const broken = dependencyWarnings.some((warning) => warning.prerequisiteTaskId === dependency.taskId);
            return (
              <span
                key={`${dependency.taskId}->${task.id}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.68rem] font-medium",
                  broken
                    ? "border-red-700/30 bg-red-700/10 text-[var(--danger)]"
                    : "border-[var(--line)] bg-[var(--panel-strong)] text-[var(--muted)]"
                )}
              >
                <Flag size={11} aria-hidden />
                blocked by {prerequisite?.serialNumber ?? dependency.label}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onToggleEvidence}
          className={cn(
            "flex w-full items-start gap-2 rounded-md border p-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
            task.evidence.satisfied
              ? "border-green-700/30 bg-green-700/10 text-[var(--success)]"
              : "border-yellow-700/30 bg-yellow-700/10 text-[var(--warning)]"
          )}
        >
          <FileCheck2 size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <span className="block font-semibold">{task.evidence.satisfied ? "Evidence satisfied" : "Evidence missing"}</span>
            <span className="mt-1 block text-xs opacity-85">{task.evidence.label}</span>
          </span>
        </button>

        <Button className="mt-3 w-full" variant="secondary" onClick={onToggleExpanded}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {expanded ? "Hide detail" : "Show detail"}
        </Button>
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-4 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Evidence checklist</p>
            <p className="mt-1 text-sm">{task.evidence.label}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">Required: {task.evidence.required ? "Yes" : "No"} - Document category: {task.documentCategory}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Document status">
              <select className={inputClass} value={task.documentStatus} onChange={(event) => onDocumentStatusChange(event.target.value as DocumentStatus)}>
                {documentStatuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="External register link">
              <input
                className={inputClass}
                value={task.evidence.externalLink ?? ""}
                onChange={(event) => onExternalLinkChange(event.target.value)}
                placeholder="Paste DMS / SharePoint / Drive URL only"
              />
            </Field>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Dependencies</p>
            <p className="mt-1 text-sm">{task.dependencies.length ? task.dependencies.map((item) => item.label).join("; ") : "No dependencies recorded."}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Deadline basis</p>
            <p className="mt-1 text-sm">
              Internal: {formatDate(getComputedDueDate(task, closingDateX))}
              {task.filing?.statutoryDays ? `; statutory: ${task.filing.statutoryDays} days from ${task.filing.statutoryTrigger}` : ""}
              {task.statutoryDeadlineNote && !task.filing?.statutoryDays ? `; ${task.statutoryDeadlineNote}` : ""}
            </p>
            {task.filing || task.statutoryDeadlineNote ? (
              <p className="mt-2 rounded-md border border-yellow-700/30 bg-yellow-700/10 p-2 text-xs leading-relaxed text-[var(--warning)]">
                {statutoryVerificationDisclaimer}
              </p>
            ) : null}
          </div>

          <Field label="Status notes">
            <textarea
              className={`${inputClass} min-h-20`}
              maxLength={STATUS_NOTE_MAX_LENGTH}
              value={task.notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder={confidentialityReminder}
            />
            <span className="text-xs text-[var(--muted)]">{task.notes.length}/{STATUS_NOTE_MAX_LENGTH}</span>
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>Source: {task.sourceReference}</Badge>
            <Badge>Reviewer: {task.reviewer}</Badge>
            {task.filing ? <Badge tone="accent">{task.filing.form} - {task.filing.authority}</Badge> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SideStateMenu({ current, onSelect }: { current: TaskStatus; onSelect: (status: TaskStatus) => void }) {
  return (
    <div className="absolute right-0 top-9 z-30 w-56 rounded-md border border-[var(--line)] bg-[var(--panel)] p-2 shadow-xl">
      <p className="px-2 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">More states</p>
      {sideStatuses.map((status) => (
        <button
          key={status}
          type="button"
          disabled={status === current}
          onClick={() => onSelect(status)}
          className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm transition hover:bg-[var(--panel-strong)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span>{status}</span>
          {status === current ? <CheckCircle2 size={14} aria-hidden /> : null}
        </button>
      ))}
    </div>
  );
}

function compareRunSheetTasks(
  a: Task,
  b: Task,
  closingDateX: string,
  criticalIds: Set<string>,
  warningsByTask: Map<string, DependencyWarning[]>
): number {
  const aComplete = isTaskComplete(a);
  const bComplete = isTaskComplete(b);
  if (aComplete !== bComplete) return Number(aComplete) - Number(bComplete);

  const blockerDelta = Number(b.blocker) - Number(a.blocker);
  if (blockerDelta !== 0) return blockerDelta;

  const criticalDelta = Number(criticalIds.has(b.id)) - Number(criticalIds.has(a.id));
  if (criticalDelta !== 0) return criticalDelta;

  const sequencingDelta = Number(Boolean(warningsByTask.get(b.id)?.length)) - Number(Boolean(warningsByTask.get(a.id)?.length));
  if (sequencingDelta !== 0) return sequencingDelta;

  const overdueDelta = Number(isOverdue(b, closingDateX)) - Number(isOverdue(a, closingDateX));
  if (overdueDelta !== 0) return overdueDelta;

  return Number(getComputedDueDate(a, closingDateX) ?? Number.MAX_SAFE_INTEGER) - Number(getComputedDueDate(b, closingDateX) ?? Number.MAX_SAFE_INTEGER)
    || a.serialNumber.localeCompare(b.serialNumber, "en", { numeric: true });
}
