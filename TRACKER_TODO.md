# ClosingRoom Tracker — To-Do List & Best Approaches

> Goal: Turn the LocalStorage MVP into a product that 3 boutique firms can pay for within 60 days.
> Source of truth: `closing_room_market_research.md` (Sections 12, 13, 14, 15) + the existing `PRD.md` and `PLAN.md` in this repo.
> **STACK PIVOT (2026-05-28): the project moved off the planned Neon + Clerk + Drizzle stack onto Supabase (auth + Postgres in one bundle).** PLAN.md and parts of this to-do still say Clerk/Neon/Drizzle — read "Supabase" wherever they appear. Rationale: the auth bundle removes a moving part, and Supabase RLS gives DB-enforced tenant isolation that fits the confidentiality spine. Consequences run through the whole architecture below: data access is the **client Supabase SDK + RLS**, not server actions; audit + org-provisioning are **Postgres triggers**, not server-action transactions.
>
> Current state (branch `codex/tracker-v1-scaffold`): `db/schema.sql` is now a complete **Supabase-native** schema — uuid user IDs keyed to `auth.users`, RLS enabled on every table with `organization_id` scoping via an `is_org_member()` helper, DB triggers that auto-write `audit_entry` (deal_task update / deal update / deal_note insert), an append-only guard on `audit_entry`, a `deal.updated_at` trigger, and an `auth.users` insert trigger that auto-provisions an `organization` + owner `membership`. `lib/store.ts` is rewired off localStorage onto `lib/supabasePersistence.ts` (client Supabase calls). `components/AuthGate.tsx` gates `/` and `/demo` and now supports **sign-up + sign-in**. `app/deals` (multi-deal home) and `app/demo` routes exist. Security brief + DPDP checklist under `docs/`; `legal-content-changelog.md` reviewer still Pending. Rules engine, 8 views, ExcelJS + `@react-pdf/renderer`, confidentiality spine all intact.
>
> What's still NOT in place: **`db/schema.sql` has not been applied to the live Supabase project yet** (must be run in the SQL editor); Supabase email-confirmation setting not decided; reminder job (Inngest/Resend) not built; multi-deal home (`DealsHome`) is still **mock in-memory data** with all "Open" links hardcoded to `/demo` — not wired to Supabase and no per-deal `/deals/[id]` route; no firm-branding upload; no portfolio view. Production still serves the older build until this branch ships.
>
> **This to-do is a delta against PLAN.md, not a replacement.** PLAN.md names the v0→v1→v2→v3 phasing, the `audit_entry` table, reminders, and the portfolio view — all still valid. The stack names (Clerk/Neon/Drizzle/server-actions) are superseded by the Supabase pivot above.

---

## 0. Operating Principle

Freeze new feature ideas for ~3 weeks. Ship the P0 list. Nothing else gets touched until cloud persistence + reminders + multi-deal home are live and demoed to a real lawyer.

The single biggest risk right now is shipping features no one paid you to build. Every commit should be answerable to: *"Which of the next three pilots needs this to say yes?"*

---

## 0.5 What's Already Built — Don't Rebuild

Read this before touching anything. The codebase is further along than the deployed demo suggests.

