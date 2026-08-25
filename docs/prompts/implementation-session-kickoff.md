# Prompt for the fresh WORDLESS implementation session

Use this copy-ready prompt only after the owner approves the reconciled plan.
It reflects the already approved direction and Fable's review.

```text
Work in:
the `CONNECT-2026` repository selected as this session's working directory

The owner has approved WORDLESS Relay, its written design, and the reconciled
implementation plan after an independent Fable 5 review returned APPROVE WITH
REQUIRED CHANGES. Those corrections are now part of the contract. Execute the
plan; do not restart ideation or ask for a fresh product choice.

Before any action, read completely:

1. AGENTS.md
2. docs/superpowers/specs/2026-08-24-wordless-relay-design.md
3. docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md
4. docs/research/README.md
5. docs/references/README.md
6. docs/prompt-log.md
7. README.md

Then inspect git status, branch, remote visibility, recent commits, local Lens
Studio version, whether a `.esproj` exists, and whether Lens Studio MCP points
to this exact project. Preserve all user changes and unrelated files.

Use `superpowers:subagent-driven-development` to execute the plan task by task,
with a fresh implementer plus specification and quality reviews for each task.
Use isolated worktrees only for file-disjoint pure/web lanes; never run two
writers against the Lens scene, project manifest, package state, canonical
protocol, `docs/prompt-log.md`, git index/commit sequence, or active Preview
session. The orchestrator alone appends the prompt log, stages, and commits.
Parallel task workers run their own test files; full globs run at the plan's
serial integration gates. If subagents are unavailable, execute inline with the
same explicit review gates.

This is an LLM-native build. Do not pace it as a human sprint or pad it with
hour/day estimates. Parallelize genuinely independent work, keep commits small,
and use the resulting speed dividend for repeated visual polish, silent
five-second comprehension, accessibility, capture rehearsal, and adversarial
judge review. Speed never substitutes for fresh tests, runtime logs, visible
state, or capture evidence.

Hard execution rules:

- Follow the plan in order and mark its checkboxes only from current evidence.
- Task 1 is the first action. If the Specs Base Template project is not open in
  this directory or Lens Studio MCP is unavailable/wrong-project, stop and give
  the owner the single exact editor action required. Never hand-write the
  project manifest or bypass MCP through raw HTTP.
- Gate 0 is realtime-spike work only. No game engine, polished UI, gallery, or
  feature work may begin before genuine Lens↔browser traffic, measurements,
  malformed-message rejection, and restart reproduction pass and are
  committed.
- Use one SPECS/Lens Studio Preview painter and one ordinary browser guesser
  over Snap Cloud Realtime Broadcast. Never restore the rejected remote
  two-Spectacles/Sync Kit architecture.
- The browser submits choices; the Lens validates and publishes outcomes.
  Correct answer/index remain Lens-local until reveal.
- World points remain Lens-local. Only bounded integer normalized points cross
  the transport. The exact sampled path becomes the medallion; never redraw or
  recognize a semantic icon.
- Result messages never carry glyph geometry. Correct and timeout first drain
  every final point batch and, only for an active stroke, one stroke end; their
  respective terminal message then carries `finalPointCount`. On correct only,
  both surfaces independently normalize their identical public point copies;
  timeout creates no glyph. The shared close path preserves the 10 Hz batch cap.
- Broadcast readiness is non-replayed: use the plan's per-subscription
  connection ID plus targeted ready/ack handshake with bounded retry (acks
  never echo), instance-scoped sender IDs with monotonic sequence, two-second
  ping/ack liveness, and six-second peer timeout. Known-peer ready exhaustion
  performs one local single-flight re-subscribe; pre-presence exhaustion keeps
  waiting, and a later peer ready restarts the bounded local burst. Ready binds
  receive authority/liveness only; Lens requires a targeted ack for its current
  local connection before emitting product traffic. Lens orders one fresh
  targeted ack before the initial start, with no pre-presence game-message
  buffer. If only that fresh browser-facing ack is lost, the first
  policy-approved start from the already bound painter may move the browser
  directly from waiting to active, confirm the tuple, and cancel ready retries
  only when its `targetConnectionId` equals that browser's current local
  connection; every start and reset carries that exact current-browser target,
  and a stale-target reset cannot confirm, bind, dispatch, or ack. Its later ack
  is a no-op.
  A peer connection-ID change is acked over the
  healthy receiver's existing channel and must never cause a reciprocal
  re-subscribe. Browser liveness/sequence-gap recovery sends no pre-close resync request;
  its new connection ID is the signal. Every recovery token owns at most one
  `applyRound`: if a disconnecting local channel/status failure or peer
  transition occurs with that token's reset pending, settle the token without
  starting, then allocate exactly one successor token for the fresh
  apply/reset/ack/start; overlapping signals cannot add successors. Both
  clients have exactly one outbound FIFO for adapter and application drafts;
  retain non-wire owner/application-generation metadata, allocate sequence at
  dequeue, and enforce point cadence at actual send start. Before every round
  invalidation/recovery barrier, synchronously cancel not-yet-started stale
  application entries while preserving adapter controls. A reconnecting
  receiver consumes but suppresses the at-most-one already-started old gameplay
  payload until the correctly targeted reset/start barrier.
  Reconnect, sender replacement, or sequence-gap recovery with no reset pending
  enters through a new `applyRound`; a Lens-observed gap while reset is already
  pending only invalidates queued stale application drafts, resends that cached
  reset, and completes local policy resync in place. Use the required
  `round.reset.ack` barrier exactly as planned, withhold start until ack, and
  never merge a partial old stroke.
- Keep parser shape validation, pure `ReceivePolicy` routing/authority, and
  `WordlessEngine` gameplay phase authority separate. Timeout and correlated
  guess rejection are explicit messages; invalid/unverifiable payloads remain
  log-and-drop.
- Latch the first terminal decision immutably, advance timeout before accepting
  a guess at the exact deadline, generation-cancel old drain work on reset or
  disconnect, and allow one stroke per round. Both surfaces must implement the
  round/generation-scoped local 450 ms `CORRECT -> GLYPH_LOCKED` completion
  before Gate 1; stale callbacks after reset/reconnect are no-ops. Use bounded
  instance-nonce-qualified production round IDs; never hardcode `round-1` in
  Lens composition.
- On Lens, `WordlessEngine` and `RoundStore` own state, views render snapshots,
  and `applyRound` is the only authoritative round creation/reset door. Only
  `setCounterpartReady` may release that already-applied round's one start after
  the presence/reset-ack gate. The browser's
  recovery delegate may invalidate/hide an incomplete display and mark it
  reconnecting; it cannot authorize or populate a round. Only an accepted
  Lens-authored reset may authorize/bind a successor round ID. A policy-approved
  Lens-authored start may populate and activate that ID, or establish the
  initial/new-painter-epoch round when no product round is bound.
- Use current installed package source and generated types as API authority.
  Snap Cloud is alpha; do not assume entitlement, auth, channel policy,
  reconnect, or latency before the spike proves it.
- Keep credentials and tokens out of git, logs, captures, and messages. Browser
  config may contain only the project URL and publishable/legacy anon key in an
  ignored local environment file. Never expose service-role or session tokens.
- Use Lens Studio MCP tools for editor state. No curl/fetch/wget/direct REST to
  Lens Studio. Author Lens resources under Assets and never edit Cache.
- The three images in docs/references/visuals are non-shipping inspiration.
  Recreate production visuals from original deterministic primitives.
- Preserve the repository as private until the owner separately authorizes
  publication. Task 18's history/lineage remediation, video upload, visibility
  change, and form submission each require the plan's separate granular owner
  authorization; never infer it. Reachable generated-reference blobs must be
  absent from the eventual public history; provenance notes alone do not pass.
- Append prompts, decisions, failures, deviations, commands, and evidence to
  docs/prompt-log.md before every verified commit.

Persistence and stop conditions:

- If Gate 0 passes every written criterion, commit its evidence and continue
  through the plan without waiting for routine reconfirmation.
- If Gate 0 fails, commit the honest failure record, stop all later tasks, and
  ask the owner to choose WORDLESS Duo or Split the Table. Do not substitute a
  backend, local mirror, prerecorded traffic, or fake browser causality.
- At Gate 1, require one continuous wrong→correct→glyph→applyRound capture and
  all tests/logs. If it fails, diagnose and repair within approved scope.
- After Gate 1 passes, freeze features. Complete the visual, comprehension,
  accessibility, resilience, and submission-evidence loops even if the core
  app was built quickly. The visual-craft, silent-comprehension, and
  capture/evidence rows in `docs/evidence/polish-ledger.md` are mandatory before
  the private release-candidate commit.
- Hosting is Optional Task 17 after the release candidate unless Task 1 proves
  the live submission form requires a companion URL. Do not let hosting displace
  the three required polish loops.
- Stop for user authority/coordination only when the plan explicitly requires
  a human editor/cloud/hosting/publication action, Task 14's unfamiliar-human
  review participation, or when a material design amendment is unavoidable.
  No LLM may substitute for that required human reviewer. Otherwise continue
  autonomously to the private release candidate.

Keep the owner oriented with concise progress updates at task and gate
boundaries. Never claim completion from agent testimony: independently inspect
diffs and run the exact verification listed in the plan.

Begin with Task 1 now.
```
