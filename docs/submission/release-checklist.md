# WORDLESS Relay — release checklist

Statuses: `RECORDED` / `PASS` (verified true, with evidence — `PASS (recut)`
notes a gate met by the recut candidate), `PARTIAL` (partly verified),
`PENDING` (not yet verified), `BLOCKED — NOT PASSING` (a real gap recorded, not
substituted), `FAIL` (a measured miss), and `OWNER GATE — OPEN` (blocked on an
explicit owner decision). No row may move past `PENDING` without the exact
measurement or evidence reference recorded in this file or the linked evidence
document. Authority:
`docs/superpowers/specs/2026-08-29-wordless-submission-review-amendment.md`
(§3–7) and the owner-approved finalization handoff. The current candidate is the
**recut** `wordless-relay-final-59s-v2.mp4` (`254945f2…`), rebuilt from the
frozen raw with no recapture; the runtime/UI manifest is unchanged.

## 1. Runtime/UI freeze binding

| Gate | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Product-freeze commit | Freeze commit recorded before capture | RECORDED | `31123d34006bb740f397a1bfc467925483e66955` |
| Runtime/UI manifest hash | SHA-256 of the tracked runtime/UI manifest recorded at the freeze | RECORDED | `bcb3859a5580774b1a9b92a6ec773c9fe48fd4581ca4cd7dc77f699c0fa46705` (manifest and method in `local-handoff/execution/freeze-record.txt`, local/ignored) |
| Freeze integrity at candidate bind | No tracked runtime/UI-manifest file changed after the freeze commit; re-verified when the release candidate is bound | PASS | manifest recomputed to `bcb3859a…a46705` after helper-package cleanup; `Assets/Scene.scene` byte-identical to the freeze |
| Invalidation rule | Any runtime/UI-manifest change after capture begins invalidates the cut and every dependent candidate; requires fresh owner authority, a new freeze, full source verification, recapture, technical inspection, and a complete §5 review rerun | RECORDED (rule) | Amendment §4 |

## 2. Pre-capture gate

| Gate | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Clean worktree | Worktree clean at recording | PASS | helper packages removed via Lens Studio MCP before capture; tracked worktree clean (candidate/media/narration stay ignored under captures/) |
| Session value | Fresh six-character session run per the demo runbook; the Lens/browser session value matches the committed capture-session code (a coordination value, not a credential or security boundary) | RECORDED (original capture) | session `EOU4LZ` matches the committed scene code; the recut reuses the frozen raw `split-screen-master.mov` (no new capture) |
| Lens environment | Spectacles target, clean compile, active Lens Studio Preview (simulated), Sunlit Room environment confirmed through Lens Studio MCP | RECORDED (original capture) | the frozen raw is one live connected Preview (simulated) round; the recut re-composites it with no recapture |
| Screen hygiene | One foreground browser tab, split-screen framing, visible pointer, no notifications, no credential-bearing windows | RECORDED (original capture) | owner-cleaned desktop at the original capture; the recut edits only the frozen raw + overlays, so no new screen exposure |

## 3. Video technical gates (from the exported candidate)

