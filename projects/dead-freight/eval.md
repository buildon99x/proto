# Black Pines 0.2.0 evaluation

## Current status: 0.7.1 startup recovery verified in source; actual play still blocked

The latest status supersedes the historical sign-in blockers below. On October 8, sign-in was authorized at 04:46 UTC, public sharing was requested at 05:07 UTC, and public Site revision 2 was verified at 05:08 UTC. A fresh public page loaded without completing login; the OTP flow was closed and no code was entered. The remaining observed browser blocker is failure to initialize WebGL, not Site access. The 0.7.1 source handles that failure gracefully; this is not proof that rendering or gameplay now works. See the latest verification entry at the end.

## Historical 0.2 result: visual/play verification blocked on sign-in

The latest user-supplied 640×360 reference was personally inspected. It shows near-monochrome forest fog, layered pines, coarse stippled/dithered tones, black gloves and a large angular ivory weapon with a muted rust muzzle. The previous urban/neon direction is superseded.

### Implemented
Four-tone GPU dithering, original conifer geometry and fog, fixed-aspect low-resolution viewport, subdued HUD, original suppressed weapon silhouette, readable enemy windups, dodgeable projectiles, stamina dash, active reload risk/reward, precision rewards and breakable chains.

### Automated verification
22 model checks pass: collision, manual cycling, finite reload, reload cancellation, headshot reward, cover destruction, solid geometry, explosion damage, bounty chain, death, healing, reset, alternate-route reachability, dash cost/invulnerability, stamina limits/recovery, successful and failed active reload timing, chain expiry/damage reset, enemy telegraph timing, projectile hit and movement avoidance.
JavaScript syntax checks pass. These tests do not verify visual output, audio, browser input or feel.

### Browser evidence and blocker
The actual private GPT Site was opened in the cloud browser. It returned the owner sign-in page (“접속하려면 로그인하세요 / ChatGPT로 계속”), not the game. An approval request for existing-account sign-in is pending. No credentials were entered, no audience was widened and no authentication bypass was used.
The previous local preview route returned 502; the cloud browser rejects file URLs. No generated illustration is presented as an implementation screenshot.

### Required remaining acceptance
- Compare a real rendered frame to the source at 640×360, including palette, dither density, tree depth and weapon placement
- Perform actual keyboard/mouse play: start, move, aim/fire/cycle, time a reload, dodge telegraphed shots, retrieve token and extract
- Check death/retry, pause/resume, lost focus and pointer-lock fallback
- Check browser errors, performance and audio
- Repair issues and recapture before calling the revision complete

### Publication
The same owner-private GPT Site now contains this development revision: https://dead-freight-browser.buildon733500.chatgpt.site
Deployment success is not gameplay verification. No main-branch merge is authorized or performed.

### Previous integration baseline
0.1.0 passed selected-project static build, registry validation and launcher production build. The standard root build:vercel command was blocked by the executor's tsx CLI IPC restriction; scripts could run through Node's tsx loader. Existing registry timestamps and unrelated files were preserved.

### 0.2.0 integration checks
The selected project's static build, registry metadata validation, and launcher production build all passed after this revision. Launcher compilation, type checks and all 27 generated pages completed successfully. This does not resolve the outstanding browser render/play acceptance.

## 0.3.0 first-person detail checkpoint (not a visual pass)
- New dedicated weapon module with chamfered receiver, ejection port, extractor, slide serrations, open trigger guard, moving trigger/hammer, grip texture, magazine and suppressor geometry
- Segmented glove fingers with joints/knuckle pads, separate trigger index, thumb, palm, support hand, cuffs and forearms
- Spring recoil/recovery, mechanical slide travel, casing ejection, weapon inertia, support-hand/magazine reload movement and staged reload sounds
- Right mouse now aims through iron sights; Q retains the manual weapon cycle
- Optional suppressor changes geometry and audio; optional rail laser has a visible module and raycast hit point (L toggle)
- Hit confirmation, short impact slowdown, enemy collapse and larger wood fragments added
- 22 model tests and 12 actual Three.js viewmodel-construction configurations passed; geometry coordinates were checked for finiteness
- Constructor metrics are not image-quality evidence. No commercial-game equivalence, anatomical fidelity, animation quality or reference-level visual match is claimed without the still-pending browser render and normal-input playthrough

