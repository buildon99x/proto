# Changelog

## 0.3.0

- **Rising tide (new base mechanic).** Every placement now raises a
  **clearable colored floor row** (2 gaps) from the bottom, pushing the
  stack toward the top — constant spatial pressure that rewards repetition
  mastery (plug the gaps / match colors to drain it). Gravity-aware
  (mirrors under reversed-fall bosses) with explicit insert-time top-out
  detection so a sealed board never silently overflows. Piece-count based,
  **no timer** — the §0/§F2 identity invariant holds. `run.ts raiseTide`,
  configurable in `data/stages.json` `tide`.
- **Board resets every stage** (was "carries within an act"): the tide
  would otherwise carry over and force an unfair top-out. Each stage is now
  a fresh escalating survival puzzle.
- **"≥1 minute per stage" by balancing, not a clock.** Added a
  placement→time model (`pacing.placementsPerMinute`), retuned the target
  curve (`actBase [100,1200,9000] → [1000,3600,6500]`, `stageRamp 0.18 →
  0.13`) so every stage 2–30 takes a median ≥1 min while staying reachable
  (30% greedy-bot full-run win rate; a drop-mash bot now dies in <10
  placements). Stage 1 stays the scripted onboarding hook. Re-validated
  with a committed sim, `tests/sim/balance.ts` (`pnpm --filter stackflow
  sim`).
- **Korean UI + per-item tooltips.** Every screen is fully localized to
  Korean via `app/src/ui/strings.ts`; block/advantage/boss names and
  descriptions translated in `data/blocks.json` and `bosses.ts`. Each item
  (blocks, advantages, bosses, meters, buttons, stats, settings) carries a
  keyboard-accessible `data-tip` tooltip explaining it.
- Engineering: `LockOutcome.tideRose`, 6 new tide unit tests (insert /
  gravity-aware / top-out / warmup / stage-reset / mash-tops-out), pinned
  target tests updated; 36 tests pass. Browser playtest + fresh screenshots
  confirm the tide, Korean UI, and tooltips render with no errors.

## 0.2.1

- **Balance fix — per-cell piece colors.** Mono-colored 4-cell pieces
  were themselves qualifying ≥4 same-color groups, so every drop
  self-cleared: the board never filled and mashing the drop key cleared
  stages. Pieces now mix two colors per 4-cell piece (both always
  present), so clears must be set up across placements. Verified with a
  drop-mash bot (now dies at stages 3–6), the greedy-bot curve sim
  (still 2/5 wins, losses now from board fill), 30 unit tests, and a
  fresh browser playtest. Spec §3.2 and `notes/decisions.md` updated.

## 0.2.0

- **Implemented the full game** (spec §13 build order steps 1–8): grid,
  polyomino pieces with CW/CCW/180° rotation + wall kicks, per-cell
  gravity cascades with the super-linear chain multiplier and live chain
  counter, stage targets with DANGER top-out state and the seeded
  stage-1 hook, all five confirmed special blocks (+ Bomb/Spore/Rune/
  Prism group members), perfect-clear ×4 and the Overdrive meter, the
  bank/press overkill economy with full-shop/quick-buy pacing and
  Treasure picks, the advantage system (automation-as-spectacle,
  reward-multipliers, rule-changers, 5-slot cap), mini-bosses 3/6/9 and
  signature Act Bosses (Inverter/Turner/Warden) with Break gauge,
  60% phase-2 and defeat crescendo, plus tiered juice with a
  reduce-motion toggle and remappable keys.
- All seven screens (§10) including Blockipedia; run-bests + discovered
  blocks persist in localStorage — the only cross-run state.
- Engineering: single seeded PRNG (reproducible runs), all tunables in
  `app/src/data/*.json`, 29 unit tests (`tests/engine.test.ts`) covering
  eval §G, browser playtest scenario (`tests/e2e/scenario.mjs`).
- Re-validated the §8.1 target curve against the §7.1 crescendo with a
  greedy-bot simulation; tuned Act 3 `actBase` 12000 → 9000 (pacing).
  Implementation decisions recorded in `notes/decisions.md`; spec §8.1,
  §8.2 and eval.md updated to match behavior.

## 0.1.0

- Created from the Vite React project template.
- Reverse-planning (역기획) of Stackflow (Steam roguelike, App 3908810):
  authored `brief.md`, `spec.md` (buildable clone spec), `eval.md`, and
  `notes/reverse-engineering.md` (source-backed teardown + open questions)
  and `notes/decisions.md`. App implementation not started.
- Deepened stage-composition and play-meta research: added spec §8.5
  (Play meta / progression layers) and a Blockipedia screen; recorded
  confirmed facts (Blockipedia catalog, ~42 min sessions, endless-mode is
  a request not shipped, "Balatro-without-shop" lineage) and flagged what
  remains undocumented (stage count/ending, cross-run meta depth) as open
  questions. Noted Steam/store sources are egress-blocked for this session.
- Added the official Steam store long-description (supplied verbatim by the
  requester) as Appendix A primary source in
  `notes/reverse-engineering.md`; added a per-surface provenance split;
  strengthened spec §8.4 advantages with the verbatim "smart automation,
  explosive multipliers, unique mechanics" wording.
- Locked the requester-confirmed run structure (3 Acts × 10 stages = 30)
  and designed the rest for UX/fun: target curve, boss cadence (mini-boss
  3/6/9 + Act Boss 10 + roster), per-act content rollout, shop/Treasure
  economy pacing, board-carry-within-act, and UX/juice/accessibility
  beats. Added `[DES]` confidence tag and `notes/design-acts.md`; updated
  spec §8, state model, eval, decisions, and README.
- Reviewed the design with the **MDA framework** (aesthetics-first, per
  `docs/kb/concept-planning`), focused on *박진감 (thrill) & fun*. Added
  `notes/mda-review.md`: diagnosed the core tension (slow-thinky identity
  vs thrill), realigned the target aesthetic to combo-catharsis, and
  derived a prioritized improvement backlog (P0 T1–T5: top-out tension,
  payoff crescendo, shop-pacing, guaranteed first-60s hook, active-boss
  set-pieces; P1/P2 T6–T14) with a premortem and spec-delta mapping.
- Applied the MDA review to the design (`[DES]`): realigned the primary
  aesthetic to combo-catharsis and pinned a no-timer "thrill principle"
  (`brief.md` pillars, `spec.md` §0). Spec deltas — §6 shape-clear catalog
  (same-color group ≥N + Combo Tile trigger); §7/§7.1 super-linear chain
  multiplier + live counter + perfect-clear + Overdrive; §8.1 crescendo
  re-validation + stage-1 hook; §8.2 Act-Boss Break gauge/phases/defeat
  crescendo + mini-boss nudge; §8.3 shop pacing (full/quick-buy) +
  bank/press overkill; §8.4 automation-as-spectacle; §8.5 bragging-meta
  run-bests; §8.7 top-out DANGER + engineered onboarding + juice budget;
  §9 state fields; §10 screens; §12 feel; §13 build order pulled the
  thrill layer into the MVP. Added eval §F2 (thrill-layer checks). T9
  balance left for post-implementation play-data tuning.
