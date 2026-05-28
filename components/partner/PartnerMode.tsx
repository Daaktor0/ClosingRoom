"use client";

import { ArrowLeft, ArrowRight, FileText, Loader2, Moon, ShieldAlert, Sun } from "lucide-react";
import { useState } from "react";
import { CountdownTile } from "@/components/system/CountdownTile";
import { ReadinessRing } from "@/components/system/ReadinessRing";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { globalDisclaimer, phases } from "@/lib/constants";
import { daysUntil, deadlineUrgencyTone, formatDate, formatDeadlinePair, getComputedDueDate, getComputedStatutoryDate, getDeadlineUrgency } from "@/lib/dateUtils";
import { getCompletionPercent, getNextBestAction, getPhaseTasks, getReadiness, isTaskComplete } from "@/lib/rules";
import { useDealStore } from "@/lib/store";
import type { Deal, Task } from "@/lib/types";

const CLOSED_STATES = ["Completed", "Waived", "Converted to CS", "Not Applicable"];
const HIGH_RISK = new Set(["Closing blocker", "Regulatory filing risk", "Legal validity risk"]);

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

function topRisks(deal: Deal, limit = 4): Task[] {
  return deal.tasks
    .filter((task) => !isTaskComplete(task))
    .map((task) => {
      let score = 0;
      if (task.blocker) score += 3;
      if (task.priority === "Critical") score += 2;
      else if (task.priority === "High") score += 1;
      if (HIGH_RISK.has(task.riskCategory)) score += 2;
      if (task.mandatoryForClosing) score += 1;
      return { task, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.task);
}

export function PartnerMode({ onExit, dark, onToggleTheme }: { onExit: () => void; dark: boolean; onToggleTheme: () => void }) {
  const deal = useDealStore((state) => state.deal);
  const [busy, setBusy] = useState(false);

  const readiness = getReadiness(deal);
  const nextBestAction = getNextBestAction(deal);
  const countdowns = statutoryCountdowns(deal);
  const risks = topRisks(deal);

  async function handlePdf() {
    setBusy(true);
    try {
      const { downloadPdfReport } = await import("@/lib/pdfReport");
      await downloadPdfReport(deal);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-8 lg:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge tone="accent">Partner view</Badge>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{deal.name}</h1>
            <p className="mt-2 text-lg text-[var(--muted)]">{deal.companyName} &middot; {deal.investorName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onToggleTheme} title="Toggle theme">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button variant="secondary" onClick={onExit}>
              <ArrowLeft size={16} /> Exit Partner Mode
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <ReadinessRing score={readiness.score} ready={readiness.ready} size={220} />
          </div>
          <Card>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Next best action</p>
            {nextBestAction ? (
              <>
                <h2 className="mt-2 flex items-start gap-3 text-2xl font-semibold leading-snug">
                  <ArrowRight size={26} className="mt-1 shrink-0 text-[var(--accent)]" />
                  <span>{nextBestAction.serialNumber}: {nextBestAction.action}</span>
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={nextBestAction.priority === "Critical" ? "danger" : "warning"}>{nextBestAction.priority}</Badge>
                  {nextBestAction.blocker ? <Badge tone="danger">Closing blocker</Badge> : null}
                  <Badge>{nextBestAction.owner}</Badge>
                  <Badge tone={deadlineUrgencyTone[getDeadlineUrgency(nextBestAction, deal.closingDateX)]}>
                    {formatDeadlinePair(nextBestAction, deal.closingDateX)}
                  </Badge>
                </div>
              </>
            ) : (
              <h2 className="mt-2 text-2xl font-semibold">{readiness.ready ? "All clear — ready to close." : "No open action right now."}</h2>
            )}
          </Card>
        </div>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Top statutory deadlines</h2>
        {deal.closingDateX && countdowns.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
          <div className="mt-4 rounded-lg border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
            {deal.closingDateX ? "No open statutory items on the clock." : "Closing Date X is not set."}
          </div>
        )}

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Top risks</h2>
        {risks.length ? (
          <div className="mt-4 grid gap-3">
            {risks.map((task) => (
              <div key={task.id} className="flex items-start justify-between gap-4 rounded-lg border border-[var(--line)] p-4">
                <div>
                  <p className="text-base font-medium">{task.serialNumber}: {task.action}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{task.riskCategory} &middot; {task.owner}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {task.blocker ? <Badge tone="danger">Blocker</Badge> : <Badge tone="warning">{task.priority}</Badge>}
                  <span className="text-xs text-[var(--muted)]">{task.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">No open risks flagged.</div>
        )}

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Phase progress</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {phases.map((phase) => {
            const phaseTasks = getPhaseTasks(deal.tasks, phase);
            const done = getCompletionPercent(phaseTasks);
            const open = phaseTasks.filter((task) => !CLOSED_STATES.includes(task.status)).length;
            return (
              <Card key={phase}>
                <p className="text-sm font-semibold">{phase}</p>
                <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">{done}%</p>
                <ProgressBar value={done} className="mt-3" />
                <p className="mt-2 text-xs text-[var(--muted)]">{open} open of {phaseTasks.length}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <Button onClick={handlePdf} disabled={busy} className="min-h-12 px-8 text-base">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} Export PDF
          </Button>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-[var(--muted)]">
          <ShieldAlert size={13} className="shrink-0 text-[var(--accent)]" /> {globalDisclaimer}
        </p>
      </div>
    </main>
  );
}
