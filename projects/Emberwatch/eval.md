# Evaluation

Status: 0.2.0 development revision; final source, reports, and automated integration checks complete. Actual browser QA remains blocked.

## Known evidence limits

- Earlier browser attempts were blocked by an HTTP 502 preview route and `ERR_BLOCKED_BY_CLIENT` at localhost. The current supported private-site check reached a ChatGPT sign-in screen rather than the game; no unauthorized login was attempted. See `docs/QA.md` for the observation.
- No actual gameplay, screenshot review, mobile usability, browser performance, or end-to-end save/resume behavior has been verified.
- The runtime test harness uses mocked DOM, Canvas, input, audio, storage, and animation APIs. Passing it demonstrates selected JavaScript paths and assertions only; it is not browser test evidence.
- No completed release or commercial-game feature-parity claim is made.

## Historical 0.1.0 integration checks

- PASS: final game/data/style/index sources match the source handoff.
- PASS: JavaScript syntax checks across source, test, and build scripts.
- PASS: 600 seeded maps, class/relic/building definitions, and save defaults/versioning.
- PASS: isolated mock-runtime tests for seven class paths, six floors, equipment, guardian deaths, save/resume, and resource settlement.
- PASS: project static build, self-contained HTML generation, and launcher static-artifact copy.
- PASS: metadata validation and registry generation using the same repository scripts through `node --import tsx`.
- PASS: standalone CSS begins at `:root`, contains no `@import` or Google Fonts URL, and the generated HTML has no external script source.
- PASS: `pnpm build:vercel` with the environment adaptation below. All eleven static project builds and the launcher production build, type checks, page generation, and build traces completed successfully. Emberwatch's project and run routes were included.
- The first launcher type-check attempt failed because a new uncommitted project had no git-derived `updatedAt`. Committing the source and regenerating the registry from git history resolved it without changing launcher code or other projects.
- Existing projects' registry entries are preserved; generated UTC timestamp spelling differences are normalized back to their equivalent checked-in values to avoid unrelated churn.
- Build output, package caches, standalone output, and Sites configuration are excluded from the source commit.

## Release decision

Source integration is suitable for prototype review. Browser acceptance remains blocked and must be completed before any gameplay, device compatibility, performance, or release-readiness claim. No PR, main-branch merge, or deployment is part of this source integration.

### Environment note

The exact `pnpm sync:registry` and `pnpm build:vercel` commands initially failed because the tsx CLI's local IPC pipe could not bind (`EPERM`). For verification, the ignored local tsx executable was temporarily adapted to `node --import tsx` so the same repository script bodies could run without the CLI IPC server. No repository build scripts or dependencies were changed, and the executable was restored afterward. This is distinct from the browser access blocker above; no browser bypass was attempted.

## 0.2.0 verification

- Source handoff adds growth, rank gates, attributes, forging, elemental gear, skill orbs, combat buffering/impact, varied map topology, and legacy-map migration.
- PASS: JavaScript syntax checks for ten source/test/build files and extracted standalone code; 600-map connectivity/data checks; legacy growth migration/idempotency, skill unlock/rank gates, attribute allocation, forge value progression/rejected-upgrade non-mutation, legacy-map preservation, and topology diversity; seven-class evolved Q/E paths and six-floor isolated mock-runtime checks.
- PASS: static build, standalone packaging (including growth.js and no unresolved imports), source-byte comparison, and registry synchronization. These are automated checks, not real gameplay evidence.
- Added dedicated pure growth tests and refreshed QA/comparison reports for 0.2.0. The first found item now requires explicit Equip; returning axes can hit again on their return path. Responsive training/comparison styles and narrow-screen header layout are included, but their appearance is unverified.
- PASS: the final gameplay/CSS source passed the complete `pnpm build:vercel` pipeline using the documented tsx environment adaptation: all eleven project builds plus launcher compile, type checks, 27 static pages, and build traces. The subsequent version-meta/sign-in-report-only update was rebuilt and checked with the focused project/standalone workflow.
- This is a development revision, not release readiness. The requested real-play and visual comparison remain blocked.