### 0.3 runtime review repairs
A separate rendererless review identified and verified fixes for: a negative completed-reload timer blocking future shots; detached laser origin across the two camera projections; missing barrel laser intersections; short muzzle flashes disappearing before their first rendered frame; outdated right-click cycle instructions; a trigger fingertip that did not reach the trigger; and GPU/effect cleanup paths. A fresh start/end also clears held ADS and transient presentation state. The regression suite now has 23 combat checks and 12 viewmodel configurations, including measured fingertip contact. Laser projection was checked numerically across hip/ADS/yaw/pitch cases. These are still not a substitute for visual or input-play acceptance.

## 0.4.0 red-accent / silhouette correction
The exact supplied reference was reopened from its previously materialized Library file, whose Library identity and version were verified before pixel inspection. The wine/rust muzzle cap is a substantial accent; the side of the slide has crisp machined boundaries.

Changes: enlarged red front shroud, three-value red ramp retained separately from grayscale, chamfered receiver shoulders, stepped/tapered suppressor pieces and a corrected hip-fire camera distance/offset. The diagnostic exposed that the prior gun was too close to the camera and obscured most of the hands; the new placement reduces that exaggerated perspective while preserving ADS behavior.

The files assets/diagnostics/viewmodel-0.3.png and viewmodel-0.4.png are CPU mesh diagnostics from the actual viewmodel geometry with approximate diffuse light. They explicitly say NOT A GAME SCREENSHOT. They contain no forest, browser UI or live controls. Do not use them as proof of browser rendering or final visual fidelity.

Remaining gaps: the forest/environment and lighting have not been compared in the live game, glove/cuff silhouette still needs visual refinement, animation and accessory transitions need ordinary-input play, and no full rendered reference match or commercial-game equivalence is claimed. Private-Site sign-in approval remains unanswered; no authentication bypass, audience change or alternate browser-policy workaround was used.

## 0.5 work in progress
The exact reference pixels and 0.4 mesh diagnostic were inspected. Current defects: glove/wrist mass is too low, wrist gap is missing (pale material is only a cuff), and no shadow-map settings or mesh shadow flags exist. The supported cloud preview route still returns 502 from terminal.local:4173. A portable-preview server with approved network escalation is being checked; no private-Site authentication step or bypass has been attempted.

### 0.5.0 implemented and checked
The final source contains actual exposed-wrist geometry, repositioned palms/support forearm, broad glove lighting planes/creases, per-vertex wrist occlusion and real viewmodel shadow casting/receiving. Hip framing projects the suppressor center to approximately (299,158) and receiver rear to (406,208) at 640×360, versus reference landmarks near (299,161)/(407,204). An inspected ADS diagnostic exposed an oversized solid rear sight; the camera distance and actual rear-notch geometry were corrected and recaptured.

Original audio and motion modules provide three differentiated weapon/suppressor profiles, layered crack/body/mechanics/reflection, pistol/SMG shot-time casing ticks and shotgun cycle-time ejection, bounded material/target impact sounds, staged reload cues, safe bounded output, mute/pause/cleanup. Motion uses exact critically damped springs, frame-rate-independent recoil, ADS/sprint/dash/switch transitions, phased support-hand/magazine/slide reload, and modest camera recoil. No commercial-game equivalence is asserted.

Final automated checks: 23 combat, 12 viewmodel configurations, 7 deterministic motion checks, 34 audio synthesis/graph/lifecycle checks and 21 rendererless integration checks. JavaScript syntax and whitespace checks pass. Integration checks use actual Three.js/model/core/motion with mocked DOM, WebGLRenderer and audio; they are not normal-input play tests.

Registry synchronization via Node's tsx loader, registry validation, selected-project build and launcher production compilation/type checks/27 generated pages pass. The prescribed `pnpm sync:registry` and `pnpm build:vercel` entry points were attempted but fail before their scripts because the runtime pnpm wrapper tries to create an unavailable /home/agent/.local/share/pnpm store; the full all-project aggregate is not claimed to pass. No dependency or package-manager changes were committed. Unrelated registry records were preserved.

