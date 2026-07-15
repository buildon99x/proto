# Evaluation — Stackflow (clone)

Checks proving a build is mechanically identical to Stackflow. Grouped so
the reverse-engineered `[SRC]` mechanics are all covered; `[DEF]` values
are checked for internal consistency, not exact parity.

> **Verified 2026-07-15** against the implementation in `app/`:
> §A–§C/§G via the vitest suite (`tests/engine.test.ts`, 36 tests),
> §D–§F2/§I via a headless-browser playtest (`tests/e2e/scenario.mjs`,
> screenshots in `assets/screenshots/shots/`) plus the committed greedy-bot
> full-run simulation (`tests/sim/balance.ts`) for the §8.1 curve and the
> ≥1-min pacing (see `notes/decisions.md`). Session/stage length (§E) is an
> estimate from the sim's placement counts (×`placementsPerMinute`), not a
> timed human run.

## A. Core placement & clearing `[SRC]`

- [x] Pieces can be moved L/R/down on the grid.
- [x] Rotation works **CW, CCW, and 180°** with wall kicks; feels smooth
      near walls.
- [x] A piece **locks** into place on confirm/settle and writes blocks to
      the grid.
- [x] A **full line clears** and removes those blocks.
- [x] A qualifying **shape clears** and registers a combo.

## B. Gravity, chains, combos `[SRC]`

- [x] After a clear, unsupported blocks **fall** (gravity pass).
- [x] Falling can cause new clears → a **cascade**; the **chain counter**
      increments per cascade step.
- [x] Chain depth **multiplies score** (a deep chain scores far more than
      the same blocks cleared flat).
- [x] A single well-set-up placement can **clear a large section** via
      chain reaction.

## C. Special blocks `[SRC]`

- [x] **Obsidian** cannot be cleared and grants a **permanent multiplier**
      while on the board.
- [x] **Stone** yields a **point burst** when destroyed.
- [x] **Vine** grows toward a nearby Vine on placement; destroying one
      **destroys the connected Vines**, giving **+1 Stack per block** in
      the chain.
- [x] **Combo Tile** triggers a chain reaction on a shape/color match.
- [x] **Score Booster** multiplies a clear's points.
- [x] The four **block groups** (Explosives, Colony, Arcane, Harmony)
      exist and each exposes a synergy.

## D. Roguelike run structure `[SRC]/[DES]`

- [x] A run is **3 Acts × 10 stages = 30 stages** `[SRC]`.
- [x] Each stage has a **target score**; reaching it advances the run.
- [x] Targets **escalate** across stages and step up **per act** `[DES]`.
- [x] **Mini-boss at within-act stages 3/6/9** and an **Act Boss at stage
      10**, each with an active rule modifier `[SRC]/[DES]`.
- [x] Boss rules include **reversed fall direction** and **periodic block
      rotation** `[SRC]`.
- [x] Each act introduces **new content** (a new block group) `[DES]`.
- [x] **Credits** are earned from destroying blocks and clearing stages.
- [x] A **shop after each stage** spends credits on **new blocks** and
      **advantages**; an **Act Boss grants a free Treasure pick** `[DES]`.
- [x] **Advantages** exist in all three kinds: **automation**,
      **reward-multiplier**, **rule-changer**; **max 5 active** `[DES]`.
- [x] **Board resets every stage** `[DES]` — the rising tide fills the board
      within a stage, so carrying it across stages would force an unfair
      top-out (supersedes the earlier "carries within an act"; spec §8.7).

## E. Loss & session `[INF]`

- [x] The run **ends** when the board can no longer accept a piece / the
      level target is missed.
- [x] A **run summary** shows level reached and final Stack.
- [x] A full run is completable in ~30–50 min (rising-tide rebalance,
      2026-07-15: median ~1.5 min/stage × 30). Verified by the greedy-bot
      sim `tests/sim/balance.ts` (`pnpm --filter stackflow sim`).
- [x] **Each stage lasts ≥ ~1 min** (balancing, not a clock): every stage
      2–30 has a sim p50 ≥ 1 min (≥ ~12 placements). Stage 1 is the scripted
      one-shot onboarding hook (deliberate exception, spec §8.1).

## F. Feel `[SRC]`

- [x] Cadence is **slower than Tetris**, rewarding planning over speed.
- [x] Clears/chains produce **juicy** escalating visual + audio feedback.

## F2. Thrill layer (박진감) `[DES]`

Checks for the MDA-review improvements (see `notes/mda-review.md`,
`spec.md` §0 intent). Internal-consistency checks, not source parity.

