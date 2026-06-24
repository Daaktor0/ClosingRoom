# Deal Tracker - Build Plan

> **Vision:** The destination where every transaction lawyer records and watches the progress of each deal - smart, personal, beautiful, and trustworthy. A closing control room that tells the lawyer *exactly what is happening to each deal, what is next, and what is at risk* - without ever holding confidential client material.

**Document status:** Draft for review - **Original date:** 2026-05-28 - **Progress update:** 2026-06-24
**Scope:** Turn the current single-deal localStorage MVP into a multi-tenant, account-based SaaS with a robust database, polished UX, and branded PDF + Excel exports.

---

## 0a. Implementation status (as of 2026-06-24)

> This section was added to record what has actually been built since the plan was written. The original plan below is preserved as the spec; the **Recommendation** rows and roadmap tickets are annotated with ✅ done / 🟡 partial / ⬜ pending where reality has moved.
>
> Branch: `codex/tracker-v1-scaffold` (pushed to GitHub; not yet merged to `main`). Production still serves the older localStorage build until this branch ships.

### Stack pivot (supersedes Section 6.1 recommendation)

The project **moved off the planned Neon + Clerk + Drizzle + server-actions stack onto Supabase** (Auth + Postgres + RLS in one bundle). Consequences:

- **Data access** = client **Supabase SDK + Row-Level Security**, not server actions + ORM. RLS gives DB-enforced tenant isolation, which suits the confidentiality spine.
- **Audit + org-provisioning** = **Postgres triggers** (auto-write `audit_entry`; auto-create `organization` + owner `membership` on `auth.users` insert), not service-layer transactions.
- **No Drizzle, no Clerk, no Neon, no Zod layer** are installed. Wherever the plan below says Clerk/Neon/Drizzle/server-actions, read "Supabase + RLS + triggers + client SDK."

### Done ✅

- **Supabase-native schema** (`db/schema.sql`): all 10 tables, enums (incl. `cs_user` role), `organization_id` on every row, RLS via an `is_org_member()` helper, append-only `audit_entry` guard, `deal.updated_at` trigger, auto-org-provisioning trigger, firm-branding columns on `organization`.
- **Cloud persistence**: `lib/store.ts` rewired off localStorage onto `lib/supabasePersistence.ts` (client Supabase calls).
- **Auth**: `components/AuthGate.tsx` with sign-up + sign-in + resend-confirmation; auto-provisions org/owner on first login.
- **Multi-deal home + detail**: `app/deals` (Supabase-backed `listDeals`/`createDeal`) and `app/deals/[id]` route; clean new-deal onboarding that instantiates a task snapshot.
- **Section 10 legal content baked in** (`lib/checklistSeed.ts`): PAS-3 15-day statutory hard limit + "funds blocked until filed" note, Registered Valuer report for preferential allotment, MGT-14/SH-7 30-day clock, FC-GPR via FIRMS within 30 days + EMF + LSF, DIR-12 — with the `Filing` substructure (`statutoryDays`/`statutoryTrigger`/`statutoryNote`) and a statutory-vs-internal deadline distinction in the engine.
- **Rules engine + 8 views** (Dashboard, Checklist, Readiness, Timeline, Dependencies, Documents, Risk, Notes & Export), next-best-action, amber/red countdowns.
- **Exports**: PDF Closing Status Report (`@react-pdf/renderer`, `lib/pdfReport.tsx`) and styled Excel workbook (ExcelJS, `lib/excelReport.ts`), code-split/lazy-loaded. Self-hosted PDF fonts via `scripts/copyPdfFonts.mjs` + a `postbuild` render check.
- **Confidentiality spine**: DocumentsRoom is a metadata-only register (no uploads), notes length-capped, persistent disclaimer.
- **Security artifacts**: `docs/data-security-brief.md`, `docs/dpdp-readiness-checklist.md` (both flagged pending counsel/IT review).

### Beyond-plan additions (built, not in the original plan)

- **Partner Mode** screen-share view (`components/partner/PartnerMode.tsx`).
- **Public no-login demo / local mode** (`app/demo`).
- **Command palette** (`components/CommandPalette.tsx`).

### Partial 🟡

- **Seed lives in TypeScript, not the DB template tables.** `createDeal` snapshots tasks from the hardcoded `checklistSeed` into `deal_task` rows. The `template`/`template_task` tables exist in the schema but are **unused** — the Seed → Template v1 DB migration is not done.
- **Enums** mirror `lib/types.ts` exactly but are **not** Zod-validated at the persistence boundary.
- **Legal-content changelog** (`legal-content-changelog.md`) is now an **itemized review packet** — L1–L9 statutory points mapped to their seed tasks + sources, with a structured sign-off block — but the **human reviewer sign-off is still genuinely pending** (cannot be self-certified); not yet surfaced in-app.
- **Firm branding** columns exist on `organization`; no admin/branding upload UI.

