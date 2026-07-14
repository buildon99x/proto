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
   and clears those blocks. `[SRC]` The clone supports a table of
   qualifying shapes (e.g. 2×2 square, plus-shape, a same-color connected
   group of ≥ N) `[DEF]`. **Combo Tiles** and **color/shape matches**
   detonate here `[SRC]`.

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
  from §4): default `1, 2, 4, 6, 8, ...` i.e. `max(1, 2·(k-1))` for
  `k ≥ 2` `[DEF]`. Chains are the primary score amplifier `[SRC]`.
- Multipliers stack multiplicatively; Obsidian's is **permanent** while it
  sits on the board `[SRC]`.
- **Stone** adds a flat burst on destroy; **Vine** adds `+1 Stack per
  connected vine` on destroy `[SRC]`.

**"Perfect fit" flourish `[INF]/[DEF]`:** placing a piece that completes a
clear with no wasted gap gives extra feedback and a small bonus (design
pillar #1). `[DEF]`

## 8. Roguelike run structure `[SRC]`

### 8.1 Acts, stages & target curve `[SRC]/[DES]`

A run is **3 Acts × 10 stages = 30 stages** `[SRC]`. Each stage has its own
**target score**; escalation is confirmed `[SRC]`, the numbers are `[DES]`.

Indexing: global stage `n = 1..30`; `act = ceil(n/10)`; within-act
`s = ((n-1) mod 10) + 1`.

**Target formula `[DES]`:**
```
target(n) = round( actBase(act) × (1 + 0.18·(s-1)) × bossBump(s) )
actBase   = { Act1: 100, Act2: 1200, Act3: 12000 }   // ~10× per act
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
Act 3 finale / final boss ≈ 50,300).

**Pacing target `[DES]`:** ~42 min/run `[SRC]` ⇒ ~80 s/stage average.
Targets are tuned to be reachable in roughly 1–2 min of deliberate play so
the run breathes rather than grinds.

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
is temporarily locked; a garbage row rises; target raised mid-stage.

**Signature Act Bosses `[DES]`:**
- **Act 1 — "The Inverter":** permanently reverses fall direction for the
  stage (teaches adaptation gently).
- **Act 2 — "The Turner":** rotates the whole board 90° at intervals.
- **Act 3 — "The Warden":** injects indestructible junk every few pieces
  and narrows the usable width — the run's final gate.

A boss stage is defeated by hitting its (spiked) target under the active
rule; clearing an Act Boss grants a **Treasure** reward pick (§8.3).

### 8.3 Economy / shop `[SRC]/[DES]`
- **Credits** are earned by **destroying blocks and clearing stages.**
  `[SRC]` Spent **between rounds** to **buy new blocks and shape your
  strategy.** `[SRC]`
- **Credit rewards `[DES]`:** on stage clear, `reward = actBase-tier
  stipend + 1 per block destroyed this stage`; stipend `{Act1: 6, Act2:
  10, Act3: 16}`, boss stages pay **×2**. Unspent credits carry over.
- **Shop cadence `[DES]`:** a shop appears **after every stage** (a calm
  beat between tense stages), offering **3 items** — a mix of new
  **blocks** (join the pool, §3.2) and purchasable **advantages** (§8.4).
  **Reroll** costs a small, rising fee.
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
- Automation: auto-rotate to best fit; auto-clear a color each N pieces;
  gravity auto-compacts each turn.
- Reward-multiplier: +50% credits per clear; chain multiplier +1 per
  link; Obsidian multiplier doubled.
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
  rises and releases four times per act instead of one long grind.
- **Board carry `[DES]`:** the board **persists across stages within an
  act** and **resets at each act start**. This makes **Obsidian's
  permanent multiplier** and board planning genuinely strategic (your
  past placements help *and* clutter you), while act resets stop clutter
  from compounding forever. *Score* resets to 0 each stage (earn the
  target fresh). Tunable alternative: full board reset each stage (more
  accessible, weaker Obsidian) — see `notes/decisions.md`.
- **Loss condition `[SRC]/[DES]`:** you must hit the stage target **before
  the board tops out** (a placed piece has nowhere to go) `[SRC]/[INF]`.
  Pressure is spatial, not a timer — matching the slow, thinky feel.
- **Onboarding `[DES]`:** Act 1 stages 1–2 introduce move/rotate, the
  first line clear, and the first chain with light contextual prompts; no
  boss before stage 3.
- **Juice `[DES]`:** animate cascades **step-by-step** so the player reads
  each chain link; SFX pitch climbs per link; screen-shake scales with
  chain size; combo/'+score' popups; target bar fills with a threshold
  flash on clear. (Deliberately legible, not seizure-fast.)
- **Fail-forward `[DES]`:** the run summary celebrates furthest act,
  biggest chain, blocks destroyed, and the build assembled; one-key
  restart to keep the "one more run" loop tight.
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
  phase: "play" | "resolving" | "shop" | "treasure" | "gameover";
  seed: number;               // deterministic RNG for reproducible runs
};
// bossFor(stage): mini-boss if s∈{3,6,9}, Act Boss if s==10, else null (s = ((stage-1)%10)+1)

```
All randomness (bag, shop offers, advantage offers, boss selection) draws
from a single seeded PRNG so a run is reproducible for testing `[DEF]`.

## 10. Screens / UI `[INF]`

1. **Title / run setup** — start run, choose/confirm starting pool.
2. **Play screen** — grid center; current score vs. target (progress
   bar); level & boss banner; next-piece preview; credits; active
   advantages; controls hint.
3. **Shop / between-level** — offered blocks & advantages with prices;
   buy/skip/reroll; "continue".
4. **Game over / run summary** — level reached, final Stack, blocks
   destroyed, advantages taken; restart.
5. **Blockipedia** `[SRC]` — a compendium of all blocks discovered across
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

## 13. Build order for the clone (recommended)

1. Grid + 7 pieces + move/rotate(3-way)/lock + line clear + basic score.
2. Gravity + cascade chain counter + chain multiplier (the core feel).
3. Level targets + advance/lose + game-over summary.
4. Special blocks: Stone, Obsidian, Vine, Combo Tile, Booster.
5. Shop economy (credits, buy blocks) + block groups/synergies.
6. Advantages (perk system with event hooks).
7. Bosses (rule modifiers, every 3rd level).
8. Juice: animations, SFX, screen-shake; balance the target/score curves.

Milestone 1–3 is a complete, fun MVP; 4–8 layer on the roguelike depth.

---

See `notes/reverse-engineering.md` for the evidence behind every `[SRC]`
claim and the list of open questions to validate against the live game.
