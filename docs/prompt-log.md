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

## 2026-08-25 — Approved implementation begins; Task 1 relocation

**Human direction and authority**

The owner approved the reconciled implementation plan at commit `4dc5751`,
directed execution to begin at Task 1 without reopening product ideation, and
authorized Codex to relocate the freshly created Specs Base Template when Lens
Studio had placed it one directory below the plan's repository-root layout.
The repository remains private.

**Observed preflight**

- Git `main`, `origin/main`, and `HEAD` matched `4dc5751`; GitHub reported the
  repository as private.
- Lens Studio reported `5.23.2.26081320`, above the required 5.22 minimum.
- The implementation shell resolved `/usr/local/bin/node`, version `v22.14.0`.
- The fresh project initially existed at
  `CONNECT-2026/WordlessRelay/WordlessRelay.esproj`, with its expected
  template `Assets/`, `Packages/`, generated editor state, and managed agent
  instructions.

**Relocation decision and evidence**

Lens Studio MCP first confirmed the nested active project, its three root scene
objects, and its Spectacles target. An Editor API `Project.saveTo` attempt to
the repository root failed cleanly because Lens Studio rejects saving a
project into an overlapping parent directory; no copy was created. The editor
then saved the fresh project and switched to an empty project. With the
owner's explicit authorization, Codex mechanically moved the closed template
baseline one level up, retained the discarded nested wrapper recoverably under
`/tmp`, preserved the custom WORDLESS contract outside Lens Studio's managed
`AGENTS.md` block, and reopened the root manifest through the Editor API.

Fresh MCP inspection then reported:

```text
project file: CONNECT-2026/WordlessRelay.esproj
project directory: CONNECT-2026
assets directory: CONNECT-2026/Assets
target platform: Spectacles
scene roots: Camera Object, Lighting, SpectaclesInteractionKit
Preview input: Interactive
Preview device: SPECS 27
```

This relocation changed no approved product or runtime architecture. The
Lens-generated `.gitattributes` is retained as part of the actual template
baseline because it defines Lens asset/LFS and `.meta` handling, even though
the plan's example staging command did not name it.

**Failure and secret-handling note**

During the initial local inventory, a generated Lens MCP configuration was
printed to the private tool transcript and included its localhost bearer
credential. The value was not copied into source, this log, staging, or any
message, and all generated connector files remain ignored. The editor session
will be restarted before the Task 1 commit so that the exposed local session
credential is invalidated, followed by fresh MCP/project verification. No raw
HTTP request was made.

**Execution process ruling**

The project-specific kickoff overrides generic subagent defaults: task workers
do not edit this log, stage, commit, push, or share the Lens scene. The
orchestrator alone records evidence and commits reviewed states. Implementation
tasks receive separate specification and quality/runtime reviews; evidence-only
Tasks 4, 12, and 16 may use the plan-authorized combined review.

**Task 1 package-gate failure**

The Task 1 implementer used the Lens Studio MCP Asset Library installer for
`SupabaseClient` 2.1.0. The call timed out after 300 seconds. Read-only
filesystem inspection showed that `Packages/SupabaseClient.lspkg`, its `.meta`,
and editor-global Supabase plugin files had appeared, but the ambiguous timed-
out mutation is not counted as a passed install. In accordance with the hard
Lens Studio rule, no raw HTTP or alternative editor-control path was attempted.

Task 1 is blocked before Snap Cloud entitlement, project import, compile, and
Preview runtime verification. Resume requires the owner to use the open Lens
Studio UI to complete `Window → Supabase`: sign in, create or select
`wordless-relay`, import its `SupabaseProject` asset into
`Assets/LocalOnly/`, and confirm in the Inspector that the URL and public token
fields are populated without copying either value. The generated credential
asset remains local and ignored. No later implementation task has begun.

## 2026-08-25 — Task 1 owner-gate verification after reported completion

The owner reported that the Supabase sign-in/project/import action was done.
Fresh credential-safe Lens Studio MCP queries inspected only asset IDs, names,
types, and paths; they did not read property values. The active root project
still reported zero `SupabaseProject` assets and no asset under
`Assets/LocalOnly/`. A filesystem path-only check agreed. The discrepancy is
therefore an unmaterialized import in the active project, not a Git-ignore
artifact.

The installed Supabase plugin source explains the exact workflow: its project
row has a separate `Import Credentials` button, which creates a native
`SupabaseProject` asset at the Asset Browser root. Once that asset exists,
Codex can move it into the ignored `Assets/LocalOnly/` directory through Lens
Studio MCP and verify only field presence, never values.

Fresh MCP baseline evidence did pass independently of that gate:

```text
SupabaseClient project package: 2.1.0
TypeScript recompile: succeeded
Preview reset/run: success
Preview runtime errors: 0
Normal startup prints: SIK Version : 0.18.0
```

The public Week 3 page was also inspected read-only. It lists the public
repository link, demo video, CLAD prompt log, and project description as
submission materials, but the unauthenticated page exposes only its
registration form. Exact logged-in submission fields and any published-Lens
link field remain session-gated and are not guessed.

Codex attempted to open the Supabase panel through `ExecuteEditorCode` so it
could finish the button action itself. The MCP call failed during type-checking
because the supplied code referenced the non-exported
`Editor.IPluginDescriptor` namespace member. Per the Lens Studio MCP hard rule,
no further Lens operation or alternate editor-control path was attempted after
that error. Task 1 remains at the explicit owner gate: in
`Window → Supabase`, locate `wordless-relay` and click its
`Import Credentials` button. No credential value was printed, logged, staged,
or committed.

## 2026-08-25 — Snap Cloud Alpha denial and fallback amendment research

**Owner evidence**

The owner supplied a Lens Studio screenshot showing that Supabase Plugin login
failed because Snap Cloud is currently in Alpha and the Snapchat account is not
yet approved. The owner has applied for access but cannot rely on an approval
date. This closes the original Task 1 entitlement route as unavailable today;
it is not treated as a credential or setup mistake. The screenshot remains an
external conversation artifact and was not copied into the repository.

**Required process**

The owner asked for another route. Because transport is a material design
boundary, implementation remains paused while an explicit amendment is
researched and approved. No fallback code, cloud deployment, product feature,
or unsupported network claim has been created.

**Current amendment candidates**

1. The lowest-change candidate is ordinary hosted Supabase rather than the
   unavailable Snap Cloud-managed project. The installed Lens API documents
   `SupabaseModule.createRealtimeConnection` and
   `performSupabaseRequest` as operating against *any Supabase project*. The
   installed `SupabaseClient` 2.1.0 bundle delegates its websocket and fetch
   operations to those APIs and accepts an arbitrary project URL plus public
   key. A normal public Broadcast channel therefore has a plausible Lens↔web
   path without Snap Cloud Plugin entitlement, but Gate 0 must prove it in the
   current SPECS Preview before any game work.
