"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui";
import { createSeedDeal } from "@/lib/checklistSeed";
import type { Deal } from "@/lib/types";

type PDFViewerComponent = ComponentType<{
  children: ReactNode;
  width: string;
  height: number;
  style?: CSSProperties;
}>;

type ClosingReportComponent = ComponentType<{
  deal: Deal;
  includeNotes?: boolean;
}>;

export default function PdfPreviewClient() {
  const [includeNotes, setIncludeNotes] = useState(false);
  const [ready, setReady] = useState(false);
  const [PDFViewer, setPDFViewer] = useState<PDFViewerComponent | null>(null);
  const [ClosingStatusReport, setClosingStatusReport] = useState<ClosingReportComponent | null>(null);
  const deal = useMemo(() => createSeedDeal(), []);

  useEffect(() => {
    let mounted = true;
    Promise.all([import("@/lib/pdfReport"), import("@react-pdf/renderer")])
      .then(async ([reportModule, pdfModule]) => {
        await reportModule.preparePdfFonts();
        if (mounted) {
          setClosingStatusReport(() => reportModule.ClosingStatusReport as ClosingReportComponent);
          setPDFViewer(() => pdfModule.PDFViewer as PDFViewerComponent);
        }
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Dev-only PDF preview</p>
            <h1 className="font-display mt-2 text-3xl font-semibold">Closing Status Memo</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              Renders the actual React PDF document inline for external/internal mode checks.
            </p>
          </div>
          <Button variant={includeNotes ? "primary" : "secondary"} onClick={() => setIncludeNotes((value) => !value)}>
            {includeNotes ? "Internal notes on" : "External memo"}
          </Button>
        </header>

        <section className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)]">
          {ready && PDFViewer && ClosingStatusReport ? (
            <PDFViewer width="100%" height={820} style={{ border: "none" }}>
              <ClosingStatusReport deal={deal} includeNotes={includeNotes} />
            </PDFViewer>
          ) : ready ? (
            <div className="grid min-h-[680px] place-items-center text-sm text-[var(--muted)]">PDF viewer unavailable.</div>
          ) : (
            <div className="grid min-h-[680px] place-items-center text-sm text-[var(--muted)]">Preparing PDF fonts...</div>
          )}
        </section>
      </div>
    </main>
  );
}
