# ClosingRoom Tracker — To-Do List & Best Approaches

> Goal: Turn the LocalStorage MVP into a product that 3 boutique firms can pay for within 60 days.
> Source of truth: `closing_room_market_research.md` (Sections 12, 13, 14, 15) + the existing `PRD.md` and `PLAN.md` in this repo.
> Current state (after code review): substantially built single-deal MVP. Rules engine, 8 working views, statutory metadata in the data model, ExcelJS + `@react-pdf/renderer` already wired, confidentiality spine in place, source references per task in the model. The unbuilt gap is the infra spine: auth, cloud DB, multi-deal, append-only audit, reminder emails, RBAC, firm branding.
>
> **This to-do is a delta against PLAN.md, not a replacement.** PLAN.md already names the v0→v1→v2→v3 phasing, the Clerk + Neon + Drizzle stack, the `audit_entry` table, server actions, Vercel Cron + Resend, and the portfolio view. The buckets below map onto those phases; where I disagreed with PLAN.md I've called it out explicitly.

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
- **`PRD.md` + `PLAN.md`** are comprehensive and aligned with the research report. Treat them as the spec — they already encode confidentiality-by-design, the India statutory depth, and the v0→v3 phasing.
- **`ImportChecklist`** is currently a placeholder card ("Architecture ready") — not implemented. The mammoth-based DOCX parser is not built.

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

### 1.1 Cloud persistence + auth (PLAN.md v0 §12)
- [ ] Provision Neon + Clerk + Vercel as PLAN.md §6.1 specifies.
- [ ] Drizzle schema per PLAN.md §7.1: `organization`, `membership`, `template`, `template_task`, `template_dependency`, `deal`, `deal_task`, `deal_dependency`, `deal_note`, `audit_entry`. Use row-level scoping on `organization_id` in every server action.
- [ ] **Migrate `lib/types.ts` enums into Zod schemas + DB enums** (PLAN.md §12 v0 step 3) — single source of truth, no more drift between Postgres and TypeScript.
- [ ] **Seed → Template v1 migration script** — convert `checklistSeed.ts` rows into `template_task` rows tagged "India Seed Financing — Private Placement", v1.
- [ ] Auto-create `organization` + `owner` membership on first login.
- [ ] **Rewire `lib/store.ts`** — Zustand keeps UI state only; domain data comes from server actions + RSC. Remove the `persist` middleware on the deal object. Keep zustand for view state (active tab, dark mode).
- [ ] Tear down LocalStorage persistence of deal data on the same commit that turns on the API — don't ship a hybrid.

**Best approach:** Server actions + RSC for the data layer; SWR or React Query only for the few client-side mutations that need optimistic updates. Don't introduce TRPC — server actions are now first-class in Next 15 and the indirection isn't worth it.

### 1.2 Multi-deal home screen
- [ ] `/deals` route: list of all active deals with closing date, readiness %, next blocking item, days to next statutory deadline.
- [ ] Sort by: closing date, readiness, deal name.
- [ ] Filter by: status (active/closed/on-hold), owner (Me / All).
- [ ] "New deal" button → wizard (template picker → set X / Closing Date → instantiate).

**Best approach:** Build the deal list as a server component with a small client-side filter bar. Don't over-engineer with TanStack Table yet — a plain `<table>` with Tailwind is enough for v1.

### 1.3 Audit trail (PLAN.md `audit_entry` table)
- [ ] Build the `audit_entry` table named in PLAN.md §7.1: `(id, organization_id, deal_id, actor_user_id, entity_type, entity_id, action, before, after, created_at)`.
- [ ] **Append-only — never UPDATE or DELETE rows.** Use a Postgres trigger to enforce this so future code can't bypass it.
- [ ] Write the entry inside the same server-action transaction as the underlying mutation. No best-effort logging.
- [ ] **Don't repurpose the existing `lastUpdated` field on Task** — it's a destructive overwrite. Keep it for "last touched" UI display; the audit log is separate.
- [ ] Per-task "history" drawer showing chronological changes.
- [ ] Per-deal "activity feed" page (PLAN.md v2 §12 ships the UI; the table must exist from v0).

