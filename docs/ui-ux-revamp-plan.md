# UI/UX Revamp Plan — Fundraise Closing Tracker

**Status:** Proposed · **Owner:** Product/Design · **Date:** 2026-06-03
**Visual direction (decided):** *Editorial Chambers* — warm paper, serif display headlines, ink body, teal + oxblood accents. A typeset legal-memo feel, not a CRUD app.

---

## 1. Thesis

> **Stop building a database the lawyer maintains. Build a decision instrument that briefs the lawyer.**

The tracker already holds genuinely sophisticated, India-specific transaction intelligence — phases, X‑relative deadlines, ten task states, statutory filings (PAS‑3, PAS‑4, PAS‑5, MGT‑14, SH‑7, DIR‑12, FC‑GPR) with their triggers, evidence, dependencies, risk categories, and a real readiness/critical‑path engine. **The intelligence is there. The interface buries it in a spreadsheet.**

A senior transaction lawyer is expensive and time‑poor. They do not want to scan a 13‑column grid and infer status. They think in outcomes: *Will we close on the date? What is in my way? Who owes me what? Where is my statutory exposure?* The revamp makes every surface answer those questions first, and makes recording progress feel like **marking a judgment**, not filling a form.

The mental model for the whole product is a **sharp junior associate who has already read the file**: "Here's where we are, here's the one thing blocking you, here's the statutory clock, and here's the single thing I need you to decide."

---

## 2. The problem, precisely

Grounded in the current code, four things make it feel like "just another tracker":

1. **`MasterChecklistTable.tsx` is Excel in a browser.** A 13‑column, `min-w-[1280px]` horizontally‑scrolling table, with an inline `<select>` for status on *every* row, checkboxes for evidence, and **six filter dropdowns plus a sort dropdown** stacked above it. Expanding a row reveals *more* dropdowns and text inputs. This is the single biggest "data entry" offender, and it is the app's de‑facto working surface.
2. **`TimelineView.tsx` is static and fake.** It buckets tasks into six fixed columns (`Prior to X`, `X`, `X+10`, `X+30`, `X+60`, `X+90`). There is no time axis, no "today" line, no proportional dates, no critical path, no slippage — even though `getComputedDueDate()` already computes the real calendar date for every task. The user named this directly: *"the timeline tab doesn't even work, it's static."*
3. **No altitude.** Eight co‑equal tabs (`Dashboard, Checklist, Readiness, Timeline, Dependencies, Documents, Risk, Notes & Export`) in a horizontal scroll. Everything is presented at the same importance, so nothing signals "this is what matters now" versus "this is reference data."
4. **The skin is generic.** `font-family: Arial` is the tell‑tale "unstyled" giveaway. The copy *says* "Indian fundraise control room" but the UI delivers standard bordered‑card SaaS. The product is *told*, not *shown*.

What is **already good and must be kept:** the data model (`lib/types.ts`), the rules engine (`lib/rules.ts`), the deadline math (`lib/dateUtils.ts`), the readiness ring (`components/system/ReadinessRing.tsx`), the next‑best‑action concept on the dashboard, the warm palette tokens, dark mode, and PDF/Excel export. The revamp **re‑presents** this intelligence; it does not rebuild it.

---

## 3. Design principles

1. **Brief, don't store.** Every surface opens with a synthesized answer in prose + numbers, then offers the detail beneath it. The existing "Next best action" is the DNA — extend that feeling everywhere.
2. **Input is a judgment, not a form.** Replace dropdown‑hunting with one‑gesture actions: click‑to‑advance status pills, a `⌘K` command palette, keyboard nav. Structured data is still captured — it just *feels* like marking a decision.
3. **Make time real.** Rebuild the timeline as an actual calendar axis anchored on Closing Date X, with a live "today" marker, statutory hard‑stops, and the critical path. This is the marquee win and the data already exists.
4. **Editorial restraint.** Serif headlines, generous whitespace, fewer borders, confident accents, tabular numerics. It should photograph like a private‑bank briefing, not a ticket tracker.
5. **Altitude, not tabs.** A primary trio (Brief · Closing Table · Timeline) carries 90% of the work; everything else demotes to lenses and utilities.
6. **Preserve the power tool.** The dense table and dropdowns survive — deliberately — as a "Workbook" mode for bulk/structured entry. We change the front door, not the capability.

