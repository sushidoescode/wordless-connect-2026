# WORDLESS Relay — approved design

**Status:** Approved by the project owner on 2026-08-24
**Phase:** Pre-implementation
**Theme:** Connect
**Decision:** Build a Spectacles-to-browser relay, gated by a realtime spike

**Technical amendment — 2026-08-25:** Independent plan review corrected
message sizing, non-replayed readiness, timeout/rejection signaling,
connection-instance sequencing, and web tooling. These changes preserve the
approved product and authority model; the reconciled implementation plan is
the exact contract.

## 1. Product sentence

One player paints a clue in midair on Spectacles; a friend watches the stroke
arrive in a browser and taps the answer that turns the scribble into a shared
session glyph.

## 2. Design thesis

The project should be understandable without an explanation of networking,
spatial anchors, or game rules. A judge should see two roles, one line moving
between them, four answer cards, and one synchronized result.

The browser earns its existence by letting a second person participate without
Spectacles. Spectacles earn their existence because drawing a body-scale path
through the room is the core expressive action. Neither surface duplicates the
other.

This is intentionally a familiar guessing-game schema. Differentiation comes
from the cross-platform relay and from preserving the player's exact path as a
session glyph, not from claiming invention of air drawing or charades.

## 3. Goals and success criteria

### Product goals

1. The two roles are legible within five seconds.
2. A browser guess causes an unmistakable state change in Lens Preview.
3. The correct-result payoff is visible on both surfaces by twenty seconds in
   the submission cut.
4. The browser is usable on a phone-sized viewport and a laptop.
5. The complete minimum round works without camera, microphone, recognition,
   or generative AI.

### Technical success criteria

1. Lens Preview sends bounded normalized stroke points to a browser.
2. The browser renders them in order and submits a choice event.
3. The Lens client alone validates the choice and publishes the result.
4. Both surfaces reach the same round phase after reconnect-free normal play.
5. Measured traffic remains below the chosen transport's documented limits.
6. The complete interaction is captured with honest Preview disclosure.

## 4. Explicit non-goals for the first implementation plan

- Multiple simultaneous browser guessers.
- Two remote Spectacles clients.
- Cross-session glyph persistence.
- Accounts, profiles, matchmaking, or social graphs.
- Free-text guesses, speech, camera input, or semantic recognition.
- AI-generated glyphs or illustrated answer reveals.
- Physics, room occlusion, particles, complex spline smoothing, or hand
  rendering in judged footage.
- Production authentication, anti-cheat guarantees, or global scale.
- Hardware-tested claims unless physical Spectacles become available and are
  separately validated.

## 5. Selected architecture

### Lens client

- **DrawInput** observes the supported hand/pinch gesture and yields world-space
  sample points while a stroke is active.
- **StrokeSampler** throttles, quantizes, simplifies, caps, and numbers samples.
- **RibbonRenderer** draws the local bounded segment pool immediately.
- **LensRelayAdapter** converts local samples into normalized screen
  coordinates and exchanges typed protocol messages with the realtime service.
- **WordlessEngine** owns the round state machine, word choice, decoys, timer,
  and answer validation.
- **RoundStore** exposes immutable snapshots to Lens views and accepts only
  engine-owned transitions; the composition root maps validated transport
  messages to `WordlessEngine` commands.
- **LensHUD** renders prompt, countdown, connection state, and result using
  bright additive-safe primitives.
- **GlyphMedallion** freezes the exact path, normalizes its bounds, and scales
  it into a medallion without semantic transformation.

### Browser client

- **JoinView** accepts a short session code and reports connection state.
- **LiveStrokeCanvas** renders normalized points in sequence.
- **GuessBoard** presents four large choices and submits each remaining choice
  at most once per round.
- **WebRelayAdapter** handles connection, protocol validation, sequence gaps,
  and reconnect state.
- **WebRoundStore** is the browser-side state source consumed by all views.
- **ResultView** applies mint/coral feedback and independently derives the same
  normalized glyph from its received public points after the Lens publishes a
  correct result and final point count.

