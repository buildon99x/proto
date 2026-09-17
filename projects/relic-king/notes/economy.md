# 유물왕 — 경제 설계 (v0.2)

> `prompts/v0.2-deepening.md` §5.7, §8 3단계의 산출물. `notes/decisions.md`의 결정
> 게이트 G1~G11(특히 G3·G5·G6·G9·G10)이 이 문서의 전제다. 시스템 기획(세계지도·스텝·
> 시설·시장)은 이 문서의 하위다 — 순서를 뒤집으면 시스템마다 화폐를 찍어내는 기획이
> 나온다. 여기서 정하는 비율·상한을 후속 문서(`notes/world-map.md`, `notes/staff.md`
> 등)가 그대로 따라야 한다.

## 0. 원칙 — 비율형 싱크만 쓴다

v0.1의 유일한 싱크였던 감정비(`APPRAISE_FEE = 0.02`, 추정가의 2%)는 발굴력 `D`가
커지면 감정비도 같이 커진다. 절대값 싱크(고정 ₩ 비용)는 `D`가 자라면 상대적으로
0에 수렴해 인플레이션을 방어하지 못한다. v0.2가 추가하는 모든 신규 싱크는 **소득 또는
자산에 대한 비율**로만 정의한다. 절대값 싱크는 업그레이드 구매가(1회성, 지수 곡선으로
이미 자기 조절됨)에만 예외적으로 남긴다.

경제 모델은 **σ = 1(획득한 모든 유물을 즉시 매각한다)**을 최악 시나리오로 잡는다.
σ<1(들고 있는 플레이어)은 이보다 화폐 창출이 느리므로, σ=1을 통과하면 모든 실제
플레이 스타일을 통과한다. 아래 모든 "시간당 규모" 추정은 이 최악 시나리오 기준이다.

참조 발굴력 `ECONOMY_REF_DIG_POWER = 1000`(진척/s)을 이 문서의 모든 예시 계산에
쓴다. 이 값은 게임 밸런스가 아니라 **이 문서의 산정 예시를 위한 참조점**이며,
`spec.md`의 v0.1 UI 목업(발굴력 842/s)과 같은 자릿수로 잡아 규모를 가늠하기 쉽게
했을 뿐이다. 실제 v0.2 발굴력 곡선은 `notes/world-map.md`·`notes/staff.md`가
정한다.

## 1. 화폐 소스 전량

### 1.1 발굴 유물 처분 (기존 구조, 채널이 늘어남)

`dropThreshold`의 정의(`layerExpectedValue(L) / (PROGRESS_VALUE × bonus(L)) ×
dropMod`)를 뒤집으면, 층 `L`에서 초당 생산되는 유물의 **기대 평가액**(잠재 화폐,
아직 매각되지 않았으면 화폐가 아니라 자산이다)은 다음과 같다.

```
잠재화폐창출률(₩/s) = D × PROGRESS_VALUE × bonus(L) / dropMod(site)
  bonus(L) = 1 + DEPTH_INCOME_BONUS × (L-1)         [1.0 ~ 2.32, L=1~12]
  dropMod(site) ∈ { korea: 1, egypt: 1.15, rome: 0.8 }
```

`layerExpectedValue(L)`이 분자·분모에서 정확히 상쇄된다 — **이 층에서 어떤 유물이
나오는지와 무관하게, 화폐 창출률은 발굴력 `D`에만 비례한다.** 이것이 척추 2번
("수입은 발굴력에서만 나온다")의 v0.1 산식이고, v0.2는 이 산식을 건드리지 않는다.
`bonus/dropMod`의 범위는 `[0.87, 2.9]`(가장 낮음: 이집트 1층, 가장 높음: 로마
12층)이므로, 참조점(`D=1,000`)에서 **잠재 화폐 창출률은 시간당 31.3억~104.4억 ₩**
사이다. 이 값이 σ=1 기준 아래 모든 소스·싱크 비율의 분모다.

**채널별 실현 배율**(잠재값에 곱해지는 최종 배율, §3에서 다시 다룸): 미감정 즉시매각
×0.7(`BLIND_SELL_RATE`, 기존), 감정 후 직접매각 ×1.0(기준), 경매장 ×1.0~1.4
(`AUCTION_PRICE_MULT_MIN`~`MAX`), 거래소는 매수자가 내는 값이라 배율이 아니라 밴드
(§3.2)로 정의된다.

