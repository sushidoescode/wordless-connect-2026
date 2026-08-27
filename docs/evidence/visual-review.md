# Task 13 visual review

- Result: **PASS** — the polished slice keeps one exact sampled path legible in
  bright and medium simulated rooms, carries that path into the medallion over
  the required 450 ms, and preserves readable non-color feedback on Lens and
  browser.
- Observed date: 2026-08-27 PT
- Participants: one simulated Lens Studio Preview painter and one ordinary
  local Chrome guesser
- Relay: ordinary hosted Supabase Realtime
- Baseline commit: `3ad1afd`
- Reviewed source manifest: `cc891025b419f77748761de07b6152235e6154bc3ac4c98a27f244c28de9d51f`

This is simulated Lens Studio Preview evidence. It is not Spectacles hardware
footage, a device test, remote-play evidence, or evidence of production
readiness, persistence, security, latency at scale, or multiplayer scale.

## Frozen reviewed revision

The reviewed revision is the committed baseline `3ad1afd` plus the exact
Task 13 source/test changes. The manifest digest above is SHA-256 over the
lexicographically sorted `SHA-256  path` lines for these 17 files:

```text
Assets/Scene.scene
Assets/Wordless/Materials/Wordless HUD Coral.mat
Assets/Wordless/Scripts/Core/GlyphTransition.ts
Assets/Wordless/Scripts/Core/GlyphTransition.ts.meta
Assets/Wordless/Scripts/View/GlyphMedallionView.ts
Assets/Wordless/Scripts/View/LensHudView.ts
Assets/Wordless/Scripts/View/StrokeRibbonView.ts
Assets/Wordless/Scripts/WordlessApp.ts
tools/core-tests/glyph-transition.test.mjs
tools/core-tests/glyph-medallion-view.test.mjs
tools/core-tests/lens-hud-view.test.mjs
tools/core-tests/wordless-app.test.mjs
web/e2e/wordless.spec.ts
web/src/main.ts
web/src/render.ts
web/src/styles.css
web/tests/render.test.ts
```

Documentation and ignored captures are deliberately outside this source-only
digest, avoiding a circular evidence revision. The new Lens script has its
adjacent metadata. No `Cache/` resource is part of the change.

## Reference boundary

The three local files under `docs/references/visuals/` were inspected only as
external AI-generated inspiration:

| Reference | SHA-256 |
| --- | --- |
| `wordless-relay-chatgpt-north-star.png` | `52c630c92fdb88aad22b0d2c1b56d428438a4614c19f33b4f61d02ad6ae9ea5a` |
| `wordless-relay-gemini-ui-reference.jpeg` | `c177cecbf435424c96f1031c62e72d98c7c679b57455c07e175117af87b0df55` |
| `wordless-relay-gemini-alternate.jpeg` | `0c622989e1a0ac3a45d635baee7a6ba6cb638aef79ff712e998827831acd2ff1` |

No reference was imported, traced, texture-mapped, composited, or copied into
the Lens project or browser. The implementation uses original text, CSS, Lens
geometry, and the user's exact sampled path.

Borrowed at the concept level:

- immediate split-role language for painter and guesser;
- a large live violet stroke with a warm lemon endpoint;
- a plum/ivory/mint/coral hierarchy;
- four obvious answer choices in a stable 2×2 arrangement; and
- a causal motion from live drawing into a smaller solved medallion.

Explicitly rejected:

- a redrawn or recognized semantic snake icon;
- particles, sparkles, decorative illustration, or generated art;
- black Lens cards, dark glass, shadows, or transparency-dependent contrast;
- branded or third-party assets; and
- presentation that makes the medallion more prominent than the live stroke
  before the correct result.

## Side-by-side score

The score is against the approved visual contract and the five-second read,
not fidelity to the reference images.

| Axis | Score | Fresh evidence and remaining restraint |
| --- | ---: | --- |
| Hierarchy | 4/5 | `PAINTER`, `DRAW: SNAKE`, timer, result, and replay remain legible at the judged Preview scale. Connection text stays intentionally secondary. |
| Relay clarity | 4/5 | The simultaneous recording shows the same changing line on both surfaces and the same wrong/correct results. A first-time comprehension panel remains Task 14, so no layperson claim is made here. |
| Palette | 5/5 | Ultraviolet, lemon, mint, coral `#FF786A`, warm ivory, and deep plum remain distinct in bright and medium captures without a Lens backing card. |
| Answer readability | 5/5 | All four browser cards remain readable and stable at 390×844, 768×1024, and 1440×900; literal `×`/`TRY AGAIN` and `✓`/`CORRECT` supplement color. |
| Payoff | 4/5 | Both surfaces animate the ordered sampled path into a secondary medallion over 450 ms. The restrained primitive treatment intentionally omits semantic redraw and particles. |

## Exact-path payoff

`GlyphTransition` clamps finite progress, applies the fixed ease-out cubic,
returns exact cloned endpoints at progress 0 and 1, and rejects mismatched
path lengths. Lens maps the exact local `worldPoints` through the glyph
visual's full inverse world transform, retains the source plane depth, and
interpolates that depth into the authored medallion plane. Browser maps the
same ordered public projection between the live canvas and solved medallion.
Neither surface invents points or a semantic object.

The ordinary browser keeps stable keyed answer nodes across timer renders, so
focus and CSS animation objects survive unrelated updates. Its fixed motion is:

- wrong shake: 220 ms;
- correct settle: 180 ms;
- glyph transition: 450 ms; and
- connection fade: 160 ms.

Reduced-motion changes dynamically settle an in-flight glyph immediately and
remove translations/fades while preserving the same final state. A render
exception cannot strand the semantic `CORRECT` phase because the generation-
scoped completion is scheduled before the view call.

## Connected visual proof

All artifacts are local ignored evidence under `captures/task13/`; none is
committed.

The final bright-room take used two simultaneous window recordings. They begin
together, show the ordinary Chrome guesser and live Lens Studio Preview, and
were cropped into one review copy without changing their timing:

| Artifact | Properties | SHA-256 |
| --- | --- | --- |
| `task13-final-lens.mov` | H.264, 3592×2096, 10.016667 s, video only | `ae48145227c8a7bd7f8a29439e6fa040713f8e40c1a4c0370a304a9a895caa98` |
| `task13-final-browser.mov` | H.264, 1736×2096, 10.016667 s, video only | `17d66f3d1fe5568494ba92bd224fe50f9cc2e6532e8ecf3439232a5463d876a2` |
| `task13-final-combined.mp4` | synchronized crop, H.264, 1920×1080, 10.008333 s, video only | `f328f0e68b2c2703104ee66549cafda3cbef40f8b0773df2fcfd4dd5c5ddb6a2` |
| `task13-transition-contact-sheet.png` | five paired frames spanning raw/wrong path through final medallions | `9b40978e59ee1f4135de3d7ac8844a494f59a98efc48e1ca5ae5cce44a4dd4fc` |

The recorder began at epoch `1787825740636` ms. Stroke input began at
`1787825741915`, ended at `1787825743256`, the wrong card was selected at
`1787825743560`, the correct card at `1787825744510`, and browser lock was
observed at `1787825745590`. Browser projections show 22,354 painted pixels
while active, 22,972 after wrong feedback, zero live-canvas pixels during
`CORRECT`, and the visible solved medallion through `GLYPH_LOCKED`. The contact
sheet's paired frames at 3.9–4.5 s show both surfaces begin from their displayed
ordered path and converge on the same shaped medallion.

The fresh connected medium-room run supplies exact count and lighting proof.
Lens finished with `worldPoints=32 publicPoints=32`; Chrome exposed
`data-point-count=32` on its live transition at progress
`0.9148888888789548`; Lens then logged `GLYPH_LOCKED points=32
hash=64395400`. The same run shows the full live path, coral `× TRY AGAIN`, an
in-progress exact path inside the ivory medallion, and the mint locked result:

| Medium-room artifact | SHA-256 |
| --- | --- |
| `lens-medium-connected-active-v2.png` | `293b06ab0f43763f6247c93c5ded33dd21c307b75bc24388ce40c41ff9077d7c` |
| `lens-medium-connected-wrong-v2.png` | `d31a1e1746f73f2f82c286d00198d8105d6d87160bedadefd445c3c237fb52e7` |
| `lens-medium-connected-transition-v2.png` | `ebb8dff3eec6d9269c77a2b16cb57653547fe124160889ab5aeed4791ed0e547` |
| `lens-medium-connected-locked-v2.png` | `d29f9dca7f1e649a53c8ac2c20ae2ddcb1c55ab953848ab414b4c08de28a5333` |
| `task13-medium-contact-sheet.png` | `87a74871615f45e57c490690c3f8a35af2b28a03a1ee696173918a4c9e17c763` |

The first medium attempt expired before the answer beat and is rejected; it is
not used as payoff proof. Two still earlier attempts occurred without a bound
browser or during live Vite reloads and are likewise rejected.

## Verification and independent review

Fresh pre-commit verification established:

- 294/294 core/Lens tests;
- 98/98 browser unit tests;
- a 55-module production browser build;
- 30/30 Chromium Playwright tests;
- clean Lens typecheck and `git diff --check`;
- forced Lens TypeScript compilation succeeded; and
- fresh Sunlit Preview configured the ordinary hosted-Supabase client,
  subscribed, reached `READY -> ACTIVE`, and returned no error or warning.

The independent Lens reviewer found two important pre-final issues: fractional
progress endpoints were arithmetically near but not exactly identical, and the
transition ignored the authored source depth. Exact endpoint branches and full
inverse-transform/depth interpolation fixed both. The reviewer reran 62/62
focused tests, 294/294 full core tests, and Lens typecheck and found no blocker.

The independent browser review first exposed lifecycle regressions involving
node/animation replacement, delayed reduced-motion changes, resize mapping,
and a render exception interrupting glyph scheduling. Failing focused tests
reproduced each issue before the smallest repair. The reviewer then reran
18/18 focused render tests, 8/8 focused lifecycle E2E cases, 98/98 units, the
55-module build, and 30/30 E2E cases and found no remaining Critical or
Important issue. The remaining disclosed coverage gap is Safari-specific
media-query/animation behavior; automated browser evidence is Chromium only.

## Outcome

Task 13 is **PASS** for the reviewed source revision. The live stroke remains
the dominant visual, additive Lens readability survives both required rooms,
browser hierarchy is responsive, and the only solved glyph is the exact
sampled drawing. Task 14 still owns unfamiliar-human five-second comprehension
and formal accessibility evidence; this record does not pre-claim either.
