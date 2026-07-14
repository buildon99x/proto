# Spec — Stackflow (buildable clone specification)

This spec is written so a team can build a game mechanically identical to
Stackflow (Steam App `3908810`) from this document alone.

**Confidence tags** mark provenance:

- `[SRC]` — observed from public sources (store page, patch notes,
  reviews, gameplay video). See `notes/reverse-engineering.md`.
- `[INF]` — inferred from genre conventions + `[SRC]` evidence; near
  certain but not directly stated.
- `[DEF]` — clone design default chosen to make the spec buildable where
  the original's exact value is undocumented. Tunable; see
  `notes/decisions.md`.
- `[DES]` — **original design for this clone**, authored to fit the game
  feel with a focus on UX and fun (not a claim about the source). Used for
  the systems the requester delegated to us. See `notes/design-acts.md`.

**Known structure (requester-confirmed) `[SRC]`:** a run is **3 Acts × 10
stages = 30 stages**. Everything hanging off that skeleton (target curve,
boss placement, per-act content, economy pacing, UX beats) is designed
here under `[DES]`.

**Design intent — the thrill layer `[DES]`:** the primary aesthetic is
the **catharsis of a chain you set up detonating** (MDA *Sensation*
crescendo). **Thrill (박진감) is delivered through stakes + payoff
spectacle + tension–release rhythm, never through speed** — the game stays
**no-timer**. This principle drives the `[DES]` systems marked *(thrill
layer)* below: payoff crescendo (§7.1), top-out tension (§8.7), active
boss set-pieces (§8.2), push-your-luck economy (§8.3), and a guaranteed
first-run hook (§8.7). Rationale and the full improvement backlog:
`notes/mda-review.md`.

---

## 1. High-level loop `[SRC]`

```
Run start
  └─ pick starting block pool
  └─ Stage loop (levels 1..N):
        ├─ Play phase: draw pieces, place/rotate/lock, clear, combo,
        │              chain-react, accumulate score
        ├─ Level clears when score >= target  → earn credits
        │  (or game over if board fills / cannot place / target missed)
        ├─ Every 3rd level = BOSS level (a rule modifier is active) [SRC]
        └─ Between-level shop: spend credits on new blocks + advantages [SRC]
  └─ Run ends at death or final stage.
```

Each level presents a **target score**; you must reach it "through clever
strategies and perfect timing" `[SRC]`. Reaching the target advances you;
the game "raises the stakes — score targets grow, new blocks appear, and
more aggressive modifiers come into play." `[SRC]`

---

## 2. Board / grid `[INF]/[DEF]`

- Rectangular cell grid. **Default: 8 columns × 12 rows** `[DEF]`
  (evidence: reviews describe it as slower/thinkier than Tetris and more
  about maximizing space than clearing quickly `[SRC]`, implying a compact
  strategic board rather than a tall Tetris well). Grid size MUST be a
  single config constant so it can be retuned.
- Cells are empty or occupied by a **block** (see §5). A placed piece
  deposits one block per covered cell.
- Origin at top-left `(col, row)`; row 0 at the top.

## 3. Pieces & the piece queue

### 3.1 Base pieces `[INF]`
Seven standard tetrominoes (`I, O, T, S, Z, J, L`) as the base shape set
`[INF]` — the game is repeatedly called a "Tetris roguelike" and shows
Tetris-like pieces `[SRC]`. The clone MUST model pieces as generic
**polyominoes** (list of cell offsets) so non-tetromino special shapes and
future block groups can be added without special-casing.

```ts
type Cell = { dc: number; dr: number };      // offset from piece origin
type PieceShape = {
  id: string;
  cells: Cell[];                              // occupied offsets
  blockType: BlockType;                       // default block deposited
  group?: BlockGroup;                         // Explosives|Colony|Arcane|Harmony
};
```

### 3.2 Draw model `[SRC]/[DEF]`
"You start each run by grabbing random blocks from a pool and placing them
on the grid." `[SRC]` The **block pool** is a bag of piece definitions that
the run's shop purchases add to. `[SRC]`

- Pieces are drawn from the pool. `[DEF]` Use a shuffled-bag draw
  (Tetris-style 7-bag when pool is the 7 base pieces; generalize to a
  weighted bag as the pool grows).
- **Colors are per cell, not per piece `[DEF]`:** a 4-cell normal piece
  always mixes exactly two distinct colors (both present), so no piece
  can satisfy the ≥N same-color rule by itself and self-clear on lock —
  clears must be assembled across placements (see `notes/decisions.md`,
  balance fix).