### 1.2 박물관 관람 순수입 (신규)

G5의 캡을 그대로 쓴다. `순수익 ≤ MUSEUM_NET_INCOME_CAP × 동시점 발굴 잠재화폐창출률`,
`MUSEUM_NET_INCOME_CAP = 0.30`. 참조점 기준 시간당 **최대 9.4억~31.3억 ₩**
(위 범위의 30%). 관람객 수식·전시 슬롯 상한의 세부는 시설 관련 후속 문서의 몫이다 —
이 문서는 상한만 강제한다.

### 1.3 NPC 시장조성자의 거래소 매수 (별도 소스가 아님)

G1에서 정했듯 라이벌은 거래소의 유동성 공급자다. 라이벌의 매수 자금은 라이벌
자신의 §1.1 소득에서 나온다 — **이미 1.1항에 포함된 라이벌 경제의 지출을 다시
소스로 세면 이중 계산**이 된다. 그래서 NPC 매수는 화폐 총량 `M`을 늘리지 않는다.
플레이어가 라이벌에게 판 값만큼 라이벌 자금이 줄고 플레이어 자금이 늘 뿐이다(수수료
제외, §2.8).

### 1.4 시즌 시작 보너스 (부트스트랩, 정상상태 계산에서 제외)

시작 자금(v0.1 기준 3만 ₩)은 시즌 시작마다 1회 지급되는 상수다. 시즌 전체 화폐량에
비해 무시할 수 있는 크기이고 반복되는 소스가 아니므로, 아래 정상상태·인플레이션
계산에는 포함하지 않는다.

### 1.5 소스 총괄표

| 소스 | 형태 | 시간당 규모(D=1,000 기준, σ=1) | 척추 2번 관련 |
| --- | --- | --- | --- |
| 유물 처분(전 채널 통합) | 발굴력에 비례하는 연속 흐름 | 31.3억~104.4억 ₩ (채널 배율 적용 전) | 기준 소스, 위반 없음 |
| 박물관 관람 순수입 | 관람객 기반, 캡 있음 | 최대 9.4억~31.3억 ₩ (위의 30%) | G5로 캡, §7에서 판정 |
| NPC 거래소 매수 | P2P 재분배 | 0 (신규 소스 아님) | 무관 |
| 시즌 시작 보너스 | 1회성 | 3만 ₩ (시즌당 1회) | 무관 |

## 2. 화폐 싱크 전량

모두 §0의 원칙대로 비율형이다. 절대값이 아니라 **무엇의 몇 %인지**로 정의한다.

| # | 싱크 | 정의 | 비율 상수 | 시간당 규모(D=1,000 기준) |
| --- | --- | --- | --- | --- |
| K1 | 업그레이드(인부·장비·감정소·보관소·박물관·경매장·거점 등급) | 시즌 누적 소득 대비 목표 흡수율 | `UPGRADE_SINK_SHARE_TARGET = 0.55` | 시즌 누적치로만 의미 있음(§4) |
| K2 | 감정비(기존) | 추정가의 비율 | `APPRAISE_FEE = 0.02` | 6,264만~2.088억 ₩ (§1.1의 2%) |
| K3 | 스텝 총 급여 | 실현 소득 대비 목표 비율 | `STAFF_TOTAL_SALARY_SHARE_TARGET = 0.08` | 2.5억~8.35억 ₩ |
| K4 | 박물관 유지비 | 관람 총수입 대비 비율 | `MUSEUM_UPKEEP_RATE = 0.20` | §1.2의 20% |
| K5 | 발굴 원정비 | 원정 기대소득 대비 비율, 파견 시 선지급 | `EXPEDITION_COST_INCOME_RATIO = 0.15` | 원정당 15% 선차감 |
| K6 | 거점 이전비 | 이전 시점 총자산 대비 비율, 1회성 | `RELOCATION_COST_ASSET_RATIO = 0.10` | 이전당 자산의 10% |
| K7 | 경매장 수수료 | 체결가 대비 비율 | `AUCTION_FEE_RATE = 0.08` | 체결마다 8% |
| K8 | 거래소 수수료 | 체결가 대비 비율, 판매자 부담 | `TRADE_FEE_RATE = 0.05` | 체결마다 5% |
| K9 | 암시장 매입비 | 미감정 추정가 대비 비율, 즉시 지불 | `BLACK_MARKET_BUY_PRICE_RATIO = 0.4` | 매입마다 추정가의 40% |
| K10 | 도난 보험료(선택 가입) | 전시 가치 대비 시간당 비율 | `THEFT_INSURANCE_PREMIUM_RATE = 0.001` | 보험 가입분의 시간당 0.1% |

