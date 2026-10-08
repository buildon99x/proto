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

## 0.4.2 — 전사 피드백 수정 (2026-10-08)

- 사용자가 지적한 함성의 저음 합성음을 spookymodem의 Battlecry(CC BY 3.0) 기반 음원으로 교체했습니다. 짧은 갑옷 접촉음을 낮게 섞고 무음·필터·음량을 정리했습니다. 저자·원문·라이선스·변경 표시는 게임 안내와 배포 파일에 포함합니다. 다른 53개 PCM 샘플은 이전판과 바이트가 같습니다.
- 마우스를 한 번 움직이면 이동 방향 갱신이 멈추던 상태 의존성을 제거했습니다. 일반 이동은 실제 이동 방향을 따르고, 공격·기술 중에는 확정된 조준을 유지합니다. 회피는 회피 진행 방향을 봅니다.
- 달리기와 발소리에 하나의 실제 이동 거리 기반 주기를 사용합니다. 네 방향 atlas의 왼발 0번·오른발 12번 접지를 시각적으로 확인했습니다. 독립 0.28초 타이머는 제거했습니다. 정지·벽 충돌·공격·피격·회피·메뉴에서는 발소리를 내거나 누적하지 않습니다.
- 발소리 이벤트 gain을 0.22에서 0.085로 낮췄습니다(−8.26 dB). 잔향을 없애고 좌우 발 변형의 음량을 균형 있게 유지합니다. 출력 장치에서의 체감 음량 평가는 별도입니다.
- 8방향 입력, 마우스 호버·공격 전환, 터치, 대각선 정규화, 속도 증가, 30/60/120 Hz 및 100 ms 지연, 벽, 회피 종료, 정지·일시 정지 회귀를 통과했습니다. 정확한 주기 경계에서 중복 접지가 발생하던 부동소수점 문제도 수정했습니다.
- 비교 WAV와 접지 동기화 영상·포즈 시트를 제공합니다. 영상은 실제 소스 로직과 렌더러를 사용한 오프스크린 증거이며 브라우저 실플레이가 아닙니다. 청취 도구가 오디오 입력을 지원하지 않아 주관적 청음 완료를 주장하지 않습니다. 4개 방향 그림을 8방향 이동에 대응시키며, 새로운 8방향 그림을 만들었다고 주장하지 않습니다. 게임패드는 현재 지원하지 않습니다.

## 0.4.3 — 발소리 음량 조정 (2026-10-08)

- 사용자 요청에 따라 0.4.2의 발소리 gain 0.085를 정확히 30% 높여 0.1105로 조정했습니다. 접지 시점·좌우 발 변형·잔향 없음·취소 동작과 나머지 소리는 유지합니다.

## 0.4.4 — 발소리 추가 조정 (2026-10-08)

- 사용자 요청에 따라 발소리 gain을 현재 0.1105에서 20% 높여 0.1326으로 조정했습니다. 접지 동기화·다른 소리·잔향·취소 동작은 유지합니다.

## Campaign M0 foundation — 2026-10-08 (source checkpoint, unreleased)

- Freeze the shipped 0.4.4 baseline and establish a separate three-class campaign save contract without converting existing expeditions.
- Add committed-snapshot recovery, legacy backup, strict JSON validation, expected revisions and shared browser write locks.
- Record Warrior, Mage and Archer four-tier reference catalogs, exact known point bands and explicit unresolved mechanics. Cached source data is not presented as current-game measurement or playable behavior.
- Add 47 focused tests and recursive source syntax checking. Existing 0.4.4 audio, locomotion and default game remain unchanged.
- Authored world/quest and inventory/economy integration, actual play, original-game comparison and campaign release gates remain open.

## Campaign foundation II — 2026-10-08 (source checkpoint, unreleased)

- Add original connected world/quest data and immutable transitions: timed and night objectives, puzzles, acquired tools, return routes and exactly-once world rewards.
- Add data-driven seven-slot inventory, trained equipment tiers, merchant cash/stock and 24-hour refresh, crafting, cooking, potion and enchantment transactions. Numeric production tables remain separate and incomplete.
- Add a controller that exposes progress only after durable commit, serializes rapid commands and blocks stale writers.
- Add fixed seven-region scene geometry with collision checks, and three offscreen scene renders. Outdoor environment art is temporary; movement/proximity, quest UI and verified combat still need runtime integration.
- The campaign foundation now has92 focused automated checks, including world/economy/save integration. This does not satisfy the normal-play gate.

## 0.4.5 — 실제 브라우저 검토와 입구 보호 (2026-10-08)

- 사용자의 명시적 요청에 따라 기존 Emberwatch Site를 공개했습니다. 신규 캠페인 완성판으로 교체한 것이 아닙니다.
- 실제 첫 진입·전투·처치·물약·상자·장비·사망/재도전·저장/재개를 확인했습니다. 일부 씨드에서 연습 공간이 적의 자동 공격에 노출되는 문제를 재현했습니다.
- 첫 방을 나가거나 실제 적에게 피해를 주기 전까지 입구를 보호합니다. 적은 드러난 위치에서 몸과 예고가 화면 안에 보인 뒤 공격을 시작하며, 예고 중 시야 밖으로 나가면 공격을 취소하고 접근합니다.
- J를 누른 채 포인터를 움직여도 키보드 조준을 유지합니다. 마우스 버튼을 직접 누른 공격은 포인터를 따릅니다. 그림 로딩 중에는 원정 재개도 기다립니다.
- 기존 원정·한국어·모션·War Cry·발소리0.1326은 유지합니다. 신규 캠페인은 별도 개발 소스이며 원작 수치와 플레이 검증은 미완료입니다.

## 0.4.6 — 수호자 실전 검토와 정확한 공격 예고 (2026-10-08)

- 실제2층 수호자전에서 확인한 예고/판정 불일치를 수정했습니다.125월드 단위 내려찍기를 포함해 실제 판정과 같은 세계 좌표를 화면에 투영합니다.
- 기존 근접·화살·마력탄·돌진·수호자3종의 공격 계획을 예고 시작 시 고정합니다. 탄도, 지연 마법진과 소환 표시를 구분하고, 벽과 수명 끝을 넘는 이동을 막습니다. 지연 마법진도 예고한 위치에 발동합니다.
- 경직·사망·재개·가시성 상실 시 남은 준비 공격과 표시를 정리합니다. 확정된 중장갑 공격은 작은 타격에 예고 범위를 벗어나 밀리지 않습니다. 기존 샘플의 적 예고/발동 소리를 이벤트에 연결합니다.
- 마지막 수호자가 돌진만 반복하던 공격 순서 증가 오류를 고쳤습니다. 새로운 몬스터 프레임워크를 활성화한 것은 아닙니다.
- 수호자전 목표 안내는 피난처 건설 대신 현재 예고와 반격을 안내합니다.27개 기하/실행 회귀 검사를 추가했습니다. 실제 재검증과 캠페인 완성은 계속 진행합니다.
