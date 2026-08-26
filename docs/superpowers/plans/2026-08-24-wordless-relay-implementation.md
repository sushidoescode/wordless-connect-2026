# WORDLESS Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and prove a polished one-SPECS-painter/one-browser-guesser
experience in which a live spatial stroke crosses to the browser, a browser
guess causes the authoritative Lens result, and the exact stroke locks into a
shared session glyph.

**Architecture:** A pure `WordlessEngine` and `RoundStore` own round state in
the Lens. An ordinary hosted Supabase Realtime public Broadcast adapter carries
versioned, bounded messages over one session-qualified channel; the browser
renders public state and submits choices but never decides correctness.
Lens-only world points are projected into quantized normalized coordinates for
transport, while both surfaces deterministically normalize the same points
into the result medallion.

**Tech Stack:** Lens Studio 5.23.1 currently installed (official hackathon
minimum 5.22), Specs Base Template with `targetPlatform: Spectacles`,
TypeScript, Spectacles Interaction Kit, Lens Studio MCP/CLAD tools,
the installed Lens `SupabaseClient` 2.1.0 package over built-in
`SupabaseModule`, ordinary hosted Supabase Realtime Broadcast, Vite vanilla
TypeScript, `@supabase/supabase-js`, Vitest, Node 22 built-in tests, and
Playwright Chromium. The Snap Cloud Alpha Plugin is not a runtime dependency.

**Spec:**
`docs/superpowers/specs/2026-08-24-wordless-relay-design.md` plus the binding
`docs/superpowers/specs/2026-08-25-wordless-relay-standard-supabase-amendment.md`

**Review status:** Reconciled on 2026-08-25 after an independent Fable 5
`APPROVE WITH REQUIRED CHANGES` review, then reconciled again after the owner
approved the normal hosted Supabase amendment. The Specs baseline is open and
Task 1 is complete at commit `89bcd23`; Task 2 is complete and Task 3 is next.
No bidirectional realtime traffic or Gate 0 GO is claimed.

## Global Constraints

- Week 3 prompt: “Build a spatial experience that connects people, platforms,
  or everyday communication workflows.”
- Submission deadline: Sunday 2026-08-30 PT; the release checklist treats
  23:59:59 PT as the absolute organizer-clock cutoff and targets an earlier
  lock.
- Judging: 50% CLAD execution, 25% UX, 25% creativity/usefulness.
- Initial proof is Lens Studio Preview, never hardware footage or a device test.
- One Specs/Lens painter plus one ordinary browser guesser is the minimum
  participant model. Never restore the rejected remote-two-Spectacles design.
- No game feature work begins until Gate 0 proves genuine bidirectional
  Lens↔browser traffic and commits the evidence.
- The Lens validates every guess. The browser never publishes correctness.
- `WordlessEngine` plus Lens `RoundStore` are the state authority; views are
  write-only, and `applyRound` is the only authoritative round creation/reset
  door. Only `setCounterpartReady` may release that already-applied round's one
  start after the presence/reset-ack gate. The
  browser may invalidate/hide an incomplete projection into `reconnecting`,
  but that invalidation cannot authorize or populate a round. Only an accepted
  Lens-authored reset may authorize/bind a successor round ID. A policy-approved
  Lens-authored start may populate and activate that reset-authorized ID, or
  establish the initial/new-painter-epoch round when no product round is bound.
- Files under `Assets/Wordless/Scripts/Core/` use Node 22's erasable TypeScript
  subset: no decorators, enums, namespaces, parameter properties, or runtime
  Lens globals. The same source must execute unchanged in Node tests, Vite, and
  Lens Studio. This machine has Node 22.14, 24.16, and 25.8 installations;
  Task 1 records the executable and version resolved in the implementation
  shell. Every direct Node test keeps `--experimental-strip-types`: it is
  required by 22.14 and was independently smoke-tested as accepted by all three
  installed versions.
- Lens world points remain local. Transport points are integer pairs in
  `[0, 1000]`, capped at 128 accepted points per stroke and sent no faster than
  10 Hz.
- Gate 0 uses a public Supabase Broadcast channel and performs no Snap ID-token
  sign-in. The client-safe project key is transport configuration, not a user
  session or security boundary.
- Do not carry the Alpha-only `heartbeatIntervalMs: 2500` workaround into the
  normal project. Use the installed clients' compatible default unless Gate 0
  proves that an explicit override is required, then record the exact value and
  evidence before retaining it in either client.
- Supabase Free-plan limits observed on 2026-08-25 are 200 concurrent Realtime
  connections, 100 messages per second, 100 channel joins per second, and a
  256 KB Broadcast payload. WORDLESS keeps the stricter measured targets of two
  clients, one channel each, at most 10 Hz, and every product message below
  1 KB.
- A Free project may pause after low activity. Every live preflight and capture
  rehearsal wakes/resumes the project, confirms Realtime plus public-channel
  access, and reruns the two-way application probe before claiming readiness.
- Browser URL and publishable/legacy anon key stay in ignored local config. A
  service-role key, database password, user token, or session token is never
  written to source, logs, captures, commits, or chat output.
- Reference images under `docs/references/visuals/` are non-shipping
  inspiration. Never import, trace, composite, texture-map, or present them as
  working-product imagery.
- Production palette is fixed: violet `#8B5CF6`, lemon `#FFD65A`, mint
  `#73E6AE`, coral `#FF786A`, ivory `#FFF6E8`, and browser plum `#200B2B`.
- Lens visuals must survive additive compositing; no critical contrast may
  depend on black surfaces, dark glass, shadows, or subtle transparency.
- No camera, microphone, recognition, generative AI, accounts, persistence,
  multiple guessers, free-text guesses, particles, occlusion, or complex spline
  system enters this plan.
- Scene and editor mutations use Lens Studio MCP tools. Never call the Lens
  Studio server through raw HTTP, `curl`, `fetch`, or `wget`.
- Every committed Lens user asset or project package includes its adjacent
  Lens-generated `.meta`. Before each Lens-task commit, inspect the staged
  names and require every new/modified `Assets/**` or `Packages/**` primary
  file and companion metadata to travel together; an orphan on either side
  blocks the commit. `Cache/`, `Support/`, `PluginsUserPreferences/`, and
  `Workspaces/` remain excluded.
- Every task returns its prompt/result and fresh validation evidence to the
  orchestrator. The orchestrator is the sole writer of `docs/prompt-log.md`
  and the sole owner of staging/committing, so parallel lanes cannot race on
  the log or git index.
- The GitHub repository remains private until the owner explicitly authorizes
  the public-release gate.

## Current primary references

- Hackathon target, schedule, deliverables, and rubric:
  <https://lenslist.co/clad-summer-hackathon>
- Snap `SupabaseModule`, documented for any Supabase project:
  <https://developers.snap.com/lens-studio/api/lens-scripting/classes/Built-In.SupabaseModule.html>
- Supabase Realtime Broadcast:
  <https://supabase.com/docs/guides/realtime/broadcast>
- Supabase Realtime public-channel settings:
  <https://supabase.com/docs/guides/realtime/settings>
- Supabase Realtime limits:
  <https://supabase.com/docs/guides/realtime/limits>
- Supabase Free-project pausing:
  <https://supabase.com/docs/guides/platform/free-project-pausing>

The installed Lens Studio version, `SupabaseClient` package source, generated
Lens/Editor declarations, and MCP asset types are authoritative for
implementation. The vendor package currently exposes its module at
`SupabaseClient.lspkg/supabase-snapcloud`; that historical vendor-authored
import path may remain exactly as installed, but no user-authored adapter,
status, environment variable, evidence label, or product claim calls the
service Snap Cloud.

## Agent-native execution model

This plan is optimized for LLM workers, not human sprint pacing:

1. Measure progress by evidence gates and independently reviewable commits, not
   hours or story points.
2. Give implementation tasks a fresh implementer and two reviews:
   specification compliance first, code/runtime quality second. Evidence-only
   integration Tasks 4, 12, and 16 may use one combined independent review
   because their gates already require multi-source proof.
3. Parallelize only after interfaces freeze. Browser-only files, pure core
   files, and evidence review may have separate owners. The project manifest,
   package state, scene graph, shared protocol, `docs/prompt-log.md`, git index
   and commit sequence, and active Preview session each have one writer at a
   time. During parallel red/green work, each lane runs only its own test file;
   repository-wide globs run only at serial integration gates.
4. Use the agent speed dividend for judge-facing iteration. After Gate 1, no
   new capability is allowed. At least three documented polish loops are
   mandatory: one visual-craft loop in Task 13, one silent-comprehension loop
   in Task 14, and one capture/evidence loop in Task 16. Each records an
   observe → smallest-change-or-retain decision → fresh-verification cycle in
   `docs/evidence/polish-ledger.md`, including date, input capture/hash,
   reviewed source revision, reviewer composition, observed defect, exact change
   or retain rationale, evidence, and outcome. A no-change row counts only
   after independent review and fresh verification. A later edit to any
   runtime/artifact within that row's reviewed scope invalidates it and forces
   a fresh review/verification; unrelated docs-only commits do not. The
   release-candidate commit and optional hosting are blocked until all three
   current rows pass, except that if Task 1 proves the live submission form
   requires a companion URL, the smallest hosting setup may happen earlier and
   must be re-verified after all rows pass; the majority of post-Gate-1 cycles go to these
   judge-facing loops. To avoid a circular self-referencing commit hash, each
   source revision is the current base commit plus a SHA-256 manifest of every
   reviewed in-scope file; later gates recompute that manifest.
5. Never trade verification for speed. “Implemented,” “compiled,” “looks
   right,” or an agent report is not runtime evidence.
6. When an agent finds a design contradiction, it stops the affected lane,
   records evidence, and asks the orchestrator. It does not silently redesign.

### Safe concurrency after Gate 0

| Lane | Owns | Must not edit |
|---|---|---|
| Core A | `WordlessEngine`, `RoundStore`, word deck, their tests | Protocol, Lens scene, web UI |
| Core B | Stroke sampling, batching, glyph geometry, their tests | Protocol, Lens scene, web UI |
| Web | Everything under `web/` except a frozen core import | Lens files, protocol |
| Lens | Transport, interaction, views, scene through MCP | Web files, protocol |
| Review | Evidence, screenshots, claim/clarity audits | Runtime code during review |

`Assets/Wordless/Scripts/Core/Protocol.ts` is frozen by Task 5. Later changes to
it serialize all lanes and require the protocol tests to run before work
resumes.

## Planned file structure

```text
WordlessRelay.esproj                       # created from Specs Base Template
package.json
package-lock.json
Assets/
  Scene.scene
  Scene.scene.meta
  LocalOnly/                               # ignored credential assets
  Wordless/
    Materials/                             # original additive-safe materials
    Scripts/
      Core/
        Protocol.ts                        # one wire contract for Lens + web
        RoundStore.ts                      # observable state authority
        WordlessEngine.ts                  # pure transitions/validation
        WordDeck.ts                        # eight curated ASCII clue cards
        StrokeGeometry.ts                  # sampling/batching/glyph math
        GlyphTransition.ts                 # shared 2D exact-path tween
        ReceivePolicy.ts                   # pure authority/sender/sequence gate
        RecoveryCoordinator.ts             # pure single-flight recovery owner
      Transport/
        RelayPort.ts                       # transport interface
        SupabaseRelayTransport.ts          # normal-project Lens adapter
      Input/
        BrushController.ts                 # SIK drag -> drawing samples
        ReplayController.ts                # gated PLAY AGAIN interaction
      View/
        StrokeRibbonView.ts                # additive-safe procedural ribbon
        StrokeRibbonMesh.ts                # bounded crossed-quad mesh builder
        LensHudView.ts                     # roles, prompt, timer, status
        GlyphMedallionView.ts              # exact-path result view
      WordlessApp.ts                       # composition root only
Packages/                                  # complete Lens project packages
  *.lspkg                                  # exact SIK/UIKit/Supabase set observed
  *.lspkg.meta                             # required package metadata
web/
  .gitignore
  index.html
  package.json
  package-lock.json
  vite.config.ts
  playwright.config.ts
  tsconfig.json
  .env.example
  .env.production.example                 # optional hosting only
  src/
    main.ts                                # composition root only
    relay-client.ts                        # sole browser channel owner
    web-round-store.ts                     # browser event reducer
    render.ts                              # write-only DOM/canvas rendering
    styles.css
  tests/
    relay-client.test.ts
    web-round-store.test.ts
    render.test.ts
  e2e/
    wordless.spec.ts
tools/
  core-tests/
    register.mjs
    resolver.mjs
    protocol.test.mjs
    engine.test.mjs
    geometry.test.mjs
    transport-policy.test.mjs
    recovery-coordinator.test.mjs
    glyph-transition.test.mjs
  typecheck/
    check.sh
    tsconfig.preflight.json
docs/
  environment.md
  evidence/
    realtime-spike.md
    vertical-slice.md
    visual-review.md
    polish-ledger.md
    layperson-read.md
    resilience.md
    claim-ledger.md
    hosted-browser.md                      # optional hosting evidence
  submission/
    project-description.md
    video-edl.md
    release-checklist.md
  media/                                  # original programmatic/captured art
```

## Requirement coverage map

| Approved requirement | Implemented and proved by |
|---|---|
| Fresh SPECS project, current Lens packages, no hidden credential leakage | Tasks 1 and 16 |
| Real Lens↔browser connection before product work | Tasks 2–4, hard Gate 0 |
| One authoritative Lens state model and one reset door | Tasks 5–6 |
| Live bounded spatial stroke shared at a measured rate | Tasks 5, 7–8, and 12 |
| Browser choices with Lens-authoritative wrong/correct results | Tasks 6, 8–9, and 12 |
| Exact shared path becomes the result glyph on both surfaces | Tasks 6–7 and 11–13 |
| Additive-safe spatial UI and polished companion web surface | Tasks 9–11 and 13 |
| Layperson understands roles and loop within five silent seconds | Task 14, then Task 16 judge gate |
| Reconnect, malformed-message, and soak evidence; optional deployment | Task 15 and Optional Task 17 |
| Honest sub-60-second CLAD submission package | Task 16 |
| Public repo/video access and organizer confirmation | Owner-authorized Task 18 |
| LLM-speed execution without parallel file collisions | Agent-native model plus the execution graph below |

---

### Task 1: Establish the SPECS project and standard Supabase gate

**Files:**

- Create through Lens Studio: `WordlessRelay.esproj` and the complete Specs
  Base Template-authored baseline under `Assets/` (primary files plus `.meta`)
- Create/modify through Lens Studio Asset Library: required project package
  artifacts under `Packages/` (`*.lspkg` plus `.meta`, exact names observed)
- Modify only if Lens Studio legitimately adds its managed block: `AGENTS.md`
- Create: `docs/environment.md`
- Modify: `.gitignore`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Installed Lens Studio, Lens Studio MCP server, owner-selected normal
  hosted Supabase project, and its client-safe URL/key entered only at the
  explicit credential gate.
- Produces: A clean Specs Base Template project, current package/version record,
  ignored local credential location, and a Preview baseline.

- [x] **Step 1: Confirm the human/editor prerequisite before changing files**

Run:

```bash
pwd
find . -maxdepth 1 -name '*.esproj' -print
git status --short --branch
mdls -name kMDItemVersion '/Applications/Lens Studio.app'
command -v node
which -a node
node --version
```

Expected repository path is `CONNECT-2026`, branch is `main`, and Lens Studio
must report at least `5.22`; record the exact current version instead of
requiring the earlier planning observation. Record the resolved Node
executable/version rather than assuming which installed version won PATH. Then
branch explicitly:

- If no `.esproj` exists, stop with the single owner action: create/open a
  **Specs Base Template** project named `WordlessRelay` in this repository,
  then resume Task 1. Do not create a Snapchat/default template or hand-write
  the manifest.
- If exactly `WordlessRelay.esproj` exists with expected uncommitted template
  `Assets/`/`Packages/`/managed-AGENTS changes, preserve them as the intended
  Task 1 input and continue to MCP inspection. A dirty status from that fresh
  editor action is expected, not a reason to discard or overwrite it.
- If another/multiple project manifest exists, or dirty files fall outside the
  expected template plus preserved planning state, stop and report the exact
  conflict. Never delete or reset them speculatively.

- [x] **Step 2: Verify the active editor through Lens Studio MCP**

Load the available Lens Studio MCP schemas, then use their project-inspection
and scene-inspection tools. Confirm all of these from tool output:

```text
project name: WordlessRelay
template: Specs Base Template
studio major/minor: at least 5.22
targetPlatform: Spectacles
Preview simulation: SPECS/Spectacles, not Snapchat phone
scene opens without a compile or runtime error
```

If the MCP endpoint is unavailable or points at another project, stop. The hard
rule forbids substituting filesystem edits or direct server requests.

Inspect `git diff -- AGENTS.md` immediately after project creation. Lens Studio
may add/update its delimited managed block; never hand-edit inside that block.
Require the full WORDLESS custom contract from the pre-project committed file
to remain outside the managed block. If Lens replaced or truncated custom
content, read it from `git show HEAD:AGENTS.md` and restore it outside the
managed delimiters with a reviewed patch while preserving the generated block.
Record whether the file legitimately changed.

- [x] **Step 3: Install and inspect the current Supabase client package**

Through Lens Studio MCP Asset Library tooling, install or verify
`SupabaseClient`. Do not sign in through or depend on the unavailable Snap
Cloud Alpha Plugin. Inspect the active package and generated definitions and
record:

```text
SupabaseClient package version
actual import path for createClient/RealtimeChannel/SupabaseClient
whether the package itself requires `LensStudio:SupabaseModule`
available channel subscribe/send/cleanup signatures
whether createClient accepts the normal project URL and client-safe key
```

Use the installed package source under `Cache/TypeScript/Src/Packages` and
generated `Support/` definitions as the type authority. Do not modify `Cache/`
or `Support/`.

Immediately inspect `git status --short`, `rg --files Assets`, and
`rg --files Packages`. Inventory every template-authored render target,
texture, script, scene, package, and companion `.meta`. Project-local Asset
Library dependencies—including SIK/UIKit and the Supabase client package—must
remain in their Lens-authored `Packages/*.lspkg` form and be committed; never
replace them with Cache output. Record the Alpha Plugin denial as historical
failure evidence only; it is not a prerequisite and no generated editor-global
plugin state is committed.

- [x] **Step 4: Prove a credential-safe normal-project asset path**

Before the owner enters any project value, add the local directory to
`.gitignore`:

```gitignore
Assets/LocalOnly/
Assets/LocalOnly.meta
!.env.production.example
```

Use Lens Studio MCP `asset_graphql` to query `assetTypes` and require the exact
native type `SupabaseProject`; use `ExecuteEditorCode` metadata to require that
it is concrete and exposes exactly the expected editor credential fields. Fail
on an exact-name collision. Create `Assets/LocalOnly/` through the Editor API,
then create a blank native asset named `WORDLESS Supabase Project` at the Asset
root with `createNativeAsset`, move the returned asset ID to
`Assets/LocalOnly/` with `moveAsset`, and query only its ID, name, type, and
path—never GraphQL `properties`. Use the active `Support/editor.d.ts`
definition to require the editor fields `projectId`, `projectName`,
`projectUrl`, and `publicToken`; record the runtime mapping
`projectUrl -> SupabaseProject.url` plus `publicToken -> publicToken`. Call
`Project.save()` through `ExecuteEditorCode`, then prove exactly one path-only
result remains under `Assets/LocalOnly/`. If directory creation, asset
creation, move, save, field-name inspection, or final path proof fails, record
an immediate Task 1/Gate 0 NO-GO and stop. Do not improvise a script constant,
committed JSON, raw request, or another credential container.

