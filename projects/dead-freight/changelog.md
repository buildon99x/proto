## 0.12.0 — provisional ballistic candidate
- Shared damage, finite range, falloff, helmet/body armor and per-pellet claims; R4 formula preserved.
- Shotgun105 torso budget divided across9 pellets, one shell/report/pump.
- All-distance high-speed gravity projectiles with120Hz swept walls and moving enemy hit volumes. No wall/body penetration or distance-threshold hitscan.
- Contact-time priority and simultaneous-contact groups avoid array-order destruction artifacts; fatal explosions stop pending contacts.
- Immediate firing presentation and delayed confirmed impact, pooled depth-tested flight segments, bounded contact evidence.
- Original first-person actions, utility Foley and three candidate save namespaces preserved. Actual render, play balance, audio and FPS acceptance pending.

## 0.10.1 — source checkpoint, visual acceptance pending
- Raise only enemy coat, face and trouser diffuse colors to separate moving body parts from dark forest trunks. Preserve restored world/gun illumination, fog, grading, framing and all save formats.
- Add a narrow, tree-cleared approach around the east evacuation south wall end, spaced world-space paint, two EVAC entrance fixtures and two bounded local lights. Keep existing walls and extraction hold rules.
- When a nearby east evacuation path is obstructed, show collision-checked entrance and walking-route distances instead of only the misleading direct distance.
- Add six geometry/scene checks and two rendererless feedback regressions. Actual GPU contrast, fixture readability/glare, ordinary-input approach and FPS require separate Windows Edge verification.

# Changelog

## 0.10.0 — first FPS specification v1 foundation slice
- Validate R4 tuning from project JSON; use 60 Hz combat scheduling, accumulated shot deadlines and single-use shot/ammunition commits
- Preserve each weapon UID, loaded rounds, chamber, recovery and fire mode across swaps, holster, inventory and schema5 saves; support two of the same class
- Add timed lowering/drawing and H holster, delayed empty reload, tactical-reload cancellation, sprint/air ADS gates and camera-to-muzzle obstruction
- Route current controls through remappable actions with repeated-key and wheel throttling; retain unimplemented melee/crouch/throw-preparation keys as pending
- Prepare the recorded bank silently in the menu, then use one normal Start gesture; cancel stale audio/lock completions without deploying or saving
- Keep 0.9 capacity/overflow economics and earlier brightness/audio. This is a source checkpoint, not P0/P1 or actual-play acceptance

## 0.9.0 — owned stash capacity and currency expansion
- Add a dedicated owned-item grid with capacity, bank, sorting, details, equipment comparison and explicit sale confirmation
- Expand24→64 slots in five8-slot purchases using original virtual-currency costs; show cost, resulting balance and maximum
- Persist capacity, currency and item changes in one schema4 record with durable operation receipts; back up legacy records before first mutation
- Preserve existing over-cap items and queue extraction/protected-death overflow durably; require claim or explicit sale before deployment
- Keep raid bag12/30kg independent and clear sold-item preparation; preserve isolated QA profile and current audio/visibility

## 0.8.4 — bounded actual-play feedback corrections
- Give enemy faces, hats and legs dedicated brighter materials without changing global grading, lights or player hands
- Count valid enemy impacts for accuracy, excluding scenery/barrels/invalid targets; label it explicitly
- Synchronize new-deployment HUD before exposing play, including immediate retry/Esc
- Preserve both synchronous and asynchronous pointer-lock failure diagnostics and playable keyboard-aim fallback

## 0.8.3 — recorded audio for all existing firearms
- Replace pistol, shotgun and SMG synthetic gun routes with recorded reports and mechanics; replace processed rifle body source with real M16 bursts
- Remove tonal gun-result markers; preserve recording body with suppressors and make them opt-in
- Extend casing contact and material/player hit recording routes to every firearm, with armor-break identity preserved
- Keep the menu and inventory untouched while the first gesture prepares the complete bank; require a fresh deployment click, with visible progress, retry and mute alternatives
- Preserve 0.8.2 isolated QA saves and restored brightness; actual ordinary-input/listening acceptance remains open