- **Rules / readiness engine** (`lib/rules.ts`, 158 lines): `getReadiness`, `getDependencyWarnings`, `getUpcomingDeadlines`, `getOverdueTasks`, scoring, blocker detection. The hard analytical part of the product is done. Port it to `lib/engine/` as pure functions for server reuse per PLAN.md §12 v0, don't rewrite.
- **Rich data model** (`lib/types.ts`): the `Task` shape already carries phase, timeline, parties, priority, blocker, evidence, dependencies, owner, reviewer, `lastUpdated`, `sourceReference`, `documentCategory`, `documentStatus`, a full `Filing` substructure (PAS-3/4/5/MGT-14/SH-7/DIR-12/FC-GPR with authority, `statutoryDays`, `statutoryTrigger`, `statutoryNote`), `statutoryDeadlineNote`, `agreedFormRequired`, `mandatoryForClosing`. **The reminder cron has every field it needs already — no schema redesign required, only migration into Postgres.**
- **Eight working views**: Dashboard, Checklist, Readiness, Timeline, Dependencies, Documents, Risk, Notes & Export.
- **PDF + Excel exporters** wired and lazy-loaded (`lib/pdfReport.tsx`, `lib/excelReport.ts`).
- **Confidentiality spine** real, not theoretical: DocumentsRoom is a metadata register (no uploads), notes are length-capped (`STATUS_NOTE_MAX_LENGTH`), persistent disclaimer rendered.
- **Full Postgres schema** (`db/schema.sql`): all ten PLAN.md tables (organization, membership, template, template_task, template_dependency, deal, deal_task, deal_dependency, deal_note, audit_entry), proper enums (including `cs_user` role), `organization_id` on every row, sensible compound indexes, 280-char CHECK on `deal_note.text`, firm branding fields on `organization`, and — most importantly — **append-only `audit_entry` enforced at the DB layer via a Postgres trigger** that raises on UPDATE or DELETE. The defensibility story is hard-wired.
- **Security artifacts** (`docs/data-security-brief.md`, `docs/dpdp-readiness-checklist.md`): drafted, both flagged as pending counsel/IT review. Ready to hand to a partner who asks.
- **`legal-content-changelog.md`**: started, with one entry. **Reviewer column still "Pending".**
- **`PRD.md` + `PLAN.md`** are comprehensive and aligned with the research report. Treat them as the spec — they already encode confidentiality-by-design, the India statutory depth, and the v0→v3 phasing.
- **`ImportChecklist`** is currently a placeholder card ("Architecture ready") — not implemented. The mammoth-based DOCX parser is not built.

### Immediate risks introduced by the latest branch

1. **`lib/store.ts` lost its localStorage `persist` middleware, but the API to replace it has not shipped.** If this branch deploys before Neon + Clerk + server actions land, the demo regresses to "data resets on every tab close." Merge the API layer and the store rewire together, or feature-flag the data source.
2. **Schema is uncommitted on `codex/tracker-v1-scaffold` per `git status`.** Commit and push before a rebase loses the work.
3. **Production still shows "LocalStorage MVP" badge** and the page title is still "Fundraise Closing Tracker." Both are Hello-World signals to a partner. Drop the badge and rename to "ClosingRoom" on the next deploy regardless of whether the infra is ready.
4. **Branch name `codex/tracker-v1-scaffold`** suggests an automated pass. Read `db/schema.sql` line-by-line before merging — agents get enums right but sometimes miss subtle index or constraint choices.
5. **Legal-content reviewer still "Pending"** in `legal-content-changelog.md`. This is the single execution item that blocks charging anyone. Calendar it this week.

### Schema additions to make before migrating

The current `db/schema.sql` is strong. Add these before the first Drizzle migration:

- [ ] `email_subscription` (or `reminder_preference`) table: `(id, organization_id, user_id, deal_id nullable, channel, frequency, unsubscribed_at)`. The DPDP checklist names per-user reminder preferences but the schema doesn't model them.
- [ ] `email_log` table: `(id, organization_id, user_id, deal_id, template, sent_at, provider_id, status)`. Needed for deliverability tracking and DPDP retention windows on email logs.
- [ ] Trigger on `deal` to auto-bump `updated_at` on every row change. Currently it defaults to `now()` but nothing maintains it.
- [ ] `created_at` on `template_task` and `template_dependency`. Minor — useful for legal-content audit.
- [ ] Confirm app-layer scoping handles `template.organization_id IS NULL` (global seed templates) explicitly so one org can never see another's templates by accident.
- [ ] Consider `evidence` and `document_status` as values in `audit_entity_type` enum if you want clearer audit categorisation; otherwise these will roll up under `deal_task`.

### Where this to-do disagrees with PLAN.md

| Topic | PLAN.md says | I'd push back |
|---|---|---|
| Auth | Clerk | Fine pick; only switch if you want to avoid the per-MAU pricing. Auth.js is the cheaper alternative if you're price-sensitive at scale. Stick with Clerk if PLAN.md is settled — the velocity matters more than the few thousand rupees/month. |
| ORM | Drizzle | Agreed. |
| DB | Neon | Agreed. Pick Neon for branchable preview-DBs per PR; Supabase only if you also want the auth bundle. |
| PDF v2 | Puppeteer + `@sparticuz/chromium` | Skip unless a pilot partner asks. `@react-pdf/renderer` output is good enough; Puppeteer adds cold-start latency and ops surface area. |
| Background jobs | Vercel Cron | Switch to **Inngest** for reminder reliability (retries + idempotency + observability). Vercel Cron silently dropping a PAS-3 reminder is a reputational risk you cannot eat. |

