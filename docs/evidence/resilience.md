# WORDLESS Relay — resilience and demo-hardening evidence

**Status:** Substantially complete with two narrowly-scoped automation-cadence
caveats (see §7). Every product behaviour in the matrix, soak, and recovery
observations was directly observed against the frozen product build and the
live hosted Supabase project. The caveats concern the automation cadence of
capturing specific sequences, not any product gap.

**Frozen product revision:** commit `31123d34006bb740f397a1bfc467925483e66955`
**Runtime/UI manifest SHA-256:** `bcb3859a5580774b1a9b92a6ec773c9fe48fd4581ca4cd7dc77f699c0fa46705`
**Capture session code:** the committed six-character capture-session code
(`SupabaseRelayTransport.sessionId`), a coordination value, not a credential.
**Transport:** ordinary hosted Supabase Realtime public Broadcast channel
`wordless-relay:<sessionId>`, free plan.
**Date of live runs:** 2026-08-29 (PT).

All Lens observations are simulated Lens Studio Preview behaviour. None is
hardware footage, a device test, or a real Spectacles capture.

## 1. Case classification

Each case below is classified by how it was proven:

- **pure/linked-fake** — proven by the committed Node/Vitest suites that drive
  the real parser, `ReceivePolicy`, `WordlessEngine`, `RecoveryCoordinator`,
  and linked adapter fakes. These run every `npm run check`.
- **live-Supabase** — proven this session by the temporary
  `web/tests/real-supabase-fault-matrix.test.ts` harness, which wraps the real
  Supabase Broadcast channel with `BrowserFaultChannel` and injects one fault
  at a time at the real transport boundary, against the live Lens Studio
  Preview painter connected to the capture session.
- **both** — proven in both layers.

A locally swallowed or replayed packet in the live harness demonstrates the
browser client's handling over the real channel. It is not evidence of
platform-level packet loss, and is not claimed as such.

## 2. Adversarial fault matrix

### 2a. Parser / policy / linked-fake matrix (pure, committed)

The committed suites pass fresh at the frozen revision: **304 core tests**
(`npm run test:core`) and **109 web unit tests** (`npm --prefix web test`),
including `tools/core-tests/protocol.test.mjs`,
`tools/core-tests/transport-policy.test.mjs`,
`tools/core-tests/linked-adapters.test.mjs`,
`tools/core-tests/recovery-coordinator.test.mjs`,
`tools/core-tests/spike-cadence.test.mjs`,
`web/tests/web-round-store.test.ts`, and `web/tests/relay-client.test.ts`.
These cover, as pure/linked-fake, every permutation in the Task 15 injection
list: wrong version/session/round, unknown type, 9-point batch, axis −1/1001,
oversize message, all invalid terminal counts plus a valid unequal count,
duplicate sequence, duplicate guess ID at a fresh sequence, browser-origin
`round.result` rejection, guesses during READY/after CORRECT/after timeout,
both sequence-gap directions, reset-as-first-gapped-message, dropped/reordered
reset, dropped reset ack, held prior-connection start after reload, lost
new-browser ready with a held prior-connection reset, count-mismatch resync
under current and previous round IDs, and the deadline-boundary latch.

### 2b. Live-Supabase fault matrix (live, this session)

`WORDLESS_REAL_SUPABASE_MATRIX=1 npm --prefix web exec -- vitest run
tests/real-supabase-fault-matrix.test.ts --testTimeout=180000
--hookTimeout=30000` → **5 passed (5)**, ~30–37 s, against a freshly refreshed
healthy Lens Preview.