2. The stronger-control, larger-change candidate is a standards-based `wss://`
   relay implemented as a Cloudflare Worker plus one Durable Object per
   ephemeral session. Lens Studio documents open-internet WebSocket support
   through `InternetModule.createWebSocket`, and a browser can use its native
   WebSocket client. This adds backend code, deployment credentials, ticket
   issuance, admission policy, and new failure modes.
3. Managed realtime protocols without a Lens SDK and HTTPS polling remain
   inferior fallbacks because they add provider-protocol/auth work or weaken
   immediacy. The already-reviewed WORDLESS Duo/Split the Table pivots remain
   product changes, not drop-in relay substitutions.

Ordinary Supabase is the current recommendation for a first amended spike
because it preserves the one-Preview/one-browser product, Broadcast semantics,
installed Lens package, browser library, and most of the reviewed protocol.
It will not be described as Snap Cloud. Only a public/publishable or legacy
anonymous client key may enter ignored local configuration; a service-role or
secret key is forbidden. Standard Supabase free-tier limits and inactivity
pausing must be recorded, measured against the probe, and rehearsed before
capture. This recommendation is not yet owner-approved.

**Owner approval**

> Yes let's go with the normal free Supabase. approved

The approved amendment preserves one Lens Studio Preview painter and one
ordinary browser guesser. It replaces only the unavailable Snap Cloud-managed
project with a normal hosted Supabase Realtime public Broadcast channel. No
code or external Supabase project was created by this approval; the written
amendment and reconciled implementation plan precede runtime work.

**Independent amendment review**

A read-only consistency review found no Critical issues and required two
Important corrections before commit. The amendment now makes generic native
`SupabaseProject` creation/move/field-name inspection a credential-safe MCP
prerequisite that fails Gate 0 if unsupported, rather than asserting that path
works. It also preserves the stronger simultaneous-traffic proof: browser
choice validation plus fifty correlated ping/ack RTT samples occur while the
10 Hz Lens-origin point stream remains active. Stale README, research-index,
and local-credential labels were reconciled at the same time.

The same reviewer then performed a scoped re-review of those corrections. All
four findings were confirmed addressed, with no remaining or new Critical or
Important issue. The reviewer's only non-blocking whitespace note was removed
before staging.

## 2026-08-25 — Owner-approved plan reconciliation and Task 1 restart

**Owner instruction**

> approve written amendment. Please power through the rest of all the tasks 1 - 15 or whatever it was.

This authorizes the already written standard-Supabase amendment and continued
execution through Task 15, subject to the plan's existing Gate 0/Gate 1 checks
and explicit owner/human-coordination stops. It does not authorize a silent
backend change, public repository visibility, history rewriting, video upload,
hosting-account connection, or contest submission.

**Credential-safe feasibility audit**

Before any mutation, Lens Studio MCP and the active generated declarations were
inspected without querying asset properties. The active editor reported native
asset type `SupabaseProject`, zero current instances, and a concrete editor
class exposing `projectId`, `projectName`, `projectUrl`, and `publicToken`.
Runtime declarations expose `url` and `publicToken`, establishing the required
`projectUrl -> url` mapping. The installed `SupabaseClient` package is 2.1.0
and its built-in module path accepts an arbitrary normal Supabase URL and
client-safe key. Create/move/save APIs are present, but their real mutation is
still a Task 1 test—not claimed as passed here. No credential value was read,
printed, logged, or committed.

**Canonical-plan reconciliation**

The implementation plan, fresh-session kickoff, and README status were updated
to make the approved amendment executable end to end:

- ordinary hosted Supabase Realtime public Broadcast replaces active Snap
  Cloud service/auth assumptions while the historical Alpha denial and the
  installed vendor import path remain truthfully labeled;
- Task 1 now fail-fast proves a blank native credential asset under ignored
  `Assets/LocalOnly/` before asking the owner to create/select the normal
  project and paste its URL/client-safe key;
- Gate 0 messages are versioned, positive-sequenced, exact-session checked,
  byte bounded, ID bounded, and rejected before visible state; no user-token
  auth or Alpha heartbeat override remains;
- the browser example environment file is created only after Gate 0 proves the
  compatible variable names/key type, and an early NO-GO can still commit its
  honest failure record;
- the production adapter is `SupabaseRelayTransport`, browser teardown proves
  both unsubscribe and removal, Free-project wake/public-channel preflights are
  repeated, and live fault evidence is named Supabase explicitly;
- the production-bundle audit forbids management/service/database secrets while
  allowing only the configured client-safe legacy-anon JWT when compatibility
  requires it, without printing values; release claims explicitly describe an
  unauthenticated public-channel demo rather than a security boundary.

**Independent reviews and corrections**

A first full-plan audit identified stale Alpha auth, environment, adapter,
evidence, and release wording across Tasks 1–18. A separate active-editor audit
verified the native-asset API and editor/runtime field mapping while preserving
the actual mutation as a fail-fast gate. A fresh post-edit reviewer then found
five executable-plan defects: an exact-name asset filter mismatch, insufficient
Gate 0 version/sequence/bounds validation, a legacy-anon JWT false positive, an
unconditional `.env.example` stage on early NO-GO, and incomplete browser
channel removal semantics. All five were corrected. The same reviewer reran
the scoped review, withdrew one declaration-path concern after confirming
`Editor.Assets.SupabaseProject`, and returned PASS with no remaining Critical,
Important, or Minor contract finding. The orchestrator independently reran the
forbidden-token/name scan, heading inventory, code-fence balance, and
`git diff --check`; all passed before staging.

No runtime product task began during this reconciliation. Task 1 resumes next
with the credential-free native asset create/move/save/path-only proof.

## 2026-08-26 — Task 1 native asset proof and refreshed baseline

The delegated Task 1 worker could not start its mandatory reads because its
unified subprocess launcher returned `CreateProcess ... No such file or
directory` under the default shell, `/bin/sh`, and `/bin/bash`. It made no MCP
call or mutation. The orchestrator therefore continued the same bounded step
directly; the active primary-session executor and Lens Studio MCP were healthy.

**Credential-free MCP proof**

The preflight returned the exact active project
`CONNECT-2026/WordlessRelay.esproj`, concrete native type `SupabaseProject`,
expected editor field names, zero exact-name collisions, and zero existing
matching assets. No GraphQL `properties` field was selected. Through Lens
Studio MCP, the orchestrator then:

1. created the ignored `Assets/LocalOnly/` directory through the Editor API;
2. created one blank native asset named `WORDLESS Supabase Project` at the
   Asset root;
3. moved returned asset ID `6ba48142-cc1e-49ef-8d22-84f2e2859a8e` to
   `Assets/LocalOnly/`;
4. confirmed the four literal editor field names without evaluating their
   values, called `Project.save()`, and received a successful return; and