### 0.5 browser, listening and visual acceptance limits
The supported cloud-browser URL http://terminal.local:4173/ returns 502 Connection refused. Both isolated and documented portable-preview escalated server attempts were made; the latter readiness check also failed in sandbox mount setup. No login approval, private-Site access bypass, security setting change or audience expansion was used. Real WebGL shadows, palette exposure, forest composition, frame rate, ordinary mouse/keyboard interaction and audible sound quality are still unverified.

The three 0.5 images in assets/diagnostics are CPU rasterizations of the real weapon geometry with approximate diffuse light, explicitly labeled NOT A GAME SCREENSHOT. They were visually inspected for hip/ADS/reload composition, but omit the environment and real shadow map. The Site is a published development checkpoint, not final visual/feel acceptance.

## 0.6 work in progress
User reference image(5).png and the explicitly labeled 0.5 offline viewmodel diagnostic were inspected before editing. The latest request supersedes full-frame dithering. The implementation will retain existing source, rigs and audio while adding a bounded extraction region, jump, slide and automatic weapon cycle. Actual rendering/input/audio acceptance will be attempted through the supported dot-cloud preview; prior 502 behavior is not proof of the current result.

### 0.6 implemented checkpoint (new consolidated specification supersedes final scope)
The existing extraction expansion is preserved as an intermediate development checkpoint. It is not acceptance of the newly supplied consolidated PvE/OriginDust roadmap or its assault-rifle-first phase gate.

Implemented: 340×340m connected region (0.116 km²), five landmarks, ten branching routes, 720 collision-matched trees, 17 local enemies, six cargo rewards and two six-second extraction holds. 111,212 one-metre cells are reachable at .45m clearance; all landmarks, caches, encounters, exits and sampled road centres are reachable. Shortest four-neighbour spawn-to-relay route is 303m. Scenery is batched to 138 visible meshes without text plates, about 122k triangles; this is a construction budget, not measured browser performance.

Space jump, gravity/landing, low-cover clearance, fixed-direction stamina slide/friction/cooldown, slide-only passage and exact 3D bullet/cover collision are integrated. Camera eye height is constrained to the current body posture, with smooth return; jump/land/slide viewmodel impulses are bounded. Pistol/shotgun automatically cycle with mandatory recovery, synchronized presentation/audio and cancellation on reload/switch. Held automatic fire uses current camera/target transforms. Carried value is lost on death and banked exactly once on extraction in browser-local storage.

Persistent outlined reticle, independent hit marker, ADS visibility, region/objective/distance/cargo/map/extraction HUD and 960×540 internal rendering replace the noisy screen treatment. The post-process has no Bayer pattern, random grain or screen-space texture; material weathering remains world-local.

Final automated checkpoint: 179 checks pass (23 combat, 12 viewmodel, 9 motion, 34 audio, 31 rendererless integration, 41 movement/pump/extraction, 14 world, 15 readability). Syntax checks and whitespace checks pass. Registry sync through Node's tsx loader, metadata validation, selected-project static build and launcher production compilation/type checks/27 pages pass. Runtime integration uses real Three.js/core/motion/world with mocked DOM/WebGLRenderer/audio; it is not ordinary-input play.

Required root commands `pnpm sync:registry` and `pnpm build:vercel` were attempted. The default pnpm wrapper failed trying to create an unavailable store. Disabling only its automatic dependency check exposed the tsx CLI IPC EPERM; invoking the existing scripts with Node's tsx loader works. No package-manager or dependency changes were committed. The full all-project aggregate build is not claimed to pass; unrelated registry timestamps were preserved.

Fresh dot-cloud preview: supported http://terminal.local:4173 returns 502 Connection refused; server launch succeeds, but its documented same-context readiness request fails at bwrap mount setup (`/root/.codex` not a directory). This is a verified infrastructure error, not a permission denial. Browser WebGL, ordinary-input gameplay, audible quality and measured frame rate remain unverified. No private-Site sign-in, auth bypass, wider sharing or user-desktop access was used. The new specification's actual-play gate is not passed, so later phases must not be claimed complete.