- Show current piece + a **next/preview** of at least 1 upcoming piece
  `[DEF]`. A hold slot is optional `[DEF]`.

### 3.3 Placement & rotation `[SRC]`
Core loop = "rotating pieces to find the exact angle where they lock into
place." `[SRC]`

- **Move:** left / right / down one cell.
- **Rotate:** clockwise, counter-clockwise, and 180° `[SRC]` (all three
  confirmed added by Update 0.7 "a better rotation system"). Use SRS-like
  wall kicks so rotation near walls feels "buttery smooth" `[SRC]`.
- **Placement style `[INF]/[DEF]`:** unlike Tetris there is no time
  pressure to slam pieces; the player positions deliberately, then
  commits. Model as: piece is steerable until the player **locks** it
  (hard-drop/confirm) OR gravity settles it. Default to *manual
  confirm + gravity-assisted settle* `[DEF]` (see §4). No lock-out timer
  `[SRC]` (game is slow/thinky).

## 4. Gravity, settling, lock `[SRC]`

Chain reactions require **gravity** `[SRC]` (the update that "fixed the
gravity system" also "introduced chain reactions" — the two are linked).

Rules `[INF]/[DEF]`:

1. On lock, the piece's blocks are written to the grid.
2. **Gravity pass:** any block (or group of connected blocks, per block
   rules) not supported falls straight down until supported. `[DEF]`
   (Puyo-style per-cell gravity is the default; some special blocks fall
   as connected groups — see Vine §5.)
3. **Resolve pass:** evaluate clear conditions (§6). Any cleared cells are
   removed and score/effects applied.
4. **Cascade:** after clears, run gravity again; if new clears occur,
   that's the next **chain link**. Repeat until stable. Each successive
   resolve in one commit increases the **chain counter** → higher combo
   multiplier (§7). This cascading is the "chain reaction that can clear
   large sections of the board at once." `[SRC]`

## 5. Blocks & block groups

A **block** is the unit deposited in a cell. Beyond the plain scoring
block, Stackflow has special blocks with powers and four **block groups**
with synergies `[SRC]`.

### 5.1 Block model
```ts
type BlockType =
  | "normal"      // plain; clears via line/shape, gives base points
  | "stone"       // explodes into points when destroyed
  | "obsidian"    // indestructible; grants a permanent score multiplier
  | "vine"        // grows toward nearby vines; chained destruction
  | "combo"       // "Combo Tile": triggers chain reaction on shape/color match
  | "booster";    // "Score Booster": multiplies points of a clear
type BlockGroup = "explosives" | "colony" | "arcane" | "harmony";
```

### 5.2 Confirmed special blocks `[SRC]`
| Block | Effect (as documented) |
|-------|------------------------|
| **Stone** | Explodes into points when destroyed. `[SRC]` Treat as a normal-clearable block that yields a large point burst + small AoE (see Explosives). |
| **Indestructible Obsidian** | Cannot be cleared by lines/shapes; grants a **permanent multiplier** while on the board. `[SRC]` It is an obstacle AND a buff — placing it costs board space but boosts all scoring. |
| **Vine** | Each time a piece is placed, a Vine **grows toward a nearby Vine to connect** with it. When destroyed it **destroys all connected Vines, giving +1 Stack and +1 more for each block in the chain.** `[SRC]` ("Stack" = the run's core score/resource.) |
| **Combo Tile** | Activates chain reactions **when matched with certain shapes or colors.** `[SRC]` A trigger tile: completing a qualifying pattern adjacent to it detonates a chain. |
| **Score Booster** | Multiplies the points of clears (a scoring-modifier block). `[SRC]` |

### 5.3 Block groups & synergies `[SRC]/[DEF]`
Update added four groups — **Explosives, Colony, Arcane, Harmony** — "with
special synergies." `[SRC]` Exact synergy tables are undocumented; the
clone implements them as follows `[DEF]` (each group ties to the archetype
its name and the confirmed blocks imply):

| Group | Theme | Member blocks `[DEF]` | Synergy `[DEF]` |
|-------|-------|-----------------------|-----------------|
| **Explosives** | AoE destruction | Stone, Bomb | On destroy, damage/clear neighbors in a radius; each Explosive cleared in a chain raises the chain's blast radius by 1. |
| **Colony** | Growth / spread | Vine, Spore | Connected-group blocks that grow toward kin on each placement; destroying one destroys the whole connected colony, scoring per member. |
| **Arcane** | Multipliers / rules | Obsidian, Rune, Combo Tile | Provide multipliers and trigger effects; Arcane blocks multiply the score of any clear they participate in. |
| **Harmony** | Color/shape matching | Booster, Prism | Reward same-color or matched-shape clears; each Harmony block in a clear adds to the combo multiplier. |

> The group model is the mechanically important part (grouping + synergy
> hook); exact per-block numbers are tunable in `data/blocks.json`.

## 6. Clear conditions `[SRC]`

A **clear** removes blocks and scores. Two documented triggers `[SRC]`:

1. **Line clear** — "complete a line" → those blocks clear instantly.
   `[SRC]` A full row (all columns filled) clears. `[INF]` (Optionally full
   columns too `[DEF]`.)
2. **Shape clear** — "fill a specific shape" → the game registers a combo
   and clears those blocks. `[SRC]` **Catalog (confirmed for the clone,
   T11) `[DES]`:** the **primary cascade engine is a same-color connected
   group of size ≥ N** (default **N = 4**, 4-connectivity) — this is the
   Puyo-style match that produces most chains and is the main tuning knob
   for chain frequency (with the color count, §13/`data/scoring.json`).
   2×2 squares and plus-shapes are naturally covered by the ≥N group rule.
   **Combo Tile trigger `[DES]`:** a Combo Tile detonates when it becomes
   **adjacent to any cleared group in a resolve pass** (a "certain shape or
   color match" `[SRC]`), clearing its neighborhood and feeding the chain.

Obsidian is exempt (indestructible) `[SRC]`. Cleared blocks fire their
on-destroy powers (Stone burst, Vine chain, etc.) which can cause further
clears — feeding the cascade in §4.

## 7. Scoring & combos `[SRC]/[DEF]`

Score is the run's currency of progress ("**Stack**" `[SRC]`). Reach the
level **target score** to advance `[SRC]`.

**Per-clear score `[DEF]`:**
```
clearScore = baseBlockValue × blocksCleared
           × chainMultiplier(chainLink)
           × Π(active multipliers: Obsidian, Score Booster, Arcane, ...)
```
- `baseBlockValue` — default 10 per cleared block `[DEF]`.
- `chainMultiplier(k)` — grows with cascade depth `k` (the chain counter
  from §4). **`[DES]` (thrill layer): super-linear** so a deep chain feels
  *overwhelming*, not merely additive:
  `chainMultiplier(k) = 1 + k·(k−1)/2` for `k ≥ 1`
  → `1, 2, 4, 7, 11, 16, 22, …`. (Old linear `max(1, 2·(k−1))` =
  `1,2,4,6,8,…` kept as a tunable fallback; the super-linear curve is the
  crescendo default and MUST be re-validated against the §8.1 target curve
  — see §7.1 and `data/scoring.json`.) Chains are the primary score
  amplifier `[SRC]`.
- Multipliers stack multiplicatively; Obsidian's is **permanent** while it
  sits on the board `[SRC]`.
- **Stone** adds a flat burst on destroy; **Vine** adds `+1 Stack per
  connected vine` on destroy `[SRC]`.

**"Perfect fit" flourish `[DES]`:** placing a piece that completes a clear
with **no wasted gap** gives a spark + a small bonus **×1.1** to that
clear (design pillar #1). Small on purpose — it rewards precision without
dominating the chain crescendo.

### 7.1 Payoff crescendo (thrill layer) `[DES]`

The catharsis is the *primary aesthetic*, so scoring is built to make a
big detonation feel enormous and legible. All numbers live in
`data/scoring.json`.

- **Super-linear chain multiplier** (above) — deep chains dwarf flat
  clears, so setting up a cascade is the highest-skill, highest-reward
  play.
- **Live chain counter** — an on-screen counter ratchets up **per cascade
  link** (`×2 → ×4 → ×7 …`) with rising pitch, so the player *watches the
  stakes climb* mid-resolve (the dopamine is in reading it — §12).
- **Perfect-clear bonus** — emptying the **entire board** in one commit is
  the spectacle peak: **×4** to that commit's score + a full-board flash.
  Tracked as a run-best stat (§8.5).
- **Overdrive meter** `[DES]` — a meter fills from chain activity
  (`+1 per cleared block`, `+5 bonus per link ≥ 5`). At full it triggers
  **Overdrive**: the **next N placements** (default **N = 3**, *piece-count
  based — no timer*) score **×2** and render at max juice — a designed
  climax the player can *aim* for. Overdrive empties the meter; it never
  fires on a clock.
- **Big-chain tier-up** — a chain reaching **link ≥ 5** escalates the
  visual/audio treatment one tier (§12), signalling "this is a big one."

> Balance note: the super-linear curve + Overdrive interact with the
> §8.1 target curve; §8.1 flags a re-validation pass. Guardrail (I12): the
> crescendo must be *assemblable via build* (group synergies, advantages),
> not pure RNG — see `notes/mda-review.md` §6.

## 8. Roguelike run structure `[SRC]`

### 8.1 Acts, stages & target curve `[SRC]/[DES]`

A run is **3 Acts × 10 stages = 30 stages** `[SRC]`. Each stage has its own
**target score**; escalation is confirmed `[SRC]`, the numbers are `[DES]`.

Indexing: global stage `n = 1..30`; `act = ceil(n/10)`; within-act
`s = ((n-1) mod 10) + 1`.

**Target formula `[DES]`:**
```
target(n) = round( actBase(act) × (1 + 0.18·(s-1)) × bossBump(s) )
actBase   = { Act1: 100, Act2: 1200, Act3: 9000 }
// Act3 was 12000 (~10× per act); re-validated against the §7.1 crescendo
// with a greedy-bot sim and tuned to 9000 to hold the ~80 s/stage pacing
// (see notes/decisions.md, implementation pass).
bossBump  = 1.30 at s∈{3,6,9} (mini-boss) ; 1.60 at s=10 (Act Boss) ; else 1
```
Each act is ~10× the previous because the player's **scoring engine also
scales** each act (a new block group + more advantages, §8.6). Within an
act the target ramps ~18%/stage, with spikes on boss stages so bosses feel
like gates. Tunable in `data/stages.json`.

**Act 1 target table `[DES]` (illustrative):**

| Stage n | s | Kind | Target |
|---|---|------|-------:|
| 1 | 1 | intro (tutorial beat) | 100 |
| 2 | 2 | normal | 118 |
| 3 | 3 | **mini-boss** | 177 |
| 4 | 4 | normal | 154 |
| 5 | 5 | normal | 172 |
| 6 | 6 | **mini-boss** | 247 |
| 7 | 7 | normal | 208 |
| 8 | 8 | normal | 226 |
| 9 | 9 | **mini-boss** | 317 |
| 10 | 10 | **Act Boss** | 419 |

Acts 2 and 3 use the same shape scaled by `actBase` (Act 2 finale ≈ 5,030;
Act 3 finale / final boss ≈ 37,700 after the re-validation tune).

**Pacing target `[DES]`:** ~42 min/run `[SRC]` ⇒ ~80 s/stage average.
Targets are tuned to be reachable in roughly 1–2 min of deliberate play so
the run breathes rather than grinds.

**Crescendo re-validation `[DES]`:** the §7.1 super-linear chain multiplier
and Overdrive change how fast a skilled player scores, so the target curve
above MUST be re-checked against them (a top-tier chain should *beat* a
stage, not trivialize the whole act). Treat `actBase`, the `0.18/stage`
ramp, and the chain curve as **paired tuning knobs** in
`data/stages.json` + `data/scoring.json`.

**Stage 1 = guaranteed hook `[DES]` (thrill layer, T4):** stage 1 is not a
dry tutorial — its opening bag + a low target (100) are seeded so the
player triggers a **satisfying multi-link chain within the first ~60
seconds** (see §8.7 Onboarding). The hook must land *before* any rule
complexity.

### 8.2 Bosses `[SRC]/[DES]`

Confirmed: bosses arrive on a **"every third level"** cadence and each
"brings a new rule." `[SRC]` Mapped onto the 3×10 structure `[DES]`:

- **Mini-bosses** at within-act stages **3, 6, 9** (honoring "every 3rd") —
  one readable rule modifier, drawn from a pool.
- **Act Boss** at stage **10** — a signature, tougher encounter that caps
  the act (a rule + the target spike above) and gates the next act.

**Confirmed boss rules `[SRC]`** (seed the mini-boss pool): reverse the
direction blocks fall; periodically rotate your blocks.

**Mini-boss rule pool `[DES]`** (each = one clear twist): hide the next
preview; heavier/faster gravity; every Nth piece is randomized; a column
is temporarily locked; a garbage row rises; target raised mid-stage. Each
mini-boss also carries **one light active nudge** `[DES]` (thrill layer):
if the player idles (many placements with no clear) the boss adds a single
junk cell — a gentle push so the encounter *pushes back* instead of
sitting still. (Piece-count based, never a timer.)

**Signature Act Bosses `[DES]`:**
- **Act 1 — "The Inverter":** permanently reverses fall direction for the
  stage (teaches adaptation gently).
- **Act 2 — "The Turner":** rotates the whole board 180° at intervals
  (90° is impossible on the non-square grid — see `notes/decisions.md`).
- **Act 3 — "The Warden":** injects indestructible junk every few pieces
  and narrows the usable width — the run's final gate.

**Act Boss as an active set-piece `[DES]` (thrill layer, T5):** an Act Boss
is a *duel with a climax*, not just a higher number.
- **Break gauge:** the Act Boss shows a **Break bar** the player fills by
  scoring; hitting the (spiked) target **breaks** the boss. This reframes
  the target as an on-screen enemy you're beating down.
- **Two phases:** at **60% of target** the rule **intensifies** (e.g., The
  Warden narrows another column; The Turner turns more often) — a
  telegraphed escalation that raises tension before the finish.
- **Defeat crescendo:** on break, a **board-clear spectacle** fires
  (screen flash + max juice, §12), *then* the **Treasure** pick (§8.3)
  appears — the milestone power-spike moment roguelike players chase.

A **mini-boss** stage is cleared by hitting its (spiked) target under the
active rule + nudge. An **Act Boss** is cleared by breaking its gauge
(same target), which triggers the defeat crescendo and a **Treasure**
reward pick (§8.3). The "every 3rd level" cadence `[SRC]` is preserved.

### 8.3 Economy / shop `[SRC]/[DES]`
- **Credits** are earned by **destroying blocks and clearing stages.**
  `[SRC]` Spent **between rounds** to **buy new blocks and shape your
  strategy.** `[SRC]`
- **Credit rewards `[DES]`:** on stage clear, `reward = actBase-tier
  stipend + 1 per block destroyed this stage`; stipend `{Act1: 6, Act2:
  10, Act3: 16}`, boss stages pay **×2**. Unspent credits carry over.
- **Push-your-luck / overkill `[DES]` (thrill layer, T6):** clearing a
  stage does **not** auto-advance. On hitting the target the player
  chooses **Bank & advance** (safe) or **Press** — keep placing to rack up
  **overkill** score, which converts to **bonus credits**
  (`+1 credit per 25% of target scored beyond it`). Pressing is pure
  upside *except* the board keeps filling toward top-out (§8.7) — a real
  gamble, never forced. Banking is always safe, so greed is optional
  (guardrail: no unfair loss).
- **Shop cadence `[DES]` (thrill layer, T3):** to keep the run's rhythm
  tight, full-screen shops don't interrupt *every* stage. **Full shop**
  (3 offers + rising-cost **reroll**) after **even within-act stages
  (2, 4, 6, 8, 10)**; after **odd stages (1, 3, 5, 7, 9)** an **inline
  quick-buy** — a single 1-tap offer you buy or skip without leaving the
  board. Offers mix new **blocks** (join the pool, §3.2) and **advantages**
  (§8.4). This halves menu downtime (~15 full shops/run instead of 30)
  while **total offer volume is preserved** (guardrail: build expression
  intact — see `notes/mda-review.md` §6).
- **Treasure `[DES]`:** after each **Act Boss** the player gets a **free
  1-of-3 rare pick** (a rare block or a strong advantage) — a visible
  milestone reward that re-tools the engine for the next, harder act.
- **Advantage draft `[DES]`:** advantages are bought in the shop, plus a
  **guaranteed pick** at each Act Boss Treasure. Cap **active advantages
  at 5 slots** so choices stay meaningful (drop/replace to add more).

### 8.4 Advantages (roguelike perks) `[SRC]`
Store text (verbatim): "Powerful advantages that completely revolutionize
your playstyle! **Smart automation, explosive multipliers, and unique
mechanics** that make every run unpredictable and addictive." `[SRC]` The
three named categories map 1:1 to the model's three kinds below —
automation, reward-multiplier, rule-changer.

Model `[DEF]`:
```ts
type Advantage = {
  id: string;
  name: string;
  kind: "automation" | "reward-multiplier" | "rule-changer";
  apply(run: RunState): void;   // hooks into events (onPlace, onClear, ...)
};
```
Example advantages `[DEF]` (three per documented kind):
- **Automation `[DES]` (redesigned, T8): make it a *spectacle trigger*, not
  silent convenience.** Automating away the player's decisions lowers felt
  competence (P3) and drains thrill, so automation perks instead *add*
  detonations: **"every N placements a random color group detonates"** (a
  free bonus cascade); **"each lock fires a gravity pulse that can chain"**;
  **"best-fit ghost"** as an *assist toggle* (accessibility, not a core
  slot). Convenience that removes spectacle is avoided.
- Reward-multiplier: +50% credits per clear; chain multiplier +1 per
  link; Obsidian multiplier doubled; Overdrive lasts +1 placement.
- Rule-changer: pieces are smaller; two next-previews; a free hold slot;
  lines clear at 90% fill.

### 8.5 Play meta / progression layers `[SRC]/[INF]`

Stackflow's "meta" is **primarily in-run build-crafting**, not heavy
cross-run persistence. Its lineage confirms this: before the economy
update the game was described by the community as "**Balatro without the
shop** — just playing poker hands over and over", and the developers
added **credits + a between-round shop** specifically to give runs a
build/decision layer `[SRC]`. So the run *is* the meta.

**In-run meta (the main loop, well-documented) `[SRC]`:**
- Build a **block pool** by buying blocks in the shop (§8.3).
- Stack **advantages** (§8.4) that compound (automation / multipliers /
  rule-changers).
- Exploit **block-group synergies** (Explosives/Colony/Arcane/Harmony,
  §5.3) and permanent on-board multipliers (Obsidian).
- Target: survive escalating levels + a boss every 3rd level.

**Cross-run meta (light; collection-oriented) `[SRC]/[INF]`:**
- **Blockipedia** — an in-game screen to **discover and catalog all
  blocks you have encountered.** `[SRC]` This is a compendium/collection
  layer; new blocks are **unlocked/discovered** through play `[SRC]`.
- Beyond the Blockipedia, **no persistent power-progression, unlockable
  characters/decks, or difficulty-ascension tiers are confirmed** in
  public sources `[INF]`. The clone should treat cross-run persistence as
  **minimal by default**: (a) a Blockipedia that unlocks discovered
  blocks into a catalog, and optionally (b) high-score / best-level
  tracking. Anything more (meta-currency, ascensions) is an **open
  question** (see `notes/reverse-engineering.md`) — add only if validated.
- **Bragging meta `[DES]` (thrill layer, T10):** track and persist
  **run-bests** — **biggest chain (links)**, **highest single-clear
  score**, **most perfect-clears**, **furthest act**. During play, crossing
  a threshold (e.g., a chain of **link ≥ 7**, or beating your run-best
  single clear) fires an **"INSANE COMBO!"** callout. This is a
  **discovery-type variable reward** (P7) — earned by skill/build, **no
  MTX, no gacha** (guardrail ④). It powers the "one more run" loop
  (*Submission*) by giving the player a number to beat.

**Run length / bounds `[SRC]/[INF]`:**
- Average session ≈ **42 minutes** `[SRC]`.
- The base run is **bounded/escalating**, not endless — an **endless /
  infinite mode is a community request, not a shipped default** `[SRC]`,
  which implies the standard run ends (death by filling the grid, or a
  finite stage ladder). **The exact stage count and whether there is a
  defined final boss/ending are undocumented** `[INF]` — the clone
  defaults to "escalate until the board can no longer accept a piece"
  (see §8.1 curve) and flags this as an open question.

## 8.6 Act themes & content rollout `[DES]`

Each act introduces a **new "toy"** so the run keeps surprising the player
and the escalating targets stay winnable (a fresh scoring tool arrives as
the numbers grow). This is the primary variety/fun driver.

| Act | Theme | New content introduced | Boss flavor |
|-----|-------|------------------------|-------------|
| **1 — Foundations** | Learn the loop, first combos | 7 base pieces, **Obsidian**, **Stone**, the **Explosives** group; Combo Tiles | Gentle single-rule twists (reverse fall, slow rotation) |
| **2 — Growth** | Setup-heavy chains | **Colony** (Vine) + **Arcane** (Combo Tile synergies, Rune) groups | Board-turning / gravity-flip pressure |
| **3 — Harmony / Chaos** | Everything synergizes; payoff | **Harmony** (Booster, Prism) group; highest-tier blocks | Combined rules, junk injection, board narrowing |

Design intent: by Act 3 the player is detonating multi-group chains they
spent the run assembling — the "insane combos" the store promises. `[SRC]`

## 8.7 Session pacing, board carry & UX beats `[DES]`

Focused on user experience and fun (the explicit brief):

- **Rhythm per act:** warm-up (1–2) → twist (3) → build (4–5) → twist (6)
  → build (7–8) → twist (9) → **climax boss (10)** → Treasure. Tension
  rises and releases four times per act instead of one long grind. The
  **calm beats are the full shops** (even stages) and the **bank/press
  decision** (§8.3); the spikes are the bosses (§8.2). Odd-stage inline
  quick-buys keep momentum between beats (thrill layer, T3).
- **Board carry `[DES]`:** the board **persists across stages within an
  act** and **resets at each act start**. This makes **Obsidian's
  permanent multiplier** and board planning genuinely strategic (your
  past placements help *and* clutter you), while act resets stop clutter
  from compounding forever. *Score* resets to 0 each stage (earn the
  target fresh). Tunable alternative: full board reset each stage (more
  accessible, weaker Obsidian) — see `notes/decisions.md`.
- **Loss condition + top-out tension `[SRC]/[DES]` (thrill layer, T1):**
  you must hit the stage target **before the board tops out** (a placed
  piece has nowhere to go) `[SRC]/[INF]`. Pressure is spatial, not a timer.
  Crucially, this pressure is **dramatized**: as the stack rises into the
  **top rows** the game enters an escalating **DANGER state** — board-edge
  glow, a **heartbeat SFX whose tempo scales with fill %**, a color/vignette
  shift, and a "DANGER" banner. The squeeze becomes a *felt* second
  tension axis alongside the score bar (this is what makes push-your-luck,
  §8.3, thrilling rather than abstract).
- **Onboarding `[DES]` (thrill layer, T4):** **stage 1 is engineered to
  detonate the hook in the first ~60 s** — its seeded opening bag makes a
  **multi-link chain almost unavoidable**, so the player *feels* the core
  dopamine before learning anything else (I3/P12 toy-first). Stages 1–2
  then introduce move/rotate and the shop with light contextual prompts;
  no boss before stage 3. Teach *after* the wow, not before.
- **Juice `[DES]` (thrill layer, T7):** animate cascades **step-by-step**
  so the player reads each chain link; **SFX pitch climbs per link**;
  **screen-shake scales with chain size**; a brief **time-dilation
  (~120 ms slow-mo then snap) on the biggest link**; combo/'+score' popups
  that scale with size; the live chain counter (§7.1); a **tier-up** at
  link ≥ 5. **Juice budget `[DES]`:** a hard cap on concurrent
  effects + a **reduce-motion / photosensitivity toggle** keep it
  **legible, never seizure-fast** (guardrail ⑥; premortem `mda-review.md`
  §6). Legibility always wins over spectacle.
- **Fail-forward `[DES]`:** the run summary is a **spectacle of your best
  moments** — furthest act, **biggest chain (links)**, highest single
  clear, perfect-clears, blocks destroyed, and the build assembled
  (run-bests, §8.5) shown big; one-key restart to keep the "one more run"
  loop tight.
- **Accessibility `[DES]`:** colorblind-safe block palette **plus**
  shape/icon coding (never color alone), remappable keys, no reflex time
  pressure. (See the `dataviz` palette guidance for color choices.)

## 9. Game state model `[DEF]`

```ts
type RunState = {
  act: number;                // 1..3
  stage: number;              // global 1..30 (act = ceil(stage/10))
  score: number;              // "Stack" this stage (resets each stage)
  target: number;             // target(stage), see §8.1
  credits: number;
  grid: (Block | null)[][];   // [row][col]; carries within act, resets per act (§8.7)
  pool: PieceShape[];         // draw bag (grown by shop, §8.3)
  queue: PieceShape[];        // current + previews
  active: ActivePiece | null; // piece being positioned
  advantages: Advantage[];    // max 5 active slots (§8.3)
  boss: BossRule | null;      // set on stages 3/6/9 (mini) and 10 (Act Boss)
  // --- thrill layer [DES] ---
  chainLink: number;          // live cascade depth this resolve (§7.1 counter)
  overdrive: number;          // Overdrive meter 0..100; at full → N ×2 placements (§7.1)
  overdriveLeft: number;      // remaining ×2 placements while Overdrive active
  bossGauge: number | null;   // Act Boss "Break" progress (§8.2); null off-boss
  danger: number;             // 0..1 top-out proximity → DANGER juice (§8.7)
  placements: number;         // pieces locked this stage (drives boss nudges, Overdrive)
  runBest: { chain: number; clear: number; perfectClears: number; act: number }; // persisted (§8.5)
  phase: "play" | "resolving" | "cleared"   // "cleared" = bank/press choice (§8.3)
       | "quickbuy" | "shop" | "treasure" | "gameover";
  seed: number;               // deterministic RNG for reproducible runs
};
// bossFor(stage): mini-boss if s∈{3,6,9}, Act Boss if s==10, else null (s = ((stage-1)%10)+1)
// shopFor(stage): full "shop" if s even; inline "quickbuy" if s odd (§8.3)

```
All randomness (bag, shop offers, advantage offers, boss selection) draws
from a single seeded PRNG so a run is reproducible for testing `[DEF]`.
`runBest` is the only cross-run persistent state beyond the Blockipedia
(§8.5).

## 10. Screens / UI `[INF]`

1. **Title / run setup** — start run, choose/confirm starting pool.
2. **Play screen** — grid center; current score vs. target (progress
   bar); level & boss banner (Act Boss shows the **Break gauge**, §8.2);
   next-piece preview; credits; active advantages; controls hint. **Thrill
   HUD `[DES]`:** live **chain counter** + **Overdrive meter** (§7.1), and
   the **DANGER** treatment (edge glow / heartbeat / banner) as the board
   nears top-out (§8.7).
3. **Bank/press prompt `[DES]`** — on hitting target: **Bank & advance**
   vs **Press for overkill credits** (§8.3).
4. **Shop / between-level** — full shop (even stages) with offered blocks &
   advantages, prices, buy/skip/**reroll**, "continue"; or the **inline
   quick-buy** (odd stages, §8.3) — a single offer over the board.
5. **Treasure `[DES]`** — free 1-of-3 rare pick after an Act Boss (§8.3).
6. **Game over / run summary** — level reached, final Stack, blocks
   destroyed, advantages taken, and **run-bests** (biggest chain, best
   single clear, perfect-clears — §8.5) shown big; one-key restart.
7. **Blockipedia** `[SRC]` — a compendium of all blocks discovered across
   runs, with each block's effect; entries unlock as blocks are
   encountered. The one confirmed cross-run persistent screen.

## 11. Controls `[SRC]/[DEF]`

| Action | Key (default) | Source |
|--------|---------------|--------|
| Move left/right | ← / → | `[INF]` |
| Move down | ↓ | `[INF]` |
| Rotate CW | X or ↑ | `[SRC]` rotation confirmed |
| Rotate CCW | Z | `[SRC]` CCW added |
| Rotate 180° | A | `[SRC]` 180° added |
| Lock / confirm place | Space | `[INF]` |
| Hold (if enabled) | C | `[DEF]` |
Controller support exists in the original `[SRC]`; the clone targets
keyboard first, gamepad optional.

## 12. Visual / audio feel `[SRC]`

- "Hypnotically addictive"; combos "explode into rewarding visual
  effects"; releasing "pure dopamine." `[SRC]` → juicy clear animations,
  screen-shake on big chains, escalating chain SFX, particle bursts on
  Stone/Explosives.
- Cadence deliberately **slower than Tetris** `[SRC]`; animations should
  read the cascade step-by-step so the player sees each chain link.
- **Thrill-layer feel model `[DES]`:** feedback is **tiered by chain
  depth** — per-link pitch climb + shake scaling, a ~120 ms time-dilation
  on the biggest link, a tier-up at link ≥ 5, and a full-board flash on a
  perfect-clear (§7.1). The **DANGER state** (§8.7) layers heartbeat SFX +
  edge glow as the board fills. All of it lives inside a **juice budget**
  (concurrent-effect cap) with a **reduce-motion / photosensitivity
  toggle** so the slow, legible identity holds (guardrail ⑥).

## 13. Build order for the clone (recommended)

Revised so the **MVP itself is thrilling** — the thrill layer (§0 intent)
is pulled forward, not bolted on last.

1. Grid + colored pieces (color count = a tuning knob) + move/rotate
   (3-way)/lock + line clear + same-color group-≥N shape clear (§6).
2. Gravity + cascade + **live chain counter + super-linear chain
   multiplier (§7.1)** — the core feel *and* first crescendo, together.
3. Level targets + advance/lose + **top-out DANGER viz (T1)** +
   **stage-1 scripted hook (T4)** + game-over summary with run-bests.
   → *This is the fun, thrilling MVP: the hook lands in the first minute.*
4. Special blocks: Stone, Obsidian, Vine, Combo Tile, Booster +
   perfect-clear/Overdrive (§7.1).
5. Shop economy with **pacing (full/quick-buy) + bank-press overkill
   (§8.3)** + block groups/synergies.
6. Advantages (perk system with event hooks; automation = spectacle
   triggers, §8.4).
7. Bosses (rule modifiers every 3rd level; **Act Boss break gauge +
   phases + defeat crescendo, §8.2**).
8. Full juice tiering within the **juice budget** + reduce-motion;
   **re-validate the target/score curves against the §7.1 crescendo**.

Milestones 1–3 are a complete, **thrilling** MVP; 4–8 layer on the
roguelike depth.

---

See `notes/reverse-engineering.md` for the evidence behind every `[SRC]`
claim and the list of open questions to validate against the live game.
