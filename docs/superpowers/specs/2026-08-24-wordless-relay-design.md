# WORDLESS Relay — approved design

**Status:** Approved by the project owner on 2026-08-24
**Phase:** Pre-implementation
**Theme:** Connect
**Decision:** Build a Spectacles-to-browser relay, gated by a realtime spike

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
  validated engine or transport events.
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
- **ResultView** applies mint/coral feedback and shows the same normalized glyph
  medallion published by the Lens.

### Realtime service boundary

`RelayTransport` is an adapter boundary, not game logic. Snap Cloud Realtime is
the preferred first adapter because its official examples document
bidirectional Lens↔web cursor exchange. The spike decides whether access,
runtime compatibility, latency, and capture quality are sufficient.

No second transport may be introduced without recording an architecture
amendment in the prompt log and confirming that its use complies with the
contest and Lens runtime requirements.

## 6. Data flow

### Join

1. Lens creates or selects a short session code.
2. Browser enters the code and joins the matching realtime channel.
3. Both surfaces display a literal connected state only after receiving a
   counterpart-presence event.

### Round start

1. `applyRound` resets both local stores through the engine.
2. Lens chooses one word from a curated deck and constructs four choices.
3. Lens keeps the correct index local and publishes the choices, round ID, and
   duration.
4. Lens shows `DRAW: <WORD>`; browser shows `GUESS THE CLUE` and the choices.

### Drawing

1. Lens renders every accepted world-space sample locally.
2. StrokeSampler emits bounded batches of normalized `{x, y}` points with a
   monotonically increasing sequence number.
3. Browser ignores stale duplicates, detects gaps, and renders accepted points.
4. A stroke-end message freezes drawing input; the round remains active for
   guesses while time remains.

### Guess and result

1. Browser may guess while the stroke is arriving or after it ends. It sends
   `{roundId, choiceIndex}` and disables that card while awaiting the result.
2. Lens rejects stale, malformed, or duplicate guesses.
3. WordlessEngine compares the choice against its local correct index.
4. Lens publishes a literal `correct` or `incorrect` result.
5. Incorrect feedback uses coral, keeps that card disabled, and leaves the
   remaining choices active while time remains.
6. Correct feedback uses mint, reveals the word on both surfaces, freezes the
   exact path, and normalizes it into the shared session glyph medallion.

## 7. Protocol contract

Every message carries:

- `version`
- `type`
- `sessionId`
- `roundId`
- `senderId`
- `sequence`
- type-specific payload

Minimum message types:

- `presence.ready`
- `round.start`
- `stroke.begin`
- `stroke.points`
- `stroke.end`
- `guess.submit`
- `round.result`
- `round.reset`

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
  -> INCORRECT -> ACTIVE
  -> CORRECT
  -> GLYPH_LOCKED
  -> READY
```

Connection loss moves either participant to `DISCONNECTED`. A reconnect during
the first implementation resets through `applyRound`; it does not attempt to
merge partial strokes. `ACTIVE` permits drawing and guessing concurrently;
stroke end closes only drawing input. Timeout ends the round without creating a
glyph.

## 9. Error handling and honesty

- Invalid session code: remain on JoinView with a short literal error.
- Counterpart absent: show `WAITING FOR PLAYER`, not `CONNECTED`.
- Network interruption: stop accepting new guesses, preserve the local drawing
  for display, and offer a round reset after reconnection.
- Sequence gap: log expected and received numbers; request/reset the current
  round rather than invent missing geometry.
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
