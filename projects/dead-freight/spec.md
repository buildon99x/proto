# Black Pines 0.2.0 specification

## Visuals
- 640×360 internal render, fixed 16:9 frame, small rounded corners
- Four-tone cool black / slate / fog gray / ivory post-process with ordered dithering and fine stochastic texture
- Layered conifer forest, dark foreground branches, distant fog and a ruined relay
- Original large ivory receiver, black gloves and muted rust suppressor cap
- Quiet monochrome HUD; no neon palette or large cyan panels

## Skill-based combat
- Manual firing cycle with optional accessibility auto-cycle
- Readable enemy windup before dodgeable projectile fire; no unavoidable automatic hitscan damage
- Dash uses 45 stamina, has 0.2-second duration and 0.15-second invulnerability; stamina replenishes at 24/second
- Reload press during 44–62% of the reload animation grants three seconds of 30% damage bonus; mistiming adds recovery
- Headshots reward accuracy; style chains expire after four seconds and break on damage
- Three weapon classes, finite ammo, destructible obstacles, explosive barrels and healing pickups
- Eliminate the target, collect its token, return to extraction

## Technical scope
Static HTML/JavaScript with pinned, locally vendored Three.js 0.160.1 (MIT). No runtime external requests or server APIs. Procedural geometry/materials and synthesized audio are original. Desktop keyboard and mouse required. Arrow-key aim is the pointer-lock fallback.

## Non-goals and acceptance
No claim of identical source-game content, campaign or assets. No mobile gameplay or multiplayer. Visual acceptance requires inspecting a real rendered frame against the latest reference; live acceptance requires a human-style playthrough, including interruption/retry.

## 0.3 first-person polish target
The user explicitly requested reference-level first-person visual detail: articulated gloved hands actually gripping the weapon, a clear trigger finger, mechanical slide/chamber/sights, reload and recoil recovery, and stronger readable shot/impact/destruction response. Work in the Git repository and checkpoint/push changes. Browser visual acceptance remains gated on sign-in; geometry or unit checks alone cannot establish parity.

## 0.4 red accent / hard-surface correction
Match the visible wine/rust suppressor cap as a substantial accent rather than a barely visible sliver. Retain a restrained three-value red ramp through the four-tone post-process. Use a chamfered receiver cross-section and stepped, tapered suppressor pieces with clear machined edges. Preserve attachment controls, articulated finger contact and existing firing/reload mechanics. Any offline geometry diagnostic must be labeled separately from an actual in-game screenshot.

## 0.5 implementation acceptance
- Shared hip/ADS pose definition, camera-relative first-person silhouette checked against the 640×360 reference; exposed wrist separated from sleeve/glove
- Real viewmodel self-shadowing and authored creases/contact-darkening, preserving the red accent and four-tone style
- Stable damped positional/rotational recoil with return, responsive ADS, locomotion and landing/dash response, reload magazine/support-hand/slide/audio synchronization
- Original bounded WebAudio layers for shot transient/body/mechanics/reflection and material/target impacts; mute, pause/resume and safe master limiting
- Tests cover construction, reference framing, wrist visibility, contact zones, motion convergence/frame-rate robustness and audio scheduling/resource limits
- Browser-render, normal-input and audible acceptance require a working supported preview; disclose separately when blocked

## 0.6 extraction and readability acceptance
- Persistent high-contrast center reticle with hit feedback; no stochastic or Bayer screen-space noise. Static low-amplitude material texture belongs to world surfaces. Preserve weapon accents and restrained cold palette.
- Automatic timed cycling by default for pistol/shotgun; firing cannot skip recovery. Pump sound, casing and mechanical movement follow cycle events.
- Space jumps with gravity, ground contact and low-cover clearance; Ctrl/C slides with stamina cost, direction, friction, duration and cooldown. Shift sprints. X retains the existing dodge.
- A connected region approximately 320–360 m across, with multiple legible landmarks and routes; physical collisions match major cover. Use instancing/shared materials and bounded effects.
- Local encounters alert within range/line of sight rather than activating the whole map. Optional cargo and supply caches support route choice. Defeat the relay target, collect its token, and hold an extraction site until evacuation completes; leaving its radius cancels the hold.
- Map/objective/distance and concise Korean controls explain traversal and extraction. Restart and pause clear transient input safely.
- Deterministic model tests exercise automatic pump, jump/land/clearance, sliding/collision/stamina, connected routes, loot and extraction conditions. Browser WebGL, ordinary input, sound and performance require separate live verification.

