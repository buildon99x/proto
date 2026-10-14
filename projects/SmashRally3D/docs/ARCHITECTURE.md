# Runtime ownership

`physics.ts`: court dimensions, 120Hz drag/gravity integrator, swept net/ground collision, numerical launch search, shot eligibility and timing quality. Actual flight, landing prediction, interception and trajectory inversion call the same integrator.

`game.ts`: explicit match phases, same movement/reach for both athletes, delayed AI commands, finite input buffer and fixed motion contact frame, one hit callback, point resolution and winner-next-serve scoring. No UI or sound changes physical outcomes. Weak returns preserve horizontal aim and expose a shorter high clear. Repeat-target adaptation biases AI recovery, with unchanged movement limits.

`main.ts`: official AppBase bootstrap, container GLB loading, nine named torso animation clips, procedural footwork/arm/racket reach tied to the fixed motion clock, raycast-equivalent ground-plane targeting, common ShotCommand for mouse/touch, synthesized Web Audio, effects, UI and lifecycle. Body clips use rigid node animation rather than skinned character meshes; full sports animation polish and frame-exact A/V validation remain future work.

`tools/generate-assets.py`: deterministic original court, two same-layout athlete variants, racket and shuttle in GLB. No imported Nintendo expression or sampled sports-game sound. Animation/event metadata and runtime motion names match.

`window.smashDiagnostics()` is read-only test telemetry. It exposes no mutation function, instant score, player autoplay or forced outcome. Browser tests send real mouse/touch input and use telemetry for reproducible timing; fault injection is labelled separately.
