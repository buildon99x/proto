# Reimplementation brief

## Outcome
Rebuild Emberwatch Reborn as a connected campaign action RPG with a fast, readable multi-enemy combat loop, meaningful Warrior growth, exploration/tool gates, equipment/crafting choices and durable world state. Preserve original Emberwatch0.4.7. Reuse the user's original resources with provenance. This is new implementation after source loss, not restoration of cedd0f2.

## Scope order
Warrior (Hammerwatch II Paladin correspondence) comes first. A runnable and verified first-entry→Adept loop must precede Expert/Master campaign completion. Mage and Archer remain future independent classes, not Warrior reskins. Four tiers and documented exclusive branches are retained as target requirements. Data-only catalogs must stay visibly unavailable as runtime skills.

## Authority and numerical claims
The canonical v1.1 plan is Library version2. Existing source catalogs separate cached community facts, official historical notes and unconfirmed details. The user authorized generally proportionate Emberwatch tuning for previously unresolved values. New numbers must be labeled authored adjustments, with rationale and difficulty tables, not represented as original-game measurements.

## Acceptance constraints
- Meaningful skill/build, exploration and equipment choices; never extend only enemy HP or walking.
- First entry, normal inputs, failure/success, death/retry, regional round trips, save/re-entry and duplicate reward prevention through actual runtime handlers.
- Original plan campaign-depth/time goals remain open until measured normal play. Simulation time, test counts and map counts are insufficient.
- Each verified small source/test/provenance checkpoint is archived to Library. Local Git is only one checkpoint, not external preservation.

## Quality target extension — 2026-10-09
The user targets the highest market quality for a2D RPG and requires external case analysis plus ordinary-input play/review/improvement. AAA is an aspirational quality target, not a claim about this prototype or another game's budget/team/category. Preserve Hammerwatch II mechanical correspondence while deriving concrete readability, action, progression, exploration and accessibility gates from evidenced examples. Public video observations, developer descriptions and untested inferences must remain distinct.

## R6a dead-save resume correction
A settled death must offer town retry as soon as its save loads, without movement, audio readiness, or another death charge. Living arrivals retain their existing input-started safety pause. This focused correction does not change balance or campaign scope.

## R7 bounded continuation
Connect earned Adept quarry completion to the remote clue/rescue/three-rune Pass route. No XP injection or level jump to Expert. Keep optional repeat-run bookkeeping detached until runtime atomicity and ordinary-input loop are implemented. Public root fixes remain isolated from unfinished content.

## R7a1 observed-issue correction
Normal-input R7a exposed a locked return portal stealing F from its nearby rope, direction ambiguity in the isometric view, and completed objects repeating prerequisites. This bounded correction prioritizes only the explicitly paired, reachable, ready shortcut object; provides a paused current-goal detail view; and states completion truthfully. Enemy numbers, reward budgets and movement distance are unchanged. These changes require normal-input regression before any root promotion.

R7a2 preserves the goal button DOM across unchanged HUD frames after an actual detached-node observation. The fix is a bounded UI stability change; no progression/reward tuning changes. Its actual keyboard-focus/click regression remains required.

R7a3 corrects a normally reproduced focus leak: Space on the HUD goal button cast shield charge instead of activating the button. Focused buttons/form controls and open dialogs own keyboard input; native Enter/Space and Tab work while gameplay is blocked. Escape remains a safe exit, with gameplay canvas focus restored on dialog close or canvas pointer input. No economics/content changes are included.

## R8 bounded continuation
Connect the earned Pass report to Orin's signal-restoration investigation while retaining his equipment shop. The two lever orders choose distinct access corridors into the same combat yard; there is no timer, fee, XP duplication or extra travel requirement. A free optional return shortcut opens after decoding and is not required for completion. S is tested and played as its own candidate before any root promotion. Expert/Master, remaining furnace/tomb/campaign and repeat expeditions are still mandatory unfinished work.

## R8a1 bounded post-play correction
Actual R8a east-route progression reached earned L12 with the exact1140XP/232G budget and retained depleted HP through save/reload. See docs/r8a-normal-input-east-qa.md. Fix town-to-S navigation wording, completed decode reward status, and the pause-menu region label when a pending travel commits. Preserve menu focus/navigation, no extra checkpoint/award, all existing profile namespaces and root R7a4. The13 new checks execute real handlers; west/death/quality review remains open. No new region or combat balance is claimed in this correction.

R8a1 normal-input west/death follow-up is recorded in docs/r8a1-normal-input-west-death-qa.md. Both approaches complete the same authored reward budget, optional-lift independence and depleted-resource persistence; role/threshold readability and deeper encounter choices remain open.

