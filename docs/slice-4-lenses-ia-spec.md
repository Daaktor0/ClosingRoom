# Slice 4 — Lenses + IA Cleanup — implementation contract

**Status:** Ready to build · **Depends on:** Slice 3 (Closing Table: Run Sheet ⇄ Workbook toggle, slim filter bar, `⌘K`, rollback gate) ✓ · **Reference:** plan §6 (IA — eight tabs → three rooms), §3 principle 5 (altitude, not tabs), §4 (confidentiality spine).
**Verification model:** owner is the visual oracle (sandbox/capture can't see it). Verify structure via `get_page_text` + `typecheck`/`lint`/`build`; owner confirms the look + the lens/nav behaviour in light **and** dark.

---

## 1. Goal

Kill tab sprawl. Today eight co‑equal tabs flatten importance so nothing says "this is what matters now." Restructure to a **primary trio — Brief · Closing Table · Timeline** — carrying ~90% of the work, with everything else demoted to a quiet **utility cluster**. Two of the demoted destinations (**Dependencies** and **Risk**) stop being places you *navigate to* and become **lenses on the task set you're already looking at** — "show me sequencing / risk for *these* tasks." **Documents stays its own utility view** (it's a link register, not a task projection). Plus: land the three Slice‑3 polish carry‑overs.

This is the "altitude, not tabs" half of the revamp (principle 5).

---

## 2. Scope

**In:** nav restructure to trio + utilities; Dependencies & Risk refactored into **Closing Table lenses** sharing the slim filter bar; the `⌘K` palette updated to route to lenses + upgraded to **fuzzy** matching; two more Slice‑3 polish items (hide empty Run Sheet phase sections under active filters; Escape / click‑away on the side‑state menu).

**Out:** data‑model / Supabase‑schema changes; the Timeline rebuild (already shipped) and its dependency‑connector "lens on the axis" (separate); Closing Pack changes; Present mode / PDF memo (Slice 5); any new free‑text field.

**Decided (owner):** **Hybrid** — Risk + Dependencies become Closing Table lenses; **Documents remains a standalone utility view.** Do not fold Documents into the Closing Table.

---

## 3. Information architecture — the target

| Tier | Destinations |
|---|---|
| **Primary trio** | **Brief** *(default)* · **Closing Table** · **Timeline** |
| **Utility cluster** (quiet, visually demoted) | **Closing Pack** · **Documents** · **Notes & Export** |
| **Lenses** (not nav — live inside Closing Table) | **Dependencies** · **Risk** |
| **Action** (not nav) | **Present** (Partner Mode) · **Deal Settings** |

**Net change from today's 8‑tab nav:** `Dependencies` and `Risk` leave the nav bar entirely (they become lenses); the remaining six split into a **primary trio** and a visually subordinate **utility cluster**. `Closing Pack`, `Documents`, `Notes & Export` are the utilities. The nav must *show* the tiering — the trio reads as primary (full‑weight buttons), utilities read as secondary (smaller / grouped / lower‑contrast). Don't just reorder eight equal buttons.

---

## 4. The Closing Table becomes a multi‑lens surface — `ClosingTable.tsx`

Today `ClosingTable` hosts a two‑way segmented toggle (Run Sheet ⇄ Workbook) and `RunSheet` owns the slim filter state. Slice 4 turns it into a **four‑option surface** over one shared filter:

**Segmented selector:** `Run Sheet` *(default)* · `Workbook` · `Dependencies` · `Risk`.

**Lift the slim filter state up into `ClosingTable`.** Search + Phase + the `Open only` / `Blockers` / `Overdue` chips currently live in `RunSheet`; move them to `ClosingTable` so **one filter bar drives Run Sheet, Dependencies, and Risk** ("these tasks"). Pass the filtered task list (and the raw filter state where a lens needs it) down as props.

