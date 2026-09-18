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

발굴단(`spec.md` v0.2 §발굴단과 원정)마다 단장 1명이 필수다. **(개정 —
`notes/decisions.md` G50/C#5)** 스탯을 4개에서 **2개**로 줄였다 — 원래
4스탯(통솔력·항해술·위기대응·감식안) 전 효과가 ±30% 미만 계수이고 고용 1회로
끝나, "2스탯으로 줄여도 재미 손실이 없다"는 반박 근거가 없었다. 가장
핵심적인 2스탯만 남긴다: `LEADERSHIP`(발굴력 기반항, 직접적)과
`NAVIGATION`(이동시간, 거리·탐험이라는 v0.2의 주제와 직결). 나머지는
제거하고 그 자리를 **기본 공식(스탯 보정 없음)**이 메운다 — 새 상태를
만들지 않는다.

| 스탯 | 범위 | 들어가는 수식 | 항 |
| --- | --- | --- | --- |
| 통솔력 `LEADERSHIP` | 1~100 | `D_team`의 기반항(장비 배율 곱셈 **이전**) | `FOREMAN_DIG_CONTRIBUTION = LEADERSHIP × FOREMAN_DIG_COEFF`, 가산 |
| 항해술 `NAVIGATION` | 1~100 | `notes/world-map.md` §3 이동시간 공식의 속도 분모 | `EXPEDITION_SPEED_KMH × (1 + NAVIGATION × FOREMAN_NAV_SPEED_COEFF)` |

**제거됨**(G50/C#5): 위기대응 `CRISIS_MGMT`(미스헵 확률 감소) — 미스헵
확률은 이제 거리 기반 기본 공식만 적용한다(`spec.md` §8.3의
`EXPEDITION_MISHAP_CHANCE(distance)`에서 스탯 보정항을 뺀다). 감식안
`APPRAISAL_EYE`(감정 소요시간 단축) — 감정 시간은 이제 감정소 레벨에만
의존한다(`appraiseSeconds(lab)`, 단장 보정 없음).

```
FOREMAN_DIG_COEFF = 0.05                   // LEADERSHIP=100 → D_team 기반항에 +5 (무료 인부 5명분 수준)
FOREMAN_NAV_SPEED_COEFF = 0.003            // NAVIGATION=100 → 이동속도 +30%
FOREMAN_HIRE_COST = 200_000                // 단장 고용비(신설 — notes/decisions.md G21/A6)

D_team = (BASE_DIG + WORKERS_team × WORKER_DIG + LEADERSHIP × FOREMAN_DIG_COEFF) × GEAR_MULT^gearLevel_team
```

라이벌 미스헵 계산의 `RIVAL_CRISIS_MGMT_EQUIV` 각주(구 G18/A14)는 `CRISIS_MGMT`
스탯 자체가 삭제되며 함께 삭제됐다 — 라이벌도 플레이어와 동일한 거리 기반
기본 공식(스탯 보정 없음)을 쓴다.

**(개정 — `notes/decisions.md` G21/A6)** `FOREMAN_DIG_COEFF`를 기존 0.8에서
**0.05로 대폭 하향**하고 **`FOREMAN_HIRE_COST`를 신설**했다. 기존 0.8은
`LEADERSHIP=100`인 단장 1명을 고용하는 즉시(무료로) `D_team` 기반항에 +80을
더했다 — `BASE_DIG=1`이므로 "무료로 81배"였다(review-r1.md 실측). 0.05는 같은
조건에서 +5(무료 인부 4.5명 상당)로, 단장의 존재감은 유지하되 폭주 기여분은
없앤다. `workerCost`·`gearCost`도 **팀별 독립 인덱스가 아니라 플레이어 전체
누적 구매 횟수(팀 합산)로 통일**한다 — `workerCost(Σ_teams workers)`·
`gearCost(Σ_teams gearLevel)`. 팀을 여러 개 굴려도 장비 1레벨의 가격은 "그
플레이어가 지금까지 산 장비 총 레벨"에 매겨지므로, 예산을 4팀에 분산해 같은
지수 배율을 4번 싸게 사는 경로(review-r1.md 검산: 수입 ×244)가 막힌다. 장비를
어느 팀에 집중하든 합산 총량이 같으면 비용이 같으므로, 집중이 항상 분산보다
산술적으로 유리해진다(지수 배율 `GEAR_MULT^n`은 `n`을 한 팀에 몰아줄 때 최대).
`MAX_GEAR_LEVEL = 16`(`app/src/game/balance.ts` 신설, v0.1 실코드 반영 완료 — 이건
팀·단장과 무관하게 재투자 피드백 자체가 무상한이었던 v0.1의 더 근본적인 결함을
닫는다)도 이 합산 인덱스에 그대로 적용된다.

**라이벌 각주**(`notes/decisions.md` G18/A14, 개정 G50/C#5): 라이벌에게도
v0.2 원정 규칙이 동일 적용되지만 라이벌은 단장 개체가 없다. 통솔력·항해술에
대응하는 발굴력·이동속도 보정은 라이벌의 기존 `baseDig` 등 단순화된
파라미터가 대신한다. 미스헵은 `CRISIS_MGMT` 스탯 자체가 삭제돼(§1) 라이벌도
플레이어와 동일한 거리 기반 기본 공식을 그대로 쓴다 — 더 이상 스탯 대체값이
필요 없다. 라이벌 스텝 전체의 정교화(단장 개체 도입 등)는 이번 실행 범위
밖이고 후속 실행이 맡는다.

`GEAR_MULT^gearLevel_team`(기존 v0.1 장비 배율, 지수형)은 그대로 유지한다 — 이건
스탯이 아니라 장비 업그레이드이고, v0.1에서 이미 검증된 폭주 방지 구조(드랍
임계와 상쇄)의 대상이다. `LEADERSHIP`은 그 **밖**이 아니라 지수 곱셈 **전** 기반항에
더해지므로, 통솔력이 아무리 높아도 장비 배율만큼 곱으로 증폭되지 않는다 —
정확히는 장비 배율만큼 같이 곱해지긴 하지만(기반항 전체에 곱하므로), 통솔력
자체가 지수항이 아니라 선형 가산항이라 통솔력을 올리는 것만으로 폭주 곡선이
생기지 않는다. 이게 economy.md §7이 요구한 "가산항으로만 결합"의 정확한 의미다.

## 2. 박물관 관장 (Museum Curator)

박물관 1관당 관장 1명이 필수다. **(개정 — `notes/decisions.md` G50/C#5)**
스탯을 4개에서 **2개**로 줄였다. 남긴 기준: `CURATION`(명성 축 핵심 — 관람객
수식에 직접 곱연산), `SECURITY_SENSE`(도난 회수, #1(G50/C#1)에서 축소된 도난
시스템의 유일한 능동 완화 수단과 직결). 뺀 것: `MARKETING_SENSE`·`MAINTENANCE`.

| 스탯 | 범위 | 들어가는 수식 | 항 |
| --- | --- | --- | --- |
| 전시노하우 `CURATION` | 1~100 | 관람객 수식(`spec.md` v0.2 §박물관)의 관장 항 | `min(MUSEUM_CURATOR_CONTRIB_CAP, 1 + MUSEUM_CURATOR_COEFF × CURATION)`, 관람객 수식에 곱연산 |
| 보안감각 `SECURITY_SENSE` | 1~100 | 도난 회수 성공률(G9) | `min(THEFT_RECOVERY_CHANCE_CAP, THEFT_RECOVERY_BASE + SECURITY_SENSE × CURATOR_RECOVERY_COEFF)` |

**제거됨**(G50/C#5): 마케팅감각 `MARKETING_SENSE` — 마케팅 업그레이드
레벨의 효과는 이제 레벨에만 의존한다(관장 보정 없음). 유지관리
`MAINTENANCE` — 박물관 유지비는 이제 `MUSEUM_UPKEEP_RATE`(고정 20%)만
적용한다(관장 보정 없음).

```
MUSEUM_CURATOR_COEFF = 0.005
MUSEUM_CURATOR_CONTRIB_CAP = 1.5            // CURATION=100 → 관람객 ×1.5 상한
THEFT_RECOVERY_BASE = 0.20
CURATOR_RECOVERY_COEFF = 0.006
THEFT_RECOVERY_CHANCE_CAP = 0.80            // SECURITY_SENSE=100 → 회수 성공률 80%
```

`CURATION`은 G5의 30% 캡(`MUSEUM_NET_INCOME_CAP`) **안에서** 관람 수입을 올릴
뿐이다 — 캡은 관장 스탯보다 우선 적용되는 하드 클램프이므로, 관장을 아무리
잘 뽑아도 박물관 순수익이 그 시점 발굴 수입의 30%를 넘지 않는다(economy.md §1.2).

## 3. 경매장 관장 (Auction Master)

경매장 1관당 관장 1명이 필수다. **(개정 — `notes/decisions.md` G50/C#5)**
스탯을 4개에서 **2개**로 줄였다. 남긴 기준: `NEGOTIATION`+`LOGISTICS`는
요청 원문이 "운영 규모에 따라 유물의 **처분 금액과 처분 가능량**이 증가"로
명시한 바로 그 두 값이다. 뺀 것: `PACE`·`CLIENTELE`.

| 스탯 | 범위 | 들어가는 수식 | 항 |
| --- | --- | --- | --- |
| 협상력 `NEGOTIATION` | 1~100 | 경매장 가격배율(economy.md `AUCTION_PRICE_MULT`) | `실제배율 = AUCTION_PRICE_MULT_MIN + (AUCTION_PRICE_MULT_MAX − AUCTION_PRICE_MULT_MIN) × min(1, 등급진행도 + NEGOTIATION × AUCTIONEER_NEGOTIATION_COEFF)`, `등급진행도 = (경매장등급−1)/(AUCTION_GRADE_MAX−1)`(신설, `notes/decisions.md` G30/C) |
| 물류처리력 `LOGISTICS` | 1~100 | 경매장 물량 상한(`AUCTION_SLOT_CAP`) | `실질슬롯 = AUCTION_SLOT_CAP_BY_GRADE[grade] + floor(LOGISTICS × AUCTIONEER_LOGISTICS_COEFF)` |

**제거됨**(G50/C#5): 진행속도 `PACE` — 낙찰 소요시간은 이제
`AUCTION_SETTLE_HOURS`(고정 6h)만 적용한다(관장 보정 없음). 고객관리
`CLIENTELE` — 수수료는 이제 `AUCTION_FEE_RATE`(고정 8%)만 적용한다.
`CLIENTELE` 삭제로 수수료가 고정되면서 **등급1 경매장이 직접매각보다
항상 손해인 구간**이 새로 생겼다(`1.0×(1−0.08)=0.92<1.0`) — `notes/economy.md`
§8·§3.2가 `AUCTION_PRICE_MULT_MIN`을 `1.0→1.15`로 올려 이 부수효과를
닫았다(등급1도 `1.15×0.92=1.058>1.0`로 항상 유리, G50/C#6).

```
AUCTIONEER_NEGOTIATION_COEFF = 0.006        // NEGOTIATION=100 → 등급진행도 +0.6 가산
AUCTIONEER_LOGISTICS_COEFF = 0.1            // LOGISTICS=100 → 슬롯 +10
AUCTION_GRADE_MAX = 4
```

**(신설 — `notes/decisions.md` G30/C, 값 개정 — G50/C#6)** 경매장 등급별
`AUCTION_PRICE_MULT` 대응표(`NEGOTIATION=0` 기준, 위 등급진행도 식을 대입한
값. `AUCTION_PRICE_MULT_MIN`이 1.0→1.15로 오르며 전 등급이 함께 올랐다):

| 등급 | 등급진행도 | `AUCTION_PRICE_MULT` | 수수료(8%) 차감 후 | 직접매각(1.0) 대비 |
| --- | --- | --- | --- | --- |
| 1 | 0.000 | 1.150 | 1.058 | 유리(+5.8%) |
| 2 | 0.333 | 1.233 | 1.135 | 유리(+13.5%) |
| 3 | 0.667 | 1.317 | 1.211 | 유리(+21.1%) |
| 4 | 1.000 | 1.400 | 1.288 | 유리(+28.8%) |

## 4. 고용 시장 갱신 규칙

```
STAFF_MARKET_REFRESH_HOURS = 24
STAFF_MARKET_CANDIDATE_COUNT = 3      // 직군당 후보 3명
```

거점의 "인력사무소"가 24시간마다 직군별 후보 3명을 새로 낸다. 후보의 스탯은
`STAFF_STAT_MIN`~`STAFF_STAT_MAX` 구간에서 결정론적 시드(그 거점 id + 갱신 회차 +
직군을 입력으로 하는 `FNV1a32` 해시, `notes/world-map.md` §8.2와 같은 방식)로
정해지고, **고용하기 전에 스탯 2개가 전부 화면에 보인다**(개정 — G50/C#5,
직군당 4→2스탯). 갱신은 무료이고 플레이어가 재화를 써서 다시 굴릴 수 없다 —
재화를 써서 갱신을 반복할 수 있게 만드는 순간 그게 가챠다(§8).

**(신설 — `notes/decisions.md` G30/C)** 해시 1개가 어떻게 스탯이 되는지가
정의돼 있지 않았다. `world-map.md` §8.2의 `PREFERENCE` 해시와 같은 패턴을
재사용한다 — 스탯마다 문자열 한 자리만 바꿔 독립적으로 해시한다:

```
CANDIDATE_STAT(site, cycle, role, statName) = STAFF_STAT_MIN
  + (STAFF_STAT_MAX − STAFF_STAT_MIN) × frac(FNV1a32(`${site}:${cycle}:${role}:${statName}`) / 2^32)
```

예: 경주의 3번째 갱신에서 나온 단장 후보의 통솔력 =
`CANDIDATE_STAT("korea", 3, "foreman", "LEADERSHIP")`. 두 스탯(단장:
`LEADERSHIP`·`NAVIGATION`, 관장: `CURATION`·`SECURITY_SENSE`, 경매관장:
`NEGOTIATION`·`LOGISTICS`)은 이 함수에 각각 다른 `statName`을 넣어 독립적으로,
결정론적으로 구한다 — 새 절차 생성 방식을 만들지 않고 기존 해시 패턴을 그대로
재사용했다.

## 5. 급여 공식 (개정 — `notes/decisions.md` G29/B7)

`notes/economy.md` §0의 원칙("v0.2가 추가하는 모든 신규 싱크는 소득 또는 자산에
대한 비율로만 정의한다")은 급여에도 그대로 적용된다. **급여는 그 스텝이 관여하는
소득의 비율**로 정의하는 원칙 자체는 유지하되, **"잠재"(그 팀이 캐낸 값, 아직
안 판 것도 포함) 기준을 "실현"(실제로 판 순간) 기준으로 바꾼다** — review-r1.md
B7이 지적한 대로, 잠재 기준은 σ<1(들고만 있는) 플레이에서 실현 현금 없이도
계속 청구되는 구조라 체납이라는 상태 자체가 애매했다(정상 방치 범위에선
발생하지 않고, 어쩌다 발생하면 스탯 페널티 나선이 되는 양자택일).

```
STAFF_SALARY_STAT_COEFF = 0.6
FOREMAN_SALARY_INCOME_SHARE = 0.03      // 판매액의 3% — 그 유물을 캐낸 발굴단의 단장에게
CURATOR_SALARY_INCOME_SHARE = 0.15      // 그 박물관 시간당 관람수입 정산액(캡 적용 전)의 15%
AUCTIONEER_SALARY_FEE_SHARE = 0.05      // 그 경매장 낙찰액의 5%

스탯배율 = 1 + STAFF_SALARY_STAT_COEFF × (Σstat_i / 2) / STAFF_STAT_MAX   // 1.0 ~ 1.6. 분모는 그 직군의 스탯 수(개정 — G50/C#5, 4→2)

급여(단장) = FOREMAN_SALARY_INCOME_SHARE × 스탯배율 × 그 판매 건의 실현 금액
  — 판매(직접매각·경매장 낙찰·미감정매각 전부) 시점에 그 판매액에서 즉시 원천징수한다.
급여(관장, 시간당) = CURATOR_SALARY_INCOME_SHARE × 관람수입(시간당 정산, 캡 적용 전) × 스탯배율
  — 시간당 관람수입이 실제로 정산되는 시점에 원천징수한다(관람수입 자체가 이미 "실현"이다).
급여(경매관장) = AUCTIONEER_SALARY_FEE_SHARE × 스탯배율 × 그 경매 낙찰액
  — 낙찰 확정(대금 실현) 시점에 원천징수한다.
```

**돈이 실제로 들어오는 바로 그 순간에만 급여가 나가므로, 어떤 상태에서도 급여가
잔고를 갉아먹을 수 없다** — 체납이라는 상태 자체가 구조적으로 존재할 수 없다.
`notes/decisions.md` G10("파산 불가")을 유예 밴드가 아니라 **원천징수 구조 자체로**
만족시킨다. 이에 따라 §6·§9의 체납·강제은퇴 계열 상수를 삭제한다(아래).

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

## 6. 승급 (개정 — `notes/decisions.md` G29/B7, 이직·은퇴 삭제)

```
STAFF_PROMOTION_INTERVAL_HOURS = 168     // 1주
STAFF_PROMOTION_STAT_GAIN = 2
```

- **승급**: `STAFF_PROMOTION_INTERVAL_HOURS`마다, 근속 중인 스텝의 **가장 낮은
  스탯 하나**에 `STAFF_PROMOTION_STAT_GAIN`을 더한다(무작위 스탯이 아니라 최저
  스탯을 결정론적으로 보완 — 이 역시 §8의 가챠 방지 장치다). `STAFF_STAT_MAX`에서
  멈춘다.

**이직·은퇴는 삭제한다.** §5의 급여 원천징수 전환으로 체납이라는 상태 자체가
구조적으로 발생할 수 없어졌으므로(잔고가 0이어도 급여가 밀릴 일이 없다 — 팔 때만
떼어 간다), 체납에서 파생되던 `STAFF_QUIT_CHANCE_PER_HOUR_IN_ARREARS`(이직)도
트리거 조건 자체가 사라졌다. 30일 강제은퇴(`STAFF_RETIREMENT_TENURE_HOURS`)도
review-r1.md B7이 지적한 대로 "재고용 노동"에 가까워 함께 없앤다 — 스텝은
**"고용하면 끝, 승급만 쌓인다"**로 단순화한다. 고용 결정 1회에 Optimization
재미를 몰아주는 쪽이 G3의 관여 예산(하루 2~3회×180초)에도 더 맞는다.
`SALARY_ARREARS_GRACE_HOURS`·`STAFF_ARREARS_STAT_PENALTY_MULT`·
`STAFF_QUIT_CHANCE_PER_HOUR_IN_ARREARS`·`STAFF_RETIREMENT_TENURE_HOURS`·
`STAFF_RETIREMENT_WARNING_HOURS`·`STAFF_RETIREMENT_SEVERANCE_MULT`는
`balance.ts` 상수 총람(§10)에서도 뺀다. `notes/decisions.md` G10("파산 불가")은
뒤집지 않는다 — 목표는 그대로고, 달성 방식이 유예 밴드에서 원천징수 구조로
바뀌었을 뿐이다.

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

1. **고용 전 전수 공개**: 후보 스탯(직군당 2개, G50/C#5)이 고용하기 전에 전부
   보인다. "뽑고 나서 확인"하는 구조가 아니다.
2. **갱신은 무료, 재화로 다시 굴릴 수 없다**: 24시간마다 자동으로 후보가 바뀌지만,
   플레이어가 재화를 써서 즉시 재추첨하는 기능은 없다. 가챠의 핵심 구조(재화를
   반복 투입해 무작위 보상을 다시 뽑는 것)가 성립할 지점이 없다.
3. **급여가 스탯의 결정론적 함수**: 더 좋은 인력은 확률이 아니라 더 높은,
   눈에 보이는 급여로 산다. "같은 값을 내고 운이 좋으면 더 좋은 게 나온다"는
   구조가 아니다.
4. **승급이 최저 스탯을 결정론적으로 보완**: 성장도 무작위 스탯 재굴림이 아니라
   약점 보완이다.

## 9. (삭제됨 — 급여 체납 규칙, `notes/decisions.md` G29/B7)

§5의 급여 원천징수 전환으로 체납이라는 상태 자체가 구조적으로 발생할 수 없다.
기존 §9는 review-r1.md B7이 지적한 대로 "정상 방치 범위에서는 절대 안 걸리는
UI이거나, 걸리면 스탯 페널티 나선"이라는 양자택일이었다 — 트리거 조건(자금이
0 이하인데 그 순간 급여를 별도로 청구해야 함) 자체가 새 급여 모델에서 사라졌다.
이 절 번호는 재사용하지 않는다.

## 10. `balance.ts` 상수 총람

```ts
export const STAFF_STAT_MIN = 1;
export const STAFF_STAT_MAX = 100;

// 발굴단 단장(§1) — FOREMAN_DIG_COEFF는 0.8→0.05로 하향, FOREMAN_HIRE_COST 신설(G21/A6).
// CRISIS_MGMT·APPRAISAL_EYE 스탯과 그 계수(FOREMAN_MISHAP_REDUCTION_COEFF·
// FOREMAN_APPRAISAL_COEFF)는 G50/C#5로 삭제됐다 — 더 이상 balance.ts에 없다.
export const FOREMAN_DIG_COEFF = 0.05;
export const FOREMAN_NAV_SPEED_COEFF = 0.003;
export const FOREMAN_HIRE_COST = 200_000;
export const MAX_GEAR_LEVEL = 16; // app/src/game/balance.ts에 이미 실코드로 존재(v0.1). 팀 합산 인덱스에도 동일 적용

// 박물관 관장(§2) — MARKETING_SENSE·MAINTENANCE 스탯과 그 계수(CURATOR_MKT_COEFF·
// CURATOR_UPKEEP_COEFF·CURATOR_UPKEEP_CAP)는 G50/C#5로 삭제됐다
export const MUSEUM_CURATOR_COEFF = 0.005;
export const MUSEUM_CURATOR_CONTRIB_CAP = 1.5;
export const THEFT_RECOVERY_BASE = 0.20;
export const CURATOR_RECOVERY_COEFF = 0.006;
export const THEFT_RECOVERY_CHANCE_CAP = 0.80;

// 경매장 관장(§3) — PACE·CLIENTELE 스탯과 그 계수(AUCTIONEER_PACE_COEFF/CAP·
// AUCTIONEER_FEE_DISCOUNT_COEFF/CAP)는 G50/C#5로 삭제됐다. AUCTION_PRICE_MULT_MIN은
// 1.15로 인상됐다(economy.md §8, G50/C#6)
export const AUCTIONEER_NEGOTIATION_COEFF = 0.006;
export const AUCTIONEER_LOGISTICS_COEFF = 0.1;
export const AUCTION_GRADE_MAX = 4; // "등급진행도" 분모(G30/C)

// 고용 시장(§4)
export const STAFF_MARKET_REFRESH_HOURS = 24;
export const STAFF_MARKET_CANDIDATE_COUNT = 3;

// 급여(§5) — 스탯배율 분모는 이제 2(직군당 스탯 수, G50/C#5)
export const STAFF_SALARY_STAT_COEFF = 0.6;
export const FOREMAN_SALARY_INCOME_SHARE = 0.03;
export const CURATOR_SALARY_INCOME_SHARE = 0.15;
export const AUCTIONEER_SALARY_FEE_SHARE = 0.05;

// 승급(§6) — 이직·은퇴 계열(STAFF_QUIT_CHANCE_PER_HOUR_IN_ARREARS·STAFF_RETIREMENT_*)은
// G29/B7로 삭제. §9(체납, SALARY_ARREARS_GRACE_HOURS·STAFF_ARREARS_STAT_PENALTY_MULT)도 삭제.
export const STAFF_PROMOTION_INTERVAL_HOURS = 168;
export const STAFF_PROMOTION_STAT_GAIN = 2;
```
