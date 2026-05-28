# Deal Tracker - Build Plan

> **Vision:** The destination where every transaction lawyer records and watches the progress of each deal - smart, personal, beautiful, and trustworthy. A closing control room that tells the lawyer *exactly what is happening to each deal, what is next, and what is at risk* - without ever holding confidential client material.

**Document status:** Draft for review - **Date:** 2026-05-28
**Scope:** Turn the current single-deal localStorage MVP into a multi-tenant, account-based SaaS with a robust database, polished UX, and branded PDF + Excel exports.

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

1. **Provision infra:** create Vercel project; add Neon Postgres (Marketplace); add Clerk (Marketplace); pull env vars (`vercel env pull`). *(Alternative: Supabase.)*
2. **Add ORM + schema:** install Drizzle; define `organization`, `membership`, `template`, `template_task`, `template_dependency`, `deal`, `deal_task`, `deal_dependency`, `deal_note`, `audit_entry`; first migration.
3. **Single source of truth for enums:** move `lib/types.ts` enums into Zod schemas + DB enums; generate TS types from them.
4. **Seed -> Template v1 migration script:** convert `seedTasks`/`seedNotes` into `template_task` rows ("India Seed Financing - Private Placement", v1).
5. **Auth wiring:** Clerk middleware; on first login auto-create an `organization` + `owner` membership; org/role available in every server action.
6. **Service layer + server actions:** `createDeal(fromTemplate)`, `updateTaskStatus`, `updateEvidence`, `updateDocStatus`, `updateNotes`, `addNote` - each Zod-validated, org-scoped, and writing an `audit_entry`.
7. **Port the rules engine** to `lib/engine/` (server-usable, pure functions). Reuse on client for optimistic UI.
8. **Rewire `lib/store.ts`:** Zustand keeps UI state only; domain data comes from server (server actions + SWR/React Query or RSC). Remove localStorage persistence of deal data.
9. **Confidentiality basics:** onboarding acknowledgment, persistent disclaimer banner, "status-only" copy on note inputs, length caps.
10. **Reframe Documents Room** to a metadata + external-link register (no uploads).
11. **Verification:** create deal -> update statuses -> reload/sign out/in -> data persists; readiness matches old client logic; audit rows written. (Run the app and click through.)

**Exit criteria:** a logged-in lawyer creates a deal from Template v1, updates it, and the data survives across sessions/devices.

### v1 - Multi-deal + real exports (the "tracker" people rely on)
1. **Deal list / home:** create, search, filter (status/type/closing month), sort, archive.
2. **"My open items"** personal queue across deals (owner/reviewer = current user).
3. **New-deal wizard:** pick template -> set company/investor/X -> instantiate task snapshot.
4. **Apply Section 10 legal updates** to Template v1 (PAS-3 15-day statutory limit, registered-valuer valuation, allotment window/banking, MGT-14/SH-7 30-day clock, FC-GPR/FIRMS+EMF+LSF, certificate stamping). Add `filing_statutory_days` and statutory-vs-internal deadline distinction to the engine.
5. **Next-best-action banner** + smart deadline flags (amber/red, statutory hard limits highlighted).
6. **Excel export (ExcelJS)** - full workbook per Section 11.2.
7. **PDF export (`@react-pdf/renderer`)** - Closing Status Report per Section 11.1.
8. **Polish pass (taste):** spacing, typography, empty states, loading skeletons, mobile-readable checklist, keyboard-friendly status updates.
9. **Verification:** generate PDF + Excel for a populated deal; confirm formatting, confidentiality footer, and that only status fields appear.

**Exit criteria:** a lawyer runs several deals and one-click exports a partner-ready PDF and a formatted Excel.

### v2 - Defensibility, reminders, scale
1. **Audit/activity feed UI** (reads `audit_entry`), role-gated.
2. **Vercel Cron deadline scan** -> in-app nudges for due/overdue items.
3. **Resend weekly digest** (opt daily): overdue, due-this-week, readiness drops.
4. **Portfolio view** for partners (all deals' readiness + top risk).
5. **Scale hardening:** indexes (Section 7.2), pagination, archive filtering, query-perf check with seeded large dataset (e.g., 5k deals / 150k tasks).
6. **PDF v2 upgrade** (Puppeteer + chromium) for pixel-perfect branded report with charts.
7. **Legal content changelog** surfaced in-app; template-version upgrade action for existing deals.
8. **Testing:** engine unit tests (readiness/dependencies/deadlines), export snapshot tests, e2e for create -> update -> export.

**Exit criteria:** firms can rely on it at volume; nothing slips because deadlines are pushed to people proactively.

### v3 - Firm collaboration + (optional) AI
1. **Roles & sharing** within org (owner/admin/lawyer/viewer), invitations (Clerk Orgs).
2. **Status-only comments + @mentions** with notifications.
3. **More templates:** India M&A, Series A SHA, debt - as content (proves the template-first design).
4. **Optional AI summaries** *under strict confidentiality guardrails* (Section 9.6): default to engine-derived prose; any LLM use is opt-in, status-fields-only, no client substance.
5. **Admin:** org settings, branding (logo/colors for exports), data retention/export-my-data/delete controls.

**Exit criteria:** a firm runs the tool as shared infrastructure with controlled access and branding.

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

1. **Stack:** Neon + Clerk (recommended) vs Supabase all-in-one. Biggest fork.
2. **Launch collaboration scope:** personal-first with sharing in v3 (recommended) vs firm/team sharing in v1.
3. **Jurisdiction/deal-type scope at launch:** India private placement only (recommended) vs include M&A/Series A templates sooner.
4. **Document handling:** metadata + external links only (recommended, per confidentiality) vs build a secure upload module (bigger scope, legal sign-off).
5. **PDF approach for v1:** react-pdf now / Chrome later (recommended) vs go straight to Chrome for maximum design.
6. **Product name** (non-blocking).

---

## 15. Immediate next steps

1. **You:** confirm/redirect the Section 14 forks (especially #1 stack and #4 documents).
2. **Then v0, ticket 1-4:** provision Neon + Clerk, add Drizzle, define schema, migrate the seed into Template v1.
3. In parallel, I can **apply the Section 10 legal updates to the seed now** (low-risk content work) so Template v1 launches corrected.

> Reminder baked into the product and this plan: **this tracker records deal *status* only - never confidential, privileged, or client-identifying material - and nothing in it is legal advice.**
