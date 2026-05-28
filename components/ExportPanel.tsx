"use client";

import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, SectionHeader } from "@/components/ui";
import { downloadTextFile, exportDealJson, exportMarkdownReport, exportTasksCsv } from "@/lib/export";
import { useDealStore } from "@/lib/store";

export function ExportPanel() {
  const { deal } = useDealStore();
  const [busy, setBusy] = useState<null | "pdf" | "excel">(null);

  async function handlePdf() {
    setBusy("pdf");
    try {
      const { downloadPdfReport } = await import("@/lib/pdfReport");
      await downloadPdfReport(deal);
    } finally {
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
      <SectionHeader eyebrow="Export" title="Status Report Downloads" />
      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePdf} disabled={busy !== null}>
          {busy === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} PDF status report
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
      <p className="mt-3 text-sm text-[var(--muted)]">
        The PDF is a partner-ready Closing Status Report; the Excel workbook has per-phase sheets, a deadlines sheet (internal vs statutory) and conditional formatting. All exports draw from status fields only - no confidential content.
      </p>
    </Card>
  );
}
