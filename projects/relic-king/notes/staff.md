# 유물왕 — 스텝(고용) 설계 (v0.2)

> `prompts/v0.2-deepening.md` §5.6, §8 4단계의 산출물. `notes/decisions.md` G3(가챠
> 비목표·관여 예산)·G5(박물관 캡)·G9(도난 회수)·G10(체납·파산 불가)와
> `notes/economy.md` §7(척추 2번 판정: "스탯은 발굴력에 가산항으로만 결합해야 한다")·
> K3(스텝 총 급여 비율)이 이 문서의 전제다. `notes/world-map.md`(발굴단 단장의 이동
> 스탯)와 `spec.md` v0.2 절이 이 문서의 수식을 그대로 참조한다.

## 0. 원칙 — 스탯은 전부 공개, 전부 가산, 전부 상한

세 직군 스탯은 고용 전에 **전부 수치로 공개**된다(척추 5번). 그리고 발굴력 `D`에
결합하는 스탯(단장의 통솔력)은 **가산항으로만** 들어간다 — `notes/economy.md` §7의
명시적 제약이다. 곱연산으로 D에 결합하면 첫 구현의 194만/s 폭주(장비 레벨의
지수 곱연산과 같은 모양)가 재현된다. 이동시간·수수료·확률에 곱해지는 스탯은
있지만, **D 자체에 곱해지는 스탯은 이 문서에 하나도 없다.**

