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
the Lens. A Snap Cloud Realtime Broadcast adapter carries versioned, bounded
messages over one session-qualified channel; the browser renders public state
and submits choices but never decides correctness. Lens-only world points are
projected into quantized normalized coordinates for transport, while both
surfaces deterministically normalize the same points into the result medallion.

**Tech Stack:** Lens Studio 5.23.1 currently installed (official hackathon
minimum 5.22), Specs Base Template with `targetPlatform: Spectacles`,
TypeScript, Spectacles Interaction Kit, Lens Studio MCP/CLAD tools,
`SupabaseClient` plus the Supabase Plugin, Snap Cloud Realtime Broadcast, Vite
vanilla TypeScript, `@supabase/supabase-js`, Vitest, Node 22 built-in tests, and
Playwright Chromium.

**Spec:**
`docs/superpowers/specs/2026-08-24-wordless-relay-design.md`

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
- `WordlessEngine` plus `RoundStore` are the state authority; views are
  write-only, and `applyRound` is the only reset/start path.
- Files under `Assets/Wordless/Scripts/Core/` use Node 22's erasable TypeScript
  subset: no decorators, enums, namespaces, parameter properties, or runtime
  Lens globals. The same source must execute unchanged in Node tests, Vite, and
  Lens Studio. This machine currently has Node 22.14, so every direct Node test
  invocation includes its required `--experimental-strip-types` flag.
- Lens world points remain local. Transport points are integer pairs in
  `[0, 1000]`, capped at 128 accepted points per stroke and sent no faster than
  10 Hz.
- Snap's current alpha workaround `heartbeatIntervalMs: 2500` is mandatory in
  both clients unless the installed package documentation explicitly supersedes
  it and that change is recorded.
- Snap Cloud currently documents 200 peak Realtime connections, two million
  monthly messages, and 250 KB maximum message size. WORDLESS sets a much
  smaller measured target: every product message below 1 KB.
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
- Every task records its prompt/result and fresh validation evidence in
  `docs/prompt-log.md` before committing.
- The GitHub repository remains private until the owner explicitly authorizes
  the public-release gate.

## Current primary references

- Hackathon target, schedule, deliverables, and rubric:
  <https://lenslist.co/clad-summer-hackathon>
- Snap Cloud alpha and project setup:
  <https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/getting-started>
- Realtime Broadcast API and required heartbeat:
  <https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/realtime>
- Official bidirectional 10 Hz cursor pattern:
  <https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/examples/basic-setup>
- Realtime usage limits:
  <https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/usage_limits>
- Official Lens-plus-web setup pattern:
  <https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/examples/web-app>

The public Snap Cloud examples span older Spectacles 2024 and current SPECS
branches. The installed Lens Studio version and current Asset Library packages
are authoritative for implementation. An executor must inspect them before
copying any version-specific sample line such as `globalThis.supabaseModule`.

## Agent-native execution model

This plan is optimized for LLM workers, not human sprint pacing:

1. Measure progress by evidence gates and independently reviewable commits, not
   hours or story points.
2. Give every task a fresh implementer and two reviews: specification
   compliance first, code/runtime quality second.
3. Parallelize only after interfaces freeze. Browser-only files, pure core
   files, and evidence review may have separate owners. The project manifest,
   package state, scene graph, shared protocol, and active Preview session each
   have one writer at a time.
4. Use the agent speed dividend for iteration. After Gate 1, no new capability
   is allowed; complete at least three separate loops for visual craft,
   five-second comprehension, and capture/evidence quality.
   Gate 1 is the midpoint of attention, not the finish line: the majority of
   all remaining agent/tool cycles go to those judge-facing loops.
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
  LocalOnly/                               # ignored credential assets
  Wordless/
    Scripts/
      Core/
        Protocol.ts                        # one wire contract for Lens + web
        RoundStore.ts                      # observable state authority
        WordlessEngine.ts                  # pure transitions/validation
        WordDeck.ts                        # eight curated ASCII clue cards
        StrokeGeometry.ts                  # sampling/batching/glyph math
      Transport/
        RelayPort.ts                       # transport interface
        SnapCloudRelayTransport.ts         # Lens Supabase adapter
      Input/
        BrushController.ts                 # SIK drag -> drawing samples
      View/
        StrokeRibbonView.ts                # additive-safe procedural ribbon
        LensHudView.ts                     # roles, prompt, timer, status
        GlyphMedallionView.ts              # exact-path result view
      WordlessApp.ts                       # composition root only
web/
  index.html
  package.json
  package-lock.json
  vite.config.ts
  .env.example
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
  typecheck/
    check.sh
    tsconfig.preflight.json
docs/
  environment.md
  evidence/
    realtime-spike.md
    vertical-slice.md
    layperson-read.md
    claim-ledger.md
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
| Additive-safe spatial UI and polished companion web surface | Tasks 9‑1 and 13 |
| Layperson understands roles and loop within five silent seconds | Task 14, then Task 16 judge gate |
| Reconnect, malformed-message, load, and deployment evidence | Task 15 |
| Honest sub-60-second CLAD submission package | Task 16 |
| LLM-speed execution without parallel file collisions | Agent-native model plus the execution graph below |

---

### Task 1: Establish the SPECS project and Snap Cloud access gate

**Files:**

- Create through Lens Studio: `WordlessRelay.esproj`, `Assets/Scene.scene`
- Create: `docs/environment.md`
- Modify: `.gitignore`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Installed Lens Studio, Lens Studio MCP server, verified Snapchat
  account, Snap Cloud alpha entitlement.
- Produces: A clean Specs Base Template project, current package/version record,
  ignored local credential location, and a Preview baseline.

- [ ] **Step 1: Confirm the human/editor prerequisite before changing files**

Run:

```bash
pwd
find . -maxdepth 1 -name '*.esproj' -print
git status --short --branch
mdls -name kMDItemVersion '/Applications/Lens Studio.app'
```

Expected now: repository path is `CONNECT-2026`, branch is clean `main`, Lens
Studio reports `5.23.1.26080420`, and no `.esproj` exists. Ask the owner to
create/open a **Specs Base Template** project named `WordlessRelay` in this
repository. Do not create a Snapchat/default template or hand-write the
manifest.

- [ ] **Step 2: Verify the active editor through Lens Studio MCP**

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

- [ ] **Step 3: Install and inspect current Snap Cloud assets**

Through Lens Studio Asset Library/UI, install `SupabaseClient` and the Supabase
Plugin. Open the current Snap Cloud Realtime example if available and record:

```text
SupabaseClient package version
Supabase Plugin version
actual import path for createClient/RealtimeChannel/SupabaseClient
whether the current package requires globalThis.supabaseModule
available channel subscribe/send/cleanup signatures
```

Use the installed package source under `Cache/TypeScript/Src/Packages` and
generated `Support/` definitions as the type authority. Do not modify `Cache/`
or `Support/`.

- [ ] **Step 4: Prove Snap Cloud entitlement without exposing credentials**

Open `Window → Supabase`, sign in, create or select the project named
`wordless-relay`, and import its `SupabaseProject` asset into
`Assets/LocalOnly/`. Add the directory to `.gitignore`:

```gitignore
Assets/LocalOnly/
```

Pass only when the plugin can list the project and the imported asset exposes a
project URL and public token in the Inspector. Never print or commit either
value.

- [ ] **Step 5: Record concrete environment evidence**

Write `docs/environment.md` with the actual observed values and these fixed
sections:

```markdown
# WORDLESS environment record

## Editor and target
- Lens Studio version: record the exact `mdls` and MCP value
- Template: Specs Base Template
- Target platform: Spectacles
- Preview mode: record the exact editor label

## Installed packages
- SupabaseClient: record the exact Asset Library/package value
- Supabase Plugin: record the exact plugin value
- Spectacles Interaction Kit: record the exact package value

## Snap Cloud gate
- Alpha entitlement: confirmed
- Project visible in plugin: confirmed
- Credential asset path: record the exact ignored path under Assets/LocalOnly
- Secrets committed or logged: no

## Baseline
- TypeScript compile result: record the tool result
- Preview runtime result: record the tool result
- Logger errors: record the integer count
```

Every “record” instruction is replaced by the observed value before the file is
staged; instructional text never enters the environment record commit.

- [ ] **Step 6: Verify the empty-project baseline**

Use the Lens Studio compile tool, then the Preview run/log collection tool.
Expected: compile succeeds, Preview starts, and Logger shows zero project
runtime errors. A successful compile without Preview evidence fails this step.

- [ ] **Step 7: Commit the verified environment**

```bash
git add .gitignore WordlessRelay.esproj Assets/Scene.scene docs/environment.md docs/prompt-log.md
git diff --cached --check
git commit -m "chore: establish WORDLESS SPECS environment"
```

Do not stage `Assets/LocalOnly/`, `Cache/`, `Support/`, editor preferences, or
generated workspace state.

### Task 2: Build the browser half of the bidirectional spike

**Files:**

- Create: `web/package.json`, `web/package-lock.json`, `web/index.html`
- Create: `web/vite.config.ts`, `web/.env.example`
- Create: `web/src/probe-protocol.ts`, `web/src/relay-probe.ts`
- Create: `web/src/main.ts`, `web/src/styles.css`
- Create: `web/tests/probe-protocol.test.ts`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Snap Cloud project URL/public key from ignored `web/.env.local`,
  fixed probe session `WAVE42`, broadcast event `wordless-message`.
- Produces: A local page that visibly receives point batches, sends guesses and
  pings, shows channel state, and reports bytes/messages/RTT.

- [ ] **Step 1: Scaffold the smallest typed browser**

```bash
npm create vite@latest web -- --template vanilla-ts
cd web
npm install
npm install @supabase/supabase-js
npm install --save-dev vitest
```

Set scripts to:

```json
{
  "scripts": {
    "dev": "vite",
    "test": "vitest run",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

Commit the generated lockfile; it is the exact dependency version authority.

- [ ] **Step 2: Write the failing probe-protocol tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseProbeMessage, topicFor } from '../src/probe-protocol'

describe('probe protocol', () => {
  it('creates one session-qualified topic', () => {
    expect(topicFor('WAVE42')).toBe('wordless-relay:WAVE42')
  })

  it('accepts a bounded point batch', () => {
    expect(parseProbeMessage({
      kind: 'points', sessionId: 'WAVE42', seq: 1,
      points: [[100, 200], [300, 400]], sentAtMs: 10,
    })).not.toBeNull()
  })

  it('rejects out-of-range and malformed data', () => {
    expect(parseProbeMessage({
      kind: 'points', sessionId: 'WAVE42', seq: 1,
      points: [[1001, 0]], sentAtMs: 10,
    })).toBeNull()
    expect(parseProbeMessage({ kind: 'guess', choiceIndex: 9 })).toBeNull()
  })
})
```

- [ ] **Step 3: Run the tests and verify the red state**

Run: `npm test`

Expected: failure because `probe-protocol.ts` does not yet export the required
functions.

- [ ] **Step 4: Implement the exact probe contract**

```ts
export type ProbeMessage =
  | { kind: 'points'; sessionId: string; seq: number; points: [number, number][]; sentAtMs: number }
  | { kind: 'guess'; sessionId: string; guessId: string; choiceIndex: 0 | 1 | 2 | 3; sentAtMs: number }
  | { kind: 'ping'; sessionId: string; pingId: string; sentAtMs: number }
  | { kind: 'ack'; sessionId: string; pingId: string; sentAtMs: number }

export const topicFor = (sessionId: string): string => {
  if (!/^[A-Z0-9]{6}$/.test(sessionId)) throw new Error('invalid session id')
  return `wordless-relay:${sessionId}`
}

const isInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value)

export function parseProbeMessage(value: unknown): ProbeMessage | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (typeof v.sessionId !== 'string' || !/^[A-Z0-9]{6}$/.test(v.sessionId)) return null
  if (typeof v.sentAtMs !== 'number' || !Number.isFinite(v.sentAtMs)) return null
  if (v.kind === 'points') {
    if (!isInt(v.seq) || !Array.isArray(v.points) || v.points.length > 8) return null
    const valid = v.points.every((point) => Array.isArray(point) && point.length === 2 &&
      point.every((axis) => isInt(axis) && axis >= 0 && axis <= 1000))
    return valid ? value as ProbeMessage : null
  }
  if (v.kind === 'guess') {
    return typeof v.guessId === 'string' && isInt(v.choiceIndex) &&
      v.choiceIndex >= 0 && v.choiceIndex <= 3 ? value as ProbeMessage : null
  }
  if (v.kind === 'ping' || v.kind === 'ack') {
    return typeof v.pingId === 'string' ? value as ProbeMessage : null
  }
  return null
}
```

Run: `npm test`

Expected: all probe-protocol tests pass.

- [ ] **Step 5: Build the browser relay probe**

Create one Supabase client and one channel owner. The connection core is:

```ts
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import { parseProbeMessage, topicFor, type ProbeMessage } from './probe-protocol'

export type ProbeStatus = 'connecting' | 'live' | 'failed' | 'closed'

export class RelayProbe {
  private readonly client
  private channel: RealtimeChannel | null = null

  constructor(
    url: string,
    publicKey: string,
    private readonly sessionId: string,
    private readonly onMessage: (message: ProbeMessage) => void,
    private readonly onStatus: (status: ProbeStatus, detail: string) => void,
  ) {
    this.client = createClient(url, publicKey, {
      realtime: { heartbeatIntervalMs: 2500 },
    })
  }

  connect(): void {
    this.onStatus('connecting', 'CONNECTING')
    this.channel = this.client
      .channel(topicFor(this.sessionId), { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'wordless-message' }, ({ payload }) => {
        const parsed = parseProbeMessage(payload)
        if (parsed) this.onMessage(parsed)
      })
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') this.onStatus('live', 'CONNECTED')
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

  async close(): Promise<void> {
    if (this.channel) await this.client.removeChannel(this.channel)
    this.channel = null
  }
}
```

`main.ts` reads only `VITE_SNAP_CLOUD_URL`,
`VITE_SNAP_CLOUD_PUBLIC_KEY`, and `VITE_RELAY_SESSION_ID`; it refuses to start
if any is missing. `web/.env.example` lists those names with only
`VITE_RELAY_SESSION_ID=WAVE42` populated.

- [ ] **Step 6: Add a literal visible probe UI**

`index.html` contains exactly these interactive/status regions:

```html
<main>
  <p id="connection" role="status">CONNECTING</p>
  <canvas id="stroke" width="1000" height="600" aria-label="Incoming Lens stroke"></canvas>
  <button id="guess" type="button">SEND GUESS 2</button>
  <button id="ping" type="button">MEASURE ROUND TRIP</button>
  <pre id="metrics" aria-live="polite"></pre>
</main>
```

Render received points as a solid violet polyline, count received messages and
serialized bytes, send choice index `2`, and compute RTT from browser-origin
`ping` to Lens-origin `ack` using the original `sentAtMs`.

- [ ] **Step 7: Verify browser-only evidence**

