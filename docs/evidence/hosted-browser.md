# Hosted browser evidence — production Vercel deployment and live relay proof

Recorded 2026-08-30. All Lens-side behavior below is simulated Lens Studio
Preview evidence, never hardware footage or a device test. The hosted proof
ran with both participants on one machine; it supports only a narrowly worded
hosted-origin observation, not remote play, multi-network operation,
security, scale, or production readiness. Evidence names Supabase Realtime,
never Snap Cloud. The room code is routing and light concealment, not a
credential; observed room values below are not secrets.

## Deployment

- Product freeze: `ee88d050c27770a96368807bdd5035f0c6a57e3c`.
- Runtime/UI manifest: `cbdc1f4b267ddb96ff88b57d277d05658fa3c93d6d74363621b4ceafd5633477`
  (122 files; method: `git ls-tree -r <freeze> -- Assets Packages
  Project.esproj web/index.html web/src web/package.json
  web/package-lock.json web/tsconfig.json web/vite.config.ts package.json
  package-lock.json vercel.json .vercelignore web/.env.production.example |
  LC_ALL=C sort | shasum -a 256`).
- Deploy build: `VITE_RELAY_SESSION_ID= npm run build:web` at the freeze; the
  development prefill value was verified absent from `web/dist` and no
  production `VITE_RELAY_SESSION_ID` exists.
- Public-build audit at the exact build: key type `publishable`,
  `jwtShapedInBundle: 0`, one configured-URL reference, zero findings.
- Static `web/dist` content digest (sorted `sha256  path` lines, hashed):
  `a55086eb1896b9284ce0b9ec41fbba7da12a284266ec0f5bf633ae377f35746c`.
- Production URL: `https://wordless-relay-connect.vercel.app` (free/Hobby
  project `wordless-relay-connect`; only the audited static output was
  uploaded from a staging copy of `web/dist` — no repository source, `.env`,
  captures, or handoff material).
- Byte parity: served `index.html` SHA-256 `25dc7e14…dcc46` and
  `assets/index-UVz8gtYs.js` `e2cc27fe…f4b9df` equal the local audited dist.

## Room lifecycle observed

One fresh code per Lens Preview lifecycle, all six characters from the
unambiguous alphabet, displayed as `ROOM · <code>` on the HUD: `N7Q6LX`,
`89CLD3`, `73F8PR`, `7YMTPC`, `ESMUJW`, `3R95JU`, `75CFP9`, `4QD3LU`,
`USQRA5`, `XHXW48`, `D8LSCJ`. No global-uniqueness claim is made. Codes were
stable through rounds, replay, and transport reconnects within a lifecycle;
every Preview restart produced a new value.

## Hosted RTT (Gate 0 method, product channel)

Method: an external Playwright-driven Chromium (throttling disabled to match
the runbook's foreground-Chrome requirement) joined the production page in
room `4QD3LU`; a WebSocket wrapper injected before page load timestamped the
correlated ambient product pings on the page's own clock (the Lens ack echoes
the browser's `originSentAtMs`, so one clock measures the application round
trip); product code was not imported or modified. Ambient product pings run
at the built-in 2,000 ms cadence (the Task 11 product-channel precedent);
only paired ping→ack events counted.

- Matched samples: **50/50** (zero unmatched pings).
- Median **76 ms**, p95 **114 ms**, minimum 57 ms, maximum 314 ms.
- Gate: local baseline median 86 ms / p95 106 ms; 30% ceilings 111.8 ms /
  137.8 ms. Hosted median 76 ms (11.6% below baseline) and p95 114 ms (7.5%
  above baseline) both pass; absolute Gate 0 bounds also hold. **The hosted
  latency gate passes.**
- Largest observed serialized Phoenix envelope: 355 bytes (inner product
  messages remain within the 1,024-byte product bound; Lens-logged stroke
  batches ran 104–124 bytes at ~110 ms send spacing).

## Live sequence (amendment section 6 observations)

1. Newly generated room shown on the Lens HUD each lifecycle — observed for
   every code above.
2. HTTPS reachable, byte-parity verified; a plain load shows an empty join
   input (no fixed room prefill in the deployed bundle).
3. Manual entry (typed ` d8lscj `) normalized and joined the exact Lens topic;
   `?room=4qd3lu` and `?room=xhxw48` prefilled normalized values and waited —
   the channel count stayed zero until JOIN ROUND was explicitly pressed.
4. Presence/ack released only Lens-authored rounds: the browser progressed
   JOINING → READY → ACTIVE only after the handshake, and rounds appeared
   only from Lens `round.start`.
5. All eight painter colors crossed the hosted relay and rendered with their
   exact hues: scarlet, cyan, and magenta as live strokes in room `XHXW48`
   (lifecycle `SXPE53YB`), and violet, lemon, orange, lime, and cobalt as
   complete glyph-locked rounds in room `D8LSCJ` (lifecycle `6FIES4W9`,
   rounds 1–4 and 8: GLYPH_LOCKED points 18/20/15/18/16, path hashes
   `8dfe93de`, `c3364a15`, `24d5b1b4`, `3b44558d`, `e6ed8cf6`).
6. Wrong guesses turned the played card and result line coral and recolored
   the live path coral on the hosted page (violet round: three consecutive
   coral wrongs with the coral path visible, then the correct guess restored
   violet); correct guesses produced mint success, the revealed word, the
   exact sampled glyph in the medallion, and replay started the next round.
7. Reload/reconnect used the authority-preserving path: transport
   interruptions invalidated the display projection to a RECONNECTING state
   with no round content, one observed recovery re-bound to READY, and a
   reloaded browser rejoining the room waited honestly for the painter —
   the browser never invented or populated a round.
8. A Preview restart changed the displayed room every time; stale browsers on
   dead rooms (`XHXW48` at CONNECTION FAILED, `ESMUJW` waiting) never
   silently attached to a successor room.
9. Lens logs for the session contain no product-level errors (no
   RECOVERY_ERROR, no INVARIANT_ERROR, no E/F product lines) and no
   credential or local-path values; the only error-level lines are Lens
   Studio's own telemetry transmitter failures, unrelated to the product.

## Fail-closed observations (honest limitations)

- A guesser leaving (tab close/navigation) past the 6-second liveness window
  settles both ends at terminal TIMED_OUT/DISCONNECTED per design; resuming
  requires restarting both ends (the runbook flow). Observed repeatedly and
  never accompanied by an invented round.
- The first RTT attempt failed because the observer browser was
  background-throttled past the liveness window — matching the runbook's
  foreground-Chrome warning; the accepted run disabled throttling.
- 20-second rounds expired during several driving attempts before input
  landed; expired rounds were replayed rather than promoted as evidence.

## Reproduction

Runbook: open the production URL, press Preview play, read `ROOM · <code>`
from the HUD, enter it in the browser (or use a `?room=<code>` link and press
JOIN ROUND), then play. Wake/resume the free Supabase project and confirm
two-way traffic before recording anything; a free project may have paused.