## 0.8.2 — isolated ordinary-input QA save
- Add the fixed local-qa query profile with a visible test badge and strictly prefixed owned save/backup/settings keys
- Start test progress empty without reading or copying normal records; reject malformed profile selection before initialization
- Exercise deployment, extraction, death, restart, recovery and retry against sentinel storage; preserve default URL behavior and current audio as the comparison baseline

## 0.8.1 — restore readable brightness
- Restore the exact pre-0.7 world background, fog, ambient/fill and weapon-light values following actual visibility feedback
- Treat permanent night as lore rather than a screen-brightness constraint; preserve the smooth noise-free grade, local lamps and all current equipment/gameplay/save behavior

## 0.8.0 — equipment, carry limits and persistent raid settlement
- Add two firearm slots, armor, four stable quick-use slots, twelve bag slots and a restricted safe pocket under an original 30kg carry cap
- Make pickups, typed equip/swap, stack drops and capacity failures atomic; conserve loaded/reserve ammo and damaged armor
- Add carried healing supplies, an eight-second proximity scanner and visible fused grenades with collision, cover and self-damage
- Add inventory comparison, ground previews, a hotbar and explicit paused-bag behavior; preserve native menu keyboard use
- Stage stash equipment without withdrawing it until deployment; reserve gear, retain extracted loot, lose failed carry except protected contents and prevent duplicate settlement
- Preserve legacy cash/contract records, back up first migration, expose write failures and require explicit interrupted-raid recovery
- Repair raised-drop rendering, interrupted legacy cycle recovery and paused item-cooldown handling; keep actual-play/listening acceptance open

## 0.7.2 — raid lifecycle correctness
- Preserve native menu keyboard controls and clearly separate paused continuation from the next deployment settings
- Explain the current HARDCORE default, unlimited raid time, carried-value loss, same-region replay and tracking-only bank
- Surface failed save/read operations, retain pending awards for retry without double credit or deleting existing data, and restore the next contract index compatibly
- Contextualize death/result/pause copy; retain unusable full-health/full-armor pickups; assign boss armor independently of starting weapon
- Use bounded 120 Hz simulation catch-up with a separate active wall-time raid clock and clean pause/resume boundaries
- Keep the single-rifle actual-play/listening gate open

## 0.7.1 — honest graphics-startup failure state
- Show an explicit non-playable state if the browser cannot create WebGL, with a real page-reload retry and accessible audio credits
- Hide stale gameplay HUD and unavailable loadout/start controls; do not start mission, audio, input or animation systems after renderer failure
- Record the actual public-browser failure separately from rendererless tests; the R-4 human-play/listening gate remains blocked
- Preserve the publicly shared audience requested by the creator; do not change game mechanics or advance the roadmap

## 0.2.0 — 2026-10-07
- Replace urban palette with four-tone dithered forest, fog and ivory/black weapon composition
- Add telegraphed projectile attacks, stamina dash, active reload and style chains
- Expand model checks to 22; live visual/play acceptance remains pending sign-in

## 0.1.0 — 2026-10-07
- Add original browser FPS development build and three-weapon combat loop
- Add destructible entrance, alternate route, bounty objective and extraction
- Add Korean instructions, source documentation and 14 model tests
- Publish an owner-private GPT Site; live gameplay QA remains unverified

## 0.3.0 — 2026-10-07
- Add articulated gloved viewmodel and mechanical pistol details
- Add spring recoil, slide/casing/reload motion and impact/destruction feedback
- Add iron-sight aiming, switchable suppressor and optional laser module
- Preserve the visual/play sign-in gate; automated geometry tests are not a rendered comparison

## 0.4.0 — 2026-10-08
- Enlarge the muted wine-red suppressor shroud and preserve it through the palette pass
- Replace rectangular slide profile with machined chamfered shoulders and stepped suppressor geometry
- Correct hip-fire camera distance/placement against the supplied reference proportions
- Add explicitly labeled offline mesh diagnostics, without claiming browser screenshot or gameplay verification

