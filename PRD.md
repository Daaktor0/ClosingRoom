# Closing Room — Product Requirements Document

> **The closing control room for transaction lawyers.** Closing Room tells a deal team *exactly what is happening on every deal, what is next, and what is at risk* — without ever holding a single line of confidential client material.

**Product:** Closing Room (working name) · **Repo:** github.com/Daaktor0/ClosingRoom
**Document status:** Pitch draft · **Date:** 2026-05-28 · **Owner:** Founder
**Flagship use case:** Indian private-placement / fundraise closings (Companies Act 2013 + FEMA)

> **Reading note for reviewers:** Section 6 (Confidentiality) is the spine of the product and the core moat — read it first. Section 8 separates *what works today* from *what is on the roadmap* so nothing here oversells. Legal content (Section 9) is transaction-practice knowledge framed as "verify with counsel," not legal advice.

---

## 1. Executive summary

Closing a venture or M&A transaction is a high-stakes, multi-party, deadline-dense process. Today most deal teams run it on a Word/Excel "closing checklist" emailed around, plus memory and follow-up. Items slip, statutory filing clocks are missed, and no one can answer "are we actually ready to close?" in one click.

Closing Room is a **smart closing tracker** built specifically for transaction lawyers. It encodes the real legal task model of a deal (conditions precedent, corporate approvals, statutory filings, post-closing tail), computes deadlines relative to the closing date, and runs a **rules engine** that surfaces the next best action, what is blocked, what is overdue, and a live **closing-readiness verdict**. It produces a **partner-ready PDF report** and a **formatted Excel workbook** in one click.

Critically, it is **confidential-by-design**: it tracks *status, process, dates, ownership, and links only* — never privileged client substance, documents, or financials. This is what lets a law firm actually adopt it.

**Today** it is a working single-deal application with deep, accurate India private-placement legal content, the rules engine, deadline intelligence, the confidentiality model, and real branded exports. **Next** it becomes a multi-tenant, account-based SaaS (multiple deals, firm teams, roles, audit trail, reminders) with the same template-first design extended to new deal types.

---

## 2. The problem

A transaction closing is, operationally, a **distributed checklist under a deadline** with these properties:

- **Many interdependent tasks** across phases: pre-execution drafting → conditions precedent (CPs) → closing acts → post-closing filings.
- **Hard statutory clocks** that carry penalties if missed (e.g., in India, PAS-3 return of allotment within 15 days; MGT-14/SH-7 within 30 days of resolution; FC-GPR within 30 days of allotment via the RBI FIRMS portal).
- **Multiple parties** (company, founders, investor, both counsel, company secretary, valuer) each owning items.
- **Dependencies** — you cannot file SH-7/MGT-14 before the EGM; you cannot issue share certificates before allotment.

Today this is run on:
- A **Word/Excel closing checklist** that is static, un-computed, and emailed around in versions.
- **Human memory and chasing** for "what's next" and "are we ready."
- **Ad-hoc tracking** of statutory deadlines, often in someone's head or a calendar.

**The cost of the status quo:**
- **Missed/late statutory filings** → penalties, late fees, compliance risk, partner embarrassment.
- **No single source of truth** for deal status; the partner asks "where are we?" and the associate reconstructs it manually.
- **No defensibility** — no record of who marked an item done and when.
- **Reporting is manual** — producing a status update for the partner or client is copy-paste work.

There is no purpose-built, trustworthy tool that a lawyer can actually adopt — because the obvious "just use a project tool" answer collides with the hard constraint below.

---

## 3. Why now

