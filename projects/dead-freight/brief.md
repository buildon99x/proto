# DEAD FREIGHT / Black Pines

The latest user-selected direction supersedes the earlier urban palette: a near-monochrome first-person forest scene, cool gray/black/ivory, coarse dither, tall conifers, atmospheric depth, large angular ivory weapon and black gloves, and minimal interface. Match the supplied image through original procedural geometry and rendering rather than reusing it as a background.

The user also specified hardcore and stylish. Difficulty should reward aim, reload timing, attack-reading and movement, rather than simply increasing enemy health. Maintain the private GPT Site and the new project in proto on its existing source branch.

Visual correspondence and actual play must be checked in a rendered browser. Model tests alone do not establish completion.

## 0.4 correction
The user noted that the supplied image has clear red weapon accents and much more realistic firearm contours. Preserve the low-color forest direction, but enlarge the muted red suppressor-cap accent, retain its hue through the palette pass, and improve machined slide and component silhouettes. Do not claim the blocked browser comparison has passed.

## 0.5 first-person composition and response
Match the supplied first-person composition with a visible short wrist gap between dark glove and sleeve, two readable hands around the grip, and the muzzle pointing diagonally toward the upper left. Improve contact shadows, glove material breakup and wrist anatomy using original live geometry. The user additionally requested a high-quality FPS standard for motion, original layered weapon/mechanical/impact audio and shot/hit response. Treat that as a quality target, never as a claim of equivalence to any commercial game.

## 0.6 extraction expansion
The October 8 request makes readability and exploration the priority: show a persistent aim reticle, remove full-screen noise and retain weathering only on world objects, cycle/pump the gun automatically, and support jump plus momentum-based sliding. Continue in the existing proto/projects/dead-freight project. Build a substantial connected extraction region with distinct landmarks, branching routes, localized encounters, optional supply/valuable loot and a recover-and-extract loop. This is a bounded, single-player region prototype, not a claim of a finished open-world game.

## Next checkpoint: FPS foundation and one assault rifle
The consolidated October 8 request is authoritative and was read in full, alongside the complete Origin Dust concept-v2.md canon. Preserve the published 0.6 region as an intermediate checkpoint. Work now concentrates on one original assault rifle and its shared state foundation, not more maps, classes or progression. Existing legacy weapons stay usable without a polish claim. Actual ordinary-input play remains an explicit phase gate; source tests cannot pass that gate.


## October 8 creator feedback
The user actually played and reported excessive weapon screen occlusion. The next rig revision must preserve a clear central view and measure hip/ADS footprint. Movement must reduce stamina, including walking, with greater sprint drain and discrete jump/slide cost; stopping restores it and exhaustion must not trap the player. The creator adds perpetual surface night: atmospheric conditions prevent sunlight reaching the ground, while the upper-atmosphere event remains unexplained. Do not assert that the star physically disappeared or invent the cause. This game-specific refinement does not edit the external canon repository. Lighting uses restrained ambient readability and visible local work lamps, not a blanket grey/black filter. User also selected Pixabay explicitly for firearm samples; the final audio source must follow that request and its license.

## Renderer startup failure recovery
When the browser cannot initialize the 3D renderer, show an honest unavailable state with a working reload-and-retry action and accessible audio credits. Hide gameplay readouts and inapplicable controls, and do not create a mission, audio, gameplay input handlers or an animation loop. Do not infer a hardware fault, substitute a simulated game, or treat error handling as live-play acceptance.
# Lifecycle correctness checkpoint 0.7.2

Review first entry, time spent in a raid, extraction/death results and replay without expanding the game into new maps or progression. Preserve existing browser bank data and make persistence failure visible. Explain the actual prototype loop and current lack of bank spending, use focus-safe menu input, restore saved contract level consistently, and make health pickup/target armor behavior independent of misleading UI or loadout choices. Use bounded simulation catch-up with active elapsed time; pauses must not consume raid time. The R-4 ordinary-input/listening acceptance gate remains open.

