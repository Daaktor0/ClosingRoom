"use client";

import { AlertOctagon, CheckCircle2, FileWarning, ShieldCheck } from "lucide-react";
import { Badge, Card, ProgressBar, SectionHeader } from "@/components/ui";
import { useDealStore } from "@/lib/store";
import { getReadiness } from "@/lib/rules";

export function ClosingReadiness() {
  const { deal } = useDealStore();
  const readiness = getReadiness(deal);

  return (
    <div className="grid gap-4">
      <Card className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className={`mb-4 inline-flex rounded-full p-3 ${readiness.ready ? "bg-green-700/10 text-[var(--success)]" : "bg-red-700/10 text-[var(--danger)]"}`}>
            {readiness.ready ? <CheckCircle2 size={30} /> : <AlertOctagon size={30} />}
          </div>
          <h2 className="text-3xl font-semibold">{readiness.ready ? "Ready to close" : "Not ready to close"}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            This operational view checks CPs, mandatory pre-closing items, agreed-form documents, evidence, and sequencing warnings. It does not provide legal advice.
          </p>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Closing readiness score</span>
              <strong>{readiness.score}%</strong>
            </div>
            <ProgressBar value={readiness.score} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadinessBucket title="Pending CPs" count={readiness.pendingCps.length} items={readiness.pendingCps.map((task) => `${task.serialNumber} ${task.action}`)} tone="danger" />
          <ReadinessBucket title="Mandatory incomplete" count={readiness.mandatoryIncomplete.length} items={readiness.mandatoryIncomplete.map((task) => `${task.serialNumber} ${task.action}`)} tone="danger" />
          <ReadinessBucket title="Missing evidence" count={readiness.missingEvidence.length} items={readiness.missingEvidence.map((task) => `${task.serialNumber} ${task.evidence.label}`)} tone="warning" />
          <ReadinessBucket title="Missing agreed form" count={readiness.missingAgreedForm.length} items={readiness.missingAgreedForm.map((task) => `${task.serialNumber} ${task.documentCategory}`)} tone="warning" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="CP positions" title="Waived / Converted" />
          <div className="grid gap-3">
            <ReadinessBucket title="Waived CPs" count={readiness.waivedCps.length} items={readiness.waivedCps.map((task) => `${task.serialNumber} ${task.action}`)} tone="neutral" compact />
            <ReadinessBucket title="Converted to CS" count={readiness.convertedToCs.length} items={readiness.convertedToCs.map((task) => `${task.serialNumber} ${task.action}`)} tone="neutral" compact />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionHeader eyebrow="Closing pack" title="Final Closing Pack Checklist" />
          <div className="grid gap-2 md:grid-cols-2">
            {deal.tasks.filter((task) => task.mandatoryForClosing || task.timeline === "X").map((task) => (
              <div key={task.id} className="flex items-start gap-3 rounded-md border border-[var(--line)] p-3">
                <span className={`mt-0.5 ${["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status) ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                  {["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status) ? <ShieldCheck size={17} /> : <FileWarning size={17} />}
                </span>
                <div>
                  <p className="text-sm font-medium">{task.serialNumber} · {task.evidence.label}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{task.status} · {task.documentStatus}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReadinessBucket({ title, count, items, tone, compact = false }: { title: string; count: number; items: string[]; tone: "danger" | "warning" | "neutral"; compact?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--line)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <Badge tone={tone}>{count}</Badge>
      </div>
      {items.length ? (
        <ul className={`${compact ? "max-h-28" : "max-h-48"} space-y-2 overflow-auto pr-1 text-xs leading-relaxed text-[var(--muted)] scrollbar-thin`}>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">None.</p>
      )}
    </div>
  );
}