- **The confidentiality bar is rising.** Privilege, client confidentiality obligations, and new data-protection regimes (India's DPDP Act; global equivalents) make lawyers rightly wary of putting deal substance into generic SaaS. A tool that is *confidential-by-design* removes the blocker that kills most legal-tech adoption.
- **Statutory complexity is increasing**, not decreasing — shorter filing windows, portal-based filings (FIRMS), and more moving compliance parts reward software that tracks the clock.
- **Lawyers now expect consumer-grade tools.** The bar for "tasteful, fast, reliable" software in professional settings has risen; a polished, opinionated product can win where clunky legacy tools can't.
- **AI tailwind** lets a small team build deep, well-designed vertical software quickly — and Closing Room's engine-derived intelligence needs *no* model access to client data, so it sidesteps the AI-confidentiality problem entirely while still feeling "smart."

---

## 4. Target users & market

### 4.1 Personas (design for the associate first)

- **Primary — Transaction associate / lawyer** running the deal day-to-day.
  *JTBD:* "Update where each item stands; instantly see what's next, what's overdue, what's blocking closing; produce a status report for the partner/client in one click."
- **Secondary — Partner** supervising several deals.
  *JTBD:* "Across my deals, what's at risk this week? Is anything *not* ready to close that I think is?"
- **Tertiary — Company secretary / paralegal** updating filings.
  *JTBD:* "Mark filings done with dates; watch statutory deadlines count down."

### 4.2 Buyer

Boutique corporate/M&A law firms and the corporate teams of full-service firms; in-house legal/company-secretarial teams at active fundraising companies; CS and CA firms running private-placement compliance. The economic buyer is a **partner or practice head**; the daily user is the associate/CS.

### 4.3 Market framing (illustrative — validate before pitching hard numbers)

- **Wedge:** India private-placement / venture-fundraise closings. India sees a high volume of private placements and FDI filings annually; each is a closing that needs exactly this tracking. The same buyers also run M&A and debt deals.
- **Expansion (template-first):** the data model is deal-type-agnostic, so India M&A, Series-A SHA, and debt closings become *content*, not new products — and the confidentiality + engine architecture is jurisdiction-portable (other common-law markets next).
- **Sizing approach for the deck:** (seats per active firm) × (target firms) × (per-seat ARPU), layered with in-house teams. Treat any TAM figure as an estimate to validate with design partners — do not present invented precision to investors.

---

## 5. Product vision & positioning

**Vision:** the destination where every transaction lawyer records and watches the progress of each deal — smart, personal, beautiful, and trustworthy.

**Positioning one-liner:** *"Closing Room is the confidential-by-design closing tracker that tells transaction lawyers what's next, what's blocked, and whether the deal is ready to close — and hands the partner a polished status report in one click."*

**Product principles:**
1. **Confidentiality first.** Track status and process, never privileged substance. If a feature tempts a user to paste confidential content, redesign the feature.
2. **The rules engine is the product.** Status tables are commodity; the value is the engine that says what's next, what's blocked, what's at risk, are we ready.
3. **Personal by default, shared by intent.** A lawyer sees their deals and open items immediately; firm sharing is deliberate and role-gated.
4. **Templates, not hard-code.** New deal types are content, not engineering.
5. **Defensible.** Every status change is attributable and timestamped.
6. **Taste is a feature.** Calm, dense-but-legible, fast; exports a partner can hand to a client.
7. **Boring, reliable tech.** A system of record: uptime and data integrity beat novelty.

---

## 6. The confidentiality spine (core differentiator)

**The rule:** Closing Room holds *status, process, dates, ownership, and external links* — **never** privileged client substance, deal documents, financials, or PII beyond names already known to the deal team.

This is not a setting; it is the architecture:

1. **No file uploads of client/privileged content.** The "documents" area is a **register**, not a vault — name, category, status (`Draft Shared` / `Agreed Form` / `Executed` / `Filed`), and an **external link** to the firm's own DMS (iManage / NetDocuments / SharePoint / Drive). The app stores the URL and metadata, not the file.
2. **Freeform notes are status-only and length-capped**, with a persistent inline reminder not to paste confidential or privileged content.
3. **A persistent disclaimer** is visible on every screen: *"This tool tracks deal status only. Do not enter confidential, privileged, or client-identifying material. Nothing here is legal advice."*
4. **Exports draw only from status fields** — the PDF and Excel cannot leak document substance because the substance was never stored.
5. **AI guardrail (forward-looking):** any future AI feature defaults to engine-derived summaries with no model access to client data; LLM use, if ever added, is opt-in and over non-confidential status fields only.

**Why this wins:** it converts the single biggest objection in legal tech ("I can't put deal material in your cloud") into a selling point. The data-minimization posture also eases professional-responsibility and data-protection (e.g., DPDP) review, shortening the firm's security/compliance approval — the real gate on adoption.

---

## 7. How it works

1. **Start a deal from a template.** The flagship template is "India Seed Financing — Private Placement," a ~30-task model across four phases (Pre-Execution, Conditions Precedent, Closing Actions, Post-Closing Actions).
2. **Set Closing Date "X."** Every deadline is computed relative to X (e.g., "Prior to X," "X+10," "X+30"), and statutory hard limits are tracked distinctly from internal/agreed targets.
3. **Work the checklist.** Update each item's status, owner, evidence (satisfied + external link), and document status. Notes are status-only.
4. **Let the engine think.** Closing Room continuously computes: the **next best action**, **dependency blocks**, **overdue/upcoming** items with urgency flags, **owner-wise pending** load, **phase progress**, and a **closing-readiness score + verdict** with a plain-English "why not ready" list.
5. **Report in one click.** Generate a branded **PDF Closing Status Report** for the partner/client, or a formatted **Excel workbook** for working sessions — both confidential-safe.

---

## 8. Feature set

### 8.1 Available today (working MVP)

- **Deep, accurate legal task model** for India private placement: CPs/CS framework, corporate approvals (board/EGM), private-placement forms (PAS-4/PAS-5), RoC filings (MGT-14, SH-7, PAS-3, DIR-12), FEMA filing (FC-GPR via FIRMS), share-certificate issuance — with parties, priorities, risk categories, dependencies, and source references per item.
- **"X"-relative deadline engine** with **internal vs. statutory** deadline distinction (e.g., internal X+10 target for PAS-3 alongside the 15-day statutory hard limit) and **amber/red urgency flags** with countdowns.
- **Rules / readiness engine:** closing-readiness score + verdict, "why not ready" list, dependency-block warnings, overdue/upcoming computation, owner-pending counts.
- **Next-best-action** recommendation: the single most important unblocked, highest-priority, soonest-due open item.
- **Confidentiality model fully implemented:** document *register* with external links (no uploads), status-only length-capped notes, and a persistent global disclaimer.
- **Real branded exports:** a partner-ready **PDF Closing Status Report** (cover + readiness verdict, executive summary/KPIs, readiness detail, upcoming deadlines with statutory flags, owner-wise pending, phase progress, post-closing tail, disclaimer page) and a formatted **Excel workbook** (Overview, one sheet per phase, a Deadlines sheet, an Owners sheet, with frozen headers, autofilter, and status-based conditional formatting). CSV / JSON / Markdown also available.
- **Eight working views:** Dashboard, Checklist, Readiness, Timeline, Dependencies, Document Register, Risk heatmap, Notes & Export. Light/dark themes.
- **Tasteful, fast UI** built on a modern stack (Next.js / React / TypeScript / Tailwind).

> *Today's app is single-deal and stores data in the browser; the cloud/multi-deal/account layer below is the next build.*

### 8.2 Near-term roadmap (v0–v1)

- **Accounts + cloud database** (managed Postgres) so deals persist across sessions and devices; replace browser storage.
- **Multi-deal home:** create, search, filter (status/type/closing month), sort, archive.
- **"My open items"** personal queue across all deals.
- **New-deal wizard** (pick template → set company/investor/X → instantiate).
- **Audit trail:** every status/owner/date change attributable and timestamped — defensibility.

### 8.3 Mid / long-term roadmap (v2–v3)

- **Reminders:** daily deadline scan → in-app nudges and a **weekly digest email** (overdue, due-this-week, readiness drops).
- **Portfolio view** for partners (all deals' readiness + top risk at a glance).
- **Firm collaboration:** organizations, roles (owner/admin/lawyer/viewer), invitations, status-only comments with @mentions, activity feed.
- **More templates:** India M&A, Series-A SHA, debt — proving the template-first design; then additional jurisdictions.
- **Admin & branding:** org settings, firm logo/colors on exports, data retention / export-my-data / delete controls.
- **Optional AI summaries** under strict confidentiality guardrails (engine-derived by default).

---

## 9. Legal content & credibility

- The flagship template encodes a genuine India private-placement closing, including refinements that matter in practice: PAS-3's **15-day** statutory limit (and the rule that funds cannot be utilised until PAS-3 is filed); the **Registered Valuer** requirement for Companies Act preferential allotment vs. the separate **FEMA pricing** basis; PAS-5 as a **maintained record, not an RoC filing**; the **30-day** MGT-14/SH-7 clock from the resolution; FC-GPR via **SMF on the RBI FIRMS portal** within 30 days (with EMF prerequisite and Late Submission Fee risk); and the **30-day** share-certificate issue window with state-specific stamping.
- Each task carries a **source reference** so a lawyer can re-verify quickly, and the model is built to support a **legal-content changelog** as rules evolve.
- **Honest framing:** this is transaction-practice knowledge applied to structure the checklist; it is **not legal advice** and is presented as "confirm with qualified counsel against current law." This framing is itself a trust feature for the legal buyer.

---

## 10. Differentiation & competitive landscape

| Alternative | Why it falls short | Closing Room's edge |
|---|---|---|
| **Word/Excel closing checklists** | Static, un-computed, version-chaos over email; no readiness logic, no deadline clocks | Live engine, computed statutory deadlines, one-click reports |
| **Generic PM tools** (Asana/Trello/Monday) | No legal model, no statutory clocks, and lawyers won't put deal context in them | Built for the legal task model; confidential-by-design |
| **Document/DMS & data rooms** (iManage, Ansarada) | Store the *documents*; don't run the *process* or tell you if you're ready to close | Complementary — we link to the DMS, we don't replace it; we own status/readiness |
| **Practice/matter-management suites** | Heavy, billing/time-centric, not closing-process-centric; slow to adopt | Focused, fast, opinionated closing control room |

**Defensible moats:** (1) confidential-by-design architecture that clears the firm's compliance gate; (2) the legal-content depth and the readiness engine; (3) template-first design that compounds across deal types and jurisdictions; (4) taste and speed.

---

## 11. Architecture & security (brief, for credibility)

- **App:** Next.js (App Router) / React / TypeScript / Tailwind. The rules engine is pure, testable, and reused on both client and server.
- **Target backend:** managed Postgres, multi-tenant and row-scoped by organization; server-side validation at every boundary; managed authentication with organizations/roles.
- **Exports** are generated on demand and **code-split / lazy-loaded**, so the core app stays fast; they draw only from status fields.
- **Security posture:** TLS in transit, encryption at rest (managed DB), least-privilege org scoping, append-only audit log, secrets server-side only. **Data-minimization by design** is the headline: the most sensitive material is simply never collected.

---

## 12. Roadmap (phased, each ships something usable)

- **v0 — Foundation:** accounts + cloud database; the current single-deal experience, logged-in and saved. *Exit:* a lawyer creates a deal, updates it, and the data survives across sessions/devices.
- **v1 — Multi-deal + reports:** deal list, personal queue, new-deal wizard, refined legal template, the exports (PDF/Excel) at production polish. *Exit:* a lawyer runs several deals and one-click exports partner-ready reports.
- **v2 — Defensibility, reminders, scale:** audit/activity feed, deadline reminders + weekly digest, partner portfolio view, performance hardening, tests. *Exit:* firms rely on it at volume; nothing slips because deadlines are pushed proactively.
- **v3 — Firm collaboration + more templates:** roles/sharing, comments/@mentions, additional deal-type templates, admin/branding, optional guarded AI. *Exit:* a firm runs it as shared infrastructure with controlled access and branding.

---

## 13. Business model & pricing (proposed)

- **Model:** per-seat SaaS, billed per firm/organization, annual or monthly.
- **Indicative tiers (to validate with design partners):**
  - **Solo / small team** — a few seats, single template, core engine + exports.
  - **Firm** — more seats, multi-deal, roles, audit trail, reminders, portfolio view, branded exports.
  - **Enterprise** — SSO, custom templates/jurisdictions, retention controls, priority support.
- **Expansion levers:** seats per firm, additional templates/jurisdictions, premium reporting/branding.
- **Why firms pay:** one missed statutory filing (penalty + partner exposure) costs more than a year of subscription; the time saved producing status reports and chasing items is recurring.

---

## 14. Go-to-market

1. **Design partners:** 3–5 boutique corporate firms / active in-house teams running India private placements; co-develop the v0/v1 with them.
2. **Wedge then widen:** win on India private-placement depth, then add M&A/Series-A/debt templates for the *same* buyers (expansion revenue before new logos).
3. **Distribution:** founder-led sales into corporate-law networks; content on closing mechanics and statutory-deadline hygiene; company-secretary and CA-firm channels.
4. **Land via the associate, expand to the firm:** individual associates adopt for personal deal control; convert to firm-wide via roles/portfolio.

---

## 15. Success metrics

- **Activation:** % of new users who create a deal, set X, and update ≥10 items in week one.
- **Core value:** deals with a set Closing Date X and an active readiness score; exports generated per active deal.
- **Retention:** weekly active deal teams; deals carried from creation to closed status in-app.
- **Outcome proxy:** statutory items marked filed on/before the statutory limit (the "we didn't miss a clock" metric).
- **Expansion:** seats per firm; templates used per firm.

---

## 16. Risks & mitigations

- **Adoption inertia ("we already have a checklist").** → Make the engine + one-click reports a clear 10× over Excel; seed with the firm's real template; win the associate first.
- **Legal-content accuracy/liability.** → "Verify with counsel," source references, content changelog, and never positioning as legal advice; design-partner review.
- **Confidentiality perception ("is my data safe?").** → Lead with data-minimization-by-design; the most sensitive material is never collected; clear security posture and retention controls.
- **Scope creep into a full matter-management suite.** → Stay the closing control room; integrate with (not replace) the DMS and practice tools.
- **Single-jurisdiction concentration.** → Template-first architecture makes new deal types/jurisdictions content, not rebuilds.

---

## 17. Disclaimers

Closing Room records deal **status** only — never confidential, privileged, or client-identifying material. Nothing in the product or this document is legal advice. Statutory references reflect transaction-practice knowledge and must be confirmed by qualified counsel against the current Companies Act 2013, FEMA/RBI rules, and applicable stamp laws. Market and pricing figures are illustrative estimates to be validated with design partners before external use.
