# Closing Room — UX, Workflow & Visual Redesign

> **Deliverable type:** Design document only (no code changes in this pass).
> **Cutting stance:** Balanced — keep every legal field and status, push depth behind progressive disclosure; trim chrome, words, and redundant navigation, never legal substance.
> **Visual stance:** Open to a refresh — a concrete refreshed direction is proposed in §8.

---

## 1. Context — why this work

The tracker is functionally strong (rules engine, statutory depth, exports, confidentiality spine) but **feels heavy**: too many tabs, too many options per screen, too much text, and chrome that competes with the actual work. For a legal product, perceived calm *is* perceived trustworthiness — clutter reads as "prototype," restraint reads as "final product." The goal is to make a transaction lawyer move through the core loop — *what's next, what's blocking close, are we ready* — with the fewest possible decisions, while every legal detail remains reachable on intent.

This document diagnoses the current weight with specifics, sets psychology-based principles, and specifies a surface-by-surface redesign plus a refreshed visual direction. It is intentionally executable later: each section names the components it maps to.

---

## 2. Who we design for, and the one job

| User | Job-to-be-done | Design consequence |
|---|---|---|
| **Associate** (primary, daily driver) | "Update where items stand; see the next action, blockers, readiness." | The default screen optimizes *decide → act → return*. |
| **Partner** (oversight) | "Across deals, what's at risk? Is anything not ready that I think is?" | Portfolio + Partner Mode carry this; not the daily surface. |
| **Company Secretary** (filings) | "Mark filings done with dates; watch statutory clocks." | A filings/statutory focus must be one gesture away, not a hunt. |

Everything below is ordered to serve the **core loop**, and to demote everything that doesn't.

---

## 3. Diagnosis — where the weight is (quantified)

| Surface | Current weight | Files |
|---|---|---|
| **Primary navigation** | 3 primary tabs **+** a separate "Utilities" group of 3 **+** Settings button = **7 destinations**, two visual systems. | `components/ClosingRoomApp.tsx:26-36,170-206` |
| **Closing Table (a tab within a tab)** | **4 sub-modes** (Run Sheet / Workbook / Dependencies / Risk) + a **5-control filter bar** (search, phase, open-only, blockers, overdue). | `components/checklist/ClosingTable.tsx:81-118` |
| **Global header (every screen)** | category badge + H1 + a **feature-listing paragraph** + sync badge + **6 action buttons** (Deals, Settings, Partner Mode, theme, Reset, Sign in/out) + a **row of ~13 glossary jargon chips** + a sticky footer disclaimer. | `components/ClosingRoomApp.tsx:126-214`, `lib/glossary.ts` |
| **Task card** | ~**23rem tall**; title, owner, status pill + **10-status** menu, up to **5 badges**, deadline pair, countdown, document line, reviewer line, dependency chips, evidence block, then a **"Show detail"** panel with **7 more fields**. | `components/checklist/RunSheet.tsx:90-285` |
| **Status vocabulary** | **10 task statuses** + **6 document statuses**. | `lib/constants.ts:5-18` |
| **Deals home** | header paragraph + **3-tile explanatory "wizard"** + 3 filter selects + an **8-column** table (min-width 1180px). | `components/deals/DealsHome.tsx:103-291` |

**Reading of the diagnosis:** the engine surfaces (Brief, readiness ring, next-best-action) are already good. The weight is in (a) **navigation multiplicity**, (b) **header chrome**, (c) **per-task density**, and (d) **verbose microcopy**. That is where this redesign concentrates.

---

## 4. Design principles (human psychology → concrete application)

