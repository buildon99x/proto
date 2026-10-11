# R7 잿바람 고갯길 독립 모듈

2026-10-09 UTC. R6 채석장 후의 **작은 숙련 캠페인 확장**. 다음 신호 복원 지역, 용광로, 신호 묘실, Expert/Master 승급과 전체 전사 캠페인 완료는 이 범위가 아니다.

## 출처와 검증 경계

- 읽은 기준: `docs/requirements/warrior-completion-checklist.md`와 `docs/r6-adept-route-proposal.md`. 정본 v1.1 / Library version 2 원문은 기존 기록상 로컬 materialize 차단 상태이며 이번 모듈에서 원문을 새로 확보했다고 주장하지 않는다.
- 적 수·XP/골드·보급 예산은 R6 제안의 P행을 유지한다. 새 지도·HP/피해·전조·비문·구조·무료 지름길·신호 순서는 **Emberwatch 조정**이며 원작 지도/대사/측정값의 복원이 아니다.
- 새 아트/오디오는 생성하지 않았다. 기존 `relic`, `bird`, `shrine` 시각 유형과 기존 적·telegraph 렌더링 자산을 사용한다. 적의 circle/cone/line은 기존 generic pattern 처리기다. 새 지형 높이 판정, 엄폐 전용 AI, 후퇴 AI 또는 독자 전투 자원을 추가하지 않았다.
- 이 파일과 전용 테스트는 순수 도메인/실제 runtime/save/controller 검증을 기록한다. 스크립트 좌표·처치 보고는 실제 일반입력 전투나 플레이 시간의 증거가 아니다. 브라우저 일반입력·배포 검증은 부모 통합 작업의 별도 책임이다.

## 파일과 인터페이스

| 파일 | 소유 범위 |
|---|---|
| `app/src/pass-content.js` | standalone 불변 region/foe/link/group/reward/tool 데이터. 공통 runtime/world import 없음 |
| `app/src/pass.js` | 명령·조건·고정 보상·진행 정합성·포털 허용 |
| `app/src/pass-presentation.js` | 부작용 없는 오브젝트·진행·에다 뷰 |
| `app/tests/pass.test.mjs` | 신규 모듈/통합 검사. 부모 소유 earned-quarry fixture 재사용 |

- Content exports: `PASS_REGIONS`, `PASS_FOES`, `PASS_LINKS`, `PASS_GROUPS`, `PASS_REWARDS`, `PASS_TOOLS`, `PASS_PROGRESS_DEFAULTS`, `PASS_RECEIPTS`, `PASS_SEQUENCE`, `PASS_RUNE_NAMES`.
- Domain exports: `PASS_COMMANDS`, `reducePass`, `validatePassProgress`, `passPortalAllowed`, `passTierAllowed`.
- Presentation exports: `passObjectView`, `passGuidance`, `passElderView`.
- 명령은 `acceptPassQuest`, `interactPass`, `reportPassQuest`. 필수 필드 `type/position/life/vitals`, 상호작용은 `objectId`, 선택 필드는 `recovery`뿐이다. 클라이언트 보상·XP·순서 값·플래그는 받지 않는다.
- 성공 이벤트는 `passChanged`와 필요 시 `passReward`, `levelUp`, `passClueRead`, `passSignalAdvanced`, `passSignalReset`. reset 이벤트는 한글 이유와 다음 룬을 제공한다.

## 진행·영구 기록 계약

수락 전에는 다음 필드가 **전부 부재**인 기존 저장이 정상이다. 자동 수락/자동 migration 지급은 없다.

| objective | 범위 / 의미 |
|---|---|
| `pass_accepted` | 수락 이후 1 |
| `pass_clue_read` | 0/1, 비문 및 비소모 `pass_rune_note` 사본 |
| `pass_rescue_complete` | 0/1, 길잡이 구조 |
| `pass_signal_step` | 0–3, 현재 올바른 순서 prefix 길이 |
| `pass_signal_aligned` | 0/1, step=3과 정확히 일치 |
| `pass_shortcut_open` | 0/1, 구조 뒤 선택적으로 연결한 독립 밧줄길 |
| `pass_reported` | 0/1, 에다에게 최종 보고 |

영구 영수증은 `r7:p:accept`, `r7:p:clue`, `r7:p:rescue`, `r7:p:align`, `r7:p:shortcut`, `r7:p:report` **6종만** 허용한다. 각 완료 flag와 영수증은 양방향으로 일치한다. 알 수 없는 pass flag/tool/receipt, 일부만 존재하는 진행 필드, 미래 그룹 처치, unknown foe ID, 방문 없이 남은 pass 처치 레코드(빈 배열 포함)를 거부한다. partial step은 clue+rescue+signal5 처치 이후만 허용하고 step3/align/align receipt를 함께 검증한다.