### Realtime service boundary

`RelayTransport` is an adapter boundary, not game logic. Snap Cloud Realtime is
the preferred first adapter because an official deprecated sample documents a
mode-switched Lens↔web cursor exchange at 10 Hz. It does not prove simultaneous
two-way behavior in the current SPECS runtime; the spike decides whether access,
runtime compatibility, true simultaneous traffic, latency, and capture quality
are sufficient.

No second transport may be introduced without recording an architecture
amendment in the prompt log and confirming that its use complies with the
contest and Lens runtime requirements.

## 6. Data flow

### Join

1. Lens creates or selects a short session code.
2. Browser enters the code and joins the matching realtime channel.
3. Each subscription gets a short connection ID and sends readiness. A peer
   returns one targeted presence ack; acks never echo, duplicate readiness only
   re-acks, and bounded ready retries tolerate non-replayed/lost first sends.
   If retries exhaust after counterpart presence was already observed, only
   that local adapter performs one single-flight re-subscribe; before any peer
   was observed it simply remains waiting for later readiness. A later peer
   ready restarts the local bounded burst.
4. Ready binds peer receive authority and liveness but does not let Lens emit
   product traffic. Lens requires an ack targeted to its current local
   connection before starting. Before the initial start it sends a fresh ack
   targeted to the browser and then the start through one FIFO. Normally the
   browser sees `READY` before `ACTIVE`; if that fresh ack alone is lost, the
   first policy-approved start from the already bound painter, correctly
   targeted to the browser's current local connection, is the browser's final
   readiness proof, cancels ready retries, and may activate directly. An
   accepted authoritative reset may confirm the browser tuple the same way only
   when its target equals that browser's current local connection.
   App-level ping/ack detects peer loss even while
   the local channel remains subscribed. Its six-second loss timer is armed
   only after first accepted counterpart presence, so initial waiting can last
   indefinitely without reconnect churn; recovery disarms it until presence
   binds again.

Readiness acknowledgment is scoped to local connection, peer sender, and peer
connection together. A peer transition invalidates the old tuple and restarts
one bounded local ready burst without reopening the healthy local channel.
While that tuple is still unacknowledged, same-connection ready/targeted-ack
retries may bridge missing lobby-control sequences; after acknowledgment,
ordinary strict gap handling resumes.

### Round start

1. Lens `applyRound` resets its authoritative `RoundStore` and creates an
   epoch-qualified round ID. It never reaches into the browser store.
2. For a noninitial round, Lens emits an old-ID-enveloped authoritative reset;
   the browser resets its own store only after accepting that message, acks the
   advertised new ID, and Lens withholds the new start until that ack.
3. Lens chooses one word from a curated deck and constructs four choices.
4. Lens keeps the correct index local and publishes the choices, round ID, and
   duration.
5. Lens shows `DRAW: <WORD>`; browser shows `GUESS THE CLUE` and the choices.

### Drawing

1. Lens renders every accepted world-space sample locally.
2. StrokeSampler emits bounded batches of normalized integer `[x, y]` tuples with a
   monotonically increasing sequence number.
3. Browser ignores stale duplicates, detects gaps, and renders accepted points.
   A browser-observed painter gap performs one local re-subscribe with no
   pre-close request; the connection-ID transition makes Lens apply a new
   round. A Lens-observed guesser gap applies/sends the reset in place. Neither
   invents missing geometry.
4. A stroke-end message freezes drawing input; exactly one stroke is allowed
   per round, while guessing remains active until terminal state.

### Guess and result

1. Browser may guess while the stroke is arriving or after it ends. It sends
   `{roundId, guessId, choiceIndex}` and makes the four-card grid single-flight while
   awaiting that correlated result; only the selected card reads `SUBMITTED`.
2. Lens rejects stale, malformed, or duplicate guesses.
3. WordlessEngine compares the choice against its local correct index.
4. The first terminal decision is immutable. At `now >= deadline`, timeout is
   advanced before a guess is evaluated; a correct guess accepted before the
   deadline cannot later be overwritten while draining.
