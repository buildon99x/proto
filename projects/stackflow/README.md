# Stackflow (reverse-planning)

A **역기획 (reverse-planning) teardown** of the Steam strategic roguelike
**Stackflow** (App ID `3908810`), captured so a team can build a
mechanically identical game from this project alone.

Stackflow = **Tetris piece handling + Puyo-Puyo combo brain + roguelike
run structure**: drop and rotate polyomino pieces on a grid, clear lines
and shapes to trigger chain-reaction combos, hit an escalating per-level
target score, spend credits between rounds on new blocks and roguelike
"advantages", and face a rule-breaking boss every third level.

> Not the mobile tap-to-stack tower game of the same name — see
> `notes/decisions.md`.

## Read in this order

1. [`brief.md`](./brief.md) — player, fantasy, design pillars.
2. [`spec.md`](./spec.md) — the buildable specification (rules, data
   model, formulas). **Start here to implement.**
3. [`notes/reverse-engineering.md`](./notes/reverse-engineering.md) —
   source-backed evidence + open questions to verify on the live game.
4. [`notes/decisions.md`](./notes/decisions.md) — clone design choices for
   undocumented details.
5. [`eval.md`](./eval.md) — checks that prove a build matches.

## Confidence tags (used throughout)

- `[SRC]` — observed from public sources.
- `[INF]` — inferred from genre + evidence.
- `[DEF]` — clone default where the original is undocumented (tunable).

## Status

Reverse-planning complete; **implementation not started** — `app/` is
still the Vite/React template. Build order is in `spec.md` §13.
