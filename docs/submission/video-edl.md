# WORDLESS Relay — final video EDL

Status: **RECONCILED TO THE RECUT CANDIDATE — AUDIO OWNER-SIGNED-OFF.**
This is the approved 59-second timeline from
`docs/superpowers/specs/2026-08-29-wordless-submission-review-amendment.md`
§3. The candidate was **re-cut from the frozen raw capture** (no recapture) to
fix caption legibility, obscuring, contrast, and the sub-contrast card header;
the observed columns record what the recut actually shows, including honest
deviations. The claim ledger is never weakened to fit the cut. The
caption-legibility blocker is cleared by the recut, and the spoken-narration
audio — which no reviewer tool can perceive — was **cleared by the owner
listen-through on 2026-08-30** (owner confirmed the eight lines, the Chris voice,
delivery, timing, and no clipping/defects on `254945f2…`). The remaining
non-complete item is Task 15 (PARTIAL), so the outcome is **CANDIDATE ASSEMBLED
WITH KNOWN RESILIENCE GAPS**.

Candidate: `captures/task16/wordless-relay-final-59s-v2.mp4` (ignored; hosted
link owner-gated), SHA-256
`254945f2977a69221c30b13e0f6cde7cd9af95d8097b6bc61529688c496050c1`, reproducible
via `captures/task16/recut.mjs`; supersedes `18f7ce9a…`. Source revision:
product-freeze commit `31123d34006bb740f397a1bfc467925483e66955` (runtime/UI
unchanged by the recut). Narration and caption copy: `docs/submission/narration.md`
and `docs/submission/wordless-relay-en.srt`. The SRT transcribes the **intended
spoken narration** (it matches `narration.md`); it is a distinct artifact from
the shorter burned lower-third captions listed here. No reviewer tool can
perceive audio, but the **owner listen-through (2026-08-30) confirmed the spoken
lines** (the eight intended lines, Chris voice, delivery, timing, no clipping/
defects); see the Observed record.

## Global presentation rules

- The Lens/browser split screen is continuously visible from 00.0 through
  51.0. During the CLAD and validation beats both product panes remain
  visible (insets are acceptable); the 51.0–59.0 original end card is the
  **only** full-frame exception.
- The `LENS STUDIO PREVIEW — SIMULATED` lower-third is readable on every
  segment containing Preview footage, from frame zero onward. Planned
  disclosure range: 00.0–51.0 continuous (all Preview-bearing segments).
- Roles are labelled plainly as `PAINTER` and `GUESSER`.
- Sunlit Room environment for the Lens pane; enlarged pointer or unobtrusive
  hand cue for browser causality; nothing obscures an answer or a result.
- Burned captions: minimum 42 px at 1080p, five-percent title-safe margins,
  at least 4.5:1 contrast against the plum scrim.

## Segment table

