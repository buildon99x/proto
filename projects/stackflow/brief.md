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

"Fit the piece perfectly, then watch one placement **detonate** into a
board-clearing chain that keeps escalating." The reward loop is the
crescendo — visual + score payoff building link by link — of a chain
reaction the player *set up* several moves earlier.

## Primary aesthetic & the thrill principle `[DES]`

- **Primary aesthetic = the catharsis of a chain you set up detonating**
  (MDA *Sensation* crescendo). "Perfect fit" is the *setup* pleasure that
  feeds it, not the top-line emotion. See `notes/mda-review.md`.
- **Thrill (박진감) comes from stakes + payoff spectacle + tension–release
  rhythm — never from speed.** The game stays **no-timer** (no soft-drop
  race, no lock clock); pressure is spatial (the board fills — sharpened by
  the **rising tide** that raises a clearable floor row every placement) and
  dramatic (the payoff), so a thinky player still feels the rush. Even the
  **≥1-minute-per-stage** floor is enforced by *balancing*, never a clock.
  This is the invariant that keeps the slow, deliberate identity intact.
- **Localized (Korean).** The whole UI is Korean, and every item carries a
  tooltip explaining it — the depth is legible, not buried.

## Design pillars

1. **Set-up → detonation is the pleasure.** Perfect, "buttery" placement
   and rotation are the *setup*; the payoff is a chain that visibly
   crescendos. Reward reading your own chain resolve.
2. **Thrill without a clock.** Reward setting up multi-step chain
   reactions, not fast clearing — but make the payoff *loud* and the
   board-space squeeze *tense* (the **rising tide** creeps up every
   placement, so idling is never safe — yet it is always drainable by skill,
   never a clock). Slower cadence, thinkier decisions, high drama.
3. **Build-crafting run variety.** Each run diverges through the block
   pool you buy and the advantages you pick; special blocks create
   synergies that let you *assemble* bigger detonations.
4. **Escalating pressure with rule-breaking bosses.** Every third level a
   boss changes one rule (reverses fall direction, periodically rotates
   your pieces, etc.) and *actively pushes back*, forcing adaptation and
   building to a climax.
5. **Legible spectacle, not chaos.** Juice escalates step-by-step within a
   fixed "juice budget"; colorblind-safe + shape/icon coding; reduce-motion
   option. The dopamine is in *reading* the chain, never in visual noise.

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
