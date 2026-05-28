"use client";

import { Download } from "lucide-react";
import { Button, Card, SectionHeader } from "@/components/ui";
import { downloadTextFile, exportDealJson, exportMarkdownReport, exportTasksCsv } from "@/lib/export";
import { useDealStore } from "@/lib/store";

export function ExportPanel() {
  const { deal } = useDealStore();

  return (
    <Card>
      <SectionHeader eyebrow="Export" title="Status Report Downloads" />
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => downloadTextFile("fundraise-checklist.csv", exportTasksCsv(deal), "text/csv")}>
          <Download size={16} /> CSV
        </Button>
        <Button variant="secondary" onClick={() => downloadTextFile("fundraise-checklist.json", exportDealJson(deal), "application/json")}>
          <Download size={16} /> JSON
        </Button>
        <Button onClick={() => downloadTextFile("closing-status-report.md", exportMarkdownReport(deal), "text/markdown")}>
          <Download size={16} /> Markdown status report
        </Button>
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        The Markdown report includes overall status, completed items, pending blockers, upcoming deadlines, owner-wise pending items, readiness conclusion and post-closing deadlines.
      </p>
    </Card>
  );
}
