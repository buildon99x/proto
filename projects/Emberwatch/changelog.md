# Changelog

## 0.2.0 — 2026-10-07 — development revision

- Add skill and attribute point progression, rank-gated Training Grounds, forging, elemental equipment, and run-only skill orbs.
- Add combat input buffering/impact feedback, varied map topology, and legacy map migration.
- Package the new dependency-free growth module in static and standalone builds.
- Preserve an explicit untested-development warning; dedicated growth tests and updated reports are included, while real browser QA remains pending.

## 0.1.0 — 2026-10-07

- Initial original solo dungeon-crawler prototype and source integration.
- Added dependency-free static build, project metadata, deterministic data tests, and isolated mock-runtime tests.
- Documented blocked browser QA and pending release verification.


## 0.3.0 — 2026-10-08 (visual development revision)

- Original generated citadel kit and four-direction hero/guardian sheets.
- Isometric scene projection, larger floor slabs, matching wall orientation, painter-order actors, foreground wall transparency, localized firelight and embers.
- Screen-aligned movement/dodge, projected mouse targeting, compact full-viewport combat HUD and H cinematic view.
- Preserve original simulation, procedural maps, growth systems and save compatibility.
- Repair standalone art packaging; add projection, direction, animation and atlas tests.
- Offscreen portrait/landscape renders inspected; browser QA remains blocked. No numerical visual-parity claim.

## 0.4.0 — Warrior-first source checkpoint (2026-10-08)

- Moved canonical project to exact `projects/Emberwatch` path.
- Added24-sample articulated Warrior idle/run/three sword attacks/Q/E/dodge/hurt/death clips and original throwing-axe sprite.
- Separated startup/contact/recovery, added skill recovery cancel, dash-strike/counter choices, confirmed-hit impact feedback and reducedFX option.
- Replaced oscillator beeps with55original layered PCM samples, bounded mixing, variation, scheduled sword swish and interrupt cancellation.
- Fixed held-basic skill starvation, unavailable-skill recovery exploit, canceled ghost contacts, terminal projectile collision loss, combo cancel state, and saved-death resurrection.
- Preserved new role/pattern framework as disabled source until Warrior acceptance, then one-opponent verification.
- Added source, motion, audio and combat regressions; updated standalone offline bundling.
- Known gates: actual browser play/listening and60FPS pending; shared registry integration was authorized and is recorded in the 0.4.1 integration checkpoint below.

- Added bounded floor caching and foreground actor/threat-aware fade; offscreenmean31–36% faster in the measuredCPU scenes, browser60FPS still unverified.
- Added intentional dash-strike iframe tradeoff and evade counter opportunity; isolated regressions pass.

## 0.4.1 — 한국어·플레이 생애주기 개선 (2026-10-08)

- 첫 진입부터 성장·보상·일시 정지·이어하기·결과·재도전까지 게임 UI와 카탈로그를 한국어로 적용했습니다. 기존 저장 장비 이름은 표시할 때만 변환하며 ID와 능력치는 유지합니다.
- SIL OFL1.1에 따라 독립적으로 만든 Korean font subset을 번들로 포함합니다. 현대 한글11,172음절과 자모를 포함하고 외부 Google Fonts 요청을 제거했습니다.
- 첫 화면의 시작 버튼을 영웅 목록보다 먼저 배치했습니다. 자원 준비/기술 습득/진화/수호자 등 다음 목표, 전사 빌드 힌트, 원정 결과와 재도전 경로를 추가했습니다.
- 보상 선택창을 닫거나 재접속해도 선택을 유지합니다. 유물 제안도 고정되어 무료 재추첨을 방지합니다. 빈 운반꾼 사용, 소모한 대상의 F 가로채기, 숨겨진 저장 실패 경고, 일부 시작 지형의 벽 속 허수아비를 수정했습니다.
- 실제 이동 키는 물리키 코드로 읽어 한글 자판에서도 작동하도록 했고, M 탐색 지도를 연결했습니다. 그림을 준비하는 동안 시작을 잠시 막아 카메라/조작 기준이 도중에 바뀌는 문제를 줄였습니다.
- 327카탈로그 표시 검사,12런타임 메뉴 스냅샷 검사,16생애주기 모의 테스트를 추가했습니다. 실제 조작·브라우저 배치·저장·사운드 청취와60FPS 검증은 아직 완료하지 못했습니다.
- 반복 플레이의 한계: 구체3종 수렴, 고정된 보상 방 순서, 능력치 재분배/장비분해 부재, 수치 중심 강화 원정. 실제 플레이 결과 없이 장기 다양성이나 밸런스를 해결했다고 주장하지 않습니다.

- 메뉴에서는 Tab 탐색과 Space 버튼 입력을 브라우저에 돌려주고, 실제 전투 중에만 게임 단축키를 가로채도록 수정했습니다.

- Connected the canonical `projects/Emberwatch` path and Korean 0.4.1 metadata in the shared registry; preserved all other project records. Eleven-project build and launcher production checks pass, while actual-play acceptance remains open.
