# WORDLESS environment record

Observed 2026-08-26 in the active `WordlessRelay.esproj` project. The normal
Supabase owner gate and post-entry persistence checks are complete. Task 4's
active-key rerun and exact post-rejection Run B correction passed the required
bidirectional, rejection, RTT, visual-continuity, restart, and cadence
criteria. Gate 0 is GO and unblocked; Task 5 is next.

## Editor and target

- Lens Studio version: `5.23.2.26081320` from macOS application metadata
- Active MCP project: `WordlessRelay.esproj` at the repository root
- Template: Specs Base Template baseline
- Target platform: Spectacles
- Preview mode: Interactive, device `SPECS 27`, Front camera, Plane source
- Node executable/version: `/usr/local/bin/node`, `v22.14.0`
- npm executable/version: `/usr/local/bin/npm`, `10.9.2`
- Git branch: `main`
- Remote visibility: `PRIVATE`

## Installed packages

- SupabaseClient: `2.1.0`
- Bundled Supabase JavaScript client: `2.81.0`
- Import path: `SupabaseClient.lspkg/supabase-snapcloud` (vendor-authored
  historical path only)
- SupabaseModule: built-in `LensStudio:SupabaseModule`, required directly by
  the installed package; no manual `globalThis` assignment observed
- Client constructor: accepts project URL, client-safe key, optional options
- Realtime lifecycle: channel `subscribe`/`send`/`unsubscribe`, client
  `removeChannel`/`removeAllChannels`
- Spectacles Interaction Kit: installed package `2.0.0`; baseline Preview
  runtime print `SIK Version : 0.18.0`
- Spectacles UIKit: `2.0.0`
- Project-local package/meta pairs: 3/3 present
- Primary non-local Asset/package files checked for adjacent metadata: 7
- Missing adjacent metadata: 0

## Supabase Realtime gate

- Historical Alpha denial: owner screenshot recorded; not treated as a pass
- Native SupabaseProject authoring/move/save: PASS
- Native asset ID: `6ba48142-cc1e-49ef-8d22-84f2e2859a8e`
- Native asset path: `Assets/LocalOnly/WORDLESS Supabase Project.supabaseProject`
- Native editor fields confirmed by name only: `projectId`, `projectName`,
  `projectUrl`, `publicToken`
- Runtime mapping: editor `projectUrl` -> runtime `url`; `publicToken` remains
  `publicToken`
- Ignored asset/meta status: PASS; the asset and its adjacent meta are ignored;
  the `Assets/LocalOnly.meta` path is ignored but has not materialized
- Normal hosted project: Free organization `Wordless Relay`, Free project
  `wordless-relay`; created through the owner's authenticated Supabase dashboard
- Database password handling: dashboard-generated value was never read, copied,
  printed, logged, or committed
- Realtime service setting: `Enable Realtime service` enabled
- Public Broadcast setting: `Allow public access to channels` enabled; the
  dashboard's `Save changes` control was disabled after inspection, confirming
  no unsaved setting change remained
- Client key type: publishable (`sb_publishable_...` shape); no secret,
  `service_role`, database, or session credential was selected or transferred
- Active client key label: `wordless_runtime`. It replaced and revoked
  `wordless_gate0` after that client-safe value appeared in a deleted local
  preflight capture/private tool transcript; the dashboard's secret-key row
  was untouched. A short post-rotation smoke proved both clients could join,
  then the full Gate 0 matrix passed under this active key: three fresh
  maintained-10-Hz windows, correct/wrong Lens authority, 11/11 invalid
  rejections with contiguous recovery, 50/50 application acknowledgments,
  direct Preview visual sampling, and restart reproduction
- Credential entry/persistence: all four native identity/configuration fields
  are populated after `Project.save()` and a full Lens Studio restart; checks
  returned only booleans and shape validity, never values
- Manual-authoring compatibility finding: `projectUrl` was normalized back to
  empty while the native asset's `projectId` and `projectName` were blank. The
  complete native tuple (`projectId`, `projectName`, `projectUrl`,
  `publicToken`) persisted immediately and survived restart
- Supabase Free limits observed in current official docs: 200 concurrent
  connections, 100 messages/s, 100 channel joins/s, 256 KB Broadcast payload
- Free-project inactivity behavior: may pause after low activity over a 7-day
  period; dashboard action is `Resume project`
- Repository/index/history credential-shaped match-file counts after rotation:
  0/0/0. The old publishable key and project URL did appear once in a private
  tool transcript; no secret credential and no git exposure occurred
