# Realtime spike evidence

- Result: **GO** — the prospectively armed exact-window Run B correction passed
  the cadence envelope with persistent per-point `UpdateEvent`-gap coverage.
  The bidirectional, rejection, visual-continuity, limits, and restart evidence
  below also remains passing. Gate 0 is closed.
- Observed date: 2026-08-26 PT
- Lens Studio/package versions: Lens Studio `5.23.2.26081320`;
  `SupabaseClient` `2.1.0` (bundled supabase-js commit `5a6c9c2`);
  Spectacles Interaction Kit package descriptor `2.0.0` with Preview print
  `SIK Version : 0.18.0`; Spectacles UIKit `2.0.0`
- Browser toolchain: `@supabase/supabase-js` `2.112.4`, Vite `8.2.2`,
  TypeScript `6.0.3`, Vitest `4.1.11`
- Service/project mode: ordinary hosted Supabase Realtime public Broadcast
- Realtime/public-channel setting label: `Allow public access to channels`,
  observed enabled together with Realtime
- Client-safe key type: publishable; no key value is recorded here
- User-auth step: none on either client
- Free-project wake/resume check: active and not paused; no resume action was
  required
- Channel status sequence: Lens `CLIENT_CONFIGURED` → `CHANNEL SUBSCRIBED`;
  browser `CONNECTING` → `SUBSCRIBED · WAITING FOR LENS` → `CONNECTED`
- Lens → browser continuous duration: at least 10.000 seconds in every
  accepted cadence window; browser recordings enclosing the four independent
  visual-continuity sets ran for 60.003, 90.005, 60.007, and 90.002 seconds
- Browser → Lens outcomes: choice 1 produced coral `TRY AGAIN`; choice 2
  produced mint `CORRECT`, both after Lens `RX_GUESS`
- Invalid payload rejection count: exactly 11
- RTT median / p95 / maximum: 86 / 106 / 111 ms
- Largest valid message / total valid messages: 122 bytes / 2,943 in the
  fifty-ping run
- Exact-rerun final meter: `CONNECTED`, 2,528 Lens messages, 2,528 valid
  inbound / 2 valid outbound, 2,530 total messages, 304,558 serialized bytes,
  and largest valid message 122 bytes
- Restart reproduction: PASS

## Literal cadence rule

The corrected probe uses one phase-locked 100 ms point cadence and a second
100 ms gate at actual FIFO send start. It emits at most one point send per
callback, rebases after a delay of two or more periods, and allocates wire
sequence, point ordinal, timestamp, and telemetry only when a send actually
starts. A bounded queue remains the single outbound path.

For the exact-window correction, a persistent gap tracker is seeded with the
same finite monotonic subscription timestamp that starts point cadence. It
observes every subscribed `UpdateEvent`, including after the separate one-shot
10-second sampler reports. At each actual point-send start it drains the
maximum gap accumulated since the prior start without resetting the previous
update timestamp. Consequently the numeric telemetry attached to point
ordinals `start+1..end` covers every update gap crossing the exact 100 point
intervals, including gaps that straddle a point-start boundary. Non-finite or
reversing clocks fail closed.

For each accepted window, `F` is the maximum consecutive `UpdateEvent` gap in
the same authoritative Lens epoch, `B = F + 1 ms`, and `F < 100 ms`. A fresh
ordinal-1 window must span `10,000..10,000+B ms`; a prospectively armed
mid-run window must span `10,000-B..10,000+B ms`. These bounds account for one
frame of observation without retrospectively selecting a favorable window.

| Run | Lens ordinal/sequence window | `F` / `B` | Lens source span | Browser source / arrival span | Observed rates |
| --- | --- | ---: | ---: | ---: | ---: |
| A | 1–101, contiguous | 45 / 46 ms | 10,021 ms | 10,019 / 10,017.6 ms | 9.979 / 9.981 / 9.982 Hz |
| B, prospective exact rerun | 958–1,058, contiguous | exact 48 / 49 ms; armed `B=46` | 10,000 ms | 10,000 / 10,001.5 ms | 10 / 10 / 9.998500224966255 Hz |
| Restart | 1–101, contiguous | 48 / 49 ms | 10,015 ms | 10,012 / 10,012.1 ms | 9.985 / 9.988 / 9.988 Hz |