### Pending ⬜ (highest-leverage next)

1. **Apply `db/schema.sql` to the live Supabase project** (run in SQL editor) — nothing persists in prod until this is done.
2. **Reminders**: no Resend/Inngest/Cron — statutory-deadline sweep + digests unbuilt (all needed fields already in the model).
3. **Audit/activity feed UI** (table + triggers exist; no UI).
4. **Portfolio view** for partners (no `/portfolio` route).
5. **"My open items"** cross-deal personal queue.
6. **Roles/sharing UI, comments/@mentions** (roles enforced in RLS; no UI).
7. **Email subscription / email log tables**, **Zod validation layer**, **automated tests** (only the postbuild PDF render check exists).
8. **Merge the branch to `main` / drop the "localStorage MVP" badge + rename title** from "Fundraise Closing Tracker" to "Closing Room".

---

## 0. How to read this plan

- Each major decision has a **Recommendation** and **Alternatives**. Treat recommendations as defaults you can override.
- The roadmap (Section 11) is the "step-by-step" you asked for: phases **v0 -> v3**, each broken into concrete, sequenced tickets.
- Section 9 (Confidentiality) is the design *spine* - most other decisions trace back to it. Read it first.
- Section 10 (Legal content verification) is the "use legal skills to verify and update" work. It is practice knowledge to confirm with counsel, not legal advice.

---

## 1. Executive summary

The base version is a genuinely strong **single-deal, browser-only** tracker for an Indian private-placement fundraise. It already has: a deep, accurate legal task model (CPs/CS, PAS/MGT/SH/FC-GPR filings, "X"-relative deadlines), a readiness/rules engine, dependency warnings, and CSV/JSON/Markdown export.

What it is missing to become "the best tracker out there":

1. **Persistence beyond one browser** - no accounts, no database, no multi-deal, no sync. Data lives in `localStorage` and dies with the cache.
2. **Multi-tenancy** - one lawyer, one firm, many deals, with roles and an audit trail.
3. **Taste & detailed mechanics** - "smart and personal" surfaced as real features (next-best-action, personal queues, digests, smart deadlines), not just tables.
4. **Real exports** - branded **PDF presentation report** and a formatted **Excel workbook**, not text blobs.
5. **A hard confidentiality posture** - explicit, enforced, and front-and-centre.

This plan keeps everything good about the base, hardens the legal content, and adds the cloud/data/UX/export layers in four shippable phases.

---

## 2. What exists today (honest assessment)

**Stack:** Next.js 15 (App Router) - React 19 - TypeScript - Tailwind v4 - Zustand + `persist` (localStorage) - lucide-react.

**Strengths to preserve:**
- `lib/types.ts` - a precise domain model (Phase, TimelineCode, TaskStatus, RiskCategory, Filing, etc.).
- `lib/checklistSeed.ts` - ~30 tasks across 4 phases, legally coherent for an India seed/Series private placement.
- `lib/rules.ts` - readiness scoring, dependency-cycle warnings, overdue/upcoming computation, owner-pending counts. This is the "brain" and is reusable almost verbatim on the server.
- `lib/dateUtils.ts` - "X"-relative due-date math.
- 8 working views (Dashboard, Checklist, Readiness, Timeline, Dependencies, Documents, Risk, Notes & Export).
- Glossary already carries "this is not legal advice" disclaimers.

**Gaps / liabilities:**
- **No backend.** `lib/store.ts` persists to `localStorage` under one key. No user, no deal list.
- **Single hard-coded deal** from the seed; "Reset demo data" wipes everything.
- **`DocumentsRoom` + `Evidence` imply file handling** - directly in tension with "nothing confidential." Must be reframed (Section 9).
- **Exports are text** (CSV/JSON/Markdown via Blob). No PDF, no styled Excel.
- **No auth, no audit, no access control, no validation at a trust boundary.**
- Legal content has a few items to update against current law (Section 10).

---

## 3. Product principles

