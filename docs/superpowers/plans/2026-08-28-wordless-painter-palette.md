# WORDLESS Painter Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a painter-only violet/lemon/mint palette whose Lens-authoritative
selection is frozen into protocol v2 at `stroke.begin`, rendered faithfully on
both clients, and preserved across in-process replay without weakening round or
answer authority.

**Architecture:** `WordlessEngine` owns the selected color and palette lock in
`RoundStore`; a Lens input adapter emits typed color intents and only renders
snapshots. Protocol v2 carries the chosen enum exactly once on `stroke.begin`,
after which `WebRoundStore` binds it to the active stroke and rejects points
that arrive without that binding. Lens and browser render the stored base color
with coral as a temporary authoritative wrong-answer override.

**Tech Stack:** Lens Studio 5.23.2.26081320, TypeScript in the Node-erasable
subset for shared core files, Spectacles Interaction Kit indirect
`Interactable`, Lens Studio MCP scene tools, Vite, Vitest, Node 22 built-in
tests, and Playwright Chromium.

**Spec:** `docs/superpowers/specs/2026-08-24-wordless-relay-design.md`,
especially the owner-approved 2026-08-28 painter-palette amendment in section
15.

## Global Constraints

- The minimum proof remains one Lens Studio Preview painter and one ordinary
  browser guesser. Preview evidence is simulation, never hardware footage or a
  device test.
- Palette colors are exactly `violet`, `lemon`, and `mint`, mapped to
  `#8B5CF6`, `#FFD65A`, and `#73E6AE`. Coral `#FF786A` is feedback only and
  cannot be selected or sent as a stroke color.
- Violet is the Lens-local default. A browser with no accepted begin/color
  remains unbound; it must never invent violet as a recovery fallback.
- Selection is accepted only while the authoritative phase is `ACTIVE` and
  the stroke is `NOT_STARTED`. The first accepted begin locks the color for the
  round; late or malformed selection cannot mutate state.
- The sole public color binding is protocol v2
  `stroke.begin.payload = { strokeId, colorId }`. Points, end, result, reset,
  and start do not duplicate color.
- In-process replay retains the Lens engine's preferred color. A fresh engine
  starts violet. No file, account, network, browser storage, or other durable
  persistence is added.
- The Lens remains the sole answer validator. The browser continues to submit a
  choice and never declares correctness.
- `WordlessEngine` and Lens `RoundStore` remain authoritative. Input and view
  classes never mutate either store, and adapters only parse/route typed data.
- Lens world-space points stay local. Only existing bounded, quantized
  normalized coordinates cross the relay.
- Core files remain executable unchanged in Node tests, Vite, and Lens Studio:
  no decorators, enums, namespaces, parameter properties, or Lens runtime
  globals under `Assets/Wordless/Scripts/Core/`.
- Palette visuals use original primitives and the existing additive-safe
  Wordless materials. Do not import, trace, texture-map, composite, or ship any
  file under `docs/references/visuals/`.
- Lens scene inspection and mutation use Lens Studio MCP only. Never use raw
  HTTP, `curl`, `fetch`, or `wget` against Lens Studio, and never modify
  `Cache/`.
- Every committed new Lens primary asset travels with its editor-generated
  adjacent `.meta`. Generated `Support/`, `PluginsUserPreferences/`, and
  `Workspaces/` state stays uncommitted.
- Preserve the current dirty Task 14 work. Stage only the paths named by the
  active task; never stage `.env*`, `local-handoff/`, `captures/`,
  `.virtual-scene.json`, or `Packages/AiPreviewAgentInspect.lspkg*`.
- Competitive-winner/judge research and the Fable handoff remain ignored under
  `local-handoff/` and do not enter `docs/prompt-log.md` or any commit.
- A palette implementation invalidates the current v7 comprehension row. Do
  not claim Task 14 PASS until a new connected capture, fresh automated checks,
  and the required human-inclusive panel are complete.

---

### Task 1: Freeze protocol v2 and authoritative color state

**Files:**