Only after that blank-asset proof passes, stop at the explicit owner action:
create or select the ordinary hosted Supabase project `wordless-relay`, ensure
Realtime is enabled and **Allow public access to channels** is enabled (or
record the dashboard's exact current wording), then paste the project URL and
client-safe publishable key into the asset Inspector. If the Lens package later
rejects the publishable key, the owner may replace it with the supported legacy
anonymous public key; Gate 0 records which public key type actually worked.

After the owner confirms entry, run a credential-safe `ExecuteEditorCode`
check that filters the active model's `project.assetManager.assets` to the one
asset named exactly `WORDLESS Supabase Project` for which
`isOfType('SupabaseProject')` is true under `Assets/LocalOnly/`, and reduces the
two credential fields inside editor code to booleans. Return only count, type,
path, the four literal field names, `projectUrlPopulated`, and
`publicTokenPopulated`; never return, print, log, serialize, or capture either
string value. Follow with a path-only GraphQL query and never select
`properties`. The browser later receives the same client-safe values only
through ignored `web/.env.local`.

- [x] **Step 5: Record concrete environment evidence**

Write `docs/environment.md` with the actual observed values and these fixed
sections:

```markdown
# WORDLESS environment record

## Editor and target
- Lens Studio version: record the exact `mdls` and MCP value
- Template: Specs Base Template
- Target platform: Spectacles
- Preview mode: record the exact editor label
- Node executable/version: record `command -v node` and `node --version`

## Installed packages
- SupabaseClient: record the exact Asset Library/package value
- SupabaseModule: built-in module; record the exact observed API/signatures
- Spectacles Interaction Kit: record the exact package value

## Supabase Realtime gate
- Alpha denial evidence: owner screenshot recorded; not treated as a pass
- Native SupabaseProject authoring/move/save: record the MCP result
- Normal project: owner-created project named wordless-relay
- Realtime/public channels: record exact dashboard wording and later join proof
- Client key type: publishable or legacy anonymous; record only the type
- Credential asset path: record the exact ignored path under Assets/LocalOnly
- Free-plan limits/pause preflight: record the current documented values
- Secrets committed or logged: no

## Baseline
- TypeScript compile result: record the tool result
- Preview runtime result: record the tool result
- Logger errors: record the integer count
```

Every “record” instruction is replaced by the observed value before the file is
staged; instructional text never enters the environment record commit.

- [x] **Step 6: Inspect the live Week 3 submission surface early**

Open the actual Week 3 submission form read-only and add a `Submission fields`
section to `docs/environment.md` listing every currently required field. At
minimum, cross-check the official requirements for a video under 60 seconds, a
public repository link, an annotated CLAD prompt log, and English-language
materials. Record whether the live form additionally requires a published Lens
link or any field absent from the rules. If the form is login-gated, record
that exact limitation and alert the owner; do not guess. The repository remains
private during development, but the release checklist must treat the
owner-authorized private→public change as mandatory before submission.

- [x] **Step 7: Verify the empty-project baseline**

Use the Lens Studio compile tool, then the Preview run/log collection tool.
Expected: compile succeeds, Preview starts, and Logger shows zero project
runtime errors. A successful compile without Preview evidence fails this step.

- [x] **Step 8: Commit the verified environment**

```bash
git add .gitattributes .gitignore AGENTS.md WordlessRelay.esproj Assets Packages docs/environment.md docs/prompt-log.md
git diff --cached --check
git commit -m "chore: establish WORDLESS SPECS environment"
```

Before commit, inspect `git diff --cached --name-only`: it must contain the
complete observed baseline and all asset/package meta pairs, nothing under the
ignored `Assets/LocalOnly/`, and nothing under `Cache/`, `Support/`,
`PluginsUserPreferences/`, or `Workspaces/`. Record committed project packages
separately from editor-global prerequisites in `docs/environment.md`.

Do not stage `Assets/LocalOnly/`, `Cache/`, `Support/`, editor preferences, or
generated workspace state.

### Task 2: Build the browser half of the bidirectional spike

**Files:**

- Create: `web/package.json`, `web/package-lock.json`, `web/index.html`
- Retain/modify from scaffold: `web/tsconfig.json`, `web/.gitignore`
- Use but do not commit: `web/.env.local`
- Create: `web/src/probe-protocol.ts`, `web/src/relay-probe.ts`
- Create: `web/src/main.ts`, `web/src/styles.css`
- Create: `web/tests/probe-protocol.test.ts`
- Delete from scaffold after inspection: generated Vite/TypeScript logo assets,
  `web/src/counter.ts`, and `web/src/style.css`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: normal Supabase project URL/client-safe public key from ignored
  `web/.env.local`,
  fixed probe session `WAVE42`, broadcast event `wordless-message`.
- Produces: A local page that visibly receives point batches, sends guesses and
  pings, shows channel state, and reports bytes/messages/RTT.

- [x] **Step 1: Scaffold the smallest typed browser**

```bash
npm create vite@latest web -- --template vanilla-ts
npm --prefix web install
npm --prefix web install @supabase/supabase-js
npm --prefix web install --save-dev vitest
```

Set scripts to:

```json
{
  "scripts": {
    "dev": "vite",
    "test": "vitest run",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

Commit the generated lockfile; it is the exact dependency version authority.
Run `rg --files web/public web/src` and inspect every scaffold
asset before deleting the generated Vite/TypeScript logos, `counter.ts`, and
`style.css`. The committed probe must contain no template branding or unused
public asset. The vanilla-ts scaffold currently produces one `tsconfig.json`
and no `vite.config.ts`; record the observed shape rather than creating a
framework-template config split.

- [x] **Step 2: Write the failing probe-protocol tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseProbeMessage, topicFor } from '../src/probe-protocol'

describe('probe protocol', () => {
  it('creates one session-qualified topic', () => {
    expect(topicFor('WAVE42')).toBe('wordless-relay:WAVE42')
  })

  it('accepts a bounded point batch', () => {
    expect(parseProbeMessage({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 1,
      points: [[100, 200], [300, 400]], sentAtMs: 10,
    }, 'WAVE42')).not.toBeNull()
  })

  it('rejects out-of-range and malformed data', () => {
    expect(parseProbeMessage({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 1,
      points: [[1001, 0]], sentAtMs: 10,
    }, 'WAVE42')).toBeNull()
    expect(parseProbeMessage({ v: 1, kind: 'guess', choiceIndex: 9 }, 'WAVE42')).toBeNull()
    expect(parseProbeMessage({
      v: 2, kind: 'ack', sessionId: 'WAVE42', seq: 2,
      pingId: 'p-1', sentAtMs: 10,
    }, 'WAVE42')).toBeNull()
    expect(parseProbeMessage({
      v: 1, kind: 'ack', sessionId: 'OTHER1', seq: 2,
      pingId: 'p-1', sentAtMs: 10,
    }, 'WAVE42')).toBeNull()
  })
})
```

- [x] **Step 3: Run the tests and verify the red state**

Run: `npm --prefix web test`

Expected: failure because `probe-protocol.ts` does not yet export the required
functions.

- [x] **Step 4: Implement the exact probe contract**

```ts
export type ProbeMessage =
  | { v: 1; kind: 'points'; sessionId: string; seq: number; points: [number, number][]; sentAtMs: number }
  | { v: 1; kind: 'guess'; sessionId: string; seq: number; guessId: string; choiceIndex: 0 | 1 | 2 | 3; sentAtMs: number }
  | { v: 1; kind: 'ping'; sessionId: string; seq: number; pingId: string; sentAtMs: number }
  | { v: 1; kind: 'ack'; sessionId: string; seq: number; pingId: string; sentAtMs: number }

export const topicFor = (sessionId: string): string => {
  if (!/^[A-Z0-9]{6}$/.test(sessionId)) throw new Error('invalid session id')
  return `wordless-relay:${sessionId}`
}

const isInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value)

export function parseProbeMessage(
  value: unknown,
  expectedSession: string,
): ProbeMessage | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength >= 1024) return null
  if (v.v !== 1 || v.sessionId !== expectedSession ||
      !/^[A-Z0-9]{6}$/.test(expectedSession)) return null
  if (!isInt(v.seq) || v.seq < 1) return null
  if (typeof v.sentAtMs !== 'number' || !Number.isFinite(v.sentAtMs)) return null
  if (v.kind === 'points') {
    if (!Array.isArray(v.points) || v.points.length > 8) return null
    const valid = v.points.every((point) => Array.isArray(point) && point.length === 2 &&
      point.every((axis) => isInt(axis) && axis >= 0 && axis <= 1000))
    return valid ? value as ProbeMessage : null
  }
  if (v.kind === 'guess') {
    return typeof v.guessId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v.guessId) && isInt(v.choiceIndex) &&
      v.choiceIndex >= 0 && v.choiceIndex <= 3 ? value as ProbeMessage : null
  }
  if (v.kind === 'ping' || v.kind === 'ack') {
    return typeof v.pingId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v.pingId)
      ? value as ProbeMessage : null
  }
  return null
}
```

Run: `npm --prefix web test`

Expected: all probe-protocol tests pass.

- [x] **Step 5: Build the browser relay probe**

Create one Supabase client and one channel owner. The connection core is:

```ts
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import { parseProbeMessage, topicFor, type ProbeMessage } from './probe-protocol'

export type ProbeStatus =
  | 'connecting' | 'subscribed' | 'live' | 'failed' | 'closed'

export class RelayProbe {
  private readonly client
  private channel: RealtimeChannel | null = null
  private subscribed = false
  private counterpartSeen = false
  private lastInboundSequence = 0
  private outboundSequence = 0

  constructor(
    url: string,
    publicKey: string,
    private readonly sessionId: string,
    private readonly onMessage: (message: ProbeMessage) => void,
    private readonly onStatus: (status: ProbeStatus, detail: string) => void,
  ) {
    this.client = createClient(url, publicKey)
  }

  connect(): void {
    this.onStatus('connecting', 'CONNECTING')
    this.channel = this.client
      .channel(topicFor(this.sessionId), { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'wordless-message' }, ({ payload }) => {
        const parsed = parseProbeMessage(payload, this.sessionId)
        if (!parsed || parsed.seq <= this.lastInboundSequence) return
        this.lastInboundSequence = parsed.seq
        this.onMessage(parsed)
        if (this.subscribed && !this.counterpartSeen) {
          this.counterpartSeen = true
          this.onStatus('live', 'CONNECTED')
        }
      })
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          this.subscribed = true
          this.onStatus('subscribed', 'SUBSCRIBED · WAITING FOR LENS')
        }
        else if (status === 'CLOSED') this.onStatus('closed', 'CLOSED')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.onStatus('failed', `${status}: ${String(error ?? '')}`)
        }
      })
  }

  async send(message: ProbeMessage): Promise<void> {
    if (!this.channel) throw new Error('channel not initialized')
    const result = await this.channel.send({
      type: 'broadcast', event: 'wordless-message', payload: message,
    })
    if (result !== 'ok') throw new Error(`broadcast failed: ${String(result)}`)
  }

  async sendUncheckedForGate0(payload: unknown): Promise<void> {
    if (!this.channel) throw new Error('channel not initialized')
    const result = await this.channel.send({
      type: 'broadcast', event: 'wordless-message', payload,
    })
    if (result !== 'ok') throw new Error(`broadcast failed: ${String(result)}`)
  }

  async close(): Promise<void> {
    if (this.channel) await this.client.removeChannel(this.channel)
    this.channel = null
    this.subscribed = false
    this.counterpartSeen = false
  }
}
```

The browser owns one monotonic outbound sequence and stamps `v: 1`, the exact
session, and the next sequence onto every guess and ping. The Lens owns its
separate outbound sequence for points and acknowledgements. The browser parser
rejects wrong-version, wrong-session, non-positive-sequence, oversized,
out-of-range, and overlong-ID messages before UI/metrics state; the channel
owner additionally rejects duplicate/stale Lens sequences before `onMessage`.
Reset `lastInboundSequence` only for a genuinely new clean Gate 0 connection,
not after an arbitrary malformed payload.

Supabase's `'ok'` send result proves only client-side acceptance unless channel
acknowledgments are enabled; do not cite it as delivery. Gate 0 delivery and RTT
proof comes from the application-level Lens `ack` returning to the browser.

`main.ts` reads only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLIC_KEY`, and
`VITE_RELAY_SESSION_ID`; it refuses to start if any is missing. Use those names
only in ignored `web/.env.local` during Tasks 2–4. Do not create or commit an
example until Gate 0 proves the installed Lens client and selected key type are
compatible.

- [x] **Step 6: Add a literal visible probe UI**

`index.html` contains exactly these interactive/status regions:

```html
<main>
  <p id="connection" role="status">CONNECTING</p>
  <canvas id="stroke" width="1000" height="600" aria-label="Incoming Lens stroke"></canvas>
  <button id="guess-wrong" type="button">SEND GUESS 1</button>
  <button id="guess-correct" type="button">SEND GUESS 2</button>
  <button id="ping" type="button">MEASURE ROUND TRIP</button>
  <pre id="metrics" aria-live="polite"></pre>
</main>
```

Render received points as a solid violet polyline, count received messages and
serialized bytes, let either button send its literal bounded choice, and
compute RTT from browser-origin
`ping` to Lens-origin `ack` using the original `sentAtMs`. In development only,
assign the probe to `window.wordlessProbe` so Gate 0 can reproducibly call
`sendUncheckedForGate0(payload)` for its malformed-message matrix. The probe
files and this escape hatch are deleted before the product browser is committed.

- [x] **Step 7: Verify browser-only evidence**

```bash
npm --prefix web test
npm --prefix web run build
npm --prefix web run dev -- --host 127.0.0.1
```

Expected without local credentials: tests/build pass; the page renders a clear
missing-configuration error and makes no network call. With ignored local
credentials: the page reaches `CONNECTING` without leaking values to output.

- [x] **Step 8: Commit the browser probe**

```bash
git add web docs/prompt-log.md
git diff --cached --check
git commit -m "spike: add Supabase Realtime browser probe"
```

Verify `web/.env.local` is absent from `git status --short` and `git ls-files`.

### Task 3: Build the Lens half of the bidirectional spike

**Files:**

- Create: `Assets/Wordless/Scripts/Spike/ProbeProtocol.ts`
- Create: `Assets/Wordless/Scripts/Spike/RelaySpike.ts`
- Create: `tools/core-tests/register.mjs`, `tools/core-tests/resolver.mjs`
- Create: `tools/core-tests/spike-protocol.test.mjs`
- Modify through Lens Studio MCP: `Assets/Scene.scene`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: `SupabaseProject` asset in ignored `Assets/LocalOnly/`, session
  `WAVE42`, browser's `wordless-message` event.
- Produces: Lens `CLIENT_CONFIGURED`/`SUBSCRIBED`/`RX_GUESS` evidence, a visible
  correct/incorrect state, 10 Hz point messages, and ping acknowledgements.

- [ ] **Step 1: Add the Node resolver and failing Lens-parser tests**

The minimum supported local runtime, Node 22.14, exposes asynchronous
`register`, not the newer synchronous `registerHooks`. Create
`tools/core-tests/register.mjs` as:

```js
import { register } from 'node:module'

register('./resolver.mjs', import.meta.url)
```

Create `tools/core-tests/resolver.mjs` as:

```js
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    throw error
  }
}
```

This exact loader plus `--experimental-strip-types` has been smoke-tested on
the installed Node 22.14, 24.16, and 25.8 runtimes. It lets Lens-compatible
extensionless imports execute unchanged in the Node test process.

Test `parseProbeInbound` with a valid guess, choice `9`, wrong session, missing
`guessId`, a duplicate-ID set, a valid ping, a ping with missing `pingId`, and
an unknown kind. Run:

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/spike-protocol.test.mjs
```

Expected: fail because `ProbeProtocol.ts` does not exist.

- [ ] **Step 2: Implement the pure Lens-side probe validator**

Export:

```ts
export interface ProbeGuess {
  v: 1
  kind: 'guess'
  sessionId: string
  seq: number
  guessId: string
  choiceIndex: 0 | 1 | 2 | 3
  sentAtMs: number
}

export interface ProbePing {
  v: 1
  kind: 'ping'
  sessionId: string
  seq: number
  pingId: string
  sentAtMs: number
}

export function parseProbeInbound(
  value: unknown,
  expectedSession: string,
  lastAcceptedSequence: number,
  seenGuessIds: { [id: string]: boolean },
): ProbeGuess | ProbePing | null
```

The function first computes an exact UTF-8 serialized byte count and rejects
anything at or above 1,024 bytes. It then accepts only `v: 1`, the exact
session, a positive integer sequence strictly above `lastAcceptedSequence`,
and a finite timestamp. A guess also requires integer choice `0..3` and an
unseen ASCII `guessId` matching `[A-Za-z0-9_-]{1,64}`; a ping requires a
`pingId` with the same bound. It rejects every other kind. It marks no ID or
sequence itself; the caller advances the high-water and marks a guess ID only
after accepting the message. Tests cover wrong version, duplicate/stale
sequence, oversized serialized input, overlong/non-ASCII IDs, and a valid
fresh ping as well as the cases above.

Run the prior Node test. Expected: pass.

- [ ] **Step 3: Implement the minimal Lens component from installed APIs**

Use the import path confirmed in Task 1. The documented 2026 connection core
is:

```ts
import {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from 'SupabaseClient.lspkg/supabase-snapcloud'

@component
export class RelaySpike extends BaseScriptComponent {
  @input supabaseProject: SupabaseProject
  @input channelName: string = 'WAVE42'
  @input statusText: Text
  @input statusVisual: MaterialMeshVisual

  private client: SupabaseClient
  private channel: RealtimeChannel
  private sequence = 0
  private lastInboundSequence = 0
  private seenGuessIds: { [id: string]: boolean } = {}

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => this.initialize())
    this.createEvent('OnDestroyEvent').bind(() => {
      if (this.client) this.client.removeAllChannels()
    })
  }

  private async initialize(): Promise<void> {
    this.setStatus('CONNECTING', new vec4(1, 0.84, 0.35, 1))
    this.client = createClient(
      this.supabaseProject.url,
      this.supabaseProject.publicToken,
    )
    print('[RelaySpike] CLIENT_CONFIGURED')
    this.openChannel()
  }
}
```

Before using this code, inspect the installed package/sample for the
version-specific `globalThis.supabaseModule` assignment recorded in Task 1 and
apply that exact requirement if present. The current SPECS-27
`KindnessCounter.ts` sample contains this sample-observed line before client
creation:

```ts
globalThis.supabaseModule = require('LensStudio:SupabaseModule')
```

That sample is a clue, not authority over the installed package. Record the
installed finding and never log credential values or user/session tokens. The
normal public-channel probe performs no Snapchat or Supabase user sign-in.

- [ ] **Step 4: Add channel receive/send behavior**

Join `wordless-relay:${this.channelName}` with
`broadcast: { self: false }`. Register one `wordless-message` callback.

- A valid guess logs `RX_GUESS`, marks its ID, and sets the visible state to
  mint `CORRECT` only for choice `2`; all other allowed choices become coral
  `TRY AGAIN`.
- Every Lens-origin point or ack carries `v: 1` and the next Lens-owned positive
  sequence. A ping produces an `ack` carrying the same bounded `pingId` and
  original `sentAtMs`.
- Unknown, malformed, wrong-session, and duplicate payloads log
  `REJECTED` and do not alter the visible state or inbound sequence high-water.
- Begin sending one 3-point batch every 0.1 seconds only after status
  `SUBSCRIBED`; increment `seq`, animate the x coordinate deterministically,
  and keep every value in `0..1000`.
- Handle `CLOSED`, `CHANNEL_ERROR`, and `TIMED_OUT` by stopping the timer and
  displaying the literal status.

- [ ] **Step 5: Author the probe scene through one MCP writer**

Use Lens Studio MCP/VirtualScene to create a `RelaySpike` hierarchy containing:

```text
RelaySpike
  StatusCard       bright material + Text
  ProbeCursor      small violet RenderMeshVisual
```

Calculate placement from the active Preview camera; place the card above and
in front of existing content, never at an assumed origin. Attach `RelaySpike`,
assign the ignored `SupabaseProject` asset, status text/visual, and session
`WAVE42`, then save through the editor API.

- [ ] **Step 6: Compile, run, and inspect actual logs**

Use Lens Studio's TypeScript recompile tool, then Preview run/log collection.
Expected sequence:

```text
[RelaySpike] CLIENT_CONFIGURED
[RelaySpike] CHANNEL SUBSCRIBED
```

Any client, socket, channel, or payload error/warning fails that attempt and is
recorded.
After independently confirming that the Free project is awake, a later clean
Preview run may be recorded as a separate attempt; never hide a failure with an
in-probe retry. A compile result without both current runtime lines does not
pass.

- [ ] **Step 7: Commit the Lens probe**

```bash
git add Assets/Wordless/Scripts/Spike/ProbeProtocol.ts Assets/Wordless/Scripts/Spike/ProbeProtocol.ts.meta Assets/Wordless/Scripts/Spike/RelaySpike.ts Assets/Wordless/Scripts/Spike/RelaySpike.ts.meta tools/core-tests/register.mjs tools/core-tests/resolver.mjs tools/core-tests/spike-protocol.test.mjs Assets/Scene.scene Assets/Scene.scene.meta docs/prompt-log.md
git diff --cached --check
git commit -m "spike: add Supabase Realtime Lens probe"
```

### Task 4: Execute and decide Gate 0

**Files:**

- Create: `docs/evidence/realtime-spike.md`
- Create after compatibility is proven: `web/.env.example`
- Modify: `docs/prompt-log.md`
- Use but do not commit: `captures/realtime-spike/`

**Interfaces:**

- Consumes: Tasks 1–3 and ignored local credentials.
- Produces: A binary GO/NO-GO with reproducible capture, metrics, and exact
  hashes. A GO freezes the transport choice; a NO-GO stops all later tasks.

- [ ] **Step 1: Start from a clean two-surface state**

```bash
git status --short --branch
npm --prefix web test
npm --prefix web run build
npm --prefix web run dev -- --host 127.0.0.1
```

In the Supabase dashboard, first wake/resume the Free project if necessary,
confirm Realtime is enabled, confirm the observed setting equivalent to
**Allow public access to channels**, and prove that each client joins the
public channel without a user-auth step. Record the key *type* only
(publishable preferred; legacy anonymous only if current Lens compatibility
requires it), never the key. Any client/channel warning or a failed
unauthenticated join fails this attempt.

Refresh Lens Preview, clear its Logger, and verify browser and Lens both join
`WAVE42`. The browser must not display `CONNECTED` until `SUBSCRIBED` and a
counterpart message have both occurred.

- [ ] **Step 2: Prove Lens → browser movement**

Record both surfaces and the Lens Logger together. Require at least ten
continuous seconds of changing real Lens-origin point batches. The browser must
draw the received line and increment message/byte counters; a hard-coded local
browser animation does not count.

- [ ] **Step 3: Prove browser → Lens authority**

Click `SEND GUESS 2` once. Require the browser send event, Lens `RX_GUESS` log,
Lens-side validation, and visible Lens transition to mint `CORRECT` while the
10 Hz Lens→browser point stream continues. Then send choice `1` in a fresh run
and require coral `TRY AGAIN`, again without stopping the stream. The browser
never sends an outcome field.

- [ ] **Step 4: Prove rejection and continuity**

From `window.wordlessProbe.sendUncheckedForGate0`, send wrong-session,
wrong-version, sequence zero, duplicate/stale sequence, out-of-range choice,
duplicate guess ID at a fresh sequence, overlong ID, string-valued timestamp,
unknown-kind, over-eight-point, and at-least-1,024-byte messages. Require eleven
`REJECTED` logs and zero visible result or sequence-high-water changes. Then
send the next valid contiguous message and require acceptance, proving invalid
messages did not poison continuity. Maintain 10 Hz valid traffic for another
ten seconds with no warning, gap, timeout, or disconnect.

- [ ] **Step 5: Measure fifty round trips**

While the 10 Hz point stream remains active, send fifty browser pings spaced
250 ms apart. Record median, p95, maximum, message count, and largest serialized
message. Treat `channel.send() === 'ok'` as client acceptance only; each RTT
sample exists only when the matching Lens-origin application `ack` arrives.

Project thresholds—not platform guarantees—are:

```text
GO: median <= 250 ms, p95 <= 750 ms, max message < 1 KB, no visible freeze > 1 s
RETEST AT 5 HZ: median 251–400 ms or p95 751–1200 ms
NO-GO: median > 400 ms, p95 > 1200 ms, repeat disconnect, or dropped guesses
```

A retest passes only if the 5 Hz clip remains visibly continuous and all other
criteria pass.

- [ ] **Step 6: Restart and reproduce**

Close the browser tab, refresh Preview, restart Vite, and repeat one point
stream plus one correct guess. Reproduction after restart is mandatory.

- [ ] **Step 7: Write the evidence record**

Populate `docs/evidence/realtime-spike.md` with:

```markdown
# Realtime spike evidence
- Result: GO or NO-GO
- Lens Studio/package versions: actual values
- Service/project mode: ordinary hosted Supabase Realtime public Broadcast
- Realtime/public-channel setting label: actual observed wording
- Client-safe key type: publishable or legacy anonymous; never the value
- User-auth step: none
- Free-project wake/resume check: observed result
- Channel status sequence: actual values
- Lens → browser continuous duration: actual seconds
- Browser → Lens wrong/correct outcomes: observed values
- Invalid payload rejection count: actual count
- RTT median / p95 / maximum: actual milliseconds
- Largest message / total messages: actual bytes and count
- Restart reproduction: pass or fail
- Raw capture path and SHA-256: actual path and digest
- Lens log excerpt: secret-free authoritative lines
- Unsupported claims: hardware, security, persistence, scale
```

All descriptive fields become observed values before commit.

Only after this live run proves the compatible names and key type, create
`web/.env.example` with placeholders for `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLIC_KEY` and with only
`VITE_RELAY_SESSION_ID=WAVE42` populated. Confirm the file contains no real
value and `web/.env.local` remains ignored and untracked.

- [ ] **Step 8: Commit the decision and obey it**

```bash
git add docs/evidence/realtime-spike.md docs/prompt-log.md
test ! -e web/.env.example || git add web/.env.example
git diff --cached --check
git commit -m "test: record WORDLESS realtime gate"
```

If result is NO-GO, commit the honest failure record and stop before Task 5.
Report the exact failed criterion. Do not silently substitute a backend, build
a local mirror, simulate traffic, or weaken browser causality. A Cloudflare
Worker plus Durable Object remains research-only and requires a new explicit
owner-approved transport amendment; WORDLESS Duo and Split the Table remain
separate owner product decisions.

### Task 5: Freeze the canonical protocol and local validation harness

**Files:**

- Create: `package.json`, `package-lock.json`
- Create: `Assets/Wordless/Scripts/Core/Protocol.ts`
- Create: `Assets/Wordless/Scripts/Transport/RelayPort.ts`
- Create: `tools/core-tests/protocol.test.mjs`
- Create: `tools/typecheck/check.sh`
- Create: `tools/typecheck/tsconfig.preflight.json`
- Create: `web/vite.config.ts`
- Modify: `web/tsconfig.json`, `web/src/relay-probe.ts`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Gate 0's proven channel API, measured ceiling, and actual package
  types.
- Produces: The frozen `RelayMessage` union, parser, builders, byte counter,
  transport interface, root verification commands, and web alias to the same
  pure source file.

- [ ] **Step 1: Write the failing protocol tests**

Test these cases in `tools/core-tests/protocol.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_BATCH_POINTS, MAX_STROKE_POINTS, PROTOCOL_VERSION, createRoundId,
  buildRoundStart, parseRelayMessage, serializedAsciiBytes,
} from '../../Assets/Wordless/Scripts/Core/Protocol.ts'

test('round start exposes choices but no answer index', () => {
  const message = buildRoundStart({
    sessionId: 'WAVE42', roundId: 'round-1', senderId: 'lens-a1', sequence: 1,
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'], durationMs: 20000,
    targetConnectionId: 'BROWSER1',
    sentAtMs: 100,
  })
  assert.equal(message.v, PROTOCOL_VERSION)
  assert.equal(message.payload.targetConnectionId, 'BROWSER1')
  assert.equal('correctIndex' in message.payload, false)
  assert.equal(JSON.stringify(message).includes('correctIndex'), false)
})

test('point batches are bounded and ordered', () => {
  assert.equal(MAX_BATCH_POINTS, 8)
  assert.equal(MAX_STROKE_POINTS, 128)
  assert.equal(parseRelayMessage({
    v: 1, type: 'stroke.points', sessionId: 'WAVE42', roundId: 'round-1',
    senderId: 'lens-a1', sequence: 2, sentAtMs: 100,
    payload: { strokeId: 'stroke-1', points: [[0, 0], [1000, 1000]] },
  })?.type, 'stroke.points')
})

test('invalid messages are rejected', () => {
  for (const value of [
    null,
    { v: 2 },
    { v: 1, type: 'guess.submit', sessionId: 'BAD', payload: { choiceIndex: 9 } },
    { v: 1, type: 'stroke.points', sessionId: 'WAVE42', payload: { points: [[-1, 0]] } },
  ]) assert.equal(parseRelayMessage(value), null)
})

test('ASCII byte accounting is exact', () => {
  assert.equal(serializedAsciiBytes({ word: 'SNAKE' }), 16)
})

test('correct result stays below cap and never carries geometry', () => {
  const message = {
    v: 1, type: 'round.result', sessionId: 'WAVE42', roundId: 'round-1',
    senderId: 'lens-a1', sequence: 3, sentAtMs: 100,
    payload: {
      outcome: 'correct', guessId: 'guess-1', choiceIndex: 0,
      revealedWord: 'SNAKE', finalPointCount: 128,
    },
  }
  assert.equal('glyph' in message.payload, false)
  assert.ok(serializedAsciiBytes(message) <= 1024)
  assert.equal(parseRelayMessage(message)?.type, 'round.result')
})

test('terminal point counts and production round IDs are bounded', () => {
  // Table-drive correct-result and timeout counts: 0 and 128 pass; -1, 129,
  // and 1.5 fail. Also assert nonce/counter validation and distinct IDs for
  // createRoundId('A1B2C3D4', 1) versus createRoundId('Z9Y8X7W6', 1).
})

test('wire sequences are positive safe integers', () => {
  // A complete presence message accepts 1 and Number.MAX_SAFE_INTEGER, then
  // rejects 0, -1, 1.5, and Number.MAX_SAFE_INTEGER + 1.
})

test('connection IDs plus start/reset targets are exact and bounded', () => {
  // Ready/ack/start-target/reset-target accept exact eight-character uppercase-
  // alphanumeric IDs; reject missing, short, lowercase, and overlong IDs.
})
```

Add one table-driven case that constructs the maximal legal payload for every
`RelayMessage` variant and asserts `serializedAsciiBytes(message) <=
MAX_MESSAGE_BYTES`; the eight-point stroke batch is the largest geometry-bearing
wire message. Build every maximal ID/word from the declared length constants,
including round-start/reset targets from `CONNECTION_ID_LENGTH`, so the test
cannot pass by silently choosing short representative strings.

