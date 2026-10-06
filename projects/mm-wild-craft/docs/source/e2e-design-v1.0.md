# 메이플몬스터즈: Wild & Craft
## E2E 종합 상세 설계서 v1.0

**Target Platform:** MapleStory Worlds  
**Genre:** 몬스터 수집 × 액션 RPG × 크래프팅 × 거점 자동화  
**Play:** Solo / 1~4인 Co-op 원정  
**View:** 메이플식 2D 사이드뷰 오픈존  
**Core Fantasy:**  
> 내가 포획한 메이플 몬스터들과 함께 탐험하고, 몬스터들의 개성을 활용해 나만의 캠프를 성장시킨다.

---

# 1. 게임의 핵심 정의

Palworld의 핵심 재미는 단순한 몬스터 포획이 아니라 **전투·포획·탐험·건설·생산·자동화가 하나의 순환 구조를 만드는 것**이다. 실제 Palworld 역시 포획 생물을 전투뿐 아니라 건축, 생산, 농업, 자동화에 활용하는 구조를 핵심으로 제시한다. citeturn433230search0turn433230search3

Wild & Craft는 이를 메이플 IP에 맞게 다음처럼 변환한다.

| Palworld | Wild & Craft |
|---|---|
| Pal | 메이플 몬스터 |
| Pal Sphere | 몬스터 카드 |
| Palbox / Base | 몬스터북 캠프 |
| Work Suitability | 작업 적성 |
| Open World | 메이플식 사이드뷰 오픈존 |
| Free Building | 슬롯·그리드형 캠프 건설 |
| Survival Hunger | 몬스터 활력·캠프 식량 |
| Factory Automation | 몬스터 작업 자동화 |
| Technology | 도감 연구 |
| Gun 중심 전투 | 메이플식 무기·스킬 액션 |
| Mount | 몬스터 동행 능력 |
| Harsh survival | 밝고 유쾌한 생태 조사·협력 |

### 핵심 차별화

Wild & Craft의 정체성은 **“잡는 재미”에서 끝나지 않는다.**

몬스터를 하나 새로 잡으면:

**전투력이 올라가거나 → 새로운 작업이 가능해지고 → 새로운 재료를 자동 생산할 수 있으며 → 새로운 장비·카드를 제작하고 → 더 위험한 지역으로 갈 수 있다.**

즉,

> **몬스터 수집 자체가 생산 테크트리다.**

이것을 게임 전체를 관통하는 핵심 설계 원칙으로 사용한다.

---

# 2. Core Loop

## 2.1 30초 루프

```text
이동
 ↓
몬스터/자원 발견
 ↓
전투 또는 채집
 ↓
재료 획득 / 몬스터 약화
 ↓
포획 시도
 ↓
새 몬스터·전리품 획득
```

## 2.2 5분 루프

```text
필드 탐험
 ↓
자원 채집
 ↓
몬스터 포획
 ↓
인벤토리 채움
 ↓
캠프 귀환
 ↓
몬스터 배치
 ↓
제작/생산 시작
```

## 2.3 30~60분 루프

```text
새 지역 탐험
 ↓
새 몬스터 포획
 ↓
새 작업 적성 확보
 ↓
자동화 효율 증가
 ↓
상위 장비/카드 제작
 ↓
지역 보스
 ↓
다음 지역 개방
```

## 2.4 장기 루프

```text
몬스터북 완성
→ 희귀 개체 확보
→ 최적 작업 조합
→ 캠프 확장
→ 고급 생산라인
→ 보스/이벤트
→ 신규 지역
→ 시즌 몬스터
```

---

# 3. 플레이 경험 목표 — MDA

첨부 기획의 핵심 조건인 Aesthetics를 기능별로 연결한다.

| Aesthetic | Wild & Craft 구현 |
|---|---|
| Sensation | 메이플 몬스터 특유의 움직임·타격·작업 애니메이션 |
| Fantasy | 몬스터 조사대원이 되어 몬스터와 생활 |
| Narrative | 지역 생태 복원과 몬스터북 완성 |
| Challenge | 엘리트 몬스터·보스·상위 지역 |
| Fellowship | 1~4인 협동 원정 |
| Discovery | 신규 지역·몬스터·희귀 특성 발견 |
| Expression | 캠프 배치·작업 조합·동행 몬스터 |
| Submission | 몬스터가 알아서 생산하는 관찰·자동화 재미 |

특히 **Discovery → Expression → Submission**을 Wild & Craft의 중심 감정 곡선으로 설정한다.

---

# 4. 세션 및 월드 구조

## 4.1 전체 구조

```text
[STATIC ROOM]

메이플 탐험대 본부
        │
        ├── 개인 캠프
        │
        └── 원정 게시판
                 │
              파티 생성
                 ↓
[INSTANCE ROOM]

원정 지역
 ├ Zone 01
 ├ Zone 02
 ├ Hidden Area
 └ Boss Area
```

현재 MSW의 `RoomService`는 서버에서 Instance Room을 생성하고 지정 유저를 이동시키는 구조를 지원한다. 기존 `InstanceMapService`는 deprecated 상태이므로 신규 구현은 `RoomService` 기준으로 설계한다. citeturn372507search0turn372507search2

MSW에서는 서로 다른 Instance Room 사이를 직접 이동할 수 없으므로, 캠프와 원정 룸을 분리할 경우 내부적으로 Static Room을 경유하는 구조가 필요하다. citeturn372507search1

