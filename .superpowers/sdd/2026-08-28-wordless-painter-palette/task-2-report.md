# Task 2 — browser begin binding and authoritative stroke color

## Implementation

- Added `WebRoundSnapshot.strokeColorId` and a private `activeStrokeId`.
- A `stroke.begin` only binds during the current `ACTIVE` round, once, after a
  protocol-valid production color. Point batches now require that exact bound
  stroke ID and a non-null color.
- Reconnect invalidation, accepted reset, and accepted successor start clear
  both the public color and the private binding.
- Browser paint resolves only `violet`, `lemon`, or `mint` through fixed hex
  values. Coral is used only while an ACTIVE round has an authoritative wrong
  choice; glyph and its transition use the bound base color. Null color clears
  the path and hides an otherwise unsafe glyph fixture.
- Browser integration fixtures now emit `stroke.begin` before every ordinary
  point batch, preserving contiguous wire sequences. A new E2E scenario proves
  lemon live paint, coral incorrect override, and lemon solved glyph paint.

## TDD evidence

RED was observed before production edits with `npm run test:web`:

- 6 failures: points appended before begin, `strokeColorId` was absent/null
  incorrectly, lemon/mint rendered violet, mint lifecycle stayed violet, and a
  null-color path still painted.
- Result: 100 passing, 6 failing tests.

GREEN was then observed with `npm run test:web`: 3 files and 106 tests passed.

## Final verification

All commands were rerun after the final reset-binding test refinement:

- `npm run test:web` — 3 files, 106 tests passed.
- `npm run build:web` — TypeScript and Vite build passed.
- `npm --prefix web run test:e2e` — 38 tests passed across phone and desktop.
- `npm run test:core` — 298 tests passed.
- `git diff --check` — passed with no whitespace errors.

## Files changed and committed scope

Committed under `feat: render authoritative stroke colors on web`:

- `web/src/web-round-store.ts`
- `web/src/render.ts`
- `web/tests/web-round-store.test.ts`
- `web/tests/relay-client.test.ts`
- `web/tests/render.test.ts`
- `web/e2e/wordless.spec.ts`
- this report

`render.ts`, `render.test.ts`, and `wordless.spec.ts` contained verified
pre-task visual/accessibility work. Their overlapping combined behavior is
included; unrelated `web/index.html`, `web/src/styles.css`, package, docs,
Lens, scene, generated-package, captures, and prompt-log changes remain
unstaged.

## Self-review and concerns

The store never defaults a missing color to violet, never lets a later begin
recolor a projection, and rejects mismatched/pre-begin points. Renderer tests
cover all three production colors, coral's temporary lifecycle, glyph/transition
paint, and unsafe null-color fixtures. No functional concern remains. The only
scope note is the intentional combined commit of the already-verified Task 14
render/E2E work where the palette change overlaps it.
