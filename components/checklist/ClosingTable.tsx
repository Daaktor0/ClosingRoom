"use client";

import { DatabaseZap, FileArchive, GitBranch, LayoutList, Layers, Search, SlidersHorizontal, TableProperties, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClosingTableCommand } from "@/components/CommandPalette";
import { DependencyLens } from "@/components/checklist/DependencyLens";
import { RunSheet } from "@/components/checklist/RunSheet";
import { Workbook } from "@/components/checklist/Workbook";
import { DocumentsRoom } from "@/components/documents/DocumentsRoom";
import { RiskLens } from "@/components/risk/RiskLens";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { phases } from "@/lib/constants";
import { isOverdue } from "@/lib/dateUtils";
import { isTaskComplete } from "@/lib/rules";
import { useDealStore } from "@/lib/store";
import type { Phase, Task } from "@/lib/types";
import { useDismissable } from "@/lib/useDismissable";
import { cn } from "@/lib/utils";

type BaseView = "run-sheet" | "workbook";
type Lens = "dependencies" | "risk" | "documents";

const lensMeta: Record<Lens, { label: string; icon: React.ReactNode }> = {
  dependencies: { label: "Dependencies", icon: <GitBranch size={15} /> },
  risk: { label: "Risk", icon: <DatabaseZap size={15} /> },
  documents: { label: "Documents", icon: <FileArchive size={15} /> }
};

export interface ClosingTableFilters {
  search: string;
  phase: Phase | "All";
  blockersOnly: boolean;
  overdueOnly: boolean;
  openOnly: boolean;
}