| Gate | Requirement | Status | Measured |
| --- | --- | --- | --- |
| Duration | At least 58.5 and below 60.000 seconds; target 59.000 | PASS | 59.000 s |
| Video stream | Sole video stream H.264, 1920×1080, yuv420p, square-pixel, 60/1 fps | PASS | H.264, 1920×1080, yuv420p, SAR 1:1, 60/1 fps |
| Audio stream | AAC at 48 kHz | PASS | AAC, 48000 Hz |
| Frame count | Decoded frame count matches the declared 60 fps duration exactly | PASS | 3540 decoded = 3540 expected |
| Decode | Clean full ffmpeg decode with no error | PASS | clean full decode, no error |
| Faststart | Top-level MP4 atom order places `moov` before `mdat` | PASS | moov @ 32 before mdat @ 95646 (recut candidate) |
| Loudness | Integrated loudness within −17 to −15 LUFS (target −16); true peak no higher than −1.5 dBTP | PASS | recut candidate −16.12 LUFS; true peak −1.75 dBTP (mono; compressor + dynamic loudnorm on the 8 MP3 mix) |
| Black intervals | `blackdetect` finds no unplanned black interval of 0.25 s or longer | PASS | 0 black intervals |
| Silent tail | `silencedetect` finds no unplanned tail of 0.50 s or longer | PASS | no trailing silence ≥ 0.5 s |
| Hash | Final candidate SHA-256 recorded here and in the EDL | RECORDED | recut candidate `captures/task16/wordless-relay-final-59s-v2.mp4` SHA-256 `254945f2977a69221c30b13e0f6cde7cd9af95d8097b6bc61529688c496050c1` (supersedes `18f7ce9a…` for caption legibility / no-obscuring / contrast; reproducible via `captures/task16/recut.mjs`) |
| Burned captions | At least 42 source pixels high, inside five-percent safe margins, unobscured, at least 4.5:1 contrast against the scrim | PASS (recut) | Measured on the recut `254945f2`: caption/card main cap height **46–48 px** (≥42); every overlay sits in a plum band **below** both panes — measured pane-bottom-to-overlay gaps of **~48 px** (cards) and **~87 px** (captions), so nothing overlaps a pane, stroke, or glyph; contrast ivory 16.9:1 / coral 7.1:1 / mint 11.9:1 / **lemon eyebrows 12.8–12.9:1** (the failing violet header replaced with lemon); title-safe margins met on every caption and card (the over-long "no redraw" line was shortened to fit). |
| Playback inspection | Watched end to end at 1440×810 laptop playback and at 390 px phone width | PASS (recut) | 1440×810 and 390 px frame inspection of the recut: all captions/cards, answer states, medallions, and disclosure legible; the core story reads at phone width. The left Lens in-world HUD stays small/low-contrast (inherent to the frozen raw capture; not fixable without a recapture, which is out of scope). A live end-to-end owner playthrough remains a courtesy check. |
| Verifier | `tools/media/verify-wordless-video.mjs` passes as the single checked entry point; parsed measurements recorded here | PASS | all checks ok:true (see measurements above) |

## 4. Frame and story gates (per `docs/submission/video-edl.md`)

| Gate | Requirement | Status | Observed |
| --- | --- | --- | --- |
| 00.0 open | Split-screen roles, active shared stroke, `LENS STUDIO PREVIEW — SIMULATED` disclosure at frame zero | PASS | verified at t01 |
| 04.0–09.0 | Uncut browser wrong action; bilateral coral stroke response; caption exactly `WRONG · BOTH STROKES GO CORAL` | PASS | verified at t05–t07 |
| By 14.0 | Correct state, mint feedback, and revealed word visible | PASS | visible by ~10.3 s (recut; caption onset == visual onset) |
| Before 20.0 | Both exact-path glyph medallions complete and holding | PASS | both medallions from ~10.3 s, holding through 20 s |
| 20.0–26.0 | Clean reset and palette beat | PASS | fresh round + palette swatches; caption `Play again — a fresh round begins` |
| Split screen | Lens/browser split continuously visible 00.0–51.0; both product panes remain visible (insets acceptable) during CLAD/validation beats; 51.0–59.0 end card sole full-frame exception | PASS | split screen 00.0–51.0; both panes held under CLAD/validation cards; end card 51.0–59.0 |
| Disclosure ranges | `LENS STUDIO PREVIEW — SIMULATED` readable on every Preview-bearing segment; observed ranges recorded in the EDL | PASS | disclosure 00.0–51.0 |
| End card | 51.0–59.0 original end card, complete audio, no clipped copy | PASS | end card 51.0–59.0, sign-off narration, no clip |

## 5. Complete-cut two-stage panel (amendment §5)