- [ ] **Step 2: Run the protocol tests red**

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/protocol.test.mjs
```

Expected: module-not-found failure for `Protocol.ts`.

- [ ] **Step 3: Implement the frozen wire types**

Use these exact public types:

```ts
export const PROTOCOL_VERSION = 1 as const
export const BROADCAST_EVENT = 'wordless-message' as const
export const LOBBY_ROUND_ID = 'lobby' as const
export const MAX_BATCH_POINTS = 8
export const MAX_STROKE_POINTS = 128
export const MAX_MESSAGE_BYTES = 1024
export const POINT_BATCH_INTERVAL_MS = 100
export const SESSION_ID_LENGTH = 6
export const CONNECTION_ID_LENGTH = 8
export const MAX_SENDER_ID_LENGTH = 32
export const MAX_ROUND_ID_LENGTH = 32
export const MAX_STROKE_ID_LENGTH = 32
export const MAX_GUESS_ID_LENGTH = 32
export const MAX_PING_ID_LENGTH = 32
export const MAX_WORD_LENGTH = 12
export const INSTANCE_NONCE_LENGTH = 8

export type ChoiceIndex = 0 | 1 | 2 | 3
export type ChoiceTuple = readonly [string, string, string, string]
export type QuantizedPoint = readonly [number, number]
export interface WorldPoint { readonly x: number; readonly y: number; readonly z: number }
export type GlyphNormalizer = (
  points: readonly QuantizedPoint[],
) => readonly QuantizedPoint[]
export interface PointBatch {
  readonly batch: readonly QuantizedPoint[]
  readonly rest: readonly QuantizedPoint[]
}
export type PointBatcher = (
  points: readonly QuantizedPoint[],
) => PointBatch
export type RoundPhase =
  | 'DISCONNECTED' | 'JOINING' | 'READY' | 'ACTIVE'
  | 'CORRECT' | 'GLYPH_LOCKED' | 'TIMED_OUT'

export type GuessRejectionReason =
  | 'WRONG_PHASE' | 'WRONG_ROUND'
  | 'DUPLICATE_GUESS' | 'CHOICE_ALREADY_TRIED'
  | 'STALE_SEQUENCE' | 'SEQUENCE_GAP'

export type ResyncReason = 'POINT_COUNT_MISMATCH'

export type RoundResultPayload =
  | {
      readonly outcome: 'correct'
      readonly guessId: string
      readonly choiceIndex: ChoiceIndex
      readonly revealedWord: string
      readonly finalPointCount: number
    }
  | {
      readonly outcome: 'incorrect'
      readonly guessId: string
      readonly choiceIndex: ChoiceIndex
    }

interface BaseMessage<T extends string, P> {
  readonly v: 1
  readonly type: T
  readonly sessionId: string
  readonly roundId: string
  readonly senderId: string
  readonly sequence: number
  readonly sentAtMs: number
  readonly payload: P
}

export type RelayMessage =
  | BaseMessage<'presence.ready', {
      role: 'painter' | 'guesser'
      connectionId: string
    }>
  | BaseMessage<'presence.ack', {
      role: 'painter' | 'guesser'
      connectionId: string
      acknowledgedConnectionId: string
    }>
  | BaseMessage<'round.start', {
      choices: ChoiceTuple
      durationMs: number
      targetConnectionId: string
    }>
  | BaseMessage<'stroke.begin', { strokeId: string }>
  | BaseMessage<'stroke.points', { strokeId: string; points: readonly QuantizedPoint[] }>
  | BaseMessage<'stroke.end', { strokeId: string }>
  | BaseMessage<'guess.submit', { guessId: string; choiceIndex: ChoiceIndex }>
  | BaseMessage<'round.result', RoundResultPayload>
  | BaseMessage<'guess.rejected', {
      guessId: string
      choiceIndex: ChoiceIndex
      reason: GuessRejectionReason
    }>
  | BaseMessage<'round.timeout', { finalPointCount: number }>
  | BaseMessage<'round.resync.request', { reason: ResyncReason }>
  | BaseMessage<'round.reset', {
      nextRoundId: string
      targetConnectionId: string
    }>
  | BaseMessage<'round.reset.ack', { nextRoundId: string }>
  | BaseMessage<'transport.ping', { pingId: string; originSentAtMs: number }>
  | BaseMessage<'transport.ack', { pingId: string; originSentAtMs: number }>

type TransportOwnedFields =
  | 'v' | 'sessionId' | 'senderId' | 'sequence' | 'sentAtMs'
type WithoutTransportOwnedFields<T> = T extends RelayMessage
  ? Omit<T, TransportOwnedFields>
  : never
export type RelayMessageDraft = WithoutTransportOwnedFields<RelayMessage>

export function createRoundId(instanceNonce: string, counter: number): string
```

`createRoundId` accepts exactly eight uppercase-alphanumeric nonce characters
and a positive safe-integer counter, then returns an ASCII ID no longer than
`MAX_ROUND_ID_LENGTH` (for example `r-A1B2C3D4-1`). Production creates the
nonce once per full Lens application instance through an injected/testable
local nonce factory and never persists it. Every `applyRound` in that instance
uses the next counter, so a full Preview restart cannot reuse a prior product
round ID. Add deterministic valid/invalid format tests and an assertion that
two instance nonces at counter one yield distinct IDs.

The round-start builder signature used by the test is:

```ts
export interface RoundStartInput {
  readonly sessionId: string
  readonly roundId: string
  readonly senderId: string
  readonly sequence: number
  readonly sentAtMs: number
  readonly choices: ChoiceTuple
  readonly durationMs: number
  readonly targetConnectionId: string
}

export function buildRoundStart(
  input: RoundStartInput,
): Extract<RelayMessage, { type: 'round.start' }>
```

`targetConnectionId` on every start/reset is the exact current guesser
subscription whose confirmed tuple releases that send; it is never a broadcast
wildcard. The composition root obtains it from
`RelayPort.getConfirmedPeerConnectionId()` only after the applicable presence
or reset-ack gate and supplies it to the wire draft; engine effects do not infer
transport identity.

`parseRelayMessage` validates shape only: every base field, exact
`SESSION_ID_LENGTH` uppercase-alphanumeric session format, known type,
per-type payload, finite nonnegative timestamps, positive safe-integer
sequence, four unique
uppercase-ASCII words, allowed choice index, normalized integer points, batch
cap, and message byte cap. Sender, round, stroke, guess, ping, and word strings
must satisfy the explicit constants above and their restricted ASCII character
sets; no “maximal legal message” field is left unbounded. Every
`finalPointCount` is a safe integer in `0..MAX_STROKE_POINTS`; parser
tests cover `0`, `128`, `-1`, `129`, and a fractional value for both the
correct-result and timeout message shapes. Presence connection IDs are exact
`CONNECTION_ID_LENGTH` uppercase-alphanumeric values, as is every round-start
or reset target. Presence and transport ping/ack
always use `LOBBY_ROUND_ID`, including after a product round exists. Any other
message carries a
well-formed product round ID, but current-round, role, sender-instance epoch,
authority, sequence, and duplicate decisions belong to Task 8's pure
`ReceivePolicy`; gameplay phase belongs only to `WordlessEngine`. The parser
returns a new sanitized object, never the caller's mutable object.

`round.result` never carries geometry. Before a correct result or timeout, Lens
drains pending point batches at the declared cadence and publishes one
`stroke.end` only when a stroke is still active; an already-ended or never-
started stroke produces no extra end. The terminal payload then carries
`finalPointCount`. Because the sender serializes and awaits sends, an accepted
correct result/timeout must match the receiver's point count immediately; a
mismatch sends one resync request instead of waiting indefinitely. On correct,
Lens and browser each call the shared `normalizeGlyph` on their own copy of the
same public stroke. Timeout creates no glyph. Gate 1 compares both correct-path
counts and coordinate hashes. The discriminated result payload requires
`revealedWord` and `finalPointCount` only for a correct result. Timeout and
well-formed guess rejection use their own message types; malformed, oversized,
wrong-session, and unverifiable-sender input is logged and dropped without a
response.

Because the product word deck and IDs are restricted to ASCII, implement byte
accounting as:

```ts
export function serializedAsciiBytes(value: unknown): number {
  const text = JSON.stringify(value)
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 127) return Number.POSITIVE_INFINITY
  }
  return text.length
}
```

Every outbound caller supplies a `RelayMessageDraft`, never transport-owned
base fields. Each client owns one private FIFO shared by adapter-authored
presence/ping/ack/reset-ack traffic and app-authored stroke/guess/game traffic.
FIFO entries also retain non-wire ownership metadata: `adapter`, or
`application` plus the transport's current application generation. Public
`send` tags application entries; private adapter enqueue tags control entries.
`invalidateApplicationGeneration()` synchronously advances that generation and
rejects every not-yet-started older application entry with a distinct expected-
cancellation result, while preserving adapter control entries and at most the
one channel send already started. Removed drafts never received a sequence.
Lens effect publishing treats that cancellation as expected only when the
effect's engine generation is now stale; browser intent publishing treats it as
recovery only after its projection was invalidated. Any current-generation
cancellation remains an error rather than being swallowed.
Only when a surviving draft reaches the head does the transport stamp version,
session, instance sender, next sequence, and current send time; a canonical
builder then calls the same shape/bounds validator, enforces
`MAX_MESSAGE_BYTES`, freezes the message, and the FIFO awaits the actual
channel send. Sequence allocation therefore cannot race. A failed/ambiguous
send halts that FIFO and enters
reconnect recovery; it never continues with a knowingly gapped next draft or
reuses a possibly delivered sequence. The same final boundary
repeats the size/shape assertion, and no internal caller can bypass the cap.
The FIFO additionally delays the actual send start of each `stroke.points`
message until at least `POINT_BATCH_INTERVAL_MS` after the previous point-send
start, even when a backlog clears. Builders never accept a `correctIndex` for
public round state. Tests enqueue adapter and application drafts concurrently,
assert one monotonic wire order, and measure point-send starts rather than only
effect-production timestamps.

Immediately before each channel `subscribe()` call, create a new non-persisted
`connectionId` and initialize policy with whether this adapter has subscribed
before; a failed attempt discards that ID. Transient reconnect retains sender
ID/sequence but changes this subscription ID. Only on `SUBSCRIBED`, enqueue lobby-scoped `presence.ready` and
retry the same semantic ready (with a fresh wire sequence) once per second up
to three times until a matching ack. A peer receiving a valid ready first
enqueues `presence.ack` with its own current connection ID and the received ID
as `acknowledgedConnectionId`, binds that peer identity/connection for receive
authority and liveness, but does **not** report composition readiness. Only an
ack targeted to the receiver's current connection reports counterpart
readiness and cancels ready retries. This proves the counterpart received this
subscription's ready before product traffic can start. Acks are never
acknowledged, so no echo loop exists. Duplicate ready for the same peer
connection ID re-sends an ack but is otherwise idempotent; if the receiver's
own connection is still unacknowledged and its ready burst stopped, that ready
also restarts one bounded local burst. Stale-target acks drop. Before the Lens
enqueues an initial `round.start`, it enqueues one fresh targeted ack to the
bound guesser connection in the same FIFO, then stamps that exact guesser
connection as the start's `targetConnectionId`; ordered delivery therefore
moves the browser to `READY` before `ACTIVE` in the normal path. If only that
fresh ack is lost, the narrowly authorized initial-start barrier below may
activate the already-painter-bound browser directly only when that target still
equals its current local connection; a later ack cannot regress it.

App-readiness confirmation is scoped to the full tuple
`(localConnectionId, peerSenderId, peerConnectionId)`, never only the unchanged
local ID. Every `PEER_REJOINED` or `PEER_REPLACED` decision invalidates the old
tuple and unconditionally starts one bounded local ready burst while keeping
the healthy local channel/connection ID. A targeted ack from the old peer tuple
cannot unlock the new one. If the transition itself arrives as a targeted ack,
emit its control first, establish the new tuple, then let that same matching ack
cancel the just-started burst and report readiness.

Ready-retry exhaustion is an explicit state transition. If this subscription
has already accepted counterpart presence but its own current connection ID is
still unacknowledged after the third ready send, enter the adapter's existing
single-flight local-channel recovery: close/connect that adapter once, retain
its instance sender ID and monotonic sequence, and create a new local
connection ID for the next subscribe attempt. If no counterpart presence has
ever been accepted, stop the retry timer and remain waiting indefinitely; a
later peer ready binds receive authority, is acked, and restarts the bounded
local ready burst. Its matching targeted ack confirms readiness; on the
browser, the narrowly authorized initial start/reset proof may also confirm it.
Only a local channel/status failure, liveness expiry, ambiguous send, sequence
gap, or this local ready-exhaustion rule may change the local connection ID.
A peer's changed connection ID never makes the healthy receiver close or
re-subscribe its own channel.

The first valid ready/targeted ack from an unbound sender may establish a
positive sequence baseline above one. A distinct connection ID from the same
bound sender is an authorized reconnect barrier only when its sequence is
above high-water: policy advances to that sequence, emits `PEER_REJOINED` once,
and never merges old product state. A matching ack for a locally new
subscription may likewise bridge messages missed while unsubscribed. Same-ID
duplicates and every later ordinary message use normal sequence rules.

`round.reset` is Lens-authoritative transition metadata, not a second reset
door. An initial `applyRound` emits no reset. Replacing an existing round makes
`applyRound(old -> new)` emit `publish-reset` with both IDs; its wire envelope
uses `roundId: old` and its payload carries `nextRoundId: new` plus the exact
current guesser `targetConnectionId` supplied at send time. An accepted
reset authorizes the new current ID and makes the browser publish
`round.reset.ack` under that new ID. Lens must receive the matching ack before
it publishes the new `round.start`, whose target is the exact currently
confirmed guesser connection. Until then it caches the semantic
old-to-new transition and retries that same reset with a fresh transport
sequence once per second, at most three times. The cached semantic identity is
only old/new round IDs; each send/retry reads the currently confirmed guesser
connection and stamps that exact target, and null blocks sending. A target may
change only after the new peer tuple gate, never merely because of retry. It
never starts or applies
another round merely because the ack has not arrived; exhausted retries enter
literal reconnect/error state. An accepted duplicate retry is idempotent on
the browser and sends another ack. A matching ack is itself an authorized
transition barrier when it is the first gapped message from the bound browser.
`round.resync.request` carries only `POINT_COUNT_MISMATCH`; liveness and
sequence-gap recovery use the tested connection-ID/peer-transition path rather
than racing a pre-close request against re-subscription. While a reset ack is pending, a request enveloped with
either the pending current-new ID or the immediately previous ID only resends
the cached reset; it never nests another `applyRound`. After the ack, a
previous-ID request may also resend the cached current `round.start` with a
fresh sequence. Only a `POINT_COUNT_MISMATCH` request for an acked current ID
with no reset pending, while the Lens is `CORRECT`, `GLYPH_LOCKED`, or
`TIMED_OUT`, starts the normal new-`applyRound` recovery. Older or unknown round
IDs are rejected.

- [ ] **Step 4: Define the transport boundary**

```ts
import type { RelayMessage, RelayMessageDraft } from '../Core/Protocol'

export type RelayStatus =
  | 'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBED'
  | 'COUNTERPART_TIMED_OUT'
  | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

export interface RelayDiagnostics {
  readonly activeChannels: number
  readonly activeTimers: number
  readonly messageListeners: number
}

export type RelayControlEvent =
  | {
      readonly type: 'SEQUENCE_GAP'
      readonly senderId: string
      readonly observedSequence: number
    }
  | {
      readonly type: 'PEER_REPLACED'
      readonly previousSenderId: string
      readonly nextSenderId: string
      readonly previousConnectionId: string
      readonly nextConnectionId: string
    }
  | {
      readonly type: 'PEER_REJOINED'
      readonly senderId: string
      readonly previousConnectionId: string
      readonly nextConnectionId: string
    }

export interface RelayPort {
  connect(): Promise<void>
  send(draft: RelayMessageDraft): Promise<void>
  invalidateApplicationGeneration(): void
  close(): Promise<void>
  onMessage(listener: (message: RelayMessage) => void): () => void
  onStatus(listener: (status: RelayStatus, detail: string) => void): () => void
  onControl(listener: (event: RelayControlEvent) => void): () => void
  setLocalRound(roundId: string): void
  completeLocalResync(senderId: string): void
  getConfirmedPeerConnectionId(): string | null
  getDiagnostics(): RelayDiagnostics
}
```

No engine imports Supabase. No transport mutates `RoundStore` directly; the
composition root validates and dispatches messages. Public `send` is the
application path; adapter-authored presence/liveness/control drafts use the
private control enqueue but the same FIFO. Generation cancellation is not a
channel error and must not recursively start recovery. `close()` marks the FIFO
closed synchronously, rejects/notifies every not-yet-started draft, lets at
most the one already-started channel send settle, then removes channel/timers;
no queued draft can resume after disconnect. Calling `connect()` on that same
adapter after `close()` creates a fresh empty FIFO/channel while retaining the
instance sender ID and next monotonic sequence; linked-fake tests prove this
same-sender recovery. A newly constructed adapter is the only path to a new
sender epoch.
`setLocalRound` and `completeLocalResync` are narrow forwards into the pure
`ReceivePolicy`; they do not mutate `RoundStore` or author messages.
`getConfirmedPeerConnectionId` returns the currently confirmed guesser
connection from that same policy tuple and returns null whenever the tuple is
unconfirmed; it exposes no credential or mutable policy object.
For a non-null peer transition, the Lens adapter synchronously emits the
sanitized `onControl` fact and waits for all listeners to return. The root's
listener invalidates the application generation before it disconnects the
engine; `BrowserRelayClient` performs the equivalent internal invalidation
before it calls its projection delegate. Only after that barrier may a ready-
introduced transition enqueue its targeted ack or dispatch readiness; adapter
control entries survive the purge. The same control-before-readiness order
covers a targeted ack that is itself the first valid message from a replacement
sender. A sequence-gap fact is also emitted before any related rejected
gameplay payload can occur. The composition root is the only consumer that may
turn those facts into engine disconnect/`applyRound` actions.

- [ ] **Step 5: Make the web import the canonical pure module**

Replace `web/vite.config.ts` with:

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@wordless/core': fileURLToPath(
        new URL('../Assets/Wordless/Scripts/Core', import.meta.url),
      ),
    },
  },
  server: {
    fs: { allow: [repositoryRoot] },
  },
})
```

Run `ls web/tsconfig*.json`, then add this exact entry to the config that the
scaffold's `tsc` build actually reads. The current vanilla-ts scaffold produces
one `web/tsconfig.json`; if a future scaffold splits configs, inspect its build
references and edit the app/source config rather than creating an orphan:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@wordless/core/*": ["../Assets/Wordless/Scripts/Core/*"]
    }
  }
}
```

Merge those compiler fields with Vite's generated options; do not replace its
other strictness settings. Import protocol types/functions from
`@wordless/core/Protocol`, never from a copied web definition. Replace the
probe's local byte counter with an import of `serializedAsciiBytes` from that
alias, so `npm run build:web` proves both TypeScript and Vite consume the actual
shared source instead of validating an unused alias.

- [ ] **Step 6: Add root verification scripts**

Create the root `package.json` first:

```json
{
  "name": "wordless-relay",
  "private": true,
  "type": "module",
  "scripts": {
    "test:core": "node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/*.test.mjs",
    "test:web": "npm --prefix web test",
    "build:web": "npm --prefix web run build",
    "check": "npm run test:core && npm run test:web && npm run build:web"
  }
}
```

Then install and lock the local compiler:

```bash
npm install --save-dev typescript@5
```

Create `tools/typecheck/tsconfig.preflight.json` exactly as:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "isolatedModules": true,
    "lib": ["es2021"],
    "module": "commonjs",
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "*": [
        "../../Assets/*",
        "../../Cache/TypeScript/Src/Packages/*"
      ]
    },
    "skipDefaultLibCheck": true,
    "skipLibCheck": true,
    "target": "es2021",
    "types": []
  },
  "include": [
    "../../Cache/TypeScript/lib/LensifyTS/Declarations/**/*.d.ts",
    "../../Assets/**/*.ts"
  ]
}
```

Create `tools/typecheck/check.sh` exactly as:

```sh
#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
test -d Cache/TypeScript/lib/LensifyTS/Declarations || {
  echo "Lens Studio generated declarations are missing; open and compile WordlessRelay first." >&2
  exit 1
}
./node_modules/.bin/tsc -p tools/typecheck/tsconfig.preflight.json
```

Run `chmod +x tools/typecheck/check.sh`. This harness uses only this project's
generated Lens declarations and installed package sources; it must not borrow
types from GUIDE or ORGANIZE. The resolved TypeScript version is pinned in the
root lockfile rather than fetched by an unpinned invocation.

- [ ] **Step 7: Verify and freeze the protocol**

```bash
npm run test:core
npm run test:web
npm run build:web
sh tools/typecheck/check.sh
```

Then compile/run Preview to prove importing the pure module did not break Lens
runtime. Expected: all local commands pass and Preview retains Gate 0 behavior.

- [ ] **Step 8: Commit the frozen contract**

```bash
git add package.json package-lock.json Assets/Wordless/Scripts/Core/Protocol.ts Assets/Wordless/Scripts/Core/Protocol.ts.meta Assets/Wordless/Scripts/Transport/RelayPort.ts Assets/Wordless/Scripts/Transport/RelayPort.ts.meta tools/core-tests/protocol.test.mjs tools/typecheck/check.sh tools/typecheck/tsconfig.preflight.json web/vite.config.ts web/tsconfig.json web/src/relay-probe.ts docs/prompt-log.md
git diff --cached --check
git commit -m "feat: freeze WORDLESS relay protocol"
```

The orchestrator now announces the freeze before dispatching parallel Tasks 6
and 7. Tasks 8 and 9 begin later at their serial graph positions after those
core lanes integrate.

### Task 6: Implement the authoritative round engine and store

**Files:**

- Create: `Assets/Wordless/Scripts/Core/RoundStore.ts`
- Create: `Assets/Wordless/Scripts/Core/WordlessEngine.ts`
- Create: `Assets/Wordless/Scripts/Core/WordDeck.ts`
- Create: `tools/core-tests/engine.test.mjs`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Frozen `ChoiceIndex`, `ChoiceTuple`, `QuantizedPoint`,
  `GlyphNormalizer`, `GuessRejectionReason`, `POINT_BATCH_INTERVAL_MS`,
  `PointBatcher`, `RoundPhase`, and `WorldPoint`.
- Produces: `RoundStore`, `WordlessEngine`, `WordCard`, `EngineEffect`, and the
  single `applyRound` reset path used by Lens composition.

- [ ] **Step 1: Write failing engine tests**

Cover the complete state contract:

```js
test('applyRound is the only full reset and publishes no secret', () => {})
test('initial round emits no reset; replacement emits old-to-new reset', () => {})
test('drawing and guesses coexist in ACTIVE', () => {})
test('wrong guess marks only that choice and remains ACTIVE', () => {})
test('duplicate and already-tried guesses reject once without state mutation', () => {})
test('correct guess reveals word and exact glyph once', () => {})
test('correct result publishes no geometry', () => {})
test('correct mid-stroke drains points and end before final count result', () => {})
test('correct after stroke end emits no duplicate end', () => {})
test('correct before stroke start emits no invalid end', () => {})
test('timeout creates no glyph and publishes authoritative timeout', () => {})
test('timeout mid-stroke drains points and end before final count', () => {})
test('timeout after end or before start emits no duplicate or invalid end', () => {})
test('closing drain emits at most one point batch per 100 ms', () => {})
test('correct at deadline minus one latches before a later timeout tick', () => {})
test('exact deadline advances timeout before evaluating a correct guess', () => {})
test('exact deadline rejects begin, point, and release before their input', () => {})
test('timeout latched first rejects a later correct guess', () => {})
test('applyRound during drain invalidates every old-round pending effect', () => {})
test('disconnect during drain invalidates every old-round pending effect', () => {})
test('every effect carries its exact round ID and current generation', () => {})
test('stale glyph-lock callback after applyRound is a no-op', () => {})
test('manual close rejects a second stroke until applyRound', () => {})
test('point-cap close rejects a second stroke until applyRound', () => {})
test('duplicate counterpart readiness emits no second round start', () => {})
test('disconnect blocks guesses and reconnect requires applyRound', () => {})
```

Each test constructs the engine with deterministic time and the `SNAKE` card.
Assert snapshots and emitted effects; never inspect view components.

- [ ] **Step 2: Run the tests red**

Run:

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/engine.test.mjs
```

Expected: imports for `RoundStore`, `WordlessEngine`, and `WordDeck` fail.

- [ ] **Step 3: Define the local-only card deck**

