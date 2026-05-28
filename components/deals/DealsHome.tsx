"use client";

import { ArrowDownUp, CalendarClock, CheckCircle2, CircleAlert, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, ProgressBar, SectionHeader, inputClass } from "@/components/ui";
import { createNewPortfolioDeal, createPortfolioDeals, type DealStatus, type PortfolioDeal } from "@/lib/dealPortfolio";
import { daysUntil, formatDate, getComputedDueDate, getComputedStatutoryDate } from "@/lib/dateUtils";
import { getNextBestAction, getReadiness, isTaskComplete } from "@/lib/rules";
import type { Task } from "@/lib/types";

type SortKey = "closingDate" | "readiness" | "dealName";
type OwnerFilter = "me" | "all";

function daysToNextStatutoryDeadline(deal: PortfolioDeal): number | null {
  const statutoryTasks = deal.tasks
    .filter((task) => !isTaskComplete(task))
    .filter((task) => task.filing || task.statutoryDeadlineNote)
    .map((task) => ({ task, date: getComputedStatutoryDate(task, deal.closingDateX) ?? getComputedDueDate(task, deal.closingDateX) }))
    .filter((item): item is { task: Task; date: Date } => item.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const next = statutoryTasks[0]?.task;
  return next ? daysUntil(next, deal.closingDateX) : null;
}

function nextBlockingItem(deal: PortfolioDeal): string {
  const readiness = getReadiness(deal);
  const nextBlocker = readiness.blockers[0] ?? getNextBestAction(deal);
  return nextBlocker ? `${nextBlocker.serialNumber} ${nextBlocker.action}` : "No open blocker";
}

function statusTone(status: DealStatus): "neutral" | "success" | "warning" {
  if (status === "closed") return "success";
  if (status === "on-hold") return "warning";
  return "neutral";
}

export function DealsHome() {
  const [deals, setDeals] = useState<PortfolioDeal[]>(() => createPortfolioDeals());
  const [sortKey, setSortKey] = useState<SortKey>("closingDate");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("active");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("me");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [newDealName, setNewDealName] = useState("New Financing Closing");
  const [newClosingDate, setNewClosingDate] = useState("");
  const [newLeadPartner, setNewLeadPartner] = useState("Meera Rao");

  const rows = useMemo(() => {
    return deals
      .filter((deal) => statusFilter === "all" || deal.status === statusFilter)
      .filter((deal) => ownerFilter === "all" || deal.assignedToCurrentUser)
      .sort((a, b) => {
        if (sortKey === "dealName") return a.name.localeCompare(b.name);
        if (sortKey === "readiness") return getReadiness(b).score - getReadiness(a).score;
        return (getComputedDueDate({ timeline: "X" }, a.closingDateX)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (getComputedDueDate({ timeline: "X" }, b.closingDateX)?.getTime() ?? Number.MAX_SAFE_INTEGER);
      });
  }, [deals, ownerFilter, sortKey, statusFilter]);

  function createDeal() {
    if (!newDealName.trim() || !newClosingDate) return;
    setDeals((current) => [
      createNewPortfolioDeal({ name: newDealName.trim(), closingDateX: newClosingDate, leadPartner: newLeadPartner.trim() || "Meera Rao" }),
      ...current
    ]);
    setWizardOpen(false);
    setNewDealName("New Financing Closing");
    setNewClosingDate("");
  }

  return (
    <main className="min-h-screen">
      <div className="grid-bg border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-5 px-4 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent">Portfolio home</Badge>
                <Badge>Server-data ready UI scaffold</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">Deals</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
                Active closings, readiness, next blockers and statutory deadline pressure in one screen.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/demo" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-strong)]">
                <ShieldAlert size={16} /> Open demo
              </Link>
              <Button onClick={() => setWizardOpen((value) => !value)}>
                <Plus size={16} /> New deal
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Field label="Status">
              <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DealStatus | "all")}>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="on-hold">On hold</option>
                <option value="all">All</option>
              </select>
            </Field>
            <Field label="Owner">
              <select className={inputClass} value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value as OwnerFilter)}>
                <option value="me">Me</option>
                <option value="all">All</option>
              </select>
            </Field>
            <Field label="Sort">
              <select className={inputClass} value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="closingDate">Closing date</option>
                <option value="readiness">Readiness</option>
                <option value="dealName">Deal name</option>
              </select>
            </Field>
            <div className="flex items-end">
              <Badge tone="accent" className="min-h-9">
                <ArrowDownUp size={14} /> {rows.length} shown
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1560px] gap-4 px-4 py-5 lg:px-6">
        {wizardOpen ? (
          <Card>
            <SectionHeader eyebrow="New deal wizard" title="Instantiate from India Seed Financing template" />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Deal name">
                <input className={inputClass} value={newDealName} onChange={(event) => setNewDealName(event.target.value)} />
              </Field>
              <Field label="Closing Date X">
                <input className={inputClass} type="date" value={newClosingDate} onChange={(event) => setNewClosingDate(event.target.value)} />
              </Field>
              <Field label="Lead partner">
                <input className={inputClass} value={newLeadPartner} onChange={(event) => setNewLeadPartner(event.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge>Template: India Seed Financing - Private Placement</Badge>
              <Button onClick={createDeal} disabled={!newDealName.trim() || !newClosingDate}>Create deal</Button>
              <Button variant="secondary" onClick={() => setWizardOpen(false)}>Cancel</Button>
            </div>
          </Card>
        ) : null}

        <Card className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="border-y border-[var(--line)] bg-[var(--panel-strong)] text-xs uppercase tracking-[0.1em] text-[var(--muted)]">
                <tr>
                  {["Deal", "Status", "Closing Date", "Readiness", "Next Blocking Item", "Next Statutory Deadline", "Lead Partner", "Open"].map((header) => (
                    <th key={header} className="px-4 py-3 font-semibold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((deal) => {
                  const readiness = getReadiness(deal);
                  const statutoryDays = daysToNextStatutoryDeadline(deal);
                  return (
                    <tr key={deal.id} className="border-b border-[var(--line)] align-top hover:bg-[var(--panel-strong)]/60">
                      <td className="px-4 py-4">
                        <p className="font-semibold">{deal.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{deal.companyName} - {deal.investorName}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{deal.templateName}</p>
                      </td>
                      <td className="px-4 py-4"><Badge tone={statusTone(deal.status)}>{deal.status}</Badge></td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2">
                          <CalendarClock size={15} className="text-[var(--accent)]" />
                          {formatDate(getComputedDueDate({ timeline: "X" }, deal.closingDateX))}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-36">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="font-semibold">{readiness.score}%</span>
                            {readiness.ready ? <CheckCircle2 size={15} className="text-[var(--success)]" /> : <CircleAlert size={15} className="text-[var(--danger)]" />}
                          </div>
                          <ProgressBar value={readiness.score} />
                        </div>
                      </td>
                      <td className="max-w-[360px] px-4 py-4 leading-relaxed">{nextBlockingItem(deal)}</td>
                      <td className="px-4 py-4">
                        <Badge tone={statutoryDays !== null && statutoryDays < 0 ? "danger" : statutoryDays !== null && statutoryDays <= 7 ? "warning" : "neutral"}>
                          {statutoryDays === null ? "No dated item" : statutoryDays < 0 ? `${Math.abs(statutoryDays)}d overdue` : statutoryDays === 0 ? "Due today" : `${statutoryDays}d`}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{deal.leadPartner}</td>
                      <td className="px-4 py-4">
                        <Link href="/demo" className="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-strong)]">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}