| # | Time | Story obligation | Planned caption / card text | Disclosure | Observed start–end | Observed notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 00.0–04.0 | Immediate split-screen roles, shared live line, four choices | `ONE DRAWS IN SPACE · ONE GUESSES IN A BROWSER` (runtime `PAINTER` / `GUESSER` labels visible) | `LENS STUDIO PREVIEW — SIMULATED` from frame zero | ~00.0–04.0 | Split screen, `PAINTER`/`GUESSER` roles, four cards, shared live stroke, disclosure pill all present from frame 0. Shipped burned caption is a full sentence: `One person draws a clue in space — a friend sees the same stroke in a browser.` (deviates from the planned short caps — see reconciliation). |
| 2 | 04.0–09.0 | Browser chooses wrong; authoritative bilateral coral stroke response (uncut browser action; runtime copy stays `TRY AGAIN`) | `WRONG · BOTH STROKES GO CORAL` | `LENS STUDIO PREVIEW — SIMULATED` | ~04.5–09.0 | Wrong guess at ~6.0 s; both strokes go coral together; caption exactly `WRONG · BOTH STROKES GO CORAL` (never "both screens"); runtime cards read `× WORD · TRY AGAIN`. Matches plan. |
| 3 | 09.0–14.0 | Browser chooses correctly; mint response and word reveal (uncut browser action; correct feedback and revealed word visible by 14.0) | `CORRECT · THE WORD IS REVEALED` | `LENS STUDIO PREVIEW — SIMULATED` | ~09.0–14.0 | `✓ STAR · CORRECT` (mint/green) and caption `CORRECT · the word is revealed` by ~9.0 s — well before the 14.0 s gate. Shipped caption matches plan (sentence case). |
| 4 | 14.0–20.0 | Exact sampled path locks as matching glyph medallions, holding before 20.0 | `THE EXACT PATH BECOMES THE GLYPH · NO RECOGNITION, NO REDRAW` | `LENS STUDIO PREVIEW — SIMULATED` | ~14.0–20.0 | Matching glyph medallions on both surfaces (present from ~9 s, holding through 20.0 s). Shipped burned caption is `The exact shared path becomes their glyph.`; the planned `NO RECOGNITION, NO REDRAW` tag ships later on the ~42 s honesty card, not here — see reconciliation. |
| 5 | 20.0–26.0 | Replay/reset and a concise palette beat (violet / lemon / mint selectable; clean successor round) | `PLAY AGAIN · THE PAINTER PICKS A NEW STROKE COLOR` | `LENS STUDIO PREVIEW — SIMULATED` | ~19.0–26.0 | Reset + fresh round; shipped caption `Play again — a fresh round begins.` (planned "new stroke color" line dropped — the captured replay reused violet; see reconciliation). Caption becomes visible ~19.0 s (~1 s before the planned 20.0 start). |
| 6 | 26.0–42.0 | CLAD process and implementation proof; both product panes stay visible as insets under original proof overlays | `BUILT WITH CLAD: PROMPT → CHANGE → PREVIEW (SIMULATED) → BROWSER → TEST → FIX`; card: `453 AUTOMATED TESTS AT THE PRODUCT FREEZE` | `LENS STUDIO PREVIEW — SIMULATED` on every Preview-bearing frame | ~26.0–42.0 | `HOW IT WAS BUILT — CLAD` (~27–30 s); `THE LENS IS THE ONLY REFEREE · 11 of 11 malformed rejected` (~33 s); `VERIFIED, END TO END · 453 tests (304 core, 109 browser, 40 E2E) · RTT 86 ms median · 0 Axe` (~36–39 s). Note: the referee / 11-of-11 / 453 / RTT / Axe cards planned for beat 7 actually ship inside THIS window — see reconciliation. Preview dimmed to spotlight overlays. |
| 7 | 42.0–51.0 | Validation, measured limits, and honest constraints; both product panes stay visible | Cards: `RTT MEDIAN 86 MS · 50/50 PINGS · ONE MACHINE, ONE NETWORK (OBSERVED)`; ~~`10 HZ SUSTAINED IN THE ACCEPTED GATE 0 WINDOWS`~~ (dropped from the shipped cut); `11/11 MALFORMED MESSAGES REJECTED — GAME UNCHANGED`; `0 AXE VIOLATIONS (AUTOMATED SCAN, CHROMIUM)`; `PREVIEW PROTOTYPE · PUBLIC CHANNEL · NOT PRODUCTION` | `LENS STUDIO PREVIEW — SIMULATED` on every Preview-bearing frame | ~42.0–49.5 | Shipped copy here is the honesty/limits card: `MEASURED AND HONEST · the exact sampled path becomes the glyph — no recognition, no AI, no redraw · one painter, one browser · game concealment, not security`. The RTT / malformed / 453 / Axe cards planned for this window shipped in beat 6 instead; the `10 HZ` card was dropped entirely (see reconciliation). |
| 8 | 51.0–59.0 | Original end card and one-sentence promise; sole full-frame exception; complete audio, no clipped copy | `WORDLESS RELAY · DRAW IN SPACE · GUESS IN A BROWSER · KEEP THE MARK YOU MADE TOGETHER`; end card carries the `LENS STUDIO PREVIEW PROTOTYPE — SIMULATED` line | Disclosure printed on the end card itself | ~49.5–59.0 | Full-frame end card (sole full-frame exception): `WORDLESS RELAY / Draw in space. Guess from a browser. Keep the mark you made together. / Lens Studio Preview prototype — simulated`, holding to the tail; no clipped copy. Matches plan. |

All card copy above is bound by `docs/evidence/claim-ledger.md`; every number
must match its ledger row and scope exactly at review time.

## Numeric acceptance gates (measured from the exported file)

