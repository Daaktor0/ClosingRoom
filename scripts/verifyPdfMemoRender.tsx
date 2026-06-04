import { readFile } from "node:fs/promises";
import { join } from "node:path";
import React from "react";
import { Document, Page, Text, pdf } from "@react-pdf/renderer";
import { createSeedDeal } from "../lib/checklistSeed";
import { ClosingStatusReport, getPdfTypefaces, preparePdfFonts } from "../lib/pdfReport";

const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
  const url = new URL(rawUrl, "http://localhost");

  if (url.pathname.startsWith("/fonts/")) {
    if (init?.method === "HEAD") return new Response(null, { status: 200 });

    const bytes = await readFile(join(process.cwd(), "public", url.pathname));
    return new Response(bytes, {
      status: 200,
      headers: { "content-type": "font/ttf" }
    });
  }

  return originalFetch(input, init);
};

async function main() {
  await preparePdfFonts();

  const typefaces = getPdfTypefaces();
  if (typefaces.serif.fontFamily !== "PdfEditorialSerif" || typefaces.body.fontFamily !== "PdfEditorialSans" || typefaces.mono.fontFamily !== "PdfEditorialMono") {
    throw new Error("PDF memo fonts were not registered; renderer is using fallback fonts.");
  }

  await verifyFamily("PdfEditorialSerif", "Source Serif 4");
  await verifyFamily("PdfEditorialSans", "Inter");
  await verifyFamily("PdfEditorialMono", "Roboto Mono");

  const deal = createSeedDeal();

  for (const includeNotes of [false, true]) {
    const document = React.createElement(ClosingStatusReport, { deal, includeNotes }) as unknown as Parameters<typeof pdf>[0];
    const blob = await pdf(document).toBlob();
    if (blob.size < 10_000) {
      throw new Error(`PDF memo render produced an unexpectedly small ${includeNotes ? "internal" : "external"} blob: ${blob.size} bytes.`);
    }
    console.log(`PDF memo render ok: ${includeNotes ? "internal" : "external"} (${blob.size} bytes)`);
  }
}

async function verifyFamily(fontFamily: string, label: string) {
  try {
    const document = (
      <Document>
        <Page size="A4">
          <Text style={{ fontFamily, fontWeight: 400 }}>{label} regular Closing Status Memo</Text>
          <Text style={{ fontFamily, fontWeight: 700 }}>{label} bold 16 blockers 90 days</Text>
        </Page>
      </Document>
    ) as unknown as Parameters<typeof pdf>[0];
    const blob = await pdf(document).toBlob();
    if (blob.size < 1_000) throw new Error(`${label} smoke PDF was unexpectedly small: ${blob.size} bytes.`);
    console.log(`PDF font render ok: ${label} (${blob.size} bytes)`);
  } catch (error) {
    throw new Error(`PDF font render failed for ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