```bash
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

Expected without local credentials: tests/build pass; the page renders a clear
missing-configuration error and makes no network call. With ignored local
credentials: the page reaches `CONNECTING` without leaking values to output.

- [ ] **Step 8: Commit the browser probe**

```bash
git add web docs/prompt-log.md
git diff --cached --check
git commit -m "spike: add Snap Cloud browser probe"
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
- Produces: Lens `AUTH_OK`/`SUBSCRIBED`/`RX_GUESS` evidence, a visible
  correct/incorrect state, 10 Hz point messages, and ping acknowledgements.

- [ ] **Step 1: Add the Node resolver and failing Lens-parser tests**

Node 22.14 exposes asynchronous `register`, not the newer synchronous
`registerHooks`. Create `tools/core-tests/register.mjs` as:

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
the installed Node 22.14. It lets Lens-compatible extensionless imports execute
unchanged in the Node test process.

Test `parseProbeGuess` with choice `2`, choice `9`, wrong session, missing
`guessId`, and a duplicate-ID set. Run:

```bash
node --experimental-strip-types --import ./tools/core-tests/register.mjs --test tools/core-tests/spike-protocol.test.mjs
```

Expected: fail because `ProbeProtocol.ts` does not exist.

- [ ] **Step 2: Implement the pure Lens-side probe validator**

Export:

```ts
export interface ProbeGuess {
  kind: 'guess'
  sessionId: string
  guessId: string
  choiceIndex: 0 | 1 | 2 | 3
  sentAtMs: number
}

export function parseProbeGuess(
  value: unknown,
  expectedSession: string,
  seenGuessIds: { [id: string]: boolean },
): ProbeGuess | null
```

The function accepts only the exact session, integer choice `0..3`, finite
timestamp, nonempty ID, and unseen ID. It marks no ID itself; the caller marks
an ID only after accepting the message.

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
  private seenGuessIds: { [id: string]: boolean } = {}

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => this.initialize())
    this.createEvent('OnDestroyEvent').bind(() => {
      if (this.client) this.client.removeAllChannels()
    })
  }

  private async initialize(): Promise<void> {
    this.setStatus('AUTHENTICATING', new vec4(1, 0.84, 0.35, 1))
    this.client = createClient(
      this.supabaseProject.url,
      this.supabaseProject.publicToken,
      { realtime: { heartbeatIntervalMs: 2500 } },
    )
    const { error } = await this.client.auth.signInWithIdToken({
      provider: 'snapchat', token: '',
    })
    if (error) {
      print('[RelaySpike] AUTH_FAILED ' + String(error.name ?? error))
      this.setStatus('AUTH FAILED', new vec4(1, 0.47, 0.42, 1))
      return
    }
    print('[RelaySpike] AUTH_OK')
    this.openChannel()
  }
}
```

Before using this code, inspect the installed package/sample for the
version-specific `globalThis.supabaseModule` assignment recorded in Task 1 and
apply that exact requirement if present. Never log session/user tokens.

- [ ] **Step 4: Add channel receive/send behavior**

Join `wordless-relay:${this.channelName}` with
`broadcast: { self: false }`. Register one `wordless-message` callback.

- A valid guess logs `RX_GUESS`, marks its ID, and sets the visible state to
  mint `CORRECT` only for choice `2`; all other allowed choices become coral
  `TRY AGAIN`.
- A ping produces an `ack` carrying the same `pingId` and original `sentAtMs`.
- Unknown, stale, malformed, wrong-session, and duplicate payloads log
  `REJECTED` and do not alter the visible state.
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
[RelaySpike] AUTH_OK
[RelaySpike] CHANNEL SUBSCRIBED
```

An auth retryable fetch error permits one documented retry after a one-second
`DelayedCallbackEvent`; any second failure stops the task. A compile result
without these runtime lines does not pass.

- [ ] **Step 7: Commit the Lens probe**

```bash
git add Assets/Wordless/Scripts/Spike tools/core-tests Assets/Scene.scene docs/prompt-log.md
git diff --cached --check
git commit -m "spike: add Snap Cloud Lens probe"
```

### Task 4: Execute and decide Gate 0

**Files:**

- Create: `docs/evidence/realtime-spike.md`
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
Lens-side validation, and visible Lens transition to mint `CORRECT`. Then send
choice `1` in a fresh run and require coral `TRY AGAIN`. The browser never sends
an outcome field.

- [ ] **Step 4: Prove rejection and continuity**

From browser development controls, send wrong-session, out-of-range,
duplicate-ID, stale-sequence, unknown-kind, and over-eight-point messages.
Require six `REJECTED` logs and zero visible result changes. Then maintain 10 Hz
valid traffic for another ten seconds with no warning, gap, timeout, or
disconnect.

- [ ] **Step 5: Measure twenty round trips**

Send twenty browser pings spaced 250 ms apart. Record median, p95, maximum,
message count, and largest serialized message.

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

- [ ] **Step 8: Commit the decision and obey it**

```bash
git add docs/evidence/realtime-spike.md docs/prompt-log.md
git diff --cached --check
git commit -m "test: record WORDLESS realtime gate"
```

If result is NO-GO, stop. Report the exact failed criterion and ask the owner to
choose WORDLESS Duo or Split the Table. Do not build a local mirror, replace
Snap Cloud, simulate traffic, or continue to Task 5.

### Task 5: Freeze the canonical protocol and local validation harness

**Files:**

- Create: `package.json`, `package-lock.json`
- Create: `Assets/Wordless/Scripts/Core/Protocol.ts`
- Create: `Assets/Wordless/Scripts/Transport/RelayPort.ts`
- Create: `tools/core-tests/protocol.test.mjs`
- Create: `tools/typecheck/check.sh`
- Create: `tools/typecheck/tsconfig.preflight.json`
- Modify: `web/vite.config.ts`, `web/tsconfig.app.json`
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
  MAX_BATCH_POINTS, MAX_STROKE_POINTS, PROTOCOL_VERSION,
  buildRoundStart, parseRelayMessage, serializedAsciiBytes,
} from '../../Assets/Wordless/Scripts/Core/Protocol.ts'

test('round start exposes choices but no answer index', () => {
  const message = buildRoundStart({
    sessionId: 'WAVE42', roundId: 'round-1', senderId: 'lens', sequence: 1,
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'], durationMs: 20000,
    sentAtMs: 100,
  })
  assert.equal(message.v, PROTOCOL_VERSION)
  assert.equal('correctIndex' in message.payload, false)
  assert.equal(JSON.stringify(message).includes('correctIndex'), false)
})

