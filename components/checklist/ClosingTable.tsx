"use client";

import { DatabaseZap, GitBranch, LayoutList, Search, TableProperties } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ClosingTableCommand } from "@/components/CommandPalette";
import { DependencyLens } from "@/components/checklist/DependencyLens";
import { RunSheet } from "@/components/checklist/RunSheet";
import { Workbook } from "@/components/checklist/Workbook";
import { RiskLens } from "@/components/risk/RiskLens";
import { Badge, Button, Card, Field, Masthead, inputClass } from "@/components/ui";
import { phases } from "@/lib/constants";
import { isOverdue } from "@/lib/dateUtils";
import { isTaskComplete } from "@/lib/rules";
import { useDealStore } from "@/lib/store";
import type { Phase, Task } from "@/lib/types";

type ClosingTableMode = "run-sheet" | "workbook" | "dependencies" | "risk";

export interface ClosingTableFilters {
  search: string;
  phase: Phase | "All";
  blockersOnly: boolean;
  overdueOnly: boolean;
  openOnly: boolean;
}

export function ClosingTable({ command }: { command?: ClosingTableCommand | null }) {
  const deal = useDealStore((state) => state.deal);
  const [mode, setMode] = useState<ClosingTableMode>("run-sheet");
  const [filters, setFilters] = useState<ClosingTableFilters>({
    search: "",
    phase: "All",
    blockersOnly: false,
    overdueOnly: false,
    openOnly: true
  });

  useEffect(() => {
    if (!command) return;
    if (command.kind === "show-dependencies") {
      setMode("dependencies");
      return;
    }
    if (command.kind === "show-risk") {
      setMode("risk");
      return;
    }
    setMode("run-sheet");
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
  const shownCount = mode === "risk" ? riskTasks.length : mode === "dependencies" ? dependencyLinkedCount : filteredTasks.length;

  return (
    <div className="grid gap-4">
      <Card>
        <Masthead
          eyebrow="The Closing Table"
          title="Run Sheet"
          subtitle="Default to decision cards for daily closing work. Switch to Workbook when dense structured entry is the job."
          action={
            <div className="inline-flex rounded-md border border-[var(--line)] bg-[var(--panel)] p-1">
              <Button
                variant={mode === "run-sheet" ? "primary" : "ghost"}
                onClick={() => setMode("run-sheet")}
                className="min-h-8"
              >
                <LayoutList size={16} /> Run Sheet
              </Button>
              <Button
                variant={mode === "workbook" ? "primary" : "ghost"}
                onClick={() => setMode("workbook")}
                className="min-h-8"
              >
                <TableProperties size={16} /> Workbook
              </Button>
              <Button
                variant={mode === "dependencies" ? "primary" : "ghost"}
                onClick={() => setMode("dependencies")}
                className="min-h-8"
              >
                <GitBranch size={16} /> Dependencies
              </Button>
              <Button
                variant={mode === "risk" ? "primary" : "ghost"}
                onClick={() => setMode("risk")}
                className="min-h-8"
              >
                <DatabaseZap size={16} /> Risk
              </Button>
            </div>
          }
        />
      </Card>

      {mode === "workbook" ? null : (
        <ClosingTableFilterBar filters={filters} shownCount={shownCount} riskMode={mode === "risk"} onChange={setFilters} />
      )}

      {mode === "run-sheet" ? <RunSheet tasks={filteredTasks} allTasks={deal.tasks} closingDateX={deal.closingDateX} /> : null}
      {mode === "workbook" ? <Workbook /> : null}
      {mode === "dependencies" ? <DependencyLens tasks={filteredTasks} allTasks={deal.tasks} /> : null}
      {mode === "risk" ? <RiskLens tasks={riskTasks} /> : null}
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
  return (
    <Card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.4fr)_minmax(180px,0.7fr)]">
          <Field label="Search" className="relative">
            <Search className="pointer-events-none absolute bottom-2.5 left-3 text-[var(--muted)]" size={16} />
            <input
              className={`${inputClass} pl-9`}
              value={filters.search}
              onChange={(event) => onChange((current) => ({ ...current, search: event.target.value }))}
              placeholder="Task, serial, owner, form..."
            />
          </Field>
          <Field label="Phase">
            <select className={inputClass} value={filters.phase} onChange={(event) => onChange((current) => ({ ...current, phase: event.target.value as Phase | "All" }))}>
              <option>All</option>
              {phases.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleButton active={filters.openOnly && !riskMode} disabled={riskMode} onClick={() => onChange((current) => ({ ...current, openOnly: !current.openOnly }))}>Open only</ToggleButton>
          <ToggleButton active={filters.blockersOnly} onClick={() => onChange((current) => ({ ...current, blockersOnly: !current.blockersOnly }))}>Blockers</ToggleButton>
          <ToggleButton active={filters.overdueOnly} onClick={() => onChange((current) => ({ ...current, overdueOnly: !current.overdueOnly }))}>Overdue</ToggleButton>
          <Badge tone="accent">{shownCount} shown</Badge>
        </div>
      </div>
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
