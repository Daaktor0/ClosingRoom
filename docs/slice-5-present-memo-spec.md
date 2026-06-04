# Slice 5 — Present + Memo — implementation contract

**Status:** Ready to build · **Depends on:** Slices 0–4 (design system, Brief, Closing Table + lenses, `⌘K`, hardened store) ✓ · **Reference:** plan §10 (Partner Mode + Exports — "the high‑calibre moment"), §4 (confidentiality spine), §5 (Editorial Chambers type system).
**Verification model:** owner is the visual oracle. Partner Mode is verifiable in‑browser (`get_page_text` + a render pass on `/demo`). The **PDF is the hard case** — see §11. The static gates only prove it compiles, not that `pdf().toBlob()` succeeds, and **`get_page_text` cannot read a binary PDF**, so a download‑click is *not* a verifiable path. The mechanism is decided up front (§11), not improvised at the finish line.

This is the **final slice** of the revamp.

---

## 1. Goal

Make the two surfaces that represent the firm look like the firm. **Partner Mode** is the client‑facing / screen‑share moment — restyle it into a calm, projector‑ready *Closing Brief* in the Editorial Chambers type system, zero data‑entry chrome. The **PDF** is the artifact that physically *leaves the building* — reskin it from the current Helvetica status report into a genuinely well‑set **"Closing Status Memo"** in the same serif/sans/mono language. Plus: land the two Slice‑4 carry‑over nits.

No new intelligence. Both surfaces re‑present signals the tool already holds (`getReadiness`, blockers, statutory clock, computed dates, phase progress). This is presentation, not capability.

---

## 2. Scope

**In:** Partner Mode visual restyle (type system, oxblood for statutory, mono numerics, quieter chrome); PDF "Closing Status Memo" reskin (font registration + layout in the Editorial language); the **per‑export "include status notes" toggle** with internal/external marking (owner decision, §3); the two Slice‑4 carry‑over nits.

**Out:** data‑model / Supabase‑schema changes; Excel export (stays utilitarian by design — plan §10); any new free‑text field; new computed metrics; the timeline what‑if preview (separate).

---

## 3. Decided (owner) — the notes toggle

The Closing Status Memo defaults to **excluding** task status notes (synthesized + structured metadata only — the safe external posture). A **per‑export checkbox** lets the partner include the capped status notes for **internal‑only** copies.

**This is a confidentiality‑critical control, not a cosmetic option.** It carries three hard requirements (see §6):
1. **Default off.** Every export starts external/notes‑excluded; including notes is a deliberate per‑export choice, never sticky/remembered.
2. **The document must declare which mode it is.** An external (no‑notes) copy and an internal (with‑notes) copy must be visually and textually distinguishable — see §6 for the disclaimer swap + watermark + filename.
3. **Lives in the internal context only.** The toggle belongs in the **Notes & Export panel** (`ExportPanel`), the internal working surface. **Partner Mode's export button stays external‑only** (notes excluded, no toggle) — it is the client‑facing moment; an "include privileged notes" checkbox does not belong on the screen you share with the client.

---

## 4. Partner Mode restyle — `components/partner/PartnerMode.tsx`

Re‑present the existing structure (readiness ring, next best action, statutory countdowns, top risks, phase progress) in the Editorial Chambers language. **It is mostly a visual pass — keep the data derivation and layout skeleton; change the type, color, and chrome.**

- **Type:** serif display for the deal name + section headings (the `Masthead`/`BriefHeadline` language); mono (`font-measure`/`tabular-nums`) for the readiness score, countdowns, day counts, percentages.
- **Statutory = oxblood.** Statutory hard‑stops in the countdown tiles carry the reserved oxblood / lock motif (§5, §9 of the plan); internal targets stay teal/soft. Don't use oxblood decoratively.
- **Quieter chrome:** fewer hairline borders, more air, restrained motion (the ring already animates; countdowns may count up). Projector‑legible at distance — generous sizes, high contrast, no dense badges.
- **Zero data‑entry chrome** (already true — keep it). No status pills, no inputs, no editing affordances. It is a *briefing*, read‑only.
- **The "Export PDF" button stays**, but generates the **external** memo (notes excluded) — see §3.3.
- Works in light **and** dark (owner checks both).

---

## 5. The Closing Status Memo (PDF) — `lib/pdfReport.tsx`

Reskin `ClosingStatusReport` from the current Helvetica status report into the Editorial type system. Keep the content spine (verdict box, executive summary, KPIs, readiness detail, upcoming deadlines, owner‑wise pending, phase progress, post‑closing tail, full task register, the dedicated disclaimer page) — **restyle, don't gut.**

