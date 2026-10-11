# Emberwatch Reborn: W 이후 Master·결말·선택 원정 읽기 전용 감사

작성: 2026-10-10 18:04 UTC. 대상 프로젝트: `/workspace/shared/emberwatch-incident-20261010-1258/recovered-source/projects/EmberwatchReborn`.

## 1. 결론과 가장 작은 다음 구현

**다음 구현은 ‘W 보고 뒤 사용할 수 있는 Expert 제작 선택’ 한 묶음, 그 다음은 ‘오린 수리소 R 한 지역의 처음부터 보고까지’가 적절하다.** 네 후반 지역과 Master를 한 번에 노출하거나 XP만 보충하는 변경은 피한다. Master는 13개 기술 데이터 추가가 아니라 기존 지역 재방문, 훈련 영수증, 지갑, 입력, 저장과 새로운 전장까지 연결해야 하는 별도 통합 작업이다.

우선순위가 높은 발견:

1. **Master 승급 직후 현재 저장은 유효하지 않다.** `promotion.js`는 master 자체를 거부하고, Tomb는 Expert 영수증을 ‘현재 exact Expert’와 동일시하며, B와 W는 그 조건을 이어받는다. 기본 성장/슬롯/UI에도 exact Expert 제한이 있다. 한 곳의 티어 목록만 넓히면 안전한 승급이 되지 않는다. [C1, C2, C3, C4]
2. **지갑에 Master 예약금 공간이 없다.** 현재 `{expert}` 정확한 한 키만 유효하다. 첨탑 보고 300G를 한 번 지급하고 같은 돈을 예약한 뒤, 실제 훈련에서 한 번 차감하는 전체 거래를 새로 정의해야 한다. [C2, C5, P3]
3. **오래된 이전 제안의 버전 번호는 그대로 쓸 수 없다.** 후반 설계는 ‘state v5’, 원정 계약은 ‘state v4’를 미래 버전으로 제안하지만 현행은 이미 W 포함 v5이다. W ancestry도 정확히 `version === 5`를 요구한다. 다음 버전은 현재 통합 소유자가 정하고 기존 v1–v5의 실제 의미를 보존해야 한다. [C3, C6, P3, X3]
4. **True Restoration은 현재 재생 바탕값이 0이다.** 기존 장비에 양수 healthRegen이 없으므로 참조의 +300/+500%를 붙여도 0이다. 의미 있는 양수 재생원과 획득 경로를 별도 Emberwatch 조정으로 결정한 뒤 구현해야 한다. [C7, E1, P3]
5. **새 장비를 카탈로그에 넣기만 하면 상점에 조기 노출될 수 있다.** 현 `initialStock`은 모든 item ID를 자동 2개 등록하고, `buyEquipment`는 story unlock의 `policyFor` 대상이 아니다. 제작 전용/판매용 목록과 실제 구매 잠금을 분리하는 것이 첫 Expert 장비의 선행조건이다. [E1, E2]
6. **반복 원정은 L30 경로의 XP 대안이 아니다.** 독립 ledger와 6적 템플릿만 있으며 처치·완료 XP는 모두 0이다. live world/board/combat/save 연결은 없다. 완료 12G+철1도 아직 런타임 지급이 아니다. [X1–X3]

## 2. 권위와 검증 범위

### 2.1 이번에 직접 확인한 것

- 정본 Library `libfile_52344aab47a48191aa0d9b86f5192591`, version `2`, 문서 v1.1/2026-10-08를 현재 `read`로 확인했다. 응답: file ID `file_0000000014ac8209a3115e8c64437f90`, 56,360바이트, start 1/end 623/total 623, `has_more:false`. 아래 정본 줄 번호는 이 읽기 결과의 원래 줄 번호다.
- **공식 materialize의 과거 403은 해결되었다고 판단하지 않는다.** 이번에 materialize, 다른 전송 경로, 로컬 원문 재구성 또는 원문 바이트 해시 비교를 하지 않았다. 기존 `requirements-source-status.json:19–28`의 로컬 해시 미비교 상태는 그대로다.
- 위 경로의 source/requirements/proposal/native-evidence 문서를 읽었다. 게임 코드·테스트·계산 스크립트·빌드 실행, 브라우저, Git 명령, 배포 및 canonical 파일 수정은 하지 않았다. 이 감사 파일만 별도 경로에 썼다.
- 현재 새 정상 프로필은 **부모가 제공한 L13/F 냉각 선택 진행 중**이라는 상태만 사용한다. 정확 XP·잔액·랭크·재료나 F/T/B/W 미래 완료를 추정하지 않는다.
- 과거 R12 정상 플레이 기록과 이전 산술 스크립트 성공은 각각 **과거 증거**로 인용한다. 이번에 재실행한 결과가 아니며 새 프로필의 증거가 아니다.

