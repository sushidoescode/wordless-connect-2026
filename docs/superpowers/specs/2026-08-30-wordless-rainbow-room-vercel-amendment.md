# WORDLESS Relay — rainbow palette, generated rooms, and hosted browser amendment

**Status:** Approved by the project owner on 2026-08-30
**Amends:** `2026-08-24-wordless-relay-design.md` (sections 6, 7, 8, 10, 15),
`2026-08-25-wordless-relay-standard-supabase-amendment.md` (section 4 browser
environment contract), and `2026-08-29-wordless-submission-review-amendment.md`
(section 6 external-action gate, narrowly, as specified below)
**Product direction:** Unchanged — one Lens Studio Preview painter, one
ordinary browser guesser, Lens-authoritative rounds and results, simulated
Preview evidence only

## 0. Owner authority and candidate invalidation

The owner approved this post-freeze iteration on 2026-08-30 with the explicit
understanding that changing the protected runtime/UI invalidates the current
candidate as proof of the new runtime. The prior product freeze `31123d3`
(runtime/UI manifest `bcb3859a…`), the 59-second candidate MP4 (`254945f2…`),
the hero (`72664be3…`), the README render (`45b22483…`), the review-bundle
aggregate (`cc47e6e7…`), and the final review transcripts remain valid
**historical** evidence for the old frozen runtime. They are not deleted,
overwritten, or relabeled; they are marked superseded where the new candidate
becomes authoritative. A new freeze, recapture, technical verification, and a
complete two-stage review panel are required before any new-candidate claim.

This amendment explicitly grants the fresh owner authority that
review-amendment section 4 requires for a post-freeze runtime change.

## 1. Approved decisions

1. Expand the painter palette to eight vivid, fixed, curated colors.
2. Keep semantic feedback colors distinct from painter choices.
3. Generate and display one fresh six-character room code once per Lens
   Studio Preview lifecycle; the code is stable through rounds, replay,
   transport reconnects, and recovery. A full Preview restart creates a new
   code.
4. Host the ordinary-browser guesser at a production `*.vercel.app` URL on
   the free/Hobby tier. The browser keeps manual room-code entry and also
   accepts a valid `?room=ABC123` prefill without auto-joining.
5. Use the hosted production page — not localhost — for the new live relay
   proof and the new submission capture.

The Vercel browser deployment is the sole newly authorized external
publication. No Git push, repository visibility change, history rewrite,
custom domain, paid Vercel resource, video upload, hosted-video URL insertion,
or contest form submission is authorized by this amendment.

## 2. Canonical painter palette (supersedes design section 15 palette set)

The selectable painter palette is exactly this ordered eight-color set. Wire
IDs are lowercase enum members of `StrokeColorId`; the ordered tuple is the
single canonical registry from which every color table on both clients is
derived.

| Order | Wire ID | Visible label | Hex | RGB 0–255 |
|---:|---|---|---|---|
| 1 | `scarlet` | RED | `#FF3B5C` | `255, 59, 92` |
| 2 | `orange` | ORANGE | `#FF982B` | `255, 152, 43` |
| 3 | `lemon` | YELLOW | `#FFD65A` | `255, 214, 90` |
| 4 | `lime` | GREEN | `#A7F43A` | `167, 244, 58` |
| 5 | `cyan` | CYAN | `#2DE2E6` | `45, 226, 230` |
| 6 | `cobalt` | BLUE | `#3B82F6` | `59, 130, 246` |
| 7 | `violet` | VIOLET | `#8B5CF6` | `139, 92, 246` |
| 8 | `magenta` | MAGENTA | `#F04DD8` | `240, 77, 216` |

Semantic colors remain outside the selectable enum and keep their existing
roles:

- coral `#FF786A`: incorrect/failure override — never selectable, never a
  wire color ID;
- mint `#73E6AE`: correct/connected feedback — **removed from the selectable
  enum by this amendment**; `mint` as a `stroke.begin` color ID is now an
  invalid payload;
- ivory `#FFF6E8`: type and selection affordances;
- deep plum `#200B2B`: browser surface.

Rules carried forward unchanged: violet remains the Lens-local default
preference and the fresh-engine default; lemon remains selectable yellow and
retains its timer/draw-head accent role (the lemon draw head remains lemon for
all selections); the browser never invents a color and paints nothing without
an accepted `stroke.begin`; the wrong-guess override temporarily recolors both
live paths coral and then restores the selected base color; selection
affordances are never color-only (bright ivory ring plus scale).

