# Corrections to f269f08 evidence

The original seven tests and 1000-shot fixture did not validate a real racket collider, correct super-smash reward ordering, delayed/noisy AI perception or ten tactical matches. Prior fixed-XZ reach assertions are not evidence of 3D string contact. The archived f269f08 UI automation read internal contactAt for precision; its ten-match endurance omitted returns after the first opening rallies. It proved lifecycle flow, not ten tactical/human matches.

## Candidate 0.2.0

- Audit sample start (0,2.6,-4), target (1.8,.025,5.8): ordinary descending smash ~30.52m/s, 0.483s; super descending attack ~54.16m/s, 0.275s, net crossing ~1.636m. Shared drag/integrator, launch capped at55m/s. Impossible close target z=1 is explicitly resolved as Drop; no lofted curve is labelled Smash/Super Smash.
- Contact uses finite .36m upper/forearm segments, physical grip/head relation, body posture and a .225m radial string/cork capture radius with .045m plane tolerance. Relative ball/racket sweep and incoming approach are tested. Animation hit_frame opens the short active phase; only actual contact emits shuttle hit/SFX/FX. Engine event listener is consumed by Game motion tick.
- AI has no intercept before delay. Afterwards it samples bounded noisy position AND velocity and updates prediction periodically. Both actors use the same motor, foot state, pose and collision rules. Position error is not just outgoing-shot aim scatter.
- The two original athletes now share seventeen weighted joints and nine full-body exported clips. Engine clips provide fixed animation event clocks; procedural pose/IK overrides final bone transforms for planted feet and actual contact. This is not a production mocap/retargeted-human animation claim.

Before/after files live in verification/. The short silent videos are actual mouse-driven Chromium play assisted by read-only timing telemetry, not human/device or audio-listening evidence. Event-paused inspection views are labelled separately from ordinary match play.

Expanded tests cover paired attack ordering/fallback, eligibility combinations, actual 3D plane/phase/approach, remote/high/low failure, finite arm lengths, rendered ankle/plant agreement, delayed noisy perception, point idempotence and winner-next-serve. The 1000-shot set is a numerical solver regression, not empirical flight validation, randomized whole-world coverage, all FPS/device profiles or end-to-end contact proof. Latest UI/ten active visual-cue match and audio-render verification remain to be completed before candidate acceptance.
