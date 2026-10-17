# Implementation contract
Authority: [full specification](docs/SmashRally3D-WebGame-Spec-v1.0.read-text.md).
P0: regulation-size singles court; drag physics at 120Hz with swept collisions; shared numerical shot solver and contact rules; finite input buffer; mouse and touch; five contextual shots; constrained auto footwork and fair AI; synchronized animation/hit/SFX/VFX; five points, winner serves; pause/results/rematch/settings/tutorial; context recovery; Vercel build.
P1/P2 excluded until P0 verified.

## 0.2.0 candidate contract
- A common 17-joint weighted skin and nine full-body GLB clips replace the rigid torso-only prototype. Runtime constrained skeletal poses share motion data with export; engine clip hit-frame events drive collision windows.
- Actual 3D racket plane, finite arm length, phase and approach participate in swept contact. No shuttle Y is copied into a racket proxy.
- AI forecasts start after perception delay from noisy current position/velocity samples. Forecasts do not alter the real shuttle.
- Super Smash must beat the ordinary legal smash in speed, downward launch and flight time; impossible attacks return an explicit resolved shot/fallback reason.

## Tactical iteration acceptance
- Contextual low-contact lift, net shot, smash defence block, drive and high-contact attack; no descending smash from below net.
- Balanced prepared front-of-body contact supports attack; rushed/stretched contact reduces options and precision with deterministic timing/course error, not random outcomes.
- Dynamic recovery covers plausible replies to the played placement; smash/net pressure invites follow-up instead of automatic retreat to fixed depth.
- Automatic shallow split step/readiness respects AI observation delay and equal physical limits.
- AI uses observed geometry and flight tradeoffs for four-corner pressure and defence; no score-dependent success rolls.
- Verify research mapping, physical flight/recovery regressions and normal browser input rally scenarios; capture new actual screenshots. Keep human/audio/device claims separate.

Forecourt follow-up: a shared interception height policy may take a descending loose shuttle up to 2.1m inside 1.8m of the net. Keep physical movement, recovery, racket collision and net clearance gates; do not enlarge net-finish eligibility or add input controls.

A weak-quality or balance<0.85 net/block uses a safety-height soft profile (vertical candidates 5–8m/s; desired flight 1.05s). This shared deterministic tuning makes a pressured loose reply physically attackable; it is prototype tuning, not a measured coaching threshold.

## Repeat-drop defence follow-up
- Preserve noisy delayed observation, existing speed/acceleration, recovery locks and real racket collisions.
- Before perceiving a new shot, actors may continue their already known recovery base; they may not anticipate the unseen trajectory.
- Evaluate low but physically legal interception contacts against the existing 0.75m hit floor, rather than rejecting all contacts below 1.05m.
- Record issued soft intentions, actual drop/net/block flights, planner reachable/unreachable/unobserved verdicts, actual returns and immediate winners per difficulty/pattern. UI measurements are distinct from precise domain scheduling.
- Direction-control changes remain a reviewed recommendation in this iteration; do not add required gestures or combine horizontal aim with existing vertical shot swipes without evidence.

Implemented prototype tuning: ground locomotion resumes 0.2s after high contact, 0.3s after Super Smash or0.1s after a low contact; the next swing still waits for the original full recovery. The same motor and forecast use these times, known-base recovery during observation delay, and split locks. Low-contact hip crouch is bounded to0.32m with existing finite arm segments; planned contacts stop at0.8m, above the unchanged0.75m collision floor. Actual horizontal velocity is capped to the existing5.8m/s limit after per-axis acceleration, eliminating diagonal transient overshoot. These are game-tuning values, not measured human biomechanics.