## Assault rifle foundation: work started, actual-play gate pending
The 0.6 checkpoint is committed and deployed separately. Source review shows three legacy weapons driven by fixed arrays, no distinct magazine/chamber state, no tactical/empty reload differentiation, no buffered firing or fire-mode state, reused pistol geometry, and synthetic-only audio. These are the next rifle-focused deficiencies. No new phase is passed. The cloud-browser private Site is waiting for authorization to follow its ChatGPT sign-in link; local preview attempts have not produced a rendered game.


## October 8 creator feedback
The user actually played and reported excessive weapon screen occlusion. The next rig revision must preserve a clear central view and measure hip/ADS footprint. Movement must reduce stamina, including walking, with greater sprint drain and discrete jump/slide cost; stopping restores it and exhaustion must not trap the player. The creator adds perpetual surface night: atmospheric conditions prevent sunlight reaching the ground, while the upper-atmosphere event remains unexplained. Do not assert that the star physically disappeared or invent the cause. This game-specific refinement does not edit the external canon repository. Lighting uses restrained ambient readability and visible local work lamps, not a blanket grey/black filter. User also selected Pixabay explicitly for firearm samples; the final audio source must follow that request and its license.


### 0.7 implemented source checkpoint; actual-play gate remains unpassed
R-4 is now the selected starting weapon. Separate magazine/chamber state, auto/three-round burst, bounded trigger buffering, sprint/switch/ADS gates, tactical/empty/chamber-only reload stages and cancel-safe ammunition/recovery are integrated. Range falloff, body/head/limb hits, armor absorption and separate impact markers are exercised in deterministic tests. Three legacy weapons remain preserved; they are not claimed to meet the new rifle quality milestone.

Actual model triangle coverage was measured and its CPU diagnostic pixels inspected. Hip occupancy is about 6.3–6.5% for legacy weapons and 10.52% for R-4; rifle ADS is 9.22–9.23%. Central hip aim neighborhoods are clear at 640×360 and 960×540. These are geometry masks, not GPU/lighting/play screenshots. The rifle has an original receiver/stock/handguard/magazine, forward support grip and aligned open optic, authoritative ADS progress, accumulated recoil and staged reload hand/bolt presentation.

Movement now drains by actual displacement: walking 2/s, sprint 10/s, grounded rest 24/s; jump 10, slide 28 and dash 45 are discrete. Zero stamina disables sprint but keeps 2.8m/s walking available, recovering out of fatigue at 18. Blocked motion does not spend movement stamina. Night lighting removes direct sunlight and uses seven bounded local light sources plus subtle readability fill; work-lamp posts collide correctly. The creator's upper-atmosphere mystery remains unexplained.

The 28-cue rifle bank is built only from verified Pixabay downloads; raw MP3s are outside the repository. The game includes provenance/credits and no standalone audio pack. Samples cover recorded close attacks/body/action, indoor/outdoor variants, suppression mixes, magazine phases, charging, trigger, casing-floor contact and distinct material/armor/body impacts. Casing contact is physically timed, reload cancellation stops its cue group, and loading/error is shown rather than silently synthesizing a missing rifle sound. Digital waveform, graph, bound/variation and exact rebuild checks passed. No sound has been heard by the agent, and no commercial-game audio-quality comparison is claimed.

Final automated suite: 340 checks pass (23 combat, 12 legacy rig, 19 motion, 34 legacy audio, 31 legacy integration, 55 movement, 15 world, 15 readability, 57 rifle state/ballistics, 13 rifle geometry, 45 recorded audio, 21 rifle integration). All integration uses mocked DOM/WebGL/audio, even where real Three.js geometry and actual source modules run. Actual browser rendering, ordinary input, listening and measured FPS remain pending. The private Site's Continue-with-ChatGPT permission question is unanswered; no SSO control was clicked. No phase beyond this source checkpoint is accepted.