## 0.5.0 — wrist, first-person motion and layered audio
- Corrected hip POV/muzzle composition against the supplied reference; exposed neutral wrist sections between glove and sleeve; reshaped palms and support forearm; authored glove panels, contact creases and skin shading
- Enabled viewmodel self-shadowing with a tight shadow camera; corrected ADS distance and rear sight notch
- Added deterministic critically damped weapon/camera recoil, ADS/sprint/dash/switch motion and phased reload-magazine/support-hand/slide synchronization
- Original three-weapon layered shot/mechanical/casing/reflection audio and material/head/body impacts with bounded voices, limiter and cleanup; aligned pistol/SMG shot-time ejection and shotgun cycle-time ejection
- Confirmed hit/kill marker and finite impact decals; interruption/reset cleanup, zero-dt frame and queued-shot identity regression fixes
- 23 combat, 12 rig, 7 motion, 34 audio and 21 rendererless integration checks; no browser/audio-quality acceptance claim

## 0.6.0 — extraction region and readable movement
- Keep the canonical `projects/dead-freight` directory and registry slug
- Replace the corridor with a 340×340m connected forest region: five landmarks, ten branching routes, 720 physical trees, 17 localized enemies, supply/cargo caches and two timed extraction sites
- Add gravity, jump/landing, low-cover clearance, stamina-based directional slide with friction/cooldown, slide-only gaps and exact-height projectile/cover collisions
- Cycle/pump pistol/shotgun automatically with preserved recovery, synchronized mechanics/audio and safe cancellation
- Remove full-screen dithering/grain; add a persistent outlined aim point, independent hit marker, smooth cool/red grade, readable objective/region/distance/map/extraction HUD and 960×540 internal rendering
- Add jump/landing/slide viewmodel response and smooth camera-height transitions
- Bank extracted value in local browser storage; failed runs lose carried value
- Add deterministic tests, source-backed navigation diagram and honest separate browser/input/audio acceptance status


## 0.7.0 — one-rifle foundation checkpoint (live acceptance pending)
- Add one original R-4 with separate magazine/chamber, auto/burst, bounded input buffering and sprint/ADS/switch gates
- Add staged tactical, empty and chamber-only reloads, cancellation-safe ammunition/recovery and range/armor-aware hits
- Add a distinct rifle rig, authoritative ADS, accumulated recoil and neutral-safe hand/magazine/bolt poses
- Reduce all weapon hip framing so the center aim area remains clear; verify geometry coverage without claiming browser visual quality
- Add actual-displacement walking/sprint stamina drain, jump cost, stopped regeneration and fatigue-safe slow movement
- Apply the creator's permanent surface-night direction with physical work lamps and readable local lighting
- Use licensed Pixabay recordings for layered rifle shot/mechanism/reload/casing/impact cues, source provenance and loading/error UI; keep raw source recordings outside the repository
- Tie casing audio to physical contact and distinguish indoor/outdoor mixes, armor impact and interrupted reload cues
- Preserve 0.6 as the prior development checkpoint; no later roadmap phase is claimed passed

0.10.1 pre-deployment CPU follow-up: cache fixed evacuation graph edges per mission and invalidate on wall/target changes. A pure-model equivalence regression and reproducible CPU benchmark accompany the change; browser FPS remains unverified.


## 0.11.0 — First-person action source candidate
- Delayed item transaction timeline: lower/present/ready/use/commit/recover; held grenade requires a fresh fire command. Health, scanner duration and grenade inventory effects are committed exactly once after UID validation. Damage/menu/death/weapon return cancel uncommitted work.
- Independent original articulated utility-hand rig with wrists, rounded finger segments, medical/scan props and grenade; continuous cancelled recovery and quintic loadout lowering with safe trigger index/support-hand offset.
- Action-state HUD, selected quick slot, source-based damage direction, critical health/empty ammo emphasis, low-resolution CSS and optional detailed weapon/audio diagnostics.
- Existing instantly consumed browser-use expectations updated to the new staged contract; inventory transaction model remains compatible. No audio files, save schema, global lighting or baseline weapon framing changed.
- This is a local source candidate. Actual GPU/mouse/audio/FPS acceptance and sparse root aggregate are not claimed complete.


