# WORDLESS Relay — claim ledger

Every public claim about WORDLESS Relay must appear in this table, stay inside
its recorded scope, and use wording no stronger than the "Allowed wording"
column. Anything in the "Prohibited wording" section may not be published in
any submission artifact — video, captions, narration, README, project
description, or form answer. Authority: `AGENTS.md`,
`docs/superpowers/specs/2026-08-24-wordless-relay-design.md`,
`docs/superpowers/specs/2026-08-25-wordless-relay-standard-supabase-amendment.md`
(§6–7), and
`docs/superpowers/specs/2026-08-29-wordless-submission-review-amendment.md`.

All Preview evidence is Lens Studio Preview — simulated. No claim below is a
hardware, device-test, or real-Spectacles-capture claim.

## Exact claims

| Exact claim | Scope | Evidence path/log/test | Allowed wording |
| --- | --- | --- | --- |
| Bidirectional Lens-to-browser relay | One Lens Studio Preview client (simulated) and one ordinary local browser, on one machine and network, in the recorded Gate 0 and Gate 1 runs | `docs/evidence/realtime-spike.md` (Gate 0 GO; bidirectional and rejection proof); `docs/evidence/vertical-slice.md` (Gate 1 PASS, one continuous judged run) | "A two-way realtime relay between one simulated Lens Studio Preview client and one ordinary browser, demonstrated in the recorded runs." Never "remote play" or "any two devices". |
| One simulated Preview painter and one ordinary browser guesser | The entire proof; there are exactly two participants | `docs/evidence/vertical-slice.md` (participants line); `docs/evidence/realtime-spike.md` (claim boundary) | "One simulated Lens Studio Preview painter and one ordinary browser guesser." Never "players on Spectacles", never more than two participants. |
| Sustained 10 Hz point cadence | The accepted Gate 0 spike windows only: prospectively armed exact Run B rerun (ordinals 958–1,058, exactly 10,000 ms Lens and browser source span, 10 / 10 / 9.9985 Hz), with Run A and the restart run at 9.98–9.99 Hz over their 10-second windows | `docs/evidence/realtime-spike.md` (literal cadence rule and run table) | "A sustained 10 Hz point cadence was observed over the accepted 10-second windows of the Gate 0 spike." Always scoped to that spike; never a guaranteed platform rate, and never a 5 Hz claim. |
| Production sampling/batch cadence and limits | The Gate 1 judged game round: 14 bounded point batches, public point-send starts at least 105 ms apart, under the enforced caps of at most 8 points per batch, at least 100 ms between batches, a 128-point aggregate cap on both surfaces, and a 1,024-byte message cap | `docs/evidence/vertical-slice.md` (causality, authority, and path equality); `tools/core-tests/transport-policy.test.mjs`; `tools/core-tests/spike-cadence.test.mjs` | "In the recorded game round, point batches were sent at least 105 ms apart under enforced limits of 8 points per batch, at least 100 ms between batches, 128 accepted points, and 1,024 bytes per message." Never state a 5 Hz cadence, and never present the spike's 10 Hz per-point stream as the game's batch cadence. |
| Exact sampled path normalized into the glyph | The Gate 1 judged round: 36 delivered public points; the Lens and the independent wire observer computed the identical 36-point glyph coordinate hash `2ed41748` | `docs/evidence/vertical-slice.md` (glyph lock beat; path equality); `tools/core-tests/glyph-medallion-view.test.mjs` | "The glyph is the exact sampled drawing, deterministically normalized — no recognition, no redraw, no AI." Never imply the system recognized or redrew a semantic object. |
| Lens-authoritative wrong/correct outcome | All recorded rounds: the browser sent only `guess.submit` envelopes with zero browser-authored outcomes; the Lens authored every `round.result` | `docs/evidence/vertical-slice.md` (two `guess.submit`, both `round.result` Lens-authored); `docs/evidence/realtime-spike.md` (`RX_GUESS` → coral `TRY AGAIN` / mint `CORRECT`) | "The browser submits guesses, never verdicts; the Lens is the only referee." |
| Bilateral coral wrong-stroke response | The authoritative incorrect state while the round stays active: the Lens stroke and the browser path both turn coral (`#FF786A`, wrong-feedback only); a fresh round restores the selected color | `docs/evidence/layperson-read.md` (v8 connected color evidence); `docs/evidence/polish-ledger.md`; `tools/core-tests/stroke-ribbon-view.test.mjs`; `web/tests/render.test.ts` | Beat caption exactly: `WRONG · BOTH STROKES GO CORAL`. Runtime copy stays `TRY AGAIN`. Say "both strokes", never "both screens". |
| Same drawing on both surfaces | The relayed stroke and locked glyph: equal point counts and identical glyph hash in the judged round. Each surface derives its own countdown independently, so timers are not asserted to match tick-for-tick — the claim is the shared drawing, not shared state. | `docs/evidence/vertical-slice.md` (worldPoints=36 / publicPoints=36 / finalPointCount=36; hash equality) | "Same drawing, both surfaces." Never "same state both sides". |
| Malformed messages rejected without changing the game | The Gate 0 rejection matrix: exactly 11 malformed candidates (wrong session, wrong version, bad/stale sequence, bad index, duplicate ID, oversized ID, bad field type, unknown kind, oversized batch, oversized payload) each produced a `REJECTED` line and no visible or accepted-state change | `docs/evidence/realtime-spike.md` (bidirectional and rejection proof, 11 `REJECTED` lines); `tools/core-tests/protocol.test.mjs` | "All 11 malformed test messages were rejected without changing the visible game state." Scoped to the recorded matrix; not an abuse-resistance or security claim. |
| Tested viewport sizes | Automated Playwright projects at the product freeze: 390×844 phone and 1440×900 desktop | Product-freeze verification at commit `31123d34006bb740f397a1bfc467925483e66955` (`npm --prefix web run test:e2e`, 40/40 across the two projects); `web/e2e/wordless.spec.ts` | "The browser layout is tested at a 390×844 phone viewport and a 1440×900 desktop viewport." No other size is claimed as tested. |
| Observed round-trip time | The Gate 0 fifty-ping run: 50/50 correlated application acknowledgments; RTT median 86 ms, p95 106 ms, maximum 111 ms | `docs/evidence/realtime-spike.md` (fifty application round trips and limits) | "RTT median 86 ms, p95 106 ms, maximum 111 ms, measured over 50 pings between the simulated Lens Studio Preview client and a local browser on one machine and network — an observed measurement, not a platform latency claim." |
| Observed payload sizes | Spike scope: largest valid serialized message 122 bytes in the Gate 0 spike runs. Game scope: largest game envelope 263 bytes, largest point envelope 222 bytes, about 60 envelopes / roughly 12 KB (12,288 serialized bytes) in the judged Gate 1 round | `docs/evidence/realtime-spike.md` (final meters); `docs/evidence/vertical-slice.md` (60 envelopes, 12,288 bytes, 263-byte maximum) | "Largest Gate 0 spike message 122 bytes; in the full game round, envelopes peaked at 263 bytes and one round used about 60 messages and roughly 12 KB." The 122-byte figure may only appear with Gate 0 spike attribution; game-scope size claims use the 263-byte / ~12 KB figures. |
| Observed point limits | Enforced: 128-point aggregate cap on both surfaces, 8 points per batch. Observed: 36 public points in the judged Gate 1 round; equal world/public counts throughout | `docs/evidence/vertical-slice.md`; `tools/core-tests/transport-policy.test.mjs`; `web/tests/web-round-store.test.ts` | "At most 128 accepted points per round and 8 points per batch, enforced on both surfaces; the judged round used 36 points." |
| Ordinary hosted Supabase Realtime public Broadcast | The only transport in every recorded run; free plan; public-channel access enabled; no user authentication on either client | `docs/evidence/realtime-spike.md` (service/project mode); `docs/superpowers/specs/2026-08-25-wordless-relay-standard-supabase-amendment.md` §6–7 | "Coordination uses an ordinary hosted Supabase Realtime public Broadcast channel on the free plan. The session code is routing and lightweight concealment, not a credential or security boundary." |
| Round shape | The implemented game: a 20-second round, one continuous stroke per round, four answer cards, deterministic glyph medallion, and replay | `docs/superpowers/specs/2026-08-24-wordless-relay-design.md`; `docs/evidence/vertical-slice.md` (seven judged beats); `web/e2e/wordless.spec.ts` | "A 20-second round: one stroke, four answer cards, correct/incorrect feedback, a deterministic glyph medallion, and replay." |
| Automated test totals | The product-freeze verification on 2026-08-29 at commit `31123d34006bb740f397a1bfc467925483e66955`: 304 core tests, 109 web unit tests, 40 Playwright E2E tests across the two viewport projects (453 automated tests total), a 55-module production build, and a clean Lens typecheck | Freeze verification run (`npm run check`; `npm --prefix web run test:e2e`; `sh tools/typecheck/check.sh`) at the freeze commit; manifest in `local-handoff/execution/freeze-record.txt` (local, ignored) | "453 automated tests at the product freeze: 304 core, 109 web unit, and 40 Playwright end-to-end." Exact totals belong in captions/cards and documents, not narration. |
| Accessibility scan result | Automated Axe scan in Chromium across join, waiting, active, wrong, correct, locked, and timeout states in both viewport projects; keyboard reachability, focus outline, named canvases, assertive result region, textual result cues, and reduced-motion completion are asserted by Playwright | `docs/evidence/layperson-read.md` (accessibility evidence); `web/e2e/wordless.spec.ts` | "0 Axe violations (automated scan, Chromium)." Never "fully accessible"; the residual coverage limits (no manual VoiceOver, Safari, zoom, or high-contrast pass) stand. |