- Modify: `Assets/Wordless/Scripts/Core/Protocol.ts`
- Modify: `Assets/Wordless/Scripts/Core/RoundStore.ts`
- Modify: `Assets/Wordless/Scripts/Core/WordlessEngine.ts`
- Modify: `Assets/Wordless/Scripts/WordlessApp.ts` (effect-to-draft mapper only)
- Modify: `tools/core-tests/protocol.test.mjs`
- Modify: `tools/core-tests/engine.test.mjs`
- Modify: `tools/core-tests/wordless-app.test.mjs`
- Modify fixture envelopes/begins in:
  `tools/core-tests/lens-transport.test.mjs`,
  `tools/core-tests/linked-adapters.test.mjs`,
  `tools/core-tests/spike-cadence.test.mjs`,
  `tools/core-tests/transport-policy.test.mjs`,
  `web/tests/relay-client.test.ts`,
  `web/tests/web-round-store.test.ts`, and
  `web/e2e/wordless.spec.ts`

**Interfaces:**

- Produces: `export type StrokeColorId = 'violet' | 'lemon' | 'mint'`.
- Produces: `export function isStrokeColorId(value: unknown): value is StrokeColorId`.
- Produces: protocol literal `PROTOCOL_VERSION = 2` and
  `BaseMessage.v: 2`.
- Produces: `stroke.begin` payload
  `{ readonly strokeId: string; readonly colorId: StrokeColorId }`.
- Produces: `LensRoundState.strokeColorId: StrokeColorId` and
  `LensRoundState.paletteInputLocked: boolean`.
- Produces: `WordlessEngine.selectStrokeColor(colorId: StrokeColorId): boolean`.
- Produces: begin effect
  `{ type: 'publish-stroke-begin'; strokeId: string; colorId: StrokeColorId }`.
- Consumed later by: Lens palette/view composition and browser projection.

- [ ] **Step 1: Add failing protocol tests for the exact v2 boundary**

Add assertions equivalent to the following in
`tools/core-tests/protocol.test.mjs`, using the suite's existing `message()`
helper and valid base fields:

```js
assert.equal(PROTOCOL_VERSION, 2)
for (const colorId of ['violet', 'lemon', 'mint']) {
  const parsed = parseRelayMessage(message({
    v: 2,
    type: 'stroke.begin',
    payload: { strokeId: 'stroke-1', colorId },
  }))
  assert.equal(parsed?.type, 'stroke.begin')
  assert.equal(parsed?.payload.colorId, colorId)
}
for (const colorId of [undefined, 'coral', 'ivory', 'plum', '#8B5CF6',
  'rgb(139,92,246)', '', 1, null]) {
  assert.equal(parseRelayMessage(message({
    v: 2,
    type: 'stroke.begin',
    payload: colorId === undefined
      ? { strokeId: 'stroke-1' }
      : { strokeId: 'stroke-1', colorId },
  })), null)
}
assert.equal(parseRelayMessage(message({
  v: 1,
  type: 'stroke.begin',
  payload: { strokeId: 'stroke-1', colorId: 'violet' },
})), null)
```

Keep the maximal-message table and replace its begin entry with a valid v2
color. Reassert that every accepted message serializes to at most
`MAX_MESSAGE_BYTES` ASCII bytes.

- [ ] **Step 2: Add failing engine/store tests for selection, lock, and replay**

In `tools/core-tests/engine.test.mjs`, extend every manual `LensRoundState`
fixture with `strokeColorId: 'violet'` and `paletteInputLocked: false`, then add
one test covering this exact sequence:

```js
engine.applyRound('round-1', card, 0, 20_000)
assert.equal(engine.selectStrokeColor('lemon'), false) // READY
engine.setCounterpartReady(true, 10)
assert.equal(engine.selectStrokeColor('lemon'), true)
assert.equal(store.getSnapshot().strokeColorId, 'lemon')
assert.equal(store.getSnapshot().paletteInputLocked, false)
const begin = engine.beginStroke('stroke-1', 20)
assert.deepEqual(begin.at(-1), {
  type: 'publish-stroke-begin',
  strokeId: 'stroke-1',
  colorId: 'lemon',
  roundId: 'round-1',
  generation: engine.getRoundGeneration(),
})
assert.equal(store.getSnapshot().paletteInputLocked, true)
assert.equal(engine.selectStrokeColor('mint'), false)
assert.equal(store.getSnapshot().strokeColorId, 'lemon')
```