K3·K4는 §1.2 박물관 캡(0.30) 안에서 이미 차감되는 항목이다 — 관람 순수익 계산식
(`순수익 = 관람수입 − 유지비 − 관장급여`)에 들어가므로, 이 표의 K4는 §1.2의 30%를
넘지 않는 관람수입에 대한 20%일 뿐이지 §1.1 발굴 소득에서 추가로 빠지는 돈이
아니다.

K10의 지급 측(보험금)은 소스가 아니라 조건부 지출이다 — 도난이 실제로 발생했을 때만
`THEFT_INSURANCE_PAYOUT_RATE = 0.6`(평가액의 60%)을 지급한다. 보험사가 화폐
복제기가 되지 않으려면 시간당 기대 지급액이 시간당 프리미엄 수입을 넘지 않아야
한다:

```
기대지급액/시간 = THEFT_RATE × THEFT_INSURANCE_PAYOUT_RATE × 전시가치
프리미엄수입/시간 = THEFT_INSURANCE_PREMIUM_RATE × 전시가치
→ THEFT_RATE ≤ THEFT_INSURANCE_PREMIUM_RATE / THEFT_INSURANCE_PAYOUT_RATE = 0.001 / 0.6 ≈ 0.00167 (시간당 0.167%)
```

G9의 세부 도난 발생률(`THEFT_RATE`, 후속 시설 문서에서 확정)은 이 상한을 넘으면 안
된다. 넘으면 보험 가입이 항상 이득이 되는 순수 화폐 창출 루프가 된다.

## 3. 가격 공식

### 3.1 기준 평가액 (G6로 확장된 형태)

```
평가액 = TIER_VALUE[tier] × CONDITION_VALUE_FACTOR[condition] × valueFactor
  CONDITION_VALUE_FACTOR = [0.4, 0.7, 1.0, 1.3, 1.6]   // 파손/보통/양호/완품/관급
  valueFactor ∈ [0.6, 1.8]                              // 기존 개체 계수
```

이 문서의 규모 추정에는 개체 계수·상태 계수의 평균값으로
`ECONOMY_AVG_VALUE_FACTOR = 1.2`(valueFactor 범위 0.6~1.8의 중점)를 쓴다.

### 3.2 채널별 가격

| 채널 | 가격 | 수수료 |
| --- | --- | --- |
| 미감정 즉시매각 | 추정가 × `BLIND_SELL_RATE = 0.7` | 없음 |
| 직접 매각(감정 후) | 평가액 × 1.0 | 없음 |
| 경매장 | 평가액 × `AUCTION_PRICE_MULT`, 범위 `[AUCTION_PRICE_MULT_MIN=1.0, AUCTION_PRICE_MULT_MAX=1.4]`(경매장 등급에 비례) | `AUCTION_FEE_RATE = 0.08` |
| 거래소(유저 간) | 등록가 ∈ `[기준가×(1−TRADE_PRICE_BAND), 기준가×(1+TRADE_PRICE_BAND)]`, `TRADE_PRICE_BAND = 0.20` | `TRADE_FEE_RATE = 0.05`(판매자 부담) |
| 암시장(매입) | 미감정 추정가 × `BLACK_MARKET_BUY_PRICE_RATIO = 0.4` | 없음(할인 자체가 대가) |

거래소의 "기준가"는 그 유물 종의 최근 체결가 이동평균이다
(`TRADE_REFERENCE_WINDOW_HOURS = 24`). 체결 기록이 없는 최초 등록은 `평가액`을
기준가로 쓴다.

**"시장가 허용 범위가 가격 발견을 막는다"는 지적(§5.5)에 대한 판단**: 맞다, 막는다.
그런데 밴드를 없애면 감정 직후 기준가가 없는 상태에서 초고가 유일급을 헐값에
낚는 초보자 착취(scalping)가 가능해진다. 밴드를 유지하는 대가(가격 발견 제한)가
착취 위험보다 싸다고 판단해 밴드를 유지한다. T4는 애초에 "희귀 이상만 거래 가능"
규칙에서도 별도로 취급해야 한다 — 거래소가 아니라 오퍼/역오퍼(`notes/mda.md`
§1.3, v0.3)로만 이전되도록 시장 시스템 후속 문서(§5.5)에 위임한다. 이 문서는
밴드 상수만 확정한다.

