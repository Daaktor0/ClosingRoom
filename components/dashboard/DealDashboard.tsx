"use client";

import { AlertTriangle, ArrowRight, CalendarClock, Scale } from "lucide-react";
import { CountdownTile } from "@/components/system/CountdownTile";
import { ReadinessRing } from "@/components/system/ReadinessRing";
import { Badge, Card, Field, ProgressBar, SectionHeader, inputClass } from "@/components/ui";
import { phases } from "@/lib/constants";
import { deadlineUrgencyTone, formatDate, formatDeadlinePair, getComputedDueDate, getComputedStatutoryDate, getDeadlineUrgency, daysUntil } from "@/lib/dateUtils";
import { getCompletionPercent, getCriticalPathTasks, getNextBestAction, getOverdueTasks, getPhaseTasks, getReadiness, isTaskComplete } from "@/lib/rules";
import { useDealStore } from "@/lib/store";
import type { Deal, Task } from "@/lib/types";

const CLOSED_STATES = ["Completed", "Waived", "Converted to CS", "Not Applicable"];

function statutoryCountdowns(deal: Deal, limit = 3): { task: Task; date: Date | null; days: number | null }[] {
  return deal.tasks
    .filter((task) => !isTaskComplete(task))
    .filter((task) => task.filing || task.statutoryDeadlineNote)
    .map((task) => ({
      task,
      date: getComputedStatutoryDate(task, deal.closingDateX) ?? getComputedDueDate(task, deal.closingDateX),
      days: daysUntil(task, deal.closingDateX)
    }))
    .sort((a, b) => (a.date?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.date?.getTime() ?? Number.MAX_SAFE_INTEGER))
    .slice(0, limit);
}

export function DealDashboard() {
  const { deal, setClosingDate, updateDealMeta } = useDealStore();
  const readiness = getReadiness(deal);
  const overdue = getOverdueTasks(deal);
  const criticalPath = getCriticalPathTasks(deal.tasks).filter((task) => !CLOSED_STATES.includes(task.status));
  const nextBestAction = getNextBestAction(deal);
  const countdowns = statutoryCountdowns(deal);

  return (
    <div className="grid gap-4">
      <Card>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <ReadinessRing score={readiness.score} ready={readiness.ready} />
          </div>

          <div>
            {nextBestAction ? (
              <>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Next best action</p>
                <h2 className="mt-1 flex items-start gap-2 text-xl font-semibold leading-snug">
                  <ArrowRight size={20} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <span>{nextBestAction.serialNumber}: {nextBestAction.action}</span>
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={nextBestAction.priority === "Critical" ? "danger" : "warning"}>{nextBestAction.priority}</Badge>
                  {nextBestAction.blocker ? <Badge tone="danger">Closing blocker</Badge> : null}
                  <Badge>{nextBestAction.owner}</Badge>
                  <Badge tone={deadlineUrgencyTone[getDeadlineUrgency(nextBestAction, deal.closingDateX)]}>
                    {formatDeadlinePair(nextBestAction, deal.closingDateX)}
                  </Badge>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Next best action</p>
                <h2 className="mt-1 text-xl font-semibold">{readiness.ready ? "All clear — ready to close." : "No open action right now."}</h2>
              </>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat icon={<AlertTriangle size={17} />} label="Active blockers" value={readiness.blockers.length} tone={readiness.blockers.length ? "danger" : "success"} />
              <MiniStat icon={<CalendarClock size={17} />} label="Overdue items" value={overdue.length} tone={overdue.length ? "danger" : "success"} />
              <MiniStat icon={<Scale size={17} />} label="Critical path open" value={criticalPath.length} tone={criticalPath.length ? "warning" : "success"} />
            </div>
          </div>
        </div>
      </Card>

      <div>
        <SectionHeader
          eyebrow="Statutory clocks"
          title="Upcoming statutory deadlines"
          action={!deal.closingDateX ? <Badge tone="warning">Set Closing Date X</Badge> : null}
        />
        {deal.closingDateX && countdowns.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {countdowns.map(({ task, date, days }) => (
              <CountdownTile
                key={task.id}
                label={task.filing?.form ?? task.serialNumber}
                sublabel={task.action}
                dateLabel={date ? formatDate(date) : undefined}
                days={days}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
            {deal.closingDateX ? "No open statutory items on the clock." : "Set Closing Date X below to compute statutory countdowns."}
          </div>
        )}
      </div>

      <div>
        <SectionHeader eyebrow="Progress" title="Phase progress" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {phases.map((phase) => {
            const phaseTasks = getPhaseTasks(deal.tasks, phase);
            const done = getCompletionPercent(phaseTasks);
            const open = phaseTasks.filter((task) => !CLOSED_STATES.includes(task.status)).length;
            return (
              <Card key={phase}>
                <p className="text-sm font-semibold">{phase}</p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{done}%</p>
                <ProgressBar value={done} className="mt-3" />
                <p className="mt-2 text-xs text-[var(--muted)]">{open} open of {phaseTasks.length}</p>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <SectionHeader eyebrow="Deal setup" title="Deal details & Closing Date X" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Deal name">
            <input className={inputClass} value={deal.name} onChange={(event) => updateDealMeta({ ...deal, name: event.target.value })} />
          </Field>
          <Field label="Company">
            <input className={inputClass} value={deal.companyName} onChange={(event) => updateDealMeta({ ...deal, companyName: event.target.value })} />
          </Field>
          <Field label="Investor">
            <input className={inputClass} value={deal.investorName} onChange={(event) => updateDealMeta({ ...deal, investorName: event.target.value })} />
          </Field>
          <Field label="Closing Date X">
            <input className={inputClass} type="date" value={deal.closingDateX} onChange={(event) => setClosingDate(event.target.value)} />
          </Field>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          X is the closing date: investor remittance and share issuance. Internal targets and statutory hard limits recalculate from this date where the trigger is X/allotment.
        </p>
      </Card>
    </div>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "danger" | "success" | "warning" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--line)] p-3">
      <span className="flex items-center gap-2 text-sm text-[var(--muted)]">{icon}{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