## 0.8 equipment and carry slice
The creator explicitly requested extraction equipment and a bag constrained by slots and weight. Implement a functional inventory slice while the R-4 actual-play quality gate remains open. Use original equipment, UI and tuning; official ARC sources confirm the general structures, weight, quick-use and loss rules, not our numeric limits. Keep bank/save compatibility, meaningful pickup/equip/use/drop actions, real consumable/gadget/throwable effects and persistent extraction/death settlement. No second map, new firearm class or full economy is implied.

## 0.8.1 visibility rollback
The creator reports that the current image is unreadable and explicitly says perpetual night is lore, not an instruction to darken play. Restore the known pre-0.7 world and weapon illumination/background/fog values while preserving the noise-free grade, current gameplay and inventory, and the night setting in text. This narrow checkpoint takes priority over the separate stash-capacity feature.

## 0.8.2 isolated gameplay QA
Enable the explicitly requested local-PC play test without reading, copying, spending or replacing the normal browser save. A fixed allowlisted test-profile URL must use a separate storage namespace, show a persistent test badge and run the same gameplay rules. Reject invalid profile values before storage or gameplay initialization. Audio investigation proceeds separately on the existing exact runtime/source recordings.

## Recorded gun-audio repair
The creator still hears electronic gunfire. Repair all currently playable firearm sounds using licensed Pixabay recordings, without expanding the firearm mechanics roster. Reduce the existing suppressed shot's excessive filtering and mechanical dominance. Preserve credible recorded transients/body and synchronous magazine, cocking, cycle, casing and material-hit cues. Listening and A/B evidence must be reported separately from signal tests; do not claim commercial-game parity.

## 0.8.3 all-firearm recording correction
The creator reports that gun feedback still sounds electronic. Replace firearm output for every currently playable weapon with verified Pixabay recordings, including manipulation, impact, player hit and physical casing contact. Remove the processed kick-drum rifle source from runtime and disable tonal gun markers. Preserve game timing and inventory behavior. Default suppressor-off is integrated by the release owner. Audio listening and rendered gameplay remain separate acceptance gates.


Keep deployment in the menu until the recorded bank has decoded successfully. The first cold start gesture unlocks/prepares sound; a fresh explicit click starts the raid when ready. Audio preparation never reserves inventory or writes a save. Muting is an explicit alternative, not a synthesized fallback.


## Actual-play feedback corrections
Actual 0.8.2 play exposed a few narrow presentation issues. Keep restored lighting and the recorded-audio checkpoint intact. Improve enemy head/leg separation with dedicated materials, preserve pointer-lock failure feedback, synchronize fresh HUD before showing a deployment, and make accuracy measure enemy hits only.

## 0.9 permanent stash progression
Add a limited home inventory for owned equipment/items and allow expansion with virtual game currency. This is separate from the raid bag's 12 slots/30kg. Use original prototype tuning: 24 initial stash slots, five +8-slot purchases up to64, priced500/750/1000/1500/2000. Preserve all older items and cash without writes on load. Full extraction must never silently delete loot; retain overflow as a recovery queue that must be resolved before another deployment. Explicitly reviewed sale/claim actions provide a way to free space or earn expansion currency, without adding a general gear shop or crafting system.


## FPS specification v1 first slice
Apply the creator-adopted FPS gunplay specification v1.0, latest Library libfile_17175a9b0b188191bffc98b8d6809dcc version1. Both487-line copies have identical returned text. Preserve0.9 as a checkpoint. First vertical slice is the common P0 foundation exercised by R4: validated weapon data, stable instance state, ammo/shot commits, input arbitration, swap/holster and reload cancellation, automatic empty reload, and muzzle obstruction. Do not add classes/maps before foundation acceptance. Actual mouse/audio/performance acceptance remains distinct from source checks and must be evaluated in the isolated QA profile.

## Windows Edge visibility / extraction correction
Observed ordinary-input QA found enemies merging into trees away from work lamps and a blocked approach 12 m from east extraction. Preserve restored baseline lighting, noise-free grading, weapon framing and saves. Improve diffuse enemy-part contrast and mark actual wall-end entrances with restrained world-space signs, paint and local fixtures.


## First-person actions and HUD plan
First-person action checkpoint: staged holster/draw, selected held throwable, delayed committed healing and compact action HUD. Keep established weapon framing and recorded-only firearm audio. The user includes HUD quality in the same scope. Original geometry only; no commercial parity claim.


