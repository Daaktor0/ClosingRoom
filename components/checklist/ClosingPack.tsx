"use client";

import { AlertOctagon, CheckCircle2, FileWarning, ListChecks, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, Masthead, ProgressBar, SectionHeader, StatusPill, TaskRef } from "@/components/ui";
import type { Deal, ReadinessResult, Task } from "@/lib/types";

const satisfiedStatuses = ["Completed", "Waived", "Converted to CS", "Not Applicable"];

export function ClosingPack({
  deal,
  readiness,
  onOpenChecklist
}: {
  deal: Deal;
  readiness: ReadinessResult;
  onOpenChecklist?: () => void;
}) {
  const packTasks = deal.tasks.filter((task) => task.mandatoryForClosing || task.timeline === "X");

  return (
    <div className="grid gap-4">
      <Card>
        <Masthead
          eyebrow="The Closing Pack"
          title={readiness.ready ? "Go: ready to close" : "No-go: closing issues remain"}
          subtitle="A closing-day board for CP satisfaction, mandatory prerequisites, evidence, agreed-form documents, waivers, conversions, and final pack completeness."
          action={onOpenChecklist ? (
            <Button variant="secondary" onClick={onOpenChecklist}>
              <ListChecks size={16} /> Open Closing Table
            </Button>
          ) : null}
        >
          <div className="mt-1 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <ProgressBar value={readiness.score} />
            <Badge tone={readiness.ready ? "success" : "danger"}>{readiness.score}% readiness</Badge>
          </div>
        </Masthead>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <PackBucket title="Pending CPs" tasks={readiness.pendingCps} tone="danger" />
        <PackBucket title="Mandatory incomplete" tasks={readiness.mandatoryIncomplete} tone="danger" />
        <PackBucket title="Missing evidence" tasks={readiness.missingEvidence} tone="warning" detail={(task) => task.evidence.label} />
        <PackBucket title="Missing agreed form" tasks={readiness.missingAgreedForm} tone="warning" detail={(task) => task.documentCategory} />
        <PackBucket title="Waived CPs" tasks={readiness.waivedCps} tone="neutral" />
        <PackBucket title="Converted to CS" tasks={readiness.convertedToCs} tone="neutral" />
      </div>

      <Card>
        <SectionHeader eyebrow="Final Closing Pack" title="Final Closing Pack Checklist" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packTasks.map((task) => {
            const satisfied = satisfiedStatuses.includes(task.status);
            return (
              <div key={task.id} className="flex min-w-0 items-start gap-3 rounded-md border border-[var(--line)] p-3">
                <span className={`mt-0.5 shrink-0 ${satisfied ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                  {satisfied ? <ShieldCheck size={17} /> : <FileWarning size={17} />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium"><TaskRef task={task} /></p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{task.evidence.label}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={task.status} />
                    <Badge>{task.documentStatus}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function PackBucket({
  title,
  tasks,
  tone,
  detail
}: {
  title: string;
  tasks: Task[];
  tone: "danger" | "warning" | "neutral";
  detail?: (task: Task) => string;
}) {
  const emptyTone = tone === "neutral" ? "neutral" : "success";

  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={tasks.length ? "text-[var(--danger)]" : "text-[var(--success)]"}>
            {tasks.length ? <AlertOctagon size={17} /> : <CheckCircle2 size={17} />}
          </span>
          <p className="text-sm font-semibold">{title}</p>
        </div>
        <Badge tone={tasks.length ? tone : emptyTone}>{tasks.length}</Badge>
      </div>
      {tasks.length ? (
        <ul className="max-h-52 space-y-2 overflow-auto pr-1 text-xs leading-relaxed text-[var(--muted)] scrollbar-thin">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-md border border-[var(--line)] bg-[var(--background)] p-2">
              <TaskRef task={task} />
              {detail ? <span className="mt-1 block text-[var(--muted)]">{detail(task)}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">Clear.</p>
      )}
    </div>
  );
}
