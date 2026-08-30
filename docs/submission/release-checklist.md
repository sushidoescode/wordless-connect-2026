# WORDLESS Relay — release checklist

Statuses: `RECORDED` (already true, with evidence), `PENDING` (not yet
verified), `OWNER GATE — OPEN` (blocked on an explicit owner decision). No row
may move past `PENDING` without the exact measurement or evidence reference
recorded in this file or the linked evidence document. Authority:
`docs/superpowers/specs/2026-08-29-wordless-submission-review-amendment.md`
(§3–7) and the owner-approved finalization handoff.

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
| Session value | Fresh six-character session run per the demo runbook; the Lens/browser session value matches the committed capture-session code (a coordination value, not a credential or security boundary) | PENDING | — |
| Lens environment | Spectacles target, clean compile, active Lens Studio Preview (simulated), Sunlit Room environment confirmed through Lens Studio MCP | PENDING | — |
| Screen hygiene | One foreground browser tab, split-screen framing, visible pointer, no notifications, no credential-bearing windows | PENDING | — |

## 3. Video technical gates (from the exported candidate)

| Gate | Requirement | Status | Measured |
| --- | --- | --- | --- |
| Duration | At least 58.5 and below 60.000 seconds; target 59.000 | PASS | 59.000 s |
| Video stream | Sole video stream H.264, 1920×1080, yuv420p, square-pixel, 60/1 fps | PASS | H.264, 1920×1080, yuv420p, SAR 1:1, 60/1 fps |
| Audio stream | AAC at 48 kHz | PASS | AAC, 48000 Hz |
| Frame count | Decoded frame count matches the declared 60 fps duration exactly | PASS | 3540 decoded = 3540 expected |
| Decode | Clean full ffmpeg decode with no error | PASS | clean full decode, no error |
| Faststart | Top-level MP4 atom order places `moov` before `mdat` | PASS | moov @ 32 before mdat @ 95630 |
| Loudness | Integrated loudness within −17 to −15 LUFS (target −16); true peak no higher than −1.5 dBTP | PASS | −16.89 LUFS; true peak −1.67 dBTP |
| Black intervals | `blackdetect` finds no unplanned black interval of 0.25 s or longer | PASS | 0 black intervals |
| Silent tail | `silencedetect` finds no unplanned tail of 0.50 s or longer | PASS | no trailing silence ≥ 0.5 s |
| Hash | Final candidate SHA-256 recorded here and in the EDL | RECORDED | `18f7ce9a9b0b72c761ecc36e844cde4487ff4b88f6f7de4222d3bb814a73b5b5` |
| Burned captions | At least 42 source pixels high, inside five-percent safe margins, unobscured, at least 4.5:1 contrast against the scrim | PENDING | — |
| Playback inspection | Watched end to end at 1440×810 laptop playback and at 390 px phone width | PARTIAL | Reviewed frame-by-frame at 960-wide extracts across 21 timestamps (Stage A/B panels); 1440×810 and 390 px live playthrough remains an owner check |
| Verifier | `tools/media/verify-wordless-video.mjs` passes as the single checked entry point; parsed measurements recorded here | PASS | all checks ok:true (see measurements above) |

## 4. Frame and story gates (per `docs/submission/video-edl.md`)

| Gate | Requirement | Status | Observed |
| --- | --- | --- | --- |
| 00.0 open | Split-screen roles, active shared stroke, `LENS STUDIO PREVIEW — SIMULATED` disclosure at frame zero | PASS | verified at t01 |
| 04.0–09.0 | Uncut browser wrong action; bilateral coral stroke response; caption exactly `WRONG · BOTH STROKES GO CORAL` | PASS | verified at t05–t07 |
| By 14.0 | Correct state, mint feedback, and revealed word visible | PASS | visible by ~9 s |
| Before 20.0 | Both exact-path glyph medallions complete and holding | PASS | both medallions from ~9 s, holding through 20 s |
| 20.0–26.0 | Clean reset and palette beat | PASS | fresh round + palette swatches; caption `Play again — a fresh round begins` |
| Split screen | Lens/browser split continuously visible 00.0–51.0; both product panes remain visible (insets acceptable) during CLAD/validation beats; 51.0–59.0 end card sole full-frame exception | PASS | split screen 00.0–51.0; both panes held under CLAD/validation cards; end card 51.0–59.0 |
| Disclosure ranges | `LENS STUDIO PREVIEW — SIMULATED` readable on every Preview-bearing segment; observed ranges recorded in the EDL | PASS | disclosure 00.0–51.0 |
| End card | 51.0–59.0 original end card, complete audio, no clipped copy | PASS | end card 51.0–59.0, sign-off narration, no clip |

