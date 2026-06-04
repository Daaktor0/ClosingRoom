"use client";

import { CalendarRange, GitBranch, Lock, MousePointer2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SequenceFlow } from "@/components/timeline/SequenceFlow";
import { TimelineAxis } from "@/components/timeline/TimelineAxis";
import { Badge, Button, Card, DeadlinePair, Field, Masthead, StatutoryStop, StatusPill, TaskRef, inputClass } from "@/components/ui";
import { phases } from "@/lib/constants";
import { formatDate, toInputDate } from "@/lib/dateUtils";
import { useDealStore } from "@/lib/store";
import { buildTimelineModel, getStatutoryTriggerLabel, type TimelineModel, type TimelineTaskRow, type TimelineZoom } from "@/lib/timeline";
import type { Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TimelineView() {
  const { deal, setClosingDate } = useDealStore();
  const [zoom, setZoom] = useState<TimelineZoom>("week");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const model = useMemo(() => buildTimelineModel(deal), [deal]);

  useEffect(() => {
    if (!model.hasClosingDate) {
      setSelectedTaskId(null);
      return;
    }
    if (!selectedTaskId || !model.allRows.some((row) => row.task.id === selectedTaskId)) {
      setSelectedTaskId(model.defaultSelectedTaskId);
    }
  }, [model, selectedTaskId]);

  if (!model.hasClosingDate) {
    return <TimelineOnboarding deal={deal} onSetClosingDate={setClosingDate} />;
  }

  const selectedRow = model.allRows.find((row) => row.task.id === selectedTaskId) ?? model.allRows.find((row) => row.task.id === model.defaultSelectedTaskId) ?? null;
  const subtitle = `${formatDate(model.closingDate)} is the X anchor. ${model.stats.preClose} pre-close sequence items, ${model.stats.postClose} post-close calendar items, ${model.stats.blockers} blockers, ${model.stats.statutoryPlotted} statutory hard-stops plotted, ${model.stats.statutoryUnplotted} statutory triggers unplotted.`;

  return (
    <div className="grid gap-4">
      <Card>
        <Masthead
          eyebrow="Timeline"
          title="Real Deal Timeline"
          subtitle={subtitle}
          action={<ZoomControl zoom={zoom} onChange={setZoom} />}
        />
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="accent"><GitBranch size={12} />Act I sequence</Badge>
          <Badge tone="accent"><CalendarRange size={12} />Act II calendar</Badge>
          <Badge tone="statutory"><Lock size={12} />Statutory hard-stops</Badge>
          <Badge><MousePointer2 size={12} />Click a node or marker for the decision card</Badge>
        </div>
        <div className="grid gap-5">
          <SequenceFlow model={model} selectedTaskId={selectedRow?.task.id ?? null} onSelectTask={setSelectedTaskId} />
          <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Act II - After Close</p>
                <h3 className="font-display text-2xl font-semibold">Statutory and post-closing calendar</h3>
              </div>
              <Badge tone="statutory">{model.stats.postClose} post-close items</Badge>
            </div>
            <TimelineAxis model={model} zoom={zoom} selectedTaskId={selectedRow?.task.id ?? null} onSelectTask={setSelectedTaskId} />
          </section>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SelectedTaskCard row={selectedRow} closingDateX={deal.closingDateX} />
        <div className="grid gap-4">
          <UnplottedStatutoryRail model={model} onSelectTask={setSelectedTaskId} />
          <DependencyRail model={model} onSelectTask={setSelectedTaskId} />
        </div>
      </div>
    </div>
  );
}

function ZoomControl({ zoom, onChange }: { zoom: TimelineZoom; onChange: (zoom: TimelineZoom) => void }) {
  return (
    <div className="inline-flex rounded-md border border-[var(--line)] bg-[var(--panel)] p-1">
      {(["week", "month"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "min-h-8 rounded px-3 text-sm font-medium capitalize transition",
            zoom === value ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted)] hover:bg-[var(--panel-strong)]"
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function TimelineOnboarding({ deal, onSetClosingDate }: { deal: Deal; onSetClosingDate: (value: string) => void }) {
  const [date, setDate] = useState(toInputDate(new Date()));

  return (
    <div className="grid gap-4">
      <Card>
        <Masthead
          eyebrow="Timeline"
          title="Set Closing Date X to generate the timeline"
          subtitle="The timeline is driven from X. Set the closing date once and the sequence, statutory clocks, blockers, and post-close calendar will build automatically."
          action={
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (date) onSetClosingDate(date);
              }}
            >
              <Field label="Closing Date X">
                <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </Field>
              <Button type="submit">Set X</Button>
            </form>
          }
        />
      </Card>

      <Card>
        <Masthead eyebrow="Backlog rail" title="Unscheduled until X is set" subtitle={`${deal.tasks.length} template items are ready to sequence and plot once the closing date is known.`} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {phases.map((phase) => {
            const tasks = deal.tasks.filter((task) => task.phase === phase);
            return (
              <div key={phase} className="subtle-card p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="font-display text-lg font-semibold">{phase}</p>
                  <Badge>{tasks.length}</Badge>
                </div>
                <div className="grid gap-2">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
                      <p className="text-sm font-medium"><TaskRef task={task} /></p>
                      <p className="mt-1 font-measure text-xs text-[var(--muted)]">{task.timeline}</p>
                    </div>
                  ))}
                  {tasks.length > 5 ? <p className="text-xs text-[var(--muted)]">+{tasks.length - 5} more items</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function SelectedTaskCard({ row, closingDateX }: { row: TimelineTaskRow | null; closingDateX: string }) {
  if (!row) {
    return (
      <Card>
        <Masthead eyebrow="Decision card" title="Select a timeline item" subtitle="Click a sequence node or calendar marker to inspect its structured status, deadlines, and sequencing position." />
      </Card>
    );
  }

  const task = row.task;
  const triggerLabel = getStatutoryTriggerLabel(task);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-semibold leading-tight"><TaskRef task={task} /></h3>
        </div>
        <StatusPill status={task.status} size="md" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Phase" value={task.phase} />
        <Fact label="Owner" value={task.owner} />
        <Fact label="Priority" value={task.priority} />
        <Fact label="Document" value={task.documentStatus} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">Deadline language</p>
        <DeadlinePair task={task} closingDateX={closingDateX} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {row.isOverdue ? <Badge tone="danger"><TriangleAlert size={12} />Overdue</Badge> : null}
        {row.isBlocker ? <Badge tone="danger">Closing blocker</Badge> : null}
        {row.isCritical ? <Badge>Critical path</Badge> : null}
        {row.statutoryPoint ? <Badge tone="statutory">Plotted statutory stop</Badge> : null}
        {row.unplottedStatutory ? <Badge tone="statutory">Unplotted statutory trigger</Badge> : null}
      </div>

      {triggerLabel ? (
        <div className="mt-5">
          <StatutoryStop
            label={task.filing?.form ?? task.serialNumber}
            dateLabel={row.statutoryPoint ? formatDate(row.statutoryPoint.date) : undefined}
            note={row.statutoryPoint ? task.filing?.statutoryNote : triggerLabel}
          />
        </div>
      ) : null}

      {row.dependencyWarnings.length ? (
        <div className="mt-5 rounded-md border border-yellow-700/30 bg-yellow-700/10 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--warning)]"><GitBranch size={15} />Sequencing warnings</p>
          <ul className="grid gap-1 text-sm text-[var(--foreground)]">
            {row.dependencyWarnings.map((warning) => <li key={warning.id}>{warning.label}</li>)}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)]/40 p-3">
      <p className="text-[0.65rem] font-semibold uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function UnplottedStatutoryRail({ model, onSelectTask }: { model: TimelineModel; onSelectTask: (taskId: string) => void }) {
  return (
    <Card>
      <Masthead
        eyebrow="Statutory triggers"
        title="Not plotted on the calendar axis"
        subtitle="These retain legal meaning, but their clock runs from a non-X event such as a resolution or internal record trigger."
        action={<Badge tone={model.unplottedStatutory.length ? "statutory" : "success"}>{model.unplottedStatutory.length}</Badge>}
      />
      {model.unplottedStatutory.length ? (
        <div className="grid gap-3">
          {model.unplottedStatutory.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTask(item.task.id)}
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-left transition hover:bg-[var(--panel-strong)]"
            >
              <StatutoryStop label={item.label} note={item.detail} compact />
              <p className="mt-2 text-sm font-medium"><TaskRef task={item.task} /></p>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">Every statutory item has a plotted calendar date for this X.</p>
      )}
    </Card>
  );
}

function DependencyRail({ model, onSelectTask }: { model: TimelineModel; onSelectTask: (taskId: string) => void }) {
  const tasksById = new Map(model.allRows.map((row) => [row.task.id, row.task]));

  return (
    <Card>
      <Masthead
        eyebrow="Sequencing"
        title="Dependency warnings"
        subtitle="Blocked sequencing remains visible beside the calendar without turning the axis into a spreadsheet."
        action={<Badge tone={model.dependencyWarnings.length ? "warning" : "success"}>{model.dependencyWarnings.length}</Badge>}
      />
      {model.dependencyWarnings.length ? (
        <div className="grid gap-2">
          {model.dependencyWarnings.map((warning) => {
            const task = tasksById.get(warning.blockedTaskId);
            return (
              <button
                key={warning.id}
                type="button"
                onClick={() => task && onSelectTask(task.id)}
                className="rounded-md border border-yellow-700/30 bg-yellow-700/10 p-3 text-left text-sm transition hover:bg-yellow-700/15"
              >
                <p className="flex items-start gap-2 text-[var(--warning)]"><GitBranch size={15} className="mt-0.5 shrink-0" />{warning.label}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">No broken sequencing detected.</p>
      )}
    </Card>
  );
}