End the first round through the suite's existing correct/replay path, call
`applyRound` on the same engine, and assert the successor snapshot is lemon and
unlocked. Construct a new engine/store and assert a newly applied round is
violet. Call `selectStrokeColor('coral')` through an unsafe cast/test boundary
and assert `false` plus an unchanged snapshot.

- [ ] **Step 3: Run the new tests and confirm the red state**

Run:

```bash
node --experimental-strip-types \
  --import ./tools/core-tests/register.mjs \
  --test \
  --test-name-pattern='protocol|color|palette' \
  tools/core-tests/protocol.test.mjs \
  tools/core-tests/engine.test.mjs \
  tools/core-tests/wordless-app.test.mjs
```

Expected: FAIL because v1 is current, `selectStrokeColor` does not exist, and
the begin effect has no `colorId`.

- [ ] **Step 4: Implement the strict protocol and authoritative engine state**

In `Protocol.ts`, export the union and validator, change both version literals
to `2`, split the current combined begin/end parser cases, and sanitize begin
exactly as follows:

```ts
export type StrokeColorId = 'violet' | 'lemon' | 'mint'

export function isStrokeColorId(value: unknown): value is StrokeColorId {
  return value === 'violet' || value === 'lemon' || value === 'mint'
}

case 'stroke.begin': {
  if (!isBoundedId(payload.strokeId, MAX_STROKE_ID_LENGTH) ||
      !isStrokeColorId(payload.colorId)) return null
  return withBase(input, 'stroke.begin', {
    strokeId: payload.strokeId,
    colorId: payload.colorId,
  })
}
case 'stroke.end': {
  if (!isBoundedId(payload.strokeId, MAX_STROKE_ID_LENGTH)) return null
  return withBase(input, 'stroke.end', { strokeId: payload.strokeId })
}
```

In `RoundStore.ts`, import `StrokeColorId`, freeze the two new fields, and give
the disconnected initial state `strokeColorId: 'violet'` and
`paletteInputLocked: true`.

In `WordlessEngine.ts`, add `private preferredStrokeColorId: StrokeColorId =
'violet'`. `applyRound` copies it to `strokeColorId` and sets
`paletteInputLocked: false`. Add:

```ts
selectStrokeColor(colorId: StrokeColorId): boolean {
  if (!isStrokeColorId(colorId)) return false
  const snapshot = this.store.getSnapshot()
  if (snapshot.phase !== 'ACTIVE' || this.strokeState !== 'NOT_STARTED' ||
      snapshot.paletteInputLocked) return false
  this.preferredStrokeColorId = colorId
  this.store.replace({ ...snapshot, strokeColorId: colorId })
  return true
}
```

At an accepted `beginStroke`, replace the snapshot with
`paletteInputLocked: true` before emitting the begin effect, and copy
`snapshot.strokeColorId` into that effect. Disconnect must make the current
snapshot locked without clearing `preferredStrokeColorId`; the next
`applyRound` is the only route that exposes an unlocked selection again.

In `mapEngineEffectToDraft`, serialize the effect's `colorId` directly:

```ts
payload: { strokeId: effect.strokeId, colorId: effect.colorId }
```

- [ ] **Step 5: Migrate every wire fixture atomically**

For every file listed under Task 1 fixtures, change literal envelopes from
`v: 1` to `v: 2` (or the already imported `PROTOCOL_VERSION`). Add
`colorId: 'violet'` to every manually authored `stroke.begin`; do not add color
to any other message. Extend the mapper assertion in
`tools/core-tests/wordless-app.test.mjs` to require the selected begin color.

Run and require this search to produce no runtime/test v1 fixture:

```bash
rg -n "v: 1" Assets tools web
```

Expected: no matches.

- [ ] **Step 6: Verify Task 1 and commit only its paths**

Run:

```bash
npm run test:core
npm run test:web
npm run build:web
sh tools/typecheck/check.sh
```

Expected: all pass; the core count is at least the prior 296 and includes the
new protocol/engine assertions. Inspect `git diff --check` and the staged path
list, then commit only the Task 1 files. The pre-existing coral feedback in
`WordlessApp.ts` and its test is intentionally preserved and receives fresh
regression coverage in this commit.