## 0.11.1 — Utility readability correction from Windows QA
- Inspected the actual held-grenade screenshot: glove and prop blend into the dark foreground. The supplied treatment-use image shows the returned rifle and is not a medical contact frame.
- Render utility hands/props in a separate, active-only scene with bounded ambient/key/frontal fill. Existing world and firearm lights, fog and grade remain unchanged. Separate cool diffuse glove/panel/wrist/body/pin values, without emissive glow.
- Keep all inventory/action timing, saves and audio unchanged. Correct stale menu/version title to 0.11.1.
- Added light-scene ownership/active-only rendering, diffuse material separation and version consistency regressions. Actual post-fix GPU readability and performance remain pending.


## 0.11.2 — Uncover the treatment contact
- Inspected actual 0.11.1 treatment-B and held-grenade images; the central action box covered the medical hand/wrist contact.
- Move action status to a compact left rail above vitals; retain progress and shorten ready controls. Small windows use a state-only label with the item preserved in the accessible label. Suppress redundant successful preparation text.
- Preserve utility rig, improved lighting, gameplay, audio and both existing candidate namespaces. Version labels updated consistently.
- Add analytic HUD/contact/aim/goal/vitals separation at six viewport sizes, CSS contract and accessible-state regressions. Actual post-fix browser layout remains a separate check.


## 0.11.3 — Keyboard aiming and pointer-lock lifecycle
- Added saved, remap-compatible 15%/40%/100% continuous keyboard aim and one-physical-press 0.25°/1°/5° angular steps; mouse sensitivity unchanged.
- Cancelled activation now releases owned pointer lock; duplicate starts and stale failures are guarded; legacy error events stay visible; unrelated lock events do not pause keyboard fallback.
- WrongDocumentError in Windows automation remains an unresolved focus-context limitation, not an established ordinary-user defect.


## 0.11.4 — Prepared grenade release
Fresh fire press now holds a presented grenade for aim; same physical input release after0.10 active seconds begins throwing. Short taps return safely to ready. HUD/motion represent held aim without fuse cooking. Existing projectile/commit/balance unchanged. Dedicated utility Foley and trajectory preview remain open.


## 0.11.5 — Shared-physics throw preview
Added optional thin, depth-tested dashed throw guide while holding grenade aim, plus first-impact marker. Prediction shares actual spawn/gravity/wall/floor reflection functions and does not consume or emit events. Fixed241-point GPU buffer and15Hz model refresh; current geometry/position estimate only. Actual rendering/feel/FPS/listening remain unverified.


## 0.11.6 — Independent trajectory QA storage
Added one fixed trajectory-qa profile for normal-rule testing without clearing or settling either existing candidate profile. Badge names the selected profile.


## 0.12.1 — chronological incoming damage (source checkpoint,2026-10-11)
- Fix an earlier player contact being suppressed by a later fatal incoming shot within the same update.
- Sort incoming contacts and split the existing flight interval at their times. Preserve cancellation of later player flight after death.
- Add frame-schedule, incoming-array-order and moving-target regressions.
- Refresh the checkpoint title and metadata to describe current ballistics.
- Public deployment and actual WebGL gameplay/listening remain separate acceptance gates.