1. **Confidentiality first.** The tool tracks *status and process*, never privileged client substance. If a feature tempts a user to paste confidential content, redesign the feature. (Section 9.)
2. **The rules engine is the product.** Status tables are commodity; the value is the engine that says *what's next, what's blocked, what's at risk, are we ready to close*. Invest there.
3. **Personal by default, shared by intent.** A lawyer sees *their* deals and *their* open items immediately; sharing within a firm is deliberate and role-gated.
4. **Templates, not hard-code.** Today's seed is "Template v1." New deal types (M&A, Series A, debt) become *content*, not code.
5. **Defensible.** Every status change is attributable and timestamped (who marked B5 complete, when). Lawyers care about this.
6. **Taste is a feature.** Calm, dense-but-legible, fast. No generic dashboard clutter. Exports look like a partner could hand them to a client.
7. **Boring, reliable tech.** Managed Postgres, managed auth, well-trodden libraries. This is a system of record; uptime and data integrity beat novelty.

---

## 4. Target users & jobs-to-be-done

- **Primary: the transaction associate / lawyer** running the deal day-to-day. JTBD: "Update where each item stands; instantly see what's next, what's overdue, what's blocking closing; produce a status report for the partner/client in one click."
- **Secondary: the partner** supervising several deals. JTBD: "Across my deals, what's at risk this week? Is anything not ready to close that I think is?"
- **Tertiary: the company secretary / paralegal** updating filings. JTBD: "Mark filings done with dates; see statutory deadlines counting down."

Design for the associate first; the partner gets a portfolio view; the CS gets a focused filings view.

---

## 5. Naming & positioning (quick)

The repo is "fundraise-closing-tracker," but the ambition ("the destination for each transaction lawyer") is broader. Recommendation: keep India fundraise/private-placement as **the flagship template** for launch, but build the data model **template-agnostic** so M&A and other deal types slot in later. Pick a product name that isn't fundraise-specific (working title: **"Closing Room"** / **"DealDesk"**) - decide later; not blocking.

---

## 6. Architecture (target)

Keep the Next.js App Router foundation. Add a real backend in the same app (Route Handlers / Server Actions) so we don't run a separate service.

```
Browser (Next.js client components)
   | authenticated fetch / server actions
   v
Next.js App Router (Vercel)
   |-- Server Actions / Route Handlers -> validation (Zod) -> service layer
   |-- Rules engine (ported from lib/rules.ts, runs server-side)
   |-- Export workers (PDF, Excel) on Vercel Functions
   |-- Auth middleware (org + role context on every request)
   |
   v
Postgres (multi-tenant, row-scoped by org) via ORM
   +-- Audit log, templates, deals, tasks, notes, members
```

### 6.1 Stack decisions

> ⚠️ **Superseded — see Section 0a.** The build pivoted to **Supabase** (Auth + Postgres + RLS). The Neon + Clerk + Drizzle + server-actions recommendation below was not taken; data access is the client Supabase SDK + RLS, and audit/provisioning are Postgres triggers.


| Concern | Recommendation | Why | Alternatives |
|---|---|---|---|
| **Hosting** | Vercel | App is already Next.js; zero-config functions for exports/cron. | Self-host (Docker), Netlify, Render |
| **Database** | **Postgres - Neon** (via Vercel Marketplace) | Serverless-friendly, scales, branching for previews; relational fits the deal/task/audit model. | Supabase (DB+auth+storage in one), PlanetScale (MySQL), RDS |
| **ORM** | **Drizzle** | TS-native, lightweight, excellent serverless/Neon fit, SQL-transparent. | Prisma (richer DX, heavier), Kysely |
| **Auth** | **Clerk** (Vercel-native) | Built-in **Organizations + roles** map exactly to firm multi-tenancy; fast to ship. | Auth.js/NextAuth (free, more wiring), Supabase Auth, WorkOS (enterprise SSO) |
| **Validation** | **Zod** at every server boundary | One schema -> types + runtime validation + form errors. | Valibot, yup |
| **Excel export** | **ExcelJS** | Real styling: multiple sheets, conditional formatting, frozen panes, autofilter. | SheetJS (less styling in OSS build) |
| **PDF export** | **v1: `@react-pdf/renderer`**; **v2 upgrade: headless Chrome (Puppeteer + `@sparticuz/chromium`)** for pixel-perfect branded decks | react-pdf is pure-JS and reliable in serverless; Chrome gives full design control later. | Playwright, a paid PDF API (DocRaptor) |
| **Email (digests/nudges)** | **Resend** | Simple, Vercel-friendly, React Email templates. | Postmark, SES |
| **Background jobs / reminders** | **Vercel Cron** (daily) -> digest + deadline scan | No extra infra. | Inngest/Trigger.dev for complex flows, Vercel Queues |
| **State (client)** | Keep **Zustand** for view/UI state; server data via **server actions + React Query/SWR** or RSC fetch | Don't persist domain data in localStorage anymore. | TanStack Query throughout |
| **Charts** | Recharts or visx (lightweight) | Timeline/Gantt, burn-down. | Tremor, nivo |

