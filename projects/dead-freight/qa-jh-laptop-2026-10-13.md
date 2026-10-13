# jh-laptop acceptance gate — 2026-10-13 UTC

The existing task is **not complete**. The initial inspection below records the 0.12.1 baseline and tool blocker. Appended continuations now reach 0.12.7 and record subsequent source implementations and resolved build setup. No checkpoint adds deployment, human-play acceptance or audio-quality acceptance.

## Repository and preservation

- Requested branch: `codex/dead-freight-gunplay-v1`, origin `https://github.com/buildon99x/proto.git`.
- Remote and cloned source at inspection: `faad0c5efc9be5d0c28e106aab69237a1e87e3c6`.
- The supplied task directory was empty. Searches of Documents/Codex, Desktop, Downloads and D:/git found no pre-existing Dead Freight checkout; D:/git/ai-influencer is a different repository. This is a bounded search, not proof that no other copy exists anywhere.
- A separate checkout was cloned into `C:/Users/cjh/Documents/Codex/2026-10-14/task/proto`. Its initial working tree was clean. No existing browser save, active raid, account or user's uncommitted motion was accessed or replaced.
- The static builder rewrote generated `weapon-content.js` line endings only. That worker-generated rewrite was restored after confirming no semantic diff and the initially clean baseline. No user change was restored, reset or discarded.

## Distinct version evidence

Read-only HTTPS requests returned:

| Surface | Observation | Acceptance boundary |
| --- | --- | --- |
| Public root | HTTP 200; HTML badge `0.10.0 / ASSAULT RIFLE FOUNDATION` | Not 0.12.1; root build-manifest URL returns 404 |
| `/qa-actions/` | HTTP 200; title `DEAD FREIGHT / Ballistics Candidate / 0.12.0` | Existing candidate, not updated by this checkpoint |
| `/qa-actions/build-manifest.json` | HTTP 200; version 0.12.0; 121 file hashes | Publication metadata, not actual gameplay |
| Local app/dist | Built from the inspected source; manifest version 0.12.1 | Local static artifact only; not deployed |

HTTP checks do not initialize WebGL, hear sound or exercise inputs. No live page was silently reloaded and no test profile was reset.

## Fresh source verification on this laptop

Existing bundled Node `v24.19.0` was found at `C:/Users/cjh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`; no new runtime was installed.

- All **36 package test commands exited 0: 830 checks**. Counting is 808 `PASS` lines plus the world suite's 22 named checks.
- All 29 package syntax-check commands exited 0.
- `node build.cjs` exited 0 and produced the local 0.12.1 artifact.
- Existing independent audit scripts exited 0: reload commit boundary 135 cases; item commit/release races 108; camera-clear muzzle-cover contacts 72. **315 audit cases are separate from the 830 suite checks.**
- Receipt: `qa-evidence/jh-laptop-source-verification-2026-10-13.json`. Raw per-command logs, HTTP HTML/manifests and local runner remain in the task directory's sibling `qa-evidence/`.
- From the repository root, literal `corepack pnpm sync:registry` and `corepack pnpm build:vercel` failed because Corepack is unavailable on PATH. This fresh clone has no root node_modules. The available bundled pnpm is 11.25.0, whereas this repo pins 9.15.4; it was not substituted. **No fresh root aggregate pass is claimed.** The preceding faad0c5 source record contains its earlier successful locked aggregate run.

The suite uses substituted DOM, renderer and audio devices. These are model/source/rendererless results, never a human raid or actual output-device listening result.

## Actual browser/tool blocker

Installed executables were confirmed:

- `C:/Program Files/Google/Chrome/Application/chrome.exe`
- `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`

Supported UI tooling was tested afresh, rather than assuming the earlier failure still applied:

1. `cua.getState()` failed during kernel initialization.
2. After a supported JavaScript-session reset, `cua.createBrowserTab("chrome", "https://dead-freight-browser.buildon733500.chatgpt.site/qa-actions/?testProfile=trajectory-qa", {sessionName: "🎮 Dead Freight QA"})` failed at the same initialization stage.

Both returned: `MXC launcher: cannot locate required Windows platform directory: HRESULT 0x80070003`, kernel exit code 1. There is no callable standalone node_repl tool for the computer-use skill's `@oai/sky` route in this task. Native computer APIs are disabled in the exposed CUA surface. Thus no browser tab, target window, screenshot, mouse/key gameplay, audio recording or measured device frame-time was obtained. This does not establish a game, WebGL or pointer-lock defect on the laptop; failure precedes browser observation.