| Gate | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Panel composition | Three fresh, context-isolated multimodal reviewers; one fixed two-stage prompt; verbatim answers stored under `local-handoff/reviews/task16/` (ignored) | PASS — review complete | final two-stage panel run on the exact `254945f2` + final bundle (aggregate `cc47e6e7…`); three fresh isolated reviewers each verified the SHA, self-decoded the actual MP4, and recomputed the bundle; COMPLETE verbatim transcripts in `local-handoff/reviews/task16/final3-reviewer-1.md` … `final3-reviewer-3.md` (earlier panels retained: `final-panel-verbatim.md`, `recut-review-verbatim.md`, `stage-a-actual-mp4-verbatim.md`, `stage-b-narrated-verbatim.md`) |
| Stage A (blind, muted) | Each reviewer receives only the complete final MP4, muted, neutral questions, cited timestamps; at least two of three independently identify: one side draws and the other guesses; the browser guess changes the shared result; the exact shared mark becomes the glyph | PASS | 3/3 on the exact `254945f2`; each verified the SHA and self-decoded the actual muted MP4, identified all three points + the exact `WRONG · BOTH STROKES GO CORAL` caption, and confirmed captions/cards no longer obscure the panels, stroke, or glyph |
| Stage A freeze | Timestamped Stage A answers frozen and recorded before any supporting text is revealed | PASS | Stage A run and recorded before Stage B docs shown |
| Stage B (claims) | Same reviewers then receive the intended audio version, project description, README first screen, and claim ledger; assess theme fit, role clarity, browser causality, magic-moment timing, spatial necessity, visual finish, CLAD proof, cross-document consistency, and unsupported claims | PASS | 3/3 STAGE B: PASS on the exact `254945f2` + final bundle. Each reviewer independently recomputed the bundle aggregate `cc47e6e7…` (all 19 components match; no SRT as caption source), confirmed cross-document consistency and no banned/overclaims, and the Lens as correctness authority. Reviewers can't perceive audio and stated so; the **owner listen-through (2026-08-30)** confirmed the spoken lines, so the audio blocker is cleared. |
| Blocker rule | An observed credible blocker (visual, causal, accessibility, disclosure, or claim) controls even if a panel majority passes; repairs limited to the smallest demonstrated defect; every repair re-enters the full frame, technical, and two-stage chain | RECORDED (rule) | Amendment §5 |
| Gate composition | Release gating = Task 13 visual-craft row (PASS) + capture/evidence row + passing complete-cut review. The Task 14 five-second row participates only as the recorded waiver: OWNER-WAIVED — NOT PASSING; it is never rerun and no five-second comprehension claim is published | PASS | Task 13 visual-craft PASS; capture/evidence loop PASS; complete-cut review PASS (Stage A 3/3 + Stage B 3/3 on the exact `254945f2`); Task 14 five-second row **OWNER-WAIVED — NOT PASSING** (never rerun, no five-second claim published). `docs/evidence/polish-ledger.md`; amendment §2 |

## 6. Full release verification (from the final candidate revision)

| Gate | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Core + web + build | `npm run check` passes | PASS | core 393 tests, web unit 109, `tsc` clean, vite build 55 modules / 253 KB (2026-08-30; +10 fail-closed audit regressions this pass) |
| E2E | `npm --prefix web run test:e2e` passes across the 390×844 phone and 1440×900 desktop projects | PASS | 40/40 passed across both viewports (2026-08-30) |
| Lens typecheck | `sh tools/typecheck/check.sh` passes | PASS | exit 0 (2026-08-30) |
| Hygiene | `git diff --check` clean; branch state inspected | PASS | `git diff --check` clean; on `main`, tracked worktree clean apart from this correction |
| Lens runtime | Via Lens Studio MCP: compile and Console inspection; Lens Studio Preview (simulated) launch in the correct Spectacles target/environment; a visible wrong round; a visible correct round; replay/reset; no new Logger error | PASS (from the capture) | verified live at the capture/freeze: Preview compiled and connected with `errors: []`, live 5/5 fault matrix over real Supabase; the accepted candidate is a recording of one live connected round and three independent Stage A reviewers confirmed the visible wrong round, correct round, and replay/reset in it. Not re-driven now to avoid disturbing the owner-arranged capture desktop. |
| Cross-document agreement | README, claim ledger, project description, video EDL, demo runbook, submission checklist, original media, and evidence agree | PASS | reconciled 2026-08-30 to the recut candidate: single video SHA `254945f2` everywhere, duration 59 s, **outcome CANDIDATE ASSEMBLED WITH KNOWN RESILIENCE GAPS**, **spoken audio OWNER-SIGNED-OFF**, EDL observed columns set to the recut facts, SRT clarified as the intended spoken transcript. The final fresh Stage B panel (3/3) independently confirmed cross-document numeric consistency and no overclaims. |

## 7. Secret and history audit gates

