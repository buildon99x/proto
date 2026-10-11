# R14a7 frame observation contract and quality gates

Date: 2026-10-11 UTC. Scope: `app/src/frame-observation.js` and its dedicated tests. This document is the measurement/acceptance contract, separate from the brief. It does not change balance, the original project, R14a5/R14a6 sources, or public Site v58.

## 1. Evidence and current status

- Implemented: an optional, bounded, read-only observer of browser-supplied timestamps and synchronous JavaScript work brackets.
- Executed here: 32/32 dedicated Node tests, including the production `stepBattle` and renderer with synthetic clocks/recording canvases; syntax checks for the module and test. These tests establish contracts and non-mutation, not browser speed or visible frame quality.
- Not executed here: main-loop integration acceptance, real browser frame capture, GPU/compositor tracing, physical input latency, normal-input mixed-enemy review, audio listening, or publication. The parent owns main integration and its aggregate regression run.
- Environment status supplied for this checkpoint: local preview cannot be connected; Site v59 is pending approval. Therefore **all numerical game-performance results and the quality gates below remain unmeasured / not accepted**. Node test runner durations are not game frame measurements.
- Local requirements reviewed: `AGENTS.md`, `docs/requirements/requirements-source-status.json`, and `docs/requirements/warrior-completion-checklist.md`. The canonical v1.1 / Library version2 document is represented by that requirement trace; its local materialization/checksum remains blocked, not newly verified.
- Historical play evidence: `docs/verification-r14a5/v58-normal-input-observations.md` verifies channel/pulse presentation in a cleared area. It explicitly leaves active-enemy danger/FX overlap unverified. Do not relabel that run as mixed-combat or performance acceptance. The parent also reports continuing overlap concerns, which are a reason for the acceptance matrix, not a new measurement by this worker.

## 2. What the numbers mean

| Field | Observation | Does not establish |
|---|---|---|
| `rafInterval` | Difference between consecutive valid rAF callback timestamps in the same exclusive context | GPU execution, exact callback entry wall time, monitor refresh/scanout, frames actually presented, or physical input response |
| `total` | `performance.now()` elapsed between this callback's `beginFrame` and `endFrame` | CPU utilization, pure CPU instruction cost, post-callback style/layout/paint, GPU/compositor time, or async work completion |
| `step` | Sum of completed non-overlapping synchronous game-step brackets | Input-device latency or async save durability |
| `render` | Sum of completed synchronous renderer brackets, including preparation/labels only if the caller includes them | Pixels shown on screen or GPU cost of queued canvas commands |
| `ui` | Sum of completed synchronous DOM/HUD work brackets | Browser rendering after callback return or independently triggered menu/event work outside the bracket |

