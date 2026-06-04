"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, ListChecks, Scale, Settings, ShieldCheck } from "lucide-react";
import { ReadinessRing } from "@/components/system/ReadinessRing";
import { Badge, BriefHeadline, Button, Card, DeadlinePair, Field, StatusPill, TaskRef, inputClass } from "@/components/ui";
import { toInputDate } from "@/lib/dateUtils";
import type { BriefInstrumentRead, BriefModel, BriefReadKind } from "@/lib/brief";
import type { Priority, Task } from "@/lib/types";

export function TheBrief({
  model,
  onSetClosingDate,
  onOpenClosingPack,
  onOpenChecklist,
  onOpenTimeline
}: {
  model: BriefModel;
  onSetClosingDate: (value: string) => void;
  onOpenClosingPack: () => void;
  onOpenChecklist: () => void;
  onOpenTimeline: () => void;
}) {
  if (!model.hasClosingDate) {
    return <BriefOnboarding model={model} onSetClosingDate={onSetClosingDate} />;
  }

  return (
    <div className="grid gap-5">
      <Card className="p-6 lg:p-7">
        <div className="grid gap-7 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          <button
            type="button"
            onClick={onOpenClosingPack}
            className="group flex justify-center rounded-md p-2 text-left transition hover:bg-[var(--panel-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] lg:justify-start"
            aria-label="Open the Closing Pack"
          >
            <ReadinessRing score={model.readiness.score} ready={model.readiness.ready} label="Open Closing Pack" />
          </button>

          <div className="min-w-0">
            <BriefHeadline kicker="The Brief">{model.headline}</BriefHeadline>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone={model.disposition === "ready" ? "success" : model.disposition === "on-track" ? "accent" : "danger"}>
                {dispositionLabel(model.disposition)}
              </Badge>
              <Badge>{model.companyName}</Badge>
              <Badge>{model.investorName}</Badge>
              {model.daysToClose !== null ? <Badge>{daysToCloseLabel(model.daysToClose)}</Badge> : null}
            </div>
          </div>
        </div>
      </Card>

      <NextBestActionCard
        task={model.nextBestAction}
        closingDateX={model.closingDateX}
        ready={model.readiness.ready}
        onOpenChecklist={onOpenChecklist}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <InstrumentReadCard
          icon={<AlertTriangle size={18} />}
          read={model.reads.blockers}
          closingDateX={model.closingDateX}
          onOpen={onOpenChecklist}
        />
        <InstrumentReadCard
          icon={<CalendarClock size={18} />}
          read={model.reads.statutory}
          closingDateX={model.closingDateX}
          onOpen={onOpenTimeline}
        />
        <InstrumentReadCard
          icon={<Scale size={18} />}
          read={model.reads["critical-path"]}
          closingDateX={model.closingDateX}
          onOpen={onOpenTimeline}
        />
      </div>
    </div>
  );
}

function BriefOnboarding({ model, onSetClosingDate }: { model: BriefModel; onSetClosingDate: (value: string) => void }) {
  const [date, setDate] = useState(toInputDate(new Date()));

  return (
    <Card className="p-6 lg:p-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <BriefHeadline kicker="The Brief">{model.headline}</BriefHeadline>
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
          <Button type="submit">
            <Settings size={16} /> Set Closing Date X
          </Button>
        </form>
      </div>
    </Card>
  );
}

function NextBestActionCard({
  task,
  closingDateX,
  ready,
  onOpenChecklist
}: {
  task: Task | null;
  closingDateX: string;
  ready: boolean;
  onOpenChecklist: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Next best action</p>
          {task ? (
            <>
              <h2 className="mt-2 flex items-start gap-2 text-xl font-semibold leading-snug">
                <ArrowRight size={20} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <TaskRef task={task} />
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                {task.blocker ? <Badge tone="danger">Closing blocker</Badge> : null}
                <Badge>{task.owner}</Badge>
                <StatusPill status={task.status} />
              </div>
              <DeadlinePair task={task} closingDateX={closingDateX} compact className="mt-3 max-w-2xl" />
            </>
          ) : (
            <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold">
              <ShieldCheck size={20} className="text-[var(--success)]" />
              {ready ? "All clear. Ready to close." : "No open action is currently actionable."}
            </h2>
          )}
        </div>
        <Button variant="secondary" onClick={onOpenChecklist}>
          <ListChecks size={16} /> Open Closing Table
        </Button>
      </div>
    </Card>
  );
}

function InstrumentReadCard({
  icon,
  read,
  closingDateX,
  onOpen
}: {
  icon: React.ReactNode;
  read: BriefInstrumentRead;
  closingDateX: string;
  onOpen: () => void;
}) {
  return (
    <Card className="flex min-h-56 flex-col justify-between">
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            {icon}
            <p className="text-xs font-medium uppercase tracking-[0.16em]">{read.label}</p>
          </div>
          <Badge tone={readTone(read.kind, read.count)}>{read.count}</Badge>
        </div>

        {read.task ? (
          <div className="grid gap-3">
            <p className="text-sm font-semibold leading-snug"><TaskRef task={read.task} /></p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={read.task.status} />
              {read.days !== null ? <Badge tone={read.days < 0 ? "danger" : read.days <= 7 ? "warning" : "neutral"}>{daysLabel(read.days)}</Badge> : null}
            </div>
            <DeadlinePair task={read.task} closingDateX={closingDateX} compact />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--muted)]">{read.clearText}</p>
        )}
      </div>

      <Button className="mt-5 w-fit" variant="ghost" onClick={onOpen}>
        {read.drillInLabel}
      </Button>
    </Card>
  );
}

function priorityTone(priority: Priority): "neutral" | "warning" | "danger" {
  if (priority === "Critical") return "danger";
  if (priority === "High") return "warning";
  return "neutral";
}

function readTone(kind: BriefReadKind, count: number): "neutral" | "success" | "warning" | "danger" | "statutory" {
  if (!count) return "success";
  if (kind === "blockers") return "danger";
  if (kind === "statutory") return "statutory";
  return "warning";
}

function dispositionLabel(disposition: BriefModel["disposition"]): string {
  if (disposition === "unset") return "Set X";
  if (disposition === "ready") return "Ready";
  if (disposition === "on-track") return "On track";
  if (disposition === "at-risk") return "At risk";
  return "Overdue";
}

function daysToCloseLabel(days: number): string {
  if (days < 0) return `X passed ${Math.abs(days)}d ago`;
  if (days === 0) return "X is today";
  return `${days}d to X`;
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}
