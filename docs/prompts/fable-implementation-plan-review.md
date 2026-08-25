# Prompt for Fable 5 — adversarial implementation-plan review

Paste the text below into a fresh Fable 5 chat with filesystem and web access.

```text
You are the independent adversarial reviewer for WORDLESS Relay, the private
Week-3 Connect project for the 2026 CLAD Summer Hackathon.

Work read-only in the implementation repository:
/Users/sushantsrikrish/CLAD-Hackathon/CONNECT-2026

Write only your final review memo to:
/Users/sushantsrikrish/CLAD-Hackathon/Connect-2026-prep/fable-implementation-plan-review.md

Do not edit, commit, stage, push, install packages, create cloud resources,
open Lens Studio, or mutate either repository. Do not modify GUIDE-2026; it is
the already-submitted Week-2 entry.

Read these files completely before forming a verdict:

1. AGENTS.md
2. docs/superpowers/specs/2026-08-24-wordless-relay-design.md
3. docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md
4. docs/research/README.md
5. docs/research/competitive-audit-2026-08-24.md
6. docs/references/README.md
7. docs/prompt-log.md
8. README.md

Inspect git status and recent commits, but do not change them.

The owner has approved this locked product decision:

- WORDLESS Relay uses one SPECS/Lens Studio Preview painter and one ordinary
  browser guesser.
- The painter drags a lemon brush through a body-scale midair drawing plane;
  the Lens renders a violet path locally and sends bounded normalized points.
- The browser watches the real path and submits one of four choices.
- The Lens alone validates the guess and publishes wrong/correct result.
- Correct freezes the exact sampled path and deterministically normalizes it
  into a shared session medallion; there is no semantic recognition or
  generated icon.
- Preferred transport is Snap Cloud Realtime Broadcast, with a hard first
  spike. If access, Preview auth, genuine two-way traffic, measured latency, or
  restart reproduction fails, work stops and the owner chooses a previously
  reviewed fallback.
- Do not revive the superseded “two remote Spectacles through Sync Kit” design.
- The three generated images are private design references only and never ship.

Important environment correction to scrutinize:

- The official hackathon page currently requires Lens Studio 5.22+ and a SPECS
  project.
- This machine has Lens Studio 5.23.1 and the prior project used Specs Base
  Template with targetPlatform: Spectacles.
- This machine has Node 22.14: TypeScript stripping requires
  `--experimental-strip-types`, and `node:module` exposes asynchronous
  `register` but not the newer `registerHooks`. Verify the documented loader
  and every direct Node invocation against that exact runtime.
- Some public Snap Cloud examples and documentation still mention Lens Studio
  5.15 / Spectacles (2024), while current sample branches target 5.22+.
- The plan therefore treats installed Asset Library packages and generated
  types as authoritative and gates all version-specific lines in Task 1.

Independently verify every temporally unstable or technical claim against
current primary sources only: official Lenslist terms/page, Snap/SPECS docs,
official Snap repositories, installed package/type source if read-only access
is available, Supabase primary documentation, Vite, Node, Vitest, and
Playwright primary docs. Do not use blogs or model summaries as authority.

Review the plan adversarially on all of these axes:

1. Does it implement the approved design without silent redesign or scope
   creep?
2. Are Snap Cloud entitlement, Lens Preview authentication, public-browser
   Broadcast, heartbeat, channel lifecycle, send/subscribe/cleanup calls,
   limits, and version assumptions correct and honestly gated?
3. Is the one canonical protocol actually consumable unchanged by Node 22,
   Vite, and Lens Studio? Find TypeScript syntax, loader, flag, typecheck, or
   module-resolution mistakes, including accidental dependence on a sibling
   week's generated declarations.
4. Are task dependencies, file ownership, parallel seams, serialization
   points, and commit order internally consistent?
5. Can every test compile when its task runs, or does it depend on a later
   file/type/function?
6. Does the engine maintain the Lens-local answer, Lens-authoritative outcome,
   immutable RoundStore, and applyRound-only reset under wrong, correct,
   timeout, duplicate, stale, reconnect, and replay paths?
7. Do batching, byte caps, sequence checks, point caps, and exact-path glyph
   rules have sufficient deterministic tests and runtime proof?
8. Is the spatial brush/ribbon plan plausible in the installed SPECS/Preview
   environment, additive-safe, controllable by the simulated interaction
   tools, and genuinely spatial rather than a flat panel?
9. Is the browser a causal participant rather than a dashboard, accessible at
   phone width, and safe from color-only or tiny-state communication?
10. Is Gate 0 strict enough to prevent mocked/replayed traffic from passing?
    Are its project latency thresholds reasonable and clearly not platform
    claims?
11. Does the LLM-native workflow exploit agent speed through safe parallelism,
    short proof loops, and independent reviews without creating shared-file or
    Lens-scene races?
12. Does it reserve enough implementation capacity for visual craft,
    five-second layperson comprehension, accessibility, capture rehearsal, and
    judge-facing evidence rather than treating polish as optional?
13. Is the plan overbuilt anywhere? Identify tasks/features/tests that add
    explanation cost or schedule risk without helping the judged surface.
14. Does the 59-second evidence story reveal user, action, causal browser role,
    magic moment, and CLAD execution early enough for a skimming judge?
15. Find every wording or implementation path that could overclaim novelty,
    remote scale, privacy/security, latency, persistence, device testing,
    recognition, or production readiness.
16. Reassess the pivot rule. A failed Snap Cloud spike must not silently become
    a local browser mirror, unofficial backend, or fake network choreography.

Act as a skeptical senior XR/network engineer, test architect, interaction
designer, and hackathon judge. Do not reward documentation volume by itself.
Prefer the smallest change that materially improves correctness, clarity, or
winning odds. Do not rewrite the entire plan unless its architecture is
fatally unsound.

Your memo must contain:

1. Verdict: APPROVE, APPROVE WITH REQUIRED CHANGES, or REJECT.
2. Executive explanation in no more than 250 words.
3. Blocking findings, each with severity, exact plan line/section, evidence,
   impact, and smallest correction.
4. Non-blocking improvements ranked by expected judging value.
5. Verified API/version fact table with direct primary-source URLs and access
   dates.
6. Dependency/type/file-ownership audit, including any task that cannot run in
   the documented order.
7. Gate 0 and Gate 1 false-positive/false-negative audit.
8. LLM execution audit: which tasks can genuinely run in parallel and which
   need one writer.
9. Polish/comprehension audit against the three reference-image lessons and
   Organize winner signals.
10. Scope cuts: anything that should be removed now.
11. Exact patch instructions for every required change; quote the current plan
    wording and replacement wording where practical.
12. A final GO/NO-GO recommendation for beginning Task 1 after reconciliation.

Be explicit about uncertainty. A documentation claim is not runtime proof; an
old sample is not a current package contract; a successful compile is not a
working Preview; and model agreement is not independent evidence.
```
