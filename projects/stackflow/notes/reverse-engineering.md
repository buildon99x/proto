# Reverse-Engineering Teardown — Stackflow

Source-backed analysis of **Stackflow** (Steam App ID `3908810`,
developer Caue Ferrareto, publisher Pixel Purrfect). Early Access
2025-11-05; full release 2026-07-13. This document backs the `[SRC]`
claims in `spec.md`.

> Method note: Steam / Google Play / App Store pages block automated
> fetching (HTTP 403, and the Steam host is egress-blocked for the research
> session), so most evidence below was assembled from search-engine result
> snippets of the store page, Steam patch notes/announcements, user
> reviews, and coverage. **Exception — the official Steam store
> long-description was supplied verbatim by the requester** and is quoted
> in Appendix A; claims it directly states are the highest-confidence
> `[SRC]`. Anything not directly stated is marked `[INF]` (inferred) or
> `[DEF]` (clone default) in the spec. Items in §"Open questions" should be
> confirmed by playing the live build.
>
> Provenance split (which Steam surface a fact came from):
> - **Store long-description (verbatim, Appendix A):** target-score
>   escalation; special blocks are *unlocked*; Obsidian (permanent
>   multipliers); Stone (explodes into points) "and much more"; advantages
>   = "smart automation, explosive multipliers, and unique mechanics".
> - **Patch notes / news posts:** bosses every 3rd level (+ the two boss
>   rules); rotation system (CW/CCW/180°, controller); gravity fix + chain
>   reactions; the four block groups; Vine / Combo Tile / Score Booster;
>   Blockipedia; credits + between-round shop.
> - **Reviews / coverage:** Puyo-like feel, slower than Tetris; ~42 min
>   sessions; "Balatro without the shop" lineage; endless mode is a
>   request, not shipped.

## 1. Identity & positioning

- Genre: "hypnotically addictive **strategic roguelike** about the pure
  pleasure of fitting pieces perfectly." Discover unique blocks, create
  connections, trigger explosive combos.
- Widely described/tagged as a **"Tetris roguelike."**
- Review consensus on feel: "brain feel is more akin to **Puyo Puyo**,
  trying to **maximize space to set up combos** rather than rapidly clear
  the board. Much **slower than Tetris**, enabling thinkier gameplay."
- Reception: ~93% positive of ~135 reviews (at time of research).

## 2. Core mechanics (confirmed)

- **Place blocks one after another**, connect them in lines or clever
  shapes, and **trigger chain reactions** that explode into visual
  effects.
- Start a run by **grabbing random blocks from a pool** and placing them
  on the **grid**.
- Core action: **rotating pieces to find the exact angle where they lock
  into place.**
- **Complete a line OR fill a specific shape** → game registers a
  **combo** and **clears those blocks instantly** → **chain reactions**
  can clear large sections of the board at once.
- Each level has a **target score**; reach it via "clever strategies and
  perfect timing." Placing "with intention instead of randomly filling
  space" is required.
- Escalation: "with each passing level... **score targets grow, new blocks
  appear, and more aggressive modifiers come into play.**"

## 3. Rotation system (from patch notes)

- Update 0.7: "**a better rotation system**, UI changes and overall QoL."
- Added **counter-clockwise rotation** and **180° rotations** (earlier
  updates), plus **controller support**.
- Players compare handling to modern Tetris ("buttery smooth"), though
  piece spawn differs slightly.

## 4. Gravity & chain reactions (from patch notes)

- A demo update "**fixed the gravity system**... and **introduced chain
  reactions**" — gravity and cascading clears are linked systems.

## 5. Special blocks (confirmed, with effects)

- **Indestructible Obsidian** — indestructible; grants **permanent
  multipliers.**
- **Stone** — **explodes into points** when destroyed.
- **Vine** — each time a piece is placed, it **grows toward a nearby Vine
  to connect**; when destroyed, **destroys all connected Vines, giving +1
  Stack and +1 more for each block in the chain.**
- **Combo Tiles** — special tiles that **activate chain reactions when
  matched with certain shapes or colors.**
