# Render motion regression benchmark

Run `node projects/cat-cafe-metaverse/tools/motion/benchmark.mjs` from the repository root. This writes `benchmark-results.json` alongside the script. It uses the actual new MotionTrack helper, and reproduces the removed snapshot-camera alpha0.3 / per-frame avatar alpha0.2 path for comparison.

This is deterministic synthetic data, **not browser FPS, real-network load or visual/play validation**. Authoritative motion starts at1s, stops at2s, speed3.6m/s. Samples are generated at10Hz; delivery uses initial40ms latency then either100ms intervals or repeating80/180/80/80/80/100ms intervals. The clock offset is first actual receipt minus authoritative timestamp, matching world.update. It is not recomputed at each jittered packet. No extrapolation/prediction is performed.

Observed30/60/120FPS results:
- New motion onset approximately200ms after authority start, versus old142–167ms. The150ms interpolation buffer deliberately adds visual input latency for stable motion.
- New settled position velocity threshold(<.04m/s for200ms) starts200–233ms after authority stop; old250–800ms.
- New gait stops375–400ms after authority stop because a separate180ms walking hysteresis avoids short toggles. This is cosmetic, not continued player movement.
- Camera-target vs rendered-avatar horizontal RMS offset is0 for new vs.247–.574m for old in the selected steady segment. Camera height excludes cosmetic walk bob.
- Steady velocity standard deviation is essentially0 in regular cases; worst selected irregular120FPS case is.130m/s vs old2.777m/s. A packet arriving beyond available history still causes a bounded hold; this is not a claim of zero jitter under arbitrary packet loss/delay.
- Same common timestamps produce the same new position across all three frame rates. Old per-frame alpha changes effective lag by frame rate.

Tests also cover shortest-angle yaw, bounded8-snapshot history, no prediction beyond latest sample, long-render-gap gait reset, equal-timestamp full replacement, stale snapshot rejection, room reset, stable ground camera, and cat-only visual direction correction.

## Sparse-history and pause limits
Additional100/250/100/150ms authoritative sample spacing (+40ms delivery latency) intentionally exceeds the150ms buffer. New steady-segment velocity standard deviation is2.53–5.38m/s, versus old1.49–4.59m/s; position holds then catches up. Thus this policy **does not guarantee smoothness for250ms sample spacing** and this worst-case measure is worse than the removed exponential smoothing. The benefit is consistent timestamped positions and camera alignment without prediction; increasing/adapting buffering would add latency and is a separate tuning choice. This sparse case stops at350–400ms after authority stop and gait at525–567ms. Onset thresholds are sampled-path approximations, not measured input-to-display latency.

Entity sample gaps over250ms or spatial jumps exceeding max(1m,6m/s×sample interval) discard old interpolation history and snap to the newly received authoritative pose without inventing a long walk through missing space. A render pause over250ms resets gait inference but does not clear the world clock offset; snapshots received during a hidden-tab pause keep bounded recent history. Network silence holds the last known position (no prediction). Room changes, clear and reconnect membership changes reset the clock mapping through the existing world lifecycle. Clock skew/system-time jumps were not tested. No claim of hidden-tab UI/browser validation is made.

## Authorized current-public baseline attempt
`public-baseline-timing.json` is the unchanged raw receipt of one explicitly authorized attempt on2026-11-01 07:35UTC. It ended with socket_error in11ms, zero decoded states and closed=true. No retry was made. No live cadence measurement was obtained. Its legacy `movementSeconds:2` field denotes the configured maximum, not evidence that movement occurred. The harness now names this `plannedMovementSeconds` and separately counts actually sent nonzero movement messages. The transport error code was not recorded in this receipt and cannot be inferred retrospectively.