### 2.2 반드시 분리할 다섯 종류

| 분류 | 이 감사에서의 예 | 해석 |
|---|---|---|
| 사용자 기획 원문 | 3직업, 4티어, 7슬롯, 연결 캠페인·제작·탐험, 레거시 원정 배제 | 정본 v2의 요구사항. 완료를 의미하지 않음 |
| 원작 참조의 캐시 수치 | 5/15/30, 레벨 SP, 난이도/저티어 XP, Master 수치 | `wiki_cached`, `measured:false`, `currentVerified:false`, 게임 버전 미상. 현재 원작 실측으로 부르지 않음 |
| 원작 미확인 | XP곡선, 승급 요금/NPC, Guardian 시간창, 일부 Master 매핑 | `null`을 0·무료·선행조건 없음으로 바꾸지 않음 |
| 기존 Emberwatch 구현/후속 범위 | 현 XP곡선, Expert120, Master300 목표, W 맵/보상, 지역 보고 순서 | 참조 원작 사실과 분리. Master300과 후반 지역은 아직 실행 미구현 |
| 기존/이번 제안 | R/A/후반 주조소/첨탑 숫자, 두 Expert 장신구, 작업 묶음 순서 | 기존 design-only 값은 후보로만 재사용. 이번 감사는 새로운 전투/경제 숫자를 확정하지 않음 |

정본 근거: L17–31, L48–54, L64, L109–131, L204–242, L570–584. 현재 참조의 증거 한계: `reference-core.js:1–2`, `reference-warrior.js:5–20,271–280`. checklist: L38–58.

## 3. 필수 경로와 각 단계의 주인

현재까지 연결된 끝은 W의 에다 보고이고, 오린의 다음 수리소와 제작은 미구현 문구로 명시돼 있다. 월드 등록도 W까지만 있다. [W1, C8]

| 단계 | 필요한 실제 전제와 행동 | 보고/완료 주체 | 빠진 구현 |
|---|---|---|---|
| W → R 수리소 | 실제 Expert 훈련 이력, B 최종 보고, W 조사/갈고리/회수물/에다 보고. 이전 무료 `quarry_pick`와 `wilderness_hook` 유지 | 오린 수락·보고 | R world/content/reducer/저장/UI/귀환·입장, 후속 장비 |
| R | 도면 조사, 두 수리 작업. 기존 제안은 무료 갈고리+곡괭이 또는 철2+목재2의 한 번짜리 대안. 물길 선택은 해당 교전 전에 확정. 렌즈는 보스/장치 뒤 별도 회수 | 오린 | 경로별 동등한 필수 진행과 중복 방지. 한 도구 경로를 두 번 보상하지 않음 |
| A 기록 보관소 | R 보고+새 렌즈+W의 남는 단서. 순서 퍼즐, 봉인 적, 보스, 별도 기록 | 새 서기관(기존 제안 이름 Mira/`archive_scribe`는 Emberwatch 창작) | 실제 NPC 등록·접근·LOS, 잘못된 순서 복구, 선택 재방문 |
| 후반 주조소 | A 실제 보고. 압력과 열 장치를 각각 해제, 필수 교전, 보스 후 핵 회수 | 오린 | 두 장치의 독립 기록 및 회수/보고. **현행 중반 F 용광로와 별도 지역** |
| S 서약 첨탑 | 후반 주조소 보고. 두 영구 도구 작업, 증인/봉인, 다른 역할의 적, 보스 뒤 서약 회수 | **브란 보고** | 보고 한 번으로 `master_commission`+예약금. 에다가 발급하지 않음 |
| Master 훈련 | 순차 Adept·Expert 실훈련+L30+첨탑 위임장·서약+300G+살아 있는 현재 상태+실제 브란 거리/LOS | 브란의 **별도 훈련 명령** | 실제 Master tier·receipt·차감. 보고만으로 무료 스킬/자원/점수 지급 금지 |
| Master 활용 전장 | 실훈련이 완료된 후 에다의 새 최종 의뢰. 특정 한 기술 구매를 강제하지 않음 | 최종 봉화 회수 후 **에다 최종 보고** | 새 전장·중계기 둘·후반 보스·회수·결말 저장. 기존 B를 결말로 재명명하지 않음 |
| 선택 반복 원정 | 현재 제안은 채석장 보고+해당 승급 뒤 별도 게시판. 결말과 독립인 선택 활동 | 살아 있는 상태의 실제 게시판 보고 | 독립 runId와 실제 전투/귀환/재입장/완료. 결말/승급 대체 불가 |

