# Closing Room

> The closing control room for transaction lawyers — it tells your deal team **what's next, what's blocked, and whether the deal is ready to close**, without ever holding a single line of confidential client material.

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/status-MVP-1f6feb)
![Confidential by design](https://img.shields.io/badge/confidential-by%20design-15803d)

---

## About

Closing a fundraise or M&A transaction is a multi-party, deadline-dense process usually run on an emailed Word/Excel checklist plus memory and follow-up. Items slip, statutory filing clocks are missed, and no one can answer *"are we actually ready to close?"* in one click.

**Closing Room** encodes the real legal task model of a deal — conditions precedent, corporate approvals, statutory filings, the post-closing tail — computes every deadline relative to the closing date, and runs a rules engine that surfaces the **next best action**, what's **blocked**, what's **overdue**, and a live **closing-readiness verdict**. One click produces a partner-ready PDF report or a formatted Excel workbook.

Flagship use case: **Indian private-placement / fundraise closings** (Companies Act 2013 + FEMA). The data model is template-first, so other deal types and jurisdictions slot in as content rather than rewrites.

## Confidential by design

This is the spine of the product, not a setting. Closing Room tracks **status, process, dates, ownership, and external links only** — never privileged client substance, deal documents, or financials.

- **No file uploads.** The document area is a *register* — name, category, status, and an external link to your own DMS (iManage / NetDocuments / SharePoint / Drive). The app stores the URL and metadata, not the file.
- **Notes are status-only and length-capped**, with a persistent reminder not to paste confidential or privileged content.
- **A persistent disclaimer** is visible on every screen.
- **Exports draw only from status fields**, so they cannot leak document substance — it was never stored.

The result: the most sensitive material is simply never collected, which is what lets a firm actually adopt the tool.

## What it does today

- **Deep India private-placement template** (~30 tasks across four phases) with parties, priorities, risk categories, dependencies, and per-item source references.
- **"X"-relative deadline engine** with an **internal vs. statutory** distinction (e.g. an internal PAS-3 target alongside the 15-day statutory hard limit) and **amber/red urgency flags** with countdowns.
- **Readiness & rules engine:** closing-readiness score and verdict, a plain-English "why not ready" list, dependency-block warnings, overdue/upcoming computation, and owner-wise pending counts.
- **Next-best-action** recommendation — the single most important unblocked, highest-priority, soonest-due open item.
- **Branded exports:** a partner-ready **PDF Closing Status Report** and a formatted **Excel workbook** (per-phase sheets, a deadlines sheet, conditional formatting), plus CSV / JSON / Markdown.
- **Eight views:** Dashboard, Checklist, Readiness, Timeline, Dependencies, Document Register, Risk heatmap, and Notes & Export — with light/dark themes.

> The current build is single-deal and stores data in the browser. Accounts, a cloud database, multi-deal management, firm roles, an audit trail, and reminders are on the roadmap (see [PLAN.md](./PLAN.md)).

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · lucide-react · `@react-pdf/renderer` (PDF) · ExcelJS (Excel). Export libraries are code-split and lazy-loaded, so the core app stays fast.

## Getting started

**Prerequisites:** Node.js 18+ and npm.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:3000
```

Open the app, set a **Closing Date X** on the Dashboard, then work the checklist — deadlines, readiness, and the next best action update live.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler (no emit) |

## Project structure

```
app/         Next.js App Router entry, layout, and the single-page shell
components/  Views (dashboard, checklist, timeline, dependencies, documents, risk) and shared UI
lib/         Domain model, rules/readiness engine, date math, seed template, and PDF/Excel exporters
PLAN.md      Full build plan and phased roadmap (v0 to v3)
```

## Legal & confidentiality

Closing Room records deal **status** only — never confidential, privileged, or client-identifying material. Nothing in this project is legal advice. Statutory references reflect transaction-practice knowledge and must be confirmed by qualified counsel against the current Companies Act 2013, FEMA/RBI rules, and applicable stamp laws.

## License

Proprietary. All rights reserved.
