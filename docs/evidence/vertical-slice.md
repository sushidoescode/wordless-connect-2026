# Gate 1 integrated vertical-slice evidence

- Result: **PASS** — one uninterrupted full-display recording shows the seven
  required beats on both product surfaces.
- Observed date: 2026-08-27 PT
- Participants: one simulated Lens Studio Preview painter and one ordinary
  local Chrome guesser
- Relay: ordinary hosted Supabase Realtime
- Session code: `WAVE42`
- Judged product round: `r-IVD83SWC-1`
- Replay successor: `r-IVD83SWC-2`
- Committed baseline entering this evidence pass: `e7e83dd`

This is simulated Lens Studio Preview evidence. It is not Spectacles hardware
footage, a device test, remote-play evidence, or evidence of production
readiness, authentication, durable persistence, security, latency at scale, or
multiplayer scale.

## Fresh baseline and clean runtime

The Gate 1 baseline and final post-capture checks were run from the committed
Task 11 product plus the diagnostic-only equality line in `e7e83dd`:

| Check | Result |
| --- | --- |
| `npm run check` | 286/286 core tests; 92/92 browser unit tests; 54-module production build |
| `npm --prefix web run test:e2e` | 20/20 Playwright tests |
| `sh tools/typecheck/check.sh` | PASS, no diagnostics |
| `git diff --check` | PASS |
| Lens Studio forced TypeScript compile | `succeeded`, no compiler errors |
| Lens Studio Preview/log verification | standard Supabase client configured and subscribed; no runtime errors or warnings |

The final Lens cleanup snapshot contains 136 objects and 52 assets. It has no
AI Preview helper root or helper package. A forced compile followed by a fresh
Preview run logged `APPLY_ROUND`, `CLIENT_CONFIGURED`, `SUBSCRIBED`,
`COUNTERPART_READY`, and `READY -> ACTIVE`, with an empty error list.

## Both join orders

The accepted continuous run covers Lens-first startup. Preview applied
`r-IVD83SWC-1`, configured the standard Supabase client, and subscribed. The
browser then joined, the Lens logged one `COUNTERPART_READY` and one
`READY -> ACTIVE`, and the wire observer saw exactly one initial
`round.start` for `r-IVD83SWC-1` before gameplay. The second `round.start` in
the full trace belongs only to the later replay successor.

A separate browser-first preflight paused Preview, joined the ordinary browser,
and captured the literal inert state `WAITING FOR PAINTER` / `JOINING` with no
choices. Resuming Preview produced Lens lines `TIMED_OUT -> DISCONNECTED`,
`COUNTERPART_READY`, `DISCONNECTED -> READY`, `APPLY_ROUND
round=r-IVD83SWC-3`, then `READY -> ACTIVE`. Its wire record contains one
old-to-new `round.reset` followed by exactly one `round.start` for
`r-IVD83SWC-3`; the browser ended `ACTIVE` with MOON / CLOCK / SUN / STAR.
Neither order needed a second join or an operator retry.

## One continuous judged run

`gate1-continuous-pass-v3.mov` is one uncut, silent, full-display H.264
recording. The browser remains visible on the left and the Lens Studio Preview
remains visible on the right for the complete run. PID-specific window control
hid unrelated Chrome processes before recording; no cuts or composited stills
were used.

The independent wire observer's monotonic offsets provide the common timeline:

| Offset | Required beat | Evidence |
| ---: | --- | --- |
| 1.637–1.732 s | Browser joins and both become connected | One Lens-authored `round.start` binds `r-IVD83SWC-1`; browser becomes `ACTIVE` with four enabled cards; Lens logs `READY -> ACTIVE`. |
| 2.931–4.784 s | One continuous S-shaped stroke relays | One `stroke.begin`, 14 bounded point batches, 36 delivered public points, and one `stroke.end`; the S is visibly drawn on Preview and updates live in Chrome. |
| 5.229–5.392 s | ROPE is rejected by the Lens | Browser sends choice index 2, first displays `ROPE · SUBMITTED`, then receives the matching Lens-authored incorrect result and displays coral `TRY AGAIN`; only ROPE remains disabled. |
| 6.559–6.716 s | SNAKE is accepted by the Lens | Browser sends choice index 0, then receives the matching Lens-authored correct result with `revealedWord=SNAKE`; both surfaces show mint correctness and reveal SNAKE. |
| 6.716–7.123 s | Correct transitions to locked glyph | Browser projection is sampled first in `CORRECT`, then `GLYPH_LOCKED`. Lens logs `ACTIVE -> CORRECT`, then `CORRECT -> GLYPH_LOCKED` 468 ms later and `GLYPH_LOCKED points=36 hash=2ed41748`. |
| 8.761–8.954 s | Visible replay creates a clean successor | An ordinary Preview tap/touch sequence activates visible `PLAY AGAIN`. Lens logs `GLYPH_LOCKED -> READY`, `APPLY_ROUND round=r-IVD83SWC-2`, and old-to-new `RESYNC`; wire ordering is reset then start, and the browser returns cleanly to `ACTIVE`. |
| 8.954–19.997 s | Successor remains clean | Browser shows MOON / CLOCK / SUN / STAR with no result, no glyph, and zero drawing pixels; both product surfaces remain visible through the end of the recording. |