```bash
git commit -m "feat: bind painter color in protocol v2"
```

---

### Task 2: Enforce begin-before-points and render color in the browser

**Files:**

- Modify: `web/src/web-round-store.ts`
- Modify: `web/src/render.ts`
- Modify: `web/tests/web-round-store.test.ts`
- Modify: `web/tests/relay-client.test.ts`
- Modify: `web/tests/render.test.ts`
- Modify: `web/e2e/wordless.spec.ts`

**Interfaces:**

- Consumes: Task 1 `StrokeColorId`, `isStrokeColorId`, and protocol-v2 begin.
- Produces: `WebRoundSnapshot.strokeColorId: StrokeColorId | null`.
- Produces: private single-stroke binding `activeStrokeId: string | null`.
- Produces: renderer mapping limited to the three fixed production hex values.
- Guarantees: public points cannot enter the projection before a valid,
  current-round begin binds both stroke ID and color.

- [ ] **Step 1: Add failing public-store tests**

Add a `begin(roundId, colorId, sequence)` helper that returns a valid parsed v2
message. In `web/tests/web-round-store.test.ts`, prove all of these in one
focused group:

```ts
store.dispatch(start('round-1'))
store.dispatch(points('round-1', 'stroke-1', [[100, 200]]))
expect(store.getSnapshot().points).toEqual([])
expect(store.getSnapshot().strokeColorId).toBeNull()

store.dispatch(begin('round-1', 'mint', 3))
expect(store.getSnapshot().strokeColorId).toBe('mint')
store.dispatch(points('round-1', 'other-stroke', [[100, 200]]))
expect(store.getSnapshot().points).toEqual([])
store.dispatch(points('round-1', 'stroke-1', [[100, 200]]))
expect(store.getSnapshot().points).toEqual([[100, 200]])

store.dispatch(begin('round-1', 'lemon', 6))
expect(store.getSnapshot().strokeColorId).toBe('mint')
```

Also assert that reconnect invalidation, accepted reset, and accepted successor
start each clear `strokeColorId` and the active stroke binding. Dispatch a
malformed message through an unsafe test boundary and assert a deep-equal
snapshot with no mutation.

- [ ] **Step 2: Add failing renderer tests for the base/override lifecycle**

In `web/tests/render.test.ts`, parameterize live path rendering across:

```ts
[
  ['violet', '#8B5CF6'],
  ['lemon', '#FFD65A'],
  ['mint', '#73E6AE'],
]
```

For mint, render ACTIVE with points and no wrong choice, then ACTIVE with a
wrong choice, then CORRECT/GLYPH_LOCKED. Assert the observed canvas paint order
is mint, coral, mint; assert glyph and the 450 ms transition are mint. Render
an ACTIVE snapshot with points but `strokeColorId: null` through an unsafe
fixture and assert no path is painted rather than violet fallback.

- [ ] **Step 3: Run the browser tests and confirm the red state**

Run:

```bash
npm run test:web
```

Expected: FAIL because the snapshot has no color, points currently append
without begin, and renderer paint is hard-coded violet.

- [ ] **Step 4: Implement immutable public stroke binding**

Import `StrokeColorId` and `isStrokeColorId`. Initialize snapshot color to
`null`; add `private activeStrokeId: string | null = null`. Dispatch
`stroke.begin` to this method:

```ts
private acceptStrokeBegin(
  message: Extract<RelayMessage, { type: 'stroke.begin' }>,
): void {
  if (this.snapshot.phase !== 'ACTIVE' ||
      message.roundId !== this.snapshot.roundId ||
      this.activeStrokeId !== null ||
      this.snapshot.strokeColorId !== null ||
      !isStrokeColorId(message.payload.colorId)) return
  this.activeStrokeId = message.payload.strokeId
  this.replace({ ...this.snapshot, strokeColorId: message.payload.colorId })
}
```

Require points to match `activeStrokeId` and require non-null color. Clear the
private binding and public color during initial construction, reconnect
invalidation, reset, and start. Do not accept `stroke.end` as a new binding and
do not permit a second begin to recolor the active projection.

