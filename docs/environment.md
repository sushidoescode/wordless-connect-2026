# WORDLESS environment record

Observed 2026-08-26 in the active `WordlessRelay.esproj` project. The normal
Supabase owner gate and post-entry persistence checks are complete; live
Lens-to-browser traffic remains the separate Gate 0 proof in Tasks 2–4.

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
- Repository/log/capture/chat credential values: none
- Optional GitHub-integration prompt: closed before any repository selection,
  installation, or authorization; no Supabase GitHub integration was added
- Prior localhost MCP bearer exposure: present only in a private tool
  transcript from initial setup; the owner fully quit Lens Studio before any
  Supabase value was entered, and Codex rebound to the newly launched editor
  process before reopening the owner credential gate
- Post-restart MCP identity check: exact root `WordlessRelay.esproj`,
  `Spectacles` target, and exactly one path-only matching local asset; PASS

## Baseline

- TypeScript compile result: succeeded after credential persistence and restart
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