## 0.3.0 evaluation plan

Re-run syntax, procedural-data, growth, runtime, visual projection/animation/atlas checks, static/standalone builds, registry synchronization and repository release build. Inspect deterministic portrait/landscape renderer evidence against the reference. These images are offscreen Canvas renders, not screenshots of player-controlled browser sessions. No 99% match or browser playability conclusion follows from them.


### 0.3.0 verified outcome

PASS: all focused syntax, data, growth, mocked runtime, projection/direction/animation/atlas checks; static build and standalone embedded-image validation; all eleven static projects, launcher type checks, 27 pages, and traces through the full `pnpm build:vercel` workflow. The existing tsx CLI IPC restriction required the same temporary ignored local shim described above; it was restored after the successful pipeline. Corepack's cache was scoped to /tmp.

The 0.3.0 offscreen images have been inspected. Browser gameplay remains untested, and the 99% visual target has not been established. GitHub blob creation was interrupted awaiting approval on 2026-10-08; source commit is local until the remote branch advances.

## 0.4.0 quality gates (work in progress)

1. Motion: sample each major action across 24 distinct poses; compare anchored contact sheets, limb motion, temporal order and silhouette. Visually identical duplicates fail.
2. Combat: damage/flash/SFX/contact VFX align within one simulation tick; misses cause no hitstop; startup cannot hit; cancellations remove pending events.
3. Fairness: fast tells target 300–450 ms, heavy tells 550–900 ms; lock tracking near final150 ms; 250–600 ms recovery; shape-consistent collision and bounded simultaneous attack pressure. These are Emberwatch tuning targets, not claims about commercial games.
4. Monster diversity: different response-required roles and phased guardian sequences, beyond palette/HP changes.
5. Regression: syntax/data/growth/runtime, new motion/encounter tests, static/standalone packaging, registry and full monorepo build.
6. Real browser: pursue supported private Site or preview route only. If access remains blocked, mark normal-control play, balance, sound, persistence, mobile and performance unverified; offscreen renders are not gameplay screenshots.

### Latest scope and sequence

Complete the Warrior first: idle, locomotion, three-hit sword chain, Whirling Axes Q, War Cry E, dodge, hurt, death, synchronized fantasy-RPG sound and impact. Preserve other existing characters, but defer new class/enemy art rollout until the Warrior passes its gates. Audio is original layered material/noise/resonance sample design rather than the former beep tones, with bounded polyphony, mix dynamics, and opt-in playback. Listening and normal-play acceptance remain separate from numerical audio and offscreen checks.

### 2026-10-08 continuation

The user authorized proceeding without usage checks for this task and reaffirmed dot’s cloud computer as the execution environment. First-Warrior acceptance remains mandatory before the next character or monster rollout. New enemy pattern definitions are retained as unactivated framework source; current expedition monsters keep their prior behavior until that gate.

### Bounded Canvas performance pass

Measure the integrated Warrior renderer offscreen, then add bounded viewport floor caching only if it addresses a measured bottleneck. Preserve depth sorting, fog reveal, frame margins and uncached fallback. Compare stationary/moving output and report CPU timing as offscreen evidence; browser60FPS acceptance remains pending.

### Final bounded renderer pass

PASS: bounded viewport floor cache and direct fallback, immediate fog/walkability/map/image/zoom/resize invalidation, camera movement/jumps and viewport coverage. Tall walls/pillars/statues/arches selectively fade where they obscure the Warrior, nearby active opponents or projected tells.

Flushed offscreen1280×800 CPU samples(120perpath): stationarymean43.54→29.94ms, movingmean42.87→27.53ms; p95stationary63.96→44.77ms, moving64.72→44.10ms. These31–36% mean reductions are offscreen measurements, not browser60FPS proof. One typicalcache1600×1120 uses6.84MiB; hardcap6millionpixels. Fractional-camera sampling meanerror<=3.50/255 in testedscenes, stationary0.0018/255. Cache rebuilds still cost time; targetdeviceperformance gate remainsopen.

