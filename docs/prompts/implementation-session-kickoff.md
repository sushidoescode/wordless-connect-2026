# Prompt for the fresh WORDLESS implementation session

Use this only after the owner has reviewed Fable's memo and the repository plan
has been reconciled and re-approved.

```text
Work in:
/Users/sushantsrikrish/CLAD-Hackathon/CONNECT-2026

The owner has approved WORDLESS Relay, its written design, and the reconciled
implementation plan. Execute the plan; do not restart ideation or ask for a
fresh product choice.

Before any action, read completely:

1. AGENTS.md
2. docs/superpowers/specs/2026-08-24-wordless-relay-design.md
3. docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md
4. docs/research/README.md
5. docs/references/README.md
6. docs/prompt-log.md
7. README.md

Then inspect git status, branch, remote visibility, recent commits, local Lens
Studio version, whether a `.esproj` exists, and whether Lens Studio MCP points
to this exact project. Preserve all user changes and unrelated files.

Use `superpowers:subagent-driven-development` to execute the plan task by task,
with a fresh implementer plus specification and quality reviews for each task.
Use isolated worktrees only for file-disjoint pure/web lanes; never run two
writers against the Lens scene, project manifest, package state, canonical
protocol, or active Preview session. If subagents are unavailable, execute
inline with the same explicit review gates.

This is an LLM-native build. Do not pace it as a human sprint or pad it with
hour/day estimates. Parallelize genuinely independent work, keep commits small,
and use the resulting speed dividend for repeated visual polish, silent
five-second comprehension, accessibility, capture rehearsal, and adversarial
judge review. Speed never substitutes for fresh tests, runtime logs, visible
state, or capture evidence.

Hard execution rules:

- Follow the plan in order and mark its checkboxes only from current evidence.
- Task 1 is the first action. If the Specs Base Template project is not open in
  this directory or Lens Studio MCP is unavailable/wrong-project, stop and give
  the owner the single exact editor action required. Never hand-write the
  project manifest or bypass MCP through raw HTTP.
- Gate 0 is realtime-spike work only. No game engine, polished UI, gallery, or
  feature work may begin before genuine Lens↔browser traffic, measurements,
  malformed-message rejection, and restart reproduction pass and are
  committed.
- Use one SPECS/Lens Studio Preview painter and one ordinary browser guesser
  over Snap Cloud Realtime Broadcast. Never restore the rejected remote
  two-Spectacles/Sync Kit architecture.
- The browser submits choices; the Lens validates and publishes outcomes.
  Correct answer/index remain Lens-local until reveal.
- World points remain Lens-local. Only bounded integer normalized points cross
  the transport. The exact sampled path becomes the medallion; never redraw or
  recognize a semantic icon.
- `WordlessEngine` and `RoundStore` own state, views render snapshots, and
  `applyRound` is the only reset/start path.
- Use current installed package source and generated types as API authority.
  Snap Cloud is alpha; do not assume entitlement, auth, channel policy,
  reconnect, or latency before the spike proves it.
- Keep credentials and tokens out of git, logs, captures, and messages. Browser
  config may contain only the project URL and publishable/legacy anon key in an
  ignored local environment file. Never expose service-role or session tokens.
- Use Lens Studio MCP tools for editor state. No curl/fetch/wget/direct REST to
  Lens Studio. Author Lens resources under Assets and never edit Cache.
- The three images in docs/references/visuals are non-shipping inspiration.
  Recreate production visuals from original deterministic primitives.
- Preserve the repository as private until the owner separately authorizes
  publication.
- Append prompts, decisions, failures, deviations, commands, and evidence to
  docs/prompt-log.md before every verified commit.

Persistence and stop conditions:

- If Gate 0 passes every written criterion, commit its evidence and continue
  through the plan without waiting for routine reconfirmation.
- If Gate 0 fails, commit the honest failure record, stop all later tasks, and
  ask the owner to choose WORDLESS Duo or Split the Table. Do not substitute a
  backend, local mirror, prerecorded traffic, or fake browser causality.
- At Gate 1, require one continuous wrong→correct→glyph→applyRound capture and
  all tests/logs. If it fails, diagnose and repair within approved scope.
- After Gate 1 passes, freeze features. Complete the visual, comprehension,
  accessibility, resilience, and submission-evidence loops even if the core
  app was built quickly.
- Stop for user authority only when the plan explicitly requires a human
  editor/cloud/hosting/publication action or when a material design amendment
  is unavoidable. Otherwise continue autonomously to the private release
  candidate.

Keep the owner oriented with concise progress updates at task and gate
boundaries. Never claim completion from agent testimony: independently inspect
diffs and run the exact verification listed in the plan.

Begin with Task 1 now.
```
