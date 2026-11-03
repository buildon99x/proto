# Quiet solo cat personalities

## Intent and scope
The user's request is believable, witty cats and a reason to explore the café. This bounded solo-only iteration addresses generic responses and weak room differentiation observed during actual jh play. Public multiplayer remains unchanged and capacity is not claimed. GPU frame pacing remains blocked by an unexplained browser/control-page delay.

## Chosen approach
Use deterministic three-profile behavior and existing pose/physics primitives, not new geometry, AI, accounts, persistence, scoring, quests or network calls. Cosmetic copy alone was rejected because preference must be observable. A broad life simulator was rejected because it adds performance/state risk without evidence.

Profiles are stable for each existing cat ID. Sleepy cats prefer petting (clear slow blink/nuzzle), observant cats prefer feathers (watch then one short pounce), playful cats prefer balls (confident existing ball chase). Nonpreferred toys still work and give friendly responses; no refusal, extra cooldown or punishment. All interaction ownership, 4-second action lifetime, 1.2-second cooldown, 2.8m range, collisions and ball separation remain intact. Movement speed must not exceed existing limits.

The same profile/phase helpers must drive solo physics, render pose and selected-card explanation. Three room routines use existing idle poses: sunny rest/stretch, garden watch/groom, moonlight rest/slow blink. Preserve dominant sleep, stationary headings, occasional bounded walks and nearby welcome cats. Room flavor must not claim an absent bird/window interaction or add continuous activity.

Selected-card information and action feedback should reveal one concise useful clue, not spam, stacked overlays or a growing activity log. A preferred toy must have a distinguishable reaction that a reviewer can observe. Current live rooms retain existing generic behavior and must not display solo-specific personality claims. Static welcome capacity copy must distinguish design target50–100/room from current public6 total.

## Acceptance
Pure tests cover all18 cats ×3 rooms, deterministic profile/phase, bounded action differences, nonpreferred success, cooldown/expiry, reduced-motion, no stationary spinning, world bounds and ball clearance. Actual-main tests cover solo/live labels and mode changes. Independent review evaluates meaningful difference, discoverability and honesty; real jh targeted replay is required for perceived value/visual acceptance. No performance pass follows from these tests.

## Independent design clarifications
Compare the same action across profiles: petting blink/nuzzle envelopes, feather focus/pounce timing and ball chase response must differ observably while all actions still succeed. Differences should include a sustained watch/rest portion, not rely entirely on subsecond effects under the currently slow QA browser. Prefer existing maximum speed with lower bounded alternatives; do not change toy lifetime or ball clearance. Room routines are idle presentation only: shared ambient movement and at least80% stationary sleep/rest, including the first welcome-cat30 seconds, remain unchanged. Every time-dependent policy consumes the existing solo snapshot/lease clock; solo→live, clear, room switch and action expiry reset pose and copy. Three profiles establish modest discoverability only; replay value and perceived animation quality remain independent-play questions.

## Action/profile acceptance matrix (implementation choices)
- Sleepy / prefers pet: pet eyes0.10 and nuzzle amplitude0.055; feather focus0–0.8s, stalk0.8–1.3s, one pounce1.3–1.65s, then watch through4s; ball chase uses0.65× existing maximum step.
- Observant / prefers feather: pet eyes0.35 and nuzzle0.020; feather focus0–1.5s, stalk1.5–2.2s, one pounce2.2–2.65s, then watch through4s; ball chase uses0.80× existing maximum step.
- Playful / prefers ball: pet eyes0.25 and nuzzle0.035; feather retains the existing two-short-pounce schedule; ball chase uses1.00× existing maximum step.
All pet hearts and successful actions remain. No preferred-action reward, refusal or extra cooldown. All factors apply only to solo; shared helpers may accept optional policy arguments only if their defaults and all live code paths remain byte/behavior-compatible. Prefer app-only helpers where reasonable. Room routine pose differences occur only while original ambient phase is rest/groom/stretch, not while sleeping/walking/playing: sunny stretching, garden alert gaze with stationary heading, moonlight relaxed eyes/body. Use bounded existing pose fields, no new meshes. Exact routine subwindow can be chosen/tested by implementer; document it and keep selected-card text derived from the same function.

## Real action deadline clarification
Solo action/cooldown deadlines use monotonic elapsed time in the app, independent of the maximum50ms movement integration step. A delayed callback checks real elapsed time and expires a4-second action or1.2-second cooldown at the first available callback after its deadline. Before action clicks and after hidden resume, synchronize time with zero physics advance. Hidden time expires leases, never moves entities by catch-up steps. New room/session resets origin; leave clears it. Default deterministic SoloPreview tests may use explicit elapsed time. Live authority is unchanged. Renderer source-time interpolation remains bounded to accepted snapshots. Frozen browsers cannot repaint before they resume; do not promise exact wall-time rendering while suspended.