## Assault-rifle-first foundation (pending live acceptance)
- One original rifle with distinct receiver/stock/handguard/magazine/optic and two-handed grip; retain first-person only and existing rig reuse where useful.
- Coherent rifle state for ready, firing rhythm, switching, sprint recovery, tactical versus empty reload, magazine and chamber; bounded fire buffer and auto/burst modes. No firing through invalid transitions or ammunition duplication.
- Explicit rifle range falloff, reproducible cone/spread, accumulated recoil/recovery, ADS/sprint differences and camera/aim consistency. Preserve legacy tests and weapon behavior.
- Rifle-specific recoil/reload/bolt/casing/muzzle presentation and mechanically timed events. Distinct tactical and empty reload with support-hand and magazine phases.
- Real original/licensed audio samples with provenance for the rifle, layered and spatially mixed; no placeholder tone/beep as rifle output. Audio loading failures must be visible and not silently treated as an accepted final sound.
- Add deterministic state/ballistic/presentation/audio and rendererless integration regressions. Release only as an unverified development checkpoint until browser rendering, ordinary controls, listening and performance have been checked.
- No Seoul/Tokyo, five-weapon completion, advanced AI, stash/economy or finished-game claim in this checkpoint.


## October 8 creator feedback
The user actually played and reported excessive weapon screen occlusion. The next rig revision must preserve a clear central view and measure hip/ADS footprint. Movement must reduce stamina, including walking, with greater sprint drain and discrete jump/slide cost; stopping restores it and exhaustion must not trap the player. The creator adds perpetual surface night: atmospheric conditions prevent sunlight reaching the ground, while the upper-atmosphere event remains unexplained. Do not assert that the star physically disappeared or invent the cause. This game-specific refinement does not edit the external canon repository. Lighting uses restrained ambient readability and visible local work lamps, not a blanket grey/black filter. User also selected Pixabay explicitly for firearm samples; the final audio source must follow that request and its license.

## Renderer startup failure acceptance
- Keep Start disabled and gameplay surfaces hidden until renderer initialization succeeds.
- Catch renderer construction/configuration failure and return before mission, audio, gameplay listeners and animation-frame scheduling. Do not rethrow an expected startup failure.
- Show a Korean unavailable status and plain recovery guidance: reload first; if failure persists, try a WebGL-capable desktop browser or check browser graphics acceleration. Do not assert why WebGL failed.
- Replace the invalid Start action with a working page reload; hide loadout/options, gameplay controls, fullscreen and stale HUD/canvas/damage layers. Preserve the credits link.
- Deterministically exercise renderer failure, recovery UI, reload actions, absence of gameplay side effects, and successful startup in the rendererless harness. These checks do not establish GPU rendering, ordinary-input gameplay or audible acceptance.
# 0.7.2 lifecycle repair contract

- Saved bank and contract level retain the `deadfreight-best` compatibility key. Read/write failures are visible, failed writes can be retried without double banking, and no recovery path deletes user data.
- Menus retain native keyboard navigation. Deployment choices are explicitly scoped to the next new contract; continuing a paused contract preserves its current loadout/difficulty. Result and pause text derive from current state.
- Full-health medkits remain available. Target armor belongs to the enemy, independent of the selected starting weapon.
- Slow frames use bounded fixed simulation steps and an active wall-time clock instead of losing every interval above 50ms. Pauses, hidden-page time and resume boundaries do not advance the active clock; long stalls cannot create an unbounded catch-up loop.
- First-entry guidance states the shipped HARDCORE default, no current raid timeout, carried-value loss on death, same-region replay, and bank tracking without shop/stash spending. Do not claim the future 15–25 minute raid target is implemented.
- Verify these with deterministic regressions and publish a reversible checkpoint. Actual 3D/combat/audio evaluation remains distinct from source tests and menu screenshots.

## 0.8 equipment slice contract
Use original limits: 12 bag slots, 30kg total carried mass, two distinct firearm positions, one armor position, four stable quick-use positions and one restricted safe pocket. Count loaded ammunition and equipped items toward weight. Stack, move, swap, consume and drop atomically; failed capacity/type checks leave world items and inventory untouched. Ground loot previews and inventory comparisons show quantity, weight, value and relevant stats. Existing firearm mechanisms remain authoritative; inventory must conserve loaded/reserve ammo through reload, swap and drop.

Healing requires missing health; a usable scanner reveals nearby enemies briefly without alerting them; a throwable has a visible flight/fuse/blast with cover and self-damage. Use keyboard/mouse-accessible inventory buttons and a stable numbered hotbar. Opening the bag pauses this single-player prototype and says so visibly. Equipment and carried loot transfer to stash on extraction; death loses carried items except eligible safe-pocket contents. A basic recovery kit prevents an empty-stash dead end. Existing cash is retained exactly, while retained loot is not also silently auto-sold. Persist deployment reservations and settle extraction/death idempotently; interrupted raid recovery is explicit. Never clear or overwrite unreadable saves.

The live user's save is outside source tests. Test isolated legacy-cash2920 migration, empty/loaded weapons, capacity and mass failures, stack/equip/drop conservation, item use, extraction/death/repeat settlement, interrupted load and storage failure. Actual browser controls and gunplay/audio remain an independent acceptance gate.

## 0.8.1 visibility acceptance
Restore 0.6 background #8c929f, fog #89919c/density0.0095, hemisphere #cbd2dc/#1a1e29 intensity1.7, directional readability fill #d5dbe1 intensity1.65, weapon hemisphere #cbd4df/#101724 intensity0.85 and weapon key #ffffff intensity3.2. Keep camera, geometry, reticle, no-screen-noise grading, collisions, inventory and save behavior unchanged. The directional source is a presentation fill, not a lore claim of sunlight. Verify the normal render path and get actual local-PC before/after images without starting a raid or mutating saved items.