## Mobile input follow-up
- Process the earliest available pointer movement, with pointermove fallback; keep start aim/time and swing clock. Bound per-render catch-up to four120Hz steps globally; below30fps simulation may slow, preserving input opportunities without changing physical step size or applying a gesture-specific pause.
- Ignore secondary contacts; cancellation belongs only to the owning pointer.
- Freeze classification at the first physical hit-frame/attempt, even if that attempt misses; never rewrite an existing contact. Keep original aim/time/swing clock, and retain normal physical collision checks. No duplicate shot on release or stale gesture replay.
- Compare native MEDIUM input and actual collision results, with explicit before-contact and after-contact boundary diagnostics.

## Court framing follow-up
- Remove seating/spectator entities, rather than hiding them at a quality level.
- Fit a static, responsive perspective view to court/runoff, finite actor/racket bounds and conservative high-clear envelope; keep HUD and shot controls clear. No rally zoom/pan or ball-state camera chase.
- Preserve inverse screen-to-court tap/click aiming after resize/DPR/orientation changes.
- Record before/after real clear rallies on PC1280×720, landscape844×390 and portrait390×844. Keep all45 regressions, mobile and DROP defence. Save screenshots through official Library when available, otherwise commit original bytes and full remote SHA.

## Reference composition and articulated swing
- Replace the elevated all-flight overview with a low rear court view. Target tape around 45–59% of the landscape view, a broad blue near court, purple runoff and a substantially larger near athlete. Keep original characters, no spectator/background copying.
- Keep a fixed camera orientation and smoothly widen the lens for the current high flight and finite court/actor bounds; reset after the rally. This supersedes the prior static high-flight hull fit so a reference-like low view remains useful during ordinary contact. Portrait prioritizes complete actionable court width and controls.
- The racket orientation must change through preparation and follow-through, with an orthonormal string-plane/shaft frame and finite arm lengths. Preserve the exact existing impact pose/solver/contact gates and input clocks; preparation changes must not invent contacts or alter reach.
- Measure actual rendering/physical contact agreement, continuous phase transitions and distinct shot trajectories. Separate controlled pose captures from normal UI rally evidence.
- Hold lens return for the final 0.65s before a human interception; only visibility-required outward expansion can override it. Validate aiming by inverse projection error in pixels (0.1px mouse,1.5px native touch); integer touch dispatch on the foreshortened far court cannot imply a fixed world-distance tolerance.

## Parent-measured reference correction
The complete-court framing acceptance is superseded. Crop near court boundaries as needed; preserve actual actors, net interaction and high shuttle visibility. Target landscape player head50–55%, feet80–85%, tape45–59%, net width65–75% using measured screen projections. Capture current c15a7e6 as rejected baseline. Preserve ordinary input/AI physics, and label any intentional presentation geometry adjustment. Add independently authored architectural/landscape forms behind the far court without seating or spectators. Recheck gesture aiming during camera transitions. Deliver representative before/after PNGs as individual Library files.
Reference staging assumption after clarification opportunity: widen only the blue practice apron to8.6m and external net presentation to9.8m (1.75×). Keep the5.18m white legal singles lines, aim clamps, actor/shuttle coordinates and all collision/AI parameters unchanged. This is an original stylized practice-court set, not a claim of regulation net dimensions. This permits the measured landscape net span and athlete height simultaneously without distorting characters or faking racket contact.

Final mesh calibration includes the actual hair top (Head joint+0.33m) and shoe sole (ankle−0.06m), rather than a head-centre approximation. The near ready targets become actual hair50.9%,sole81.5%,height30.6%, with a10.416m presentation net (1.86×); legal singles geometry remains unchanged.

