# Runtime ownership
`physics.ts` owns dimensions,120Hz drag/gravity integration, swept net/ground collision, launch inversion, eligibility and independent timing quality. One integrator drives predictions and live flight. The1000-launch fixture checks numerical consistency, not empirical aerodynamics.

`motion.ts` owns finite-length two-bone arms/legs, planted foot states, fixed-clock shot poses, physical shaft/head relation and 3D string-plane contact/relative sweep. Hip height stays inside the two actual leg reaches, and running permits overlapping airborne steps before stance overextension. No scale stretching or shuttle-height proxy grants a hit.

`game.ts` owns match phases, equal actor motor/recovery limits, delayed/noisy AI observations, finite input commands, event-armed contact windows and idempotent point resolution. Only actual collision emits one Hit callback. Locked swing geometry survives the next incoming flight forecast and supplies follow-through/recovery.

`main.ts` owns official AppBase setup, weighted GLB loading, AnimEvaluator/AnimClip hit_frame listener consumed on the same fixed clock, final procedural bone transforms, common mouse/touch ShotCommand, UI, camera and lifecycle. `audio.ts` is original deterministic transient synthesis shared by live impact and OfflineAudioContext WAV rendering. Telemetry distinguishes impact callback, audio scheduling, FX update and scene-update queue; it does not measure hardware output or screen presentation latency.

`tools/generate-athletes.py` produces original17-joint weighted skins and nine full-body clips using shared motion-data.json. Runtime IK overrides final clip bone transforms. This is original stylized procedural animation, not mocap/AAA certification. The other asset script produces court/racket/shuttle.

Read-only `window.smashDiagnostics()` exposes no state mutation, autoplay or instant outcome. Ten-match control responds to visible HIT NOW/shot labels, while older archived automation used precise contact-time telemetry. Contact-review query pauses only after an actual mouse-triggered collision and renders that collision snapshot; it is separate inspection evidence. Browser context loss is explicitly injected fault testing.