The selected eight-frame contact sheet visibly shows active state, the live S
on both surfaces, wrong/pending feedback, correct/glyph feedback, and the clean
successor. A separate one-frame-per-second sheet contains 20 distinct frames
and shows the intended two product surfaces throughout, without unrelated
windows, overlays, or cuts.

## Causality, authority, and path equality

The judged trace contains 60 decoded application envelopes: 21 sent by the
browser and 39 received by it. They total 12,288 serialized bytes; the largest
envelope is 263 bytes. Type counts are:

| Type | Count |
| --- | ---: |
| `guess.submit` | 2 |
| `presence.ready` / `presence.ack` | 2 / 2 |
| `round.start` / `round.reset` / `round.reset.ack` | 2 / 1 / 1 |
| `round.result` | 2 |
| `stroke.begin` / `stroke.points` / `stroke.end` | 1 / 14 / 1 |
| `transport.ping` / `transport.ack` | 16 / 16 |

The evidence establishes the product authority boundaries:

- Browser gameplay output contains two `guess.submit` envelopes and zero
  browser-authored outcomes. The Lens authors both `round.result` envelopes.
- The wrong submission is browser sequence 5 with guess ID
  `g-b20757866946e721faad`, choice index 2. Lens result sequence 22 returns the
  same guess ID/index with `outcome=incorrect`. Its payload keys are only
  `choiceIndex`, `guessId`, and `outcome`.
- The correct submission is browser sequence 8 with guess ID
  `g-cf0b09120721008a802c`, choice index 0. Lens result sequence 25 returns the
  same guess ID/index with `outcome=correct`, `revealedWord=SNAKE`, and
  `finalPointCount=36`.
- The correct payload keys are only `choiceIndex`, `finalPointCount`,
  `guessId`, `outcome`, and `revealedWord`; it carries no points or other
  geometry.
- All 36 public points and sequence-21 `stroke.end` precede both outcomes. The
  public point-send starts are at least 105 ms apart, and the largest point
  envelope is 222 bytes.
- Lens-local invariant lines end at `worldPoints=36 publicPoints=36`. That
  equals the 36 points delivered to the browser and the correct result's
  `finalPointCount=36`.
- The delivered quantized public path hash is `82da10f1`. The observer's
  independent glyph normalization produces 36 points and coordinate hash
  `2ed41748`; the Lens independently logs the same glyph count and coordinate
  hash. This is the sampled drawing normalized into a medallion, not a claim
  that WORDLESS recognized or redrew a semantic object.
- After the wrong outcome, ROPE alone stays disabled while SNAKE, RIVER, and
  WAVE are enabled. During correct processing, all choices are inert.
- Replay's next product transition is Lens-authored sequence-28 `round.reset`
  under the old ID, followed by sequence-29 `round.start` under
  `r-IVD83SWC-2`; no browser UI or observer populated the successor.

## Stale callback evidence boundary

The exact old-generation callback no-op is proven by the fresh deterministic
store/engine suites and the Playwright case `channel error creates one
successor and stale glyph work cannot lock its round`. Those tests drive reset
before the old 450 ms glyph callback, advance beyond its deadline, and require
the successor to remain clean.

A supplementary live refresh probe was attempted and is retained locally for
diagnosis, but it is **not** counted as direct proof of that exact ordering.
Although refresh was issued when the correct-click command returned, the old
browser projection reached `GLYPH_LOCKED` at observer offset 1.024 s before
the new painter's `round.start` at 1.878 s. The successor then became `ACTIVE`
and stayed clean past the old deadline. This shows successor stability, not
pre-lock cancellation; the deterministic test remains the direct stale-callback
evidence.

