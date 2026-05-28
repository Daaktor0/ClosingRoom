"use client";

import { Upload } from "lucide-react";
import { Badge, Card, SectionHeader } from "@/components/ui";

export function ImportChecklist() {
  return (
    <Card>
      <SectionHeader eyebrow="Import" title="DOCX Checklist Import" action={<Badge tone="accent">Architecture ready</Badge>} />
      <div className="flex items-start gap-3 rounded-md border border-dashed border-[var(--line)] p-4">
        <Upload className="mt-1 text-[var(--accent)]" size={18} />
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          This MVP is seeded from the supplied Master Checklist DOCX. The task model is structured so a future parser can map DOCX rows into the same stable Task shape, using a library such as mammoth, without changing the screens.
        </p>
      </div>
    </Card>
  );
}
