# R3 장비·제작 성장 기반: 통합 전 독립 stage

작성/검사: 2026-10-09. 이 폴더의 네 파일만 신규 작성했다. 주 저장소·원본 0.4.7은 수정하지 않았다.

**상태:** 순수 Node 검사 31/31 통과. UI, NPC 근접, 실제 전투, 저장 매니저 장애/동시성, 정상 플레이 획득 예산과 재미는 **미검증**이다. 합성 fixture의 금화·재료·진행 플래그를 실제 획득으로 주장하지 않는다. R2의 기존 검사 수나 유실된 구현의 통과 수를 합산하지 않는다.

## 1. 근거와 범위

읽은 보호 원본 위치: `/workspace/shared/emberwatch-recovery-baseline-20261009/proto/projects/Emberwatch`, baseline `7240e494`.

| 원본 파일 | SHA256 |
|---|---|
| `app/src/campaign/inventory.js` | `0e866192e7775baf47e49c08b6cf8cd5ce6fb2eb2af72f0c9319449628676b10` |
| `app/src/campaign/economy.js` | `0062b9bdf632bd9bf7482f64661eb8a3c3fbaae803058dc20c67a61f090e95ed` |
| `docs/campaign/inventory-design.md` | `73a4b7fc88b5556ca7195a0023e96d291b5e58fb15e79f7bc8c0a1f818face9e` |

함께 읽음: 보호 원본 `reference-core.js`, 새 프로젝트 `state.js`/`campaign.js`/`controller.js`, `docs/requirements/warrior-completion-checklist.md`의 장비·경제·저장 기준. 원본 모듈을 그대로 복사한 복구물이 아니라 그 계약을 참고한 작은 새 구현이다.

### 구분

- **원작 참조 확인 범위:** 원본 `CORE_REFERENCE`에 보존된 전사 기본 STR/DEX/INT 18/12/10, 입문/숙련/전문/달인 명칭과 최소 레벨 1/5/15/30. 보존된 캐시 출처의 사실이며 이번 작업에서 원작 실기를 관찰한 값은 아니다.
- **원본 Emberwatch 구현/승인 기획의 계약:** 7슬롯, 품질과 티어 분리, 영구 기본+배분 능력치 요구, 전사 철퇴/방패, 소유 인스턴스와 장착 참조 분리, 같은 기본 아이템 여러 개, 실패 시 입력 불변, 전체 상태와 영수증 원자 커밋. 원본 코드가 존재한다는 사실을 Hammerwatch II 실측 증거로 바꾸지 않는다. 특히 7슬롯은 승인 기획의 고정 계약이다.
- **새 Emberwatch 조정:** 아래의 모든 장비 이름·숫자·요구량·가격·제작 재료·강화·상인 현금/재고·보급 묶음·상한. 원작 동일 수치나 완료된 밸런스라고 하지 않는다.
- **미확인:** 원작 개별 장비 원표/가격, 정확한 접사·품질 생성/중첩, 형상·부적 전체, 강화 및 해체 원식. `null`인 원작 unknown을 0이나 이 수치로 덮어쓰지 않는다.

## 2. 파일과 API

- `equipment-content.js`: 고정된 읽기 전용 콘텐츠/수치/리비전. 브라우저·시간·난수 의존 없음.
- `equipment.js`: 입력 불변 순수 검사/견적/명령/합산.
- `equipment.test.mjs`: 독립 합성 상태 검사.
- `README.md`: 근거, 계약, 수치, 통합 경계, 잔여 목록.

ES 모듈이며 외부 패키지나 원 repo import가 없다. Node 24에서 `node --test equipment.test.mjs`로 실행한다. 검사 소요는 이번 실행 약 1.4초다. 브라우저/빌드/전체 suite는 실행하지 않았다.

| export | 반환 |
|---|---|
| `validateEquipmentState(state)` | `{ok:true}` 또는 `{ok:false,code,reason}` |
| `equipmentBonuses(state)` | `{ok:true,bonuses}` 또는 실패 |
| `equipmentRows(state)` | `{ok:true,vendor:{id,cash,stock},rows}`. 소유 장비의 실제 인스턴스, 기본 정보, 강화 반영 stats, 장착 여부, 합법성, 매각가, 현재 슬롯 대비 deltas |
| `quoteEquipment(state,command)` | 성공 여부, `goldCost/goldGain/materialsCost`, `event`, `bonusesAfter/deltaBonuses`. 실행과 같은 조건 사용. 불가능하면 정확히 같은 실패 코드/문구 |
| `applyEquipmentCommand(state,command)` | `{ok:true,state,receipt,replayed,bonuses}` 또는 실패. 실패에는 부분 상태 없음 |

