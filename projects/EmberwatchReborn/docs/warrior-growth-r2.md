# R2 전사 입문 성장·파생 수치

작성: 2026-10-09 UTC. 대상은 새 Emberwatch Reborn 재구현이다.  
담당 범위는 `warrior-growth.js`, `warrior-balance.js`, `warrior-growth.test.mjs`, 이 문서 4개다.  
**입문 9노드의 훈련/구매/검증/수치 계약만 구현했다. 실제 전투·모션·NPC 접근·화면·음향·일반 입력 플레이의 통과를 의미하지 않는다. 상위 44노드는 data-only다.**

## 1. 원본과 개발 조정의 경계

변경 없는 참조:
- `reference-core.js`: `04804f94aa38999f5e0af98094196394d703a3be4c3593d9338a3bc13bc8eb04`
- `reference-warrior.js`: `1fb06923bbf69a33e80593a734f86b39d22ef7cd1f260b9d5b0be9a15261d549`

원본 0.4.7/commit7240e494에서 보존한 캐시 참조다. 최신 원작 실측으로 승격하지 않는다. 참조의 53개 `implementationStatus:reference_only`, `UNKNOWN`, null, 원본 비용/랭크/배타 관계를 바꾸지 않았다.

| 보존한 원작 참조 수치/구조 | 별도 Emberwatch 조정 |
|---|---|
| 전사 시작 HP/MP/기력 55/40/45, 레벨 증가 4/2/3, STR/DEX/INT 18/12/10 | 추가 배분 능력치의 풀/피해/방어/속도/재생 환산 |
| 4개 기본 기술의 첫 비용 0, 입문9개 랭크별 비용·계수 | 명시적 NPC 기본훈련을 통해 네 기술을 함께 rank1로 받음, 증강의 최소 기반랭크1 |
| 돌진 기력10/12/14/16/18, CD3/2.5/2/1.5/1 | 돌진 이동거리·속도·접촉/회수·기절시간 |
| 철퇴 주무기 계수100–200%, CD0.1, 기절확률·관통 수치 | 훈련용 무장 환산 피해12, 철퇴 기력0·실제 모션0.52초·범위·기절시간 |
| 방패 수동 물리 블록25%, 랭크별25/50/75/100, 보법/원소방벽 보너스 | 능동70%감소·막은타격당기력6·유지기력0·전방각·이동감속 |
| 망치 기본30/45/65/90/120, 레벨계수2, 마나15/20/25/30/35, CD1 | 레벨계수 시작점을 L1로 선택, INT 주문배율·투사체 크기/속도/거리·모션 |
| 능력치/기술 포인트 밴드, 상위/배타 분기 카탈로그 | R2는 입문 티어만 지원하고 나머지44노드 구매/습득을 잠금 |

미확정 source 필드의 null을 0으로 덮어쓰지 않는다. 예를 들어 철퇴의 원작 기력값은 계속 null이고, 실행 계약의 기력0은 별도 개발 조정이다. 범위·시간·훈련용 장비 환산·재생·원소저항 적용 해석은 `WARRIOR_BALANCE` 및 아래 계약으로 식별한다.

## 2. API

모든 함수는 입력 캐릭터와 참조를 변경하지 않는다. 성공 결과의 캐릭터/수치/preview는 깊게 분리되어 있다. 실패는 `{ok:false,code,reason}`이며 변경 캐릭터를 내놓지 않는다.

### validateWarriorGrowth(character)

성공: `{ok:true,starterTrained,spentSkillPoints,earnedSkillPoints}`.

먼저 R1 `validateCharacter`를 적용한 다음:
- tier는 apprentice만. 레벨업으로 tier를 자동 바꾸지 않는다.
- 실제 skills에는 입문9개만, 랭크는 정수1부터 원본 비용 열 수까지.
- 기본 네 기술은 전부 없거나 모두 rank1 이상이어야 한다. 부분 학습/저장된 rank0/기반기술 없는 증강을 거부한다.
- 모든 증강은 기반기술 rank1 이상을 요구한다. 최소랭크1은 원본의 미확정 구매 조건을 보완한 명시적 개발 결정이다.
- 지출은 각 기술의 `upgradeCosts.slice(0,rank)` 합계. **총 지출 + 남은 skillPoints = 해당 레벨까지 참조 규칙으로 획득 가능한 총 기술점수**를 정확히 확인한다.
- R2에서 상위 기술·배타분기 기록·실제 장비 instance 장착은 아직 지원하지 않아 fail-closed한다.
- R1의 더 일반적인 검증과 달리 실제 R2 기술 원장은 소실/과다 점수 모두 거부한다. 기존 포인트를 재추정해 채워 주지 않는다.

