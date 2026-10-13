# 0.11.2 first-person actions: candidate play checklist

Latest laptop gate: [2026-10-13 jh-laptop reconciliation](qa-jh-laptop-2026-10-13.md). Inspection baseline was 0.12.1; source continuations now reach 0.12.7. Read-only site checks identify public 0.10.0 and candidate 0.12.0. Utility Foley and trajectory preview are implemented, while actual listening, motion/contact captures, live ballistics and extraction acceptance remain open. The supported UI kernel fails before browser observation; source tests do not close those gates.

Use a separate candidate path with `?testProfile=local-qa`. Never use or import the normal bank for this check. Deploy the contents of `app/dist`, preserving the relative `vendor/` and `audio/rifle/` paths. `build-manifest.json` identifies version 0.11.2 and all 113 static payload hashes; verify it and at least game.js, item-action.js and item-view.js after publication.

## Controls and behavior
- H: lower/restore the current gun; 1/2 or wheel: switch equipped slots. Trigger index and support hand follow lowering; firing stays blocked until ready.
- 3: bandage (starter quick slot). At full health it is rejected. At damaged health, prepare/present/use, commit once at 1.78 active seconds, then recover. No healing or consumption before this marker.
- 4: frag (starter quick slot). Select, wait until held, then a fresh left click/F throws. No held fuse/cooking; consumption and world projectile start 0.23 seconds after throw begins. The left index should contact and pull the pin.
- 5: scanner. Prepare/present/use; one charge is consumed and scanning begins at 0.84 active seconds.
- Medical kit timing differs from bandage: its commit is at 2.34 active seconds.
- Weapon selection, damage, pause/menu/focus loss before commit cancels without effect or consumption. Effects already committed are never refunded/repeated. A fresh trigger is required after item recovery.

## Actual visual/input checks still required
1. Capture 1/2/H at idle, ADS, after firing and during reload for all four firearms. Check lower/draw continuity, index position, support wrist, muzzle orientation, central view and no residual magazine or secondary hands.
2. Capture frag selection, stable hold, index-to-ring contact, pulling, release/projectile, follow-through and gun return. Test cancellation before/after release, repeated input and holding trigger through return. Confirm exactly one projectile and one consumed item.
3. Take ordinary gameplay damage, then bandage/medical use. Observe both hands, applicator-to-wrist contact, dressing, delayed health/count change and return. Interrupt just before and after commit, including incoming damage and menu.
4. Test 3–6 spam, switching while reloading, changing the bag source, death/restart, pause/continue, focus loss and empty/full-health items. No delayed surprise shots, duplicate effects, ghost props or zero-time consumption.
5. Inspect HUD at 640×360-equivalent and larger display sizes against light/dark scenery: aim remains centered, health/ammo dominate, action panel does not cover target/hint/extraction, source-based damage direction expires, detailed HUD toggles correctly, menus restore correctly.
6. Listen on an actual output device and measure frame-time/FPS during repeated actions and firefights. No new audio assets were introduced; existing audio behavior is preserved.

## Evidence boundary
755 checks / 33 suites, lint and static packaging pass. Contact/coverage checks use Three geometry without WebGL. Full root aggregate, actual rendering, ordinary relative-mouse input, listening and FPS are not passed by these source results. The source candidate remains a prototype and does not establish AAA quality.


## Focused 0.11.1 recheck
At the same insertion viewpoint, compare held grenade/body, glove panels and pin ring against 0.11.0. Then capture the actual medical use phase before the gun returns, including the support wrist and applicator contact. Confirm the original world and rifle appearance stay unchanged. Menu, page title and candidate badge must all say 0.11.1. Existing candidate save namespace is deliberately retained across this patch.


## Focused 0.11.2 recheck
Capture real bandage/medical use before return at 1812×940 and 640×360. The action strip should sit on the left above vitals, leaving wrist/applicator contact unobscured. Check aim, objective/route text and health/stamina remain separate. At very small windows confirm the abbreviated action state remains readable; full item/state stays in the accessible label. Existing default and local-qa candidate profiles must remain intact.


