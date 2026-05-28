"use client";

import { create } from "zustand";
import { createSeedDeal } from "./checklistSeed";
import { STATUS_NOTE_MAX_LENGTH } from "./constants";
import { createDealNote, loadDealById as fetchDealById, loadOrCreateCurrentDeal, resetCurrentDeal, saveDealPatch, saveTaskPatch } from "./supabasePersistence";
import { getSupabaseClient } from "./supabaseClient";
import type { Deal, DealNote, DocumentStatus, Evidence, TaskStatus } from "./types";

interface DealStore {
  deal: Deal;
  syncStatus: "idle" | "loading" | "saving" | "error";
  syncMessage: string;
  loadFromSupabase: () => Promise<void>;
  loadDealById: (dealId: string) => Promise<void>;
  signOut: () => Promise<void>;
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

type SetDealStore = (partial: Partial<DealStore> | ((state: DealStore) => Partial<DealStore>)) => void;

let saveQueue: Promise<unknown> = Promise.resolve();
let saveSequence = 0;

function withSaveStatus(set: SetDealStore, action: () => Promise<unknown>) {
  const sequence = ++saveSequence;
  set({ syncStatus: "saving", syncMessage: "Saving to Supabase..." });

  saveQueue = saveQueue
    .catch(() => undefined)
    .then(action)
    .then(() => {
      if (sequence === saveSequence) set({ syncStatus: "idle", syncMessage: "Saved in Supabase" });
    })
    .catch((error: Error) => {
      if (sequence === saveSequence) set({ syncStatus: "error", syncMessage: error.message });
    });
}

export const useDealStore = create<DealStore>()(
  (set, get) => ({
    deal: createSeedDeal(),
    syncStatus: "idle",
    syncMessage: "Local demo data",
    loadFromSupabase: async () => {
      set({ syncStatus: "loading", syncMessage: "Loading Supabase data..." });
      try {
        const deal = await loadOrCreateCurrentDeal();
        set({ deal, syncStatus: "idle", syncMessage: "Saved in Supabase" });
      } catch (error) {
        set({ syncStatus: "error", syncMessage: error instanceof Error ? error.message : "Could not load Supabase data" });
      }
    },
    loadDealById: async (dealId) => {
      set({ syncStatus: "loading", syncMessage: "Loading deal..." });
      try {
        const deal = await fetchDealById(dealId);
        set({ deal, syncStatus: "idle", syncMessage: "Saved in Supabase" });
      } catch (error) {
        set({ syncStatus: "error", syncMessage: error instanceof Error ? error.message : "Could not load this deal" });
      }
    },
    signOut: async () => {
      const supabase = getSupabaseClient();
      await supabase?.auth.signOut();
      set({ deal: createSeedDeal(), syncStatus: "idle", syncMessage: "Signed out" });
    },
    setClosingDate: (closingDateX) => {
      set((state) => ({ deal: { ...state.deal, closingDateX } }));
      withSaveStatus(set, () => saveDealPatch(get().deal.id, { closingDateX }));
    },
    updateDealMeta: (patch) => {
      set((state) => ({ deal: { ...state.deal, ...patch } }));
      withSaveStatus(set, () => saveDealPatch(get().deal.id, patch));
    },
    updateTaskStatus: (taskId, status) => {
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, status, lastUpdated: touch() } : task))
        }
      }));
      const task = get().deal.tasks.find((item) => item.id === taskId);
      if (task) withSaveStatus(set, () => saveTaskPatch(get().deal.id, taskId, { status: task.status }));
    },
    updateTaskEvidence: (taskId, evidence) => {
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) =>
            task.id === taskId ? { ...task, evidence: { ...task.evidence, ...evidence }, lastUpdated: touch() } : task
          )
        }
      }));
      const task = get().deal.tasks.find((item) => item.id === taskId);
      if (task) withSaveStatus(set, () => saveTaskPatch(get().deal.id, taskId, { evidence: task.evidence }));
    },
    updateDocumentStatus: (taskId, documentStatus) => {
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, documentStatus, lastUpdated: touch() } : task))
        }
      }));
      const task = get().deal.tasks.find((item) => item.id === taskId);
      if (task) withSaveStatus(set, () => saveTaskPatch(get().deal.id, taskId, { documentStatus: task.documentStatus }));
    },
    updateTaskNotes: (taskId, notes) => {
      const cappedNotes = notes.slice(0, STATUS_NOTE_MAX_LENGTH);
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, notes: cappedNotes, lastUpdated: touch() } : task))
        }
      }));
      withSaveStatus(set, () => saveTaskPatch(get().deal.id, taskId, { notes: cappedNotes }));
    },
    addNote: (note) => {
      const localNote = { ...note, text: note.text.slice(0, STATUS_NOTE_MAX_LENGTH), id: `note-${Date.now()}`, createdAt: touch() };
      set((state) => ({
        deal: {
          ...state.deal,
          notes: [localNote, ...state.deal.notes]
        }
      }));
      withSaveStatus(set, () => createDealNote(get().deal.id, localNote)
        .then((savedNote) =>
          set((state) => ({
            deal: {
              ...state.deal,
              notes: state.deal.notes.map((item) => (item.id === localNote.id ? savedNote : item))
            }
          }))
        ));
    },
    resetDemo: async () => {
      set({ syncStatus: "saving", syncMessage: "Resetting Supabase data..." });
      try {
        const deal = await resetCurrentDeal(get().deal.id);
        set({ deal, syncStatus: "idle", syncMessage: "Saved in Supabase" });
      } catch (error) {
        set({ syncStatus: "error", syncMessage: error instanceof Error ? error.message : "Could not reset demo data" });
      }
    }
  })
);
