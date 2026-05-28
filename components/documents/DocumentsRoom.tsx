"use client";

import { Archive, Link2 } from "lucide-react";
import { Badge, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { documentStatuses } from "@/lib/constants";
import { useDealStore } from "@/lib/store";
import type { DocumentStatus } from "@/lib/types";

export function DocumentsRoom() {
  const { deal, updateDocumentStatus, updateTaskEvidence } = useDealStore();
  const categories = Array.from(new Set(deal.tasks.map((task) => task.documentCategory)));

  return (
    <Card>
      <SectionHeader eyebrow="Evidence" title="Document Register" />
      <p className="mb-4 rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-3 text-sm text-[var(--muted)]">
        Status metadata and external links only. Do not upload or paste confidential documents, legal analysis, client financials or privileged content into this tracker.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((category) => {
          const tasks = deal.tasks.filter((task) => task.documentCategory === category);
          return (
            <div key={category} className="subtle-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold"><Archive size={17} className="text-[var(--accent)]" />{category}</p>
                <Badge>{tasks.length}</Badge>
              </div>
              <div className="grid gap-3">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{task.serialNumber} - {task.evidence.label}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{task.action}</p>
                      </div>
                      {task.evidence.satisfied ? <Badge tone="success">Evidence satisfied</Badge> : <Badge tone={task.evidence.required ? "warning" : "neutral"}>Missing</Badge>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Document status">
                        <select className={inputClass} value={task.documentStatus} onChange={(event) => updateDocumentStatus(task.id, event.target.value as DocumentStatus)}>
                          {documentStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </Field>
                      <label className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                        <input type="checkbox" checked={task.evidence.satisfied} onChange={(event) => updateTaskEvidence(task.id, { satisfied: event.target.checked })} />
                        Mark evidence satisfied / linked
                      </label>
                    </div>
                    <Field label="External DMS link" className="mt-3">
                      <input
                        className={inputClass}
                        value={task.evidence.externalLink ?? ""}
                        onChange={(event) => updateTaskEvidence(task.id, { externalLink: event.target.value })}
                        placeholder="External URL only; no file upload"
                      />
                    </Field>
                    <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]"><Link2 size={14} />The tracker stores the link and status only, not the underlying document.</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
