# Timeline Redesign — Two-Act (sequence + calendar)

**Status:** Ready to build · **Supersedes:** the single continuous-calendar Timeline (Slice 1) for the pre-close portion; reuses it for post-close.
**Decision:** chosen by the product owner over (a) compact calendar and (b) offset columns. **Perf:** the Timeline is smooth on the owner's screen — the >30s screenshot hang is a capture-tool quirk, **not** a render bug. No perf work needed.
**Verification model:** neither Claude (screenshot tool won't render this surface) nor the junior (sandbox) can see the Timeline. **The product owner is the only visual oracle.** Build → verify structure via `get_page_text` (works, doesn't rasterize) → owner confirms the look.

---

## 1. Why two acts (the data reality)

Internal "due dates" are just `getTimelineOffset` buckets, so the deal's tasks land on ~6 discrete offsets — and in practice **23 of 30 sit on exactly two: X−1 and X+0.** A continuous calendar *cannot* spread items that share a date, so everything crams into the left edge. The fix is to stop pretending the pre-close work is calendar-shaped:

- **Before close, the data is a *sequence*** — every item is "before X"; what matters is **order and blockers**, not the date.
- **After close, the data is a *calendar*** — the 7 post-close filings (X+10 … X+90) have **real, differing statutory dates** that genuinely matter.

So: **Act I = a sequence/dependency flow. Act II = a real calendar.** The hinge between them is **◆ Closing Date X**.

---

## 2. Act I — "Before Close: the sequence"

**Scope:** all tasks with offset ≤ 0 (Pre-Execution, Conditions Precedent, Closing phases). In the demo that's 23 of 30 tasks.

**Form:** a left-to-right **phase-layered flow** toward the close pivot. Columns are the phases as topological layers:

`Pre-Execution → Conditions Precedent → Closing → ◆ CLOSE X`

- Each task is a **node card**: `TaskRef` label + read-only `StatusPill` + flags (`Blocker`, `Critical path`, `Sequencing`). Reuse the existing primitives.
- **Within a column,** order nodes by: blocker → critical → status → serial, so the most load-bearing items sit at the top.
- **Critical path is the spine** — emphasize critical nodes (e.g., the existing left-accent treatment) so the eye follows the through-line to ◆ Close X.
- **Blocked-by is shown on the node, in red when broken:** reuse `getDependencyWarnings` — for each blocked task render "⚑ blocked by {prereq serial}" tinted oxblood/red when the prerequisite is not yet complete. This is the glanceable "what's in the way and why."
- **◆ Close X** is a strong terminal marker the flow points into.

**Tractability note:** v1 conveys sequence via **columns + ordering + inline blocked-by tags** — no literal SVG edge-routing required. Drawn connector lines between specific prerequisite/dependent nodes are a **v2 enhancement**, only if the inline tags prove insufficient. Do not block v1 on edge-routing.

**This unifies a planned surface:** Act I *is* the "dependency flow" the Dependencies lens was going to be (plan §6 / earlier legibility direction). Build the sequence/blocked-by visual **once** here; the Dependencies lens later reuses it rather than reinventing.

---

## 3. Act II — "After Close: the calendar"

**Scope:** tasks with offset > 0 (Post-Closing phase; X+10 … X+90 — the 7 statutory/admin filings).

**Form:** the **real calendar axis we already have** — but scoped to *only* these items. Because they genuinely spread across X+10…X+90, the calendar finally does its job (no cram). Reuse the existing `TimelineAxis` rendering (with the adaptive-axis + lighter-marker edits already landed), fed only the post-close points.

- Statutory hard-stops (PAS-3, MGT-14, DIR-12, FC-GPR) are the stars here: **oxblood + Lock markers** with **countdowns** and `DeadlinePair` language.
- Today/X anchors and the past-shading still apply (X sits at the **left** edge of this act — it's the "after" calendar).

---

## 4. Layout

Stacked, Act I above Act II (Act I is the bulk; Act II is a compact calendar strip):

```
┌ MASTHEAD: "Real Deal Timeline" + synthesized count subtitle ────────────┐
│ ACT I — BEFORE CLOSE (sequence)                                         │
│   Pre-Exec │ Conditions Precedent │ Closing │ ◆ CLOSE X                 │
│   [nodes…] │ [nodes…]             │ [nodes] │                           │
├─────────────────────────────────────────────────────────────────────────┤
│ ACT II — AFTER CLOSE (calendar)   X ──●PAS-3──●MGT-14──●FC-GPR── X+90    │
└─────────────────────────────────────────────────────────────────────────┘
  side rails (unchanged): Selected decision card · Unplotted statutory · Dependency warnings
```

Keep the existing **decision card**, **unplotted-statutory rail**, and the masthead/subtitle. The synthesized subtitle stays counts-only (confidentiality).

---

## 5. Files

**`lib/timeline.ts`** — extend `buildTimelineModel`: split `allRows` into **`preCloseRows`** (offset ≤ 0) and **`postCloseRows`** (offset > 0). Act I consumes `preCloseRows` + dependency data; Act II consumes `postCloseRows` (reusing the existing point/axis math, scoped to those). Keep one model, one `getReadiness`/build pass.

**New `components/timeline/SequenceFlow.tsx`** — Act I (phase columns, nodes, ordering, inline blocked-by). Reuse `StatusPill`, `TaskRef`, `Badge`, `getDependencyWarnings`.

**`components/timeline/TimelineAxis.tsx`** — keep; Act II feeds it only post-close points (and an axis window fit to those).

**`components/timeline/TimelineView.tsx`** — compose Act I + ◆ pivot + Act II; keep masthead, decision card, rails, zoom (zoom now only meaningfully affects Act II), and the no-X onboarding state.

**Reuse, don't rebuild:** the data model, `getReadiness`, `getCriticalPathTasks`, `getDependencyWarnings`, and the primitives.

---

## 6. Acceptance criteria

- [ ] Pre-close tasks render as a **phase-layered sequence** ending at ◆ Close X — **no left-edge cram**; blockers and broken sequencing read at a glance (red blocked-by).
- [ ] Post-close tasks render on a **real calendar** that visibly spreads X+10…X+90; statutory hard-stops prominent with countdowns.
- [ ] Decision card, unplotted-statutory rail, and no-X onboarding state all still work.
- [ ] One `buildTimelineModel` / `getReadiness` source; labels via `TaskRef` (action only — confidentiality intact).
- [ ] `npm run typecheck`, `lint`, `build` green; structure spot-checked via `get_page_text`.
- [ ] **Owner visual pass** (the gate only they can clear): Act I reads as a sequence, Act II as a calendar, light **and** dark.

---

## 7. Build order

1. `lib/timeline.ts` — split pre/post rows (cheap, unblocks both acts).
2. `SequenceFlow.tsx` — Act I (the bulk of the work and the bigger visual win).
3. Wire Act II to post-close-only points + fit its axis.
4. Compose in `TimelineView.tsx` with the ◆ pivot; keep rails/card/onboarding.
5. Verify (typecheck/lint/build + `get_page_text` structure) → owner confirms the look, light + dark.

---

*Non-goals: no SVG edge-routing in v1 (inline blocked-by tags suffice); no data-model changes; no perf work (it's smooth). Keep the already-landed adaptive-axis + lighter-marker edits — Act II inherits them.*
