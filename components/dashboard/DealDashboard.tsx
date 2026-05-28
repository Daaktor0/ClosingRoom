"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, CircleAlert, FileClock, Scale } from "lucide-react";
import { Badge, Card, Field, ProgressBar, SectionHeader, inputClass } from "@/components/ui";
import { phases } from "@/lib/constants";
import { deadlineCountdownLabel, deadlineUrgencyTone, formatDeadlinePair, formatDate, getComputedDueDate, getComputedStatutoryDate, getDeadlineUrgency } from "@/lib/dateUtils";
import { getCompletionPercent, getCriticalPathTasks, getNextBestAction, getOverdueTasks, getPhaseTasks, getPostClosingComplianceScore, getReadiness, getUpcomingDeadlines } from "@/lib/rules";
import { useDealStore } from "@/lib/store";
import { percent } from "@/lib/utils";

export function DealDashboard() {
  const { deal, setClosingDate, updateDealMeta } = useDealStore();
  const readiness = getReadiness(deal);
  const cpTasks = getPhaseTasks(deal.tasks, "Conditions Precedent");
  const upcoming = getUpcomingDeadlines(deal);
  const overdue = getOverdueTasks(deal);
  const criticalPath = getCriticalPathTasks(deal.tasks).filter((task) => !["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status));
  const nextBestAction = getNextBestAction(deal);

  return (
    <div className="grid gap-4">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={readiness.ready ? "success" : "danger"}>{readiness.ready ? "Ready to close" : "Not ready"}</Badge>
              <Badge tone="accent">Closing Date X logic active</Badge>
              {!deal.closingDateX ? <Badge tone="warning">Set X to compute deadlines</Badge> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Deal name">
                <input className={inputClass} value={deal.name} onChange={(event) => updateDealMeta({ ...deal, name: event.target.value })} />
              </Field>
              <Field label="Company">
                <input className={inputClass} value={deal.companyName} onChange={(event) => updateDealMeta({ ...deal, companyName: event.target.value })} />
              </Field>
              <Field label="Investor">
                <input className={inputClass} value={deal.investorName} onChange={(event) => updateDealMeta({ ...deal, investorName: event.target.value })} />
              </Field>
            </div>
          </div>
          <div className="subtle-card p-4">
            <Field label="Closing Date X">
              <input className={inputClass} type="date" value={deal.closingDateX} onChange={(event) => setClosingDate(event.target.value)} />
            </Field>
            <p className="mt-3 text-sm text-[var(--muted)]">
              X is the closing date: investor remittance and share issuance. Internal targets and statutory hard limits recalculate from this date where the trigger is X/allotment.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Scale size={18} />} label="Overall completion" value={`${getCompletionPercent(deal.tasks)}%`} progress={getCompletionPercent(deal.tasks)} />
        <MetricCard icon={<CheckCircle2 size={18} />} label="CP completion" value={`${percent(cpTasks.filter((task) => ["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status)).length, cpTasks.length)}%`} progress={percent(cpTasks.filter((task) => ["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status)).length, cpTasks.length)} />
        <MetricCard icon={<CircleAlert size={18} />} label="Closing readiness" value={`${readiness.score}%`} progress={readiness.score} tone={readiness.ready ? "success" : "danger"} />
        <MetricCard icon={<FileClock size={18} />} label="Post-closing compliance" value={`${getPostClosingComplianceScore(deal.tasks)}%`} progress={getPostClosingComplianceScore(deal.tasks)} />
      </div>

      {nextBestAction ? (
        <Card>
          <SectionHeader eyebrow="Next best action" title={`${nextBestAction.serialNumber}: ${nextBestAction.action}`} />
          <div className="flex flex-wrap gap-2">
            <Badge tone={nextBestAction.priority === "Critical" ? "danger" : "warning"}>{nextBestAction.priority}</Badge>
            {nextBestAction.blocker ? <Badge tone="danger">Closing blocker</Badge> : null}
            <Badge>{nextBestAction.owner}</Badge>
            <Badge tone={deadlineUrgencyTone[getDeadlineUrgency(nextBestAction, deal.closingDateX)]}>{formatDeadlinePair(nextBestAction, deal.closingDateX)}</Badge>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="Control" title="Blockers & Overdue" />
          <div className="grid gap-3">
            <MiniStat icon={<AlertTriangle size={17} />} label="Active blockers" value={String(readiness.blockers.length)} tone={readiness.blockers.length ? "danger" : "success"} />
            <MiniStat icon={<CalendarClock size={17} />} label="Overdue items" value={String(overdue.length)} tone={overdue.length ? "danger" : "success"} />
            <MiniStat icon={<Scale size={17} />} label="Critical path open" value={String(criticalPath.length)} tone={criticalPath.length ? "warning" : "success"} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionHeader eyebrow="Next" title="Upcoming Statutory & Deal Deadlines" />
          <div className="grid gap-2">
            {upcoming.length ? (
              upcoming.map((task) => {
                const statutoryDate = getComputedStatutoryDate(task, deal.closingDateX);
                const urgency = getDeadlineUrgency(task, deal.closingDateX);
                const countdown = deadlineCountdownLabel(task, deal.closingDateX);
                return (
                  <div key={task.id} className="flex items-start justify-between gap-3 rounded-md border border-[var(--line)] p-3">
                    <div>
                      <p className="text-sm font-medium">{task.serialNumber} - {task.action}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{task.owner} - {task.phase}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={deadlineUrgencyTone[urgency]}>{formatDate(getComputedDueDate(task, deal.closingDateX))}</Badge>
                      {countdown ? <span className="text-right text-xs text-[var(--muted)]">{countdown}</span> : null}
                      {task.filing?.statutoryDays || task.statutoryDeadlineNote ? (
                        <span className="text-right text-xs text-[var(--muted)]">
                          {statutoryDate ? `Statutory ${formatDate(statutoryDate)}` : formatDeadlinePair(task, deal.closingDateX)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">Set Closing Date X to populate upcoming deadlines.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {phases.map((phase) => {
          const phaseTasks = getPhaseTasks(deal.tasks, phase);
          const done = getCompletionPercent(phaseTasks);
          return (
            <Card key={phase}>
              <p className="text-sm font-semibold">{phase}</p>
              <p className="mt-1 text-2xl font-semibold">{done}%</p>
              <ProgressBar value={done} className="mt-3" />
              <p className="mt-2 text-xs text-[var(--muted)]">{phaseTasks.filter((task) => !["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status)).length} open of {phaseTasks.length}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, progress, tone = "accent" }: { icon: React.ReactNode; label: string; value: string; progress: number; tone?: "accent" | "danger" | "success" }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-[var(--panel-strong)] p-2 text-[var(--accent)]">{icon}</span>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <ProgressBar value={progress} className="mt-3" />
    </Card>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "danger" | "success" | "warning" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--line)] p-3">
      <span className="flex items-center gap-2 text-sm text-[var(--muted)]">{icon}{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
