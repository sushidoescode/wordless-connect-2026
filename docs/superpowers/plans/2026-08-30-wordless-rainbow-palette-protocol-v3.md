# WORDLESS Rainbow Palette + Protocol v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-color painter palette with the owner-approved
eight-color rainbow set behind one canonical shared registry, bump the wire
protocol to v3 with strict rejection of every other version, and render all
eight colors faithfully on both clients without weakening round or answer
authority.

**Architecture:** A new pure `Palette.ts` core module owns the ordered
eight-color tuple, labels, and RGB data; `Protocol.ts` derives `StrokeColorId`
from it and re-exports the type so existing imports stay coherent. Every color
table on both clients (ribbon RGB, glyph materials, swatch bindings, browser
CSS map) derives from the registry with compiler-enforced exhaustiveness. The
Lens palette controller becomes data-driven over ordered arrays that fail
closed at startup on missing, duplicate, misordered, or incomplete bindings.

**Tech Stack:** Lens Studio 5.23.2, TypeScript in the Node-erasable subset for
shared core files, Spectacles Interaction Kit indirect `Interactable`, Lens
Studio MCP scene tools, Vite, Vitest, Node 22 built-in tests, Playwright
Chromium.

**Spec:** `docs/superpowers/specs/2026-08-30-wordless-rainbow-room-vercel-amendment.md`
(sections 2 and 3), amending
`docs/superpowers/specs/2026-08-24-wordless-relay-design.md`.

## Global Constraints

- The canonical ordered palette is exactly: `scarlet` RED `#FF3B5C` (255,59,92),
  `orange` ORANGE `#FF982B` (255,152,43), `lemon` YELLOW `#FFD65A` (255,214,90),
  `lime` GREEN `#A7F43A` (167,244,58), `cyan` CYAN `#2DE2E6` (45,226,230),
  `cobalt` BLUE `#3B82F6` (59,130,246), `violet` VIOLET `#8B5CF6` (139,92,246),
  `magenta` MAGENTA `#F04DD8` (240,77,216).
- Coral `#FF786A`, mint `#73E6AE`, ivory `#FFF6E8`, and plum `#200B2B` are
  semantic only. `mint` and `coral` as `stroke.begin` color IDs are invalid
  payloads. HUD/UI tones named `lemon`/`mint`/`coral` in `LensHudView` and the
  web CSS variables are a separate system and do not change.
- `PROTOCOL_VERSION` becomes `3`; v2 (and every other version) is rejected by
  `parseRelayMessage` returning null. No dual-version stack.
- `stroke.begin { strokeId, colorId }` and every bound are preserved:
  coordinates `0..1000`, 128 points, batches of 8, 1,024-byte ASCII messages,
  100 ms point cadence. The maximal-message re-proof uses a 7-character token.
- Violet stays the Lens default preference; the fresh-engine default stays
  violet; the browser never invents a color (null → paint nothing); the
  wrong-guess override recolors both paths coral then restores the base color;
  the lemon draw head stays lemon for all selections.
- Selection accepted only while phase `ACTIVE`, stroke `NOT_STARTED`, palette
  unlocked; first accepted begin locks all targets until the existing
  replay/reset policy unlocks.
- Scales stay 1 / 1.08 / 1.15; selection keeps the bright ivory ring
  (never color-only).
- Lens scene mutation via Lens Studio MCP only; new primary assets under
  `Assets/` travel with editor-generated `.meta` files; never touch `Cache/`.
- Core files stay in the Node-erasable TypeScript subset (no enums,
  namespaces, decorators, or parameter properties).
- The orchestrator is the sole `docs/prompt-log.md` writer; commits are
  per-task with allowlisted paths only.

---

### Task 1: Canonical palette registry and protocol v3

**Files:**
- Create: `Assets/Wordless/Scripts/Core/Palette.ts`
- Modify: `Assets/Wordless/Scripts/Core/Protocol.ts:1` (version),
  `:20` (type), `:59` (BaseMessage.v), `:178-180` (guard)