## 0.11.3 input accessibility candidate
- Reference: actual Windows 0.11.2 follow-up report, Library libfile_055886646e1c8191a01e3086c6d22cc7. Actual screenshot libfile_35be538d7d6c8191b3864a6c335960e1 inspected; paused overlay does not establish enemy contrast.
- Existing keyboard aim was 1.8 rad/s horizontal and 1 rad/s vertical. Added 15%/40%/100% continuous rates and 0.25°/1°/5° per physical press. Step mode ignores OS repeat/hold duration; release before next step. Modes and rate/step persist with scoped controls. Remapped aim keys apply. Mouse sensitivity unchanged.
- Menu: expand “조작키 · 키보드 조준 설정”. Use 1° or 0.25° for fine taps, 5° for coarse one-press turning, or 15%/40% continuous tracking. Each control has a labelled select; irrelevant rate/step select is disabled. Keyboard-aim reset is separate from key-binding reset.
- Ownership review: captured #game is supplied to renderer; no replacement/adoption found. Native request remains synchronous before audio await. WrongDocumentError can describe focus/browsing-context conditions per https://www.w3.org/TR/pointerlock-2/#extensions-to-the-element-interface; automation failure does not prove a normal-user bug. Original exception/context remain visible.
- Fixed concrete lifecycle cases: duplicate normal starts, stale rejection after pause/death, legacy undefined-return error events, unrelated unlock event pausing fallback, and activation cancellation leaving the canvas locked.
- 766 app checks across 33 suites; final per-suite exit codes 0. Pure angular integration verified at 30/60/144 Hz. Rendering, input feel and actual pointer lock remain unverified in this patch.
- Windows0.11.2 evidence accepted: HUD at1812×940, +30 heal, target/token, death settlement/reload/redeploy. Candidate extraction-success persistence, small-window HUD, independent hurt cancellation, exact pin-pull, audio/FPS remain pending.
- Keep the current paused HP10/pistol5/24 tab until normal completion or the tester chooses an interruption. A new deployment does not hot-update an already loaded page. Do not silently reset its storage to load this patch.


## 0.11.4 prepared throw QA
Select grenade with4, wait for held prop. Hold LMB or mapped keyboard fire at least0.10 active seconds; HUD changes to “놓으면 투척”. A short tap safely returns to ready. Release the same physical button to throw. Consumption/projectile occurs0.23 seconds later at the original animation marker. Holding does not start fuse/cooking. Other fire-input release must not throw it.
Check remapped keys, both fire controls held, menu/focus/damage/weapon-switch cancellation, empty item/UID replacement, fresh fire after return. Observe stable hand/pin during hold, pin pull only after release, one projectile and one quantity decrement. New rendered acceptance, actual listening/FPS remain pending. Do not silently reload or reset an old active candidate session.


## 0.11.5 trajectory QA
Enable “투척 예상 궤적” in control settings (default on). Select4, then hold F/LMB: only aim state shows a thin dashed line and first-impact wire marker. Check flat ground, raised aiming, nearby wall and oblique wall reflection; release removes guide before actual projectile commit. The guide predicts current position/geometry with the same120Hz physics as real grenades; player movement during the0.23s release animation and future broken geometry may change the real result. It is not an enemy-targeting aid or explosion-radius overlay.
Pause/Tab/hurt/switch/death/source replacement must hide guide; next valid aim must restore it with no old points. Toggle off persists independently for existing scoped profiles. Walls occlude the guide (depth test on); no full-screen or through-wall overlay. No asset additions. Thin line and marker still require actual low-resolution/dark-scene readability review.
Windows0.11.4 report libfile_aa9d614700888191aca9cad595a4606e was read: short F/LMB taps preserve quantity, long hold/release consumes one and restores R4/P6, weapon-switch cancellation preserves quantity; menu-cancel only proved preparation stage. Pin removal, independent hurt cancel, listening/FPS remain unverified.


## 0.11.6 independent QA profile
Use /qa-actions/?testProfile=trajectory-qa and confirm the trajectory-qa badge. It starts an independent normal-rule game, without reading or copying either previous candidate journal. Existing default/local-qa interrupted raids remain unchanged. Only this exact additional name is allowed. Do not reset old profiles for trajectory testing.


## 0.12.2 melee and failed-commit recovery QA
On an identified 0.12.2 candidate, test V at hip/ADS/reload/holstered, then a custom rebound key. Inspect guard, fist extension/contact, follow-through and gun return; no magazine or utility prop remains. Test one press versus OS repeat, near/rear/side/raised targets and thin cover/barrels. Interrupt with damage, menu, focus loss, bag and weapon selection before/after contact. Hold fire through return: only a fresh physical press may shoot. Confirm unchanged carried ammunition and one hit per strike. Test a treatment item removed/replaced before its commit: no healing/consumption and recovery starts at its actual contact pose. Existing cloth/body cues are provisional and require actual listening. Source/rendererless checks do not pass this checklist.


## 0.12.3 detached pin QA
Observe the pinch/pull through the separation moment, then compare support-hand/pin location while the throwing hand extends and the grenade leaves. The detached pin should not follow the throwing hand. Interrupt after pin extraction but before projectile release and after release: recovery must begin at the same hand/pin contact, with original no-effect-before-commit and no-refund-after-commit rules. Numerical anchors do not prove perceived human motion or actual rendering.


## 0.12.5 pistol live acceptance
On an identified 0.12.5 artifact, test P-6 hip/ADS fire, automatic cycle and mandatory recovery, normal/perfect/mistimed reload, cancel before transfer, H and same-class swaps, dropping/recovering a partially cycled pistol, pause/focus/death/extraction and melee/treatment/frag arbitration. Confirm six-round conservation and detailed HUD matching the actual action. Listen to existing shot/slide/reload/contact recordings and capture return pose/frame-time. Source tests do not pass this checklist. Shotgun/SMG still use their legacy state paths.