출처: checklist L237–259; `late-route-progression-proposal.md:37–58,85–137,384–394`; `expedition-ledger-contract.md:99–122`.

공통 전제:

- 레벨만 높다고 위임장·선행 보고·훈련을 건너뛰지 않는다. 위임장을 L30 전에 받아도 훈련만 계속 레벨 잠금이어야 한다.
- 수락/여행/재열람/재입장/되풀이 보고가 XP나 회복을 주지 않는다. 보스 처치, 별도 핵심 물품 회수, 올바른 NPC 보고는 서로 다른 기록이다.
- 전용 필수 수입만으로 메인 진행이 가능해야 한다. 선택 구조·선택 상자·특정 장비 구매·특정 스킬·반복 원정·무한 재생성은 필수가 아니다.
- W의 exact committed-report/store epoch 보호를 후반에서 약화하지 않는다. 오래된 UI, 다른 생명, 다른 NPC, 벽 너머, 두 탭, 저장 실패에서 부분 보상이 없어야 한다. [C3, C6]

## 4. XP와 훈련비 예산

### 4.1 바꿔서는 안 되는 참조와 현행 조정의 구분

참조 캐시: 난이도 처치 XP는 Easy/Normal 1, Hard/Serious 0.75. 플레이어 **레벨 밴드**가 Master가 되면 Expert 적은 각각 0.5/0.375가 된다. 실제 훈련 전 L30에도 적용된다. `experienceMultiplier`는 character.tier가 아니라 level을 사용한다. [N1]

현 XP곡선은 원작 미확인 상태를 명시한 Emberwatch R1 조정이다. [N2]

- L1–4 다음 레벨 비용: 100에서 레벨당 +50
- L5–14: 300에서 +40
- L15–29: 720에서 +60
- L30–49: 1,650에서 +90
- L30 누적 문턱 = 700 + 4,800 + 17,100 = **22,600 XP**
- 스킬점수 L30 총 획득량 = 9+40+75+6 = **130SP**. 이것은 남은 SP가 아니다. 이미 지출한 SP를 돌려주지 않는다. L30 레벨업 자체는 +6SP이고 승급은 +0SP다. [N1, C7]

### 4.2 실제 과거 W와 현재 새 프로필

| 기준 | 누적 XP | 레벨 내 XP | 금화/해석 |
|---|---:|---|---|
| 과거 W 입장 | 8,565.5 | L18/725.5 | 당시 실제 W 입장 1,468G |
| 과거 W 필수만 완료 | 11,845.5 | L22/45.5 | 1,828G. +3,280XP/+360G |
| 과거 선택 구조도 완료 | 12,485.5 | L22/685.5 | 1,821G. 선택 +640XP/+84G, 의도적 죽음 -91G |
| 새 사고 후 정상 프로필 | **현재 정확값 미제공** | 부모 제공 L13/F 냉각 선택 | 위 과거 수치를 새 저장에 넣거나 이어붙이지 않음 |

과거 수리소 시작시 L30까지 부족량은 필수만 기준 **10,754.5**, 선택 포함 기준 **10,114.5XP**. 단순 차감이며 새 게임 검증 결과가 아니다. 과거 설계의 B종료 금화1,537G와 실제 W입장1,468G는 서로 다른 시점이므로 함께 쓰지 않는다. [H1, H2, P1]

현 W 필수 보상은 20×110+280 처치XP와 목표800XP =3,280(보통), 같은 콘텐츠 Hard는 2,480×.75+800=2,660(모든 처치가 L30 전인 경우). 선택 구조는 4×110+200=640(보통). 이것은 출처 행을 더한 산술이지 이번 실행 관측이 아니다. [W2]

### 4.3 R–S 후보 예산, 아직 runtime 없음

기존 설계에는 ‘각 지역13적’ 최소안과 ‘각 지역21적’ 전투비중안이 함께 있다. **현 W는 후자(3/4/5/4/4+보스) 보상표를 구현했다.** 앞으로 최소안의 1,550/1,750/1,850/1,950 objective XP를 후자 적 수에 추가하면 이중으로 예산이 늘어난다. 둘을 섞지 않는다. [P1, W2]