| Gate | Requirement | Observed |
| --- | --- | --- |
| Correct + word | Correct feedback and the revealed word visible by 14.0 s | PASS — `STAR · CORRECT` and `CORRECT · the word is revealed` visible by ~10.3 s (recut; caption onset == visual onset, 0.0 s delta) |
| Glyphs holding | Matching glyph medallions visible and holding before 20.0 s | PASS — matching glyph medallions on both surfaces from ~10.3 s, holding through 20.0 s |
| Split screen | Lens/browser split continuously visible 00.0–51.0; end card 51.0–59.0 is the only full-frame exception | PASS — split screen 00.0–51.0; end card 51.0–59.0 only |
| Disclosure | `LENS STUDIO PREVIEW — SIMULATED` readable on every Preview-bearing segment, from frame zero onward | PASS — lower-left disclosure pill on every Preview segment 00.0–51.0; end card carries `Lens Studio Preview prototype — simulated` |
| Wrong-beat caption | Exactly `WRONG · BOTH STROKES GO CORAL`; never "both screens"; runtime copy stays `TRY AGAIN` | PASS — caption `WRONG · BOTH STROKES GO CORAL`; runtime cards read `× WORD · TRY AGAIN` |

## Observed record (recut candidate)

Recut candidate: `captures/task16/wordless-relay-final-59s-v2.mp4` (ignored),
reproducible via `captures/task16/recut.mjs`. It supersedes `18f7ce9a…`, rebuilt
from the frozen raw `split-screen-master.mov` (no recapture; runtime/UI
unchanged) with a re-composited layout (840-wide panes, y=60) that reserves a
bottom overlay band so no caption/card covers a pane, stroke, or glyph.

- SHA-256: `254945f2977a69221c30b13e0f6cde7cd9af95d8097b6bc61529688c496050c1`
- Duration 59.000 s; 3540 decoded frames (60/1 fps); H.264 High 1920×1080 yuv420p
  square-pixel; AAC 48 kHz mono; faststart (moov before mdat); integrated
  **−16.12 LUFS**; true peak **−1.75 dBTP**; no black interval ≥ 0.25 s; no
  trailing silence ≥ 0.50 s. `tools/media/verify-wordless-video.mjs` → all pass.
- Disclosure `Lens Studio Preview — simulated` present top-left on every Preview
  segment (00.0–51.0); absent only on the end card (its own prototype line).
- **Caption geometry — PASS (recut).** Measured: caption/card main cap height
  **46–48 px** (≥42); all overlays sit in a plum band below the panes —
  pane-bottom-to-overlay gaps of **~48 px** (cards) and **~87 px** (captions),
  so nothing overlaps a pane, stroke, or glyph; contrast ivory 16.9:1 / coral 7.1:1 / mint 11.9:1 /
  **lemon eyebrows 12.8–12.9:1** (the failing violet header replaced with lemon);
  title-safe margins met on every caption and card. Legible at 1440×810 and
  390 px. (The left in-world Lens HUD stays small/low-contrast — inherent to the
  frozen raw capture, not fixable without a recapture.)
- Hero extracted from the recut at 17.0 s (glyph payoff split-screen):
  `docs/media/wordless-relay-hero.png` (SHA-256 `72664be3…`).
- Complete-cut panel on the recut (summary/verbatim under the ignored
  `local-handoff/reviews/task16/recut-review-verbatim.md`):
  - **Stage A — 3/3 PASS (comprehension).** Three fresh reviewers each
    self-decoded the actual muted recut and, blind, identified the painter/guesser
    roles, the live shared stroke, bilateral coral on a wrong guess (caption read
    as `WRONG · BOTH STROKES GO CORAL`), the mint correct + word reveal, and the
    exact-mark glyph medallion; all three confirmed the captions no longer obscure
    the panels/stroke/glyph.
  - **Stage B — verified parts PASS; spoken audio owner-signed-off.**
    Video↔EDL, narration-script-as-document, claim discipline, and cross-document
    consistency hold. No reviewer tool can perceive the spoken audio, so the
    reviewers recorded it as tool-unperceivable rather than substituting the
    transcript; the **owner listen-through (2026-08-30) then confirmed** the eight
    spoken lines, the Chris voice, delivery, timing, and no clipping/defects,
    clearing the audio blocker.

### Shipped-caption reconciliation

The planned caption/card column records the approved plan; the shipped cut
deviated in the ways below (recorded for honesty; the claim ledger was never
weakened to fit the cut). All deviations are wording/placement — no story
obligation is missing, no beat is reordered, and every numeric claim on screen
still matches its ledger row and scope.

