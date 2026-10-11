# R14 회피·질주 순수 상태 계약

작성: 2026-10-10 UTC. 담당 파일: `app/src/poe-mobility.js`, `app/tests/poe2-mobility.test.mjs`.

## 범위와 근거

`createPoeMobility`는 `idle / roll / sprint / knockdown` 상태와 세 입력 `dodgeSprint / dodgeOnly / sprint`를 관리한다. 브라우저, 키 바인딩, 공격, 이동 충돌, 피해, 저장 IO를 직접 실행하지 않는다. 기존 `shield_charge` 공격 기술이나 HP·피해·쿨다운·기력·마나 수치는 바꾸지 않는다.

- **공식확인:** dodge 버튼 유지로 구르기 완료 후 질주, 질주 중 피격 넘어짐, Keep Sprinting While Moving 옵션. [GGG 0.3.0](https://www.pathofexile.com/forum/view-thread/3826682)
- **공식확인:** 질주 시작의 짧은 heavy-stun 면제기간, 질주 유지 옵션 중에도 새 구르기로 중단 가능. 정확한 시간은 공개 자료에서 확인하지 못했다. [GGG 0.3.0c](https://www.pathofexile.com/forum/view-thread/3851277/filter-account-type/staff)
- **공식확인:** 질주로 이어지지 않는 별도 회피 키는 기본 미할당. [GGG 0.5.0](https://www.pathofexile.com/forum/view-thread/3932540)
- **공식확인:** 질주 버튼을 놓아서 추가 구르기가 발생하는 것은 버그. [GGG 0.5.4f](https://www.pathofexile.com/forum/view-thread/3996513)
- **사용자 설계문서:** `emberwatch-reborn-poe2-combat-controls.md` 전체 185줄을 읽었다. §2·3의 Shift 별도 달리기, §6의 즉시 회피·피해유형 구분·구르기 후 held 공격 재개를 참고한다. 별도 Shift 달리기는 Emberwatch 프리셋 설계이며 최신 POE2의 확정 기본값으로 표현하지 않는다. 현재 선택 프리셋 및 원작형/명세형 기본값은 상위 controls 통합에서 결정한다.
- **이식설계:** 방향선택, 회피 속도/지속시간/피해회피창, 넘어짐 지속시간, 직접 sprint 진입, 동시입력 순서와 저장 lock 투영은 프로젝트 설계다. 원작 내부 프레임·모든 피해의 전면 무적을 복원한 것이 아니다.

추가 출처와 불확실성은 같은 폴더의 `combat-inputs.md`, `movement-targeting-ko.md`, `implementation-contract.md`에 있다. 이 구현 작업은 기존 조사 문서를 읽고 코드를 검증했으며, 원작 클라이언트를 새로 실측하거나 공식 페이지를 새로 재조사하지 않았다. 상위 정본 v1.1/version2의 로컬 원문 부재·과거 HTTP 403 상태는 `docs/requirements/requirements-source-status.json`에서 확인했고, 현재 요구 추적표를 읽었다. 원문 파일 전체를 이 작업에서 새로 확보했다고 주장하지 않는다.

## 생성과 데이터 주입

```js
const mobility = createPoeMobility({
  tuning: {
    rollDuration, rollSpeed, sprintSpeed,
    sprintGrace, knockdownDuration,
    evadeStart, evadeEnd,
  },
  chooseRollDirection: ({moveDirection, aimDirection}) => /* 명시적인 프로젝트 정책 */,
  keepSprintingWhileMoving: false,
});
```

숫자는 **모두 호출자가 주입**한다. 모듈에는 숨겨진 기본 속도·시간·피해창이 없다.

| 필드 | 단위·검증 | 의미 |
|---|---|---|
| `rollDuration` | 초, `0 < x <= 60` | roll 전체 시간 |
| `rollSpeed` | 월드단위/초, 양수 | roll의 일정 속도 |
| `sprintSpeed` | 월드단위/초, 양수 | sprint의 일정 속도 |
| `sprintGrace` | 초, 0 이상 | sprint 진입 후 넘어짐만 막는 구간 |
| `knockdownDuration` | 초, `0 < x <= 60` | 넘어짐 시간 |
| `evadeStart / evadeEnd` | 초, `0 <= start <= end <= rollDuration` | roll 기준 반개구간 `[start, end)` |

모든 숫자는 유한한 number여야 한다. `evadeStart === evadeEnd`는 회피창 비활성이다. 60초 상한은 원작 수치가 아니라 기존 recovery v2의 lock 스키마 제약이다. 큰 값을 조용히 잘라서 재로드 후 회복 시간을 줄이지 않고 생성 시 거부한다. 프로덕션 주입값의 값·이유·적용 범위는 그 호출자와 튜닝 문서가 기록해야 한다. 테스트의 `.5 / 200 / 160 / .125 / .75` 등은 계산을 확인하기 쉬운 이진분수 fixture이며 실제 게임 밸런스가 아니다.

`chooseRollDirection`은 필수 함수다. 인자는 유효 방향의 정규화된 복사본 또는 null이고 반환도 정규화·검증한다. 어느 모드가 이동/조준을 우선하는지, 직전 이동방향을 쓸지 모듈이 추측하지 않는다. `sprint`는 항상 현재 이동방향만 사용하고 이 함수를 호출하지 않는다.

## 공개 API

```js
mobility.press('dodgeSprint', {moveDirection, aimDirection, canStart: true, repeat: false});
mobility.press('dodgeOnly', {moveDirection, aimDirection, canStart: true});
mobility.press('sprint', {moveDirection, canStart: true});
mobility.release(action);
mobility.update(dt, {moveDirection, held: {dodgeSprint, dodgeOnly, sprint}, canSprint: true});
mobility.skillStart();
mobility.hit();
mobility.clear({preserveRecovery: true, reason: 'blur'});
mobility.snapshot();
mobility.serializeRecoveryDebt();
mobility.restoreRecoveryDebt(seconds);
```

일반 반환값:

- `state`, 해당 상태의 `elapsed`, timed 상태의 `remaining`
- `direction`, 현재 `velocity`: 복사된 월드방향/초당 속도
- `evadeWindow`: 지금 roll 시간점의 피해회피창 후보일 뿐 피해면제 명령이 아님
- `blocksSkills`: roll/knockdown 또는 복원·중단 debt가 남았는가
- `recoveryDebt`: 남은 roll/knockdown/복원 debt의 최댓값
- `held`: 세 키의 관찰 상태; `source`: 현 roll/sprint의 시작 액션
- `keepSprintingWhileMoving`

`press`, `skillStart`는 `accepted/reason`을, `hit`는 `knockedDown/reason`을 덧붙인다. mutator는 `events`를 반환하며 `update`는 실제 적용 전의 의도 이동량 `delta`를 추가한다. `snapshot()`에는 이벤트가 없고 이벤트를 소비·반복하지 않는다. 모든 반환 방향·held·이벤트 방향은 외부와 독립된 복사본이다.

### 누름·홀드·해제·취소

1. 허용된 `press`는 호출 안에서 즉시 상태를 시작한다. 다음 update를 기다리지 않는다. `dodgeSprint/dodgeOnly`는 roll, `sprint`는 이동방향이 있을 때 직접 sprint다.
2. 키반복 또는 이미 held인 키는 새 edge가 아니다. 메뉴/포커스 clear 뒤 발생하는 OS repeat도 `repeat:true`로 넘겨야 재무장되지 않는다.
3. `canStart`는 현재 스킬의 **해당 시간 구간**에서 취소가 허용되는지 상위에서 계산한다. false면 거부한 edge를 소비하고, 창이 열려도 자동 시작하지 않는다. 창 길이나 전체 스킬 공통 허용을 이 모듈에 넣지 않는다.
4. roll/knockdown/debt 중 즉시 행동 시작은 거부된다. roll 중 keyup→keydown, 다른 회피키로 바꾸기, direct sprint 키 입력 모두 기존 roll의 시작·길이를 바꾸지 못한다. 단, 별도 sprint는 지속 이동 modifier이므로 실제 누름으로 무장한 held 상태를 보존하고 제한이 풀리면 다시 달릴 수 있다.
5. 회피에는 거부 입력 버퍼가 없다. 새 회피 시도는 키를 놓고 새 edge를 보내야 한다. 별도 sprint는 이와 구분한다. 정지 중 실제 Shift press 후 held를 유지하면 이동 시작 시 달린다. 스킬·회피·넘어짐·복원 lock 동안에는 기다리고, idle + 실제 sprint held + 유효 이동 + canSprint:true + debt 없음에서만 진입한다.
6. `release`는 held를 지울 뿐 roll을 시작하지 않는다. 원본 source의 키 release만 현재 sprint를 끝낼 수 있다. 다른 키를 놓는 것은 sprint를 끝내지 않는다.
7. update의 선택적 held 표본은 누락된 keyup을 반영할 수 있다. `held:true` 표본만으로 새 입력이 무장되지는 않는다. 특히 clear/restore 뒤 남은 stale sprint held:true는 달리기를 재개하지 못한다. 실제 sprint press만 무장하고 release, held:false, clear, restore가 해제한다. 입력 정리는 상위 키 캡처와 이 모듈 모두에서 해야 한다.

### roll 완료와 두 sprint 경로

- **원작형:** `dodgeSprint`로 시작한 roll이 끝날 때 그 키가 아직 held이고 유효 이동방향이 있으면 sprint로 전환한다. 회피 전용 roll이 끝날 때 다른 키가 held이어도 전환하지 않는다.
- **명세형:** `sprint` 새 edge가 현재 이동방향과 허용 조건을 갖추면 즉시 달린다. roll이 없으며 evadeWindow도 없다. 이 경로의 바인딩을 어느 프리셋에 넣는지는 controls의 책임이다.
- sprint는 시간 제한이 없다. 방향은 매 update의 이동방향을 따른다. 이동이 없거나 canSprint:false이면 즉시 종료한다. 원작형 dodgeSprint는 이동 재개만으로 자동 복귀하지 않는다. 별도 sprint는 실제 키를 계속 누르고 있으면 유효 이동과 canSprint:true가 돌아왔을 때 다시 달린다.
- Keep Sprinting은 통합 `dodgeSprint` source에만 적용한다. OFF면 dodgeSprint release로 종료, ON이면 release 뒤에도 이동 정지 또는 실제 스킬 시작 전까지 유지한다. 별도 `sprint`(Shift)는 옵션과 무관하게 자신의 keyup 또는 held:false에서 즉시 종료한다.
- ON이어도 roll 중 이미 키를 놓은 상태에서 roll 완료만으로 sprint가 시작하지 않는다.
- sprint 중 새 회피 edge는 허용 조건에서 즉시 roll로 바꾼다. standalone sprint 키가 실제로 계속 held이면 roll-only 완료 후 별도 run 상태로 복귀할 수 있다. 원작형 roll-only 자체가 질주를 생성하는 것은 아니며, 별도 Shift 입력이 없으면 복귀하지 않는다.
- 기존 sprint 중 `press('sprint')`는 source를 바꾸거나 시작 grace를 갱신하지 않는다.

### 스킬·피격과 공격 재개

`skillStart()`는 실제 허용된 스킬 시작 시 sprint를 끝낸다. roll/넘어짐/debt 중에는 false를 돌려준다. 상위는 자원·쿨다운·타겟 검사를 통과한 스킬에만 이 메서드를 호출해야 한다. 실패한 공격 시도를 이유로 먼저 sprint를 끝내면 안 된다. 스킬이 실행 중인 동안 update에 canSprint:false를 공급하고, 달리기가 다시 허용되는 구간에서 true로 바꿔야 한다. 그렇지 않으면 별도 Shift held가 다음 update에서 다시 달릴 수 있다.

`hit()`는 상위 피해 핸들러가 해당 충돌을 실제 피격으로 판정한 뒤 호출한다. sprint 경과가 `sprintGrace` 미만이면 넘어짐만 생략하고, 경계 이상이면 knockdown으로 전환한다. 이 grace는 HP/피해를 없애지 않는다. roll이나 다른 상태의 hit는 이 모듈에서 상태를 변경하지 않으며 재피격으로 넘어짐 시간이 늘어나지도 않는다.

공격 held와 attack 반복은 이 모듈 밖이다. **회피 시작만으로 전체 공격 입력을 clear하면 안 된다.** 공격 held는 회피 후 상위 스킬 허용조건을 다시 만족할 때 재개할 수 있다. 반대로 메뉴/포커스/사망/life/owner/STAMP/지역/리바인딩 중단은 상위 캡처를 포함한 안전 clear가 필요하고 새 입력이 필수다.

## 이동·회피·연출의 통합 책임

`update(dt)`는 큰 한 프레임이 roll 끝을 가로지르면 roll 구간과 sprint 구간을 나눠 적분한다. 따라서 고정된 입력에서 프레임 분할과 무관한 이동량을 준다. roll 방향은 시작 시 고정되고 sprint 방향은 현재 이동방향을 사용한다. idle/knockdown/debt에서는 이 모듈의 이동량이 0이다. **일반 보행은 별도 이동 계층의 책임**이다.

- 부모 combat는 `delta`에 `traceSegment` 등 실제 충돌을 적용한다. 이 모듈은 벽/코너/적을 관통시켜도 되는지 판정하지 않는다. 실제 collision 결과를 의도 이동량으로 오인하면 안 된다.
- `evadeWindow`는 업데이트 후 현재 시간점의 boolean이다. 과거 프레임 전체에 소급되는 전면 무적이 아니다. 시간 경계를 가로지르는 피해의 실행 순서는 상위 시뮬레이션이 정한다.
- 부모는 투사체/근접/광역/지면위험/DoT/불가피한 피해 분류를 적용해야 한다. 특히 **광역·DoT를 evadeWindow 하나로 면제하면 안 된다.** 이 모듈은 damage나 `p.invuln`을 수정하지 않는다.
- 부모가 상위 스킬을 실제로 취소한 뒤 mobility 시작 이벤트를 연출해야 한다. 전투 접촉/피해/비용/저장 영수증은 기존 전투 핸들러에 남는다.

이벤트는 `roll-start/end`, `sprint-start/end`, `knockdown-start/end`다. 각 이벤트는 `reason`, `direction`, 해당 메서드 step 안에서의 `offset` 초를 담는다. 성공한 상태전환만 한 번 발생하며, 거부/반복/스냅샷은 새 연출 이벤트를 만들지 않는다. press/release/hit/clear의 offset은 0이고, roll/knockdown 완료는 update 내부 실제 종료 시각이다. 한 번의 update가 roll→sprint를 지나면 roll-end와 sprint-start가 같은 offset을 갖는다. 모션/VFX/SFX는 이 경계를 사용해야 하며, 이 단위검사 자체가 화려한 FX·렌더·오디오 일치를 검증한 것은 아니다.

## 기존 recovery v2로 재로드 악용 방지

새 캐릭터/저장 필드를 추가하지 않는다. `serializeRecoveryDebt()`는 지금 남은 roll/knockdown/clear·복원 lock 중 최댓값 하나만 반환한다. 기존 전투 회복 lock과 **max 병합**한다.

```js
recovery.lock = Math.max(existingRecoveryLock, mobility.serializeRecoveryDebt());
```

재로드 시 새 mobility 인스턴스에 `restoreRecoveryDebt(recovery.lock)`을 호출하거나, 기존 `p.recoveryLock`으로 동일한 금지시간을 보장한다. 두 경로를 함께 사용하면 각각 시간을 같은 tick으로 줄이고 더하거나 중복 소비하지 않는다. 수치 복원만으로 다음을 되살리지 않는다: 이동, 질주, 키 held, 방향, 회피창, 자동 재시작. 복원된 debt가 남으면 idle이지만 blocksSkills가 true이며 새 roll/sprint도 거부된다.

- `clear()` 기본은 남은 시간만 debt로 보존한다. 메뉴/blur로 roll을 취소해서 즉시 다음 roll을 얻는 우회를 막는다.
- `clear({preserveRecovery:false})`는 명시적인 새 life/새 전투 초기화 등에만 쓴다. 메뉴·포커스 전환마다 호출해서 잔여 lock을 없애면 안 된다.
- `restoreRecoveryDebt`는 기존 debt보다 작은 값으로 단축하지 않는다. `[0,60]` 유한 number만 받고 malformed 값은 기존 상태를 바꾸지 않고 예외 처리한다.
- 이 값은 HP·마나·기력·쿨다운 변경이 아닌 신규 이동 프로토타입의 최소 회복 debt다. 현 스키마로 위치·질주나 공격 중단의 모든 의미를 복원했다고 주장하지 않는다.
- 키수명/owner/STAMP/life 검사는 부모 입력 캡처 책임이다. 모듈에는 전투 객체나 그 신원을 숨겨 보관하지 않는다. 재로드/저장 완료 뒤 이전 keydown이 전달되지 않게 부모가 검증해야 한다.

## 검증

```sh
node --test app/tests/poe2-mobility.test.mjs
```

현재 **52/52 통과**. 실제 모듈 메서드를 실행한 검사다.

- 즉시 press, 첫 프레임 전 짧은 tap, 반복 keydown/keyup, 실패입력 비버퍼, roll 재시작 금지
- roll-only/통합 dodge+sprint/별도 sprint 세 경로, standalone과 roll 완료 조건의 독립성
- Shift 먼저 홀드→이동, canSprint 금지·허용, 스킬/회피 후 held run 재개, release·clear·restore 뒤 stale held 재개 금지
- Keep Sprinting on/off 및 통합 source 한정 적용, 별도 Shift keyup 항상 종료, source/held metadata
- 이동 정지, 새 회피, 스킬 시작, grace 경계와 넘어짐
- 주입 방향·수치 검증, 회피창 반개구간, 참조 분리, 긴 step 분할과 시간·이동량 일치
- clear·재입력·OS repeat, scalar debt export/restore, malformed/작은 재복원 값

추가로 기존 cursor-targeting 및 POE2 aim 검사와 함께 **89/89 통과**, 모듈 `node --check` 통과를 확인했다.

이 검사는 통합 STAMP/life 배선, 저장 durability, 벽/코너, 실브라우저 정상입력, 화면 모션, 청취, 피해유형별 실제 회피, 공개 배포를 검증하지 않는다. 해당 단계는 부모 통합과 별도 실플레이 검수로 남는다. 이 작업자는 브라우저·배포·Library·Git 작업을 실행하지 않았다.