---

## 1. P0 — Non-Negotiable for First Paying Customer (Day 0–21) — maps to PLAN.md v0+v1

These exist in the research as v1 must-haves. None are optional.

### 1.1 Cloud persistence + auth (Supabase)
- [x] ~~Provision the DB + auth.~~ Supabase project exists (URL wired in `AuthGate`). **Still to do: run `db/schema.sql` in the Supabase SQL editor**, and decide the email-confirmation setting (off = instant demo signups; on = production-correct).
- [x] ~~Schema with the ten tables + `organization_id` scoping.~~ ✓ `db/schema.sql`. Scoping is enforced by **RLS** (`is_org_member()`), not per-query application code — stronger than the original "scope in every server action" plan.
- [x] ~~Auto-create `organization` + `owner` membership on first login.~~ ✓ `handle_new_user()` trigger on `auth.users`.
- [x] ~~Rewire `lib/store.ts` off localStorage.~~ ✓ now calls `lib/supabasePersistence.ts`; Zustand holds UI/sync state only.
- [ ] **Migrate `lib/types.ts` enums into Zod schemas** — DB enums already mirror `types.ts` exactly (verified). Add Zod at the persistence boundary so client mutations are validated before hitting Supabase.
- [ ] **Seed → Template migration** — convert `checklistSeed.ts` into `template` + `template_task` rows tagged "India Seed Financing — Private Placement", v1, so new deals instantiate from a real template instead of the hardcoded client seed.

**Best approach (revised for Supabase):** Client Supabase SDK + RLS is the data layer — no server actions, no RSC fetch for the single-deal path. RLS does the tenant isolation; Postgres triggers do audit + provisioning. Keep server-side (service-role) code only for the reminder job. Validate inputs with Zod in `supabasePersistence.ts`.

### 1.2 Multi-deal home screen
- [ ] `/deals` route: list of all active deals with closing date, readiness %, next blocking item, days to next statutory deadline.
- [ ] Sort by: closing date, readiness, deal name.
- [ ] Filter by: status (active/closed/on-hold), owner (Me / All).
- [ ] "New deal" button → wizard (template picker → set X / Closing Date → instantiate).

**Best approach:** Build the deal list as a server component with a small client-side filter bar. Don't over-engineer with TanStack Table yet — a plain `<table>` with Tailwind is enough for v1.

### 1.3 Audit trail (PLAN.md `audit_entry` table) — schema DONE, UI pending
- [x] ~~Build the `audit_entry` table.~~ ✓ landed in `db/schema.sql` with the exact `(id, organization_id, deal_id, actor_user_id, entity_type, entity_id, action, before, after, created_at)` shape PLAN.md called for.
- [x] ~~Enforce append-only at DB layer.~~ ✓ Postgres triggers `audit_entry_no_update` and `audit_entry_no_delete` raise via `prevent_audit_entry_mutation()`. Bulletproof.
- [x] ~~Write the entry inside the same transaction as the mutation. No best-effort logging.~~ ✓ On the Supabase stack there are no server actions — audit is written by **security-definer Postgres triggers** (`log_deal_task_change`, `log_deal_change`, `log_deal_note_insert`) that capture `auth.uid()`. Tamper-proof and unbypassable from the client (no insert grant on `audit_entry`). **Pending: apply the migration so these go live.**
- [ ] **Don't repurpose the existing `lastUpdated` field on Task** — it's a destructive overwrite. Keep it for "last touched" UI display; the audit log is separate.
- [ ] Per-task "history" drawer showing chronological changes.
- [ ] Per-deal "activity feed" page (PLAN.md v2 §12 ships the UI; the table exists already).
- [ ] Integration test: any status mutation writes exactly one `audit_entry` row, and a direct UPDATE/DELETE to `audit_entry` fails at the DB level (proves the trigger).