## 4. 인플레이션 방어 구조

세 겹으로 막는다.

1. **비율형 싱크** (§0, §2) — 모든 신규 지출이 소득 또는 자산의 비율이므로, 발굴력
   `D`가 커지면 싱크도 같은 비율로 커진다. 소스와 싱크가 같은 변수(`D`, 자산)에
   종속되어 있어 한쪽만 폭주할 수 없다.
2. **박물관 캡** (`MUSEUM_NET_INCOME_CAP = 0.30`) — 유일하게 발굴력과 무관하게
   커질 수 있는 소스(소장량 기반이 아니라 슬롯 기반이라 이미 상한이 있지만, 인구·
   마케팅 레벨이 자라며 서서히 커질 수 있다)에 발굴 소득 대비 상한을 걸어 독립
   폭주를 막는다.
3. **유한 재고의 구조적 자기제동** — T1~T2는 리젠이 있어도 원래 총량(`TIER_STOCK`)
   을 캡으로 두고, T3는 시즌당 고정 공급(`TIER3_SEASON_SUPPLY = 6`), T4는 리젠이
   없다(G6). 고티어 재고가 시즌 중 소진되면 그 층의 `layerExpectedValue(L)`가
   자연히 낮아져(남은 재고가 T0·T1 쪽으로 쏠리므로) **화폐 창출률이 스스로
   억제된다.** 시즌 후반부로 갈수록 대형 화폐 창출 사건(국보·유일 매각)이 저절로
   희귀해지는 구조다. 이건 추가로 만든 장치가 아니라 재고 시스템 자체의 성질이다.

## 5. 정상상태 목표 — 24시간 총통화량 증가율

**측정 대상** `M(t)`: 시각 `t`에서 플레이어와 라이벌 전원의 `funds` 합
(`player.funds + Σ rival.funds`). 유물 자산(vault)은 제외한다 — 판 돈만 통화다.
거래소·경매장 수수료는 `M`에서 소멸하는 소각분으로 잡는다. NPC 매수(§1.3)는 `M` 총량을
바꾸지 않는다(플레이어 쪽으로 이전만 될 뿐).

**목표**: 성숙기(`MATURE_PHASE_START_HOUR = 168`, 즉 시뮬레이션 경과 168시간 = 7일
이후, `notes/decisions.md` G11의 D7 마일스톤과 같은 시점) 이후, 임의의 24시간
구간에서

```
(M(t+24) − M(t)) / M(t) ≤ CURRENCY_GROWTH_24H_CAP = 0.12
```

성숙기 이전(부트스트랩 구간)은 이 캡에서 제외한다 — 초기 성장은 온보딩의 일부이고
G11의 마일스톤 곡선이 이미 그 속도를 정의한다.

**측정 방법**: `pnpm --filter relic-king sim --hours 336`(14일)을 매각 성향 3가지
프로필로 반복 실행한다 — 공격적 매각(σ≈1에 가까움), 중립, 홀딩성향(σ가 낮음,
소장고에 오래 보유). 각 프로필에서 시간마다 `M(t)`를 로그하고, `t ≥ 168`인 모든
구간에서 24시간 성장률의 최댓값을 계산해 `CURRENCY_GROWTH_24H_CAP`과 비교한다.
세 프로필 전부가 캡을 통과해야 한다 — 하나라도 넘으면 그 프로필이 지목하는 싱크
(대개 공격적 매각 프로필이면 K1·K2, 홀딩성향이 캡을 넘으면 박물관·거래소 쪽 싱크)를
다시 조정한다. 이 sim의 `--sell-profile` 옵션과 `M(t)` 로그 출력은 아직 구현되어
있지 않다 — 구현은 이 기획 문서의 범위 밖이지만, 후속 구현 작업이 반드시 추가해야
할 계측 지점으로 여기 명시한다.

## 6. 유물 공급량 대비 화폐 공급량의 정상상태

### 6.1 유한재고 유물의 세계 총가치(상한)

T0(무한 재고)는 재고가 아니라 흐름(§1.1)으로 이미 다뤘으므로 여기서는 제외한다.
T1~T4(유한 재고)만 계산한다. G7이 정한 거점당 분포(`SPECIES_PER_SITE_BY_TIER =
[25, 8, 4, 2, 1]`, T0~T4 순, 12거점)를 그대로 쓴다.