`claimedRewards`는 영구 원장이며 퍼즐 UI 상태로 사용하지 않는다. 잘못된 순서는 `pass_signal_step`만 0으로 되돌린다. 기존 영수증·도구·처치·재료·골드·XP는 제거하지 않는다. 이미 완료한 신호를 다시 조작하면 `ALREADY_CLAIMED`로 무변경 거부한다.

입장/수락은 실제 `adept` 티어, `adept_commission=1`, `quarry_reported=1`, `r4:report`, `r5:promote:adept`, `r6:q:report`와 채석장 진행 정합성을 요구한다. 생존·현재 life·실제 위치의 76거리·LOS·최대 자원·회수 상태를 검사한다. 수락은 XP/G/치유/스킬/기존 적 리셋을 주지 않는다. 보고는 에다 근처에서 signal_aligned만 추가 요구하며 특정 레벨·지름길·금화·추가 기술을 요구하지 않는다.

**상위 티어 호환 TODO:** 현재 실제 승급 구현은 Adept까지이므로 `passTierAllowed`는 명시적 `['adept']` 집합으로 격리했다. Expert/Master 저장을 도입할 때 이 helper뿐 아니라 기존 `validateQuarryProgress`와 `validatePromotion`의 exact-Adept 조건도 함께 확장해야 한다. 상위 티어에 올랐다는 이유만으로 이미 얻은 고갯길/채석장 기록을 무효화해서는 안 된다.

## 닫힌 목표 루프

1. 에다에게 수락하고 마을 서쪽 입구로 진입한다.
2. 서쪽의 혼합 적5명을 처치하고 북쪽 외딴 비문을 읽는다. 사본에 **바람 → 불꽃 → 돌**을 명시한다. 비문 재독은 무료·무보상이며 장치와 진행 UI에서도 순서를 볼 수 있다.
3. 원래 입구 쪽으로 내려와 열린 동쪽 통로로 구조 구역에 들어간다. 혼합 적5명을 처치하고 길잡이를 구조한다.
4. 남동쪽 밧줄길은 이 시점에 무료로 연결 가능하다. 신호대 적을 처치하거나 퍼즐을 완료할 필요가 없다. 연결 자체는 회복/보상을 주지 않는다. 이 선택을 건너뛰고도 완료·보고할 수 있다.
5. 북동쪽 통로로 신호대에 올라 마지막 혼합 적5명을 처치한다. 중앙 바위 양쪽의 무료 우회로로 사수의 직선 LOS를 끊을 수 있다.
6. 북서쪽 바람 → 북동쪽 불꽃 → 남서쪽 돌 장치를 조작한다. 올바른 입력은 partial step만 저장하고, 세 번째 입력이 고정 보상을 원자적으로 지급한다. 오입력은 0/3으로 초기화하며 비용/획득 보상 손실이 없다.
7. 밧줄길 또는 서쪽 입구로 마을 귀환 후 에다에게 보고한다.

부분 정렬은 실제 store reload, 마을 왕복, rest, 죽음/retry 후 유지된다. 일반 전투 저장과 동일하게 처치된 적만 영구 제거하며, 미처치 적의 실시간 HP/위치를 완전 중단/재개 저장한다고 주장하지 않는다.

## 고정 전투·경제

모든 적은 `tier:'adept'`이며 세 그룹마다 추격병2+사수2+선봉장1이다. 각 그룹200 기본XP/24G, 총15명600 기본XP/72G. 난이도·레벨 감쇠는 기존 kill settlement에 맡기고 objective XP에는 적용하지 않는다.

| kind | HP / armor / 이동 | 기본 피해 | XP / G | 기존 엔진 패턴 |
|---|---:|---:|---:|---|
| `pass_raider` | 60 / 2 / 78 | 9 | 35 / 4 | cone48, 반각.7, 준비.85/회수.9초 |
| `pass_ranger` | 48 / 0 / 44 | 9 | 40 / 5 | line260, 폭16, 속도225, 총거리420, 준비1.1/회수1.2초 |
| `pass_elite` | 90 / 12 / 48 | 14 | 50 / 6 | circle84 준비1.15/회수1.2 → cone100 반각.75 준비1/회수1.1초 반복 |

