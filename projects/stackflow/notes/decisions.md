# Decisions

Clone design decisions where the original Stackflow's exact behavior is
undocumented. Each is a `[DEF]` in `spec.md` — chosen to make the spec
buildable and internally consistent, and safe to retune once validated
against the live game (see open questions in
`notes/reverse-engineering.md`).

## Scope
- **Target game:** the Steam roguelike Stackflow (App `3908810`), NOT the
  mobile tap-to-stack tower game of the same name. Confirmed with the
  requester on 2026-07-14.
- **Deliverable = reverse-planning docs**, not a built game. The project
  scaffold exists (per repo convention: write brief/spec/eval before
  implementing), but `app/` is still the template. Implementation is a
  follow-up per `spec.md` §13.
- We replicate **mechanics and feel only** — no proprietary art, audio,
  names, or store copy.

## Mechanical defaults (tunable)
- **Grid:** 8×12. Rationale: reviews stress compact, spatial, "maximize
  space" play, slower than Tetris — a short well doesn't fit.
- **Base pieces:** the 7 tetrominoes, modeled as generic polyominoes so
  special shapes/groups add without special-casing.
- **Draw:** shuffled-bag (7-bag while pool = base set), generalized to a
  weighted bag as purchases grow. ≥1 next-piece preview; hold optional.
- **Commit:** manual confirm/hard-drop + gravity settle; no lock timer
  (game is slow/thinky).
- **Gravity:** per-cell Puyo-style by default; connected special blocks
  (Vine colony) fall as groups.
- **Scoring:** base 10/block × chain multiplier × product of active
  multipliers. Chain multiplier `max(1, 2·(k−1))` for cascade depth k≥2.
- **Target curve:** `round(100 × 1.6^(level−1))`.
- **Block-group synergies:** implemented per archetype (Explosives=AoE,
  Colony=growth, Arcane=multipliers, Harmony=color/shape match). Numbers
  live in `data/blocks.json` (to be authored at implementation).
- **Advantages:** three documented kinds (automation / reward-multiplier /
  rule-changer) as an event-hook perk system; example perks are
  placeholders.
- **Bosses:** two confirmed rules (reverse fall, periodic rotation) plus
  design-added modifiers; boss every 3rd level.
- **Determinism:** single seeded PRNG for all randomness (testability).

## Why a full project (not just a doc dump)
Repo convention (`AGENTS.md`): "Before implementing a project, write or
update brief.md, spec.md, and eval.md." Housing the teardown as a proper
`projects/stackflow` makes it discoverable via the launcher registry and
ready for a future implementation pass to build against in place.
