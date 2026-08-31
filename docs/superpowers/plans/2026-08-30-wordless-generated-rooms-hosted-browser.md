# WORDLESS Generated Rooms + Hosted Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one fresh six-character room code per Lens Preview
lifecycle, display it on the HUD, drive the relay topic from it, prefill (but
never auto-join) the browser join form from `?room=`, and serve the compiled
static browser from one production Vercel Hobby URL proven live against the
Lens.

**Architecture:** A pure `RoomCode.ts` core helper generates codes from the
unambiguous 32-character alphabet under generate-narrow/validate-wide. The
composition root generates once, assigns the transport's effective session ID
before any policy creation (fail-closed on later mutation), and renders a
dedicated HUD room line; views never infer routing state. The browser gains a
pure `room-prefill.ts` precedence helper feeding the existing submit-gated
join form. Deployment builds the exact clean freeze locally and ships only the
audited `web/dist` through the authenticated Vercel CLI with repository-root
build context declared in `vercel.json`.

**Tech Stack:** Lens Studio 5.23.2, Lens Studio MCP, Supabase Realtime
Broadcast, Vite, Vitest, Node 22 tests, Playwright Chromium, Vercel CLI
(Hobby).

**Spec:** `docs/superpowers/specs/2026-08-30-wordless-rainbow-room-vercel-amendment.md`
(sections 4, 5, 6), amending the design and the standard-Supabase amendment.

## Global Constraints

- Generated codes: exactly six uppercase characters from
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; injectable random source; probabilistic
  coordination, never called a credential, login, or security boundary.
- Validation everywhere stays `[A-Z0-9]{6}` (generate-narrow/validate-wide).
- One generation per Lens composition lifecycle, before the first
  `relay.connect()` and before `ensurePolicy()` (triggered by the first
  `applyRound` → `setLocalRound`); never mutated after policy creation or
  during recovery; a full Preview restart yields a new value.
- Channel topic stays exactly `wordless-relay:<room>`.
- HUD line `ROOM · ABC123` in bright ivory, rendered from the composition
  root, separate from connection status; routing state never enters
  `RoundStore`.
- `?room=` prefills only with exactly one valid normalized query value;
  malformed/duplicate values are ignored and never reflected; env fallback
  `VITE_RELAY_SESSION_ID` only in development; manual entry stays
  authoritative; no auto-join, no accounts.
- Vercel: free/Hobby only, one production deployment of audited `web/dist`,
  only `VITE_SUPABASE_URL` + publishable key embedded, no production
  `VITE_RELAY_SESSION_ID`, no custom domain, no repo/source upload; `.vercel/`
  git-ignored; restrictive `.vercelignore`; stop for the owner only if
  `vercel login` is required.
- Hosted proof: existing Gate 0 method; hosted median/p95 within 30% of the
  local baseline (86 ms median → ≤111.8 ms; 106 ms p95 → ≤137.8 ms) plus all
  absolute bounds; same-machine hosted-origin observation only.
- Lens scene mutation via Lens Studio MCP only; secrets never printed; the
  ElevenLabs key has no role in the hosted app.

---

### Task 1: RoomCode core helper

**Files:**
- Create: `Assets/Wordless/Scripts/Core/RoomCode.ts`
- Test: create `tools/core-tests/room-code.test.mjs`

**Interfaces:**
- Produces: `ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' as const`,
  `ROOM_CODE_LENGTH = 6`,
  `generateRoomCode(randomSource: () => number = Math.random): string` (throws
  on random values outside `[0, 1)`, mirroring `createInstanceNonce`),
  `normalizeRoomCode(value: string): string` (trim + uppercase),
  `isValidRoomCode(value: unknown): value is string` (the `[A-Z0-9]{6}` public
  contract).

- [ ] **Step 1: Write failing tests**: alphabet has 32 unique chars excluding
  I/O/0/1; `generateRoomCode(() => 0) === 'AAAAAA'`;
  `generateRoomCode(() => 0.999999) === '999999'`; six calls consumed per
  code (counting stub); every generated char in the alphabet over a seeded
  sweep; throws on 1 and -0.1; `normalizeRoomCode('  abc123 ') === 'ABC123'`;
  `isValidRoomCode` accepts `WAVE42`/`EOU4LZ`/generated codes, rejects
  5/7-char, lowercase (pre-normalization), `''`, null, `AB CD1`.
