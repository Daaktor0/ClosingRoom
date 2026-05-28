"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { confidentialityReminder, STATUS_NOTE_MAX_LENGTH } from "@/lib/constants";
import { useDealStore } from "@/lib/store";
import type { NoteCategory } from "@/lib/types";

const categories: NoteCategory[] = ["Client Follow-up", "Investor Counsel Comment", "Waiver Position", "Open Question", "Closing Call Note"];

export function NotesPanel() {
  const { deal, addNote } = useDealStore();
  const [category, setCategory] = useState<NoteCategory>("Client Follow-up");
  const [text, setText] = useState("");

  return (
    <Card>
      <SectionHeader eyebrow="Notes" title="Smart Deal Notes" />
      <p className="mb-4 rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-3 text-sm text-[var(--muted)]">
        {confidentialityReminder}
      </p>
      <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
        <Field label="Category">
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value as NoteCategory)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Note">
          <input
            className={inputClass}
            maxLength={STATUS_NOTE_MAX_LENGTH}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Add status-only follow-up, waiver position, open question..."
          />
          <span className="text-xs text-[var(--muted)]">{text.length}/{STATUS_NOTE_MAX_LENGTH}</span>
        </Field>
        <Button className="mt-5" onClick={() => { if (text.trim()) { addNote({ category, text: text.trim() }); setText(""); } }}>
          <MessageSquarePlus size={16} /> Add
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        {deal.notes.map((note) => (
          <div key={note.id} className="rounded-md border border-[var(--line)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{note.category} - {new Date(note.createdAt).toLocaleString("en-IN")}</p>
            <p className="mt-1 text-sm">{note.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
