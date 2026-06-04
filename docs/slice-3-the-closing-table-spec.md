# Slice 3 — The Closing Table (Run Sheet + Workbook) — implementation contract

**Status:** Ready to build · **Depends on:** Slice 0 primitives (`StatusPill`, `getNextNaturalStatus`, `TaskRef`, `DeadlinePair`) ✓ · **Reference:** plan §7C, §8 (status-as-decision), §16 (the rollback gate).
**Verification model:** owner is the visual oracle (sandbox/capture can't see it). Verify structure via `get_page_text` + `typecheck`/`lint`/`build`; owner confirms the look + the gate behavior.

---

## 1. Goal

Turn the checklist from Excel-in-a-browser into a **decision surface**. The default is a **Run Sheet** of decision cards where changing a status feels like *marking a judgment* (one click), not filling a form. The dense table survives — deliberately — as a **Workbook** one toggle away, for power/bulk structured entry. The six stacked filter dropdowns stop being the front door.

This is the other half of the "stop feeling like a spreadsheet" thesis (the Brief was the first half).

---

## 2. Scope

**In:** the optimistic-rollback gate; the Run Sheet (decision cards + click-to-advance pills + "more states" menu + evidence); a slim filter bar; the Workbook (preserved table + bulk actions) behind a toggle; the `⌘K` command palette (now real).

**Out:** data-model / Supabase-schema changes; Dependencies/Documents/Risk/Notes lens work (Slice 4); keyboard `j`/`k` card nav (nice-to-have, v2 ok); Present mode / PDF memo (Slice 5).

---

## 3. THE GATE — harden optimistic rollback (build first, ship nothing else until it passes)

**Why first:** the Run Sheet fires rapid click-to-advance status writes. If a write fails silently, the tool *lies about deal status* — the worst possible failure for this product.

**Current behavior (`lib/store.ts`):** every mutation (`updateTaskStatus`, `updateTaskEvidence`, `updateDocumentStatus`, `updateTaskNotes`, `setClosingDate`, `updateDealMeta`) applies an optimistic `set(...)` immediately, then queues a Supabase save through `withSaveStatus`. On failure `withSaveStatus` sets `syncStatus:"error"` + message — but **never reverts the optimistic change**, and only the *latest* queued save reports status (`sequence === saveSequence`), so an earlier failure can be masked by a later edit. Net: the UI can show a status the DB rejected, with at most a stale global badge.

**Requirement:**
1. Each mutation **captures the prior value** of the specific field (task field or deal field) before the optimistic `set`.
2. The queued save gets a **per-action failure handler** (not gated by `saveSequence`) that, on rejection, **reverts that field to the captured prior value** — **guarded so it does not clobber a newer edit**: revert only if the field still equals the failed optimistic value.
3. The failure is **surfaced as a transient toast** ("Couldn't save {task label} — change reverted"), in addition to the existing sync badge. (Add a minimal toast slice — see §7.)
4. `localMode` is unchanged (no save path, no failure) — the demo won't exercise this, but the authenticated Supabase path must be correct.

**Test it:** temporarily force `saveTaskPatch` to reject (inject a throw), drive a status change, and confirm the optimistic value **visibly reverts** and a toast appears; then remove the injection. This is the acceptance gate — no pills before it passes.

---

## 4. The Run Sheet (default view) — `components/checklist/RunSheet.tsx`

Tasks as **decision cards**, grouped by phase (collapsible sections), each phase ordered by urgency × criticality (reuse the comparator pattern from `lib/timeline.ts` `compareSequenceRows` / the Brief's `compareTaskUrgency`).

**Each card:**
- `TaskRef` (action + quiet serial anchor) + owner.
- `DeadlinePair` (internal target vs. statutory hard-stop).
- Flags: Blocker / Critical / Risk-category / Sequencing (reuse `Badge`).
- **Primary gesture — the click-to-advance `StatusPill`**: wire its `onAdvance` to `store.updateTaskStatus` (now rollback-hardened). It advances along the natural path via `getNextNaturalStatus`.
- **"⋯ more states" menu** (sibling control, not nested in the pill): sets the non-linear states directly — `Waived`, `Blocked`, `Converted to CS`, `Not Applicable`, `With Client`, `With Investor Counsel`.
- **Evidence**: a single check affordance → `store.updateTaskEvidence({ satisfied })`.
- **Expand** (click card / chevron): reveal the detail that's in today's table's expanded row — evidence label, document status (`updateDocumentStatus`), dependencies, external register link, capped status-only notes (`updateTaskNotes`, 280-char), source/reviewer/filing. Reuse that content; don't reinvent it.

No grid here. Synthesized, calm, one decision per card.

---

## 5. Filter bar (replaces the six stacked dropdowns)

A slim bar at the top of the Closing Table: a **search box** + a few **segmented/chip toggles** for the high-value facets only — Phase chips, "Blockers only", "Open only" (and optionally Party). Everything heavier is reachable via `⌘K`. The **full filter set stays in the Workbook** (it's the power view).

---

## 6. The Workbook (preserved table) — `MasterChecklistTable.tsx` → `Workbook.tsx`

The existing dense table, **kept by design** as the structured/bulk-entry escape hatch (the owner explicitly said don't discard the dropdowns). Two changes only:
- Relabel/move to `Workbook.tsx`; it's reached by a **Run Sheet ⇄ Workbook segmented toggle** on the Closing Table surface (Run Sheet is the default).
- **Add multi-select**: row checkboxes → a bulk-actions toolbar (set status / set owner / set document status for the selected rows). This makes the heavy-entry case *better*, not just relocated — each bulk write goes through the same hardened mutation path.

Zero loss of structured-entry capability versus today is a hard acceptance criterion.

---

## 7. The `⌘K` command palette — `components/CommandPalette.tsx`

Real now (Slice 2 left a stub hook). Opens on `⌘K` / `Ctrl+K`; fuzzy-search; fully keyboard-driven. Commands:
- **Navigate:** go to Brief / Closing Table / Timeline / Closing Pack / Documents / Risk / Notes.
- **Act:** advance / complete a task (by serial or name), set Closing Date X, "Open closing pack" (the now-real Slice-2 command), Present to client.
- **Filter:** show blockers, show overdue, show a phase.

Mount in `ClosingRoomApp`; register commands there; wire to the store + the view setter. Keep command labels metadata-only — **never surface `notes`/`comments` text** in a command label.

**Toast surface (shared with the gate):** add a minimal toast slice (small zustand store or a slice on the deal store: `toasts: Toast[]`, `pushToast`, `dismissToast`) + a `components/ui/Toaster.tsx` mounted once in `ClosingRoomApp`. Used by the rollback gate and any future transient feedback.

---

## 8. Files

| File | Change |
|---|---|
| `lib/store.ts` | **The gate** — snapshot + per-action revert-on-failure + toast; for every mutation. Add the toast slice (or a separate store). |
| `components/ui/Toaster.tsx` | **New** — render the toast queue; mount once in `ClosingRoomApp`. |
| `components/checklist/RunSheet.tsx` | **New** — decision cards (§4). |
| `components/checklist/MasterChecklistTable.tsx` → `Workbook.tsx` | Relabel + multi-select bulk actions (§6). |
| `components/checklist/ClosingTable.tsx` | **New** (or fold into the Checklist view) — hosts the Run Sheet ⇄ Workbook toggle + the slim filter bar. |
| `components/CommandPalette.tsx` | **New** — `⌘K` (§7). |
| `components/ClosingRoomApp.tsx` | Checklist view → ClosingTable; mount `CommandPalette` + `Toaster`; register commands. |

**Reuse (do not rebuild):** `StatusPill` + `getNextNaturalStatus`, `TaskRef`, `DeadlinePair`, `StatutoryStop`, `Badge`, the rules engine, the store. Keep the data model untouched.

---

## 9. Confidentiality

Notes/comments stay **status-only and 280-char capped** — the store already enforces `STATUS_NOTE_MAX_LENGTH`; preserve it. The Run Sheet must not introduce any uncapped or free-narrative field, and `⌘K` must not echo note/comment text. Status-only spine intact.

---

## 10. Acceptance criteria

- [ ] **Gate:** a forced `saveTaskPatch` rejection makes the optimistic change **revert** and raises a **toast**; concurrent edits aren't clobbered. Verified before any pill ships.
- [ ] **Run Sheet (default):** phase-grouped decision cards; click-to-advance pills work end-to-end (UI → store → persistence → rollback on failure); "more states" menu sets side-states; evidence toggle works; expand reveals the structured detail.
- [ ] **Filter bar:** slim (search + a few chips) — the six stacked dropdowns are **not** the front door.
- [ ] **Workbook:** dense table preserved behind the toggle, with working bulk multi-select actions; **zero loss** of structured-entry capability.
- [ ] **`⌘K`:** opens via shortcut, fuzzy-finds, keyboard-driven, runs nav + task + filter commands; no note text in labels.
- [ ] One store / `getReadiness` source; data model untouched; notes capped/status-only.
- [ ] `typecheck` / `lint` / `build` green; structure spot-checked via `get_page_text`; owner visual pass (light **and** dark).

---

## 11. Build order

1. **The gate** — rollback hardening + toast surface (§3, §7). Test with a forced failure.
2. **Run Sheet** — decision cards + `StatusPill` wiring + "more states" menu + evidence + expand (§4).
3. **Filter bar + Workbook** — slim filters; relabel table to Workbook + bulk actions; the Run Sheet ⇄ Workbook toggle (§5, §6).
4. **`⌘K`** — command palette (§7).
5. **Wire `ClosingRoomApp`** — ClosingTable as the Checklist view, mount palette + toaster, register commands; verify.

---

*Non-goals: no data-model/Supabase-schema changes; **do not remove the table** (it is the Workbook); no Dependencies/Documents/Risk/Notes lens work (Slice 4); `j`/`k` card keyboard nav is optional v2. Keep the rules engine and store contracts intact — re-present, don't rebuild.*