## 0.8.2 test storage contract
Only `?testProfile=local-qa` enables test storage. No parameter preserves the current default keys. Unknown values, empty values, duplicate parameters and wrong-case testProfile spellings stop before game/storage initialization. Every owned save, migration backup and settings key passes through one fixed-prefix adapter; arbitrary keys/namespaces are rejected. The test profile starts empty and never seeds from normal state. A visible Korean test-save badge remains on menu, inventory and play screens. Recovery, retry, restart and reload operate on the same chosen namespace. There are no test cheats or altered gameplay rules.

## Audio repair contract
All four currently playable guns require recorded gunfire/mechanical/impact routing with no procedural gun fallback. Distinguish non-gun ambience/UI cues rather than silently describing them as recorded firearm audio. Verify source provenance, licensing and exact assets. Avoid treating a preprocessed kick-layered source as an unmodified recording. A labeled, game-specific A/B comparison must identify source, weapon/mode and whether it is a pre-mixer sample; do not redistribute raw stock clips as a pack. Keep existing weapon-state timing, cancellation and voice limits. No user-PC or live saved-state mutation by this source worker.

## 0.8.3 recorded firearm contract
All four shot routes, enemy gunfire, reload/cycle/empty/switch, material hits, player hit and casing contact require decoded local recordings. None can silently fall back to synthesized tones/noise. Non-gun dash, destruction, explosion and pickup remain separate procedural cues. Use real M16 reports, real 9mm (also adapted to the fictional SMG), real shotgun report/pump and real handgun manipulation, with source hashes and honest editing notes. Preserve phase-driven reload/cycle and physical first-contact casing timing, including shotgun cycle-time ejection; cancel reload tails on switches. Missing-bank status applies to every gun.


Audio preparation must deduplicate repeated start/restart clicks, show progress and actionable retry failure, preserve menu/save/time state, and invalidate asynchronous completion on mute or page lifecycle changes. No delayed automatic deployment or pointer lock after loading. A ready bank keeps normal warm starts. The suppressor starts unchecked.


## Actual-play feedback corrections
Do not change the global grading, ambient/fog values or viewmodel pose in this slice. Enemy-only accuracy counts valid living enemy impacts (including absorbed armor), excludes scenery/barrels/invalid targets, and remains at most one hit per successful shot. Show a persistent menu hint and a non-overwritten toast when pointer lock rejects or throws; retain the exception name for diagnosis without claiming browser cause. A fresh mission must synchronize HUD before its menu disappears. Dedicated enemy head/leg materials must not alter player hands or world black materials.

## 0.9 stash contract
- Permanent owned-item capacity starts at24 stacks and expands by8 through five tiers to64. A stack occupies one slot; carried bag capacity and weight are unchanged. Existing over-capacity records remain intact and clearly labeled.
- Show occupied/available slots, next cost, current balance, post-purchase balance, next/max capacity and clear max/insufficient-currency states. Review then confirm a purchase; stale quotes, repeated requests, double-clicks, failed writes and retries must never double-spend.
- Persist capacity and bank in one transaction under schema4, backed by the existing retry/stale-state mechanism. Preserve unknown fields, all prior items and exact legacy cash. Back up schema3 before its first upgrade write, retaining older backups. Opening or sorting never writes.
- If retained extraction or protected-death items cannot all fit, preserve them in a durable recovery queue instead of overflowing the stash or deleting items. Resolve the queue by claiming into free slots, expanding capacity, or explicitly reviewed sales. Block another deployment while recovery remains, preventing unlimited queue bypass. Selling issued gear yields zero; no automatic sale occurs.
- Stash and recovery item details support category/name/value/weight sorting, quantity and equipment comparisons. Prepared loadout transfers still withdraw only on deployment. Selling a selected stash item must invalidate its draft reservation so it cannot be both sold and deployed.
- Purchases/sales are virtual in-game transactions. Automated tests use isolated records. Do not test spending, item mutation or raids against the user's live Windows save without the parent's pending approval.


## FPS specification v1 first slice
Follow the phase table in specification §17 when per-feature priority tables differ. Near-contact muzzle compression blocks attack; an obstacle farther along the camera-to-target muzzle path receives the shot instead of permitting wall penetration. Keep first-person PvE and current extraction/stash economics. New metadata must migrate legacy rounds/chamber without refilling and preserve schema4 stash capacity/receipts/recovery. External combat scheduler targets60Hz, while movement collision may retain120Hz substeps; verify rendered30/60/120FPS equivalence. R4 tuning is explicitly original proposed data, not measured ARC values. Unsupported melee/throw preparation/control changes remain traceable pending items rather than active placeholders.


