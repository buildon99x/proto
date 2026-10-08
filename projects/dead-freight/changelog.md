# Changelog

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