아래는 기존 전투비중안에서 W를 제외한 수리소 이후 후보다. 총 처치XP는 억제 전 값이고, 열별 Normal/Hard는 **모두 L30 미만일 때만** 성립한다.

| 지역 | Expert 필수 처치 | 억제 전 처치XP | 일회성 목표XP | L30 전 Normal/Hard 합 | 필수 G |
|---|---|---:|---:|---:|---:|
| R | 보통20×120 +보스300 | 2,700 | 850 | 3,550 /2,875 | 408 |
| A | 보통20×130 +보스320 | 2,920 | 950 | 3,870 /3,140 | 446 |
| 후반 주조소 | 보통20×140 +보스340 | 3,140 | 1,050 | 4,190 /3,405 | 504 |
| S | 보통20×150 +보스360 | 3,360 | 1,150 | 4,510 /3,670 | 692 |
| 합계 | 84적 | 12,120 | 4,000 | 16,120 /13,090 | 2,050 |

출처: `late-route-progression-proposal.md:139–198`. **이번에 이 제안의 실행 스크립트는 돌리지 않았다.**

설계의 과거 산술 보고는 모든 선택 보상 생략 시 Hard 최소 출발 7,399.5에서 S보고23,014.5, L30 대비414.5 여유를 기록한다. 마지막 보통 적에서 L30을 넘으므로 보스는270이 아닌135XP라는 점도 기록한다. 이는 옛 B 시작 범위와 당시 보상·순서에 묶인 projection이다. 새 프로필/새 지역 명령의 보증으로 승격하지 않는다. [P1:177–190]

앞으로 예산 검증이 받아야 할 입력과 통과 조건:

1. 새 정상 프로필 B와 W 종료의 실제 누적XP, 훈련 영수증, 구입 랭크, 남은SP, 골드·재료·포션.
2. 난이도별 새 게임으로 얻은 최소 필수/선택 포함 출발 범위. optional 전체 생략, 모든 유효 선택 조합, L30 전환 직전/직후를 각각 검증.
3. 실제 kill/reward/report handler가 내는 순서대로 처치마다 배율을 다시 계산. 그룹 입장레벨로 일괄 XP 지급 금지.
4. 대형 마지막 보고로 문턱을 맞추지 않는다. 수리/단서/퍼즐/교전/회수에 분산한 표를 먼저 확정한다.
5. native Normal/Hard, 투자된 Returning Hammer 빌드와 낮은 투자 합법 빌드의 실제 선택·자원 압박을 확인한 뒤 이후 지역으로 확장한다. XP 산술 통과는 재미/길이/전투밀도 통과가 아니다.

### 4.4 골드·재료·훈련 예약금

- Expert120G는 현재 Tomb 보고가 지급·보호하고 Expert 승급에서 소진하는 구현이다. Master300G는 후속 Emberwatch 요구와 제안이며 원작 수수료가 아니다. [C2, C5, checklist L57]
- 전투비중 W–S 필수 수입2,410G에는 첨탑 보고300G가 **이미 포함**되어 있다. W이후만은2,050G. 예약은 돈을 재분류하는 것이며 300을 다시 더하지 않는다.
- Master 위임장 보고에 `gold +=300`, `earnedGold +=300`, receipt/commission, `reservedTrainingGold.master=300`을 한 원자적 저장으로 기록한다. 훈련은 gold/spentGold에300을 한 번 반영하고 master reserve만0으로 만든다.
- 현 모든 지출과 죽음 비용이 쓰는 `spendableGold`는 expert+master 합계를 제외하도록 확장한다. 기존 Expert120을 되살리거나 Master로 재활용하지 않는다. invariant는 `earnedGold - spentGold === gold`다. [C5, C6, P3]
- 기존 설계의 700G 소비 허용량(지역별120/120/160/180/120)과 10회 사망 스트레스, 1,001G 잔금은 **전투비중안의 과거 projection**이다. 전반 최소안의1,003G 결과와 섞지 않으며, 무제한 사망·구매·실제 포션 생존을 보장하지 않는다. [P1:193–198, P2:296–317]
- W이후 필수 재료 후보는 철28/목재10/실14/잿불18, 포션8개(W–S 전체34/14/18/20, 포션10에서 W6/4/4/2,2개 제외). 수리 재료 대안2철+2목재를 택해도 무료 도구 경로와 보상은 공유한다. 이 수량은 새 지역이 구현되기 전까지 실제 재고가 아니다. [P1:102–121]

