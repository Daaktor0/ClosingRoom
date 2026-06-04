# Slice 0 Design System Spec

Status: implemented foundation, to be consumed by later revamp slices.

## Visual Vocabulary

- Display voice: `--font-display`, wired through `next/font` Source Serif 4 with Georgia fallback.
- Body/UI voice: `--font-body`, wired through `next/font` Inter with system fallback.
- Numeric voice: `--font-measure`, wired through `next/font` IBM Plex Mono with monospace fallback.
- Paper/ink foundation: `--paper`, `--ink`, `--background`, `--foreground`.
- Primary accent: `--teal` / `--accent`, used for internal targets and ordinary product emphasis.
- Statutory accent: `--oxblood` / `--statutory-hard-stop`, reserved for legal hard-stops and consequence-bearing deadlines.

Tailwind v4 tokens live in `app/globals.css` through `@theme`; do not add a `tailwind.config.js` for this revamp.
Use the semantic classes `font-display` and `font-measure` in new revamp code. Treat Tailwind font utility names as compatibility aliases, not the design-system vocabulary.

## Primitive APIs

- `Masthead`: room title, optional eyebrow, synthesized subline, and right-side action.
- `BriefHeadline`: large serif judgment sentence for Brief, Present, and memo-style surfaces.
- `StatusPill`: click-to-advance status primitive. Natural path is `Not Started -> In Progress -> Under Review -> Completed`; side states stay behind a later "more states" menu. Slice 3 must define whether side states such as `With Client` and `With Investor Counsel` re-enter the natural path or remain explicit menu-only states.
- `DeadlinePair`: renders internal target and statutory deadline in distinct visual languages. If a statutory item has no resolvable calendar date, it renders the relational deadline instead of dropping the item.
- `StatutoryStop`: oxblood hard-stop marker for timeline and deadline surfaces.
- `TaskRef`: task identity primitive. Default mode derives a compact human-readable label from the structured task action, keeps serial/form as quiet anchors, and reveals the full action on hover. Use `full` on no-hover surfaces such as Workbook, Partner Mode, and print/PDF surfaces where the complete action must be readable by default. It must never read notes, comments, note text, or other user-entered narrative fields.

## Structural Guards

- Brief, Closing Pack, and Present must all read a single `getReadiness(deal)` result for a render pass. Do not recompute readiness independently per surface.
- Synthesis must use an allowlisted typed projection of structured fields only. The helper must be unable to access `task.notes`, comments, note text, or future narrative fields.
- No Closing Date X is an onboarding state. Brief fallback copy should drive the single action: set Closing Date X.
- Status-pill persistence must revert failed writes and surface the failure to the user before Run Sheet ships.
- PDF typography is separate from `next/font`; the memo slice must register matching fonts through `@react-pdf/renderer`.
