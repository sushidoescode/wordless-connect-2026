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