## 0.12.6 shotgun live acceptance
Use an identified 0.12.6 artifact and exact QA profile. Observe automatic pump/recovery, last-shell handling, interrupted insertion and physical trigger hold/repress. Test same-class UID swaps, H/drop/recovery, pause/focus/damage/death/extraction and all utility/melee transitions. Inspect neutral hand/gun return and listen to existing mechanical/contact recordings on a real output device; measure frame-time. No rendererless/source result passes this checklist.


## 0.12.7 smg live acceptance
Use an identified 0.12.7 artifact and exact QA profile. Observe held auto-fire cadence, empty hold, interrupted reload and stale input clearing. Test same-class UID swaps, H/drop/recovery, pause/focus/damage/death/extraction and all utility/melee transitions. Inspect neutral hand/gun return and listen to existing mechanical/contact recordings on a real output device; measure frame-time. No rendererless/source result passes this checklist.


## 0.12.8 pump-ownership actual QA
Fire Breach then immediately select frag/healing/melee or H. The manual pump should wait while hands are unavailable and play once on gun return; compare normal pump/casing/audio and passive P-6/R-4 cycling. Capture real frames/input and listen to device output; numerical geometry/cue checks do not close this gate.


## 0.12.9 utility-grip actual QA
Inspect glove handedness against dorsal panels, index/thumb pinch at pin-ring contact, held grip, actual thumb opening at release, closed melee fist and cancelled recovery. Ensure world/gun/HUD contrast and contact locations stay readable. Capture real frames/input and listen to device output; numerical geometry/cue checks do not close this gate.


## 0.12.10 connected utility arms actual QA
Check upper-arm/elbow/forearm/wrist silhouette at grenade pin/hold/release, medicine contact and melee. Look for stretched sleeves, clipping, wall/weapon contrast, discontinuous cancellation and near-camera distortion using actual frames. Geometry endpoints pass; human-looking anatomy/motion remains open.


## 0.12.11 treatment dressing actual QA
Cancel bandage and medkit before contact, during partial application and after benefit. Capture actual frames: no pad should appear on early cancel; partial pad should withdraw with the wrist continuously. Inspect width/clipping and normal recovery. Source geometry is not human-looking contact acceptance.


## 0.12.13 archived action motion tracks actual QA
Inspect grenade pinch, windup, release and follow-through; medical roll/lid/site contact and early/partial/late cancellation; melee contact alignment. Check all gun H/swap/return interruption combinations, near-camera clipping, silhouette and HUD/world readability. Actual screenshots/input/device listening are required; source validation does not close this gate.


## 0.12.14 authored grenade release origin actual QA
Hold aim, inspect initial trajectory point against the release hand, throw at varied headings/pitches and near walls, then cancel and change weapons. Capture ordinary mouse release and projectile start frames; confirm no pin/tool pose jump, unexpected wall crossing or changed trajectory/balance. Actual screenshots/input/device listening are required; source validation does not close this gate.


## 0.12.15 archived movement cancellation and isolated rig preview actual QA
Inspect actual rig cycles and cancellation in tools/rig-preview/dist, then play the full isolated test profile: grenade aim/release/cancel, treatment contact/interruption, melee, H and all-gun switches/reloads, firing near cover, successful extraction/death/repeated raids. Listen and capture frames/device timing separately. Preview cannot replace full-game acceptance. Actual screenshots/input/device listening are required; source validation does not close this gate.


## 0.13.0 second-region raid and home economy vertical slice actual QA
Use a fresh isolated profile: choose each region, deploy actual carried loadout, travel bridges/cover, fight at least two encounter types, recover archive and bounty, test both exits and interruption, return home, sell loot, redeploy preserved equipment and die with protected loot. Verify visuals/route readability, gun/audio sync, mouse input, frame times and repeated persistence. Existing CUA/MXC blocker remains; queued panel is not a loaded/playable browser confirmation. Actual screenshots/input/device listening are required; source validation does not close this gate.


## 0.13.1 adversarial multi-region storage gate actual QA
On fresh real test profiles, repeat two-region deployment/extraction/home sale/next raid and reload; inspect state after browser storage or session interruptions using supported controls. Source fault injection does not establish real disk/storage behavior, browser loading or actual play. Preserve normal profiles. Existing CUA/MXC blocker remains and queued-only panel is not confirmed open. Actual screenshots/input/device listening are required; source validation does not close this gate.


## 0.14.0 stash crafting and armor repair economy actual QA
Run the bundled Node localhost server and use http://127.0.0.1:39605/?testProfile=workshop-qa, verify the test badge/current version and one normal Start. Raid Canal Ward/Black Pines for scrap and contract cash, extract, open owned stash, quote/confirm craft or damaged armor repair, check consumed resources/retained UID, take output into loadout and redeploy. Test failure/reload only in isolated profile with supported controls. Do not clear normal profiles. Existing UI helper block remains; HTTP200 and queued panel never prove startup/render/input/play/listening. Actual screenshots/input/device listening are required; source validation does not close this gate.
