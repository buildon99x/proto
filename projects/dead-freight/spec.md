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