## Smash-feel acceptance
- Same click/tap/default attack, clear and soft controls. Attack SET and HIT timing stages distinguish preparation from the sweet spot; low safe returns and swipe buffers remain supported.
- Perfect balanced ordinary smashes may search a steeper/faster legal profile under38m/s; good attacks retain the existing34m/s balance cap. Never award an automatic hit/point or alter AI perception/movement/recovery for spectacle. Keep prediction and actual integration identical, with explicit safe fallback when steep geometry is impossible.
- All impact cues originate from a real onHit event. A24–32ms real-clock global hold discards catch-up and freezes both actors/flight equally, rather than modifying their physics. No hold on misses, no queued input replay and no large camera reset. Tiny bounded directional recoil respects FX/reduced-motion controls.
- Real flight history drives an emissive tapered directional ribbon even on LOW; restrained string-plane contact mark rather than full-screen flash/noise. Original racket sound combines a short filtered crack, string/body resonances and a faint air tail, synchronized at the same successful hit.
- Software browser evidence must include repeated attack inputs, actual descending launch speed/trajectory, legal block/return or points, continuation, mobile/drop regressions, frame timestamps and a short captured video. PCM validation is not listening or hardware latency certification.

## Experience clarity contract 2026-10-16
- Keep existing inputs, physics solver, AI reaction/motor, close camera and smash-contact implementation. No new buttons or attack eligibility changes.
- Label shot outcomes by actor. Treat pre-hit normal/super attack labels as opportunities, and explain legal safety fallbacks in player language instead of LIMIT/requested/resolved debug text.
- Persist a per-rally diagnostic miss reason only for feedback; it must not influence collision, scoring, AI or input acceptance. Show the causal fault/late/reach reason at the point and clear it on a successful return/new rally/match.
- Point phase shows outcome and next-server intent. Dynamic shot names appear only on the human receiving turn, never as stale opportunities on a dead ball. Shot selection before serve chooses intent without accidentally serving.
- A real score queues one quiet ascending/descending outcome cue, separately counted from physical hit audio; sound-off and restart suppress pending/stale cues. Keep reduced-motion and existing camera controls.
- Preserve all prior acceptance gates. Capture actual UI match/points/rematch and shot fallback, mobile gestures/rotation, direction mapping, repeat-DROP defence and normal/strong attack domains separately. Human listening and device FPS remain unverified.

Observed MEDIUM native retry exposed a pending swipe whose move event arrived after a genuine contact. Keep post-contact rejection and original gesture/physics clocks. The attack text/ring onset now uses the existing0.08s PERFECT boundary (previously visual0.05s); no quality, buffer, reach, contact, AI or score gate changes. Validate the same trusted native up/down gestures repeatedly, not a relaxed acceptance rule.

Terminal-point review:an actual5–0 frame still promised a next serve before results. Terminal points must instead announce MATCH WON/LOST and RESULTS NEXT; the actual winning-point browser check and a boundary unit test enforce this without changing scores or transitions.


## Evidence-based benchmark contract — 2026-10-17
- docs/switch-sports-rubric.md and verification/switch-benchmark-20261017/rubric.json define100 points before runtime changes. Unknown criteria stay null; report verified subtotal/verified weight and unverified weight without normalizing to100. No overall98 claim until every criterion's evidence is available.
- Research facts from public official text separately from inference. The official trailer was located but not played: workspace media requests fail with Tunnel403 and Web open fails. The selected Linux container has no DISPLAY or dot computer tool, so normal-speed human feel, real output listening and physical-device latency remain open.
- Lighting changes must improve athlete/racket/net separation in fresh held-serve and ordinary-rally frames. Keep camera, transforms, physics, AI, timing and contact meshes unchanged. No copied Nintendo assets or spectator restoration. Tune one class of values at a time using the bundled light-scene skill.
- Beginner tips should advance on actual non-serve human returns and actual successful chosen clear/lift/drop/net/block, not elapsed simulation time, AI actions, misses, selection, serve or an attack that falls back safely. Preserve progress across ordinary rematches. Existing Settings/Pause can hide or restart tips without adding gameplay input complexity.
- Match the existing real input/defence/direction/rotation/contact gates; run strict units and full build after final runtime changes. Source hash must match all final captures. Browser automation is a separate technical result, never a surrogate experience score. Video playback must remain wall-clock1x and disclose software frame holds/slow rendering.
- For the same issue, three consecutive no-improvement observations trigger a written diagnosis, changed hypothesis/approach and fresh evaluation. Do not lower rubric weights/gates to manufacture progress.