Run A, the exact Run B rerun, and restart satisfy the approved maintained-10-Hz
envelope. Run B was prospectively armed with Run A's already-passing `B=46`
before its outcome was known. Lens ordinal/sequence 958 began at
14:00:11.203 PT, monotonic 96,298 ms; ordinal/sequence 1,058 ended at
14:00:21.203 PT, monotonic 106,298 ms. The 101 values were contiguous. Lens
and browser source spans were exactly 10,000 ms; browser arrival span was
10,001.5 ms. Per-point gap telemetry for ordinals 959–1,058 covered the exact
100 intervals and produced `F=48 ms`, hence exact `B=49 ms`. The spans pass
both the prospectively frozen `B=46` envelope `[9,954, 10,046] ms` and the
exact-window `B=49` envelope `[9,951, 10,049] ms`. Gap, terminal, and
nonmonotonicity diagnostics were all zero, and the post-window warning/error
count was zero.

The earlier uninterrupted Run B cumulative window at ordinals/sequences
1,855–1,955 is retained as corroborating evidence but is superseded as the
accepted B table row. It spanned 10,017 ms at Lens source, 10,016 ms at browser
source, and 10,009.5 ms at browser arrival, for 9.983 / 9.984 / 9.991 Hz. Its
epoch had previously emitted
`UPDATE_GAP_MAX sampleCount=333 maxGapMs=66 spanMs=10010`, and its frozen spans
passed both the predeclared `B=46` envelope and same-epoch `B=67` envelope.
Independent review nevertheless correctly rejected it as the exact-window
proof because the one-shot gap sampler had completed before that later window;
a cumulative span alone could conceal a long update gap followed by shorter
intervals. The persistent per-point correction above closes that specific
coverage hole without using the old window to select a favorable result.

None of the three accepted cadence windows had a sequence gap, terminal state,
timeout, RelaySpike/Supabase client/channel warning, or disconnect. Run A's
unrelated Quest/ADB device-discovery warnings remain disclosed in
`docs/prompt-log.md`; this record does not call the editor globally
warning-free.

## Bidirectional and rejection proof

Run A began from fresh Lens Preview and browser subscriptions. Exact Lens
point ordinals 1–101 and browser sequences 1–101 were contiguous. The browser
rendered the changing normalized line while message and byte counters
advanced. Choice 2 contained no outcome field; Lens logged `RX_GUESS` at
08:10:39.296 PT, validated it, and changed the actual Preview widget to mint
`CORRECT` without stopping the point stream.

In the exact post-rejection rerun, choice 1 used valid outbound sequence 1.
Lens logged `RX_GUESS` at 13:58:56.111 PT and the actual Preview result changed
to coral `TRY AGAIN`. The retained still is
`retest-exact-runb-wrong.png`, SHA-256
`9221099c13df043758c9af5250c37f2bc24103bd4ad56cb9bf95e99bfec2e3e9`.
The explicit unchecked Gate 0 test door then sent exactly these malformed
candidates:

1. wrong session `OTHER1`;
2. protocol version 2;
3. sequence zero;
4. stale sequence 1;
5. choice index 9;
6. duplicate guess ID;
7. 65-character ID;
8. string-valued `sentAtMs`;
9. unknown message kind;
10. nine points in one batch; and
11. a padded guess whose serialized UTF-8 size was 1,223 bytes.

Lens emitted exactly 11 `REJECTED` lines from 13:59:08.780 through
13:59:10.310 PT. The oversized candidate was 1,223 serialized UTF-8 bytes.
Browser valid-outbound count stayed at one throughout, and no rejection changed
the visible result or accepted sequence high-water. The next ordinary valid
choice used sequence 2, raised valid outbound to two, and produced Lens
`RX_GUESS` at 13:59:15.647 PT. Preview changed to mint `CORRECT`; the retained
still is `retest-exact-runb-correct.png`, SHA-256
`14a26e6941ff12897ddcac88253022b65b9f751cb4d66f05532abd8443c0a5e2`.
The prospectively armed exact cadence window above remained connected and
contiguous after the matrix.