### 0.10.0 implemented foundation contract
R4 uses validated project JSON and accumulated 60 Hz shot deadlines. Separate weapon UID state and a single-use ammunition/shot journal protect round transfer, chambering, damage and audiovisual commits. Swaps lower the old gun before equipping/drawing the next; H holsters safely. Empty reload waits 0.30 s, tactical interruptions retain committed ammunition, sprint and air/slide suppress ADS, and physical muzzle obstruction prevents shooting through close cover. Current controls can be rebound without changing normal-profile keys from the isolated test URL. Preserve 0.9 stash semantics under schema5 with exact schema4 backup.

Menu audio decoding is silent and independent of deployment. After readiness, one fresh Start gesture activates sound and requests pointer lock; raid creation happens only after the current activation succeeds or explicit mute is selected. Focus/Escape/mute/lifecycle changes invalidate old completions. This replaces the prior deliberate cold two-gesture UX under specification §14.2. All unimplemented actions and actual acceptance requirements are listed in [the requirement status](gunplay-spec-v1-status.md).

## Visibility and extraction approach contract
Keep global grade, fog, ambient illumination, weapon transforms and persistence unchanged. Enemy cloth/face must remain opaque, diffuse and non-emissive; use tonal separation rather than outlines or a screen overlay. East evacuation has marked south and northeast wall-end approaches, a narrow painted approach and two bounded work lights. Near extraction, replace misleading through-wall guidance with a reachable entrance waypoint only when the direct path is blocked. Verify player-clearance segments against actual world collision; do not equate those tests with rendered visibility acceptance.

Near-field guidance is called from the per-frame HUD. Cache only fixed waypoint-to-waypoint visibility for the lifetime of one mission build; player edges stay live. Invalidate fixed edges when wall alive state, wall membership or extraction target changes. Mission wall geometry and extraction coordinates are authored and stationary. Compare the cached route to the uncached pure solver and measure Node CPU separately from real browser FPS.


## First-person actions and HUD plan
Use one cancellable item action with lower, present, ready/use, commit and recover phases. A throwable waits in hand until a fresh fire command; healing commits only at its use marker. Cancel before commit on damage, pause/menu, weapon selection or death without consuming or healing. After commit never refund or repeat the effect. Match the original inventory UID and item at commit. Clear input at transitions and block firearm/ADS until recovery. HUD must report the actual stage, never a fabricated completion. Keep hand props below the central aim region.


## 0.11.1 actual-play readability correction
Give utility hands/props their own scene-local lighting so additional fill cannot illuminate world or firearms. Separate glove panels, wrist, grenade body and pin by bounded cool values. Render this scene only while the utility rig is visible and preserve existing depth/flash order. Keep behavior, timing, storage schema and audio unchanged. Both menu and title report 0.11.1.


## 0.11.2 treatment HUD correction
Place the action HUD on the left edge above vitals, outside the central action/contact and aim regions. Use one compact label row and progress track; at small window sizes show the action label with the item name retained in the accessible label. Keep objective information above it. Do not change the item rig, gameplay timing, healing, lighting or storage.


## 0.11.3 keyboard aiming accessibility
Preserve default mouse behavior and default continuous keyboard aiming. Add explicit slow continuous speeds and one-press angular steps, independent of OS repeat. Persist/reset alongside existing remappable controls without touching save profiles. Diagnose pointer-lock ownership/focus and request lifecycle without suppressing original errors or bypassing browser permission. Actual Windows pointer-lock failure is not yet established as an ordinary-player defect. Rendererless checks and browser QA remain separate.

Validation: all 33 app suites completed with final exit 0, 766 reported checks, lint and static packaging pass. One initial runtime failure exposed an overbroad duplicate-Start guard that blocked explicit fresh restart; fixed and rerun before completion (all attempts retained). Root registry/aggregate attempts still fail before execution at pnpm store creation, with sparse root scripts/launcher unavailable. No new actual browser acceptance claimed.


## 0.11.4 prepared throw contract
Address original specification §10.1: fresh physical fire press after presentation enters held aim, no item/fuse consumption while held; after at least 0.10 active seconds only release of that same physical input starts throwing. Earlier release returns safely to held-ready. Keep current release animation commit at 0.23s, no cooking, existing ballistics/balance unchanged. Cancellation and HUD/motion reflect actual state. Trajectory preview, extra throwable variants and dedicated utility Foley remain unimplemented.

Validation: all33 app suites final exit0, 775 reported checks; syntax/static build pass. Full root registry/aggregate commands remain blocked before execution by pnpm store creation. Actual post-patch rendering/listening/FPS and candidate extraction-success persistence remain unverified.


## 0.11.5 throwable trajectory preview
Share the exact live grenade launch and gravity/wall/bounce step with pure prediction. Optional thin depth-tested dashed guide and first-impact marker only during held aim. No extra assets or screen-wide overlay; never consume, damage, emit events or start a fuse from prediction. Preview reflects current release position and current geometry, not future movement/destruction.

Validation: 782 checks in33 suites, each final exit0; lint/static build pass. Shared physics matches at30/60/120Hz and hit-pause fragments after fixed120Hz accumulator correction. Null settings fallback and both GPU buffer identities are regression-tested. Root registry/aggregate are blocked before execution; no actual render/listening/FPS acceptance claimed.