### 권장 구성

**Static Room**
- 탐험대 본부
- 상점
- 원정 게시판
- 파티 구성
- 이벤트 NPC

**Personal Camp Instance**
- 개인 캠프
- 건축
- 몬스터 배치
- 제작
- 저장

**Expedition Instance**
- 최대 4인
- 필드
- 보스
- 희귀 자원
- 포획

---

# 5. 캐릭터 시스템

## 기본 능력치

```text
HP
ATK
DEF
MOVE_SPEED
CRIT_RATE
CRIT_DAMAGE
```

### 장비

초기 버전은 복잡성을 줄여 4슬롯만 사용한다.

```text
Weapon
Armor
Accessory
Tool
```

### 무기 계열

- 검
- 활
- 완드

각 무기는 역할을 명확히 구분한다.

| 무기 | 역할 |
|---|---|
| 검 | 근거리·브레이크 |
| 활 | 원거리·포획 준비 |
| 완드 | 속성 공격·상태이상 |

---

# 6. 전투 시스템

## 6.1 기본 흐름

```text
Approach
→ Basic Attack
→ Skill
→ Monster Reaction
→ Break/Groggy
→ Kill 또는 Capture
```

플레이어와 동행 몬스터가 동시에 싸운다.

### 동시 전투 인원

솔로:

```text
Player
+
Partner Monster 1
```

4인 파티:

```text
Player ×4
Partner Monster ×4
```

최대 8개의 아군 전투 유닛.

---

# 7. 대미지 계산

```text
Damage =
ATK
× SkillCoefficient
× 100 / (100 + DEF)
× ElementMultiplier
× CriticalMultiplier
× RandomVariance
```

### RandomVariance

```text
0.95 ~ 1.05
```

### Critical

```text
Normal = 1.0
Critical = 1.5
```

### 초기 속성

MVP에서는 과도한 상성 암기를 막기 위해 4개만 사용한다.

```text
NORMAL
FIRE
NATURE
ICE
```

추후 DARK / HOLY 등을 추가한다.

---

# 8. 야생 몬스터 AI

MSW는 `AIComponent`와 Behavior Tree 구조를 공식 지원하므로 몬스터 AI는 BT 기반으로 구성한다. citeturn971689search8

## 공격형 AI

```text
ROOT

Selector
 ├ Dead
 ├ Groggy
 ├ HitReaction
 ├ Battle
 │   ├ FindTarget
 │   ├ Chase
 │   ├ SkillSelect
 │   └ Attack
 └ Wander
```

상태:

```text
IDLE
WANDER
ALERT
CHASE
ATTACK
HIT
GROGGY
RETURN
DEAD
```

## 비공격형

```text
IDLE
WANDER
FLEE
HIT
GROGGY
DEAD
```

## AI 활성화 거리

플레이어와 거리:

```text
0~15m   Full AI
15~30m  Low-frequency AI
30m+    Sleep
```

권장 Update:

```text
Combat AI   5~10 Hz
Wander AI   2 Hz
Dormant AI  0~0.5 Hz
```

---

# 9. 포획 시스템

## 9.1 핵심 조건

몬스터를 죽이지 않고 체력을 낮추면 포획 확률이 증가한다.

UI:

```text
슬라임 Lv.4

HP ███░░░ 31%

포획 확률
[ 57% ]

[몬스터 카드 ×8]
```

## 9.2 포획 공식

```text
CaptureChance =
SpeciesCaptureRate
× CardPower
× HPBonus
× StatusBonus
× LevelModifier
× EliteModifier
```

최종:

```text
Clamp(3%, 90%)
```

### HP Bonus

```text
HP 100% → 0.75
HP 70%  → 0.95
HP 50%  → 1.15
HP 30%  → 1.45
HP 10%  → 1.80
```

### Status

```text
Normal   1.00
Slow     1.10
Groggy   1.25
```

### 카드

| 카드 | Power |
|---|---:|
| 기본 몬스터 카드 | 0.55 |
| 강화 몬스터 카드 | 0.80 |
| 고급 몬스터 카드 | 1.10 |
| 희귀 몬스터 카드 | 1.40 |

### Elite

```text
Normal 1.0
Elite  0.55
Boss   Capture Disabled
```

초기 버전에서는 보스 포획을 막는다.

---

# 10. 포획 서버 처리

포획 성공 여부는 반드시 서버에서 결정한다.

```text
Client
  ↓ CaptureRequest

CaptureService
  ↓
Target 존재 확인
거리 검증
몬스터 상태 검증
카드 소유 확인
Rate Limit 확인
  ↓
카드 1개 소비
  ↓
CaptureChance 계산
  ↓
Server RNG
  ↓
SUCCESS / FAIL
```

Pseudo Lua:

```lua
function TryCapture(user, targetId, cardId)

    local target = MonsterService:Get(targetId)

    if target == nil then return FAIL end
    if target.IsDead then return FAIL end

    if Distance(user, target) > CAPTURE_RANGE then
        return FAIL
    end

    if Inventory:GetCount(user, cardId) <= 0 then
        return FAIL
    end

    Inventory:Remove(user, cardId, 1)

    local chance =
        CaptureFormula(user, target, cardId)

    local success =
        Random() <= chance

    if success then

        local monster =
            MonsterFactory:CreateCaptured(target)

        Collection:Add(user, monster)

        MonsterService:Despawn(target)

        SaveService:SetDirty(user)

    end

    return success
end
```