주요 실패 코드: INVALID_CHARACTER, TIER_NOT_IMPLEMENTED, BRANCH_NOT_IMPLEMENTED, EQUIPMENT_NOT_IMPLEMENTED, UNKNOWN_SKILL, DATA_ONLY, INVALID_RANK, BASE_SKILL, PARTIAL_STARTER, STARTER_REQUIRED, SKILL_POINT_LEDGER.

### trainStarterSkills(character)

성공: `{ok:true,character,learned:[...ids],alreadyTrained}`.

학습 대상:
`shield_charge`, `mace_swing`, `shield_block`, `righteous_hammer`.

첫 호출은 참조의 첫 비용이 각각 0인지 확인한 뒤 네 기술을 rank1로 함께 학습시킨다. XP·레벨·티어·능력치·기술점수는 주입하지 않는다. 실제 NPC 접근/대화·커밋은 부모 controller가 책임진다.

반복 호출은 성공이되 `learned:[]`, `alreadyTrained:true`이고 이미 강화한 랭크와 소비한 점수를 그대로 보존한다. 손상된 부분 starter 상태를 무료 복구하는 함수가 아니다.

### previewSkill(character, skillId)

성공:
`{ok:true,id,name,tier,rank,maxRank,nextRank,cost,available,code,reason,current,next}`.

- 현재 미학습이면 current=null, 최대랭크면 nextRank/cost/next=null.
- current/next는 `referenceValues`, `runtimeValues`, `runtimeStatus`를 분리한다.
- referenceValues는 해당 랭크의 보관된 원본 값이며 null은 미확정 그대로다.
- runtimeValues는 스탯/현재 다른 증강을 반영한 실행 수치 또는 증강 효과다. 피해는 **대상 방어와 무작위 치명타 판정 전**이며 실제 적 HP 감소량이라고 표시하면 안 된다.
- 구매 가능한 다음 랭크뿐 아니라 점수가 부족한 다음 랭크도 읽기용으로 볼 수 있다. 이것이 구매 승인이 되는 것은 아니다.
- 미훈련 증강은 기반 행동이 없어 runtimeValues=null이며 STARTER_REQUIRED다.
- 알려진 상위44개는 DATA_ONLY, available=false, runtimeValues=null. 원본 다음랭크 값만 볼 수 있다.
- 원본 Champion of Truth의 불명확한 치명타 매핑은 계속 null. R2는 Master 수치를 임의 생성하지 않는다.

### purchaseSkill(character, skillId)

성공: `{ok:true,character,skillId,rank,cost}`.

preview와 **동일한 구매 판정**을 사용하고 정확한 다음 비용을 차감한다. 첫 기본훈련은 별도 함수로만 하며 purchase로 우회할 수 없다. 원장 검증 후 새 캐릭터를 반환한다. 부족 점수·최대 랭크·상위/data-only·잘못된 ID 등의 실패는 무변경이다.

모든 입문 기술을 최대랭크까지 구매한 총 지출은 79점이다:

| 기술 | 최대랭크 | 누적 비용 |
|---|---:|---:|
| shield_charge | 5 | 10 |
| armored_assault | 3 | 6 |
| mace_swing | 6 | 15 |
| stunning_strikes | 4 | 10 |
| crushing_blows | 3 | 6 |
| shield_block | 4 | 6 |
| shield_training | 3 | 6 |
| elemental_bulwark | 3 | 6 |
| righteous_hammer | 5 | 14 |

### deriveStats(character)

성공: `{ok:true,stats}`. 입력 장비나 외부 상태를 몰래 읽지 않는다.

핵심 stats 키:
- hpMax, manaMax, staminaMax
- strength, dexterity, intelligence
- armor, physicalDamage, moveSpeed, criticalChance
- healthRegen, manaRegen, staminaRegen
- 추가 명시값: criticalMultiplier, attackSpeed, castSpeed, spellPower, manaRegenDelay, staminaRegenDelay, resistances
- actions: 기본4개 ID의 실행 계약

미학습 action은 `{learned:false}`만 갖는다. 부모 전투는 learned를 먼저 확인해야 한다. 학습한 action에는 learned=true와 damage/manaCost/staminaCost/cooldown/duration/contact/range 공통 키가 있다. 이외 아래의 행동별 키를 사용한다.

## 3. 파생 수치의 단위와 환산

