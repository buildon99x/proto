# Verification record — 2026-10-07

## Passed, automated only

1. JavaScript syntax checks (`node --check`).
2. 600 seeded floor maps: all 12 room centers connected to the starting room; expected guardian-floor flags.
3. Seven class definitions / three specialization labels each; unique eighteen-trinket roster; seven building definitions.
4. Save defaults and version migration fallback.
5. Mock-runtime smoke: seven classes' two skills, basic attacks, six floor render code paths, equipment generation, guardian death hooks, inventory/guide/town UI construction.
6. Mock-runtime resource settlement: death retains 60% at no upgrades; victory retains 100%.
7. Mock-runtime save/resume restores floor state.
8. Self-contained HTML generation; no module/network dependencies in the single-file edition.

## Not passed / not performed

Actual browser interaction and screenshot QA could not start. The first browser action was initially not approved, then its exact authorized retry succeeded. The preview page returned HTTP 502 / `[Errno 111] Connection refused`. The preview server was also launched visibly through the cloud desktop terminal; the proxy still returned 502. The exact localhost address printed by the server was explicitly blocked with `net::ERR_BLOCKED_BY_CLIENT`. Testing stopped rather than trying an alternate route around that restriction.

No genuine game screenshots, human-style gameplay, fresh-game victory, death/restart, user-interface equipment changes, browser reload persistence, touch responsiveness, frame-rate or long-session stability are claimed. Read-only WebMCP registration/behavior could not be validated in a supported browser context either.

## Required manual acceptance checklist

- [ ] Fresh start: choose each of four starter classes; begin expedition; read controls
- [ ] Move, aim, attack, dodge, both skills, potion; verify collision/telegraphs
- [ ] Clear a room; collect gold/materials; open chest; equip loot
- [ ] Bank half a haul; verify exact resource deltas
- [ ] Select one trinket from three; verify its effect
- [ ] Die; verify equipment/XP retained and resource settlement; buy a town upgrade
- [ ] Defeat each guardian and final boss without injected state; verify unlocks/NG+
- [ ] Reload during a run, resume, and verify persistent position/resources/enemies
- [ ] Repeat an expedition and verify town/hero progression
- [ ] Check small-screen/touch controls and browser audio after explicit opt-in

## Code-review fixes before handoff

- Pending resume survives sound/guide use rather than being erased by an unrelated save
- Chests guarantee access to both wood and stone in early floors so initial town upgrades are attainable
- Treasury and Chapel descriptions now match their actual resource-loss effects

## Quality conclusion

This is a smaller original prototype. Its systems are substantially narrower than the commercial game. Automated checks are useful fault detection, not evidence of equal play quality. See review.html for exact gaps and sources.

## Growth / combat / map revision 0.2.0

Added permanent skill-point spending, rank gates, five attribute allocations, persistent equipment forging, elemental traits, first-chest equipment guarantee, equipment comparison grid, skill spheres, a training dummy, rank-3 behavior changes, short input buffering, dodge attack cancellation, impact pause/stagger, varied map connectivity/room shapes/corridor widths/encounter packs. Old in-progress maps keep the legacy generator.

New `app/tests/growth.test.mjs` passes legacy migration and idempotency, learning/rank restrictions, costs, attribute allocation, forging/denial non-mutation, legacy-map equality, and topology diversity. Mock-runtime tests now explicitly exercise evolved Q and E for all seven classes. No one should confuse these with actual gameplay evidence.

Reference pixels inspected: official Steam inventory screenshot `ss_8570e9fd7db5c2e91955df2e5686668794d84223.jpg`. It shows adjacent equipped/candidate cards, rarity-colored item slots, clear weapon/attribute requirements, detailed item effects and a dense backpack grid. The new armory adopts comparison-first layout with independently drawn icons. Reference art is not shipped.

Current visual assessment is incomplete: no new-build normal-play screenshot or subjective feel measurement has been obtained. A 98% visual match is neither measured nor claimed. The UI/growth revision can be assessed from source and logic tests only until supported authenticated browser access is available.

### Current private-Site check

The published Emberwatch URL was opened through the supported cloud browser on 2026-10-07. It returned the site's ChatGPT sign-in screen (Korean “접속하려면 로그인하세요” / “ChatGPT로 계속”), not the game. No sign-in was attempted without authorization. This is the current blocker for baseline/new-build screenshot comparison and ordinary-control growth-loop testing; it is not evidence that the game rendered or played correctly.


## 0.3.0 generated-art revision — 2026-10-08

PASS: source syntax; 600 seeded maps; growth/migration/forge checks; seven-class mock-runtime paths; 441 projection/inverse cases at three viewport shapes; all four facing directions and animation states; 48 RGBA atlas rectangles/anchors; static packaging; standalone syntax and all three embedded PNG atlases.

Portrait and landscape images under `assets/screenshots/visual-0.3.0/` are deterministic offscreen Canvas renders of the actual visual module. They confirm integration, depth ordering, stone scale, wall orientation and anchored actors. They are **not browser gameplay screenshots**. The hero sheet check shows all 16 anchored poses.