**Best approach:** This is the single biggest "defensibility" selling point for partners — it must be bulletproof. Add an integration test that proves: any status mutation writes exactly one `audit_entry` row, and a direct UPDATE to `audit_entry` fails at the DB level.

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

## 6. Demo & Onboarding Hygiene

The tracker exists to be demoed. Make the demo viscerally good.

- [ ] **Pre-seeded demo deal** at `/demo` — Series A closing, realistic Indian fund, all 11 statutory items populated with plausible owners and dates, 2–3 items deliberately blocked/overdue so the "why not ready" engine has something to say.
- [ ] **Reset demo** button (already present — keep it).
- [ ] **Guided tour** (use `react-joyride` or `intro.js`) — 5 steps: Dashboard → Readiness → Statutory Timeline → Dependencies → PDF export.
- [ ] **"Load my own deal in 60 seconds" CSV import** for paid users — accept their existing Excel checklist and map columns to ClosingRoom fields. (Note: the existing `ImportChecklist` component is just an "Architecture ready" placeholder card — it has no parser. Build the mammoth-based DOCX parser PLAN.md hints at *and* a CSV import in the same pass.)

**Best approach:** Record a 90-second screen-capture of the demo flow and embed it on the marketing site. Most partners will not click "Try the tracker" cold — they'll watch the video first.

---

## 7. Tech Stack Recommendation (Reconciled with PLAN.md)

| Layer | Pick | Status | Note |
|---|---|---|---|
| Framework | Next.js 15 (App Router) | ✓ installed | — |
| Hosting | Vercel | ✓ deployed | — |
| Styling | Tailwind v4 | ✓ installed | — |
| Client state | Zustand | ✓ installed | Keep for UI state only after v0 migration |
| DB | Neon Postgres | per PLAN.md — to install | Branchable preview DBs per PR |
| ORM | Drizzle | per PLAN.md — to install | Schema-first, no Prisma indirection |
| Auth | Clerk | per PLAN.md — to install | Auth.js is the cheaper alt if MAU pricing bites |
| Validation | Zod | to install | Single source of truth for enums and inputs |
| Email | Resend | per PLAN.md — to install | India deliverability fine |
| Background jobs | **Inngest** (override PLAN.md's Vercel Cron) | to install | Retries + idempotency + visibility — non-negotiable for reminder reliability |
| PDF | `@react-pdf/renderer` | ✓ installed | Skip PLAN.md's v2 Puppeteer upgrade unless a pilot asks |
| Excel | `exceljs` | ✓ installed | — |
| Icons | `lucide-react` | ✓ installed | — |
| Analytics | PostHog (cloud free tier) | to install | Funnel + session replay |
| Error monitoring | Sentry | to install | Free tier sufficient |
| Testing | Vitest + Playwright | to install | Engine unit tests + one e2e per critical path |

---

## 8. Definition of Done — Tracker v1 (Day 60 target)

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

## 9. The 60-Day Tracker Plan (Sequenced)

**Week 1–2:** Auth + Postgres + multi-tenant schema migration. Demo deal seeded.
**Week 3:** Multi-deal home + new-deal wizard.
**Week 4:** Audit trail (model + UI).
**Week 5:** Reminder emails (T-7, T-2, T-0, T+1) on Inngest.
**Week 6:** PDF/Excel export polish + firm branding.
**Week 7:** Role-based access + invite flow.
**Week 8:** Partner portfolio view + weekly digest.
**Week 9–10:** Run 3 paid pilots; bug-fix only.

**Tracker is the constraint on revenue. Pricing, marketing, and outreach all stall until the tracker can be charged for.**