| Gate | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Tracked-tree scan | Tracked-tree and prospective-archive secret scans clean | PASS | `tools/security/audit-prospective-tree.mjs` (content-based text detection — no extension allowlist) on the prospective tree: 0 env-value leaks, 0 blocking findings; the 25 secret-shaped hits are all the auditors' own patterns / synthetic fixtures / the plan's documented commands, each exempted only by its exact enumerated (rule, path, label) tuple. Tree IDs + reports under ignored `captures/task16/`. |
| History audit | All-reachable-history audit for secret values, secret-shaped values, absolute home paths, environment/local-only filenames, unsupported active claims, and reference-only material | RECORDED (known allowlist) | No real credential value in tracked tree/history; the three reference images and the two historical home-path commits (`4cffae0`/`4dc5751`) are the known allowlist; reference images reachable via `f3b91b0`, deleted in `3da2b81`. Public-history remediation remains OWNER GATE — OPEN (see §8). |
| Narration sidecars | Ignored narration/candidate sidecar checks, including an in-memory exact-byte comparison against the ignored environment value without printing it | PASS | the wrapper reads `.env` / `web/.env.local` in memory and calls `auditReleaseHistory` in-process (env values never serialised); `env-value-leak` compared against every tree blob and all 70 supplied sidecars → 0 hits. **Comparison threshold:** only env values ≥12 characters are searched (rationale documented in `tools/security/audit-release-history.mjs`): every real credential here is long (ELEVENLABS_API_KEY 51, VITE_SUPABASE_URL 40, VITE_SUPABASE_PUBLIC_KEY 46 — all compared); the only sub-threshold value is the 6-char non-secret session code `VITE_RELAY_SESSION_ID`, intentionally committed in the scene, so comparing it would false-positive on legitimate content. Verified separately that no env value appears in any generated report. |
| Link check | `tools/docs/check-relative-links.mjs` passes on the prospective tree | PASS | `ok:true` on the authored tree (generated/ignored dirs — `Cache/`, `Support/`, `node_modules`, `web/dist`, `captures`, `local-handoff` — excluded; those are untracked) |
| Two-pass prospective audit | `tools/security/audit-release-history.mjs` on the preliminary and final prospective trees; exit codes: 0 clean, 10 only the exact known blockers, 20 new/blocking finding, 30 audit error; only 0 or 10 may continue to a private local candidate, and 10 still blocks publication | PASS | two-pass run via the safe wrapper `tools/security/audit-prospective-tree.mjs` (calls `audit-release-history.mjs` in-process): preliminary prospective tree and committed HEAD tree both exit 0 (clean of real findings); committed HEAD tree proven identical to the audited candidate tree. Tree IDs + reports preserved under ignored `captures/task16/`. Wrapper logic — fail-closed partition, content-based whole-buffer text detection, and fail-closed `ls-tree -z` / object-id retrieval (unsafe filename, malformed record, cat-file/sidecar read failure all → exit 30, never a silent empty) — covered by `tools/core-tests/prospective-tree-audit.test.mjs` (39 tests). |
| Scan semantics | All scan pipelines use checked exit-status handling: `rg` status 1 is the only clean result, status 0 is a finding, status 2 or greater is an audit failure, never a false clean | RECORDED (rule) | Amendment §7; the prospective-tree audit uses the auditor's typed exit codes (0/10/20/30), not an unchecked `rg` negation |
| Local commit boundary | Reviewed-path allowlist staging, staged name/status inspection, a local release-candidate commit, and a hard stop before all external actions; no push occurs during implementation | PASS | reviewed-path staging + `git ls-files`/status inspection proving `local-handoff/`, `.env*`, `captures/` stay ignored/absent; local commit only; hard stop before every external action (Amendment §6) |

## 8. Owner gates

Each row below requires its own explicit owner decision. An early request,
silence, or approval of one item is never approval of another.

| Gate | Item | Status |
| --- | --- | --- |
| Privacy blocker | `docs/research/competitive-audit-2026-08-24.md` remains tracked pending an owner decision on deletion or publication | OWNER GATE — OPEN |
| Privacy blocker | `docs/research/fable-connect-verdict-original.md` remains tracked pending an owner decision on deletion or publication | OWNER GATE — OPEN |
| History lineage | Three external reference images (`docs/references/visuals/wordless-relay-chatgpt-north-star.png`, `docs/references/visuals/wordless-relay-gemini-ui-reference.jpeg`, `docs/references/visuals/wordless-relay-gemini-alternate.jpeg`) are deleted from HEAD but remain reachable in history. Removal from HEAD is necessary for the release tree but not sufficient for a public-history audit; public release is blocked pending the owner's lineage decision | OWNER GATE — OPEN |
| Hosted video link | The demo-video link in README/description remains a placeholder until the owner authorizes hosting and supplies a stable URL | OWNER GATE — OPEN |
| Authority 1 | Rewriting history or creating a clean public lineage | OWNER GATE — OPEN |
| Authority 2 | Pushing any commit | OWNER GATE — OPEN |
| Authority 3 | Changing repository visibility | OWNER GATE — OPEN |
| Authority 4 | Uploading the final video, inserting a hosted URL, and submitting the hackathon form | OWNER GATE — OPEN |