> If you'd rather consolidate, **Supabase** (Postgres + Auth + Row-Level-Security + storage-if-ever-needed) is a clean all-in-one alternative to Neon+Clerk. Trade-off: Clerk's org/role UX is more polished out of the box; Supabase RLS is a stronger DB-enforced security boundary. Both are good. Recommendation stands at Neon+Clerk for speed-to-firm-multitenancy, with **DB-level row scoping enforced in the service layer** regardless.

---

## 7. Data model (multi-tenant, template-first, auditable)

Core hierarchy: **Organization (firm) -> Member (user+role) -> Deal -> Task -> (Note, Document-ref, Audit)**. A Deal is *instantiated from a Template*.

### 7.1 Entities

```
organization
  id, name, plan, created_at
  // every other table carries org_id and is filtered by it

membership
  id, org_id, user_id (Clerk), role: 'owner'|'admin'|'lawyer'|'viewer', created_at

template
  id, org_id (nullable = global/system template), name, jurisdiction, deal_type,
  version, is_published, source_note, created_at
  // e.g. "India Seed Financing - Private Placement", jurisdiction "IN", v1

template_task            // the master rows of a template
  id, template_id, serial_number, phase, timeline_code, custom_offset_days,
  action, parties[], default_priority, default_risk_category,
  blocker, agreed_form_required, mandatory_for_closing,
  filing_form, filing_authority, filing_statutory_days,   // see Section 10
  evidence_label, source_reference

template_dependency
  id, template_id, task_serial, prerequisite_serial, label

deal
  id, org_id, name, company_name, investor_name, deal_type,
  template_id, template_version, closing_date_x, firm_label,
  status: 'active'|'closed'|'on_hold'|'archived',
  created_by, created_at, updated_at

deal_task                 // instance of a template_task within a deal
  id, deal_id, org_id, serial_number, phase, timeline_code, custom_offset_days,
  action, parties[], status, priority, blocker, risk_category,
  evidence_required, evidence_satisfied, evidence_label, evidence_link (URL only),
  document_status, agreed_form_required, mandatory_for_closing,
  filing_form, filing_authority, filing_filed_date, filing_due_date_computed,
  owner_membership_id, reviewer_membership_id,
  notes (status-only, length-capped), last_updated, completed_at

deal_dependency
  id, deal_id, task_id, prerequisite_task_id, label

deal_note                 // status/process notes, NOT legal substance
  id, deal_id, org_id, author_membership_id, category, text (capped), created_at

audit_entry               // append-only
  id, org_id, deal_id, actor_membership_id, entity_type, entity_id,
  field, old_value, new_value, action, created_at

saved_view / preference   // per-user filters, default landing, theme
```

### 7.2 Key schema decisions

- **No file/document tables that store content.** `evidence_link` and `document_status` are *metadata + external URL* only (Section 9).
- **Templates are versioned and snapshotted onto deals.** A deal copies template tasks at creation, so later template edits don't silently mutate live deals. Optional "upgrade deal to template vN" action later.
- **Append-only `audit_entry`** for every status/owner/date change -> defensibility.
- **`filing_due_date_computed`** is derived (X + statutory/agreed offset) and stored for fast querying + reminders; recomputed when X changes.
- **Indexes:** `(org_id, deal_id)`, `(deal_id, status)`, `(org_id, owner_membership_id, status)` for personal queues, `(deal_id, filing_due_date_computed)` for deadline scans. This is the "handle a lot of data" answer - relational + the right indexes scales to thousands of deals per firm comfortably.
- **Row scoping:** every query filtered by `org_id` from the auth context. (If Supabase: enforce via RLS policies as a second wall.)

### 7.3 Migration from the seed

The current `seedTasks` array becomes **Template v1** rows (a one-time data migration script). `lib/types.ts` enums become DB enums / Zod schemas (single source of truth). `lib/rules.ts` moves to a shared `lib/engine/` used by both server (queries, exports, reminders) and client (optimistic UI).

---

## 8. Feature set - making it "smart and personal"

Concretize the vibe into shipped features. Most are **derivations of the existing rules engine**, just surfaced well.

