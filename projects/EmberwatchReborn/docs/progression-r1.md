# R1 전사 성장 기반

작성: 2026-10-09 UTC. **재구현 R1**, 유실 소스의 원문 복원 아님.  
범위: 순수 캐릭터 초기화, XP 곡선·레벨업 포인트·능력치 배분·참조 처치 XP 배율·공유 성장 검증.  
**전투·기술 구매·승급·보상 콘텐츠·일반 입력 UI·실플레이는 이 문서의 구현 완료 대상이 아니다.**

## 1. 원본 보존과 수치 출처

다음 두 파일을 보존 기준선 `projects/Emberwatch/app/src/campaign/`에서 변경 없이 복사했다. `cmp` 및 focused 테스트의 SHA-256 확인이 일치한다.

| Reborn 파일 | SHA-256 |
|---|---|
| `app/src/reference-core.js` | `04804f94aa38999f5e0af98094196394d703a3be4c3593d9338a3bc13bc8eb04` |
| `app/src/reference-warrior.js` | `1fb06923bbf69a33e80593a734f86b39d22ef7cd1f260b9d5b0be9a15261d549` |

원본 기준 commit: `7240e494`. 복사된 카탈로그의 원작 근거는 보관된 캐시/공식 역사 문서이지 최신 게임 실측이 아니다. 53개 노드는 여전히 `reference_only`이며 실행 가능한 스킬이 아니다. XP 곡선, 재생, 일반 능력치 파생 공식, 훈련/사망/재분배 조건의 `UNKNOWN`과 Champion of Truth의 `null` 등은 원본 그대로 남겼다.

원작 참조에서 읽는 규칙:
- 레벨마다 능력치 +5.
- 도달한 레벨 2–4는 기술점수 +3, 5–14는 +4, 15–29는 +5, 30–50은 +6.
- L1부터 L50까지 얻는 총 포인트: 능력치 245, 기술 250.
- 플레이어의 **레벨상 티어** 경계는 1/5/15/30. 실제 훈련 완료 여부와 별개다.
- 낮은 적 티어 XP 표 및 난이도 XP 배율(아래 §4)을 원본에서 직접 읽는다.
- 전사 기본 능력치 18/12/10은 추가 배분치와 별도다. R1은 이 수치에서 파생 공격력/HP 등을 새로 계산하지 않는다.

## 2. 확정 API와 순수성

`app/src/progression.js`에서 다음을 export한다. 외부 상태·브라우저·스토리지 의존성은 없다. 성공한 변경은 완전히 분리된 새 JSON 캐릭터를 반환하며, 성공/실패 어느 경우에도 입력을 바꾸지 않는다.

### createCharacter()

새 객체를 반환한다:

- `classId:'warrior'`, `level:1`, `tier:'apprentice'`, `xp:0`.
- `attributes:{strength:0,dexterity:0,intelligence:0}`: **기본 18/12/10이 아니라 추가 투자량**.
- `attributePoints:0`, `skillPoints:0`, `skills:{}`, `exclusiveBranches:{}`.
- `equipment`: mainHand/offHand/head/chest/hands/feet/accessory 모두 null.

원본 save.js 캐릭터 shape를 유지하며 현재 레벨 안의 잔여 XP만 추가했다. 첫 비용이 0이라는 이유로 네 기본 행동이나 미구현 기술을 습득시키지 않는다. 이 데이터만으로 플레이 가능한 전사라는 뜻이 아니다.

### xpForLevel(level)

현재 레벨에서 다음 레벨로 오르는 데 필요한 XP 숫자. L1–49만 유효하다. L50(상한) 또는 잘못된 레벨은 `null`이다. UI는 캐릭터 레벨을 함께 보고 상한과 오류를 구별한다. `null`을 0비용 레벨업으로 바꾸지 않는다.

### grantExperience(character, amount)

성공:
`{ok:true, character, gainedLevels, granted:{attributePoints,skillPoints}, appliedXp, discardedXp}`

- `gainedLevels`는 상승한 레벨 수.
- `granted`는 이번 호출에서 새로 도달한 각 레벨의 포인트 합계.
- 여러 레벨을 넘는 수여도 각 포인트 밴드를 정확히 거친다.
- `appliedXp`는 L50까지 실제 적용된 XP, `discardedXp`는 상한을 넘어서 폐기된 XP다.
- 자동 티어 승급·스킬 구매·기본 자원 회복·월드 보상 지급은 하지 않는다.
- 입력 금액은 유한한 숫자 0 이상, Number.MAX_SAFE_INTEGER 이하. 문자열/불리언/NaN/Infinity/음수/안전 범위 초과를 거부한다.
- L50에서는 xp=0을 유지하며 양의 수여량 전부를 `discardedXp`로 보고한다. 포인트를 다시 주지 않는다.
- 유효한 0XP 수여는 새 캐릭터 사본과 0 증가량을 반환한다. 저장된 레벨/포인트를 추정해서 “복구”하거나 재지급하지 않는다.
- **보상 ID가 없는 수학적 함수다. 같은 보상을 다른 상태에 두 번 적용하면 XP도 두 번 증가한다.** 단일 처치/퀘스트 영수증의 중복 방지는 상위 reward controller가 원자적 저장과 함께 담당한다. 같은 입력 객체에 같은 호출을 반복하면 동일한 결과이며 입력은 그대로다.