클라이언트는 포획 대상과 카드 ID만 요청한다.

**포획 확률·RNG·아이템 소비·몬스터 생성은 모두 서버 권한.**

MSW 역시 핵심 로직을 클라이언트에 두는 구조는 변조에 취약하므로 서버 실행을 권장한다. 일반적인 속성 동기화도 서버→클라이언트 방향이 기본이다. citeturn418973search1turn418973search0

---

# 11. 포획 몬스터 데이터

```text
MonsterInstance

uid
speciesId
level
exp
traitId
bond
skill1
skill2
skill3
createdAt
```

예:

```json
{
  "uid": "M_81392",
  "speciesId": "SLIME_GREEN",
  "level": 7,
  "exp": 132,
  "traitId": "HARDWORKER",
  "bond": 23,
  "skills": [
    "SLIME_BOUNCE",
    "BODY_SLAM"
  ]
}
```

---

# 12. 몬스터 개성

모든 몬스터는 세 가지 기능을 가진다.

```text
① Combat
② Partner Skill
③ Work Suitability
```

따라서 단순한 전투 티어로 몬스터 가치가 결정되지 않는다.

예:

| 몬스터 | 전투 | 동행 | 작업 |
|---|---|---|---|
| 슬라임 | 낮음 | 점프 보조 | 운반 |
| 주황버섯 | 보통 | 포자 폭발 | 농사 |
| 스텀프 | 보통 | 방어 버프 | 벌목 |
| 옥토퍼스 | 낮음 | 아이템 탐지 | 제작 |
| 와일드보어 | 높음 | 돌진 | 채집 |
| 파이어보어 | 높음 | 화염 공격 | 제작/조리 |

---

# 13. 작업 적성

런칭 기준 7종.

```text
GATHER      채집
LOGGING     벌목
MINING      채광
FARMING     농사
CRAFTING    제작
COOKING     조리
TRANSPORT   운반
```

적성 레벨:

```text
Lv0 불가능
Lv1 일반
Lv2 전문
Lv3 특화
```

예:

```text
Stump

LOGGING 2
TRANSPORT 1
```

```text
Octopus

CRAFTING 2
TRANSPORT 1
```

---

# 14. 거점 시스템

## 기본 철학

Palworld식 완전 자유 건축을 그대로 구현하지 않는다.

대신:

> **자유 배치는 유지하되 시설 중심 Grid Building으로 제한한다.**

이를 통해

- 충돌
- 경로 탐색
- 세이브 데이터
- 모바일 조작
- 멀티 동기화

복잡도를 크게 낮춘다.

## 캠프 Grid

예:

```text
24 × 8
```

건물은 정수 Grid를 차지한다.

```text
Workbench 3×2
Storage   2×2
Farm      4×2
Kitchen   3×2
```

---

# 15. 캠프 핵심 건물

### Camp Lv1

- 몬스터북 캠프
- 보관함
- 작업대
- 모닥불
- 침상
- 카드 제작대

### Lv2~3

- 벌목장
- 채석장
- 텃밭
- 주방
- 대형 보관함

### Lv4~6

- 제련 작업대
- 강화 카드 제작대
- 장비 공방
- 전문 농장

### Lv7+

- 고급 제작소
- 연구 시설
- 희귀 자원 생산시설

---

# 16. 시설 데이터 구조

```text
FacilityMaster

facilityId
footprintX
footprintY

requiredCampLevel

workType
requiredWorkLevel
workerSlots

inputCapacity
outputCapacity

recipeTags

baseWorkTime
```

Instance:

```text
uid
facilityId

gridX
gridY

state

assignedWorkers[]

queue[]

inputBuffer
outputBuffer
```

---

# 17. 건축 처리

클라이언트:

```text
Build Mode
↓
Ghost Preview
↓
Grid Snap
↓
사용 가능 여부 표시
```

배치 요청:

```text
ReqBuildPlace(
    facilityId,
    gridX,
    gridY
)
```

서버 검증:

```text
시설 해금 여부
재료 보유 여부
Grid 범위
다른 시설과 겹침
건물 수 제한
```

성공:

```text
재료 차감
→ Facility 생성
→ CampSave 갱신
→ Client Sync
```

---

# 18. 캠프 작업 AI

몬스터의 자동화는 게임의 핵심 시스템이다.

상태:

```text
IDLE
FIND_JOB
MOVE_TO_JOB
WORK
MOVE_TO_STORAGE
EAT
REST
```

Behavior Tree:

```text
Selector
 ├ NeedRest
 ├ NeedFood
 ├ AssignedJob
 │   ├ MoveToFacility
 │   ├ Work
 │   └ Deposit
 └ FindBestJob
```

---

# 19. Job Scheduler

각 시설이 `JobRequest`를 생성한다.

예:

```text
JobRequest

jobUid
facilityUid

workType = LOGGING

requiredLevel = 1
priority = 50

reservedBy = nil
```

Worker가 작업을 선택할 때:

```text
Score =
ManualAssignmentBonus
+ WorkLevel × 30
+ JobPriority
- DistancePenalty
- FatiguePenalty
```

가장 높은 Job을 예약한다.