5. On correct or timeout, Lens first drains the final batch and publishes one
   stroke end only if a stroke is active. It then publishes the respective
   result/timeout message plus final point count, never glyph geometry.
6. Incorrect feedback uses coral, keeps that card disabled, and leaves the
   remaining choices active while time remains.
7. Correct feedback uses mint, reveals the word on both surfaces, freezes the
   exact path, and independently normalizes each surface's identical public
   points into the shared session glyph medallion.

## 7. Protocol contract

Every message carries:

- `v` (protocol version)
- `type`
- `sessionId`
- `roundId`
- `senderId`
- `sequence`
- `sentAtMs`
- type-specific payload

`senderId` identifies one full client instance: it remains stable across
transient channel re-subscriptions and changes on a full browser/Lens restart.
Sequence high-water marks are scoped to that instance; the same sender never
resets its sequence by sending readiness again.
Each local subscription also has a new `connectionId`. Because Broadcast does
not replay pre-subscription traffic, the first valid ready/targeted ack from an
unbound or genuine replacement sender may establish a
positive sequence baseline greater than one. Wrong-session/role traffic cannot
bind or baseline it. Once bound, that sender—including later re-subscription
traffic—uses ordinary contiguous/gap rules, except that a distinct peer
connection ID or an ack targeted to the receiver's locally new subscription
may act as a reconnect barrier and forces a new authoritative round rather
than merging missed product state. A peer connection-ID change is acknowledged
over the receiver's existing healthy subscription and never forces a
reciprocal re-subscribe. Recovery waits for the peer's ack targeted to that
unchanged local subscription before applying or resending a reset. The Lens
creates at most one reset transition per recovery token. If a disconnecting
local channel/status failure or a peer transition occurs while that token's
reset is pending, the token becomes
carryover-settlement-only: readiness may resend the cached reset after the
presence gate, its matching ack closes the token without starting, and exactly
one successor token performs the fresh recovery reset/ack/start. A reset
inherited from outside recovery is first adopted by the same settlement-only
form. Overlapping signals coalesce and cannot create extra successors.
A Lens-observed sequence gap while a reset is already pending is deliberately
not such a disconnect: it invalidates queued stale application drafts, resends
the cached reset, completes local policy resync, and allocates no successor.

Every `round.start` carries the exact browser `targetConnectionId` whose
confirmed tuple released it. The first painter start binds the browser's
product round only after painter presence and only when that target equals the
browser's current local subscription. Because its immediately preceding
targeted ack can be the one lost lobby-control message, that first valid start
may bridge the gap only while no product round exists; a start targeted to a
prior browser subscription is `STALE_CONNECTION`, consumes only an otherwise-
contiguous sequence, and cannot confirm or bind. The exception is disabled
permanently after binding. Every later transition is Lens-authoritative:
`round.reset` is enveloped with the current old round and carries a distinct
next round ID plus the exact current browser `targetConnectionId`. Browser
acceptance requires that target, resets its local store, and emits
`round.reset.ack`; a stale-target reset may consume only an otherwise-contiguous
sequence and cannot confirm, bind, dispatch, or ack. Lens retries the same
semantic old/new transition with fresh sequences, refreshing the delivery
target only after a new peer-tuple gate, and cannot start the new round before
a matching ack. On a sequence gap,
ordinary messages remain blocked until an authorized reset (or matching ack in
the reverse direction) acts as the replay-safe transition barrier. A reset
that is itself the first gapped message is valid when its sequence equals the
latest observation and exceeds accepted high-water. No partial old round is
merged or republished.