실패: `{ok:false, code, reason}`, 변경 캐릭터를 반환하지 않는다.
코드: INVALID_CHARACTER / INVALID_XP / XP_PRECISION.

### allocateAttribute(character, key, amount=1)

성공: `{ok:true, character, spent}`.

strength/dexterity/intelligence만 허용한다. 양은 양의 안전 정수이며 보유 포인트 이하여야 한다. 추가 배분치만 증가시키고 정확한 포인트를 차감한다. 실패 코드는 INVALID_CHARACTER / INVALID_ALLOCATION / INSUFFICIENT_POINTS다. 임의 키·prototype처럼 보이는 키·소수·0·음수·NaN 등은 거부한다.

### experienceMultiplier(level, enemyTier, difficulty='normal')

`CORE_REFERENCE`의 낮은 적 티어 계수 × 난이도 XP 계수인 숫자를 반환한다. 잘못된 레벨·티어·난이도는 `null`이다. inherited `constructor`/`toString`/`__proto__`를 난이도 ID로 받지 않는다.

곱셈 결과는 참조 숫자의 IEEE-754 표현일 수 있다(예: 0.2×0.75는 0.15000000000000002). 실제 XP 수여는 아래 고정 정밀도로 저장한다. 수학적으로 알려진 배율을 임의로 올림/정수화하지 않는다.

### validateCharacter(character)

공유 저장/명령 진입 검증: `{ok:true}` 또는 `{ok:false,code:'INVALID_CHARACTER',reason}`.

검증하는 불변식:
- warrior, 안전 정수 레벨 1–50, 알려진 티어이며 해당 최소 레벨 이상.
- 정규화된 잔여 XP는 현재 임계값 미만, L50이면 정확히 0. 임계값 바로 아래의 IEEE 오차가 정규화 후 이미 한 레벨 분량이면 거부하여 grant0 승급을 막는다.
- 세 추가 능력치는 비음수 안전 정수. 배분치 합+남은 능력치 포인트는 해당 레벨까지 획득 가능한 총량 이하.
- 기술점수는 비음수 안전 정수이며 해당 레벨의 총 획득량 이하.
- skills는 식별자→0–100 정수, exclusiveBranches는 식별자→식별자 문자열, 장비는 정확한 7슬롯→null/문자열 형태.
- 순환/함수/undefined/비유한 숫자/접근자/특수 객체/배열 subclass·빈칸·추가 배열 속성은 거부. 최대 깊이32, JSON 노드2048의 명시적 R1 입력 안전 한도.
- 허용된 추가 JSON 필드는 새 결과에 깊은 복사로 유지한다.

**검증 한계:** 이 함수는 skill ID별 구매 조건·최대 원작 랭크·배타 관계의 의미·지출 영수증·장비 소유권·월드 상태를 검증하지 않는다. 해당 명령/저장 계층이 담당할 후속 범위다. skills의 형태 보존이 기술 실행 또는 구매 허용을 뜻하지 않는다. 포인트 상한 검증은 잔여량이 정확히 총량과 같은지 강제하지 않아, 실제 소비된 포인트를 레벨만 보고 다시 채우지 않는다.

## 3. Emberwatch 조정: XP 곡선과 정밀도

정본은 `app/src/progression-balance.js`의 불변 `PROGRESSION_BALANCE`다. `origin:'emberwatch_authored_adjustment'`, `referenceStatus:'UNKNOWN'`으로 표시한다. **아래는 원작 XP 곡선이 아니다.**

| 현재 레벨 L | 다음 레벨 필요 XP | 첫값→끝값 |
|---|---|---|
| 1–4 | 100 + 50×(L−1) | 100→250 |
| 5–14 | 300 + 40×(L−5) | 300→660 |
| 15–29 | 720 + 60×(L−15) | 720→1560 |
| 30–49 | 1650 + 90×(L−30) | 1650→3360 |
| 50 | 다음 레벨 없음 | null |

L1/0에서의 누적 요구량: L5=700, L15=5,500, L30=22,600, L50=72,700.

