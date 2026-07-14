# Initial Request

**Date:** 2026-07-14
**Type:** Reverse-planning (역기획) / competitive game teardown

Analyze and deconstruct the game **Stackflow** to collect enough
information for a faithful copy, and internalize that knowledge in this
repo.

**Definition of done:** With the collected information alone, a team must
be able to build a game mechanically identical to Stackflow.

## Scope decision

Multiple games share the name "Stackflow". The confirmed target is the
**Steam strategic roguelike** — *Stackflow* (Steam App ID `3908810`,
developer Caue Ferrareto, publisher Pixel Purrfect). This is a
Tetris-meets-Puyo-Puyo block-placement roguelike, **not** the mobile
tap-to-stack tower game of the same name.

## Deliverables

- `notes/reverse-engineering.md` — source-backed teardown, observed vs.
  inferred, open questions.
- `spec.md` — a buildable specification (rules, data model, formulas).
- `brief.md` — target player, fantasy, and design pillars.
- `eval.md` — checks that prove a build matches the original.
- `notes/decisions.md` — clone design decisions where the source is
  undocumented.