- **Run Sheet** and the **Dependencies / Risk lenses** share the slim filter bar — but **not every facet applies to every lens** (see the matrix below; this matters).
- **Workbook keeps its own full filter set** (it's the deliberate power view — Slice 3 §6; do not strip it). The slim bar is hidden when Workbook is active; Workbook's internal filters are unchanged.
- The `⌘K` filter commands (`show-blockers` / `show-overdue` / `show-phase`) continue to drive the shared bar and select the **Run Sheet** lens.

**Filter → lens matrix (don't apply the bar uniformly):**

| Facet | Run Sheet | Dependencies | Risk |
|---|---|---|---|
| Search / Phase / Blockers / Overdue | ✓ | ✓ | ✓ |
| **`Open only`** (default **on**) | ✓ | ✓ | **✗ — ignored** |

**Why Risk ignores `Open only`:** today's Risk heatmap deliberately shows *all* tasks in each category and badges an `open` count (the done‑vs‑open distribution *is* the view). `openOnly` defaults to `true`, so naively piping the shared filter into the Risk lens would silently drop every completed task and make the "open" badge tautological — a regression that reads as "less data," not an obvious bug, so the visual pass may miss it. The Risk lens therefore takes the filtered set **with `openOnly` neutralised** (apply search/phase/blockers/overdue only). Run Sheet and Dependencies keep `openOnly` (open sequencing is what you want, and prerequisites still resolve against `allTasks`).

**Refactor `RunSheet` to presentational over the lifted filter:** it receives `tasks` (already filtered) or the filter values from the parent and stops owning `search/phase/blockersOnly/overdueOnly/openOnly`. It keeps its own card‑local UI (`openMenuId`, `expandedTaskId`) and the phase grouping + comparator.

### Lens correctness gotcha (read this before coding)

The filter narrows **which tasks are surfaced** — it must **not** narrow the inputs to the graph/aggregate computations:

- **Dependencies lens:** compute `getDependencyWarnings(...)` and critical‑path on the **full `deal.tasks`** (a prerequisite may be filtered out of view; resolving it against a filtered list would drop or mislabel warnings). Then **display** only rows whose dependent task is in the filtered set. This mirrors how `RunSheet` already derives `criticalIds` / `warningsByTask` from the full task set and filters the *display*.
- **Risk lens:** operate the heatmap over the **filtered** set (it's "risk for what I'm looking at") — categories, per‑category task chips, and `open` counts all reflect the filter. Recompute the intensity denominator (`max`) over the filtered set. This is a deliberate product choice; state it in a one‑line caption so an empty/!sparse heatmap reads as "for this filter," not "no risk."

### Lens components — reuse, don't rebuild

Refactor the existing views into props‑driven lens bodies (keep their render logic; change only their data source):

- `components/checklist/DependencyView.tsx` → **`DependencyLens.tsx`**: accept `{ tasks, allTasks }`; warnings/critical‑path from `allTasks`, display scoped to `tasks`.
- `components/risk/RiskHeatmap.tsx` → **`RiskLens.tsx`**: accept `{ tasks }`; render over the filtered set.

Both currently read `useDealStore().deal` directly — that's the only real change. Keep `StatusPill`/`TaskRef`/`Badge`/the rules engine intact.

---

## 5. `⌘K` command palette — `CommandPalette.tsx`

Three changes:

1. **Upgrade matching from substring to fuzzy.** Today `filtered` does `.toLowerCase().includes(normalized)`. Replace with a small **subsequence fuzzy matcher** (new `lib/fuzzy.ts`, dependency‑free): characters of the query must appear in order in the haystack; score with bonuses for contiguous runs and word‑boundary / start‑of‑string matches; sort results by score; keep label > detail > keywords weighting. So `crt` finds "Show Critical…"/"Closing Table", `blk` finds "Show blockers." Keep it tiny and tested by eye.
2. **Route the absorbed destinations to lenses, not gone.** `Dependencies` and `Risk` are no longer top‑level nav, so:
   - Add `show-dependencies` and `show-risk` to `ClosingTableCommand` (alongside the existing filter kinds). They open the Closing Table on that **lens** (not Run Sheet).
   - Keep an `Open Risk` / `Show dependencies` command label so muscle memory still works — it just lands on the lens.
   - **Drop `Risk` from `CommandDestination`** (it's no longer a `setView` target); keep `Documents`, `Closing Pack`, `Notes & Export`, `Deal Settings`, the trio.
3. **Confidentiality unchanged:** command labels stay metadata‑only — never echo `notes`/`comments`. (Slice‑3 invariant; keep the grep‑clean.)

---

## 6. `ClosingRoomApp.tsx` — wire the new IA

- **Nav:** render the **primary trio** as full‑weight buttons and the **utility cluster** (`Closing Pack`, `Documents`, `Notes & Export`) visually demoted (smaller / grouped / lower contrast — the visual treatment is the owner's call, but the tiering must be legible). Remove `Dependencies` and `Risk` from `navItems`.
- **Views:** drop the standalone `Dependencies` and `Risk` view branches from `content`. `View` type loses `Dependencies` and `Risk`.
- **Command routing:** extend the `onClosingTableCommand` handler so `show-dependencies` / `show-risk` set the Closing Table lens (the command object already flows into `ClosingTable`; teach `ClosingTable`'s command effect to select the lens for those kinds instead of forcing Run Sheet).
- Keep `Present` (Partner Mode) and `Deal Settings` exactly as they are (actions, not nav).

---

## 7. Slice‑3 polish carry‑overs (close these here)

1. **Hide empty Run Sheet phase sections.** Today `RunSheet` maps every phase in `phases` and renders a section header + "No tasks match…" for each empty one — noisy. **Base the rule on the result, not on detecting "is a filter active":** that's ambiguous here because `openOnly` defaults to `true`, so there is no true "no filter" rest state. Rule: **render a phase section only when its filtered task list is non‑empty.** Show a single global empty‑state line when the *whole* filtered set is empty. (Simpler than activity‑detection and removes the default‑`openOnly` ambiguity entirely.)
2. **Escape / click‑away dismissal for the side‑state menu.** `SideStateMenu` (the "⋯ more states" popover) only closes on select or on toggling its own button. Add: `Escape` closes it, and a click outside closes it. Prefer a small reusable `useDismissable(ref, onDismiss)` hook (Escape + outside‑pointerdown) in `lib/` or `components/ui.tsx` rather than a one‑off, since the command palette and future popovers want the same.
3. **Fuzzy `⌘K`** — covered in §5.1.

---

## 8. Files

| File | Change |
|---|---|
| `components/checklist/ClosingTable.tsx` | Host shared slim‑filter state; **four‑option lens selector** (Run Sheet / Workbook / Dependencies / Risk); pass filtered tasks down; route `show-dependencies`/`show-risk` commands to the lens. |
| `components/checklist/RunSheet.tsx` | Drop self‑owned filter state (receive from parent); **hide empty phase sections under active filters**; Escape/click‑away on `SideStateMenu`. |
| `components/checklist/DependencyView.tsx` → `DependencyLens.tsx` | Props‑driven (`tasks` + `allTasks`); warnings/critical‑path on full set, display scoped to filtered. |
| `components/risk/RiskHeatmap.tsx` → `RiskLens.tsx` | Props‑driven (`tasks`); heatmap over the filtered set + a "for this filter" caption. |
| `components/CommandPalette.tsx` | Fuzzy matching; add `show-dependencies`/`show-risk`; drop `Risk` from `CommandDestination`. |
| `components/ClosingRoomApp.tsx` | Nav → trio + demoted utilities; remove `Dependencies`/`Risk` views & nav; lens command routing. |
| `lib/fuzzy.ts` | **New** — tiny dependency‑free subsequence fuzzy scorer for `⌘K`. |
| `components/ui.tsx` *(or `lib/`)* | **New** `useDismissable` hook (Escape + outside‑click) reused by the side‑state menu (and available to the palette). |
| `docs/ui-ux-revamp-plan.md` | Tick Slice 4; the §6 IA table already matches (Documents‑stays is the one owner deviation — note it inline). |

**Reuse (do not rebuild):** `lib/rules.ts` (`getDependencyWarnings`, `getCriticalPathTasks`, `isTaskComplete`), `lib/dateUtils.ts`, `lib/store.ts` (the hardened mutation boundary — extend only via the persisted‑baseline/toast pattern), `StatusPill`/`TaskRef`/`DeadlinePair`/`Badge`, the existing Dependency/Risk render logic. Data model untouched.

---

## 9. Confidentiality

No new free text anywhere. Lenses are pure projections of structured metadata (status, flags, dependencies, risk category) — confidentiality‑safe by construction (plan §4). Documents stays the **link register** with its existing "links + status only, never the document" reminder. `⌘K` labels stay metadata‑only (no `notes`/`comments`). Notes remain 280‑char capped. Status‑only spine intact.

---

## 10. Acceptance criteria

- [ ] **Nav:** three full‑weight primary tabs (Brief · Closing Table · Timeline) + a visibly demoted utility cluster (Closing Pack · Documents · Notes & Export); `Dependencies` and `Risk` are **gone from the nav bar**.
- [ ] **Lenses:** Closing Table offers Run Sheet / Workbook / Dependencies / Risk; the slim filter bar drives Run Sheet + Dependencies + Risk **per the §4 filter→lens matrix** (Risk ignores `Open only`); **Workbook keeps its own full filters**, with **zero loss** of structured‑entry capability (Slice‑3 invariant held).
- [ ] **Lens correctness:** with a phase/blocker filter active, the **Dependencies lens still resolves prerequisites that are filtered out of view** (computed on the full set); the **Risk heatmap still shows completed tasks** (i.e. `Open only` does not strip it) and reads its scope from a clarifying caption.
- [ ] **`⌘K`:** fuzzy matching ranks sensibly (e.g. `crt`, `blk`, partial words); `show dependencies` / `show risk` open the corresponding **lens**; no note/comment text in labels.
- [ ] **Polish:** empty Run Sheet phase sections are hidden under an active filter (and present at rest); the side‑state menu dismisses on `Escape` and outside click.
- [ ] One store / `getReadiness` source; data model untouched; notes capped/status‑only; Documents unchanged as a link register.
- [ ] `typecheck` / `lint` / `build` green; structure spot‑checked via `get_page_text`; owner visual pass (light **and** dark).

---

## 11. Build order

1. **Lift filter state** from `RunSheet` into `ClosingTable`; confirm Run Sheet still behaves (no lens yet). Smallest safe refactor first.
2. **Lens bodies** — refactor `DependencyView`→`DependencyLens` and `RiskHeatmap`→`RiskLens` to props; verify the full‑set‑vs‑filtered correctness gotcha (§4) by filtering to one phase and confirming a cross‑phase dependency still shows its warning.
3. **Four‑option lens selector** in `ClosingTable`; wire the shared filter to all three light lenses; keep Workbook's own filters.
4. **Nav restructure** in `ClosingRoomApp`; remove `Dependencies`/`Risk` views & nav; visually tier trio vs. utilities.
5. **`⌘K`** — fuzzy matcher (`lib/fuzzy.ts`) + lens commands + drop `Risk` destination + routing.
6. **Polish** — empty phase sections; `useDismissable` for the side‑state menu.
7. Verify: `typecheck`/`lint`/`build`; `get_page_text` spot‑check; hand to owner for the light/dark visual pass.

---

*Non‑goals: no data‑model/Supabase‑schema changes; **do not fold Documents into the Closing Table** (owner decision — it stays a utility view); no Timeline changes; no Closing Pack changes; no Present/PDF work (Slice 5); no new free‑text field. Re‑present, don't rebuild — keep the rules engine and the hardened store contract intact.*