- Test: create `tools/core-tests/palette.test.mjs`; modify
  `tools/core-tests/protocol.test.mjs`

**Interfaces:**
- Produces: `PAINTER_COLOR_IDS: readonly ['scarlet','orange','lemon','lime','cyan','cobalt','violet','magenta']`,
  `type StrokeColorId = (typeof PAINTER_COLOR_IDS)[number]`,
  `interface PainterColorDefinition { colorId; label; hex; rgb255: readonly [n,n,n] }`,
  `PAINTER_COLOR_DEFINITIONS: Readonly<Record<StrokeColorId, PainterColorDefinition>>`,
  `isStrokeColorId(value: unknown): value is StrokeColorId`,
  `painterColorNormalizedRgb(colorId): readonly [number, number, number]`,
  `painterColorHex(colorId): string`, `painterColorLabel(colorId): string`.
  `Protocol.ts` re-exports `StrokeColorId`, `isStrokeColorId`, and
  `PAINTER_COLOR_IDS` so `../Core/Protocol` imports remain valid; wire version
  becomes `PROTOCOL_VERSION = 3 as const` with `readonly v: typeof PROTOCOL_VERSION`.

- [ ] **Step 1: Write failing registry tests** (`tools/core-tests/palette.test.mjs`):
  eight IDs in exact order; unique IDs, labels, hexes; every hex equals its
  rgb255; normalized RGB = rgb255/255; `isStrokeColorId` accepts all eight and
  rejects `mint`, `coral`, `ivory`, `plum`, `#FF3B5C`, `''`, 1, null.
- [ ] **Step 2: Run red** — `npm run test:core` fails with module-not-found for
  `@wordless/core/Palette`.
- [ ] **Step 3: Implement `Palette.ts`** with the canonical table verbatim from
  the Global Constraints and pure derivation helpers.
- [ ] **Step 4: Update `protocol.test.mjs`**: `PROTOCOL_VERSION === 3`; all
  fixtures `v: 3`; the accepted-token test lists all eight IDs and moves
  `mint` into the rejected set alongside coral/ivory/plum/hex/rgb/empty/1/null;
  add `v: 2` and `v: PROTOCOL_VERSION - 1` rejection assertions; rebuild the
  maximal-variant byte-cap fixtures with `colorId: 'magenta'` and re-assert
  `serializedAsciiBytes(candidate) <= 1024` for every variant.
- [ ] **Step 5: Bump `Protocol.ts`** — version 3, `v` typed from the constant,
  `StrokeColorId`/`isStrokeColorId` re-exported from `Palette.ts`.
- [ ] **Step 6: Migrate every remaining core-test wire fixture atomically**
  (`engine.test.mjs`, `wordless-app.test.mjs`, `lens-transport.test.mjs`,
  `linked-adapters.test.mjs`, `spike-cadence.test.mjs`,
  `transport-policy.test.mjs`, `stroke-ribbon-view.test.mjs`,
  `glyph-medallion-view.test.mjs`, `painter-palette-controller.test.mjs`,
  `recovery-coordinator.test.mjs` if enveloped): `v: 2` → `v: 3`; any `mint`
  stroke-color fixture becomes a rainbow member (`cyan` preferred); UI-tone
  `mint`/`lemon`/`coral` assertions in HUD tests stay untouched.
- [ ] **Step 7: Run green** — `npm run test:core` passes; then
  `rg -n "v: 2" Assets tools web` must exit 1 (checked semantics: 1 clean,
  0 finding, ≥2 audit failure).
- [ ] **Step 8: Commit** the core + core-test paths:
  `feat: eight-color canonical palette registry and protocol v3`.

### Task 2: Lens runtime consumes the registry