## 0.11.1 actual-play readability correction
Windows Edge 0.11 QA confirms selected item behavior but shows held grenade/gloves merging into the foreground. Raise only utility viewmodel readability; preserve world lighting, fog, grading and firearm framing. Correct menu/candidate version mismatch. The supplied treatment-use screenshot actually shows the returned rifle and is not evidence of medical contact visibility.


## 0.11.2 treatment HUD correction
Actual Windows 0.11.1 treatment frame shows the centered action HUD obscuring wrist/hand contact. Move and simplify the HUD; retain the improved utility lighting, anatomy and animation. Preserve root and both candidate storage profiles.


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

## Ballistics implementation restart, 2026-10-10
Recovered 0.11.7 archive SHA 9f2431b39e0ed10b2ccf0563fd8625da16261c43b0fb69f81cb25109b815182b and all119 build hashes. Implement approved proposal in small preserved slices: shared damage/range/armor, nine pellets, then fixed-step high-speed swept projectiles. Existing actions, audio and profiles remain regression gates. Values are playtest hypotheses, not reverse-engineered original-game values.

0.12.0 candidate implements all three model slices; actual Windows aim/contact/readability and listening acceptance remain required.


## 0.12.1 contact-order correction brief
Continue the requested ballistic-quality work on the dot cloud computer. Preserve saves, the published root and candidate, and unrelated projects. Correct demonstrated ordering defects where an incoming fatal projectile suppresses a physically earlier outgoing contact; do not treat model evidence as actual-play acceptance. GPU/settings bypass and an unapproved switch to the user's Windows computer are out of scope.

## October 11 repeat-input audit
Continue small evidence-backed improvements while browser tools are disconnected. Preserve gameplay balance and all existing saves. Prioritize preventing OS key repeat from closing the raid inventory or restoring cleared movement after interruption. Model checks do not establish local browser acceptance.

## October 11 action ownership audit
An empty R-4 must not automatically reload and spend reserve while a grenade, healing item or loadout transition owns the hands. Preserve intentional trigger buffering and tactical reload cancellation; defer only automatic reload initiation behind the existing action gate.

## Locked dependency and boundary verification
Install only the existing frozen workspace dependencies to complete aggregate verification. Keep independent boundary audits reproducible for muzzle-first contact, reload transfer conservation and item/death/release races. Do not change balance or add a runtime fix without a reproduced defect.


## 0.12.2 quick melee source slice
Implement one cancellable, exclusive-hand quick fist strike using existing utility hands and cloth recordings. Preserve firearm balance, carried ammunition, saves and public deployments. Human motion, listening and live input acceptance remain open.


## 0.12.3 detached grenade pin ownership
After pin extraction, the support hand should own the detached pin instead of following the thrown grenade hand. Correct the demonstrated rig-coordinate drift without changing inventory, release timing, ballistic launch or lighting. Actual human motion acceptance remains open.


## 0.12.4 action lifecycle ownership
Close reproduced direct-bridge paused-use and active-action immediate-use holes. Keep ordinary inventory preparation and timed effects compatible; do not equate these source API defects with an observed UI exploit.


## 0.12.5 pistol state ownership
Migrate the existing P-6 six-round pistol into one validated data-driven per-instance state controller. Preserve the fictional gun's automatic cycling, mandatory recovery, legacy active-reload skill behavior, ballistics, controls, recordings and existing inventory/save schema. Shotgun/SMG remain separate migration gaps.


## 0.12.6 shotgun mechanical ownership
Port the existing two-shell Breach shotgun to validated per-UID mechanical ownership, sharing the proven controller implementation with P-6. Preserve nine-pellet ballistics, automatic pump/recovery, semi trigger behavior, atomic end-of-reload transfer, recordings and inventory/save shape. Do not imply one-shell insertion commits that the existing game does not implement.


## 0.12.7 SMG mechanical ownership
Complete the remaining original non-R4 mechanical-owner migration with the existing Twin SMG. Use shared MechanicalState, validated data and per-UID saved state while preserving original auto fire, skill reload, counts, controls, recordings and ballistics. Broader v1 tuning/live quality remains separate.
