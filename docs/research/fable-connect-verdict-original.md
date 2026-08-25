# Connect Verdict

**CLAD Summer Hackathon · Week 3 · Decision memo · 2026-08-24**

Independent research + adversarial cross-examination for the CONNECT week: what the Organize results actually reward, where FIRST BOUNCE likely lands, the full crowding and convergence picture, and a go/no-go on WORDLESS — grounded in 22 agent investigations across primary sources, 19 competitor repos, frame-by-frame video analysis, 5 blind ideation passes, 6 red-teams, and a 3-persona judge panel.

*Prepared by Claude (Fable 5). All placements, dates, and quotes verified against primary sources cited inline. Published artifact version: https://claude.ai/code/artifact/bc6b59ac-ad9e-453b-9158-4f3e10edfea2*

---

## Executive verdict

**GO — with a specific, locked revision of WORDLESS.** Not as the novelty play the other memo pitched (its exact-mechanic-uncommon claim does not survive a semantic prior-art sweep), but as an **execution bet with a thin, true, scoped novelty claim**: the first human-vs-human guessing game on the platform, played bare-handed over a real two-client Sync Kit session. All three judge personas independently ranked it #1 of the finalist slate (87, 86, 85 / 100). Three of its five kill gates pass **only** under specific staging decisions — decoy word-cards, split-screen from frame 1, an in-medias-res cut — so those are commitments, not options. One go/no-go spike gates everything: prove today that two Lens Studio preview panes hold a Connected Lens session and a synced ribbon is capturable. Confidence: **moderate-high** that this is the best available choice; **moderate** on podium, in a field whose strongest videos are unobservable.

---

## 01 · Method and honesty notes

Three disclosures before anything else.

- **Contamination.** Both prompts arrived in one message, so the other model's memo — its 50 ideas, its WORDLESS pitch — was in context before my "independent" phase began. Mitigation: all concept generation ran in **fresh subagents that never saw the memo** (3 angle-steered + 2 deliberately naive probes, 66 concepts total), and every memo claim was treated as a hypothesis to verify against primary sources. The research and red-team phases are genuinely independent; my *framing* of what to investigate was not.
- **Shared-assumption risk.** My judge panel and the other memo both calibrate on the same Week-1 revealed preferences. Where we agree (surface beats archaeology), the agreement rests on shared evidence — legitimate, since the evidence is verified — but it is one dataset of four placements, and section 14 flags it accordingly.
- **One agent failure.** The WORDLESS feasibility red-team agent died on a session limit; I performed that assessment myself against the SpectaclesSyncKit toolkit documentation and this repo's own production ledger — arguably the highest-context source available for it. Both videos **were** watched: downloaded from the public Drive links and analyzed frame-by-frame (silent channel only; audio is not analyzable, which is also what a skimming judge gets).

## 02 · Verified contest facts