| Principle | What it means | How we apply it |
|---|---|---|
| **Hick's Law** | Decision time grows with number/complexity of choices. | Fewer simultaneous nav targets; collapse the 4 Closing-Table modes; smart-default the filters. |
| **Miller's Law (7±2)** | Working memory is small. | ≤3 primary destinations; ≤2 badges visible per task; group the 10 statuses into "flow" vs "exceptions." |
| **Progressive disclosure** | Show the next thing; hide depth behind intent. | The card shows the decision; "Detail" reveals legal fields. Lenses (Dependencies/Risk) become overlays, not tabs. |
| **Recognition over recall** | Don't make users memorize jargon. | Kill the glossary chip wall; define terms **inline** where they appear (dotted underline + tooltip). |
| **Von Restorff / salience** | The exceptional item is remembered. | One hero per screen (next action / readiness). Demote everything else to quiet tones. |
| **Goal-gradient effect** | Visible progress motivates completion. | Honest readiness ring + phase progress (the 0% bug is fixed) as the recurring "you're getting closer" signal. |
| **Zeigarnik effect** | Open loops nag; closed loops relax. | Surface only the *actionable* open items, not all 30; completed work visibly recedes. |
| **Jakob's Law** | Users expect patterns they know elsewhere. | Standard app frame: left brand/deal switcher, center workspace, right account menu, ⌘K command bar. |
| **Aesthetic–Usability Effect** | Beautiful feels more usable and trustworthy. | The visual refresh (§8) is not vanity; for legal buyers it is credibility. |
| **Fitts's Law** | Big, close targets are fast. | One obvious primary action per screen; status advance is a single large tap. |
| **Peak–End rule** | People judge by the peak and the end. | Partner Mode is the "peak" (make it polished); export is a satisfying "end." |
| **Anxiety reduction** | Whitespace and restraint lower stress. | Remove restated instructions and duplicate disclaimers; let the page breathe. |

---

## 5. The redesigned information architecture

**From 7 destinations + 4 sub-modes → 3 primary destinations + a power lane + on-demand lenses.**

```
PRIMARY (always visible, deal scope)
  • Brief        decide   — readiness, next action, the 3 reads      (home)
  • Closing Table  do     — the work; default Run Sheet, grid on demand
  • Timeline     when     — X-relative schedule + statutory clocks

POWER LANE
  • ⌘K Command palette — jump, filter, set status, present (already exists; elevate it)

ON-DEMAND (not tabs)
  • Closing Pack   → the readiness ring's drill-in (already is)
  • Dependencies / Risk → "lenses" toggled over the Closing Table
  • Documents register → a lens/section, reachable from any evidence row
  • Notes, Export, Settings, Theme, Reset, Sign-out → right-side account/overflow menu
  • Partner Mode → a single "Present" affordance (the peak moment)
```

Old → new mapping:

| Today | Tomorrow |
|---|---|
| Brief tab | **Brief** (unchanged role, sharpened) |
| Closing Table tab + Run Sheet/Workbook modes | **Closing Table** (Run Sheet default, "Grid" toggle) |
| Dependencies / Risk modes | **Lenses** over Closing Table (overlay), also ⌘K |
| Timeline tab | **Timeline** |
| Closing Pack (utility) | Brief → readiness ring drill-in |
| Documents (utility) | Lens / inline from evidence rows |
| Notes & Export (utility) | Account menu actions + a Notes slide-over |
| Deal Settings (button) | Account menu |
| 6 header buttons | Deal switcher (left) + account menu (right) |

Net: **3 things to learn instead of 11.**

---

## 6. Surface-by-surface redesign

### 6.1 App frame & header — strip the chrome
*File: `components/ClosingRoomApp.tsx`*

- **Remove** the feature-listing paragraph (`:135-137`) — the UI demonstrates these; words restate them.
- **Remove** the ~13-chip glossary wall (`:208-214`). Replace with **inline term definitions** at first appearance (a `<Term>` primitive: dotted underline + tooltip), reusing `lib/glossary.ts` content.
- **Collapse** 6 buttons → **two clusters**: left = deal identity + deal switcher (replaces the `/deals` link); right = a single **account/overflow menu** (Settings, Theme, Export, Reset, Sign-out) + one **Present** button.
- **Identity bar** (tight): deal name · parties · a small disposition chip (Ready / On track / At risk / Overdue from `lib/brief.ts`) · sync state as a quiet dot, not a full badge.
- **One disclaimer**, not two: keep the footer line (`globalDisclaimer`); drop redundancy elsewhere.