```ts
import type { ChoiceIndex, ChoiceTuple } from './Protocol'

export interface WordCard {
  readonly answer: string
  readonly correctIndex: ChoiceIndex
  readonly choices: ChoiceTuple
}

export const WORD_DECK: readonly WordCard[] = [
  { answer: 'SNAKE', correctIndex: 0, choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'] },
  { answer: 'SUN', correctIndex: 2, choices: ['MOON', 'CLOCK', 'SUN', 'STAR'] },
  { answer: 'HEART', correctIndex: 1, choices: ['APPLE', 'HEART', 'CLOUD', 'FLOWER'] },
  { answer: 'HOUSE', correctIndex: 3, choices: ['BOX', 'MOUNTAIN', 'TENT', 'HOUSE'] },
  { answer: 'FISH', correctIndex: 2, choices: ['BIRD', 'LEAF', 'FISH', 'BOAT'] },
  { answer: 'TREE', correctIndex: 1, choices: ['PERSON', 'TREE', 'FORK', 'CACTUS'] },
  { answer: 'STAR', correctIndex: 3, choices: ['SUN', 'FLOWER', 'KITE', 'STAR'] },
  { answer: 'WAVE', correctIndex: 2, choices: ['SNAKE', 'RIVER', 'WAVE', 'MOUNTAIN'] },
]
```

The controlled submission round uses `SNAKE`. The curated cards vary answer
position deterministically so repeated play does not teach “always tap the
first card.” Runtime shuffling is excluded; randomness adds test and capture
risk without improving the judged proof.

- [ ] **Step 4: Implement the observable store**

`RoundStore` owns one immutable `LensRoundState`:

```ts
export interface LensRoundState {
  readonly phase: RoundPhase
  readonly roundId: string
  readonly choices: ChoiceTuple
  readonly durationMs: number
  readonly startedAtMs: number
  readonly remainingMs: number
  readonly worldPoints: readonly WorldPoint[]
  readonly publicPoints: readonly QuantizedPoint[]
  readonly guessedIndices: readonly ChoiceIndex[]
  readonly lastOutcome: 'none' | 'incorrect' | 'correct' | 'timeout'
  readonly revealedWord: string | null
  readonly glyph: readonly QuantizedPoint[]
  readonly counterpartReady: boolean
}
```

The card secret is a private field in `WordlessEngine`, not part of
`LensRoundState`. `RoundStore.replace(next)` freezes the snapshot and notifies a
copy of its listener list. Views receive `store.getSnapshot()` and cannot
mutate it. `RoundStore.listenerCountForDiagnostics()` returns only the count of
currently registered listeners; it exposes neither callbacks nor state.

- [ ] **Step 5: Implement engine commands and effects**

Expose exactly:

```ts
export type PublishResultEffect =
  | {
      type: 'publish-result'
      outcome: 'correct'
      guessId: string
      choiceIndex: ChoiceIndex
      revealedWord: string
      finalPointCount: number
    }
  | {
      type: 'publish-result'
      outcome: 'incorrect'
      guessId: string
      choiceIndex: ChoiceIndex
    }

export interface EngineEffectMeta {
  readonly roundId: string
  readonly generation: number
}

export type EngineEffect = EngineEffectMeta & (
  | { type: 'publish-round-start' }
  | { type: 'publish-stroke-begin'; strokeId: string }
  | { type: 'publish-stroke-points'; strokeId: string; points: readonly QuantizedPoint[] }
  | { type: 'publish-stroke-end'; strokeId: string }
  | PublishResultEffect
  | {
      type: 'publish-guess-rejected'
      guessId: string
      choiceIndex: ChoiceIndex
      reason: GuessRejectionReason
    }
  | { type: 'publish-timeout'; finalPointCount: number }
  | { type: 'publish-reset'; previousRoundId: string; nextRoundId: string }
)

export class WordlessEngine {
  private readonly store: RoundStore
  private readonly normalizeGlyph: GlyphNormalizer
  private readonly takePointBatch: PointBatcher
  constructor(
    store: RoundStore,
    normalizeGlyph: GlyphNormalizer,
    takePointBatch: PointBatcher,
  ) {
    this.store = store
    this.normalizeGlyph = normalizeGlyph
    this.takePointBatch = takePointBatch
  }
  applyRound(roundId: string, card: WordCard, nowMs: number, durationMs = 20000): EngineEffect[]
  setCounterpartReady(ready: boolean, nowMs: number): EngineEffect[]
  beginStroke(strokeId: string, nowMs: number): EngineEffect[]
  appendPoint(world: WorldPoint, point: QuantizedPoint, nowMs: number): EngineEffect[]
  endStroke(nowMs: number): EngineEffect[]
  submitGuess(guessId: string, choiceIndex: ChoiceIndex, nowMs: number): EngineEffect[]
  lockGlyph(expectedRoundId: string, expectedGeneration: number): void
  tick(nowMs: number): EngineEffect[]
  disconnect(): void
  getRoundGeneration(): number
}
```

`setCounterpartReady(true, nowMs)` is the instant the public round becomes
`ACTIVE`; it sets `startedAtMs` and the private deadline, so time spent waiting
in `READY` never consumes the round. `submitGuess` first advances the deadline
at its supplied time, then accepts only `ACTIVE` with no terminal decision
latched, an unseen ID, and an untried choice. The boundary is exact:
`nowMs >= deadlineMs` latches timeout before evaluating the guess, while a
correct guess at `deadlineMs - 1` latches correct and cannot be replaced by a
later tick. Whichever terminal decision latches first is immutable, including
while its final stroke batches are draining. Task 8's policy checks round
currency before dispatch. A well-formed guess rejected for phase, duplicate
ID, or already-tried choice produces one `publish-guess-rejected` effect
without state mutation. Incorrect appends the choice and keeps the phase
`ACTIVE`; correct records the private terminal decision and stops new input
without revealing or changing public phase yet. When the
ordered drain completes, it reveals the local answer, calls the injected
normalizer once on the exact public path, stores its returned points in `glyph`,
and transitions to `CORRECT`. Engine
tests inject an identity/test normalizer and bounded batcher; Task 7 supplies
the production functions. `beginStroke` is legal only from the private
per-round stroke state `NOT_STARTED`; manual close or cap progresses it through
`CLOSING` to `ENDED`, and no second stroke can begin before `applyRound`.
The composition root captures the correct effect's round/generation and calls
`lockGlyph(expectedRoundId, expectedGeneration)` after the 450 ms deterministic
view animation. The method produces `GLYPH_LOCKED` only when both values still
match and the phase is `CORRECT`; otherwise it is a no-op. `applyRound`
enters `READY`; `setCounterpartReady(true, nowMs)` enters `ACTIVE` and emits
the one public round-start effect. Repeating it in `ACTIVE` or later phases is
idempotent and emits no second start. Timeout latches the same immutable
private terminal decision and stops input. Only after the shared closure
path below finishes does it set `lastOutcome: 'timeout'`, clear glyph, enter
`TIMED_OUT`, and publish one timeout; the browser's timer remains display-only.

One private, idempotent closing/drain path serves manual release, the 128-point
cap, correct, and timeout. It stops new input and lets `tick(nowMs)` emit at
most one eight-point batch per `POINT_BATCH_INTERVAL_MS`. After the queue is
empty, it emits exactly one `publish-stroke-end` if a stroke is active, then
the pending correct/timeout effect in the same tick. If the stroke already
ended or never began, it emits no additional end and may publish the terminal
effect immediately. A correct/timeout arriving during a manual drain attaches
its terminal effect to that same close; it never creates a second path. The
engine commits `CORRECT`/`TIMED_OUT`, computes the correct glyph, and exposes
the terminal state only when this ordered drain completes. Every effect send is
awaited in array order by the composition root. Correct publishes result fields
and `finalPointCount` only; timeout publishes its count and no glyph; geometry
never enters either terminal effect.

The engine also owns a private monotonically increasing `roundGeneration`.
Every `applyRound` and `disconnect` increments it, clears the pending terminal,
point queue, stroke-close work, and delayed glyph-lock callback, and tags any
new deferred work with the current generation. `tick` and every delayed
callback discard stale-generation work. Immediately before every `applyRound`
or `disconnect`, the composition root synchronously calls
`relay.invalidateApplicationGeneration()`. Effects not yet enqueued fail the
root's matching engine-generation check; application drafts already queued but
not started are cancelled by the transport generation, without removing
presence/liveness/control drafts. Local-channel recovery additionally awaits
`relay.close()`. Peer-only recovery keeps the healthy channel, so at most one
already-started old application send may settle; while reconnecting, the
receiver consumes its sequence but suppresses its gameplay dispatch until the
authorized reset/start barrier. Thus the reset is the next application
transition and cannot be overtaken by queued old work. The engine never reaches
into `RelayPort`. Tests reset/disconnect in the middle of a drain and advance time past
the old deadline, proving no old points, end, result, timeout, or glyph effect
appears.

Every time-bearing command—`beginStroke`, `appendPoint`, `endStroke`,
`submitGuess`, and `tick`—runs the same deadline advance before evaluating its
own input. Thus a point or release delivered at the exact deadline cannot slip
in ahead of timeout merely because the frame's timer callback ran later. Add
boundary tests for begin/append/end as well as guesses. Every emitted effect
contains the exact current `roundId` and `generation`; the composition root
compares that metadata with `getRoundGeneration()` immediately before
enqueuing its draft.

An initial `applyRound` emits no reset. If a previous product round exists,
`applyRound(newRoundId, ...)` returns `publish-reset { previousRoundId,
nextRoundId }` before any later start effect and then replaces the local state.

- [ ] **Step 6: Verify engine invariants**

Run:

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/engine.test.mjs
```

Expected: all engine tests pass, including an assertion that
serializing every public effect contains neither `correctIndex` nor the answer
before a correct result.

- [ ] **Step 7: Commit the engine lane**

```bash
git add Assets/Wordless/Scripts/Core/RoundStore.ts Assets/Wordless/Scripts/Core/RoundStore.ts.meta Assets/Wordless/Scripts/Core/WordlessEngine.ts Assets/Wordless/Scripts/Core/WordlessEngine.ts.meta Assets/Wordless/Scripts/Core/WordDeck.ts Assets/Wordless/Scripts/Core/WordDeck.ts.meta tools/core-tests/engine.test.mjs docs/prompt-log.md
git diff --cached --check
git commit -m "feat: add authoritative WORDLESS round engine"
```

### Task 7: Implement bounded stroke and deterministic glyph geometry

**Files:**

- Create: `Assets/Wordless/Scripts/Core/StrokeGeometry.ts`
- Create: `tools/core-tests/geometry.test.mjs`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: `QuantizedPoint`, `PointBatcher`, `MAX_BATCH_POINTS`,
  `MAX_STROKE_POINTS`.
- Produces: `acceptWorldPoint`, `quantizePlanePoint`,
  `takePointBatch`, and `normalizeGlyph` for engine, Lens, and browser.

- [ ] **Step 1: Write the failing geometry tests**

```js
test('samples only after 2.5 cm of movement', () => {})
test('quantizes drawing plane corners to 0 and 1000', () => {})
test('caps a stroke at exactly 128 points', () => {})
test('batches no more than eight points without reordering', () => {})
test('normalizes the exact path into a centered 0.8 square', () => {})
test('normalization preserves point count and order', () => {})
test('empty glyph remains empty', () => {})
test('single-point glyph remains finite and centered', () => {})
test('path checksum is deterministic and order-sensitive', () => {})
```

- [ ] **Step 2: Run the geometry tests red**

Run:

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/geometry.test.mjs
```

Expected: module-not-found failure for `StrokeGeometry.ts`.

- [ ] **Step 3: Implement the explicit sampling math**

```ts
export const DRAWING_WIDTH_CM = 180
export const DRAWING_HEIGHT_CM = 110
export const MIN_SAMPLE_DISTANCE_CM = 2.5

export function acceptWorldPoint(
  points: readonly WorldPoint[],
  candidate: WorldPoint,
): boolean {
  if (points.length >= MAX_STROKE_POINTS) return false
  if (points.length === 0) return true
  const last = points[points.length - 1]
  const dx = candidate.x - last.x
  const dy = candidate.y - last.y
  const dz = candidate.z - last.z
  const minimumSquared = MIN_SAMPLE_DISTANCE_CM * MIN_SAMPLE_DISTANCE_CM
  return dx * dx + dy * dy + dz * dz >= minimumSquared
}

export function quantizePlanePoint(local: WorldPoint): QuantizedPoint {
  const nx = Math.max(0, Math.min(1, local.x / DRAWING_WIDTH_CM + 0.5))
  const ny = Math.max(0, Math.min(1, 0.5 - local.y / DRAWING_HEIGHT_CM))
  return [Math.round(nx * 1000), Math.round(ny * 1000)]
}
```

Import `WorldPoint`, `QuantizedPoint`, and `MAX_STROKE_POINTS` from
`Protocol.ts`; neither type nor the cap is redeclared in `StrokeGeometry.ts`.

`takePointBatch(queue)` implements the frozen `PointBatcher` contract and
returns `{ batch, rest }`, where `batch` is the first eight points and `rest`
preserves all later points.

Add a cross-surface diagnostic checksum that never logs raw geometry:

```ts
export function pathCoordinateHash(points: readonly QuantizedPoint[]): string {
  let hash = 2166136261
  for (const point of points) {
    hash = Math.imul(hash ^ point[0], 16777619)
    hash = Math.imul(hash ^ point[1], 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
```

- [ ] **Step 4: Implement exact-path medallion normalization**

Convert integer points to `0..1`, compute the bounding box, center it, and apply
one uniform scale so the larger dimension occupies `0.8`. Return integers in
`100..900`. For a zero-width/zero-height path, center the varying axis and set
the fixed axis to `500`. Never smooth, classify, reorder, add, or remove a
point.

- [ ] **Step 5: Verify geometry**

Run:

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/geometry.test.mjs
```

Expected: all geometry tests pass, and a 128-point input returns exactly 128
glyph points in the original order.

- [ ] **Step 6: Commit the geometry lane**

```bash
git add Assets/Wordless/Scripts/Core/StrokeGeometry.ts Assets/Wordless/Scripts/Core/StrokeGeometry.ts.meta tools/core-tests/geometry.test.mjs docs/prompt-log.md
git diff --cached --check
git commit -m "feat: add bounded stroke and glyph geometry"
```

### Task 8: Replace the probe with product relay adapters

**Files:**

- Create: `Assets/Wordless/Scripts/Core/ReceivePolicy.ts`
- Create: `Assets/Wordless/Scripts/Transport/SupabaseRelayTransport.ts`
- Create: `web/src/relay-client.ts`
- Create: `web/tests/relay-client.test.ts`
- Create: `tools/core-tests/transport-policy.test.mjs`
- Delete after replacement: `Assets/Wordless/Scripts/Spike/RelaySpike.ts`
- Delete after replacement: `Assets/Wordless/Scripts/Spike/ProbeProtocol.ts`
- Delete after replacement: `tools/core-tests/spike-protocol.test.mjs`
- Modify through MCP: `Assets/Scene.scene`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Frozen `RelayMessage`/`RelayMessageDraft`, `parseRelayMessage`,
  `RelayPort`/`RelayControlEvent`, and Gate 0 package lifecycle.
- Produces: Lens and browser adapters with the same topic/event, counterpart
  handshake, ping/ack, message metrics, duplicate/stale rejection hooks, and
  explicit status callbacks.

- [ ] **Step 1: Write browser relay and pure policy tests before adapters**

Define a narrow injected dependency:

```ts
export interface BrowserChannel {
  on(type: 'broadcast', filter: { event: string }, callback: (message: { payload: unknown }) => void): BrowserChannel
  subscribe(callback: (status: string, error?: unknown) => void): BrowserChannel
  send(message: { type: 'broadcast'; event: string; payload: unknown }): Promise<string>
  unsubscribe(): Promise<string>
  remove(): Promise<void>
}

export interface BrowserRoundDelegate {
  dispatchAccepted(message: RelayMessage): void
  invalidateForReconnect(): void
  setTransportState(
    state: 'joining' | 'waiting' | 'reconnecting' | 'failed' | 'closed',
    detail: string,
  ): void
}
```

`BrowserRoundDelegate` is owned by Task 8 and depends only on the canonical
message type; it is not a `WebRoundStore` import. Adapter tests inject a
synchronous recording fake. Task 9 constructs the real store first and binds
all three callbacks in `main.ts` before calling `connect()`. The adapter maps
raw transport lifecycle to literal UI state: initial connect → `joining`,
local `SUBSCRIBED` without targeted peer ack → `waiting`, any single-flight
recovery → `reconnecting`, exhausted recovery → `failed`, and explicit final
teardown → `closed`. An expected internal close during recovery remains
`reconnecting`, never `closed`. Only accepted targeted painter ack or the
authorized painter start/reset proof can make the store live; transport status
cannot.

Test: topic name, `SUBSCRIBED` status, sanitized receive, invalid receive
rejection, non-`ok` send failure, ping/ack, pending-draft cancellation on
close, connect-after-close with the same sender/continued sequence, and
cleanup. Cleanup must await `unsubscribe()` and then `remove()` exactly once;
the production wrapper implements `remove()` with the owning Supabase client's
`removeChannel(channel)`, while Lens teardown proves `removeAllChannels()`.
With two linked fake
channels and injected clocks, also cover browser-first, Lens-first, and
simultaneous subscription; initial ready lost in either direction; targeted
ack lost then recovered by a ready retry; ack never echoed; duplicate ready
producing an ack but no extra round start; asymmetric same-sender
re-subscription with a new connection ID; an outage longer than the three-ready
window followed by direction restoration; and peer liveness expiry at six
seconds. The long-outage case must prove that a side with known counterpart
presence enters one single-flight local close/connect recovery, while a side
that has never observed counterpart presence remains subscribed and waiting.
For a one-sided re-subscribe, assert exactly one connection-ID change on that
side, zero close/subscribe calls on the healthy peer, one
apply-round/reset-ack-start transition, and a stable live state with no
reciprocal reconnect. Each side may remain locally `SUBSCRIBED`/waiting indefinitely
before its first accepted counterpart presence; a valid ready binds receive
authority and arms the six-second peer timer but cannot mark app readiness.
Only a targeted ack for the current Lens connection unlocks Lens-authored
outbound round traffic; on the browser it marks `READY`, while a later
authorized painter start may move waiting directly to `ACTIVE` as specified
below. Recovery/close disarms liveness until presence binds again. Test a
browser joining after the Lens's first ready burst has fully expired: the
browser ready must make Lens ack and restart its own bounded ready burst, the
browser must target-ack it, and only then may Lens enqueue its final targeted
ack followed by one `round.start`. Drop either direction's first ready and
drop the first targeted ack separately; no `round.start` or `round.reset` may
reach an unbound browser, and recovery must dispatch exactly one store start.
Every delivered start must target the browser's current local connection ID.
Simulate a fresh/full-reloaded browser that receives an old painter ready
followed by an already-started old-round start targeted to the prior browser
connection: the ready may bind painter authority, but the stale-target start is
`STALE_CONNECTION`, cannot confirm readiness or bind a round, and a later
correctly targeted ack/start recovers without a sequence-gap storm.
Also lose the new browser's first ready and deliver one already-started reset
targeted to its prior connection. It may consume only a contiguous sequence;
it cannot confirm the tuple, authorize/reset the store, cancel ready retries,
release quarantine, or emit an ack. A later ready plus reset targeted to the
new connection must complete normally.
After painter ready has bound identity, drop the fresh targeted ack while
delivering its following start, and repeat with a following reset. The adapter
must dispatch that already-authorized product immediately without any buffer,
accept a later targeted ack at its higher sequence, and produce neither a stale
rejection, duplicate store transition, nor phase regression. The start case
moves waiting directly to `ACTIVE`, confirms the peer tuple, and cancels ready
retries; its later ack is an idempotent no-op. The reset case confirms the
tuple before delegate/reset-ack ordering and likewise cannot later exhaust the
ready timer.
After a peer replacement, deliver an ack targeted to the old local connection
and prove it cannot unlock the fresh peer. A valid targeted ack from the new
peer may release pending recovery; on the browser only, the new bound painter's
narrowly authorized initial start may instead activate directly if that
targeted ack alone was lost. Lens-side reset recovery still waits for its new
guesser tuple's targeted ack.
Assert delegate dispatch precedes the first reset ack, a thrown reset delegate
callback prevents ack, the next authorized cached retry invokes that delegate
again, and only after one successful atomic store commit do later retries skip
the delegate and re-ack,
and timeout/gap calls `invalidateForReconnect` exactly once per recovery entry.
Record delegate transport states and require the exact
joining→waiting→live path, `SUBSCRIBED` never live, recovery close remains
reconnecting, exhaustion becomes failed, and only explicit final teardown
becomes closed.
Drive adapter-authored presence/ping/ack and application-authored messages into
each client's send API concurrently. Assert one FIFO, transport-time sequence
allocation, no continuation after an ambiguous send failure, and at least 100
ms between actual `stroke.points` send starts even when queued drafts unblock
together. Then hold one already-started application send, queue at least two
more application drafts, and introduce a peer transition in each direction.
Require the transition barrier to cancel the queued application entries with
the expected generation-cancellation result, preserve/enqueue the targeted
presence ack, and allocate no sequence to removed entries. Deliver and withhold
the one already-started old payload in separate runs: the reconnecting receiver
may consume its sequence but must suppress gameplay dispatch, and the reset
must be the next accepted product transition. Cover queued points plus a result
on the Lens side and a queued guess on the browser side.

In parallel, create `tools/core-tests/transport-policy.test.mjs` with every
message sequence enumerated in Step 5. Import the not-yet-created shared
`ReceivePolicy.ts`; do not stub its decisions inside the test.
Adapter tests also assert that a sequence gap emits one `SEQUENCE_GAP` control
event before dispatching no gameplay payload, peer replacement emits one
`PEER_REPLACED` event, same-sender new connection emits one `PEER_REJOINED`
event, and a targeted ack that first introduces a replacement emits its peer
control synchronously before readiness/delegate dispatch. They also assert
`setLocalRound` forwards the exact ID, and
`completeLocalResync` advances the named peer only after the root's reset send,
while `getConfirmedPeerConnectionId` returns null before tuple confirmation and
the exact current guesser connection afterward.
With linked channels, drop only painter-to-browser traffic for longer than six
seconds while browser-to-Lens pings continue. Require one browser recovery
token, no pre-close resync request, one browser-only connection-ID change, one
Lens `applyRound`/reset-ack-start transition from `PEER_REJOINED`, and no
reciprocal Lens re-subscribe. This explicitly covers the former
reset-acked-before-close race by making it structurally impossible.
Separately lose the initial `round.start`, then deliver later painter traffic:
the browser must emit no resync request with a lobby or invented round ID,
perform one local re-subscribe, and let the resulting peer transition produce
one Lens-authoritative apply-round/reset-ack-start recovery.

- [ ] **Step 2: Run adapter tests red**

Run:

```bash
npm --prefix web test
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/transport-policy.test.mjs
```

Expected: `relay-client.ts` and `ReceivePolicy.ts` imports fail.

- [ ] **Step 3: Implement the browser adapter**

`BrowserRelayClient` accepts a `channelFactory`, session ID, instance-scoped
sender ID, connection-ID factory, clock, timer factory, and
`BrowserRoundDelegate`. Production wraps
`@supabase/supabase-js`; tests use fakes. A sender ID is generated once per full
browser application instance, is never persisted, and remains stable with a
monotonic sequence across transient channel re-subscriptions. The adapter owns
one channel and the single outbound FIFO defined in Task 5; its public send and
all internally authored traffic enqueue drafts into that same queue and only
the queue publishes frozen `RelayMessage` objects.

Its public `send` method tags an `application` entry with the current internal
application generation; presence/liveness/reset-ack traffic is tagged
`adapter`. On any peer transition or local recovery entry, synchronously
advance the application generation and cancel not-yet-started application
entries before invoking `invalidateForReconnect` or enqueuing a transition ack.
An expected generation cancellation never reports network failure. While the
delegate is reconnecting and no new round is authorized, policy-valid stale
gameplay may advance receive sequence but is not dispatched to the delegate;
only presence/control plus an authorized reset or initial/new-epoch start can
release that guard.

Immediately before each subscribe call, create the connection ID and call
`beginLocalSubscription`; on `SUBSCRIBED`, run Task 5's targeted ready/ack
handshake with role `guesser` and `roundId: LOBBY_ROUND_ID`. Keep the
sender ID and outgoing sequence across re-subscription. An accepted painter
ready is acked and binds receive authority/liveness but does not dispatch
`READY`; a matching painter ack cancels ready retries and alone dispatches
`READY`. Duplicate ready re-acks without a second store transition and
restarts a stopped local ready burst while this connection is unacknowledged;
ack is never echoed. For either presence form, any non-null peer transition is
handled in this order: synchronously invalidate the application generation,
call `invalidateForReconnect` as the one recovery/projection barrier, then
enqueue a ready-introduced targeted ack/restart burst. No gameplay or readiness
dispatch precedes that barrier. A new connection ID from the same painter emits
one reconnect fact through this path. The subsequent accepted `round.start` moves it to
`ACTIVE` only when its `targetConnectionId` equals this browser's current local
connection. There is no pre-presence product buffer and no product message may
bind peer identity: a start before accepted painter ready/targeted ack is
rejected `UNKNOWN_SENDER`. The Lens product gate and shared FIFO guarantee a
fresh targeted painter ack is sent before the initial start. If that fresh ack
alone is lost but its following start arrives, the browser has already bound
the painter from ready and dispatches the policy-approved start immediately;
the correctly targeted authoritative start moves it directly from waiting to `ACTIVE` and is
itself evidence that Lens completed its outbound readiness gate. Accepting that
start marks the browser's current peer tuple confirmed and cancels its ready
retries. A later targeted ack remains sequence-valid but is a no-op once the
store is `ACTIVE` or terminal, so it cannot regress phase. An accepted,
current-connection-targeted authoritative reset after bound painter presence likewise confirms the tuple,
cancels ready retries, and follows the immediate delegate-before-reset-ack
path. Nothing is buffered or replayed through policy.

Every two seconds the browser sends `transport.ping`, but the peer-loss clock
is disarmed while no painter has ever been accepted in that subscription, so a
browser-first join remains stable `WAITING FOR PAINTER`. First accepted painter
presence arms it; any later accepted painter message refreshes it, and
close/recovery disarms it. Six armed seconds without painter traffic emits
`COUNTERPART_TIMED_OUT`, stops guesses, and calls the delegate's
`invalidateForReconnect`, then runs the tested close/connect lifecycle on the
same instance without sending any pre-close resync request. The fresh local
connection ID is the unambiguous signal: Lens receives `PEER_REJOINED`, keeps
its own healthy channel, and creates exactly one authoritative reset
transition. This removes the request/reset/ack-before-close race entirely.
Exhaustion enters literal failed state. A painter sequence gap uses that same
close/connect path and sends no resync request; no missing geometry is
invented. If the initial start was lost and no product round exists, likewise
send no lobby/guessed-ID request—clear/wait and reconnect. Wire
`round.resync.request` remains only for a healthy-channel
`POINT_COUNT_MISMATCH`, where no local re-subscribe is competing with it.
Recovery-entry idempotency prevents overlapping
loops. On disconnect/rejoin, the later Task 9 binding
therefore clears the incomplete stroke and waits for a new round ID produced
through Lens `applyRound`.

The Task 5 ready-retry exhaustion rule is part of this lifecycle: exhaustion
with accepted painter presence enters the same single-flight close/connect
path; exhaustion before any painter presence stops retrying and remains
`WAITING FOR PAINTER`. A painter's new connection ID never closes the
browser's healthy local channel. It first runs the synchronous generation and
projection invalidation barrier, then enqueues the targeted ack, and waits for
the authoritative reset/start recovery.

For each accepted targeted painter ack or public round/stroke/result/timeout
message (but not ready or transport ping/ack), the adapter synchronously invokes
`delegate.dispatchAccepted(message)`. On the first accepted `round.reset`, it
does so before enqueuing `round.reset.ack` under the advertised new ID; a thrown
callback produces adapter error and no ack. Task 9's binding atomically resets
the web store in that callback. The adapter records `delegateCommitted` only
after that callback returns successfully. A retry of the same cached
old-to-current transition invokes the delegate again when the first attempt
threw; only a retry after recorded success skips the callback and enqueues a
fresh ack. A fail-once linked test requires one eventual atomic store reset and
ack, with no premature `round.start`. The browser never
accepts `round.start` for that ID before its reset has been accepted. A reset
that is itself the first message after a missing painter sequence may serve as
the authorized gap barrier under Step 5's exact conditions.

- [ ] **Step 4: Implement the Lens adapter**

`SupabaseRelayTransport` implements `RelayPort` using the exact normal-project,
unauthenticated public-channel lifecycle proven in Gate 0. It:

- initializes the built-in module only if the installed package requires it;
- creates the client from the ignored normal-project URL and client-safe public
  key, with no Snapchat or Supabase user-token sign-in;
- uses the clients' proven default Realtime configuration unless Gate 0 recorded
  a required standard-project override;
- joins `wordless-relay:${sessionId}`;
- sends/receives only event `wordless-message`;
- calls `parseRelayMessage` before notifying listeners;
- rejects wrong session, wrong role, malformed, stale, duplicate, and oversized
  messages with a reason code;
- creates a fresh connection ID per channel subscription and runs the same
  lobby-scoped painter ready/targeted-ack handshake after `SUBSCRIBED`;
- applies Task 5's exact ready-exhaustion rule: known-peer exhaustion enters
  one local single-flight close/connect, unknown-peer exhaustion remains
  waiting, and a peer connection-ID change never reopens this healthy channel;
- uses one non-persisted sender ID per full Preview/app instance and keeps its
  outgoing sequence monotonic across transient channel re-subscriptions;
- routes adapter-authored presence/ping/ack traffic and every composition draft
  through one awaited FIFO, stamps sequence only at dequeue, and enforces point
  cadence at actual send start;
- tags composition drafts with the current non-wire application generation,
  exposes synchronous `invalidateApplicationGeneration`, and preserves only
  adapter control plus at most one already-started old application send across
  that barrier. Expected generation cancellation is not a channel failure;
- enqueues an ack for each valid guesser ready before reporting readiness;
  receiving ready binds peer authority/liveness but does not report app
  readiness; only a matching targeted ack reports readiness. Duplicate ready
  re-acks and, while the Lens connection remains unacknowledged, restarts one
  stopped bounded ready burst; ack never echoes. Any `PEER_REPLACED` or
  `PEER_REJOINED` decision—including a targeted ack that is the first message
  from the new sender—is emitted before any resulting readiness or delegate
  effect;
- reports guesser readiness to `WordlessApp` only after that targeted ack;
  immediately before the first product start, enqueues one fresh ack targeted
  to the bound guesser connection so FIFO ordering normally makes the browser
  ready first; the initial-start barrier handles loss of only that ack. The
  composition root reads the confirmed guesser connection through
  `getConfirmedPeerConnectionId()` and stamps it as the start target; null
  blocks the send. Only the composition root calls
  `WordlessEngine.setCounterpartReady(true, nowMs)` and publishes the resulting one
  `round.start` effect—the adapter never authors round state;
- acknowledges the browser's two-second pings. The guesser peer timer is
  disarmed during initial waiting, armed only by first accepted guesser
  presence, refreshed by later accepted guesser traffic, and disarmed on
  close/recovery; six armed seconds of silence emits
  `COUNTERPART_TIMED_OUT` independently of the local channel still being
  `SUBSCRIBED`;
- answers only transport/routing failures from a recognized peer—wrong round,
  stale sequence, or sequence gap—with correlated `guess.rejected`; for
  `WRONG_ROUND`, the rejection envelope deliberately uses the request's
  well-formed round ID so the requester can accept its correlation before
  resetting. Accepted guesses flow to `WordlessApp`, where
  `WordlessEngine.submitGuess` alone produces wrong-phase, duplicate-ID, and
  already-tried-choice rejection effects. A sequence gap additionally enters
  the shared new-round recovery path by emitting `SEQUENCE_GAP` through
  `onControl` before dropping the payload. Peer replacement likewise emits a
  typed control fact rather than mutating the engine. Malformed,
  oversized, wrong-session,
  wrong-authority, and unknown-sender payloads remain log-and-drop;
- emits status for every official subscription state;
- stops timers and calls `removeAllChannels()` on close/destroy;
- exposes `RelayDiagnostics` from owned channel/timer/listener registries;
- records counts and largest serialized message without logging payload secrets.

- [ ] **Step 5: Implement the pure receive policy against the red tests**

`Assets/Wordless/Scripts/Core/ReceivePolicy.ts` is pure, imports only from
`./Protocol`, and is consumed unchanged in three environments: the Lens adapter
uses its relative Core import, `transport-policy.test.mjs` imports
`../../Assets/Wordless/Scripts/Core/ReceivePolicy.ts` directly, and only the
browser uses `@wordless/core/ReceivePolicy`. It owns sanitized-message session,
current-round routing, role authority,
active peer sender/connection, local subscription context, monotonic sequence,
duplicates, and gaps. The adapter calls
`beginLocalSubscription(connectionId, isReconnect)` before each subscribe. It never imports
Supabase, owns gameplay phase, or mutates either store; `WordlessEngine` remains
the phase authority. Presence ready/ack and transport ping/ack are explicitly lobby-scoped and
exempt from current-product-round equality; all gameplay/stroke messages are
not. Every non-presence message from an unbound sender is `UNKNOWN_SENDER`.
Adapters forward a non-null `ReceivePeerTransition` structurally as the matching
`RelayControlEvent`; they do not maintain a second peer-connection cache to
reconstruct old/new IDs.

Expose these exact result shapes:

```ts
export type ReceiveRejectReason =
  | 'WRONG_SESSION' | 'WRONG_ROUND' | 'WRONG_AUTHORITY'
  | 'UNKNOWN_SENDER' | 'DUPLICATE_SEQUENCE'
  | 'STALE_SEQUENCE' | 'SEQUENCE_GAP' | 'STALE_CONNECTION'

