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

## Confirmed structure + delegated design (2026-07-14)
- **Run = 3 Acts × 10 stages = 30 stages** — confirmed by the requester
  (`[SRC]`). The requester delegated everything else, asking us to
  **design it for UX and fun**. Those systems are tagged `[DES]` in the
  spec (distinct from `[DEF]` fallbacks) and detailed in
  `notes/design-acts.md`.
- Key `[DES]` decisions: boss cadence (mini-boss at within-act 3/6/9 + Act
  Boss at 10); ~10×/act target scaling paired with a new block group each
  act; **board carries within an act, resets per act** (to make Obsidian
  and planning matter); shop after every stage + free Treasure pick after
  each Act Boss; 5 active-advantage slots; spatial (not timed) loss.

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

## Implementation pass (2026-07-14) — decisions made while building

The full clone is implemented in `app/` (engine in `app/src/engine`,
config in `app/src/data/*.json`, tests in `tests/`). Decisions taken
where spec.md left room, all `[DEF]` (tunable):

- **Rendering: DOM grid, not Canvas.** The board is only 8×12 = 96 cells
  and the juice layer (per-cell pop, shake, flash, counters) maps cleanly
  onto CSS animation with far less code than a Canvas renderer; at this
  cell count React reconciliation is nowhere near a bottleneck. Revisit
  only if effects outgrow the CSS budget.
- **Colors: 4** (`colorCount` in `data/scoring.json`), Okabe–Ito
  colorblind-safe palette + per-color glyphs (●▲■◆) so color is never the
  only channel.
- **The Turner rotates the board 180°, not 90°** — a 90° turn is
  impossible on the non-square 8×12 grid without remapping dimensions;
  180° keeps the "your careful stack is now upside down" effect. Spec
  §8.2 updated to match.
- **"Crusher" mini-boss redefined** ("heavier gravity" in the original
  pool): with always-on per-cell gravity a "stronger pull" is a no-op, so
  Crusher now *crushes the bottom row without scoring* every 5 placements
  — it eats chain setups, which is the same pressure the rule wanted.
- **"Chroma Pulse" automation** (was "gravity pulse", same reasoning as
  Crusher): every 4th lock it recolors one random block to match a
  neighbor, which can ignite a chain — an added detonation per §8.4's
  automation-as-spectacle rule.
- **`junk` block type added** (indestructible, no multiplier) for boss
  garbage (Warden injections, nudges). Obsidian stays a *buff* obstacle;
  junk is a pure obstacle.
- **Extra group members authored**: Bomb (Explosives, bigger radius),
  Spore (Colony, 1-cell vine), Rune (Arcane, multiplies clears it joins),
  Prism (Harmony, wildcard color) — spec §5.3's member-block slots.
- **Hold is advantage-gated** ("Pocket") rather than a base control —
  spec §3.2 marks hold optional; selling it as a rule-changer makes it a
  build choice.
- **Vine growth**: one growth step per placement, closest disconnected
  pair, into an empty *supported* cell (no floating vines).
- **Stage-1 hook layout**: two seeded bottom rows + a scripted 6-piece
  opening bag; any A-colored drop touching the A-cluster detonates an
  A→B→C 3-link chain (verified by unit test + browser playtest).
- **Crescendo re-validation (spec §8.1)**: a greedy 1-ply bot playing
  five full seeded runs showed Act 3 stages at `actBase = 12000` taking
  40–60 placements (~3–5 min) against the ~80 s/stage pacing target, so
  **Act 3 base was tuned 12000 → 9000** (`data/stages.json`). Bot results
  after tuning: 2/5 full-run wins, Act 3 stages ~15–40 placements — hard
  but reachable, with human play + build synergy expected to beat the
  bot. Acts 1/2 kept as specced.
- **Overkill credit rate**: `+1 credit per 25% of target` implemented as
  `floor(overkill / (target × 0.25))`, config `overkillCreditPer`.
- **Pressing risk is real**: topping out while pressing ends the run
  (spec §8.3 calls it a genuine gamble; banking stays always-safe).

## Balance fix (2026-07-14, follow-up): per-cell piece colors

**Blind spot found in play:** pieces were colored *per piece* (all 4
cells one color) while the shape-clear rule is "same-color group ≥ 4" —
so every tetromino was already a qualifying group and **self-cleared on
lock**. The board never accumulated blocks, DANGER never engaged, and
mashing the drop key cleared stages.

**Fix `[DEF]`:** colors are now assigned **per cell**. 4-cell normal
pieces always mix **exactly two distinct colors with both present**
(max same-color run = 3 < N), so a clear can only be *assembled across
placements* — restoring the Puyo-style setup game. Special pieces and
small (<4-cell) pieces stay mono-color. The stage-1 scripted bag keeps
one mono I piece as the hook detonator; its other pieces are mixed.

Verified: a drop-key-mash bot now tops out at stages 3–6 (stages 1–2
still pass — intended onboarding), while the greedy 1-ply bot keeps
2/5 full-run wins with losses coming from board fill, not stalling.
Unit test added ("4-cell pieces always mix ≥2 colors").