| Claim | Status | Finding |
|---|---|---|
| Judging 50 / 25 / 25 | VERIFIED | T&C §6.2, identical wording on the contest page. CLAD Execution: "how meaningfully and effectively CLAD was used… quality, ambition, and impressiveness of what was achieved through AI-assisted development." |
| Binary first judging stage | PARTIAL | §6.2 confirms a yes/no first stage; that it tests *theme fit* specifically is an inference (supported by §5.7's "projects that do not fit the brief" removal right, but not stated). |
| CONNECT prompt wording | VERIFIED | "Build a spatial experience that connects people, platforms, or everyday communication workflows." Week 3 runs Mon Aug 24 → Sun Aug 30 23:59:59 PT; winners Thu Sep 3. |
| Video < 60 s; repo + prompt log + description; public Snapchat account | VERIFIED | All in T&C §5. The 60 s limit exists *only* in §5.8g, not on the contest page. §5.8e bans referencing any third-party brand. §6.7: organizers may demand source files within 7 days of award. |
| "§5.5 = each week substantially different" | PARTIAL | §5.5 governs multiple Entries generally ("substantially different from each other… sole discretion"); the per-week rule lives in the site FAQ. Substance holds; the citation was imprecise. |
| Week-1 placements | VERIFIED | Official r/Spectacles wrap (Aug 20): 1st **Pack Space** (Maksym Tsymbal), 2nd **Cine Boxed** (Ines Hilz), 3rd **Orb Notes** (Caio Alves), Honorable Mention **Task Habitat** (Viktor Kulaha). Prizes $1,000 / $500 / $200. |
| GUIDE winners announced? | NO — VERIFIED | Not as of Aug 24. Schedule says Thu Aug 27 (Thursday cadence confirmed by the Week-1 precedent). All Guide analysis below is provisional inference, labeled as such. |
| Judges | VERIFIED | Panel selected by Sponsor (SPECS Inc.) and Organizer (Lenslist) in sole discretion; no community vote; names unpublished. |

Sources: https://lenslist.co/clad-summer-hackathon · T&C PDF (all 8 pages read): https://media.lenslist.co/wp-content/uploads/2026/07/Terms-and-Conditions-CLAD-Hackathon-SPECS-29_07.pdf · official Week-1 announcement: https://www.reddit.com/r/Spectacles/comments/1vti09a/

## 03 · What Organize teaches — the judge-selection model

The decisive evidence is an **inversion between repo depth and placement**, verified by cloning and measuring all four winners:

| Placement | Project | Own code | Commits | In-repo CLAD docs | One-sentence pitch? |
|---|---|---|---|---|---|
| 1st | Pack Space | 1,814 LOC | 4 (one day) | 226-line curated log | "Surfaces become packing zones; your partner sends the list by code." |
| 2nd | Cine Boxed | 2,321 LOC | 3 (one day) | none at all | "Letterboxd, but spatial" (its own words). |
| 3rd | Orb Notes | 7,081 LOC | 3 | 664-line README-as-log | "Spatial sticky notes that heat up near the deadline." |
| HM only | Task Habitat | 12,359 LOC | 66 (7 days) | 5,600+ lines, 20 LEAF scenarios, build gates | Needs a paragraph; the announcement itself could only describe it by *mood*. |

If the 50% CLAD axis were scored by repo archaeology, this ordering is impossible. Therefore: **judges scored the submission surface** — the one-sentence concept, a watchable video with the magic moment early, and the curated prompt-log narrative submitted via the form. Five concrete selection signals, ranked:

1. **Concept legibility under 10 seconds.** The winners compress losslessly; Task Habitat's ~9,600-line build (claim verified within 2.7%) lost to its own explanation cost.
2. **A watchable video with a human-scale story.** Pack Space's demo is publicly embedded on Reddit and features a second human; Task Habitat's own repo documents its video crisis ("no video, no clips, no script with 3.5 days left — FATAL").
3. **Usefulness phrased as spatial necessity.** The winner is the only entry where AR plausibly beats a phone at a real chore, with a web companion that includes a non-AR second person.
4. **Curated CLAD story over exhaustive CLAD evidence.** The winner's 226-line log ("CLAD with Codex," openly) beat 5,600 lines of documentation. Curation converts; volume doesn't.
5. **Familiarity is an asset, not a penalty.** Second place leaned *entirely* on a famous referent. This inverts a common builder instinct — and this team's own Week-1 panel over-weighted originality/authenticity against exactly this signal.

## 04 · Shot Coverage Compass — diagnosis

Frame-by-frame analysis (56.3 s, silent channel) partially *corrects* the other memo's story. The video's payoff is actually the **fastest of either entry** — red sectors flip green and the counter jumps at ~6 s — and silent legibility scored 7/10, not a failure. What actually cost it, in order of weight:

- **Audience narrowness at the concept level.** "Coverage" is filmmaker jargon; the internal red-team called this before build and was overruled on originality/authenticity grounds. The judge-selection model above says that trade was backwards for these judges.
- **A caption-free 35-second demo body.** The two purpose hint-lines fade by ~5 s; a muted judge must infer tap-cycling and the 180°-line beat, and the counter visibly dips 10→8 with no on-screen explanation.
- **No second human, no cross-device story.** The winner had one; every Week-1 podium entry connects to life outside the wearer's head.
- **Squandered first glance:** empty GitHub description, zero images in the README (hero PNGs sit unused in docs/media/), and CLAD evidence shown as claims-on-cards rather than tooling footage.
- **Small, additive-washed HUD** — wedge labels and the counter are unreadable at a skim.

What it did right — the closed evidentiary chain (all 26 commits public, every prompt-log hash resolving, a self-correcting retro) — is real and rare. It just earns nothing unless it's *in the video*.

## 05 · The Guide field and FIRST BOUNCE's position

**Winners are not announced** (due Thu Aug 27). The following is provisional inference from a mapped public field of ~18–20 repos (estimated true field 25–40; several strong entries' videos went in via the form and are unobservable — the single largest uncertainty).

| Tier (inference) | Entries | Why |
|---|---|---|
| TIER 1 | Lighting Assistant (flarb) · Sensei (r3d5) · VolleyMate (ohistudio) | Lighting Assistant: 96 commits, 777-line verbatim log, best spatial necessity, veteran AR studio, bespoke video pipeline. Sensei: the Week-1 winner escalating to a two-sided platform, 1,050-line verbatim log — but a single squashed commit and an *unfilled demo-video placeholder* in its committed SUBMISSION.md. VolleyMate: best in-repo demo + real CV, but genuine theme-screen risk (a games console entered as a "guide"). |
| TIER 2 | FIRST BOUNCE · site-sweep · Pathfinder · Specslingo · ArtGuide | site-sweep has the deepest raw CLAD evidence (8.2 MB session log) but pushed its video commits up to ~57 min *past* deadline and discloses a non-Claude final pass. Pathfinder's Drive video appears access-restricted. Specslingo has no committed video link. ArtGuide published everything in the final 3.5 hours with an essay-style log. |
| TIER 3 | Brew Buddy · Learn in a Room · BART'S · Stitch Guide · Poker Academy · RecycleMe · others | Individually strong axes (Stitch Guide: a 10,190-line verbatim transcript; Poker Academy: 10k LOC) but each missing a leg — video, spatial necessity, or completeness. |

**FIRST BOUNCE estimate: top 3–6, podium plausible but not favored** — consistent with the other memo's "top 3–5," with two material additions it missed:

- **Differentiators verified:** the only deterministic no-cloud entry in a field where 6 of 8 analyzed competitors wire Gemini through RSG; 243 node tests that actually pass from a cold clone in ~95 ms (I ran them) — the field's single strongest shell-verifiable CLAD artifact; and the most judge-proof silent video mapped (8/10, nine legible caption cards; most rivals have *no* visible video at all).
- **Liability the memo never saw:** the public repo's evidentiary chain is broken exactly where the 50% axis looks. History squashed to 2 commits pushed 9 minutes before deadline; the prompt log cites KICKOFF.md and docs/prompts/ 13+ times — neither published; 44 commit hashes that resolve to nothing; one of the two advertised verify commands fails from a fresh clone (758 TS errors — it needs Cache/ typings). The strongest CLAD proof this team owns sits on a laptop where no judge can see it. Also: the counted payoff (0/3 → 2/3) lands at ~41 s — late by this memo's own standard.

> **Operational lesson for Week 3, written twice now:** commit raw history publicly from day one, publish the kickoff prompts as you go, put one image in the README, fill the GitHub description, and never leave referential integrity for the last nine minutes.

## 06 · Cross-examination of the other memo

| Memo claim | Verdict | Evidence |
|---|---|---|
| Judges reward comprehension over documentation volume; Task Habitat proves it (~9,600 lines, HM only) | CONFIRMED | Placements verified from the official announcement; LOC claim verified by measurement (9,338 in 44 files, within 2.7%); the depth-vs-placement inversion is even starker than claimed. |
| SCC lost because judges had to learn wedges / dial / 180° rule; "visually abstract" | PARTLY | Direction right, mechanism imprecise: the frame analysis shows the fastest payoff of either video (~6 s) and 7/10 silent legibility. The cost centers were audience narrowness, the caption-free demo body, no second human, and a wasted repo first-glance — not abstractness per se. |
| FIRST BOUNCE clearer; first payoff ~8–10 s; top 3–5 podium-plausible | PARTLY | Clearer on mute: confirmed (8/10 vs 7/10). "Payoff at 8–10 s" is generous — that beat is an atmospheric zone-glow; the counted payoff is at ~41 s. Top 3–6 supported, with the unobservable-rival-videos caveat and the broken public evidence chain the memo never examined. |
| Original GPT top-5 (C01/C03/C09/C42/C48) repeats the failure pattern and should be rejected | CONFIRMED | Independent gate-check: C01→C, C03→B, C09→C, C42→C, C48→F. Niche users, protocols, explanation cost — the rejection was correct. |
| Handoff/bridge/relay metaphors dominate blind LLM ideation | CONFIRMED | Both of my naive probes independently produced concepts literally named "Handoff," plus inbox-triage, translation captions, spatial notes, presence portals, meeting totems — the predicted families, nearly 1:1. |
| "Neither charades nor the mechanic appears in Snap's 343-project showcase" | WEAKENED | Direction holds on-platform (no human-vs-human guessing game found), but only ~161 of 343 showcase projects render (lazy-load) — ~47% coverage — and keyword search missed the semantic ancestors below. |
| "WORDLESS's exact mechanic is genuinely uncommon" | REJECTED AS STATED | A semantic sweep found Line•AR (~2018: verbatim "Pictionary + Charades hybrid — draw and act in 3D space to get friends to guess"), Pictionary Air (mass-market, same hero interaction), Rec Room 3D Charades (long-running VR mode), ScribbleHero (Spectacles, AI guesses your AR drawing), Wizard of the f(ARt) (motion→glyph). The *full combination* (glasses + two humans + bare-hand ribbon + human guesser + glyph lock) remains unheld — but the honest description is "a known mass-market mechanic ported to Specs plus a persistence twist." That's the CineBoxed pattern, and it can win — as an execution bet, not a novelty play. |
| "None of 36 blind concepts proposed charades" → low LLM convergence | WEAKENED | My play-angle blind agent produced a charades variant ("Show, Don't Tell" — prop-charades with a secret card and phone guessing). Estimate: 30–55% (~40% point) that at least one of 20–40 rivals ships a draw/act-and-guess entry this same week. |
| Room Pulse: strong recurring utility, real prior-art risk incl. a 2016 Glass prototype | CONFIRMED + SHARPENED | Ebner/Muehlburger/Ebner 2016 is *exactly* this system on Glass — and found free-text audience feedback "more a distraction than a benefit"; Rhema (IUI 2015) found sparse delivery beats streams; Resonant (MHacks 2025) is the on-platform neighbor. As a peripheral HUD it also fails gates 1 and 3 outright (no visible payoff): **KILL as pitched**. Only the physical-arrival variant (Encore) survives, wounded. |
| Shadow Puppet Pair as a retained alternative | REJECTED | Gate 4: expressive hand shapes are precisely what the invisible simulated hand cannot produce; plus no recurring occasion. (A rigged-puppet variant softens the first problem, not the second.) |
| Sync Kit state can be demonstrated across two Preview panels | CONFIRMED | First-class documented workflow: multiple Preview panels each simulate a distinct user in one session (shared Session ID shown). This was the pitch's largest unverified load-bearing claim; it holds. |

## 07 · Crowding and convergence — three measures, kept separate

| Semantic family | Public ecosystem | LLM ideation | Demo/implementation | Note |
|---|---|---|---|---|
| Translation / captions / sign language | HIGH | HIGH | HIGH | ≥9 named showcase projects; appeared in both naive probes. Avoid entirely. |
| Spatial notes / messages | HIGH | HIGH | HIGH | Most-produced family in my probes too. |
| Multiplayer games (generic) | HIGH | MED | HIGH | Official samples (Tic Tac Toe, Air Hockey…) define "template grade" — anything resembling synced-transforms + turns reads as a remix. |
| Human-vs-human guessing game | LOW | MED-HIGH | LOW | Unheld on-platform; but the family is one blind play-angle prompt away for any rival. The separation the other memo drew (public low / LLM medium-high) is **confirmed** — and is exactly why differentiators must ship visibly. |
| Phone/web-to-glasses bridge | MED | HIGH | MED | Officially templated (Mobile Kit, Snap Cloud). The bridge is not the differentiator; what crosses it must be. |
| Audience-response / presenter HUD | MED | MED | MED | Commodity phone-polling + a decade of academic prior art + Resonant on-platform. Novelty = productization only. |
| Task handoffs | MED | HIGH | MED | Measured directly: "Handoff" appeared by name in both naive probes. Kills Got It. |
| Collaborative drawing / music | MED | MED | MED | Spatial Jam, Sync Scape, SupAR Board. WORDLESS's biggest *misbinning* risk is being read as this family — hence cards-on-screen from frame 1. |
| Complementary-constraint co-creation (weaving) | LOW | LOW | LOW | 0 hits across 5 blind lists, the 50-list, and the showcase. Warp & Weft's genuine white space. |
| Telepresence / remote craft guidance | LOW | MED | MED | The showcase's real gap; C24 exploits it — with a theme-adjacency caveat (reads "Guide," a week late). |

Ecosystem ratings from the official showcase (~161/343 projects visible), samples page, and Connected Lens docs; LLM ratings measured from my 5 blind passes + the 50-list + the memo's reported 4-variant passes; implementation ratings from what the official templates make easy.

## 08 · The 50 ideas, re-ranked

Independent adversarial gate-check (uncertainty defaults to fail). Distribution: **2 A · 5 B · 17 C · 26 F** — the list skews heavily toward ambient/status/infrastructure concepts that die on silent comprehension or early magic.

| Tier | Concepts |
|---|---|
| A | **C24 Craft Mentor Overlay** (remote mentor's stroke materializes as guidance on your object — passes all gates in the low-crowded telepresence gap; caveat: reads as a GUIDE concept arriving a week late, a real theme-screen wobble) · **C31 Silent Charades Constellation** (the WORDLESS ancestor — passes all gates *if* the clue medium is visible artifacts, not invisible body gesture) |
| B | C03 Scene Review Bridge · C08 Design Critique Ring · C27 Venue Reassembly Compass · C33 Shared Room Weather · C40 Pass-the-Beat — viable, each handicapped by a crowded family or one marginal gate |
| C | C01, C02, C07, C09, C13, C15, C17, C20, C22, C28, C32, C35, C39, C42, C47, C49, C50 — one failed gate or a high-crowded family (incl. the entire original top-5's C01/C09/C42) |
| F | C04, C05, C06, C10, C11, C12, C14, C16, C18, C19, C21, C23, C25, C26, C29, C30, C34, C36, C37, C38, C41, C43, C44, C45, C46, C48 — two+ failed gates, undemoable in Preview, or protocol-not-product (incl. C16 Conversation Turn Beacon, C34 Shadow Puppet Pair, C48 API Debugger) |

## 09 · Independent concept pool (66 blind concepts)

Five uncontaminated agents produced 66 concepts. The naive probes reproduced the crowded families almost perfectly (a useful convergence measurement in itself). The steered passes surfaced several genuinely strong candidates — the four best became the finalist slate alongside WORDLESS:

- **Split the Table** — end-of-meal bill split as a 30-second table ritual; dish tokens dragged to seat corners, a shared item visibly cleaving in half on the center line, shares settling live; second diner claims from a phone (the verified Week-1-winner architecture).
- **Warp & Weft** — a two-person loom where one player can lay only vertical threads and the other only horizontal; cloth blooms *only* where threads cross. The purest structural embodiment of CONNECT found anywhere in this research; zero convergence hits.
- **Encore** — audience phone taps arrive *physically* in a presenter's room (roses arc in and pile up; confusion accumulates as fog), sparse-batched per the Rhema finding.
- **Show, Don't Tell** — notable because a blind agent independently produced a charades-family sibling that solved WORDLESS's two open design problems (guess entry via a visible phone; a payoff where the props morph into the answer). Independent evidence the charades lane is discoverable — and a design donor for the locked WORDLESS revision.

Also strong but not slated: Fed Yet? / Full Bowl (pet-feeding truth latch — charming, converged twice across my own lists), Green Shelf (medication reassurance — emotionally the strongest, but a care-surveillance framing needs more delicacy than a week allows), Pantry Ping (shelf-to-store sync — validated pattern, echoes the Week-1 winner closely enough to read derivative), Both Keys (two-key consent console — great gate-2 metaphor, thin recurrence).

## 10 · Finalists — gates and judge panel

| Gate | WORDLESS | Warp & Weft | Split the Table | Encore |
|---|---|---|---|---|
| 1 · Silent 5-second read | MARGINAL* | MARGINAL* | MARGINAL* | MARGINAL* |
| 2 · Visible connection | PASS | PASS | PASS | PASS† |
| 3 · Early magic (10–15 s) | MARGINAL* | MARGINAL* | MARGINAL* | PASS |
| 4 · Honest Preview proof | PASS | PASS‡ | PASS | PASS |
| 5 · Recurring user value | MARGINAL | FAIL‡ | MARGINAL | MARGINAL |
| Red-team verdict | WOUNDED ×2 + feasibility SURVIVES | WOUNDED | WOUNDED | WOUNDED |

\* Passes only under specific staging (WORDLESS: decoy cards + role labels + secret-word banner from frame 1, in-medias-res cut. W&W: alone-fails/together-blooms beat + role scaffolding. StT: receipt-first, currency-everywhere choreography. Encore: per-tap causality + role title card). † Only if appreciation stays per-tap; aggregated-only fails. ‡ The "keepsake persists" claim requires cross-session persistence Sync Kit does not have on Specs — build Snap Cloud storage or cut the claim; the recurrence reframe depends on it. No concept in this research passes all five gates unconditionally — the gates are choreography commitments, not properties.

### Judge panel (3 personas, scored independently, official 50/25/25)

| Finalist | Judge A · platform engineer | Judge B · community lead (muted, 1.5×) | Judge C · product | Aggregate |
|---|---|---|---|---|
| **WORDLESS** | 45+21+21 = 87 | 43+22+21 = 86 | 43+21+21 = 85 | **258 · #1 unanimous** |
| Warp & Weft | 43+19+21 = 83 | 41+20+22 = 83 | 40+20+17 = 77 | 243 · #2 |
| Encore | 40+20+20 = 80 | 38+19+21 = 78 | 38+20+20 = 78 | 236 · #3 |
| Split the Table | 38+22+16 = 76 | 39+21+20 = 80 | 38+22+19 = 79 | 235 · #4 |

Why WORDLESS sweeps despite three different value systems: it is the only finalist where **the hard technical thing is the demo itself** (continuous stroke streaming over a real two-client session, visibly beyond the turn-based official samples — Judge A); the only one that is **better on mute** (a charades game is literally wordless; invisible hands make the ribbon the star — Judge B); and the only one that answers both "who uses this twice?" (charades is inherently replayed) and "why glasses?" (a shared 3D clue cannot exist elsewhere — Judge C). Its shared weakness across all three: everything hangs on a flawless split-screen sync capture, and fun-not-utility gives it no floor if a judge weights everyday value hard.

Room Pulse (as originally pitched, peripheral HUD) and Got It were killed before the panel: the first fails gates 1+3 with a decade of distraction literature against it; the second sits in the single most LLM-convergent family measured.

## 11 · WORDLESS red-team report

### Comprehension lens — WOUNDED

At second 5, a split screen with a glowing squiggle defaults to the *crowded* read: shared AR drawing. Every disambiguator — guess cards, secret-word banner, role labels — lives in exactly the design region the pitch left open. Concept count is nominally six (worse than Task Habitat), *but* five collapse into the universal charades schema the instant decoy cards are visible; the glyph collection is the only schema-external concept and must never be explained, only shown. The payoff carrier cannot be the glyph alone (an abstract sigil means nothing to non-players): it must be the **word revealing simultaneously in both panels** as the scribble snaps into a clean glyph. A chronological cut cannot land the payoff before ~20–25 s; only an in-medias-res cut passes gate 3.

### Novelty lens — WOUNDED

The kill case: "Pictionary Air on borrowed hardware," entering the platform's most crowded category, with ~40% odds of a same-week family twin. The survive case: these judges verifiably reward familiar referents (CineBoxed); the scoped claim is true and defensible; and within CONNECT week specifically, the field will crowd itself with messaging/translation utilities, making a genuinely fun two-human game *more* differentiated, not less. The surviving originality sentence: *"Air-drawn guessing games live on TV screens and in VR with controllers; WORDLESS is the first time two people in AR glasses play one against each other with nothing but a bare hand and shared light — and every correct guess mints a glyph the pair keeps."* Every clause is defensible against the verified prior-art list; anything broader is refuted by Line•AR alone. Disclose the lineage in the README in generic terms (T&C brand ban) — it converts the weakness into an honesty signal. Anti-convergence insurance: the three things a rushed rival clone won't ship — glyph minting, decoy-card guessing, visible role swap — must all appear *inside the 60 s video*.

### Feasibility lens (performed inline against toolkit docs + this repo's ledger) — SURVIVES, conditional on the day-1 spike

- **Two-pane sessions are first-class:** multiple Preview panels each simulate a distinct user in one session (documented, with a Session ID indicator and a codified setup checklist: disable bundled Examples, keep startMode START_MENU, Device Tracking World, target platform Spectacles).
- **Ribbon streaming has a documented recipe:** stroke path as a compact JSON array in a manualString StorageProperty at ~10 Hz (well under the 100 KB/property and 350-messages-per-5 s limits), rendered progressively on both panes — "stroke segments" are literally the documented example for this pattern. Live watch-the-clue-appear is preserved.
- **The secret word is an architecture, not a hack:** Sync Kit has *no private state*, so the correct design is the documented hidden-information pattern — the word lives only on the Painter's client; the shared state carries the 4-card set; guesses route as events to the Painter-owned round entity, which validates and writes the outcome. Honest, and itself a CLAD talking point.
- **The genuine long pole is capture, not code:** the MCP interaction tooling drives one pane; the second pane likely needs human-driven input, and Week 2's final cut already came from the human's own recorded flight — same production model, budget 1.5–2 days.
- **One honesty landmine:** Specs has *no cross-session persistence* in Sync Kit. "Keeps the glyph forever" is unsayable unless Snap Cloud storage is actually built (stretch, not MVP). Session-scoped wording: "the pair's collection grows across rounds."
- **No honest degraded demo exists** if two-pane sync fails — the concept is binary. Hence the spike below is a hard gate. Probability the full loop demos by Sunday, conditional on the spike passing: ~80%.

### Remaining red-team questions, answered

- *Does charades already work too well without Specs?* In one room, yes — which is why the pitch leads with the value slice nothing else can claim: **charades your distant friend can see**.
- *Is multiplayer-category crowding worse than exact-concept novelty is good?* At judge-gut level the video decides: a freeform glowing ribbon with visible guess cards does not look like Tic Tac Toe; the real misbinning risk is "collaborative drawing," managed by making the cards visually dominant.
- *Week-4 overlap?* Low and controllable: keep the collection a minimized payoff beat (a small rack, deliberately not a sky/constellation), record the differentiation in the decision log.
- *Does role/round furniture exceed the pitch's admitted complexity?* Yes, as pitched — which is why v1 ships *no* scoring, timers, or menus: word → draw → guess → lock → swap. Nothing else exists.

## 12 · The locked design — GO package

**Recommendation: GO with WORDLESS, revised as specified below.** (Outcome class: "GO with a specific revision." The unrevised pitch is not recommendable — three gates fail without these commitments.)

- **One-sentence pitch:** "Charades for AR glasses: your hand paints the clue in light between two connected Specs, your friend pinches the right word — and the drawing locks into a glyph the pair collects."
- **Target user and occasion:** two friends or a couple in different places, weekly game night — the one form of charades where the performer and guesser don't share a room. Colocated play is the secondary frame.
- **One hero interaction:** painting the ribbon clue (comet-head cursor tracking the hand) while the other client watches it materialize and pinches among four confusable word cards.
- **Committed design decisions (gate-load-bearing, not optional):**
  1. Pinch-a-card with plausible decoys is the *only* guess mechanic — confusable sets (SNAKE / RIVER / ROPE / WAVE), wrong pinches shake and reject.
  2. Split-screen two-client presentation from second 0, secret-word banner on the Painter panel only.
  3. Comet-head brush cursor so the ribbon has a visible cause.
  4. Payoff = simultaneous word reveal + scribble-snaps-to-glyph, in saturated color (additive display: saturation survives, brightness washes).
  5. Collection demoted to a wordless closing beat.
  6. Session-honest persistence wording unless Snap Cloud ships.
  7. Remote-play framing.
  8. The scoped originality sentence, verbatim, everywhere.

### Ten-second silent storyboard (in medias res)

| Time | Beat |
|---|---|
| 0–2 s | Split screen, both panes visibly in one session. Left: label PAINTER, banner "DRAW: SNAKE" (this pane only), a half-drawn glowing ribbon. Right: label GUESSER, a "?" and four floating cards — SNAKE · RIVER · ROPE · WAVE. |
| 2–6 s | A comet-head cursor extends the ribbon into an S-coil on the left; the same stroke grows in the right pane a beat later — one object, two rooms. |
| 6–8 s | Right pane pinches ROPE — the card shakes and rejects. |
| 8–10 s | Right pane pinches SNAKE — both panes flash SNAKE simultaneously as the scribble snaps into a clean glyph and slides onto a small rack beside two earlier glyphs. |

### Smallest one-week MVP

Two-pane Sync Kit session (START_MENU flow) · ~40-word list with authored decoy sets · painter path streamed as a 10 Hz synced property, ribbon mesh rendered progressively on both panes · four-card guess UI with owner-routed validation · correct → word reveal + glyph normalization + session rack · role swap as a label flip · one reset door · node tests for the path resampler, round state machine, and decoy selection · 3–5 LEAF scenarios including a two-client round · split-screen video cut in medias res.

**Must cut (pre-decided):** scoring and streaks, round timers (server-time drifts across preview panes), AR keyboard and free-text guessing, anything speech, a glyph gallery UI, Snap Cloud persistence (stretch only, behind the honesty rule), colocation-alignment claims, more than two players, Bitmoji.

### The central CLAD-execution story

This team's first networked build, told in its proven register: a real two-client Connected Lens session verified live in Preview (self-evidencing in the split screen — no trust required); pure node-tested modules (path resampling, round state machine, decoy selection, glyph normalization) behind write-only views, continuing the Week-1/2 architecture discipline; an owner-routed hidden-information protocol as the honest answer to a sync layer with no private state; LEAF scenarios driving a two-client round; kickoff prompts and adversarial review rounds committed publicly *from day one* this time. That is materially beyond the turn-based official samples, and it is all visible in 60 seconds.

### Strongest likely reason judges reject it

"A party game in a utility-judging culture." The Week-1 podium is all utility; Lenslist history over-rewards usefulness; and if a same-week draw-and-guess twin ships (~40%), WORDLESS must win on surface + CLAD depth alone or read derivative twice over. Mitigations are baked in — the remote-play value slice, visible differentiators, the 50% lane-agnostic CLAD axis — but this risk cannot be engineered to zero. It is the honest price of the lane.

## 13 · Falsifying experiments, cheapest first

1. **Today, 2–3 h — the two-pane spike (hard go/no-go):** install SpectaclesSyncKit, open two Preview panels, sync one manualString path drawn in pane A so a ribbon renders in pane B, and screen-record ten seconds of it. If this cannot be captured on this machine, WORDLESS *and* Warp & Weft both die today, and the fallback is Split the Table on the sync-independent web-companion architecture.
2. **Today, +1 h — ribbon beauty check:** the ribbon mesh in saturated color over the additive preview composite. If it reads thin or dim, the concept has no star; fix or pivot before writing game logic.
3. **Day 2, 30 min — the 5-second test:** show three people a mocked split-screen still (cards + banner + half ribbon) for five seconds; ask "what is happening?" Two of three must say a guessing game. If they say "drawing app," the staging (not the concept) has failed — iterate the frame.
4. **Thu Aug 27 — the GUIDE results as a natural experiment:** they arrive mid-build and directly test this memo's judge model. FIRST BOUNCE placing top-3 softens the utility-bias worry; a video-forward or playful entry winning strengthens the WORDLESS bet; a deep-evidence entry winning against a weak video would genuinely challenge the surface-over-archaeology model — reassess the video budget that day either way.

## 14 · Claims still requiring validation

- Two-pane capture on this machine (experiment 1 — the largest single unknown).
- The judge-selection model rests on one week of four placements; Aug 27 doubles the dataset.
- "Judges watch muted / at speed" is inference from volume, never observed directly.
- Same-week charades-family convergence (30–55% is an order-of-magnitude estimate, unknowable until Aug 30).
- Whether the yes/no first stage is strictly a theme screen (T&C does not say).
- Whether organizers audit repo push timestamps (site-sweep's post-deadline video commits make Week 2's results a live test of this).
- Whether post-deadline referential-integrity fixes to the public clad-guide-2026 repo (publishing the cited-but-missing KICKOFF.md and docs/prompts/) are permissible — worth one polite question to the organizers; do not touch the repo without an answer, since altering a judged submission is its own risk.
- The strongest Guide rivals' actual demo videos (form-only submissions) — unobservable; all Guide-field inference carries this ceiling.
- Rival-field size for Week 3 (~20–40 is extrapolated from a returning-builder cohort of ~20–35).

---

*Method: 22 subagent investigations across two orchestrated workflows — primary-source verification (contest page, full T&C PDF, official announcements), 19 competitor repos cloned and measured, both submission videos downloaded and analyzed frame-by-frame (silent channel), the official Snap showcase/samples/Connected-Lens docs swept for crowding, semantic prior-art search, 5 blind ideation passes (66 concepts), a 50-concept adversarial gate-check, 6 red-team lenses, and a 3-persona judge panel — plus inline verification against the SpectaclesSyncKit toolkit documentation and this project's own build ledger. Sources are linked inline; Guide-field placement claims are labeled inference pending the official Aug 27 announcement.*
