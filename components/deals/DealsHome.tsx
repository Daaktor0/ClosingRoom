"use client";

import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Plus, ShieldAlert, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Field, ProgressBar, SectionHeader, TaskRef, inputClass } from "@/components/ui";
import type { DealStatus, PortfolioDeal } from "@/lib/dealPortfolio";
import { daysUntil, formatDate, getComputedDueDate, getComputedStatutoryDate } from "@/lib/dateUtils";
import { getNextBestAction, getReadiness, isTaskComplete } from "@/lib/rules";
import { createDeal, listDeals } from "@/lib/supabasePersistence";
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

function nextBlockingTask(deal: PortfolioDeal): Task | null {
  const readiness = getReadiness(deal);
  const nextBlocker = readiness.blockers[0] ?? getNextBestAction(deal);
  return nextBlocker ?? null;
}

function statusTone(status: DealStatus): "neutral" | "success" | "warning" {
  if (status === "closed") return "success";
  if (status === "on-hold") return "warning";
  return "neutral";
}

export function DealsHome() {
  const router = useRouter();
  const [deals, setDeals] = useState<PortfolioDeal[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("closingDate");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("active");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("me");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newDealName, setNewDealName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newInvestor, setNewInvestor] = useState("");
  const [newClosingDate, setNewClosingDate] = useState("");

  useEffect(() => {
    let active = true;
    listDeals()
      .then((rows) => {
        if (active) setDeals(rows);
      })
      .catch((error: Error) => {
        if (active) {
          setLoadError(error.message);
          setDeals([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    return (deals ?? [])
      .filter((deal) => statusFilter === "all" || deal.status === statusFilter)
      .filter((deal) => ownerFilter === "all" || deal.assignedToCurrentUser)
      .sort((a, b) => {
        if (sortKey === "dealName") return a.name.localeCompare(b.name);
        if (sortKey === "readiness") return getReadiness(b).score - getReadiness(a).score;
        return (getComputedDueDate({ timeline: "X" }, a.closingDateX)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (getComputedDueDate({ timeline: "X" }, b.closingDateX)?.getTime() ?? Number.MAX_SAFE_INTEGER);
      });
  }, [deals, ownerFilter, sortKey, statusFilter]);

  async function handleCreateDeal() {
    if (!newDealName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const deal = await createDeal({
        name: newDealName.trim(),
        companyName: newCompany.trim(),
        investorName: newInvestor.trim(),
        closingDateX: newClosingDate
      });
      router.push(`/deals/${deal.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not create the deal");
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="grid-bg border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-5 px-4 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent">Portfolio home</Badge>
                <Badge>{deals === null ? "Loading" : `${deals.length} deals`}</Badge>
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-normal md:text-4xl">Deals</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant={filtersOpen ? "primary" : "secondary"} onClick={() => setFiltersOpen((value) => !value)}>
                <SlidersHorizontal size={15} /> Filters
              </Button>
              <Badge tone="accent" className="min-h-9">{rows.length} shown</Badge>
              <Link href="/demo" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-strong)]">
                <ShieldAlert size={16} /> Demo
              </Link>
              <Button onClick={() => setWizardOpen((value) => !value)}>
                <Plus size={16} /> New deal
              </Button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="grid gap-3 sm:grid-cols-3">
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
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1560px] gap-4 px-4 py-5 lg:px-6">
        {wizardOpen ? (
          <Card>
            <SectionHeader eyebrow="New deal setup" title="Create a closing" />
            <p className="mb-4 text-sm text-[var(--muted)]">Only a deal name is required — add parties and Closing Date X later from the Brief.</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Deal name">
                <input className={inputClass} value={newDealName} onChange={(event) => setNewDealName(event.target.value)} placeholder="e.g. Series B Closing" />
              </Field>
              <Field label="Company">
                <input className={inputClass} value={newCompany} onChange={(event) => setNewCompany(event.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Investor">
                <input className={inputClass} value={newInvestor} onChange={(event) => setNewInvestor(event.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Closing Date X (optional)">
                <input className={inputClass} type="date" value={newClosingDate} onChange={(event) => setNewClosingDate(event.target.value)} />
              </Field>
            </div>
            {createError ? <p className="mt-3 rounded-md border border-red-700/30 bg-red-700/10 p-2 text-sm text-[var(--danger)]">{createError}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={handleCreateDeal} disabled={creating || !newDealName.trim()}>
                {creating ? "Creating..." : "Create deal"}
              </Button>
              <Button variant="secondary" onClick={() => setWizardOpen(false)} disabled={creating}>Cancel</Button>
            </div>
          </Card>
        ) : null}

        {loadError ? (
          <Card>
            <SectionHeader eyebrow="Tracker" title="Could not load deals" />
            <p className="text-sm text-[var(--danger)]">{loadError}</p>
          </Card>
        ) : null}

        {deals === null ? (
          <Card className="p-0">
            <div className="grid gap-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-md border border-[var(--line)] bg-[var(--panel-strong)]/40" />
              ))}
            </div>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <SectionHeader eyebrow="Portfolio" title="No deals match these filters" />
            <p className="text-sm text-[var(--muted)]">
              {deals.length === 0
                ? "Create your first closing to start tracking CPs, statutory filings and readiness."
                : "Adjust the status or owner filter, or create a new deal."}
            </p>
            <div className="mt-4">
              <Button onClick={() => setWizardOpen(true)}>
                <Plus size={16} /> New deal
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((deal) => {
              const readiness = getReadiness(deal);
              const statutoryDays = daysToNextStatutoryDeadline(deal);
              const blockingTask = nextBlockingTask(deal);
              return (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="card group flex flex-col gap-4 p-4 transition hover:border-[var(--accent)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-display text-lg font-semibold leading-snug">{deal.name}</p>
                      <Badge tone={statusTone(deal.status)}>{deal.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {[deal.companyName, deal.investorName].filter(Boolean).join(" · ") || "Deal setup incomplete"}
                    </p>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        {readiness.ready ? <CheckCircle2 size={15} className="text-[var(--success)]" /> : <CircleAlert size={15} className="text-[var(--danger)]" />}
                        {readiness.score}% ready
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                        <CalendarClock size={14} className="text-[var(--accent)]" />
                        {formatDate(getComputedDueDate({ timeline: "X" }, deal.closingDateX))}
                      </span>
                    </div>
                    <ProgressBar value={readiness.score} />
                  </div>

                  <div className="grid gap-3 border-t border-[var(--line)] pt-3 text-sm sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Next blocker</p>
                      <p className="mt-1 leading-snug">{blockingTask ? <TaskRef task={blockingTask} /> : "No open blocker"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Next statutory</p>
                      <div className="mt-1">
                        <Badge tone={statutoryDays !== null && statutoryDays < 0 ? "danger" : statutoryDays !== null && statutoryDays <= 7 ? "warning" : "neutral"}>
                          {statutoryDays === null ? "No dated item" : statutoryDays < 0 ? `${Math.abs(statutoryDays)}d overdue` : statutoryDays === 0 ? "Due today" : `${statutoryDays}d`}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]">
                    Open deal <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