- [ ] **Step 5: Resolve browser paint from the selected enum**

Use one fixed resolver and no CSS/wire passthrough:

```ts
const STROKE_COLORS: Readonly<Record<StrokeColorId, string>> = {
  violet: '#8B5CF6',
  lemon: '#FFD65A',
  mint: '#73E6AE',
}

function baseStrokeColor(snapshot: WebRoundSnapshot): string | null {
  return snapshot.strokeColorId === null
    ? null
    : STROKE_COLORS[snapshot.strokeColorId]
}
```

The live effective paint is coral only when
`snapshot.phase === 'ACTIVE' && snapshot.wrongChoices.length > 0`; otherwise
it is the bound base color. Pass the same base color into the existing correct
transition and glyph draw. If color is null, clear/hide the path and do not
paint.

- [ ] **Step 6: Update unit/E2E flows to send begin before points**

Update every web store, relay, and Playwright flow that sends points so it first
sends one valid current-round begin using the same stroke ID. Add one
Playwright scenario that begins lemon, observes the lemon live stroke, receives
an authoritative incorrect result and observes coral, then receives correct
and observes lemon in the payoff. Keep answer authority unchanged.

- [ ] **Step 7: Verify Task 2 and commit only browser paths**

Run:

```bash
npm run test:web
npm run build:web
npm --prefix web run test:e2e
npm run test:core
git diff --check
```

Expected: every suite passes, including points-before-begin rejection and the
three-color renderer matrix.

```bash
git commit -m "feat: render authoritative stroke colors on web"
```

---

### Task 3: Add the Lens palette input and color-aware payoff views

**Files:**

- Create: `Assets/Wordless/Scripts/Input/PainterPaletteController.ts`
- Create after Lens import: `Assets/Wordless/Scripts/Input/PainterPaletteController.ts.meta`
- Modify: `Assets/Wordless/Scripts/WordlessApp.ts`
- Modify: `Assets/Wordless/Scripts/View/StrokeRibbonView.ts`
- Modify: `Assets/Wordless/Scripts/View/GlyphMedallionView.ts`
- Create: `tools/core-tests/painter-palette-controller.test.mjs`
- Modify: `tools/core-tests/wordless-app.test.mjs`
- Modify: `tools/core-tests/stroke-ribbon-view.test.mjs`
- Modify: `tools/core-tests/glyph-medallion-view.test.mjs`

**Interfaces:**

- Consumes: Task 1 `StrokeColorId`, engine selection, and snapshot lock.
- Produces: `PaletteSelectionListener.onPaletteColorSelected(colorId): void`.
- Produces: palette port
  `setListener(listener | null)` and
  `render(colorId: StrokeColorId, inputLocked: boolean): void`.
- Produces: ribbon
  `setStrokeColor(colorId: StrokeColorId): void` plus the existing incorrect
  and payoff methods.
- Produces: glyph
  `render(sourcePoints, glyphPoints, revealedWord, colorId): void`.
- Guarantees: the input adapter emits intent only; the composition root calls
  the engine and every visible state comes back from a frozen store snapshot.

- [ ] **Step 1: Write the failing palette-gate and composition tests**

Create `painter-palette-controller.test.mjs` using the same Lens-global stubs
and source loader pattern as `replay-controller.test.mjs`. Test a pure exported
`PainterPaletteGate` with this contract. `request` emits a typed intent but
does not change the selected visual; only the next authoritative `render`
changes it:

```js
const gate = new PainterPaletteGate()
gate.render('violet', false)
assert.equal(gate.request('lemon'), 'lemon')
assert.equal(gate.getSelectedColorId(), 'violet')
gate.render('lemon', true)
assert.equal(gate.request('mint'), null)
assert.equal(gate.getSelectedColorId(), 'lemon')
assert.equal(gate.isInputLocked(), true)
```

Assert selected root scale `1.15`, unselected scale `1`, selected ivory ring
enabled, other rings disabled, and all three interactables/colliders disabled
after lock while the selected visual remains.

Extend `wordless-app.test.mjs` with a fake palette. Emit lemon while READY and
assert no state change; emit lemon after ACTIVE and assert snapshot/render
lemon; start the stroke and assert palette becomes locked before the begin
draft is sent. Destroy the controller and assert the palette listener is
cleared.

