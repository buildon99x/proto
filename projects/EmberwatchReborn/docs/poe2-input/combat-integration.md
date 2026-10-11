# R14 전사 POE형 전투 통합 계약

2026-10-10 UTC. 이 문서는 `combat.js`, `poe-skill-policy.js`, `recovery.js`와 새 `poe2-combat-integration.test.mjs`의 실행 계약이다. 사용자 지정 설계, implementation/mobility/aim/combat-inputs 문서를 읽고 기존 R12a6 실제 전투 핸들러에 opt-in 경로를 연결했다. 원본 정본의 과거 로컬 전송 제한은 requirements-source-status에 남아 있으며, 이번 작업에서 원작 클라이언트·영상 프레임을 새로 실측하거나 상업 게임 코드를 복원한 것이 아니다.

## 범위와 보존

- `state.options.controls.version === 4 && controls.poe`일 때만 새 전투 상태를 만든다. v1–3 생성/입력에는 mobility가 없고 기존 이동·기술 큐·조준 동작을 유지한다.
- 기존 damage, HP, MP/STA 비용, 기술 CD, 준비/접촉/회수시간, 투사체 속도와 사거리는 변경하지 않았다. 기존 shield_charge는 공격 기술이고 새 roll과 별개다.
- acceptBattleInput은 세계시간 0에서 허용된 스킬 또는 mobility 상태를 시작한다. 이 함수 자체는 이동, 타격, 투사체, 회복 tick을 실행하지 않는다.
- 메뉴·저장대기·입력 owner/life/STAMP 관리, 실제 화면/소리/FX, UI 설정 저장은 부모 main/controls 통합 책임이다. 이 테스트는 실제 브라우저 조작·청취·공개 배포의 증거가 아니다.

## 호출/API

### 초기화와 설정 변경

- `createBattle(state)`: controls4면 `b.poeMobility`를 만들고 기존 recovery.lock을 conservative mobility debt로 복원한다. 복원 상태는 idle이며 held/질주/구르기 방향/회피창을 되살리지 않는다.
- `configurePoeControls(b, controls)`: setControls의 성공 commit 뒤 한 번 호출한다. 기존 battle/hero/enemy 객체와 HP·MP·STA·CD·이미 시작한 기술 spec을 보존하면서 입력을 안전 정리하고 controls4 활성화/재설정 또는 legacy 복원을 한다. 남은 mobility debt는 기존 p.recoveryLock과 max 병합한다. 실패한 설정 저장이나 매 checkpoint에는 호출하지 않는다.
- `clearPoeInput(b, reason)`: router와 locomotion clear에 함께 사용한다. 예약 기술/조준/홀드 재개를 정리하고 남은 roll/knockdown debt를 보존한다. 메뉴·blur·지역/owner/life 전환·리바인딩에 쓴다. `cancelBattleAction`에도 이 호출을 연결했다. 기존 `clearBattleIntent`는 큐 소비에서도 사용하므로 의미를 넓히지 않았다.
- `resetPoeMobility(b, 'rest')`: 이미 성공 commit된 완전 회복 또는 새 life 초기화 전용이다. runtime-sync의 resetRecovery 분기에서 기존 p.action=null 이후 호출한다. held/방향/회피창을 되살리지 않고 debt까지 0으로 한다. 일반 메뉴/blur/checkpoint에는 사용하지 않는다.

### 입력 표본

기존 입력에 다음을 추가한다.

- `move`, `moveDistance`, `moveTarget`: 독립 이동 방향, 선택적 잔여거리와 현재 경로 waypoint. waypoint가 있으면 매 서브세그먼트 현재 위치에서 거리를 다시 구한다. 보행/질주가 목적지를 넘지 않게 제한하며 roll/charge/channel의 고유 이동에는 이 제한을 적용하지 않는다.
- `aim`, `aimBySkill[id]`: fallback 월드점과 resolvePoeAim 반환객체 전체. 스킬마다 별도 조준평면을 사용할 수 있다.
- `releasedAimBySkill[id]`: 저장대기 등을 거쳐 늦게 처리된 keyup 시점의 resolvePoeAim 표본. 1회만 전달한다. 진행 기술 release에 그 표본을 쓰고 Tracking OFF면 그 방향을 commit한다. 저장대기 중 이미 놓은 새 탭도 이 표본으로 시작할 수 있다. 예약 기술은 별도 규칙대로 소비 시점의 최신 live aim을 따른다.
- `heldActions`, `attackHeld`, `attackPressed`, `dodgeSprintHeld`, `sprintHeld`: 홀드와 실제 새 edge를 구분한다.
- `dodgeSprint`, `dodgeOnly`, `sprint`: 단발 pressed edge. 프레임 분할 뒤에는 재전달하지 않는다. stale held=true 표본 자체로 새 질주를 무장하지 않는다.
- `channel`: 기존 ownerToken/held/released/cancelReason 계약 유지.
- `poeInput`: main이 전달하는 설정 표본이다. 활성화 권한/설정의 원본은 committed controls이며, 임의 input 객체만으로 legacy 전투를 POE로 바꾸지 않는다. 설정 변경 시 위 configure API를 사용한다.

