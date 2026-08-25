# WORDLESS Relay — annotated prompt and decision log

This log records the human direction, model-assisted research, material
decisions, failures, verification, and deviations for the Connect submission.
Planning claims are not implementation evidence.

## 2026-08-24 — Competitive brief and independent review

**Human direction**

Review the Organize winners, the public Guide field, Sensei's companion web
application, and the existing Connect ideation. Select an idea that is unique
enough to stand out, useful or emotionally resonant, instantly understandable,
and resistant to predictable LLM convergence. The owner expressed a preference
for WORDLESS but asked for adversarial vetting rather than automatic agreement.

**Model work**

- OpenAI GPT-5.6 Sol performed the initial Connect research and idea generation
  referenced by the owner.
- Anthropic Fable 5 performed an independent competitive and concept review;
  its supplied memo is archived at
  `docs/research/fable-connect-verdict-original.md`.
- OpenAI Codex independently audited the memo, official Snap documentation,
  PackSpace, Sensei, and the wider discoverable Guide field.

**Decision**

WORDLESS remains the selected concept, but the architecture changed from two
remote Spectacles clients to one Spectacles client plus one browser participant.
Current official Connected Lenses documentation contradicts remote two-Specs
play; official Snap Cloud material documents a plausible bidirectional
Lens↔web route. The approved design begins with a hard feasibility spike.

**Evidence status**

Research complete; implementation not started. Snap Cloud account access,
runtime compatibility, latency, and capture quality remain unproven gates.

## 2026-08-24 — Architecture approval

**Human approval**

> I approve of the WORDLESS Relay direction.

**Locked scope**

One Lens Preview painter, one browser guesser, one bounded continuous stroke,
four choices, Lens-authoritative validation, correct/incorrect feedback, and an
exact-path glyph medallion. No game feature work begins before the realtime
spike passes.

## 2026-08-24 — Visual-reference generation

**Human action**

The owner ran the prompt preserved in
`docs/prompts/visual-reference-prompt.md` through Gemini Nano Banana and ChatGPT
image generation and supplied three outputs.

**Review result**

- ChatGPT output selected as the compositional north star.
- Higher-resolution Gemini output selected as the palette/UI companion.
- Alternate Gemini output retained for restrained stroke and HUD framing only.

**Provenance and use restriction**

All three images are external AI-generated design references. They are stored
under `docs/references/visuals/` in the private repository and are forbidden as
runtime, web, demo-video, or submission assets. Production visuals must be
recreated from original deterministic primitives.

**Implementation status**

No visual shown in these references has been implemented or verified.

## 2026-08-25 — Agent-native implementation-plan directive

**Human direction**

The owner approved the WORDLESS Relay design and requested the implementation
plan before build. The plan must account for LLM implementation speed rather
than human sprint pacing, use the speed dividend for substantially more visual
polish and clarity iteration, and make the experience immediately legible to a
layperson and the judges. After the plan, Fable 5 will review it independently;
only a reconciled plan will be handed to a fresh implementation session.

**Current technical research**

- The official challenge page requires Lens Studio 5.22 or later and a SPECS
  project; this machine currently reports Lens Studio 5.23.1.
- Snap documents Realtime Broadcast, and a deprecated official sample shows a
  mode-switched 10 Hz Lens↔web cursor pattern. Simultaneous two-way behavior
  remains a Gate 0 proof obligation.
- Current public examples span older Spectacles 2024 and newer SPECS branches.
  The plan therefore makes installed Asset Library packages and generated types
  authoritative and puts entitlement, Preview auth, and genuine two-way traffic
  behind Gate 0.
- The browser plan uses framework-light Vite TypeScript and ordinary
  `@supabase/supabase-js`; the Lens remains the result authority.

**Plan decision**

The implementation is divided into evidence-sized tasks, not hour estimates.
Gate 0 proves realtime before game work; Gate 1 proves the complete vertical
slice and freezes features. The remaining work is explicitly reserved for
visual craft, five-second blind comprehension, accessibility, resilience,
capture rehearsal, and claim/evidence quality.

**Review state**