예약 즉시:

```text
job.reservedBy = workerUid
```

다른 Worker는 해당 Job을 선택할 수 없다.

이 방식으로 **다중 몬스터가 동일 작업을 중복 수행하는 문제를 차단한다.**

---

# 20. 작업 속도

```text
WorkPower =
SpeciesBaseWork
× SuitabilityMultiplier
× LevelBonus
× TraitBonus
```

Suitability:

```text
Lv1 = 1.00
Lv2 = 1.45
Lv3 = 2.00
```

실제 작업 시간:

```text
ActualTime =
BaseWorkTime / WorkPower
```

예:

```text
기본 제작시간 30초

슬라임 Craft Lv1
→ 30초

옥토퍼스 Craft Lv2
→ 약 20.7초
```

---

# 21. 운반 시스템의 구현 최적화

필드에 실제 자원 아이템 수십 개를 생성하지 않는다.

대신 시설에:

```text
OutputBuffer
```

를 둔다.

예:

```text
LoggingSite

OutputBuffer
Wood ×16
```

운반 몬스터가 도착하면:

```text
Wood ×5
OutputBuffer → CentralStorage
```

실제 아이템 Entity는 생성하지 않는다.

화면에서는 목재 묶음을 들고 이동하는 애니메이션만 출력한다.

따라서:

> **게임적으로는 운반하지만 서버적으로는 숫자 이동이다.**

이 구조가 대규모 자동화에서 매우 중요하다.

---

# 22. 제작 시스템

모든 제작은 동일 구조를 사용한다.

```text
Recipe

recipeId

ingredients
output

workType
requiredLevel

baseWorkSeconds
```

예:

```text
BasicMonsterCard

Wood       2
MonsterEssence 1

↓ 10 sec

MonsterCard ×1
```

제작 Queue:

```text
Recipe ID
Count
Progress
AssignedWorker
```

---

# 23. 자원 경제

자원은 세 계층으로 구분한다.

## Common

자동 생산 가능.

```text
Wood
Stone
Food
Herb
```

## Advanced

중반 이후 자동화.

```text
Iron Ore
Processed Wood
Medicine
Magic Powder
```

## Exploration Resource

자동 생산 불가능.

```text
Ancient Fragment
Maple Crystal
Boss Material
Rare Monster Essence
```

핵심 원칙:

> **반복 노동은 자동화시켜 주되, 성장에 필요한 희귀 재료는 직접 탐험하게 한다.**

자동화만 돌려서는 최종 콘텐츠로 갈 수 없다.

---

# 24. 거점 성장

Camp Level:

```text
1 → 10
```

레벨업 조건:

```text
시설 건설
몬스터 포획
도감 완성
지역 탐험
특정 생산량 달성
```

예:

### Camp Lv2

```text
몬스터 3종 포획
시설 3개 설치
Wood 30 생산
```

보상:

```text
Worker Limit 3 → 4
Building Limit +5
Logging Site Unlock
```

---

# 25. 캠프 인원 제한

권장:

| Camp Lv | Worker |
|---|---:|
| 1 | 3 |
| 2 | 4 |
| 3 | 5 |
| 4 | 6 |
| 5 | 7 |
| 6 | 8 |
| 7 | 9 |
| 8 | 10 |
| 9 | 11 |
| 10 | 12 |

12마리를 상한으로 잡는다.

몬스터가 너무 많아지면 AI·Entity·동기화 비용보다 **화면 가독성이 먼저 무너진다.**

---

# 26. 활력·식량

몬스터:

```text
Vitality 0~100
```

작업 시 감소.

```text
Work
↓
Vitality 감소
```

낮아지면:

```text
100~40  Normal
40~20   WorkSpeed -15%
20~0    Rest
```

식량이나 침상으로 회복.

몬스터가 굶어 죽거나 영구 손상되는 시스템은 사용하지 않는다.

메이플 IP에 맞게:

> **노동 착취가 아니라 몬스터와 캠프를 운영하는 느낌**을 유지한다.

---

# 27. 동행 몬스터

플레이어는 한 번에 1마리를 소환한다.

```text
FOLLOW
ASSIST
ATTACK
RETURN
FAINT
```

각 종은 하나의 `Partner Skill`을 가진다.

예:

### Slime

```text
Bouncy Body

낙하 또는 점프 보조
```

### Wild Boar

```text
Charge

앞으로 빠르게 돌진
```

### Octopus

```text
Treasure Sense

주변 채집물 표시
```

따라서 전투 성능이 낮은 몬스터도 탐험 가치가 존재한다.

---

# 28. 몬스터 기질

포획 시 기질 1개가 결정된다.

예:

```text
HardWorker
Swift
Strong
Tough
Glutton
Lazy
Curious
```

예:

```text
HardWorker

WorkSpeed +10%
VitalityConsumption +5%
```

```text
Swift

MoveSpeed +10%
```

완전 랜덤 IV 시스템보다 이해하기 쉽다.

---

# 29. Monster Book

몬스터북은 수집 시스템이면서 Research Tree다.

몬스터 최초 포획:

```text
Species 등록
+
Research Point
```

도감 단계:

```text
Discover
Capture
Work
Defeat Elite
```

예:

```text
Slime

☑ 발견
☑ 포획
☑ 캠프 작업
□ 희귀 개체
```

완성하면:

```text
Research Point
Cosmetic
Recipe
```

등을 지급한다.

---

# 30. 성장 구조

게임에는 세 성장축만 사용한다.

```text
Adventure Level
Camp Level
Monster Book Research
```

### Adventure Level

플레이어 전투 및 지역 진입.

### Camp Level

자동화와 시설.

### Research

신규 제작법.

---

# 31. 추천 최대 레벨

초기 라이브:

```text
Adventure Lv 30
Camp Lv 10
Monster Lv 30
```

확장 시:

```text
Lv 40
Lv 50
```

---

# 32. 지역 구조

런칭 목표 예:

### Zone 1 — 헤네시스 외곽

```text
Lv 1~8

슬라임
주황버섯
돼지
리본돼지
파란버섯
...
```

### Zone 2 — 엘리니아 숲

```text
Lv 6~15

초록버섯
뿔버섯
아이즈 계열
...
```

### Zone 3 — 페리온 황무지

```text
Lv 12~22

스텀프
다크 스텀프
액스 스텀프
와일드보어
파이어보어
...
```

### Zone 4 — 설원/상위 지역

```text
Lv 20~30
```

Zone마다:

```text
Normal Monster
Rare Monster
Elite
Hidden Area
Boss
Rare Resource
```

를 갖는다.

---

# 33. Spawn Director

맵에 몬스터를 직접 수백 마리 배치하지 않는다.

Spawn Point가 존재한다.

```text
SpawnPoint

spawnGroupId
position
radius
maxAlive
respawnSeconds
```

SpawnTable:

```text
HENESYS_FIELD_A

Slime          45%
OrangeMushroom 30%
Pig            20%
RareSlime       5%
```

SpawnDirector가 `maxAlive`를 유지한다.

---

# 34. 보스

보스는 다음 지역의 성장 게이트다.

보상:

```text
Research Point
Rare Material
Blueprint
Equipment
```

첫 클리어는 반드시 Blueprint를 지급한다.

랜덤 드롭만으로 진행이 막히지 않는다.

---

# 35. 첫 10분 UX

Wild & Craft의 성패가 결정되는 구간이다.

### 0:00

필드 진입.

```text
“주변의 나뭇가지를 모아보자.”
```

### 1:00

첫 무기 제작.

### 2:00

슬라임 등장.

### 3:00

전투.

슬라임 HP 25%.

UI:

```text
포획 가능!
```

### 4:00

첫 몬스터 카드 사용.

**첫 포획은 확정 성공.**

### 5:00

캠프 설치.

### 6:00

슬라임 배치.

### 7:00

슬라임이 자동으로 자원 운반.

### 8:00

카드 제작 시작.

### 9:00

슬라임이 제작 보조.

### 10:00

퀘스트:

> “새로운 몬스터를 찾아 더 깊은 숲으로 가자.”

10분 안에 반드시:

```text
Fight
Capture
Build
Assign
Automation
Craft
Explore
```

전체 루프를 한 번 경험한다.

---

# 36. 첫 30분 목표

```text
몬스터 4종
캠프 Lv2
시설 6개
첫 생산 자동화
강화 카드 해금
Elite 몬스터
Boss 발견
```

첫 플레이 세션에서 **“내가 없을 때도 몬스터가 무언가 만들어 준다”**는 감각까지 전달하는 것이 목표다.

---

# 37. Co-op

최대:

```text
4 Players
+
4 Partner Monsters
```

## Loot

모든 주요 Loot는 개인 귀속.

```text
Player A → Loot A
Player B → Loot B
```

쟁탈을 최소화한다.

## Capture

한 야생 몬스터는 한 명만 포획 가능.

성공 순간:

```text
Monster state = CAPTURED
```

으로 원자적으로 전환한다.

나머지 CaptureRequest는 실패 처리한다.

## Boss Scaling

```text
BossHPMultiplier =
1 + 0.65 × (Players - 1)
```

예:

```text
1P 1.00
2P 1.65
3P 2.30
4P 2.95
```

Damage:

```text
1 + 0.15 × (Players - 1)
```

정도로 약하게 증가시킨다.

---

# 38. 사망

플레이어 사망:

```text
가까운 Checkpoint 부활
장비 내구도 감소
```

아이템을 바닥에 모두 떨어뜨리지 않는다.

몬스터 HP 0:

```text
FAINT
```

상태.

카드로 자동 귀환하며 일정 시간 소환할 수 없다.

Permanent Death 없음.

---

# 39. 서버/클라이언트 아키텍처

## Shared

```text
Enums
StaticData
Formula
EventDefinitions
```

## Server

```text
SessionService
ProfileService

InventoryService
MonsterService
CombatService
CaptureService

SpawnDirector

CampService
BuildService
WorkScheduler
CraftService

QuestService
ProgressionService

SaveService
RoomSessionService
AnalyticsService
```

## Client

```text
InputController

CombatController
CaptureController
TargetController

BuildPreviewController

HUDController
InventoryUI
CampUI
MonsterBookUI

EffectController
SoundController
CameraController
```

---

# 40. 권한 원칙

### Client가 결정해도 되는 것

```text
입력
UI
카메라
Animation
VFX
SFX
Build Ghost
```

### Server만 결정

```text
Damage
Monster HP
Drop
Capture RNG

Inventory
Crafting
Buildings

Monster Ownership
Camp Assignment

Quest Reward
Level
Currency
```

