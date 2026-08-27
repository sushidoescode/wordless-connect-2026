# Visual polish evidence ledger

Every row binds a visual decision to a non-circular reviewed source revision,
the input that exposed the defect, independent review, the smallest accepted
change or retain rationale, and fresh proof. Captures remain local and ignored.

| Date / task | Reviewed source revision | Input evidence | Independent review and observed defect | Smallest change or retain rationale | Fresh proof | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-27 / Task 13 visual payoff | Baseline `3ad1afd` + 17-file source-manifest SHA-256 `cc891025b419f77748761de07b6152235e6154bc3ac4c98a27f244c28de9d51f` | Bright pre-pass `dcfa1e9df58614a37d2760f7d0ae361b48f4adba67c8b449c48874a90f500818`; medium pre-pass `11f103da9fb3df7834cc17ae091b73c4e0d8f3ff5ff16ae90ad74d20aa9056b1` | Lens reviewer: non-exact fractional endpoints and omitted source depth. Browser reviewer: render ticks replaced nodes/animations; live motion-preference changes, resize mapping, and render failures could break presentation lifecycle. Initial judged screenshots also made prompt/result/replay hierarchy too small. | Exact endpoint branches; full glyph-visual inverse transform plus depth tween; stable keyed browser nodes and generation-scoped scheduling; fixed 220/180/450/160 ms motion with dynamic reduced-motion completion; original scale/spacing and coral `#FF786A` changes only. Retained primitive path, additive UI, no dark panels or semantic redraw. | Simultaneous bright combined movie `f328f0e68b2c2703104ee66549cafda3cbef40f8b0773df2fcfd4dd5c5ddb6a2`; paired transition sheet `9b40978e59ee1f4135de3d7ac8844a494f59a98efc48e1ca5ae5cce44a4dd4fc`; medium four-state sheet `87a74871615f45e57c490690c3f8a35af2b28a03a1ee696173918a4c9e17c763`; exact 32-point live/lock equality; 294 core, 98 web, build 55, E2E 30, Lens compile/runtime and typecheck clean | **PASS** |

## Task 13 notes

- The reference images stayed under `docs/references/visuals/` and were never
  imported or copied into runtime output.
- The first medium-room capture timed out before the answer beat, and two
  earlier attempts had no valid connected stroke. They remain rejected rather
  than being used as proof.
- The final Preview evidence is simulated. It makes no hardware, device-test,
  remote-play, production, persistence, security, scale, or general latency
  claim.
- Full scoring, capture hashes, frame timing, exact-count evidence, and the
  Chromium-only residual are in `docs/evidence/visual-review.md`.