## 5. Master 13개: 기능별 누락과 원작 미확인 경계

현재40노드만 runtime 대상이고 Master13은 DATA_ONLY다. ‘13개 중 새 기본4개만’ 또는 ‘카탈로그가 있음’은 완료가 아니다. Healing Flames는 Expert Inner Flame에 붙는 **교차 티어 증강**인 점도 빠뜨리면 안 된다. [C7, M1]

| 기능 묶음 | 캐시 참조로 고정된 것 | 실행 전 별도 결정/검증 |
|---|---|---|
| Healing Flames | 흡혈2/3.5/5%, 주문 비용+10/15/20%, SP3/4/5, 기반 Inner Flame | 실제 적 HP 감소량 기준, 과잉피해/무적/다중 성분/DoT/0피해 중복 금지. 모든 해당 주문 비용·HUD·예고값 적용 범위 |
| Pillar | SP4/5/6, 기본150/300/500+레벨당4, MP60/80/100, CD15, 물리+화염/눈멂 | 분할 비율, 레벨 원점, 반경·캐스트·눈멂 지속/상호작용은 UNKNOWN. 성분별 방어 후 합계·한 적중 영수증으로 처리 |
| Pulsing ↔ Heaven's Wrath | 배타. 추가폭발1/2+CD5; 화염→번개, 틱0.5초×5초, 번개30/70/120 | 폭발간격은 원작 미확인(기존 승인 .75초 사용 시 조정 명시). 같은 위치/틱수/종료·저장·중복 적중 |
| Blessed Champion | 능력치+50/75/100%,5/6/7초,MP70/100/130,CD30,기절·둔화 면역 | 임시 능력치 파생 순서/최대자원·현재풀 정책. 장비 영구 요구를 버프로 우회 못함 |
| Champion of Truth | 비용3열, crit 원문2값25/50, MP+25%,True Strike | 참조 rankValues null 유지. 기존 승인25/37.5/50을 쓰면 Emberwatch 매핑으로 표시. True Strike 정확 판정은 미확인 |
| Champion's Hammer | 망치 cast speed+50/100%,망치CD0,+15초 | +15초 대상은 원작 미확인. CD0은 MP/행동잠금/캐스트시간 무시가 아님 |
| Crusader/Dauntless/Zealot | 최대20,3초,스택당 이동1%/피해2·4%; 보스/상위 적 hit1/2/4; 피해400/200 임계 | 기본 처치 획득수, 스택별/전체갱신, 임계 잔여, 공격 vs spell/DoT 자격, 다중 성분 한 hit 정의 |
| Guardian/Restoration/Avenger | 실제 누적 피해200,무적4초,CD120/100/80; 재생+300/500%;피해+200/300% | 집계 시간창, 방패/무적0피해 제외, 치사타격-발동 순서,CD중 누적정책. 양수 regen 원천. 만료 프레임 원상복구 |

출처: `reference-warrior.js:199–201,212–260`; checklist L150–193. 위 UNKNOWN을 이번 감사에서 원작 확인 사실로 확정하지 않았다.

필수 통합 수리 목록:

- `warrior-balance/growth`: runtime tier/IDs, Pillar 배타군, 교차티어 부모, 포인트 정확 원장, 임시/패시브/equipment 순서.
- `promotion/tomb/battlefield/wilderness`와 이전 지역 tier gate: **훈련 이력을 가진 at-least-Expert**와 **지금 Expert에서 승급 가능한가**를 구분. broad search/replace 금지.
- `state/save/controller`: 새 버전 계약, 구v1–v5를 각각 먼저 검증, 기존 원문 슬롯 보존, 늦은 tier/flag 위조 거부, checkpoint 후 정확 revision/quote.
- `expert-input/action-slots/main/controls`: 기존 두 슬롯 바인딩을 유지하면서 구매한 Pillar/Champion의 선택 장착. 추가 액티브를 자동 배치해 Banner/Onslaught를 덮어쓰지 않음. press/hold/channel 해제·메뉴·blur·touch·재매핑·늦은 입력 거부.
- `recovery/combat/runtime-sync`: bounded duration/owner/source/틱·히트 영수증, paid cooldown/RNG/자원 지속, travel/death/load의 효과 정리, 만료 먼저 계산. 현재 recovery schema는 Expert까지의 제한된 키만 안다.
- `main`/훈련 UI: Master 항목과 현재/다음 실제 비용·효과·잠금 이유. 승급 가능, 승급 완료, 스킬 구매 완료가 서로 다른 상태여야 함.