선봉장은 HP를 늘려 시간을 채우지 않고 원 밖으로 피하는 판단과 옆으로 피하는 판단을 번갈아 요구한다. 준비 때 원 중심/방향이 고정되며 모든 전조는 .8초 이상이다.

| receipt | XP | G | 재료/소모품 |
|---|---:|---:|---|
| `r7:p:clue` | 80 | 10 | 비소모 사본1 |
| `r7:p:rescue` | 90 | 20 | 없음 |
| `r7:p:align` | 130 | 40 | iron3 / wood3 / thread2 / ember_shard1 / health_potion1 |
| `r7:p:report` | 90 | 60 | 없음 |
| 목표 합계 | 390 | 130 | 위 보급1회 |

Pass 추가분은 Easy/Normal990XP 또는 Hard/Serious840XP, 모든 난이도202G, 위 보급1회다. 필수 진행 재료/골드 비용은0이다. 보상 테이블은 코드에 고정하며 클라이언트가 조절하지 못한다. 재지급/금화·재료·영수증 상한/잘못된 입력은 기존 호출자 상태를 변경하지 않는다. Quest reward의 레벨업도 보고된 HP/MP/기력·CD를 자동충전하지 않는다.

## 지도·통합 계약

- region `ashwind_pass`, 30×24타일(960×768), spawn `(80,688)`.
- 서쪽 입구와 북쪽 비문 선반, 동쪽 구조 마당, 북동쪽 신호대를 연결한다. `pass_clue_read`가 동쪽 통로를, `pass_rescue_complete`가 신호대 통로를 연다.
- 신호대 중앙 `(608..703,192..287)`의3×3타일은 바위다. 좌우 길 모두 무료이며 hero-size clearance로 연결된다.
- town entry `(112,320)` → pass `(80,688)`. town shortcut `(112,544)` → pass `(848,688)`.
- 일반 귀환은 pass `(80,704)` → town `(144,320)`, 선택 밧줄길은 pass `(848,688)` → town `(144,544)`.
- 부모 통합은 world의 region/foes/links, state validator/reducer, travel gate, 입력/오브젝트/에다/가이드와 기존 시각 자산을 연결한다. 본 모듈은 공통 파일·version·배포를 독자 변경하지 않는다.

## 새 검증 증거

명령: `node --test app/tests/pass.test.mjs`.

- 신규 **42/42 통과**, 마지막 실행 2026-10-09 UTC. 기존488개 이력을 이 숫자에 합산하지 않았다. 전체 최종 스위트는 부모가 다시 실행한다.
- 최초 geometry 검사는 `mapFromRegion(PASS_REGIONS...)`로 만든 **standalone tile fixture**다. 실제 통합 portal destination/clearance 검사는 별도 실행하고, runtime/scene 일반입력 검증과 구별한다.
- 8가지 earned-route 조합(Easy/Normal/Hard/Serious × 최소/기존전처치), 실제 승급·퀘스트·처치 정산·원장 검증. XP/level/skill/quest flag 직접 주입 없음.
- 최소 경로 Pass 보고 후 Easy/Normal2621XP L10, Hard/Serious2269.5XP L9, 누적42처치. 기존전처치 경로는2855.5XP L10 또는2475.125XP L9, 누적64처치.
- v1/v2/v3 구세이브 무수정 로드, 수락0XP/G/치유, 원격 비문 무료 재독, 독립 무료 지름길, 오입력 원장보존, 완료 반복거부, 정확한 보급.
- partial1/3·2/3 실제 store reload/return/rest/death/retry, 마지막 적 동시 사망, 이전생명 이동/행동, 무효 자원/recovery, 입력 오염/getter/cycle, overflow 불변성.
- final rune pre-head/post-head 실패와 `COMMIT_UNCERTAIN` 처리, 재로드 후 정확히1회 지급, 두 탭 revision 충돌, queued report 중복거부.
- 기존 실제 AI handler의 circle→cone 교대 전조와 초기 중심 고정, 실제 구매한 치유/재생 버프의 paid-mana/CD/regen 상태가 수락/입장/재로드 후 유지됨.

별도 일반입력 검수가 아직 필요하다: 각 그룹 압박/회복 선택, 번개/균열 양쪽 빌드, 저자원/저스탯 경로, 장치 클릭·E·재매핑/가상입력, 지도에서 다음 행동 발견, 정상 브라우저 save/reload 및 실제 완주. 모듈 테스트만으로 이 항목을 완료 처리하지 않는다.
