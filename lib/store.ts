"use client";

import { create } from "zustand";
import { createSeedDeal } from "./checklistSeed";
import { STATUS_NOTE_MAX_LENGTH } from "./constants";
import type { Deal, DealNote, DocumentStatus, Evidence, TaskStatus } from "./types";

interface DealStore {
  deal: Deal;
  setClosingDate: (closingDateX: string) => void;
  updateDealMeta: (patch: Pick<Deal, "name" | "companyName" | "investorName">) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTaskEvidence: (taskId: string, evidence: Partial<Evidence>) => void;
  updateDocumentStatus: (taskId: string, status: DocumentStatus) => void;
  updateTaskNotes: (taskId: string, notes: string) => void;
  addNote: (note: Omit<DealNote, "id" | "createdAt">) => void;
  resetDemo: () => void;
}

function touch(): string {
  return new Date().toISOString();
}

export const useDealStore = create<DealStore>()(
  (set) => ({
    deal: createSeedDeal(),
    setClosingDate: (closingDateX) => set((state) => ({ deal: { ...state.deal, closingDateX } })),
    updateDealMeta: (patch) => set((state) => ({ deal: { ...state.deal, ...patch } })),
    updateTaskStatus: (taskId, status) =>
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, status, lastUpdated: touch() } : task))
        }
      })),
    updateTaskEvidence: (taskId, evidence) =>
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) =>
            task.id === taskId ? { ...task, evidence: { ...task.evidence, ...evidence }, lastUpdated: touch() } : task
          )
        }
      })),
    updateDocumentStatus: (taskId, documentStatus) =>
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, documentStatus, lastUpdated: touch() } : task))
        }
      })),
    updateTaskNotes: (taskId, notes) =>
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, notes: notes.slice(0, STATUS_NOTE_MAX_LENGTH), lastUpdated: touch() } : task))
        }
      })),
    addNote: (note) =>
      set((state) => ({
        deal: {
          ...state.deal,
          notes: [{ ...note, text: note.text.slice(0, STATUS_NOTE_MAX_LENGTH), id: `note-${Date.now()}`, createdAt: touch() }, ...state.deal.notes]
        }
      })),
    resetDemo: () => set({ deal: createSeedDeal() })
  })
);