Motion foot tests are local grounding checks, not world-space planting proof at game movement speed. Actual locomotion may still need gait/speed tuning. No subjective audio listening pass was possible: audio input is unsupported in this runtime.

## 0.4.1 Korean and player-lifecycle pass — 2026-10-08

Apply natural Korean throughout first entry, controls/HUD, catalog, rewards, growth, death/retreat, resume and repeated expeditions. Preserve stable save IDs, formulas and existing player progress. Review the full lifecycle and distinct play-style/repeat-play motivations; implement narrow verified fixes and clearer next goals. Warrior remains the first character quality gate; monster/roster expansion is not authorized by this localization pass.

Audit source and deterministic journeys while actual browser access remains blocked. Produce Korean game-screen evidence with proper glyphs and responsive layout, clearly labeled as offscreen evidence where applicable. Validate save/resume, first reward, training, equipment, death settlement and retry; distinguish tested logic/layout from human-control gameplay and listening. The 2026-10-08 approval permits the Emberwatch record in the shared generated registry to use projects/Emberwatch and the current Korean metadata; preserve every other project record and path.

## 0.4.1 — 한국어·플레이 생애주기 개선 (2026-10-08)

- 첫 진입부터 성장·보상·일시 정지·이어하기·결과·재도전까지 게임 UI와 카탈로그를 한국어로 적용했습니다. 기존 저장 장비 이름은 표시할 때만 변환하며 ID와 능력치는 유지합니다.
- SIL OFL1.1에 따라 독립적으로 만든 Korean font subset을 번들로 포함합니다. 현대 한글11,172음절과 자모를 포함하고 외부 Google Fonts 요청을 제거했습니다.
- 첫 화면의 시작 버튼을 영웅 목록보다 먼저 배치했습니다. 자원 준비/기술 습득/진화/수호자 등 다음 목표, 전사 빌드 힌트, 원정 결과와 재도전 경로를 추가했습니다.
- 보상 선택창을 닫거나 재접속해도 선택을 유지합니다. 유물 제안도 고정되어 무료 재추첨을 방지합니다. 빈 운반꾼 사용, 소모한 대상의 F 가로채기, 숨겨진 저장 실패 경고, 일부 시작 지형의 벽 속 허수아비를 수정했습니다.
- 실제 이동 키는 물리키 코드로 읽어 한글 자판에서도 작동하도록 했고, M 탐색 지도를 연결했습니다. 그림을 준비하는 동안 시작을 잠시 막아 카메라/조작 기준이 도중에 바뀌는 문제를 줄였습니다.
- 327카탈로그 표시 검사,12런타임 메뉴 스냅샷 검사,16생애주기 모의 테스트를 추가했습니다. 실제 조작·브라우저 배치·저장·사운드 청취와60FPS 검증은 아직 완료하지 못했습니다.
- 반복 플레이의 한계: 구체3종 수렴, 고정된 보상 방 순서, 능력치 재분배/장비분해 부재, 수치 중심 강화 원정. 실제 플레이 결과 없이 장기 다양성이나 밸런스를 해결했다고 주장하지 않습니다.

- 메뉴에서는 Tab 탐색과 Space 버튼 입력을 브라우저에 돌려주고, 실제 전투 중에만 게임 단축키를 가로채도록 수정했습니다.

## 0.4.1 integration checkpoint — 2026-10-08

The shared registry now points to `projects/Emberwatch` and contains the current Korean name, summary, version and git-derived timestamp. All ten other registry records match the pre-update remote content exactly. Only this generated record was authorized outside the project directory.

PASS: project syntax and the complete automated suite, all eleven metadata validations and static project builds, and the production launcher compilation/type checks/static-page generation. The tsx CLI could not create its local IPC pipe in this sandbox; equivalent repository script bodies were invoked with `node --import tsx`, with the supported local Corepack cache. No tracked build script or dependency was changed.

These integration results do not complete the Warrior acceptance gate: actual browser controls, save/reload, Korean responsive layout, sound listening and target-device 60 FPS still need verification. No character or monster rollout was enabled.