### 8.1 Smart (engine-driven)
- **Next-best-action banner** per deal: the single most important unblocked, highest-priority, soonest-due open task - "Do this next: B3 Valuation certificate (Critical, blocks B4)."
- **Closing readiness gauge** (already computed) with a plain-English "why not ready" list.
- **Smart deadlines:** auto-compute every due date from `X`; show countdown; flag **statutory hard limits** distinctly from internal/agreed dates (e.g., PAS-3 <= 15 days - Section 10). Amber/red as deadlines approach or pass.
- **Dependency intelligence:** "B8 (SH-7/MGT-14) is blocked because B7 EGM is not done." (Engine already produces these.)
- **Deal health & momentum:** completion %, velocity (items completed/week), days-to-X, risk concentration by category.
- **Risk heatmap** (exists) -> make it actionable: click a cell -> filtered task list.

### 8.2 Personal
- **"My open items"** across all deals where the current user is owner/reviewer - the default landing for an associate.
- **Portfolio view** for partners: every deal's readiness + top risk in one grid.
- **Weekly digest email** (and optional daily): your overdue items, items due this week, deals whose readiness dropped.
- **In-app nudges** for items due within N days or just gone overdue.
- **Saved filters / views** and a personal default landing.
- **Per-user theme** (dark/light already exists) and density.

### 8.3 Collaboration (role-gated, confidentiality-safe)
- **Deal sharing within the firm** by role (owner/admin/lawyer/viewer).
- **Status-only comments** with @mention (notify, never a place for legal analysis - enforced by copy + length cap).
- **Activity feed** (reads from `audit_entry`).
- **Assignment** of owner/reviewer per task.

### 8.4 Lifecycle & scale
- **Deal list** with search, filter (status, type, closing month), sort; **archive** closed deals (keeps them queryable without cluttering active views).
- **Duplicate deal** / **start from template** wizard.
- **Bulk status updates** on the checklist.

---

## 9. Confidentiality & data-handling model (the spine)

**Rule:** The tracker holds *status, process, dates, ownership, and links* - never privileged client substance, deal documents, financials, or PII beyond names already public to the deal team.

Concretely:

1. **No file uploads of client/privileged content.** The "Documents Room" is reframed as a **document *register*** - name, category, status (`Draft Shared`/`Agreed Form`/`Executed`/`Filed`), and an **external link** to the firm's DMS (iManage / NetDocuments / SharePoint / Drive). The app stores the URL and metadata, not the file. *(Decision fork: if you ever truly need uploads, that's a separate, encrypted, access-controlled module with its own legal sign-off - out of scope here.)*
2. **Freeform text is status-only and capped.** Notes/comments carry a persistent inline reminder: *"Status notes only - do not paste privileged or confidential content."* Length caps discourage pasting documents.
3. **Onboarding gate + Terms** make the no-confidential-content rule explicit and require acknowledgment.
4. **Persistent UI banner / footer disclaimer:** *"This tool tracks deal status only. Do not enter confidential, privileged, or client-identifying material. Nothing here is legal advice."*
5. **Data protection regardless:** encryption in transit (TLS) and at rest (managed Postgres default); least-privilege org scoping; audit log; configurable data retention / deletion on request.
6. **AI guardrail (forward-looking):** if AI summaries are added later (v3), client data never leaves to a model without explicit config; default is engine-derived summaries (no LLM), or summaries over non-confidential status fields only.

This model is *why* there are no content-bearing document tables in Section 7 and *why* exports (Section 11) draw only from status fields.

---

## 10. Legal content - verification & update register

> **Important & honest:** There is no dedicated "legal skill" in this environment. The following is **transaction-practice knowledge applied to verify and refine the existing checklist** - it is **not legal advice** and must be confirmed by qualified counsel against the *current* Companies Act 2013, FEMA/RBI rules, and state stamp laws before relying on it. The existing seed is already strong; these are refinements.

The existing template covers India private placement well. Recommended updates to bake into **Template v1**:

| # | Item | Current seed | Recommended update (verify with counsel) |
|---|---|---|---|
| L1 | **PAS-3 (return of allotment) deadline** | D1 set to `X+10` | For private placement under **Sec 42(8)**, PAS-3 is due **within 15 days of allotment** (reduced from 30). Keep an internal target (e.g., X+10) but store the **statutory hard limit = 15 days** and flag it. **Funds cannot be utilised until PAS-3 is filed** (Sec 42(6)) - surface this prominently. |
| L2 | **Valuation basis** | B3 references independent CA / merchant banker, Income Tax Act and FEMA | Distinguish **three bases**: (a) **Companies Act preferential allotment** needs a **Registered Valuer (IBBI)** report [Sec 62(1)(c) + Share Capital & Debentures Rules]; (b) **FEMA pricing** - CA / Merchant Banker / Cost Accountant per internationally accepted methodology, arm's length; (c) **Income Tax Sec 56(2)(viib) ("angel tax")** - **abolished w.e.f. FY 2024-25**, so this basis is generally no longer required for new issues (still relevant for legacy/DD). Track the registered-valuer requirement explicitly. |
| L3 | **Allotment window & banking** | Implicit | Add explicit items: **allotment within 60 days** of receipt of application money else refund within 15 days (Sec 42(6)); monies via **banking channels only, kept in a separate bank account**; no fresh offer until prior offer completed/withdrawn (Sec 42(5)). |
| L4 | **MGT-14 / SH-7 statutory clock** | B8 "Prior to X"; D2 "X+30" | These are **30 days from the resolution** (Sec 117 / Sec 64). Marking as CP "Prior to X" is fine for deal control, but the tracker should flag when the *statutory* 30-day clock would fall **after X** so nothing is missed. |
| L5 | **PAS-5** | B11 "Maintain record of private placement in Form PAS-5" | Correct - **PAS-5 is a record maintained, not filed** with RoC (the earlier GNL-2 filing of PAS-4/PAS-5 was removed by the 2018 amendment). Reaffirm wording so users don't try to "file" it. |
| L6 | **FC-GPR / FIRMS** | D3 "X+30" | FC-GPR via **SMF on the RBI FIRMS portal within 30 days of allotment**. Add prerequisite: **Entity Master Form (EMF)** must already be registered on FIRMS. Late filing attracts **Late Submission Fee (LSF)**. |
| L7 | **Share certificate stamping** | C5 | Add the **30-day issue window** and **state-specific stamp duty** on certificates; SHA/SSA stamping per state stamp act before execution (B-row already covers stamp papers). |
| L8 | **Valuation report freshness** | B3 note ("30 days prior to EGM") | Keep - good. Add a soft validity flag (practice: recent report; many treat ~90 days) so stale valuations are caught. |

**Action:** encode these as updated `template_task` rows + a new `filing_statutory_days` field and a "statutory vs internal deadline" distinction in the engine. Add a short **"sources to confirm"** note per row (`source_reference`) so a lawyer can re-verify quickly. Ship a lightweight **"legal content changelog"** so template updates are visible and dated.

---

## 11. Exports - PDF presentation report + Excel workbook

Both draw **only from status fields** (confidentiality). Generated **server-side** (Vercel Function) so output is consistent and not limited by the browser.

### 11.1 PDF - "Closing Status Report" (presentation-grade)
Branded, partner-ready. Sections:
1. **Cover:** firm label/logo, deal name, company, investor, Closing Date X, report date, big **Readiness verdict + score**, confidentiality footer.
2. **Executive summary:** one-paragraph plain-English status + 3-5 KPIs (overall %, CP %, blockers, days-to-X).
3. **Readiness detail:** ready/not-ready with the "why not" list (blockers, missing evidence/agreed-form, mandatory incomplete).
4. **Upcoming deadlines:** next N items with computed dates; statutory items flagged.
5. **Owner-wise pending** table.
6. **Phase progress** bars.
7. **Post-closing tail** (filings due after X).
8. **Disclaimer page:** "status only / not legal advice / no confidential content."

Implementation: **v1 `@react-pdf/renderer`** (reliable in serverless). **v2:** styled HTML template -> **Puppeteer + `@sparticuz/chromium`** for pixel-perfect, designed output (charts, fine typography).

### 11.2 Excel - full workbook (ExcelJS)
- **Sheet "Overview":** deal meta, KPIs, readiness, generated timestamp.
- **One sheet per phase** (Pre-Execution, CPs, Closing, Post-Closing): columns S.No., Action, Parties, Owner, Reviewer, Status, Priority, Risk, Computed Due Date, Statutory Limit, Evidence, Doc Status, Last Updated, Source.
- **Sheet "Deadlines":** all dated items sorted; statutory vs internal flagged.
- **Sheet "Audit"** (optional, role-gated): recent changes.
- **Formatting:** frozen header row, autofilter, column widths, **conditional formatting** (green=complete, amber=in-progress/with-party, red=blocked/overdue), status data-validation dropdowns, firm color accents. "All data organised beautifully."

### 11.3 Also keep
CSV (already exists) for raw interchange; deprecate the Markdown/JSON downloads as user-facing (keep JSON as an internal backup/import format).

---

## 12. Roadmap - step by step

Four phases. Each ships something usable. Tickets are sequenced; check them off in order within a phase.