The plan and two handoff prompts are written for independent review. No Lens,
web application, cloud project, credential, or runtime behavior has been
created or claimed by this planning entry.

## 2026-08-25 — Fable implementation-plan review reconciliation

**Independent verdict**

Fable 5 returned `APPROVE WITH REQUIRED CHANGES`, then GO for Task 1 after plan
reconciliation. The external contest/Snap premises and three-version Node
loader were confirmed; seven internal protocol/toolchain findings were marked
blocking. The full memo remains outside the implementation repository as
agreed. Neither Fable nor this reconciliation created product code, a Lens
project, cloud state, or credentials.

**Verified blockers and decisions**

1. Confirmed locally: a representative legal 128-point glyph result was about
   1.5 KB against the 1,024-byte product cap. Geometry was removed from the
   result wire contract. Correct and timeout now drain final batches and, only
   for an active stroke, one stroke end before their respective terminal carries
   `finalPointCount`. On correct only, both surfaces derive and hash the same
   glyph independently; timeout creates none.
   A second calculation using every declared maximal ID/word measured 1,632
   bytes with the old glyph versus 342 bytes for the corrected result; the
   maximal eight-point stroke message measured 363 bytes.
2. Confirmed: one-shot Broadcast readiness can be missed by either join order.
   The plan now requires per-subscription connection IDs, targeted
   ready/ack with bounded retry, duplicate idempotency, and both join-order
   plus asymmetric re-subscription tests. Acks never echo. Exhaustion after a
   known peer enters one local single-flight re-subscribe; before any peer is
   observed it remains waiting rather than churning connections. Ready binds
   receive authority/liveness only; Lens requires a targeted ack of its current
   local connection before emitting product. A late peer ready restarts a
   stopped local burst, and Lens orders a fresh targeted ack before its initial
   start, eliminating the unsafe pre-presence product buffer. If only that
   browser-facing ack is lost, the already-authorized initial start itself may
   activate the bound browser, confirm its peer tuple, and cancel ready retries;
   a later ack cannot regress phase.
3. Confirmed: timeout and rejected guesses lacked authoritative responses.
   They now have separate typed `round.timeout` and `guess.rejected` messages,
   correlation tests, and a retry-only three-second browser delivery deadline.
4. Confirmed: `ReceivePolicy` had tests but no declared source file. It now has
   a pure shared Core home and owns routing/authority/sequence—not gameplay
   phase, which remains in `WordlessEngine`.
5. Confirmed: reconnect could stale-reject a reload and could not observe peer
   loss. The literal suggestion to reset sequence for the same sender and
   republish the old round was rejected because it weakens replay protection
   and violates the approved no-partial-merge rule. Sender IDs now identify one
   client instance, ping/ack supplies peer liveness, and every recovery creates
   a new round through `applyRound`. `round.reset` is now the replay-safe gap
   barrier, so same-sender recovery cannot enter a permanent gap storm;
   contiguous semantic rejects still consume sequence without mutating product
   state.
6. Confirmed against the vanilla-ts scaffold: it uses one `web/tsconfig.json`
   and `tsc && vite build`. The plan now edits the actual config and exercises
   the shared alias in real source.
7. Confirmed: jsdom, Playwright browser installation, and runner collection
   boundaries were missing. The plan now installs locked dependencies, isolates
   Vitest to `web/tests`, Playwright to `web/e2e`, and deletes scaffold/probe
   assets before release.

**Judging-value reconciliation**

- Blind-review questions are non-leading, one unfamiliar human is mandatory,
  and the five-second clip visibly includes a browser tap and shared reaction.
- The glyph payoff completes by 19 seconds and Preview disclosure begins at
  frame one.
- Visual, comprehension, and capture polish loops each require a ledger row.
- The 128-point cap closes and drains visibly instead of silently freezing.
- HUD placement is world-anchored and the full plane/medallion composition must
  fit the judged pose.
- Five instrumented rounds remain mandatory. Static hosting moved to optional
  post-release-candidate work unless the live form requires it.
- Automated Axe accessibility remains required: once Playwright exists, its
  marginal cost is small and supports the UX score, so the suggested cut was
  not adopted.