5. reran a path-only query proving exactly one `SupabaseProject` at
   `LocalOnly/WORDLESS Supabase Project.supabaseProject`.

Git ignore checks matched both the asset/meta and `Assets/LocalOnly.meta`; Git
reported the directory only as ignored. No credential value existed, was read,
or entered during this step. The native authoring path therefore passes; the
normal Supabase project and values remain the explicit owner gate.

**Baseline and package evidence**

Fresh evidence found Lens Studio `5.23.2.26081320`, target platform
`Spectacles`, interactive `SPECS 27` Preview, Node `v22.14.0`, npm `10.9.2`,
private GitHub visibility, SupabaseClient `2.1.0`, SIK package `2.0.0`, and
UIKit `2.0.0`. All seven non-local primary Asset/package files had adjacent
metadata. Installed source shows the vendor import path
`SupabaseClient.lspkg/supabase-snapcloud`, bundled supabase-js `2.81.0`, a
direct internal require of `LensStudio:SupabaseModule`, arbitrary URL/key
client construction, channel subscribe/send/unsubscribe, and client removal
APIs. The historical import path is not relabeled as the service.

Forced TypeScript compile succeeded. A fresh Preview reset ran with first
activity at 26 ms, zero errors/warnings, and the normal
`SIK Version : 0.18.0` print. Compile success is not being used as network
proof.

**Current external facts**

The Firecrawl CLI was absent globally, so its documented `npx
firecrawl-cli@latest` fallback was used without account authentication and
wrote only ignored `.firecrawl/` artifacts. Current official Supabase pages
retain the dashboard labels `Enable Realtime service` and
`Allow public access to channels`; a publishable `sb_publishable_...` key is
client-safe, while secret/`service_role` keys are forbidden. Current Free
limits are 200 concurrent connections, 100 messages/s, 100 joins/s, and a
256 KB Broadcast payload. Low-activity Free projects may pause after a 7-day
period and expose `Resume project` in the dashboard.

The public Week 3 page requires a public repository, demo video, CLAD prompt
log, and project description. Its unauthenticated surface shows registration
fields only and no required published-Lens field, so authenticated submission
fields remain unclaimed.

Task 1 now stops at its explicit owner action: create/select the normal
`wordless-relay` project, enable Realtime and public channels, then paste only
the project URL and publishable client key into the ignored Lens asset. No game
or browser-spike task has begun.

**Pre-credential quality review correction**

The specification reviewer returned PASS with no Critical or Important issue
for the native asset path, metadata, target, packages, and ignored state. It
qualified the clean runtime statement: a later global log tail contains
unrelated Quest ADB discovery warnings, so only the bounded post-refresh
capture supports zero *project runtime* errors/warnings.

The independent quality/safety reviewer correctly returned FAIL before owner
credential entry for two reasons. First, the initial setup transcript already
recorded that a generated localhost MCP bearer had appeared in the private tool
transcript; the promised Lens Studio restart/invalidation had not yet occurred.
Second, a generated untracked `.virtual-scene.json` snapshot remained at the
repository root. Such snapshots can serialize asset properties if regenerated
after values exist. The snapshot is being moved recoverably to Trash and its
root path added to `.gitignore`; no further VirtualScene read may run around
credential handling. The reviewer also confirmed that the actual ignored asset
and adjacent meta exist, while `Assets/LocalOnly.meta` itself has not
materialized—the ignore rule covers that potential path, not an existing file.

Credential entry remains blocked until the owner quits and reopens Lens Studio,
which rotates/invalidates the prior local MCP session, and Codex then rebinds
MCP and re-verifies the exact project plus path-only asset identity. The same
owner action may proceed to Supabase/dashboard and Inspector entry only after
that fresh verification succeeds.

**Fresh editor restart and safe rebind**

The owner confirmed Lens Studio was fully quit. Codex launched the exact root
`WordlessRelay.esproj` with the macOS application launcher and rebound through
Lens Studio MCP to the new editor process before any Supabase value was
entered. Credential-safe Editor API inspection returned the exact project path,
target `Spectacles`, and one matching `SupabaseProject` with the expected ID,
name, type, local-only path, and four field names. A separate path-only asset
query returned the same one asset; neither call selected or returned any asset
property value. Preview configuration remains Interactive, `SPECS 27`, Front,
Plane. The restart/rebind prerequisite is satisfied and the owner credential
gate may now open.

## 2026-08-26 — Normal Supabase owner gate completed

**Owner authorization**

The owner explicitly asked Codex to handle the normal Free Supabase setup and
Lens Studio entry. This authorized creation of the in-scope Free organization
and project, inspection of their Realtime settings, and transfer of only the
client-safe project URL and publishable key into the ignored native asset. It
did not authorize a public repository, hosting integration, GitHub app install,
secret-key use, or any Task 18 action.

**Hosted project and dashboard checks**

Through the owner's already authenticated ordinary Chrome session, Codex
created the Free organization `Wordless Relay` and Free project
`wordless-relay` in the default Americas region. Supabase's password generator
created the database password; Codex never read, copied, printed, or stored it.
The active project dashboard showed neither provisioning nor paused state.

Realtime Settings showed both `Enable Realtime service` and
`Allow public access to channels` enabled. `Save changes` was disabled after
inspection, so no unsaved settings remained. The API Keys page exposed separate
Publishable and Secret sections. Codex used the first, explicitly labeled
publishable-key copy control, validated only its `sb_publishable_...` shape,
and never revealed, copied, or selected the secret key. Clipboard contents were
cleared after the Lens entry. An accidental optional `Connect GitHub` popup was
closed before repository selection, installation, authorization, or other
state change.

**Credential-safe Lens entry and root cause**

The publishable key persisted in the ignored native `SupabaseProject` asset.
The project URL visibly entered the Inspector but normalized back to empty on
blur; direct Editor API assignment reproduced the same behavior, proving this
was native asset normalization rather than a paste failure. The supported Snap
import path supplies a complete four-field native tuple. Testing that bounded
hypothesis by assigning the normal project's non-secret identity fields
`projectId` and `projectName` before `projectUrl` caused the URL to persist.
This resolved the incompatibility without switching key type or backend.

`Project.save()` then returned success with value-blind checks confirming all
four fields populated, a valid hosted-project URL shape, and the publishable-key
shape. Lens Studio was fully quit and reopened on the exact root
`WordlessRelay.esproj`; the stable asset ID and every populated/shape boolean
remained true. A separate GraphQL query selected only ID, name, type, and path.
No VirtualScene read or asset `properties` query occurred around credentials.

**Fresh baseline evidence**

After restart, forced TypeScript compilation succeeded. A fresh Preview reset
reported first activity at 26 ms, the expected SIK version print, and zero
bounded project runtime errors or warnings. This is an editor/runtime baseline,
not Realtime traffic proof. Tasks 2–4 and every written Gate 0 criterion remain
required before product/game work.