### 이벤트와 시각 metadata

mobility 이벤트: `roll-start/end`, `sprint-start/end`, `knockdown-start/end`. 순수 모듈의 reason/direction/offset을 보존하고 time/pose를 더한다. start/end는 해당 상태전이에서 한 번 발생한다. 새 sound 이벤트는 여기서 내지 않으므로 부모가 mobility 시작음/FX를 한 번씩 연결한다.

추가 이벤트는 `actionCancelled`(skill ID/cast ID, dodge, contactOccurred), `mobilityRejected`(입력/reason), `mobilityCancelled`(reason/debt), `heroEvaded`(melee 또는 projectile와 공격 ID)다. 기존 actionStarted/actionContact와 채널/payment/heroHurt 이벤트는 유지된다.

`b.p.presentationPose`는 state, elapsed, remaining, direction, evadeWindow, blocksSkills, recoveryDebt, source, skillId, skillElapsed, skillDuration, skillContact를 제공한다. 스킬 시작 직후에도 metadata가 갱신된다. 이것은 시각 렌더용 상태이며 피해나 저장 판정의 원본으로 다시 읽지 않는다. b.poeMobility 함수객체·held·pose·조준 컨트롤러는 저장하지 않는다.

## 명시적인 자체 튜닝

`REBORN_POE_MOBILITY_TUNING`은 Emberwatch 이식용 신규값이다. POE2 원작 실측값 또는 공식 내부 파라미터가 아니다.

| 값 | 초기값 | 목적 |
|---|---:|---|
| rollDuration | .42초 | 즉시 시작하는 짧은 고정 이동 상태 |
| rollSpeed | 310 월드단위/초 | 고정 방향 roll 이동 |
| sprintSpeedMultiplier | 현재 보행속도 ×1.5 | 질주와 보행의 명료한 구분 |
| sprintGrace | .12초 | 질주 시작의 넘어짐만 잠깐 면제 |
| knockdownDuration | .65초 | 피격 후 행동 불가 시간 |
| evadeStart/End | [0,.18)초 | roll 초반 melee/projectile 회피 후보 |

roll의 새 MP/STA 비용이나 기술 CD는 추가하지 않았다. 이는 현재 이식 프로토타입 선택이며 원작 비용의 공식 확정값이라는 주장이 아니다. 기존 slow는 보행과 질주에 적용하고, 질주는 갱신된 derived walk speed를 따른다. roll 자체의 고정속도는 이 별도 튜닝을 사용한다.

## 스킬 시간구간

production action의 elapsed/contact/duration을 기준으로 반개구간 `[start,end)`를 평가한다. 데이터의 각 경계는 `[clock, fraction]`으로 저장하고 skillTimeline이 실제 초 단위 구간으로 해석한다. 아래 C는 기존 contact, D는 기존 총 duration이다.

| 스킬 | [0,C) 이동배율 | [C,D) 이동배율 | retarget | dodge cancel |
|---|---:|---:|---|---|
| mace_swing | 0 | 1 | [0,C) | [0,.8C), [C,D) |
| righteous_hammer | .55 | .8 | [0,C) | [0,.8C), [C,D) |
| lay_on_hands | .5 | 1 | 없음 | [0,.8C), [C,D) |
| judgement | 0 | .6 | [0,C) | [0,.8C), [C,D) |
| battle_banner | 1 | 1 | 없음 | [0,.8C), [C,D) |
| zealous_onslaught | 고유 이동 | 고유 이동 | [0,D) | [0,D) |
| shield_charge | 고유 이동 | 고유 이동 | 없음 | 없음 |