## 0.12.2 — cancellable quick melee
- Added V/remappable exclusive-hand melee with .44s delayed single contact, bounded 1.8m frontal fan, existing authored collision volumes, cover/barrel occlusion and armor-aware provisional 35 damage.
- Added fist/guard poses, action HUD and existing cloth/body-contact cue routing; preserved ammo, saves, firearm stats and holstered state.
- Migrated legacy control mappings in memory without overwriting V assignments or writing on read.
- Reproduced and fixed rejected treatment/item commit recovery losing its current contact pose.
- Actual UI/render/input/audio/FPS acceptance remains blocked by the supported MXC tool connection; no quality or whole-task completion claim.


## 0.12.3 — detached pin ownership
- Reproduced extracted-pin drift at use progress .52 before correction.
- Anchored the detached pin to its extraction pose in utility-rig coordinates, preserving index contact and cancellation snapshots.
- Added two rendererless regressions. Actual motion/input/audio acceptance remains open.


## 0.12.4 bridge interruption ownership
Reproduced old-source defects: paused direct bandage use healed 30→60 and consumed one item; immediate use during the active timeline followed by its marker healed 30→90 with two consumption/effect events. Guards reject paused effects and unauthorized active-timeline immediate effects. Successful direct inventory/weapon mutation cancels pending actions; failed drafts do not. The explicit paused-bag preparation API records intent only and preserves the existing one-click prepare/resume flow; only the resumed delayed marker can apply the effect. All 864 named checks in 38 suites pass, including one 360-case five-action interruption matrix and rendererless camera-angle/prop reset checks. 315 separate boundary audits, syntax, static packaging, required aggregate and final scoped-registry launcher build pass. This is not an observed UI exploit or human acceptance. Latest official getState after reset still fails at kernel initialization before browser inventory/selection: MXC HRESULT 0x80070003. Installed Chrome150.0.7871.127/Edge155.0.4283.45 are file-version evidence, not successful control. No unofficial automation or new AI work. Receipt, pre-fix reproduction and UI diagnostic are under qa-evidence.


## 0.12.5 P-6 mechanical state migration
Pistol rounds/reserve/cocked/automatic-cycle/recovery/reload and shot identity are now owned by PistolState with validated content/pistol.json and generated browser data. Mission fields/arrays remain compatibility accessors, not a second pistol owner. Existing P-6 inventory weaponState schema is unchanged; two same-class UIDs, partial cycle/recovery, swap/holster/drop and replay identity are covered. Existing six-round capacity, .12s cycle plus .19s recovery, .2s fire recovery, 1.6s skill reload/perfect/mistime behavior, controls, ballistics and recordings are retained. Direct switching no longer manufactures a cocked pistol before its required cycle. Death/extraction cancel uncommitted pistol reloads. The detailed HUD now reads the controller state rather than labeling P-6 legacy. All 881 named checks in39 suites pass, including17 pistol checks and the360-case action matrix;31 syntax commands, static packaging and315 separate audits pass. Final HUD label was additionally checked by the17-check focused pistol suite. Required aggregate11-project/27-page and final scoped-registry launcher build pass with unchanged lockfile. These complete the existing P-6 mechanical-owner migration unit, not the entire v1 weapon/ADS/input tuning plan or live weapon-quality acceptance. Shotgun and SMG state migration, two city maps, broader AI/economy and actual normal input/render/listening/device-performance/extraction-repeat gates remain open. New liquid-metal AI remains deferred. No deployment, account/save reset or unofficial UI automation. Shell tools continued to work through the reported host-connection notification; official UI diagnostics remain in qa-evidence/jh-laptop-ui-diagnostic.json.


## 0.12.6 shotgun mechanical migration
Breach now shares MechanicalState with P-6 and validated content/shotgun.json, with one shell for nine pellets, automatic .26s pump/.28s recovery, two-shell capacity,1.9s atomic reload transfer and semi trigger behavior preserved. Mid-insertion cancellation before the final marker spends no reserve; after transfer never refunds. Last-shell pumping, held/repressed trigger, pending pump on UID swaps/holster/drop, damage/menu/death and healing/frag/melee ownership are covered. Initial migration accidentally retained the .25s switch penalty on first deployment; the existing immediate-fire bridge test failed, the bootstrap was corrected and a dedicated regression added before release. 898 named checks in40 suites pass, including the360-case action matrix and17 focused shotgun checks;33 syntax commands, static packaging and315 separate audits pass. Required aggregate11-project/27-page and final scoped-registry launcher build pass with unchanged lockfile. SMG is the next mechanical migration. No actual WebGL/normal input/listening/frame-time acceptance, new deployment or liquid-metal implementation. Two authored city maps and broader AI/economy/repeated live raids remain unfinished.


