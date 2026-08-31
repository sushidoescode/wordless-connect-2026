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
- Lens `RoundStore` is the authoritative Lens runtime source of truth. Network
  adapters parse and route sanitized typed events to the composition root;
  they never mutate either store. The root dispatches accepted commands into
  `WordlessEngine`, serializes its effects, and renders store snapshots. The
  browser owns a separate public projection in `WebRoundStore`.
- The Lens keeps world-space stroke points locally. Only bounded,
  quantized normalized coordinates cross to the browser.
- The selected answer and correct index remain Lens-local until the Lens
  publishes a result. This is game concealment, not cryptographic privacy.
- The browser submits an answer choice; it never declares that an answer is
  correct.
- Lens `applyRound` is the single authoritative round creation/reset door;
  only `setCounterpartReady` may release that already-applied round's one start
  after the presence/reset-ack gate. Browser
  transport recovery may invalidate/hide an incomplete display projection and
  mark it reconnecting; it cannot authorize or populate a round. Only an
  accepted Lens-authored `round.reset` may authorize/bind a successor round ID.
  A policy-approved Lens-authored `round.start` may populate and activate that
  reset-authorized ID, or establish the initial/new-painter-epoch round when no
  product round is bound. No UI or adapter invents a playable round.
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

- Painter palette (owner-approved 2026-08-30): eight fixed selectable colors —
  scarlet, orange, lemon, lime, cyan, cobalt, violet, magenta — defined
  canonically in `Assets/Wordless/Scripts/Core/Palette.ts`. Semantic colors
  stay outside the selectable set: coral (incorrect), mint (correct/connected),
  warm ivory (type/affordances), deep plum (browser surface).
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
- Commit the complete Lens-authored project dependency baseline under
  `Packages/` and every adjacent `.meta` for `Assets/`/`Packages/` primary
  files. Missing metadata breaks resource identity in a clone; Cache is never
  a substitute for package artifacts.
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
- Ordinary hosted Supabase Realtime is the approved adapter after the owner
  supplied evidence that Snap Cloud Alpha access is unavailable. Gate 0 must
  still prove the installed Lens client against that normal Supabase project.
- Any transport fallback beyond standard Supabase requires an explicit design
  amendment; do not silently swap backends or weaken the product claim.

## Evidence and commits

- Record prompts, material decisions, failures, measurements, and deviations in
  `docs/prompt-log.md` as they happen.
- Commit only freshly verified states. Include the exact validation evidence in
  the log or commit body.
- Preserve the private-repository setting until the user explicitly authorizes
  publication for submission.
- Before any public-release change, audit history for secrets, local paths,
  unsupported claims, and reference-only material.

<!-- BEGIN Lens Studio managed AGENTS block -->

<!-- Auto-generated by Lens Studio. Changes inside this block will be overwritten. Add custom content outside this block. -->

# Lens Studio Project Reference

This project uses Lens Studio. Scripts can be written in JavaScript (ES2021 compliant) or TypeScript.

## Get the Full Agent Toolkit (one-time setup)

This file gives you the minimum to be productive. For the full agent workflow, install the Lens Studio agent toolkit.

You can verify the toolkit is available by checking whether `lens-studio-router` exists in the project.

When you need multiple skills, invoke them in a single message — sequential loading adds minutes of dead time.


## Hard Rules

**Never use `curl`, `fetch`, `wget`, HTTP POST, or any direct HTTP/REST call to interact with Lens Studio.** Always use the Lens Studio MCP tools provided in your tool list — refer to them by bare name (e.g. the `ExecuteEditorCode` and `scene-graphql` tools). Your runtime exposes them under its own prefix: **Claude Code** as `mcp__lens-studio__<Tool>` (deferred — load the schema with `ToolSearch` before first use), **Codex** as `mcp__lens_studio.<Tool>`, **Cursor** under its own namespace (both surfaced directly). If an MCP tool fails or is genuinely unavailable, **stop and report the error to the user** — do not work around it with raw HTTP requests to the Lens Studio MCP server or any other endpoint. The MCP tools handle authentication, serialization, and error handling; bypassing them causes silent failures.

## Environment