## 0.11.6 fixed independent trajectory QA profile
Adds only testProfile=trajectory-qa to the exact allowlist, using deadfreight-test:trajectory-qa: under the existing candidate prefix when published. Default/local-qa mappings stay byte-identical. No copy/reset/deletion, arbitrary namespaces, gameplay/equipment override or extra profile creation API. Existing interrupted raids are not settled by this change.

Validation: all33 app suites exit0,784 checks, lint/static packaging pass. Root registry/aggregate remain blocked before execution. New profile gameplay is identical; actual trajectory GPU/normal input acceptance remains pending.


## 0.11.7 recorded utility Foley
Official Pixabay UI downloads obtained through supported browser download events, raw MP3s outside repository. Add modest cloth/Velcro/tire-gauge-pin stand-in cues synced to action markers, stop only Foley on cancellation, never replay past markers. Existing gun recordings/gameplay unchanged. Source-based waveform selection is provisional, not listened/mixed quality acceptance.

Validation: 793 checks across all 33 app suites exit0; lint/static build pass. Root registry/aggregate stop before execution on pnpm path ENOENT. Four new local recordings bring preparation bank to83. Per-action markers/cancellation and waveform bounds tested; listening, hardware mix, visual contact timing and FPS remain unverified.

## Ballistics slice 1
Common ShotResolver owns damage/falloff/coverage and per-pellet duplicate claims. Preserve R4 formula exactly. Provisional legacy settings: pistol48, head2.5, falloff25–70m to.65, max120m; shotgun105 total budget, head2.5 initially, falloff12–35m to.25, max60m; SMG21, head2.5, falloff18–55m to.55, max100m. Legacy limb multiplier1 preserves current close hit behavior. All use armorAbsorption1, separate helmet/body coverage. Wall damage40/90/19 and barrel50 retain legacy base budgets but receive the same distance falloff. Stage1 retains single rays only as a migration checkpoint. Later shotgun distributes105 across9, never105 per pellet. No distance-threshold hitscan switching.

## Ballistics slice 2
Shotgun now emits9 deterministic center/stratified samples under one discharge, one shell, one report and existing automatic pump. Provisional total torso budget105 is divided by9; hip cone2.6°, ADS2°. Per-pellet first-wall contacts and per-shot hit statistics remain bounded. This is a tuning hypothesis requiring actual play, not an ARC/Warzone or real-weapon claim.

## Ballistics slice 3 / 0.12.0 candidate
Runtime all four guns launch high-speed projectiles: pistol/pellet350m/s, SMG450m/s, R4 800m/s; gravity9.81m/s². These are provisional design hypotheses. No near-distance instant-hit branch, drag, wind, wall/body penetration, automatic lead or drop compensation. Camera rays only choose aim direction; world-space muzzle gate is preserved. Fixed120Hz analytic flight segments sweep walls and author-defined enemy torso/limb boxes + head sphere with relative target translation; cosmetic hat/gun and hit-pulse scale do not enlarge damage volumes. Rotation is held over each short collision interval; this is a documented approximation, not skinned-mesh collision. Current enemy slow projectiles and grenade gravity are unchanged. Existing world.fire(hit) reference adapter remains for direct model regression fixtures; production input always supplies launch geometry and never uses reference hit data for damage.

At most128 live player projectiles,64 pooled thin depth-tested visual lines,4096 shot records and512 contact logs. Tracers use past/current authoritative positions only. Each contact records shotId/pelletId/origin/velocity/birth/contact time/travel distance/part/armor and damage. Per-pellet presentation claims prevent replayed impact audio/markers. Pause freezes flight; death/extraction clears it; switching equipment preserves already-fired flight. Source/gameplay tests cannot establish perceived latency, audio quality or hardware FPS.

Independent review correction: within each fixed step, contacts resolve in increasing physical impact time, with simultaneous contacts grouped against their existing surface. Destruction/death causes remaining candidates to retrace; fatal barrel damage aborts every pending contact. Pellet array order must not alter wall/enemy/barrel removal outcomes.


## 0.12.1 chronological incoming damage
Preserve the120Hz swept player-flight grid. Within an interval, resolve outgoing contacts through the time of each chronologically sorted incoming contact before applying that incoming damage. If the incoming damage kills the player, discard only later in-flight contacts. Maintain single ammo/hit claims and moving-target interpolation when a timed boundary splits a flight interval. This changes ordering only; weapon balance, storage formats, normal-profile keys and published Site artifacts are unchanged.

## Interrupted-input edge contract
An OS repeated keydown cannot create a newly held action after releaseAll. Existing held actions continue until physical release. An open inventory must ignore repeated Tab or rebound inventory/pause-key events; a fresh press can close it. Escape remains an intentional modal cancel. No inventory resource, action duration, movement cost or weapon balance changes.