---

## 4. The confidentiality spine (this shapes everything)

**Hard rule (from project memory and enforced in code):** the tracker holds **status and metadata only — never confidential, privileged, or client‑identifying content.** The code enforces this with a 280‑char notes cap (`STATUS_NOTE_MAX_LENGTH`) and the `confidentialityReminder` placeholder.

This is not a constraint the "briefing" idea fights — it is what makes the briefing idea *work*. **The brief is synthesized entirely from signals the tool already holds** (readiness score, blocker flags, computed dates, owners, dependencies, statutory triggers). It is generated, template‑driven, and read‑only. We do **not** add rich free‑text "commentary" or "narrative" fields, because an editorial/briefing aesthetic tempts exactly that, and that is where privileged material would leak in.

> **Design rule:** Synthesis flows *out* of structured metadata into prose. Free text never flows *in* beyond the existing capped, status‑only notes.

---

## 5. Visual language — "Editorial Chambers"

Build on the existing tokens in `app/globals.css`; do not throw the warm palette away.

### Type (the editorial signature)
- **Display / headlines / the brief:** a high‑quality serif — *Newsreader* or *Source Serif 4* via `next/font` (system fallback: Georgia). This single change does most of the "memo, not CRUD" work.
- **Body / UI:** a clean humanist sans — *Inter* or the system‑ui stack. **Retire `Arial`.**
- **Numerics / dates / countdowns:** a real monospace — *IBM Plex Mono* or `ui-monospace` — paired with the existing `tabular-nums`. Numbers should feel instrument‑grade.
- The serif / sans / mono triad *is* the brand. Use it consistently: serif states the judgment, sans labels it, mono measures it.

### Color
- Keep **paper** `#f7f4ee`, **ink** `#181716`, **teal** `#0f766e` accent. Preserve dark mode (`[data-theme="dark"]`).
- Promote **oxblood** `#9a3412` (already `--accent-2`) to a semantic role: **statutory hard‑stops and legal consequence.** Reserve it; never use it decoratively.
- Reduce reliance on bordered "badge" chips. Lean on type weight, color, and whitespace to establish hierarchy. Badges become the exception, not the texture.

### Space, chrome, motion
- Fewer hairline borders; quieter cards (less shadow, more air). Each "room" gets a confident left‑aligned **masthead** (serif title + one synthesized sub‑line).
- Remove the busy glossary badge‑strip from the header; move definitions to an unobtrusive help/"?" affordance and inline tooltips.
- Motion is restrained and meaningful: the readiness ring already animates; add count‑ups on countdowns, a smooth pill advance, and a gentle "today" pulse on the timeline. Nothing gratuitous.

### New signature primitives (added to `components/ui.tsx`)
- `BriefHeadline` — serif, synthesized sentence.
- `StatusPill` — click‑to‑advance status control (replaces inline `<select>` as the default).
- `StatutoryStop` — immovable oxblood marker with a lock/flag motif and a "hard" label.
- `DeadlinePair` — renders internal target vs. statutory limit with their distinct visual languages.
- `Masthead` — per‑room serif title + synthesized sub‑line.

---

## 6. Information architecture — from eight flat tabs to three rooms

Today's eight co‑equal tabs flatten importance. Restructure into a **primary trio** plus a quiet **utility cluster**:

| New | Carries | Replaces / absorbs |
|---|---|---|
| **The Brief** *(default)* | "Where are we, what's next, what's my exposure"; drills into **The Closing Pack** | `Dashboard` + `Readiness` headline |
| **The Closing Table** | The working surface: decision cards + Workbook + Dependencies/Risk lenses | `Checklist`, with `Dependencies` & `Risk` as lenses |
| **The Timeline** | Real calendar time to close | `Timeline` (full rebuild) |
| **The Closing Pack** *(Brief drill‑in / lens)* | Full readiness breakdown + final closing‑pack checklist | `Readiness` (`ClosingReadiness.tsx`) |
| *Utility (demoted)* | Closing Pack, Documents, Notes, Export/Import, Glossary | `Closing Pack`, `Documents`, `Notes & Export` |
| **Present** *(action, not tab)* | Client‑facing screen‑share | `Partner Mode` |

