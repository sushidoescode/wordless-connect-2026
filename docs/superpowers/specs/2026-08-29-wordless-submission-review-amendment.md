# WORDLESS Relay — submission review amendment

**Status:** Approved by the project owner on 2026-08-29
**Amends:** `2026-08-24-wordless-relay-design.md` (section 14 story target) and
`docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md`
(agent-native polish-loop rule, requirement coverage map, Tasks 14–16, the
execution graph annotation, and the completion definition)
**Scope:** Submission-review gates, final video timeline, release staging and
push policy, and audit command semantics
**Product direction:** Unchanged

## 1. Trigger and authority

On 2026-08-28 the owner closed the Task 14 five-second comprehension gate by
explicit waiver after a genuinely unfamiliar human correctly identified the
drawing/guessing game, both roles, the shared drawing, and the multiple-choice
interaction from the silent v8 clip, while not narrating the wrong-guess beat.
The owner judged a five-second silent excerpt an invalidly short evaluation
artifact for this submission: it cannot carry the complete wrong → correct →
glyph story the judged entry is actually scored on, and the recut/review loop
had become disproportionate. On 2026-08-29 the owner approved a
submission-first finalization plan. This amendment records the resulting
binding changes to the tracked plan. It imports no private competitive or
judge research.

## 2. Task 14 disposition

- Task 14 remains **closed by owner waiver, not passed**: waived, never
  relabeled as a pass. Its `docs/evidence/polish-ledger.md` row is defined as
  **OWNER-WAIVED — NOT PASSING**.
- The five-second clip is not re-adjudicated, recut, or re-paneled. No
  five-second comprehension claim may be published anywhere.
- The existing v8 media, hashes, two strict LLM passes, and the human response
  remain honest historical evidence and keep their recorded status.
- As a release gate, the Task 14 silent-comprehension row is **replaced** by
  the complete-cut acceptance protocol in section 5. Release gating now
  requires the visual-craft row, the capture/evidence row, and a passing
  complete-cut review of the final candidate; the Task 14 row participates
  only as the recorded waiver.

## 3. Approved 59-second timeline

Task 16's earlier EDL (in-medias-res by 03.0, wrong beat complete by 05.0,
dual mint by 13.5) is superseded. The approved complete-story timeline is:

| Time | Story obligation |
| --- | --- |
| 00.0–04.0 | Immediate split-screen roles, shared live line, four choices |
| 04.0–09.0 | Browser chooses wrong; authoritative bilateral coral stroke response |
| 09.0–14.0 | Browser chooses correctly; mint response and word reveal |
| 14.0–20.0 | Exact sampled path locks as matching glyph medallions |
| 20.0–26.0 | Replay/reset and a concise palette beat |
| 26.0–42.0 | CLAD process and implementation proof |
| 42.0–51.0 | Validation, measured limits, and honest constraints |
| 51.0–59.0 | Original end card and one-sentence promise |

Numeric acceptance gates measured from the exported file, frame by frame:

- Correct feedback and the revealed word are visible by 14.0 seconds.
- Matching glyph medallions are visible and holding before 20.0 seconds.
- The Lens/browser split screen is continuously visible from 00.0 through
  51.0 seconds. During CLAD/validation beats both product panes remain visible
  (insets are acceptable); the 51.0–59.0 original end card is the **only**
  full-frame exception. This is the exact interpretation of the owner's
  direction to keep split screen throughout.
- `Lens Studio Preview — simulated` is readable on every segment containing
  Preview footage, from frame zero onward.
- The wrong-beat caption is `WRONG · BOTH STROKES GO CORAL`. The Lens stroke
  and the browser path react; the caption never says both screens.

## 4. Runtime/UI freeze and invalidation

- After the product-freeze commit, tracked runtime/UI-manifest files may not
  change. Any runtime/UI-manifest change after capture begins **invalidates
  the cut** and every dependent candidate artifact, and requires fresh owner
  authority, a new freeze, full source verification, recapture, technical
  inspection, and a complete rerun of the section 5 review.
- A video, audio, caption, end-card, or hero change requires re-export, all
  technical checks, and both review stages. A substantive README-first-screen,
  project-description, or claim-ledger change requires a fresh Stage B claims
  review while the Stage A result stays bound to the unchanged video hash.
  Evidence-only appendix additions may proceed after a recorded non-impact
  diff check. No reviewed claim is ever updated silently.

## 5. Complete-cut acceptance protocol