export type ReceivePeerTransition =
  | {
      readonly type: 'PEER_REPLACED'
      readonly previousSenderId: string
      readonly nextSenderId: string
      readonly previousConnectionId: string
      readonly nextConnectionId: string
    }
  | {
      readonly type: 'PEER_REJOINED'
      readonly senderId: string
      readonly previousConnectionId: string
      readonly nextConnectionId: string
    }

export type ReceiveDecision =
  | {
      readonly accepted: true
      readonly peerTransition: ReceivePeerTransition | null
    }
  | { readonly accepted: false; readonly reason: ReceiveRejectReason }
```

Test these message sequences:

```text
case A: first ready conn-a from guesser-a sequence 1 -> bind; sequence 2 -> accept
case B: first observed ready conn-a from unbound guesser-a sequence 2 -> baseline
targeted presence.ack for current local connection -> accept; stale target -> STALE_CONNECTION
handshake locked: ready conn-a sequence 1 -> lose same-sender lobby control 2 -> retry-ready 3 bridges/re-acks -> matching targeted ack 4 completes tuple
local reconnect + targeted ack after missed peer sequences -> accept as handshake barrier
guesser-a sequence 2 duplicate -> reject DUPLICATE_SEQUENCE
guesser-a sequence 1 after sequence 40 -> reject STALE_SEQUENCE
contiguous wrong-round sequence 41 -> reject but consume high-water; valid sequence 42 succeeds
contiguous browser round.result -> reject WRONG_AUTHORITY, consume; next sequence succeeds
guesser-a sequence 42 after sequence 40 -> reject SEQUENCE_GAP and record gap pending
fresh ready from guesser-b/conn-b sequence 1 -> exact PEER_REPLACED transition
fresh ready from unbound guesser-c/conn-c sequence 37 -> new baseline
same guesser sender with distinct conn-d and sequence above high-water -> exact PEER_REJOINED transition
retry ready with same conn-d -> accept/re-ack with null transition
wrong session -> reject WRONG_SESSION
browser POINT_COUNT_MISMATCH round.resync.request for current terminal round -> accept
initial painter ready sequence 1 -> lose targeted ack sequence 2 -> valid first round.start sequence 3 targeted to current browser connection bridges lobby gap and binds product round -> targeted ack retry sequence 4 accepted/idempotent
new browser conn-z receives bound painter ready, then contiguous old round.start targeted to prior browser conn-y -> STALE_CONNECTION and consume sequence, no tuple confirmation or round bind; later targeted ack/start for conn-z recovers without a false gap
old-round reset carrying distinct next ID and current browser target -> accept, switch round, then accept next-round start
new browser conn-z loses its ready, then receives an already-started old reset targeted to conn-y -> STALE_CONNECTION and consume only if contiguous; no tuple confirmation/reset/ack; later ready plus conn-z-targeted reset recovers
painter 40 -> current-connection-targeted reset 42 as first gap -> accept barrier because 42 >= observed 42 and > high-water 40
painter 40 -> gap 42 -> blocked ordinary 43 -> authorized reset retry 44 -> ack -> start 45
accepted reset retry for cached previous-to-current transition -> no second store reset, fresh ack
wrong-sender reset, ordinary message while gap-pending, and unrelated old reset -> reject
guesser 40 -> gap 42 -> blocked 43/44 -> local resync advances to 44 -> accept 45
matching reset ack as first guesser gap -> accept transition barrier and publish start
resync request under immediately previous round while ack pending -> resend cached reset only
resync request under pending current-new round while ack pending -> resend cached reset only
resync request under previous round after ack -> resend current start; older round -> reject
```

Evaluation order is security-significant. The first accepted ready or targeted ack from an
unbound sender—or from a genuinely new replacement sender—establishes its
high-water at any valid positive sequence; messages sent before the other side
subscribed are non-replayed and may never be observed. Only a previously bound
same sender is checked for next-sequence contiguity. Wrong-session or
wrong-role presence cannot establish a baseline. Linked-channel tests lose
initial ready sequence one and prove a later ready/targeted ack binds in both
join orders and its next contiguous message succeeds. A same-sender distinct
peer connection ID with sequence above high-water may bridge a reconnect but
must emit `PEER_REJOINED` once; repeating that ID is only an idempotent re-ack.
A targeted ack for the current locally reconnecting connection may bridge
missed peer sequences without claiming their product payloads. Stale-target
acks and same-connection sequence skips cannot rebase.
Wrong-session, unknown-sender, duplicate-sequence, and stale-sequence input
never advances sequence. A correctly sequenced
message from the bound peer consumes high-water even when later rejected as
`WRONG_ROUND`, `WRONG_AUTHORITY`, or `STALE_CONNECTION`, while product/store
state remains unchanged;
otherwise the next valid message would become a false gap.

There is also a narrow handshake barrier while the current
`(localConnectionId, peerSenderId, peerConnectionId)` tuple has not yet been
confirmed by its targeted app-readiness ack (or, browser-side, the authorized
initial start/reset proof below). A well-formed same-peer/same-connection
`presence.ready`, or an ack targeted to that current local connection, may
advance high-water across missing lobby-control sequences when its sequence is
above accepted high-water and at least the latest observed candidate. Ready
still only binds/re-acks; the matching targeted ack, or the browser-only
authorized initial start/reset proof, confirms that tuple.
Once the tuple is acknowledged, same-connection skips revert to ordinary gaps
until a peer transition invalidates the tuple and reopens the handshake window.
Linked tests require painter ready sequence 1, lost painter-authored lobby ack
sequence 2, painter retry-ready sequence 3 accepted/re-acked, and a later valid
targeted ack without a gap storm. This barrier never dispatches gameplay.

There is one narrow initial-product barrier. After valid painter presence has
bound the sender/connection but before the browser has any product round, the
first well-formed painter `round.start` may advance high-water across missing
lobby-control sequences and bind its advertised round. It must come from that
bound painter, target the browser's exact current local connection ID, use a
non-lobby round ID, exceed accepted high-water, and be at least the latest
observed candidate sequence. A start for an earlier browser connection can
never act as a barrier or confirm the tuple. The candidate first raises the
observation, so equality is valid. This exception is permanently disabled once
a product round exists; later starts require ordinary contiguity or an
authorized reset transition. Test ready sequence 1, lost targeted ack sequence
2, accepted start sequence 3, then fresh targeted ack sequence 4 as an
idempotent store no-op rather than a gap or phase regression.
Accepting that initial start confirms the browser's current peer tuple and
cancels its ready retry timer. An authorized painter reset received while the
browser tuple remains unconfirmed does the same before the normal
delegate-before-reset-ack path, but only when its target equals the browser's
current local connection.

For a real gap, policy records `gapPending { senderId, observedSequence }`
without applying the payload. Ordinary messages from that sender remain
blocked, but each higher, well-formed message from that same bound sender raises
`observedSequence` to the maximum seen so recovery cannot finish behind traffic
that arrived during the reset. Invalid/wrong-session/unknown-sender input never
raises it. On the browser side, only a reset from the already bound painter,
addressed to the current old round, carrying a distinct next ID, targeting the
browser's exact current local connection, and sequenced at or above the latest
observation **and** above accepted high-water may bypass contiguity. A stale-
target reset can consume an otherwise-contiguous sequence but never acts as a
barrier, confirms the tuple, releases quarantine, dispatches, or produces an
ack. The candidate reset itself first raises the observation, so equality
is required for the common “reset is the first gapped message” case; requiring
strictly above observation deadlocks. A reset arriving behind a later observed
ordinary message cannot pass, but Lens's cached retry has a fresh sequence and
can. Policy acceptance of a reset only moves high-water to its sequence,
switches the policy's current round, and clears the gap. `BrowserRelayClient`
then synchronously dispatches the sanitized reset to its delegate; only after
that atomic callback succeeds does it record the transition as committed and
enqueue `round.reset.ack`. If the callback throws, the next authorized retry
must invoke it again. After one recorded successful commit, later retries skip
delegate dispatch and re-ack idempotently.

On the Lens side, a matching `round.reset.ack` under the pending new ID may use
the same `sequence >= observedSequence && sequence > highWater` transition-
barrier exception when it is the first gapped browser message. Receiving any
other browser gap makes the composition root call `applyRound`; only after that
local reset and reset send may it call policy's
`completeLocalResync(senderId)`, which advances high-water to the latest
recorded observation and clears the gap. It never moves a mark backward, and
every sequence through that maximum remains stale.

While an old-to-new reset is cached, a sanitized request from the bound browser
is routable when its envelope equals either the Lens's current new ID or that
immediately previous old ID. Before ack, a request under either accepted ID
only resends the cached reset and never calls `applyRound` again. After ack, a
previous-ID request may resend the cached current `round.start`; a request for
the acked current ID may enter a genuinely new `applyRound` transition only
for `POINT_COUNT_MISMATCH` while the authoritative Lens phase is `CORRECT`,
`GLYPH_LOCKED`, or `TIMED_OUT` and no reset is pending. All retransmissions get fresh transport sequences. Anything older
or unrelated is rejected. These
control-message exceptions alter sequence/transition state only; they never
merge or dispatch partial gameplay payloads.

Current-round binding is explicit. Lens composition calls
`relay.setLocalRound(roundId)` after each local `applyRound`. After it has sent
the resulting reset for a `SEQUENCE_GAP` control event, it calls
`relay.completeLocalResync(senderId)` exactly once. A browser with no bound
product round may accept its first painter `round.start` only after accepted
painter ready or a targeted painter ack, and only when the start targets the
browser's current local connection; only that first start may use the initial-
product sequence barrier defined above. If a fresh
browser joins during a noninitial transition, it may instead accept the bound
painter's valid old-to-new reset despite having no prior product ID, but only
when it targets that browser's current local connection; it then acks and binds
the advertised next ID. Thereafter, only an accepted Lens
`round.reset`—enveloped with the current old ID and carrying the distinct next
ID plus the browser's exact current target—authorizes that next round, and its
later start must still target the browser's then-current local connection.

The sender ID is the connection-instance epoch: a full browser/Lens restart
creates a new ID; transient re-subscription retains it and the sequence. A
same-sender sequence restart never resets the high-water mark. When a new peer
sender replaces the active one, the composition roots enter disconnected state
and recover only through a new `applyRound`; they never merge the old stroke.
For a same-sender reconnect, the browser store clears display geometry while
policy retains the last authorized old round solely to validate its reset. A
true peer replacement clears that authorization after disconnect, so the new
bound painter's first start follows the initial-binding rule.

- [ ] **Step 6: Replace the spike in the scene**

Through one Lens MCP writer, remove the `RelaySpike` component, attach
`SupabaseRelayTransport`, preserve the ignored Supabase input, and save.
Gate 0's committed spike evidence remains the baseline; do not claim the
transport alone reproduces its point/guess path before the browser surface and
`WordlessApp` exist. After compile confirms no remaining Lens import, delete
`RelaySpike.ts`, `ProbeProtocol.ts`, and `spike-protocol.test.mjs` together so
the root core-test glob never points at a deleted implementation. Task 9 later
replaces the separate web probe entrypoint; Task 11/12 own live product-path
equivalence.

- [ ] **Step 7: Verify both adapters**

```bash
npm run check
sh tools/typecheck/check.sh
```

Then compile and run Preview only far enough to prove the attached transport
configures its client, subscribes to the public channel when invoked, reports
literal transport status, and cleans up without runtime exceptions. No auth
claim is made, and `SUBSCRIBED` is not app
readiness. Task 8 acceptance comes from the deterministic linked-adapter/policy
matrix, web build, Lens typecheck, compile, and those lifecycle logs; it makes
no live product-round, point, guess, reload, or latency claim.

- [ ] **Step 8: Commit the production transport**

```bash
git add Assets/Wordless/Scripts/Core/ReceivePolicy.ts Assets/Wordless/Scripts/Core/ReceivePolicy.ts.meta Assets/Wordless/Scripts/Transport/SupabaseRelayTransport.ts Assets/Wordless/Scripts/Transport/SupabaseRelayTransport.ts.meta web/src/relay-client.ts web/tests/relay-client.test.ts tools/core-tests/transport-policy.test.mjs Assets/Scene.scene Assets/Scene.scene.meta docs/prompt-log.md
git add -u -- Assets/Wordless/Scripts/Spike/RelaySpike.ts Assets/Wordless/Scripts/Spike/RelaySpike.ts.meta Assets/Wordless/Scripts/Spike/ProbeProtocol.ts Assets/Wordless/Scripts/Spike/ProbeProtocol.ts.meta tools/core-tests/spike-protocol.test.mjs
git diff --cached --check
git commit -m "feat: add validated WORDLESS relay adapters"
```

### Task 9: Build the browser guessing surface

**Files:**

- Create: `web/src/web-round-store.ts`
- Create: `web/src/render.ts`
- Replace scaffold: `web/src/main.ts`, `web/src/styles.css`, `web/index.html`
- Create: `web/tests/web-round-store.test.ts`
- Create: `web/tests/render.test.ts`
- Create: `web/e2e/wordless.spec.ts`
- Create: `web/playwright.config.ts`
- Modify: `web/vite.config.ts`
- Modify: `web/package.json`, `web/package-lock.json`
- Delete after replacement: `web/src/probe-protocol.ts`
- Delete after replacement: `web/src/relay-probe.ts`
- Delete after replacement: `web/tests/probe-protocol.test.ts`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Frozen protocol, `BrowserRelayClient`, exact glyph geometry,
  session code input.
- Produces: Join, waiting, active, incorrect, correct, glyph, timeout, and
  disconnected views that remain readable at phone and desktop widths.

- [ ] **Step 1: Write store tests before UI code**

Cover these reducer sequences:

```ts
describe('WebRoundStore', () => {
  it('does not call the channel subscription CONNECTED by itself', () => {})
  it('maps typed transport states without letting recovery close appear final', () => {})
  it('ready binds painter but stays waiting; targeted ack enters READY; authorized start enters ACTIVE', () => {})
  it('authorized start may move waiting to ACTIVE; a later targeted ack cannot regress it', () => {})
  it('authorized reset may confirm reconnecting to live READY; a later ack is a no-op', () => {})
  it('ignores a retransmitted current round.start without resetting state', () => {})
  it('appends already-policy-accepted point batches in dispatch order', () => {})
  it('allows only one in-flight guess and disables the full grid while pending', () => {})
  it('returns the exact generated guess ID and round ID used by pending correlation', () => {})
  it('keeps an incorrect card coral and the remaining cards active', () => {})
  it('matching rejection clears the single pending guess; other IDs do not', () => {})
  it('three-second delivery deadline enables retry without inventing outcome', () => {})
  it('late incorrect for an expired guess preserves a newer pending retry', () => {})
  it('late authoritative correct clears any newer pending retry and ends round', () => {})
  it('locks only the matching correct round generation after 450 ms', () => {})
  it('ignores a stale glyph-lock callback after reset or reconnect invalidation', () => {})
  it('authoritative timeout clears pending, disables guesses, and creates no glyph', () => {})
  it('requires exact finalPointCount before deriving the glyph', () => {})
  it('count mismatch on correct or timeout requests one resync', () => {})
  it('count mismatch uses POINT_COUNT_MISMATCH, not SEQUENCE_GAP', () => {})
  it('returns one exact-round POINT_COUNT_MISMATCH resync intent', () => {})
  it('clears an incomplete stroke and requires a new round ID after reconnect', () => {})
})
```

Use literal protocol messages; do not mock correctness inside the store.

- [ ] **Step 2: Run store tests red**

Run: `npm --prefix web test`

Expected: missing `web-round-store.ts`.

- [ ] **Step 3: Implement the browser snapshot/reducer**

```ts
export interface WebRoundSnapshot {
  readonly connection: 'joining' | 'waiting' | 'live' | 'reconnecting' | 'failed' | 'closed'
  readonly phase: RoundPhase
  readonly sessionId: string
  readonly roundId: string
  readonly roundGeneration: number
  readonly choices: ChoiceTuple | null
  readonly points: readonly QuantizedPoint[]
  readonly pendingChoice: ChoiceIndex | null
  readonly pendingGuessId: string | null
  readonly pendingDeadlineAtMs: number | null
  readonly wrongChoices: readonly ChoiceIndex[]
  readonly revealedWord: string | null
  readonly finalPointCount: number | null
  readonly glyph: readonly QuantizedPoint[]
  readonly remainingMs: number
}

export type WebRoundIntent =
  | {
      readonly type: 'guess.submit'
      readonly roundId: string
      readonly guessId: string
      readonly choiceIndex: ChoiceIndex
    }
  | {
      readonly type: 'round.resync.request'
      readonly roundId: string
      readonly reason: 'POINT_COUNT_MISMATCH'
    }