The safe network shell permission route succeeded for GitHub and read-only site GETs. No auto-review rejection occurred. No graphics/security flags, browser permissions, installed software or account settings were changed. Restoring the supported Windows/Browser tool connection is the immediate blocker; installing another browser is not justified by this evidence.

## Entire outstanding scope and concrete completion gates

Current implementation was reconciled with AGENTS, README, spec, eval, gunplay-spec-v1-status, first-person-actions-qa, audio-provenance and source. Older dated entries saying trajectory or Foley is absent are historical, not current truth.

| Unit | Current source state | Still required to complete the unit |
| --- | --- | --- |
| Grenade grasp, pin, throw | Articulated procedural hands, pin-ring contact constraint, held preparation, same-input hold/release, delayed single commit, cancellation and trajectory preview exist; 0.12.3 corrects detached pin ownership | Actual multi-frame presentation/hold/index contact/pin separation/release/follow-through/return captures; improve human motion from these observations; ordinary mouse/key interruption and repeat tests; exactly one item/projectile |
| Treatment contact and interruption | Bandage/medkit contact constraint and dressing, different delayed commit times, recovery and precommit cancellation exist | Actual applicator/wrist/dressing captures; exact healing/count change; separate incoming-damage cancellation before/after commit; pause/focus/source replacement; no jump or ghost hand/prop |
| Quick melee | Implemented in 0.12.2 continuation: timed windup/single contact/recovery, interruption, authored target/cover rules, fist poses, remapping and existing cue routing | Actual fist motion/contact, normal input and device listening acceptance; provisional range/damage tuning |
| Holster/draw | H and timed slot transitions exist; exclusive-hand automatic-reload defect already fixed in source | All four guns at idle/ADS/fire/reload and interrupted reversals; grip/wrist/muzzle continuity, no residual magazine/secondary hands, no surprise fire or hidden ammunition spend |
| Dedicated utility Foley | Four edited utility cues from three documented licensed recordings already exist since 0.11.7; cloth/medical/pin stand-ins and cancellation routing tested | Listen to actual game/device output, verify pin/treatment/release/return synchronization and interruption; tune against gun/environment balance; no perceptual pass inferred from waveform/tests |
| Ballistic live fire | Four guns have finite speed/gravity, 120 Hz swept collision, 9 shotgun pellets and chronological incoming/outgoing damage in 0.12.1 source | Publish/serve identified 0.12.1 candidate separately; ordinary-input close-cover and moving-target fire; distances/time/drop/occlusion and chronological contacts; real screenshots, listening and measured frame-time |
| Extraction and repeat raids | Single-region objective/token, two extraction zones, six-second hold and stash settlement model exist; death/redeploy model covered | Candidate successful extraction, reload/persistence, death, repeat deployment and item/ammo/currency conservation through real gameplay in exact QA profile; preserve existing interrupted profiles |
| Two authored city maps | Absent; current world is one deterministic 340×340 m Black Pines region. Two extraction zones are not two maps | Two authored city layouts, routes/collision/cover/objectives, readability, AI navigation and repeated actual raids per map |
| Existing enemy AI | Basic range/visibility alert, windup, visible pursuit/leash and slow projectiles in core.js | Complete required AI behaviors/navigation/part reactions and tune with actual combat; current foundation is not full AI completion |
| Economy/progression | Stash capacity, recovery queue, equipment, purchase/sale receipts and settlement safety exist | Balance progression, reward/sink pacing and repeat-raid outcomes with actual persistence evidence; these safety mechanisms are not a completed economy |
| Other original-spec gaps | P-6/Breach/Twin mechanical ownership is ported through 0.12.7; broader v1 ADS/input/tuning, sniper/DMR, six-class completion, crouch/cover, impact/smoke/EMP variants, full interruption/scene restore and five-player evaluation remain open | Separate scoped implementations and their source + rendered/input acceptance; do not declare P0/P1 or whole specification complete from this checkpoint |
| HUD/performance/input | Existing source checks and partial older Windows evidence | Small-window rendered HUD/contact/guide readability, ordinary relative-mouse pointer lock, p95 input delay and ten-minute real frame-time capture; actual listening |

## Execution order after connection repair

