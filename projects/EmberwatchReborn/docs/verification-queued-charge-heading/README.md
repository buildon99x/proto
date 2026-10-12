# Independent queued shield-charge heading consistency

Baseline `771b61f7f73e91a556bc22883017ad75c6d7ef06`, branch `codex/emberwatch-rebuild`. Separate proto checkout; cb-ll, original Emberwatch, published defaults, and a19 blocked equipment/serialization work are preserved.

## Reproduced problem and change

Selecting **돌진 방향 → 마지막 이동 방향** works on immediate Q, but a Q accepted during final recovery is retargeted toward the cursor on the next simulation frame. Production model reproduction: queued movement headingπ/2 became cursor heading0 after20ms. Real main keyboard-handler fixtures also failed for controls4 and5 (their real screenMovement heading was overwritten). This is an input correctness defect, not a request to remove recovery or make contacts instant.

Only one executable expression changes in combat.js: pending shield_charge uses finite input.chargeAngle, the same heading already used on its immediate start; otherwise it keeps existing cursor refresh. This setting is supplied by the main router, so other queued skills and aim-directed/no-last-movement charges keep their existing behavior. While pending, the latest selected movement heading can update; once the charge starts its unchanged skill policy locks heading. No new saved field, timer, skill tuning or animation policy.

Red evidence: combat26 checks had25 failures at movement heading assertions and1 unchanged safety pass; actual main2 checks both failed. Green:26/26 model plus2/2 main handlers passed. Tests check actual charge path, one start/contact, no pre-start payment, costs/CD, locked active heading, queued cursor fallback/latest movement refresh, safety clearing and held mace resuming. Matrix: controls4/5, trackingOFF/ON,30/60/120Hz, mace recovery/roll predecessor. These are executable production functions with synthetic arenas or scripted earned state; they are not native browser latency, visual, sound or subjective-quality measurements.

## Source review and official-reference boundaries

Canonical Library planv2/v1.1 and local requirement trace/user-combat-controls/implementation contracts remain the design basis. Root/project AGENTS and repository verify-project skill were read. `.agents/skills` is absent; `.codex/skills/verify-project/SKILL.md` is the available validation guide. No isolated Chromium/nativeCanvas retry is performed.

| Area reviewed | Existing contract retained | Verification |
| --- | --- | --- |
| Combat buffer | .18s recovery admission; accepted PoE intent decrements on recovery clock, with .35 hitstop rate floor; legacy active-frame expiry remains. No cooldown/resource waiting. | Existing hitstop/combat-intent cases in fresh full run |
| Save tolerance | Separate150ms wall-clock expiry for finite press/deferred delivery; long waits never replay stale potion/skill. Busy/locks/CAS unchanged. | Existing main/deferred/input-safety cases in fresh full run |
| Dodge/skill connection | Only allowed per-skill cancellation windows start roll; rejected dodge edges are consumed rather than replayed later; movement takes priority for roll direction. | Existing mobility/combat cases plus roll-to-charge matrix |
| Held attacks | Mace/hammer alone repeat through readiness; newest explicit skill gets reserved priority. OS repeat is not a new edge. | Existing handler/hold cases plus Q-to-held-mace restart |
| Movement/aim | Mace recovery walk, hammer slowdown, charge internal movement/locked heading and skill-specific retarget windows stay unchanged. | Existing policy/aim cases plus actual fixed charge path |

Official GGG references were checked on2026-10-12:

- [0.3.0](https://www.pathofexile.com/forum/view-thread/3826682): hold roll-to-sprint, optional continued sprinting, and separate cursor/ground targeting. These describe controls, not an exact Emberwatch queue clock.
- [0.4.0](https://www.pathofexile.com/forum/view-thread/3883495): Cursor Tracking can update target/direction after release; defaults differ for WASD/click movement. This does not make every skill continuously turn during its active action.
- [0.5.4f](https://www.pathofexile.com/forum/view-thread/3996513): official targeting-direction and release-after-sprint bug fixes support treating direction initialization and input lifetime separately. The Emberwatch heading fix does not claim to reproduce that game's private implementation.
- [0.1.1](https://www.pathofexile.com/forum/view-thread/3696353): held-input competition and interaction/dodge bugs have separate fixes; this is not evidence for a universal PC priority algorithm.

The .18/150ms windows, roll timing, movement heading setting and Emberwatch skill values remain authored contracts; exact PoE2 buffering/cancellation timing was not publicly established or measured. Balance tuning is held. Flashier FX and three distinct melee builds remain user goals, not features declared complete by this patch. Native immediate-input responsiveness and long-save expiry remain separate tasks.

## Native candidate QA still required

Use the included qa-r14 static candidate, not the public default. Choose WASD, then set charge direction to **마지막 이동 방향**. Hold J while moving D, keep the cursor on a different direction, and tap Q late in the mace recovery. Charge should follow the last movement direction; after its start changing cursor/movement must not bend it. Held J should resume after charge, without duplicate Q cost or contact. Repeat from Space roll's final recovery at different frame rates and with mapped v5 slots.

Compare aim-directed Q and no-last-movement fallback, early rejected Q, existing hammer→Q→Space→A+J, menu, blur/refocus, and resource exhaustion. Candidate v68 browser reports established recovery-copy/Q cooldown/menu reset only; this checkpoint's exact browser path/timing, blur, complex chains, sound and whole-play/build distinctions need coordinator QA. Automated main blur/safety cases are not native blur acceptance.

Existing launcher project metadata points at `/runs/emberwatch-reborn/index.html`, while its static copy is under `/runs/emberwatch-reborn/qa-r14/index.html`. Aggregate build success is separate from launch-route acceptance; this bounded combat patch does not change that metadata. Package README gives the direct QA entry. No public deployment or main merge.

Runtime integrity: only combat.js changed;125 other tracked source files are byte-identical to baseline. All167 original Emberwatch manifest hashes match (integrity.json). Build source and launcher copy checks match all125 payload entries (124 copied source entries); combat.js SHA256 is cac0d0ce42a37ec65940a32f58d1dcea49262fa97dab3b125c97f04ddd488e45. Generated registry output is retained as evidence, then restored; other projects and lockfile are not committed.


## Fresh final verification

Full Node suite:4513/4513 passed, zero failures/cancellations/skips (`full-tests.tap`). All28 new regressions pass; baseline red records are retained. Project lint, original sync:registry and original build:vercel completed successfully. Next compiled/checked types/generated29 pages; nonfatal existing other-project Vite chunk warnings remain in logs. No native browser/visual/listening acceptance is inferred.