## R8a2 S readability correction
Add quiet static shape-based role signatures (double chevron / forked arrow / broad shield) and subtle body proportions only for S foes, plus inset floor marks and local wall cutaway only at actually open, seen passage tiles. Render below danger/loot/actors. No hitbox, reward, HP, input or save changes; reduced-flash remains honored. Menu/title/read-only status share one build label. Actual corrected visual QA remains required; this does not settle tactical depth.

## R8a3 observed floor contrast correction
Actual R8a2 mixed-enemy review at flash0 found static role glyphs merging with floor detail and actor shadows, although danger cones and shot lanes remained distinguishable. Preserve the existing glyph size/shapes and use a dark outer keyline plus light inner line, displaced below the foot shadow. Do not alter combat, rewards, collisions or open-passage marks. Actual corrected pixel review is required.

## R9 Furnace implementation work boundary
Connect completed Signal restoration to the authored compact Furnace plan (docs/r9-furnace-tactical-plan.md): one saved cover/channel choice, mixed5/6/6 enemies, explicit lens pickup, once-only reward receipts and physical floor/cover changes. Both side flanks remain usable. No HP/distance inflation, Expert/Master skill claim or live repeat-run acceptance. Current public root R7a4 and verified R8a3 build remain separate while this work is unverified.

## R9a actual-play finding — 2026-10-10
Furnace cooling/death-retry/lift/working-ring normal-input QA exposed missing role glyphs on the new foe kinds. Reuse the already reviewed non-color glyph vocabulary for those three authored roles, retaining actual active/dead visibility and danger layering. No combat/save/body-size rebalance belongs in this bounded correction; actual corrected screens remain required.

## R10 next bounded work: Tomb and Expert handoff
Implement the design-only contract in docs/r10-tomb-expert-handoff-plan.md in small verified pieces: first19foe Tomb content/reducers, then region/save/UI integration and protected training-fee economics, then actual L15 promotion/Expert effects and a useful next battlefield. Report at Eda must not requireL15; reserve the report's existing120G inside total gold for training. All spending and death handlers must respect spendable gold. New core files alone are not live content. R9a1 normal-input cover/channel evidence remains separately preserved; public root staysR7a4 until approved promotion.

## R9a2 actual fire-footprint correction
Normal-input Trial by Fire purchase and E cast exposed that damage persisted between ticks without a persistent floor boundary. Pass live areas into the renderer and draw a quiet static friendly sector before loot/hostile warnings/actors. Match the existing range+10 center-point tolerance, angular bounds, wall LOS and actual lifetime. Flash0 retains the same boundary. No enemyHP, skilldamage, resource, duration or AI change. Ray-sampled visual edges are not a replacement collision system. Corrected ordinary-input screen review is still required.

## R9a3 observed footprint contrast refinement
Actual R9a2 flash0 casting confirmed persistent wall-clipped geometry but its thin dashed line blended into floor detail. Add a same-path static dark outer keyline plus warm inner line and modest11% floor fill. No extra pulsing, brightness or simulation changes. Preserve hostile warnings and actors above it.

## R10 Tomb candidate presentation
Keep the new Tomb isolated at /qa-r10/ with explicit forward-copy from earned QA profiles only. Reuse the owned low masonry and draw distinct non-color five-role signatures, three glyph plates and a carried ward mark below real hostile warnings. The boss's cracked ring uses the committed phase cue, not HP prediction. No collision, damage, reward or save payload changes belong to this presentation. Ordinary-input screen and whole-route validation are still required.

## R10a1 observed guidance correction
The earned Normal R10a route now reaches T report at L16, including wrong seal input, prefix reload, carried-ward death/retry and boss/oath/report. Correct only stale/duplicated progress prose in this increment. Do not change geometry, combat/economy, profile namespaces or promote the public root. Actual qualification is in docs/r10a-normal-input-tomb-qa.md; corrected copy still needs published normal-input regression. Expert promotion/effects remain a separate implementation gate.

## R11 input integration slice
Preserve every prior control profile, add optional Expert slots without stealing keys, and distinguish finite Banner pulses from held Onslaught ownership. Work is isolated and not published; actual main/state/UI integration follows pure routing validation and the integrated Expert runtime.

R11 safety integration preserves channel payment across interrupted saves. Any menu, lost focus/capture or remap immediately clears held input; cancellation is applied after an in-flight committed snapshot is reconciled, then its critical recovery checkpoint must finish before resumed simulation or a newer command. A scoped queue never carries an old cancellation into a different profile/battle/life.
## R11 Expert promotion transaction slice
Implement only the reserved120G Expert promotion, historical Adept/ancestor validation and explicit v4 save boundary. Existing25 runtime skills remain the only supported nodes; new Expert skills, combat, controls, UI, browser QA and publication belong to later integration. Values and conditions are authored Emberwatch policy, not original-game measurements.

