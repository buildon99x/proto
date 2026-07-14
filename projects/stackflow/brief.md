# Brief — Stackflow (clone)

## What it is

Stackflow is a **strategic block-placement roguelike**. The player drops
and rotates polyomino pieces onto a grid, clears lines and shapes to
trigger chain-reaction combos, and survives escalating stages by hitting a
**target score** each level. Between levels the player spends earned
credits to add new blocks and pick roguelike **advantages** (perks) that
reshape the run.

Think **Tetris piece handling + Puyo-Puyo combo brain + roguellike run
structure and build-crafting.** It is deliberately slower than Tetris:
there is no soft-drop pressure race; the tension is spatial planning and
combo setup, not reflexes.

## Target player

- Roguelike / roguelite fans (Balatro, Luck be a Landlord audience) who
  like "one more run" build optimization.
- Puzzle players who enjoy Tetris/Puyo/Tetris-Effect but want meta
  progression and variety instead of a pure score attack.
- Session length: 15–40 min per run; highly replayable via randomized
  block pools and advantage offers.

## Core fantasy / the "dopamine" hook

"Fit the piece perfectly, then watch one placement cascade into a
board-clearing chain." The reward loop is the visual + score payoff of a
chain reaction the player *set up* several moves earlier.

## Design pillars

1. **Perfect fit is the pleasure.** Placement and rotation must feel
   precise and "buttery"; a piece visibly locks into the exact slot.
2. **Combos over speed.** Reward setting up multi-step chain reactions,
   not fast clearing. Slower cadence, thinkier decisions.
3. **Build-crafting run variety.** Each run diverges through the block
   pool you buy and the advantages you pick; special blocks create
   synergies.
4. **Escalating pressure with rule-breaking bosses.** Every third level a
   boss changes one rule (reverses fall direction, periodically rotates
   your pieces, etc.), forcing adaptation.

## First useful workflow (MVP slice)

A single playable run: grid + 7 base pieces, place/rotate/lock, line
clears with combo scoring and gravity-driven chain reactions, a per-stage
target score, advance through stages, game over when you cannot place or
miss the target. This slice alone should already be fun. Special blocks,
the shop economy, advantages, and bosses layer on top.

## Non-goals (for the clone)

- Not a real-time reflex/speed game.
- Not multiplayer.
- Exact art assets, sound, and store/marketing copy are out of scope —
  we replicate **mechanics and feel**, not proprietary content.