- [ ] **Step 2: Write failing ribbon and glyph material tests**

In `stroke-ribbon-view.test.mjs`, select each color and assert cloned outer/core
material RGB values match the production palette with the existing alpha
values. Select mint, enable incorrect feedback, and disable it; assert
mint → coral → mint with no material recreation.

In `glyph-medallion-view.test.mjs`, provide distinct fake violet/lemon/mint
materials, call `render` for each color, and assert `glyphVisual.mainMaterial`
matches exactly. Assert no shared material's base color is mutated.

- [ ] **Step 3: Run focused Lens tests and confirm the red state**

Run:

```bash
npm run test:core
```

Expected: FAIL because the palette classes and color-aware view methods do not
exist and incorrect feedback always restores violet.

- [ ] **Step 4: Implement the pure gate and Lens interaction adapter**

`PainterPaletteGate` stores one selected `StrokeColorId` and one locked flag.
Its exact public API is
`render(colorId: StrokeColorId, inputLocked: boolean): void`,
`request(colorId: StrokeColorId): StrokeColorId | null`,
`getSelectedColorId(): StrokeColorId`, and `isInputLocked(): boolean`.
`render` accepts only a valid enum and updates those fields; `request` returns
the requested enum only while unlocked and never updates the selected field.
The component has explicit inputs—no
arrays—for `violetRoot`, `lemonRoot`, `mintRoot`, three ivory ring objects,
three colliders, and three `Interactable` components. On start it subscribes to
each `onTriggerStart`, `onHoverEnter`, and `onHoverExit`, sets indirect
targeting, and applies the last rendered state. On destroy it unsubscribes and
clears the listener.

Use exact visual scales:

```ts
const NORMAL_SCALE = 1
const HOVER_SCALE = 1.08
const SELECTED_SCALE = 1.15
```

Selected takes precedence over hover. Hover growth is accepted only while
unlocked; after lock, all three interactables/colliders are disabled and the
selected root remains `1.15` with its ivory ring enabled.

- [ ] **Step 5: Route palette intent through `WordlessAppController`**

Add the palette port to `WordlessAppDependencies`; make the controller
implement `PaletteSelectionListener`; register it beside brush/replay. The
handler is exactly authoritative routing:

```ts
onPaletteColorSelected(colorId: StrokeColorId): void {
  if (!this.engine.selectStrokeColor(colorId)) return
  this.renderSnapshot(this.store.getSnapshot())
}
```

Every snapshot render calls
`palette.render(snapshot.strokeColorId, snapshot.paletteInputLocked ||
snapshot.phase !== 'ACTIVE')`. Before rendering geometry, call
`ribbon.setStrokeColor(snapshot.strokeColorId)`, then apply the temporary
incorrect flag. Pass the same snapshot color to glyph render. Add the
`@input palette: PainterPaletteController` binding and update `assertBindings`.

- [ ] **Step 6: Make ribbon/glyph rendering color-aware**

In `StrokeRibbonView`, store a base `StrokeColorId` and centralize material
updates in `applyEffectiveColor()`. Its RGB lookup is fixed to the three
production values. `setStrokeColor` changes the base and reapplies; incorrect
feedback changes only the override flag and reapplies. Payoff visibility does
not alter color.

In `GlyphMedallionView`, add `lemonGlyphMaterial` and `mintGlyphMaterial`
inputs. Choose the exact existing material by enum at the start of `render`,
before transition geometry is shown. Keep the frame ivory and never recolor a
shared material.

- [ ] **Step 7: Compile through Lens Studio and capture generated metadata**

Use Lens Studio MCP to refresh/compile after the new script exists. Inspect the
compiler result and Console; a clean TypeScript compile is required. Confirm
Lens Studio generated
`Assets/Wordless/Scripts/Input/PainterPaletteController.ts.meta`; do not
hand-author a UUID. If MCP is unavailable or fails, stop this task and report
the actual failure rather than using a direct server call.

- [ ] **Step 8: Verify Task 3 and commit only its files**

Run:

```bash
npm run test:core
sh tools/typecheck/check.sh
npm run check
git diff --check
```