**Main implementation risk — fonts.** `@react-pdf/renderer` does **not** see `next/font`; it only knows the built‑in Helvetica/Times/Courier unless you **`Font.register({ family, src })`** with real TTF/OTF files. To get the serif/sans/mono triad in the PDF:
- Register a serif (Source Serif 4 / Newsreader), a sans (Inter), and a mono (IBM Plex Mono) from **bundled local font assets** (add the `.ttf` files to the repo, e.g. `public/fonts/` or an imported asset path) — not a runtime CDN fetch (offline/SSR fragility, and a network dependency on the firm's artifact generator is a smell).
- Register **before** `pdf()` is called (module load is fine). Include the weights actually used (regular + bold at minimum).
- If a face fails to register, the doc must still generate (graceful fallback to Helvetica) — never throw on font load. **The memo generating is more important than the memo being perfectly typeset.**
- Map the existing `styles` `fontFamily` values onto the registered families: serif for `h1`/`sectionTitle`/`verdictLabel`, mono for `verdictScore`/`kpiValue`/numeric cells, sans for body.

**Visual upgrade (within the type pass):** promote the verdict box and KPIs as the editorial "cover"; statutory entries in the deadlines/register tables get the oxblood treatment; tighten the table rules (lean on weight/space over borders, per §5). Keep A4, keep the footer disclaimer `fixed`, keep the dedicated notice page.

**The notes section (internal mode only):** when `includeNotes` is on, render the capped status notes as a **short per‑task line** (e.g. a dedicated "Status notes" section listing `serial — note`), **not as a column in the full task register** — a 280‑char note will not fit an 8.5pt multi‑column A4 row and wraps into garbage. Render a line **only for tasks that actually have a note** (skip empties, or you get a page of blank note lines). Notes are already capped at `STATUS_NOTE_MAX_LENGTH` and status‑only; render verbatim. When off, the section is **absent entirely** (not blanked).

**Signature change:**
- `ClosingStatusReport({ deal, includeNotes }: { deal: Deal; includeNotes?: boolean })` — default `false`.
- `downloadPdfReport(deal: Deal, options?: { includeNotes?: boolean })` — default `false`. Update both call sites: `ExportPanel` (passes the checkbox value) and `PartnerMode` (always omits → external).

---

## 6. Confidentiality (the spine — most acute here, this is what leaves the building)

The memo's current disclaimer page asserts the document *"is generated from process and status metadata only."* **That sentence becomes false the instant `includeNotes` is true.** A static disclaimer that lies about its own contents is the exact failure mode the confidentiality rule exists to prevent. So the notes toggle and the document's self‑description are **one coupled change**, not two:

- **External copy (`includeNotes=false`, the default):** keep the "metadata only" disclaimer as is. No notes anywhere. No internal marking.
- **Internal copy (`includeNotes=true`):**
  - **Swap the disclaimer text** — it must no longer claim "metadata only." Replace with language stating it contains internal status notes and is **not for external distribution / not for the client or counterparties.**
  - **Mark the document visibly as internal** — a header/footer band or watermark reading e.g. *"INTERNAL — contains status notes — not for external distribution"*, on every page (`fixed`), so a printed/forwarded copy can't shed its context.
  - **Differentiate the filename** — e.g. `…-internal.pdf` vs the external `…-status-memo.pdf`, so the two don't silently overwrite or get confused on disk.
- The toggle is **never sticky** (§3.1): re‑defaults to external every time the panel mounts / after each export.
- Notes remain the only included free‑ish text and only in internal mode; everything else stays synthesized/structured. No new free‑text field. `⌘K` / Partner Mode never surface notes. Status‑only spine otherwise intact.

> Design rule (plan §4) holds: synthesis flows *out* of metadata. The one sanctioned exception — capped status notes — is gated behind an explicit internal‑only, clearly‑marked, non‑default toggle.

---

## 7. Slice‑4 carry‑over nits (close here)

1. **Dependencies "N shown" badge** over‑counts: the filter bar counts `filteredTasks`, but the Dependencies lens only renders dependency‑*linked* tasks. Either scope the badge to linked tasks when the Dependencies lens is active, or relabel it so it doesn't claim to count visible rows. (`ClosingTable.tsx` / `DependencyLens.tsx`.)
2. **Dead branch in `RunSheet`:** remove the now‑unreachable `tasks.length ? … : "No tasks match this phase"` else‑branch — `grouped` already filters empty phases (`.filter(({ tasks }) => tasks.length > 0)`), so the else can never render. (`RunSheet.tsx`.)

---

## 8. Files

| File | Change |
|---|---|
| `components/partner/PartnerMode.tsx` | Editorial restyle (type/color/chrome); export button generates the **external** memo only. |
| `lib/pdfReport.tsx` | `Font.register` the serif/sans/mono triad (graceful fallback); restyle layout; `includeNotes` prop → internal notes + **disclaimer swap + internal watermark + filename**; signature change on `ClosingStatusReport` + `downloadPdfReport`. |
| `public/fonts/*` (or imported asset path) | **New** — bundled TTF/OTF faces for the PDF (serif, sans, mono). |
| `components/ExportPanel.tsx` | Add the **"Include status notes (internal only)"** checkbox (default off, non‑sticky); pass to `downloadPdfReport`; a one‑line caption explaining internal‑only. |
| `components/checklist/ClosingTable.tsx` / `DependencyLens.tsx` | Carry‑over nit 1 (count badge). |
| `components/checklist/RunSheet.tsx` | Carry‑over nit 2 (dead branch). |
| `docs/ui-ux-revamp-plan.md` | Tick Slice 5 / mark the revamp build sequence complete. |

**Reuse (do not rebuild):** `getReadiness`/`getUpcomingDeadlines`/`getPhaseTasks`/`getOwnerPendingCounts` and the rest of the rules engine, the existing PDF content structure, `ReadinessRing`/`CountdownTile`, the design tokens. Excel export untouched. Data model untouched.

---

## 9. Acceptance criteria

- [ ] **Partner Mode:** restyled in the Editorial type system (serif headings, mono numerics, oxblood statutory), read‑only, projector‑legible, light **and** dark; export button produces the **external** memo (no notes, no toggle on this surface).
- [ ] **Memo (external, default):** generates without throwing; set in the registered fonts (or graceful Helvetica fallback); content spine intact; "metadata only" disclaimer present; **no notes anywhere**.
- [ ] **Memo (internal, toggle on):** includes capped status notes; the metadata‑only disclaimer is **replaced**; an **internal / not‑for‑external‑distribution mark appears on every page**; filename is distinct from the external copy.
- [ ] **Toggle:** lives only in `ExportPanel`; **default off**; not sticky across exports/mounts; absent from Partner Mode.
- [ ] **Both PDF modes actually render** — verified via the §11 preview route (not by a green build, and not by a download‑click that can't be read back).
- [ ] **Carry‑overs:** Dependencies count badge no longer over‑counts; dead `RunSheet` branch removed.
- [ ] One store / `getReadiness` source; data model untouched; notes capped/status‑only; Excel unchanged.
- [ ] `typecheck` / `lint` / `build` green; Partner Mode spot‑checked via `get_page_text` + render pass; owner visual pass on Partner Mode (light/dark) **and** on both generated PDFs.

---

## 10. Build order

1. **Carry‑over nits** — small, independent, land first to clear the Slice‑4 tail.
2. **Partner Mode restyle** — visual only; verify in‑browser on `/demo`, light + dark.
3. **PDF font registration** — register the triad with graceful fallback; confirm the *existing* report still generates in the new fonts before changing layout. (De‑risk the font step on its own.)
4. **PDF layout restyle** — editorial cover, oxblood statutory, tightened tables.
5. **Notes toggle + the coupled confidentiality change** — `includeNotes` prop, internal notes rendering, disclaimer swap, per‑page internal mark, filename; the `ExportPanel` checkbox (default off, non‑sticky); Partner Mode stays external.
6. **Verify** — via the §11 preview route, render **both** modes and inspect (external: no notes + metadata‑only disclaimer; internal: notes + swapped disclaimer + per‑page internal mark + distinct filename); `typecheck`/`lint`/`build`; hand to owner.

---

---

## 11. PDF verification path (decide this BEFORE building, not at the finish line)

The PDF is a binary and `downloadPdfReport` is a browser‑only download (`pdf().toBlob()` → `createObjectURL` → anchor click). None of our existing checks can read it: the static gates only compile it, `get_page_text` reads HTML not PDF bytes, a download‑click produces a file we can't easily read back, and the node‑script path is the one that hit the sandbox spawn failure last round. **The parts most likely to be wrong — `Font.register` succeeding, the conditional disclaimer swap, the per‑page internal watermark — are exactly what a compile cannot exercise.** So the mechanism is part of the contract:

**Build a temporary dev preview route** — `app/pdf-preview/page.tsx` (dev‑only; delete or guard before merge) — that renders `<ClosingStatusReport deal={seedDeal} includeNotes={…} />` inside `@react-pdf/renderer`'s **`<PDFViewer>`** (which paints the PDF inline in the browser, not a download), with a control to flip `includeNotes`. This renders the *actual* PDF pipeline (fonts + conditional content) on screen, where it can be **screenshotted** and eyeballed for both modes.

- Verify on this route: external mode (fonts applied / graceful fallback, no notes, "metadata only" disclaimer) and internal mode (notes present as per‑task lines, disclaimer swapped, internal mark on every page).
- If `<PDFViewer>` itself proves unavailable in this setup, the fallback is a **committed pair of sample outputs** the junior generates locally for the owner to open — but state which path was used; do not declare the PDF verified off a green build alone.
- This route is **scaffolding, not a feature** — it must not ship in the nav or production build.

This is the §9 acceptance step for "both PDF modes actually render." Establish it in step 3 (alongside font registration), so the disclaimer/watermark work in step 5 is verifiable as it lands.

---

*Non‑goals: no data‑model/Supabase‑schema changes; no Excel restyle; no new free‑text field; no new metrics. The notes toggle is the single sanctioned path for free‑ish text into an exported artifact, and only as a non‑default, internal‑only, clearly‑marked option. Re‑present, don't rebuild — keep the rules engine, the PDF content spine, and the hardened store contract intact. This closes the revamp.*
