# POE2 전투·입력 이식 조사

조사일: 2026-10-10 UTC. 범위: 전투 입력, 공격 중 이동, 애니메이션 취소, 구르기/질주, 무기 교체, 키 설정. 코드 변경 없음.

## 결론

현재 Emberwatch의 ‘전사 기본공격 홀드 중 회수구간 보행’은 플레이감 개선안일 수 있지만, 이를 POE2 원작 계약으로 확정할 근거는 없다. POE2는 **스킬별 이동 허용/내장 이동/취소 가능 시점**이 다르다. 클래스별 단일 `canMoveWhileAttacking`이나 모든 근접공격에 일괄 회수 보행을 적용하는 설계는 피한다.

공식 최신 목록에서 **0.5.5e(2026-10-05)**까지 직접 확인했다. 검색 결과의 0.4.0/2026-04 캐시만 보고 최신판으로 판단하면 안 된다. 0.5.5e는 본 조사 범위의 새 전투 입력 규칙을 싣지 않는다. 모든 중간 핫픽스를 전수 검토한 것은 아니며, 아래는 확인한 규칙과 미확인을 엄격히 분리한 이식 계약이다.

## 1. 공식 확인된 계약

### A. 이동 가능한 스킬과 아닌 스킬을 구분

- 0.2.0: 이동 가능한 스킬의 감속은 공격/시전속도가 높고 탭 입력이어도 완전히 적용되어야 한다. 홀드하지 않았다고 감속을 회피하는 동작은 버그였다.
- 같은 패치에서 ‘이동 중’ 판정은 애니메이션 전체가 아니라 실제 위치가 이동하는 동안만 적용하도록 수정됐다.
- 0.3.0: 이동 가능한 스킬의 감속이 사용 중 조금 더 빨리 풀리도록 변경됐다. 전역 고정감속이라는 근거는 없다.
- 0.5.0: Command 스킬 감속은 70%에서 50%로, 세 Banner 스킬은 감속을 제거했다. 이는 감속 정책이 개별 스킬 데이터임을 직접 보여준다. 대부분 근접 스킬에 내장 이동이 있다는 것도 방향 버그 설명에 명시됐다.

따라서 분류는 ‘근접=정지, 원거리/주문=자유이동’보다 세분화해야 한다. 근접의 내장 전진/도약은 WASD 자유보행과 다른 것이다. 원거리·주문 역시 모든 스킬이 같은 정책이라는 증거는 없다.