**Final Task 1 staging hygiene**

The final quality pass identified untracked editor/tool artifacts that an
unscoped future `git add -A` could otherwise capture. The Lens editor's
project-local `Plugins/` cache and generated `CLAUDE.md` compatibility pointer
are now explicitly ignored; shipped runtime packages remain the three complete
`Packages/*.lspkg` plus metadata pairs. The temporary empty
`WordlessRelay/.codex-cwd-recovery` path exists only because this session's
executor was launched with a stale, removed working directory; it is excluded
locally through `.git/info/exclude`, is outside the Task 1 staging set, and will
be removed when the executor no longer needs it. No credential or project
runtime asset is stored there.

The first staged metadata verification loop accidentally used zsh's special
`path` variable as its filename iterator, which temporarily emptied command
lookup inside that subprocess and produced seven false missing-meta reports.
The subprocess ended without changing files. A corrected loop using
`candidate_file` returned `MISSING_META_COUNT=0`; forbidden staged paths and
credential-shaped staged files also both returned zero.

Task 1 was committed as `89bcd23` (`chore: establish WORDLESS SPECS
environment`) after the final specification and quality/safety reviews both
returned PASS with no Critical, Important, or Minor findings. The execution
plan's Task 1 checkboxes are now marked complete from that evidence; Task 2 is
the active step and Gate 0 remains unclaimed.

## 2026-08-26 — Publishable-key transcript exposure and rotation

While checking the Task 2 development server, Codex mistakenly requested
Vite's transformed `src/main.ts` and filtered its response in the shell. Vite
had already substituted the local environment variables, so the ordinary
Supabase project URL and the then-current client-safe publishable key appeared
in the private tool transcript. No secret/service-role key, database password,
management token, or user token was involved, and the value was never staged,
committed, or pushed. The probe server was stopped immediately and the browser
probe tab was closed.

Codex created a replacement publishable key named `wordless_gate0` in the
authenticated Supabase dashboard, updated only the ignored `web/.env.local`
and ignored native `SupabaseProject` asset, saved the Lens project, and cleared
the clipboard. Value-blind Lens Editor checks confirmed exactly one native
project asset with all four fields populated, a valid hosted-project URL
shape, and the publishable-key shape. A fresh browser process using the
replacement key reached the visible state `SUBSCRIBED · WAITING FOR LENS`.

After that replacement-key validation, Codex opened the old default
publishable row's action menu with a strict row guard, completed the dashboard's
typed-name confirmation, and deleted that superseded key. A final value-blind
dashboard query showed only `wordless_gate0` in the Publishable section and the
unchanged default row in the Secret section. The secret row was never copied,
selected, edited, or deleted. This rotation closes the transcript exposure;
the upcoming Lens half of Gate 0 must still prove that the installed Lens
client can subscribe and exchange traffic with the replacement key.

The post-rotation repository audit searched tracked and unignored worktree
files, the index, and every reachable commit for complete Supabase
publishable/secret-key shapes, hosted project URL shapes, and PostgreSQL
connection strings. All three match-file counts were zero. Both local
credential containers remained ignored, and `git ls-files` returned zero
tracked files beneath `web/.env.local` or `Assets/LocalOnly/`.

## 2026-08-26 — Task 2 browser spike implementation

The browser probe was built as the deliberately literal Gate 0 surface: one
Supabase client/channel, the fixed `WAVE42` topic, strict sub-1-KB versioned
message parsing, three send controls, an incoming-stroke canvas, visible
connection state, and message/byte/application-RTT metrics. Scaffold branding
and unused public assets were removed. Missing-config verification displayed
all three exact missing variable names and initiated no Supabase request; with
ignored local config, the replacement-key run subscribed successfully.

The initial protocol test failed because the required module did not exist,
then passed after the bounded parser was implemented. A subsequent review loop
added red/green coverage for synchronous ping-registration ordering, terminal
transport-state latching, contiguous inbound sequence enforcement, safe
rejection of unserializable payloads, and a rolling 128-point Gate 0 display
window. The rolling window limits only temporary visualization memory; it does
not change the product's separate 128-point-per-stroke contract, and accepted
traffic continues to contribute to message/byte metrics. Sequence gaps are
reported visibly and never reach UI/metrics as accepted traffic. The two
literal buttons submit bounded choice indexes 1 and 2 respectively, while the
browser still makes no correctness decision.

Fresh orchestrator verification after those corrections passed 11/11 Vitest
cases and a TypeScript/Vite production build with 50 modules transformed. The
stylesheet contains only the six exact approved palette values. Final Task 2
specification and quality rereviews are pending before staging or commit.

The fresh Task 2 specification rereview returned PASS with no deviation. The
fresh quality rereview returned FAIL before commit: terminal failure was
latched only in the inbound controller while the owning `RelayProbe` retained
its channel and callable send paths, and the pending-ping/RTT collections were
unbounded (including a pending entry left behind after a failed send). A second
TDD correction loop is in progress to prove owner-level teardown/send
rejection and bounded RTT ownership. The earlier 11/11 result is therefore not
being treated as the Task 2 commit gate.

The second correction introduced a narrow injectable client/channel boundary
so the real `RelayProbe` owner could be tested without network traffic. Red
tests demonstrated missing exact-once removal, post-terminal send rejection,
and removal-failure containment before the implementation nulled channel
ownership, prevented reconnect/send after the first terminal state, and
contained asynchronous cleanup failures. A bounded RTT tracker now retains at
most 64 pending pings for 10 seconds and 128 completed samples; failed sends
discard their pending entry. The owner-lifecycle suite reached 15/15 before the
RTT tests were added, and the full suite reached 19/19.

Fresh orchestrator verification again passed all 19 tests and the production
TypeScript/Vite build with 50 modules transformed. The live ignored-config
page remained `SUBSCRIBED · WAITING FOR LENS` with all three controls enabled.
Independent final specification and quality reviewers both returned PASS with
zero findings. Task 2 is therefore eligible for its scoped commit; this is
still only the browser half and does not claim bidirectional traffic or Gate 0.

## 2026-08-26 — Task 3 Lens realtime probe

Task 2 was committed as `cffe337` (`spike: add Supabase Realtime browser
probe`) after its final credential/prohibited-path staged counts were zero.
Task 3 then began under a single Lens Studio MCP writer; the existing Vite
probe stayed running and ignored credential files remained untouched.

**Protocol TDD and installed API evidence**

The exact Node 22 command from the plan first failed with exit 1 and the
expected `ERR_MODULE_NOT_FOUND` for the not-yet-created Lens
`ProbeProtocol.ts`. After implementation, the pure parser suite passed 13/13.
A separate read-only audit of the installed `SupabaseClient` 2.1.0 package
confirmed the `SupabaseClient.lspkg/supabase-snapcloud` import, Broadcast
wrapper `message.payload`, public-channel status/send/remove APIs, package
timer functions, and default client-side-only meaning of send result `ok`.
The installed bundle directly requires `LensStudio:SupabaseModule`; it has no
`globalThis.supabaseModule` reference, so the sample-observed global assignment
was correctly omitted.