### v0 - Foundation: accounts + cloud data (replace localStorage)
*Goal: the current single-deal experience, but logged-in and saved to a real DB.*
*Status legend: ✅ done · 🟡 partial · ⬜ pending. (Stack realized on Supabase, not Neon/Clerk/Drizzle — see Section 0a.)*

1. ✅ **Provision infra** — Supabase project (Auth + Postgres) wired via `.env.local`. *(Caveat: `db/schema.sql` not yet applied to the live project.)*
2. 🟡 **Schema** — all 10 tables defined in `db/schema.sql` with RLS + triggers. **No Drizzle ORM** (raw SQL + client SDK instead of migrations).
3. 🟡 **Single source of truth for enums** — DB enums mirror `lib/types.ts` exactly, but **Zod schemas not added** at the boundary.
4. ⬜ **Seed -> Template v1 migration** — **not done**; deals snapshot from the hardcoded `checklistSeed`, the `template`/`template_task` tables are unused.
5. ✅ **Auth wiring** — Supabase Auth; trigger auto-creates `organization` + `owner` `membership` on first login; org context enforced via RLS.
6. ✅ **Persistence layer** — `lib/supabasePersistence.ts` provides `createDeal`, status/evidence/doc/notes updates, org-scoped via RLS; `audit_entry` written by **DB triggers** (not server actions). *(Not Zod-validated.)*
7. 🟡 **Rules engine** — lives in `lib/rules.ts`, reused client-side; **not** moved to a server `lib/engine/` (no server runtime needed under the client-SDK model).
8. ✅ **Rewire `lib/store.ts`** — localStorage persistence removed; domain data comes from Supabase.
9. ✅ **Confidentiality basics** — persistent disclaimer, status-only copy, length caps; AuthGate gate.
10. ✅ **Reframe Documents Room** — metadata + external-link register, no uploads.
11. 🟡 **Verification** — works in dev (create → update → reload persists; audit rows written). Not yet validated against the live prod project (schema unapplied).

**Exit criteria:** a logged-in lawyer creates a deal, updates it, and the data survives across sessions/devices. → **Met in dev; blocked in prod on applying the schema.**

### v1 - Multi-deal + real exports (the "tracker" people rely on)
1. 🟡 **Deal list / home** — `app/deals` (Supabase-backed) with create + list; advanced search/filter/sort/archive not all wired.
2. ⬜ **"My open items"** cross-deal personal queue — not built.
3. ✅ **New-deal onboarding** — set company/investor/X → instantiate task snapshot. *(Snapshots from the TS seed, not a DB template — see v0.4.)*
4. ✅ **Section 10 legal updates applied** — in `lib/checklistSeed.ts`: PAS-3 15-day hard limit, registered-valuer valuation, MGT-14/SH-7 30-day clock, FC-GPR/FIRMS+EMF+LSF, DIR-12; `Filing.statutoryDays` + statutory-vs-internal distinction in the engine.
5. ✅ **Next-best-action banner** + amber/red smart deadline flags with statutory hard limits highlighted.
6. ✅ **Excel export (ExcelJS)** — `lib/excelReport.ts`.
7. ✅ **PDF export (`@react-pdf/renderer`)** — `lib/pdfReport.tsx`, self-hosted fonts + postbuild render check.
8. ✅ **Polish pass** — UI revamp, light/dark themes, command palette, partner mode; further empty/loading/mobile polish ongoing.
9. 🟡 **Verification** — exports work and draw only from status fields; not yet formal snapshot-tested.

**Exit criteria:** a lawyer runs several deals and one-click exports a partner-ready PDF and a formatted Excel. → **Largely met** (multi-deal home + both exports work); gated on prod schema + branch merge.

### v2 - Defensibility, reminders, scale
*All ⬜ pending unless noted. `audit_entry` table + append-only trigger already exist; indexes already in `db/schema.sql`.*
1. ⬜ **Audit/activity feed UI** (reads `audit_entry`), role-gated — table/triggers exist, no UI.
2. ⬜ **Cron deadline scan** -> in-app nudges. *(Plan said Vercel Cron; the to-do argues for Inngest — undecided.)*
3. ⬜ **Resend weekly digest** — no email provider installed.
4. ⬜ **Portfolio view** for partners — no `/portfolio` route.
5. 🟡 **Scale hardening** — compound indexes present in schema; pagination/archive filtering/perf testing not done.
6. ⬜ **PDF v2 upgrade** (Puppeteer + chromium) — react-pdf v1 is in place and sufficient for now.
7. 🟡 **Legal content changelog** — `legal-content-changelog.md` started (reviewer "Pending"); not surfaced in-app; no template-version upgrade action.
8. ⬜ **Testing** — only a postbuild PDF render check exists; no engine unit / snapshot / e2e tests.