공통 실패는 한국어 `reason`을 포함한다. 기존 상태의 미지원/불일치도 고치거나 초기화하지 않고 거부한다. 결과 및 조회 객체는 원본과 분리되어 있다.

### 상태 계약

기존 상태의 다음 영역을 읽는다. 그 외 정상 JSON 필드는 변경 없이 깊은 복사로 보존한다.

- `character.classId === 'warrior'`, `level`, `tier`, `attributes.{strength,dexterity,intelligence}`는 **추가 배분치**.
- `character.equipment`: `mainHand/offHand/head/chest/hands/feet/accessory` 정확히 7키. 값은 `null` 또는 소유한 인스턴스 ID.
- `inventory.equipmentInstances`: `{id,baseId,upgradeRank}` 배열. 같은 `baseId`가 두 개여도 ID가 다르면 독립 물건이다. 현재 품질·티어는 고정 base에서 조회한다. 임의 `stats/affixes/enchantment/tier/quality` 필드는 수용하지 않는다.
- `inventory.materials`: 안전한 정수 수량 맵. 다른 캠페인 재료도 보존한다.
- `inventory.tools`: 중복 없는 ID 배열. 다른 캠페인 도구도 보존한다.
- `gold`, `stats.earnedGold`, `stats.spentGold`: 0 이상 안전한 정수, `earnedGold - spentGold === gold`.
- `world.objectives`: 정수 진행 맵, `world.claimedRewards`: 중복 없는 보상 ID 배열.
- 신규 `equipmentProgress`: `{version:'emberwatch-r3-equipment-v1',receipts:[],claimedAwards:[]}`.

기존 R2의 빈 장비 상태만 `equipmentProgress` 부재를 허용한다. 최초 성공 명령에서 생성한다. **R3 통합 저장 스키마에서는 신규/이행 시 이 필드를 만들고 이후 필수로 검사할 것.** 부분 장비나 영수증을 버리는 자동 수리는 하지 않는다. 원본 0.4.7 인벤토리의 일반 임포트/마이그레이션 API는 아니다.

여기서는 장비에 필요한 최소 영구 상태만 검사한다. 전체 캐릭터 포인트/스킬 지출·생존·전투·세계·저장 검증을 대체하지 않는다. 보조 모듈을 붙이기 위해 기존 검증을 약화하지 말고 부모의 전체 검증과 함께 사용한다.

### 명령

모든 명령은 고유 `commandId`가 필요하다. 안전한 영숫자로 시작하는 최대 80자 ID이며 `. _ : -`를 허용한다. 설명 없는 추가 필드·수량 주입은 거부한다.

| type | 추가 필드 | 효과 |
|---|---|---|
| `receiveEquipmentAward` | `awardId`, 해당 보급에 필요하면 `station` | 고정된 일회성 묶음만 획득 |
| `buyEquipment` | `baseId`, `station:'blacksmith'`, `expectedGold?` | 재고 1개를 구매 |
| `equipItem` | `itemId`, `slot?` | 정확히 그 물건 장착; 기존 슬롯 물건은 소지품에 유지 |
| `unequipItem` | `slot` | 슬롯만 비움; 물건을 없애지 않음 |
| `sellItem` | `itemId`, `station:'blacksmith'`, `expectedGold?` | 해제한 정확히 그 물건을 매각 |
| `craftItem` | `recipeId`, `station:'workshop'`, `expectedGold?` | 1회분 재료/금화를 지불해 새 물건 생성 |
| `upgradeItem` | `itemId`, `expectedRank`, `station:'workshop'`, `expectedGold?` | 물건 ID를 유지해 +1, 최대 +2 |

- `expectedGold`는 비용 또는 매각 수입의 양수 금액이다. 제공했다면 실제 고정 금액과 같아야 한다.
- `expectedRank`는 필수다. +0을 보고 누른 입력이 새 명령 ID로 중복 도착해도 이미 +1이면 `STALE_UPGRADE`로 막아 의도하지 않은 +2 비용을 지불하지 않는다.
- `station` 문자열 자체는 실제 근접 증명이 아니다. 부모 runtime이 지도/NPC/작업대 거리와 생존·대화 가능 여부를 권위적으로 확인한 다음 호출한다.
- 장착, 해제, 강화는 HP/마나/스태미나를 회복시키거나 XP/레벨/티어/스킬을 변경하지 않는다. 자원 최대치 변경 후 현재량 정책은 아래 통합 목록에서 다룬다.

