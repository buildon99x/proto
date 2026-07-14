# Evaluation — Stackflow (clone)

Checks proving a build is mechanically identical to Stackflow. Grouped so
the reverse-engineered `[SRC]` mechanics are all covered; `[DEF]` values
are checked for internal consistency, not exact parity.

## A. Core placement & clearing `[SRC]`

- [ ] Pieces can be moved L/R/down on the grid.
- [ ] Rotation works **CW, CCW, and 180°** with wall kicks; feels smooth
      near walls.
- [ ] A piece **locks** into place on confirm/settle and writes blocks to
      the grid.
- [ ] A **full line clears** and removes those blocks.
- [ ] A qualifying **shape clears** and registers a combo.

## B. Gravity, chains, combos `[SRC]`

- [ ] After a clear, unsupported blocks **fall** (gravity pass).
- [ ] Falling can cause new clears → a **cascade**; the **chain counter**
      increments per cascade step.
- [ ] Chain depth **multiplies score** (a deep chain scores far more than
      the same blocks cleared flat).
- [ ] A single well-set-up placement can **clear a large section** via
      chain reaction.

## C. Special blocks `[SRC]`

- [ ] **Obsidian** cannot be cleared and grants a **permanent multiplier**
      while on the board.
- [ ] **Stone** yields a **point burst** when destroyed.
- [ ] **Vine** grows toward a nearby Vine on placement; destroying one
      **destroys the connected Vines**, giving **+1 Stack per block** in
      the chain.
- [ ] **Combo Tile** triggers a chain reaction on a shape/color match.
- [ ] **Score Booster** multiplies a clear's points.
- [ ] The four **block groups** (Explosives, Colony, Arcane, Harmony)
      exist and each exposes a synergy.

## D. Roguelike run structure `[SRC]/[DES]`

- [ ] A run is **3 Acts × 10 stages = 30 stages** `[SRC]`.
- [ ] Each stage has a **target score**; reaching it advances the run.
- [ ] Targets **escalate** across stages and step up **per act** `[DES]`.
- [ ] **Mini-boss at within-act stages 3/6/9** and an **Act Boss at stage
      10**, each with an active rule modifier `[SRC]/[DES]`.
- [ ] Boss rules include **reversed fall direction** and **periodic block
      rotation** `[SRC]`.
- [ ] Each act introduces **new content** (a new block group) `[DES]`.
- [ ] **Credits** are earned from destroying blocks and clearing stages.
- [ ] A **shop after each stage** spends credits on **new blocks** and
      **advantages**; an **Act Boss grants a free Treasure pick** `[DES]`.
- [ ] **Advantages** exist in all three kinds: **automation**,
      **reward-multiplier**, **rule-changer**; **max 5 active** `[DES]`.
- [ ] **Board carries within an act and resets each act** `[DES]`.

## E. Loss & session `[INF]`

- [ ] The run **ends** when the board can no longer accept a piece / the
      level target is missed.
- [ ] A **run summary** shows level reached and final Stack.
- [ ] A full run is completable in ~15–40 min.

## F. Feel `[SRC]`

- [ ] Cadence is **slower than Tetris**, rewarding planning over speed.
- [ ] Clears/chains produce **juicy** escalating visual + audio feedback.

## G. Engineering / determinism `[DEF]`

- [ ] All RNG derives from a single **seed**; the same seed reproduces a
      run (bag, shop, advantages, boss).
- [ ] Grid size, scoring constants, target curve, and block/advantage
      tables are **data-driven config**, not hardcoded magic numbers.
- [ ] Unit tests cover: line clear, shape clear, cascade chain counting,
      Vine chain scoring, Obsidian multiplier, boss rule application.

## H. Reverse-engineering completeness (this teardown's own DoD)

- [ ] Every confirmed mechanic in `notes/reverse-engineering.md` maps to a
      spec section.
- [ ] Every `[DEF]` assumption is listed as an **open question** to verify
      against the live game.
- [ ] A new engineer can implement the MVP (spec §13 steps 1–3) from
      `spec.md` alone, without further research.