The retained wire summary stores bounded counts and hashes rather than all 36
canonical point tuples. The Lens/observer equality is independently
cross-checked in the run, but a third party cannot recompute either path hash
from the summary alone. This is a reproducibility limitation, not an equality
claim beyond the two recorded implementations.

## Capture manifest

All capture files are local ignored evidence under `captures/vertical-slice/`;
none is committed.

| Artifact | Properties | SHA-256 |
| --- | --- | --- |
| `gate1-continuous-pass-v3.mov` | uncut silent H.264, 3456×2234, 19.996667 s, 14,656,552 bytes, average frame rate 122520/2401 (~51.03 fps) | `5eeb02397deeeb34c80430253bce58611396af3d7f948fde221f29d0e34a61da` |
| `gate1-continuous-pass-v3-manifest.json` | action timestamps, browser snapshots, Lens log samples, recorder metadata | `fb158f0dfefbd339fe820071ee3b6a11c81998a652622ed1220553d736c128c7` |
| `gate1-continuous-pass-v3-wire.json` | bidirectional decoded wire/projection record | `899efbca54980c97edb4b2159a39508f00f8e2febc0ef965be8848a6057cc96e` |
| `gate1-continuous-pass-v3-lens.log` | retained Lens runtime lines for the same run | `59ca37b0cdb96abd70d896078aeced30053d2ac82f993faec61c62b36d4a1d23` |
| `gate1-continuous-pass-v3-contact-sheet.png` | eight selected visual beats | `c3644d417dd0efc72608466bc80430028728ec4c209556a81d6fee4bbb400148` |
| `gate1-continuous-pass-v3-every-second.png` | 20 one-per-second full-display frames | `6e2ae40c3d709f5e6bcb16c55d53d5aa2069e378b508a581eb8b42d4a6fbe4c9` |
| `gate1-browser-first-preflight.json` | waiting-to-active browser-first join-order evidence | `a32237799c70ab15705391577585960372951d16f287c033d123f22e17d5aa5d` |
| `gate1-live-stale-lock-preflight.json` | disclosed live refresh probe; not direct pre-lock-cancellation proof | `f4af28e09727c8b4dd6d6c3af09c8eca19083510901e345d0546b2a9ea20ec4f` |

## Rejected attempts and corrections

Evidence was rejected rather than silently promoted when it missed the gate:

- The earlier `r-WU6MZNMB-1` browser movie plus 44 timestamped Preview stills
  proved gameplay data but was not one continuous two-surface visual record.
  It is superseded and is not Gate 1 proof.
- A `continuous-final` attempt timed out at the readiness/reset-ack gate.
- `continuous-accepted` / `continuous-proof-v2` captured zero stroke points;
  investigation found that injected display coordinates did not account for
  Preview's horizontal letterbox mapping.
- A later `continuous-proof` visibly completed gameplay, but its harness
  sampled the click too early and skipped replay, so it was rejected.
- Pass candidate v1 had usable action data, but its retained Lens tail was
  capped and ended in timeout, so it was rejected.
- Pass candidate v2 had coherent telemetry, but an unrelated normal Chrome
  process covered the Lens Studio half of the recording. Full visual review
  caught the obstruction and rejected the take.
- Candidate v3 used PID-isolated layout, was reviewed at selected beats and at
  one frame per second, and is the accepted run above.

The earlier claim that native recording necessarily freezes Lens Studio
Preview was false. Full-display `screencapture` records the live Preview
correctly; the accepted v3 movie is that direct continuous evidence.

Runtime inspection temporarily installed four editor-helper packages and one
`AiPreviewAgent Handler` scene root. Cleanup stayed inside Lens Studio MCP:
Virtual Scene deleted that exact root, and verified Editor API
`AssetManager.remove(SourcePath)` calls removed the four package files and
their metadata. The post-cleanup Virtual Scene snapshot returned from 137
objects / 60 assets to 136 / 52 with no helper reference. No `Cache/` file was
modified.

## Gate decision and freeze

Gate 1 is **PASS** because the single continuous v3 recording visibly proves
all seven required product beats, while the matching bidirectional wire and
Lens records prove causality and equality. The stale-generation invariant is
covered directly by fresh deterministic integration evidence, with the live
probe's weaker ordering disclosed above.

Feature scope is now frozen. Scoring, gallery, accounts, persistence, extra
players, free text, recognition, particles, a new transport, and other new
capabilities remain rejected. Remaining work is presentation, comprehension,
robustness, and submission evidence.