**Editor attempts and first live Lens result**

The first read-only camera transform query failed type checking because it
passed `scene.mainCamera` (a Camera component) where a SceneObject was
required. No editor code executed and no scene mutation occurred. Local
`editor.d.ts` evidence identified `scene.mainCamera.sceneObject`; the corrected
query returned the camera-relative placement basis. The MCP writer created the
probe hierarchy at `(0, 8, -100)`, wired `WAVE42`, status visuals/text, and the
ignored native project asset without reading any credential property, and
saved the scene.

Initial preset authoring emitted generic PBR dependency debris. The writer
resolved exact asset identities, retained and renamed only the two referenced
primitive meshes plus required unlit materials/shader beneath
`Assets/Wordless/`, and removed unused debris through Lens MCP. A runtime
inspection call temporarily installed `AiPreviewAgentInspect`; the package was
confirmed inspection-only and removed through Lens MCP after capture.

The first accepted compile succeeded. One Preview refresh overlapped a second
editor reset and produced five `QSslSocket` destroyed-signal warnings plus
`Avatar URL is empty`; that attempt was rejected rather than hidden. A later
separate bounded Preview run returned `errors: []`, no W/F/E lines, and exact
current logs `CLIENT_CONFIGURED` followed by `CHANNEL SUBSCRIBED`. This proves
the Lens client can join with the replacement publishable key, but Task 3 is
not yet eligible for commit and bidirectional Gate 0 remains unclaimed.

**Pre-commit review corrections in progress**

Root diff inspection found that removing the inspection package had left its
`AiPreviewAgent Handler`/`AgentInspectScript` scene entities serialized with a
dangling package reference. Independent preliminary reviews also found a
prototype-key duplicate-ID bypass for `__proto__`, a destroy/terminal inbound
race, overlapping point/ack send paths rather than one outbound FIFO, and Lens
color approximations rather than the fixed hex palette. The single MCP writer
is removing the inspection root, adding red/green duplicate/FIFO coverage,
latching terminal state before teardown, guarding inbound traffic, applying
the exact palette through source and MCP, and will rerun compile plus Preview.
No Task 3 review pass or commit is claimed before that correction loop closes.

The correction loop then landed without expanding product scope. The exact
inspection root was deleted through Lens MCP and all supplied inspection
names/IDs plus the temporary package were absent from the saved scene. Destroy
now latches terminal/subscribed state synchronously, inbound handling ignores
post-terminal or pre-subscription traffic, and one bounded `ProbeSendQueue`
serializes every point and acknowledgement send with maximum concurrency one.
The guess-ID set now has a null prototype and uses own-property checks.
Runtime/status materials and text now use the exact violet, lemon, mint, coral,
and ivory values from the approved palette.

The combined correction tests first failed because `createProbeIdSet` and
`ProbeSendQueue` did not exist. An intermediate red run caught Node 22's ban on
TypeScript parameter properties, which was corrected to ordinary fields. The
final combined parser/queue suite passed 16/16, including the later-sequence
`__proto__` replay, FIFO order, maximum concurrency one, bounded overflow, and
safe stop/drain cases.

Fresh orchestrator verification independently passed the same 16/16 Node
suite, `git diff --check`, zero inspection-residue matches, and zero missing
adjacent metadata under `Assets/Wordless/`. Lens TypeScript recompilation
returned `succeeded`. A new bounded Preview refresh reported first activity at
26 ms, `errors: []`, no capped output, and these exact current lines:

```text
[RelaySpike] CLIENT_CONFIGURED
[RelaySpike] CHANNEL SUBSCRIBED
```

The already-running ordinary browser simultaneously moved from subscribed to
`CONNECTED` and its received message/byte counters increased from genuine
Lens-origin traffic. That corroborates the Task 3 sender but is not substituted
for Task 4's timed capture, invalid matrix, RTT run, restart reproduction, or
binary Gate 0 decision. Final Task 3 specification and quality verdicts remain
pending before staging.

Independent final Task 3 specification and quality reviewers each returned
PASS with no Critical, Important, or Minor findings after inspecting the final
source, scene diff, metadata inventory, tests, and prompt-log evidence. Task 3
is therefore eligible for its scoped commit. This remains Lens Studio Preview
evidence only and makes no hardware, latency, security, persistence, scale, or
Gate 0 claim.

## 2026-08-26 — Task 4 Gate 0 realtime decision

Task 3 was committed as `91ef26f` (`spike: add Supabase Realtime Lens
probe`) after its staged credential, generated-state, inspection-residue, and
missing-metadata checks all returned zero. Task 4 then ran as a serial live
integration gate with no product/game implementation in flight.

**Preflight and honest capture attempts**

The clean preflight passed the browser's 19/19 Vitest cases and production
build, Lens TypeScript recompilation, fresh Preview subscription, and two
unauthenticated public-channel joins. The browser did not reach `CONNECTED`
until Lens-origin traffic arrived.

macOS display-level captures returned wallpaper instead of the active apps.
Window-specific H.264 recording recovered both browser and Lens Studio, but
the Lens Preview GPU subregion remained frozen in that recorder even while
the live widget and counters advanced. The retained composite therefore
labels the frozen pane as unreliable and inserts actual Preview and Logger
widget grabs only at their true timestamps. Failed wallpaper, Logger
activation, direct-window, and first-composition attempts remain under the
ignored capture ledger rather than being hidden. The final evidence never
calls a held widget frame continuous video.

The first Lens-window preflight also revealed that editor selection had
returned to the ignored `SupabaseProject` Inspector despite an earlier safe
selection report. That preflight image contained the ordinary project URL and
client-safe publishable key. The exact file,
`captures/realtime-spike/preflight-lens-window.png`, was immediately deleted,
confirmed absent, and never staged or committed. Selection was forced through
Lens MCP to the `RelaySpike` scene root and verified by scene-object name
before any retained capture. No secret/service-role key, database password,
or management token was involved.

**Live application proof**

Run A recorded a fresh unauthenticated browser and Preview. A 10.0-second
measured window advanced 87 accepted messages and 10,427 bytes while the
browser stayed `CONNECTED`; the point sender was configured for a nominal
100 ms interval and the observed accepted-message rate was 8.7/s. Browser
choice 2 produced authoritative Lens `RX_GUESS` at 04:34:08 PT and an actual
mint `CORRECT` Preview state without stopping the stream.