### 마나·SP가 만들어야 하는 선택

L30에 기본 MP는40+29×2=**98**이며 투자/장비가 없으면 Champion2의100MP부터 비용을 감당하지 못한다. L30신규6SP로 기본4종의 첫 랭크(4+4+3+3=14SP)를 한꺼번에 살 수도 없다. 이것은 오류가 아니라 선택을 만드는 조건일 수 있으나, 실제 구매 경고·마나 장비·재분배와 사용 기회가 필요하다. 비용 증가 증강과 Banner Zeal까지의 결합 순서는 별도 runtime 계약으로 정의해야 한다. 이번 감사는 미구현 합성 비용을 임의로 계산하지 않는다. [N1, C7, M1]

## 6. 장비/제작은 통과료가 아니라 빌드 선택

현 상태: 7슬롯과 영구 요구능력치/소유 영수증/구매·제작·+2강화 기반은 있다. 현재 item catalog는 8개 전부 Apprentice/Common이며 레시피는 방패·조끼·목걸이3개. 유니크/접두·접미/Expert·Master 아이템·분해/부여·세계시간 재고·재분배의 전체 깊이는 이 기반으로 충족되지 않는다. [E1, E2; checklist L263–277]

기존 후반 제안의 첫 Expert 장신구 후보:

- 신호 방호 장신구: armor+4, staminaRegen+1/s
- 신호 집중 장신구: spellPower+.08, manaRegen+.6/s
- 둘 다120G+철3+실2+잿불1, W보고 뒤 작업대와 기존smith_tools, Warrior/base18·12·10 영구 요구, 장신구 하나만 장착
- **전부 기존 Emberwatch 제안값이며 미구현·미채택·미검증이다.** +.08이 모든 주문에8% 추가 피해라는 뜻이 아니다. 현 매핑은 hammer와 원소/치유 스케일링 범위를 구분한다. [P2:235–254, C7]

첫 제작 묶음에 꼭 포함할 것:

1. 제작전용 ID를 기존 전체-item 자동상점 재고에서 제외할 명시적 목록/정책. 후일 판매할 때 story unlock은 UI와 실제 buy 명령 모두에 적용.
2. W 실제 보고 receipt를 story gate의 근거로 사용; gold/material/tool/소유·인벤토리 조건을 하나의 authoritative quote에서 판정.
3. ‘가능한 레시피’와 ‘제작해도 착용 불가’를 구분. 반복 클릭·동일 commandId·저장실패에서 물품/지출 중복 금지. 제작과 자동장착·회복을 결합하지 않음.
4. 현재→장착후 비교에 armor, 재생/s, 주문증폭의 올바른 단위를 표시. 같은 슬롯이므로 방어·기력 운용 vs MP·망치 운용 trade-off를 실제 교전에서 관찰.
5. 두 선택을 안 해도 R–S가 진행 가능. 새로운 제작 소비를 훈련비/무료 탐험도구의 필수 접근과 경쟁시켜 softlock 만들지 않음.
6. 기존 수입·지출 receipt 재생 검증은 현재 catalog를 다시 읽는다. 기존 아이템 가격/스탯/레시피를 조용히 덮어써 과거 영수증을 무효화하지 말고 버전/호환 정책을 명시. [E2:91–98,177–205]

다음 단계 장비의 역할: R/A에서 독·침묵·기력/마나 회복과 제어 대안, 후반 주조소에서 공격성·방어성 선택, S/실제 Master 이후 고비용 주문·양수 HP재생원·Master 사용 방식의 선택을 제공한다. 이 감사는 해당 장비/가격/확률을 새로 확정하지 않는다. 또한 두 장신구가 ‘접사·유니크2개 이상·요리/물약/해체/부여·재분배’까지 닫아 주지 않는다.

## 7. 결말과 반복 원정의 분리

### Master 이후 결말

기존 제안은 두 방향6적 접근/중계기, 별도 후반 보스, 봉화 pickup, 에다 report다. 이는 콘텐츠 기획 후보이며 기존 B 재사용 이름만 바꾸는 안이 아니다. Pillar 범위/눈멂, Champion 면역·기간, Crusader 연속접전, Guardian 방어 선택이 쓸 상황을 만들되 특정 구매나 강제 피격을 입장조건으로 쓰지 않는다. 최종 XP/G는 pre-Master 보증 예산에서 제외한다. [P3:384–394]