## 3. 중복·원자성·저장 경계

인스턴스 ID는 `equipment:<commandId>:<outputIndex>`이다. 시간/난수에 의존하지 않으며 같은 캠페인의 동일 성공 명령에서 같은 ID를 만든다.

- 같은 성공 ID + 동일 명령: `replayed:true`, **현재 상태**의 복제와 기존 영수증만 반환. 구매 후 판매한 뒤 옛 구매를 다시 보내도 물건이 부활하지 않는다.
- 같은 성공 ID + 다른 명령/필드: `COMMAND_CONFLICT`.
- 실패한 명령: 영수증/재고/골드/재료/상태 변경 없음. 아직 성공하지 않은 ID를 이후 올바른 입력에 재사용 가능.
- 같은 보급을 새로운 명령 ID로 요청해도 `claimedAwards`가 별도로 막는다.
- 영수증의 명령과 효과를 고정 콘텐츠로 재투영해 현재 소유/강화/장착/보급 기록과 대조한다. 중복/변경 ID, 임의 강화치, 금액 변조, 유령 장착, 이력 삭제로 남은 물건을 정당화하는 상태를 거부한다.
- 영수증은 최대 4096, 동시 소유는 최대 128. 상한에서 새 거래는 실패한다. 기존 성공 명령 재시도는 영수증 상한에서도 허용한다. 기록을 지워 ID를 재사용하지 않는다.
- JSON 형식/유한 수치/안전한 정수/접근자/숨겨진 키/희소 배열/순환/프로토타입 등을 검사한다. 문자열 명령은 고정 카탈로그의 own-property만 조회한다.

**필수 커밋 순서:** 현재 durable snapshot → 같은 commandId로 순수 명령 → 성공 전체 `state`를 expectedRevision/공유 잠금이 있는 기존 저장 매니저로 커밋 → 확인 후에만 live state/UI 성공 처리. 저장 실패면 반환 상태를 적용하지 않는다. 성공 여부가 불명확하면 기존 저장 정책대로 reload 후 같은 ID를 재시도한다. `replayed:true`를 새로운 드롭/자원 효과처럼 다시 방출하지 않는다.

이 모듈의 순수성만으로 동시 탭이나 저장 실패까지 검증되었다고 하지 않는다. 영수증은 암호 서명이나 악의적인 전체 세이브 재작성 방지가 아니다. 과거의 모든 전투·재료 획득을 재현하지 않으며 실제 보상 가드는 부모 캠페인이 담당한다.

## 4. 작은 초반 콘텐츠와 수지

아래는 모두 **Emberwatch 개발 조정값**. 목표는 첫 마을 → 잿길 → 첫 던전에서 장비/제작/강화 중 소비를 고르는 작은 기반이다. 정상 난이도의 실제 획득 수지·시간 검사는 아직 없다.

모든 장비는 입문/common이며 추가 요구가 없는 항목의 영구 요구는 STR18/DEX12/INT10이다. 가격/재료는 사용자에게 사전에 표시하고 부족한 실제 명령도 막는다.

| baseId / 이름 / 슬롯 | 기본 장비 보너스 | 구매/기본 매각 | 1회 강화당 추가 | 추가 요구 |
|---|---|---:|---|---|
| iron_mace / 초소 철퇴 / 주무기 | 물리 공격 +2 | 32 / 12 | 물리 공격 +1 | STR20 |
| oak_shield / 참나무 방패 / 보조 | 방어 +2, 스태미나 최대 +3 | 28 / 10 | 방어 +1 | 없음 |
| padded_hood / 누비 두건 / 머리 | 체력 최대 +5 | 18 / 6 | 체력 최대 +3 | 없음 |
| guard_coat / 초소 외투 / 가슴 | 방어 +2, 체력 최대 +4 | 34 / 12 | 체력 최대 +3 | 없음 |
| travel_gloves / 길잡이 장갑 / 손 | 물리 공격 +1 | 20 / 7 | 물리 공격 +0.5 | DEX13 |
| trail_boots / 잿길 장화 / 발 | 이동속도 +6 월드단위/초 | 24 / 8 | 이동속도 +2 | 없음 |
| focus_charm / 집중 목걸이 / 장신구 | 마나 최대 +5, 마나 재생 +0.3/초 | 24 / 8 | 마나 최대 +2 | INT12 |
| runner_vest / 척후 조끼 / 가슴 | 스태미나 최대 +5, 이동속도 +4 | 34 / 12 | 스태미나 최대 +2 | 없음 |