## Automatic reload action ownership
Mission advances rifle simulation and existing resource checkpoints as before, but passes its current weaponActionBlocked gate to automatic reload initiation. Standalone rifle callers retain existing automatic-reload behavior. Once hands are ready, normal empty-reload behavior returns without firing from a stale input. No timing, ammunition, heal refund or balance policy changes.
### Action transition audit matrix (model/source evidence)

| Owner | Main transition / resource checkpoint | Interruption policy | Input and recovery contract | Evidence |
| --- | --- | --- | --- | --- |
| R-4 reload | start → magazine transfer → chamber transfer when needed → complete; ledger identities claim each transfer once | Before transfer: no bag ammo spent. After transfer: keep committed rounds and completion/recovery gate. Tactical trigger cancel stays supported | Fresh/buffered/held triggers stay distinct; pause freezes timeline, weapon switch captures instance state | test-rifle-state, test-inventory-game, test-gunplay-foundation |
| Legacy fire / automatic pump | shot spends 1 round → cycle delay → pump → recovery; reload cancellation restores required uncocked cycle | Menu freezes timer; switching preserves UID-owned cycle/recovery state; dropping last gun cannot emit phantom pump | Repeated input cannot manufacture a cocked gun or skip the firing gate | test-core, test-inventory-game, test-inventory-runtime |
| Weapon selection | lower current → commit chosen slot/holster → draw selected → ready | Repeated selection can change pending choice; using/cancelling utility preserves that choice | Held fire during a normal swap remains an intentional existing behavior; H clears fire before return; no stale post-menu fire | test-loadout-action, test-gunplay-foundation |
| Grenade | lower → present → ready → held aim ≥0.1 s → owner release → throw commit → recovery | Damage/menu/weapon selection before commit consumes 0 and spawns 0; postcommit projectile/consumption remain once | Unrelated release cannot throw; aim does not cook fuse; recovery owns hands | test-item-action |
| Medicine | lower → present → use → benefit+one item consumption → recovery | Damage/death/menu before commit gives no heal/consumption; committed medicine is not refunded or repeated | Recovery remains gated; cancellation starts from current pose; no policy change | test-item-action, test-inventory-runtime |
| Automatic empty R-4 reload | eligible timer → start only when weapon action gate is clear | Utility readiness/aim/use/recovery and loadout lower/draw defer initiation | Weapon simulation/cooldown continues; existing reload checkpoints continue; normal auto reload returns once ready | New test-rifle-state and test-gunplay-foundation regressions |
| Pause / death / restart | pause cancels utility into recovery and clears inputs; death disables combat, settlement/restart uses existing policy | Resume retains committed resources and current pending loadout; death cannot heal or release pending throw | UI/focus reset needs new presses; no repeated key reactivation | test-lifecycle, test-item-action, test-input-router |

This table audits source and rendererless fixtures. It does not establish ordinary browser input, animation continuity, sound quality or perceived responsiveness.

### Independent boundary audit entry points
Run node projects/dead-freight/tools/audits/reload-boundary.cjs, item-boundary.cjs and cover-boundary.cjs. Each accepts an optional app directory, defaults to the adjacent project app, uses deterministic model fixtures and emits a JSON case count. These manual adversarial audit cases are separate from the 830 named app checks and do not imply rendered, real-input or audio acceptance.


## 0.12.2 quick melee contract
Default V, rebindable. Preserve old bindings with a read-only migration allocating an unused key if V was already assigned. Lower .14s, present .12s, strike .36s with one contact at .18s, recover .36s; contact at .44 active seconds. One frontal fan (three rays, +/-9 degrees), 1.8m reach and the existing authored enemy volumes; first cover/barrel blocks each ray. At most one enemy per strike, 35 provisional damage with half budget absorbed by body armor, no head multiplier. No ammunition/item/stamina consumption, automatic targeting, barrel/wall damage or firearm hit-stat inflation. Damage/menu/focus/weapon selection before contact cancels; after contact never refunds/repeats. Melee owns the item timeline and blocks fire/ADS/reload until recovery. Normal relative input/render/audio remain unaccepted.


### Rejected effect recovery
When an item UID or effect eligibility fails at its delayed marker, capture the actual post-tick pose before entering cancelled recovery. Preserve its transforms and progress at recovery start; no rejected effect is consumed, applied or retried. This correction is shared by treatment/throw/melee actions; actual visual continuity remains an open acceptance gate.


## 0.12.3 pin anchor contract
At use progress .5 the pin is fully extracted. Freeze its origin to the authored extraction pose in utility-rig coordinates; keep the index fingertip contact constraint and allow normal group motion/recovery. Preserve that ownership in cancellation snapshots. Pre-detachment contact follows the live ring as before. No new mesh/frame allocation history, action timing, asset or gameplay change.


## 0.12.4 bridge lifecycle guard contract
Paused/dead/extracted worlds reject item initiation, physical trigger/release and immediate effects. An active timeline may only apply its effect inside its own delayed commit dispatch; legacy immediate-use fixtures remain supported only while idle. Successful inventory/weapon mutation cancels an active action, except the explicit internal item-commit mutation. Failed inventory drafts leave the action unchanged. Precommit cancellation never consumes/heals/throws; postcommit effects remain final. No menu timer catch-up or delayed surprise effect on resume.

