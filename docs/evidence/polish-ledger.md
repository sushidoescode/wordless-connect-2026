# Visual polish evidence ledger

Every row binds a visual decision to a non-circular reviewed source revision,
the input that exposed the defect, independent review, the smallest accepted
change or retain rationale, and fresh proof. Captures remain local and ignored.

| Date / task | Reviewed source revision | Input evidence | Independent review and observed defect | Smallest change or retain rationale | Fresh proof | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-27 / Task 13 visual payoff | Baseline `3ad1afd` + 17-file source-manifest SHA-256 `cc891025b419f77748761de07b6152235e6154bc3ac4c98a27f244c28de9d51f` | Bright pre-pass `dcfa1e9df58614a37d2760f7d0ae361b48f4adba67c8b449c48874a90f500818`; medium pre-pass `11f103da9fb3df7834cc17ae091b73c4e0d8f3ff5ff16ae90ad74d20aa9056b1` | Lens reviewer: non-exact fractional endpoints and omitted source depth. Browser reviewer: render ticks replaced nodes/animations; live motion-preference changes, resize mapping, and render failures could break presentation lifecycle. Initial judged screenshots also made prompt/result/replay hierarchy too small. | Exact endpoint branches; full glyph-visual inverse transform plus depth tween; stable keyed browser nodes and generation-scoped scheduling; fixed 220/180/450/160 ms motion with dynamic reduced-motion completion; original scale/spacing and coral `#FF786A` changes only. Retained primitive path, additive UI, no dark panels or semantic redraw. | Simultaneous bright combined movie `f328f0e68b2c2703104ee66549cafda3cbef40f8b0773df2fcfd4dd5c5ddb6a2`; paired transition sheet `9b40978e59ee1f4135de3d7ac8844a494f59a98efc48e1ca5ae5cce44a4dd4fc`; medium four-state sheet `87a74871615f45e57c490690c3f8a35af2b28a03a1ee696173918a4c9e17c763`; exact 32-point live/lock equality; 294 core, 98 web, build 55, E2E 30, Lens compile/runtime and typecheck clean | **PASS** |
| 2026-08-28 / Task 14 silent comprehension and accessibility | HEAD `289d3dd` + current 36-file v8 source-manifest SHA-256 `877df568014dd0c4046177609db1f423b628fbb67efcf9e2fcda619d71012f71`; capture-freeze digest `8c56227ea87f6e9a0390cca04806fb93c6650b11fd385f533902f2b95e418f21` at `f9062a8` | V1–v7 remain historical; authoritative palette-source v8 is the freshly verified clip recorded in `docs/evidence/layperson-read.md`. | The palette invalidated v7's source binding. Fresh v8 review finds the same lemon path growing on both surfaces before `ROPE` causes both to turn coral. Two new isolated LLMs explicitly identify the game, distinct roles, live shared path, wrong browser action, and bilateral reaction. The unfamiliar human identifies the drawing/guessing game, roles, shared drawing, and multiple-choice interaction but does not narrate the bilateral wrong-result beat. | Retain the approved palette and bilateral path reaction without another product change. The owner judged the five-second excerpt too short to be a useful release gate, ended further recuts/retests, and redirected review to the full 59-second submission story. Independent review had already strengthened only the Playwright Axe assertion; Lens/browser runtime and v8 bytes are unchanged. | Connected capture: 44 equal world/public points, lemon → coral → lemon payoff. Separate lifecycle: strict allowlist-only v2 lemon begin, 42 equal points, wrong/correct, late-mint no-ops, and replay to lemon-selected/unlocked ACTIVE. Final v8 SHA-256 `dc8792be4526ef3f7116a1b2e61c397f0dd60a82f619e15c2e331a68bbeca908`; 5.000000 s, 1920×1080, H.264/yuv420p, 60 fps, 300 frames, no audio, clean decode; two strict LLM passes; one positive unfamiliar-human core-concept read; final 304 core, 106 web, 38 E2E, 55-module build, Lens compile/runtime and typecheck clean. | **CLOSED BY OWNER WAIVER — FORMAL STRICT PASS NOT CLAIMED** (canonical label per the 2026-08-29 submission-review amendment: **OWNER-WAIVED — NOT PASSING**) |

## Task 13 notes

