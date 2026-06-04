"use client";

import { create } from "zustand";
import { createSeedDeal } from "./checklistSeed";
import { STATUS_NOTE_MAX_LENGTH } from "./constants";
import { createDealNote, loadDealById as fetchDealById, loadOrCreateCurrentDeal, resetCurrentDeal, saveDealPatch, saveTaskPatch } from "./supabasePersistence";
import { getSupabaseClient } from "./supabaseClient";
import type { Deal, DealNote, DocumentStatus, Evidence, TaskStatus } from "./types";

export interface Toast {
  id: string;
  title: string;
  message: string;
  tone: "danger" | "success" | "neutral";
}

interface DealStore {
  deal: Deal;
  syncStatus: "idle" | "loading" | "saving" | "error";
  syncMessage: string;
  saveError: string | null;
  toasts: Toast[];
  localMode: boolean;
  loadFromSupabase: () => Promise<void>;
  loadDealById: (dealId: string) => Promise<void>;
  enterLocalMode: () => void;
  signOut: () => Promise<void>;
  clearSaveError: () => void;
  dismissToast: (toastId: string) => void;
  setClosingDate: (closingDateX: string) => void;
  updateDealMeta: (patch: Pick<Deal, "name" | "companyName" | "investorName">) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTaskEvidence: (taskId: string, evidence: Partial<Evidence>) => void;
  updateDocumentStatus: (taskId: string, status: DocumentStatus) => void;
  updateTaskOwner: (taskId: string, owner: string) => void;
  updateTaskNotes: (taskId: string, notes: string) => void;
  addNote: (note: Omit<DealNote, "id" | "createdAt">) => void;
  resetDemo: () => void;
}

function touch(): string {
  return new Date().toISOString();
}

type SetDealStore = (partial: Partial<DealStore> | ((state: DealStore) => Partial<DealStore>)) => void;
type DealTask = Deal["tasks"][number];
type DealField = "name" | "companyName" | "investorName" | "closingDateX";
type TaskField = "status" | "evidence" | "documentStatus" | "owner" | "notes" | "lastUpdated";
type RollbackOutcome = { reverted: boolean; label: string };

const LOCAL_DEMO_MESSAGE = "Local demo - changes are not saved";
const TASK_LABEL_BOUNDARY = /[,;:]|\sand\s|\sincluding\s|\s&\s/i;

let saveQueue: Promise<unknown> = Promise.resolve();
let saveSequence = 0;
let localModeFlag = false;
const persistedValues = new Map<string, unknown>();

function copyValue<T>(value: T): T {
  if (value && typeof value === "object") return JSON.parse(JSON.stringify(value)) as T;
  return value;
}

function dealFieldKey(dealId: string, field: DealField): string {
  return `deal:${dealId}:${field}`;
}

function taskFieldKey(dealId: string, taskId: string, field: TaskField): string {
  return `task:${dealId}:${taskId}:${field}`;
}

function rememberPersistedValue<T>(key: string, value: T) {
  persistedValues.set(key, copyValue(value));
}

function getPersistedValue<T>(key: string, fallback: T): T {
  if (!persistedValues.has(key)) rememberPersistedValue(key, fallback);
  return copyValue(persistedValues.get(key) as T);
}

function rememberDealSnapshot(deal: Deal) {
  rememberPersistedValue(dealFieldKey(deal.id, "name"), deal.name);
  rememberPersistedValue(dealFieldKey(deal.id, "companyName"), deal.companyName);
  rememberPersistedValue(dealFieldKey(deal.id, "investorName"), deal.investorName);
  rememberPersistedValue(dealFieldKey(deal.id, "closingDateX"), deal.closingDateX);

  for (const task of deal.tasks) {
    rememberPersistedValue(taskFieldKey(deal.id, task.id, "status"), task.status);
    rememberPersistedValue(taskFieldKey(deal.id, task.id, "evidence"), task.evidence);
    rememberPersistedValue(taskFieldKey(deal.id, task.id, "documentStatus"), task.documentStatus);
    rememberPersistedValue(taskFieldKey(deal.id, task.id, "owner"), task.owner);
    rememberPersistedValue(taskFieldKey(deal.id, task.id, "notes"), task.notes);
    rememberPersistedValue(taskFieldKey(deal.id, task.id, "lastUpdated"), task.lastUpdated);
  }
}

