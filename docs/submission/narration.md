# WORDLESS Relay — narration script

Status: **GENERATED AND MIXED — SPOKEN AUDIO OWNER-SIGNED-OFF**
(recut candidate `254945f2…`, 2026-08-30). One narration line per beat, matching the time
ranges in `docs/submission/video-edl.md`. Written for a warm, down-to-earth male read
(Chris), with deliberate room for product sound and pauses. Narration never
carries information the captions or visuals fail to show, cites no exact test
count (exact numbers live in captions and cards, where they can be updated),
and is bound by `docs/evidence/claim-ledger.md`.

**Audio verification — OWNER-SIGNED-OFF (2026-08-30).** For the recut candidate
(`254945f2`) the narration was **re-mixed from the eight frozen MP3 inputs
without any new generation** (mono; gentle compression + dynamic loudnorm), and
the mixed track was measured (integrated **−16.12 LUFS**, true peak **−1.75
dBTP**; no trailing silence; a beat-structured envelope). No reviewer tool can
perceive audio, so the complete-cut reviewers recorded the spoken evaluation as
tool-unperceivable rather than substituting this text. The **owner then
listened end to end** and confirmed the eight intended lines, the Chris voice,
delivery, per-beat timing, no clipping (including the final word "together"),
and no audible defects — clearing the audio blocker.

Beat 5 note: the shipped `line-05.mp3` (SHA `71d3c5cc…`) is the regenerated
reworded line matching both the beat-5 caption and the script row below ("a
fresh round begins"); a stale `lines.json` record that still held the earlier
"new stroke color" text/hash was corrected. The spoken words of every line —
beat 5 included — were confirmed by the owner listen-through (2026-08-30).

`docs/submission/wordless-relay-en.srt` is the **spoken-narration transcript**:
its cue text is this eight-beat script (SRT files cannot carry a header
comment, so the note lives here). It is a DISTINCT artifact from the shorter
burned lower-third captions in the recut video (which are editorial summaries —
e.g. beat 1 burns `One draws in space — a friend guesses in a browser.`, while
the SRT/script reads `One draws a clue in midair — the same stroke arrives in a
friend's browser.`). The burned lower-thirds are not a verbatim transcript of
the spoken words, and are not required to be. No reviewer tool can perceive
audio, but the owner listen-through confirmed the spoken lines; the SRT's cue
timings remain nominal targets from the 59-second timeline (the burned captions
are the authoritative on-screen text).

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

Used for the accepted candidate's narration generation (2026-08-30). The voice
ID resolved to the named voice and the provider/model/settings below were the
generation parameters; provider, voice name/ID, model, settings, SDK version,
generation date, and output hashes are recorded in ignored local metadata, and
the ElevenLabs key was never exposed. The spoken-audio verification is complete:
the owner listen-through (2026-08-30) confirmed the spoken narration (see the
status note above).

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
Chris narration is owner-required, finalization is not labelled complete without
it. **This rule is now satisfied:** generation and mixing succeeded, and the
owner listen-through (2026-08-30) confirmed the spoken narration on `254945f2…`,
so narration is no longer a blocker. The video also remains fully
caption-readable, so the cut communicates without audio as well.