- The reference images stayed under `docs/references/visuals/` and were never
  imported or copied into runtime output.
- The first medium-room capture timed out before the answer beat, and two
  earlier attempts had no valid connected stroke. They remain rejected rather
  than being used as proof.
- The final Preview evidence is simulated. It makes no hardware, device-test,
  remote-play, production, persistence, security, scale, or general latency
  claim.
- Full scoring, capture hashes, frame timing, exact-count evidence, and the
  Chromium-only residual are in `docs/evidence/visual-review.md`.

## Task 14 notes

- Full verbatim reviewer answers and the owner-waiver rationale are in
  `docs/evidence/layperson-read.md`.
- The rejected first v2 recording dropped into transport recovery and contains
  no shared result; it is retained only as failure evidence. A clean browser
  teardown/rejoin then stayed live and produced the cited candidate.
- The formal v2 panel scores L1 FAIL, L2 PASS, H1 FAIL. The entirely new v3
  through v6 LLM pairs also fail because none attributes the result to both
  surfaces; a human could not rescue those panels and was not burdened. The
  approved v7 bilateral path reaction produced one strict LLM pass and one
  strict fail. V8 supersedes v7 after the palette source freeze and produces
  two strict LLM passes. An unfamiliar human then correctly identified the
  core game and roles without narrating the bilateral result. The owner chose
  not to score that answer as a failure and waived the five-second gate in
  favor of reviewing the complete 59-second story. No formal Task 14 strict
  pass is claimed.

## 2026-08-30 / Task 16 capture-to-binding — capture/evidence loop

- **Input capture/hash:** accepted candidate
  `captures/task16/wordless-relay-final-59s.mp4` (ignored), SHA-256
  `18f7ce9a9b0b72c761ecc36e844cde4487ff4b88f6f7de4222d3bb814a73b5b5`,
  59.000 s, H.264 High 1920×1080 yuv420p 60/1 fps, AAC 48 kHz, faststart,
  integrated −16.89 LUFS / true peak −1.67 dBTP, 3540 frames.
- **Reviewed source revision:** product-freeze `31123d3`; runtime/UI manifest
  `bcb3859a…a46705` re-verified byte-identical after the Lens helper-package
  cleanup.
- **Reviewer composition:** three fresh, context-isolated multimodal reviewers
  per stage (Stage A blind/muted; Stage B narrated + description + README +
  claim ledger). The protocol was **rerun on the exact accepted MP4**: each
  reviewer self-decoded the actual file with ffmpeg (no orchestrator-supplied
  frames), correcting an earlier run that had used sampled frames.
- **Observed defect / decision (build repairs, earlier rounds):** an unexplained
  desktop-wallpaper frame in the replay beat and a clipped CLAD card — both
  fixed (replay beat rebuilt from the clean master take; card shortened); an
  unscoped on-screen 10 Hz cadence card — dropped (scoped 10 Hz remains only in
  the project description, per the claim ledger); caption doubling at the 9 s
  boundary and an unshown "new colour" promise — corrected.
- **Stage A (rerun):** 3/3 comprehension PASS — each reviewer, blind and muted,
  identified the painter/guesser roles, the live shared stroke, bilateral coral
  on a wrong guess (caption read as `WRONG · BOTH STROKES GO CORAL`), the mint
  correct + word reveal, and the exact-mark glyph medallion. Consistent polish
  flags (muted): tiny left-HUD text; the intro caption overlaps the browser
  projection ~0–6 s; the two rounds are near-identical (same STAR clue); a stray
  cursor sits in the browser well; the closing monogram reads ambiguously.
- **Stage B (rerun):** verified parts PASS 3/3 (video↔EDL beat structure/timing,
  narration-script-as-document vs video, claim discipline, cross-document
  numeric consistency). **Spoken-narration AUDIO perception BLOCKED 3/3** — no
  available reviewer tool can hear the AAC track; all three measured it
  (present, ≈−16.8 LUFS, beat-structured) and refused to substitute the
  transcript. NOT a full PASS.
- **Evidence:** `local-handoff/reviews/task16/stage-a-actual-mp4-verbatim.md`,
  `stage-b-narrated-verbatim.md`, and `fixed-prompt.md` (verbatim answers
  ignored); `verify-wordless-video.mjs` all-pass; `captures/task16/edit-manifest.json`
  records the recipe/hashes; `captures/task16/review-bundle/bundle-manifest.json`
  is the immutable hashed review bundle (aggregate `9b566df6…`).