export function ClosingTable({ command }: { command?: ClosingTableCommand | null }) {
  const deal = useDealStore((state) => state.deal);
  const [baseView, setBaseView] = useState<BaseView>("run-sheet");
  const [lens, setLens] = useState<Lens | null>(null);
  const [filters, setFilters] = useState<ClosingTableFilters>({
    search: "",
    phase: "All",
    blockersOnly: false,
    overdueOnly: false,
    openOnly: true
  });

  useEffect(() => {
    if (!command) return;
    if (command.kind === "show-dependencies") return setLens("dependencies");
    if (command.kind === "show-risk") return setLens("risk");
    if (command.kind === "show-documents") return setLens("documents");
    setLens(null);
    setBaseView("run-sheet");
    setFilters((current) => {
      if (command.kind === "show-blockers") {
        return { ...current, search: "", phase: "All", blockersOnly: true, overdueOnly: false, openOnly: true };
      }
      if (command.kind === "show-overdue") {
        return { ...current, search: "", phase: "All", blockersOnly: false, overdueOnly: true, openOnly: true };
      }
      if (command.kind === "show-phase") {
        return { ...current, search: "", phase: command.phase, blockersOnly: false, overdueOnly: false, openOnly: true };
      }
      return current;
    });
  }, [command]);

  const filteredTasks = useMemo(
    () => filterClosingTableTasks(deal.tasks, deal.closingDateX, filters, { applyOpenOnly: true }),
    [deal.closingDateX, deal.tasks, filters]
  );
  const riskTasks = useMemo(
    () => filterClosingTableTasks(deal.tasks, deal.closingDateX, filters, { applyOpenOnly: false }),
    [deal.closingDateX, deal.tasks, filters]
  );
  const dependencyLinkedCount = useMemo(() => filteredTasks.filter((task) => task.dependencies.length > 0).length, [filteredTasks]);
  const shownCount = lens === "risk" ? riskTasks.length : lens === "dependencies" ? dependencyLinkedCount : filteredTasks.length;

  const showFilters = lens !== "documents" && baseView !== "workbook";

  return (
    <div className="grid gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold leading-tight">Closing Table</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-[var(--line)] bg-[var(--panel)] p-1">
              <Button variant={baseView === "run-sheet" && !lens ? "primary" : "ghost"} onClick={() => { setBaseView("run-sheet"); setLens(null); }} className="min-h-8">
                <LayoutList size={16} /> Run sheet
              </Button>
              <Button variant={baseView === "workbook" && !lens ? "primary" : "ghost"} onClick={() => { setBaseView("workbook"); setLens(null); }} className="min-h-8">
                <TableProperties size={16} /> Grid
              </Button>
            </div>
            <LensMenu active={lens} onSelect={setLens} />
          </div>
        </div>
        {lens ? (
          <div className="mt-3 flex items-center gap-2">
            <Badge tone="accent">
              {lensMeta[lens].icon} {lensMeta[lens].label} lens
            </Badge>
            <button
              type="button"
              onClick={() => setLens(null)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <X size={13} /> Clear lens
            </button>
          </div>
        ) : null}
      </Card>

      {showFilters ? (
        <ClosingTableFilterBar filters={filters} shownCount={shownCount} riskMode={lens === "risk"} onChange={setFilters} />
      ) : null}

      {lens === "dependencies" ? <DependencyLens tasks={filteredTasks} allTasks={deal.tasks} /> : null}
      {lens === "risk" ? <RiskLens tasks={riskTasks} /> : null}
      {lens === "documents" ? <DocumentsRoom /> : null}
      {!lens && baseView === "run-sheet" ? <RunSheet tasks={filteredTasks} allTasks={deal.tasks} closingDateX={deal.closingDateX} /> : null}
      {!lens && baseView === "workbook" ? <Workbook /> : null}
    </div>
  );
}

function LensMenu({ active, onSelect }: { active: Lens | null; onSelect: (lens: Lens) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissable(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <Button variant={active ? "primary" : "secondary"} onClick={() => setOpen((value) => !value)} className="min-h-9" aria-expanded={open}>
        <Layers size={16} /> Lens
      </Button>
      {open ? (
        <div className="absolute right-0 top-11 z-30 w-48 rounded-md border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-xl">
          {(Object.keys(lensMeta) as Lens[]).map((lens) => (
            <button
              key={lens}
              type="button"
              onClick={() => { onSelect(lens); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm font-medium transition hover:bg-[var(--panel-strong)]",
                active === lens ? "text-[var(--accent)]" : "text-[var(--foreground)]"
              )}
            >
              {lensMeta[lens].icon}
              {lensMeta[lens].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function filterClosingTableTasks(
  tasks: Task[],
  closingDateX: string,
  filters: ClosingTableFilters,
  options: { applyOpenOnly: boolean }
): Task[] {
  const normalized = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    if (filters.phase !== "All" && task.phase !== filters.phase) return false;
    if (filters.blockersOnly && !task.blocker) return false;
    if (filters.overdueOnly && !isOverdue(task, closingDateX)) return false;
    if (options.applyOpenOnly && filters.openOnly && isTaskComplete(task)) return false;
    if (!normalized) return true;
    return [task.serialNumber, task.action, task.owner, task.phase, task.filing?.form ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}

function ClosingTableFilterBar({
  filters,
  shownCount,
  riskMode,
  onChange
}: {
  filters: ClosingTableFilters;
  shownCount: number;
  riskMode: boolean;
  onChange: React.Dispatch<React.SetStateAction<ClosingTableFilters>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCount =
    Number(filters.phase !== "All") + Number(filters.blockersOnly) + Number(filters.overdueOnly) + Number(!filters.openOnly);

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Field label="Search" className="relative lg:max-w-md lg:flex-1">
          <Search className="pointer-events-none absolute bottom-2.5 left-3 text-[var(--muted)]" size={16} />
          <input
            className={`${inputClass} w-full pl-9`}
            value={filters.search}
            onChange={(event) => onChange((current) => ({ ...current, search: event.target.value }))}
            onFocus={() => setExpanded(true)}
            placeholder="Task, serial, owner, form..."
          />
        </Field>
        <div className="flex items-center gap-2">
          <Button variant={expanded ? "primary" : "secondary"} onClick={() => setExpanded((value) => !value)} className="min-h-9">
            <SlidersHorizontal size={15} /> Filters{activeCount ? ` · ${activeCount}` : ""}
          </Button>
          <Badge tone="accent">{shownCount} shown</Badge>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-3">
          <Field label="Phase" className="min-w-44">
            <select className={inputClass} value={filters.phase} onChange={(event) => onChange((current) => ({ ...current, phase: event.target.value as Phase | "All" }))}>
              <option>All</option>
              {phases.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <ToggleButton active={filters.openOnly && !riskMode} disabled={riskMode} onClick={() => onChange((current) => ({ ...current, openOnly: !current.openOnly }))}>Open only</ToggleButton>
            <ToggleButton active={filters.blockersOnly} onClick={() => onChange((current) => ({ ...current, blockersOnly: !current.blockersOnly }))}>Blockers</ToggleButton>
            <ToggleButton active={filters.overdueOnly} onClick={() => onChange((current) => ({ ...current, overdueOnly: !current.overdueOnly }))}>Overdue</ToggleButton>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function ToggleButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant={active ? "primary" : "secondary"} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}