**Client → Intent**

**Server → Result**

구조를 끝까지 유지한다.

---

# 41. 네트워크 요청 계약

예:

```text
ReqAttack(
 sequence,
 skillId,
 targetId
)
```

```text
ReqCapture(
 sequence,
 targetId,
 cardId
)
```

```text
ReqBuild(
 facilityId,
 gridX,
 gridY
)
```

```text
ReqAssignWorker(
 monsterUid,
 facilityUid
)
```

```text
ReqCraft(
 facilityUid,
 recipeId,
 count
)
```

클라이언트가 아래 값을 보내게 하면 안 된다.

```text
damage
captureChance
rewardCount
itemCount
workResult
```

---

# 42. 동기화 전략

MSW의 일반적인 Script Property Sync는 서버 변경값을 클라이언트로 보내는 구조이며, 과도한 Sync는 네트워크 비용을 증가시킨다. citeturn418973search0turn418973search18

따라서 Wild & Craft에서는:

### 실시간 Sync

```text
Entity State
HP
Position
CurrentAction
Visible Facility State
```

### 요청 시 전송

```text
Inventory
Monster Collection
Craft Queue
Quest Data
```

### 서버 전용

```text
Drop Table
Capture RNG
AI Decision
Job Scheduler
AntiCheat State
```

---

# 43. Save Data

MSW `UserDataStorage`는 유저 데이터를 저장할 수 있고 값은 문자열 기반이므로 JSON 직렬화 구조가 적합하다. citeturn418973search6turn418973search9

MVP에서는 복잡한 multi-key transaction 대신 **유저당 단일 Save Snapshot**을 권장한다.

```json
{
  "schemaVersion": 3,

  "profile": {},
  "inventory": {},
  "monsters": [],
  "camp": {},
  "progress": {},
  "monsterBook": {},

  "lastSaveTime": 0
}
```

목표 크기:

```text
< 150 KB
```

MSW DataStorage는 `set` 값 기준 최대 300KB이고 `update` 기준 제한이 더 작으므로 충분한 여유를 둔다. citeturn418973search10

---

# 44. 저장 타이밍

```text
Login
↓
Load
↓
Game
↓
Dirty Flags
```

저장:

```text
5분 주기
유저 종료
보스 보상
중요 진행 해금
```

MSW 공식 문서에서도 Disconnect 저장과 적절한 주기 저장을 권장하며 예시로 300초를 사용한다. citeturn418973search4

DataStorage Load가 실패한 상태에서:

```text
빈 계정 생성 금지
```

반드시:

```text
Retry
→ Load success
→ Gameplay
```

순서로 처리한다.

그렇지 않으면 기존 Save를 빈 Save로 덮어쓸 위험이 있다.

---

# 45. Save Versioning

```text
schemaVersion
```

필수.

```text
v1
 ↓ Migration_1_2
v2
 ↓ Migration_2_3
v3
```

구버전 Save는 로그인 시 자동 변환한다.

---

# 46. 오프라인 자동 생산

P1 이후 적용.

Logout:

```text
lastLogoutTime
```

저장.

Login:

```text
elapsed =
Now - lastLogoutTime

cap =
8 Hours
```

최대 8시간만 계산한다.

시설별:

```text
cycles =
floor(
 elapsed
 / effectiveCycleSeconds
)
```

단:

```text
Input 존재
Output Capacity 존재
Worker 존재
Food 존재
```

할 때만 생산.

몬스터 움직임을 재현하지 않는다.

**수학적으로 결과만 계산한다.**

---

# 47. 성능 예산

MSW 공식 Profiler 가이드는 모바일에서 **5,000개 이상의 Entity가 성능 저하를 일으킬 수 있어 5,000 이하를 권장**하고, 클라이언트 메모리가 1GB를 넘으면 모바일 환경에서 종료 문제가 발생할 수 있다고 안내한다. citeturn971689search0

Wild & Craft 자체 목표는 훨씬 보수적으로 잡는다.

### Field Room

```text
Active Wild Monsters ≤ 40
Dormant Spawn Slots ≤ 100

Players ≤ 4
Partners ≤ 4

Visible Drops ≤ 30
```

### Camp

```text
Workers ≤ 12
Buildings ≤ 40
```

### Client Entity 목표

```text
< 1,200
```

### Client Memory 목표

```text
< 650 MB
```

---

# 48. Object Pool

풀링 대상:

```text
Damage Number
Hit Effect
Projectile VFX
Capture Effect
Drop Effect
Monster Spawn Effect
```

빈번한 Entity 생성/파괴는 피한다. MSW Profiler 가이드 역시 반복적인 Entity 생성·파괴를 줄이고 Object Pooling 활용을 권장한다. citeturn971689search0

---

# 49. 필드 Drop 최적화

몬스터 사망 시 서버에서는:

```text
LootRecord
```

만 생성.

클라이언트에서는 pooled visual을 출력한다.

```text
Server Loot
≠
Physical Physics Item Entity
```

이 구조를 유지한다.

---

# 50. 물리 사용 원칙

MSW는 Rigidbody/Collider 기반 물리 연산을 제공하지만 서버 물리 개체가 많아질수록 동기화 비용도 증가할 수 있다. citeturn418973search3turn418973search5

따라서:

**전투 판정**
→ 서버 수학 판정