### 1.4 Reminder emails (statutory clocks)
- [ ] Resend for transactional email (PLAN.md v2 §12 names Resend — keep it).
- [ ] **Push back on Vercel Cron** — use **Inngest** instead for retries + idempotency + observability. A silently-dropped PAS-3 reminder is a reputational risk you cannot afford.
- [ ] Daily 7:00 IST sweep of upcoming statutory deadlines. Use the existing `Filing` substructure on Task (`statutoryDays`, `statutoryTrigger`) — **all the data is already in the model**.
- [ ] Triggers: T-7 days, T-2 days, T-0, T+1 (overdue).
- [ ] Per-user subscription preferences (default: opted in to deals they own or are reviewer on).
- [ ] Email format: plain text + small HTML, deal name, statutory item, due date, link back to tracker. No deal substance in the body — confidentiality spine.

**Best approach:** The reminder copy is part of the product. Have the practising-lawyer reviewer (see §5) sign off on the email wording too. "PAS-3 due in 2 days for Series A closing — verify with counsel" reads differently to a partner than a generic Asana notification.

### 1.5 PDF + Excel export polish
- [ ] PDF: branded cover page (firm logo upload), deal name, partner name, generation date, confidentiality footer.
- [ ] Sections: readiness summary, blockers, upcoming statutory deadlines, full task list with statuses.
- [ ] Excel: tab per view (Tasks, Timeline, Risks, Dependencies). Frozen header row. Print-area set.
- [ ] One-click from any deal view.

**Best approach:** Use `@react-pdf/renderer` for PDF (deterministic, no headless browser). Use `exceljs` for Excel (richer than `xlsx` for styling). Keep an `/api/export/[dealId]/[format]` endpoint so exports can be re-generated against latest state.

---

## 2. P1 — Important, Build After First 3 Pilots Signed (Day 21–90)

### 2.1 Partner portfolio view
- [ ] `/portfolio` route: all deals across the firm, top 5 risks, deals closing this week, deals with overdue tasks.
- [ ] Filter by lead partner.
- [ ] "Print" / "Share PDF" button — partner can hand this to the management committee.

**Best approach:** This is the partner's job-to-be-done. It's the view that converts a champion associate into a partner sponsor. Show a real, dense, useful screen — not a hello-world dashboard.