0.7 build verification: app syntax and static build, registry metadata validation and launcher production compilation/type checks/27 generated pages passed. The prescribed root `pnpm sync:registry` and `pnpm build:vercel` entry points were attempted again and remained blocked before running by the environment's pnpm store creation failure. Existing scripts ran through Node's tsx loader; unrelated registry records were preserved. The full all-project aggregate remains unverified.

### Renderer startup failure repair: observed defect and acceptance plan
The actual public browser could not create a WebGL context (`GL_VENDOR` / `GL_RENDERER` disabled and `BindToCurrentSequence` failed). The pre-repair source caught renderer construction failure but rethrew before menu handlers bound; Start remained enabled and the default gameplay HUD stayed visible. This identifies an error-handling defect, not the underlying browser cause.

The repair requires a non-playable startup-error state, a working reload retry, hidden misleading gameplay UI and preserved credits. Rendererless tests must force initialization failures and verify that no mission, audio, gameplay input or RAF chain starts; existing successful-startup tests remain required. No GUI is used for this repair. Browser rendering and actual-play acceptance remain unpassed.

### 0.7.1 startup recovery: implemented and verified
Renderer construction and initial configuration are guarded. Failure logs the diagnostic without rethrowing, attempts safe cleanup of a partial renderer, and returns before any mission, sound engine, gameplay listeners or animation-frame chain is created. The menu says that 3D/WebGL could not start and that play is unavailable, offers a real page-reload retry, and suggests another WebGL-capable desktop browser or checking graphics acceleration if retries fail. It does not identify a hardware cause. Canvas/HUD/damage layers, gameplay controls/options and invalid Start/restart/fullscreen actions are hidden; credits remain a native accessible link. Start is disabled and gameplay surfaces hidden in the initial HTML until successful startup. Existing successful startup follows its normal game path. The same menu edit also repairs the malformed pistol option tag, restoring four distinct starting-weapon choices.

All 353 app checks pass: the previous 340 checks plus 13 deterministic startup checks. New coverage includes initial disabled/hidden state, caught renderer-construction failure, explicit unavailable copy, hidden stale UI, retained credits, absence of mission/audio/listener/RAF creation, ignored gameplay input and page lifecycle events, real reload calls including repeat activation, unchanged saved bank, partial-renderer cleanup and cleanup failure, normal rifle startup/fire/pause/resume with one RAF chain, and four-choice loadout markup. The rendererless harness still mocks DOM/WebGL/audio; none of these checks is a browser-render, listening or ordinary-input play pass.

The app lint command, syntax checks for both changed/new test files, static build and `git diff --check` pass. Built HTML/game scripts match source and the built credits file exists. Separate integration checks verified direct Node/tsx registry synchronization, all 11 project metadata validations, and launcher production compilation/type checks/27 pages. Required `pnpm sync:registry` and `pnpm build:vercel` entry points were attempted and blocked by pnpm's dependency-status setup trying to create the unavailable `/home/agent/.local/share/pnpm` store. The all-project aggregate is not claimed to pass. Unrelated registry timestamp changes were restored. No new GUI verification was performed during this source repair; publication is separate from these source checks. Actual rendering, play, listening and measured FPS remain blocked/unverified.
# 0.7.2 lifecycle repair acceptance plan

Source audit identified silent save failure, globally captured menu keys, ambiguous paused deployment settings, consumed full-health medkits, stale death/pause text, frame-time truncation, ignored saved contract level and starting-loadout-dependent boss armor. Add reproductions for each, preserve saved bank compatibility and verify repeated extraction/retry/replay paths without clearing stored data. Run the existing suite plus focused timing/lifecycle tests, lint/build, registry validation and required root build attempt. Local-PC testing has shown an initial 3D menu only; actual raid play and audible quality are not yet accepted. No new weapon/map/progression phase is passed by this repair.

## 0.7.2 source verification
All 392 automated checks pass: the prior 353 plus 14 pickup/armor checks, 13 rendererless lifecycle checks, 5 clock checks and 7 save-state checks. App syntax and static build pass. The independent review reproduced pending-award recovery, exact legacy level migration, terminal-state timing and the low-FPS flash fix. A 100ms frame now receives twelve 1/120s updates; normal six-second extraction completes at ten FPS. Catch-up is bounded to 30 steps (0.25s) per frame, so arbitrary long stalls intentionally drop simulation time while the separate active wall clock remains accurate. Muzzle flashes age in every simulation step and retain one rendered firing frame.