출처: [0.2.0](https://www.pathofexile.com/forum/view-thread/3740562/filter-account-type/staff), [0.3.0](https://www.pathofexile.com/forum/view-thread/3826682/filter-account-type/staff), [0.5.0](https://www.pathofexile.com/forum/view-thread/3932540)

### B. 일반 취소와 방향 갱신

- 0.3.0: strike 애니메이션이 의도하지 않은 시점에 취소되던 버그 수정. Rolling Slam 1타 후 취소는 정상으로 명시. 이를 모든 스킬·모든 취소입력에 대한 허용으로 확대 해석하지 않는다.
- 0.4.0: Vaulting Impact/Thunderous Leap이 애니메이션 취소되지 않던 버그 수정. 세부 취소 프레임은 미공개.
- 0.4.0 Cursor Tracking 옵션: 스킬 키를 놓은 뒤에도 목표 위치/방향을 계속 갱신. Rolling Slam/Whirling Assault에 특히 영향. 기본값 WASD ON, 클릭이동 OFF.
- 0.5.4f: 스킬 시작 직후 짧은 창에 적을 lock-on하면 엉뚱한 방향으로 공격하던 버그 수정. 공격 방향의 초기화와 target 갱신 순서가 일관되어야 한다.

출처: [0.3.0](https://www.pathofexile.com/forum/view-thread/3826682/filter-account-type/staff), [0.4.0](https://www.pathofexile.com/forum/view-thread/3883495/filter-account-type/staff), [0.5.4f](https://www.pathofexile.com/forum/view-thread/3996513)

### C. 홀드와 입력 경쟁

- 0.1.1 Controller Improvements: 다른 스킬 입력을 홀드하고 있을 때 특정 새 스킬이 실행되지 않던 버그 수정. ‘홀드 기본공격이 모든 새 명령을 독점’하는 구조는 적어도 해당 입력 경로의 정상 계약이 아니다. PC 전체에 동일한 우선순위/버퍼 길이가 적용된다고 확정할 수는 없다.
- 같은 패치에서 Crossbow의 Enable Held Targeting 옵션 수정.
- 0.3.0c: 재장전 키를 너무 일찍 놓으면 crossbow가 재장전/발사 입력을 무시하던 문제 수정. 탭 release로 입력 상태가 영구 고장나면 안 된다.
- 0.5.5: 사망하면 클릭이동의 예약 이동 행동이 취소되어야 한다.

출처: [0.1.1](https://www.pathofexile.com/forum/view-thread/3696353), [0.3.0c](https://www.pathofexile.com/forum/view-thread/3851277/filter-account-type/staff), [0.5.5](https://www.pathofexile.com/forum/view-thread/4000864)

### D. 구르기·질주

- 0.1.0d: 구르는 동안 플레이어 크기를 1에서 0으로 바꾸고 일부 작은 몬스터를 밀 수 있도록 변경. ‘모든 적/벽 통과’ 의미가 아니다.
- 0.1.1: 구르기로 일부 상호작용을 취소하지 못하던 버그, 상호작용+구르기 동시 입력 뒤 스킬 사용불가 버그 수정. Bone/Frost Wall을 구르기로 통과하던 동작도 버그로 수정.
- 0.3.0: dodge 버튼 홀드 → 구르기 완료 후 질주. 전 클래스, 지속시간 제한 없음. 질주 중 피격은 넘어짐을 유발. Keep Sprinting While Moving 옵션은 키를 놓아도 이동 정지/스킬 사용 전까지 질주를 유지.
- 0.3.0c: 질주 시작에 짧은 heavy-stun 면제기간 추가. 이 기간은 최소 질주시간과 같지만 수치 미공개. 옵션 ON 상태에서도 구르기로 질주를 끊을 수 있어야 한다.
- 0.4.0: 질주는 heavy-stun buildup 감소를 막지 않는다.
- 0.5.0: **질주로 이어지지 않는 전용 Dodge Roll 키** 추가. 기본 미할당, Input 옵션에서 지정.
- 0.5.4f: 질주 후 버튼 release가 추가 구르기를 발생시키면 안 된다.

출처: [0.1.0d](https://www.pathofexile.com/forum/view-thread/3621299), [0.1.1](https://www.pathofexile.com/forum/view-thread/3696353), [0.3.0](https://www.pathofexile.com/forum/view-thread/3826682/filter-account-type/staff), [0.3.0c](https://www.pathofexile.com/forum/view-thread/3851277/filter-account-type/staff), [0.4.0](https://www.pathofexile.com/forum/view-thread/3883495/filter-account-type/staff), [0.5.0](https://www.pathofexile.com/forum/view-thread/3932540), [0.5.4f](https://www.pathofexile.com/forum/view-thread/3996513)

### E. WASD vs 클릭이동이 전투에 미치는 영향

- 0.1.1: Attack in place stops movement 옵션은 WASD에서 ‘이동 가능한 스킬’의 보행을 막지 않도록 수정. 따라서 이 옵션을 WASD hard-stop으로 구현하면 알려진 공식 동작과 다르다.
- 0.3.0 Aiming Mode: Cursor Targeting은 직진 투사체/strike가 화면 커서 위치를 지나도록, Ground Targeting은 커서가 가리키는 지면 위를 지나도록 조준. 지면 지정 스킬은 양쪽 모두 커서 지면 위치를 사용. 기본 WASD Cursor / 클릭이동 Ground.
- 0.4.0의 Cursor Tracking 기본값 차이까지 있으므로, 이동방식만 바꾸고 조준/키 release 동작을 같게 두면 원작 기본 프리셋 재현이 아니다.
- 0.5.5는 WASD split projectile이 적 발밑으로 잘못 발사되던 문제를 수정. 화면 조준과 월드 지면점을 혼용하지 않아야 한다.

출처: [0.1.1](https://www.pathofexile.com/forum/view-thread/3696353), [0.3.0](https://www.pathofexile.com/forum/view-thread/3826682/filter-account-type/staff), [0.4.0](https://www.pathofexile.com/forum/view-thread/3883495/filter-account-type/staff), [0.5.5](https://www.pathofexile.com/forum/view-thread/4000864)

### F. 무기 교체·키 설정 UX

- 0.3.0: 동일 장비를 양 무기세트에 할당 가능. 키보드/마우스는 weapon-set 아이콘 우클릭, 패드는 무기를 선택하고 Y/Triangle 홀드.
- 0.5.5: 다른 무기세트의 스킬이 실제 weapon swap 없이 실행되던 문제 수정. 비활성 무기세트의 오라·보조젬 효과가 적용되는 것도 버그.
- 키 재설정 가능 자체는 0.5.0 전용 dodge bind 안내로 공식 확인. 키 설정에서 ‘구르기+질주’와 ‘구르기만’을 구분해야 한다.
- 0.4.0: 캐릭터 선택창에서 패드↔키보드 전환 시 이전 WASD 여부를 기억.
- 전체 기본 PC 키맵, 생명/마나 플라스크의 최신 기본 키, 리바인드 충돌·초기화 UX는 이번에 확보한 공식 텍스트만으로 미확인. 관습적 1/2, X, Shift 등의 값을 원작 확인치처럼 확정하지 않는다.

출처: [0.3.0](https://www.pathofexile.com/forum/view-thread/3826682/filter-account-type/staff), [0.4.0](https://www.pathofexile.com/forum/view-thread/3883495/filter-account-type/staff), [0.5.0](https://www.pathofexile.com/forum/view-thread/3932540), [0.5.5](https://www.pathofexile.com/forum/view-thread/4000864)

## 2. 아직 원작 확정 불가

1. 각 기본공격/스킬의 준비·접촉·회수 길이, 취소 가능한 정확한 프레임, 회전속도, root-motion 곡선.
2. PC 탭 입력 큐 길이, 큐가 하나인지 여러 개인지, last-input-wins 여부, 만료시간, stun/freeze 중 입력의 보관 여부.
3. 키 release가 진행 중 기본공격을 취소하는 정확한 시점, 홀드 공격 중 이동 입력이 회수와 다음 타격 사이에 끼어드는 정책.
4. 원거리/주문별 이동 감속 곡선과 구르기 비용/쿨다운·피해회피창·애니메이션 취소의 모든 예외. 커뮤니티는 ‘무료, 무쿨, 초반 strike/projectile 회피, 구르기 자신은 취소 불가’로 설명하지만 이번에 확보한 공식 본문만으로 완전 검증하지 않았다. 광역·지속피해까지 완전 무적으로 처리할 근거는 없다.
5. 상태이상 중 플라스크 사용, 플라스크의 입력 우선순위와 공격 취소 여부.

공식 개발자 영상 확보: [GGG Mercenary Gameplay Walkthrough, 2023-11-30](https://www.youtube.com/watch?v=mU7mLtj7nxU), [GGG ExileCon 2023 Gameplay Walkthrough 3](https://www.youtube.com/watch?v=y8OL9qqnhDo). 검색/열기로는 전체 자막과 프레임을 검증하지 못했으므로 영상 속 정확한 초·프레임을 꾸며 인용하지 않았다. 출시 전 영상은 최신 공식 패치와 충돌할 경우 최신 패치를 우선한다.

## 3. Emberwatch 구현 계약 제안 (원작 소스코드가 아닌 구현 설계)

### 상태 분리

- `locomotionIntent`: WASD 방향 또는 클릭이동 목적지. 공격상태에 덮어쓰지 않는다.
- `aimIntent`: 화면커서/월드지면/적ID와 마지막 입력 시각. 이동방향과 별도.
- `action`: Idle / WeaponSwap / Windup / Contact / Recovery / Channel / Dodge / Sprint / Disabled / Dead.
- 스킬 데이터: `movementPolicy`(locked/freeSlowed/authoredMotion), `movementPenaltyCurve`, `cancelWindows`(dodge/move/skill별), `targetTrackingPolicy`, `repeatPolicy`, `requiredWeaponSet`, `contactEvents`.
- `heldInputs`와 새로 누른 `pressedEdges`를 별도 수집. OS key-repeat로 공격속도가 증가하지 않게 한다.

### 전이/우선순위 제안

1. Dead/장면전환은 현재 행동·예약이동·예약스킬을 정리. 이전 입력이 부활 뒤 자동 재발동하지 않게 한다.
2. Disabled 상태의 허용 입력은 상태별 표로 정의. ‘구르기 최우선’이 stun/freeze를 무조건 탈출시키면 안 된다. 입력 저장기간은 검증 전 조정 가능한 값으로 남긴다.
3. 유효한 dodge pressed edge는 현재 스킬의 dodge 취소창에서 스킬을 종료하고 Dodge로 전이. 아직 발생하지 않은 타격/투사체 이벤트는 취소한다. 이미 발생한 적중을 되돌리거나 중복 생성하지 않는다.
4. 새 스킬 입력을 처리한 뒤 홀드 기본공격 재발동을 평가. 기본공격 반복 루프가 새 스킬을 영구 굶기지 않는다. 단, 즉시 취소/예약 여부는 스킬별 허용창을 통과해야 한다.
5. 유효 스킬이 다른 무기세트를 요구하면 WeaponSwap 완료 후 사용. 비활성 세트 효과는 섞지 않는다.
6. 일반 이동은 freeSlowed 스킬에서 독립 처리, authoredMotion 스킬에서는 지정 이동곡선 처리, locked 스킬에서는 이동 의도만 보존. Recovery 보행은 **스킬별 검증된 허용**이 있을 때만 활성화한다.
7. Dodge 종료 때 통합 버튼이 계속 held이면 Sprint로. dodge-only 버튼은 held여도 Sprint 금지. release 이벤트가 Dodge pressed edge로 재해석되지 않도록 한다.
8. Sprint 중 스킬 입력 또는 새 dodge 입력으로 빠져나온다. Keep Sprinting 옵션에 따른 release 정책을 적용. 짧은 초기 heavy-stun 유예와 이후 피격 넘어짐을 구분한다.

우선순위 표/숫자는 구현 선택이다. POE2의 숨겨진 글로벌 우선순위라고 설명하면 안 된다.

## 4. 합격기준

### 바로 검증 가능한 공식 대응 테스트

- A01: 이동가능 스킬을 탭/홀드해도 초기 감속이 누락되지 않는다. 이전 스킬의 감속이 새 행동에서 부활하지 않는다.
- A02: 기본공격 홀드 중 새 스킬/구르기 입력이 영구 무시되지 않는다. 입력 대기와 실행불가 이유가 구별된다.
- A03: Cursor Tracking ON은 release 이후에도 방향을 갱신, OFF는 release 정책대로 유지. 두 이동 프리셋의 기본값이 다르다.
- A04: 스킬 시작 직후 적 lock-on을 추가/변경해도 반대방향 공격이 나가지 않는다.
- A05: 구르기는 작은 틈/밀 수 있는 작은 적 정책을 따르지만 벽·Bone/Frost Wall·통행불가 지형을 관통하지 않는다.
- A06: 통합 dodge 홀드 후에만 Sprint 전이. dodge-only는 동일 홀드에서 Sprint가 없다. sprint release로 추가 구르기가 나가지 않는다.
- A07: Keep Sprinting ON에서도 새 dodge가 작동하고 스킬 사용으로 Sprint가 해제된다.
- A08: 상호작용과 dodge 동시 입력 후 정상 공격 가능. 사망은 클릭이동 예약을 취소한다.
- A09: 다른 무기세트 스킬은 올바른 세트를 실제 활성화한 후 실행. 비활성 효과가 남지 않는다.
- A10: UI 리바인드 후 tooltip/단축키 표시가 실제 입력과 일치. 메뉴 포커스/창 비활성화 때 held 상태가 붙어버리지 않는다(후자는 Emberwatch 안정성 요구).

### ‘그대로 이식’ 주장 전 필요한 실측

동일 버전·클래스·무기·공격속도·스킬로 PC WASD/클릭이동 각각 녹화한다. 기본 근접공격, Rolling Slam, 원거리 기본공격, 단발 주문, 채널 주문을 별도로 검사한다. 타격 직전/직후/회수 중 이동·구르기·다른스킬·release 입력을 적용하여 첫 위치변화/접촉/후속공격/방향변화 시점을 기록한다. 여기서 확인되지 않은 임의 프레임이나 회수보행률은 ‘Emberwatch 조정값’으로 표시한다.

## 5. 최신성 확인 경로

- [공식 EA 패치목록](https://www.pathofexile.com/forum/view-forum/2212)
- [0.5.5e](https://www.pathofexile.com/forum/view-thread/4009785): 2026-10-05, 그래픽 설정/보스 진행/로딩 수정.
- 0.5.5b/c/d 및 0.5.4c/d/e/f 본문도 열어 확인. 이 중 본 조사 핵심은 위에 반영한 0.5.4f와 0.5.5이다.
- 0.5.1/0.5.2/0.5.3/0.5.4도 공식 본문 확인. 0.5.3의 대형보스 지면스킬 타겟팅 개선은 존재하나 전체 조준 알고리즘 공개는 아니다.

## 6. 추가 확인: 기본 키와 회피 비용 (2026-10-10 재검색)

### 근거 등급

- A: GGG 공식 패치 본문. 기능 존재/변경은 확정하되 미기재 수치는 추정하지 않는다.
- B: 개발자 직접 인터뷰의 발언. 1차 발언이지만 출시 전 버전이라는 제한이 있다.
- C: Wiki/외부 가이드/사용자 관찰. 보조 근거로만 사용하고 최신 공식 기본값이라고 선언하지 않는다.
- U: 이번 조사로 불명. ‘공식 확인 안 됨’은 그 기능이 없다는 뜻이 아니다.

### B: 개발자 직접 발언으로 보강한 Space·취소·재조준

Jonathan Rogers의 2024-03-22 인터뷰에서 긴 스킬 사용 중 Spacebar 또는 block으로 빠져나올 수 있고, 사용을 시작한 뒤 다른 방향으로 재조준하는 시스템을 설명했다. 공격 중 이동을 허용하는 것이 긴 시전의 체감 답답함을 줄인다는 설명도 있다. 이는 **Space를 활용하는 취소, 공격 중 재조준, 이동과 공격의 독립성**에 대한 직접 개발자 근거다. 그러나 ‘언제나 취소 가능’이라는 출시 전 설명을 0.5.5의 모든 스킬/상태에 대한 프레임 보장으로 해석하지 않는다. 이후 0.3.0의 strike 취소시점 제한과 함께 읽어야 한다.

[MMORPG.com Jonathan Rogers 직접 인터뷰](https://www.mmorpg.com/interviews/interview-path-of-exile-2s-game-director-jonathan-rogers-chats-gameplay-intentions-inclusions-and-improvements-2000130901), Animation/cast time 질문의 답변.

### C: 공개 기본 키 목록의 교차확인과 충돌

외부 가이드에서 공통적으로 제시하는 후보:

| 동작 | 공개 가이드 후보 | 판정 |
|---|---|---|
| 구르기/현행 통합 구르기·질주 | Space | B+C, 개발자 발언과 복수 가이드가 부합. 최신 공식 전체 키맵은 미확보 |
| 플라스크 1/2 | 숫자 1 / 2 | C, Game8·DefKey·Keyboardista 교차 부합 |
| 마우스 스킬 1/2/3 | 좌클릭 / 가운데클릭 / 우클릭 | C, Game8·Keyboardista 부합 |
| 제자리 공격 | Shift | C, DefKey·Keyboardista와 공식포럼 사용자 관찰 부합. A인 0.1.1의 WASD 동작 제한을 반드시 적용 |
| 무기 교체 | X | C, DefKey·Keyboardista 부합 |
| 클릭이동형 스킬키 | Q / W / E / R / T, 보조 Ctrl 조합 | C, Keyboardista·DefKey 목록. WASD와 같은 기본 배열로 취급 금지 |
| WASD형 스킬키 | Q / E / R / C / V | C, Game8의 in-game keybind 표. ‘추천 설정’ 문맥도 있으므로 순정 기본값으로 확정 불가 |
| Q / E / R / T / F 배열 | 불명 | U, 이 배열이 POE2 최신 순정 WASD 기본값이라는 근거를 확보하지 못함 |
| 구르기만 (질주 제외) | 기본 미할당 | A, 공식 0.5.0으로 확정 |

출처: [Game8 PC settings/keyboard bindings](https://game8.co/games/Path-of-Exile-2/archives/491563), [DefKey POE2 shortcuts](https://defkey.com/path-of-exile-2-shortcuts), [Keyboardista POE2 shortcuts](https://www.keyboardista.com/en/shortcuts/path-of-exile-2-game/), [사용자 Shift 기본키 관찰](https://www.pathofexile.com/forum/view-thread/3597342). Game8·DefKey는 검색에 노출된 본문까지 확인했으나 직접 페이지 읽기는 각각 402/403으로 실패했다. 이를 실제 게임 설정 화면을 직접 확인한 것처럼 보고하지 않는다.

신뢰도 점검: 일부 ‘2026 최신’ 키사이트는 POE2에 플라스크 1~5 또는 Space 상호작용을 함께 적고 있다. 다른 근거와 충돌하고 POE1/사용자 remap 혼입 우려가 있어 이식 근거에서 제외한다. 최근 작성일만으로 정확성이 보장되지 않는다.

### C: 회피 cooldown/resource의 보조 확인

[POE2 Wiki Dodge roll](https://www.poe2wiki.net/wiki/Dodge_roll)와 [POE1 플레이어용 POE2 안내](https://www.poe2wiki.net/wiki/Guide:PoE2_overview_for_PoE1_players)는 기본 roll에 비용·쿨다운이 없고, 시작 부분에 strike/projectile 회피가 적용되며, 완전 무적은 아니라고 설명한다. 구르기 자신은 재취소하지 못하고 대부분의 다른 스킬을 취소한다는 설명도 일치한다. Wiki 본문은 검색 인덱스에서 확인했으며 직접 페이지는 403이었다. 따라서 이 항목은 **커뮤니티 문서 기반 높은 개연성(C), 최신 GGG 규격 확정(A)은 아님**으로 유지한다. 비용이 없다는 설명은 stamina 비용도 없다는 해석을 지지하지만 별도 공식 stamina 규격은 미확보다.

핵심 구분: 무쿨다운은 ‘이미 진행 중인 구르기를 매 프레임 재시작 가능’이 아니다. 초반 회피는 `invulnerable=true`로 모든 피해를 무시한다는 뜻도 아니다. 구르기 회피 가능 공격 범주·회피 구간·강제상태 예외를 독립 데이터로 둔다. 지금 문서만으로 비용 0/쿨다운 0/특정 무적 프레임을 **공식 검증 완료 전제**로 하드코딩하지 않는다.

### 구현 전달 보완

키설정은 액션 기반 리바인딩을 먼저 완성하고, 마우스이동/WASD 프리셋을 분리한다. Space·1/2·Shift·X는 근거 등급을 달아 후보 프리셋으로 사용할 수 있으나, QERTF를 순정 복제라고 표시하지 않는다. 사용자가 선택하는 키가 항상 툴팁/조작도움말/스킬바에 반영되어야 한다. 최신 순정 배열을 완전히 확정하려면 현재 클라이언트의 ‘기본값 복원 후 Input 설정’ 화면 또는 그 버전이 확인되는 공식 영상이 필요하다. 로그인·구매 없이 확보한 공개자료만으로 여기까지 검증했다.