- [ ] **Step 2: Run red**, **Step 3: implement**, **Step 4: run green**
  (`npm run test:core`).
- [ ] **Step 5: Commit**: `feat: unambiguous room-code generator and validation`.

### Task 2: Lens composition — generated room, read-only accessor, HUD line

**Files:**
- Modify: `Assets/Wordless/Scripts/Transport/RelayPort.ts:39-51`,
  `Assets/Wordless/Scripts/Transport/SupabaseRelayTransport.ts` (assign/read
  accessors near `ensurePolicy`), `Assets/Wordless/Scripts/WordlessApp.ts`
  (HudPort, dependencies, `start()`), `Assets/Wordless/Scripts/View/LensHudView.ts`
  (room text binding + `renderRoom`)
- Test: modify `tools/core-tests/lens-transport.test.mjs`,
  `wordless-app.test.mjs`, `lens-hud-view.test.mjs`

**Interfaces:**
- Consumes: `generateRoomCode` from Task 1.
- Produces: `RelayPort.assignSessionId(sessionId: string): void` (throws
  `'invalid session ID'` on pattern failure and `'session ID cannot change
  during a relay instance'` once a policy exists) and
  `RelayPort.getEffectiveSessionId(): string`;
  `WordlessAppDependencies.createRoomCode: () => string`;
  `HudPort.renderRoom(roomCode: string): void`; `LensHudView` gains mandatory
  `@input roomText: Text`, `renderRoom` writing `ROOM · <code>` in ivory,
  `HUD_RESOURCE_COUNTS.sceneObjects` 8→9, binding error string updated to
  `'LensHudView requires 7 Text, 2 marker, and 3 material bindings'`.

- [ ] **Step 1: Write failing tests**: transport `assignSessionId` before
  connect rebinds topic `wordless-relay:<code>` exactly; assignment after
  `ensurePolicy` throws; invalid pattern throws; `getEffectiveSessionId`
  echoes the assigned code. Controller: `start()` calls `createRoomCode`
  exactly once, assigns before the first `applyRound`/`connect`, renders the
  HUD room line once; replay/reset/recovery/reconnect paths never call
  `createRoomCode` again nor `assignSessionId`; a second controller instance
  (fresh lifecycle) gets a fresh code. HUD: `renderRoom('AB23CD')` writes
  `ROOM · AB23CD` ivory + enabled; missing `roomText` binding throws; diag
  string in `wordless-app.test.mjs` moves to `sceneObjects=15`.
- [ ] **Step 2: Run red**, **Step 3: implement** (controller `start()`:
  generate → `relay.assignSessionId` → `hud.renderRoom` → existing flow;
  `WordlessApp.onAwake` supplies `createRoomCode: () => generateRoomCode()`),
  **Step 4: run green**.
- [ ] **Step 5: Commit**:
  `feat: lens-generated room code drives relay topic and HUD`.

### Task 3: Scene — HUD room line via MCP

- [ ] **Step 1:** Through MCP, add a `HUD Room` Text object beside the
  connection line (measured placement, additive-safe bright ivory, same font
  settings as connection text), bind `LensHudView.roomText`.
- [ ] **Step 2:** `RecompileTypeScriptTool` + `RunAndCollectLogsTool`: Preview
  shows `ROOM · <generated>` with a different code after a Preview restart;
  logs clean; capture panel screenshot.
- [ ] **Step 3:** `sh tools/typecheck/check.sh` exit 0; commit scene delta:
  `feat: HUD room code line`.

### Task 4: Browser `?room=` prefill

**Files:**
- Create: `web/src/room-prefill.ts`
- Modify: `web/src/main.ts:235-241`
- Test: create `web/tests/room-prefill.test.ts`; modify
  `web/e2e/wordless.spec.ts`