The save tests use isolated fixtures, including cash 2920; they never access the user's live save. Existing unreadable/malformed records are preserved, failed awards remain pending, and retries reread current storage and never double-credit. Menu controls keep their native keys; paused continuation keeps the current mission while new attempts use labeled deployment settings. Contextual results and pause copy no longer claim a killed target is alive. Full health/armor supplies remain in the world without false pickup messages, and boss armor is independent of starting weapon.

Required root pnpm registry/build entry points were attempted and again stopped in dependency-status setup before running due to the unavailable pnpm store directory. Direct Node/tsx registry synchronization and all 11 metadata validations passed; unrelated records were preserved. Actual ordinary-input raid play, audible quality and measured FPS remain separate open gates. No inventory, new maps or further weapon-quality phase is included in this checkpoint.

## 0.8 equipment slice acceptance plan
Begin only from the verified 0.7.2 checkpoint. Track official ARC facts separately from Dead Freight tuning; the source research confirms weight/capacity, augments, quick-use inventory and loss rules, but no exact numeric table is claimed. Require model and actual-runtime regressions for inventory actions, ammo/armor conservation, usable gadgets/throwables/healing, capacity feedback and persistent lifecycle settlement. Carry and stash data must not duplicate or vanish after a failed atomic action or repeated settlement. Preserve existing cash2920 fixtures without awarding/resetting currency during migration. No tests operate the live user's storage.

## 0.8 implemented source checkpoint
The complete release suite passes 500 checks: prior 392 plus 34 inventory, 23 inventory/mission bridge, 32 stash transaction, 13 equipment-runtime and 6 inventory-UI checks. All integration tests explicitly mock DOM/WebGL/audio; no normal-input or listening result is inferred from them. App syntax/static build, registry validation and launcher production compilation/type checks/27 pages pass. Required root pnpm registry/build entry points were attempted and stopped before execution at the same unavailable pnpm store setup; the all-project aggregate is not claimed passed. Unrelated registry records remain unchanged.

The independent review reproduced three defects before release: elevated dropped items rendered below their actual y coordinate, inventory cancellation could leave a loaded legacy weapon uncocked, and item-use cooldown could remain frozen while the bag paused the clock. Each was repaired and covered with a regression. Final unarmed drops also cancel obsolete cycle events. Inventory weight includes equipped items and loaded ammunition. Rifle insertion/cancel/drop and legacy reloading conserve quantities; gear loss and safe-pocket settlement are idempotent. Six-second extraction is tested at slow frame rates without turning the active wall-time clock into simulation time.

Legacy cash fixtures (including 2920) load without writes. First migration retains a backup; malformed records are never overwritten. Stale writes are blocked, failed deployment cannot grant the reserved equipment twice, and repeated extraction/death/recovery cannot award twice. Valid inventory fields survive an older open 0.7.2 tab banking cash and changing its schema marker. This does not claim cross-tab compare-and-swap atomicity. Pending writes remain in-page memory; reloading before persistence discards unsaved carry and offers only the last saved safe pocket through explicit interrupted recovery. These limitations are visible in the menu and documented in inventory-design.md.

The menu/preparation UI can be opened without mutating a legacy record. The separate authorized local-PC task previously verified the 0.7.2 3D menu, native focus and unchanged bank; it did not complete a raid. 0.8 browser layout, ordinary-input item/combat use, real audio listening and measured FPS remain unverified at source freeze. The creator requested this inventory slice explicitly while the R-4 quality gate remains open. No second city, sniper/new firearm class, shop/crafting, finished progression or AAA-equivalence claim is made.

## 0.8.1 visibility rollback plan
The user's actual visual feedback identifies the 0.7 brightness reduction as unacceptable. Git comparison against0.6 commit6b9e999 shows that render-style.js was unchanged; the scene and weapon illumination/background/fog were darkened. Restore those known constants first, without an unrelated postprocessing refactor. Source tests and a read-only local-PC image comparison are separate checks; ordinary raid/audio acceptance remains open.

