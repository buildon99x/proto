# jh-laptop acceptance gate — 2026-10-13 UTC

The existing task is **not complete**. This checkpoint records a source baseline and a reproduced tool blocker. It adds no gameplay implementation, release, deployment, human-play acceptance or audio-quality acceptance.

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
| Grenade grasp, pin, throw | Articulated procedural hands, pin-ring contact constraint, held preparation, same-input hold/release, delayed single commit, cancellation and trajectory preview exist | Actual multi-frame presentation/hold/index contact/pin separation/release/follow-through/return captures; improve human motion from these observations; ordinary mouse/key interruption and repeat tests; exactly one item/projectile |
| Treatment contact and interruption | Bandage/medkit contact constraint and dressing, different delayed commit times, recovery and precommit cancellation exist | Actual applicator/wrist/dressing captures; exact healing/count change; separate incoming-damage cancellation before/after commit; pause/focus/source replacement; no jump or ghost hand/prop |
| Quick melee | Absent; current input documentation explicitly says melee/full default layout is unfinished | Implement bounded telegraphed windup/contact/recovery, interruption and target/cover rules, first-person motion and Foley; model checks followed by normal-input rendered acceptance |
| Holster/draw | H and timed slot transitions exist; exclusive-hand automatic-reload defect already fixed in source | All four guns at idle/ADS/fire/reload and interrupted reversals; grip/wrist/muzzle continuity, no residual magazine/secondary hands, no surprise fire or hidden ammunition spend |
| Dedicated utility Foley | Four edited utility cues from three documented licensed recordings already exist since 0.11.7; cloth/medical/pin stand-ins and cancellation routing tested | Listen to actual game/device output, verify pin/treatment/release/return synchronization and interruption; tune against gun/environment balance; no perceptual pass inferred from waveform/tests |
| Ballistic live fire | Four guns have finite speed/gravity, 120 Hz swept collision, 9 shotgun pellets and chronological incoming/outgoing damage in 0.12.1 source | Publish/serve identified 0.12.1 candidate separately; ordinary-input close-cover and moving-target fire; distances/time/drop/occlusion and chronological contacts; real screenshots, listening and measured frame-time |
| Extraction and repeat raids | Single-region objective/token, two extraction zones, six-second hold and stash settlement model exist; death/redeploy model covered | Candidate successful extraction, reload/persistence, death, repeat deployment and item/ammo/currency conservation through real gameplay in exact QA profile; preserve existing interrupted profiles |
| Two authored city maps | Absent; current world is one deterministic 340×340 m Black Pines region. Two extraction zones are not two maps | Two authored city layouts, routes/collision/cover/objectives, readability, AI navigation and repeated actual raids per map |
| Existing enemy AI | Basic range/visibility alert, windup, visible pursuit/leash and slow projectiles in core.js | Complete required AI behaviors/navigation/part reactions and tune with actual combat; current foundation is not full AI completion |
| Economy/progression | Stash capacity, recovery queue, equipment, purchase/sale receipts and settlement safety exist | Balance progression, reward/sink pacing and repeat-raid outcomes with actual persistence evidence; these safety mechanisms are not a completed economy |
| Other original-spec gaps | Three non-R4 legacy weapon-state migrations, sniper/DMR, six-class completion, crouch/cover, impact/smoke/EMP variants, full interruption/scene restore and five-player evaluation remain open in the status document | Separate scoped implementations and their source + rendered/input acceptance; do not declare P0/P1 or whole specification complete from this checkpoint |
| HUD/performance/input | Existing source checks and partial older Windows evidence | Small-window rendered HUD/contact/guide readability, ordinary relative-mouse pointer lock, p95 input delay and ten-minute real frame-time capture; actual listening |

## Execution order after connection repair

1. Recover the supported tool route, select a returned browser/window, and observe existing tabs before interacting. Preserve existing paused raids and storage; use only the exact local-qa or trajectory-qa allowlisted profile and verify its badge.
2. Establish candidate artifact identity and complete the current baseline's real ballistic/extraction/input/audio/frame-time capture. Keep public 0.10.0 and candidate 0.12.0 distinct from any newly served 0.12.1.
3. Iterate grenade and treatment motion from actual frames, then all-gun holster/draw and dedicated Foley. Each unit: implementation → model checks → real playback/input → corrections → remote SHA confirmation, with unfinished gates recorded.
4. Implement/verify melee, remaining weapon and throwable systems. Then map/AI/economy progression slices and repeated raids. The broader scope requires its own visible acceptance evidence.
5. Only after the agreed existing-task completion gates pass, hand off the new liquid-metal humanoid implementation to dot. **Do not implement that new AI locally.** Laptop remains its testing environment. Proposed follow-up research is stored separately in the task's handoff note; it is not implemented or accepted here.

Parent notification: the explicit cross-thread update call returned `thread not found`; this delegation's final response is the available automatic return channel. No successful sent update is claimed.