Each client has one outbound FIFO for both adapter-authored liveness/control
traffic and app-authored gameplay traffic. Entries retain non-wire ownership
and application-generation metadata. On any round invalidation/recovery
barrier, not-yet-started stale application entries are synchronously cancelled
without consuming sequence, while adapter controls and at most one already-
started send survive. A reconnecting receiver consumes but suppresses that one
possible old gameplay payload until a correctly targeted reset/start; no old
payload is merged. The transport assigns sequence and send time only at
dequeue, awaits each channel send, and enforces at least 100 ms between actual
`stroke.points` send starts. A full client restart gets a new sender epoch; a
full Lens restart also gets a new bounded round nonce.

Minimum message types:

- `presence.ready`
- `presence.ack`
- `round.start`
- `stroke.begin`
- `stroke.points`
- `stroke.end`
- `guess.submit`
- `guess.rejected`
- `round.result`
- `round.timeout`
- `round.resync.request` (`POINT_COUNT_MISMATCH` only)
- `round.reset`
- `round.reset.ack`
- `transport.ping`
- `transport.ack`

Payload limits are configured from measured spike evidence. Until those
measurements exist, the conservative probe uses one stroke, no more than 128
accepted points, batches no faster than 10 Hz, quantized normalized values, and
an explicit serialized-byte counter in logs. These are probe ceilings, not
performance claims.

## 8. State machine

```text
DISCONNECTED
  -> JOINING
  -> READY
  -> ACTIVE
       -> wrong feedback remains ACTIVE
       -> CORRECT -> GLYPH_LOCKED -- PLAY AGAIN / applyRound --> READY
       -> TIMED_OUT -- PLAY AGAIN / applyRound --> READY
```

`GLYPH_LOCKED` is a deterministic local completion state on both surfaces, not
a wire message. After an accepted correct result, each captures the current
round ID plus its local round generation and transitions `CORRECT ->
GLYPH_LOCKED` at the 450 ms completion boundary. A reset/reconnect increments
generation, so a stale completion callback is a no-op. Task 13 may refine the
tween or complete immediately for reduced motion, but it cannot introduce or
redefine this pre-Gate-1 state behavior.

Actual local connection loss moves that participant to `DISCONNECTED`. A peer
rejoin observed on a healthy local channel invalidates partial gameplay but
keeps that channel and local connection ID; recovery runs once through the
Lens-authoritative reset/ack/start barrier. No reconnect path attempts to merge
partial strokes. `ACTIVE` permits drawing and guessing concurrently;
stroke end closes only drawing input and a second stroke is rejected until the
next `applyRound`. Timeout ends the round without creating a glyph. Incorrect
feedback is stored/rendered while the authoritative phase remains `ACTIVE`; it
is not a separate wire phase. Correct/glyph and timeout remain visible until
the wearer activates `PLAY AGAIN`; only that callback routes to the next
`applyRound`. Reset/disconnect advances an engine generation
and invalidates every pending old-round close or terminal callback.

## 9. Error handling and honesty

- Invalid session code: remain on JoinView with a short literal error.
- Counterpart absent: show `WAITING FOR PLAYER`, not `CONNECTED`.
- Network interruption: stop accepting new guesses. Lens may preserve its local
  ribbon inertly; browser hides/clears an incomplete public projection. Neither
  merges it after recovery, which enters a new `applyRound` after reconnection.
- Sequence gap: log expected and received numbers. A browser-observed painter
  gap closes/re-subscribes so its new connection ID triggers authoritative
  recovery; a Lens-observed browser gap applies/sends one reset in place and
  completes receive-policy resync. `round.resync.request` is reserved for a
  healthy-channel point-count mismatch. No path invents missing geometry.
- Rate or payload warning: stop the probe, record the evidence, and reduce the
  cap before continuing.
- Unsupported Snap Cloud access: the spike fails. Do not hide the failure with
  prerecorded network behavior.
- Browser inspection can reveal bundled choices. The project makes no
  anti-cheat or confidential-state claim.

## 10. Visual system

### Palette roles

- Ultraviolet violet: live path and primary identity.
- Warm lemon: active draw head and countdown accent.
- Mint: connected and correct.
- Coral: incorrect and recoverable error.
- Warm ivory: readable labels and neutral answer cards.
- Deep plum: browser background only; never relied upon to darken Lens Preview.