R11 input/trainer/slot wiring now executes through production main/frame/controller boundaries, with strict Expert fee quote and nonoptimistic action-slot assignment. The final pre-battlefield aggregate is1647/1647. This verified local UI increment is preserved before integrating the separately implemented B encounter. It has no ordinary-input Expert acceptance or public deployment yet.
## R11 post-training battlefield work boundary
Add a compact authored two-device battlefield after genuine Expert promotion, followed by a tactically distinct boss, explicit beacon recovery and Eda report. Device order is free; neither an Expert skill purchase nor a timed hold is required. This content module does not complete Master, repeat expeditions, ordinary-input acceptance or the whole campaign. State/controller/UI integration is separately owned.

## R11a integrated candidate boundary
Connect the accepted Expert handlers and saved action slots to the authored Beacon Battlefield B route, using actual state/controller/travel and UI handlers. Capture objective revision and modal epoch; preserve living battle objects when the second device opens only the map. Both six-foe yards, explicit beacon collection and Eda report are distinct durable steps. QA namespace qa-r11 copies earned R10 profiles only through explicit forward UI, preserving original bytes. Earlier regional completion text must acknowledge connected Expert/B content without denying it or promising Master/final/repeat completion. App/project/build/title metadata use R11a / 0.11.0-reimplementation.1. Automatic fixture settlement, normal-input play, visual quality and duration remain separate evidence.

## R11a1 first-play corrections
Actual Expert progression, purchase/slot/key persistence and first B arrival/death
were checked; the B battle remains unfinished. Fix observed save-window input
loss, exact Banner boundary contrast and only the new town B entrance crowding.
Preserve public root and existing earned profiles. Do not treat observation-idle
death or automated fixture victories as a fair-difficulty or quality judgment.
# R11B combat-depth correction in progress
Normal R11a1 B play exposed shallow same-tier encounters despite functional
growth/save/reward loops. Preserve fast fodder clears and older-region power
while testing B-only role spacing and vulnerable repositioning. Compare with
the same legally earned rank4 Hammer build. Separately test an explicit
Emberwatch Lance release ramp: completed pulses1/2/3/4 give25/50/75/100% of the
unchanged cached maximum row. Short release buys safety; one active second
reaches full damage. No extra cost, hidden minimum hold, free queued release,
HP-only padding or inferred original-game rule. Candidate-only until checks
and ordinary-input comparisons; rootR7a4 remains unchanged.

## R11B bounded encounter response
After the R11a1 earned-build pacing finding, separate B's east lancers and add
finite vulnerable lateral steps for B support/lancer roles and the boss at safe
attack boundaries. Reuse the west wall and existing fire response for survivors;
keep all map tiles, foe HP, rewards and older-region behavior unchanged. Synthetic
handler checks are not ordinary-play pacing or quality acceptance.

## R11b1 observed action-block feedback correction
Normal Protection QA found that silence correctly prevented healing but the generic rejection hid the reason. Share one read-only runtime eligibility result with HUD/aria/toast, without changing combat eligibility, resource, timing, save or input rules. Keep the existing root and ordinary-input verification boundary.

## R11b observed enemy release geometry correction
Normal Protection boss QA showed a full-range sword arc at a committed fire-line
release. Correct only release presentation: a compact directional muzzle cue
for a moving projectile, and the actual committed cone/circle outline for real
area attacks. Keep existing canvas resources, low visual noise and flash0
readability. No damage, timing, status, collision, movement, rewards, RNG, save or
input changes. Corrected native screen acceptance remains an integration gate.

## R11b2 observed release-cue correction
Integrate only the geometry-aligned enemy release cues with unchanged gameplay. Preserve v39 R11b1 native status/Zeal evidence. The late-route budget is a proposal, not implemented content or a density acceptance result. Native corrected flash0 mixed-lane/boss review is required after candidate publication.

## Bounded resource display precision correction
Native R11b2 QA observed a below37.5 MP pool displayed as38 while the real37.5-cost
action correctly remained blocked. Correct presentation only: retain positive-HP
ceil behavior, show MP/stamina conservatively to thousandths, and retain exact
quoted decimal costs in hotbar, accessible names and rejection feedback. Do not
change eligibility, resources/regen, cost, cooldown, save, input or difficulty.