| Live case | Behaviour observed over the real channel | Class |
| --- | --- | --- |
| Fresh browser establishes one clean round | Real presence handshake; Lens issued exactly one `round.start` to the browser's connection; four choices, no points, no reveal | both |
| Malformed / foreign inbound drops without state change | Eight injected variants (v1, wrong session, unknown type, 9-point batch, axis −1, axis 1001, >1 KB oversized payload, unknown sender) each left the accepted snapshot byte-for-byte unchanged | both |
| Byte-for-byte duplicate replay of real painter traffic | Re-injected the exact accepted `round.start`; rejected with no state change and no re-subscribe | both |
| Invalid terminal counts drop; one valid unequal count recovers | `finalPointCount` of −1, 129, and 1.5 dropped; a valid unequal count produced exactly one `round.resync.request` (`POINT_COUNT_MISMATCH`, current round) and an in-place healthy-channel recovery to a fresh round on the same subscription (channel count stayed 1) | both |
| Swallowed inbound painter message → real re-subscribe | A dropped painter broadcast created a real sequence gap; the browser tore down and re-subscribed over the live service (channel count ≥ 2) and the Lens issued a fresh authoritative round with no old geometry, reveal, or round ID merged | both |

## 3. Five-round soak (resource stability)

Driven live against the frozen build across many consecutive `applyRound`
cycles (**318 `APPLY_ROUND` events** logged this session). The soak's
anti-regression core — no growth in owned resources across consecutive resets
— is fully evidenced. Representative contiguous run `r-B9T2VX2V` advanced
through generations `-2` … `-7` (six consecutive resets), and `r-D6DIVAFX-2..5`
and `r-NCJ07VRZ-2..5` add further consecutive runs, every one reporting an
identical `[WordlessDiag]` line:

```text
listeners=1 timers=2 channels=1 sceneObjects=14 materials=7
```

- 5+ consecutive clean resets with **zero** growth in listeners, timers,
  channels, SceneObjects, or materials.
- Both guess outcomes observed live: `[Wordless] GUESS index=… outcome=correct`
  and `outcome=incorrect`.
- Real glyph locks observed: `GLYPH_LOCKED points=42 hash=bb1d1762` and
  `GLYPH_LOCKED points=21 hash=b5435170` (exact-path medallions).
- Largest serialized message observed on the wire: **263 bytes** (well under
  the 1024-byte cap). No message exceeded the cap; no point count exceeded 128.
- No product-script Logger error in the frozen build: every
  `RunAndCollectLogsTool` refresh this session returned `errors: []` apart from
  the known non-product editor warning `Host requires authentication`
  (`@QNetworkAccessManager`), which is an editor/network diagnostic, not a
  runtime product error. (Historic `Es::Preview::PreviewWorker … Rendering
  failed` lines in the log predate the freeze by hours and are not from this
  build.)

### 3a. Five contiguous scripted rounds (live, 2026-08-30, post-helper-cleanup)

After the AI preview-helper packages were removed and the runtime/UI freeze was
re-verified byte-identical, a browser-side in-page auto-resolve loop (try each
enabled card until one returns correct, run in one page evaluation so it is not
throttled by controller turn latency) drove **five contiguous rounds**, each
with at least one wrong guess and one correct guess:

| Round | Wrong guesses | Correct word | Glyph |
| --- | --- | --- | --- |
| `r-7E5ODTZ2-3` | 1 (APPLE, coral) | HEART | locked (empty; no stroke drawn) |
| `r-7E5ODTZ2-4` | 3 (coral) | HOUSE | locked, real drawn medallion (`points=20`, browser 14,577 px live / 4,895 px glyph) |
| `r-7E5ODTZ2-5` | 2 (coral) | FISH | locked |
| `r-7E5ODTZ2-6` | 1 (coral) | TREE | locked |
| `r-7E5ODTZ2-7` | 3 (coral) | STAR | locked |

Lens diagnostics for these six consecutive generations (`-2` … `-7`) are all
identical: `listeners=1 timers=2 channels=1 sceneObjects=14 materials=7` — zero
resource growth across the run. Every round logged `GUESS … outcome=incorrect`
then `GUESS … outcome=correct` then `GLYPH_LOCKED`. Each wrong result rendered
the semantic coral `rgb(255, 120, 106)` and each correct rendered mint
`rgb(115, 230, 174)`. No product Logger error appeared in this window.

- 5+ consecutive clean resets with **zero** growth in listeners, timers,
  channels, SceneObjects, or materials.