Then use Lens Studio MCP compile/Console checks again. Inspect the staged names
and require the new script/meta pair together.

```bash
git commit -m "feat: add authoritative Lens painter palette"
```

---

### Task 4: Author and wire the additive-safe Lens palette scene

**Files:**

- Modify through Lens Studio MCP only: `Assets/Scene.scene`
- Modify through Lens Studio import if changed: `Assets/Scene.scene.meta`
- No new mesh or material asset: reuse
  `Wordless Brush Head Sphere.mesh`, `Wordless Ribbon Core.mat`,
  `Wordless Brush Lemon.mat`, `Wordless HUD Mint.mat`, and
  `Wordless HUD Ivory.mat`.

**Interfaces:**

- Consumes: Task 3 `PainterPaletteController` component and explicit inputs.
- Produces: one editor-authored `Painter Palette` hierarchy under
  `DrawingAnchor`, and a component reference in `WordlessApp.palette`.
- Guarantees: three fixed, indirect swatches; an ivory selected halo and
  1.15× selected scale; disabled input but persistent selection after lock.

- [ ] **Step 1: Re-read the current scene and verify placement bounds**

Use Lens Studio MCP `VirtualScene` read immediately before mutation. Confirm
these current authored anchors have not moved: prompt `(-20,49,3)`, phase
`(-72,34,3)`, timer `(69,49,3)`, glyph medallion `(55,4,4)`, and brush start
`(-60,0,0)`, all relative to `DrawingAnchor`. Inspect their visual bounds.

The approved placement is palette root `(33,34,4)` with swatch roots at local
X `-13`, `0`, and `13` in violet/lemon/mint order. Each swatch's maximum halo
radius is 6 cm, so this leaves at least 5 cm between palette bounds and the
prompt/timer bounds at their Y separation. If the re-read proves that exact
clearance false because an earlier approved edit moved a bound, move only the
palette downward to Y `31`; record that deterministic ruling in the SDD ledger
before applying it.

- [ ] **Step 2: Create the hierarchy in one declarative MCP apply**

Create `Painter Palette` under `DrawingAnchor`. For each color create a swatch
root, a color fill child using `Wordless Brush Head Sphere.mesh`, and a slightly
larger ivory halo child using the same mesh behind the fill. Use fill scale
`[4,4,1]`, halo scale `[5.2,5.2,0.8]`, fill local Z `0.4`, and halo local Z `0`.
Set shadow mode none and use the existing additive-safe materials. Add a sphere
collider of radius 6 and the package `Interactable.ts` ScriptComponent to each
swatch root with indirect targeting (`targetingMode = 2`), no instant drag, and
interaction-plane ignore enabled.

Add the compiled `PainterPaletteController` component to the palette root and
wire every explicit root/ring/collider/interactable input using `@sceneObject:`
and `@component:` references copied from the MCP snapshot. Do not use an array
input and do not guess component IDs.

- [ ] **Step 3: Wire the root composition component**

In a second MCP apply after the script inputs are visible, wire
`WordlessApp.palette` to the `PainterPaletteController` ScriptComponent.
Re-read `.virtual-scene.json` and assert all required inputs have non-null
references and the swatches are in violet/lemon/mint order.

- [ ] **Step 4: Prove authored and runtime behavior in Preview**

Refresh/resume Preview through Lens Studio MCP. Query the live scene for
`Painter Palette` and its descendants; require three enabled visual roots and
exactly three interactables before stroke begin. Use Preview interaction tools
to select lemon, then query/runtime-observe the lemon root at 1.15 scale with
only its ivory halo enabled. Begin the round's stroke through the existing
brush interaction; require all palette interactables/colliders disabled while
the lemon scale/halo persists and the emitted begin diagnostic/public payload
uses `colorId=lemon`. Do not label this a hardware test.

- [ ] **Step 5: Verify scene integrity and commit**

Run:

```bash
npm run check
sh tools/typecheck/check.sh
npm run test:core
npm run test:web
npm run build:web
git diff --check
```

Use Lens Studio MCP for a final compile, Console scan, and Preview screenshot.
Inspect the staged list; commit `Assets/Scene.scene` and its metadata only if
metadata actually changed, together with any Task 3 source adjustment demanded
by live proof. Never stage `.virtual-scene.json` or the temporary inspect
package.

