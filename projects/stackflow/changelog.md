# Changelog

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
  set-pieces; P1/P2 T6–T14) with a premortem and spec-delta mapping. Not
  yet applied to `spec.md` — pending requester go-ahead.