합격선: Master기술을 정상 구매·명시 배치·실제 사용 → 도중 저장/재입장 → 새 보스 → 봉화 미회수 상태에서는 보고 불가 → 실제 봉화 회수 → 에다에게 한 번 보고 → 결말 flag와 저장/계속하기 유지. 단순L30/위임장/승급 버튼/첨탑보스는 결말이 아니다.

### 선택 반복 원정

정본은 기존6층 로그라이트/유물/영구마을/NG+를 캠페인 중심으로 재사용하는 것을 배제한다(L17–19,48,444,570,583). 후속 체크리스트가 요구하는 live repeat expedition은 별도 선택 활동이며 원작 동등성의 새 파밍 층으로 설명하면 안 된다.

현 pure ledger는 monotonic `runId`, `closedThrough`, 완료·포기 count, active의6적 defeated set와 template/contentVersion/difficulty를 보존한다. 이 구조는 bounded 기록을 갖는 장점이 있으나 생존/게시판 접근/실제 전투를 인증하지 않는다. `rewardIntent`를 순수 reducer 밖에서 나중에 따로 지급하면 안 된다. [X1, X2]

연결 때 필요한 것:

- 별도 `quarry_drill` world/map/board/portal과 retained template version. 캠페인의 `world.defeated`/일회성 `claimedRewards`에 원정 적/런 ID를 넣지 않음.
- battle 생성시 정확 run reference/region/life를 포착하고 kill뿐 아니라 checkpoint/travel/save report에도 전달. dispatch 시점의 ‘현재 런’으로 오래된 report에 ID를 채워주지 않음.
- 같은 프레임의 마지막 처치+죽음은 먼저 처치 기록, 그 다음 한번 죽음비용. retry 전에는 완료 보고 불가; retry 후 기존 run/dead set 유지.
- 살아 있는 실제 게시판 가까이/LOS에서만 완료. ledger close+12G+철1+earnedGold를 한 저장 transaction에 포함; XP/승급/캠페인 보상 변화0.
- duplicate/stale run, old life, concurrent tabs, head/slot 실패, 불확실 commit, reload, 포기 확인 대기 중 새run 교체를 검증.
- 오래된 ‘state v4’ 통합 문서는 현v5 기준으로 다시 쓰되 ledger.version1/template.contentVersion1과 state.version을 혼동하지 않음. [X3]

이 순수6적 템플릿은 Master 성장 깊이·종반 재플레이 재미를 증명하지 않는다. 우선 하나의 정확한 live optional loop를 닫고, 필요하다면 콘텐츠 다양성은 별도 검토한다.

## 8. 권장 구현 순서와 각 묶음 종료 조건

| 순서 | 좁은 작업 묶음 | 종료 조건 / 다음으로 넘어갈 근거 |
|---|---|---|
| 0 | 새 정상 F→T→Expert→B→W 회귀와 기존 full gate 마무리 | 부모의 현재검사와 새실제 endpoint 확정. 과거v47과 새profile을 합쳐 완주로 기록하지 않음 |
| 1 | **W 보고 뒤 Expert 제작 선택 2종** | 상점 자동노출 방지, 실제 receipt/story/quote/지출/소유/장착/비교 저장, 한 선택당 실제 사용, 사지 않은 빌드 유지. 범위는 R입장/전체 장비완료가 아님 |
| 2 | **수리소 R 한 지역 완결** | 무료도구/재료대안, 교전전 물길선택, 안전귀환, 렌즈 별도 pickup, 오린report, 정상입력·죽음·재입장·atomic reward. 다음 A는 실제 미구현 안내 유지 |
| 3 | A 보관소 한 지역 완결 | R렌즈+W단서 재사용, 실제 서기관, 퍼즐·보스·기록·report, 선택재방문 persistence |
| 4 | 후반 주조소 한 지역 완결 | 두장치 독립, 지역 고유 위협/장비 소비 선택, 보스·핵·오린report. 중반 F와 다른 IDs |
| 5 | 첨탑/300 예약금/역사 호환 | S도구·보스·서약·브란report, wallet 확장·모든 지출/죽음 보호, 구v1–v5 원문보존. 아직 기술없는 Master 승급을 공개하지 않음 |
| 6a | Master 계산/저장/입력 기반+Pillar 계열+Healing Flames | 원작 UNKNOWN/개발매핑 원장, 분할패킷/흡혈/틱/배타/명시slot. 모듈 성공만으로 플레이노출하지 않음 |
| 6b | Champion 계열 | 임시속성·진짜 면역·mana·CD0한계·만료·영구장비요구 회귀 |
| 6c | Crusader/Guardian 계열 | 사건단위 stack·damage window·치사타격·재생원·CD/만료/저장 검증 |
| 6d | **실제 Master훈련 및 post-Master첫 전장까지 통합** | 13개 실제handler와 53개집합, 브란훈련300, 실제구매·slot·새전투·역방문·save. 합법분기별 normal-input 증거 |
| 7 | 최종 보스·봉화·에다결말 | 위 별도 결말 합격선, 같은 빌드/버전 캠페인 연결 기록 |
| 8 | 선택 원정1종 live 통합 | 실제게시판→6적→귀환→보고→다음run,0XP,완료한번지급,포기/동시성/죽음/저장. 메인완주 보증과 분리 |

