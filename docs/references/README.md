# Visual references — provenance and non-use record

Three external AI-generated reference images were created by the project owner
on 2026-08-24 using the shared prompt in
`docs/prompts/visual-reference-prompt.md`. They were committed to this private
repository for design review and provenance only.

**Non-use decision (binding):** these files were never licensed runtime
assets. This project does not ship, import, trace, composite, texture-map, or
present them as working-product captures. Every production visual — Lens,
browser, hero, end card, and submission graphics — is recreated from original,
deterministic primitives.

**Current tree state:** the three binaries were removed from the working tree
for the release candidate on 2026-08-29 and no tracked file embeds them. They
remain reachable in earlier private history; a clean public lineage is a
separate pending owner decision, so public release stays blocked until the
owner resolves it. The provenance record below identifies the exact files by
hash without embedding them.

## Recorded provenance and hashes

### 1. North star — ChatGPT

- Former path: `visuals/wordless-relay-chatgpt-north-star.png`
- 1672×941 PNG
- SHA-256:
  `52c630c92fdb88aad22b0d2c1b56d428438a4614c19f33b4f61d02ad6ae9ea5a`
- Best one-glance relay story, selected-answer state, and explicit
  line-to-medallion payoff. The design borrowed the split composition, large
  answer targets, sparse labels, and causal transition grammar as ideas only.
- Rejected implications: volumetric sparkles, perfect free-space geometry, and
  the illustrated snake icon, which imply rendering and semantic
  transformation outside the deterministic scope.

### 2. UI and palette reference — Gemini

- Former path: `visuals/wordless-relay-gemini-ui-reference.jpeg`
- 2752×1536 JPEG
- SHA-256:
  `c177cecbf435424c96f1031c62e72d98c7c679b57455c07e175117af87b0df55`
- Best implementation-scale palette inventory, 2×2 answer hierarchy, lemon
  draw head, and compact glyph medallion — again as ideas only.
- Rejected implications: the room-dominating opaque tube, duplicated timers,
  browser chrome, and dark/soft Lens cards.

### 3. Alternate composition — Gemini

- Former path: `visuals/wordless-relay-gemini-alternate.jpeg`
- 1376×768 JPEG
- SHA-256:
  `0c622989e1a0ac3a45d635baee7a6ba6cb638aef79ff712e998827831acd2ff1`
- Useful only for its restrained solid stroke, compact prompt, and countdown.
- Rejected implications: the duplicate bottom timer, tiny web controls, and
  arbitrary final squiggle.

## Production visual contract

Lens Preview uses a short bounded painter-colored ribbon (violet, lemon, or
mint), one lemon drawing head, a single prompt, a single countdown, and a
literal connection indicator. The browser uses a deep-plum page, one large
live canvas, four ivory answer cards, mint correct state, and coral incorrect
state. On success, production freezes the exact sampled path and normalizes it
into a simple shared medallion; it does not generate an illustrated object.

Because Lens Preview composites additively, Lens-side contrast must come from
bright ivory type and saturated violet, lemon, mint, and coral geometry. Dark
plum panels and subtle shadows belong only to the browser.

The shipped original media derived from this contract — never from the
reference images — lives under `docs/media/` (hero and end card) with its
renderer at `tools/media/render-wordless-assets.mjs`.
