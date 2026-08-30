# WORDLESS Relay — narration script

Status: **CONFORMED — generated and mixed into the accepted candidate**
(`18f7ce9a…`, 2026-08-30). One narration line per beat, matching the time
ranges in `docs/submission/video-edl.md`. Written for a warm, down-to-earth male read
(Chris), with deliberate room for product sound and pauses. Narration never
carries information the captions or visuals fail to show, cites no exact test
count (exact numbers live in captions and cards, where they can be updated),
and is bound by `docs/evidence/claim-ledger.md`.

`docs/submission/wordless-relay-en.srt` is the working caption copy for this
script. SRT files cannot carry a header comment, so its DRAFT status is
recorded here: its cue timings are targets from the approved 59-second
timeline and must be re-timed against the generated audio; the final burned
captions must match the final spoken words exactly.

## Script

| Beat | Target range | Narration line | Delivery note |
| --- | --- | --- | --- |
| 1 | 00.0–04.0 | One draws a clue in midair — the same stroke arrives in a friend's browser. | Easy, unhurried open; let the split screen do the work. |
| 2 | 04.0–09.0 | A wrong guess — and both strokes go coral. | Small beat of amusement; pause before "coral" so the color change lands on screen. |
| 3 | 09.0–14.0 | The Lens is the referee. The right answer lands — mint, and the word is revealed. | Lift slightly on "the right answer lands". |
| 4 | 14.0–20.0 | The exact path they made locks into a shared glyph. No recognition. No redraw. | Slow, plain, deliberate on the last two sentences. |
| 5 | 20.0–26.0 | Then they play again — a fresh round begins. | Light and quick. (Reworded from an earlier "new colour" line, which the captured replay round did not show.) |
| 6 | 26.0–42.0 | WORDLESS was built as a verified loop — prompt, change, simulated Lens Studio Preview, real browser, test, fix. Hundreds of automated tests behind one small game. | Steady list rhythm; long pauses between phrases while the proof cards carry the exact numbers. |
| 7 | 42.0–51.0 | We measured the relay end to end, rejected malformed messages without changing the game, and tested the defined round and recovery transitions. | Matter-of-fact; the measured-limits cards carry the figures. |
| 8 | 51.0–59.0 | WORDLESS Relay. Draw in space. Guess from a browser. Keep the mark you made together. | Slow sign-off over the end card; full stop between each phrase; no rush to the out. Matches the end-card wording exactly. |

About 125 spoken words across 59 seconds, leaving room for product
sound and silence inside beats 5–7.

## Voice metadata

To be confirmed against the official service before generation — the voice ID
must still resolve to the named voice, and the current official SDK/API
instructions must be verified and the resolved SDK version pinned in ignored
metadata before any credits are spent.

- Provider: ElevenLabs (the owner's account)
- Voice: Chris — Charming, Down-to-Earth
- Voice ID: `iP95p4xoKVk53GoZ742B`
- Model: `eleven_multilingual_v2`
- Settings: stability 0.45, similarity boost 0.8, style 0.15, speed 1.0
- Output loudness target: approximately −16 LUFS integrated, true peak no
  higher than −1.5 dBTP (final measurement gated in
  `docs/submission/release-checklist.md`)
- At most one full regeneration pass without a new owner spend decision
- Record provider, voice name/ID, model, settings, SDK version, generation
  date, and output hashes in ignored metadata; save only narration text, safe
  metadata, and output audio

If generation or voice-identity verification fails, preserve a fully
caption-readable cut and report narration as an isolated blocker; because the
Chris narration is owner-required, finalization is not labelled complete
without it.