### 6.2 The Brief (home) — keep, sharpen the hero
*File: `components/brief/TheBrief.tsx`*

Already the strongest screen. Changes are subtractive:
- Make the **readiness ring + headline + next-best-action** the unmistakable hero (more whitespace, larger type, fewer competing badges).
- The three "instrument read" cards (blockers / statutory / critical-path) stay but quiet down: one number, one task, one verb. They are the **Zeigarnik** open-loops list, deliberately capped at three.
- Onboarding state (`BriefOnboarding`) becomes the single first-run gesture: "Set Closing Date X" — because every date derives from it.

### 6.3 Closing Table — one view, grid on demand, lenses as overlays
*Files: `components/checklist/ClosingTable.tsx`, `RunSheet.tsx`, `Workbook.tsx`, `DependencyLens.tsx`, `components/risk/RiskLens.tsx`*

- **Default to Run Sheet.** Replace the 4-button segmented control with: a primary view (Run Sheet) and a quiet **"Grid"** toggle for Workbook (power-user dense entry). 
- **Dependencies & Risk become lenses** — a single "Lens ▾" affordance (or ⌘K), rendered as an overlay/inline reframe of the *same* list, not separate destinations. This preserves the analysis without a mode-switch tax.
- **Filter bar → smart defaults + one search.** "Open only" is the default (it already is). Collapse Phase/Blockers/Overdue into a small chip row that appears only when search is focused or under a "Filters" disclosure. Keep the "N shown" count — it's good feedback.

### 6.4 The task unit — decision-first, depth on intent
*File: `components/checklist/RunSheet.tsx` (RunSheetCard)*

The single highest-leverage change. Recompose the card into three tiers:

```
┌─────────────────────────────────────────────┐
│ B3  Valuation certificate            ● High  │  ← title + serial + one salient flag
│ Owner: Registered Valuer        [In Progress]│  ← owner + one-tap status advance
│ Due X−7 · 5d left                            │  ← one deadline line
│ ─────────────────────────────────────────── │
│ ✓ Evidence   ⌄ Detail                        │  ← compact evidence + disclosure
└─────────────────────────────────────────────┘
        (Detail expands: document status, external link,
         dependencies, deadline basis + statutory disclaimer,
         status notes, source/reviewer/filing — all current fields)
```

- **Visible:** title (`TaskRef`), owner, status (one-tap advance via `StatusPill`), **at most one** salient badge (priority *or* the worst-active flag: Blocker > Overdue > Statutory), one deadline line, a compact evidence check, and "Detail."
- **Behind "Detail" (unchanged set):** document status, external register link, dependencies, deadline basis + `statutoryVerificationDisclaimer`, status notes, source/reviewer/filing badges. **Nothing legal is removed** — it's one click deeper.
- Card height drops from ~23rem to ~½; completed tasks collapse to a single quiet line (recede the closed loops).

### 6.5 Timeline
*File: `components/timeline/TimelineView.tsx`*
Keep as the "when" view; ensure statutory hard-stops are the visually loudest marks (salience), internal targets quieter. (Detailed review deferred — not a primary density offender.)

### 6.6 Documents register
*File: `components/documents/DocumentsRoom.tsx`*
Demote from a top tab to (a) a **lens** over the Closing Table filtered to document-bearing tasks, and (b) reachable inline from any evidence row's external-link field. Reinforces the confidentiality framing (it's a register, not storage).

### 6.7 Notes & Export
*Files: `components/NotesPanel.tsx`, `components/ExportPanel.tsx`*
Not a destination. **Export** → an action in the account menu / ⌘K (PDF, Excel, CSV). **Notes** → a slide-over from the Brief (deal-level open questions/waivers), keeping the confidentiality cap copy.

