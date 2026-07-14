# Changelog

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