```

`WebRoundStore.dispatch(message)` accepts painter-origin public messages plus
already-policy-approved targeted painter ack messages so the store can
represent connection readiness; a ready alone never enters the reducer, and it
accepts no guesser-authored wire message. It assumes `BrowserRelayClient` and
shared `ReceivePolicy` already performed sender/round authority, duplicate, stale, and gap
checks; the reducer does not implement a second sequence policy. A targeted
presence ack changes connection state to ready only from
`joining`/`waiting`/`reconnecting`. In `ACTIVE`, `CORRECT`, `GLYPH_LOCKED`, or
`TIMED_OUT` it is an idempotent no-op and can never regress phase or clear
round data.
`setTransportState(state, detail)` is the typed Task 8 delegate boundary. It
accepts only `joining`, `waiting`, `reconnecting`, `failed`, or `closed`;
`live` has no transport setter and remains derivable only from accepted painter
ack/start/reset proof. Status changes never invent a product phase or clear product state;
`invalidateForReconnect()` owns the explicit partial-display invalidation. It
may clear/hide incomplete points and mark `reconnecting`, but it cannot bind a
new round ID, phase, choices, or gameplay data.
The store owns a monotonic local `roundGeneration`, incremented only when an
authorized initial/new-epoch start binds a round, an accepted reset authorizes
a successor, or reconnect invalidation clears the projection. Expose
`lockGlyph(expectedRoundId, expectedRoundGeneration): boolean`; it transitions
`CORRECT -> GLYPH_LOCKED` only when both values still match, otherwise it is a
no-op. It never changes transport or round authority.
Construct `WebRoundStore` with an injected `guessIdFactory`.
`submitChoice(index, nowMs): WebRoundIntent | null` validates the choice,
obtains exactly one ID from that factory, atomically records that same
ID/choice/deadline, then returns the identically correlated `guess.submit`
intent; it cannot alter outcome. `dispatch(message): readonly WebRoundIntent[]`
returns the one typed resync intent on a terminal count mismatch, using the
store's exact authoritative round ID, and otherwise returns an empty array.
Tests prove the pending ID, returned wire draft mapping, and later
result/rejection correlation are identical; neither `main.ts` nor `render`
may generate a second guess ID. Guessing is explicitly single-flight: while `pendingGuessId` is set,
all four cards are disabled, the selected card alone reads `SUBMITTED`, and no
second intent can be created. This avoids representing multiple responses in a
store with one correlation slot. `pendingChoice` clears only on a matching
incorrect `round.result` or `guess.rejected`, authoritative
`round.timeout`/reset, or
`expirePending(nowMs)` after a three-second delivery deadline. Deadline expiry
only re-enables retry; it never changes phase or outcome. A late incorrect
marks its own choice without clearing a newer pending retry; a rejection with
a nonmatching ID is correlation-only and likewise leaves that retry intact.
Any accepted correct result is terminal
for the authoritative round, so it clears whatever pending retry exists even
when its `guessId` differs; timeout/reset do the same. On correct, the
accepted result's count must already equal the received points because the Lens
awaits its serialized final batches/end/result and policy enforces sequence.
Equality calls shared `normalizeGlyph`; any correct-result or timeout count
mismatch emits exactly one `round.resync.request`, enters reconnecting, and
never invents geometry or waits indefinitely. Timeout with a matching count
preserves the path for display and creates no glyph. `invalidateForReconnect()`
clears/hides incomplete points and display-only round data, enters
`reconnecting`, and accepts no playable round. Only the later accepted
Lens-authored reset—or a policy-approved initial/new-painter-epoch start when
no product round is bound—can bind a round ID produced through `applyRound`.
Same-sender old-round
validation remains internal to `ReceivePolicy` until its reset arrives.

In `web/src/main.ts`, create `WebRoundStore` before `BrowserRelayClient` and
inject a `BrowserRoundDelegate` whose `dispatchAccepted` calls the store's
synchronous reducer and whose `invalidateForReconnect` calls the named store
method; bind `setTransportState` to the store's same-named method. Only then
call `connect()`. The delegate never sends wire messages;
reset ack ordering remains inside the adapter and therefore occurs only after
the reducer has accepted/reset the advertised round.
One `main.ts` helper maps each returned union member one-for-one to a
`RelayMessageDraft` and calls the client send path; it copies the supplied
`roundId`, `guessId`, choice, and reason without regeneration or inference.
The delegate calls that helper for every intent returned by `dispatch`; the
choice-click handler calls it for the non-null `submitChoice` return.
When an accepted correct result first enters `CORRECT`, capture its round ID and
store generation and schedule exactly one local 450 ms completion callback.
That callback calls `lockGlyph(capturedRoundId, capturedGeneration)`, rerenders
only on true, and emits a secret-safe browser phase diagnostic. Reset,
reconnect, teardown, or a later correct clears the owned timer; the store guard
still makes any already-queued stale callback harmless. This state behavior is
required before Gate 1; Task 13 later replaces the visual interpolation, not
the phase authority.

- [ ] **Step 4: Install and isolate the DOM-test environment**

Run:

```bash
npm --prefix web install --save-dev jsdom
```

Add `// @vitest-environment jsdom` only to the top of
`web/tests/render.test.ts`. In `web/vite.config.ts`, add
`/// <reference types="vitest/config" />` and merge this setting into the
existing config:

```ts
test: { include: ['tests/**/*.test.ts'] },
```

An explicit include keeps Vitest out of `e2e/` without replacing its default
dependency exclusions. Protocol/store tests stay in the Node environment.

- [ ] **Step 5: Write DOM-render tests**

Using Vitest's DOM environment, assert:

```text
WAITING FOR PAINTER appears before counterpart readiness
GUESSER and GUESS THE CLUE are always visible during a round
exactly four buttons exist and are at least 48 CSS px high
all buttons are disabled while pending; selected button is labeled SUBMITTED
incorrect button has text/icon in addition to coral
correct state includes the revealed word and canvas glyph
canvas has an accessible name
network errors appear in role=status without credentials
```

- [ ] **Step 6: Author the fixed semantic structure**

```html
<main class="app-shell">
  <header class="brand-row">
    <div><span class="eyebrow">WORDLESS RELAY</span><h1>GUESS THE CLUE</h1></div>
    <p id="connection" role="status"><span aria-hidden="true"></span> CONNECTING</p>
  </header>
  <section class="play-field" aria-labelledby="play-title">
    <h2 id="play-title" class="visually-hidden">Live clue from the painter</h2>
    <canvas id="stroke-canvas" width="1000" height="620" aria-label="Live clue drawing"></canvas>
    <div id="glyph-medallion" hidden aria-label="Solved clue glyph"></div>
  </section>
  <section id="choices" class="choice-grid" aria-label="Answer choices"></section>
  <p id="result" aria-live="assertive"></p>
</main>
```

The join screen asks for one six-character code. After joining, it leaves no
setup panel in the judged frame.

- [ ] **Step 7: Implement the canvas and card renderer**

`render(snapshot)` is the only DOM writer. It clears/redraws the canvas from
`snapshot.points`, maps `0..1000` to the current canvas client bounds, draws a
round-capped `#8B5CF6` line with a small `#FFD65A` endpoint, and never reads
correctness from the choices. `snapshot.glyph` is rendered from the exact
points inside a circular medallion.

Every answer button combines state:

```text
neutral: ivory + answer word
pending: selected card has violet border + “SUBMITTED”; whole grid is temporarily disabled
incorrect: coral + × + “TRY AGAIN”
correct: mint + ✓ + revealed answer
```

- [ ] **Step 8: Implement the production CSS without external assets**

Use only system fonts and CSS primitives:

```css
:root {
  color: #fff6e8;
  background: #200b2b;
  font-family: ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif;
  --violet: #8b5cf6;
  --lemon: #ffd65a;
  --mint: #73e6ae;
  --coral: #ff786a;
  --ivory: #fff6e8;
  --plum: #200b2b;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.75rem, 2vw, 1.25rem);
}

.choice-grid button {
  min-height: 5.25rem;
  border: 2px solid transparent;
  border-radius: 1.25rem;
  background: var(--ivory);
  color: var(--plum);
  font: 800 clamp(1.15rem, 3vw, 1.75rem)/1 system-ui;
}
```

At widths below 440 px retain the 2×2 grid; reduce padding, not target height or
type legibility. Do not add browser mock chrome, gradients that obscure state,
or the generated reference images.

- [ ] **Step 9: Wire real intents and timer**

`main.ts` composes environment, `BrowserRelayClient`, `WebRoundStore`, and
`render`. A choice click builds a `RelayMessageDraft` with type `guess.submit`,
the current `roundId`, and payload `{ guessId, choiceIndex }`; the transport
stamps session and every other base field. A 100 ms local timer tick changes only the
displayed remaining time; Lens `round.result`, `round.timeout`, or reset remains
authoritative. Add an in-page relay factory injection seam for Playwright;
production uses it only when a test installs the global before module startup,
and the production bundle contains no fake event script or credentials.

- [ ] **Step 10: Add responsive end-to-end tests**

Install the locked test package and matching Chromium binary:

```bash
npm --prefix web install --save-dev @playwright/test
npm --prefix web exec -- playwright install chromium
```

Create `web/playwright.config.ts` with `testDir: './e2e'`, a fixed
`http://127.0.0.1:4173` `baseURL`, a `webServer` command using port 4173 with
`--strictPort`, and Chromium-only phone/desktop projects at `390×844` and
`1440×900`. Each spec installs the fake relay factory with
`page.addInitScript()` **before** `page.goto()`, so tests need neither credentials
nor a live Supabase service. Assert four visible cards, no horizontal overflow, matching
pending/rejected/timeout behavior, wrong then correct state, and exact-path
glyph derivation after `finalPointCount`. Advance the injected clock through
450 ms and assert `CORRECT -> GLYPH_LOCKED`; reset/reconnect before completion
and assert the stale callback cannot lock the new projection. Save screenshots under the Playwright
report, never `web/public/`.

Add `"test:e2e": "playwright test"` to `web/package.json`, then run:

```bash
npm --prefix web test
npm --prefix web run build
npm --prefix web run test:e2e
```

Before passing, run collection-only checks:

```bash
npm --prefix web exec -- vitest list
npm --prefix web exec -- playwright test --list
```

Require Vitest to list only `web/tests/**/*.test.ts` and Playwright to list only
`web/e2e/**/*.spec.ts`.

- [ ] **Step 11: Delete the browser spike and commit the product surface**

Delete `probe-protocol.ts`, `relay-probe.ts`, and their test only after the
real store/adapter/render tests, fake-relay Playwright paths, collection
boundaries, and production build all pass. Confirm `rg -n
'wordlessProbe|RelayProbe' web/src web/tests` returns no match, so the raw dev
send escape hatch cannot ship. This task makes no live Lens↔browser equivalence
claim; Task 11/12 perform the Gate 0 product-path reproduction after
`WordlessApp` exists.

```bash
git add web docs/prompt-log.md
git diff --cached --check
git commit -m "feat: build WORDLESS browser guesser"
```

### Task 10: Build the spatial brush and ribbon

**Files:**

- Create: `Assets/Wordless/Scripts/Input/BrushController.ts`
- Create: `Assets/Wordless/Scripts/View/StrokeRibbonView.ts`
- Create: `Assets/Wordless/Scripts/View/StrokeRibbonMesh.ts`
- Create temporarily: `Assets/Wordless/Scripts/Spike/BrushPreviewHarness.ts`
- Modify through Lens Studio MCP: `Assets/Scene.scene`
- Create through Lens Studio MCP: original materials under
  `Assets/Wordless/Materials/`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: `acceptWorldPoint`, `quantizePlanePoint`, SIK
  `Interactable`/`InteractableManipulation` confirmed from installed source.
- Produces: A locally executable draggable lemon brush constrained to a
  180×110 cm vertical drawing plane and a bounded violet world-space ribbon.
  The temporary harness proves input-to-render behavior without importing the
  Task 11 composition root; it is deleted when `WordlessApp` replaces it.

- [ ] **Step 1: Verify exact SIK and mesh APIs before coding**

Inspect the installed SIK package source and generated declarations under
`Cache/TypeScript/lib/LensifyTS/Declarations/` for:

```text
Interactable.getTypeName()
InteractableManipulation.getTypeName()
onManipulationStart / onManipulationEnd
MeshBuilder constructor, topology, index type, append/update/getMesh
RenderMeshVisual mesh/material assignment
```

Record exact signatures in the prompt log. If any named API differs, use the
installed signature and update this task's implementation note before editing.

- [ ] **Step 2: Implement the brush event boundary**

Expose:

```ts
export interface BrushListener {
  onStrokeStart(strokeId: string): void
  onStrokePoint(world: WorldPoint, normalized: QuantizedPoint): void
  onStrokeEnd(strokeId: string): void
}

export interface BrushRoundControl {
  armForRound(roundId: string): void
}
```

`BrushController` creates/receives far-field ray targeting plus SIK
manipulation components; at the planned distance it must not depend on
near-field reach. On
manipulation start it creates a monotonic `stroke-N` ID; on each `UpdateEvent`
while manipulating it derives its clamps from the shared geometry constants:
local x to `±DRAWING_WIDTH_CM / 2` (currently `[-90, 90]`), local y to
`±DRAWING_HEIGHT_CM / 2` (currently `[-55, 55]`), and local z to `0`. It then
emits only points accepted by the 2.5 cm sampler. The brush emits
`onStrokeEnd` exactly once on manual release; Task
10's harness ends locally, and
Task 11's composition root later maps that event to the engine's shared close.
The brush never resets the round itself.

When accepting a point reaches `MAX_STROKE_POINTS`, emit that final point and
close sampling exactly once. Ignore later `UpdateEvent` samples until the
manipulation is released; release must not emit a duplicate end. The
controller emits one end event and refuses a second manipulation until a new
round re-arms it. Task 11 maps this to the engine close that drains queued
points before one wire `stroke.end`. The eventual round remains `ACTIVE` for
guesses and the HUD shows `STROKE COMPLETE`. Log `CAP_REACHED count=128`
without geometry.

`BrushController` implements `BrushRoundControl`. `armForRound(roundId)`
accepts the initial well-formed product ID or any distinct well-formed new
round ID, regardless of whether the previous round ever started a stroke;
repeating the same ID is always a no-op and cannot re-arm. A distinct ID clears
only the controller's per-round input latch and sampler history. Test the edge
`round A terminal without stroke -> arm B -> close B -> duplicate arm B` and
require the duplicate to remain blocked. In Task 10 the
temporary harness calls it once for its local spike round. In production only
`WordlessApp`, after the matching `applyRound` transition has reached
counterpart-ready `ACTIVE`, calls it with that engine snapshot's ID. This is a
downstream input binding, never an independent reset door.

- [ ] **Step 3: Build an original additive-safe ribbon mesh**

`StrokeRibbonMesh` uses `MeshBuilder` with position, normal, and UV attributes.
For each consecutive point pair, emit two perpendicular quads of 3.6 cm total
width with material cull mode disabled or reverse-wound duplicate triangles so
both sides actually render. Skip zero-length segments. Cap input at 128 points
and use `UInt16` indices. This crossed geometry prevents the stroke collapsing to a
hairline from side angles without copying FIRST BOUNCE's ray styling or code.

`StrokeRibbonView.render(worldPoints)` rebuilds at most when an accepted sample
arrives, never on an unchanged timer/store snapshot. It maintains:

```text
outer pass: violet, 7.0 cm, low alpha but saturated
core pass: violet/ivory-hot, 3.6 cm, full alpha
draw head: lemon sphere, 5 cm visible diameter
```

No particles, semantic icons, external textures, or black materials.
`StrokeRibbonView.getOwnedResourceCounts()` reports its currently owned
SceneObject and material-instance counts from the same internal registrations
used for creation/destruction; it does not scan or mutate the scene.

- [ ] **Step 4: Author the drawing volume from the actual camera**

Through Lens Studio MCP, inspect active camera pose and existing objects. Create
`DrawingAnchor` at:

```text
camera position + camera forward × 160 cm + world up × 15 cm
```

Orient its local plane toward the camera. Create a 14 cm collider around the
5 cm visible brush head, attach SIK manipulation, and keep the drawing plane
itself invisible in judged mode. Do not place anything at an assumed origin.
Verify the entire plane and eventual medallion are simultaneously visible at
the judged Preview pose. If not, move the anchor toward 250 cm and adjust the
judged camera/medallion placement while preserving the frozen 180×110 cm plane.
Do not shrink the plane without a separately reviewed geometry/test amendment;
the shared quantization constants and brush bounds must remain identical.

- [ ] **Step 5: Connect brush events to the temporary local harness**

`BrushPreviewHarness` implements `BrushListener`, keeps one bounded local array,
and calls `StrokeRibbonView.render` for each accepted point. It logs only
start/end/count/cap facts. It does not import `WordlessEngine`, construct a
transport, author protocol messages, or pretend browser delivery. This makes
Task 10 executable before Task 11 while proving the real SIK boundary and
spatial render. The harness rejects a second manipulation after manual/cap
close until Preview refresh, mirroring the frozen one-stroke contract.

- [ ] **Step 6: Verify interaction in Preview**

Compile, run Preview, and use the available Preview interaction tool to drag
the brush through an S-curve. Require:

```text
one start and one end log
between 12 and 128 accepted samples
all local z values equal zero
no sample closer than 2.5 cm to its predecessor
visible violet ribbon and lemon endpoint
no runtime error or per-frame SceneObject creation
full plane and medallion region visible together at the judged pose
```

Capture front and 30-degree side views; the ribbon must remain readable in both.
Run a dedicated cap path and require exactly 128 locally accepted points,
one start/one end total, no later local sample acceptance, and
`CAP_REACHED count=128`. Repeat a short manual-release stroke and require one
local end and no second stroke. Browser delivery, transport cadence, ordered
`stroke.end`, and post-close guess acceptance are intentionally deferred to
Task 11, where the engine and composition root actually exist.

- [ ] **Step 7: Commit the spatial drawing surface**

```bash
git add Assets/Wordless/Scripts/Input/BrushController.ts Assets/Wordless/Scripts/Input/BrushController.ts.meta Assets/Wordless/Scripts/View/StrokeRibbonView.ts Assets/Wordless/Scripts/View/StrokeRibbonView.ts.meta Assets/Wordless/Scripts/View/StrokeRibbonMesh.ts Assets/Wordless/Scripts/View/StrokeRibbonMesh.ts.meta Assets/Wordless/Scripts/Spike/BrushPreviewHarness.ts Assets/Wordless/Scripts/Spike/BrushPreviewHarness.ts.meta Assets/Wordless/Materials Assets/Scene.scene Assets/Scene.scene.meta docs/prompt-log.md
git diff --cached --check
git commit -m "feat: add WORDLESS spatial brush and ribbon"
```

### Task 11: Compose Lens state, HUD, result, and replay

**Files:**

- Create: `Assets/Wordless/Scripts/View/LensHudView.ts`
- Create: `Assets/Wordless/Scripts/View/GlyphMedallionView.ts`
- Create: `Assets/Wordless/Scripts/Input/ReplayController.ts`
- Create: `Assets/Wordless/Scripts/Core/RecoveryCoordinator.ts`
- Create: `Assets/Wordless/Scripts/WordlessApp.ts`
- Create: `tools/core-tests/recovery-coordinator.test.mjs`
- Delete after replacement: `Assets/Wordless/Scripts/Spike/BrushPreviewHarness.ts`
- Modify through Lens Studio MCP: `Assets/Scene.scene`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Engine/store, Lens relay adapter, brush, ribbon, exact glyph
  points, and a world-anchored replay interaction.
- Produces: One complete Lens-side round, literal connection truth, wrong and
  correct states, deterministic glyph lock, timer, and replay through
  `applyRound`.

- [ ] **Step 1: Implement write-only view contracts**

```ts
export interface LensHudView {
  render(snapshot: LensRoundState): void
  getOwnedResourceCounts(): { readonly sceneObjects: number; readonly materials: number }
}

export interface GlyphMedallionView {
  hide(): void
  render(points: readonly QuantizedPoint[], revealedWord: string): void
  getOwnedResourceCounts(): { readonly sceneObjects: number; readonly materials: number }
}
```

No view counts points, derives outcomes, chooses words, starts rounds, or sends
network messages.

- [ ] **Step 2: Author the minimal Lens HUD**

Through MCP create bright, depth-test-disabled text and saturated primitives:

```text
upper left: PAINTER · DRAW: SNAKE
upper right: 0:20 countdown ring/text
lower left: connection dot + WAITING FOR GUESSER / CONNECTED
result zone: TRY AGAIN / SNAKE!
```

Use ivory type, lemon timer, mint connection/correct, and coral incorrect. Do
not use an opaque dark card. Size every label from captured readability at the
judged Preview pose, not from the reference-image pixel scale.
Anchor every HUD element to the `DrawingAnchor` frame in world space and face
it toward the judged camera pose. Depth-test disable exists only to keep labels
legible over the ribbon; it must not turn the HUD into a head-locked screen
overlay.

`ReplayController` owns one bright world-anchored `PLAY AGAIN` label,
collider, and SIK `Interactable` beside the result zone. It exposes
`setAvailable(roundId, available)` plus one request listener. It is hidden and
non-interactable outside `GLYPH_LOCKED`/`TIMED_OUT`; in particular, the 450 ms
`CORRECT` transition must finish before replay becomes available. A trigger emits
the bound round ID once, disables immediately, and never mutates a store. The
Preview interaction tool must be able to trigger it from the judged pose.
Its label/collider/material are authored once in the scene through MCP;
`ReplayController` only toggles those references and creates no runtime
SceneObject, material, timer, or per-round listener.

- [ ] **Step 3: Implement the deterministic medallion**

`GlyphMedallionView.render` converts exact quantized glyph points into a 34 cm
wide local mesh inside a bright circular frame within the simultaneously
visible `DrawingAnchor` composition—right, above, or inset according to the
Task 10 frame-fit proof. It adds the revealed word beneath. It may translate/scale the path but
must preserve count and order and may not redraw a snake or recognized object.

- [ ] **Step 4: Test recovery ownership, then build the composition root**

Before `WordlessApp`, write
`tools/core-tests/recovery-coordinator.test.mjs` against the pure
`Assets/Wordless/Scripts/Core/RecoveryCoordinator.ts`. The coordinator imports
only protocol/transport control types and owns the single-flight recovery token,
expected-local-close suppression, peer-tuple acknowledgment gate, pending
old-to-new transition identity, and reset/start release decisions. It exposes a
pure `handle(event): readonly RecoveryAction[]` plus immutable diagnostics; it
owns no channel, timer, store, SceneObject, or view. `WordlessApp` executes its
actions but may not duplicate its admission/state logic.

