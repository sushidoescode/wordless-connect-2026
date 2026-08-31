# WORDLESS Relay — demo runbook

A repeatable procedure for a clean judged or captured session with one Lens
Studio Preview painter and one ordinary browser guesser. Every Preview frame is
simulated Lens Studio Preview output — never hardware footage or a device test.

## Generated room

- The Lens generates one fresh six-character room code per Preview lifecycle
  from the unambiguous alphabet (no `I`, `O`, `0`, `1`) and shows it as the
  bright `ROOM · ABC123` HUD line. The code stays stable through rounds,
  replay, and transport reconnects; a full Preview restart creates a new one.
- Read the room from the Lens HUD (or the `[Wordless] ROOM code=` log line)
  and enter it into the hosted browser join form. A `?room=` link prefills the
  form but never auto-joins — Join stays an explicit click. The code is
  routing and light concealment, not a login and not a security boundary.
- After a Preview restart, the old browser tab is stranded on the dead room by
  design; reload the page and enter the newly displayed code.
- Use **exactly one** ordinary browser tab. A second guesser tab replaces the
  first and tears down the live round (intentional latest-wins single-guesser
  model). Never join a second tab mid-take.

## Preflight

1. Wake/resume the Supabase project, confirm Realtime is enabled and public
   channel access is on, then confirm the two-way probe (a drawn Lens stroke
   reaches the browser and a browser guess reaches the Lens). A free project
   may have paused; never rely on a previously warm backend.
2. In Lens Studio, confirm the Spectacles target, a clean TypeScript compile,
   the active Preview, and the Sunlit Room environment — all through Lens Studio
   MCP tools. If MCP is unavailable, stop and report it; never use direct HTTP.
3. Disable macOS sleep and Do-Not-Disturb / notifications for the duration.
4. Keep Chrome foregrounded. A backgrounded guesser tab can be throttled past
   the 6-second peer-liveness window and tear the round down.
5. Confirm one foreground browser tab, the split-screen crop, a visible
   (enlarged) pointer, the `Lens Studio Preview — simulated` lower-third, and
   no credential-bearing windows in frame.
6. Start from a fresh Preview run and a clean browser load.

## Running a round

1. Refresh the Lens Preview to establish a fresh painter epoch
   (`r-<nonce>-1`). Wait for the browser to show `PAINTER READY` and an
   `ACTIVE` round with four choices before drawing.
2. Optionally select one of the eight palette swatches (2×4 grid: red,
   orange, yellow, green / cyan, blue, violet, magenta; violet is the
   default). Draw one continuous stroke on the Lens. The browser renders the
   same path live in the selected colour; the palette locks at stroke begin.
3. Tap one wrong answer: the guessed card disables and reads `× WORD · TRY
   AGAIN`, the browser result line and both live strokes turn coral, and the
   round stays active. (Video caption for this beat:
   `WRONG · BOTH STROKES GO CORAL` — the strokes, never "both screens".)
4. Tap the correct answer: mint feedback, the word reveals on both surfaces,
   the selected colour returns, and the exact path locks into matching glyph
   medallions on both surfaces.
5. To replay, activate `PLAY AGAIN` on the Lens; a fresh round starts with the
   last selected colour retained and the palette unlocked.

## If the transport reaches terminal failure

The recovery reconnect is single-flight by design: if it fails before
SUBSCRIBED, or if the peer goes silent past the 6-second liveness window, the
client settles at a terminal `TIMED_OUT`/`DISCONNECTED` state and does **not**
silently re-establish. This is intended fail-closed behaviour.

- Reload/restart both ends: refresh the Lens Preview and reload the browser
  tab. A reloaded browser (new sender) binds the next fresh Lens round.
- Wait for a fresh authoritative round and confirm old content is absent (empty
  result, four unrevealed cards, no painted stroke) before recording.
- Never improvise a hidden retry or narrate "seamless recovery"; the honest
  claim is fail-closed recovery with a restart.

## Do not

- Change any tracked runtime/UI file after the freeze (invalidates the cut).
- Join a second browser tab mid-take.
- Show credentials, `.env` contents, raw payloads, editor errors, update
  prompts, modal dialogs, absolute home paths, or private handoff/research
  material.
- Claim hardware, recognition, security, latency, scale, remote-play, or
  production-readiness beyond the measured, scoped evidence.