0.8.1 source verification: all500 existing checks, syntax and static build pass. Direct registry synchronization and eleven metadata validations pass. The required root pnpm commands were attempted and hit the same store-setup failure before execution. Git diff confirms that the only runtime change is the exact baseline lighting/background/fog restoration; render-style.js is byte-identical to0.6, and all inventory/save/weapon mechanics remain untouched. Local-PC before capture showed the previous near-black world through the menu dimmer; after-publication comparison is pending. This is a visibility rollback, not an actual-raid quality acceptance.

## 0.8.2 namespace acceptance plan
Trace actual runtime storage reads/writes in isolated fixtures containing a sentinel normal bank and settings. Verify empty test initialization, menu/inventory, deployment, extraction/death, failed-write retry, interrupted recovery, restart and reload without any normal-key access. Verify normal URL compatibility and reject invalid profile selection before renderer/mission/audio/storage side effects. The resulting ordinary public URL can support authorized real input testing while preserving the user's current progress; source tests alone do not pass the gunplay/listening gate.

0.8.2 source verification: all508 checks pass, including eight new traced storage tests. The test URL starts with bank0 and no imported profile; menu/inventory, deployment, extraction, replay/reload, safe-pocket/death recovery, migration backups and failed-write retry access only the fixed test prefix. Sentinel normal bank/settings/backup and unrelated-app values remain byte-identical. Invalid/duplicate/wrong-case values create no renderer, mission, audio or storage access. Default URL preserves existing keys and hides the badge. Syntax/static build and metadata validation pass. Root pnpm commands were attempted and hit the same pre-execution store setup error. Real input/listening on the isolated URL remains a separate next check; current audio is intentionally unchanged for comparison with the upcoming repair.

## Audio repair acceptance plan
Audit transport/packaging, asset selection, decode readiness and event routing. Existing evidence: the default suppressed R4 shot severely attenuates/narrows the body while keeping a loud mechanical layer; the selected close source already contains processing and kick layers. R4 does not synth-fallback, but legacy guns remain procedural. Fix based on these findings, verify all current firearm classes and mechanics, and produce an honestly labeled comparison artifact. Audio output/listening remains unverified unless actually observed.

## 0.8.3 all-firearm recorded-audio repair
- Replaced all player/enemy gunfire, gun handling/reload/cycle/dry-trigger/switch, bullet/material/player hits and physical casing audio with 79 local Pixabay-derived WAVs. Removed prior processed kick-drum rifle source and all synthetic gun marker overlays. SMG shares a real 9 mm source with shorter decay at unchanged pitch; no independently recorded SMG claim.
- 13 raw-source SHA-256 values verified; all 79 output hashes/PCM bounds/DC/endpoints checked. Full WAV bank: 6,375,956 bytes; decoded buffers: 12,744,960 bytes. Loading remains atomic; attempted shots while loading are discarded without later replay. All gun HUDs show loading/failure.
- App test command passed all suites, including 14 procedural-world/graph checks, 98 recorded-bank checks, 31 base rendererless runtime checks and 25 rifle/all-gun integration checks. Added all-gun source routing, enemy/player body/armor hit, no synthesis on failure, timed cycle limits, and physical casing first-contact coverage for weapons 0–2. Syntax/lint and static app build pass.
- Public baseline audit returned HTTP 200 with matching original audio.js/rifle-audio.js/manifest/selected WAV hashes. This proves those checked baseline assets were deployed; it is not browser audio acceptance.
- Private 32-second MP4 compares baseline and repaired unsuppressed shot/repeat-or-burst/casing/hit/reload sequences at a common gain with original project diagnostic visuals. Verified its frame and H.264/AAC streams. It is an offline pre-mixer demo, not gameplay capture or listening approval.
- The worker has not heard the output. Actual in-game listening, ordinary-input feel, post-compressor mix/device output and WebGL quality remain open. Root registry sync and aggregate release build must run after integration with the independently maintained test-profile checkpoint.