At the final meter, the browser remained `CONNECTED` with 2,528 Lens messages,
2,528 valid inbound / 2 valid outbound, 2,530 total messages, 304,558 serialized
bytes, and largest valid message 122 bytes. Sequence-gap, terminal-state, and
nonmonotonicity counts were zero.

## Fifty application round trips and limits

Fifty browser pings started at 250.4 ms minimum, 252.3 ms median, and 253.3 ms
maximum spacing while the point stream remained active. Every ping received
its correlated Lens-origin application acknowledgment; client-side
`channel.send() === 'ok'` was not counted as delivery.

- Correlated application acknowledgments: **50/50**
- RTT median: **86 ms**
- RTT p95: **106 ms**
- RTT maximum: **111 ms**
- Largest valid serialized message: **122 bytes**
- Valid inbound/outbound messages: **2,891 / 52**
- Total valid messages / serialized bytes: **2,943 / 351,902 bytes**
- Oversized negative-test message, excluded from valid totals: **1,223 bytes**
- Continuity tail: **496 points over 49,479.5 ms**, with no gap, terminal
  state, or discontinuity
- Dropped guesses or acknowledgments: **0**
- Repeat disconnects inside the accepted run: **0**

The measured median and p95 are inside the Gate 0 GO thresholds, every valid
message is below 1 KB, and the accepted visual samples have no interval above
one second. The conditional 5 Hz branch was not needed.

## Restart reproduction

The prior Vite and isolated Chrome processes were terminated and ports 5175
and 9334 were confirmed empty. New Vite and Chrome/profile processes plus a
fresh Preview run produced new unauthenticated subscriptions:
`CLIENT_CONFIGURED` at 08:22:24.111 PT and `CHANNEL SUBSCRIBED` at
08:22:24.457 PT. Exact point ordinals and browser sequences 1–101 were
contiguous inside the cadence bounds above. Choice 2 produced Lens `RX_GUESS`
at 08:22:40.652 PT and actual mint `CORRECT`. The final browser meter remained
`CONNECTED` at 1,576 inbound / 1 outbound messages, 1,577 total messages,
189,422 bytes, and largest valid message 122 bytes. The fresh processes were
then terminated, Preview was paused, and both ports were again empty.

## Visual sampling and capture manifest

Ordinary macOS window recording freezes Lens Studio's Preview GPU subregion.
The accepted proof therefore uses direct Lens Studio MCP Preview screenshots,
targeted every 500 ms, plus a continuous ordinary-browser recording that
fully encloses each screenshot set. These are timestamped frames from the real
Preview surface, not a claim of continuous Preview video. Each of the four
independent accepted sets contains 22 distinct images spanning more than ten
seconds with maximum completion gaps below one second:

| Set | Frames | Span | Maximum gap | Distinct hashes | Frame-content aggregate SHA-256 |
| --- | ---: | ---: | ---: | ---: | --- |
| Run A overlap | 22 | 10,483 ms | 545 ms | 22/22 | `bb4734cfc1782ff90bffb473d8730675433d1a86b812f001912bbd615c436c1d` |
| Run B matrix | 22 | 10,491 ms | 517 ms | 22/22 | `315f331a715cedbc248b92ff1fad4e3ddcebdb007bc2bfa5f2f08515f30a88e6` |
| Run B pings | 22 | 10,499 ms | 516 ms | 22/22 | `19a3cfda315569d89b4873878f2da2b57eedfceab74d988453921c66dc067e11` |
| Restart | 22 | 10,490 ms | 518 ms | 22/22 | `290e2a81f0cfaf8488b15ed65e4e0fb735162f6a5656ab19f0e086f8cae26f32` |