function taskToastLabel(task: DealTask): string {
  const action = task.action.trim();
  const boundary = action.search(TASK_LABEL_BOUNDARY);
  let label = boundary > 0 ? action.slice(0, boundary) : action;
  if (label.length > 58) label = `${label.slice(0, 58).replace(/\s+\S*$/, "").trimEnd()}...`;
  return `${task.serialNumber}: ${label || "task"}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Save failed. The local change was reverted.";
}

function pushToast(set: SetDealStore, toast: Omit<Toast, "id">) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  set((state) => ({ toasts: [{ ...toast, id }, ...state.toasts].slice(0, 4) }));
}

function withSaveStatus(set: SetDealStore, action: () => Promise<unknown>, rollback?: () => RollbackOutcome, onSuccess?: () => void) {
  if (localModeFlag) {
    set({ syncStatus: "idle", syncMessage: LOCAL_DEMO_MESSAGE, saveError: null });
    return;
  }

  const sequence = ++saveSequence;
  set({ syncStatus: "saving", syncMessage: "Saving to Supabase...", saveError: null });

  saveQueue = saveQueue
    .catch(() => undefined)
    .then(action)
    .then(() => {
      onSuccess?.();
      if (sequence === saveSequence) set({ syncStatus: "idle", syncMessage: "Saved in Supabase", saveError: null });
    })
    .catch((error: unknown) => {
      const outcome = rollback?.();
      const message = errorMessage(error);
      if (outcome?.reverted) {
        pushToast(set, {
          title: `Couldn't save ${outcome.label} - change reverted`,
          message,
          tone: "danger"
        });
      }
      set({ saveError: message });
      if (sequence === saveSequence) set({ syncStatus: "error", syncMessage: `Save failed - ${message}` });
    });
}

function rollbackTask(set: SetDealStore, taskId: string, patch: (task: DealTask) => DealTask): boolean {
  let reverted = false;
  set((state) => ({
    deal: {
      ...state.deal,
      tasks: state.deal.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const nextTask = patch(task);
        if (nextTask !== task) reverted = true;
        return nextTask;
      })
    }
  }));
  return reverted;
}

const initialDeal = createSeedDeal();
rememberDealSnapshot(initialDeal);