이 배율·회전/취소창은 기존 Emberwatch 기술을 이식하는 자체 정책이다. POE2의 동명/비슷한 스킬에 대한 원작 프레임 대응이 아니다. 기존 incomplete presentation/test caller가 elapsed를 제공하지 않을 때만 helper가 fired fallback을 지원한다. 실제 생산 action은 모두 숫자 timeline을 가지며 fired bool로 최종 허용창을 결정하지 않는다.

Tracking OFF는 release 시점의 angle 자체를 고정한다. 플레이어가 움직였다고 고정 월드점을 향한 angle을 다시 계산하지 않는다. ON도 허용된 retarget 구간 밖에서는 고정한다. 채널 방향 역시 정책 구간 안에서만 갱신한다. 죽거나 사라진 targetId는 제거하되 가까운 다른 적에 자동 흡착하지 않는다. 큐는 기존 .18초 허용/수명 범위를 유지하고 controls4에서만 최신 aim을 갱신한다. Legacy의 반대 조준/이동에 따른 큐 취소는 유지한다.

## 상태/피해/시간 처리

- 유효 회피는 해당 스킬의 취소창에서만 허용한다. 미발생 접촉은 중단하고 이미 생성된 망치/불장판 등은 보존한다. MP·STA 환불이나 CD 되돌림은 없다. 채널 roll 취소는 release Lance를 만들지 않는다.
- roll 중 다른 roll 또는 직접 sprint press로 현재 roll을 재시작하지 않는다. roll 자체로 기본공격 held를 clear하지 않으며 끝난 시점에 유효한 반복 공격을 재개한다. 명시 기술/회피를 먼저 평가하고 기본공격/POE RMB 망치 반복은 그 뒤다.
- hurtHero는 피해종류(damageType), 공격군(attackFamily), 기존 melee/thorns 의미와 dodgeable 분류를 분리한다. cone은 melee, 실제 hostile shot은 projectile이다. circle/AoE와 burn/poison 등 환경 DoT는 roll로 면제하지 않는다. 기존 피격 invuln 처리는 변경하지 않고 roll이 그 값을 늘리지 않는다.
- sprint의 실제 피격은 기존 HP/방어/상태 처리 뒤 mobility.hit을 호출한다. 초기 grace는 넘어짐만 막고 실제 피해를 막지 않는다. 이후 피격은 knockdown이다. stun으로 roll을 탈출할 수 없다.
- 기존 radius11 X/Y swept wall sliding을 재사용한다. 현재 일반 hero 이동/roll은 적 몸과 물리 충돌하지 않는다. 작은 적 밀기/큰 적 차단을 아직 모델링하지 않으므로 모든 적 통과를 POE2 재현 완료로 표현하면 안 된다.
- stepBattle는 기존 .05초 outer cap을 유지한다. controls4에서는 새 액션을 먼저 수락한 다음 기술 정책/접촉/회수, roll/evade/grace/debt, CD, 적 공격 release, projectile 상대 sweep 접촉, hitstop 경계에서 분할한다. 한 press를 서브세그먼트마다 재사용하지 않는다.
- hostile projectile은 controls4에서 움직이는 hero와의 상대 sweep 및 접촉 deadline을 사용한다. 기존 접촉반경15는 그대로다. 따라서 .179/.18/.181초의 실제 접촉을 프레임 끝의 임의 회피 판정으로 바꾸지 않는다. 기존 타일 LOS/벽 sweep과 제한은 유지한다.
- 기존 세계 경계와 같은 1e-9 수치 허용오차로 도달한 mobility 잔차를 정규화한다. 예를 들어 .32초 debt를 정확히 소진한 뒤 1e-17 잔여 때문에 한 프레임 더 잠기는 문제를 막는다. 의미 있는 회복 시간을 줄이는 튜닝값이 아니다.

## 저장/재로드

battleReport의 기존 recovery v2 `lock`은 p.recoveryLock, 남은 action duration, mobility.serializeRecoveryDebt()의 최댓값이다. 더하거나 신규 저장 필드를 만들지 않는다. 재로드는 controls4일 때 이 lock을 mobility debt에도 보수적으로 복원하고 같은 tick으로 줄인다. lock 동안 보행/공격/회피 모두 차단하며 방향·질주·held·새 회피창을 복원하지 않는다. 메뉴/blur clear도 남은 시간은 보존한다. 실행 중 checkpoint의 runtime-sync는 현재 action/mobility를 재초기화하지 않아야 한다.

