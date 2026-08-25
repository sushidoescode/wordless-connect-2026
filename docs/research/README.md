# Research index and authority

Research in this folder informed the decision but is not an implementation
contract. When documents disagree, authority is:

1. `AGENTS.md`
2. The approved WORDLESS Relay design specification
3. This reviewed research index
4. Historical research artifacts

The reviewed competitive synthesis is preserved in
`competitive-audit-2026-08-24.md`.

## Fable 5 memo

`fable-connect-verdict-original.md` is the unmodified memo supplied by the
project owner. It is retained for traceability.

Its strategic recommendation to pursue WORDLESS survived review, but its
load-bearing remote architecture did not. Current official Spectacles
Connected Lenses documentation describes Spectacles-to-Spectacles experiences
as colocated in the same physical space. Its “different rooms” Sync Kit design,
“100 KB per property” wording, targeted owner-event implication, and private
synced-state implication must not be implemented or repeated.

## Verified technical correction

- Current Connected Lenses are colocated:
  <https://developers.snap.com/spectacles/about-spectacles-features/connected-lenses/overview>
- Multiple Lens Studio Preview panels can simulate connected clients:
  <https://developers.snap.com/spectacles/about-spectacles-features/connected-lenses/building-connected-lenses>
- Sync Kit limits are 100 KB per message and 350 messages per rolling five
  seconds:
  <https://developers.snap.com/spectacles/spectacles-frameworks/spectacles-sync-kit/features/payload-and-rate-limits>
- Snap Cloud Realtime documents bidirectional Lens↔web communication:
  <https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/realtime>
- Snap's basic Realtime Cursor example sends tracked Lens coordinates to a web
  client and receives web cursor changes:
  <https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/examples/basic-setup>
- Snap documents another Lens-plus-web application pattern:
  <https://developers.snap.com/spectacles/about-spectacles-features/snap-cloud/examples/web-app>

Snap Cloud is labeled alpha. These documents establish a plausible path, not
proof that this account has access or that the intended interaction performs
well. The design therefore begins with a recorded feasibility spike.

## Competitive conclusion

The official Organize winner, PackSpace, and the prospective Guide entry
Sensei share a useful pattern: a second actor contributes task-critical input
on the interface natural to that person, while the wearer performs the spatial
part on Spectacles. A companion website is valuable only when the Lens cannot
complete the same social workflow alone.

- Official Organize announcement:
  <https://www.reddit.com/r/Spectacles/comments/1vti09a/week_1_of_the_clad_summer_hackathon_is_officially/>
- PackSpace repository: <https://github.com/r3d5/PackSpace>
- Sensei repository: <https://github.com/r3d5/sensei-spatial-guide>
- Sensei authoring app: <https://sensei-guide-sand.vercel.app/>
- Official challenge and judging criteria:
  <https://lenslist.co/clad-summer-hackathon>

Guide winners had not been announced when this review was written on
2026-08-24. Sensei, Lighting Assistant, Site Sweep, VolleyMate, Lingo Specs,
Pathfinder, and Learn in a Room were treated as a broad public competitive
field, not a verified entrant list or final placement forecast.

## Convergence conclusion

Air drawing, Pictionary, and charades are convergent concept families. The
project makes no first-ever claim. Its defensible combination is one Specs
painter, one browser guesser, bidirectional realtime causality, and the exact
drawing becoming a shared session medallion. If the demo omits either the
browser-caused Lens response or the deterministic glyph lock, the concept
collapses into generic AR drawing.