- **Caption geometry (measured on the locked MP4):** lower-third cap height
  ~32 px — below the 42 px minimum; contrast strong for ivory/mint/coral but the
  violet `THE LENS IS THE ONLY REFEREE` header is sub-4.5:1; the intro/wrong
  lower-thirds overlap the browser projection and partially dim the live stroke.
  Legible at full/1440×810; the core story survives at 390 px but proof detail
  and HUD text drop out. A known legibility blocker; a recut to clear it needs
  §4 owner authority.
- **Outcome (v1 `18f7ce9a`):** capture/evidence loop and Stage A comprehension
  PASS; the burned captions missed the 42 px / unobscured / contrast bar — a
  recorded legibility blocker, cleared by the recut below.

## 2026-08-30 / Task 16 recut — caption legibility, no-obscuring, contrast

- **Input:** the FROZEN raw `captures/task16/raw/split-screen-master.mov` (sha
  `8449e5aa…`), reused unchanged (no recapture; runtime/UI unchanged), plus fresh
  compliant overlays and the eight frozen narration MP3s.
- **Recut candidate:** `captures/task16/wordless-relay-final-59s-v2.mp4`, SHA-256
  `254945f2977a69221c30b13e0f6cde7cd9af95d8097b6bc61529688c496050c1`, reproducible
  via `captures/task16/recut.mjs` (deterministic). Bound to the rebuilt review
  bundle aggregate `f9b3f28a5e1095d0617a8595423f09ffe844fe55ee6ac94910a1a90b24e02188`
  (19 components: overlay renderer + rendered-overlay hashes + narration
  provenance, no SRT) and README first-screen `45b22483…`.
- **Smallest changes that clear the blocker:** re-composite panes to 840 px at
  y=60 with a dedicated bottom overlay band; caption/card main text 64 px
  (measured cap height 46–48 px ≥ 42); two-row cards so they clear the held glyph
  (card band sits ~48 px below the pane bottom); the sub-4.5:1 violet `THE LENS IS THE ONLY REFEREE` eyebrow
  replaced with lemon (~12.9:1); captions retimed to the on-screen events
  (CORRECT caption onset == visual onset); the over-long "no redraw" card line
  shortened to fit title-safe. Narration re-mixed from the eight MP3s (no
  regeneration), mono, → −16.12 LUFS / −1.75 dBTP, no trailing silence.
- **Measured PASS:** verifier all-pass; cap height 46–48 px; pane-bottom-to-overlay
  gaps ~48 px (cards) / ~87 px (captions), nothing obscured; contrast ivory 16.9 /
  coral 7.1 / mint 11.9 / lemon 12.9:1; title-safe on every overlay; transitions
  (correct ~10.3 s, medallions before 20, split 0–51, disclosure all segments,
  exact `WRONG · BOTH STROKES GO CORAL`); 1440×810 + 390 px legible.
- **Fresh Stage A panel:** 3/3 comprehension PASS on the recut; all three
  confirmed captions no longer obscure the panels/stroke/glyph. Stage B verified
  parts PASS; spoken audio is tool-unperceivable and was cleared by the owner
  listen-through. Review: `local-handoff/reviews/task16/recut-review-verbatim.md`
  (the fresh final-hash panel is in `final-panel-verbatim.md`).
- **Hero:** re-extracted from the recut @ 17.0 s (`docs/media/wordless-relay-hero.png`,
  SHA `72664be3…`).
- **Outcome:** both media blockers CLEARED — the caption-legibility blocker by
  the recut, and the spoken-narration audio by the **owner listen-through
  (2026-08-30)** confirming the eight lines, Chris voice, delivery, timing, and
  no clipping/defects. Finalization is **CANDIDATE ASSEMBLED WITH KNOWN
  RESILIENCE GAPS** — the sole remaining non-complete item is Task 15 PARTIAL.
  Inherent non-blocking notes: the left in-world Lens HUD is small/low-contrast
  and the
  26–51 s explainer holds a frozen glyph — both inherent to the frozen raw
  (not addressable by an overlay-only recut).