- Optional GitHub-integration prompt: closed before any repository selection,
  installation, or authorization; no Supabase GitHub integration was added
- Prior localhost MCP bearer exposure: present only in a private tool
  transcript from initial setup; the owner fully quit Lens Studio before any
  Supabase value was entered, and Codex rebound to the newly launched editor
  process before reopening the owner credential gate
- Post-restart MCP identity check: exact root `WordlessRelay.esproj`,
  `Spectacles` target, and exactly one path-only matching local asset; PASS

## Gate 0 retained measurements and decision

- Fresh Run A: Lens point ordinals 1–101 contiguous over 10,021 ms; browser
  sequences 1–101 contiguous over 10,019 ms source time and 10,017.6 ms
  arrival time; no gap or terminal state
- Retained full-matrix Run B cumulative window: prospectively armed
  ordinals/sequences 1,855–1,955 contiguous; Lens span 10,017 ms, browser
  source/arrival spans 10,016/10,009.5 ms; same-epoch `F=66`, `B=67`;
  prospectively armed under the stricter previously passing `B=46`; no gap or
  terminal state. This remains disclosed as cumulative continuity evidence,
  but does not bear the exact-window proof because its `F` came from that
  epoch's earlier ten-second measurement
- Exact post-rejection Run B correction: prospectively armed with predeclared
  `B=46` without pausing the runtime; Lens ordinals and browser sequences
  958–1,058 were contiguous; exact-window `F=48` came from per-point interval
  telemetry on ordinals 959–1,058, giving exact `B=49`; Lens and browser source
  spans were both 10,000 ms and browser arrival span was 10,001.5 ms; no
  diagnostic, sequence gap, terminal state, warning, or disconnect occurred
- Fresh restart: ordinals/sequences 1–101 contiguous; Lens span 10,015 ms,
  browser source/arrival spans 10,012/10,012.1 ms; no gap or terminal state
- Earlier full-matrix epoch maximum consecutive Preview update gaps: 45, 66,
  and 48 ms, each below the 100 ms cadence period; the retained Run B value
  came from that epoch's first ten seconds, not its later post-rejection
  window, so it remains historical context rather than exact-window proof
- Guess authority: actual coral `TRY AGAIN` for choice 1 and actual mint
  `CORRECT` for choice 2, each after Lens `RX_GUESS`
- Invalid matrix: exactly 11 Lens `REJECTED` logs, followed by valid contiguous
  sequence 2 acceptance
- Fifty-ping application RTT: median 86 ms, p95 106 ms, maximum 111 ms;
  50/50 correlated acknowledgments, 122-byte largest valid message
- Preview visual continuity: four sets of 22 distinct direct MCP frames, each
  spanning more than ten seconds with 545 ms worst completion gap; continuous
  browser recordings fully enclose every set
- One WebSocket close 1006 occurred only in a prolonged rejected attempt after
  5,317 messages; it did not repeat in fresh Run A, Run B, or restart and is
  retained in the evidence ledger
- Final pre-commit verification retained a failed rapid-reset/initial-join
  attempt, independently confirmed the Free project awake with a successful
  browser-client subscription, then produced a separate clean Preview epoch:
  `CLIENT_CONFIGURED` → `CHANNEL SUBSCRIBED`, active point traffic, and
  `UPDATE_GAP_MAX sampleCount=330 maxGapMs=79 spanMs=10030`
- Full evidence, artifact hashes, failed-attempt ledger, and claim boundary:
  `docs/evidence/realtime-spike.md`

## Baseline

- TypeScript compile result: succeeded after credential persistence/restart and
  again against the final Gate 0 worktree
- Preview refresh/run result: success after credential persistence and restart;
  first activity at 26 ms
- Bounded post-refresh Preview project runtime errors/warnings: 0
- Preview print: `SIK Version : 0.18.0`
- AGENTS custom contract changed by Lens Studio: no
- Generated Cache/Support/preferences/workspace state tracked: no
- Lens editor `Plugins/` cache and generated `CLAUDE.md` compatibility pointer:
  ignored and untracked; project runtime packages remain under `Packages/`

## Submission fields

The public Week 3 page was inspected read-only on 2026-08-26. It identifies the
current theme as **Connect** and requires:

- public project repository link
- demo video
- CLAD prompt log
- project description covering the build, weekly theme, and audience

The unauthenticated page exposes the registration form rather than logged-in
project-submission fields. It does not expose a required published-Lens link.
Any additional authenticated submission fields remain unknown and must not be
guessed. Source: <https://lenslist.co/clad-summer-hackathon>.