`Dependencies` and `Risk` stop being equal top‑level destinations and become **lenses on the task set** ("show me sequencing / risk for *these* tasks"). **Documents stays a demoted utility view** because it is a link register, not a task projection. The readiness breakdown is not discarded — it becomes **The Closing Pack**, a drill‑in from The Brief (detail below). This kills tab sprawl and keeps everything anchored to the work.

---

## 7. Flagship surface redesigns

### A. The Brief (reconceived dashboard) — `DealDashboard.tsx` → `TheBrief.tsx`

Open with a **full‑bleed serif sentence** synthesized from `lib/rules.ts` + `lib/dateUtils.ts`, e.g.:

> *"Project Meridian is on track to close on 26 June. One blocker and two statutory filings stand between you and a clean close."*

Composition:
- The **readiness ring** (keep — it's good) paired with the **single** next best action rendered as a directive line, not one card among many.
- Three **instrument reads**, each a one‑line synthesized statement with a drill‑in: **Blockers**, **Statutory clock**, **Critical path**.
- **Kill the raw "Deal setup" form** at the bottom of today's dashboard. Editing deal name / company / investor / Closing Date X is *setup*, not daily work — move it to a quiet "Deal settings" affordance. The brief is a stage; setup doesn't belong on it.

The synthesized headline is generated client‑side from existing signals — no new data, no free text. This is the associate‑briefing made real and confidentiality‑safe (see §4).

#### A′. The Closing Pack (the readiness drill‑in) — `ClosingReadiness.tsx` → `ClosingPack.tsx`

The Brief states the *headline*; the full operational readiness view lives one click beneath it as **The Closing Pack** — the surface a lawyer opens on closing day. It carries the complete `ReadinessResult` (`lib/types.ts`), which today's `ClosingReadiness.tsx` already renders and which the Brief's three reads do **not** cover: **Pending CPs**, **Mandatory incomplete**, **Missing evidence**, **Missing agreed form**, **Waived CPs**, **Converted to CS**, plus the **Final Closing Pack Checklist** (mandatory / X‑dated items with status + document status). Restyle it into the Editorial Chambers language as a "go / no‑go" board; keep every bucket — this is exactly the detail a senior lawyer interrogates before signing off. Reachable from the Brief's readiness ring and from `⌘K` ("Open closing pack").

### B. The Timeline (the marquee rebuild) — `TimelineView.tsx`, new `components/timeline/TimelineAxis.tsx` + `lib/timeline.ts`

Replace the six fake buckets with a **real horizontal calendar axis** anchored on Closing Date X:

- **X‑axis = actual time, scaled.** "Today" is a live vertical marker; **Closing Date X** is the bold anchor line. The window spans from the earliest task date to the furthest of X+90 / latest statutory date.
- **Tasks plotted at their computed real dates** — `getComputedDueDate()` finally used *spatially*. Grouped into **horizontal lanes (phase bands):** Pre‑Execution · Conditions Precedent · Closing · Post‑Closing.
- **Statutory hard‑stops are visually distinct and immovable** (oxblood, lock motif) versus **internal targets** (teal, soft). A missed RoC/FEMA date carries legal consequence a generic "due date" does not — the UI must say so. (Pairs with the existing "verify with counsel" disclaimer.)
- **Critical path highlighted** (`getCriticalPathTasks()` exists). Blockers flagged on the axis.
- **Slippage is visible:** overdue items sit left of "today" in danger tone; the gap between an item and X reads as slack at a glance.
- **Interactions:** hover → the task's synthesized read (not a spreadsheet row); click → its decision card; horizontal zoom (week/month). Dependency/sequencing data (`getDependencyWarnings`) can render as **connectors** between prerequisite and dependent markers — the dependency "lens" expressed on the axis. **Stretch — what‑if:** dragging Closing Date X recomputes everything, but note `setClosingDate()` **persists to Supabase**, so a true non‑destructive what‑if needs a transient preview date held in component state (recompute the view without writing), with an explicit "apply" to commit. Powerful, but scope it as preview‑mode, not a live mutation.
- **Graceful empty state** when Closing Date X is unset (prompt to set it; show the unscheduled items as a backlog rail).

This is buildable entirely on existing data and math, fixes the thing the user explicitly called broken, and is the highest‑credibility win — so it **leads the feature build** (see §11).

### C. The Closing Table (de‑spreadsheeted checklist) — `MasterChecklistTable.tsx` → `RunSheet.tsx` + `Workbook.tsx`

Two modes on one surface:

- **Run Sheet (default).** Tasks as **decision cards**, grouped by phase, sorted by urgency × criticality. Each card shows the action as a readable line, the owner, the **`DeadlinePair`** (internal vs. statutory), and a **`StatusPill` that advances on click** along the natural path `Not Started → In Progress → Under Review → Completed`, with side‑states (`Waived`, `Blocked`, `Converted to CS`, `Not Applicable`) reachable from a small "…" menu. Evidence is a single check affordance. Filtering collapses from seven stacked dropdowns into a slim filter bar + `⌘K`.
- **Workbook (toggle).** The existing dense table, **kept deliberately** for power users and bulk edits — this is where structured/dropdown entry lives by design (the user said *don't discard it*). We **improve** it with multi‑select bulk actions (select rows → set status / owner), so the heavy‑entry case is actually better, not just relocated.
- **Lenses.** `Dependencies` and `Risk` become toggle‑able views over the same task set, not separate tabs; `Documents` remains a standalone utility link register.

> Net effect: the *front door* is a briefing of decision cards; the *spreadsheet* is one click away when you genuinely need it.

---

## 8. Interaction model — status as decision

The strongest antidote to the "data entry" feeling is changing the *gesture*:

- **Click‑to‑advance `StatusPill`** as the default anywhere status appears (Run Sheet, Timeline drill‑in, Brief). One click moves to the next natural state; the "…" menu handles the non‑linear states.
- **`⌘K` command palette** (new `components/CommandPalette.tsx`): *"Mark [task] complete," "Jump to blockers," "Set Closing Date X," "Go to Timeline," "Present to client."* Lawyers who live in their tools love keyboard command — this does more to kill the form‑filling feel than any single visual change.
- **Keyboard nav** on the Run Sheet (`j`/`k` to move, `enter` to open, `space` to advance status).
- **Optimistic, inline updates** (store already supports). **Dependency:** harden the known optimistic‑update rollback gap (security memo, 2026‑05‑30) before this ships broadly, so a failed write visibly reverts.
- Dropdowns remain reachable (Workbook + the pill's "more states" menu) — never the primary gesture.

---

## 9. Statutory vs. internal deadlines — make the distinction legible

Two deadline *types* rendered in two visual languages, everywhere:

- **Internal target** — movable, teal, soft. "We'd like this done by."
- **Statutory hard‑stop** — immovable, oxblood, lock motif, "hard" label. "The law requires this by; missing it has consequences."

Already modeled (`filing.statutoryDays`, `filing.statutoryTrigger`, `statutoryDeadlineNote`) and partially surfaced, but today it is visually indistinguishable from an internal date. Elevating it is a core **trust and expertise** signal — and it is the kind of detail a senior lawyer notices immediately.

---

## 10. Partner Mode + Exports (in scope — the high‑calibre moment)

- **Partner Mode → "Present"** (`components/partner/PartnerMode.tsx`): the client‑facing / screen‑share view is *exactly* the high‑stakes context this revamp exists for. Restyle it in the Editorial Chambers language as a clean, projector‑ready **Closing Brief** — readiness, time‑to‑close, blockers, statutory clock — with zero data‑entry chrome. This is the partner's moment in front of the client.
- **PDF export** (`lib/pdfReport.tsx`): reskin as a genuinely beautiful **"Closing Status Memo"** in the same type system — it is the artifact that *leaves the building* and represents the firm.
- **Excel export** (`lib/excelReport.ts`): leave utilitarian; it is a data dump by nature.

---

## 11. Build sequence (shippable slices)

Phased to match how this project actually evolves (incremental, per build history). Each slice ships and demos independently.

- **Slice 0 — Design‑system foundation.** Tokens + fonts (serif/sans/mono triad), restyle `ui.tsx` primitives, add `Masthead`, retire Arial. *Ships as a visible reskin with zero behavior change.* Low risk, immediate lift.
- **Slice 1 — The Timeline rebuild.** The marquee, on existing data/math. Fixes the named "broken" item. Highest credibility → goes first among features.
- **Slice 2 — The Brief.** Reconceive the dashboard, add the synthesized headline, demote the deal‑setup form to settings.
- **Slice 3 — The Closing Table.** Run Sheet decision cards + `StatusPill`; keep Workbook; add `⌘K` palette.
- **Slice 4 — Lenses + IA cleanup.** Fold Dependencies / Risk into Closing Table lenses; keep Documents as a demoted utility view; restructure nav to the primary trio + utilities. Carry forward Slice‑3 polish here: upgrade `⌘K` from substring matching to fuzzy matching, hide empty Run Sheet phase sections under active filters, and add Escape / click‑away dismissal for the side‑state menu.
- **Slice 5 — Present + Memo.** Partner Mode restyle + PDF "Closing Status Memo" restyle. *(Final revamp build slice implemented; pending Slice 5 review / visual acceptance.)*

---

## 12. File‑level change map

**Stable foundations (do not rebuild):** `lib/types.ts`, `lib/rules.ts`, `lib/dateUtils.ts`, `lib/constants.ts`, Supabase layer. `lib/store.ts` is the accepted shared mutation boundary after the Slice‑3 rollback gate; extend it only through the existing persisted‑baseline / toast pattern.

| File | Change |
|---|---|
| `app/globals.css` | New tokens (oxblood semantic role, type scale), font wiring, quieter card/border treatment |
| `app/layout.tsx` | `next/font` serif + sans + mono |
| `components/ui.tsx` | Restyle Card/Badge/Button; add `BriefHeadline`, `StatusPill`, `StatutoryStop`, `DeadlinePair`, `Masthead` |
| `components/ClosingRoomApp.tsx` | IA restructure: primary trio nav + utilities; remove glossary strip; add `Present` action |
| `components/CommandPalette.tsx` | **New** — `⌘K` actions |
| `components/dashboard/DealDashboard.tsx` → `TheBrief.tsx` | Synthesized headline, instrument reads, remove setup form |
| `components/timeline/TimelineView.tsx` | **Full rebuild** on new `TimelineAxis.tsx` + `lib/timeline.ts` (layout math) |
| `components/checklist/MasterChecklistTable.tsx` | **Split** into `RunSheet.tsx` (cards) + `Workbook.tsx` (table, +bulk actions) |
| `components/checklist/ClosingReadiness.tsx` → `ClosingPack.tsx` | Restyle as go/no‑go board; **keep every `ReadinessResult` bucket** + final closing‑pack checklist (§7 A′) |
| `components/checklist/DependencyView.tsx`, `components/risk/RiskHeatmap.tsx`, `components/documents/DocumentsRoom.tsx` | Dependencies/Risk become lenses over the task set. Documents stays a demoted utility view/link register, not a Closing Table lens |
| `components/partner/PartnerMode.tsx` | Restyle as projector‑ready Closing Brief |
| `lib/pdfReport.tsx` | Restyle as "Closing Status Memo" |
| `components/system/ReadinessRing.tsx`, `CountdownTile.tsx`, `StatusChip.tsx` | Light restyle to new type/color; logic kept |

> **Validation caveat:** `PartnerMode.tsx`, `RiskHeatmap.tsx`, `DocumentsRoom.tsx`, and `lib/pdfReport.tsx` are scoped at the *direction* level — their treatment is proposed without auditing current internals. Confirm each against its existing implementation at the start of its slice; the "fold into a lens / restyle" calls may need adjustment once opened.

---

## 13. Non‑goals (YAGNI)

- **No** change to the data model, Supabase schema, or rules engine.
- **No** rich free‑text / narrative fields (confidentiality spine, §4; also keeps scope tight).
- **No** removal of structured/dropdown entry — preserved as Workbook.
- **No** mobile‑first rebuild. Desktop deal‑room is the context; stay responsive, don't optimize for phone.
- **No** auth/RLS/audit work here (tracked in the security review) — *except* the optimistic‑rollback hardening that Slice 3 depends on.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Timeline edge cases (no Closing Date X; `Custom` offsets; `Resolution`/`Internal` triggers with no resolvable date) | Explicit empty/unscheduled states; a backlog rail for undatable items |
| Serif web‑font FOUT | `next/font` with preload + system serif fallback (Georgia) |
| Synthesis copy drifting into editorializing | Template‑driven sentences from signals only; tone‑reviewed; never free‑form (§4) |
| Restyle silently weakening confidentiality guards | Keep the 280‑char cap + placeholders; add a checklist item to the slice that touches inputs |
| Optimistic updates not reverting on write failure | Harden rollback before Run Sheet pills ship broadly (§8) |

---

## 15. Success criteria — the "feel" test

1. A partner landing cold answers *"are we closing on time, and what's in my way?"* in **under five seconds**, without reading a table.
2. Marking progress on a task is **one gesture** (click / keypress), not a dropdown hunt.
3. The timeline communicates **slippage and statutory exposure at a glance**.
4. A screenshot of any surface reads as a **premium legal instrument**, not "SaaS CRUD."
5. **Zero loss** of structured‑data capability versus today (Workbook proves it).

---

## 16. Hardening & acceptance criteria (from build review)

Refinements agreed during execution review. Treat as **binding acceptance criteria** for the relevant slices, not nice-to-haves.

**The Brief and The Closing Pack ship together (Brief slice).** `ClosingReadiness.tsx` → `ClosingPack.tsx`, every bucket preserved (Pending CPs, Mandatory incomplete, Missing evidence, Missing agreed form, Waived CPs, Converted to CS) + the Final Closing Pack Checklist; wired from the readiness ring during the Brief build, **not** deferred to IA cleanup. Brief, Closing Pack, and Present all read **one source** — `getReadiness(deal)` — never a divergent recomputation.

**Timeline / Brief — defined upfront, not patched later:**
- **Unplotted ≠ undated.** Statutory items whose trigger does not resolve to a calendar date (`statutoryTrigger ∈ {Resolution, Internal}` → `getComputedStatutoryDate` returns `null`) go to an explicit **statutory backlog**, and still render their **relational** deadline ("within 30 days of the Board resolution") from `filing.statutoryDays` / `statutoryDeadlineNote`. The legal meaning survives even without an X anchor.
- **No Closing Date X is the first-run state, not an error.** The Brief renders a clean fallback whose single CTA drives *"Set Closing Date X"*; the Timeline shows its empty/backlog state. Treat it as onboarding.
- **One offset source.** Axis math lives in new `lib/timeline.ts`, built on the existing `getTimelineOffset` (already handles `Custom` / `customOffsetDays`). No offset table is re-implemented.

**Optimistic-write integrity (gate on StatusPill / Run Sheet).** Harden store rollback so a failed Supabase write **reverts the optimistic state *and* surfaces the failure** (inline / toast). A silent snap-back is nearly as dangerous as no revert for a status tool. This is a foundational store fix benefiting every mutation, not StatusPill-only.

**Confidentiality by construction — allowlist, not blocklist.** Synthesis helpers accept a typed projection of **only** structured signals (status, priority, computed dates, counts, party/owner enums, task metadata) and are structurally unable to read free text (`task.notes`, `task.comments`). An allowlist stays safe when a future narrative field is added; a blocklist silently fails the day it is. Applies to the Brief, Present mode, and the PDF memo.

**Accepted implementation notes.** Tailwind v4 tokens via CSS `@theme`; `@react-pdf/renderer` typography needs separate `Font.register`.

---

*Next step: turn this into a step‑by‑step implementation plan (Slice 0 first), or jump straight into Slice 0 (design‑system foundation) since it is low‑risk and unlocks the visible "feel" immediately.*