## R12 isolated wilderness integration
Connect the corrected W module after genuine B report through shared world,
state version5, controller/save and ordinary UI. Capture immutable live reports
with their committed storage epoch; objective panels wait for safety cancellation
and checkpoint before capturing actions. Preserve earlier earned B slots and all
original project files. W still requires normal-input tactical/visual review,
external archival and explicit candidate publication; it is not Master or ending.

# R11b4 bounded save-owner correction
Keep a selected profile's UI, battle and controller owned by the same selection
across asynchronous new-game/candidate-copy persistence. Superseded work may
finish an already-requested write, but may not install stale state or start a
new transaction. This is an authored application-safety contract, not an HWII
mechanic. No W or version5 save schema enters this backport.

## R11b5 bounded upgrade safety
Before replacing the R7a4 root, preserve the original committed browser save at
its first format3-or-earlier to4 write, fence already-open old writers, and
provide explicit same-namespace empty-profile recovery. Keep a recovery-only
page in the prepared rollback publication. No automatic restore, source
overwrite, invented old history or external save transfer. This is application
reliability work; gameplay and growth values remain unchanged.

## R11b6 bounded recovery-address follow-up

R11b5 normal-input recovery preserved the L4 checkpoint and denied source/existing-target overwrite. Hosting strips `.html` from candidate recovery addresses. R11b6 supports only exact known extensionless recovery aliases with unchanged namespace isolation; root promotion stays held until the corrected public path is checked.

## R12a1 candidate save-safety integration
Preserve the verified R11b6 profile ownership, pre-v4 backup/fence and independent
recovery while integrating the existing W candidate. Only qa-r12 will expose W.
Root and deployed release-recovery files remain outside this source task. Before
a first schema5 write, retain the actual committed schema1–4 original separately
as pre-v5, without changing an existing pre-v4 backup or inventing a schema4 step.


## Bounded Expert training-description correction
R11b6 native trainer review found missing next-effect explanations before owning
an augment's base skill, plus omitted Inner Flame resistance and Flaming Wrath
spell-critical bonuses. Change only training text projection: retain unavailable
runtime values and purchase/branch guards, show explicitly conditional reference
rank values, and identify unknown source fields without inventing them.

## R12 Wilderness scene readability correction
Presentation-only scope: conceal inaccessible future-room actors/objects and
unavailable in-W returns, keep reachable unaggroed actors and genuine hostile
tells, and replace distant verbose landmark overlays with nearby short labels.
Keep complete names and instructions in the existing F hint/modal. Preserve town
locked-anchor cues, all simulation, state/save, economy and skill behavior.

R12 follow-up: clarify the optional scout panel's remaining-enemy count. The
current count is remaining foes, not completed kills; change wording only.
## Bounded trainer position correction
R11b7 normal-input review observed lower-node purchases returning to the top of the trainer. Preserve the same trainer viewport, expanded skill groups and eligible keyboard focus only after a successful purchase in its still-current session. Keep combat, economy, resources, saves and modal/input safety unchanged. Integration owns native review, whole-suite checks and publication.

## R12a3 bounded normal-play fixes
Normal fresh replay exposed excessive planting while holding basic mace attacks. Allow walking only after the existing mace contact during its unchanged recovery debt. Contact origin, cadence, damage, MP/stamina, guard and explicit-skill priorities remain unchanged. This authored movement decision is not claimed as verified Hammerwatch II behavior. Actual moving-pose, retreat and mixed-enemy comparison remain required. Selected checkpoint UI also names its canonical content hash accurately and retains the chosen filename. Quarry completed-object prose must state current progress and already-paid rewards. These are bounded corrections; no new late region, Master unlock or root promotion.

## R12a4 bounded guidance follow-up
After the earned L10/L12 replay, make Pass/Signal object prose reflect unfinished prerequisites and remaining enemies; never ask to repeat completed work or kill zero foes. Clarify that region transition itself, not elapsed walking, grants no recovery. Carry the already root-verified position-only checkpoint rejection explanation into the candidate without relaxing validation. No new area, balance, skill, save schema, migration or root promotion.

## Current priority update: R14 POE-oriented controls (2026-10-10)

Balance and R13 progression expansion are paused by user direction. Follow the specified full combat-controls document under docs/poe2-input and the source-confirmed vs authored distinction. R14a2 integrates explicit controls5 eight-slot assignment, independent movement/aim, contextual click approach and living actor collision, while preserving existing saves/keys until explicit selection. Immediate input start, contact timing, per-skill cancellation/repeat, fancy FX, danger visibility and flash0 need separate real-input/visual review. See docs/poe2-input/r14a2-integration.md for current contracts and unfinished acceptance. Earlier counts are historical, not this candidate's pass count.

