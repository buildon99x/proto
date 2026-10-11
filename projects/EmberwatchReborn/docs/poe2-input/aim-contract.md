# POE2 조준 공개 계약의 opt-in 이식

작성: 2026-10-10 UTC. 대상: `app/src/cursor-targeting.js`, `app/src/aim-intent.js`.

## 결과와 범위

기존 `resolveCursorAim(pointer, battle, width, height)`는 수정하지 않았다. 기존 적 몸 클릭 → 적 발 좌표 보정과 기존 반환형은 유지된다. 새 `resolvePoeAim`을 호출한 경로만 아래 계약을 사용한다. 이 독립 모듈은 이동·공격 실행, 자동 접근, 피해·사거리·충돌, 입력 큐 길이, 전투 밸런스를 바꾸지 않는다. 실제 main/combat 연결은 별도 통합의 책임이다.

### 원작 공식 계약과 독자 구현의 경계

- **공식확인:** Cursor Targeting은 직진형 투사체/타격을 화면 커서로 조준하고, Ground Targeting은 커서의 지면 위치 위를 지나도록 조준한다. 지면 직접지정 스킬은 두 모드에서 같은 지면점을 사용한다. [GGG 0.3.0](https://www.pathofexile.com/forum/view-thread/3826682)
- **공식확인:** Cursor Tracking은 키를 놓은 뒤에도 진행 중 스킬의 목표 위치/방향을 갱신하는 별도 옵션이다. 스킬마다 방향 변경 가능 구간이 다르므로 전역 자유회전으로 해석하지 않는다. [GGG 0.4.0](https://www.pathofexile.com/forum/view-thread/3883495), [GGG 0.3.0](https://www.pathofexile.com/forum/view-thread/3826682)
- **공식확인:** 예약된 스킬의 목표가 갱신되지 않던 버그가 수정됐다. 큐의 깊이·수명·정확한 release 우선순위는 미공개다. [GGG 0.5.0](https://www.pathofexile.com/forum/view-thread/3932540)
- **Emberwatch 구현:** 아래 높이·화면 투영·hover 타원·동점 정렬·snapshot 순서·큐 우선순위는 프로젝트 설계다. POE2 내부 높이, 타겟 반경, namelock, 자동 최근접 선택 알고리즘을 복원한 것이 아니다.

이번 구현은 제공된 `movement-targeting-ko.md`, `combat-inputs.md`의 확인된 공식 계약을 사용했다. 이 작업자가 원작 클라이언트나 최신 패치를 새로 실행·측정했다는 의미는 아니다.

## 투영 API

```js
import {
  resolvePoeAim,
  isPoeAimTargetValid,
  REBORN_AIM_HEIGHTS,
} from './cursor-targeting.js';

const sample = resolvePoeAim(pointerScreen, battle, width, height, {
  aimingMode: 'cursor', // 'cursor' | 'ground'; 생략/알 수 없는 값은 cursor
  groundTargeted: false,
  targetingHeight: REBORN_AIM_HEIGHTS.strike,
});
// {aim, groundPoint, targetId, aimingMode, groundTargeted, targetingHeight}
```

- `pointerScreen`은 렌더 캔버스와 같은 좌표계의 `{x, y}`이다. 브라우저의 CSS/client 좌표 → 캔버스 좌표 변환은 호출자 책임이다.
- 카메라 초점은 기존 렌더러와 같이 `battle.p`, 화면 앵커는 `(width * .5, height * .55)`, 확대는 `ISO.zoom`이다. 포인터가 그대로여도 매 프레임 현재 카메라·화면 크기로 다시 계산한다.
- `groundPoint`는 항상 기존 `screenToWorld(pointer)`의 원래 지면점이다.
- `cursor`, 일반 방향지정 스킬: `screenToWorld(pointer.x, pointer.y + targetingHeight * ISO.zoom)`를 `aim`으로 사용한다. 월드점을 그 높이에서 렌더하면 다시 정확히 화면 커서 위치가 된다.
- `ground`, 또는 `groundTargeted: true`: `aim`은 `groundPoint`의 별도 복사본이다. 지면 직접지정 스킬에서는 설정 모드가 달라도 같은 위치다.
- `targetId`는 현재 화면 포인터 아래 살아 있는 활성 적의 hover 메타데이터다. 이 값으로 `aim`을 적 발로 덮어쓰지 않는다. 목표를 따라가는 지속 고정도 아니다.
- null/NaN/Infinity 포인터·카메라 또는 유효하지 않은 화면 크기에서는 `aim`, `groundPoint`, `targetId`를 null로 돌려준다. 유효한 맵이 없어도 자유 조준은 계산되며 hover 선택만 비활성화된다.
- `targetingHeight`의 기본은 23이다. 0은 유효하며, 음수/NaN/Infinity/문자열은 기본으로 돌아간다. 정상 입력에서도 계산 결과가 비유한 값이면 null 좌표를 반환한다.

### 실제 렌더 근거

`REBORN_AIM_HEIGHTS = {strike: 23, projectile: 9}`의 단위는 확대 전 **Emberwatch 화면 높이**다.

| 값 | 현재 코드 근거 | 한계 |
|---|---|---|
| strike 23 | `visual.js`의 `impact`는 `pos.y - 23 * zoom`, `slash`는 `lift = 23` | 전사 타격 FX 평면이며 움직이는 손 관절의 실측 높이가 아님 |
| projectile 9 | `visual.js`의 이동 `shots`는 `pos.y - 9 * zoom` | 현재 이동 투사체 렌더 기준이며 모든 주문 FX의 공통 높이가 아님 |
| 플레이어 몸 49 | `visual.js` actor/protectedBounds의 `49 * zoom`, 스프라이트 anchor는 발 위치 `(x, y)` 기준 | 조준 높이를 플레이어 전체 몸 높이49로 설정하면 안 됨 |

예를 들어 `bolt`는 별도 `-20` 화면 오프셋, ring/blast는 별도 lift3을 쓴다. 각 스킬의 화면 표현을 확인해서 높이를 명시해야 한다. 실제 높이 표현이 다른 스킬에 기본23을 무조건 적용하는 것은 이 API의 검증 범위를 벗어난다. 화면 흔들림은 장식 렌더 변환이며 조준 좌표계에 넣지 않는다.

### Hover와 유효성

현재 프로젝트의 기존 hover 형상은 boss100 / rat28 / 기타46의 몸 높이, 가로반경 `height * .36`, 세로반경 `height * .5`, 별도 화면 발 타원16×9이다. 이 값들은 기존 Emberwatch 형상이며 POE2 선택 반경이 아니다. 역할별 커스텀 아트 실루엣, 알파 픽셀, 건축물 가림 전체를 모델링하지 않는다.

- `hp > 0`, `active`, `!dead`, 유한 위치, 유효한 ID와 현재 타일 LOS를 모두 요구한다.
- 겹침은 몸/발 타원 점수 → 더 깊은 화면 몸 → ID 순으로 결정한다. 투영 부동소수점 차이 `1e-12` 이하는 같은 점수로 본다. 이 동점 정책도 프로젝트 설계다.
- `isPoeAimTargetValid(id, battle)`는 현재 존재·생존·active·LOS만 검사한다. 사거리·피해·명중 허용 검사는 하지 않는다.
- 사망/비활성/차단/삭제 후 다른 가까운 적을 자동 선택하지 않는다. 커서 아래에 다른 유효한 몸이 실제로 겹친 경우에는 그 프레임의 hover를 새로 구하는 것뿐이다.

## 키 수명과 조준 의도 API

```js
import {createAimIntent} from './aim-intent.js';

const intent = createAimIntent({cursorTrackingAfterRelease: true});
intent.press(sample); // 실제 pressed edge
const current = intent.snapshot(liveSample, {
  canRetarget: true, // 현재 스킬/구간이 방향 갱신을 허용하는가
  queued: false,
  isTargetValid: id => isPoeAimTargetValid(id, battle),
});
intent.release(lastSample, {canRetarget: true});
intent.clear(); // 행동 종료, 취소, 사망, 장면 전환, 입력 안전 초기화
```

반환은 sample 필드에 `active`, `held`, `cursorTrackingAfterRelease`를 추가한 분리된 복사본이다. 생성 시 추적 기본값은 false이며 이동모드 프리셋은 호출자가 적용한다. 객체·지면점 참조를 외부와 공유하지 않고, 브라우저·시계·전투 상태를 직접 읽거나 수정하지 않는다.

| 상태/정책 | 새 유효 live sample 반영 |
|---|---|
| `active: false` | 안 함. 포인터만으로 입력 재발동하지 않음 |
| held + canRetarget | 함. 추적 ON/OFF와 무관 |
| released + tracking ON + canRetarget | 함 |
| released + tracking OFF | 안 함 |
| 실행 중 canRetarget false | held/tracking 모두 고정 |
| **active + queued true** | **canRetarget false, released, tracking OFF보다 우선해서 갱신** |

추가 의미:

1. `press(sample)`는 held가 아니면 새 의도를 시작/교체한다. 이미 held면 idempotent하다. OS 키반복으로 스킬의 retarget 제한을 우회하지 않는다.
2. `release(lastSample, policy)`는 아직 held일 때 마지막 샘플을 먼저 반영한 뒤 held를 false로 만든다. `release()`는 이전 샘플을 그대로 유지한다. 반복 release는 후속 포인터를 샘플하거나 새 의도를 만들지 않는다.
3. 유효하지 않은 live sample은 마지막 유효 좌표를 유지한다. 처음부터 잘못된 sample로 press되면 active/held만 기록되고 좌표·대상은 null이다. 공격 가능성 판단은 상위 계층 책임이다.
4. `isTargetValid` 콜백은 좌표 고정 중에도 호출된다. 죽거나 LOS가 없어진 ID만 null로 만들고 마지막 좌표를 유지한다. 콜백을 전달하지 않으면 이 모듈에는 대상 사망을 알 방법이 없다.
5. `snapshot()`만 호출하면 현재 복사본을 읽는다. 그 호출 자체로 샘플을 다시 투영하거나 실행을 시작하지 않는다.
6. `clear()`는 active/held와 모든 좌표/ID를 제거한다. 이후 snapshot에 queued true가 있어도 press 없이 재무장되지 않는다. 실제 blur/death 이벤트 연결은 상위 계층의 통합 검사가 필요하다.

### 예약 스킬 사용법과 명시적 우선순위

실행 스킬과 예약 스킬에는 별도 인스턴스를 사용한다. 실행 스킬이 방향 고정 구간에 있어도 예약 인스턴스에는 `snapshot(live, {queued: true})`로 현재 목표를 공급할 수 있다. 예약 소비 직전에도 최신 포인터/카메라를 샘플한다. 소비 후 `queued: true`를 더 이상 전달하지 않아야 일반 held/release 정책으로 돌아간다.

`queued`가 `canRetarget`보다 우선하는 것은 명시적인 **Emberwatch 예약 입력 설계**다. 원작에서 예약 release가 정확히 어떻게 처리되는지, 큐 길이·시간창, 전역 입력 우선순위를 확인했다는 뜻은 아니다. 큐 생성/소비/만료/취소와 실제 스킬 실행은 이 모듈 밖이다.

### 월드점과 방향 고정의 차이

이 모듈이 기억하는 것은 월드 `aim` 점이다. release 추적 OFF로 점을 고정해도 플레이어가 이동한 뒤 그 점을 향해 새 각도를 계산하면 각도는 달라질 수 있다. **방향 고정이 필요한 스킬 구간의 angle commit은 전투 계층에서 별도로 유지해야 한다.** API가 플레이어 이동·각도·스킬 phase를 몰래 추론하지 않는다. 고정 entity를 추적하거나 namelock을 추가하지도 않는다.

## 검증

실행 명령:

```sh
node --test app/tests/cursor-targeting.test.mjs app/tests/poe2-aim-*.test.mjs
```

직접 실행 결과: **37/37 통과**. 기존 cursor-targeting 8건 + 새 projection 14건 + 새 intent 15건이다.

- 화면 커서 통과와 지면점 상공 통과, 지면지정 스킬 공통점
- 기존 몸→발 보정 유지 및 새 모드에서 보정과 projection 분리
- 생존/active/LOS/겹침, 카메라 이동·화면 크기 변경, null/NaN/Infinity, 대상 사망/제거
- held와 release 직전/직후 같은 입력, tracking ON/OFF, 스킬별 canRetarget
- 큐 갱신 우선순위, 실행/예약 인스턴스 분리, 큐 hover 변경·사망, mutation 방지
- 실제 `createVisualRenderer.render` handler의 shot9/impact23 translate를 recording-canvas로 확인
- 기존 실제 근접 handler가 기존 API 보정으로 동작하는 회귀 유지

Recording canvas는 실제 함수 실행 검사이며 픽셀/정상입력 QA가 아니다. 이 결과는 전체 테스트, 브라우저 플레이, 배포, 원작과 동일한 입력 지연·프레임·회전 속도 또는 완성된 전사 전투 이식을 증명하지 않는다.