If actual additive Preview evidence shows one approved painter value is
unreadable or too similar to a semantic color, only the smallest value
adjustment is made, preserving wire ID and label, with before/after
measurements recorded in `docs/prompt-log.md` and this table updated. Colors
are not added, removed, or reordered without new owner direction.

### Lens palette layout

The Lens palette becomes a compact two-row/four-column spectrum — top row red,
orange, yellow, green; bottom row cyan, blue, violet, magenta — anchored
around the current palette location after measuring the existing
HUD/prompt/brush bounds through Lens Studio. Each hit target is at least as
large as the current swatch target; at least 15% of one target width remains
as clear space between adjacent targets; the grid must not overlap the
prompt, timer, connection state, room code, resting brush, stroke area, or
glyph. The existing 1.08× hover and 1.15× selected scales are preserved, the
selected swatch keeps a bright ivory ring affordance, and all targets lock
after the first accepted stroke begin and unlock under the existing
replay/reset policy.

## 3. Protocol v3 (supersedes the design section 7 version literal)

The wire protocol version becomes `3`. The expanded validated color enum is
not compatible with v2 receivers, so both clients switch atomically and reject
every other version, exactly as v2 rejected v1: `parseRelayMessage` returns
null for any non-v3 envelope, with no dual-version compatibility stack, no
negotiation, and no migration messages.

Everything else in the section 7 contract is unchanged: the
`stroke.begin { strokeId, colorId }` payload shape, the single color binding
per stroke, and every bound — normalized integer coordinates in `0..1000`,
128 points per stroke, batches of at most 8 points, at least 100 ms between
point-batch send starts, and 1,024 serialized ASCII bytes per message. The
maximal-message re-proof must use the longest new enum member (`scarlet` /
`magenta`, 7 characters). Rejected color payloads now include `mint`, `coral`,
`ivory`, `plum`, every removed or unknown token, CSS values, RGB arrays, and
hex strings.

## 4. Generated room code (supersedes the fixed scene session code)

- A pure shared helper `Assets/Wordless/Scripts/Core/RoomCode.ts` owns
  generation and normalization. Generated codes are exactly six uppercase
  characters from the unambiguous alphabet
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 characters; no `I`, `O`, `0`, `1`).
- Validation remains the existing six-character `[A-Z0-9]{6}` public
  contract everywhere (generate-narrow, validate-wide): manually supplied
  valid codes, including legacy fixtures, remain parseable on both clients.
- Generation accepts an injectable random source for deterministic boundary
  tests. The code is probabilistic coordination, not cryptographic
  uniqueness, not authentication, not privacy, and not a security boundary.
  The join form is not a login and rooms are not secure rooms.
- The Lens composition root generates the code exactly once per composition
  lifecycle, before the first `relay.connect()` and before any
  `ensurePolicy()` (which the first `applyRound` triggers via
  `setLocalRound`). The transport's effective session ID is assigned before
  policy creation and never mutates afterward or during recovery; the
  existing `policySessionId` guard continues to fail closed on later
  mutation. Transport reconnects reuse the same code and topic.
- The effective room is exposed through a read-only relay accessor; views
  never infer or generate it. The channel topic remains
  `wordless-relay:<room>`.
- The Lens HUD gains a dedicated bright line `ROOM · ABC123`, rendered from
  the composition root, separate from connection status text. Routing state
  does not enter `RoundStore`.
- A full Preview restart generates a new lifecycle value without any global
  uniqueness claim. A browser joined to a previous lifecycle's room does not
  silently attach to the new one; the existing honest waiting/reconnecting
  presentation covers that stranded state, and rejoining requires reloading
  the page and entering the new code.
- The previously committed fixed scene value (`EOU4LZ`) is superseded: the
  generated code always overwrites the scene-authored `sessionId` input
  before any policy creation. The scene input remains only as an inert
  serialized default, never trusted at runtime.

## 5. Browser room entry (amends design section 6 join flow)

The current join form remains the only connection gate. A focused helper
(`web/src/room-prefill.ts`) computes the initial input value with this
precedence:

1. exactly one valid normalized `?room=` query value;
2. otherwise one valid optional `VITE_RELAY_SESSION_ID` development fallback;
3. otherwise blank.