## R14a6 scoped recovery-notice correction
A successful resumed held attack must not keep the earlier recovery-too-early toast on screen. Scope is transient presentation ownership only; combat rules, resource costs, cooldowns, save data and balance stay unchanged. Preserve rejection feedback for unsuccessful single presses and unrelated notices. Candidate browser verification is a separate required gate.

## R14a7 actual-play-led presentation slice (2026-10-11)
Continue the user's controls/visual priority on a new work surface while a5/a6 remain frozen. Normal public v58 first-entry play confirms the centre recovery notice competes with the fight and town labels remain crowded. New candidate-only read-only contact/frame diagnostics and a compact desktop notice layout need actual runtime/screen acceptance; they are not quality completion. No combat balance or progression expansion belongs in this slice.

## R14a8 actual death-state feedback repair
The actual public v58 first-boss retry exposed a misleading live dodge/sprint and potion description after death. Match these HUD/ARIA/disabled states to the existing dead-action runtime gate and restore ordinary states on retry. Do not change action execution, resource costs, balance, save format or inputs. This local candidate also inherits the unreviewed a5/a6/a7 presentation/observer changes.


## R14a9 compact HUD / pause-menu scope

Fix the normal-input 889×562 QA regressions: six visible actions wrap as five plus an orphan potion, and the initial focused Continue button is below the pause panel viewport. Preserve action order, bindings, save flow and combat values; keep readable labels and usable targets.


## R14a10 dialog focus

Fix two remaining issues observed in v61/a9 at889×561: help initially focuses an offscreen bottom button, and Shift+Tab from the first controls button reaches the background potion. Introduction version is not established. Preserve bindings, combat, save and balance.

## 2026-10-11 · R14a11 town-return request
Implement the user's explicit always-accessible cooldown portal request without changing existing combat/progression balance. P/HUD opens a no-consumable portal at the hero; existing interaction enters town. Preserve user keys, lifecycle/storage safety, objectives and earned receipts. One-way only because detailed living-enemy instance persistence is not established. Authored 60-second real-time cooldown and immediate utility behavior are distinguished from GGG's interrupted-cast reference. See docs/verification-r14a11/README.md.


## 2026-10-11 · R14a12 accepted input and contact presentation
Continue the user's input-immediacy and clear, expressive combat-FX priority without tuning skill speed, damage, resources or cooldowns. Preserve a11's personal town portal and all focus safeguards. Correct the reproduced accepted short-tap loss when a hammer hit slows recovery but not its queue timer, and prevent an airborne hammer's impact direction from following the hero's later aim. This is a narrow input-contract and contact-presentation correction; new FX spectacle and published subjective acceptance remain open.

## R14a13 integrated combat presentation
Combine reviewed directional enemy recoil/death, simulation-owned preparation/contact/release audio, and Warrior upper/lower-body and skill/projectile presentation in an independent copy. Existing damage, action/contact/recovery times, cost, cooldown, RNG, movement/collision, save and the user-defined 60-second one-way town portal remain fixed. PoE2-inspired quality is a target, not verified parity; the full mechanism matrix remains unfinished. Native pixels, repeated ordinary-input use and real listening stay separate from automatic verification.


## R14a14 safety-stop containment — 2026-10-11

Independent copy of frozen a13. Safety-origin pauses require an explicit choice before exposing ordinary menu actions. Voluntary pause, keyboard/focus access, the >500 ms threshold, cancellation and gameplay/save/art contracts remain unchanged. This addresses incidental later clicks entering a full menu; QA did not observe an actual allocation change. The cause of observed long rAF gaps is still under investigation and this change is not a claimed rendering fix. Final verification is recorded separately in docs/verification-r14a14.

Final a14 automatic verification: 4,338/4,338 tests (4,312 prior + 26 new), zero failures/skips/cancellations; lint and build passed. Build 124 files / 16,729,021 bytes, 123 source-copy hashes verified. All rendering/audio/gameplay/timing models and 14 original assets remain byte-identical to a13. Native a14 browser acceptance and coordinated Git/archive/publication are pending.


## R14a15 exact long-gap observation
Repeated a13 native rAF safety pauses were not represented in the existing normal-frame QA statistics. This independent a14-based candidate exposes the exact >500ms incident and preceding completed callback, retained across long menus and resumed active segments. It instruments input/aim, step, event delivery and synchronous save entry, scene preparation, render, audio tick, HUD and safety processing, with an explicit unbracketed residual. This is observation-only, default OFF, in-memory, bounded to 12 pairs, and does not send telemetry. Runtime >500ms protection, dt clamp and every gameplay/render/audio model remain unchanged. Device, GC, browser scheduling, GPU and sound causes remain undetermined.