High-flight visibility contract2026-10-17:No physics, camera, model contact size, prediction, input window or AI changes. A presentation cue, if selected, must stay anchored to the rendered cork position and vanish around actual contact; it cannot create hits, move the target or intercept pointer events. Compare the same held physical state and preserve original scene camera/pose across alternatives. Use the existing rubric without reducing criteria; update only inspected criteria with evidence. Three no-improvement trials on the same issue require causal diagnosis and a different background/material/outline/trail approach. Review both bright-sky and court/background cases, LOW and MEDIUM/DPR2, trail off and normal/strong contact visibility. Normal-speed feel and listening remain separate from software frame and numerical audio checks.

U3 keyboard contract: native inert on background UI while an overlay is open; Tab/Shift+Tab wraps within visible modal controls. Help/settings close restores its opener; Escape closes those dialogs before changing pause. Pause resume returns focus to Pause. All existing settings labels/selects and Pause use minimum44CSSpx targets; dialog body/pause card remain scrollable on short screens.

Render-only stroke presentation: use already perceived/intercepted incoming contact for anticipatory load without issuing a swing or inventing a hit. At a real stroke, blend load into the unmodified physical pose before hitFrame−60ms; throughout the contact window use the exact physical racket basis/hand/centre. Solve elbows/legs at original bone lengths, preserve planted foot x/z, add bounded pre-load and landing compression. Orient the visible gripping hand with the actual racket. Camera framing continues to use domain poses, not the revised presentation envelope; no FOV/time-scale changes. No physical solver, command timing, motor, AI or shot outcome changes.

Athlete material factors encode the authored sRGB palette as linear glTF factors; the standard sRGB transfer round-trip must recover the intended hex colors. Actual imported colors are reported separately because PlayCanvas Color.gamma uses a power2.2 approximation; no bit-exact engine-color claim. Opt-in generation leaves all other existing assets byte-identical. Held art comparison freezes engine update and camera, switches only athlete diffuse values to the measured legacy palette and back, and checks pose/time/camera identity. This is separate from ordinary live-motion evidence.


Courtyard depth contract2026-10-17: render-only original environment root; blue surface, purple apron, white physics lines, existing key/fill and camera unchanged. Retain quiet central backing for players/net; do not add visual targets or text. Same ready/normal/Super/high-flight frames and fourview comparisons; no score from counters. Measure draw calls before adding geometry, use static batching if needed. Preserve all prior gameplay/input/AI/contact gates. Three no-improvement trials trigger another approach.


Contact clarity contract: same camera,FOV,court and athlete scale. Render-only occlusion treatment may alter near-athlete fragments around actual cork/opponent-racket overlap, never reposition targets/actors or reveal predicted future hits. No treatment on actual human contact frames. Clone only affected materials, installed2.23GLSLcontract/pinnedWebGL2, deterministic spatial alpha pattern and per-mesh parameters. Off-state must reproduce original pixels. C2must distinguish aim intent from actual chosen shot target and explain safe fallback without extra controls; markers label intention,not guaranteed trajectory. Existing target and command physics stay unchanged.

Selected visibility refinement: radius is min18CSSpx/4.2%viewportwidth, with20%clear core and deterministic2×2edge. A current-cork ray must overlap projected actual near-player body/limb capsules at greater depth; empty gaps in the projected whole-body box do not trigger it. Entire-player ghost was rejected; larger65%-core disc obscured too much near-player face. No physics/camera/actor transform changes. Aim caption starts after the brief actual AI-hit message; targets are objectives, never guaranteed landing predictions.


Athlete-form contract: retain exact17-joint hierarchy/rest/inverse binds and every animation channel/input/output value. Change only original athlete mesh contours/garment/face parts, preserve total standing size/grounding and existing binding conventions. No camera, motion, physics, prediction or contact-window edits. Side-by-side same-pose review is required because changed geometry cannot be byte-gated; untouched baseline repeats must match first.