| 티어 | 종수(12거점 합) | 종당 재고(`TIER_STOCK`) | 기준가(`TIER_VALUE`) | 총가치(`× ECONOMY_AVG_VALUE_FACTOR = 1.2`) |
| --- | --- | --- | --- | --- |
| T4 | 12 | 1 | 6,000,000,000 | 864억 |
| T3 | 24 | 6 | 260,000,000 | 449.28억 |
| T2 | 48 | 60 | 9,000,000 | 311.04억 |
| T1 | 96 | 2,000 | 380,000 | 875.52억 |
| **합** | | | | **2,499.84억 ≈ `ARTIFACT_WORLD_VALUE_CEILING` = 2,500억** |

이 값은 "이 시즌에 존재하는 유한재고 유물을 전부, 한 번씩 최고가로 판다면 나오는
화폐"의 이론적 상한이다. T0의 지속적인 흐름은 이 상한 밖에 있고 §5의 24시간
성장률 캡으로 별도 통제된다.

### 6.2 정상상태 정의

```
M(시즌 말) ≤ ARTIFACT_TO_CURRENCY_STEADY_RATIO × ARTIFACT_WORLD_VALUE_CEILING
ARTIFACT_TO_CURRENCY_STEADY_RATIO = 1.0
```

시즌이 끝나는 시점의 총통화량이 유한재고 유물 총가치의 1.0배를 넘지 않는 것을
목표로 잡는다. 이 비율이 1을 크게 넘으면, 화폐 창출이 (희소성이 담보하는) 유한재고
매각이 아니라 T0의 무제한 흐름에 지나치게 의존하고 있다는 신호이고, §5의 24시간
캡이 그 흐름을 억제하지 못하고 있다는 뜻이다. 두 지표(§5의 성장률, §6.2의 총량
비율)는 서로 다른 실패 양상을 잡는다 — 성장률은 **속도**, 총량 비율은 **규모**의
이상을 잡는다.

## 7. 척추 2번 항목별 판정 — "깊이는 돈을 벌어 주지 않는다"

| 시스템 | 판정 | 근거 |
| --- | --- | --- |
| 세계지도·거점 이동 | **성립** | 거리는 시간·비용(K5·K6)만 늘리고, 무엇을 캐는지만 바꾼다. 소득 산식(§1.1)은 발굴력에만 종속된다 |
| 발굴단 단장·스텝 스탯 | **성립(조건부)** | 스탯이 발굴력 `D`에 **가산항으로만** 결합해야 한다. 곱연산 결합은 첫 구현의 폭주(194만/s)를 재현한다 — 이 제약을 `notes/staff.md`(후속)에 넘긴다 |
| 박물관 | **성립(G5로 교정)** | 소장량이 아니라 슬롯에 묶고 발굴 소득의 30%로 캡(§1.2). 캡을 걷으면 즉시 위반으로 되돌아간다 |
| 경매장 | **성립** | 신규 소스가 아니라 §1.1의 처분 경로 중 하나(배율만 다름). 화폐 창출의 근원은 여전히 발굴이다 |
| 거래소(유저 간) | **성립, 무관** | P2P 재분배라 화폐 총량 `M`에 영향이 없다(§1.3). 수수료(K8)는 순수 싱크 |
| 암시장 | **성립(조건부)** | 매입은 싱크(K9)이고, 재판매는 §1.1의 처분 경로로 이미 계산된다. `BLACK_MARKET_BUY_PRICE_RATIO`가 시세차익을 발굴력보다 빠른 성장 경로로 만들지 않을 만큼 낮게 잡혀야 한다 — 0.4는 "저가에 사서 감정 후 되판다"는 재미를 주면서도 반복 매입만으로 발굴을 능가하는 소득을 내지 않도록 잡은 값이다 |
| 스텝 급여·유지비·원정비·이전비 | **무관(성립)** | 전부 싱크(지출)다. 수입원이 아니므로 척추 2번의 대상이 아니다 |
| 유물 리젠(T1~T2) | **성립** | 재고가 늘어도 그 재고를 화폐로 바꾸려면 여전히 발굴력으로 캐내야 한다. 리젠이 원래 총량을 캡으로 두므로(G6) 재고 자체의 인플레이션도 없다 |
| 도난 보험(K10) | **성립(조건부)** | §2의 부등식(`THEFT_RATE ≤ 0.00167/시간`)을 지키는 한 보험은 순수 싱크에 가깝고 화폐를 창출하지 않는다. 후속 시설 문서가 이 상한을 넘는 도난율을 설정하면 위반이 된다 |

