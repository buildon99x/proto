# Current-action footwork at recovery connections

Baseline `c5ce249be08ec865cd01c4f158a15fab4c3b2e33` (coordinator's v70 source), branch `codex/emberwatch-rebuild`. No public/default deployment, save/serialization/a19 or balance change.

## Selected quality defect and fix

While holding movement plus mace, one simulation frame can contain the old action's walking recovery and the next action's planted preparation. stepBattle intentionally retains p.moving=true for movement that actually occurred earlier in that frame. The articulated renderer treated that aggregate flag as permission to draw running legs for the NEW action. The same problem occurs when mace recovery connects to queued Judgement.

Concrete production-handler reproduction at simulated30Hz: frame displacement3.6 world units belonged to the old recovery; next mace cast2 was only0.013333s into its0.182s contact preparation, but resolveWarriorPresentation selected legs.action='run'. The next simulation slice was already planted. This is an animation/action-state mismatch, not evidence that gameplay needs an added movement lock.

The renderer now combines real aggregate movement/distance with the **current** existing skillMovementFactor before selecting distance-driven run legs. Planted preparation uses its existing action legs. Once the existing movement window opens, distance-driven gait remains available. Guard/no action, slowed moving casts, charge and channel-specific poses remain their existing behavior. Upper-body clip, direction, contact remapping, walk counter, gait phase measurement and gameplay movement bookkeeping are untouched.

One executable presentation condition plus a read-only policy import changes. No combat/input/controller/mobility/aim/timing/FX/audio rule, numeric value, asset or saved field changes. This does not create a universal animation lock or make all skills stop moving.

## Action/code comparison

Inputs below are default PoE-style bindings; configured v5 mappings may differ. 'Strong attack' here refers to existing Judgement/단죄, not a claim that PoE2 Rolling Slam is implemented.

| Action | Current movement during action | Aim and direction | Recovery connection | Change in this checkpoint |
| --- | --- | --- | --- | --- |
| General mace (J/LMB) | Existing planted windup; walking after contact. | Can retarget before contact; direction committed after contact. | Held repeat and newest admitted explicit skill have existing priority. | New planted windup no longer inherits prior-frame run legs. |
| Strong Judgement (E, if learned) | Existing planted preparation; slowed recovery walk. | Existing pre-contact retarget; committed contact facing. | Finite input can be admitted in the existing final recovery window. | Queued start uses strong-action leg pose rather than previous mace gait. |
| Righteous hammer (RMB) | Existing slowed windup and recovery walking. | Held/optional release tracking within its retarget window; locked afterward. | Held repeat through readiness, with existing queued skill priority. | Moving casting legs are preserved; hand/projectile/contact FX unchanged. |
| Shield charge (Q) | Internal authored forward travel, not free WASD locomotion. | Pending heading follows selected aim/movement; active heading locked. | Existing .18s recovery admission; cannot dodge-cancel mid-charge under its current policy. | Braced charge pose unchanged. |
| Dodge (Space) | Existing collision-resolved roll path and possible hold-to-sprint. | Movement vector takes priority for roll direction, then aim fallback; roll path direction is committed. | Per-skill allowed cancel windows; skill waits only through existing admitted recovery. | Existing mobility override/pose unchanged. |

This table describes current source semantics, not fresh native input acceptance. Complex timing/actual moving poses and sound require coordinator browser QA.

## Official PoE2 facts versus authored choices

The saved user-combat-controls.md explicitly separates movement and action state, skill-specific movement multipliers/retarget/cancel windows, and physical input versus render timing. The canonical v1.1/version2 requirement trace and existing next-priorities.md remain applicable.

- [GGG0.2.0](https://www.pathofexile.com/forum/view-thread/3740562) fixed movement-allowing skills failing to apply their slow on short/high-speed inputs. It supports checking the actual skill policy, not assuming all attacks are immobile or all can move freely.
- [GGG0.4.0](https://www.pathofexile.com/forum/view-thread/3883495) describes optional Cursor Tracking after key release and different movement-mode defaults. It does not publish a universal active-animation turning window.
- [GGG0.5.4f](https://www.pathofexile.com/forum/view-thread/3996513) fixed incorrect skill-direction initialization and extra roll on release after sprint. Direction initialization/input lifetime are distinct; it supplies no exact footwork algorithm for this game.

Current Emberwatch movement factors, contact windows, .18s queue and150ms save tolerance are authored existing values. This patch aligns display to them; it does not tune them or claim PoE2/AAA animation equivalence.

## Verification evidence and limits

Red matrix:17 tests,12 failures at new planted action incorrectly drawing walking legs,5 unchanged contract passes. Green focused run:89/89 passed (17 new production-handler regressions plus72 existing articulated/hammer/rig presentation checks), zero fail/skip/cancel. Matrix: controls4/5, simulated30/60/120Hz, held mace repeat and mace→queued Judgement. Additional new checks preserve immediate recovery walking, moving hammer/heal casts, direction/upper clip and stopped legs. Tests assert actual displacement, unchanged aggregate movement, one accepted start and read-only presentation snapshots.

New fixtures use legal scripted earned progression and real reducers/handlers, followed by an empty test arena. Their positions/defeats/input objects are fixtures; they are not normal key/browser gameplay. Existing rig probes use Canvas-call probes, not native pixels. No isolated Chromium/nativeCanvas retry or listening is performed. Final full/lint/build results are recorded separately below.

## Before/after native QA

1. Compare v70 and this candidate with the same legal profile/settings. Hold D+J for several repeat swings, aiming another direction. Frame-step the recording near each repeat start. Before: running legs can persist for the frame containing the old recovery/new windup boundary. After: that new preparation uses its planted action legs, then the existing recovery walking returns. Position, start/contact count and cadence should be identical.
2. If Judgement is learned, hold movement/mace and tap its assigned key during final mace recovery. At strong-action start, feet should match the existing planted strong pose; its later recovery walking remains available. Do not inject XP/skills to claim ordinary progression acceptance.
3. Hold movement plus RMB hammer: movement and casting footwork should remain available. Rotate cursor during preparation, then after contact, and compare the existing direction-lock behavior.
4. Repeat Q and Space with movement, walls and normal release; existing braced charge/roll directions should remain unchanged. Repeat early rejected input and the established hammer→Q→Space→A+J sequence.

Record native input/visual observations separately from this automatic run. Physical display/input delay, subjective fluidity, full motion quality, audio and whole-play remain unverified. The game's direct payload is qa-r14/index.html; the known launcher root-vs-qa-r14 path mismatch remains outside this patch.


## Fresh final validation

Full4556/4556 passed, zero fail/skip/cancel. Lint, original sync:registry and build:vercel passed; Next compiled/checked types/generated29 pages. Existing unrelated Vite size warnings remain nonfatal. All125 payload entries match launcher copy;124 copied source entries match source hashes. Only warrior-presentation.js changes;125 other tracked runtime files and167 original Emberwatch manifest files are byte-identical to baseline. Generated registry is retained as evidence then restored; no shared metadata or lockfile changes are committed. Native visual/input/listening acceptance remains open.
