# WORDLESS Relay — project contract

Read this file before acting in this repository. The approved design authority
is `docs/superpowers/specs/2026-08-24-wordless-relay-design.md`. Research is
indexed in `docs/research/README.md`; execution decisions and deviations belong
in `docs/prompt-log.md`.

## Product truth

- WORDLESS Relay connects **one Spectacles Lens Studio Preview client** and
  **one ordinary browser participant** for the minimum viable proof.
- The wearer draws a spatial path. The browser receives a normalized 2D view
  of that path and submits one of four guesses. The Lens client validates the
  guess and publishes the round result.
- The initial submission proof is simulated. Never call Lens Studio Preview
  footage hardware footage, a device test, or a real Spectacles capture.
- Do not claim remote play, production readiness, multi-player scale, durable
  persistence, security, or latency until each claim has direct evidence.
- Current Spectacles Connected Lenses are colocated. Never revive the rejected
  “two remote Spectacles through Sync Kit” design.

## First gate

The first implementation block is only the Lens-to-browser realtime spike in
the design specification. No game loop, gallery, animation polish, or large UI
system may be built before that spike passes and its recording and metrics are
committed.

## Architecture boundaries

- `WordlessEngine` is the pure owner of round transitions and answer
  validation. Views render state; they do not infer it.
- `RoundStore` is the single runtime source of truth. Network adapters emit
  typed events into it and serialize events out of it.
- The Lens keeps world-space stroke points locally. Only bounded,
  quantized normalized coordinates cross to the browser.
- The selected answer and correct index remain Lens-local until the Lens
  publishes a result. This is game concealment, not cryptographic privacy.
- The browser submits an answer choice; it never declares that an answer is
  correct.
- `applyRound` is the single reset/start door for every UI surface and test.
- Protocol messages are versioned, sequence-numbered, bounded, and validated
  before changing state.

## Scope discipline

- Minimum proof: one Preview client, one browser, one continuous stroke, four
  answer cards, correct/incorrect feedback, deterministic glyph medallion, and
  replay.
- A curated local word deck is sufficient. No camera, microphone, recognition,
  generative AI, or semantic classification belongs in the runtime.
- Multiple guessers, persistent galleries, accounts, matchmaking, voice chat,
  illustrated glyph generation, particles, occlusion, and rich spline effects
  are outside the first implementation plan.
- If a feature does not improve the five-second read or the Lens↔browser relay,
  cut it.

## Visual contract

- Production palette: ultraviolet violet, warm lemon, mint, coral, warm ivory,
  and deep plum.
- Lens Preview composites additively. Never depend on black cards, dark glass,
  shadows, or subtle transparency to establish contrast.
- Use bright ivory type and saturated emissive geometry in the Lens.
- The runtime glyph is the exact sampled drawing normalized into a medallion.
  Never imply that the system recognized or redrew a semantic object.
- Files under `docs/references/visuals/` are external AI-generated inspiration.
  Never import, trace, texture-map, composite, or ship them. Recreate the visual
  system from original primitives and record the work in the prompt log.
- No third-party logos or branded visual assets.

## Lens Studio discipline

- Once the Lens Studio project exists, author user resources only under
  `Assets/`. Never modify `Cache/`; do not commit generated `Support/`,
  `PluginsUserPreferences/`, or `Workspaces/` state.
- Use Lens Studio MCP tools for editor inspection and mutation. Never use
  `curl`, `fetch`, `wget`, raw HTTP, or direct REST calls against Lens Studio.
  If the Lens Studio MCP tools are unavailable, stop and report the failure.
- Lens runtime scripts use the Lens API. Editor automation uses the Editor API.
  Do not mix them.
- Work in the Spectacles template and verify the target platform before adding
  realtime packages.
- A clean compile is not runtime proof. Run Preview, collect logs, and verify
  the visible state change.

## Secrets and external services

- No credentials, tokens, project secrets, or `.env` files enter git.
- Commit a redacted `.env.example` only after the selected relay service and
  exact variable names are proven by the spike.
- Snap Cloud Realtime is the preferred adapter because Snap documents a
  Lens↔web cursor pattern. It remains an alpha access dependency until tested.
- A transport fallback requires an explicit design amendment; do not silently
  swap backends or weaken the product claim.

## Evidence and commits

- Record prompts, material decisions, failures, measurements, and deviations in
  `docs/prompt-log.md` as they happen.
- Commit only freshly verified states. Include the exact validation evidence in
  the log or commit body.
- Preserve the private-repository setting until the user explicitly authorizes
  publication for submission.
- Before any public-release change, audit history for secrets, local paths,
  unsupported claims, and reference-only material.