Duplicate or malformed query values are ignored and never reflected into the
page. A valid query only prefills; it never auto-joins. Manual entry remains
editable and its normalized value is authoritative on submit. No accounts and
no authentication.

## 6. Hosted browser on Vercel (amends the supabase amendment section 4 and the review amendment section 6, narrowly)

The compiled static browser (`web/dist`) is deployed to one production
`*.vercel.app` URL on a free/Hobby project (preferred name
`wordless-relay-connect`; the generated name is acceptable). The repository
root gains a `vercel.json` build contract preserving repository-root build
context (the web build imports shared code from `../Assets`), `.vercel/` is
git-ignored, and a restrictive `.vercelignore` excludes credentials, captures,
exports, `local-handoff/`, and Lens caches/generated editor state. The
preferred deployment path builds the exact clean freeze locally and deploys
only the audited static `web/dist` output through the authenticated Vercel
CLI, so no repository source, `.env`, capture, or private handoff content is
uploaded.

Only `VITE_SUPABASE_URL` and the Supabase publishable/public client key are
embedded in the hosted bundle, by design. No production
`VITE_RELAY_SESSION_ID` is set: the Lens-generated room code is the value the
user enters. The ElevenLabs key, Supabase secret keys, and service-role keys
have no role in the hosted app and never appear in Vercel configuration. A
redacted `web/.env.production.example` records only the two variable names.
The existing public-build and prospective-tree audits run against the exact
deployed build; environment values are compared in memory and never printed.

The hosted live proof runs Lens Studio Preview against the production URL and
must show: a newly generated room on the Lens; HTTPS reachability with no
fixed room prefill; manual entry joining the exact Lens topic and `?room=`
prefill waiting for explicit Join; presence/ack releasing only the
Lens-authored round; all eight painter colors crossing and rendering
correctly; coral wrong-guess and mint correct feedback with reveal, exact
sampled glyph, and replay; browser reload/reconnect using the existing
authority-preserving recovery path without inventing a round; a Preview
restart changing the displayed room with the stale browser room not silently
attaching; and logs free of product errors and credential/local-path values.

Hosted RTT/payload behavior is measured with the existing Gate 0 method
(fifty correlated 250 ms-spaced pings, paired events only, ≥10 s uninterrupted
stream). The hosted median and p95 must meet every absolute Gate 0 bound and
remain within 30% of the recorded local baseline (median 86 ms, p95 106 ms —
ceilings 111.8 ms and 137.8 ms). A same-machine hosted proof supports only a
narrowly worded hosted-origin observation, never remote play, multi-network
operation, security, scale, or production readiness.

## 7. Freeze, recapture, and judged-package reset

After source and Vercel configuration are final: run the full verification
suites; commit a new product freeze and compute the protected runtime/UI
manifest; build and deploy that exact freeze; complete the hosted live proof;
capture a fresh clean split-screen recording from the exact production browser
and exact frozen Lens Preview; assemble a new 59-second candidate and re-run
every technical check; bind or regenerate narration and stop for the owner's
final end-to-end listen-through; extract a new hero and re-render the README
first screen; rebuild and hash the immutable review bundle and aggregate
using the actual overlay renderer and narration provenance (never an SRT as
the caption-source component); run a new visual-craft review and a fresh
three-reviewer complete-cut panel (Stage A blind/muted with answers frozen
before context; Stage B with the exact bundle, README, project description,
and claim ledger, each reviewer recomputing the aggregate); reconcile every
tracked document only to newly observed facts; and rerun the two-pass
prospective-tree/history audit proving the audited tree equals committed
`HEAD^{tree}`.

Task 15's exact-128 and correct-while-points-queued subcases may remain
honestly PARTIAL. Task 14 remains OWNER-WAIVED — NOT PASSING and is never
re-adjudicated. Any code or configuration fix after the freeze requires a new
freeze, redeploy, and proof.

## 8. Claim boundaries

All existing claim boundaries stand. Additionally: the room code is described
only as routing/light concealment; the hosted page is described only as a
hosted-origin observation with its measured, bounded numbers; and no claim of
remote play, different-network operation, uptime, security, scale, or
production readiness is made. Preview footage is never called hardware
footage, a device test, or a real Spectacles capture. Evidence names Supabase
Realtime, never Snap Cloud.
