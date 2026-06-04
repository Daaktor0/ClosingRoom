"use client";

import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, SectionHeader } from "@/components/ui";
import { downloadTextFile, exportDealJson, exportMarkdownReport, exportTasksCsv } from "@/lib/export";
import { useDealStore } from "@/lib/store";

export function ExportPanel() {
  const { deal } = useDealStore();
  const [busy, setBusy] = useState<null | "pdf" | "excel">(null);
  const [includeNotes, setIncludeNotes] = useState(false);

  async function handlePdf() {
    setBusy("pdf");
    try {
      const { downloadPdfReport } = await import("@/lib/pdfReport");
      await downloadPdfReport(deal, { includeNotes });
    } finally {
      setIncludeNotes(false);
      setBusy(null);
    }
  }

  async function handleExcel() {
    setBusy("excel");
    try {
      const { downloadExcelWorkbook } = await import("@/lib/excelReport");
      await downloadExcelWorkbook(deal);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <SectionHeader eyebrow="Export" title="Closing Status Memo Downloads" />
      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePdf} disabled={busy !== null}>
          {busy === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} PDF status memo
        </Button>
        <Button onClick={handleExcel} disabled={busy !== null}>
          {busy === "excel" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel workbook
        </Button>
        <Button variant="secondary" onClick={() => downloadTextFile("fundraise-checklist.csv", exportTasksCsv(deal), "text/csv")}>
          <Download size={16} /> CSV
        </Button>
        <Button variant="secondary" onClick={() => downloadTextFile("closing-status-report.md", exportMarkdownReport(deal), "text/markdown")}>
          <Download size={16} /> Markdown
        </Button>
        <Button variant="secondary" onClick={() => downloadTextFile("fundraise-checklist.json", exportDealJson(deal), "application/json")}>
          <Download size={16} /> JSON backup
        </Button>
      </div>
      <label className="mt-4 flex max-w-xl items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-sm">
        <input
          type="checkbox"
          checked={includeNotes}
          disabled={busy !== null}
          onChange={(event) => setIncludeNotes(event.target.checked)}
          className="mt-1 size-4 accent-[var(--accent)]"
        />
        <span>
          <span className="block font-medium text-[var(--foreground)]">Include status notes (internal only)</span>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Off by default. Internal copies are marked on every PDF page and use a distinct filename.
          </span>
        </span>
      </label>
      <p className="mt-3 text-sm text-[var(--muted)]">
        The PDF memo defaults to external posture and omits status notes; the Excel workbook has per-phase sheets, a deadlines sheet (internal vs statutory) and conditional formatting. Notes are included only when the internal checkbox is selected for that export.
      </p>
    </Card>
  );
}