## 0.12.7 smg mechanical migration
SMG now has validated content/smg.json and per-UID MechanicalState ownership, retaining24-round capacity,.1s recovery,2s skill reload, no cycling and original held-mouse auto fire. Each discharge owns one round/identity; empty hold does not invent ammunition or auto reload. Pause/focus/item transitions clear stale firing intent via existing routing. All three existing non-R4 guns now use mechanical controllers; the old duplicate legacy timer/fire/reload branches are removed. 911 named checks in41 suites pass, including the360-case action matrix and13 focused smg checks;34 syntax commands, static packaging and315 separate audits pass. Required aggregate11-project/27-page and final scoped-registry launcher build pass with unchanged lockfile. Mechanical-owner migrations are complete for the four existing guns (R-4 owns its existing rifle controller); broader v1 ADS/input/tuning and live quality acceptance remain separate. No actual WebGL/normal input/listening/frame-time acceptance, new deployment or liquid-metal implementation. Two authored city maps and broader AI/economy/repeated live raids remain unfinished.


## 0.12.8 pump-ownership source correction
Before fix, the original game/rendererless route emitted a shotgun cycle cue and set cocked=true while a grenade was active/present and weaponActionBlocked=true. The shotgun manual pump now freezes its remaining delay while other actions/lower/draw own the hands, then completes once after readiness returns. Shells/reserve, ordinary pump/recovery numbers, passive pistol slide/R-4 cycling and standalone active-reload timing are unchanged. 916 named checks in42 suites pass (360-case action matrix included), plus34 syntax checks, static packaging and315 separate audits. Required11-project/27-page aggregate and final scoped-registry launcher build pass with unchanged lockfile. Actual motion/input/device listening/frame-time/extraction acceptance remains open; no deployment or new liquid-metal implementation. Remaining city maps, broader AI/economy, additional weapon/throwable systems and v1 tuning are not declared complete.


## 0.12.9 utility-grip source correction
Utility glove dorsal panels face +Z in the authored neutral frame. The old thumb placement was outward/reversed (left X<0, right X>0) and the right thumb did not change between closed grenade hold and release. Thumb handedness now matches the inward sides; explicit semantic finger/index references track the thumb-adjacent index, and thumb closure/opening follows the authored grip. Pin/wrist contact anchors, timing, source commits, lighting, gun/world meshes and audio assets remain unchanged. These are authored geometric corrections, not acceptance of human-looking pinch/grasp/throw. 920 named checks in43 suites pass (360-case action matrix included), plus34 syntax checks, static packaging and315 separate audits. Required11-project/27-page aggregate and final scoped-registry launcher build pass with unchanged lockfile. Actual motion/input/device listening/frame-time/extraction acceptance remains open; no deployment or new liquid-metal implementation. Remaining city maps, broader AI/economy, additional weapon/throwable systems and v1 tuning are not declared complete.


## 0.12.10 unpublished motion archive: connected arms
The user's Library patch/report/manifest were found and read; original artifacts remain unchanged. Selectively adapted utility shoulder/elbow/forearm/wrist geometry and post-contact sleeve solver without replacing current pin/grip/gameplay fixes. See [archive reconciliation](archived-motion-reconciliation.md) for provenance and remaining tracks/tools/origin work. 923 named checks in44 suites,34 syntax commands,315 separate audits and required11-project/27-page aggregate/final launcher pass. No actual rendering, human motion, listening, input, frame-time or extraction acceptance. No deployment or local liquid-metal implementation.