export const useDealStore = create<DealStore>()(
  (set, get) => ({
    deal: initialDeal,
    syncStatus: "idle",
    syncMessage: "Local demo data",
    saveError: null,
    toasts: [],
    localMode: false,
    loadFromSupabase: async () => {
      localModeFlag = false;
      set({ localMode: false, syncStatus: "loading", syncMessage: "Loading Supabase data...", saveError: null });
      try {
        const deal = await loadOrCreateCurrentDeal();
        rememberDealSnapshot(deal);
        set({ deal, syncStatus: "idle", syncMessage: "Saved in Supabase", saveError: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load Supabase data";
        set({ syncStatus: "error", syncMessage: message, saveError: message });
      }
    },
    loadDealById: async (dealId) => {
      localModeFlag = false;
      set({ localMode: false, syncStatus: "loading", syncMessage: "Loading deal...", saveError: null });
      try {
        const deal = await fetchDealById(dealId);
        rememberDealSnapshot(deal);
        set({ deal, syncStatus: "idle", syncMessage: "Saved in Supabase", saveError: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load this deal";
        set({ syncStatus: "error", syncMessage: message, saveError: message });
      }
    },
    enterLocalMode: () => {
      localModeFlag = true;
      const deal = createSeedDeal();
      rememberDealSnapshot(deal);
      set({ deal, localMode: true, syncStatus: "idle", syncMessage: LOCAL_DEMO_MESSAGE, saveError: null });
    },
    signOut: async () => {
      const supabase = getSupabaseClient();
      await supabase?.auth.signOut();
      const deal = createSeedDeal();
      rememberDealSnapshot(deal);
      set({ deal, syncStatus: "idle", syncMessage: "Signed out", saveError: null });
    },
    clearSaveError: () => set({ saveError: null }),
    dismissToast: (toastId) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== toastId) })),
    setClosingDate: (closingDateX) => {
      const dealId = get().deal.id;
      const fieldKey = dealFieldKey(dealId, "closingDateX");
      getPersistedValue(fieldKey, get().deal.closingDateX);
      set((state) => ({ deal: { ...state.deal, closingDateX } }));
      withSaveStatus(
        set,
        () => saveDealPatch(dealId, { closingDateX }),
        () => {
          const persisted = getPersistedValue(fieldKey, "");
          let reverted = false;
          set((state) => {
            if (state.deal.id !== dealId || state.deal.closingDateX !== closingDateX || Object.is(state.deal.closingDateX, persisted)) return {};
            reverted = true;
            return { deal: { ...state.deal, closingDateX: persisted } };
          });
          return { reverted, label: "Closing Date X" };
        },
        () => rememberPersistedValue(fieldKey, closingDateX)
      );
    },
    updateDealMeta: (patch) => {
      const dealId = get().deal.id;
      for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
        getPersistedValue(dealFieldKey(dealId, key), get().deal[key]);
      }
      set((state) => ({ deal: { ...state.deal, ...patch } }));
      withSaveStatus(
        set,
        () => saveDealPatch(dealId, patch),
        () => {
          let changed = false;
          set((state) => {
            if (state.deal.id !== dealId) return {};
            let nextDeal = state.deal;
            for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
              const persisted = getPersistedValue(dealFieldKey(dealId, key), state.deal[key]);
              if (nextDeal[key] === patch[key] && !Object.is(nextDeal[key], persisted)) {
                nextDeal = nextDeal === state.deal ? { ...state.deal } : nextDeal;
                nextDeal[key] = persisted;
                changed = true;
              }
            }
            return changed ? { deal: nextDeal } : {};
          });
          return { reverted: changed, label: "deal details" };
        },
        () => {
          for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
            rememberPersistedValue(dealFieldKey(dealId, key), patch[key]);
          }
        }
      );
    },
    updateTaskStatus: (taskId, status) => {
      const dealId = get().deal.id;
      const previous = get().deal.tasks.find((task) => task.id === taskId);
      if (!previous) return;
      const label = taskToastLabel(previous);
      const statusKey = taskFieldKey(dealId, taskId, "status");
      const lastUpdatedKey = taskFieldKey(dealId, taskId, "lastUpdated");
      getPersistedValue(statusKey, previous.status);
      getPersistedValue(lastUpdatedKey, previous.lastUpdated);
      const optimisticLastUpdated = touch();
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, status, lastUpdated: optimisticLastUpdated } : task))
        }
      }));
      withSaveStatus(
        set,
        () => saveTaskPatch(dealId, taskId, { status }),
        () => {
          const persistedStatus = getPersistedValue<TaskStatus>(statusKey, previous.status);
          const persistedLastUpdated = getPersistedValue(lastUpdatedKey, previous.lastUpdated);
          const reverted = rollbackTask(set, taskId, (task) => {
            if (task.status !== status) return task;
            const nextLastUpdated = task.lastUpdated === optimisticLastUpdated ? persistedLastUpdated : task.lastUpdated;
            if (Object.is(task.status, persistedStatus) && Object.is(task.lastUpdated, nextLastUpdated)) return task;
            return { ...task, status: persistedStatus, lastUpdated: nextLastUpdated };
          });
          return { reverted, label };
        },
        () => {
          rememberPersistedValue(statusKey, status);
          rememberPersistedValue(lastUpdatedKey, optimisticLastUpdated);
        }
      );
    },
    updateTaskEvidence: (taskId, evidence) => {
      const dealId = get().deal.id;
      const previous = get().deal.tasks.find((task) => task.id === taskId);
      if (!previous) return;
      const label = taskToastLabel(previous);
      const evidenceKey = taskFieldKey(dealId, taskId, "evidence");
      const lastUpdatedKey = taskFieldKey(dealId, taskId, "lastUpdated");
      getPersistedValue(evidenceKey, previous.evidence);
      getPersistedValue(lastUpdatedKey, previous.lastUpdated);
      const optimisticEvidence = { ...previous.evidence, ...evidence };
      const optimisticLastUpdated = touch();
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) =>
            task.id === taskId ? { ...task, evidence: { ...task.evidence, ...evidence }, lastUpdated: optimisticLastUpdated } : task
          )
        }
      }));
      withSaveStatus(
        set,
        () => saveTaskPatch(dealId, taskId, { evidence: optimisticEvidence }),
        () => {
          const persistedEvidence = getPersistedValue<Evidence>(evidenceKey, previous.evidence);
          const persistedLastUpdated = getPersistedValue(lastUpdatedKey, previous.lastUpdated);
          const reverted = rollbackTask(set, taskId, (task) => {
            const nextEvidence = { ...task.evidence };
            let matchedOptimisticField = false;
            let changed = false;
            for (const key of Object.keys(evidence) as Array<keyof Evidence>) {
              if (Object.is(nextEvidence[key], optimisticEvidence[key])) {
                matchedOptimisticField = true;
                if (!Object.is(nextEvidence[key], persistedEvidence[key])) {
                  nextEvidence[key] = persistedEvidence[key] as never;
                  changed = true;
                }
              }
            }
            if (!matchedOptimisticField) return task;
            const nextLastUpdated = task.lastUpdated === optimisticLastUpdated ? persistedLastUpdated : task.lastUpdated;
            if (!changed && Object.is(task.lastUpdated, nextLastUpdated)) return task;
            return { ...task, evidence: nextEvidence, lastUpdated: nextLastUpdated };
          });
          return { reverted, label };
        },
        () => {
          rememberPersistedValue(evidenceKey, optimisticEvidence);
          rememberPersistedValue(lastUpdatedKey, optimisticLastUpdated);
        }
      );
    },
    updateDocumentStatus: (taskId, documentStatus) => {
      const dealId = get().deal.id;
      const previous = get().deal.tasks.find((task) => task.id === taskId);
      if (!previous) return;
      const label = taskToastLabel(previous);
      const documentStatusKey = taskFieldKey(dealId, taskId, "documentStatus");
      const lastUpdatedKey = taskFieldKey(dealId, taskId, "lastUpdated");
      getPersistedValue(documentStatusKey, previous.documentStatus);
      getPersistedValue(lastUpdatedKey, previous.lastUpdated);
      const optimisticLastUpdated = touch();
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, documentStatus, lastUpdated: optimisticLastUpdated } : task))
        }
      }));
      withSaveStatus(
        set,
        () => saveTaskPatch(dealId, taskId, { documentStatus }),
        () => {
          const persistedDocumentStatus = getPersistedValue<DocumentStatus>(documentStatusKey, previous.documentStatus);
          const persistedLastUpdated = getPersistedValue(lastUpdatedKey, previous.lastUpdated);
          const reverted = rollbackTask(set, taskId, (task) => {
            if (task.documentStatus !== documentStatus) return task;
            const nextLastUpdated = task.lastUpdated === optimisticLastUpdated ? persistedLastUpdated : task.lastUpdated;
            if (Object.is(task.documentStatus, persistedDocumentStatus) && Object.is(task.lastUpdated, nextLastUpdated)) return task;
            return { ...task, documentStatus: persistedDocumentStatus, lastUpdated: nextLastUpdated };
          });
          return { reverted, label };
        },
        () => {
          rememberPersistedValue(documentStatusKey, documentStatus);
          rememberPersistedValue(lastUpdatedKey, optimisticLastUpdated);
        }
      );
    },
    updateTaskOwner: (taskId, owner) => {
      const dealId = get().deal.id;
      const previous = get().deal.tasks.find((task) => task.id === taskId);
      if (!previous) return;
      const label = taskToastLabel(previous);
      const ownerKey = taskFieldKey(dealId, taskId, "owner");
      const lastUpdatedKey = taskFieldKey(dealId, taskId, "lastUpdated");
      getPersistedValue(ownerKey, previous.owner);
      getPersistedValue(lastUpdatedKey, previous.lastUpdated);
      const optimisticLastUpdated = touch();
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, owner, lastUpdated: optimisticLastUpdated } : task))
        }
      }));
      withSaveStatus(
        set,
        () => saveTaskPatch(dealId, taskId, { owner }),
        () => {
          const persistedOwner = getPersistedValue(ownerKey, previous.owner);
          const persistedLastUpdated = getPersistedValue(lastUpdatedKey, previous.lastUpdated);
          const reverted = rollbackTask(set, taskId, (task) => {
            if (task.owner !== owner) return task;
            const nextLastUpdated = task.lastUpdated === optimisticLastUpdated ? persistedLastUpdated : task.lastUpdated;
            if (Object.is(task.owner, persistedOwner) && Object.is(task.lastUpdated, nextLastUpdated)) return task;
            return { ...task, owner: persistedOwner, lastUpdated: nextLastUpdated };
          });
          return { reverted, label };
        },
        () => {
          rememberPersistedValue(ownerKey, owner);
          rememberPersistedValue(lastUpdatedKey, optimisticLastUpdated);
        }
      );
    },
    updateTaskNotes: (taskId, notes) => {
      const cappedNotes = notes.slice(0, STATUS_NOTE_MAX_LENGTH);
      const dealId = get().deal.id;
      const previous = get().deal.tasks.find((task) => task.id === taskId);
      if (!previous) return;
      const label = taskToastLabel(previous);
      const notesKey = taskFieldKey(dealId, taskId, "notes");
      const lastUpdatedKey = taskFieldKey(dealId, taskId, "lastUpdated");
      getPersistedValue(notesKey, previous.notes);
      getPersistedValue(lastUpdatedKey, previous.lastUpdated);
      const optimisticLastUpdated = touch();
      set((state) => ({
        deal: {
          ...state.deal,
          tasks: state.deal.tasks.map((task) => (task.id === taskId ? { ...task, notes: cappedNotes, lastUpdated: optimisticLastUpdated } : task))
        }
      }));
      withSaveStatus(
        set,
        () => saveTaskPatch(dealId, taskId, { notes: cappedNotes }),
        () => {
          const persistedNotes = getPersistedValue(notesKey, previous.notes);
          const persistedLastUpdated = getPersistedValue(lastUpdatedKey, previous.lastUpdated);
          const reverted = rollbackTask(set, taskId, (task) => {
            if (task.notes !== cappedNotes) return task;
            const nextLastUpdated = task.lastUpdated === optimisticLastUpdated ? persistedLastUpdated : task.lastUpdated;
            if (Object.is(task.notes, persistedNotes) && Object.is(task.lastUpdated, nextLastUpdated)) return task;
            return { ...task, notes: persistedNotes, lastUpdated: nextLastUpdated };
          });
          return { reverted, label };
        },
        () => {
          rememberPersistedValue(notesKey, cappedNotes);
          rememberPersistedValue(lastUpdatedKey, optimisticLastUpdated);
        }
      );
    },
    addNote: (note) => {
      const localNote = { ...note, text: note.text.slice(0, STATUS_NOTE_MAX_LENGTH), id: `note-${Date.now()}`, createdAt: touch() };
      set((state) => ({
        deal: {
          ...state.deal,
          notes: [localNote, ...state.deal.notes]
        }
      }));
      withSaveStatus(
        set,
        () => createDealNote(get().deal.id, localNote).then((savedNote) =>
          set((state) => ({
            deal: {
              ...state.deal,
              notes: state.deal.notes.map((item) => (item.id === localNote.id ? savedNote : item))
            }
          }))
        ),
        () => {
          let reverted = false;
          set((state) => {
            if (!state.deal.notes.some((item) => item.id === localNote.id)) return {};
            reverted = true;
            return {
              deal: {
                ...state.deal,
                notes: state.deal.notes.filter((item) => item.id !== localNote.id)
              }
            };
          });
          return { reverted, label: "note" };
        }
      );
    },
    resetDemo: async () => {
      if (localModeFlag) {
        const deal = createSeedDeal();
        rememberDealSnapshot(deal);
        set({ deal, syncStatus: "idle", syncMessage: LOCAL_DEMO_MESSAGE, saveError: null });
        return;
      }
      set({ syncStatus: "saving", syncMessage: "Resetting Supabase data...", saveError: null });
      try {
        const deal = await resetCurrentDeal(get().deal.id);
        rememberDealSnapshot(deal);
        set({ deal, syncStatus: "idle", syncMessage: "Saved in Supabase", saveError: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not reset tracker data";
        set({ syncStatus: "error", syncMessage: message, saveError: message });
      }
    }
  })
);