- **Segments 1–4 caption wording.** The shipped burned lower-thirds are full
  sentences rather than the planned short all-caps lines: seg 1 `One person
  draws a clue in space — a friend sees the same stroke in a browser.`; seg 3
  `CORRECT · the word is revealed`; seg 4 `The exact shared path becomes their
  glyph.` The seg 2 wrong-beat caption shipped exactly as planned
  (`WRONG · BOTH STROKES GO CORAL`). The planned seg-4 `NO RECOGNITION, NO
  REDRAW` tag was moved to the ~42 s honesty card (which reads "no recognition,
  no AI, no redraw"), so the claim still ships — later in the timeline.
- **Segment 5 (20.0–26.0).** Shipped caption `Play again — a fresh round
  begins.` The planned "new stroke color" line was dropped because the captured
  replay round used the same violet colour; the palette feature is described in
  the docs, not claimed on-screen. The caption becomes visible ~19.0 s, ~1 s
  before the planned 20.0 start (borderline, non-blocking).
- **Segments 6–7 card placement.** The referee / `11 of 11 malformed rejected` /
  `453 tests` / `RTT 86 ms median` / `0 Axe` cards were planned for beat 7
  (42.0–51.0) but ship inside the beat-6 window (~33–39 s); the 42.0–49.5 s
  window carries the honesty/limits card instead. All content ships within
  26.0–51.0 and in a sensible order; only the beat assignment differs.
- **`10 HZ` card dropped.** The planned `10 HZ SUSTAINED` card was removed from
  the shipped cut (one Stage B round flagged it as unscoped). The scoped Gate 0
  10 Hz statement lives only in `docs/submission/project-description.md` and the
  claim ledger; the README omits it. The accepted cut carries no on-screen
  cadence figure.
- **SRT vs burned captions.** `docs/submission/wordless-relay-en.srt` is the
  intended **spoken-narration transcript** (it matches `narration.md`), not the
  burned lower-thirds; the two are deliberately different forms. No reviewer tool
  can perceive audio, but the owner listen-through (2026-08-30) confirmed the
  eight spoken lines match the intended script.
- **On-screen countdown vs round length.** The Lens countdown reads 0:14 (round
  1) and 0:19 (round 2) because the demo joins each round already in progress;
  this is not a change to the documented 20-second round length.
- **Card label variance.** One on-screen card labels the 109 web-unit tests as
  "109 browser"; the docs say "109 web unit" — the same number, different label.

### Recut reconciliation (candidate `254945f2`, supersedes the notes above)

The candidate was re-cut from the frozen raw (no recapture) to clear the
caption-legibility blocker. What changed vs the `18f7ce9a` notes above:

- **Layout.** Panes re-composited to 840 px wide at y=60 on the plum ground,
  reserving a bottom band. Every caption/card now sits in that band, so
  **nothing overlaps a pane, the stroke, or the glyph** (measured pane-bottom-to-
  overlay gaps ~48 px for cards, ~87 px for captions). The intro/wrong caption
  no longer covers the browser projection.
- **Caption size/contrast.** Caption/card main text is 64 px (measured cap
  height 46–48 px ≥ 42); the sub-4.5:1 violet `THE LENS IS THE ONLY REFEREE`
  header is replaced with lemon (~12.9:1). Cards are two rows (eyebrow + one
  main line) so they clear the held glyph.
- **Beat/caption alignment.** beat1 (0–4) now shows the neutral drawn stroke;
  beat2 (4–9) the wrong/coral; beat3 the correct at ~10.3 s with the `CORRECT`
  caption timed to the same frame (0.0 s delta). Shipped beat captions:
  seg 1 `One draws in space — a friend guesses in a browser.`; seg 2
  `WRONG · BOTH STROKES GO CORAL`; seg 3 `CORRECT · the word is revealed`;
  seg 4 `The exact shared path becomes their glyph.`; seg 5 `Play again — a
  fresh round begins.`
- **Cards (beats 6–7), shipped copy:** `HOW IT WAS BUILT — CLAD / One draws in
  space; a browser sees it and guesses.`; `THE LENS IS THE ONLY REFEREE / The
  browser guesses; 11 of 11 malformed rejected.`; `VERIFIED, END TO END / 453
  tests · RTT 86 ms median, one machine · 0 Axe.`; `MEASURED AND HONEST / No
  recognition, no AI, no redraw.` The `10 HZ` card remains absent.
- **Audio.** Rebuilt from the eight frozen MP3s (no regeneration): mono, gentle
  compression + dynamic loudnorm → −16.12 LUFS / −1.75 dBTP, no trailing
  silence. beat-5 uses the regenerated `line-05.mp3` (71d3c5cc, matching the
  caption); the stale `lines.json` entry was corrected. The spoken words were
  confirmed by the owner listen-through (2026-08-30).
- **Held explainer / dim Lens HUD.** The 26–51 s explainer holds a frozen glyph
  under the cards (approved beat-6/7 structure), and the left in-world Lens HUD
  stays small/low-contrast — both inherent to the frozen raw; not addressed by
  an overlay-only recut.