묶음6의 모듈별 작업은 작게 분할하되, ‘Master 훈련만 가능하고 쓸 기술/전장이 없음’을 완성된 플레이 경로로 공개하지 않는다. 새 버전·저장 이름·공개 시점은 통합 소유자가 현재 진행 중인 회귀와 함께 결정한다.

## 9. 보고할 수 없는 것

- 이번 감사로 기존 tests/build/원본167file identity의 통과를 재확인하지 않았다.
- Master13/전체53/후반/결말/원정이 구현되었다거나 재미·AAA·난이도·시간 목표를 통과했다고 말할 수 없다.
- 과거 W tool wall time이나 메뉴/전투 카운터로 실제 캠페인 길이를 만들지 않는다. 과거 invested Q가200HP Keeper를 넘은 사실은 인정하되 HP·걷기·무적·반복파밍으로 시간을 늘리는 근거가 아니다. [H1:31–47,H2:19–23]
- 현재 참조 수치는 캐시 출처와 미확인을 유지한다. 원작 재생/승급NPC/수수료/XP곡선의 최신 실측은 수행하지 않았다.

## 출처 색인

모든 로컬 상대 경로는 위 프로젝트 기준이며 줄은 감사 시점 읽기 기준이다.

- **N1** `app/src/reference-core.js:1–2,7,12–22,25–34`; `app/src/progression.js:46–51,89–128,141–149`.
- **N2** `app/src/progression-balance.js:1–21`.
- **C1** `app/src/promotion.js:8–33,51–93`.
- **C2** `app/src/tomb.js:18,96–108`; `app/src/battlefield.js:46`.
- **C3** `app/src/wilderness.js:57–95`; 특히69의 exactv5와64의 B연결.
- **C4** `app/src/action-slots.js:8–23`; `app/src/expert-input.js:4–23,28–60`; `app/src/main.js:93–96,268–271,309`.
- **C5** `app/src/training-economy.js:1–30`; `app/src/campaign.js:48–58`.
- **C6** `app/src/state.js:24–27,62–109,113–151`; `app/src/save.js:16–20,25–31,55–88`; `app/src/controller.js:9–31`.
- **C7** `app/src/warrior-balance.js:8–26,46–67`; `app/src/warrior-growth.js:26–54,71–104,270–309`; `app/src/recovery.js:1–43`.
- **C8** `app/src/world.js:1–29`.
- **M1** `app/src/reference-warrior.js:5–20,26–48,192–201,212–260,271–280`.
- **E1** `app/src/equipment-content.js:1–47`.
- **E2** `app/src/equipment.js:71–89,91–122,170–205,219–275,287–299`.
- **W1** `app/src/wilderness-presentation.js:10`; `docs/requirements/warrior-gap-update-r12.md:8–38,50–68`.
- **W2** `app/src/wilderness-content.js:1–33,91–102`.
- **P1** `docs/late-route-progression-proposal.md:15–58,60–198`.
- **P2** 같은 문서 `235–317`.
- **P3** 같은 문서 `319–411`.
- **H1** `docs/r12a1-native-main-route.md:3–9,31–47`.
- **H2** `docs/r12a1-native-optional-retry.md:3–23`.
- **X1** `app/src/expedition-content.js:1–46`.
- **X2** `app/src/expedition-ledger.js:1–9,46–73,99–139`.
- **X3** `docs/expedition-ledger-contract.md:7–17,89–126`.
- **기획** Library `libfile_52344aab47a48191aa0d9b86f5192591` v2, 이번 read1–623; 로컬 raw-byte hash 미검증.
- **checklist** `docs/requirements/warrior-completion-checklist.md:8–58,60–83,150–211,237–279,299–305,367`.