**Files:**
- Modify: `Assets/Wordless/Scripts/View/StrokeRibbonView.ts:14-29,152-165`,
  `Assets/Wordless/Scripts/View/GlyphMedallionView.ts:316-497`,
  `Assets/Wordless/Scripts/Input/PainterPaletteController.ts` (full rewrite of
  binding surface), `Assets/Wordless/Scripts/Core/WordlessEngine.ts` /
  `RoundStore.ts` (verify only — validation flows from Protocol)
- Test: modify `tools/core-tests/stroke-ribbon-view.test.mjs`,
  `glyph-medallion-view.test.mjs`, `painter-palette-controller.test.mjs`,
  `engine.test.mjs`, `wordless-app.test.mjs`

**Interfaces:**
- Consumes: `painterColorNormalizedRgb`, `PAINTER_COLOR_IDS`,
  `painterColorLabel` from Task 1.
- Produces: `StrokeRibbonView.setStrokeColor` handling all eight IDs with the
  coral override intact; `GlyphMedallionView` with
  `@input glyphMaterials: Material[]` ordered by `PAINTER_COLOR_IDS`
  (fail-closed: exactly 8, non-null, unique, each `material.name` containing
  its color ID case-insensitively; error mentions "eight ordered glyph
  materials"); `PainterPaletteController` with ordered array inputs
  `swatchRoots/swatchRings/swatchColliders/swatchInteractables: …[]`
  (fail-closed: exactly 8 each, non-null, no duplicate objects; error
  mentions "eight ordered swatch bindings") and hover state derived from
  `PAINTER_COLOR_IDS`.

- [ ] **Step 1: Write failing view tests**: ribbon renders each of the eight
  normalized RGB tuples from the registry (table-driven from
  `PAINTER_COLOR_DEFINITIONS`, not copied literals) with outer alpha 0.28 /
  core 1.0 and coral override `[1, 120/255, 106/255]`; glyph view selects the
  Nth material for the Nth color ID, fails closed on 7 materials, a duplicate,
  and a name/order mismatch; palette controller: eight swatches subscribe
  (24 unsubscribes), gate rejects `mint`/`coral`, scales 1/1.08/1.15,
  lock disables all eight colliders+interactables, fail-closed binding errors.
- [ ] **Step 2: Run red** — each suite fails on the old three-color surface.
- [ ] **Step 3: Implement** the three components data-driven; preserve the
  `interactablesStarted` asymmetry, `TargetingMode.Indirect` at OnStart, the
  positional outer/core alpha order, and material-switch-not-mutate for the
  glyph. `WordlessEngine`/`RoundStore` need no code change (guard flows from
  Protocol); confirm default `violet` tests still pass.
- [ ] **Step 4: Run green** — `npm run test:core` passes with updated diag
  expectations (glyph `MEDALLION_RESOURCE_COUNTS.materials` stays 2 — the
  authored materials are inputs, not owned clones; HUD counts untouched here).
- [ ] **Step 5: Commit**:
  `feat: data-driven eight-swatch lens palette, ribbon and glyph mappings`.

### Task 3: Browser client renders eight colors

**Files:**
- Modify: `web/src/render.ts:9-43`, `web/src/web-round-store.ts` (verify
  only), `web/tests/render.test.ts`, `web/tests/web-round-store.test.ts`,
  `web/tests/relay-client.test.ts`, `web/e2e/wordless.spec.ts`

**Interfaces:**
- Consumes: `PAINTER_COLOR_DEFINITIONS`, `painterColorHex` via
  `@wordless/core/Palette`.
- Produces: `STROKE_COLORS` derived from the registry
  (`Object.fromEntries` is avoided — build the `Record` by mapping
  `PAINTER_COLOR_IDS` so the type stays `Readonly<Record<StrokeColorId, string>>`
  with compiler exhaustiveness); null stroke color still paints nothing.

- [ ] **Step 1: Update unit tests red**: render.test.ts `it.each` grows to the
  eight `[token, hex]` rows from the amendment table; `mint` fixtures move to
  rainbow members; the malformed-token case keeps `coral` and adds `mint`;
  coral override still `#FF786A` restoring the base hex; the
  one-point-glyph pixel assertion keys on the violet definition. All wire
  envelopes in web tests move to `v: 3` (web-round-store `begin()` builds
  through the real parser and fails closed otherwise).
- [ ] **Step 2: Implement** `render.ts` deriving `STROKE_COLORS` from the
  registry; no other behavior change.
- [ ] **Step 3: Run green** — `npm run test:web` passes.
- [ ] **Step 4: Update e2e**: seam `message()`/`emitStroke` envelopes to
  `v: 3`; pixel assertions for a new-color stroke (e.g. cyan
  `[45,226,230]`) plus the existing lemon/coral beats; result colors
  unchanged (mint/coral are UI tones).
- [ ] **Step 5: Run** `npm --prefix web run test:e2e` — 40+ tests green at
  both viewports.
- [ ] **Step 6: Commit**: `feat: browser renders the eight-color registry`.

### Task 4: Lens scene — eight-swatch 2×4 palette via MCP

**Files:**
- Modify (via Lens Studio MCP only): `Assets/Scene.scene` (+ existing
  `.meta`); create `Assets/Wordless/Materials/Wordless Painter <Label>.mat`
  ×8 with editor-generated `.meta` files.
- No hand edits to any `.scene`/`.meta`.

**Interfaces:**
- Consumes: component input surfaces from Task 2.
- Produces: an eight-swatch `Painter Palette` hierarchy bound to the new
  ordered array inputs; eight authored additive-safe unlit materials named
  `Wordless Painter Scarlet/Orange/Lemon/Lime/Cyan/Cobalt/Violet/Magenta`
  with `baseColor` set to the exact normalized RGB; eight glyph-material
  bindings on `GlyphMedallionView.glyphMaterials` in canonical order.

- [ ] **Step 1: Measure** current HUD/prompt/timer/brush/glyph bounds and the
  palette anchor through MCP (`GetBoundingBox`, VirtualScene read) before
  layout; record numbers in the prompt log.
- [ ] **Step 2: Author** the 2×4 grid (top: scarlet/orange/lemon/lime;
  bottom: cyan/cobalt/violet/magenta) anchored at the current palette
  location, each swatch cloning the existing structure (fill 4×4 halo 5.2
  radius-6 sphere collider + SIK indirect Interactable), pitch chosen so
  clear space ≥ 15% of one target width, no overlap with HUD elements per
  the measured bounds; bind all arrays in canonical order.
- [ ] **Step 3: Author** the eight materials, assign fills and glyph inputs;
  save; verify `.meta` files exist for every new asset.
- [ ] **Step 4: Compile + run**: `RecompileTypeScriptTool` then
  `RunAndCollectLogsTool` (refresh) — no errors; capture the Preview panel
  and verify all eight swatches legible additively, ivory ring on violet
  (default), 2×4 layout clear of prompt/timer/brush/glyph.
- [ ] **Step 5: Interact** (preview gestures): select each swatch, verify
  scale/ring; verify lock after stroke begin.
- [ ] **Step 6: Run** `sh tools/typecheck/check.sh` (needs fresh editor
  compile) — exit 0.
- [ ] **Step 7: Commit** scene + materials + metas:
  `feat: eight-swatch 2x4 painter palette scene and materials`.

### Task 5: Integrated verification

- [ ] **Step 1:** `npm run check` (core + web + build), `npm --prefix web run
  test:e2e`, `sh tools/typecheck/check.sh`, markdown links suite, `git diff
  --check` — all green; record exact counts in the prompt log.
- [ ] **Step 2:** Lens Preview runtime pass: full round in Preview with a
  non-default color (draw, wrong guess coral both paths, correct guess mint +
  reveal + exact glyph in the selected color, replay retains the selection);
  diagnostic line shows no material/timer/listener growth across three
  replays.
- [ ] **Step 3:** Commit any residual doc reconciliation:
  `docs: rainbow palette local verification evidence`.
