"use client";

import { AlertTriangle, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Badge, Button, Card, Field, SectionHeader, TaskRef, inputClass } from "@/components/ui";
import { confidentialityReminder, documentStatuses, phases, responsibleParties, STATUS_NOTE_MAX_LENGTH, statutoryVerificationDisclaimer, taskStatuses } from "@/lib/constants";
import { deadlineCountdownLabel, deadlineUrgencyTone, formatDate, getComputedDueDate, getComputedStatutoryDate, getDeadlineUrgency, isOverdue } from "@/lib/dateUtils";
import { useDealStore } from "@/lib/store";
import type { DocumentStatus, Phase, ResponsibleParty, Task, TaskStatus } from "@/lib/types";

type SortKey = "serialNumber" | "phase" | "timeline" | "dueDate" | "status" | "owner";

export function MasterChecklistTable() {
  const { deal, updateTaskStatus, updateTaskEvidence, updateDocumentStatus, updateTaskOwner, updateTaskNotes } = useDealStore();
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<Phase | "All">("All");
  const [status, setStatus] = useState<TaskStatus | "All">("All");
  const [party, setParty] = useState<ResponsibleParty | "All">("All");
  const [blockerOnly, setBlockerOnly] = useState(false);
  const [dueFilter, setDueFilter] = useState<"All" | "Overdue" | "Prior to X" | "X" | "Post-closing">("All");
  const [sortKey, setSortKey] = useState<SortKey>("serialNumber");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>("In Progress");
  const [bulkDocumentStatus, setBulkDocumentStatus] = useState<DocumentStatus>("Under Review");
  const [bulkOwner, setBulkOwner] = useState("");

  const filteredTasks = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return deal.tasks
      .filter((task) => phase === "All" || task.phase === phase)
      .filter((task) => status === "All" || task.status === status)
      .filter((task) => party === "All" || task.parties.includes(party))
      .filter((task) => !blockerOnly || task.blocker)
      .filter((task) => {
        if (dueFilter === "All") return true;
        if (dueFilter === "Overdue") return isOverdue(task, deal.closingDateX);
        if (dueFilter === "Prior to X") return task.timeline === "Prior to X";
        if (dueFilter === "X") return task.timeline === "X";
        return task.phase === "Post-Closing Actions";
      })
      .filter((task) => {
        if (!normalized) return true;
        return [task.serialNumber, task.phase, task.action, task.owner, task.reviewer, task.riskCategory, task.sourceReference]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort((a, b) => compareTasks(a, b, sortKey, deal.closingDateX));
  }, [blockerOnly, deal.closingDateX, deal.tasks, dueFilter, party, phase, search, sortKey, status]);
  const ownerOptions = useMemo(() => Array.from(new Set(deal.tasks.map((task) => task.owner).filter(Boolean))).sort(), [deal.tasks]);
  const selectedCount = selectedIds.size;
  const allVisibleSelected = filteredTasks.length > 0 && filteredTasks.every((task) => selectedIds.has(task.id));

  function toggleSelected(taskId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const task of filteredTasks) next.delete(task.id);
      } else {
        for (const task of filteredTasks) next.add(task.id);
      }
      return next;
    });
  }

  function applyBulk(action: (taskId: string) => void) {
    for (const taskId of selectedIds) action(taskId);
    setSelectedIds(new Set());
  }

  return (
    <Card>
      <SectionHeader eyebrow="Master Tracker" title="Checklist Table" action={<Badge tone="accent">{filteredTasks.length} shown</Badge>} />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
        <Field label="Search" className="relative">
          <Search className="pointer-events-none absolute bottom-2.5 left-3 text-[var(--muted)]" size={16} />
          <input className={`${inputClass} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Action, owner, risk, source..." />
        </Field>
        <Field label="Phase">
          <select className={inputClass} value={phase} onChange={(event) => setPhase(event.target.value as Phase | "All")}>
            <option>All</option>
            {phases.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | "All")}>
            <option>All</option>
            {taskStatuses.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Party">
          <select className={inputClass} value={party} onChange={(event) => setParty(event.target.value as ResponsibleParty | "All")}>
            <option>All</option>
            {responsibleParties.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Due date">
          <select className={inputClass} value={dueFilter} onChange={(event) => setDueFilter(event.target.value as typeof dueFilter)}>
            <option>All</option>
            <option>Overdue</option>
            <option>Prior to X</option>
            <option>X</option>
            <option>Post-closing</option>
          </select>
        </Field>
        <Field label="Sort">
          <select className={inputClass} value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="serialNumber">S. No.</option>
            <option value="phase">Phase</option>
            <option value="timeline">Timeline</option>
            <option value="dueDate">Due date</option>
            <option value="status">Status</option>
            <option value="owner">Owner</option>
          </select>
        </Field>
      </div>

      <label className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <input type="checkbox" checked={blockerOnly} onChange={(event) => setBlockerOnly(event.target.checked)} />
        Show blockers only
      </label>

      <div className="mb-4 grid gap-3 rounded-md border border-[var(--line)] bg-[var(--panel-strong)]/40 p-3 lg:grid-cols-[auto_repeat(3,minmax(170px,1fr))] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Bulk actions</p>
          <p className="mt-1 text-sm">{selectedCount} selected</p>
        </div>
        <Field label="Set status">
          <div className="flex gap-2">
            <select className={inputClass} value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as TaskStatus)}>
              {taskStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <Button variant="secondary" disabled={!selectedCount} onClick={() => applyBulk((taskId) => updateTaskStatus(taskId, bulkStatus))}>Apply</Button>
          </div>
        </Field>
        <Field label="Set owner">
          <div className="flex gap-2">
            <select className={inputClass} value={bulkOwner} onChange={(event) => setBulkOwner(event.target.value)}>
              <option value="">Choose owner</option>
              {ownerOptions.map((owner) => <option key={owner}>{owner}</option>)}
            </select>
            <Button variant="secondary" disabled={!selectedCount || !bulkOwner} onClick={() => applyBulk((taskId) => updateTaskOwner(taskId, bulkOwner))}>Apply</Button>
          </div>
        </Field>
        <Field label="Set document">
          <div className="flex gap-2">
            <select className={inputClass} value={bulkDocumentStatus} onChange={(event) => setBulkDocumentStatus(event.target.value as DocumentStatus)}>
              {documentStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <Button variant="secondary" disabled={!selectedCount} onClick={() => applyBulk((taskId) => updateDocumentStatus(taskId, bulkDocumentStatus))}>Apply</Button>
          </div>
        </Field>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
          <thead className="border-y border-[var(--line)] bg-[var(--panel-strong)] text-xs uppercase tracking-[0.1em] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-3 font-semibold">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible tasks" />
              </th>
              {["S. No.", "Phase", "Timeline", "Internal Due Date", "Statutory Limit", "Action", "Responsible Parties", "Status", "Evidence", "Risk", "Blocker", "Owner", "Last Updated"].map((header) => (
                <th key={header} className="px-3 py-3 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => {
              const open = expanded === task.id;
              const statutoryDate = getComputedStatutoryDate(task, deal.closingDateX);
              const urgency = getDeadlineUrgency(task, deal.closingDateX);
              const countdown = deadlineCountdownLabel(task, deal.closingDateX);
              return (
                <Fragment key={task.id}>
                  <tr className="border-b border-[var(--line)] align-top hover:bg-[var(--panel-strong)]/60">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleSelected(task.id)} aria-label={`Select ${task.serialNumber}`} />
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <button className="inline-flex items-center gap-1" onClick={() => setExpanded(open ? null : task.id)}>
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {task.serialNumber}
                      </button>
                    </td>
                    <td className="px-3 py-3">{task.phase}</td>
                    <td className="px-3 py-3"><Badge>{task.timeline}</Badge></td>
                    <td className="px-3 py-3">
                      <Badge tone={deadlineUrgencyTone[urgency]}>{formatDate(getComputedDueDate(task, deal.closingDateX))}</Badge>
                      {countdown ? <span className="mt-1 block text-xs text-[var(--muted)]">{countdown}</span> : null}
                    </td>
                    <td className="px-3 py-3">
                      {task.filing?.statutoryDays || task.statutoryDeadlineNote ? (
                        <Badge tone={task.filing?.statutoryDays ? "warning" : "neutral"}>
                          {statutoryDate ? formatDate(statutoryDate) : task.statutoryDeadlineNote ?? `${task.filing?.statutoryDays} days`}
                        </Badge>
                      ) : (
                        <span className="text-[var(--muted)]">-</span>
                      )}
                    </td>
                    <td className="max-w-[360px] px-3 py-3 leading-relaxed">
                      <p><TaskRef task={task} full /></p>
                      {task.filing || task.statutoryDeadlineNote ? (
                        <span className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-yellow-700/30 bg-yellow-700/10 px-2 py-1 text-xs leading-snug text-[var(--warning)]">
                          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                          Verify with counsel
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{task.parties.join(", ")}</td>
                    <td className="px-3 py-3">
                      <select className={inputClass} value={task.status} onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}>
                        {taskStatuses.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={task.evidence.satisfied} onChange={(event) => updateTaskEvidence(task.id, { satisfied: event.target.checked })} />
                        <span>{task.evidence.satisfied ? "Satisfied" : "Missing"}</span>
                      </label>
                    </td>
                    <td className="px-3 py-3"><Badge tone={task.priority === "Critical" ? "danger" : "neutral"}>{task.riskCategory}</Badge></td>
                    <td className="px-3 py-3">{task.blocker ? <Badge tone="danger">Yes</Badge> : <Badge>No</Badge>}</td>
                    <td className="px-3 py-3">{task.owner}</td>
                    <td className="px-3 py-3">{new Date(task.lastUpdated).toLocaleDateString("en-IN")}</td>
                  </tr>
                  {open ? (
                    <tr className="border-b border-[var(--line)] bg-[var(--panel)]">
                      <td colSpan={14} className="px-5 py-4">
                        <div className="grid gap-4 lg:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Evidence checklist</p>
                            <p className="mt-1 text-sm">{task.evidence.label}</p>
                            <p className="mt-2 text-xs text-[var(--muted)]">Required: {task.evidence.required ? "Yes" : "No"} - Document category: {task.documentCategory}</p>
                          </div>
                          <Field label="Document status">
                            <select className={inputClass} value={task.documentStatus} onChange={(event) => updateDocumentStatus(task.id, event.target.value as DocumentStatus)}>
                              {documentStatuses.map((item) => <option key={item}>{item}</option>)}
                            </select>
                          </Field>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Dependencies</p>
                            <p className="mt-1 text-sm">{task.dependencies.length ? task.dependencies.map((item) => item.label).join("; ") : "No dependencies recorded."}</p>
                          </div>
                          <Field label="External register link" className="lg:col-span-2">
                            <input
                              className={inputClass}
                              value={task.evidence.externalLink ?? ""}
                              onChange={(event) => updateTaskEvidence(task.id, { externalLink: event.target.value })}
                              placeholder="Paste DMS / SharePoint / Drive URL only; do not upload documents here"
                            />
                          </Field>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Deadline basis</p>
                            <p className="mt-1 text-sm">
                              Internal: {formatDate(getComputedDueDate(task, deal.closingDateX))}
                              {task.filing?.statutoryDays ? `; statutory: ${task.filing.statutoryDays} days from ${task.filing.statutoryTrigger}` : ""}
                              {task.statutoryDeadlineNote && !task.filing?.statutoryDays ? `; ${task.statutoryDeadlineNote}` : ""}
                            </p>
                            {task.filing || task.statutoryDeadlineNote ? (
                              <p className="mt-2 rounded-md border border-yellow-700/30 bg-yellow-700/10 p-2 text-xs leading-relaxed text-[var(--warning)]">
                                {statutoryVerificationDisclaimer}
                              </p>
                            ) : null}
                          </div>
                          <div className="lg:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Comments / remarks</p>
                            <p className="mt-1 text-sm leading-relaxed">{task.comments}</p>
                          </div>
                          <Field label="Notes" className="lg:col-span-1">
                            <textarea
                              className={`${inputClass} min-h-20`}
                              maxLength={STATUS_NOTE_MAX_LENGTH}
                              value={task.notes}
                              onChange={(event) => updateTaskNotes(task.id, event.target.value)}
                              placeholder={confidentialityReminder}
                            />
                            <span className="text-xs text-[var(--muted)]">{task.notes.length}/{STATUS_NOTE_MAX_LENGTH}</span>
                          </Field>
                          <div className="lg:col-span-3 flex flex-wrap items-center gap-2">
                            <Badge>Source: {task.sourceReference}</Badge>
                            <Badge>Reviewer: {task.reviewer}</Badge>
                            {task.filing ? <Badge tone="accent">{task.filing.form} - {task.filing.authority}</Badge> : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {!filteredTasks.length ? (
        <div className="mt-4 rounded-md border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
          No checklist items match the current filters.
          <Button className="ml-3" variant="secondary" onClick={() => { setSearch(""); setPhase("All"); setStatus("All"); setParty("All"); setBlockerOnly(false); setDueFilter("All"); }}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function compareTasks(a: Task, b: Task, key: SortKey, closingDateX: string): number {
  if (key === "dueDate") {
    return Number(getComputedDueDate(a, closingDateX) ?? 0) - Number(getComputedDueDate(b, closingDateX) ?? 0);
  }
  return String(a[key]).localeCompare(String(b[key]), "en", { numeric: true });
}