Run B first sent choice 1 as sequence 1 / `guess-1`, producing Lens
`RX_GUESS` and actual coral `TRY AGAIN`. The unchecked Gate test door then
sent wrong-session, wrong-version, sequence-zero, stale-sequence,
out-of-range-choice, duplicate-ID, overlong-ID, string-timestamp,
unknown-kind, nine-point, and 1,223-byte inputs. Lens emitted exactly 11
`REJECTED` lines. The next ordinary sequence 2 / `guess-2` was accepted and
produced mint `CORRECT`, proving the rejects did not advance the accepted
high-water. A subsequent 10.05-second window advanced 84 accepted messages
and 10,145 bytes at an observed 8.36/s while remaining connected with no
sequence gap, terminal state, timeout, transport warning, or disconnect.

The browser then sent fifty pings at measured 250.5–253.2 ms spacing while
points continued. All 50 received their correlated Lens-origin application
acknowledgment. RTT median was 79 ms, p95 109 ms, and maximum 114 ms. The
runtime-only Gate meter counted 2,029 valid inbound/outbound messages,
241,663 valid serialized bytes, and a largest valid message of 122 bytes; the
1,223-byte malformed negative was deliberately excluded. Browser video frame
hashes found no freeze longer than 0.2 seconds. No guess or acknowledgment was
dropped, so the 5 Hz conditional retest was not needed.

Run A and one later tail contained three unrelated Lens Studio Quest/ADB
device-discovery warnings. They neither came from RelaySpike/Supabase nor
coincided with a channel or application failure. Run B and both restart
verification tails returned `errors=[]`; the evidence deliberately does not
claim that the editor was globally warning-free.

**Cold restart and capture integrity**

The original isolated Chrome and Vite processes were terminated and ports
9334/5175 confirmed empty. Fresh Vite, Lens recompile/Preview, and a new
isolated browser then reproduced unauthenticated joins, a moving 10.2-second
stream, authoritative `RX_GUESS`, and actual mint `CORRECT` with no Lens
runtime error. The aligned 45.066-second 1920×1080 composite is
`captures/realtime-spike/restart-aligned-composite.mov`, SHA-256
`356a3b8043e8bdd1ccdfab71818266331079345b2ec35b4371342f27ddfb378a`.
Raw capture durations and hashes, exact timestamps, metrics, and the capture
limitation are recorded in `docs/evidence/realtime-spike.md`; all media remains
ignored and uncommitted.

**Post-capture key closure and smoke**

After the client-safe value appeared in the deleted preflight capture and the
private tool transcript, Codex created a new publishable key named
`wordless_runtime`. It copied the value only inside an exact dashboard-row
scope, updated ignored `web/.env.local`, and used an ignored, mode-600,
short-lived Editor-code file so Lens MCP received only a file path rather than
the credential in its call. Value-blind editor results confirmed exactly one
native asset, populated URL/token, publishable shape, and successful
`Project.save()`. The temporary file was first scrubbed back to its placeholder
and then removed; the clipboard was cleared. A direct attempt to use the Lens
Editor Clipboard module failed safely because that module permission was not
granted and changed no asset.

The first post-rotation browser assertion had an over-escaped metrics regular
expression; a sanitized DOM read showed the page itself was already live. A
second 2.5-second check then observed zero new messages because that browser
had joined before Lens refresh and retained the publisher's old sequence
high-water. No code or config was changed. Repeating in the correct order—Lens
refresh followed by a genuinely fresh browser—passed: Lens compiled and
subscribed with `errors=[]`, the browser reached unauthenticated
`CONNECTED/live`, and its metrics advanced from 250 messages / 30,206 bytes
to 271 / 32,744 in 2.5 seconds. All three controls remained enabled and no
login surface, sequence gap, or terminal state appeared. The superseded
`wordless_gate0` publishable row was then irreversibly deleted under an exact
row/name guard; the new publishable row and untouched default secret row
remained.

