# R14a17 integrated candidate

## Outcome and scope
A16 death-overlay/AX containment plus verified reduction of repeated wilderness view validation. This candidate does not establish that native browser stalls are resolved. No Git, public deployment or Library write was performed in this preparation task.

Read `final-summary.json`, `source-integrity.json`, `static-review.md`, and final `full-tests.log`, `lint.log`, `build.log` with their exit receipts. The final integrated aggregate is authoritative; standalone counts are not added to invent a pass.

## Why scene was expensive
Native a15 exact incident #1350 measured previous synchronous bracket283.1ms, scene281.3ms; #5297 measured292.9ms, scene290.1ms. Scene includes connected-floor visibility, object/NPC/portal display views and optional contact observation. It excludes actual renderer/HUD/storage calls. Temporary maps may be built indirectly inside full state validators. The new a13 warrior rig is not in this bracket; relevant scene modules were byte-identical a12–a15.

The first incident stamp interval533.2ms equals previous stamp-to-entry258.9 + previous callback283.1 + end-to-next-entry8.7 − current stamp-to-entry17.5. The second599.8 =315.8+292.9+9.4−18.3. The `save-wait` mode gives busy precedence over paused and is not a bypass condition: runtime safety uses !paused. Both native pairs occurred around voluntary-menu/save activity without a safetyStop. Costs are elapsed `performance.now` brackets, not exclusive CPU or GPU time.

A separate Node reproduction executed the exact source scene block with command-earned synthetic states. Cold scene populated10 object and3 portal views, repeatedly validating their full progression/ancestry/equipment history. Sampling strongly located work in recursive JSON/state validators. BFS/map creation itself had median0.013ms in the initial batch. No DOM, storage, Canvas readback or renderer was present in this reproduction.

## Safe fix
Main's three successful state-receive paths use `freezeOwnedSnapshot`'s returned detached canonical copy. Descriptor-only cloning rejects getters/non-JSON shapes without executing them, creates its own plain objects, freezes them, and privately records provenance. Controller snapshots still return independent mutable copies; original passed objects are not mutated.

Only these canonical roots permit validator memoization and main view caching. Arbitrary frozen trees/Proxies are NOT certified: a real dynamic missing-property Proxy negative probe exposed why Object.isFrozen alone was insufficient. Generic malformed/mutable/proxy validator calls preserve original reevaluation. Memo results are internally frozen and returned as fresh copies. Canonical certification is not game/save validity; even a canonical malformed state runs its first full validation and caches failure correctly.

## Before/after evidence
`performance/final-paired-results.json`: final integrated source, same four source-backed progression fixtures,10 cold pairs per variant/stage and1000 warm per variant/stage. Candidate cold includes canonical copy/freeze. Baseline medians168.6–182.8ms; candidate10.6–14.7ms (about92–94% reduction). Copy/freeze median0.35–0.39ms. Warm medians0.032–0.058 vs0.034–0.056ms. Every measured scene output and input hash matched. Node wall/aggregate-process CPU are not native-browser acceptance. Raw V8 profile remains at the recorded audit location; sample summary and scripts are included.

## Integration
A16 is the base. Its modal/death guards and background restoration survive the main snapshot receipt changes, including `modal.hidden=true;setDialogBackground(modal,false)`. Main frame function through EOF remains exact a16/a15 bytes. One test-tail context overlap was resolved by appending only the performance test, retaining all a16 tests. Initial/incomplete logs are retained and are not final acceptance.

## Remaining gates
- Supported actual browser AX, keyboard, death/retry/read-only postmortem navigation.
- Same normal-input sequence after publication, with explicit frame-pair observation and safe save/profile restoration.
- Browser-specific CPU/GC/scheduler attribution and whether old >500ms pauses persist.
- Save/controller validation outside the scene bracket was not optimized or attributed to these exact incident stamps.
- Listening, compact/touch and broad play quality remain separate existing gates.

## Verification history correction
The initial integrated aggregate was4,430/4,433. Its three failures were stale version expectations in project metadata and title tests, not validator/gameplay/AX failures. The project and three exact version assertions were updated to R14a17, the3 targeted cases passed, and the complete final aggregate was rerun. No old functional assertion was relaxed.

## Evidence scope correction before publication
The741 view calls across19 earned stages establish display-output equality. The earlier12 ×90-frame simulations all had combatDraws=0: they establish non-consuming model/event/RNG-state equality only. They do not establish RNG consumption. This limitation was identified during the publisher’s independent review before any branch update.

`consuming-combat-parity.json` and its executable script separately reuse the existing close-target integration fixture. At30/60/120Hz, attack and hammer each produced one positive-damage hit and defeat; the6 baseline/canonical pairs consumed9 combat RNG draws in total, with every frame’s full model and events equal. This is a synthetic production-engine boundary check, not normal play or loot RNG coverage, and is not included in the4433-test aggregate. Unchanged game-model source bytes are a third, separate preservation check. Runtime/tests/build bytes did not change during this documentation correction.