### 2.2 Role-based access
- [ ] Roles: `firm_admin`, `lawyer`, `viewer`.
- [ ] Per-deal access (a lawyer only sees deals they're assigned to).
- [ ] CS-role variant: can update filing status, see deadlines, receive reminders, but cannot edit deal scope or template.

### 2.3 @mention / status comments
- [ ] Lightweight threaded comments on tasks (status-only — no file uploads, no rich text).
- [ ] @mention notifies via email + in-app.
- [ ] Reinforce "no privileged content" — show the confidentiality disclaimer above the input.

### 2.4 Weekly digest email
- [ ] Monday 8:00 IST digest per user: deals on track, deals at risk, overdue items, statutory deadlines this week.
- [ ] Single-click "view in ClosingRoom".
- [ ] Unsubscribe per-deal.

**Best approach:** Digest emails are the cheapest retention mechanism in SaaS. Build this before any flashy UI feature.

### 2.5 New-deal wizard
- [ ] 3 steps: pick template → set X / Closing Date → assign owners.
- [ ] Pre-populate from previous deal as "duplicate" option.
- [ ] Saves a partial deal if user abandons mid-wizard.

### 2.6 Firm branding
- [ ] Firm logo upload (PNG/SVG, validated size).
- [ ] Logo appears on PDF exports + email digest header.
- [ ] Firm color accent (one hex code, applied sparingly).

---

## 3. P2 — Validate Before Building (Interview-Gated)

Do not write code for these until you have 5+ pilot users confirming the need.

| Feature | Hypothesis to test |
|---|---|
| CS-firm-first workflow | Do CS firms want the same tracker or a filings-calendar-first UX? Interview 10 CS practitioners. |
| M&A template | Would your first 5 boutique customers use it on their next M&A? Need 4/5 yes before building. |
| Debt / SHA template | Same test as M&A. |
| External-party collaboration (company + counsel + CS) | Does the confidentiality model hold up when an external party is invited? Test with one design partner. |
| In-house legal module | Do GCs want to own the tracker, or just view-only access to their counsel's view? UX diverges. |

---

## 4. Do NOT Build Yet (Scope Discipline)

| Feature | Why not |
|---|---|
| AI document review / summarisation | Adds cost, complexity, and confidentiality risk without a paying user asking. |
| iManage / NetDocuments API | Enterprise concern; boutique beachhead doesn't have either. |
| DocuSign / e-signature | The closing tracker is not the signature workflow tool. Scope creep. |
| Billing / invoicing | You are not a matter management system. |
| Mobile app | Lawyers on a closing are at desks. Web is enough through v2. |
| Multi-jurisdiction templates (UAE/UK/SG) | Validate India first. Template-first design lets you add later. |
| Chrome extension / Slack bot | Distribution toys. Not needed until you have a base. |

---

## 5. Quality & Legal-Content Hardening (Continuous)

These must be in place before you charge anyone.

- [ ] **Legal content review** by one practicing transaction lawyer + one practicing CS. Get them to sign off on PAS-3 / PAS-4 / PAS-5 / MGT-14 / SH-7 / DIR-12 / FC-GPR statutory clocks and dependencies.
- [ ] **"Verify with counsel"** disclaimer rendered next to every statutory task. Not just in the footer.
- [ ] **Source citation per task** — `sourceReference` field already exists on the `Task` type. Populate it for every task in the template and surface it in the UI (Checklist row + task detail drawer + PDF export footer).
- [ ] **Legal-content changelog** — public file `/legal-content-changelog.md` recording every change to a statutory clock or dependency rule, who changed it, and who reviewed it.
- [ ] **Data security brief** — 1-page PDF: what is stored, where, encryption posture, retention, deletion, breach process. Hand to any IT partner on first ask.
- [ ] **DPDP-readiness checklist** — consent for user PII, breach notification process, processor agreement template, data retention policy.

**Best approach:** Find the practicing-lawyer reviewer first (one credible advisor changes the room — the research is right about this). Pay them ₹25k–50k for a thorough one-time review and a public endorsement quote.

---

## 6. UI/UX Revamp — From Data Tables to a Visual Control Room

The current UI reads like a well-organised spreadsheet. That's acceptable for an associate filling in fields; it's not how a partner consumes status in 5 seconds, and it's not what a boutique partner expects when a founder shows them a "control room." Treat this as a continuous workstream alongside P0/P1, not a separate phase.

### 6.1 Design principles (apply everywhere)

- **Glanceability first.** Every view's hero answer must be readable in under 3 seconds. If you have to scroll or scan to find the verdict, the view has failed.
- **Show, don't list.** Replace tables with gauges, timelines, graphs, cards where the data shape allows. Tables only where users actually want to sort or scan rows (Checklist, Documents).
- **Status is colour + icon + text.** Never colour alone — accessibility, partner monitor calibration, printed PDFs.
- **One primary action per screen.** A persistent "Next Best Action" pill at the top.
- **Whitespace is the design.** Most Indian legal SaaS is busy. Be the calm one. Generous line height, no double-bordered cards, no nested boxes.
- **Density tier per persona.** Associates want dense data; partners want sparse. Either expose a density toggle, or design a separate **Partner Mode** (see 6.4).
- **Motion is meaning, not decoration.** Animate only when something changes state (status flip, deadline ticks closer, score moves). Never bounce, never spin.

### 6.2 View-by-view rework

| View | Today | Target |
|---|---|---|
| **Dashboard** | Stats grid + tabular widgets | Hero **Readiness Ring** (large animated SVG gauge), live **Next Best Action** card, three top **Statutory Countdown** tiles (PAS-3, FC-GPR, etc. — colour-coded green/amber/red with days remaining, live-ticking), **Phase Progress** bars stacked below, days-to-X countdown in the top app bar. Zero tables on this screen. |
| **Checklist** | Master table | Keep the table — this *is* the data-entry view — but: sticky filter bar (phase, owner, status, priority), status chips with icons (✓/⏳/⛔), inline countdown column on statutory tasks, collapsible groups by phase, row hover reveals quick actions, row click opens a slide-over **detail drawer** instead of navigating away. |
| **Readiness** | List of warnings | **Plain-English paragraph at the top** ("This deal is 74% ready. Two blockers remain: the EGM resolution and the registered-valuer certificate.") with inline task chips that jump to the task. Expandable detail sections beneath: Blockers, Missing Evidence, Pending CPs, Dependency Warnings. |
| **Timeline** | Vertical list | **Horizontal Gantt / swimlane** anchored on Closing Date X. Statutory clocks render as red bars, internal targets amber, completed green. Week / month / quarter zoom toggle. Hover a bar for the task popover. |
| **Dependencies** | Text list of "X blocks Y" | **Graph view** (React Flow). Nodes = tasks coloured by status; edges = dependencies; blocked paths highlighted; click a node opens the detail drawer. Use a dagre or ELK layout — never manual node positions. |
| **Documents** | Table | **Card grid** — one card per document with status badge, category icon, external-link chevron, last updated. Faster to scan than rows, and reinforces the "register, not a data room" framing. |
| **Risk** | Heatmap (already) | Keep the heatmap concept, but render it as a real severity × likelihood matrix with task chips positioned by both axes. Click a chip to open the detail drawer. Don't fall back to a flat list. |
| **Notes & Export** | Stacked cards | Split: Notes in a chat-like chronological feed (category-tagged, length-cap visible). Export becomes a **preview-led** experience: PDF cover thumbnail + Excel sheet count + format checkboxes + single "Generate" CTA. Not a row of small buttons. |

### 6.3 Persistent UI elements (add across all views)

- **Top app bar:** deal selector dropdown (post-multi-deal), readiness % badge, days-to-X countdown, confidentiality reminder icon (hover for the disclaimer), dark-mode toggle, user menu.
- **Sticky "Next Best Action" pill** at the top of the main content area on every view. Click jumps to the task. This is the single most valuable persistent element — it answers the partner's question before they ask it.
- **Confidentiality footer strip** persistent across views — thin, low-contrast, never dismissable. Visible but not shouting.
- **Skeleton loaders** matching the shape of the content. Never spinners. Spinners signal "broken"; skeletons signal "loading."
- **Empty states designed** for every list — one explanatory line + one CTA. Never a blank rectangle.

### 6.4 Partner Mode — the screen that closes pilots

A one-click **Partner Mode** toggle (top right). When on:

- Hide Checklist, Notes, Documents, Risk, Import tabs.
- Single page renders: Readiness Ring → Next Best Action → Top 3 Statutory Countdowns → Top Risks → Phase Progress.
- Larger type, higher contrast, generous padding — designed for screen-share in a Zoom.
- One CTA at the bottom: **Export PDF**.

This is the screen the partner sees in a meeting. It is the screen that closes pilots. Build it before any other v2 feature.

### 6.5 Design system

- **shadcn/ui + Radix primitives** for accessibility-correct components out of the box. Don't roll your own dropdown, dialog, popover.
- **Framer Motion** for status-change animations and gauge animations. Subtle, 200–300 ms ease-out. Never bouncy.
- **Recharts** for phase progress, deal-mix, and readiness sparklines. **React Flow** for the dependency graph. **Visx or D3** for the Gantt.
- **Tailwind v4 CSS variables** (already in place). Define a status palette in `globals.css` and reference everywhere; never hard-code hex in components:
  - `--status-green` (Completed / Ready)
  - `--status-amber` (In Progress / Internal target nearing)
  - `--status-red` (Blocked / Overdue / Statutory deadline imminent)
  - `--status-grey` (Not Started / Not Applicable)
  - `--status-blue` (With Counsel / Under Review)
- **Typography:** two faces max — a humanist sans for body (Inter), a tighter sans for numerics on countdowns (JetBrains Mono or Geist Mono). 16 px body / 14 px secondary / 12 px metadata. Line height 1.55 in body, 1.3 in headings.
- **Colour:** soft neutral background (off-white in light mode, near-black not pure black in dark), one brand accent used sparingly (CTAs and active nav). Status colours are the only saturated colour on screen.
- **lucide-react** (already installed) — fixed icon per status, no mixing with other icon libraries:
  - ✓ Completed · ⏳ In Progress · 👤 With Client · 🧑‍⚖️ With Counsel · 🔎 Under Review · ⛔ Blocked · ⊘ Waived/N/A · ↗ Converted to CS
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. No `padding: 7px`.

### 6.6 Polish details that disproportionately raise perceived quality

- Animate the Readiness Ring on first load and on score changes.
- Statutory Countdowns tick down live (`setInterval` 60 s; update colour state as thresholds cross).
- Tooltips with the statutory source citation on hover of any clock or filing chip — `sourceReference` is already in the model.
- Cmd-K command palette (`cmdk` or `kbar`) — quick-navigate, quick-update-status, quick-jump-to-task. Steal the pattern from Linear / Vercel.
- Keyboard shortcuts panel triggered by `?`. At minimum: `g d` Dashboard, `g c` Checklist, `g r` Readiness, `n` New task, `/` Search.
- Print stylesheet — Dashboard and Partner Mode print cleanly without extra work. Tested by hitting `Cmd+P`.
- Default to **dark mode** for the public `/demo` route. It looks more product-ish on first impression than light-mode admin chrome.

### 6.7 Tooling additions for the UI workstream

| Add | For |
|---|---|
| `shadcn/ui` (Radix primitives + Tailwind) | Accessible components |
| `framer-motion` | Animations |
| `recharts` | Progress bars, sparklines, readiness ring |
| `reactflow` | Dependency graph |
| `@visx/visx` | Gantt / timeline |
| `cmdk` | Command palette |
| `react-hotkeys-hook` | Keyboard shortcuts |
| `next-themes` | Theming if not handled by Tailwind v4 directly |

### 6.8 Three-week visual sprint (parallel with cloud-persistence work)

**Week 1 — System.** Design tokens (palette, type, spacing) in `globals.css`. Pull in shadcn/ui. Build status-chip, countdown-tile, and gauge-ring components in isolation under `components/system/` with a `/_dev/components` route to view them all. Dark-mode polish pass.

**Week 2 — Dashboard.** Rebuild the Dashboard view: Readiness Ring + Next Best Action + Statutory Countdowns + Phase Progress. Empty states, skeleton loaders. Top app bar with deal selector placeholder and confidentiality icon.

**Week 3 — High-value views.** Timeline → Gantt. Dependencies → React Flow graph. Documents → card grid. Partner Mode toggle. Cmd-K palette stub.

The Checklist, Risk, and Notes & Export views are good enough for v1 — polish them in v2.

### 6.9 What success looks like

A partner who has never used the product can:
1. Open Partner Mode on a screen-share.
2. Read the Readiness verdict and Next Best Action without anyone explaining.
3. Point at one Statutory Countdown and ask the associate why it's red.
4. Click Export PDF and end the call.

If steps 2 and 3 don't happen on the first view, the UI is still a spreadsheet in disguise.

---

## 7. Demo & Onboarding Hygiene

The tracker exists to be demoed. Make the demo viscerally good.

- [ ] **Pre-seeded demo deal** at `/demo` — Series A closing, realistic Indian fund, all 11 statutory items populated with plausible owners and dates, 2–3 items deliberately blocked/overdue so the "why not ready" engine has something to say.
- [ ] **Reset demo** button (already present — keep it).
- [ ] **Guided tour** (use `react-joyride` or `intro.js`) — 5 steps: Dashboard → Readiness → Statutory Timeline → Dependencies → PDF export.
- [ ] **"Load my own deal in 60 seconds" CSV import** for paid users — accept their existing Excel checklist and map columns to ClosingRoom fields. (Note: the existing `ImportChecklist` component is just an "Architecture ready" placeholder card — it has no parser. Build the mammoth-based DOCX parser PLAN.md hints at *and* a CSV import in the same pass.)

**Best approach:** Record a 90-second screen-capture of the demo flow and embed it on the marketing site. Most partners will not click "Try the tracker" cold — they'll watch the video first.

---

## 8. Tech Stack Recommendation (Reconciled with PLAN.md)

| Layer | Pick | Status | Note |
|---|---|---|---|
| Framework | Next.js 15 (App Router) | ✓ installed | — |
| Hosting | Vercel | ✓ deployed | — |
| Styling | Tailwind v4 | ✓ installed | — |
| Client state | Zustand | ✓ installed | Keep for UI state only after v0 migration |
| DB | **Supabase Postgres** | ✓ project + schema (apply pending) | Pivot from Neon. RLS does tenant isolation; `db/schema.sql` is the contract |
| Auth | **Supabase Auth** | ✓ wired (`AuthGate`, signup+signin) | Pivot from Clerk — auth bundled with the DB, no separate MAU bill |
| ORM | none (Supabase JS SDK) | ✓ `supabasePersistence.ts` | Pivot from Drizzle. Hand-mapped row↔type. Add Drizzle later only if migrations get unwieldy |
| Validation | Zod | to install | Validate client mutations at the `supabasePersistence.ts` boundary |
| Email | Resend | per PLAN.md — to install | India deliverability fine |
| Background jobs | **Inngest** (override PLAN.md's Vercel Cron) | to install | Retries + idempotency + visibility — non-negotiable for reminder reliability |
| PDF | `@react-pdf/renderer` | ✓ installed | Skip PLAN.md's v2 Puppeteer upgrade unless a pilot asks |
| Excel | `exceljs` | ✓ installed | — |
| Icons | `lucide-react` | ✓ installed | — |
| Analytics | PostHog (cloud free tier) | to install | Funnel + session replay |
| Error monitoring | Sentry | to install | Free tier sufficient |
| Testing | Vitest + Playwright | to install | Engine unit tests + one e2e per critical path |

---

## 9. Definition of Done — Tracker v1 (Day 60 target)

The tracker is "v1-paid-ready" when a partner at a Mumbai boutique can:

1. Sign up via magic link.
2. Create a new private-placement deal from a template in under 90 seconds.
3. Invite 3 associates with role-based access.
4. See a readiness % and a "why not ready" list on the dashboard.
5. Receive an automated reminder email 7 days before any statutory deadline.
6. Export a branded PDF status report in one click.
7. View an audit trail of every status change.
8. Manage 5+ deals from a single home screen.

Until all 8 are true, you do not have a v1. Until they are, do not start the M&A template.

---

## 10. The 60-Day Tracker Plan (Sequenced, two parallel tracks)

### Track A — Infra & data (the spine)

| Week | Ship |
|---|---|
| 1 | `package.json` + Drizzle install + Neon project provisioned + Clerk middleware + first migration of `db/schema.sql`. Seed → Template v1 script. |
| 2 | First server actions (`createDeal`, `updateTaskStatus`, `updateEvidence`). Store rewired off localStorage onto server actions + RSC. Audit-entry writes inside the same transaction. |
| 3 | Multi-deal home + new-deal wizard. |
| 4 | Audit-trail UI (history drawer + activity feed). Integration test for the append-only trigger. |
| 5 | Reminder emails on Inngest (T-7, T-2, T-0, T+1). Email subscription table + unsubscribe flow. |
| 6 | PDF/Excel export polish + firm branding (logo upload, accent colour). |
| 7 | Role-based access (firm_admin, lawyer, viewer, cs_user) + invite flow. |
| 8 | Partner portfolio view + weekly digest. |

### Track B — Visual sprint (parallel, see §6.8)

| Week | Ship |
|---|---|
| 1 | Design tokens, shadcn/ui, status-chip / countdown-tile / gauge-ring components in isolation, dark-mode polish. |
| 2 | Dashboard rebuild: Readiness Ring + Next Best Action + Statutory Countdowns + Phase Progress. Empty states + skeletons. |
| 3 | Timeline → Gantt. Dependencies → React Flow graph. Documents → card grid. Partner Mode toggle. Cmd-K stub. |
| 4–8 | Polish each new infra surface as it lands (multi-deal home, audit feed, portfolio view) using the design system. No new ad-hoc styling. |

### Track C — Pilot conversion

| Week | Action |
|---|---|
| 1 | Drop the "LocalStorage MVP" badge and rename the deployed page to "ClosingRoom" today. Cost: 5 minutes. Impact on partner perception: large. |
| 2 | Send 20 demo-request DMs (see research §10). |
| 3–4 | Run demos. Sign 3 design partners on paid 60-day pilots at ₹10,000 each. |
| 9–10 | Convert design partners to Boutique tier (₹14,999/mo). Collect 2 testimonials + 2 warm intros. |

**Tracker is the constraint on revenue. Pricing, marketing, and outreach all stall until the tracker can be charged for. The visual revamp is what makes the tracker feel like a product, not a spreadsheet — without it the conversion to paid pilots is harder than it needs to be.**