가슴은 방어/체력과 자원/이동의 선택이다. 이 숫자만으로 실제 전투 빌드 차이가 입증되지는 않는다. `focus_charm`은 7슬롯의 목걸이이며 별도 부적 시스템 완성을 뜻하지 않는다.

- 마을 대장장이 시작 매입 자금 160, 각 기본 장비 판매 재고 2. 순수 조회·메뉴 재진입으로 초기화하지 않는다.
- 구매 금액은 상인 현금에 더하고 매각 금액은 상인 현금에서 뺀다. 부족 시 실패한다.
- 매각은 인스턴스 소유를 제거한다. 현재는 되사기/매각품 진열/시간 재입고가 없다. UI는 이 한계를 알려야 하며, 원본의 더 넓은 상점 시스템을 완료했다고 표시하지 않는다.
- 제작/강화 비용은 작업대 서비스 비용으로 소모되며 마을 상인의 매입 자금에 넣지 않는다. 재료도 정확한 수량만 소모한다.

### 제작 3개

모두 `workshop` + `smith_tools` 필요. 도구는 소모하지 않는다.

| recipeId | 진행 조건 | 금화 | 재료 | 출력 |
|---|---|---:|---|---|
| oak_shield | `trained >= 1` | 15 | iron1 + wood2 | 참나무 방패 1개 |
| runner_vest | `trained >= 1` | 20 | thread3 + wood1 | 척후 조끼 1개 |
| focus_charm | `first_dungeon_cleared >= 1` | 18 | iron1 + ember_shard1 | 집중 목걸이 1개 |

+1 강화: trained, 도구, 금화12 + iron1. +2 강화: first_dungeon_cleared, 도구, 금화22 + iron2 + ember_shard1. 장비 보너스는 각 단계의 동일 증가량을 더한다. 매각가는 +1일 때 기본+4, +2일 때 기본+12다. 강화/매각 차익으로 금화를 생성하지 않는다.

### 제안된 획득 훅

| awardId | 권위 조건 | 신규 장비/재료/도구 |
|---|---|---|
| workshop_supplies | `trained >= 1`, blacksmith | smith_tools + iron1 + wood2 + thread1 |
| warden_cache_gear | 기존 `world.claimedRewards`에 `chest:warden-cache` | 누비 두건 1 + iron1 + thread2 |
| first_dungeon_salvage | `first_dungeon_cleared >= 1` | iron2 + wood1 + ember_shard1 |

새 보급에서 금화/XP를 추가하지 않는다. 기존 R2 상자는 이미 금화/XP/iron/물약을 주므로 통합 시 새 추가분까지 합한 전체 수지를 확인해야 한다. 첫 던전 objective는 현재 R2에 없으며 이 문서가 실행 완료 플래그를 만드는 것은 아니다. NPC/상자 권위 핸들러에서 고정 awardId만 연결하고 임의 보상 payload를 받지 않는다. 같은 보급을 이미 받은 플레이어에게 재진입 시 또 주지 않는다.

## 5. equipmentBonuses와 실제 능력치 통합

`equipmentBonuses`는 **실제로 소유하고 장착한 인스턴스만** 합산한다. 훈련용 무장 환산치 12 공격/4 방어는 포함하지 않는다. 현재 장비 공격 +2는 소지한 철퇴의 추가 보너스이며 원작 무기 최종 공격력이나 훈련 무기의 인벤토리 소유 증거가 아니다.

부모의 R2 `deriveStats`가 기존 훈련 환산을 유지하면서 이 flat delta를 한 번 더하는 구조를 제안한다. 그 방식이라면 초소 철퇴 +0을 장착했을 때 기본 훈련 공격 12 → 14가 된다. **장비를 절대 무기 공격력으로 대체하는 방식과 동시에 적용하면 이중 계산된다.** 통합에서 한 방식을 명시적으로 택하고 테스트할 것.

- 최대 자원·방어·물리 공격·영구 능력치·이동속도: 같은 명칭의 flat delta.
- 재생: 초당 delta. 비율 필드(`criticalChance`, `attackSpeed`, `castSpeed`, `spellPower`, `criticalMultiplier`)는 0~1 단위의 **추가량**이며 현재 콘텐츠는 모두 0이다. 비율 0을 기본 배율 0배로 덮어쓰지 않는다.
- 현재 콘텐츠는 STR/DEX/INT 추가가 없다. 이후 장비 속성을 추가하면 영구 요구 판정과 추가 파생식 순서를 먼저 정의해야 한다. 임시 버프나 장비 자체 보너스로 현재 장비의 요구를 충족시키지 않는다.
- raw 장비 stats/비교 delta와 방어·치명타·기술 배율을 거친 최종 타격을 구분한다. `equipmentRows`는 원시 장비 보너스 차이를 제공하며 피해량 예측기는 아니다.
- 모든 실제 지원 stat key를 합산/비교한다. UI는 비율이면 %, 재생이면 /초, 속도이면 월드단위/초로 일관되게 표시해야 한다.