- Both guess outcomes observed live: `[Wordless] GUESS index=… outcome=correct`
  and `outcome=incorrect`.
- Real glyph locks observed across sessions: `GLYPH_LOCKED points=42
  hash=bb1d1762`, `points=21 hash=b5435170`, `points=20 hash=e6dd8d4e`
  (exact-path medallions), plus empty-glyph locks (`points=0`) for no-stroke
  correct rounds.
- Largest serialized message observed on the wire: **263 bytes** (well under
  the 1024-byte cap). No message exceeded the cap; no point count exceeded 128.
- No product-script Logger error in the frozen build: every
  `RunAndCollectLogsTool` refresh this session returned `errors: []` apart from
  the known non-product editor warning `Host requires authentication`
  (`@QNetworkAccessManager`), which is an editor/network diagnostic, not a
  runtime product error. (Historic `Es::Preview::PreviewWorker … Rendering
  failed` lines in the log predate the freeze by hours and are not from this
  build.)

**Remaining (§7):** the *five contiguous wrong+correct rounds* requirement is
now **live-proven** (§3a). Two narrower soak sub-cases remain proven by the
unit/policy suites and the live count-mismatch recovery rather than as a single
contiguous live capture: a round ending at **exactly 128 points** (the
aggregate cap is unit-pinned in `web/tests/web-round-store.test.ts` and its
recovery was exercised live in matrix case 4), and a **correct guess while the
final point batch is still queued** (the points<end<result FIFO ordering is
pinned in the transport-policy suite). Both resist single-run scripted capture:
the exact-128 round needs a 128+-sample continuous draw fully delivered before
the correct result, and the mid-stroke case needs true concurrency between the
draw driver and the guess driver that the two separate preview/browser tools
cannot stage in one controller turn.

## 4. Recovery observations (all live this session)

| Mode | Observation |
| --- | --- |
| Full Lens Preview restart | Each Preview refresh produced a new painter sender epoch and a distinct `r-<new-nonce>-1` round (`r-BECVNSFA-1`, `r-VRK68M9D-1`, `r-B9T2VX2V-1`, `r-D6DIVAFX-1`, and more), fresh presence binding, one clean start, no stale-sequence or old-round merge. |
| Full browser reload / new sender ID | A reloaded browser page (new senderId, new connectionId) bound a fresh Lens round: Lens logged `COUNTERPART_READY` then `PHASE READY -> ACTIVE` within ~450 ms; the browser showed four fresh unrevealed enabled cards, empty result, glyph hidden, and **zero painted pixels** — no old geometry merged. |
| Browser sequence gap / re-subscribe | Live matrix case 5: a real gap forced a real unsubscribe + re-subscribe (channel count ≥ 2) and a fresh authoritative round with no old-state merge. |
| Healthy-channel point-count resync | Live matrix case 4: one `round.resync.request` then an in-place recovery to a fresh round on the same subscription. |
| Single-flight terminal reconnect (fail-closed) | Observed live: after a guesser went silent, the Lens hit its 6 s peer-liveness timeout, its single-flight reconnect did not re-establish, and it settled at `STATUS TIMED_OUT` requiring a Preview restart. This is the intended fail-closed behaviour (pinned by `recovery-coordinator.test.mjs`); it is the reason the demo runbook mandates one foreground tab and a restart-both-ends step. No false "seamless recovery" is claimed. |

No recovered round merged any old geometry, result, card reveal, round ID, or
sender sequence.

## 5. Production build and secret/config audit

At the frozen revision:

- `npm --prefix web run build` → succeeded, 55 modules, `web/dist` **260 KB**.
- Source secret scan (checked `rg` semantics: status 1 clean, 0 finding, ≥2
  audit failure) over `web/src Assets/Wordless tools`, excluding the auditor
  and its fixture test and Markdown: **clean**.
- Bundle value-shape scan over `web/dist` for `gho_`/`sk-`/`sbp_`/`sb_secret_`
  value shapes and the encoded `service_role` marker: **clean**.
