# Independent Cat Café rubric and baseline

Source: buildon99x/proto, codex/cat-cafe-metaverse, e54fba53d45c77c50dd54c8db7413630a6a97458. Reviewed 2026-11-03 UTC. Evaluator did not implement code, use provider traffic, deploy, or access credentials.

## Result

Provisional evidence-grounded baseline: **49/100. Not release-ready for 50–100 people per room.** This is an evidence-readiness score, not a subjective human playtest or visual-quality score. Hard gates override the numeric total.

Highest-priority source defect: feather play still pursues a constantly orbiting target. In a 3.95-second accepted interaction, a stationary owner 0.6m beside cat-8 produces +638.28 degrees accumulated heading in the live simulation and +988.25 degrees in solo, with 9.48m travel each. Calm idle tests do not catch it. This is numeric model evidence, not an observed rendered clip.

The public beta explicitly supports six people total including reservations. An internal 100-seat room model and historical 300 local sockets do not establish public 50–100-person readiness.

## Evidence levels

E0: source/intent. E1: fresh deterministic model/unit tests. E2: fresh local real sockets or measured rendered browser runtime. E3: exact candidate with approved hosted transport and actual device testing. Each result proves only its stated scope.

Label agent-operated normal-controls walkthroughs separately from human participant tests. Phone viewports, synthetic touch and emulation are not physical-phone performance or compatibility. Historical evidence retains its original SHA and date. Record source identity, device/browser, scenario, duration, raw receipt, failures and cleanup. Source changes are never retroactively included in an old run.

## Weighted rubric and baseline

1. **Shared multiplayer, reconnect, isolation: 25; baseline 18.** Independent A and B share a room while C observes another. A moves and pets/feathers/rolls a ball while B observes and competes for the cat. C must receive no foreign room entities. Interrupt A, resume before and after reservation expiry, switch rooms mid-action, reject a full-room switch atomically, and verify final cleanup. Current model tests and historical two-browser receipts support the design. Current-tree actual shared 3D play is unverified. A requester's acknowledgment alone does not prove a second user's rendered observation.
2. **50–100-person room capacity: 15; baseline 4.** Measure 50 and 100 active clients per room, all three occupied rooms, 101st rejection, reserved seats, reconnect and switching. Report tick/action/snapshot p50/p95/p99, errors, memory and egress. Separate local socket load, rendered client occupancy, and approved hosted capacity. Current model admission is tested, but old 300-socket/20-minute evidence predates current code and public capacity remains six total.
3. **Natural sleep-default cats without spinning: 20; baseline 8.** Observe a complete ambient cycle and repeated pet/feather/ball actions, stationary/moving owners, obstacles, expiry and interruption. Require restful majority, coherent behavioral variation, short anticipation/play/pause sequences, no continuous circling, legal movement and facing. Current phase is 82s sleep +22s rest +5s groom +3s stretch +8s walk per120s. Fresh tests establish at least11/18 sleeping at sampled times and stable yaw while stationary. The common cycle is staggered rather than temperament-driven. Feather pursuit is currently the specific failing behavior.
4. **Smooth reliable controls: 15; baseline 10.** Keyboard/joystick movement, camera, selection, proximity, actions, help, room switch, leave/reentry, pointer cancellation, blur/hidden resume and reconnect must work without stuck input. Measure moving/stopping at normal and sparse packet cadences. Current focused input/journey/model tests pass. Fixed150ms interpolation is explicit; sparse250ms samples still hold/catch up. Current rendered feel remains unverified.
5. **PC and mobile usability: 10; baseline 4.** Require current desktop WebGL and actual touch-phone play: narrow portrait/landscape, simultaneous camera/joystick, rotation and resumed play. Existing responsive/pointer tests and older Safari receipts are partial evidence. Current cloud WebGL failure gating is not a rendered pass. Real-phone and current Safari results remain open.
6. **Unobtrusive wit and return value: 8; baseline 2.** Short contextual personality must never obscure failure/pending/ownership information or spam notices. Repeated sessions should offer a reason to try another cat/action/room or return. Existing six names repeat with suffixes and activity text is fixed. Static contextual copy can improve personality modestly, but not establish behavioral variety or replay value. No human preference evidence exists.
7. **Measured runtime performance: 7; baseline 3.** Record actual successful rendered-frame p50/p95/p99, long stalls, draw calls/triangles, errors, memory and current server load. Separate cold/warm, solo/live/crowded and device classes. Evaluator targets: representative desktop roughly55+ medianFPS/p95<=33ms and phone roughly30+ medianFPS/p95<=50ms, with hardware documented. These are proposed acceptance targets, not measured claims. Static meshes145→29 and unchanged triangles prove scene-graph changes, not FPS. Current GPU/phone measurements are absent.

## Hard gates

- G1: Current real clients prove shared actions, reconnect and room isolation. Model-only cannot close it.
- G2: Six-total beta cannot satisfy requested50–100-per-room scale. Synthetic local load cannot close hosted capacity.
- G3: No persistent unintended spinning/circular pursuit in idle or normal action. Sleep-dominant idle alone is insufficient.
- G4: No core control/recovery blocker on tested desktop/mobile paths.
- G5: Current desktop rendering and physical-phone interaction/performance require actual evidence; emulation is preliminary only.
- G6: Performance/release claims require scoped measurements and exact provenance; callback cadence and object counts are not GPU FPS.

Recommendation: >=85/100 plus all applicable gates passed and no unresolved P0/P1 core-flow defect. A limited six-seat preview can improve while G2 stays explicitly open; it is not the requested final scale.

## Fresh verification

65 tests passed, zero failed/skipped: server-ambient, server-world, frontend motion, input, journey, action-journey. These are a focused dependency-free subset, not the full server/frontend suite. No provider request was made.

Feather reproduction: World clock starts0, join a in sunroom; SoloPreview starts sunroom. Pick cat8. Set player x=cat.x+0.6,z=cat.z,yaw=0. Accept feather. Run79 ticks of50ms. Sum shortest signed angular change and step distance. Live638.28deg, solo988.25deg, each9.48m/3950ms.

## Findings and safe next checks

P1 `server/world.mjs:18`: sin(now/300)/cos(now/300) feather target; `app/src/preview.js:11`: sin(time*5)/cos(time*5). Fix with a shared bounded rule and independently retest cat IDs, owner offsets, action epochs, furniture and moving owners. Stationary-owner heading should not repeatedly complete turns; evaluate initial reorientation separately. Confirm rendered naturalness afterward.

P1 release limit: app service discovery and UI explicitly require betaCapacity6. Preserve the safeguard until approved hosted capacity/quota is established.

P2 `shared/ambient.mjs:10–13`: fixed staggered cycle; `app/src/journey.js:4`: fixed labels. Quiet phase-consistent wit in selected-cat activity is appropriate, but not evidence that return value is solved.

P2 `app/src/render-policy.js`: successful draw-call/triangle/program receipts exist, but no validated frame-time series. Root coordinates GPU laptop QA; evaluator must not duplicate it.

Historical receipts consulted: docs/release-gates.md; evidence/2026-11-01-open3d-guidance.md; evidence/2026-11-01-ambient-bench.json; tools/motion/README.md; server/soak-summary.json (base083d308, later ball/app changes explicitly excluded); README/eval public verification atbb33bf15 on2026-11-01.

## Limits

No provider load, paid upgrade, new credentials or deployment is authorized in this review. Thus hosted scale cannot be closed here. Physical-phone results are also absent. Artifact initially targeted /workspace/shared but that filesystem was read-only; this report is in the writable task scratch directory. Project source remains unchanged by the evaluator.