## Prohibited wording

The following claims are banned everywhere in the submission, in any phrasing:

- **Hardware testing.** No "device test", "hardware footage", "real
  Spectacles capture", "tested on Spectacles", or any wording implying the
  proof ran on physical hardware. Every Preview mention carries the
  "Lens Studio Preview — simulated" qualifier.
- **Secure or private channels.** No "secure", "private", "encrypted", or
  "cryptographic secrecy" claims about the relay. Answer concealment is game
  concealment, not cryptographic privacy. The session code is never described
  as a credential or security boundary.
- **Authentication.** No claim of user authentication, authorization, or
  identity on either client; neither client authenticates a user.
- **Recognition or semantic AI.** No claim that the system recognized,
  classified, interpreted, or redrew the drawing. No generative AI runs in
  the runtime.
- **Production readiness or guaranteed availability.** No "production-ready",
  "reliable", "always available", or uptime wording. The free-plan backend
  may pause; no readiness claim may rely on a previously warm backend.
- **Arbitrary remote scale or different-network play.** All recorded evidence
  is one machine and one network. No "play from anywhere", "across the
  world", or different-network claim without direct evidence.
- **Persistence, accounts, matchmaking, or multiplayer scale.** Nothing is
  durably stored; there are no accounts, no matchmaking, and never more than
  one painter and one guesser.
