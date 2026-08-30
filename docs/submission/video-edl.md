# WORDLESS Relay — final video EDL

Status: **TARGET EDL — OBSERVED COLUMNS PENDING CAPTURE.** This is the
approved 59-second timeline from
`docs/superpowers/specs/2026-08-29-wordless-submission-review-amendment.md`
§3. After the cut exists, the observed columns below must be filled from the
exported file, frame by frame, and any miss forces a recut — the claim ledger
is never weakened to fit the cut.

Candidate: `captures/task16/wordless-relay-final-59s.mp4` (ignored; hosted
link owner-gated). Source revision: product-freeze commit
`31123d34006bb740f397a1bfc467925483e66955`. Narration and caption copy:
`docs/submission/narration.md` and `docs/submission/wordless-relay-en.srt`
(both DRAFT until conformed to the final audio).

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
| 1 | 00.0–04.0 | Immediate split-screen roles, shared live line, four choices | `ONE DRAWS IN SPACE · ONE GUESSES IN A BROWSER` (runtime `PAINTER` / `GUESSER` labels visible) | `LENS STUDIO PREVIEW — SIMULATED` from frame zero | PENDING CAPTURE | PENDING CAPTURE |
| 2 | 04.0–09.0 | Browser chooses wrong; authoritative bilateral coral stroke response (uncut browser action; runtime copy stays `TRY AGAIN`) | `WRONG · BOTH STROKES GO CORAL` | `LENS STUDIO PREVIEW — SIMULATED` | PENDING CAPTURE | PENDING CAPTURE |
| 3 | 09.0–14.0 | Browser chooses correctly; mint response and word reveal (uncut browser action; correct feedback and revealed word visible by 14.0) | `CORRECT · THE WORD IS REVEALED` | `LENS STUDIO PREVIEW — SIMULATED` | PENDING CAPTURE | PENDING CAPTURE |
| 4 | 14.0–20.0 | Exact sampled path locks as matching glyph medallions, holding before 20.0 | `THE EXACT PATH BECOMES THE GLYPH · NO RECOGNITION, NO REDRAW` | `LENS STUDIO PREVIEW — SIMULATED` | PENDING CAPTURE | PENDING CAPTURE |
| 5 | 20.0–26.0 | Replay/reset and a concise palette beat (violet / lemon / mint selectable; clean successor round) | `PLAY AGAIN · THE PAINTER PICKS A NEW STROKE COLOR` | `LENS STUDIO PREVIEW — SIMULATED` | PENDING CAPTURE | PENDING CAPTURE |
| 6 | 26.0–42.0 | CLAD process and implementation proof; both product panes stay visible as insets under original proof overlays | `BUILT WITH CLAD: PROMPT → CHANGE → PREVIEW (SIMULATED) → BROWSER → TEST → FIX`; card: `453 AUTOMATED TESTS AT THE PRODUCT FREEZE` | `LENS STUDIO PREVIEW — SIMULATED` on every Preview-bearing frame | PENDING CAPTURE | PENDING CAPTURE |
| 7 | 42.0–51.0 | Validation, measured limits, and honest constraints; both product panes stay visible | Cards: `RTT MEDIAN 86 MS · 50/50 PINGS · ONE MACHINE, ONE NETWORK (OBSERVED)`; `10 HZ SUSTAINED IN THE ACCEPTED GATE 0 WINDOWS`; `11/11 MALFORMED MESSAGES REJECTED — GAME UNCHANGED`; `0 AXE VIOLATIONS (AUTOMATED SCAN, CHROMIUM)`; `PREVIEW PROTOTYPE · PUBLIC CHANNEL · NOT PRODUCTION` | `LENS STUDIO PREVIEW — SIMULATED` on every Preview-bearing frame | PENDING CAPTURE | PENDING CAPTURE |
| 8 | 51.0–59.0 | Original end card and one-sentence promise; sole full-frame exception; complete audio, no clipped copy | `WORDLESS RELAY · DRAW IN SPACE · GUESS IN A BROWSER · KEEP THE MARK YOU MADE TOGETHER`; end card carries the `LENS STUDIO PREVIEW PROTOTYPE — SIMULATED` line | Disclosure printed on the end card itself | PENDING CAPTURE | PENDING CAPTURE |

All card copy above is bound by `docs/evidence/claim-ledger.md`; every number
must match its ledger row and scope exactly at review time.

## Numeric acceptance gates (measured from the exported file)

| Gate | Requirement | Observed |
| --- | --- | --- |
| Correct + word | Correct feedback and the revealed word visible by 14.0 s | PASS — `STAR · CORRECT` and `CORRECT · the word is revealed` visible by ~9 s |
| Glyphs holding | Matching glyph medallions visible and holding before 20.0 s | PASS — matching glyph medallions on both surfaces from ~9 s, holding through 20.0 s |
| Split screen | Lens/browser split continuously visible 00.0–51.0; end card 51.0–59.0 is the only full-frame exception | PASS — split screen 00.0–51.0; end card 51.0–59.0 only |
| Disclosure | `LENS STUDIO PREVIEW — SIMULATED` readable on every Preview-bearing segment, from frame zero onward | PASS — lower-left disclosure pill on every Preview segment 00.0–51.0; end card carries `Lens Studio Preview prototype — simulated` |
| Wrong-beat caption | Exactly `WRONG · BOTH STROKES GO CORAL`; never "both screens"; runtime copy stays `TRY AGAIN` | PASS — caption `WRONG · BOTH STROKES GO CORAL`; runtime cards read `× WORD · TRY AGAIN` |

## Observed record (accepted candidate)

Accepted candidate: `captures/task16/wordless-relay-final-59s.mp4` (ignored).

- SHA-256: `18f7ce9a9b0b72c761ecc36e844cde4487ff4b88f6f7de4222d3bb814a73b5b5`
- Duration 59.000 s; 3540 decoded frames (60/1 fps); H.264 High 1920×1080 yuv420p
  square-pixel; AAC 48 kHz; faststart (moov before mdat); integrated
  −16.89 LUFS; true peak −1.67 dBTP; no black interval ≥ 0.25 s; no trailing
  silence ≥ 0.50 s. `tools/media/verify-wordless-video.mjs` → all checks pass.
- Disclosure present on every Preview segment (00.0–51.0); absent only on the
  end card (which carries its own prototype-simulated line).
- Hero extracted from the accepted candidate at 17.0 s (glyph payoff
  split-screen): `docs/media/wordless-relay-hero.png`.
- Complete-cut panel: Stage A 3/3 (blind, muted) identified the roles, browser
  causality, and the exact-mark glyph; Stage B 3/3 PASS on the narrated
  candidate with no blockers (one Stage B round found and fixed an unscoped
  10 Hz card; the accepted cut carries no on-screen cadence figure). Verbatim
  answers under the ignored `local-handoff/reviews/task16/`.

### Shipped-caption reconciliation

Two planned draft captions above were adjusted to match what the footage
actually shows (recorded for honesty):

- Segment 5 (20.0–26.0): shipped caption is `Play again — a fresh round
  begins.` The planned "new stroke color" line was dropped because the captured
  replay round used the same violet colour; the palette feature is described in
  the docs, not claimed on-screen.
- Segment 7 (42.0–51.0): the shipped CLAD/validation cards carry no on-screen
  cadence figure. The scoped Gate 0 10 Hz statement lives only in
  `docs/submission/project-description.md`, per the claim ledger. The shipped
  cards state the relay, the Lens-only referee, 11/11 malformed rejected,
  453 tests, RTT 86 ms median (observed, 50 pings, one machine), 0 Axe
  violations, and the honesty/limits line.
