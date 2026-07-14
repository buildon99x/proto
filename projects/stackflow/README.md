# Stackflow (reverse-planning + playable clone)

A **역기획 (reverse-planning) teardown** of the Steam strategic roguelike
**Stackflow** (App ID `3908810`), captured so a team can build a
mechanically identical game from this project alone — **and the full
playable clone built from that spec** (`app/`, spec §13 steps 1–8:
chains, special blocks, shop/advantages, bosses, all seven screens).

Run it: `pnpm --filter stackflow dev` · test it:
`pnpm --filter stackflow test` · browser playtest:
`pnpm playtest --project stackflow`.

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
   source-backed evidence (incl. the verbatim store description, Appendix
   A) + open questions to verify on the live game.
4. [`notes/design-acts.md`](./notes/design-acts.md) — our original
   act/stage/progression design (UX- and fun-focused) and its rationale.
5. [`notes/mda-review.md`](./notes/mda-review.md) — **MDA-framework design
   review** focused on *박진감 (thrill) & fun*; prioritized improvement
   backlog (T1–T14) with spec-delta mapping. Read before the next spec pass.
6. [`notes/decisions.md`](./notes/decisions.md) — clone design choices for
   undocumented / delegated details.
7. [`eval.md`](./eval.md) — checks that prove a build matches.

## Run structure

A run is **3 Acts × 10 stages = 30 stages** (requester-confirmed). Boss
cadence, target curve, per-act content, economy, and UX beats are designed
in `spec.md` §8.1–8.7.

## Confidence tags (used throughout)

- `[SRC]` — observed from public sources (or requester-confirmed facts).
- `[INF]` — inferred from genre + evidence.
- `[DEF]` — clone default where the original is undocumented (tunable).
- `[DES]` — **original design for this clone**, authored for UX and fun on
  top of the confirmed skeleton (not a claim about the source).

## Status

Reverse-planning complete; **implementation not started** — `app/` is
still the Vite/React template. Build order is in `spec.md` §13.
