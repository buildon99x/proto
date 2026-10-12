# Second independent melee loop: training staff, Combo and bells

Baseline `0d2520eaf7d48c79b078c6008966dc63a1ee7e86` on `codex/emberwatch-rebuild`. Preserve native-confirmed v73 crusher menu behavior. This adds a distinct storm loop, not a recolour, another crusher status consumer, a saved monk class or a completed PoE2 port.

## Authorized storage-independent scope

The candidate town menu selects a session training-staff stance only after ordinary starter training, learning Judgement, choosing PoE controls and leaving mainhand empty. Existing equip/unequip UI remains the sole gear transaction route. No staff item, two-handed equipment metadata, Power Charge, persistent Combo, bell, mode or new profile field is introduced. The empty-mainhand staff is a session technique, not a claim that an equipped mace has become a staff. Existing character/stat formulas are read unchanged; offhand guard remains its existing action. Region/retry rebuilds carry selection into fresh Combo/bells; explicit reload/profile load/app restart return to classic. Choosing crusher or classic from the town menu clears the storm session.

## Official source versus candidate decisions

The official [0.5.0 staff patch notes](https://www.pathofexile.com/forum/view-thread/3932540) confirm maximum active Tempest Bells3, trigger interval0.3 seconds, and perfectly timed Gathering Storm dashes exploding bells with shockwaves that hit each enemy once per skill use. They also place Shocked Ground after the wave. The notes do not verify this candidate's base Combo requirement, lifetime, attack timeline, exact timing input or live damage formula. All values below are public candidate choices; numerical balance optimization is deferred.

| Setting | Provenance |
| --- | --- |
| Active bell cap3 / direct-hit wave interval0.3s | Official0.5 mechanic, translated to this runtime |
| Combo requirement/cap4, one unit per successful swing cast | Explicit authored test rule; distinct from Power Charges and legacy `p.combo` |
| Bell life12 active simulation seconds, no hit-count life reduction | Explicit authored test rule; not a verified live tooltip |
| Two physical staff contacts at `a.contact` and `2*a.contact` | Authored distinct sequence using existing quoted mace timing; each contact reuses existing quoted damage/crit/penetration |
| Perfect charge starts within0.18s of the second valid staff contact | Authored timing interpretation reusing the existing0.18 queue window; not PoE2's exact input/timing algorithm |
| Staff action duration/cost/CD, bell placement cost/CD and range | Existing learned mace/Judgement quotes, unchanged |
| Wave/explosion damage/radius/offense | Existing quoted Judgement values captured at placement; no new damage multiplier |
| Bell body/placement clearance and charge sweep | Existing charge radius and world geometry, unchanged |
| Charge movement/cost/CD/ordinary enemy collision | Existing charge quote and resolved movement, unchanged; unaugmented charge damage remains0 |

The persistent ground after explosion is a brief owned visual trace using existing charge duration/radius. It does not implement a Shocked Ground damage-taken debuff. Learned Judgement Shackles/Trial by Fire and mace Flame Arc are not mapped to this new training-staff/bell technique; the ordinary/Crusher mappings stay unchanged. This is a playable mechanical adaptation with disclosed missing parity, not a full live skill replica.

## Actual runtime loop and atomic boundaries

J/current attack performs two distinct forward staff contacts with distinct hit IDs. Positive actual primary enemy damage earns at most one Combo per cast even across multiple targets/two contacts; a lethal actual hit counts. Whiffs, self-bell hits and secondary/proc waves cannot build Combo. Combo caps at4 and has no decay in this prototype. Classic visual `p.combo` remains separate.

E/current learned Judgement installs a bell at the current ground point. Learning, resources/CD, Combo, active cap, finite point, range, hero/enemy/bell clearance, floor/body radius and LOS are checked before cost. Successful placement synchronously creates the bell and spends Combo and the existing resource/CD once at accepted action start; its cast pose finishes normally. There is no delayed placement that can fail after payment. Invalid placement produces no resource/Combo/CD spend or ghost FX. The existing accepted-action save persists the ordinary paid resources; reloading clears transient bells just as it clears other ongoing actions.

Bell hover uses the actual displayed body and current LOS. A staff action aimed at a bell strikes only that bell; even enemies behind it cannot become free primary Combo contacts. Real direct contact emits a distinct bell impact. The bell records the swing cast before cooldown testing, so a later contact from the same swing cannot replay a rejected wave. Each active bell emits at most one wave per swing and waits0.3 active seconds before another. Wave packets are nonrecursive secondary hits; no Combo or Bell-to-Bell chain is generated.

A second actual enemy/bell contact opens the0.18s start window, shown on the charge HUD. The ordinary recovery queue can accept Q/current charge near the end of the staff action; when that action really starts its perfect flag is frozen. A timely charge consumes only bells touched by its **final resolved** movement path after enemy/wall stopping. Late charges retain ordinary movement/payment but do not consume bells. Consumed/expired bells become inactive before emitting effects. Multiple touched bells may show separate explosions, but the dash keeps one enemy-hit ledger across them. Expiry at contact wins; no inactive bell can emit another effect. Death clears the session objects immediately. No input queue window, release capture or save/cancellation policy is changed. With release tracking OFF, the bell identity follows the already captured release sample rather than a cursor move before the next frame.

## Verification and native limits

See summary, focused/model/main/full tests, build logs and preservation hashes. Unit/model tests exercise production hit/action/timer/geometry handlers, including three separated bells, wall/foe stopping, expiry boundary, duplicate/cooldown behavior, lethal damage and no saved-field leakage. Tests with cloned additional bells are geometry fixtures, not evidence of a native three-placement resource run. Main tests execute real town menu focus, cursor, J/E/Q handlers, frame and durable checkpoint paths using legally earned progression fixtures. Synthetic stationary enemies isolate this wiring; progression/resource saves use existing validators.

Owned procedural staff posture is visible idle and during two forward strikes, placement and dash. The ordinary owned rig remains fallback; shield appears only for its actual guard in this stance. Bells have a distinct body, expiry arc, ready/cooldown shading and impact/explosion/ground traces. Existing dodge/atlas fallback stays unchanged; native weapon transitions still need review. Existing owned sounds are reused. Canvas probes are read-only geometry evidence, not actual pixels, listening or animation quality approval. No new commercial art, raster images, audio, installation, authentication, public root mutation or deployment.

## Normal-play QA route

Serve the extracted complete package root and open `/qa-r14/`. Use the existing isolated profile, complete ordinary starter training and Adept progression, and purchase Judgement with earned points. In town use existing equipment UI to unequip mainhand if necessary. In key settings explicitly choose PoE WASD/click controls. At idle, Esc → **전투 방식 · 폭풍 연격** → select; mouse or Tab/Enter focus must work without waiting another frame. Use displayed bindings; PoE WASD defaults are J attack, E bell, Q charge.

Land four actual J swing casts against living enemies (one Combo per cast, even though each has two contacts); weak targets may die, so continue on another enemy. Compare whiffs and confirm Combo does not grow. Aim at clear floor within the existing Judgement range, away from hero/enemies/bells; E must spend4 Combo and normal MP once. Try a wall, overlap, distant point and insufficient Combo: no payment or placement. Return cursor to the bell's body and press J; confirm two staff contacts, one throttled wave and no Combo generation from the bell/wave. At the second contact, press Q while still in the normal final recovery window so its queued start lands in the perfect interval; steer/aim through the bell and confirm one consumption/explosion. Wait past that interval and compare a late dash: ordinary charge without consumption.

Exercise multiple bells with naturally replenished resources and cooldowns, three-bell limit, expiry, a blocking foe/wall, death/retry, region travel, mode switching and reload. Inspect readability/pose/impact/sound and focus/keyboard announcements in supported dot. HUD Combo is ordinary status text, not a new live-announcement flood. Native play, visual/listening/AX acceptance and exact PoE2 parity remain coordinator QA gates.

## Remaining completion criteria from independent audit

The current gear system has7 slots and8 basic items; neck is represented in `accessory`. Two-handed weapons, distinct left/right rings and belt are absent. Bag/equip/stats are wired, stash is absent. Skill purchases and8 action slots work, a graph tree is absent. `expedition-content` and `expedition-ledger` are not connected to UI/region/combat/save routing. These remain incomplete; this session combat loop does not bypass blocked a19 writers to fill them. Magma shield remains the next independent combat loop.

Readable terminal logs normalize trailing whitespace/CR; `raw-command-logs.zip` and its SHA256 map retain exact outputs. `intermediate-full.tap` records the earlier4609 pass before the final release-sample edge test; final4610 is the release gate.
