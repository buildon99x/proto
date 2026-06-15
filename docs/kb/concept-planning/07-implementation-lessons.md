# 07 - Implementation Lessons: Five Prototype Failure

> Scope: The removed implementations of Mirror Poker Court, Origami Fleet, Weather Market, Museum Heist Deck, and Deep Lighthouse.
> Decision: Delete the five projects because they did not reach a state that can honestly be called games.

## What Happened

The implementation created five separate launcher projects, but all five used the same shared `ConceptGame` runtime: select a zone, play generic cards, move numeric tracks, end turn, and reach a generic win/loss threshold. The projects differed mostly in theme, copy, colors, and track names.

This satisfied a narrow technical loop:

- project directories existed under `projects/{slug}`
- `project.json` metadata was valid
- registry sync discovered the projects
- static builds completed
- buttons could be clicked in a browser

It did not satisfy the actual product requirement: each selected concept needed its own core user experience implemented end to end.

## Why It Failed

1. Launcher/deployment integration was over-prioritized.
   The work optimized for creating five deployable artifacts quickly instead of proving that each artifact contained a distinct game loop.

2. "E2E" was interpreted too narrowly.
   The implementation treated boot -> click -> state change -> win/loss as enough. For concept prototypes, e2e must mean the concept's unique player verbs are present and testable.

3. Shared abstraction was introduced too early.
   A generic card/track engine removed the very differences that made the five concepts worth selecting.

4. The build passing became false confidence.
   `build:vercel`, `validate:projects`, and browser smoke checks proved deployability, not gameplay quality.

5. The project did not define per-concept mechanical acceptance tests before coding.
   Without concept-specific acceptance criteria, generic interactions looked acceptable even though they were not games.

## Per-Concept Missing Core

### Mirror Poker Court

Required core: actual poker hand evaluation, mirror inversion, evidence-to-verdict scoring, and legal-risk tradeoffs.

Rejected implementation: generic cards changed `Verdict`, `Trust`, and `Chaos`; no hand, no poker, no inversion.

### Origami Fleet

Required core: spatial fleet positioning, fold/unfold forms, lane threats, and formation tradeoffs.

Rejected implementation: generic cards changed `Formation`, `Hull`, and `Wind`; no board state, no positions, no folding geometry.

### Weather Market

Required core: district demand, weather inventory, price/reputation/ecology consequences, and market timing.

Rejected implementation: generic contracts changed tracks; no demand system, no pricing, no district simulation.

### Museum Heist Deck

Required core: guard intent, stealth pathing, line of sight, noise, tools, and artifact risk.

Rejected implementation: generic cards changed `Loot`, `Cover`, and `Curse`; no guard movement or stealth puzzle.

### Deep Lighthouse

Required core: beam direction, revealed field of view, monster lure behavior, pressure, oxygen, and safe route planning.

Rejected implementation: generic cards changed `Signal`, `Pressure`, and `Terror`; no spatial light, no monster positions, no route.

## Future Implementation Rule

Before creating a project from a concept, write a per-concept implementation contract:

- Primary player verb that must be directly manipulated.
- Minimum playable state representation.
- One distinct failure state tied to the concept, not a generic track.
- One distinct success state tied to the concept, not a generic score.
- A browser test that proves the unique verb changes the unique state.

Do not create a reusable gameplay shell until at least two concepts have independently working core loops and the repeated code is proven to be incidental UI/runtime code rather than gameplay identity.

## Acceptance Standard For Future Prototypes

A prototype is not acceptable if its project can be reskinned into another selected concept by changing only:

- project name
- labels
- card text
- colors
- numeric track names

A prototype is acceptable only when removing its unique mechanic would break the concept's main promise.