test('point batches are bounded and ordered', () => {
  assert.equal(MAX_BATCH_POINTS, 8)
  assert.equal(MAX_STROKE_POINTS, 128)
  assert.equal(parseRelayMessage({
    v: 1, type: 'stroke.points', sessionId: 'WAVE42', roundId: 'round-1',
    senderId: 'lens', sequence: 2, sentAtMs: 100,
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
```

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

export type ChoiceIndex = 0 | 1 | 2 | 3
export type ChoiceTuple = readonly [string, string, string, string]
export type QuantizedPoint = readonly [number, number]
export interface WorldPoint { readonly x: number; readonly y: number; readonly z: number }
export type GlyphNormalizer = (
  points: readonly QuantizedPoint[],
) => readonly QuantizedPoint[]
export type RoundPhase =
  | 'DISCONNECTED' | 'JOINING' | 'READY' | 'ACTIVE'
  | 'INCORRECT' | 'CORRECT' | 'GLYPH_LOCKED'

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
  | BaseMessage<'presence.ready', { role: 'painter' | 'guesser' }>
  | BaseMessage<'round.start', { choices: ChoiceTuple; durationMs: number }>
  | BaseMessage<'stroke.begin', { strokeId: string }>
  | BaseMessage<'stroke.points', { strokeId: string; points: readonly QuantizedPoint[] }>
  | BaseMessage<'stroke.end', { strokeId: string }>
  | BaseMessage<'guess.submit', { guessId: string; choiceIndex: ChoiceIndex }>
  | BaseMessage<'round.result', {
      guessId: string
      choiceIndex: ChoiceIndex
      outcome: 'correct' | 'incorrect'
      revealedWord?: string
      glyph?: readonly QuantizedPoint[]
    }>
  | BaseMessage<'round.reset', { nextRoundId: string }>
  | BaseMessage<'transport.ping', { pingId: string; originSentAtMs: number }>
  | BaseMessage<'transport.ack', { pingId: string; originSentAtMs: number }>
```

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
}

export function buildRoundStart(
  input: RoundStartInput,
): Extract<RelayMessage, { type: 'round.start' }>
```

`parseRelayMessage` must validate every base field, exact six-character session
format, known type, per-type payload, finite nonnegative timestamps, integer
sequence, ASCII word strings, four unique choices, allowed choice index,
normalized integer points, batch cap, glyph cap, and message byte cap. Presence
and transport ping/ack use `LOBBY_ROUND_ID` before a product round exists; all
round and stroke messages require the current product round ID. The parser
returns a new sanitized object, never the caller's mutable object.

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

Message builders freeze their return value and never accept a `correctIndex`
for public round state.

- [ ] **Step 4: Define the transport boundary**

```ts
import type { RelayMessage } from '../Core/Protocol'

export type RelayStatus =
  | 'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBED'
  | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

export interface RelayPort {
  connect(): Promise<void>
  send(message: RelayMessage): Promise<void>
  close(): Promise<void>
  onMessage(listener: (message: RelayMessage) => void): () => void
  onStatus(listener: (status: RelayStatus, detail: string) => void): () => void
}
```

No engine imports Supabase. No transport mutates `RoundStore` directly; the
composition root validates and dispatches messages.

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

Add this exact entry under `compilerOptions.paths` in `web/tsconfig.app.json`:

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
`@wordless/core/Protocol`, never from a copied web definition.

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
git add package.json package-lock.json Assets/Wordless/Scripts/Core Assets/Wordless/Scripts/Transport/RelayPort.ts tools web docs/prompt-log.md
git diff --cached --check
git commit -m "feat: freeze WORDLESS relay protocol"
```

The orchestrator now announces the freeze before dispatching Tasks 6–9.

### Task 6: Implement the authoritative round engine and store

**Files:**

- Create: `Assets/Wordless/Scripts/Core/RoundStore.ts`
- Create: `Assets/Wordless/Scripts/Core/WordlessEngine.ts`
- Create: `Assets/Wordless/Scripts/Core/WordDeck.ts`
- Create: `tools/core-tests/engine.test.mjs`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Frozen `ChoiceIndex`, `ChoiceTuple`, `QuantizedPoint`,
  `GlyphNormalizer`, `RoundPhase`, and `WorldPoint`.
- Produces: `RoundStore`, `WordlessEngine`, `WordCard`, `EngineEffect`, and the
  single `applyRound` reset path used by Lens composition.

- [ ] **Step 1: Write failing engine tests**

Cover the complete state contract:

```js
test('applyRound is the only full reset and publishes no secret', () => {})
test('drawing and guesses coexist in ACTIVE', () => {})
test('wrong guess marks only that choice and remains ACTIVE', () => {})
test('duplicate and stale guesses produce no effect', () => {})
test('correct guess reveals word and exact glyph once', () => {})
test('timeout creates no glyph', () => {})
test('disconnect blocks guesses and reconnect requires applyRound', () => {})
```

Each test constructs the engine with deterministic time and the `SNAKE` card.
Assert snapshots and emitted effects; never inspect view components.

- [ ] **Step 2: Run the tests red**

Run: `npm run test:core`

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
mutate it.

- [ ] **Step 5: Implement engine commands and effects**

Expose exactly:

```ts
export type EngineEffect =
  | { type: 'publish-round-start' }
  | { type: 'publish-stroke-begin'; strokeId: string }
  | { type: 'publish-stroke-points'; strokeId: string; points: readonly QuantizedPoint[] }
  | { type: 'publish-stroke-end'; strokeId: string }
  | {
      type: 'publish-result'
      guessId: string
      choiceIndex: ChoiceIndex
      outcome: 'correct' | 'incorrect'
      revealedWord?: string
      glyph?: readonly QuantizedPoint[]
    }
  | { type: 'publish-reset'; nextRoundId: string }

export class WordlessEngine {
  private readonly store: RoundStore
  private readonly normalizeGlyph: GlyphNormalizer
  constructor(store: RoundStore, normalizeGlyph: GlyphNormalizer) {
    this.store = store
    this.normalizeGlyph = normalizeGlyph
  }
  applyRound(roundId: string, card: WordCard, nowMs: number, durationMs = 20000): EngineEffect[]
  setCounterpartReady(ready: boolean): EngineEffect[]
  beginStroke(strokeId: string): EngineEffect[]
  appendPoint(world: WorldPoint, point: QuantizedPoint): EngineEffect[]
  flushPointBatch(): EngineEffect[]
  endStroke(): EngineEffect[]
  submitGuess(guessId: string, choiceIndex: ChoiceIndex, nowMs: number): EngineEffect[]
  lockGlyph(): void
  tick(nowMs: number): EngineEffect[]
  disconnect(): void
}
```

`submitGuess` accepts only `ACTIVE`, current round, unseen ID, and an untried
choice. Incorrect appends the choice and returns to `ACTIVE`; correct reveals
the local answer, calls the injected normalizer once on the exact public path,
stores its returned points in `glyph`, and transitions to `CORRECT`. Engine
tests inject an identity or explicit test normalizer; Task 7 supplies the
production function. The composition root calls `lockGlyph()` after the
450 ms deterministic view animation, producing `GLYPH_LOCKED`. `applyRound`
enters `READY`; `setCounterpartReady(true)` enters `ACTIVE` and emits the one
public round-start effect. Timeout sets `lastOutcome: 'timeout'`, clears glyph,
and stops input.

- [ ] **Step 6: Verify engine invariants**

Run: `npm run test:core`

Expected: all protocol and engine tests pass, including an assertion that
serializing every public effect contains neither `correctIndex` nor the answer
before a correct result.

- [ ] **Step 7: Commit the engine lane**

```bash
git add Assets/Wordless/Scripts/Core tools/core-tests/engine.test.mjs docs/prompt-log.md
git diff --cached --check
git commit -m "feat: add authoritative WORDLESS round engine"
```

### Task 7: Implement bounded stroke and deterministic glyph geometry

**Files:**

- Create: `Assets/Wordless/Scripts/Core/StrokeGeometry.ts`
- Create: `tools/core-tests/geometry.test.mjs`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: `QuantizedPoint`, `MAX_BATCH_POINTS`, `MAX_STROKE_POINTS`.
- Produces: `WorldPoint`, `acceptWorldPoint`, `quantizePlanePoint`,
  `takePointBatch`, and `normalizeGlyph` for engine, Lens, and browser.

- [ ] **Step 1: Write the failing geometry tests**

```js
test('samples only after 2.5 cm of movement', () => {})
test('quantizes drawing plane corners to 0 and 1000', () => {})
test('caps a stroke at exactly 128 points', () => {})
test('batches no more than eight points without reordering', () => {})
test('normalizes the exact path into a centered 0.8 square', () => {})
test('normalization preserves point count and order', () => {})
test('single-point glyph remains finite and centered', () => {})
```

- [ ] **Step 2: Run the geometry tests red**

Run: `npm run test:core`

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
  if (points.length >= 128) return false
  if (points.length === 0) return true
  const last = points[points.length - 1]
  const dx = candidate.x - last.x
  const dy = candidate.y - last.y
  const dz = candidate.z - last.z
  return dx * dx + dy * dy + dz * dz >= 6.25
}

export function quantizePlanePoint(local: WorldPoint): QuantizedPoint {
  const nx = Math.max(0, Math.min(1, local.x / DRAWING_WIDTH_CM + 0.5))
  const ny = Math.max(0, Math.min(1, 0.5 - local.y / DRAWING_HEIGHT_CM))
  return [Math.round(nx * 1000), Math.round(ny * 1000)]
}
```

Import `WorldPoint` and `QuantizedPoint` from `Protocol.ts`; neither type is
redeclared in `StrokeGeometry.ts`.

`takePointBatch(queue)` returns `{ batch, rest }`, where `batch` is the first
eight points and `rest` preserves all later points.

- [ ] **Step 4: Implement exact-path medallion normalization**

Convert integer points to `0..1`, compute the bounding box, center it, and apply
one uniform scale so the larger dimension occupies `0.8`. Return integers in
`100..900`. For a zero-width/zero-height path, center the varying axis and set
the fixed axis to `500`. Never smooth, classify, reorder, add, or remove a
point.

- [ ] **Step 5: Verify geometry**

Run: `npm run test:core`

Expected: all geometry tests pass, and a 128-point input returns exactly 128
glyph points in the original order.

- [ ] **Step 6: Commit the geometry lane**

```bash
git add Assets/Wordless/Scripts/Core/StrokeGeometry.ts tools/core-tests/geometry.test.mjs docs/prompt-log.md
git diff --cached --check
git commit -m "feat: add bounded stroke and glyph geometry"
```

### Task 8: Replace the probe with product relay adapters

**Files:**

- Create: `Assets/Wordless/Scripts/Transport/SnapCloudRelayTransport.ts`
- Create: `web/src/relay-client.ts`
- Create: `web/tests/relay-client.test.ts`
- Create: `tools/core-tests/transport-policy.test.mjs`
- Delete after replacement: `Assets/Wordless/Scripts/Spike/RelaySpike.ts`
- Delete after replacement: `Assets/Wordless/Scripts/Spike/ProbeProtocol.ts`
- Delete after replacement: `tools/core-tests/spike-protocol.test.mjs`
- Modify through MCP: `Assets/Scene.scene`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Frozen `RelayMessage`, `parseRelayMessage`, `RelayPort`, and Gate 0
  package lifecycle.
- Produces: Lens and browser adapters with the same topic/event, counterpart
  handshake, ping/ack, message metrics, duplicate/stale rejection hooks, and
  explicit status callbacks.

- [ ] **Step 1: Write browser relay tests with a fake channel**

Define a narrow injected dependency:

```ts
export interface BrowserChannel {
  on(type: 'broadcast', filter: { event: string }, callback: (message: { payload: unknown }) => void): BrowserChannel
  subscribe(callback: (status: string, error?: unknown) => void): BrowserChannel
  send(message: { type: 'broadcast'; event: string; payload: unknown }): Promise<string>
  unsubscribe(): Promise<string>
}
```

Test: topic name, `SUBSCRIBED` status, sanitized receive, invalid receive
rejection, non-`ok` send failure, one ready handshake, ping/ack, and cleanup.

- [ ] **Step 2: Run adapter tests red**

Run: `npm --prefix web test`

Expected: `relay-client.ts` module not found.

- [ ] **Step 3: Implement the browser adapter**

`BrowserRelayClient` accepts a `channelFactory`, session ID, sender ID, and
clock. Production factory wraps `@supabase/supabase-js`; tests use the fake.
The adapter owns one channel and publishes only frozen `RelayMessage` objects.

On `SUBSCRIBED`, send `presence.ready` with role `guesser` and
`roundId: LOBBY_ROUND_ID`. The Lens does not show `CONNECTED` until it receives
this message. On disconnect/rejoin, the web store clears the incomplete stroke
and waits for a fresh `round.start`; it does not invent replay.

- [ ] **Step 4: Implement the Lens adapter**

`SnapCloudRelayTransport` implements `RelayPort` using the exact authenticated
lifecycle proven in Gate 0. It:

- authenticates before channel creation;
- uses `heartbeatIntervalMs: 2500`;
- joins `wordless-relay:${sessionId}`;
- sends/receives only event `wordless-message`;
- calls `parseRelayMessage` before notifying listeners;
- rejects wrong session, wrong role, malformed, stale, duplicate, and oversized
  messages with a reason code;
- sends painter `presence.ready` with `roundId: LOBBY_ROUND_ID` after channel
  subscription;
- reports guesser readiness to `WordlessApp`; only the composition root calls
  `WordlessEngine.setCounterpartReady(true)` and publishes the resulting one
  `round.start` effect—the adapter never authors round state;
- emits status for every official subscription state;
- stops timers and calls `removeAllChannels()` on close/destroy;
- records counts and largest serialized message without logging payload secrets.

- [ ] **Step 5: Add pure policy tests**

Test the adapter-independent `ReceivePolicy` with message sequences:

```text
sequence 1 -> accept
sequence 1 duplicate -> reject DUPLICATE_SEQUENCE
sequence 0 after 1 -> reject STALE_SEQUENCE
wrong session -> reject WRONG_SESSION
browser round.result -> reject WRONG_AUTHORITY
browser guess.submit in ACTIVE -> accept
browser guess.submit in READY -> reject WRONG_PHASE
```

- [ ] **Step 6: Replace the spike in the scene**

Through one Lens MCP writer, remove the `RelaySpike` component, attach
`SnapCloudRelayTransport`, preserve the ignored Supabase input, and save.
Delete the spike component source only after the product adapter reproduces the
Gate 0 point/guess path. Keep `ProbeProtocol.ts` only if the evidence replay
still imports it during the replacement check; before committing, remove both
`ProbeProtocol.ts` and `spike-protocol.test.mjs` together so the root core test
glob never points at a deleted implementation.

- [ ] **Step 7: Verify both adapters**

```bash
npm run check
sh tools/typecheck/check.sh
```

Then compile and run Preview with the browser. Require readiness messages in
both directions, one valid guess, six invalid-message rejections, and cleanup
on refresh. Compare current median/p95 against Gate 0; regression beyond 20%
fails the task.

- [ ] **Step 8: Commit the production transport**

```bash
git add Assets/Wordless/Scripts/Transport web/src web/tests tools/core-tests Assets/Scene.scene docs/prompt-log.md
git add -A Assets/Wordless/Scripts/Spike
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
- Modify: `web/package.json`, `web/package-lock.json`
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
  it('enters READY only after painter presence and round.start', () => {})
  it('appends ordered point batches and ignores stale batches', () => {})
  it('disables only the submitted card while awaiting a result', () => {})
  it('keeps an incorrect card coral and the remaining cards active', () => {})
  it('locks exact glyph points and revealed word on correct', () => {})
  it('clears an incomplete stroke after reconnect until round.start', () => {})
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
  readonly choices: ChoiceTuple | null
  readonly points: readonly QuantizedPoint[]
  readonly pendingChoice: ChoiceIndex | null
  readonly wrongChoices: readonly ChoiceIndex[]
  readonly revealedWord: string | null
  readonly glyph: readonly QuantizedPoint[]
  readonly remainingMs: number
}
```

`WebRoundStore.dispatch(message)` accepts painter-origin public messages only.
`submitChoice(index)` emits an intent to the composition root but cannot alter
outcome. `replaceAfterReconnect()` clears points and round data and enters
`reconnecting`.

- [ ] **Step 4: Write DOM-render tests**

Using Vitest's DOM environment, assert:

```text
WAITING FOR PAINTER appears before counterpart readiness
GUESSER and GUESS THE CLUE are always visible during a round
exactly four buttons exist and are at least 48 CSS px high
pending button is disabled and labeled SUBMITTED
incorrect button has text/icon in addition to coral
correct state includes the revealed word and canvas glyph
canvas has an accessible name
network errors appear in role=status without credentials
```

- [ ] **Step 5: Author the fixed semantic structure**

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

- [ ] **Step 6: Implement the canvas and card renderer**

`render(snapshot)` is the only DOM writer. It clears/redraws the canvas from
`snapshot.points`, maps `0..1000` to the current canvas client bounds, draws a
round-capped `#8B5CF6` line with a small `#FFD65A` endpoint, and never reads
correctness from the choices. `snapshot.glyph` is rendered from the exact
points inside a circular medallion.

Every answer button combines state:

```text
neutral: ivory + answer word
pending: violet border + “SUBMITTED”
incorrect: coral + × + “TRY AGAIN”
correct: mint + ✓ + revealed answer
```

- [ ] **Step 7: Implement the production CSS without external assets**

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

- [ ] **Step 8: Wire real intents and timer**

`main.ts` composes environment, `BrowserRelayClient`, `WebRoundStore`, and
`render`. A choice click builds `guess.submit` with a unique `guessId`, current
round/session, and the chosen index. A 100 ms local timer tick changes only the
displayed remaining time; Lens `round.result` or reset remains authoritative.

- [ ] **Step 9: Add responsive end-to-end tests**

Install `@playwright/test`, then test at `390×844` and `1440×900` with a fake
in-page relay driver. Assert four visible cards, no horizontal overflow, wrong
then correct state, and the exact-path glyph. Save screenshots under the
Playwright report, not `web/public/`.

Add `"test:e2e": "playwright test"` to `web/package.json`, then run:

```bash
npm --prefix web test
npm --prefix web run build
npm --prefix web run test:e2e
```

- [ ] **Step 10: Commit the browser product surface**

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
- Modify through Lens Studio MCP: `Assets/Scene.scene`
- Create through Lens Studio MCP: original materials under
  `Assets/Wordless/Materials/`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: `acceptWorldPoint`, `quantizePlanePoint`, engine stroke commands,
  SIK `Interactable`/`InteractableManipulation` confirmed from installed source.
- Produces: A draggable lemon brush constrained to a 180×110 cm vertical
  drawing plane and a bounded violet world-space ribbon whose visible state
  carries the simulated-hand interaction.

- [ ] **Step 1: Verify exact SIK and mesh APIs before coding**

Inspect current package source and `Support/StudioLib.d.ts` for:

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
```

`BrushController` creates/receives the SIK interaction components. On
manipulation start it creates a monotonic `stroke-N` ID; on each `UpdateEvent`
while manipulating it constrains local x to `[-90, 90]`, local y to
`[-55, 55]`, and local z to `0`, then emits only points accepted by the 2.5 cm
sampler. End emits once. The brush never resets the round itself.

- [ ] **Step 3: Build an original additive-safe ribbon mesh**

`StrokeRibbonMesh` uses `MeshBuilder` with position, normal, and UV attributes.
For each consecutive point pair, emit two perpendicular double-sided quads of
3.6 cm total width. Skip zero-length segments. Cap input at 128 points and use
`UInt16` indices. This crossed geometry prevents the stroke collapsing to a
hairline from side angles without copying FIRST BOUNCE's ray styling or code.

`StrokeRibbonView.render(worldPoints)` rebuilds at most when an accepted sample
arrives, not every frame. It maintains:

```text
outer pass: violet, 7.0 cm, low alpha but saturated
core pass: violet/ivory-hot, 3.6 cm, full alpha
draw head: lemon sphere, 5 cm visible diameter
```

No particles, semantic icons, external textures, or black materials.

- [ ] **Step 4: Author the drawing volume from the actual camera**

Through Lens Studio MCP, inspect active camera pose and existing objects. Create
`DrawingAnchor` at:

```text
camera position + camera forward × 160 cm + world up × 15 cm
```

Orient its local plane toward the camera. Create a 14 cm collider around the
5 cm visible brush head, attach SIK manipulation, and keep the drawing plane
itself invisible in judged mode. Do not place anything at an assumed origin.

- [ ] **Step 5: Connect brush events to the engine**

The composition wiring calls `beginStroke`, `appendPoint`, and `endStroke`.
Every accepted point renders locally immediately. Transport batching remains a
separate 10 Hz action through engine effects, so network cadence never delays
the local stroke.

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
```

Capture front and 30-degree side views; the ribbon must remain readable in both.

- [ ] **Step 7: Commit the spatial drawing surface**

```bash
git add Assets/Wordless Assets/Scene.scene docs/prompt-log.md
git diff --cached --check
git commit -m "feat: add WORDLESS spatial brush and ribbon"
```

### Task 11: Compose Lens state, HUD, result, and replay

**Files:**

- Create: `Assets/Wordless/Scripts/View/LensHudView.ts`
- Create: `Assets/Wordless/Scripts/View/GlyphMedallionView.ts`
- Create: `Assets/Wordless/Scripts/WordlessApp.ts`
- Modify through Lens Studio MCP: `Assets/Scene.scene`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Engine/store, Lens relay adapter, brush, ribbon, exact glyph
  points.
- Produces: One complete Lens-side round, literal connection truth, wrong and
  correct states, deterministic glyph lock, timer, and replay through
  `applyRound`.

- [ ] **Step 1: Implement write-only view contracts**

```ts
export interface LensHudView {
  render(snapshot: LensRoundState): void
}

export interface GlyphMedallionView {
  hide(): void
  render(points: readonly QuantizedPoint[], revealedWord: string): void
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

- [ ] **Step 3: Implement the deterministic medallion**

`GlyphMedallionView.render` converts exact quantized glyph points into a 34 cm
wide local mesh inside a bright circular frame to the right of the drawing
volume. It adds the revealed word beneath. It may translate/scale the path but
must preserve count and order and may not redraw a snake or recognized object.

- [ ] **Step 4: Build the composition root**

`WordlessApp` constructs `WordlessEngine(store, normalizeGlyph)` and is the only
component that wires:

```text
RelayPort messages -> validation -> WordlessEngine commands
WordlessEngine effects -> RelayPort sends
RoundStore snapshots -> HUD, ribbon, medallion
Brush events -> WordlessEngine
timer event -> WordlessEngine.tick
```

On Lens start, call `applyRound('round-1', WORD_DECK[0], Date.now(), 20000)`.
On browser readiness, publish the public round. On correct, show the medallion.
The replay control increments the round ID and calls `applyRound`; no component
manually clears its own state first.

- [ ] **Step 5: Add runtime invariant logs**

Emit concise secret-safe lines:

```text
[Wordless] PHASE READY -> ACTIVE
[Wordless] STROKE points=<count> bytes=<count>
[Wordless] GUESS index=<index> outcome=<incorrect|correct>
[Wordless] GLYPH_LOCKED points=<count>
[Wordless] APPLY_ROUND round=<id>
```

Do not print the answer before reveal, public token, auth user data, or raw
message bodies.

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
```

Run core tests, typecheck, compile, Preview, and Logger inspection.

- [ ] **Step 7: Commit the composed Lens experience**

```bash
git add Assets/Wordless Assets/Scene.scene docs/prompt-log.md
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
sh tools/typecheck/check.sh
git diff --check
```

Expected: zero failed tests, web build exit 0, Lens preflight exit 0, and no
whitespace errors.

- [ ] **Step 2: Compile and establish clean runtime state**

Use Lens Studio compile then Preview/log collection. Clear prior overlays and
logs. Require Snap Cloud auth/subscription, one painter/guesser readiness
exchange, and `APPLY_ROUND round=round-1`.

- [ ] **Step 3: Record the exact vertical slice**

From one continuous clean run:

1. Browser joins `WAVE42`.
2. Lens and browser visibly become connected.
3. Drag brush into one S-shaped stroke while the browser line updates.
4. Browser submits `ROPE`; Lens publishes incorrect; both surfaces turn coral.
5. Browser submits `SNAKE`; Lens publishes correct; both turn mint and reveal
   `SNAKE`.
6. The same point count locks into both medallions.
7. Replay calls `applyRound` and both return to clean round state.

- [ ] **Step 4: Verify causality and equality from evidence**

Require log/capture proof that:

```text
browser receives real Lens batches
browser sends choices only
Lens alone publishes outcomes
both surfaces use the same round ID and phase
world/public/glyph counts match expected transformations
wrong card remains disabled while other cards remain active
glyph point count and order equal the sampled public path
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
- Modify: `web/src/render.ts`, `web/src/styles.css`
- Modify: `web/tests/render.test.ts`, `web/e2e/wordless.spec.ts`
- Create: `docs/evidence/visual-review.md`
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

Run `npm run test:core`; expect missing `GlyphTransition.ts`.

- [ ] **Step 2: Implement the deterministic tween**

```ts
export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return 1 - Math.pow(1 - clamped, 3)
}

export function interpolatePath(
  from: readonly WorldPoint[],
  to: readonly WorldPoint[],
  progress: number,
): readonly WorldPoint[] {
  if (from.length !== to.length) throw new Error('path length mismatch')
  const t = easeOutCubic(progress)
  return from.map((point, index) => ({
    x: point.x + (to[index].x - point.x) * t,
    y: point.y + (to[index].y - point.y) * t,
    z: point.z + (to[index].z - point.z) * t,
  }))
}
```

The Lens and browser both animate the same points for 450 ms, then settle into
the glyph. No semantic icon appears.

- [ ] **Step 3: Run a Lens additive-readability pass**

Capture bright and medium simulated rooms. Adjust only material color,
emission, line width, text size, spacing, and hierarchy until:

```text
violet path separates from wall/furniture
lemon brush head remains visible against a bright window
ivory prompt/timer read at judged capture scale
mint/coral result change is unmistakable without a dark backing card
medallion is visually secondary to the live stroke until success
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
to zero while preserving final states.

- [ ] **Step 5: Use side-by-side review without shipping references**

Compare fresh screenshots against the three files in
`docs/references/visuals/`. Score 1–5 for hierarchy, relay clarity, palette,
answer readability, and payoff. Record what was borrowed and what was rejected
in `docs/evidence/visual-review.md`. Do not copy the reference files into any
runtime/public directory.

- [ ] **Step 6: Run full visual checks**

```bash
npm run check
npm --prefix web run test:e2e
sh tools/typecheck/check.sh
```

Compile/run Preview, perform a real connected wrong→correct round, and inspect
the recorded 450 ms transformation frame by frame. Require exact path count in
the first and last frames.

- [ ] **Step 7: Commit the polish pass**

```bash
git add Assets/Wordless web tools/core-tests docs/evidence/visual-review.md docs/prompt-log.md
git diff --cached --check
git commit -m "polish: refine WORDLESS visual payoff"
```

### Task 14: Prove five-second comprehension and accessibility

**Files:**

- Create: `docs/evidence/layperson-read.md`
- Modify as evidence demands: Lens view files and/or `web/src/render.ts`,
  `web/src/styles.css`
- Modify: `web/e2e/wordless.spec.ts`, `web/package.json`, `web/package-lock.json`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Polished vertical slice.
- Produces: A mute-readable opening, role clarity, non-color-only states, phone
  accessibility, and blind-review evidence. Any revisions are staging/copy/
  hierarchy changes, not features.

- [ ] **Step 1: Cut one uncaptioned five-second comprehension clip**

The frame opens in medias res with both surfaces visible:

```text
Lens side label: PAINTER
Lens prompt: DRAW: SNAKE
Browser side label: GUESSER
Browser heading: GUESS THE CLUE
violet line changing on both surfaces
four answer cards already visible
```

Do not show setup, code, explanation, or the generated reference art.

- [ ] **Step 2: Run three blind reviews**

Use three context-isolated viewers; at least one should be a human unfamiliar
with the project when practical, and remaining seats may be fresh multimodal
LLM agents. Ask only:

```text
What is happening?
Who are the two participants?
What can the person on the right do?
What do you expect to happen after a correct choice?
```

Pass requires at least two of three independently identify a drawing/guessing
game, a painter and browser guesser, and a browser answer affecting the shared
result. “Drawing app,” “design tool,” or “one user on two screens” is a failure.

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
reviewers. Stop when the pass threshold is met; do not add onboarding screens.

- [ ] **Step 4: Add automated accessibility checks**

Install `@axe-core/playwright`. In Playwright verify:

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

`docs/evidence/layperson-read.md` records the clip hash, each anonymized answer,
pass/fail, revision made, second-round answers if needed, and final conclusion.
Do not rewrite responses to sound more favorable.

- [ ] **Step 6: Verify and commit clarity**

```bash
npm run check
npm --prefix web run test:e2e
sh tools/typecheck/check.sh
```

Run and capture the final real connected opening, then commit:

```bash
git add Assets/Wordless web docs/evidence/layperson-read.md docs/prompt-log.md
git diff --cached --check
git commit -m "polish: prove WORDLESS five-second clarity"
```

### Task 15: Harden the demo path and deploy the browser

**Files:**

- Modify: transport/store/app files only for reproduced failures
- Create: `docs/evidence/resilience.md`
- Create after host selection: `web/.env.production.example`
- Modify: `docs/prompt-log.md`

**Interfaces:**

- Consumes: Comprehensible polished product.
- Produces: Ten-round soak evidence, restart/reconnect behavior, secret-safe
  production web build, and an owner-authorized static URL.

- [ ] **Step 1: Run the adversarial message matrix**

Against the real connected Lens, send:

```text
wrong protocol version
wrong session and round
unknown message type
batch with 9 points
axis -1 and 1001
message over 1 KB
duplicate sequence and guess ID
browser-origin round.result
guess during READY, after CORRECT, and after timeout
```

Require literal rejection reason codes, no state mutation, no crash, and no
payload/body logging.

- [ ] **Step 2: Run ten consecutive rounds**

Automate or manually drive ten `applyRound` cycles with at least one wrong and
one correct guess per round. Require:

```text
10 starts / 10 correct outcomes / 10 glyph locks / 10 clean resets
no point count above 128
no message above 1 KB
no growing listener, timer, channel, SceneObject, or material count
no Logger error
```

- [ ] **Step 3: Observe one disconnect/reconnect**

Take the browser offline mid-stroke, restore it, and record actual status
transitions. The browser clears incomplete geometry, Lens shows disconnected,
and both wait for `applyRound` after readiness returns. Do not claim replay of
missed Broadcast messages.

- [ ] **Step 4: Build and audit the production web bundle**

```bash
npm --prefix web run build
rg -n '(service_role|password|access_token|refresh_token|gho_|sk-)' web/dist web/src . --glob '!docs/research/fable-connect-verdict-original.md'
du -sh web/dist
```

Expected: build succeeds, secret scan returns no match, and only the intended
public project URL/key are embedded through production environment values.
Document that the public channel/session code is a demo coordination mechanism,
not a security boundary.

- [ ] **Step 5: Obtain host authorization and deploy static output**

Use Vercel as the default static host only if the user's account is already
connected or the user authorizes the connection when this step begins. Deploy
`web/dist/`; never upload the repo, `.env.local`, reference images, captures,
or Lens credential asset. If host authorization is absent, stop this step and
retain the fully working local demo; do not choose another host silently.

- [ ] **Step 6: Re-run the real Lens against the hosted browser**

Join `WAVE42`, complete wrong→correct→glyph→replay, and record RTT/payload data.
Hosted behavior must meet Gate 0 thresholds and differ by no more than 30% from
local median/p95. A hosted regression blocks using the URL in submission copy;
the local captured proof remains honest.

- [ ] **Step 7: Record resilience and commit**

Write actual matrix results, ten-round counts, reconnect observation,
production build scan, deployment URL/authorization, and hosted metrics in
`docs/evidence/resilience.md`.

```bash
git add Assets/Wordless web docs/evidence/resilience.md docs/prompt-log.md
git diff --cached --check
git commit -m "test: harden WORDLESS relay demo"
```

### Task 16: Build the judged evidence package and release candidate

**Files:**

- Create: `docs/evidence/claim-ledger.md`
- Create: `docs/submission/project-description.md`
- Create: `docs/submission/video-edl.md`
- Create: `docs/submission/release-checklist.md`
- Modify: `README.md`, `docs/prompt-log.md`
- Create with in-toolchain primitives: README hero and video end-card assets
  under `docs/media/`
- Use but do not commit until owner chooses: final video export

**Interfaces:**

- Consumes: All validated product/evidence, final hosted/local path, CLAD
  history.
- Produces: Mute-readable under-60-second video, curated CLAD proof, honest
  description, public-repo readiness decision, and submission links.

- [ ] **Step 1: Map every public claim to evidence**

`docs/evidence/claim-ledger.md` has four columns:

```text
exact claim | scope | evidence path/log/test | allowed wording
```

Include: bidirectional Lens↔browser, one Preview painter, one browser guesser,
10/5 Hz measured cadence, exact-path glyph, wrong/correct authority, tested
viewport sizes, observed RTT, and Preview simulation. Explicitly ban: hardware
test, secure/private channel, arbitrary remote scale, persistence, recognition,
first-ever, production readiness, and unmeasured latency.

- [ ] **Step 2: Write the concise project description**

Use this order:

```text
1. one-sentence user/action/payoff
2. Connect theme fit: person + platform + live communication loop
3. why spatial: body-scale midair drawing
4. how browser participates causally
5. CLAD execution and verification
6. Preview and alpha limitations
```

The first paragraph must be understandable without the words Supabase,
protocol, spatial anchor, or state machine.

- [ ] **Step 3: Create the 59-second target EDL**

```text
00.0–05.0  in medias res split view: PAINTER / GUESSER / live line / four cards
05.0–11.0  browser taps ROPE; coral wrong state appears on both
11.0–19.0  line finishes; browser taps SNAKE; mint correct + word reveal
19.0–25.0  exact line locks into matching glyph medallions
25.0–32.0  replay through clean round reset
32.0–47.0  CLAD proof: Lens Studio scene, relevant prompt/log, live browser
47.0–54.0  measured validation: tests + RTT/payload + Preview disclosure
54.0–59.0  original WORDLESS RELAY end card and one-sentence promise
```

Do not spend the opening on joining, setup, title animation, or narration-only
explanation.

- [ ] **Step 4: Capture and inspect, never infer**

Record long clean takes from fresh restart. Capture both surfaces and the
browser-caused Lens state in the same take. Inspect frames at every cut for
modal dialogs, CLAD/test overlays, unreadable type, stalled Preview timing,
reference imagery, credentials, and unsupported states.

- [ ] **Step 5: Build original submission graphics**

Create the README hero and end card from the implemented web/Lens palette,
actual captured strokes, and programmatic type/geometry. Do not use the three
generated reference images or third-party logos. Preserve source scripts and
record the exact generation prompt/process.

- [ ] **Step 6: Verify the video technically**

Use `ffprobe`/`ffmpeg` to require:

```text
duration < 60.000 seconds
1920×1080 or higher landscape output
H.264 video + AAC audio if audio is present
faststart enabled
no clipped ending or silent accidental tail
all copy readable at normal laptop playback size
```

If narration is used, verify measured loudness/true peak and disclose its
source. A silent/caption-led cut is acceptable only if blind viewers understand
it.

- [ ] **Step 7: Run the final adversarial judge gate**

Give one fresh multimodal reviewer only the unedited candidate cut, project
description, README first screen, and claim ledger. Ask it to score theme fit,
five-second comprehension, magic moment timing, spatial necessity, browser
causality, visual finish, CLAD proof, and unsupported claims. Fix only observed
clarity/evidence defects; do not add features.

- [ ] **Step 8: Run the full release verification**

```bash
npm run check
sh tools/typecheck/check.sh
git diff --check
git status --short --branch
git log --oneline --decorate -12
```

Then run Lens compile, Preview logs, full connected round, hosted/local browser
check, secret scan, relative-link check, video probe, and claim-ledger review.
Every result and exact command enters `docs/submission/release-checklist.md`.

- [ ] **Step 9: Commit the private release candidate**

```bash
git add README.md docs Assets/Wordless web tools package.json package-lock.json
git diff --cached --check
git commit -m "docs: prepare WORDLESS submission candidate"
git push origin main
```

Keep the repository private. Public visibility, final video upload, and contest
submission are separate owner-authorized external actions.

## Execution order and review gates

```text
Task 1
  -> Tasks 2 and 3 may run in parallel after credentials/package inspection
  -> Task 4 Gate 0 (serial integration; failure stops everything)
  -> Task 5 protocol freeze (serial)
  -> Tasks 6, 7, and 8 may use separate file owners
  -> Task 9 starts after Task 8 freezes BrowserRelayClient
  -> Task 10 starts after Task 7; Task 11 waits for Tasks 6, 8, and 10
     (one Lens/scene writer; scene mutations remain serial)
  -> Task 12 Gate 1 (serial integration and feature freeze)
  -> Task 13 visual craft
  -> Task 14 five-second comprehension/accessibility
  -> Task 15 resilience/deployment
  -> Task 16 evidence/submission release candidate
```

Every task gets a fresh spec reviewer and quality reviewer. Gate 0, Gate 1, the
layperson read, and the final judge gate are never delegated solely to the task
implementer who produced the artifact.

## Completion definition

Implementation is complete only when:

1. Gate 0 and Gate 1 evidence are committed and reproducible.
2. One real browser choice visibly and causally changes Lens Preview.
3. The exact sampled path becomes the same session medallion on both surfaces.
4. Two of three blind viewers understand the two roles and guessing loop in
   five silent seconds.
5. All pure tests, browser tests/build, Lens typecheck, Lens compile, Preview
   runtime, malformed-message matrix, ten-round soak, and release checks pass
   fresh.
6. The video is under sixty seconds, opens with the interaction, shows CLAD,
   and states the Preview limitation.
7. Every public claim has an exact evidence row and no secret/reference-only
   material enters the release.
8. The private release-candidate commit is pushed and the owner explicitly
   authorizes any publication or submission action.