Test cold start pending/success/failure, repeated clicks, explicit mute, stale completion after pagehide/pageshow, isolated-save preservation, and warm resume. These are mocked integration checks, not listening or browser input acceptance.

Independent integration review found and fixed hidden-menu recovery when enabling sound from a paused bag, interrupted warm-context readiness, and uncancelled legacy reload tails on quick-use. Ordinary pause/end stops every voice while retaining the unlocked context, so Escape/Tab continuation remains immediate. Hidden/blurred pages suspend audio; these genuinely interrupted contexts require reactivation and a fresh Continue click. No callback can deploy automatically.

0.8.3 integrated validation: 557 deterministic/source/rendererless checks passed, app syntax checks and static build passed. Independent read-only review verified loading/menu/cancellation fixes. Required root pnpm sync:registry and pnpm build:vercel were attempted but dependency auto-install failed before execution because /home/agent/.local/share/pnpm is absent. Direct registry generation/metadata validation and launcher production build passed (27 pages); unrelated registry rows were preserved. This is not a full aggregate pass. Actual 0.8.2 local-PC raids verified several controls/death/retry paths, but 0.8.3 recorded output, pointer-lock behavior and successful extraction still require actual checking.


## Actual-play feedback corrections
Add regression checks for synchronous/asynchronous pointer-lock failure and arrow/mouse fallback, immediate fresh-deployment HUD, and all-four-weapon enemy-only metrics. Check enemy mesh material ownership and relative tonal separation numerically, but require actual moving-contact screenshots for visual acceptance. No GPU or human-input parity claim from source tests.

0.8.4: all 563 source/model/rendererless checks passed before the final diagnostic text extension; the affected six feedback checks and syntax/static build passed again afterward. Root registry/aggregate commands were attempted and blocked by the missing pnpm-store directory before project execution. The unchanged existing registry scripts ran through the installed tsx loader against this worktree metadata and validated all projects; unrelated registry rows were restored. No full launcher/aggregate pass is claimed for this independent worktree. Actual enemy silhouette and pointer-lock cause remain for local visual/diagnostic verification.

## 0.9 acceptance plan
Start from the isolated0.8.1 visibility checkpoint. Test schema1/2/3→4 read-only migration, exact cash/item preservation, over-capacity older saves, tier costs/max capacity, insufficient funds, stale quote and duplicate confirmation, failures before/after accepted writes, retry/reload, extraction/death overflow recovery, idempotent claiming/selling and stash-to-loadout compatibility. Keep the full prior suite and separate actual read-only UI screenshots from live spending/raid verification. No broad quality claim follows from tests alone.

0.9.0 integration verification: all610 checks across26 suites passed, including66 persistence-model and13 home UI/runtime regressions. Lint and static packaging passed. Review fixed stale-tab reappearance of sold issued gear (including fresh-session UID reservation), stale-state draft refresh, precise sale removal that preserves unrelated prepared gear, focus priority, and unknown-save display. The final independent A/B draft plus failed zero-value sale/retry repro passed. No live saved state was used. Root sync/build were attempted and blocked before execution by pnpm store setup; direct unchanged registry scripts validated this worktree metadata. Full aggregate/launcher checks remain unverified here. Actual layout, successful purchase, full-stash extraction/recovery and listening remain separate tests. The0.8.4 diagnostic capture finished before publication preparation. The final read-only node-identity diagnostic extension passed the six affected feedback checks plus syntax/static build; pointer-lock behavior was not changed.

Actual0.8.4 Windows diagnostics returned WrongDocumentError with the browser message “The root document of this element is not valid for pointer lock.” Focus/visibility/user activation were true and embedded=false. Source inspection finds no removal/replacement of the gameplay canvas. Chromium maps this message/name to kWrongDocument, distinct from its detached-target message and SecurityError permission path: https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/page/pointer_lock_controller.cc . This is diagnostic evidence, not a confirmed browser-versus-app root cause.0.9 adds read-only connected/root/owner/current-node/renderer identity fields and prerendering status, without changing security settings or locking behavior.