Table-drive local status overlap, expected close/disconnect recursion,
one-sided peer rejoin on a healthy channel, liveness close/connect followed by
that rejoin, lost reset/ack after rejoin, stale versus matching peer-tuple ack, reset retry
exhaustion, matching reset ack, and an ack-introduced replacement whose control
is handled before that same ack releases recovery and emits no presence reply.
Also enter local ambiguous-send recovery and peer-transition recovery while a
reset is already pending, once with its first send delivered and once not:
both must settle/re-ack the inherited transition, emit no start for its
disconnected engine, then perform exactly one fresh apply/reset/ack before
starting. Model that boundary explicitly: every token owns at most one
`APPLY_ROUND`. A disconnecting local channel/status failure or peer transition
while that token's reset is pending converts it to carryover-settlement-only,
even when its own ambiguous
send caused the failure; its ack closes that token without a start. The
coordinator then creates exactly one successor token for the fresh recovery
apply/reset/ack/start. A reset inherited from outside a recovery token is
adopted by a settlement-only token before the same single successor is
created. Overlapping failure signals coalesce into that one carryover/successor
episode and cannot allocate additional successors. A Lens-observed sequence
gap during a pending reset must only resend that reset and complete local
policy resync, never nest `applyRound`.
Require one `APPLY_ROUND` at most per token,
zero `CLOSE_LOCAL` for peer-only transitions, exactly one local close/connect
for overlapping local failures, cached-reset reuse, and one `START_ROUND` only
after the matching reset ack. Run it red before creating the module:

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/recovery-coordinator.test.mjs
```

Expected: module-not-found for `RecoveryCoordinator.ts`. Implement the smallest
state machine that makes the matrix green, then have `WordlessApp` delegate all
recovery-entry and release decisions to it.

`WordlessApp` constructs
`WordlessEngine(store, normalizeGlyph, takePointBatch)` and is the only
component that wires:

```text
RelayPort messages -> validation -> WordlessEngine commands
WordlessEngine effects -> RelayPort sends
RoundStore snapshots -> HUD, ribbon, medallion
Brush events -> WordlessEngine
timer event -> WordlessEngine.tick
```

It also subscribes to `RelayPort.onControl`. `PEER_REPLACED` and
`PEER_REJOINED` invalidate partial gameplay but keep the healthy local channel
and local connection ID unchanged. A ready-introduced transition queues its
targeted ack and restarts the local ready burst. An ack-introduced transition
emits no presence reply—acks never echo—and, after emitting control first, that
same ack satisfies the new local peer-tuple gate. The root calls
`relay.invalidateApplicationGeneration()` synchronously inside that control
listener, then calls `engine.disconnect()` and records one recovery intent.
Until the authorized reset/start barrier completes, policy-valid gameplay from
the recovering peer may consume receive sequence but cannot reach
`WordlessEngine`; this suppresses the one old payload whose channel send may
already have started. It does not apply or
resend a reset until the peer returns a targeted ack for the Lens's current
local connection. After that gate, if no reset is pending it calls `applyRound`
once. If a reset was already pending when `engine.disconnect()` ran, mark it as
an inherited carryover and resend it first; its ack settles browser policy but
must not start the disconnected engine. That ack instead triggers one fresh
`applyRound(settled -> recovery)` and a second reset/ack barrier, whose ack may
start. These peer
transitions never call `relay.close()` or `relay.connect()`.
`SEQUENCE_GAP` dispatches no payload and first invalidates the current
application generation. With no reset pending, it calls
`applyRound` once, calls `relay.setLocalRound(newRoundId)`, and sends the
old-to-new reset. With a reset pending, it only resends that cached transition;
it never nests another round. In either case, after the applicable reset draft
send settles it calls `relay.completeLocalResync(event.senderId)` so the next
browser sequence can proceed. Ordinary replay/recovery also calls
`setLocalRound` immediately after each local `applyRound`. No adapter reaches
into the engine/store and no root reimplements sequence comparisons.
The root also subscribes to `RelayPort.onStatus`. `COUNTERPART_TIMED_OUT`,
`CHANNEL_ERROR`, `TIMED_OUT`, an unexpected `CLOSED`, and an unexpected
`DISCONNECTED` after a formerly live subscription all enter the same
single-flight local close/connect recovery. The root marks its own deliberate
close/destroy window so the resulting expected `CLOSED`/`DISCONNECTED` status
cannot recursively enter recovery; teardown never reconnects. `CONNECTING` and
`SUBSCRIBED` are transport facts only and never mean app-level connected or
call `setCounterpartReady`.
The root renders replay availability from snapshots. It accepts a replay
request only when the callback's bound ID equals the current terminal round,
then increments the local counter and enters the same `applyRound`/reset-ack
path. Repeated, stale, READY, or ACTIVE requests are no-ops. This is the one
concrete user-facing replay seam; tests and capture do not call `applyRound`
directly to simulate a replay.

On Lens start, generate one eight-character instance nonce, set the counter to
one, call `createRoundId(instanceNonce, counter)`, and pass that ID to
`applyRound(..., WORD_DECK[0], Date.now(), 20000)`. Because this is the initial
product round it emits no reset; immediately call
`relay.setLocalRound(initialRoundId)`. On browser readiness, call
`setCounterpartReady(true, nowMs)` only when
`relay.getConfirmedPeerConnectionId()` returns the current guesser connection;
map the resulting start effect with that exact `targetConnectionId` and publish
the public round. On correct,
show the medallion. The replay control increments the counter and calls
`applyRound` with the new epoch-qualified ID; no component manually clears its
own state first.

For every replay/recovery, convert the returned `publish-reset` into an
old-round-enveloped draft, cache only that semantic previous-to-next
transition, read the confirmed current guesser connection, and stamp it as the
reset's `targetConnectionId` at each send/retry. A null target blocks sending;
a changed target is used only after that new tuple passes the presence gate.
Send it through `RelayPort`. Remain `READY`: do **not** call
`setCounterpartReady` or send `round.start` until a matching
`round.reset.ack` under the new ID is accepted. Retry the same cached reset at
one-second intervals, at most three times, letting the transport assign a
fresh sequence each time. A duplicate ack is idempotent. On the first matching
ack, stop retries. Normally call `setCounterpartReady(true, nowMs)` and enqueue
exactly one new-round start targeted to the still-confirmed current guesser
connection; null or a changed tuple blocks the start and re-enters the existing
presence gate. If `RecoveryCoordinator` marks this transition as
an inherited carryover that survived `engine.disconnect()`, never start it:
call one fresh `applyRound(carryoverCurrent -> recoveryNew)`, send/ack that new
reset, and only its matching ack may start. Exhaustion shows reconnect/error
and starts no gameplay.

Connection recovery is exact and uses injected clocks for deterministic tests:

```text
peer loss / COUNTERPART_TIMED_OUT
  -> engine.disconnect() and inertly preserve the old Lens ribbon for display
  -> await relay.close(); all not-yet-started drafts are discarded
  -> independently, BrowserRelayClient clears its projection when it observes/owns browser recovery; WordlessApp never calls it
  -> relay.connect() on the same adapter (same sender ID, continued sequence)
  -> fresh presence handshake (same sender/continued sequence or new sender)
  -> if an old-to-new reset was pending at disconnect: resend and await its ack
  -> that carryover ack never starts; applyRound(settled -> recoveryNew) once
  -> otherwise: applyRound(current -> recoveryNew) once
  -> send/retry round.reset(old envelope -> new payload, current browser target) when an old round exists
  -> await round.reset.ack under the new ID
  -> setCounterpartReady(true, nowMs)
  -> one new round.start
```

Remote peer-connection transitions have a deliberately different flow:

```text
PEER_REJOINED / PEER_REPLACED on a healthy local channel
  -> ready-introduced: targeted ack + local ready restart on existing subscription
  -> ack-introduced: no reply; control first, then same ack satisfies local gate
  -> engine.disconnect() and invalidate partial gameplay
  -> keep the local channel and local connectionId unchanged
  -> await peer ack targeted to that unchanged local connectionId unless the introducing ack already satisfied it
  -> if no reset is pending: applyRound(newRoundId, currentCard, nowMs) once
  -> if a reset is pending: mark inherited, resend it, and await its ack
  -> inherited ack settles only; then applyRound(settled -> recoveryNew) once
  -> send the recovery reset only with the current browser target
  -> await the recovery reset's matching round.reset.ack
  -> setCounterpartReady(true, nowMs)
  -> one new round.start
```

All recovery entry points share one single-flight recovery episode. Each
transition token owns at most one Lens transition. A normal episode uses one
token; if a reset is already pending when a disconnect or peer transition
arrives, that token settles without starting and exactly one successor token
owns the fresh transition. Browser
liveness and sequence-gap recovery deliberately send no pre-close resync
request: the reconnecting peer's new connection ID creates one
`PEER_REJOINED`, which owns the one fresh Lens transition in the normal path.
A duplicate ready for that
peer only re-acks/retries the cached reset and cannot apply a second round. Only an
actual local channel/status failure, local liveness expiry, ambiguous send,
browser-side sequence-gap recovery, or local ready-retry exhaustion runs the close/connect
flow and changes the local connection ID. The other side remains subscribed.

An accepted `POINT_COUNT_MISMATCH` request for an acked current round in
`CORRECT`, `GLYPH_LOCKED`, or `TIMED_OUT`, with no reset pending, follows the
same new-round path. While a reset ack is pending, requests under either
the pending current-new or immediately previous ID only resend the cached reset.
When Lens
itself detects a browser-origin sequence gap, it completes the policy's local
resync only after applying/sending that reset, so the observed peer sequence
becomes stale and the next one can proceed. If a request arrives under the
immediately previous round while that transition is cached, resend the reset;
after ack, the same request may resend only the cached current start. Do not
call `applyRound` a second time for that previous-ID request. A full peer
replacement or sequence gap never republishes an old round start and never
merges partial geometry.

Every engine effect is tagged/checked against the current engine generation,
converted to a draft, and awaited through the transport's one outbound FIFO;
adapter-authored traffic uses that exact FIFO too. On correct/timeout, the
100 ms closing drain generates no more than one point batch per interval, and
the transport independently enforces actual send-start spacing before one
`stroke.end` (only if still active) and the terminal message carrying
`finalPointCount`. Delete `BrushPreviewHarness.ts`, remove its scene component
through Lens Studio MCP, and connect the real brush listener to
`beginStroke`/`appendPoint(..., nowMs)`/`endStroke` only in this task.
Call `brush.armForRound(snapshot.roundId)` only when that applied round reaches
`ACTIVE`; a repeated readiness/start for the same ID cannot re-arm it.

- [ ] **Step 5: Add runtime invariant logs**

Emit concise secret-safe lines:

```text
[Wordless] PHASE READY -> ACTIVE
[Wordless] STROKE points=<count> bytes=<count>
[Wordless] GUESS index=<index> outcome=<incorrect|correct>
[Wordless] GLYPH_LOCKED points=<count> hash=<pathCoordinateHash>
[Wordless] PEER_TIMEOUT sender=<role>
[Wordless] RESYNC old=<round> new=<round>
[Wordless] APPLY_ROUND round=<id>
[WordlessDiag] round=<id> listeners=<n> timers=<n> channels=<n> sceneObjects=<n> materials=<n>
```

Do not print the answer before reveal, public token, auth user data, or raw
message bodies. `WordlessApp.diagnosticSnapshot()` builds the diagnostic line
after each reset from `RoundStore.listenerCountForDiagnostics()`,
`RelayPort.getDiagnostics()`, and fixed owned-resource counters exposed by the
ribbon/HUD/medallion views. Use these same sources every round; the diagnostic
must not create a timer, listener, SceneObject, or material of its own.

- [ ] **Step 6: Verify Lens-only replay and state authority**

With transport connected, run wrong then correct. Invoke replay and require:

```text
old ribbon hidden
old glyph hidden
wrong-choice set empty
timer restored to 20 seconds
phase ACTIVE only after counterpart/round readiness
round ID incremented
one public round.start
one old-round reset before every noninitial new-round start
```

Also reproduce liveness recovery once: both surfaces display a literal
non-connected state, recovery creates a new round ID through `applyRound`, old
geometry is never merged, and the new sender/continued sequence is accepted.

Trigger the visible `PLAY AGAIN` item through Preview interaction after both a
correct and a timeout terminal. Require one request, immediate disable, one
new epoch-qualified round ID, reset/ack/start ordering, and no effect from a
second trigger carrying the old ID.

Exercise the integrations deliberately deferred from Task 10: a cap path sends
exactly 128 browser-delivered points, every point batch precedes one
`stroke.end`, actual point-send starts remain at least 100 ms apart under
backlog, no second manipulation starts, and a subsequent guess is accepted.
Repeat a short manual-close path. Drop the first reset and the first ack in
linked fakes; require a retry with a fresh sequence, idempotent browser reset,
fresh ack, and exactly one new-round start. Reset or disconnect mid-drain and
prove no old-generation effect appears afterward.

Add two recovery interleavings to those linked fakes. First, deliver a
browser liveness failure and prove it sends no pre-close resync request; its
one local re-subscribe produces one peer transition, one `applyRound`, and one
reset-ack-start sequence. Second, lose that reset and its ack, then deliver a
duplicate same-connection ready: the healthy Lens channel re-acks and resends
the cached transition without a nested round or reciprocal re-subscribe. In
both cases assert one changing connection ID on the initiating side, no
connection-ID change on the healthy side, and a stable live end state.
Start a replay reset, then inject (a) an ambiguous local send failure and (b) a
peer transition before its ack, with separate runs where the first reset did
and did not reach the browser. Each run must idempotently settle that inherited
reset, emit no intermediate start, apply one fresh recovery round, complete its
second reset/ack, and only then start.
For both correct/glyph-locked and timeout terminal phases, deliver one current-
round `POINT_COUNT_MISMATCH` request and require exactly one
apply-round/reset-ack-start recovery. The same request during `ACTIVE`, under
an old/unknown ID, or while a reset is already pending must not create another
round transition.
Table-drive every failure status through `WordlessApp`: each unexpected status
must acquire the same recovery token exactly once, overlapping statuses must
not open another close/connect, expected close/disconnect callbacks during
that lifecycle must not recurse, and `SUBSCRIBED` alone must not render or
dispatch connected state.

Now that Task 9's real browser entrypoint and this task's `WordlessApp` both
exist, reproduce the live checks intentionally deferred from Task 8: readiness
in both join orders, one valid wrong-then-correct path, six malformed/authority
rejections, symmetric six-second liveness expiry, one full-browser-reload peer
replacement, cleanup on refresh, and the Gate 0 point/guess path through the
product adapters. Re-measure median/p95 against Gate 0; regression beyond 20%
fails this task and must be diagnosed before Gate 1.

Run core tests, typecheck, compile, Preview, and Logger inspection.

- [ ] **Step 7: Commit the composed Lens experience**

```bash
git add Assets/Wordless Assets/Scene.scene Assets/Scene.scene.meta tools/core-tests/recovery-coordinator.test.mjs docs/prompt-log.md
git add -u -- Assets/Wordless/Scripts/Spike/BrushPreviewHarness.ts Assets/Wordless/Scripts/Spike/BrushPreviewHarness.ts.meta
git diff --cached --check
git commit -m "feat: compose complete WORDLESS Lens round"
```

### Task 12: Prove Gate 1 — the integrated minimum vertical slice

**Files:**

- Create: `docs/evidence/vertical-slice.md`
- Modify: `docs/prompt-log.md`
- Use but do not commit: `captures/vertical-slice/`

**Interfaces:**

- Consumes: Tasks 5–11.
- Produces: A reproducible end-to-end round and the feature-freeze decision.

- [ ] **Step 1: Run every deterministic check fresh**

```bash
npm run check
npm --prefix web run test:e2e
sh tools/typecheck/check.sh
git diff --check
```

Expected: zero failed tests, web build exit 0, Lens preflight exit 0, and no
whitespace errors.

- [ ] **Step 2: Compile and establish clean runtime state**

Use Lens Studio compile then Preview/log collection. Clear prior overlays and
logs. Require Supabase client configuration/public-channel subscription, one painter/guesser readiness
exchange, and one `APPLY_ROUND round=r-<instance-nonce>-1` whose concrete ID
passes the bounded production-ID parser.
Before the judged run, restart twice and prove both browser-first and Lens-first
subscription reach one `ACTIVE` round with exactly one `round.start`; neither
join order may depend on lucky timing.

- [ ] **Step 3: Record the exact vertical slice**

From one continuous clean run:

1. Browser joins `WAVE42`.
2. Lens and browser visibly become connected.
3. Drag brush into one S-shaped stroke while the browser line updates.
4. Browser submits `ROPE`; Lens publishes incorrect; both surfaces turn coral.
5. Browser submits `SNAKE`; Lens publishes correct; both turn mint and reveal
   `SNAKE`.
6. Both enter `CORRECT`, then the round/generation-scoped 450 ms callbacks move
   both to `GLYPH_LOCKED`; `finalPointCount` matches both local copies, and both
   independently derived medallions log the same point count and coordinate hash.
7. Preview interaction triggers the visible `PLAY AGAIN` item; its validated
   callback calls `applyRound` and both return to clean round state.

- [ ] **Step 4: Verify causality and equality from evidence**

Require log/capture proof that:

```text
browser receives real Lens batches
browser sends choices only
Lens alone publishes outcomes
both surfaces use the same round ID and show CORRECT -> GLYPH_LOCKED in order
browser stale-lock callback after reset is a no-op
world/public counts match expected transformations
wrong card remains disabled while other cards remain active
correct wire result contains no geometry and follows final points + stroke.end
both surfaces independently derive identical glyph point counts and hashes
replay enters through applyRound
```

- [ ] **Step 5: Write the vertical-slice record**

Record command results, runtime lines, point counts, payload metrics, capture
path/hash, and every disclosed limitation in `docs/evidence/vertical-slice.md`.
Mark Gate 1 PASS only if the single continuous capture proves all seven beats.

- [ ] **Step 6: Commit and freeze features**

```bash
git add docs/evidence/vertical-slice.md docs/prompt-log.md
git diff --cached --check
git commit -m "test: prove WORDLESS vertical slice"
```

After Gate 1 passes, reject scoring, gallery, accounts, persistence, extra
players, free text, recognition, particles, new transport, and any other new
capability. Remaining work is presentation, comprehension, robustness, and
submission evidence.

### Task 13: Polish the visual system and glyph transformation

**Files:**

- Create: `Assets/Wordless/Scripts/Core/GlyphTransition.ts`
- Create: `tools/core-tests/glyph-transition.test.mjs`
- Modify: `Assets/Wordless/Scripts/View/StrokeRibbonView.ts`
- Modify: `Assets/Wordless/Scripts/View/GlyphMedallionView.ts`
- Modify: `Assets/Wordless/Scripts/View/LensHudView.ts`
- Modify: `Assets/Wordless/Scripts/Input/ReplayController.ts`
- Modify: `web/src/main.ts`, `web/src/render.ts`, `web/src/styles.css`
- Modify: `web/tests/render.test.ts`, `web/e2e/wordless.spec.ts`
- Create: `docs/evidence/visual-review.md`
- Create: `docs/evidence/polish-ledger.md`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Frozen complete round and reference visual contract.
- Produces: A deterministic 450 ms exact-path glyph lock, cohesive palette,
  readable additive Lens UI, polished responsive browser states, and visual
  comparison evidence. No new feature behavior.

- [ ] **Step 1: Write the glyph-transition tests**

Test a three-point path at progress `0`, `0.5`, and `1`:

```text
progress 0 equals original displayed positions
progress 1 equals normalized medallion positions
all intermediate coordinates are finite linear interpolation
point count and ordering never change
progress clamps below 0 and above 1
```

Run the exact glyph-transition test file; expect missing
`GlyphTransition.ts`:

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/glyph-transition.test.mjs
```

- [ ] **Step 2: Implement the deterministic tween**

```ts
export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return 1 - Math.pow(1 - clamped, 3)
}

export function interpolatePath(
  from: readonly (readonly [number, number])[],
  to: readonly (readonly [number, number])[],
  progress: number,
): readonly (readonly [number, number])[] {
  if (from.length !== to.length) throw new Error('path length mismatch')
  const t = easeOutCubic(progress)
  return from.map((point, index) => [
    point[0] + (to[index][0] - point[0]) * t,
    point[1] + (to[index][1] - point[1]) * t,
  ] as const)
}
```

Lens maps its DrawingAnchor-local source and medallion destination into this 2D
surface space; browser maps its canvas source/destination the same way. Both
animate the same ordered canonical points for 450 ms, then settle into the
glyph. No semantic icon appears.

- [ ] **Step 3: Run a Lens additive-readability pass**

Capture bright and medium simulated rooms. Adjust only material color,
emission, line width, text size, spacing, and hierarchy until:

```text
violet path separates from wall/furniture
lemon brush head remains visible against a bright window
ivory prompt/timer read at judged capture scale
mint/coral result change is unmistakable without a dark backing card
medallion is visually secondary to the live stroke until success
PLAY AGAIN is legible/reachable after glyph lock but remains secondary to payoff
```

Reject black panels, glass shadows, copied generated imagery, and tiny status
text.

- [ ] **Step 4: Run a browser craft pass**

At `390×844`, `768×1024`, and `1440×900`, tune rhythm, type, card radii,
canvas scale, endpoint, connection dot, wrong shake, and correct medallion.
Animation durations are fixed:

```text
wrong card shake: 220 ms
correct color settle: 180 ms
glyph transition: 450 ms
connection state fade: 160 ms
```

Respect `prefers-reduced-motion` by removing translations and shortening fades
to zero while preserving final states. In reduced-motion mode, `main.ts` calls
the existing round/generation-scoped `lockGlyph` completion immediately; the
normal path keeps the frozen 450 ms phase boundary. This refines presentation,
not the Task 9 state transition.

- [ ] **Step 5: Use side-by-side review without shipping references**

Compare fresh screenshots against the three files in
`docs/references/visuals/`. Score 1–5 for hierarchy, relay clarity, palette,
answer readability, and payoff. Record what was borrowed and what was rejected
in `docs/evidence/visual-review.md`. Do not copy the reference files into any
runtime/public directory.

Draft the visual-craft evidence for `docs/evidence/polish-ledger.md`: reviewed
source revision, input screenshot/capture hash, independent review, observed
defect, smallest change or explicit retain rationale, and fresh side-by-side
proof. A no-change result still requires independent review and fresh proof.

- [ ] **Step 6: Run full visual checks**

```bash
npm run check
npm --prefix web run test:e2e
sh tools/typecheck/check.sh
```

Compile/run Preview, perform a real connected wrong→correct round, and inspect
the recorded 450 ms transformation frame by frame. Require exact path count in
the first and last frames. Only after every check passes, finalize the
visual-craft ledger row with its outcome and exact verified source revision.

- [ ] **Step 7: Commit the polish pass**

```bash
git add Assets/Wordless/Scripts/Core/GlyphTransition.ts Assets/Wordless/Scripts/Core/GlyphTransition.ts.meta Assets/Wordless/Scripts/View/StrokeRibbonView.ts Assets/Wordless/Scripts/View/StrokeRibbonView.ts.meta Assets/Wordless/Scripts/View/GlyphMedallionView.ts Assets/Wordless/Scripts/View/GlyphMedallionView.ts.meta Assets/Wordless/Scripts/View/LensHudView.ts Assets/Wordless/Scripts/View/LensHudView.ts.meta Assets/Wordless/Scripts/Input/ReplayController.ts Assets/Wordless/Scripts/Input/ReplayController.ts.meta web/src/main.ts web/src/render.ts web/src/styles.css web/tests/render.test.ts web/e2e/wordless.spec.ts tools/core-tests/glyph-transition.test.mjs docs/evidence/visual-review.md docs/evidence/polish-ledger.md docs/prompt-log.md
git diff --cached --check
git commit -m "polish: refine WORDLESS visual payoff"
```

### Task 14: Prove five-second comprehension and accessibility

**Files:**

- Create: `docs/evidence/layperson-read.md`
- Modify: `docs/evidence/polish-ledger.md`
- Modify as evidence demands: Lens view files,
  `Assets/Wordless/Scripts/Input/ReplayController.ts`, and/or
  `web/src/render.ts`, `web/src/styles.css`
- Modify: `web/e2e/wordless.spec.ts`, `web/package.json`, `web/package-lock.json`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Polished vertical slice.
- Produces: A mute-readable opening, role clarity, non-color-only states, phone
  accessibility, and blind-review evidence. Any revisions are staging/copy/
  hierarchy changes, not features.

- [ ] **Step 1: Cut one silent five-second comprehension clip**

The frame opens in medias res with both surfaces visible:

```text
Lens side label: PAINTER
Lens prompt: DRAW: SNAKE
Lens lower-third: LENS STUDIO PREVIEW — SIMULATED from frame zero
Browser side label: GUESSER
Browser heading: GUESS THE CLUE
violet line changing on both surfaces
four answer cards already visible
at approximately 03.0, browser taps one wrong card
before 05.0, coral × / TRY AGAIN appears on both surfaces
```

Do not show setup, code, explanation, or the generated reference art.

- [ ] **Step 2: Run three blind reviews**

Use three context-isolated viewers. At least one **must** be a human unfamiliar
with the project; remaining viewers may be fresh multimodal LLM agents. Record
each reviewer's human/LLM composition. Ask only, with no follow-up:

```text
Describe what you saw.
What do you think was happening?
What, if anything, changed during the clip?
What do you expect to happen next?
```

Pass requires the unfamiliar human **and** at least two of three reviewers
overall to spontaneously—not from concepts named by the questions—identify a
drawing/guessing game, painter and browser guesser, and the browser action
causing a shared state change. “Drawing app,” “design tool,” or “one user on
two screens” is a failure.

- [ ] **Step 3: Revise the smallest failed signal and retest**

Use this fixed remediation order:

```text
1. increase PAINTER/GUESSER labels
2. move four cards higher/earlier
3. increase prompt/heading size
4. strengthen visible cross-surface line match
5. change staging to start later in the stroke
```

Apply one change at a time, recut five seconds, and use three new blind
reviewers, again including at least one unfamiliar human whose response must
pass. Stop when the pass threshold is met; do not add onboarding screens.

- [ ] **Step 4: Add automated accessibility checks**

Install the locked package:

```bash
npm --prefix web install --save-dev @axe-core/playwright
```

In Playwright verify:

```text
no serious or critical axe violations
all four answer buttons are keyboard reachable
focus is visible against ivory/plum
canvas and result have accessible names/live regions
wrong and correct states include ×/✓ plus text, not color alone
390 px viewport has no clipped card, result, or control
reduced-motion mode retains every state change
```

- [ ] **Step 5: Record comprehension evidence**

`docs/evidence/layperson-read.md` records the clip hash, reviewer composition,
each anonymized answer, pass/fail, revision made, second-round answers if
needed, and final conclusion. Do not rewrite responses to sound more favorable.
Draft the mandatory silent-comprehension row in
`docs/evidence/polish-ledger.md` with the reviewed source revision, observed
defect, smallest change or retain rationale, final clip hash, final panel
composition, and outcome. A new clip and new panel are required only after a
revision; an unchanged passing clip retains its original hash and panel.

- [ ] **Step 6: Verify and commit clarity**

```bash
npm run check
npm --prefix web run test:e2e
sh tools/typecheck/check.sh
```

Run and capture the final real connected opening. Finalize the ledger row only
after the checks and the required human-inclusive panel pass, then commit:

```bash
git add Assets/Wordless web docs/evidence/layperson-read.md docs/evidence/polish-ledger.md docs/prompt-log.md
git diff --cached --check
git commit -m "polish: prove WORDLESS five-second clarity"
```

### Task 15: Harden the demo path and production browser build

**Files:**

- Modify: transport/store/app files only for reproduced failures
- Create temporarily, then delete before commit:
  `web/tests/adversarial/BrowserFaultChannel.ts`
- Create temporarily, then delete before commit:
  `web/tests/real-supabase-fault-matrix.test.ts`
- Create: `tools/security/audit-public-build-config.mjs`
- Create: `docs/evidence/resilience.md`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Comprehensible polished product.
- Produces: Five-round repeatability evidence, restart/reconnect behavior, and
  a secret-safe production web build.

- [ ] **Step 1: Build a non-shipping fault wrapper and run the adversarial matrix**