## 6. 부모 통합 체크리스트: 모두 미검증

- [ ] 새 저장 버전/명시적 R2 이행에서 빈 equipmentProgress를 설치하고 R3 재진입 시 필수 검사. R2 전체 검증을 보존하면서 실제 인스턴스를 검증.
- [ ] 기존 `validateWarriorGrowth`의 '모든 장비 null' 잠금은 적법한 장비 검사로 대체. 스킬 지출/미구현 고티어 잠금은 그대로 유지.
- [ ] 기존 공용 runtime/controller에 이 동일 pure 명령을 연결. 거리·생존·NPC/작업대 상태를 command.station보다 먼저 권위 확인.
- [ ] commandId를 실제 입력마다 한 번 생성하고 비동기 저장 재시도에서 유지. 빠른 중복 강화에는 expectedRank 유지.
- [ ] 전체 반환 상태의 원자 저장, 실패·불명확 커밋·충돌·reload·탭 간 동시성 회귀.
- [ ] deriveStats에 보너스 한 번만 반영하고 공격/방어/모션/자원 최대 변화에 적용. 장착/해제는 무료 회복이 아니며 현재량은 필요 시 새 최대치로 clamp.
- [ ] 장비 요구보다 능력치가 낮아지는 재분배는 먼저 적법하게 해제하거나 동일 원자 변경에서 처리. 잘못된 능력치 상태를 먼저 저장하지 않음.
- [ ] 구매/제작 목록에서 견적의 불가 이유와 금화/재료/요구량 표시. 가능한 항목 우선, 다음 입문 진행순. 고정 콘텐츠 3개 이상의 빈 고티어 목록을 늘리지 않음.
- [ ] 같은 기본 아이템 두 개를 ID로 구별하고 어느 물건을 강화/판매하는지 표시. 재고/매입 자금/되사기 없음도 표시.
- [ ] 마을→잿길→첫 던전을 정상 입력으로 진행하여 골드·재료·선택 비용·귀환 비용을 측정. 도구/강화/장비가 의미 있는 선택인지 관찰. 합성 풍부한 fixture를 근거로 삼지 않음.

## 7. 명시적 잔여 범위

- 형상 수집/변환/적용, 별도 부적 시스템, 접두·접미 생성·중첩·재굴림, 품질별 룰, 고유품 2종 이상의 탐험 획득과 고유 행동.
- 숙련/전문/달인 아이템, 전사 외 클래스, 티어/품질이 다른 동일 base 변종, 원작 아이템 원표, 미확인 요구량과 강화 식의 검증.
- 인챈트/해체/재료 반환, 요리/냄비·물약 보충, 도구 제작 및 탐험 해금 연동.
- 상인별 테이블/가격, 세계 시간 24시간 재고 주기, 매각품 되사기, 재고 회수/교체. 현재 정적 상인은 그 완료를 대신하지 않는다.
- 모든 장비의 실제 스프라이트/전투 모션·방패 효능, UI 키보드/패드·접근성, 저장 실패 실제 처리와 정상 획득 경제 밸런스.
- 장기 영수증 크기/조회 성능 검증과 안전한 미래 이행. 현재 상한은 fail-closed하며 이력 삭제로 해결하지 않는다.

## 8. 이번 확인

`node --check equipment.js`, `node --check equipment-content.js` 및 `node --test equipment.test.mjs` 통과. 테스트는 31개다.

두 물건 독립성/7슬롯/영구 요구/정확한 거래·제작·강화/세 레시피/두 단계 강화/동일 명령 재응답/새 ID 중복 강화 방지/판매 후 옛 구매 재시도/일회성 획득/상인 현금·재고/골드·재료 부족 및 overflow/수치 및 JSON 변조/128 물건·4096 영수증 상한/JSON 저장 재진입/조회와 실패 불변을 확인했다. 저장 매니저를 호출한 테스트는 없으며 브라우저 정상 플레이나 시장 사례와의 품질 동등성은 평가하지 않았다.