Explicit paused-bag preparation is an intentional exception to initiation rejection: it records a validated no-effect intent, preserving the existing bag use/resume gesture. It cannot commit, trigger or release while paused.


## 0.12.5 pistol controller contract
JSON mechanics authority: six-round capacity, .2s firing recovery, .12s automatic cycle followed by .19s recovery, 1.6s reload, existing .44–.62 perfect window/.04s accelerated finish and .35s mistime penalty, .25s swap recovery. No new chamber round, automatic empty reload, damage tuning or input layout. The controller owns rounds/reserve/cocked/cycle/reload/recovery/shot identity; Mission legacy properties are compatibility accessors. Preserve the existing per-UID pistol weaponState shape and pending-cycle/recovery on swaps/holster. Shot identity uses UID/session/sequence and cannot be reclaimed. Reload cancellation before transfer conserves reserve and resumes any required cycle. Pause/deactivation freeze timers; death/extraction cancel pending reload. Firearm presentation/ballistic paths consume the controller's single commit.


## 0.12.6 shotgun contract
Two shells; .4s firing recovery, .26s automatic pump followed by .28s recovery,1.9s reload with existing perfect/mistime rules and .25s swap recovery. One shell per nine-pellet discharge. Holding physical trigger fires once; release/repress fires again after readiness. Reload transfer remains atomic at its existing final marker; cancellation during insertion before that marker spends no reserve, after completion never refunds. Pending pump/recovery belongs to the UID and freezes on unequip/holster; interrupted loading resumes any required pump. Damage retains existing reload behavior; death/extraction cancel unfinished transfer. Explicit pause/menu/action gates remain authoritative. SMG is still the next migration.


## 0.12.7 SMG contract
24-round capacity,.1s discharge recovery,2s atomic reload and existing perfect/mistime/swap recovery. SMG has no pump/cycle state: cocked=true,cycleNeeded=false,cycleRemaining=0 in old saves. Held mouse auto fires with one ammo/identity per discharge; keyboard fire remains the existing physical-press route. Empty hold never decrements below zero or invents automatic reload. Retained physical mouse hold may resume after a normal reload as before, while pause/focus/item completion release stale trigger intent. Current damage/reload behavior and death/extraction cancellation are preserved. Remove duplicate legacy timer/fire/reload branches once all three non-R4 guns are owned.


## 0.12.8 exclusive-hand pump gate
While weaponActionBlocked is true, a shotgun pending pump retains its remaining delay and cannot emit cycle or manufacture cocked readiness. Clock/recovery and standalone active-reload behavior continue; no ammunition is consumed by the gate. When the weapon again owns ready hands, finish the remaining original pump delay then mandatory recovery exactly once. Holster/unequip still freeze the inactive controller. Pistol slide and R-4 passive cycling are unaffected. Public direct cycle commands obey the same blocked-shotgun gate.