This protocol replaces the stale five-second human re-gate and the
single-reviewer judge gate wherever the plan referenced them.

- Use one fixed two-stage prompt with three fresh, context-isolated multimodal
  reviewers. Store the prompt and verbatim answers under the ignored path
  `local-handoff/reviews/task16/`. A human participant is welcome but **not
  required**; independent review of the complete candidate is required.
- **Stage A is blind and muted:** each reviewer receives only the complete
  final MP4, watches it with audio muted, answers neutral comprehension
  questions, and must cite timestamps. At least two of three must
  independently identify:
  - one side draws and the other side guesses;
  - the browser guess changes the shared result;
  - the exact shared mark becomes the glyph.
- The timestamped Stage A answer is frozen/recorded before any supporting
  text is revealed. No project description, README, claim ledger, research,
  or coached question precedes it.
- **Stage B follows only after Stage A is fixed:** the same reviewer then
  receives the intended audio version, project description, README first
  screen, and claim ledger, and assesses theme fit, role clarity, browser
  causality, magic-moment timing, spatial necessity, visual finish, CLAD
  proof, cross-document consistency, and unsupported claims.
- A blocker must cite a timestamp or file section and the violated acceptance
  rule. **An observed credible blocker controls even if a panel majority
  passes**: any credible visual, causal, accessibility, disclosure, or claim
  blocker, claim overreach, missing Preview disclosure, or demonstrably
  confusing causal edit blocks acceptance regardless of vote.
- Repairs are limited to the smallest demonstrated evidence or clarity
  defect; no feature work. Every repair re-enters the full frame, technical,
  and two-stage review chain.

## 6. Release staging and push policy

- The executable `git push origin main` is **removed** from Task 16. No push,
  upload, visibility change, hosted-link insertion, or form submission occurs
  during implementation; each remains a separate owner-gated Task 18 action.
- Task 16's broad staging command is replaced by an explicit reviewed-path
  allowlist, staged name/status inspection (`git diff --cached --name-status`
  plus `git diff --cached --check`), a local commit, and a hard stop before
  all external actions.
- The completion definition's former requirement that the release-candidate
  commit is pushed is replaced by: the private release-candidate commit exists
  locally and every external action remains blocked pending Task 18's
  granular approvals.

## 7. Audit command semantics

Task 15's negated scan commands (`! rg …` and negated pipelines) — and any
equivalent later release-audit scan — are replaced with checked exit-status
handling: `rg` status 1 is
the only clean result, status 0 is a finding, and status 2 or greater is an
**audit failure**, never a false clean. Use a helper equivalent to:

```sh
require_no_rg_match() {
  if rg -l "$@"; then
    echo "forbidden filename match" >&2
    return 1
  else
    scan_rc=$?
    if test "$scan_rc" -eq 1; then return 0; fi
    return "$scan_rc"
  fi
}
```

Checked semantics also apply to `git ls-files | rg …` pathname audits: the
`git ls-files` exit status must be verified and an `rg` status of 2 or
greater fails the audit.

## 8. Reconciliation list

The following stale bindings in the implementation plan are amended by this
document:

1. Agent-native execution model item 4: the all-three-polish-rows release
   gate now reads visual-craft row + capture/evidence row + section 5
   complete-cut review, with the Task 14 row recorded as
   OWNER-WAIVED — NOT PASSING.
2. Requirement coverage map: the five-second layperson row now records the
   owner waiver and the Task 16 complete-cut review.
3. Task 15 Step 4: audit commands adopt section 7 semantics.
4. Task 15 Step 5: an in-scope runtime/UI edit invalidates the affected row
   and reruns the Task 13 visual review and/or the section 5 complete-cut
   review; the Task 14 five-second panel is never rerun.
5. Task 16 Step 3: the EDL is replaced by section 3.
6. Task 16 Step 5: the 00.0–05.0 extraction and human re-gate are replaced by
   section 5.
7. Task 16 Step 6: the 13.5-second gate becomes the section 3 numeric gates.
8. Task 16 Step 7: the single-reviewer judge gate becomes section 5.
9. Task 16 Step 9: staging/push policy becomes section 6.
10. Execution graph and completion definition: Task 14 is recorded as closed
    by owner waiver; completion items 4, 8, and 9 are amended per sections 2,
    5, and 6.

This amendment supersedes only the conflicting gate, timeline, staging, and
audit-semantics language above. Every other product, authority, evidence, and
scope requirement remains binding.