The exact Run B correction also has a supplemental direct MCP sample fully
inside its exact browser window: 22/22 distinct completed frames over 9,448 ms,
with completion gaps from 431 through 484 ms. Its digest-only frame-content
aggregate is
`7f36b44a91337254a7644a8a3baa65a72bfb52abf75107f053409395eb890e8d`.
The operator confirmed that the earlier `e3f8…` value was a wrong
filename-inclusive representation; the 22 frame files themselves were
unchanged. This 9,448 ms sample is corroborating exact-window imagery only. It
does **not** meet the independent visual-set requirement of at least ten
seconds, and no such claim is made. The four accepted sets above continue to
supply the required visible-continuity proof.

Run A's first and last Preview frames both show mint `CORRECT`, while the
violet point cursor moves visibly across the surface. The earlier Run B set
includes an actual coral `TRY AGAIN` frame; its subsequent actual mint
`CORRECT` still is `retest-runb-correct-visible.png`, SHA-256
`9be87a04ec47056c5865235ddf951a13d899b0c55a8cc1ef20837804b66c1ff7`.
The exact rerun's coral and mint stills are identified in the bidirectional
section. Its browser-window midpoint image is
`retest-exact-runb-window-browser-mid.png`, SHA-256
`efe5029985188b41da54504889dc8f1532cb2d93de66ebc8d93749797270f1a4`.
Restart ends on actual mint `CORRECT`. Separate screenshots show the real Lens
Logger panel.

All artifacts below are local ignored evidence under
`captures/realtime-spike/`; none is committed. The four independent recordings
are silent H.264 at 1792×2162; the supplemental exact-window recording is H.264
at 1880×2250. The manifests record exact screenshot call/completion timestamps
and names.

| Browser recording | Duration | SHA-256 | Screenshot manifest SHA-256 |
| --- | ---: | --- | --- |
| `retest-runa-overlap-browser.mov` | 60.003333 s | `2d3ddaa5b7015d5b48e349be61c5b9743665fed5a21c4a695beea43fb3694789` | `0d6f7943f2d71266ea9571da3de772d2022eecfcbebc14e23183d89fd7fdd92f` |
| `retest-runb-matrix-browser.mov` | 90.005000 s | `b4b66b96388d54f5c6ca1516873ca32570195f3de5d55fd610897b4b4bf3eb41` | `95d66b0aac97dbaca86a8e5c3fc9ba97e60e1a52d5c8ab1484ce7f83a7e6df5a` |
| `retest-runb-pings-browser.mov` | 60.006667 s | `2d37f2648d4c7dcf75cd3980a9bfb157b9d20d47652a08de2bede57b59e822f3` | `bff027212c9902298606aca19ac87ee5f956351fad8ba66ed33ad7edc2a7ec95` |
| `retest-restart-browser.mov` | 90.001667 s | `e8f744389aac84291c41f7893b418fd85117bc417de6b0169144c5982eb3ca92` | `54d9fd52fc8036777dc54fa9b7dca1a8cab5a2ab56c117eb300c8d12e0b7a160` |
| `retest-exact-runb-window-browser.mov` (supplemental) | 59.990 s | `2a0d4815ac4162dd64254138ea9deceaf9f2127b850b313594f4286dc16e240e` | `036694602aa601c8c8a6c426665e10a67d4dcc5e0d4f051aa5b28d6551a94ace` |

The browser recording timestamps enclose their corresponding screenshot sets.
Root recomputed the four independent video and manifest hashes, verified their
codec/dimensions/durations with `ffprobe`, confirmed 22/22 unique screenshots
per set, and visually inspected the beginning/end and result-state evidence.
The exact-window movie, manifest, midpoint, and 22-frame sample were likewise
verified with the values above. Each frame-content aggregate is reproducible
by sorting that set's filenames, SHA-256 hashing each file, concatenating only
those 64-character digests one per line, and SHA-256 hashing that stream. The
earlier final real Logger screenshot is `retest-final-logger.png`, SHA-256
`83f608d0c9da877df02c8b2bca5e96551dfb454f43e480d339aff181fb82ac70`.
The exact rerun Logger screenshot is `retest-exact-runb-logger.png`, SHA-256
`ba7bc5f9de7f91b16f586a475b2259f7366561ecdd43d0901d7a96f60403c40d`.