### 6.8 Deals home — lighten and de-friction
*File: `components/deals/DealsHome.tsx`*

- **Create:** drop the 3 explanatory tiles (`:163-176`). One line of helper text + the 4 fields, with only **Deal name required** ("add parties and X later"). Lower the activation energy.
- **List:** reduce the **8-column** table to the **4 decision columns** — Deal (name + parties), Readiness (ring/bar), Next blocker, Next statutory deadline. Move status/lead/closing-date into the deal cell or a hover/expand. Consider a **card grid** for scannability on the portfolio.
- **Filters:** default to Active + Me; collapse the 3 selects behind a single "Filters" control.

### 6.9 Onboarding, empty & loading states
- First run: create deal → immediately prompt for **Closing Date X** (everything derives from it) → land on a Brief that says "Your next action is…" Make the first action obvious.
- Empty/loading states: short, calm, single CTA (current ones are close; trim words).

### 6.10 Partner Mode — protect the peak
*File: `components/partner/PartnerMode.tsx`*
Keep as the standout "present to the room" moment. One entry affordance, full-screen, the most polished surface (Peak–End). This is a differentiator; it stays prominent.

---

## 7. Status & legal vocabulary (balanced)
*File: `lib/constants.ts`*

Keep all 10 statuses and 6 document statuses — but **reduce their visible surface**:
- **Flow states** (the 90% path) are one-tap on the card: Not Started → In Progress → Under Review → Completed (already the `naturalStatuses` split in `RunSheet.tsx:14`).
- **Exception states** (With Client, With Investor Counsel, Waived, Converted to CS, Blocked, Not Applicable) live in the "More states" menu (already do). Consider grouping the menu under "With party" (Client / Investor Counsel as a sub-choice + party chip) and "Closed out" (Waived / Converted to CS / N/A) — *grouping, not removing*.
- Define every legal term **inline** via the `<Term>` primitive instead of the chip wall.

---

## 8. Visual refresh direction (recommended)

The current editorial *paper/ink + serif* identity is a genuine asset — distinctive and grown-up. The refresh **evolves** it rather than replacing it: same soul, more discipline.

