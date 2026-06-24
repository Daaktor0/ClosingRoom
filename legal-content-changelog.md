# Legal Content Changelog

This file records changes to statutory clocks, filing mechanics, dependency rules, and legal-content source references used by ClosingRoom templates.

> **Not legal advice.** Everything below records the legal content **as implemented in the template seed** (`lib/checklistSeed.ts`) and the **sources a reviewer should check**. It is transaction-practice knowledge pending verification. A qualified practicing lawyer and/or company secretary must verify all statutory clocks, filing mechanics, and dependencies against the *current* Companies Act 2013, the Companies (Prospectus and Allotment of Securities) Rules, the Companies (Share Capital and Debentures) Rules, FEMA / RBI rules, and the applicable state stamp law **before charging customers**.

---

## 1. Change history

| Date | Template | Change | Changed by | Reviewed by |
|---|---|---|---|---|
| 2026-05-28 | India Seed Financing - Private Placement v1 | Initial changelog added. Existing PAS-3, PAS-4, PAS-5, MGT-14, SH-7, DIR-12 and FC-GPR tracking data remains pending practicing lawyer and CS review. | Product team | Pending |
| 2026-06-24 | India Seed Financing - Private Placement v1 | Restructured into an itemized review packet. Documented the eight statutory updates (L1–L8) now baked into the seed, each mapped to its seed task and the source to verify, plus a structured reviewer sign-off block (Section 3). No legal content was changed in this edit — this records what is already implemented and prepares it for counsel/CS sign-off. | Product team | Pending |

---

## 2. Legal content register (for review)

Each row is a statutory point implemented in `lib/checklistSeed.ts`. **Reviewer action:** confirm or correct the "Implemented as" column against the cited source, then mark the row in Section 3.

| Ref | Topic | Implemented as (in seed) | Seed task(s) | Source to verify (confirm currency) | Status |
|---|---|---|---|---|---|
| L1 | **PAS-3 return of allotment** | Statutory hard limit **15 days from allotment**; internal target X+10; note that **funds cannot be utilised until PAS-3 is filed**. (`statutoryDays: 15`, `statutoryTrigger: "Allotment"`) | `post-pas-3` (D1) | Companies Act 2013 **Sec 42(8)** (15-day filing); **Sec 42(6)** (utilisation/refund) | ⬜ Pending |
| L2 | **Valuation basis** | Registered Valuer (IBBI) report for Companies Act preferential allotment **and** FEMA pricing certificate (CA / merchant banker / cost accountant), as applicable. | `prep-valuation` (B3) | **Sec 62(1)(c)** + Companies (Share Capital & Debentures) Rules (registered valuer); FEMA pricing guidelines; note: **Sec 56(2)(viib) "angel tax" abolished w.e.f. FY 2024-25** | ⬜ Pending |
| L3 | **Allotment window & banking** | Allotment within **60 days** of receipt of application money else refund within 15 days; monies via **banking channels only**, kept in a **separate bank account**; no fresh offer until prior completed/withdrawn. | `closing-*` rows (C1, C3) | **Sec 42(6)** (60-day allotment / refund); **Sec 42(5)** (no overlapping offers) | ⬜ Pending |
| L4 | **MGT-14 / SH-7 statutory clock** | **30 days from the relevant resolution**; flagged distinctly from the "Prior to X" deal-control target. (`statutoryDays: 30`, `statutoryTrigger: "Resolution"`) | `cp-sh7-mgt14` (B8), `post-mgt14` (D2) | **Sec 117** (MGT-14 / resolutions); **Sec 64** (SH-7 / alteration of share capital) | ⬜ Pending |
| L5 | **PAS-5** | Treated as a **record maintained, not filed** with RoC. | `cp-pas4-pas5` (B11) | Companies (PAS) Rules; 2018 amendment removed GNL-2 filing of PAS-4/PAS-5 | ⬜ Pending |
| L6 | **FC-GPR / FIRMS** | Filed via **SMF on the RBI FIRMS portal within 30 days of allotment**; **Entity Master Form (EMF)** prerequisite; **Late Submission Fee (LSF)** risk on delay. | `post-fc-gpr` (D3) | FEMA (Non-Debt Instruments) Rules; RBI FIRMS / SMF procedure; LSF framework | ⬜ Pending |
| L7 | **Share certificate stamping** | 30-day certificate issue window; **state-specific stamp duty**; SHA/SSA stamping per state stamp act. | `closing-share-certificates` (C5) | Sec 56 (issue window); applicable **state Stamp Act** | ⬜ Pending |
| L8 | **Valuation report freshness** | Soft validity flag so stale valuations are caught (practice: recent report; many treat ~90 days). | `prep-valuation` (B3) | Practice note — confirm acceptable validity window with counsel | ⬜ Pending |
| L9 | **DIR-12 mechanics** | Split into its own post-closing task; `statutoryDays: 30`, flagged "confirm DIR-12 mechanics with counsel". | `post-dir12` | Sec 170 / DIR-12 trigger and timeline | ⬜ Pending |

---

## 3. Reviewer sign-off (to be completed by a qualified human)

This block is intentionally **blank pending a real reviewer**. Recording a name here is an assertion that the named person, with the stated qualification, has reviewed the content above. Do not pre-fill it.

- **Reviewer name:** _______________________
- **Qualification (e.g. Advocate / Company Secretary) & registration no.:** _______________________
- **Date of review:** _______________________
- **Scope reviewed:** L1–L9 above, against the cited sources as of the review date.
- **Outcome:** ☐ Approved as implemented  ☐ Approved with corrections (record corrections as a new row in Section 1)  ☐ Not approved
- **Sign-off statement:** _"I have reviewed the statutory clocks, filing mechanics, and dependency rules listed in Section 2 against the current applicable law and confirm the above outcome. This review is for the template content only and is not advice on any specific transaction."_

**Until this block is completed, the template remains marked "pending review" and must not be relied upon for a live deal or used as a basis for charging customers.**