- [x] **Identity invariant:** there is **no timer / no drop-clock**
      anywhere; all pressure is spatial or dramatic (T-principle, §0). The
      rising tide and the ≥1-min-per-stage floor are both **piece-count /
      balance based**, never a real clock — the invariant holds.
- [x] **Rising tide (spatial pressure):** every placement raises a
      **clearable** colored floor row (with gaps) toward the spawn edge;
      skilled play can always drain it (no unfair loss); a sealed board tops
      out with explicit detection. Piece-count based, gravity-aware; config
      in `data/stages.json` `tide`. (Unit tests: insert / gravity-aware /
      top-out / warmup / stage-reset / mash-tops-out.)
- [x] **Payoff crescendo (T2):** chain multiplier is **super-linear**
      (`1,2,4,7,11,16,…`); a deep chain scores *overwhelmingly* more than a
      flat clear; a **live chain counter** ratchets per link (§7.1).
- [x] **Perfect-clear + Overdrive (T2):** emptying the board bonuses that
      commit; an **Overdrive meter** fills from chains and grants **N ×2
      placements** (piece-count based, never timed).
- [x] **Top-out tension (T1):** a **DANGER state** (edge glow / heartbeat
      SFX scaling with fill / banner) escalates as the stack nears the top.
- [x] **First-60s hook (T4):** stage 1 reliably triggers a multi-link
      chain within ~60 s before any rule complexity.
- [x] **Active boss set-piece (T5):** Act Boss has a **Break gauge**, a
      **phase-2 intensify at ~60%**, and a **defeat crescendo** → Treasure;
      mini-bosses apply a light active nudge.
- [x] **Shop pacing (T3):** full shop on even stages + **inline quick-buy**
      on odd stages; total offer volume preserved (build expression intact).
- [x] **Push-your-luck (T6):** hitting target offers **Bank vs Press**;
      overkill converts to bonus credits; banking is always safe (no forced
      greed / no unfair loss).
- [x] **Automation = spectacle (T8):** automation advantages *add*
      detonations rather than silently removing player decisions; **≤ 5**
      active advantage slots.
- [x] **Bragging meta (T10):** run-bests (biggest chain, best single clear,
      perfect-clears, furthest act) persist; an "INSANE COMBO!" callout
      fires on threshold; **no MTX / no gacha**.
- [x] **Juice budget (T7/T13):** a concurrent-effect cap + a **reduce-motion
      / photosensitivity toggle**; step-by-step cascade legibility is never
      sacrificed to spectacle.
- [x] **Fairness guardrail (I12):** the crescendo is **assemblable via
      build** (group synergies / advantages), not pure RNG; RNG-mitigation
      levers exist.

## G. Engineering / determinism `[DEF]`

- [x] All RNG derives from a single **seed**; the same seed reproduces a
      run (bag, shop, advantages, boss).
- [x] Grid size, scoring constants, target curve, **tide cadence/gaps/warmup**,
      **pacing (placements/min)**, and block/advantage tables are
      **data-driven config**, not hardcoded magic numbers.
- [x] Unit tests cover: line clear, shape clear, cascade chain counting,
      Vine chain scoring, Obsidian multiplier, boss rule application, **the
      rising tide** (insert / gravity-aware / top-out / warmup / stage-reset /
      mash-tops-out), and **seed reproducibility**. 36 tests pass.
- [x] A committed **balance sim** (`tests/sim/balance.ts`) re-validates the
      pacing curve (per-stage placements → minutes, top-out rate, win rate).

## I. Localization & tooltips `[DES]` (2026-07-15)

- [x] The UI renders **fully in Korean** with **no hardcoded English
      strings** — all copy routes through `app/src/ui/strings.ts`; block /
      advantage / boss names + descriptions are Korean in `data/blocks.json`
      and `engine/bosses.ts` (ids unchanged). Numbers use `ko-KR`.
- [x] **Every meaningful item has an explanatory tooltip** (`data-tip`):
      blocks, advantages, bosses, meters, buttons, stats, settings — shown on
      hover **and** keyboard focus, instant under reduce-motion. Verified in a
      browser playtest (screenshots in `assets/screenshots/shots/`).

## H. Reverse-engineering completeness (this teardown's own DoD)

- [x] Every confirmed mechanic in `notes/reverse-engineering.md` maps to a
      spec section.
- [x] Every `[DEF]` assumption is listed as an **open question** to verify
      against the live game.
- [x] A new engineer can implement the MVP (spec §13 steps 1–3) from
      `spec.md` alone, without further research.