## 8. `balance.ts` 상수 총람

이 문서에서 새로 이름 붙인 상수 전부. 구현 시 그대로 옮긴다.

```ts
// 참조점(모델링용, 게임 밸런스 상수 아님)
export const ECONOMY_REF_DIG_POWER = 1000;
export const ECONOMY_AVG_VALUE_FACTOR = 1.2;

// G6 — 상태 축
export const CONDITION_NAME = ["파손", "보통", "양호", "완품", "관급"] as const;
export const CONDITION_VALUE_FACTOR = [0.4, 0.7, 1.0, 1.3, 1.6] as const;

// G6 — 리젠
export const TIER1_REGEN_INTERVAL_HOURS = 24;
export const TIER1_REGEN_AMOUNT = 4;
export const TIER2_REGEN_INTERVAL_HOURS = 168;
export const TIER2_REGEN_AMOUNT = 1;
export const TIER3_SEASON_SUPPLY = 6;
export const RELIC_T4_REGEN_ENABLED = false;

// G7 — 데이터 목표
export const ARTIFACT_SPECIES_TARGET = 480;
export const SPECIES_PER_SITE_BY_TIER = [25, 8, 4, 2, 1] as const; // T0~T4
export const T4_MIN_INDEPENDENT_SOURCES = 2;

// G5 — 박물관
export const MUSEUM_NET_INCOME_CAP = 0.30;
export const MUSEUM_UPKEEP_RATE = 0.20;

// 가격 공식(§3)
export const AUCTION_PRICE_MULT_MIN = 1.0;
export const AUCTION_PRICE_MULT_MAX = 1.4;
export const AUCTION_FEE_RATE = 0.08;
export const TRADE_PRICE_BAND = 0.20;
export const TRADE_FEE_RATE = 0.05;
export const TRADE_REFERENCE_WINDOW_HOURS = 24;
export const BLACK_MARKET_BUY_PRICE_RATIO = 0.4;
export const BLACK_MARKET_SLOT_CAPACITY = 12;

// 싱크 목표 비율(§2)
export const UPGRADE_SINK_SHARE_TARGET = 0.55;
export const STAFF_TOTAL_SALARY_SHARE_TARGET = 0.08;
export const EXPEDITION_COST_INCOME_RATIO = 0.15;
export const RELOCATION_COST_ASSET_RATIO = 0.10;

// 도난 보험(§2, G9)
export const THEFT_INSURANCE_PREMIUM_RATE = 0.001;
export const THEFT_INSURANCE_PAYOUT_RATE = 0.6;
export const THEFT_APPLICABLE_MAX_TIER = 3;
export const THEFT_RECOVERY_WINDOW_HOURS = 72;

// 고정비(G10)
export const SALARY_ARREARS_GRACE_HOURS = 72;

// 시즌·마일스톤(G2, G11)
export const SEASON_LENGTH_WEEKS = 12;
export const MILESTONE_FIRST_SESSION_MINUTES = 20;
export const MILESTONE_D1_MINUTES = 30;
export const MILESTONE_D7_HOURS = 3;
export const MILESTONE_D30_HOURS = 10;

// 관여 예산(G3)
export const DAILY_ENGAGEMENT_MIN_COUNT = 2;
export const DAILY_ENGAGEMENT_MAX_COUNT = 3;
export const DAILY_ENGAGEMENT_SESSION_SECONDS = 180;
export const ENGAGEMENT_UPSIDE_MIN = 0.20;
export const ENGAGEMENT_UPSIDE_MAX = 0.40;

// 세계지도(G8)
export const MAP_ZOOM_LEVELS = 3;

// 정상상태 측정(§5, §6)
export const CURRENCY_GROWTH_24H_CAP = 0.12;
export const MATURE_PHASE_START_HOUR = 168;
export const ARTIFACT_WORLD_VALUE_CEILING = 250_000_000_000; // 2,500억, 정확히는 249,984,000,000
export const ARTIFACT_TO_CURRENCY_STEADY_RATIO = 1.0;
```