모든 스탯 효과는 상한이 있다(무한 성장 금지, `notes/decisions.md` G3의 "이득은
늘지만 폭주하지 않는다" 정신). 스탯 범위는 공통으로 `STAFF_STAT_MIN = 1` ~
`STAFF_STAT_MAX = 100`.

## 1. 발굴단 단장 (Foreman)

발굴단(`spec.md` v0.2 §발굴단과 원정)마다 단장 1명이 필수다. 스탯 4개, 전부
가산항이거나 시간·확률의 분모/승수다 — D 자체를 곱하는 스탯은 없다.

| 스탯 | 범위 | 들어가는 수식 | 항 |
| --- | --- | --- | --- |
| 통솔력 `LEADERSHIP` | 1~100 | `D_team`의 기반항(장비 배율 곱셈 **이전**) | `FOREMAN_DIG_CONTRIBUTION = LEADERSHIP × FOREMAN_DIG_COEFF`, 가산 |
| 항해술 `NAVIGATION` | 1~100 | `notes/world-map.md` §3 이동시간 공식의 속도 분모 | `EXPEDITION_SPEED_KMH × (1 + NAVIGATION × FOREMAN_NAV_SPEED_COEFF)` |
| 위기대응 `CRISIS_MGMT` | 1~100 | `spec.md` v0.2 원정 실패 공식의 미스헵 확률 | `EXPEDITION_MISHAP_CHANCE × (1 − CRISIS_MGMT × FOREMAN_MISHAP_REDUCTION_COEFF)` |
| 감식안 `APPRAISAL_EYE` | 1~100 | 그 발굴단이 캐 온 유물의 감정 소요시간 | `appraiseSeconds(lab) × (1 − APPRAISAL_EYE × FOREMAN_APPRAISAL_COEFF)` |

```
FOREMAN_DIG_COEFF = 0.8                    // LEADERSHIP=100 → D_team 기반항에 +80
FOREMAN_NAV_SPEED_COEFF = 0.003            // NAVIGATION=100 → 이동속도 +30%
FOREMAN_MISHAP_REDUCTION_COEFF = 0.005     // CRISIS_MGMT=100 → 미스헵 확률 −50%
FOREMAN_APPRAISAL_COEFF = 0.003            // APPRAISAL_EYE=100 → 감정시간 −30%

D_team = (BASE_DIG + WORKERS_team × WORKER_DIG + LEADERSHIP × FOREMAN_DIG_COEFF) × GEAR_MULT^gearLevel_team
```

**라이벌 각주**(`notes/decisions.md` G18/A14): 라이벌에게도 v0.2 원정 규칙이
동일 적용되지만 라이벌은 단장 개체가 없다. 미스헵 감소항(`CRISIS_MGMT`)만
스탯 중앙값 `RIVAL_CRISIS_MGMT_EQUIV = 50`으로 대체하고, 나머지(통솔력·항해술·
감식안에 대응하는 발굴력·이동속도·감정시간 보정)는 라이벌의 기존 `baseDig`
등 단순화된 파라미터가 대신한다 — 라이벌 스텝 전체의 정교화(단장 개체 도입
등)는 이번 실행 범위 밖이고 후속 실행이 맡는다.

`GEAR_MULT^gearLevel_team`(기존 v0.1 장비 배율, 지수형)은 그대로 유지한다 — 이건
스탯이 아니라 장비 업그레이드이고, v0.1에서 이미 검증된 폭주 방지 구조(드랍
임계와 상쇄)의 대상이다. `LEADERSHIP`은 그 **밖**이 아니라 지수 곱셈 **전** 기반항에
더해지므로, 통솔력이 아무리 높아도 장비 배율만큼 곱으로 증폭되지 않는다 —
정확히는 장비 배율만큼 같이 곱해지긴 하지만(기반항 전체에 곱하므로), 통솔력
자체가 지수항이 아니라 선형 가산항이라 통솔력을 올리는 것만으로 폭주 곡선이
생기지 않는다. 이게 economy.md §7이 요구한 "가산항으로만 결합"의 정확한 의미다.

## 2. 박물관 관장 (Museum Curator)

박물관 1관당 관장 1명이 필수다.

| 스탯 | 범위 | 들어가는 수식 | 항 |
| --- | --- | --- | --- |
| 전시노하우 `CURATION` | 1~100 | 관람객 수식(`spec.md` v0.2 §박물관)의 관장 항 | `min(MUSEUM_CURATOR_CONTRIB_CAP, 1 + MUSEUM_CURATOR_COEFF × CURATION)`, 관람객 수식에 곱연산 |
| 보안감각 `SECURITY_SENSE` | 1~100 | 도난 회수 성공률(G9) | `min(THEFT_RECOVERY_CHANCE_CAP, THEFT_RECOVERY_BASE + SECURITY_SENSE × CURATOR_RECOVERY_COEFF)` |
| 마케팅감각 `MARKETING_SENSE` | 1~100 | 마케팅 업그레이드 레벨의 실제 효과 | `마케팅항 = 1 + MUSEUM_MARKETING_COEFF × 마케팅레벨 × (1 + MARKETING_SENSE × CURATOR_MKT_COEFF)` |
| 유지관리 `MAINTENANCE` | 1~100 | 박물관 유지비(economy.md K4) | `실제유지비 = MUSEUM_UPKEEP_RATE × 관람수입 × (1 − min(CURATOR_UPKEEP_CAP, MAINTENANCE × CURATOR_UPKEEP_COEFF))` |

```
MUSEUM_CURATOR_COEFF = 0.005
MUSEUM_CURATOR_CONTRIB_CAP = 1.5            // CURATION=100 → 관람객 ×1.5 상한
THEFT_RECOVERY_BASE = 0.20
CURATOR_RECOVERY_COEFF = 0.006
THEFT_RECOVERY_CHANCE_CAP = 0.80            // SECURITY_SENSE=100 → 회수 성공률 80%
CURATOR_MKT_COEFF = 0.004                   // MARKETING_SENSE=100 → 마케팅 효과 ×1.4
CURATOR_UPKEEP_COEFF = 0.003
CURATOR_UPKEEP_CAP = 0.30                   // MAINTENANCE=100 → 유지비 −30% 상한
```

`CURATION`은 G5의 30% 캡(`MUSEUM_NET_INCOME_CAP`) **안에서** 관람 수입을 올릴
뿐이다 — 캡은 관장 스탯보다 우선 적용되는 하드 클램프이므로, 관장을 아무리
잘 뽑아도 박물관 순수익이 그 시점 발굴 수입의 30%를 넘지 않는다(economy.md §1.2).

## 3. 경매장 관장 (Auction Master)

경매장 1관당 관장 1명이 필수다.

| 스탯 | 범위 | 들어가는 수식 | 항 |
| --- | --- | --- | --- |
| 협상력 `NEGOTIATION` | 1~100 | 경매장 가격배율(economy.md `AUCTION_PRICE_MULT`) | `실제배율 = AUCTION_PRICE_MULT_MIN + (AUCTION_PRICE_MULT_MAX − AUCTION_PRICE_MULT_MIN) × min(1, 등급진행도 + NEGOTIATION × AUCTIONEER_NEGOTIATION_COEFF)` |
| 물류처리력 `LOGISTICS` | 1~100 | 경매장 물량 상한(`AUCTION_SLOT_CAP`) | `실질슬롯 = AUCTION_SLOT_CAP_BY_GRADE[grade] + floor(LOGISTICS × AUCTIONEER_LOGISTICS_COEFF)` |
| 진행속도 `PACE` | 1~100 | 낙찰 소요시간(`AUCTION_SETTLE_HOURS`) | `실제소요 = AUCTION_SETTLE_HOURS × (1 − min(AUCTIONEER_PACE_CAP, PACE × AUCTIONEER_PACE_COEFF))` |
| 고객관리 `CLIENTELE` | 1~100 | 경매장 수수료(economy.md K7, `AUCTION_FEE_RATE`) | `실제수수료 = AUCTION_FEE_RATE × (1 − min(AUCTIONEER_FEE_CAP, CLIENTELE × AUCTIONEER_FEE_DISCOUNT_COEFF))` |

```
AUCTIONEER_NEGOTIATION_COEFF = 0.006        // NEGOTIATION=100 → 등급진행도 +0.6 가산
AUCTIONEER_LOGISTICS_COEFF = 0.1            // LOGISTICS=100 → 슬롯 +10
AUCTIONEER_PACE_COEFF = 0.004
AUCTIONEER_PACE_CAP = 0.35                  // PACE=100 → 소요시간 −35% 상한
AUCTIONEER_FEE_DISCOUNT_COEFF = 0.002
AUCTIONEER_FEE_CAP = 0.20                   // CLIENTELE=100 → 수수료 −20% 상한(8% → 6.4%)
```

## 4. 고용 시장 갱신 규칙

```
STAFF_MARKET_REFRESH_HOURS = 24
STAFF_MARKET_CANDIDATE_COUNT = 3      // 직군당 후보 3명
```

거점의 "인력사무소"가 24시간마다 직군별 후보 3명을 새로 낸다. 후보의 스탯은
`STAFF_STAT_MIN`~`STAFF_STAT_MAX` 구간에서 결정론적 시드(그 거점 id + 갱신 회차 +
직군을 입력으로 하는 `FNV1a32` 해시, `notes/world-map.md` §8.2와 같은 방식)로
정해지고, **고용하기 전에 스탯 4개가 전부 화면에 보인다.** 갱신은 무료이고
플레이어가 재화를 써서 다시 굴릴 수 없다 — 재화를 써서 갱신을 반복할 수 있게
만드는 순간 그게 가챠다(§8).

## 5. 급여 공식

`notes/economy.md` §0의 원칙("v0.2가 추가하는 모든 신규 싱크는 소득 또는 자산에
대한 비율로만 정의한다")은 급여에도 그대로 적용된다. 급여를 고정 ₩/h로 두면
초반(발굴력이 작을 때)에는 급여가 소득을 넘어 즉시 파산 직전 상태가 되고, 후반에는
소득에 비해 무의미해진다 — 그래서 **급여는 그 스텝이 관여하는 소득의 비율**로
정의한다. 스탯은 그 비율 안에서 급여를 얼마나 더 받는지만 움직인다.

```
STAFF_SALARY_STAT_COEFF = 0.6
FOREMAN_SALARY_INCOME_SHARE = 0.03      // 그 발굴단이 벌어들이는 잠재화폐의 3%
CURATOR_SALARY_INCOME_SHARE = 0.15      // 그 박물관 관람수입(캡 적용 전)의 15%
AUCTIONEER_SALARY_FEE_SHARE = 0.05      // 그 경매장이 처리한 시간당 낙찰총액의 5%

스탯배율 = 1 + STAFF_SALARY_STAT_COEFF × (Σstat_i / 4) / STAFF_STAT_MAX   // 1.0 ~ 1.6

급여(단장, 시간당) = FOREMAN_SALARY_INCOME_SHARE
  × D_team × PROGRESS_VALUE × bonus(L) / dropMod(site) × 3600 × 스탯배율
급여(관장, 시간당) = CURATOR_SALARY_INCOME_SHARE × 관람수입(시간당, 캡 적용 전) × 스탯배율
급여(경매관장, 시간당) = AUCTIONEER_SALARY_FEE_SHARE × 그 경매장의 시간당 낙찰총액 × 스탯배율
```

각 급여가 **그 스텝이 관여하는 도메인 자신의 소득**에 매여 있으므로, 발굴력이
작은 초반에는 급여도 작고 발굴력이 커지면 급여도 같이 커진다 — 절대값 싱크가
아니라 비율형 싱크다. 세 도메인의 비율(3%·15%·5%)을 합치면
`notes/economy.md` K3의 목표(`STAFF_TOTAL_SALARY_SHARE_TARGET = 0.08`, 발굴
소득 대비 8%)에 근접한다 — 관장 급여는 박물관 수입(발굴 소득의 최대 30%,
G5 캡)의 15%이므로 발굴 소득 대비로는 최대 4.5%이고, 경매관장 급여는 처분된
값의 5%(처분되는 값 자체는 발굴 소득의 부분집합)이므로 발굴 소득 대비로는
그보다 작다. 단장 3% + 관장 최대 4.5% + 경매관장 소액을 합치면 8%에 근접하되
정확히 일치하도록 강제하지는 않는다 — 각 비율이 **그 도메인 안에서** 독립적으로
정의돼야 스탯의 의미(§0)가 유지되기 때문이다. 실제 시뮬 측정치가 8%를 크게
벗어나면(`notes/economy.md` §5의 측정 방법으로 확인) 이 세 상수를 조정한다.

스탯 평균이 낮으면 급여는 거의 소득의 원래 비율, 높으면 최대 1.6배. 급여는
스탯이 높을수록 **결정론적으로** 오른다 — "돈을 더 내면 더 좋은 인력이 확정적으로
온다"는 구조라, 확률에 재화를 태우는 가챠 구조와 근본적으로 다르다.

## 6. 승급·이직·은퇴

```
STAFF_PROMOTION_INTERVAL_HOURS = 168     // 1주
STAFF_PROMOTION_STAT_GAIN = 2
STAFF_QUIT_CHANCE_PER_HOUR_IN_ARREARS = 0.02   // 체납 유예(72h) 초과 후에만 적용
STAFF_RETIREMENT_TENURE_HOURS = 720      // 30일
STAFF_RETIREMENT_WARNING_HOURS = 48
STAFF_RETIREMENT_SEVERANCE_MULT = 4      // 시급 × 4시간분
```

- **승급**: `STAFF_PROMOTION_INTERVAL_HOURS`마다, 근속 중인 스텝의 **가장 낮은
  스탯 하나**에 `STAFF_PROMOTION_STAT_GAIN`을 더한다(무작위 스탯이 아니라 최저
  스탯을 결정론적으로 보완 — 이 역시 §8의 가챠 방지 장치다). `STAFF_STAT_MAX`에서
  멈춘다.
- **이직**: `notes/decisions.md` G10의 급여 체납 유예(`SALARY_ARREARS_GRACE_HOURS
  = 72`, `notes/economy.md`에 정의) **안에서는 이직하지 않는다** — 유예 자체가
  "72시간 안에 해결하면 아무 일도 없다"는 안전판이다. 유예를 넘긴 뒤에만 시간당
  `STAFF_QUIT_CHANCE_PER_HOUR_IN_ARREARS`로 이직한다. 오프라인 상한
  (`OFFLINE_CAP_SECONDS = 12시간`)이 72시간보다 훨씬 짧으므로, 정상적인 방치
  범위 안에서는 이직이 구조적으로 일어날 수 없다 — G3의 "방치 중 손실로
  처벌하지 않는다"가 급여 체납에도 성립하는 이유다.
- **은퇴**: 근속 `STAFF_RETIREMENT_TENURE_HOURS`(30일)에 닿으면 자동 은퇴하고
  퇴직금(`STAFF_RETIREMENT_SEVERANCE_MULT`시간분 급여)을 받는다.
  `STAFF_RETIREMENT_WARNING_HOURS`(48시간) 전에 예고가 뜬다. 은퇴는 처벌이 아니라
  인력 순환 장치다 — 자리는 다음 고용 시장 갱신에 바로 다시 등장한다.

## 7. 동일 직군 복수 고용

- **발굴단 단장**: 발굴단마다 1명 필수 — `notes/world-map.md`/`spec.md`의
  `MAX_EXPEDITION_TEAMS`(초기 1, 상한 `MAX_EXPEDITION_TEAMS_CAP = 4`)까지 팀을
  늘리면 그만큼 단장을 복수 고용해야 한다. 팀 없이 단장만 여분으로 두는 것은
  불가능하다(급여만 나가고 기여가 없으므로 UI가 막는다).
- **박물관 관장 / 경매장 관장**: 건물 1관당 1명 필수. 건립 수만큼 복수 고용된다
  (`MUSEUM_MAX_COUNT`·`AUCTION_HOUSE_MAX_COUNT`는 `spec.md` v0.2에서 확정, 둘 다
  `MAX_OWNED_SITES`를 넘지 않는다).

## 8. 가챠가 되지 않도록 하는 장치

비목표(가챠 금지)를 지키는 구조적 장치 4가지:

1. **고용 전 전수 공개**: 후보 스탯 4개가 고용하기 전에 전부 보인다. "뽑고 나서
   확인"하는 구조가 아니다.
2. **갱신은 무료, 재화로 다시 굴릴 수 없다**: 24시간마다 자동으로 후보가 바뀌지만,
   플레이어가 재화를 써서 즉시 재추첨하는 기능은 없다. 가챠의 핵심 구조(재화를
   반복 투입해 무작위 보상을 다시 뽑는 것)가 성립할 지점이 없다.
3. **급여가 스탯의 결정론적 함수**: 더 좋은 인력은 확률이 아니라 더 높은,
   눈에 보이는 급여로 산다. "같은 값을 내고 운이 좋으면 더 좋은 게 나온다"는
   구조가 아니다.
4. **승급이 최저 스탯을 결정론적으로 보완**: 성장도 무작위 스탯 재굴림이 아니라
   약점 보완이다.

## 9. 급여 체납 규칙(G10 구체화)

```
SALARY_ARREARS_GRACE_HOURS = 72         // notes/economy.md에 이미 정의(재정의하지 않음)
STAFF_ARREARS_STAT_PENALTY_MULT = 0.5
```

자금이 0 이하가 되어 그 시점 급여를 못 주면 체납 상태로 들어간다. 체납 중에는
전원의 스탯 기여가 `STAFF_ARREARS_STAT_PENALTY_MULT`(50%)로 깎인다 —
연쇄적으로 D·관람객·경매 배율이 낮아져 자금 회복이 느려지지만, 0 밑으로
더 내려가거나(음수 자금 없음), 유물이 압류되거나, 시설이 멈추는 일은 없다
(G10 그대로). 유예 72시간 안에 급여를 지불하면(자금이 다시 양수가 되는 순간
자동 정산) 페널티는 즉시 풀린다. 유예를 넘기면 §6의 이직 확률이 시간당으로
누적된다 — 이게 체납의 유일한 "진짜" 대가다.

## 10. `balance.ts` 상수 총람

```ts
export const STAFF_STAT_MIN = 1;
export const STAFF_STAT_MAX = 100;

// 발굴단 단장(§1)
export const FOREMAN_DIG_COEFF = 0.8;
export const FOREMAN_NAV_SPEED_COEFF = 0.003;
export const FOREMAN_MISHAP_REDUCTION_COEFF = 0.005;
export const FOREMAN_APPRAISAL_COEFF = 0.003;

// 박물관 관장(§2)
export const MUSEUM_CURATOR_COEFF = 0.005;
export const MUSEUM_CURATOR_CONTRIB_CAP = 1.5;
export const THEFT_RECOVERY_BASE = 0.20;
export const CURATOR_RECOVERY_COEFF = 0.006;
export const THEFT_RECOVERY_CHANCE_CAP = 0.80;
export const CURATOR_MKT_COEFF = 0.004;
export const CURATOR_UPKEEP_COEFF = 0.003;
export const CURATOR_UPKEEP_CAP = 0.30;

// 경매장 관장(§3)
export const AUCTIONEER_NEGOTIATION_COEFF = 0.006;
export const AUCTIONEER_LOGISTICS_COEFF = 0.1;
export const AUCTIONEER_PACE_COEFF = 0.004;
export const AUCTIONEER_PACE_CAP = 0.35;
export const AUCTIONEER_FEE_DISCOUNT_COEFF = 0.002;
export const AUCTIONEER_FEE_CAP = 0.20;

// 고용 시장(§4)
export const STAFF_MARKET_REFRESH_HOURS = 24;
export const STAFF_MARKET_CANDIDATE_COUNT = 3;

// 급여(§5)
export const STAFF_SALARY_STAT_COEFF = 0.6;
export const FOREMAN_SALARY_INCOME_SHARE = 0.03;
export const CURATOR_SALARY_INCOME_SHARE = 0.15;
export const AUCTIONEER_SALARY_FEE_SHARE = 0.05;

// 승급·이직·은퇴(§6)
export const STAFF_PROMOTION_INTERVAL_HOURS = 168;
export const STAFF_PROMOTION_STAT_GAIN = 2;
export const STAFF_QUIT_CHANCE_PER_HOUR_IN_ARREARS = 0.02;
export const STAFF_RETIREMENT_TENURE_HOURS = 720;
export const STAFF_RETIREMENT_WARNING_HOURS = 48;
export const STAFF_RETIREMENT_SEVERANCE_MULT = 4;

// 체납(§9) — SALARY_ARREARS_GRACE_HOURS = 72 는 notes/economy.md에 이미 정의됨
export const STAFF_ARREARS_STAT_PENALTY_MULT = 0.5;
```