부모 persistence critical 집합에는 roll-start/knockdown-start/mobilityCancelled를 연결한다. 기존 저장대기·durability·실패 gate는 그대로 유지한다.

## 검증과 한계

새 통합검사는 실제 createBattle, acceptBattleInput, stepBattle, applyHeroStatus, battleReport, reduceRuntime, createStore/load를 호출한다. 원본 기존 검사는 수정하거나 축소하지 않았다. 최신 숫자는 아래 실행 기록에 기재한다.

- zero-time 시작과 기존 비용·접촉 보존, router의 짧은 Space tap
- 이동/조준 독립, skill별 실제 시간창, 보호창 거부, 채널 방향/취소/지불/Lance 비발생
- 이미 발생한 망치 보존, MP 환불 없음, roll 재시작 금지와 held 기본 재개
- 30/60/120Hz roll/sprint 이동 적분, 기술 contact/이동 적분, hitstop clock
- 30/60/120Hz .179/.18/.181 회피경계의 melee 및 움직이는 hero 상대 projectile 접촉
- grace 직전/정확경계/직후의 피해와 넘어짐, circle/DoT 피해
- release snapshot, OFF angle commit, ON 정책창, 큐 갱신, target 사망
- 클릭 waypoint의 반복 substep overshoot 차단, swept wall slide
- 메뉴/blur/rebind/지역/사망 정리, 설정변경 상태 보존, stale held 재개 차단
- report→정상 state checkpoint→저장→재로드, exact debt 종료, 신규 저장필드 없음

브라우저의 정상 클릭/키보드 체감, 화면/청취, 화려한 FX 품질, 프레임 비용, 지역별 실제 전투 완주, 공개 배포와 최종 전체 suite는 부모 통합 단계에서 별도로 검수한다. 이번 작업자는 브라우저·배포·Library·Git을 실행하지 않았다.

### 2026-10-10 20:54 UTC 최종 실행 기록

- 새 실제 전투 통합 검사: **98/98 통과**. 로그 `/tmp/poe-combat-test.txt`.
- 최종 인접 회귀: `node --test app/tests/poe2-*.test.mjs app/tests/combat-intent.test.mjs app/tests/combat-walls.test.mjs app/tests/attack-recovery-movement.test.mjs app/tests/expert-recovery-integration.test.mjs` → **400/400 통과**. 같은 시각 부모가 작성한 POE 입력/시각 검사도 glob에 포함된다. 로그 `/tmp/poe-final-focused-tests.txt`.
- 앞선 직접 combat import 33개 파일 실행: **1130/1130 통과**. 파일 목록 `/tmp/poe-direct-combat-tests.list`, 로그 `/tmp/poe-direct-combat-tests.txt`. 이후 최종 잔차/gait 변경에는 위 최신400회귀를 재실행했다. 이1130을 최종 전체 suite 결과로 부르지 않는다.
- 변경 source 3개 `node --check` 통과. main/UI/visual의 동시 작업 중 실행한 전체 suite에는 legacy test harness 및 build identity 실패가 있었고, 부모에게 원인/로그를 전달했다. 최종 전체 suite는 부모가 변경을 고정한 뒤 재실행한다.
- 보행/질주의 실제 이동거리로 walkPhase를 누적하고 해당 발 접촉에만 footstep을 내도록 연결했다. 30/60/120Hz 보행/질주6개, 공격 회수의 위상/무음 보존1개, 벽막힘1개 회귀가 포함된다.

최종 source SHA-256:

- combat.js: `bdb6bbd79bcb6bfb82e7e618813173ad5e750766754ec2073ba06956a481b97a`
- poe-skill-policy.js: `deb4018cbb423d2d365901228a8a83c89704907855ffaa2520631b19a4107ee7`
- recovery.js: `26720f0bce3da8830771f26fe52469b429899f2cb5c09b55124bab89bbf957e7`
- poe2-combat-integration.test.mjs: `73115b640e486dca81ce4449c3f31bf6148016f1d4b208c9817f36f0d013bc07`
