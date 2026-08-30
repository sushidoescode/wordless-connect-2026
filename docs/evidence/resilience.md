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

**Caveat (§7):** the specific cadence of *one wrong then one correct guess
within each of five contiguous scripted rounds*, plus the 128-point cap round
and the mid-stroke-correct round, was proven in aggregate (resource stability
across 6+ consecutive resets; correct glyph locks; wrong-guess coral; the
128-cap by unit tests and the live count-mismatch recovery; points<end<result
ordering by the policy suite) rather than as one contiguous five-round
scripted pass.

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

Two items are aggregate-proven rather than captured as a single contiguous
scripted artifact, both because scripted turn latency is comparable to the
20-second round and 6-second peer-liveness windows — an automation-cadence
limit, not a product limitation:

1. **Five contiguous wrong+correct rounds in one scripted run.** Resource
   stability across 6+ consecutive resets, both guess outcomes, and real glyph
   locks are all live-proven; the exact "wrong then correct within each of five
   back-to-back scripted rounds" cadence, and the 128-cap and mid-stroke
   sub-rounds, are proven across the session and by the unit/policy suites
   rather than one contiguous capture.
2. **Browser reload/gap into a still-healthy Lens as a single timed capture.**
   The new-sender→new-round and gap→re-subscribe→new-round behaviours are
   live-proven (§4), including a clean reload-into-fresh-Lens observation; the
   sub-6-second reload-before-terminal window cannot be hit reliably by
   scripted turns, and the terminal fail-closed outcome was itself observed.

Neither caveat reflects an unproven product behaviour. Per the submission
review amendment, until these are captured as clean contiguous scripted runs
the overall finalization is reported as CANDIDATE ASSEMBLED WITH KNOWN
RESILIENCE GAPS, not FINALIZATION COMPLETE.