The values are elapsed browser-JS execution/scheduling observations. OS preemption, GC, timer precision and observer work can affect them. They are not a complete CPU profile. Never subtract rAF timestamps from `performance.now()` to invent an input/render delay; the two streams are used independently. Audio requests and promises can return before their external work is complete. [MDN rAF](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [MDN performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)

`total` contains bracketed work plus unbracketed work and part of the probe overhead. Phase totals are a decomposition of the caller's chosen spans, not independent additive frame budgets. The snapshot's serialization/statistics and insertion after the end timestamp are outside `total`; they may affect later scheduling. Do not call `snapshot()` every frame.

### Contexts and windows

Priority is: hidden/unfocused → `inactive`; no confirmed battle → `unavailable`; busy → `save-wait`; paused → `menu`; awaiting advance → `entry-wait`; then `combat-moving`, `combat`, `moving`, or `idle`. Combat and movement may be simultaneously true, hence the dedicated combined bucket rather than double-counting a frame. `active` contains only the four final, playable buckets. It includes idle play; use `byMode.combat` and `byMode['combat-moving']` for combat conclusions. `busy` should mean actual persistence blocking; do not label every safety/input deferral as save waiting.

Classification is copied at `beginFrame`, with no retained game-state object. The caller must capture the actual current flags, not infer active play from a cached menu label. State changes within a callback are not retroactively relabeled. The next callback's changed bucket has `rafStatus: 'transition'`, with the original interval retained for inspection and excluded from that bucket's regular interval summary. Thus a menu→combat gap cannot masquerade as slow combat. Total JS work remains attributed to the callback's initial context.

- Default general retention: latest 240 completed frames across all contexts. Capacity is clamped to 1–600; invalid/non-numeric capacities use 240. This is a recent window, not whole-session telemetry. A menu can eventually evict earlier combat from this ring, and top-level `active`/`byMode` deliberately keep their existing recent-window meaning. The separate `lastActive` view below preserves the last active segment for normal menu review.
- Every metric supplies its own `n`, `p50Ms`, `p95Ms`, `maxMs`, strict `>16.7ms` / `>33.3ms` counts and ratios. Ratios are fractions 0–1, not percentages. Percentiles use nearest rank: sorted sample at `ceil(p*n)-1`. Do not average percentiles from multiple windows.
- Empty/invalid metrics are `null` with `n:0`. A missing phase is not a zero-cost phase. Exact threshold values are not counted as exceeding that threshold; no rounding is applied before comparisons.
- First valid rAF timestamp after initialization/reset is warm-up, with no invented interval. Context-transition intervals are inspectable but excluded from ordinary per-context rAF percentiles.
- rAF gaps **at or above 500ms** are `suspension`, retain their full duration, and appear under `suspensions`. Both interval and work for that callback are excluded from normal summaries. This is a conservative observation cutoff, not proof of tab suspension: a foreground stall also produces it. Existing game safety uses `>500ms`; this observer's inclusive reporting boundary deliberately does not change that runtime rule.
- A large genuine JS task before the subsequent suspension gap is not erased or capped. It remains in the relevant work statistic if that earlier callback otherwise qualified.

### Retained latest active segment: `snapshot().lastActive`

The first implementation's single ring lost all combat samples after approximately four seconds at 60 callbacks/second in a menu. The follow-up preserves one independent latest-active-segment tail, bounded to `min(limit,240)` completed samples. The observer retains references to its own immutable completed records internally; exported views are separately deep-copied. Neither game-state objects nor extra clock reads are needed.

- While active, `lastActive.status` is `recording`, and completed active samples continuously update this tail. Switching among combat, combat-moving, movement and idle does not start a new segment.
- At `beginFrame` for menu/save-wait/entry-wait/inactive/unavailable, the tail becomes `retained`, before that non-active callback returns. `endedBy` records the first non-active mode. Long waiting and later switches among non-active modes cannot evict or replace this tail, even after the ordinary ring contains only menu frames.
- At the next active `beginFrame`, increment `segment`, clear the old tail, and begin the new segment. Until its first completed sample, `sampleCount` is zero and statistics remain null. Old performance is never displayed as if measured in the new segment. Short save-wait interruptions deliberately separate segments, so the next tail may be small; the UI must show its denominator.
- `lastActive` includes `status`, `segment`, `capacity`, `sampleCount`, `totalFrames`, `evictedFrames`, `endedBy`, `firstSequence`, `lastSequence`, `active`, `byMode`, `suspensions`, and `samples`. Counts/sequence bounds identify precisely which recorded window is retained. `totalFrames`/`evictedFrames` refer only to this active segment, not the entire observer lifetime.
- `lastActive.active` and `lastActive.byMode` use exactly the same percentile/exclusion rules as the general ring. Retained failed/frozen/missing/suspended evidence cannot become 0ms success. `lastActive.suspensions` preserves suspension evidence even after the ordinary ring has evicted it.
- Initial, cleared or disabled observations have `status:'empty'`, `sampleCount:0`, and null/zero-count metrics. `clear`, profile/reload/title/save replacement integration calls, and ON/OFF changes clear both rings and the segment identity. OFF frame/phase calls still return before clocks, context reads, or buffer allocation.

Diagnostics should label the two data sources separately: “recent all-context window” versus “latest active segment (retained after menu/save/etc.)”. For a paused reader, show `lastActive.active` and the relevant `lastActive.byMode` rows with their `n`; do not silently substitute retained values into the top-level current-window fields. Retention is only for on-demand review and does not establish a longer observation duration or whole-session result.

### Bad clocks and interrupted work

- Missing, nonfinite, nonnumeric or negative rAF clocks never become intervals. Frozen/backward rAF timestamps break continuity; the next valid sample is warm-up. JS work may still be observable even when its rAF timestamp is invalid.
- Missing/throwing `performance.now`, nonfinite values, or any backwards clock within the callback invalidate all its work metrics. Its independently valid rAF interval is retained. No fallback to `Date.now`, no fabricated 0ms work and no exception from a failing clock provider.
- An entirely frozen JS clock yields `frozen-or-below-resolution`; work remains unknown. Equal endpoints for a short phase are allowed only if the whole callback clock advances. That 0ms phase means below observable resolution, not free work. Browser clocks may be coarsened. [MDN timing documentation](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- Overlapping/mismatched brackets invalidate the affected phase rather than double-counting. Multiple complete disjoint segments of the same phase are summed once per frame. An open phase at end is `incomplete`. Unknown phase names are no-ops.
- Call `endFrame({failed:true})` when the main frame throws; the record is retained as failed, with no successful work metrics. Replacing an unended frame increments `abandonedFrames`; it does not fabricate a completed sample.

## 3. Integration API and low-overhead use

Exports: `createFrameObservation`, `classifyFrameContext`, `FRAME_OBSERVATION_LIMIT`, `FRAME_SUSPENSION_MS`, `FRAME_OBSERVATION_PHASES`, `FRAME_OBSERVATION_MODES`.

```js
import {createFrameObservation} from './frame-observation.js';
const frameObservation = createFrameObservation(); // default OFF

function frame(now) {
  const suspended = frameWasSuspended(now, last);
  const dt = frameDelta(now, last);
  last = now;
  let failed = false;

  // This guard avoids constructing the context and scanning enemies when OFF.
  if (frameObservation.enabled) frameObservation.beginFrame(now, {
    hasBattle: !!battle && !!renderer,
    paused, busy, awaitingAdvance: !!battle?.awaitingAdvance,
    combat: !!battle?.enemies.some(e => e.active && e.hp > 0),
    moving: !!battle?.p.moving,
    hidden: document.hidden, focused: document.hasFocus()
  });
  try {
    // Keep existing safety, suspension pause, deferred input and canStep gates.
    // At the EXISTING eligible step location, bracket only synchronous work:
    // frameObservation.beginPhase('step');
    // poeFeedback.step(dt);
    // const events = stepBattle(battle, state.character, dt, routed);
    // frameObservation.endPhase('step');
    // deliverCombatEvents(events); // total-only unless deliberately bracketed

    // Around scene preparation + renderer.render + labels/context cursor:
    // frameObservation.beginPhase('render');
    // ...existing synchronous preparation/render/label code...
    // frameObservation.endPhase('render');

    // Around the EXISTING hint/HUD and toast cleanup blocks, separately:
    // frameObservation.beginPhase('ui');
    // ...existing DOM updates; keep updateHud's current 0.1s cadence...
    // frameObservation.endPhase('ui');
  } catch (error) {
    failed = true;
    // Preserve existing error block/panel logic exactly.
  } finally {
    frameObservation.endFrame({failed});
  }
  requestAnimationFrame(frame); // still scheduled solely by existing runtime
}
```

This is a placement example, not replacement main code. Never call the step/render/UI a second time to measure it. The optional phase calls above return immediately when OFF, before reading clocks or allocating samples. For the smallest OFF hot path, wrap phase/end calls in the existing `enabled` guard too, particularly to avoid constructing `{failed}` unnecessarily. This is a structural low-overhead property, **not a benchmarked 0ms overhead claim**. While enabled, the normal three-phase example uses eight clock reads: frame begin/end plus two per phase. No sorting happens until a snapshot is requested.

Read-only diagnostics UI should use a deliberate ON/OFF control and on-demand snapshot. Display the sample context, sample `n`, clock failures, suspension/transition counts, retention limit and measurement disclaimer alongside numbers. For paused review, read `snapshot.lastActive.active` / `snapshot.lastActive.byMode` and label the retained status plus ending context. Do not save enablement or results into the game's save data. `snapshot()` returns detached records and summaries; modifying either the ordinary or retained view cannot change the game, probe, or the other exported view.

At profile replacement, explicit reload, title/new-game reset, or save import/replacement boundaries:

```js
frameObservation.clear('profile-change'); // or reload / title / save-replacement
```

Clear **before** replacing the controller/state to prevent old-profile observations or pending brackets being attributed to the new state. `clear` resets ordinary and retained records, active-segment identity, rAF continuity, pending work and counters, while preserving current ON/OFF state. A real page reload naturally constructs a new OFF observer. `setEnabled(true/false)` also resets all data when the enabled state actually changes; repeated identical calls do not erase it. The module cannot detect controller replacement itself, so integration tests must prove these boundaries call `clear`.

No game imports, dispatch, simulation writes, local/session storage, network, timers, listeners, global API registration or rAF scheduling exist in this module. There is no ongoing recording service. The parent may expose a snapshot through its existing explicit read-only status path, without introducing publication or telemetry.

## 4. AAA-aspiration measurement gates, independent of the brief

These are **authored Emberwatch QA gates**, not original Hammerwatch II numbers, competitor measurements, an industry certification or a statement that the build is AAA quality. Readability and control must be verified alongside cost. Faster timing cannot excuse hidden danger, and extra particles cannot demonstrate quality.

### Primary references read as text on 2026-10-11

1. [Riot Games, “Clarity in League”](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/): developer guidance on identifiable silhouettes/facing, effect/hitbox correspondence and visual attention proportional to gameplay importance. This motivates the shape/facing and danger-hierarchy checks below; the numerical gates are ours. No League gameplay was observed or copied.
2. [Dead Cells official Update29 patch notes](https://deadcells.com/patchnotes/29), 2022-04-12 through 2022-07-04: documented outline options, particle reduction, non-color icons and sound-priority controls. This motivates checking full/reduced FX and preserving important cues independently of sound/color. No Dead Cells gameplay or audio was observed here.
3. [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame): callback scheduling generally follows refresh cadence and may pause in hidden tabs; shared callback timestamps do not directly identify time spent in an individual callback. This limits how rAF data can be interpreted.
4. [MDN performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now): high-resolution monotonic timestamps, precision reduction and platform differences around sleep. This motivates clock-quality reporting and explains why elapsed callback work is not display latency.

Previously documented Hades II/CrossCode/Dead Cells reference research remains in `docs/quality-benchmarks-20261009.md`; its video-access and historical-scope limitations still apply. This checkpoint retrieved official/developer text using the web text tool only. It did not operate a browser, watch video, deploy, or run Git.

### Repeatable review conditions

Record build/version, exact route/encounter, legitimately earned save state, device/CPU/GPU if known, OS, browser/version, viewport, DPR, display refresh setting, power mode, controller/input device, flash/shake/audio settings, capture method and whether DevTools/video recording was active. Do not assume unknown hardware. Compare matched conditions and keep instrumented versus uninstrumented runs separate. Never substitute the Node recording canvas for browser presentation.

Use three named test contexts: empty-route movement, active mixed melee/ranged combat, and boss/add/area overlaps. Each requires full FX and `flashes:0`; repeat with no shake. Include the eight learned skills only where normally earned and available. Observation windows exclude menu/save/entry waiting, but those states receive their own regression review. A window with insufficient active samples is **insufficient data**, not pass.

| Gate | Measurable evidence and authored acceptance target | Why / remaining status |
|---|---|---|
| F1: JS work budget | On a declared baseline device at a declared 60Hz setting, collect at least three separate full recent windows per scenario; report each phase and total n/p50/p95/max/exceedances. Provisional synchronous `total` p95 ≤8ms leaves browser headroom. Each reviewed combat window needs at least 120 valid combat/combat-moving work samples. | Authored diagnostic target, not a cross-device guarantee. Missing phase samples block attribution. **Unmeasured.** |
| F2: Scheduling stability | Report rAF p95, max, strict >16.7ms and >33.3ms ratios. Provisional same-device 60Hz target: p95 ≤18.7ms and >33.3ms ratio ≤1% in each qualified active window. Count every ≥500ms gap separately and investigate every foreground occurrence; never hide it by pruning. | The 18.7ms tolerance is authored for scheduling variation; actual cadence at 120/144Hz requires a separate declared target. These are not presented-frame or input-latency claims. **Unmeasured.** |
| V1: Hero/facing read | In 30 preselected overlap moments per FX mode, identify hero ground position and facing from normal-speed play and inspect captured frames. Target 30/30 identifiable; any hero disappearance or ambiguous movement-facing incident must be logged/reproduced. | Riot silhouette/facing guidance; sample count is authored. Existing cleared-room observations cannot pass it. **Unobserved.** |
| V2: Enemy danger priority | Capture 30 actually active windup/release opportunities across melee, projectile lane, cone and area threats per FX mode. Target 0 decorative FX/number/label occlusions that prevent reading the relevant avoidable boundary before release. Report failed/total opportunities and duration when captured. | Riot hierarchy plus Dead Cells outline/reduction controls. Screenshot layer order alone is insufficient. **Unobserved.** |
| V3: Truthful impact | For each normally available skill, capture hit/miss/wall/block where applicable. Require no authoritative damage before its intended contact presentation, no hit cue on a miss, no old impact cue mistaken for an active threat, and consistent preparation/contact/recovery. Record event and visual evidence separately. | Hitbox/effect correspondence; no tuning or external-game timing copied. **Unobserved.** |
| V4: Reduced effects | Repeat V1–V3 with flash0 and shake0; target no loss of actionable position/direction/danger information. Verify actual saved options after menu/reload/region change. | Dead Cells documents both visibility aids and reduction controls. A reduction must not require changing damage/AI to remain playable. **Unobserved.** |
| I1: Input continuity | Ordinary down/hold/up and short taps, direction reversal, cursor-facing independence, focus loss/resume, menu, save wait and entry wait. Target no unexpected action replay, sticky movement/guard, duplicate resource payment or stale queued action. | Read-only frame metrics cannot prove this; use real input and production event identity. No physical latency target is inferred here. **Unobserved.** |
| A1: Audio hierarchy | Listen to at least 20 actual dangerous releases/hero hits during multi-effect fights per setting; record recognizable/total and any masking/clipping, with sound output and music level. Target 0 missed critical cues attributable to masking in the reviewed sample. | Dead Cells priority controls inform the check. Audio request logs and silent capture do not count as listening. **Unheard.** |

120 samples and three windows are minimum diagnostic evidence, not statistical proof of whole-session quality. A 240-frame buffer covers only a few seconds at typical cadence. Record window boundaries and do not combine overlapping windows as independent samples. For longer sustained reviews, manually preserve non-overlapping readouts or use separately authorized tooling; this observer does not silently expand retention or export data. Always report omitted frames, context transitions, invalid clocks and unresolved failures. Whole-campaign, device coverage, accessibility and sustained play remain separate acceptance work.

## 5. Verification commands and remaining integration checks

Executed from `app`:

```text
node --test tests/frame-observation.test.mjs
32 tests, 32 passed, 0 failed
node --check src/frame-observation.js
node --check tests/frame-observation.test.mjs
both passed
node --test tests/frame-observation.test.mjs tests/runtime-clock.test.mjs tests/input-latency.test.mjs
62 tests, 62 passed, 0 failed (includes the 32 dedicated tests)
```

The initial renderer test encountered function-bearing fixture clone/comparison errors. It now compares the complete serializable draw-command payload and unchanged scene data/function identity; production renderer code was not changed. The initial 25 dedicated checks were extended by seven retained-active regressions: long-menu eviction, every wait-state transition, fresh segment replacement, the independent 240 cap, clear/disable/profile boundaries, detached copies, and unknown/suspension evidence. The final dedicated run above is the reported result. Synthetic 4ms/8ms/etc values in tests are assertions, not performance evidence.

Main integrator must additionally verify: OFF context avoidance; unchanged canStep/input/render/HUD cadence; step/render/UI coverage without double execution; error finalization; context capture accuracy; profile/reload/title/save replacement clear; UI display of empty/unreliable values; retained active values after long menu navigation; module inclusion in the build; and the full regression suite against the final integrated source. Browser timing, normal-input mixed-combat quality and source-preserving publication stay blocked or pending until the relevant environment/approval is available.