### Lens view

The room carries a short violet path, one lemon draw head, one prompt label,
one countdown, and a small connection indicator. Hands are not required to be
visible. Saturated geometry and literal color/state changes carry every beat.

### Browser view

The browser uses one large live canvas and a roomy 2×2 answer grid. Answer
targets remain large at phone width. Mint and coral states combine color,
border/icon, and text so meaning is not color-only.

### Payoff

The north-star image suggests an illustrated snake transformation. Production
does not copy that behavior. The exact sampled stroke is scaled and translated
into a medallion, accompanied by the revealed word. The deterministic before
and after must be visibly causal.

## 11. Visual-reference interpretation

The ChatGPT image in `docs/references/visuals/` is the compositional north star:
it best explains the relay, answer state, and glyph payoff. The high-resolution
Gemini image is the palette and control-size companion. The alternate Gemini
image contributes only its restrained stroke and compact prompt/timer framing.

All three are inspiration, not assets. Production implementation deliberately
cuts their expensive or dishonest implications: volumetric particles,
occlusion, perfect free-space splines, opaque dark Lens panels, duplicate
timers, and semantic icon generation.

## 12. Day-1 feasibility spike

### Probe

1. Start from a fresh Spectacles Lens Studio project.
2. Confirm the project target and the currently documented compatible package
   versions.
3. Confirm whether the account has usable Snap Cloud Realtime access.
4. Create the smallest Lens script that sends one changing normalized point.
5. Create the smallest browser page that plots the point and sends one fixed
   guess event.
6. Make the Lens change a visible rectangle or label when that event arrives.
7. Record Lens Preview, browser, logs, message count, payload size, and observed
   round-trip latency together.

### Pass condition

- A real changing Lens-origin coordinate is visible in the browser.
- A real browser-origin event changes Lens Preview state.
- At least ten seconds of continuous updates complete without disconnect,
  transport warning, sequence error, or manual replay.
- Median and worst observed round-trip latency are recorded; interaction is
  judged usable only from the captured evidence.
- The proof is reproducible after restarting both surfaces.

### Failure decision

If Snap Cloud access or bidirectional exchange cannot pass within the first
implementation block, stop the Relay build. The project owner then chooses
between the already-reviewed alternatives: colocated WORDLESS Duo through
Sync Kit, or Split the Table. No feature work from Relay begins before that
choice.

## 13. Testing and evidence strategy

- Pure unit tests for WordlessEngine transitions, answer validation, timer
  expiry, and `applyRound` reset behavior.
- Pure tests for quantization, simplification, point/byte caps, ordering,
  duplicate rejection, and malformed messages.
- Browser component tests for join, waiting, answer disabled, incorrect,
  correct, disconnected, and narrow-viewport states.
- Lens Preview runtime logs for every state transition and message boundary.
- A recorded end-to-end proof for Lens→browser points and browser→Lens guess.
- Visual capture review at additive-washed and bright-room conditions.
- A public-release evidence table mapping every submitted claim to a capture,
  log line, test, or source.

## 14. Submission-story target

The eventual video remains under sixty seconds and opens in medias res:

1. Split view already shows the wearer drawing and the browser receiving it.
2. Role labels establish `PAINTER` and `GUESSER` immediately.
3. Browser taps a wrong answer; both surfaces react in coral.
4. Browser taps the correct answer; both surfaces turn mint and reveal the word.
5. The exact scribble locks into a glyph medallion.
6. A short proof beat shows Lens Studio, the browser, and the realtime exchange.
7. End card states the Preview simulation and the measured, supported claims.

This is a story target, not evidence that the behavior currently exists.

## 15. Design authority and amendment rule

This document supersedes the remote two-Spectacles architecture in the Fable
research memo. Research may inform implementation but cannot override this
design. Material changes to transport, participant model, result authority,
visual payoff, or first-block scope require owner approval and an amendment in
`docs/prompt-log.md` before implementation.