의도: 초반은 작은 임계값으로 포인트 투자 기회를 주고, 중·후반에는 다른 기울기의 진행 단계를 둔다. 모든 임계값은 이전보다 크며 승급 경계에서도 설명 가능한 증가폭을 유지한다. 임의 적 HP·이동 거리·실시간 대기와 연계하지 않는다.

**아직 증명하지 않은 것:** 이 곡선이 보상 공급·경제·기술 획득 속도에 맞는지, 실제 15–30/60–90분 및 2–4시간 관찰창을 충족하는지, 반복 파밍 없이 Expert/Master에 도달하는지. R1의 임계값 배열 또는 테스트 통과를 플레이 깊이/길이 검증으로 표기하지 않는다.

정밀도는 원작 규칙이 아닌 구현 정책이다:
- 잔여/실제 적용 XP를 1 XP = 1,000,000 정수 단위로 계산한다.
- 0.75×0.1 등 참조 계수로 발생하는 0.075 XP를 손실 없이 축적한다.
- 순수 IEEE 표현 잡음만 작은 허용 오차로 정규화한다.
- 상한 이전 실제 적용분이 이 정밀도보다 세밀하면 XP_PRECISION으로 명시적 실패한다. 조용히 0이나 1마이크로XP로 바꾸지 않는다.
- 상한 밖 폐기분은 상태에 저장하지 않는다. 큰 수여량은 상한까지 필요한 양으로 먼저 제한하므로 XP 덧셈이 안전 정수 단위 범위를 넘지 않는다.
- `discardedXp` 숫자는 일반 JS 뺄셈 표현을 사용하므로 소수에 미세 표현 오차가 있을 수 있다. 실제 저장 XP/레벨/포인트에는 누적되지 않는다.

## 4. 참조 XP 계수

| 플레이어 레벨상 티어 \ 적 티어 | Apprentice | Adept | Expert | Master |
|---|---:|---:|---:|---:|
| Apprentice (1–4) | 1 | 1 | 1 | 1 |
| Adept (5–14) | 0.5 | 1 | 1 | 1 |
| Expert (15–29) | 0.2 | 0.5 | 1 | 1 |
| Master (30–50) | 0.1 | 0.2 | 0.5 | 1 |

난이도 XP: Easy=1, Normal=1, Hard=0.75, Serious=0.75.  
예: L30 플레이어가 Apprentice 적을 Serious에서 처치하면 기본 처치 XP×0.075. 실제 캐릭터 티어가 아직 Apprentice여도 낮은 적 사냥 억제는 레벨 기준이다. 어떤 보상 종류에 배율을 적용할지는 reward controller/콘텐츠 정책이 결정하며, 본 API는 계수만 제공한다.

## 5. focused 검증

실행:
`node --test app/tests/progression.test.mjs`

현재 결과: **22개 통과 / 실패 0**. 이것은 새 R1의 deterministic handler 검사이며 이전425개 결과를 승계한 것이 아니다.

검사 범위:
- 원본 두 파일 byte-identical SHA, UNKNOWN/null/53개 reference_only 보존.
- 새 객체 shape·추가 배분과 기본값 구분·미학습·중첩 참조 분리.
- 곡선 전체49개 임계값·밴드·누적값·잘못된 레벨·L50 null.
- 1마이크로XP 경계·정확 임계·다중 레벨·4→5/14→15/29→30/49→50 포인트.
- L50 최대 수여·폐기·0수여·포인트 재지급 방지.
- 0.075 XP 4,000회 수여와 300XP 한 번의 결과 일치, 소수 임계/상한.
- 음수/NaN/Infinity/문자열/불리언/안전 범위 초과·미세 정밀도 입력 실패 불변.
- 실제 얻은 포인트 투자·부족/잘못된 키/양·prototype형 키 거부.
- 과다 포인트·잘못된 shape·레벨/티어/XP·손상 추가 JSON·getter 비실행.
- 정확 배열 인덱스 및 subclass 거부, 정규화 임계값을 통한 grant0 레벨업 차단.
- 모든50레벨×4적티어×4난이도 참조 계수, inherited 난이도 키 거부.
- 반복 순수 호출 결정성과 외부 보상 영수증 책임의 명시.

초기 focused 실행에서 발견한 signed zero의 출력과 테스트의 0.2×0.75 엄격 동등 기대를 수정한 뒤 위 결과를 얻었다. 읽기 검토에서 발견한 배열/정규화 경계도 회귀에 포함했다.

미실행: 전체 suite, 빌드, 브라우저, 일반 입력 UI, 전투, 저장 컨트롤러 통합, 실제 보상 경로/플레이 시간. 커밋·원격 변경·원본 프로젝트 변경 없음. 통합 담당자는 동일 API를 저장/보상/UI에 연결하고 별도의 원자성·보상 영수증·재진입 검사를 추가해야 한다.