**Exit criteria:** firms can rely on it at volume; nothing slips because deadlines are pushed to people proactively. → **Not yet started** (reminders are the key gap).

### v3 - Firm collaboration + (optional) AI
*All ⬜ pending. Roles enum (incl. `cs_user`) + RLS scoping already exist in the schema; org branding columns exist.*
1. ⬜ **Roles & sharing** within org — enforced in RLS; **no invitation/sharing UI** (invitations would use Supabase, not Clerk Orgs).
2. ⬜ **Status-only comments + @mentions** with notifications.
3. ⬜ **More templates** (India M&A, Series A SHA, debt) — blocked on the Seed → DB-template migration (v0.4).
4. ⬜ **Optional AI summaries** under the Section 9.6 confidentiality guardrails.
5. 🟡 **Admin / branding** — `organization` carries firm-branding columns; **no admin UI** for settings/branding/retention.

**Exit criteria:** a firm runs the tool as shared infrastructure with controlled access and branding. → **Not started.**

---

## 13. Non-functional requirements

- **Security:** TLS; encryption at rest (managed PG); org-scoped every query; least-privilege roles; audit log; secrets in Vercel env (never client); rate-limit mutations. Consider Vercel BotID/firewall on public auth routes.
- **Privacy/compliance posture:** confidentiality model (Section 9); data export + deletion on request; clear ToS/privacy; "not legal advice" everywhere. (India: be mindful of DPDP Act obligations for personal data - keep PII minimal by design.)
- **Performance:** server-render deal lists; index hot paths; computed due dates stored; exports async on functions; target snappy interactions (<200ms perceived for status toggles via optimistic UI).
- **Reliability:** managed DB backups; migrations reviewed; audit log is append-only; no destructive "reset" in production (the demo reset becomes a per-deal action behind confirmation).
- **Accessibility:** keyboard nav for status changes, ARIA on interactive cells, color-blind-safe status palette (not color-only - pair with icon/label).
- **Testing:** engine unit tests first (pure functions, easy + high value); Zod schema tests; export snapshot tests; e2e for the golden path.
- **Observability:** error tracking (Sentry), basic product analytics on key actions (privacy-respecting).

---

## 14. Open decisions (redirect any of these on review)

1. ~~**Stack:** Neon + Clerk vs Supabase.~~ **RESOLVED → Supabase** (Auth + Postgres + RLS). See Section 0a.
2. **Launch collaboration scope:** personal-first with sharing in v3 (recommended) vs firm/team sharing in v1. *(Still open — sharing UI unbuilt.)*
3. **Jurisdiction/deal-type scope at launch:** India private placement only (recommended) vs include M&A/Series A templates sooner. *(Currently India-only; more templates blocked on the DB-template migration.)*
4. ~~**Document handling.**~~ **RESOLVED → metadata + external links only** (built as a register, no uploads).
5. ~~**PDF approach for v1.**~~ **RESOLVED → react-pdf now** (shipped); Chrome upgrade deferred to v2.
6. **Product name** — leaning **"Closing Room"** (used in README); app `<title>` still says "Fundraise Closing Tracker" (rename pending).
7. **Reminders infra (new fork):** Vercel Cron (plan) vs **Inngest** (to-do argues for retries/idempotency on statutory reminders). Undecided.

---

## 15. Immediate next steps

> Updated 2026-06-24 — the original three steps (stack forks, provision Neon/Clerk, apply legal updates) are **done** (Supabase chosen, infra wired, Section 10 updates baked into the seed). Current priorities:

1. **Apply `db/schema.sql` to the live Supabase project** (SQL editor) — unblocks prod persistence.
2. **Open a PR** for `codex/tracker-v1-scaffold` → `main`, review the schema line-by-line, then merge; drop the "localStorage MVP" badge and rename the app title to "Closing Room".
3. **Obtain the legal-content reviewer sign-off** — the review packet is prepared (`legal-content-changelog.md` Section 2–3); a qualified practicing lawyer / CS must verify L1–L9 and complete the Section 3 sign-off. This gates charging anyone and cannot be self-certified.
4. **Build the reminder job** (statutory-deadline sweep + digest; decide Vercel Cron vs Inngest).
5. **Then**: Seed → DB-template migration (unlocks more templates), audit/activity feed UI, portfolio view, "My open items".

> Reminder baked into the product and this plan: **this tracker records deal *status* only - never confidential, privileged, or client-identifying material - and nothing in it is legal advice.**