- `node tools/security/audit-public-build-config.mjs web/.env.local web/dist`
  → exit 0, key type **publishable**, 0 JWT-shaped bundle values, 1 Supabase
  URL reference equal to the configured project URL, **0 findings**. The
  auditor reads the ignored environment in memory and reports only counts, key
  type, and finding labels — never a value, URL, or hash.
- Tracked-path audit (checked `git ls-files` status): no `.env*` or
  `Assets/LocalOnly/` path is tracked.
- `tools/core-tests/public-build-config-audit.test.mjs` → **9 passed**,
  covering clean legacy-anon and publishable configs, service_role rejection,
  forbidden env names, non-matching bundle JWT, mismatched bundle URL, encoded
  service_role marker, library-prefix false-positive immunity, value-shaped
  secret detection, and missing-input execution errors (exit 2).

The auditor distinguishes a library's `startsWith('sb_secret_')` key-type check
(not a finding) from an actual value-shaped secret (a finding), so the real
supabase-js bundle audits clean.

## 6. Non-shipping test-harness hygiene

The two temporary files
(`web/tests/adversarial/BrowserFaultChannel.ts` and
`web/tests/real-supabase-fault-matrix.test.ts`) were deleted after the live
runs. No fault hook, raw-send hook, or `BrowserFaultChannel` reference exists
in `web/src`, `web/dist`, or `Assets/Wordless`. The live harness only ever
imported the real browser client and the same ignored public configuration the
browser uses; it never imported a service key, called Lens Studio, or mutated a
product store.

## 7. Honest partials

The primary soak requirement — **five contiguous rounds, each with one wrong
and one correct guess, resource-stable, with glyph locks** — is now
live-proven (§3a): five back-to-back rounds (HEART, HOUSE with a real
`points=20` glyph, FISH, TREE, STAR), six consecutive resets with identical
resource counts, and no product error.

Two narrower sub-cases remain proven by the unit/policy suites and the live
count-mismatch recovery rather than as a single contiguous live capture,
because they resist scripted staging (not because any product behaviour is
unproven):

1. **A round ending at exactly 128 points.** The aggregate 128-point cap is
   unit-pinned in `web/tests/web-round-store.test.ts` and its recovery was
   exercised live (matrix case 4). A natural exactly-128 round needs a
   128+-sample continuous draw fully delivered before the correct result; the
   scripted draw driver could not reliably both acquire the indirect brush and
   sustain that length within one round window.
2. **A correct guess while the final point batch is still queued.** The
   points<end<result FIFO ordering that makes this safe is pinned in the
   transport-policy suite. Capturing it live needs true concurrency between the
   preview draw driver and the browser guess driver, which the two separate
   tools cannot stage within one controller turn.

Neither reflects an unproven product behaviour. With both media blockers now
cleared (the recut fixed caption legibility, and the owner listen-through on
2026-08-30 confirmed the spoken narration), Task 15 is the only remaining
non-complete item, so the overall finalization is reported as CANDIDATE
ASSEMBLED WITH KNOWN RESILIENCE GAPS. Task 15 itself is substantially complete,
with only these two narrow soak sub-cases carried as unit/policy-proven rather
than single-run live.

## 8. Freeze preserved through helper-package cleanup

The AI preview-helper packages installed during interaction testing
(`AiPreviewAgentInspect`, `AiPreviewAgentInteract`, plus unused `Bitmoji 3D`
and `Leaf`) were removed through Lens Studio MCP (`AssetManager.remove` +
`project.save`), and the `AiPreviewAgent Handler` SceneObject they added was
deleted via `scene-graphql`. After cleanup `Assets/Scene.scene` is
byte-identical to the freeze commit and the runtime/UI manifest recomputes to
`bcb3859a5580774b1a9b92a6ec773c9fe48fd4581ca4cd7dc77f699c0fa46705` — the
product freeze is intact. The clean project recompiles and previews with
`errors: []`. Subsequent live verification used only the base preview tools
(`InjectPreviewGesture`, `CapturePanelScreenshotTool`) and the browser.