- **First-ever or invention claims.** No claim of inventing air drawing,
  charades, or cross-device play.
- **Unmeasured latency.** No latency figure or characterization beyond the
  recorded 50-ping measurement, and no platform latency guarantee. The
  required scoping sentence in the RTT row is mandatory.
- **A 5 Hz cadence claim.** The conditional 5 Hz branch was not the final
  sustained Gate 0 result and was not needed; the only publishable sustained
  cadence is the scoped 10 Hz row above.
- **Five-second comprehension validation.** Task 14 is
  OWNER-WAIVED — NOT PASSING (`docs/evidence/polish-ledger.md`). No
  five-second comprehension claim may be published anywhere.
- **"Fully accessible."** The only allowed accessibility claim is
  "0 Axe violations (automated scan, Chromium)" plus the specific asserted
  behaviors in the accessibility row.
- **"Both screens" for the wrong beat.** The wrong-beat caption is exactly
  `WRONG · BOTH STROKES GO CORAL`; runtime copy stays `TRY AGAIN`.
- **"Same state both sides."** Each surface runs its own countdown, so
  tick-for-tick timer equality is not asserted; the allowed wording is
  "same drawing, both surfaces".
- **Unattributed "122 bytes".** The 122-byte figure may appear only with
  Gate 0 spike attribution; game-scope sizes use 263 bytes / ~12 KB.