모든 시간은 초, 위치·범위·속도는 월드 단위 및 월드 단위/초, 재생은 초당 값이다. 확률은 0–1이다. 원소 resistanceBonus는 원본의 퍼센트포인트 단위(10=10%p)이며 다시 100배 하지 않는다.

`aSTR/aDEX/aINT`는 기본값이 아닌 **추가 배분량**이다.

| 결과 | R2 계산 |
|---|---|
| hpMax | 55 + 4×(L−1) + 2×aSTR |
| manaMax | 40 + 2×(L−1) + 2×aINT |
| staminaMax | 45 + 3×(L−1) + aDEX |
| STR / DEX / INT | 18+aSTR / 12+aDEX / 10+aINT |
| physicalDamage | 12 + 0.6×aSTR |
| armor | 4 + 0.1×aSTR |
| moveSpeed | 180 |
| criticalChance / criticalMultiplier | 0.05 + 0.001×aDEX / 1.5 |
| attackSpeed | 1 + 0.005×aDEX |
| castSpeed | 1 + 0.005×aINT |
| spellPower | 1 + 0.01×aINT |
| healthRegen | 0 |
| manaRegen / 지연 | 4 + 0.04×aINT / 0.5초 |
| staminaRegen / 지연 | 10 + 0.06×aDEX / 0.3초 |

기본 풀 55/40/45는 L1 무투자에서 그대로다. 기본 능력치18/12/10을 재차 위 환산에 넣어 풀을 이중 증가시키지 않는다. 파생 숫자는 표시/실행 일관성을 위해 소수8자리로 정규화하며 원본 데이터에는 적용하지 않는다.

physicalDamage12·armor4는 **R2 훈련용 무장 환산**이다. 실제 아이템 획득/소유/장착을 뜻하지 않으며 장비 인벤토리는 모두 null이다. 후속 실제 장비 계산과 합칠 때 이 값을 중복 적용하면 안 된다. 상위 패시브·음식·상태 버프·장비 접사·독립 주문 치명타 발전은 후속 범위이며 현재 완성으로 주장하지 않는다.

## 4. 네 행동과 다섯 증강의 실행 계약

### 철퇴

- damage = physicalDamage × 원본 랭크 계수(100/120/140/160/180/200%).
- 원본 cooldown=0.1초, 개발 staminaCost=0, manaCost=0.
- duration=max(0.30, 0.52/attackSpeed), contact=duration×0.35.
- range76, arcRadians2.1.
- Stunning Strikes는 stunChance 0.05/0.10/0.15/0.20, 개발 stunSeconds0.6.
- Crushing Blows의 armorPenetration 5/10/20은 **철퇴만** 적용한다. 망치에 전역 관통을 새로 부여하지 않는다.
- CD가 끝나도 아직 진행 중인 모션과 회수를 취소해 공격을 중첩시키면 안 된다. duration/contact 계약을 실제 전투·애니메이션 handler가 함께 사용해야 한다.

### 돌진

- duration0.48, contact0.08, speed900, distance/range162, travelDuration0.18, radius18.
- contact부터 0.18초 동안 이동하고 나머지는 회수다. 전체 duration 동안 speed를 곱해 거리432로 늘리지 않는다. distance 상한을 실제 이동에서 적용한다.
- 기본 damage0, stunSeconds0.75, passesThroughEnemies=false. 통과 증강은 Adept data-only다.
- 기력·CD는 원본 랭크값. Armored Assault를 배우면 damage=현재 armor×1/1.5/2, 기력 비용은 해당 돌진 랭크 기본값×1.25.
- 기절/장갑 피해는 실제 충돌에만 적용하고 캐스트 클릭 즉시 원격으로 지급하지 않는다.

### 방패

- damage0, manaCost0, cooldown/duration/contact/range0.
- **duration0은 즉시 무제한 효과가 아니라 held 동작이며 해제 입력까지 별도 유지 상태**다.
- holdCostPerSecond=0, staminaCost=6, costTrigger='successfully_blocked_incoming_hit'.
- damageReduction=0.70, halfAngleRadians=π/2. 전방180° 내 실제 능동 블록에만 적용한다.
- 기본 moveMultiplier0.5. Shield Training은 원본 감속 변화 −20/−40/−70%를 감속량에 곱해 최종 이동배율0.6/0.7/0.85로 바꾼다. 이동속도 자체를70% 증가시키는 뜻이 아니다.
- 수동 방어는 passiveBlockChance0.25, passiveBlockAmount25/50/75/100, passiveDamageType='physical'로 분리한다. 수동 flat block을 능동70%감소나 원작 미확정 능동차단량으로 대체하지 않는다.
- Elemental Bulwark는 방패 유지 중 fire/ice/lightning resistanceBonus10/20/40, poison0. 평상시 stats.resistances는 0이며 영구 저항으로 새지 않아야 한다.
- 같은 피격에 능동 비용을 여러 번 내거나 수동방어에도 같은 기력 비용을 자동 부과하지 않는다. 실제 피격 처리 순서는 전투 담당자의 별도 통합 검사 대상이다.