**Post-patch adversarial audit**

Codex re-read the patched plan as an executable state contract instead of
stopping at Fable's literal edits. That pass found and corrected several secondary
failure chains:

- A rejected sequence gap could otherwise make every later same-sender message
  another gap. `round.reset` now provides the only authorized rebase barrier;
  semantic rejections consume sequence while leaving product state unchanged.
- Initial/new `round.start` and `round.reset` now have exact old-ID/new-ID
  binding rules, including sender replacement and both gap directions.
- Manual release, cap, correct, and timeout share one cadence-preserving close
  path. It never duplicates `stroke.end`, never bursts queued batches, and
  treats a terminal point-count mismatch as immediate resync evidence.
- The web-task command order, committed file ownership, final Axe run, human-
  required comprehension gate, measured payoff/disclosure timestamps, resource
  diagnostics, polish revision hashes, and owner-only publication/submission
  gate are now explicit.
- Copy-ready prompts now use repository-relative paths. The release plan removes
  private reference binaries from the public tree and requires a filename-only
  full-history audit plus separately owner-authorized history filtering or a
  clean public lineage before publication; provenance alone cannot ship the
  reachable generated-image blobs.

**Additional protocol/state audit before handoff**

An additional independent read treated loss, reordering, deadline collision,
and full-process restart as adversarial inputs. It found no reason to change the
approved product architecture, but it exposed further executable-plan gaps that
were reconciled before implementation:

- Noninitial resets now require an explicit browser ack. Lens caches and
  retries the same semantic transition with fresh wire sequences, withholds
  `round.start` until ack, and accepts a valid reset/ack when that control
  message itself is the first sequence gap (`sequence >= observed` and above
  high-water). Previous-round resync requests retransmit the cached transition
  rather than applying yet another round.
- Sequence/liveness recovery now uses peer connection-ID transitions, while
  only a healthy-channel `POINT_COUNT_MISMATCH` emits a wire resync request.
  This removes a reset-ack-before-close race. Terminal point counts are
  parser-bounded as integers from zero through 128.
- Both clients use one outbound FIFO for adapter and application traffic.
  Sequence/time stamping occurs at dequeue; actual point-send starts, not only
  engine effects, are held to the 100 ms interval.
- The engine latches the first terminal decision, defines timeout as winning at
  the exact deadline, generation-invalidates old close work on reset/loss, and
  permits only one stroke per round.
- Product round IDs include a full-Lens-instance nonce, preventing a restarted
  Preview from reusing `round-1` against a surviving browser.
- The browser guess grid is explicitly single-flight, matching its single
  correlation slot. A wrong-round rejection uses the well-formed request round
  envelope so the requester can consume it before recovery.
- Task 10 now owns a temporary local brush/render harness; browser delivery and
  cadence proof moved to Task 11, where `WordlessApp` actually exists. Task 11
  deletes that harness during composition.
- The Lens transport now exposes typed gap/peer-replacement control events plus
  narrow receive-policy round/resync hooks. `WordlessApp`, not the adapter,
  turns those facts into `applyRound`; the browser uses an injected Task-8
  delegate so transport code never imports the Task-9 store.
- The first observed ready/targeted ack from an unbound/replacement sender may establish
  a positive sequence baseline above one, because pre-subscription Broadcast
  traffic is not replayed. A distinct connection ID safely identifies an
  asymmetric re-subscription; it forces product-state recovery and never
  merges old state. The healthy peer acknowledges that change on its existing
  subscription and never reciprocally re-subscribes. Browser liveness/gap
  recovery sends no pre-close request; its new connection ID is the one
  recovery signal, so one token can call `applyRound` only once.
- A dev-only, real-cloud Vitest fault wrapper makes dropped/reordered reset,
  ack, malformed, and gap cases executable after the product raw-send probe is
  deleted. It is bounded, tears down on failure, and must be deleted before the
  resilience commit.
- Replay is now a concrete world-anchored `PLAY AGAIN` SIK interaction, enabled
  only after glyph lock or timeout and routed solely through `applyRound`.