## 5. Complete-cut two-stage panel (amendment §5)

| Gate | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Panel composition | Three fresh, context-isolated multimodal reviewers; one fixed two-stage prompt; verbatim answers stored under `local-handoff/reviews/task16/` (ignored) | PASS | 3 reviewers each stage; answers in `local-handoff/reviews/task16/stageA-results.md`, `stageB-results.md` |
| Stage A (blind, muted) | Each reviewer receives only the complete final MP4, muted, neutral questions, cited timestamps; at least two of three independently identify: one side draws and the other guesses; the browser guess changes the shared result; the exact shared mark becomes the glyph | PASS | 3/3 identified all three points |
| Stage A freeze | Timestamped Stage A answers frozen and recorded before any supporting text is revealed | PASS | Stage A run and recorded before Stage B docs shown |
| Stage B (claims) | Same reviewers then receive the intended audio version, project description, README first screen, and claim ledger; assess theme fit, role clarity, browser causality, magic-moment timing, spatial necessity, visual finish, CLAD proof, cross-document consistency, and unsupported claims | PASS | 3/3 PASS on the corrected candidate; one prior round found+fixed an unscoped 10 Hz card |
| Blocker rule | An observed credible blocker (visual, causal, accessibility, disclosure, or claim) controls even if a panel majority passes; repairs limited to the smallest demonstrated defect; every repair re-enters the full frame, technical, and two-stage chain | RECORDED (rule) | Amendment §5 |
| Gate composition | Release gating = Task 13 visual-craft row (PASS) + capture/evidence row + passing complete-cut review. The Task 14 five-second row participates only as the recorded waiver: OWNER-WAIVED — NOT PASSING; it is never rerun and no five-second comprehension claim is published | RECORDED (rule); capture/evidence and review PENDING | `docs/evidence/polish-ledger.md`; amendment §2 |

## 6. Full release verification (from the final candidate revision)

| Gate | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Core + web + build | `npm run check` passes | PENDING | — |
| E2E | `npm --prefix web run test:e2e` passes across the 390×844 phone and 1440×900 desktop projects | PENDING | — |
| Lens typecheck | `sh tools/typecheck/check.sh` passes | PENDING | — |
| Hygiene | `git diff --check` clean; branch state inspected | PENDING | — |
| Lens runtime | Via Lens Studio MCP: compile and Console inspection; Lens Studio Preview (simulated) launch in the correct Spectacles target/environment; a visible wrong round; a visible correct round; replay/reset; no new Logger error | PENDING | — |
| Cross-document agreement | README, claim ledger, project description, video EDL, demo runbook, submission checklist, original media, and evidence agree | PENDING | — |

## 7. Secret and history audit gates

| Gate | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Tracked-tree scan | Tracked-tree and prospective-archive secret scans clean | PENDING | — |
| History audit | All-reachable-history audit for secret values, secret-shaped values, absolute home paths, environment/local-only filenames, unsupported active claims, and reference-only material | PENDING | — |
| Narration sidecars | Ignored narration/candidate sidecar checks, including an in-memory exact-byte comparison against the ignored environment value without printing it | PENDING | — |
| Link check | `tools/docs/check-relative-links.mjs` passes on the prospective tree | PENDING | — |
| Two-pass prospective audit | `tools/security/audit-release-history.mjs` on the preliminary and final prospective trees; exit codes: 0 clean, 10 only the exact known blockers, 20 new/blocking finding, 30 audit error; only 0 or 10 may continue to a private local candidate, and 10 still blocks publication | PENDING | — |
| Scan semantics | All scan pipelines use checked exit-status handling: `rg` status 1 is the only clean result, status 0 is a finding, status 2 or greater is an audit failure, never a false clean | RECORDED (rule) | Amendment §7 |
| Local commit boundary | Reviewed-path allowlist staging, staged name/status inspection, a local release-candidate commit, and a hard stop before all external actions; no push occurs during implementation | PENDING | Amendment §6 |

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