### 망치

- damage = (원본 기본피해 + 2×(L−1)) × spellPower. 레벨 증가 원점을 L1로 선택한 것은 개발 환산이다.
- 마나15/20/25/30/35, 기력0, 원본 cooldown1.
- duration=max(0.30,0.52/castSpeed), contact=duration×0.44.
- speed560, range460, radius16, pierces=true, armorPenetration0.
- 경로상 다수 적 타격을 실제 투사체로 처리한다. 번개·방어감소·귀환 분기는 아직 잠겨 있다.

기본 철퇴/망치0.52초와 최소0.30초는 기존 준비·접촉·회수 아틀라스를 재매핑하기 위한 조정이다. 코드상 시간값이 있다고 실제16–24샘플이 자연스럽게 보인다는 뜻은 아니다. 프레임율·타격감·동기화·화면 가독성은 실제 시각/청각 검수로 남아 있다.

## 5. 부모 통합 계약

- 새 게임은 R1 createCharacter 그대로 미훈련 상태로 시작할 수 있다. 실제 NPC 첫훈련 입력에서 trainStarterSkills의 결과를 커밋한다.
- 상태 로드/저장/기술 변경의 입문 검증은 validateWarriorGrowth를 함께 사용한다. 기존 state의 “skills는 무조건 빈 객체” 제한을 제거할 경우 이 더 구체적인 원장 검증으로 대체한다.
- 기본 공격/돌진/방패/망치 모두 deriveStats의 actions를 권위 있는 수치로 사용한다. UI preview도 같은 값을 읽고 전투·UI에 두 번째 수식을 복제하지 않는다.
- 효과 적용 시점, 자원/쿨다운 소비, 피격/방패/기절, 충돌/발사체·사망·재진입은 전투/상태/저장 담당 코드의 별도 책임이다.
- 입력 중복·구매 실패·저장 실패 시 부모 controller의 원자적 커밋을 유지한다. 이 모듈은 직접 저장하거나 NPC 거리를 검증하지 않는다.
- 기존 R1의50검사를 축소하거나 과거425결과를 승계하지 않는다. 새 단계가 실제로 바꾼 요구만 명시적으로 갱신한다.

## 6. focused 검증 결과와 한계

실행:
`node --test app/tests/warrior-growth.test.mjs app/tests/progression.test.mjs`

결과: **신규 성장28 + 기존 progression22 = focused50개 통과**. 이는 기존 R1 전체50개를 대신하는 총합이 아니다. state/save/controller 등 부모 통합 검사는 별도로 유지한다.

신규 검증:
- 정확한9노드/4starter 범위, 참조파일 SHA/원본 null 보존.
- 명시적 무료훈련·반복 호출·강화랭크 보존·부분 상태 거부.
- 모든9개 모든랭크 실제 구매·총79점 지출·잔여/지출 원장·최대랭크·부족포인트·기반기술.
- 44개 상위기술의 L50에서도 data-only 잠금, 알 수 없는 ID/프로토타입형 ID, 미구현 티어/분기/장비 거부.
- 기본 풀/레벨 증가·추가 속성 환산·전투 수치 단위·모션/원본 CD 구별.
- Armored Assault·Stunning Strikes·Crushing Blows·Shield Training·Elemental Bulwark의 전 랭크 효과.
- 능동/수동 블록·막은 타격당 비용·세 원소만 적용·정상 상태로 누출 없음.
- preview 다음값과 실제 구입 뒤 현재값의 전 랭크 일치, 불충족 preview 순수성, 반환 객체 분리.
- 고투자 속도 하한·유한수치·손상 입력 실패.

fixture의 XP는 실제 grantExperience API로 수여했지만 캠페인 처치로 얻은 것이 아니다. 합성 handler 검사를 정상 플레이·보상 경제·전투 재미 증거로 표시하지 않는다. 이번 담당 작업에서 전체 suite·브라우저·빌드·커밋·원격/원본 변경은 하지 않았다.

