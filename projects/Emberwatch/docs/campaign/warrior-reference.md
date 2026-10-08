# 전사 원작 참조 카탈로그

- 작성·조회일: 2026-10-08
- 대응: Emberwatch `warrior` → Hammerwatch II (2023) `paladin`
- 범위: 기본 능력 16개, 증강 37개, 총 53개. 이 개수는 조회한 캐시 목록을 집계한 결과다.
- 용도: M0 참조 및 M1 이후 구현 검토. 현재 실행 가능한 기술 트리나 원작 측정 결과가 아니다.
- 정본 데이터: [`app/src/campaign/reference-warrior.js`](../../app/src/campaign/reference-warrior.js)
- 검증: [`app/tests/campaign-reference-warrior.test.mjs`](../../app/tests/campaign-reference-warrior.test.mjs)

## 출처와 확실성

[Paladin 위키](https://wiki.hammerwatch2.com/Paladin)의 검색 캐시에 표시된 수치와 구조를 전사 전용 데이터로 정리했다. 조회 당시 검색 도구는 크롤링 시점을 2.3년 전으로 표시했다. 원문 직접 조회는 502 오류 상태였으며, 캐시를 최신 패치 상태나 실측치로 승격하지 않았다. 모든 기술의 `source.kind`는 `wiki_cached`, `gameVersion`은 `null`, `measured`와 `currentVerified`는 `false`다. 조회일은 원작 수치가 확정된 날짜를 뜻하지 않는다.

[공식 2023-09-19 Patch 2](https://maximument.com/news/hwiipatchnotes/)는 Battle Banner의 추가 강화가 상호 배타임을 명시한다. 따라서 이 관계는 위키의 누락보다 우선하며, 두 증강의 `exclusiveSource`에 공식 출처를 따로 기록했다. 패치 문서를 조회한 사실이 최신 게임 빌드에서 행동을 측정했다는 뜻은 아니다.

원작 고유 이름은 대조용 `referenceName`에만 보관한다. `displayName`은 Emberwatch의 신규 한국어 표현이며 공식 번역이 아니다. 원작 설명문, 아트, 소리, 코드, 지도 또는 UI는 이 카탈로그에 복제하지 않았다. 기능적 사실과 수치만 별도 데이터로 표현했다.

## 해석 계약

- `upgradeCosts`: 캐시 표의 비용 열 순서. 첫 비용 0은 그대로 보관하지만, 세이브에서 이미 습득했다는 의미를 자동 부여하지 않는다.
- `rankValues`: 배열은 비용 열과 같은 순서이며, 스칼라는 원문에 하나로 제시된 값이다. `Percent` 값 25는 25%다. `Increase`, `Bonus`, `Change`, `AddSeconds`를 구별하고 계산 순서를 임의로 정하지 않는다.
- `null` 또는 `UNKNOWN`: 미확정. 0, 무료, 무제한, 즉시 시전, 조건 없음으로 변환하지 않는다. `unknown`에는 이유가 있다.
- `baseId`: 증강이 어떤 기본 기술 아래에 있는지 나타낸다. `requires`의 `kind: base_relationship`과 `rank: null`은 문서 구조상의 관계다. 최소 구매 랭크 또는 선행 강화 순서를 뜻하지 않는다.
- `purchaseRequirements`와 `promotionRequirements`는 `null`이다. 티어 승급 NPC·퀘스트·비용·최소 랭크는 이 페이지에서 확정하지 않는다. 다른 출처를 통합할 때도 증거를 별도로 추가해야 한다.
- `exclusiveGroup: null`은 배타 관계를 확인하지 못했다는 뜻이다. 모든 조합이 동시에 허용된다고 단정할 수 없다. 양의 배타 관계는 별도 근거가 있는 경우에만 기재한다.
- `behaviorId`와 `mechanics`는 후속 구현을 위한 기능 참조다. 실행 함수, 구매 규칙, 실제 전투 효과 또는 구현 완료 표시가 아니다.
- `tierEvidence: section_only`는 임시 정렬용 티어다. 실제 해금 판정에 사용하지 않는다.
- `validateWarriorReference`는 형식·참조·근거 누락을 찾는 검사다. 실제 게임 충실도나 플레이 재미를 판정하지 않는다.

## 전체 노드

티어는 각 노드의 표시 티어다. 기본 기술 아래의 증강이라도 더 높은 티어에서 열릴 수 있다. †가 붙은 3개 노드는 캐시 제목에 티어가 없어 해당 기본 기술의 섹션에 임시 배치했다.

### apprentice (9)

| ID | 원작 대조 이름 | Emberwatch 표현 | 종류 / 기반 ID | 비용 열 |
|---|---|---|---|---|
| shield_charge | Shield Charge | 방벽 돌진 | dash | 0 / 1 / 2 / 3 / 4 |
| armored_assault | Armored Assault | 강철 충돌 | augment / shield_charge | 1 / 2 / 3 |
| mace_swing | Mace Swing | 철퇴 휘두르기 | mainhand | 0 / 1 / 2 / 3 / 4 / 5 |
| stunning_strikes | Stunning Strikes | 충격 타격 | augment / mace_swing | 1 / 2 / 3 / 4 |
| crushing_blows | Crushing Blows | 장갑 분쇄 | augment / mace_swing | 1 / 2 / 3 |
| shield_block | Shield Block | 방패 버티기 | offhand | 0 / 1 / 2 / 3 |
| shield_training | Shield Training | 방패 보법 | augment / shield_block | 1 / 2 / 3 |
| elemental_bulwark | Elemental Bulwark | 세 원소 방벽 | augment / shield_block | 1 / 2 / 3 |
| righteous_hammer | Righteous Hammer | 잿불 망치 | spell | 0 / 2 / 3 / 4 / 5 |

### adept (16)

| ID | 원작 대조 이름 | Emberwatch 표현 | 종류 / 기반 ID | 비용 열 |
|---|---|---|---|---|
| charge_through | Charge Through | 전열 돌파 | augment / shield_charge | 2 |
| shield_of_thorns | Shield of Thorns | 반격 철편 | augment / shield_block | 2 / 3 / 4 |
| hammer_of_wrath | Hammer of Wrath | 뇌광 망치 | augment / righteous_hammer | 2 / 3 / 4 |
| hammer_of_sundering | Hammer of Sundering | 균열 망치 | augment / righteous_hammer | 2 / 3 / 4 |
| lay_on_hands | Lay on Hands | 온기 나누기 | spell | 2 / 3 / 4 / 5 |
| invigorating_touch | Invigorating Touch | 되살아나는 온기 | augment / lay_on_hands | 2 / 3 / 4 |
| judgement | Judgement | 단죄의 일격 | spell | 2 / 3 / 4 / 5 / 6 |
| trial_by_fire | Trial by Fire | 불길 자국 | augment / judgement | 2 / 3 / 4 / 5 |
| shackles | Shackles | 잿빛 족쇄 | augment / judgement | 2 / 3 / 4 |
| shining_knight | Shining Knight | 강철 파수꾼 | passive | 1 / 2 / 3 |
| armor_of_faith | Armor of Faith | 불굴의 갑옷 | augment / shining_knight | 1 / 2 / 3 |
| armored_grace | Armored Grace | 강철 걸음 | augment / shining_knight | 1 / 2 / 3 |
| towering_strength | Towering Strength | 거목의 힘 | passive | 1 / 2 / 3 |
| battering_ram † | Battering Ram | 공성의 힘 | augment / towering_strength | 1 / 2 / 3 |
| crushing_might † | Crushing Might | 압도하는 힘 | augment / towering_strength | 1 / 2 / 3 |
| superb_constitution † | Superb Constitution | 무쇠 체질 | augment / towering_strength | 1 / 2 / 3 / 4 |

### expert (15)

| ID | 원작 대조 이름 | Emberwatch 표현 | 종류 / 기반 ID | 비용 열 |
|---|---|---|---|---|
| flames_of_devotion | Flames of Devotion | 잿불 후려치기 | augment / mace_swing | 3 / 4 / 5 |
| hammer_of_devotion | Hammer of Devotion | 귀환 망치 | augment / righteous_hammer | 3 |
| cleansing_touch | Cleansing Touch | 재 씻기 | augment / lay_on_hands | 3 |
| turn_undead | Turn Undead | 망자 태우기 | augment / lay_on_hands | 3 / 4 / 5 |
| battle_banner | Battle Banner | 잿불 깃발 | spell | 3 / 4 / 5 |
| banner_of_protection | Banner of Protection | 수호 깃발 | augment / battle_banner | 3 / 4 / 5 |
| banner_of_zeal | Banner of Zeal | 격려 깃발 | augment / battle_banner | 3 / 4 / 5 |
| zealous_onslaught | Zealous Onslaught | 불굴의 진격 | spell | 3 / 4 / 5 / 6 |
| zealous_lance | Zealous Lance | 화염 선봉 | augment / zealous_onslaught | 3 / 4 / 5 |
| zealous_shield | Zealous Shield | 진격 방벽 | augment / zealous_onslaught | 3 |
| inner_flame | Inner Flame | 가슴속 잿불 | passive | 2 / 3 / 4 / 5 |
| flaming_wrath | Flaming Wrath | 불꽃 반향 | augment / inner_flame | 2 / 3 / 4 |
| lawbringer | Lawbringer | 파수의 응징 | passive | 2 / 3 / 4 |
| punish_the_wicked | Punish the Wicked | 틈새 응징 | augment / lawbringer | 2 / 3 / 4 |
| guilt_by_association | Guilt by Association | 퍼지는 응징 | augment / lawbringer | 2 / 3 / 4 |

### master (13)

| ID | 원작 대조 이름 | Emberwatch 표현 | 종류 / 기반 ID | 비용 열 |
|---|---|---|---|---|
| healing_flames | Healing Flames | 생명을 잇는 불씨 | augment / inner_flame | 3 / 4 / 5 |
| pillar_of_light | Pillar of Light | 새벽 불기둥 | spell | 4 / 5 / 6 |
| pulsing_light | Pulsing Light | 되울리는 새벽 | augment / pillar_of_light | 4 / 5 |
| heavens_wrath | Heaven's Wrath | 벼락 기둥 | augment / pillar_of_light | 4 / 5 / 6 |
| blessed_champion | Blessed Champion | 잿불 각성 | spell | 4 / 5 / 6 |
| champion_of_truth | Champion of Truth | 흔들림 없는 일격 | augment / blessed_champion | 4 / 5 / 6 |
| champions_hammer | Champion's Hammer | 끊임없는 망치 | augment / blessed_champion | 4 / 5 |
| crusader | Crusader | 전진하는 불씨 | passive | 3 / 4 |
| dauntless | Dauntless | 거인 맞서기 | augment / crusader | 3 / 4 / 5 |
| zealot | Zealot | 타오르는 기세 | augment / crusader | 3 / 4 |
| guardian_angel | Guardian Angel | 마지막 불씨 | passive | 3 / 4 / 5 |
| true_restoration | True Restoration | 되살아나는 숨 | augment / guardian_angel | 3 / 4 |
| wrathful_avenger | Wrathful Avenger | 최후의 역습 | augment / guardian_angel | 3 / 4 |

## 미확정 항목과 충돌

1. `champion_of_truth`: 비용 열은 4 / 5 / 6으로 3개지만 치명타 열은 25% / 50%로 2개다. 누락된 숫자뿐 아니라 열의 대응도 불명확하다. 따라서 `rankValues.attackCritChancePercent`는 `null`이고, 관측된 두 값만 `sourceRows`에 보존했다. 배열을 [25, 50, 75] 또는 [25, 50, null]로 만들어 대응을 추측하지 않는다.
2. `battering_ram`, `crushing_might`, `superb_constitution`: 제목에 티어가 없다. Adept 표시는 섹션 배치에서 온 추론이며, 구매 해금의 근거가 아니다. 첫 노드의 본문과 수치 행은 관통 명칭도 서로 다르므로 같은 수식이라고 가정하지 않는다.
3. `zealous_onslaught`: 주문 유형이지만 비용 행에는 스태미나가 있다. 이를 마나로 바꾸거나 초당 소모라고 가정하지 않는다. 지불 주기와 피해 틱 간격은 `null`이다.
4. `champions_hammer`: 망치 재사용 대기시간 0은 본문의 명시적 기능이지만, 추가 +15초 행의 정확한 적용 대상은 게임에서 확인해야 한다. 데이터에는 일반 `cooldownAddSeconds`로 남긴다.
5. 모든 범위·시전시간·취소 구간·충돌 크기, 명시되지 않은 상태 지속시간, 복합 속성 분할, 스택 갱신과 피해 누적 방식은 추정하지 않았다. 능력별 `unknown`을 후속 측정 체크리스트로 사용한다.
6. `shield_block`의 수치 행은 수동 방어 수치로 복사하지 않는다. 장착 방패의 능동 차단과 패시브 물리 차단을 나누고, 능동 소비량·차단량은 미확정으로 남긴다.

검증된 배타 그룹은 `righteous_hammer_damage_type`, `battle_banner_support`, `pillar_of_light_effect`다. 이 목록 밖의 기술 쌍에 새 배타 관계를 만들어 넣지 않는다.

## 구현 전 증거 게이트

캐시의 구조와 숫자는 시작점이다. 원작 게임 빌드와 티어·기술 화면을 확인하고, 미확정 구매 조건 및 행동을 측정한 다음 해당 필드의 출처와 상태를 갱신해야 한다. 측정 기록은 원작 버전, 캐릭터·장비·랭크, 입력, 시간 기준, 관찰값을 구분한다. 포팅 환산이 생기면 원작 값과 분리한다. 이 카탈로그만으로 “원작 동일”, “전체 완성”, “플레이 검증 완료”를 주장할 수 없다.

현재 변경은 참조 데이터·검증·문서뿐이다. 기존 0.4.4 전투, 발소리 gain 0.1326, 세이브, 배포물은 이 파일들에서 변경하지 않는다. 세이브와 신형 전투 연결은 별도 통합 작업이다.

## 검증 기록

- `node --test projects/Emberwatch/app/tests/campaign-reference-warrior.test.mjs`: 13개 테스트 통과 (2026-10-08).
- 조회 캐시를 다시 분할하여 53개 노드의 비용 열과 105개 숫자 필드를 별도로 대조했고 누락·숫자 불일치가 없었다. 이 검사는 캐시 전사 정확성만 확인하며, 원작 게임 또는 수식 의미의 실측이 아니다.
- 검사 범위: 4티어 16개 기본 기술과 37개 증강의 전체 목록, 최초 4행동, 출처·확실성, 배타 관계와 공식 패치 우선, 잘못된 참조·배열 길이·비용, 미확정 값의 임의 승격, 티어 추론 경고, 데이터 불변성.
- `node projects/Emberwatch/app/scripts/check.mjs`: 당시 프로젝트 JavaScript 49개 파일 문법 검사 통과. `pnpm --filter emberwatch lint`는 pnpm의 홈 디렉터리 생성 실패로 실행되지 않아 동일 검사 스크립트를 직접 실행했다.
- 프로젝트 전체 검사·빌드는 통합 담당자가 별도 실행한다. 원작 실측, GUI 플레이테스트, 공개 배포는 수행하지 않았다.