**Interfaces:**
- Produces: `resolveRoomPrefill(search: string, envFallback: string | undefined): string`
  — returns a normalized valid code from exactly one `room` query parameter,
  else a normalized valid `envFallback`, else `''`. `main.ts` seeds
  `input.value = resolveRoomPrefill(window.location.search,
  import.meta.env.VITE_RELAY_SESSION_ID)`; the submit handler is untouched.

- [ ] **Step 1: Write failing unit tests**: `?room=abc123` → `ABC123`;
  `?room=%20wave42%20` → `WAVE42`; `?room=abc12` / `?room=abc1234` /
  `?room=ab!123` → fallback; `?room=A&room=B` (duplicates) → fallback even if
  one is valid; no query + valid env → env normalized; no query + invalid
  env (`'not-a-code'`) → `''`; neither → `''`; query wins over env.
- [ ] **Step 2: Run red**, **Step 3: implement**, **Step 4: run green**.
- [ ] **Step 5: e2e**: navigate `/?room=wave42` → input shows `WAVE42`, no
  channel until JOIN ROUND clicked (channelCount 0), then joins
  `wordless-relay:WAVE42`; `/?room=bad!!` → input empty; manual override of a
  prefilled value joins the typed code; both Playwright viewports.
- [ ] **Step 6: Run** `npm --prefix web run test:e2e` green; commit:
  `feat: room query prefill without autojoin`.

### Task 5: Reproducible static Vercel build contract

**Files:**
- Create: `vercel.json` (repo root), `.vercelignore`,
  `web/.env.production.example`
- Modify: `.gitignore` (add `.vercel/`)

- [ ] **Step 1:** `vercel.json` exactly:
  `{ "$schema": "https://openapi.vercel.sh/vercel.json", "framework": "vite",
  "installCommand": "npm ci && npm --prefix web ci",
  "buildCommand": "npm run build:web", "outputDirectory": "web/dist" }`.
- [ ] **Step 2:** `.vercelignore` excluding `.env*`, `web/.env*`, `captures/`,
  `exports/`, `local-handoff/`, `Cache/`, `Support/`,
  `PluginsUserPreferences/`, `Workspaces/`, `Plugins/`, `Assets/LocalOnly/`,
  `docs/references/`, `node_modules/`, `*.pem`, keeping
  `Assets/Wordless/Scripts/Core/` includable.
- [ ] **Step 3:** `web/.env.production.example` with only
  `VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co` and
  `VITE_SUPABASE_PUBLIC_KEY=YOUR_PUBLISHABLE_CLIENT_KEY`.
- [ ] **Step 4:** Add `.vercel/` to `.gitignore` **before any `vercel` CLI
  invocation**; run the hygiene/audit suites; commit:
  `chore: vercel static build contract and ignores`.

### Task 6: Freeze, deploy, hosted live proof

- [ ] **Step 1:** Full verification sweep (`npm run check`, e2e, typecheck,
  links, audits); new product-freeze commit; compute and record the new
  runtime/UI manifest digest.
- [ ] **Step 2:** Build the exact freeze (`npm run build:web` with the real
  env in memory only); run `tools/security/audit-public-build-config.mjs
  web/.env.local web/dist` (expects only the URL + publishable key embedded)
  and the prospective-tree audit; record the `web/dist` content digest.
- [ ] **Step 3:** Deploy via authenticated Vercel CLI as a Hobby project
  (prefer `wordless-relay-connect`), production target, static output only.
  If login is missing, stop and ask the owner to run `vercel login`; never
  switch hosts. Record the exact production URL.
- [ ] **Step 4:** Hosted live proof against Lens Preview per amendment
  section 6 (all nine observations) plus the Gate 0 fifty-ping RTT
  measurement; verify hosted median ≤ 111.8 ms and p95 ≤ 137.8 ms and all
  absolute bounds; wake/resume the free Supabase project and re-prove two-way
  traffic immediately before measuring.
- [ ] **Step 5:** Write `docs/evidence/hosted-browser.md` and the hosted-room
  runbook (exact freeze, build digest, URL, environment, room lifecycle, live
  sequence, metrics, limitations); reconcile `docs/submission/demo-runbook.md`
  to the generated-room flow; commit docs.