- The global execution context is the `script` object in JavaScript, or `this` in TypeScript components.
- UI inputs are defined using comment-based decorators (`// @input`) in JavaScript, or `@input` decorators in TypeScript.
- Do not use `window` or `document` objects; this is a unique runtime, not a browser.
- All components must extend `BaseScriptComponent` in TypeScript.
- Lens Studio uses a **right-handed coordinate system**: +X is right, +Y is up, -Z is forward.
- World units are in **centimeters** (cm). Rotation uses **degrees in the Editor API** but **radians at runtime**.
- Always work with files inside the `Assets/` directory — this is where all project resources live.
- Never modify files in `Cache/` — it contains auto-generated data regenerated by Lens Studio. Reading `Cache/TypeScript/Src/Packages` is useful for package TypeScript source and type references.

## Project Structure

```text
ProjectName/
├── Project.esproj
│   Main project manifest. Update through Lens Studio tools; do not hand-edit unless explicitly asked.
├── Assets/
│   Primary workspace for scripts, prefabs, materials, textures, and other user-authored assets.
├── Cache/
│   Generated by Lens Studio. Do not modify. Read `Cache/TypeScript/Src/Packages` only when you need package source or type references.
├── Support/
│   Generated TypeScript definitions. Read these for Lens API and Editor API references; do not commit generated changes.
├── PluginsUserPreferences/
│   Local plugin settings. Ignore unless the user is debugging plugin configuration.
└── Workspaces/
    Local editor workspace state. Ignore.
```

## Script Execution

Lens Studio runs scripts by Scene Hierarchy order: scripts on SceneObjects higher in the hierarchy run before those lower down. Keep shared helpers such as managers near the top when other scripts depend on their initialization.

At Lens start, developer-subscribable script events run around internal engine phases in this order: `OnAwakeEvent`, `OnStartEvent`, `UpdateEvent`, physics update, animation update, then `LateUpdateEvent`. Subscribe scripts to `OnAwakeEvent`, `OnStartEvent`, `UpdateEvent`, or `LateUpdateEvent`; physics update and animation update are engine phases, not events to bind directly. `UpdateEvent` and `LateUpdateEvent` repeat each frame; use `LateUpdateEvent` for work that must run after normal updates, physics, and animation.

Runtime-created scripts, such as components added with `createComponent` or objects created with `ObjectPrefab.instantiate`, run their startup lifecycle inline at the point they are created. `OnEnableEvent` runs only when a SceneObject is enabled by hand or code, not during normal initialization; `OnDisableEvent` runs only when disabled, not when destroyed. `OnDestroyEvent` runs immediately after `destroy()` is called.

## Rendering Order

Lens Studio also uses Scene Hierarchy order for rendering: SceneObjects higher in the hierarchy render first, and lower siblings render later/on top. Use hierarchy order, Render Targets, or Screen Texture to build custom compositing flows; Lens Studio uses forward rendering only.

## Two Separate APIs

The **Lens API** (StudioLib.d.ts) and the **Editor API** (editor.d.ts) are completely separate APIs:

| | Lens API | Editor API |
|---|---|---|
| **Purpose** | Build AR experiences (Lens scripts) | Control the Lens Studio application |
| **Language** | TypeScript or JavaScript | TypeScript (via `ExecuteEditorCode`) |
| **Runtime** | Inside the Lens | Inside the editor |
| **Example** | `mat.mainPass.baseColor` | `PassInfo` property access |

Do not mix them — property names and access patterns differ. When a task needs to inspect or modify Lens Studio editor state, run Editor API code through `ExecuteEditorCode`/`RunEditorCode`; first verify each call against the `Support/editor.d.ts` type definitions.

## Spatial Awareness

When positioning objects relative to each other:
1. **Introspect first** — read positions and scales of existing objects before placing new ones.
2. **Calculate offsets** — account for object radii (scale/2) plus buffer to avoid overlap.
3. **Never default to (0,0,0)** — always calculate positions relative to existing objects.

The Preview Panel shows live runtime transforms; the Scene Panel shows authored editor transforms. Runtime script, tracking, interaction, or parent changes can move objects in Preview without updating Scene values, so distinguish runtime positions from scene positions when debugging placement.

## User Communication

- **Keep the user oriented.** Before long scripts or batches of tool calls, say what you're about to do, then add brief status updates between longer sequences so the session does not feel stuck.

## Build Discipline

Verify assumptions early — a quick prototype can save hours of debugging a plan built on wrong foundations. Build incrementally: confirm each layer renders before adding the next.

<!-- END Lens Studio managed AGENTS block -->