- **Score Booster** — referenced as a block type (scoring modifier).
- ("**Stack**" is the game's core score/resource term — hence the title.)

## 6. Block groups (confirmed names)

- Demo update added **four new block groups: Explosives, Colony, Arcane,
  Harmony** — each "with **special synergies**", alongside the gravity fix
  and chain reactions. Exact synergy tables are **not** publicly
  documented → modeled as `[DEF]` in spec §5.3.

## 7. Roguelike systems (confirmed)

- **Advantages** = roguelike perks that "shape each run differently — some
  **automate basic actions**, others **multiply rewards**, and some
  **introduce new mechanics that flip the usual flow.**"
- **Credits**: earned by **destroying blocks and clearing stages**, spent
  **between rounds** to **buy new blocks and shape your strategy.**
  (Note: some community feedback said the economy/shop was thin — the
  clone treats a between-round shop as a first-class system.)

## 7b. Play meta, run length & collection (confirmed)

- **Meta is mostly in-run.** Lineage: before the economy patch the game
  was described by the community as "**Balatro without the shop — just
  playing poker hands over and over.**" Credits + a between-round shop
  were added specifically to give runs a build/decision layer. The run
  itself is the primary meta loop.
- **Blockipedia**: an in-game screen to **discover and catalog all blocks
  encountered.** Blocks are **unlocked/discovered** through play — the one
  confirmed cross-run persistent element (a compendium, not power carryover).
- **Session length ≈ 42 minutes** on average.
- **Run is bounded/escalating, not endless by default** — an **endless /
  infinite mode is a community *request*, not shipped.** Implies the
  standard run has an end state (grid fills / finite ladder).
- **No confirmed heavy cross-run progression** (persistent stat upgrades,
  unlockable characters/decks, ascension/difficulty tiers). Public sources
  do not mention any → treated as minimal in the spec, and listed as an
  open question. Do **not** assume Balatro-style deck/stake meta exists.

## 8. Bosses (confirmed)

- "Bosses arrive... **every third level brings a new rule** to challenge
  your skills, plus smarter blocks and important fixes."
- Confirmed boss rules: **reverse the direction that blocks fall**; a boss
  that **periodically rotates your blocks.**

## 9. Presentation (confirmed)

- Combos "explode into rewarding visual effects", "release pure dopamine";
  described as hypnotic/addictive. Deliberately slow, thinky cadence.

## 10. Open questions (validate on the live build)

These are unconfirmed by public sources; the spec uses `[DEF]` values.

1. **Exact grid dimensions** (spec assumes 8×12).
2. **Exact scoring formula** and chain-multiplier curve.
3. **Stage composition**: total number of levels per run, the exact
   target-score curve, and whether the run ends at a **defined final
   boss/ending** or escalates until the grid fills. (Confirmed: boss every
   3rd level, escalating targets, ~42 min sessions, no shipped endless
   mode. Unconfirmed: the ladder's length and terminus.)
4. **Draw model**: true bag/7-bag vs. weighted random; hold slot? number
   of previews?
5. **Placement commit**: manual hard-drop vs. timed gravity settle; is
   there any lock delay?
6. **Full advantage list** and their exact numbers.
7. **Per-group synergy rules** for Explosives/Colony/Arcane/Harmony and
   full block roster within each.
8. **Shop details**: offer count, prices, reroll cost, credit formula.
9. **Full boss roster** beyond the two confirmed rules.
10. **Shape-clear catalog**: which shapes (besides full lines) count, and
    how color/shape matching for Combo Tiles is defined.
11. **Cross-run meta depth**: is there ANY persistent progression beyond
    the Blockipedia compendium (meta-currency, unlockable
    characters/decks, difficulty ascension)? No public evidence found;
    assumed minimal — confirm on the live build.

> Access note: Steam, the app stores, and several aggregators are blocked
> for this session (store pages 403 to automated fetch AND the egress
> policy denies the Steam host at the proxy). Evidence is limited to
> search-engine snippets; the store page's full long-description, the full
> patch-note bodies, and Discord/forum threads could not be read directly.
> The open questions above are exactly the details those blocked sources
> would likely resolve — re-verify on the live game or an unblocked
> network.

## Appendix A — Primary source: official Steam store description (verbatim)

Supplied by the requester (2026-07-14) as the original Steam store page
copy. Quoted verbatim as the highest-confidence primary source.

> Stackflow is a hypnotically addictive strategic roguelike about the pure
> pleasure of fitting pieces perfectly. Discover unique blocks, create
> satisfying connections, and trigger explosive combos that release pure
> dopamine. Overcome escalating challenges in each level by hitting target
> scores through clever strategies and perfect timing.
>
> **SPECIAL GAME-BREAKING BLOCKS**
> Unlock unique blocks with devastating powers! Indestructible Obsidian
> with permanent multipliers, Stone that explodes into points, and much
> more. Every choice redefines your strategy and opens infinite
> possibilities for insane combos.
>
> **GAME-CHANGING ADVANTAGES**
> Powerful advantages that completely revolutionize your playstyle! Smart
> automation, explosive multipliers, and unique mechanics that make every
> run unpredictable and addictive.

What it pins down directly:
- Genre & fantasy: strategic roguelike; "fitting pieces perfectly";
  combos → dopamine.
- Progression: **escalating challenges per level via target scores** +
  "clever strategies and perfect timing".
- Special blocks are **unlocked**; confirmed members **Obsidian**
  (permanent multipliers) and **Stone** (explodes into points); "**and
  much more**" ⇒ a larger roster (consistent with Vine / Combo Tile /
  Score Booster from patch notes).
- **Advantages** map exactly to the three modeled kinds: **automation**
  ("smart automation"), **reward-multiplier** ("explosive multipliers"),
  **rule-changer** ("unique mechanics").

What it does NOT mention (so those facts rely on other Steam surfaces, not
this blurb): bosses, credits/shop economy, Blockipedia, the four block
groups, and the specific Vine / Combo Tile / Booster blocks. "Infinite
possibilities" here is marketing, **not** an endless mode.

## 11. Sources

- Steam store page — Stackflow (App 3908810):
  https://store.steampowered.com/app/3908810/Stackflow/
- Steam news — "New Block Groups & Enhanced Gameplay":
  https://store.steampowered.com/news/app/3908810/view/521977529734530247
- Steam news — "New Boss Battles Await":
  https://store.steampowered.com/news/app/3908810/view/509590093865943650
- Steam news — "Bug fixes, controller support and new blocks":
  https://store.steampowered.com/news/app/3908810/view/509588921973211635
- Steam announcement — "Update 0.7: better rotation system, UI changes, QoL":
  https://steamcommunity.com/games/3908810/announcements/detail/597416631491103602
- Steam Community hub & reviews: https://steamcommunity.com/app/3908810
- PlayPile — Stackflow: https://playpile.gg/games/stackflow
- Steambase — Stackflow: https://steambase.io/games/stackflow/info
- YouTube — "THIS TETRIS ROGUELIKE IS AMAZING! (Stackflow)":
  https://www.youtube.com/watch?v=n3PYD2Vgk-A
- Kotaku — Stackflow: https://kotaku.com/games/stackflow
- Playin — Stackflow: https://www.playin.gg/games/stackflow
- steam-games.org — Stackflow: https://steam-games.org/game/361687/stackflow

(Research date: 2026-07-14. Store pages returned 403 to automated fetch;
claims are from indexed snippets — re-verify against the live build before
shipping a clone.)