First rerun the complete parser/policy/linked-fake matrix in root and browser
tests. Then create the two temporary `web/tests/` files. Before any live case,
wake/resume the Free project, confirm Realtime and public-channel access, and
rerun the Gate 0 two-way application probe. The live-Supabase Vitest case
constructs the real `BrowserRelayClient` with an injected `BrowserChannel`
wrapper around the approved Supabase Broadcast channel and reads only the same
ignored `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLIC_KEY` configuration as the
browser. It is gated by `WORDLESS_REAL_SUPABASE_MATRIX=1`; without that flag it skips, never silently
passes. Run it explicitly with:

```bash
WORDLESS_REAL_SUPABASE_MATRIX=1 npm --prefix web exec -- vitest run tests/real-supabase-fault-matrix.test.ts --testTimeout=180000 --hookTimeout=30000
```

Vitest supplies the existing Vite `@wordless/core` alias, so the temporary
case imports the real browser client without extending the Node loader. It must
never import a service key, call Lens Studio, create/modify a fault hook in
`web/src` or `Assets`, or ship.
Cases are declared sequential. `afterEach`/`afterAll` use `try/finally` to
await client close, unsubscribe the underlying channel, clear timers/listeners,
and assert zero owned channels even when an expectation fails; the bounded
timeouts are evidence limits, not permission to leak on timeout.

The wrapper can, one case at a time, (a) replace the next already stamped
outbound payload with a malformed/oversized/wrong-authority variant, (b) return
success while swallowing one outbound guesser message or reset ack, (c) hold
and reorder two outbound messages, or (d) swallow/hold one inbound painter
message/reset before forwarding later traffic to the real browser client. For
the parser cases that require it, the wrapper may also (e) replay one
captured, already-stamped inbound or outbound payload byte-for-byte to prove
duplicate-sequence rejection, and (f) replace only the
`finalPointCount` field of one captured inbound terminal with each invalid test
value before the browser parser sees it, plus one different but valid in-range
integer (choose actual count + 1 unless it is 128, otherwise use 127) to exercise the
real browser store's `POINT_COUNT_MISMATCH` path. To reach the engine's semantic
duplicate-guess-ID guard without conflating it with transport replay, it may
also (g) replace only `guessId` on one newly stamped, otherwise-valid outbound
guess with an ID the Lens already accepted. It cannot allocate sequences,
synthesize a complete new valid message, change any other field in cases (f)
or (g), or mutate either product store. This preserves a
recognized real guesser session while making both gap directions and
reset/ack-loss reproducible after Task 9 removes the product raw-send hook.
Run cases serially, returning to one clean authoritative round between them.

Across the real connected channel boundary, inject/replay at the applicable
outbound Lens-facing or inbound browser-facing side:

```text
wrong protocol version
wrong session and round
unknown message type
batch with 9 points
axis -1 and 1001
message over 1 KB
terminal finalPointCount -1, 129, fractional, and one valid unequal count
duplicate sequence by byte-for-byte replay
duplicate guess ID at a fresh sequence by the narrow guessId substitution
browser-origin round.result
guess during READY, after CORRECT, and after timeout
one painter sequence gap and one guesser sequence gap
reset as the first gapped painter message
dropped/reordered reset and dropped reset ack
held prior-connection round.start delivered after a full browser reload
lost new-browser ready plus held prior-connection round.reset
count-mismatch resync under current and immediately previous round IDs
```

Require malformed/oversized/wrong-session/unknown-sender messages to log and
drop with no state mutation. Require well-formed recognized-peer guesses that
fail phase/duplicate/round policy to receive a correlated `guess.rejected`,
clearing only their pending browser state; the next contiguous message after a
semantic rejection must still succeed. Each sequence gap must enter the replay-
safe reset-barrier path. With no reset pending, it causes one Lens-authoritative
new round through `applyRound`; a Lens-observed gap during a pending reset only
invalidates queued stale application drafts, resends that cached reset, and
completes local policy resync without a successor. Both paths accept the first
contiguous post-reset sequence without a gap storm. No case may crash or log a
payload/body.
Require the reset-first-gap equality rule, cached reset retry, idempotent
re-ack, ack-as-gap-barrier, previous-round resync routing, and exactly one
post-ack start to match the Task 8 policy tests. Invalid terminal counts drop
without state change; the valid unequal count must produce one exact-round
`POINT_COUNT_MISMATCH` intent and the normal authoritative recovery. The
duplicate-sequence replay must be rejected by `ReceivePolicy`, while the
fresh-sequence duplicate guess must reach and be rejected by `WordlessEngine`.
The held start must retain its prior `targetConnectionId`; the reloaded browser
rejects it without binding or readiness confirmation, then accepts the later
start targeted to its current connection.
The held reset must retain its prior target. After the new browser's first
ready is lost, that reset cannot confirm the tuple, cancel ready retries,
authorize the store, release quarantine, or emit an ack; the later correctly
targeted reset completes normally.
At the deadline boundary, a correct guess one millisecond
early remains correct even when its drain crosses expiry, while an exact-
deadline guess times out regardless of whether the guess handler or timer
callback was invoked first.

Classify every case in `docs/evidence/resilience.md` as pure-linked-fake,
live-Supabase fault wrapper, or both; do not imply that a locally swallowed packet
proves platform packet loss. After the real matrix, delete both temporary
files and require:

```bash
test ! -e web/tests/adversarial/BrowserFaultChannel.ts
test ! -e web/tests/real-supabase-fault-matrix.test.ts
! rg -n 'BrowserFaultChannel|sendRawForTest|fault injection' web/src web/dist Assets/Wordless
```

- [ ] **Step 2: Run five consecutive rounds**

Drive five `applyRound` cycles with at least one wrong and one correct guess per
round. At least one round must exercise the 128-point cap behavior, and one
must submit the correct guess while a final point batch is still queued.
Require:

```text
5 starts / 5 correct outcomes / 5 glyph locks / 5 clean resets
cap round has exactly 128 points and one ordered stroke.end
mid-stroke correct round publishes final points, then one stroke.end, then result
no point-batch interval below 100 ms, including closing drains
no point count above 128
no message above 1 KB
diagnostic snapshots after every reset use the same measurement sources
rounds 2–5 listener/timer/channel/SceneObject/material counts equal round 1
no growing listener, timer, channel, SceneObject, or material count
no Logger error
```

- [ ] **Step 3: Observe one disconnect/reconnect**

Take the browser offline mid-stroke, restore it, and record actual status
transitions. Repeat with a full browser reload/new sender ID. Both surfaces must
show a literal non-connected state within the six-second liveness window,
discard/retain old geometry exactly as specified, handshake again, create a new
round ID through `applyRound`, accept continued/new sender sequencing, and
never merge the old stroke. Do not claim replay of missed Broadcast messages.

Then leave the browser alive and fully restart Lens Preview. Require a new
painter sender epoch and a distinct `r-<new-instance-nonce>-1` product round,
fresh presence binding, one clean start, and no stale-sequence or old-round
merge. This is separate from transient Lens channel re-subscription, which
must retain sender ID, round ID, and monotonic sequence until recovery chooses
a new `applyRound`.

- [ ] **Step 4: Build and audit the production web bundle**

```bash
npm --prefix web run build
! rg -l '(SUPABASE_(SERVICE_ROLE_KEY|ACCESS_TOKEN|MANAGEMENT_TOKEN)|DATABASE_(URL|PASSWORD)|POSTGRES_PASSWORD|service_role|sb_secret_[A-Za-z0-9_-]{20,})' web/src Assets/Wordless tools --glob '!**/*.md' --glob '!tools/security/audit-public-build-config.mjs'
! rg -l '(gho_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|sbp_[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}|c2VydmljZV9yb2xl)' web/dist
node tools/security/audit-public-build-config.mjs web/.env.local web/dist
! git ls-files | rg '(^|/)\.env($|\.(local|production|development|test)$)|(^|/)Assets/LocalOnly/'
du -sh web/dist
```

Expected: build succeeds; user-authored source has no forbidden secret-key
identifier/value, the vendor-containing bundle has no value-shaped private key
or encoded `service_role` marker, and no real environment/local-only path is
tracked. `audit-public-build-config.mjs` parses ignored `.env.local` in memory,
never prints values or hashes, and reports counts plus key type only. It rejects
every JWT-shaped bundle value that is not byte-for-byte the configured public
key; when the configured legacy key is JWT-shaped, it decodes only enough to
require role `anon` and reject `service_role`. With a publishable key, it
requires zero JWT-shaped configuration values. It likewise verifies that any
embedded project URL equals the configured public URL. Generic Supabase
protocol field names such as `access_token` may exist inside bundled
`supabase-js` and are not treated as credentials. Only the intended client-safe
public project URL/key are embedded through production environment values; they
remain uncommitted even though a built client bundle necessarily embeds them.
Document that the public channel/session code is a demo coordination mechanism,
not a security boundary.

- [ ] **Step 5: Record resilience and commit**

Write actual matrix results, point-batch timestamps, all five raw
`[WordlessDiag]` snapshots, both reconnect observations, and the production
build scan in `docs/evidence/resilience.md`. If a reproduced failure required a
runtime or UI edit within the scope of an earlier polish row, mark that row
invalid and rerun its Task 13/14 review before Task 16; a docs-only evidence
commit does not invalidate it.

```bash
git add Assets/Wordless web tools/security/audit-public-build-config.mjs docs/evidence/resilience.md docs/prompt-log.md
git diff --cached --check
git commit -m "test: harden WORDLESS relay demo"
```

### Task 16: Build the judged evidence package and release candidate

**Files:**

- Create: `docs/evidence/claim-ledger.md`
- Create: `docs/submission/project-description.md`
- Create: `docs/submission/video-edl.md`
- Create: `docs/submission/release-checklist.md`
- Modify: `docs/evidence/polish-ledger.md`
- Modify: `README.md`, `docs/references/README.md`, `docs/prompt-log.md`
- Delete from the release tree after Task 13 review:
  `docs/references/visuals/wordless-relay-chatgpt-north-star.png`,
  `docs/references/visuals/wordless-relay-gemini-ui-reference.jpeg`, and
  `docs/references/visuals/wordless-relay-gemini-alternate.jpeg`
- Create with in-toolchain primitives: README hero and video end-card assets
  under `docs/media/`
- Use but do not commit until owner chooses: final video export

**Interfaces:**

- Consumes: All validated product/evidence, final local path plus any optional
  hosted evidence, CLAD history.
- Produces: Mute-readable under-60-second video, curated CLAD proof, honest
  description, public-repo readiness decision, and submission links.

- [ ] **Step 1: Map every public claim to evidence**

`docs/evidence/claim-ledger.md` has four columns:

```text
exact claim | scope | evidence path/log/test | allowed wording
```

Include: bidirectional Lens↔browser, one Preview painter, one browser guesser,
10/5 Hz measured cadence, exact-path glyph, wrong/correct authority, tested
viewport sizes, observed RTT, Preview simulation, and ordinary hosted Supabase
Realtime public Broadcast. Explicitly ban: hardware
test, secure/private channel, arbitrary remote scale, persistence, recognition,
authentication, guaranteed availability, first-ever, production readiness,
unmeasured latency, remote play, or
different-network participation unless a separately captured cross-network run
exists.

- [ ] **Step 2: Write the concise project description**

Use this order:

```text
1. one-sentence user/action/payoff
2. Connect theme fit: person + platform + live communication loop
3. why spatial: body-scale midair drawing
4. how browser participates causally
5. CLAD execution and verification
6. Preview simulation and unauthenticated public-channel demo/security limitations
```

The first paragraph must be understandable without the words Supabase,
protocol, spatial anchor, or state machine.

- [ ] **Step 3: Create the 59-second target EDL**

```text
00.0–03.0  in medias res: PAINTER / GUESSER / matching live line / four cards
03.0–05.0  browser taps ROPE; coral × / TRY AGAIN is visible on both by 05.0
05.0–13.0  line finishes; browser taps SNAKE; mint + word reveal on both
13.0–19.0  exact line locks in 450 ms; matching medallions hold visibly
19.0–25.0  replay through clean round reset
25.0–42.0  CLAD proof: Lens Studio scene, prompt/log, live browser exchange
42.0–51.0  measured validation: tests, RTT, payload, and limitations
51.0–59.0  original WORDLESS RELAY end card and one-sentence promise
```

Do not spend the opening on joining, setup, title animation, or narration-only
explanation. A small readable lower-third, `Lens Studio Preview — simulated`,
appears on the Lens pane from `00.0` and remains on every segment containing
Preview footage.

- [ ] **Step 4: Build original submission graphics**

Create the README hero and end card from the implemented web/Lens palette,
actual captured strokes, and programmatic type/geometry. Do not use the three
generated reference images or third-party logos. Preserve source scripts and
record the exact generation prompt/process. Replace README's private visual-
north-star section with the real original hero. After Task 13's comparison
evidence is complete, remove the three external reference binaries from the
release tree and revise `docs/references/README.md` to retain provenance,
checksums, and the non-use decision without broken image links. Finish this
before the first candidate-cut review so the actual public tree is part of
every capture/evidence loop.

- [ ] **Step 5: Capture and inspect, never infer**

Record long clean takes from fresh restart. Capture both surfaces and the
browser-caused Lens state in the same take. Inspect frames at every cut for
modal dialogs, CLAD/test overlays, unreadable type, stalled Preview timing,
reference imagery, credentials, and unsupported states.

Perform the mandatory capture/evidence polish loop: have an independent viewer
inspect the first candidate cut, make the smallest evidence/clarity change or
record a retain rationale, export again, and rerun the frame inspection plus
video probe. Record both hashes, review composition, defect/decision, and final
outcome in `docs/evidence/polish-ledger.md`.

Extract the final candidate's exact `00.0–05.0` segment. If its hash or framing
differs from the Task 14 passing clip, rerun the same neutral three-reviewer
gate, including an unfamiliar human who must pass, before accepting the cut.

- [ ] **Step 6: Verify the video technically**

Use `ffprobe`/`ffmpeg` to require:

```text
duration < 60.000 seconds
1920×1080 or higher landscape output
H.264 video + AAC audio if audio is present
faststart enabled
no clipped ending or silent accidental tail
all copy readable at normal laptop playback size
dual mint + revealed word visible by 13.5 seconds
completed matching glyphs visible before 20.0 seconds
Preview disclosure visible from frame zero and every later Preview shot
```

Measure those three visual assertions from the exported file frame by frame,
not from EDL intent. Record the observed mint/word and glyph-completion
timestamps plus every disclosure shot range in `video-edl.md` and
`release-checklist.md`; any miss requires a recut.

If narration is used, verify measured loudness/true peak and disclose its
source. A silent/caption-led cut is acceptable only if blind viewers understand
it.

- [ ] **Step 7: Run the final adversarial judge gate**

Give one fresh multimodal reviewer only the unedited candidate cut, project
description, README first screen, and claim ledger. Ask it to score theme fit,
five-second comprehension, magic moment timing, spatial necessity, browser
causality, visual finish, CLAD proof, and unsupported claims. Fix only observed
clarity/evidence defects; do not add features. Any fix requires a new export,
the Step 5 frame inspection and five-second gate, the complete Step 6 video
probe/timing assertions, and an updated capture/evidence ledger row. The row
records the reviewed source revision and final video hash.

- [ ] **Step 8: Run the full release verification**

```bash
npm run check
npm --prefix web run test:e2e
sh tools/typecheck/check.sh
git diff --check
git status --short --branch
git log --oneline --decorate -12
```

Then wake/resume the Supabase project, confirm Realtime/public-channel access,
and rerun the two-way probe. Run Lens compile, Preview logs, a full connected
round, the local browser
check (plus hosted check only if Optional Task 17 already ran), secret scan,
relative-link check, video probe, and claim-ledger review.
Record the Playwright/Axe result explicitly, including zero serious/critical
violations. Every result and exact command enters
`docs/submission/release-checklist.md`.

Audit the **current tree and full git history** by filename-only output for
credential patterns, absolute home paths, `.env`/`Assets/LocalOnly`, and
reference-only image blobs; never print a matched value. The release checklist
records every finding and the required public-release remediation. Include
Supabase management/access tokens, service-role keys, database URLs/passwords,
`sb_secret_` values, JWT-shaped values, real project URL patterns, and any
active Snap Cloud product/evidence label. Public project URLs/keys may appear
only in ignored local inputs and generated deployment output, never tracked
source or history. Historical Alpha-denial evidence stays explicitly
historical. Record the
three reference files' reachable Git blob IDs in an ignored/local audit file so
absence can later be tested without opening the images. Because the private
planning history intentionally contained reference images and earlier prompts
contained local paths, Task 18 must present exact remediation choices to the
owner. Deleting current-tree files or documenting provenance does **not** make
reachable blobs non-shipping. Rewriting/filtering history or creating a clean
public lineage requires separate explicit authorization; never do either
silently.

- [ ] **Step 9: Commit the private release candidate**

First require all three `polish-ledger.md` rows—visual craft, silent
comprehension, and capture/evidence—to be present, passing, and current for the
reviewed runtime/source revision and final candidate hash.

```bash
git add README.md docs Assets Packages web tools package.json package-lock.json
git diff --cached --check
git commit -m "docs: prepare WORDLESS submission candidate"
git push origin main
```

Keep the repository private. Public visibility, final video upload, and contest
submission are separate owner-authorized external actions. The actual form
recorded in Task 1 decides whether Optional Task 17 runs; the official public
repository requirement remains mandatory at the final owner-authorized
submission gate.

### Optional Task 17: Deploy and re-verify the companion browser

Run only after the private release candidate and all polish-ledger rows are
complete, unless `docs/environment.md` proves the live submission form requires
a hosted companion URL earlier. Skipping this task does not block completion or
submission when the form has no such field.

**Files:**

- Create: `web/.env.production.example`
- Create: `docs/evidence/hosted-browser.md`
- Verify, and modify only if missing: `.gitignore`
- Modify: `docs/prompt-log.md`

- [ ] **Step 1: Obtain host authorization and deploy static output**

Confirm `.gitignore` already permits `!.env.production.example`; amend it only
if the Task 1 change is absent. Use Vercel only if the owner's account is
already connected or the owner authorizes connection at this step. Deploy
`web/dist/`; never upload the repo, `.env.local`, reference images, captures, or
Lens credential asset. If authorization is absent, record SKIPPED and retain
the working local demo; do not choose another host silently.

Create `.env.production.example` with only the Gate-0-proven
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLIC_KEY`, and
`VITE_RELAY_SESSION_ID` names and placeholder values. Never commit a real
project value.

- [ ] **Step 2: Re-run the real Lens against the hosted browser**

Wake/resume the Free project, reconfirm Realtime and public Broadcast access,
and rerun the two-way application probe before capture.

Join `WAVE42`, complete wrong→correct→glyph→replay, and record RTT/payload data.
Hosted behavior must meet Gate 0 thresholds and differ by no more than 30% from
local median/p95. A hosted regression blocks using the URL in submission copy;
the local captured proof remains honest.

- [ ] **Step 3: Record and commit only verified hosting evidence**

Write the URL/authorization, build hash, connected-round evidence, and metrics
to `docs/evidence/hosted-browser.md`, then let the orchestrator commit the exact
files. If this task ran before the private release candidate because the live
form required it, treat the hosted proof as input to that later candidate. If
it ran afterward, it may not weaken any already-verified candidate claim.

### Task 18: Owner-authorized publication and contest submission

This is an external-state gate, not part of autonomous implementation. Stop
before each external mutation until the owner explicitly authorizes that named
action. History/lineage remediation, video upload, private-to-public repository
visibility, and form submission are four separate authorities; approval for
one does not imply the others.

**Files:**

- Finalize before publication: `docs/submission/release-checklist.md`,
  `docs/prompt-log.md`, and any owner-approved final video-link field
- Keep ignored/local: submission confirmation screenshot or receipt export

- [ ] **Step 1: Preflight the exact private candidate locally**

Require Task 16's candidate commit, every still-current polish row, clean full
verification, and Optional Task 17 only when the live form requires it. Prepare
the release-candidate commit SHA, local final-video hash, intended upload
destination, repository URL, prompt-log path, and draft form values. The actual
video URL is intentionally absent until the authorized upload exists. Include
Task 16's full-history audit and block the public flip: under the current
project contract, documented provenance cannot authorize shipping reachable
reference-image blobs.

Repeat the filename-only current-tree/history audit for real `.env` or
`Assets/LocalOnly` paths, Supabase management/access/service-role/database
credentials, `sb_secret_` and JWT-shaped values, real project URL patterns, and
active Snap Cloud product claims. Report filenames/commit IDs only—never print
a credential value. Placeholder examples and explicitly historical Alpha
failure records are allowed; any other finding blocks publication.

- [ ] **Step 2: Authorize, execute, and verify history/lineage remediation**

Present two recoverable choices with exact repository/branch impact:

1. owner-authorized history filtering of the existing private repository,
   after creating a local backup/bundle, followed by the explicitly authorized
   non-fast-forward remote update; or
2. owner-authorized creation of a new clean private publication lineage from
   the verified release tree, while the original planning repository remains
   private forever.

Do neither without the owner's specific choice and authority. In either path,
retain the full annotated `docs/prompt-log.md` and source tree, but exclude the
three generated reference blobs from every reachable public commit. Then clone
the exact private publication target into a fresh temporary directory and
prove all recorded forbidden blob IDs are unreachable, reference-image paths
are absent from history/current tree, absolute home paths and secret filenames
are absent, local links work, and the checked-out tree matches the verified
release tree. Rerun the full release verification, record the new HEAD/tree
identities, and recompute every candidate/link value. Any failed absence check
blocks publication. Remove the temporary clone recoverably after evidence is
recorded.

- [ ] **Step 3: Authorize and perform only the named video upload**

Show the owner the local video hash and exact destination. After explicit
upload authorization, upload/finalize the video, obtain its real URL, and
verify playback without credentials. Do not change repository visibility or
submit the form under this approval.

- [ ] **Step 4: Freeze link metadata while the repository remains private**

Write the verified video URL and final draft form values into the release
checklist/prompt log, rerun link, secret, and diff checks, then commit and push
that metadata while the repository remains private. This metadata-only head is
the publication target; make no source or link changes afterward.

- [ ] **Step 5: Obtain separate publicization and submission authorization**

Show the owner the exact resulting video URL, repository visibility change,
prompt-log URL, and every final form value. Obtain explicit authority for the
public flip and, separately, the one form submission. If any value changes,
stop and re-authorize the affected action.

- [ ] **Step 6: Publish, verify anonymously, and submit once**

Change the GitHub repository to public. In a logged-out/incognito browser,
verify the repository root, README, annotated prompt log, and implementation
source are accessible; a credentialed check alone does not pass. Re-read every
form value against the release checklist, submit only under the separate owner
authorization, and capture the organizer confirmation/receipt to an ignored
local path. Report the confirmation identifier and timestamp to the owner. Do
not silently edit or resubmit after confirmation.

## Execution order and review gates

```text
Task 1
  -> Tasks 2 and 3 may run in parallel after credentials/package inspection
  -> Task 4 Gate 0 (serial integration; failure stops everything)
  -> Task 5 protocol freeze (serial)
  -> Tasks 6 and 7 run in parallel with file-specific tests
  -> orchestrator serially integrates Tasks 6–7 and runs the full core glob
  -> Task 8 transport/policy is one cross-platform owner, then full integration
  -> Tasks 9 and 10 run in parallel (web-only vs Lens/scene-only)
  -> Task 11 waits for Tasks 9–10 and is the sole composition/scene writer
  -> Task 12 Gate 1 (serial integration and feature freeze)
  -> Task 13 visual craft
  -> Task 14 five-second comprehension/accessibility
  -> Task 15 resilience/production build
  -> Task 16 evidence/submission release candidate
  -> Optional Task 17 hosting only after the release candidate, unless required
  -> Task 18 owner-authorized publication and submission
```

Every implementation task gets a fresh spec reviewer and quality reviewer;
evidence-only Tasks 4, 12, and 16 may use one combined independent review. Gate
0, Gate 1, the layperson read, and the final judge gate are never delegated
solely to the task implementer who produced the artifact.

## Completion definition

Implementation is complete only when:

1. Gate 0 and Gate 1 evidence are committed and reproducible.
2. One real browser choice visibly and causally changes Lens Preview.
3. The exact sampled path independently becomes the same counted/hashed session
   medallion on both surfaces without geometry in the result message.
4. The unfamiliar human and at least two of three blind viewers understand the
   two roles, browser causality, and guessing loop in five silent seconds.
5. All pure tests, browser tests/build, Lens typecheck, Lens compile, Preview
   runtime, malformed-message matrix, five-round soak, and release checks pass
   fresh.
6. The video is under sixty seconds, opens with the interaction, shows CLAD,
   and states the Preview limitation.
7. Every public claim has an exact evidence row and no secret/reference-only
   material enters the release.
8. The private release-candidate commit is pushed; every later upload,
   visibility change, and submission remains blocked pending Task 18's granular
   approvals.
9. Visual-craft, silent-comprehension, and capture/evidence polish-ledger rows
   each show independent observation, decision, and fresh passing verification.

The entry is **submission-complete** only after Task 18 also verifies anonymous
repo/video access and records the organizer confirmation. Until then, it is an
implementation-complete private candidate, not a submitted entry.

Optional Task 17 hosting is not part of completion unless the live Week 3 form
recorded in Task 1 requires a hosted companion URL.
