# Design — Acts, Stages & Progression (`[DES]`)

Original design for the clone, authored to fit Stackflow's feel with a
focus on **user experience and fun**. The requester confirmed the
skeleton — **3 Acts × 10 stages = 30 stages** `[SRC]` — and delegated the
rest. This note is the rationale; the buildable numbers live in `spec.md`
§8.1–8.7.

## Why 3×10 shapes the whole design
30 stages at a confirmed ~42 min/run ⇒ **~80 s/stage**. That budget says:
targets must be reachable in ~1–2 min of deliberate play, and the run
needs internal rhythm so it never feels like one flat grind.

## The core rhythm (per act)
```
1  2   3      4  5   6      7  8   9      10
▲  ▲  [B]     ▲  ▲  [B]     ▲  ▲  [B]    [ACT BOSS] → Treasure
warm  twist   build twist   build twist   climax     reward
```
Tension rises and releases **four times per act** (three mini-bosses + one
Act Boss) instead of a single spike. This reconciles the confirmed "boss
every 3rd level" (stages 3/6/9) with a satisfying **act finale** at stage
10 — a design choice layered on the confirmed cadence.

## Difficulty & the "new toy each act" contract
Targets scale ~10× per act (Act bases 100 / 1,200 / 12,000) **because the
player's scoring engine also scales** — each act hands the player a new
block group (Act 1 Explosives → Act 2 Colony+Arcane → Act 3 Harmony) plus
more advantages. The escalation is a *duel* between rising targets and a
growing engine, not a difficulty wall. It also keeps every act feeling
fresh (a new mechanic to learn and exploit), which is the main
replayability/fun driver.

## Board carry decision (the interesting one)
**Board persists within an act, resets each act.** Rationale:
- Makes **Obsidian's permanent multiplier** and spatial planning matter —
  your placements pay forward *and* threaten to clutter you.
- Act resets prevent clutter from compounding into an unfair spiral.
- Score still resets per stage, so each stage is a clean, readable goal.
- Tunable fallback: full reset each stage (more accessible, but weakens
  Obsidian and the "every choice redefines strategy" fantasy the store
  copy sells). Chosen the carry model for depth; flagged the fallback.

## Economy pacing
A shop **after every stage** (a calm beat between tense stages), 3 offers +
rising-cost reroll, credits from clears + blocks destroyed (boss ×2). A
**free Treasure pick after each Act Boss** gives three visible milestone
rewards per run — the "power spike" moments roguelike players chase.
Active-advantage cap of 5 keeps build decisions sharp rather than
snowballing into noise.

## Fun & UX guardrails
- **Legible juice:** cascades animate step-by-step; SFX pitch climbs per
  chain link; shake scales with chain size. The dopamine is in *reading*
  your own chain resolve, not in speed.
- **No reflex pressure:** loss is spatial (board tops out), never a timer —
  protects the slow, thinky identity.
- **Onboarding without a wall:** Act 1 stages 1–2 teach the loop; first
  boss at stage 3.
- **Fail-forward:** summary celebrates furthest act, biggest chain, and the
  build you assembled; instant restart for the "one more run" hook.
- **Accessible by default:** shape/icon + colorblind-safe palette, remap.

## Still open (not delegated / not yet decided)
- Exact per-block numbers for group synergies (Explosives radius, Harmony
  multiplier steps, etc.) — author in `data/blocks.json` at implementation.
- Full advantage roster + numbers (model + examples exist in spec §8.4).
- Whether Act 3 ends on a distinct **final-boss** set-piece beyond "The
  Warden" — currently The Warden *is* the stage-30 finale.