During dashboard cleanup, one overly broad read-only Chrome tab enumeration
returned unrelated tab titles and URLs to the private tool transcript. It did
not read page bodies or credential values. All later browser reads were exact
Supabase-tab, row, and sanitized-field queries. Chrome's local `Allow
JavaScript from Apple Events` option was used for these bounded dashboard
actions; automated attempts to switch it back off could not activate the
owner's main Chrome window in the current macOS UI session, so that local
hardening cleanup remains explicitly unclaimed rather than silently asserted.

**Independent review correction**

The live operator initially returned GO, but the required independent review
rejected that conclusion on two literal criteria. First, the measured accepted
rates were 8.70/s and 8.36/s rather than the required maintained 10 Hz; a
nominal 100 ms timer does not substitute for observed delivery. Second, the
window recorder froze the Lens Preview GPU pane, and two timestamped widget
stills cannot establish the no-visible-freeze-over-one-second threshold even
though the browser video and runtime logs continued. The fully measured run
also used the now-revoked pre-rotation key; the 2.5-second post-rotation smoke
did not repeat the rejection, RTT, authority, and restart matrix.

Task 4 therefore remains **NO-GO / RETEST REQUIRED**, the plan checkboxes are
reopened, and Task 5 remains blocked. The first attempt, failed capture modes,
metrics, and rotation smoke stay in the record. Remediation is limited to the
realtime spike: make actual accepted point cadence meet 10 Hz, collect
continuous actual Preview frames with Lens MCP, then rerun every Gate 0 step
from a fresh active-key state. No game work has begun.

**Cadence remediation and active-key Gate 0 rerun**

The remediation stayed inside the spike. Red tests first established that a
simple timer could burst multiple sends after a delayed callback and that
sequence numbers assigned before the shared FIFO could describe enqueue time
rather than actual wire-start order. `ProbeCadence` now advances one
phase-locked 100 ms deadline at a time, emits at most one draft per callback,
and rebases after two or more missed deadlines. A matching
`ProbePointStartGate` applies the same rule at actual FIFO send start, while
`ProbeWireSequencer` allocates sequence only after that gate releases. A
750 ms blocked-send regression proves starts occur at 0, 750, 850, …, 1,350 ms
rather than bursting at 750 ms. Rejected/stopped drafts allocate no wire
sequence. The bounded capacity-eight FIFO and fail-closed behavior remain.

The first measurement review then found that callback-time evidence and a
separately seeded frame sampler could not prove the same epoch. A second red/
green loop added `ProbeUpdateGapSampler`: at `SUBSCRIBED`, one exact `nowMs`
starts both point cadence and update-gap sampling. It records every consecutive
`UpdateEvent` gap from ordinal 1, emits one numeric-only
`UPDATE_GAP_MAX sampleCount=N maxGapMs=M spanMs=S` line after at least ten
seconds, and terminates on an invalid or reversing clock. Point telemetry is
numeric-only `POINT_START ordinal=N monotonicMs=M`; it contains no payload,
coordinate, project, or credential value. Final pure regression coverage
passed 30/30, including generation cadence, actual-start cadence, sequencing,
finite-clock failure, shared epoch, parser, replay, FIFO, and teardown cases.
Independent remediation specification and quality reviewers returned PASS.

The accepted evidence rule is `T = 100 ms`, same-epoch maximum update gap
`F < T`, and observation allowance `B = F + 1 ms`. Fresh ordinals 1–101 must
span `10,000..10,000+B ms`; a prospectively armed mid-run ordinal window must
span `10,000-B..10,000+B ms`. This permits one frame of observation error but
does not permit retrospective favorable-window selection.

Fresh active-key Run A logged `CLIENT_CONFIGURED` at 08:10:24.658 PT and
`CHANNEL SUBSCRIBED` at 08:10:25.100 PT. Lens ordinals 1–101 were contiguous
over 10,021 ms with `F=45`, `B=46`, and no cadence diagnostics. Browser
sequences 1–101 were contiguous over 10,019 ms source time and 10,017.6 ms
arrival time, remained `CONNECTED`, and had no gap or terminal state. Choice 2
caused Lens `RX_GUESS` at 08:10:39.296 PT and actual mint `CORRECT`.

Fresh Run B first accepted choice 1 as valid outbound sequence 1, logged
`RX_GUESS`, and showed actual coral `TRY AGAIN`. The eleven specified malformed
candidates—including the 1,223-byte oversized input—were sent through the
unchecked Gate door. Lens emitted exactly eleven `REJECTED` lines; browser
valid-outbound count stayed at one and the accepted high-water did not move.
The next ordinary sequence 2 was accepted, produced a second `RX_GUESS`, and
showed actual mint `CORRECT`. A prospectively armed ordinal/sequence
1,855–1,955 window had Lens span 10,017 ms, browser source span 10,016 ms,
arrival span 10,009.5 ms, and no diagnostics, gap, or terminal state. Run B's
same uninterrupted epoch had already emitted
`UPDATE_GAP_MAX sampleCount=333 maxGapMs=66 spanMs=10010`, establishing
`F=66`, `B=67` before that later window. The prospective helper used Run A's
stricter already-passing `B=46` exactly as predeclared. All three frozen spans
pass both `[9,954, 10,046] ms` for the armed bound and `[9,933, 10,067] ms`
for Run B's same-epoch bound; this establishes cumulative cadence but, as the
later quality correction below records, not exact-window update health.

Fifty pings began at 250.4 ms minimum, 252.3 ms median, and 253.3 ms maximum
spacing while points continued. Exactly 50/50 correlated application
acknowledgments arrived; median RTT was 86 ms, p95 106 ms, and maximum 111 ms.
The meter counted 2,891 valid inbound and 52 valid outbound messages, 2,943
total valid messages, 351,902 valid serialized bytes, and a 122-byte largest
valid message. The 1,223-byte malformed negative remained excluded. A
496-point/49,479.5 ms tail had no sequence gap, terminal state, or
discontinuity.

For visible continuity, four accepted sets used 22 direct Lens Studio MCP
Preview screenshots targeted every 500 ms. Their spans were 10,483, 10,491,
10,499, and 10,490 ms; worst completion gaps were 545, 517, 516, and 518 ms;
all 22 images in every set had distinct hashes. Continuous browser recordings
fully enclosed each set. These are timestamped real Preview frames, not
continuous Preview video. Root visually confirmed cursor movement and the
actual coral/mint result states.

The restart terminated the old Vite/Chrome processes and confirmed ports
5175/9334 empty before launching a new isolated browser profile and fresh
Preview. Lens logged `CLIENT_CONFIGURED` at 08:22:24.111 PT and
`CHANNEL SUBSCRIBED` at 08:22:24.457 PT. Ordinals/sequences 1–101 were
contiguous with `F=48`, `B=49`, Lens span 10,015 ms, browser source/arrival
spans 10,012/10,012.1 ms, and no gap or terminal state. Choice 2 caused
`RX_GUESS` at 08:22:40.652 PT and actual mint `CORRECT`. The fresh processes
were terminated and both ports again confirmed empty.

The retest ledger remains explicit: paused Preview yielded no epoch; ordinary
Preview refresh retained old ordinals; a long editor-code sampler timed out;
several samplers failed recording overlap; one 40-second recorder ended before
the late sampler; and one prolonged non-accepted session received WebSocket
close 1006 after 5,317 messages. That close did not repeat in fresh Run A, Run
B, or restart, so it does not satisfy the plan's repeat-disconnect NO-GO rule.
No failed attempt supplied accepted evidence.

Root independently recomputed the four accepted browser-video and screenshot-
manifest SHA-256 values, checked H.264 metadata/durations, confirmed 22/22
unique frames in every set, and rescanned retained captures. Credential-pattern
matches were zero. The repository remained private, ignored local config and
captures remained untracked, the Lens credential asset was never inspected,
and no preview sample is described as hardware or a device test. Exact hashes,
metrics, failed-attempt adjudication, and claim boundaries are recorded in
`docs/evidence/realtime-spike.md`.

Final quality review found that the timestamp manifests named the Preview PNGs
but did not cryptographically bind their contents. Root independently sorted
each set's frame filenames, SHA-256 hashed every file, concatenated only the
64-character digests one per line, and SHA-256 hashed that stream. All four
sets remained 22/22 unique. The resulting aggregates were
`bb4734cfc1782ff90bffb473d8730675433d1a86b812f001912bbd615c436c1d`
(Run A),
`315f331a715cedbc248b92ff1fad4e3ddcebdb007bc2bfa5f2f08515f30a88e6`
(Run B matrix),
`19a3cfda315569d89b4873878f2da2b57eedfceab74d988453921c66dc067e11`
(Run B pings), and
`290e2a81f0cfaf8488b15ed65e4e0fb735162f6a5656ab19f0e086f8cae26f32`
(restart). The final real Logger screenshot independently matched SHA-256
`83f608d0c9da877df02c8b2bca5e96551dfb454f43e480d339aff181fb82ac70`.
The evidence record now binds both capture timing and frame contents.

The corrected active-key matrix therefore returns **Gate 0 GO**. This freezes
ordinary hosted Supabase Realtime public Broadcast as the implementation
transport and unblocks Task 5; it does not broaden the approved product or
support any production, hardware, security, persistence, scale, or platform-
latency claim.

Final root verification did not hide a late failed attempt. TypeScript first
recompiled successfully, but immediate log collection caused two rapid Preview
resets; the canceled old epoch emitted `CHANNEL_ERROR` before the replacement
epoch subscribed. After pausing and recompiling, a separate fresh epoch reached
`CLIENT_CONFIGURED` but then emitted `CHANNEL_ERROR` before subscription and
also surfaced unrelated Quest/ADB discovery warnings. That entire attempt was
rejected. A value-blind ordinary browser client then subscribed successfully,
independently confirming that the normal Free project and active publishable
configuration were awake. The next ordinary fresh Preview run logged
`CLIENT_CONFIGURED` at 08:39:33.227 PT, `CHANNEL SUBSCRIBED` at
08:39:33.704 PT, active point traffic, and
`UPDATE_GAP_MAX sampleCount=330 maxGapMs=79 spanMs=10030`, with no RelaySpike
error or channel warning in that epoch. Preview was then paused. This is an
initial-join failure followed by a distinct clean run, not a second connected-
channel disconnect, and it is retained for independent review alongside the
earlier close-1006 attempt.

**Exact-window cadence review reopened Gate 0**

A deeper evidence audit challenged the post-rejection Run B cadence proof.
Root confirmed that Run B's own uninterrupted epoch emitted
`UPDATE_GAP_MAX sampleCount=333 maxGapMs=66 spanMs=10010` before the later
ordinal 1,855–1,955 window, and that the frozen Lens/browser spans pass both
the prospectively declared stricter `B=46` envelope and the same-epoch `B=67`
envelope. Specification review considered that conservative proof sufficient
under Task 4's cumulative 10 Hz wording and the written mid-run procedure.

Independent quality review produced a valid counterexample: the one-shot gap
sampler had stopped long before ordinals 1,855–1,955, and a phase-locked sender
can suffer one `UpdateEvent` gap above 100 ms followed by shorter intervals
while retaining a passing cumulative span. Because adjacent intervals were
diagnostic only, the current artifacts cannot rule that out. Root accepted the
stricter finding, reopened Task 4 Steps 4/7/8, changed the evidence result back
to **RETEST REQUIRED**, and kept Task 5 blocked.

The correction remains evidence-only: retain the phase-locked sender/FIFO,
add finite/reversal-fail-closed numeric telemetry for the maximum Update gap
between each actual point start, then prospectively freeze and rerun the one
missing post-rejection 101-point window. The maximum carried by exact ordinals
`start+1..end` covers the same 100 intervals; require it below 100 ms and
require the already-predeclared `B=46` cumulative envelope. No prior failed
attempt or favorable completed window may substitute.

**Exact-window telemetry and decisive Run B correction**

The narrow correction began with a red/green loop around the evidence gap,
without changing the product or transport. The first focused run failed three
assertions because the persistent tracker did not yet exist and point-start
telemetry did not carry an interval maximum. `ProbeUpdateGapTracker` now starts
from the same subscription clock as cadence generation, observes every later
`UpdateEvent`, preserves its last observation when an interval maximum is
drained, and fails closed on a non-finite or reversing clock. Every actual
point start logs only numeric `ordinal`, `monotonicMs`, and `updateGapMaxMs`
fields. Thus the maxima on ordinals `start+1..end` cover exactly the 100 update
intervals associated with a fixed 101-point window. The focused suite passed
16/16 after implementation; the complete core suite passed 32/32, the browser
suite passed 19/19, the production browser build passed, and the scoped diff
check passed.

Lens TypeScript compiled successfully. A clean live preflight then emitted
`CLIENT_CONFIGURED`, `CHANNEL SUBSCRIBED`, and point-start lines containing
finite update-gap values; the collected runtime error array was empty. The
decisive post-rejection run used a fresh isolated Vite/browser pair armed at
zero before a true Lens Preview refresh. No authentication surface appeared.
Lens subscribed at 13:58:35.381 PT.

The ordinary wrong choice produced `RX_GUESS` at 13:58:56.111 PT and actual
coral `TRY AGAIN`. The unchecked test door sent the same eleven malformed
candidates, including a 1,223-byte message; Lens emitted exactly eleven
`REJECTED` lines from 13:59:08.780 through 13:59:10.310 PT, while valid browser
outbound count stayed at one. The next ordinary valid choice used sequence 2,
produced `RX_GUESS` at 13:59:15.647 PT, advanced valid outbound count to two,
and changed the actual Preview widget to mint `CORRECT`. No rejection poisoned
the accepted high-water or continuity state.

The prospective helper had predeclared `B=46` before the outcome was known.
It then captured contiguous Lens ordinals and browser sequences 958–1,058.
The first Lens point started at monotonic 96,298 ms and the last at 106,298 ms,
for an exact 10,000 ms source span and 10.000 Hz. Browser source span was also
10,000 ms at 10.000 Hz; browser arrival span was 10,001.5 ms at approximately
9.9985 Hz. The carried interval maxima on ordinals 959–1,058 produced exact
`F=48 ms`, hence `B=49 ms`. All three spans passed both the frozen
`[9,954, 10,046] ms` envelope and the independently derived
`[9,951, 10,049] ms` envelope. There were zero cadence diagnostics, sequence
gaps, terminal states, or non-monotonic observations. Root independently
reran the exact-window auditor against the post-recovery Lens log boundary;
it reproduced 101 indexed points, 100 transitions, `F=48`, both envelope
passes, and a combined pass.

The browser ended `CONNECTED` with 2,528 valid Lens-origin messages and two
valid browser-origin messages: 2,530 total, 304,558 serialized bytes, and a
122-byte largest valid message. The post-window Lens tail contained no
warning, error, rejection, send, channel, or update-gap diagnostic. Preview
was paused after capture, the isolated processes were terminated, and ports
5175/9334 were empty.

The decisive browser recording is
`captures/realtime-spike/retest-exact-runb-window-browser.mov`, a 59.990-second
silent H.264 recording at 1880x2250, SHA-256
`2a0d4815ac4162dd64254138ea9deceaf9f2127b850b313594f4286dc16e240e`.
Its manifest SHA-256 is
`036694602aa601c8c8a6c426665e10a67d4dcc5e0d4f051aa5b28d6551a94ace`.
A 22-frame direct MCP Preview sample fell wholly inside that exact browser
window, spanned 9,448 ms, had 431–484 ms completion gaps, and contained 22/22
distinct frames with visible cursor movement. It is supplemental alignment
evidence, not a replacement for the four already accepted greater-than-ten-
second Preview samples. Using the documented aggregate formula—sorted files,
each file's 64-character digest alone, one digest per line with a final
newline—its frame-content aggregate is
`7f36b44a91337254a7644a8a3baa65a72bfb52abf75107f053409395eb890e8d`.
The operator's initially reported `e3f8...` value was reproducibly traced to
hashing full `shasum` output lines including filenames; all 22 individual
frame hashes were unchanged. The exact wrong/correct stills and Logger panel
are bound by hashes in the evidence record.

This prospective exact-window run resolves the independent review's only
remaining objection. Gate 0 returns to **GO**, ordinary hosted Supabase
Realtime public Broadcast remains the frozen implementation transport, and
Task 5 is unblocked. The proof remains one Lens Studio Preview client and one
ordinary browser; it is not hardware footage, a device test, or evidence for
production, security, persistence, scale, or platform latency.