Remaining limits: supported cloud preview remains HTTP 502; private Site browser access requires ChatGPT login approval and no login/bypass was attempted. Actual play, browser input, save/reload, mobile controls and frame rate remain unverified. Original generated art is closer in palette/material/perspective, but composition and architecture differ from the supplied reference. A 99% match is neither measured nor claimed. All classes share one hero sheet and all enemy types share guardian art; dedicated class/enemy sheets remain future work.

Packaging repair: the former standalone generator omitted visual modules and the PNG atlases. The updated generator embeds all required modules and all three RGBA sheets into one offline HTML artifact.

## 0.4.0 Warrior-first checkpoint — 2026-10-08

PASS:27-file JavaScript syntax checks at the focused gate;600seeded-map checks; growth/save migration/forge invariants; seven existing class regression paths; Warrior delayedcontact/dodge/axes/War Cry/death;11specific collision/input/save regressions;9audio sample/mix-contract checks;960distinct articulated joint signatures excluding root shifts/alpha; pose-contact remapping, stance-foot and loop tests; RGBA/bounds; static build; standalone bundling with six embedded image references and one PCM bank. These are automated/offscreen results.

Offscreen video and contact sheets were visually inspected; side-strike direction, windup silhouette and corpse leg/clipping defects were corrected. Audio is source-generated layered PCM; this runtime does not support audio input, so no subjective listening pass is claimed.

Fresh browser route check: a PythonHTTPserver launched successfully in dot’s desktop terminal, serving4173 from the shared project. The supported terminal.local4173 browser proxy nevertheless returned502Connection refused. No localhost-policy bypass, local-file browser workaround, private-login attempt or sharing change was made.

Required before Warrior acceptance: normal controls throughout a run, attack/skill/dodge feel and balance, real sound mix, actual reload/save flow, target-device60FPS, readable danger under crowded combat. No rollout to another character/monster before this gate.

### Final bounded renderer pass

PASS: bounded viewport floor cache and direct fallback, immediate fog/walkability/map/image/zoom/resize invalidation, camera movement/jumps and viewport coverage. Tall walls/pillars/statues/arches selectively fade where they obscure the Warrior, nearby active opponents or projected tells.

Flushed offscreen1280×800 CPU samples(120perpath): stationarymean43.54→29.94ms, movingmean42.87→27.53ms; p95stationary63.96→44.77ms, moving64.72→44.10ms. These31–36% mean reductions are offscreen measurements, not browser60FPS proof. One typicalcache1600×1120 uses6.84MiB; hardcap6millionpixels. Fractional-camera sampling meanerror<=3.50/255 in testedscenes, stationary0.0018/255. Cache rebuilds still cost time; targetdeviceperformance gate remainsopen.

Motion foot tests are local grounding checks, not world-space planting proof at game movement speed. Actual locomotion may still need gait/speed tuning. No subjective audio listening pass was possible: audio input is unsupported in this runtime.

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

## 0.4.2 — 전사 피드백 수정 (2026-10-08)

- 사용자가 지적한 함성의 저음 합성음을 spookymodem의 Battlecry(CC BY 3.0) 기반 음원으로 교체했습니다. 짧은 갑옷 접촉음을 낮게 섞고 무음·필터·음량을 정리했습니다. 저자·원문·라이선스·변경 표시는 게임 안내와 배포 파일에 포함합니다. 다른 53개 PCM 샘플은 이전판과 바이트가 같습니다.
- 마우스를 한 번 움직이면 이동 방향 갱신이 멈추던 상태 의존성을 제거했습니다. 일반 이동은 실제 이동 방향을 따르고, 공격·기술 중에는 확정된 조준을 유지합니다. 회피는 회피 진행 방향을 봅니다.
- 달리기와 발소리에 하나의 실제 이동 거리 기반 주기를 사용합니다. 네 방향 atlas의 왼발 0번·오른발 12번 접지를 시각적으로 확인했습니다. 독립 0.28초 타이머는 제거했습니다. 정지·벽 충돌·공격·피격·회피·메뉴에서는 발소리를 내거나 누적하지 않습니다.
- 발소리 이벤트 gain을 0.22에서 0.085로 낮췄습니다(−8.26 dB). 잔향을 없애고 좌우 발 변형의 음량을 균형 있게 유지합니다. 출력 장치에서의 체감 음량 평가는 별도입니다.
- 8방향 입력, 마우스 호버·공격 전환, 터치, 대각선 정규화, 속도 증가, 30/60/120 Hz 및 100 ms 지연, 벽, 회피 종료, 정지·일시 정지 회귀를 통과했습니다. 정확한 주기 경계에서 중복 접지가 발생하던 부동소수점 문제도 수정했습니다.
- 비교 WAV와 접지 동기화 영상·포즈 시트를 제공합니다. 영상은 실제 소스 로직과 렌더러를 사용한 오프스크린 증거이며 브라우저 실플레이가 아닙니다. 청취 도구가 오디오 입력을 지원하지 않아 주관적 청음 완료를 주장하지 않습니다. 4개 방향 그림을 8방향 이동에 대응시키며, 새로운 8방향 그림을 만들었다고 주장하지 않습니다. 게임패드는 현재 지원하지 않습니다.

0.4.2 integration: all eleven metadata validations and static project builds, plus launcher production compilation, type checks and 27-page generation passed. Shared registry changes are limited to Emberwatch metadata.