1. Recover the supported tool route, select a returned browser/window, and observe existing tabs before interacting. Preserve existing paused raids and storage; use only the exact local-qa or trajectory-qa allowlisted profile and verify its badge.
2. Establish candidate artifact identity and complete the current baseline's real ballistic/extraction/input/audio/frame-time capture. Keep public 0.10.0 and candidate 0.12.0 distinct from any newly served 0.12.1.
3. Iterate grenade and treatment motion from actual frames, then all-gun holster/draw and dedicated Foley. Each unit: implementation → model checks → real playback/input → corrections → remote SHA confirmation, with unfinished gates recorded.
4. Implement/verify melee, remaining weapon and throwable systems. Then map/AI/economy progression slices and repeated raids. The broader scope requires its own visible acceptance evidence.
5. Only after the agreed existing-task completion gates pass, hand off the new liquid-metal humanoid implementation to dot. **Do not implement that new AI locally.** Laptop remains its testing environment. Proposed follow-up research is stored separately in the task's handoff note; it is not implemented or accepted here.

Parent notification: the explicit cross-thread update call returned `thread not found`; this delegation's final response is the available automatic return channel. No successful sent update is claimed.


## 0.12.2 continuation — completed source unit
The parent explicitly requested source implementation to continue despite UI blockage. Quick melee, legacy binding migration and rejected-effect pose recovery are now implemented. The medical regression failed on rightX before its fix; final 854 checks across 37 app suites, 30 syntax commands, static build and separate 315 audit cases pass. Official pnpm 9.15.4 tarball SHA512 was verified, then 153 existing locked packages were installed locally with frozen-lockfile/ignore-scripts. Lockfile SHA256 is unchanged. Registry sync and build:vercel pass through a task-local dispatcher for the literal corepack pnpm scripts: 11 project artifacts and Next 15.5.19 launcher with 27 pages. Only Dead Freight version/summary/update time is retained from regenerated registry; unrelated ordering/date churn is excluded. No deployment or actual UI/listening/FPS acceptance. These newer results supersede the earlier melee-absent and fresh-aggregate-blocked entries above. Human motion quality, all listed broader-scope gaps and the liquid-metal gate remain open. Receipt: qa-evidence/melee-0.12.2-source-verification.json; aggregate log: qa-evidence/melee-0.12.2-root-build.txt.


## 0.12.3 continuation — detached pin correction
Prior rig code failed the new extracted-pin check at progress .52 because the support hand followed the moving throwing hand. The corrected rig anchors the detached pin to its extraction pose and preserves index contact at cancellation recovery start. Final 856 checks in 37 suites, 30 syntax commands, static build and separate 315 combat audit cases pass. Required build:vercel passes all 11 project builds and the launcher's 27 pages. After excluding unrelated generated registry order/date churn, the launcher is separately rebuilt with the final scoped registry. Frozen lockfile hash remains unchanged. Version 0.12.3 is source/local-build only; public root 0.10.0 and candidate 0.12.0 were not deployed/modified. Actual motion/readability, normal input, listening, device frame-time, ballistic fire and repeated extraction gates remain open. No liquid-metal AI implementation. Evidence: qa-evidence/pin-0.12.3-source-verification.json and the committed regression/aggregate/final-launcher logs.


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


## 0.12.11 treatment dressing cancellation
Reproduced both medicines showing no pad at use0.25 then a pad at cancelled recovery0. Dressing now grows from use0.30 through0.55 and recovery preserves exactly its interrupted amount. No gameplay benefit/timing/material-opacity/save changes. 926 named checks in45 suites,34 syntax commands,315 separate audits and required11-project/27-page aggregate/final launcher pass. Actual visual/natural contact/withdrawal/listening/play/frame-time/extraction remain open. No deployment or liquid-metal implementation.


## 0.12.12 archived once-only action effect receipt
Reconciled the archive receipt with current action identity/commit/cancel guards. Injected same bandage marker after cooldown during recovery reproduced HP60→90 and count2→1; this is source fault injection, not ordinary player input. Bridge now accepts only the current uncancelled committed sequence/UID/item/location once, before effect dispatch. Duplicate, stale, precommit, malformed and rejected markers cannot produce another benefit; future valid actions remain usable. 930 named checks in46 suites,34 syntax commands,315 separate audits and required11-project/27-page aggregate/final launcher pass. Actual play, rendered motion, listening, device performance and extraction remain open. No deployment or local liquid-metal implementation.
