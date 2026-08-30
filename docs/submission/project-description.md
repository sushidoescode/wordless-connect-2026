# WORDLESS Relay — project description

One person draws a clue in midair; a friend guesses it from an ordinary web
browser, and the exact line they drew becomes a small shared emblem — a glyph —
that marks the round they finished together. No typing, no talking: one
stroke, four choices, one shared result.

## Connect theme fit

WORDLESS Relay connects a person, a platform, and a live communication loop.
The painter's side is a Spectacles Lens, demonstrated in Lens Studio
Preview — simulated. The guesser needs nothing but a browser tab — on a phone
or a laptop — yet takes a real, causal part in the same round. The loop is
live in both directions: the stroke streams from the Lens to the browser as it
is drawn, and the browser's guess travels back and visibly changes what the
painter sees. Two people who are not looking at the same screen still share
one drawing, one verdict, and one kept mark.

## Intended audience

Pairs of friends, family members, or collaborators sharing a coordinated
drawing-and-guessing moment: one wearing the painter role, one joining from a
browser. In the recorded evidence both participants ran on one machine and
network; play across different networks or at arbitrary distance is not
claimed.

## Why spatial input matters

The clue is not sketched on a screen — it is a path drawn through the room at
body scale. Arm-length arcs and turns through space give the stroke a
character that finger-on-glass drawing does not, and the drawing exists in the
painter's real surroundings. The browser participant receives a bounded,
normalized two-dimensional view of that spatial path, so the same gesture is
legible on a flat screen without pretending the two surfaces are the same
device.

## How the browser participant changes the result

The browser participant is a player, not a spectator. They watch the stroke
arrive live, then submit one of four answer cards. The browser submits
guesses, never verdicts: the Lens alone validates the choice and publishes the
outcome. A wrong guess turns both strokes coral — the Lens stroke and the
browser path react together. The correct guess brings mint feedback on both
surfaces, reveals the word, and locks the exact sampled path into matching
glyph medallions. The glyph is the exact sampled drawing, deterministically
normalized — no recognition, no redraw, no AI.

## CLAD execution and verification

WORDLESS Relay was built end to end through CLAD as a verified loop: prompt,
code change, a run in Lens Studio Preview — simulated, a run in a real
browser, automated tests, fix. Claims were gated on recorded evidence rather
than intent. At the product freeze the project carried 453 automated tests —
304 core tests, 109 web unit tests, and 40 Playwright end-to-end tests across
390×844 phone and 1440×900 desktop projects — plus a 55-module production
build, a clean Lens typecheck, and 0 Axe violations (automated scan,
Chromium). The measured relay evidence includes an RTT median of 86 ms
(p95 106 ms, maximum 111 ms), measured over 50 pings between the simulated
Lens Studio Preview client and a local browser on one machine and network — an
observed measurement, not a platform latency claim; a sustained 10 Hz point
cadence over the accepted 10-second Gate 0 spike windows; all 11 malformed
test messages rejected without changing the game; and an identical 36-point
glyph hash computed independently on both surfaces. The full records are in
`docs/evidence/realtime-spike.md`, `docs/evidence/vertical-slice.md`, and
`docs/evidence/claim-ledger.md`.

## Limitations and honesty

This is a Lens Studio Preview — simulated proof. It is not Spectacles hardware
footage, a device test, or a real Spectacles capture, and no hardware claim is
made. Coordination uses an ordinary hosted Supabase Realtime public Broadcast
channel on the free plan; the session code is routing and lightweight
concealment, not a credential or security boundary. There is no
authentication, no secure or private channel, no persistence, no accounts, no
matchmaking, and no multiplayer scale — exactly one painter and one guesser.
Production readiness and availability are not claimed; the free-plan backend
can pause between sessions. All recorded play happened on one machine and one
network. Every capability claimed here is bounded by the recorded evidence in
`docs/evidence/claim-ledger.md`.