## 0.12.9 authored hand frame
Neutral glove dorsal panel is +Z, fingers extend +Y and palms face -Z. Left thumb/index are the +X inward edge; right thumb/index are the -X inward edge. Name fingers explicitly, retain array compatibility and expose index fingertip contact anchors based on actual cap endpoints. Author bounded relative lengths (middle longest, little shortest) and link thumb flex/spread to the same grip/release value as the fingers. Pin solver uses the semantic left-index cap contact and preserves its ring/extraction anchor. Cancelled recovery begins at the same grip/contact transform. These are prototype authored geometry, not measured human anatomy or proof of natural pinch/throw.
## 0.12.10 connected utility arm ownership
Adapt the arm geometry and solver from Library dead-freight-action-motion.patch (libfile_8a0a99678d18819188501dad805675e2, archived report base822aa10f). Keep original Library content unchanged. Arm meshes are utility-owned; solve upper arm shoulder-to-elbow and forearm elbow-to-actual-wrist after pin/treatment contact constraints on every pose. No independent disconnected sleeve follows the hand. Existing current-source hand poses, contact anchors, timing, effects and resource ownership remain authoritative. This source unit does not accept anatomy, natural motion, rendering or listening quality.
## 0.12.11 dressing presentation contract
Medical dressing begins at use progress0.30 and grows over0.25 normalized use progress. Recovery inherits dressingLevel from its actual interrupted pose without advancing it. Apply a bounded local width scale and visibility from that value; do not alter shared material opacity. Idle/nonmedical actions own no dressing. This is cosmetic and independent of the existing effect commit.
## 0.12.12 action effect receipt
Bridge accepts a commit only for the current action's matching safe positive sequence, UID, item and location, after the timeline marks it committed and while uncancelled. Record that sequence before dispatching the effect, including a rejected normal attempt. Duplicate/stale/malformed/precommit markers cannot mutate health, resources, enemies, scanner or throwables. Receipts are session-local, bounded to one monotonic number, not persisted.
## 0.12.13 authored motion reconciliation
Use smooth bounded joint tracks from the unpublished Library patch, adjusted to current melee contact0.18/use0.36 and detached support-pin owner. Grenade grip reaches open at original0.23/use0.38 marker; throwing wrist/elbow wind up then extend and follow through. Medical wrist exposes the treatment site, applicator strokes remain constrained to that wrist, kit lid opens/closes and gauze roll turns. Solve connected sleeves after hand constraints. Recovery captures every authored numeric property at interruption and closes tools continuously while withdrawing. No new timing, benefit, launch speed, gameplay tuning or audio assets.
## 0.12.14 hand-to-world launch projection
Sample the held grenade at the unchanged release marker and restore the live utility pose in finally. Convert its utility-camera projected point to the current world-camera FOV/aspect and player yaw/pitch/eye position. Preview receives that object; committed launch evaluates a callback once at its marker, protected by the receipt. Grenade model accepts finite origins within2.5m of its fallback and clear swept wall path (radius0.12); otherwise use original origin. Invalid/throwing render-origin callbacks cannot change effects or prevent original fallback. No physics/tuning changes.
## 0.12.15 moving hands and inspection surface
Sprint/dash/slide cancel active utility/melee into its actual pose recovery before the next effect marker; committed consequences remain once. Check game intent before simulation and Bridge state before action tick, so the original-frame route and direct adapter agree. Normal walking remains allowed. tools/rig-preview.cjs builds only local Three/license/item-action/item-view and a standalone preview under ignored tools/rig-preview/dist, including full cycles, marker samples and cancelled withdrawal; no storage/network/world/audio/pointer-lock operations or account changes.
## 0.13.0 multi-region contract
Default remains Black Pines. Canal Ward is280m wide/220m deep, with uncrossable flooded central channel except bridge openings atZ60 andZ-20, offset building cover, west insertion, west archive loot, east pump boss and two exits: east ferry8s requires carried archive plus bounty; west winch12s requires bounty. No swimming claim. Region choice is frozen in pending deployment and cannot change a running/paused mission; menu next-raid choice is ephemeral, requiring no save schema or UID change. Core and inventory adapter share live extraction eligibility, including required-item removal mid-hold. Current kill cash is settled once; carried loot is retained and sold once through existing home receipts, never counted again in extraction cash. Existing death/safe-pocket/overflow/stale-write semantics remain.
## 0.13.1 pending region and financial ownership
The pending deployment's region/inventory/raid ID own retries, not the current selector or a menu preview. A failed settlement keeps the extracted mission and active raid pending; retry may settle once and then permit the next selected region. Repeated retry must preserve byte-equivalent settled record and cannot mint currency/duplicate retained UIDs. No save schema, field migration, gameplay or reward change.
If a deployment write succeeds but acknowledgement and verification reads fail, restoring reads/retrying must recognize that same write and avoid another withdrawal/revision while keeping the original selected region.
## 0.14.0 workshop contracts
Schema6 reads1–5, backs up exact schema5 bytes to deadfreight-backup-v5 before mutation, retains all existing cash/UID/weapon/armor/receipt/overflow fields. Craft medkit/frag/scanner/armor from1/1/2/4 owned non-issued scrap plus existing output value minus scrap value (45/40/40/120 cash); no catalog tuning. Output is one new durable UID, stash slot projected after consumed materials. Armor repair consumes1 scrap plus ceil(max(0,260×missing/45−35)), preserves UID/issued flag and restores45; only armor currently has durability. Workshop is home-only, blocked by active raid/pending transaction/recovery overflow, recalculates costs/ownership and rejects stale repair quotes/full targets. Immutable request receipts survive reload/retry, record partial/retired material UIDs and prevent reuse/conflicting requests. Prepared loadout refreshes consumed quantities/repaired durability from authoritative stash after successful write/retry; new outputs must be explicitly taken, retaining12 bag slots/30kg. No weapon wear/mods/EMP crafting claim.
## 0.14.1 conflict and identity repair

0.14.2 audit supplement: reconstruct controllers from persistent bytes after terminated sessions and inspect cash, retained UIDs, raid journal and tombstones. Shared memory stores model observed stale tabs, not atomic cross-process transactions. Durable settlement followed by lost acknowledgement must survive a new controller without duplicate payout; uncommitted extraction is intentionally lost except its previously durable safe journal. If another controller already recorded loss recovery, local extraction must expose that durable outcome and cannot claim its unawarded cash/loot was saved.
Known workshop output/repair UIDs missing from stash cannot use the fresh issued-kit exception. New repair receipts optionally record original issued status; new deployments store optional unique loadoutIdentity tuples(uid,itemId,issued) for returned-item and safe-journal checks. Existing schema6 receipts/active raids without these fields remain readable and are not rewritten on read; legacy absent provenance is not invented. Explicit discardStaleWorkshop only abandons stale craft/repair intent after a successful current read, recognizes matching applied receipts first, never writes/debits/rebases, and preserves a foreign active raid's interruption state. It cannot discard settlement, safe journal or deployment intent. UI exposes this read-only conflict recovery and clears stale prepared workshop drafts only after success.