**Capture 카드 비행**
→ Client VFX

**건물**
→ Grid 데이터

**작업 아이템**
→ Virtual Buffer

로 처리한다.

물리 엔진은 실제로 필요한 특수 기믹에만 사용한다.

---

# 51. Master Data

## MonsterMaster

```text
speciesId
name
rarity

baseHP
baseATK
baseDEF
moveSpeed

element
captureRate

AIProfile

skillList

partnerSkill

workSuitability

dropTableId
```

## ItemMaster

```text
itemId
type
maxStack
sellPrice
rarity
```

## RecipeMaster

```text
recipeId
requiredResearch

ingredients
outputs

workType
requiredWorkLevel

baseTime
```

## FacilityMaster

```text
facilityId

campLevel
footprint

workType
workerSlots

inputCapacity
outputCapacity

recipeTags
```

## SpawnTable

```text
spawnGroupId

speciesId
weight

minLevel
maxLevel
```

모든 시스템에서 코드에 ID를 하드코딩하지 않는다.

---

# 52. 필수 Analytics Event

```text
session_start

tutorial_step

resource_gather

monster_encounter

capture_attempt
capture_success
capture_fail

monster_assign

facility_build

craft_start
craft_complete

zone_enter

elite_kill
boss_enter
boss_clear

player_death

save_error
```

Capture:

```text
speciesId
monsterLevel
hpRatio
cardId
chance
success
playerLevel
zoneId
```

를 기록한다.

---

# 53. 핵심 지표

### FTUE

```text
First Weapon Time
First Combat Time
First Capture Time
First Camp Time
First Worker Assignment
First Auto Production
```

### Core

```text
Capture Attempts / Success

Unique Species Captured

Workers Assigned

Camp Worker Utilization

Craft Queue Usage

Zone Progress
```

### Retention 선행 지표

가장 중요한 하나:

> **첫 세션 안에 “몬스터 자동 작업”을 경험한 비율**

Wild & Craft만의 차별점을 경험했는지를 가장 직접적으로 나타낸다.

---

# 54. 라이브 서비스

데이터 기반 Modifier를 사용한다.

예:

```text
MonsterMigrationEvent

Zone2

OrangeMushroomSpawn ×2
RareTraitRate +20%
```

코드 변경 없이:

```text
SpawnTable
DropTable
QuestSet
ShopTable
```

교체로 운영한다.

### Daily

```text
몬스터 3마리 포획
목재 생산
지역 탐험
```

### Weekly

```text
특정 몬스터 대이동
보스 강화
희귀 개체 등장
```

### Season

```text
신규 지역
신규 몬스터
신규 캠프 시설
```

---

# 55. 출시 콘텐츠 권장 범위

## Vertical Slice

```text
1 Zone
6 Monsters
1 Boss

6 Facilities
15 Recipes

Player Combat
Capture
Camp
Worker
Craft
Save
```

여기까지 완성되면 게임의 재미 검증이 가능하다.

## MVP

```text
2 Zones
12 Monsters
2 Bosses

10 Facilities
25 Recipes

Camp Lv5

Solo
1~4 Co-op Expedition
```

## Live v1

```text
4 Zones

24~30 Monsters
4 Bosses

18 Facilities
50~60 Recipes

Camp Lv10

Daily
Weekly Event
Offline Production
```

---

# 56. Vertical Slice 몬스터 구성 원칙

6마리만 있어도 역할을 모두 확인할 수 있어야 한다.

예:

```text
Slime
→ Transport

Orange Mushroom
→ Farming

Stump
→ Logging

Octopus
→ Crafting

Wild Boar
→ Combat

Rare Monster
→ High-value Specialist
```

즉 6마리만으로도:

```text
Collection
Combat
Specialization
Automation
```

이 모두 보여야 한다.

---

# 57. 시스템 개발 순서

의존관계는 다음 순서가 가장 안전하다.

```text
Player Movement
      ↓
Inventory
      ↓
Combat
      ↓
Monster AI
      ↓
Capture
      ↓
Monster Collection
      ↓
Camp
      ↓
Building
      ↓
Crafting
      ↓
Worker AI
      ↓
Automation
      ↓
Progression
      ↓
Persistence
      ↓
Room / Co-op
      ↓
Live Operations
```

Worker AI부터 만들면 안 된다.

**Capture → Ownership → Camp → Facility → Job** 데이터 체계가 먼저 확정되어야 한다.

---

# 58. 핵심 Service Dependency

```text
CombatService
 └ MonsterService

CaptureService
 ├ MonsterService
 ├ InventoryService
 └ CollectionService

CraftService
 ├ InventoryService
 ├ CampService
 └ WorkScheduler

WorkScheduler
 ├ MonsterService
 └ CampService

ProgressionService
 ├ MonsterBook
 ├ Quest
 └ CampService

SaveService
 └ All Persistent Systems
```

순환 Dependency는 금지한다.

---

# 59. 가장 위험한 동시성 Case

## Case 1

두 플레이어가 같은 몬스터 포획.

해결:

```text
MonsterState

ALIVE
↓
CAPTURE_PROCESS
↓
CAPTURED
```

CAS처럼 상태를 먼저 변경한다.

첫 Request만 성공.

---

## Case 2

몬스터가 죽는 순간 포획.

우선순위:

```text
Server Event Sequence

Damage
↓
HP check
↓
DEAD
```

DEAD가 설정됐으면 Capture 실패.

---

## Case 3

동일 Job에 Worker 2명.

`reservedBy`로 차단.

---

## Case 4

Output Storage Full.

Facility:

```text
WORK
↓
OUTPUT_BLOCKED
```

추가 생산 중단.

UI:

```text
! 보관 공간 부족
```

---

## Case 5

Craft 중 Disconnect.

Queue 전체 Save.

재접속 후 계속 진행.

---

# 60. Anti-Cheat

요청별 Rate Limit 예:

```text
Attack      10/sec
Capture      2/sec
Build        5/sec
Craft        5/sec
Assign       5/sec
```

서버가 검사:

```text
Distance
Cooldown
Inventory
Ownership
Current State
Unlock State
```

모든 Request에:

```text
sequenceId
```

를 사용해 동일 패킷 replay를 방지한다.

---

# 61. QA 불변 조건

어떤 상황에서도 다음 조건이 깨져서는 안 된다.

```text
Inventory Count >= 0

Monster UID unique

한 Monster는
Field / Collection / Worker / Partner
중 하나의 소유 상태만 가진다.

한 Worker는
동시에 1 Job만 수행한다.

한 Job은
동시에 1 Worker만 소유한다.

Craft Output은
Input 소비 없이 생성되지 않는다.
```

---

# 62. 필수 E2E 테스트

## E2E-001

```text
New User
→ Gather Wood
→ Craft Weapon
→ Fight Slime
→ Capture
→ Camp
→ Assign Slime
→ Produce Resource
→ Save
→ Reconnect
```

모든 데이터 유지.

## E2E-002

```text
Capture
→ Disconnect 즉시
→ Reconnect
```

몬스터 중복 없음.

## E2E-003

```text
Craft Queue
→ Logout
→ Login
```

Queue 정상 복원.

## E2E-004

```text
Storage Full
→ Worker Work
```

아이템 소실 없음.

## E2E-005

```text
4 Players
→ Same Boss
→ Boss Kill
```

개인 보상 정확히 한 번씩.

---

# 63. Vertical Slice 완료 기준

다음 상황이 버그 없이 30분 연속 진행되면 Core가 완성됐다고 판단한다.

```text
탐험
→ 전투
→ 포획
→ 귀환
→ 건설
→ 작업 배치
→ 자동 생산
→ 제작
→ 장비 강화
→ 상위 몬스터
→ Boss
→ Save
→ 재접속
```

단 하나라도 수동 GM 처리나 재접속 초기화가 필요하면 완료가 아니다.

---

# 64. 반드시 쳐내야 하는 기능

초기 버전에서 제외한다.

```text
자유로운 벽/천장 건축
몬스터 교배
PvP
플레이어 거래
길드 공동 거점
수십 종 속성
복잡한 날씨
탈것 3종류 이상
몬스터 장비
몬스터 스킬 육성 트리
Procedural World
```

이 기능들은 Core Loop를 강화하기보다 개발 리스크를 급격히 증가시킨다.

---

# 65. Wild & Craft의 결정적 재미

이 프로젝트에서 가장 중요한 순간은 보스전이 아니다.

플레이어가 필드에서 스텀프를 처음 잡고 캠프로 돌아온다.

스텀프를 벌목장에 놓는다.

잠시 후 스텀프가 스스로 움직여:

```text
나무를 벤다.
↓
목재가 쌓인다.
↓
운반 몬스터가 옮긴다.
↓
목재가 작업대로 간다.
↓
다른 몬스터가 카드를 만든다.
```

플레이어는 그것을 보고 생각한다.

> **“아, 새로운 몬스터를 잡으면 내 캠프가 달라지는구나.”**

이 순간이 Wild & Craft의 **Aha Moment**다.

따라서 모든 시스템은 결국 다음 식을 강화해야 한다.

# Explore → Capture → Automate → Craft → Explore Further

---

# 66. 최종 설계 원칙

### 1. 몬스터는 전투 캐릭터만이 아니다.

몬스터 하나가:

```text
전투
탐험
생산
수집
```

네 시스템에 동시에 연결돼야 한다.

### 2. 반복 노동은 몬스터에게 넘긴다.

초반:

```text
플레이어가 직접 채집
```

중반:

```text
몬스터가 생산
```

후반:

```text
플레이어는 탐험·조합·최적화에 집중
```

### 3. 희귀 재료까지 자동화하지 않는다.

자동화가 탐험을 죽이면 안 된다.

### 4. 자유도를 시스템 복잡도와 착각하지 않는다.

시설형 Grid Camp가 MSW에서는 자유 건축보다 적합하다.

### 5. 서버가 모든 경제 결과를 결정한다.

Capture / Loot / Inventory / Craft / Camp는 전부 Server Authoritative.

### 6. IP는 스킨이 아니라 시스템으로 사용한다.

슬라임·스텀프·버섯·옥토퍼스가 **생김새 때문에 필요한 것이 아니라 서로 다른 작업 능력 때문에 필요해야 한다.**

그렇게 만들 때 비로소:

> **“팰월드 시스템 위에 메이플 캐릭터를 올린 게임”**

이 아니라

> **“메이플 몬스터를 수집하고 함께 살아간다는 상상을 게임 시스템으로 만든 작품”**

이 된다.