| Layer | Direction |
|---|---|
| **Type** | Keep the serif for display/headlines (the editorial signature). Tighten the scale to a strict modular ramp (e.g. 12 / 14 / 16 / 20 / 28 / 40) so hierarchy is unmistakable. Mono only for dates/serials/forms (data), never prose. |
| **Color** | Reduce the accent palette to **one** primary accent (the teal) + a strict semantic set (success / warning / danger / statutory). Today badges use many tones at once; restraint = calm. Statutory hard-stops get a single reserved color used *nowhere else* (maximizes salience). |
| **Surface & elevation** | Fewer borders, more whitespace. Replace stacked bordered cards with grouped sections separated by space, not lines. One soft shadow level, not several. |
| **Density modes** | Offer **Comfortable** (default, calmer) and **Compact** (today's density) — respects the CS/power user without imposing density on everyone. |
| **Iconography** | One icon weight/size system; drop decorative icons that don't aid recognition. |
| **Motion** | Subtle, functional: status advance, expand/collapse, lens overlays. Reinforces cause→effect; never decorative. |
| **Data-viz** | Readiness ring as the recurring hero; progress bars honest and quiet; countdowns color-coded only at amber/red thresholds. |
| **Dark mode** | Keep; re-tune to the reduced palette so it reads as designed, not inverted. |

Two ASCII references for the refreshed feel:

```
BRIEF (refreshed)                         CLOSING TABLE (refreshed)
┌────────────────────────────────┐       ┌──────────────────────────────────┐
│  (◔ 62%)   On track · 18d to X  │       │ Closing Table     [Run sheet][Grid]│
│            Aarohan · Banyan     │       │ ⌕ search…              Lens ▾  ⚙   │
│                                 │       │ ── Conditions Precedent (9) ────── │
│  NEXT  → B3 Valuation cert      │       │ [card] [card] [card]               │
│         High · 5d · Reg. Valuer │       │ [card] [card] [card]               │
│  ───────────────────────────── │       │ ── Closing Actions (6) ─────────── │
│  Blockers 1 · Statutory 2 · CP… │       │ …                                  │
└────────────────────────────────┘       └──────────────────────────────────┘
```

---

## 9. Key workflow walkthroughs (before → after)

| Journey | Before | After |
|---|---|---|
| **Daily: act on the next item** | Land on Brief → scan → click Closing Table tab → pick Run Sheet mode → set filters → find card → expand → change status. | Land on Brief → **next action is the hero** → click it → card opens focused → one-tap status. (≈6 decisions → ≈2) |
| **New deal** | New deal → read 3 tiles → fill 4 fields → open → find where to set X. | New deal → name it → land on Brief → **"Set Closing Date X"** is the one prompt → next action appears. |
| **CS: clear a filing** | Hunt across tabs/modes for statutory items. | ⌘K "statutory" or Brief's statutory read → filtered list → mark filed. |
| **Partner: review** | Open deal, traverse tabs. | Portfolio (4 decision columns) → open → **Present**. |

---

## 10. What we explicitly cut (or relocate)

- The header **feature-listing paragraph**.
- The **~13 glossary chips** (→ inline terms).
- The **"Utilities" nav group** (→ lenses + account menu).
- **4 redundant header buttons** (→ account menu).
- **2 of 4 Closing-Table mode buttons** as top-level (→ Grid toggle + Lens menu).
- **~3 of 5 filter controls** from default view (→ behind "Filters").
- The **3 wizard explainer tiles** on Deals home.
- **~4 of 8 columns** on the deals table (→ deal cell / hover).
- Restated microcopy throughout (e.g. the Closing-Table subtitle).
- Duplicate disclaimer instances (→ one).

Nothing in this list is legal content — only chrome, words, and redundant paths.

---

## 11. Suggested phasing (for when this is built)

1. **Declutter (no new components):** remove paragraph, glossary wall, redundant buttons/disclaimer; trim microcopy; smart-default filters. *Highest ratio of calm-per-effort.*
2. **IA collapse:** account menu + deal switcher; Dependencies/Risk/Documents → lenses; Notes/Export → actions.
3. **Task unit:** recompose the card into the 3-tier decision/detail model; collapse completed tasks.
4. **Visual refresh:** type ramp, single-accent palette, spacing/elevation, density modes, dark-mode re-tune (`app/globals.css`, `components/ui.tsx`).
5. **Deals home + onboarding:** lighter table/card grid, frictionless create, first-run-to-X flow.

---

## 12. How to validate (usability)

- **Quantitative targets:** clicks-to-next-action ≤ 2 (from ≥6); visible nav targets ≤ 3 (from 11); words on the default screen roughly halved; task-card height roughly halved.
- **5-user think-aloud test** (associates + 1 CS): "Open this deal and do the next thing"; "mark PAS-3 filed"; "is this deal ready to close?" Measure hesitation and wrong turns.
- **Before/after screenshots** of Brief, Closing Table, task card, Deals home for sign-off.
- **Accessibility pass:** keyboard for status changes, focus order, color-not-only status (icon+label), contrast on the refreshed palette.

---

## 13. Open decisions (for review)

1. **Card grid vs. lean table** on the Deals home — grid scans better; table packs more. Recommend grid.
2. **"With party" grouping** of Client / Investor Counsel statuses — small semantic change; confirm acceptable to lawyers.
3. **Density default** — Comfortable for everyone with Compact opt-in (recommended), or Compact for CS-heavy firms.
4. **Refresh scope** — evolve current identity (recommended) vs. a bolder reskin of palette/type.
```