```bash
git commit -m "feat: wire painter palette in Lens scene"
```

---

### Task 5: Prove the integrated color relay and refresh Task 14 evidence

**Files:**

- Modify: `docs/evidence/polish-ledger.md`
- Modify: `docs/prompt-log.md` (implementation/evidence decisions only)
- Modify if needed for assertions: `web/e2e/wordless.spec.ts`
- Use but do not commit: `captures/task14/`
- Never modify or stage: `local-handoff/`

**Interfaces:**

- Consumes: Tasks 1–4 complete protocol, Lens, browser, and scene behavior.
- Produces: fresh automated totals, one connected selected-color proof, a new
  exact five-second clip/hash, and an explicitly pending or passing Task 14 row.
- Does not produce: a hardware, remote-play, production-readiness, latency, or
  human-comprehension claim without direct evidence.

- [ ] **Step 1: Run the complete automated matrix from a clean process state**

Run, without reusing prior counts:

```bash
npm run test:core
npm run test:web
npm run build:web
npm --prefix web run test:e2e
npm run check
sh tools/typecheck/check.sh
git diff --check
```

Record exact fresh pass counts. Use Lens Studio MCP for compile, Console, and
Preview checks; distinguish any editor/network warning from product runtime
errors and preserve its exact text if it remains.

- [ ] **Step 2: Run one genuine connected lemon round**

Wake/check the approved ordinary Supabase project using only existing local
configuration without printing its URL/key. Connect one Lens Studio Preview
painter and one ordinary browser. Select lemon before drawing, draw one
continuous stroke, submit one wrong choice and then the correct choice, and
replay once.

Record direct evidence that:

1. the accepted `stroke.begin` is v2 and has the same stroke ID/color on both
   sides;
2. Lens world-point count equals browser public-point count;
3. both live paths are lemon before guessing;
4. the authoritative wrong result makes both exact paths coral;
5. correct clears the override and both payoff glyphs are lemon;
6. replay begins with lemon selected and unlocked; and
7. a late mint intent from the prior round cannot recolor the completed stroke.

Do not expose credentials or call this remote Spectacles play.

- [ ] **Step 3: Cut and inspect a fresh five-second comprehension clip**

Create a new versioned file under ignored `captures/task14/` from the connected
run. It must be exactly 5.000 seconds, 1920×1080, 60 fps, H.264/yuv420p, and
silent. Preserve the first-five-second story: one side draws, the other chooses
among four answers, and both paths visibly react to the authoritative result.
The palette may be visible but must not delay or replace that story beat.

Verify with `ffprobe`, a clean full decode, a frame count of 300, and SHA-256.
Inspect representative frames before stroke, during lemon drawing, immediately
after the wrong guess, and during the bilateral coral hold.

- [ ] **Step 4: Run fresh blind comprehension review**

Give reviewers only the silent clip, not the product name, prompt, docs, prior
answers, or research. Ask exactly:

```text
What do you think is happening, and what do you think each side is doing?
```

Apply the existing Task 14 rubric. Agent reviewers may supplement but cannot
replace the required unfamiliar-human participant. If no qualifying human
response is available, mark the row `PENDING — HUMAN-INCLUSIVE PANEL` and do
not claim Task 14 PASS.

- [ ] **Step 5: Update evidence without leaking offline research**

Append implementation prompts/material decisions, exact validation totals,
Preview limitations, connected counts, clip metadata/hash, and reviewer results
to `docs/prompt-log.md` and `docs/evidence/polish-ledger.md`. State that v7 was
superseded by the palette source change. Do not add competitive-winner, judge,
or Fable research.

- [ ] **Step 6: Verify documentation scope and commit the proven state**

Run:

```bash
git status --short
git diff --check
git diff --cached --name-only
git check-ignore -v .env local-handoff captures/task14
```

Require that no secret, `.env`, capture, reference visual, local handoff, local
absolute path, or temporary inspect package is staged. Commit only the freshly
verified evidence and any final assertion-only E2E change:

```bash
git commit -m "test: prove authoritative painter color relay"
```