## Superseded attempts and adjudication

The initial pre-rotation attempt is retained in `docs/prompt-log.md`. Its
observed accepted traffic was 8.36–8.70 messages/s, so independent review
correctly rejected it even though the timer was nominally 100 ms. Its frozen
recorded Preview pane also could not establish the visual-freeze criterion.
Those results were never substituted for the accepted evidence above.

The active-key retest ledger also retains these failed attempts:

1. paused Preview produced no new Lens epoch or browser traffic;
2. ordinary Preview-panel refresh did not reset runtime and retained old
   ordinals;
3. a long editor-code screenshot sampler timed out, so direct MCP Preview
   screenshot calls were used instead;
4. several direct-sampler/browser recordings did not overlap and were
   rejected;
5. one prolonged non-accepted session eventually received browser WebSocket
   close 1006 after 5,317 messages; it did not repeat in fresh Run A, Run B,
   or restart, so it does not meet the plan's **repeat disconnect** NO-GO
   threshold; and
6. one tight 40-second recorder ended before a late sampler and was rejected;
   and
7. during final pre-commit verification, one forced compile-plus-log collection
   caused two rapid Preview resets and the canceled old epoch emitted
   `CHANNEL_ERROR`; a later isolated fresh subscription also reached
   `CLIENT_CONFIGURED` but not `SUBSCRIBED` before `CHANNEL_ERROR`. That
   attempt also contained unrelated Quest/ADB discovery warnings. A separate
   browser Supabase client then joined successfully, independently confirming
   the Free project was awake. The next ordinary fresh Preview produced
   `CLIENT_CONFIGURED` at 08:39:33.227 PT, `CHANNEL SUBSCRIBED` at
   08:39:33.704 PT, active point traffic, and
   `UPDATE_GAP_MAX sampleCount=330 maxGapMs=79 spanMs=10030`, with no
   RelaySpike error or channel warning in that epoch.

No failed attempt supplied a metric or frame to an accepted evidence window.
The close-1006 occurrence and later failed subscription are disclosed rather
than erased. Neither is a repeated connected-channel disconnect: the former
did not recur in fresh Run A, Run B, restart, or final clean verification, and
the latter never reached `SUBSCRIBED`. The accepted connected runs are the
basis for the plan's literal repeat-disconnect decision.

The credential-bearing preflight image from the first attempt was deleted
immediately and never staged or committed. The client-safe publishable key was
rotated afterward. All retained artifacts were rescanned and contain no
publishable, secret, JWT-shaped, or service-role credential pattern.

## Secret-free Lens log excerpt

These are exact sanitized message bodies from accepted Run A and the earlier
Run B matrix; only Lens Studio's timestamp/source prefix is omitted.

```text
[RelaySpike] CLIENT_CONFIGURED
[RelaySpike] CHANNEL SUBSCRIBED
[RelaySpike] POINT_START ordinal=1 monotonicMs=465
[RelaySpike] UPDATE_GAP_MAX sampleCount=452 maxGapMs=45 spanMs=10020
[RelaySpike] RX_GUESS
[RelaySpike] REJECTED
[RelaySpike] RX_GUESS
```

The exact rerun retains the same secret-free message shape and appends only the
numeric `updateGapMaxMs` field to each `POINT_START` line. Across exact
ordinals 959–1,058 its maximum was 48 ms. No payload, coordinate, channel,
project, or credential value appears in that telemetry.

## Claim boundary

This is one Lens Studio Preview client and one ordinary browser using Supabase
Realtime public Broadcast. The exact-window correction and the retained
evidence above make Gate 0 a GO for this simultaneous relay path in Preview.
This is simulated submission proof only, not hardware footage or a Spectacles
device test. It does not prove remote play, production security, durable
persistence, multi-player scale, production readiness, or platform latency
guarantees.