- Task 1 and the release candidate now include the full Lens-authored Specs
  template `Assets/` baseline, `Packages/*.lspkg`, and all companion `.meta`
  files. Cache/Support/editor preferences remain excluded, and a clone must not
  depend on generated local package state.
- Production secret scans distinguish forbidden value-shaped credentials from
  ordinary Supabase protocol field names inside the vendor bundle.
- Ack-first peer transitions now have explicit ordering: emit the peer-control
  fact before readiness, never answer an ack with another ack, let that same
  targeted ack satisfy the new Lens tuple, and let the following authorized
  reset/initial start confirm the browser tuple and cancel its retry burst.
- Browser UI state and outbound intent seams are typed. Transport status maps
  through `BrowserRoundDelegate`, while `WebRoundIntent` carries the exact
  guess or point-count-mismatch request for one-to-one serialization. Task 8
  proves adapters only; product-path equivalence waits until the Task 9 store
  and Task 11 composition actually exist.
- Recovery admission is assigned to a pure, table-tested
  `RecoveryCoordinator`. A reset already in flight is settled/re-acked without
  starting the disconnected engine; that settlement-only token closes, then
  exactly one successor token owns the fresh apply/reset/ack/start. Ambiguous
  delivered-versus-undelivered sends, peer transitions, gap overlap, and reset
  retry are all named cases rather than implied timing behavior.
- The non-shipping real-cloud fault wrapper now distinguishes transport replay
  from semantic duplication: byte-for-byte replay proves duplicate sequence,
  a narrow fresh-sequence `guessId` substitution reaches the engine duplicate
  guard, and a bounded valid unequal terminal count reaches the browser's real
  `POINT_COUNT_MISMATCH` path. The wrapper and test are deleted before commit.
- Starts and resets now carry the exact current browser
  `targetConnectionId`. A message targeted to a prior subscription may consume
  an otherwise-contiguous sequence, but it cannot confirm readiness, bind or
  populate a round, release reconnect quarantine, dispatch to the store, or
  emit a reset ack. This closes the held-old-start/reset race on browser reload;
  it remains a written policy/test obligation until Gate 0 and resilience runs.
- The shared outbound FIFO now retains non-wire adapter/application ownership
  and application-generation metadata. Round invalidation synchronously
  cancels not-yet-started stale gameplay without allocating sequences, preserves
  presence/liveness controls, and quarantines the at-most-one already-started
  old payload at the reconnecting receiver until a correctly targeted reset or
  start. No runtime claim is made before the linked and real-cloud matrices.
- Browser `WebRoundStore` now has a pre-Gate-1 local `roundGeneration` and
  round/generation-scoped `lockGlyph` completion, matching Lens's 450 ms
  `CORRECT -> GLYPH_LOCKED` transition. Reset/reconnect makes stale callbacks
  no-ops; Task 13 refines the tween instead of introducing state after feature
  freeze.
- Authority wording was corrected: Lens `applyRound` alone creates/resets a
  round, while `setCounterpartReady` alone releases that already-applied round's
  one start after the presence/reset-ack gate. Browser recovery invalidation may
  hide an incomplete projection but cannot authorize or populate gameplay.
- The spatial plane remains the frozen 180×110 cm geometry. Brush clamps derive
  from the same shared width/height constants, and frame fitting may move the
  anchor/camera but cannot silently shrink the plane and desynchronize
  interaction from quantization.

These are written contracts and tests-to-build, not claims that transport or
runtime behavior already works. Gate 0 and the later loss/restart matrix remain
the authority.

**Final planning verification**

After the last reset-target and recovery-order patches, an independent
protocol/state-machine audit returned PASS. A separate full-plan audit plus its
stale-instruction scan also returned PASS on task ordering, executable commands,
cross-document authority, Markdown fences, relative links, and recorded
decisions. These results approve the written handoff only; they do not prove any
Lens, browser, or cloud runtime behavior.

**Review state**

The design amendment, implementation plan, research wording, README status,
and fresh-session kickoff are reconciled. Product implementation remains
unstarted pending the owner's final plan approval and the fresh Specs Base
Template project being opened.
