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

경제 모델은 **σ = 1(획득한 모든 유물을 즉시 매각한다) + 전액 재투자**를 최악
시나리오로 잡는다(`notes/decisions.md` G21 — 리뷰 1회차에서 "σ=1 자체가 최악"이던
정의를 "σ=1 + 재투자까지 가야 진짜 최악"으로 정정했다). σ<1(들고 있는 플레이어)은
이보다 화폐 창출이 느리므로, σ=1+전액재투자를 통과하면 모든 실제 플레이 스타일을
통과한다. 아래 모든 "시간당 규모" 추정은 이 최악 시나리오 기준이다.

**(개정 — G21/A7)** 단일 참조점 `ECONOMY_REF_DIG_POWER = 1000`은 폐기한다. 실제로
`app/src/game/engine.ts`를 σ=1 정책으로 돌리면(수정 전 상수 그대로) `D(t)`가
1시간 79,191/s → 6시간 1,807,344/s → 24시간 5,137,451/s → 168시간 14,459,140/s로
폭주한다(실측, `notes/decisions.md` G21 재현). 원인은 장비(`GEAR_MULT^gear`) 재투자
피드백이 무상한이었다는 것이고, `MAX_GEAR_LEVEL = 16`(`balance.ts` 신설 상수, 실코드
반영 완료)으로 닫았다. 아래가 그 수정 전/후 `D(t)` 곡선표다 — 이 문서의 모든
"시간당 규모" 계산은 **σ<1(정체) 기준값 D≈5,209/s**를 표준 참조로 쓰고, 위험
시나리오 검산에는 **σ=1+`MAX_GEAR_LEVEL` 상한 후 D≈300,000/s(장기 상한 근접치)**를
쓴다.

| t | σ=1(상한 전, 참고용 — 위험이 실재했다는 증거) | σ=1(`MAX_GEAR_LEVEL=16` 적용 후) | σ<1(기본 정책, 실측) |
| --- | --- | --- | --- |
| 1h | 79,191/s | 79,191/s | ≈4,453/s |
| 6h | 1,807,344/s | 263,604/s | ≈5,209/s(정체 시작) |
| 24h | 5,137,451/s | 287,954/s | ≈5,209/s |
| 72h | 8,710,146/s | 304,187/s | ≈5,209/s |
| 168h | 14,459,140/s | 318,391/s | ≈5,209/s |

실제 v0.2 발굴력 곡선(팀·단장 항 포함)은 `notes/world-map.md`·`notes/staff.md`가
정한다 — `FOREMAN_DIG_COEFF=0.05`(기존 0.8에서 하향, G21)로 이 표의 규모를 크게
벗어나지 않는다.

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
12층. 단, `HOME_BASE_BONUS` 적용 중인 첫 12시간·그 거점 한정으로는 최대 3.41까지
일시적으로 올라간다 — §1.4·§1.5 참조)이므로, 정체 기준 참조점(`D≈5,209`,
σ<1 실측 플래토, 위 §0 표)에서 **잠재 화폐 창출률은 시간당 약 163.15억~543.82억 ₩**
사이다. **(정정 — `notes/decisions.md` G46/A9)** 이전 값("1.63억~5.44억")은
`5,209 × 1,000 × [0.87, 2.9] × 3,600`을 계산하면서 자릿수를 하나 잘못 놓은
**100배 오류**였다 — `world-map.md` §0이 인용한 "31.3억~104.4억"(아래 §2의
K2·K3 값과 같은 D=1,000 기준)과도 분모가 달라 세 문서가 서로 다른 숫자를
나란히 쓰고 있었다. 이하 이 문서의 시간당 규모는 전부 **D≈5,209 기준**으로
통일한다.

**(개정 — G26/B3)** 위 식은 **채널 배율 적용 전** 값이라는 것과 별개로, 직접매각·
경매장 채널에는 `world-map.md` §8.4의 `LOCAL_PRICE_MULT`가 추가로 곱해진다는
사실이 이 공식에 빠져 있었다. `REGIONAL_PRICE_MULT_MIN/MAX`를 `0.60/1.40`으로
재조정해(G26) **`E[LOCAL_PRICE_MULT] = (MIN+MAX)/2 = 1.00`**이 되도록 만들었으므로,
이제 이 항을 명시적으로 곱해도 위 규모 표는 그대로 유지된다:

```
잠재화폐창출률(₩/s, 직접매각·경매장 채널) = D × PROGRESS_VALUE × bonus(L) / dropMod(site) × E[LOCAL_PRICE_MULT]
E[LOCAL_PRICE_MULT] = 1.00   // REGIONAL_PRICE_MULT_MIN/MAX = 0.60/1.40 재조정 후(G26). 기존 0.90/1.26일 땐 1.08~1.151이라 이 항이 없으면 실제 수입이 문서 가정보다 상시 +8~15% 높았다.
```

이 값이 σ=1 기준 아래 모든 소스·싱크 비율의 분모다.

**채널별 실현 배율**(잠재값에 곱해지는 최종 배율, §3에서 다시 다룸): 미감정 즉시매각
×0.7(`BLIND_SELL_RATE`, 기존), 감정 후 직접매각 ×1.0(기준), 경매장 ×1.0~1.4
(`AUCTION_PRICE_MULT_MIN`~`MAX`). 거래소(유저 간 P2P)는 v0.2에서 제거됐다
(`notes/decisions.md` G15/A4) — 이하 이 문서에서 거래소 관련 항목은 삭제되거나
"v0.4로 이연"으로 표기한다.

### 1.2 박물관 관람 순수입 (신규)

G5의 캡을 그대로 쓴다. `순수익 ≤ MUSEUM_NET_INCOME_CAP × 동시점 발굴 잠재화폐창출률`,
`MUSEUM_NET_INCOME_CAP = 0.30`. 참조점 기준 시간당 **최대 48.95억~163.15억 ₩**
(위 범위의 30% — 정정, `notes/decisions.md` G46/A9). 관람객 수식·전시 슬롯
상한의 세부는 시설 관련 후속 문서의 몫이다 — 이 문서는 상한만 강제한다.

**(개정 — G24/B1)** 캡의 "동시점 발굴 잠재화폐창출률"은 **박물관이 서 있는 거점
하나의 `D`가 아니라 플레이어의 모든 발굴단 `D` 합**이다 — 저활동 거점에 박물관을
짓고 고활동 거점에서 파는 식으로 캡을 부풀리는 경로(review-r1.md 실측: 최대
3.33배)를 막는다. `MUSEUM_TICKET_PRICE`를 8,000 → 20,000으로 올렸다(§10.3
회수기간 재계산은 spec.md에 반영). 이 인상 후에도 캡은 일상적으로 걸리지 않는다
(§1.2 예시 순수익이 캡의 1% 미만) — 이건 **의도**다: G5가 박물관을 "자금이 아니라
명성의 주축"으로 못박았으므로, 캡은 미래의 마케팅·관장 스탯 인플레에 대비한
안전 상한이지 현재 조정 목표가 아니다.

### 1.3 (삭제됨 — NPC 시장조성자의 거래소 매수, `notes/decisions.md` G15/A4)

거래소를 v0.2에서 제거하면서 이 항목도 함께 사라진다. G1이 전제했던 "라이벌이
거래소의 유동성 공급자" 역할은 v0.4에서 거래소를 다시 설계할 때 함께 재정의한다.
`notes/mda.md` §10.4의 리스크 7.6("NPC 시장조성자 유동성 고갈")도 같은 이유로
v0.2에서는 발생할 수 없는 리스크가 된다. 이 절 번호는 §1.4·§1.5에 대한 기존
참조를 보존하기 위해 재사용하지 않는다.

### 1.4 시즌 시작 보너스 (부트스트랩, 정상상태 계산에서 제외)

시작 자금(v0.1 기준 3만 ₩)은 시즌 시작마다 1회 지급되는 상수다. 시즌 전체 화폐량에
비해 무시할 수 있는 크기이고 반복되는 소스가 아니므로, 아래 정상상태·인플레이션
계산에는 포함하지 않는다.

### 1.5 소스 총괄표

| 소스 | 형태 | 시간당 규모(D≈5,209 기준, σ<1 정체) | 척추 2번 관련 |
| --- | --- | --- | --- |
| 유물 처분(전 채널 통합) | 발굴력에 비례하는 연속 흐름 | 163.15억~543.82억 ₩ (채널 배율 `E[LOCAL_PRICE_MULT]=1.0` 포함, 정정 — G46/A9) | 기준 소스, 위반 없음 |
| 박물관 관람 순수입 | 관람객 기반, 캡 있음(플레이어 전체 `D` 합 기준, G24) | 최대 48.95억~163.15억 ₩ (위의 30%) | G5로 캡, §7에서 판정 |
| 시즌 시작 보너스 | 1회성 | 3만 ₩ (시즌당 1회) | 무관 |
| **시즌 시작 이월 크레딧(신설, G14·G46/A10)** | **시즌 경계 1회성** | **`min(직전 시즌 종료 시점 funds × 0.10, 1,500만)` ₩** | **부트스트랩, §1.4와 같은 이유로 정상상태 계산 제외** |
| **`HOME_BASE_BONUS`(첫 12h, 그 거점 한정)** | **`dropMod×0.85`, 그 거점 `bonus/dropMod`를 일시적으로 [0.87,2.9]→[1.02,3.41]로 확장(×1.176)** | **12시간·거점 1곳 한정 — §1.4와 같은 이유로 정상상태 계산 제외. 폼페이 12층 기준 최대 3.41까지 초과 가능함을 명시(전에는 "바뀌지 않는다"고 잘못 단언했었다)** | **부트스트랩, 정상상태 무관** |

("NPC 거래소 매수" 행은 거래소 제거로 삭제됐다 — `notes/decisions.md` G15/A4.
"보험금" 행은 보험 시스템 자체가 삭제되며 함께 삭제됐다 — `notes/decisions.md`
G50/C#1, 투명한 규칙 공개 하에서 기대값이 항상 음수라 아무도 들지 않는 죽은
채널이었다.)

## 2. 화폐 싱크 전량

모두 §0의 원칙대로 비율형이다. 절대값이 아니라 **무엇의 몇 %인지**로 정의한다.
시간당 규모는 **D≈5,209 기준**으로 §1.1~§1.5와 분모를 통일한다(정정 —
`notes/decisions.md` G46/A9. 기존 "D=1,000 기준" 헤더가 §1.1의 "D≈5,209 기준"
서술과 분모가 달라, 같은 문서 안에서 두 기준이 나란히 쓰이고 있었다).

| # | 싱크 | 정의 | 비율 상수 | 시간당 규모(D≈5,209 기준) |
| --- | --- | --- | --- | --- |
| K1 | 업그레이드(인부·장비·감정소·보관소·박물관·경매장·거점 등급) | 시즌 누적 소득 대비 목표 흡수율 | `UPGRADE_SINK_SHARE_TARGET = 0.55` | 시즌 누적치로만 의미 있음(§4) |
| K2 | 감정비(기존) | 추정가의 비율 | `APPRAISE_FEE = 0.02` | 3.263억~10.876억 ₩ (§1.1의 2%) |
| K3 | 스텝 총 급여 | 실현 소득 대비 목표 비율 | `STAFF_TOTAL_SALARY_SHARE_TARGET = 0.08` | 13.052억~43.506억 ₩ |
| K4 | 박물관 유지비 | 관람 총수입 대비 비율 | `MUSEUM_UPKEEP_RATE = 0.20` | §1.2의 20% |
| K5 | 발굴 원정비 | 원정 기대소득 대비 비율, **귀환 시 후불 원천징수(G27/B5 — 기존 "선지급"은 자금 0일 때 파견 불가→수입 0→영구 정체 데드락을 만들었다)** | `EXPEDITION_COST_INCOME_RATIO = 0.15` | 원정당 실현소득의 15% 후차감 |
| K6 | 거점 이전비 | 이전 시점 총자산 대비 비율, 1회성 | `RELOCATION_COST_ASSET_RATIO = 0.10` | 이전당 자산의 10% |
| K7 | 경매장 수수료 | 체결가 대비 비율 | `AUCTION_FEE_RATE = 0.08`(고정 — G50/C#5, 수수료 할인 스탯 삭제) | 체결마다 8% |
| K9 | 암시장 매입비 | 미감정 추정가 대비 비율, 즉시 지불 | `BLACK_MARKET_BUY_PRICE_RATIO = 0.75`(개정 — G42/A5, 기존 0.4) | 매입마다 추정가의 75%. **재매각(`BLIND_SELL_RATE`=0.7 경로) 시 순손실 -6.7%** — 기존 0.4는 0.7보다 낮아 즉시 되팔기로 무위험 +75% 차익이 났다(소스표 누락이었다). 0.75로 올려 무위험 차익 경로를 닫았다 |
| K11 | 거점 `unlockCost`(base 승격, 1회성) | 12거점 합계(경주 무료 제외) | 고정값 | 1,985,000,000 ₩ (G30/C — 소진형, 시즌 내 최대 1회씩) |
| K12 | 발굴단 해금비(1회성, 2~4번째 팀) | `EXPEDITION_TEAM_UNLOCK_BASE=5,000만 × 4.0^(n-2)` | 고정값 | 1,050,000,000 ₩ (5천만+2억+8억, G30/C) |
| K13 | 시즌 정산 소각(신설, G14·G46/A10) | 시즌 종료 시 funds 잔여분 소각 | `SEASON_CASHOUT_RATIO = 0.10`(이 비율만 K13 위의 이월 크레딧으로 넘어가고, 나머지 90%가 소각된다) | funds × 0.90, 시즌 종료 시 1회 |

(K8, 거래소 수수료는 거래소 제거로 삭제됐다 — `notes/decisions.md` G15/A4. 번호는
재사용하지 않는다. K10, 도난 보험료는 보험 시스템 삭제로 함께 삭제됐다 —
`notes/decisions.md` G50/C#1. 퇴직금은 G29/B7에서 급여를 매각 시점 원천징수로 바꾸며 체납·
강제은퇴 계열과 함께 제거됐다 — 더 이상 싱크 항목이 아니다.)

K3·K4는 §1.2 박물관 캡(0.30) 안에서 이미 차감되는 항목이다 — 관람 순수익 계산식
(`순수익 = 관람수입 − 유지비 − 관장급여`)에 들어가므로, 이 표의 K4는 §1.2의 30%를
넘지 않는 관람수입에 대한 20%일 뿐이지 §1.1 발굴 소득에서 추가로 빠지는 돈이
아니다.

**(삭제 — `notes/decisions.md` G50/C#1)** 도난 보험(프리미엄 K10, 보험금
소스)은 통째로 제거됐다. 원래 이 절이 유도했던 `THEFT_RATE ≤
THEFT_INSURANCE_PREMIUM_RATE / THEFT_INSURANCE_PAYOUT_RATE ≈ 0.00167`이라는
상한과, 그걸 회피하려 도입했던 "보험금-회수권 상호배타" 상태 기계(구 G28)도
전제가 사라져 함께 폐기됐다. 투명한 규칙 공개 하에서 보험 기대값
(`0.0014×0.6=0.00084`)이 프리미엄(0.001)보다 항상 낮아 아무도 들지 않는
"산수로 죽은" 하위 시스템이었다 — 거래소(G15)와 같은 판정 기준을 적용했다.

`THEFT_RATE_BASE = 0.0014`(시간당, 전시 중·T0~T3에만)는 **독립된 설계값**으로
유지한다 — 하루 약 3.4% 확률로, 보험 유무와 무관하게 도난이라는 리스크 자체는
G9(전시라는 능동적 선택에 딸린 대가)가 요구하는 게임성이다. 보안(`S`)은 이
값 자체를 바꾸지 않고 `THEFT_INITIAL_GRACE_HOURS`(반출 직후 유예)로 **노출
시간**을 줄여 실효 발생률을 낮춘다(`spec.md` §9.4). 도난 대응은 이제
**72시간 회수 창 + 관장 `SECURITY_SENSE` 기반 회수 성공률**(`notes/staff.md`
§2) + 암시장 장물 재발견, 세 가지만 남는다.

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
| 경매장 | 평가액 × `AUCTION_PRICE_MULT`, 범위 `[AUCTION_PRICE_MULT_MIN=1.15, AUCTION_PRICE_MULT_MAX=1.4]`(경매장 등급에 비례, 개정 — G50/C#6 — 기존 1.0은 CLIENTELE 스탯 삭제로 수수료가 8% 고정이 되면서 등급1이 직접매각보다 항상 손해인 구간을 새로 만들어, 최저치를 올려 등급1도 항상 유리하게 했다) | `AUCTION_FEE_RATE = 0.08`(고정) |
| 암시장(매입) | 미감정 추정가 × `BLACK_MARKET_BUY_PRICE_RATIO = 0.75`(개정 — G42/A5, 기존 0.4는 `BLIND_SELL_RATE`보다 낮아 무위험 되팔기 차익이 났다) | 없음(할인 자체가 대가) |

(거래소(유저 간) 행과 `TRADE_PRICE_BAND`·`TRADE_FEE_RATE`·`TRADE_REFERENCE_WINDOW_HOURS`
상수는 거래소 제거로 삭제됐다 — `notes/decisions.md` G15/A4, 재검증한 실현 배율이
거래소를 직접매각보다 항상 손해인 채널로 판정했다. v0.4에서 거래소를 다시 설계할
때 시장가 밴드 논의를 재개한다.)

T4가 시장에서 어떻게 다뤄지는지의 판단은 그대로 유지한다: T4는 경매장도 취급하지
않고(`spec.md` §11.3) 직접 매각 채널로만 움직인다 — 세계에 하나뿐인 물건을 얇은
시장에 올리면 가격 왜곡과 착취 위험이 가장 크게 몰린다. 유저 간 이전 경로는
거래소가 아니라 오퍼/역오퍼(`notes/mda.md` §1.3, v0.3)로만 열린다. 원거리 교역의
정보 비대칭(B4)은 `notes/world-map.md` §8.5를 따른다 — `REGIONAL_PRICE_MULT_MIN/MAX`
(0.90/1.26)는 이 실행에서 재계산하지 않는다.

## 4. 인플레이션 방어 구조

세 겹으로 막는다.

1. **비율형 싱크** (§0, §2) — 모든 신규 지출이 소득 또는 자산의 비율이므로, 발굴력
   `D`가 커지면 싱크도 같은 비율로 커진다. 소스와 싱크가 같은 변수(`D`, 자산)에
   종속되어 있어 한쪽만 폭주할 수 없다.
2. **박물관 캡** (`MUSEUM_NET_INCOME_CAP = 0.30`) — 유일하게 발굴력과 무관하게
   커질 수 있는 소스(소장량 기반이 아니라 슬롯 기반이라 이미 상한이 있지만, 인구·
   마케팅 레벨이 자라며 서서히 커질 수 있다)에 발굴 소득 대비 상한을 걸어 독립
   폭주를 막는다.
3. **유한 재고의 구조적 자기제동** — T1~T2는 리젠이 있어도 원래 총량
   (`TIER_STOCK_PER_SPECIES`, 개명 G23/A9)을 캡으로 두고, T3는 종당 고정 공급
   (`TIER_STOCK_PER_SPECIES[3] = 6`, 기존 `TIER3_SEASON_SUPPLY`는 이 값의 별칭이었다),
   T4는 리젠이 없다(G6). 고티어 재고가 시즌 중 소진되면 그 층의
   `layerExpectedValue(L)`가 자연히 낮아져(남은 재고가 T0·T1 쪽으로 쏠리므로)
   **화폐 창출률이 스스로 억제된다.** 시즌 후반부로 갈수록 대형 화폐 창출
   사건(국보·유일 매각)이 저절로 희귀해지는 구조다 — 단, 기존 심층 티어 가중으로는
   이 소진이 시즌 초반 1.5일 안에 끝나 버려 자기제동이 사실상 죽어 있었다.
   §6.1의 가중치 재설계(G23/A9)로 소진 시점을 1~2주로 늦춰 이 자기제동이
   시즌 내내 실제로 작동하게 했다.

## 5. 정상상태 목표 — 24시간 통화 성장 초과율 (재정의 — `notes/decisions.md` G43/A6)

**측정 대상 `M(t)`을 순 잔고에서 누적 실현소득으로 바꾼다.** 기존 정의(시각 `t`의
`player.funds + Σ rival.funds`, 순 잔고)는 `M(t)=(1−s)·R·t`(누적 창출액을
전제하는 모델식)와 애초에 안 맞았다 — 순 잔고는 지수 비용의 큰 구매(장비·거점
해금)마다 뭉텅이로 깎이는 값이라, 실측(`qa_growth.ts --hours 400`)에서 스무딩
후에도 168h −16.1%, 192h −13.9%, 240h −13.5%로 하한(−10%)을 반복 위반했다
(σ=1은 168h +14.8%로 상한에 0.2pp 차). `MATURE_PHASE_START_HOUR=48`도 168시간
이동평균이 168개의 표본이 쌓여야 값이 나와 사실상 무의미했다.

```
M(t) = 시각 t까지 플레이어+라이벌 전원이 벌어들인 화폐 총합(판매·전시수입 등
       §1.5의 모든 소스, 지출로 깎이지 않는 단조증가값) — 순 잔고가 아니다.
```

**목표**: "그 시각 자연히 발생하는 `24/t`를 얼마나 초과하는가"만 규제한다(정의는
유지, 측정 대상만 바뀐다).

```
CURRENCY_GROWTH_24H_EXCESS_CAP = 0.15     // 초과 상한
CURRENCY_GROWTH_24H_EXCESS_FLOOR = -0.10  // 초과 하한
(M(t+24) − M(t)) / M(t) − 24/t ∈ [CURRENCY_GROWTH_24H_EXCESS_FLOOR, CURRENCY_GROWTH_24H_EXCESS_CAP]
MATURE_PHASE_START_HOUR = 48   // 변경 없음 — 새 정의에서는 이 시점부터 이미 안정적이다
```

**검증**(계측을 추가한 `qa_growth.ts` 변형, 원본 엔진은 그대로, 400시간):
raw(스무딩 없는) 24시간 초과율이 σ<1·σ=1 두 정책 모두, `t=48h`부터 `t=336h`까지
**전 구간 0.0~0.9%**로 사실상 정확히 0에 붙는다 — `M(t)=(1−s)Rt`가 원래
전제한 "일정한 창출률의 누적"이라는 가정이 이 정의에서 실제로 성립하기
때문이다. **7일 이동평균 스무딩 요구를 폐기하고 raw 24시간 차분을 그대로
쓴다** — 스무딩은 순 잔고의 지출-lumpiness를 상쇄하려던 장치(G22)인데, 누적
정의에서는 지출이 값을 깎지 않아 상쇄할 대상이 없다. 스무딩을 유지하면
오히려 초반 고성장 구간이 뒤늦게 반영돼 168h 지점에 인위적 초과(+14.7~15.5%,
상한 근접·σ=1은 0.5pp 초과)가 생긴다 — 워밍업 잔재일 뿐 t가 커지면 빠르게
가라앉는다(192h +10.0~10.8%, 240h +5.5~6.2%, 336h +2.4~2.9%).

성숙기 이전(부트스트랩 구간, t<48h)은 이 캡에서 제외한다 — 초기 성장은
온보딩의 일부이고 G11의 마일스톤 곡선이 이미 그 속도를 정의한다.

**측정 방법**: `pnpm --filter relic-king sim --hours 336`(14일)을 매각 성향
3가지 프로필로 반복 실행한다 — 공격적 매각(σ≈1에 가까움), 중립, 홀딩성향(σ가
낮음, 소장고에 오래 보유). 각 프로필에서 시간마다 **누적 실현소득**(순 잔고가
아니다)을 로그하고, `t ≥ 48`인 모든 구간에서 raw 24시간 초과율로 위 부등식을
검사한다(스무딩 불필요). 세 프로필 전부가 통과해야 한다 — 하나라도 넘으면 그
프로필이 지목하는 싱크(공격적 매각이면 K1·K2, 홀딩성향의 하한 위반이면 박물관
쪽 소스)를 다시 조정한다. 이 sim의 `--sell-profile` 옵션과 누적 실현소득 로그
출력은 아직 구현되어 있지 않다 — 구현은 이 기획 문서의 범위 밖이지만, 후속
구현 작업이 반드시 추가해야 할 계측 지점으로 여기 명시한다.

## 6. 유물 공급량 대비 화폐 공급량의 정상상태

### 6.1 유한재고 유물의 세계 총가치(상한)

T0(무한 재고)는 재고가 아니라 흐름(§1.1)으로 이미 다뤘으므로 여기서는 제외한다.
T1~T4(유한 재고)만 계산한다. G7이 정한 거점당 분포(`SPECIES_PER_SITE_BY_TIER =
[25, 8, 4, 2, 1]`, T0~T4 순, 12거점)를 그대로 쓴다.

**(개명 — G23/A9)** `TIER_STOCK`은 `app/src/game/balance.ts`에서
**`TIER_STOCK_PER_SPECIES`로 개명했다**(값은 동일, 실코드 반영 완료) — "종당"임을
이름에 못박아, 이 표의 "24종×종당6점=144점" 해석과 `TIER3_SEASON_SUPPLY=6`("시즌
전체 6점"으로 오독될 수 있던 이름)의 충돌을 없앤다. `TIER3_SEASON_SUPPLY`는 독립
상수가 아니라 **`TIER_STOCK_PER_SPECIES[3]`의 별칭**이다 — 앞으로 이 문서에서
`TIER3_SEASON_SUPPLY`라는 이름을 더 쓰지 않는다.

| 티어 | 종수(12거점 합) | 종당 재고(`TIER_STOCK_PER_SPECIES`) | 기준가(`TIER_VALUE`) | 총가치(`× ECONOMY_AVG_VALUE_FACTOR = 1.2`) |
| --- | --- | --- | --- | --- |
| T4 | 12 | 1 | 6,000,000,000 | 864억 |
| T3 | 24 | 6 | 260,000,000 | 449.28억 |
| T2 | 48 | 60 | 9,000,000 | 311.04억 |
| T1 | 96 | 2,000 | 380,000 | 875.52억 |
| **합** | | | | **2,499.84억 ≈ `ARTIFACT_WORLD_VALUE_CEILING` = 2,500억** |

이 값은 "이 시즌에 존재하는 유한재고 유물을 전부, 한 번씩 최고가로 판다면 나오는
화폐"의 이론적 상한이다. T0의 지속적인 흐름은 이 상한 밖에 있고 §5의 24시간
초과율 캡으로 별도 통제된다.

**소진 시점(개정 — G23/A9)**: 기존 심층 티어 가중(L10-12: T3 3.9%·T4 0.1%)으로는
D=1,000 기준 로컬(그 거점) T3 재고(12점=2종×6)가 **0.66시간**, T4(1점)가
**2.1시간**에 소진됐다 — 시즌 2,016시간의 0.03~0.1%. `layerBaseWeights`를
아래로 재설계한다(**설계값 — G7의 480종 데이터 파이프라인과 함께 `balance.ts`에
반영한다. 현재 3거점·60종 상태의 실코드에는 적용하지 않는다** — 적용하면 v0.1의
이미 검증된 "첫 국보 17분" 마일스톤이 근거 없이 깨진다):

```
L8~9:   [52, 36, 11, 0.00004, 0]       // 기존 [52, 36, 11, 1, 0]
L10~12: [38, 40, 18, 0.00015, 0.000025] // 기존 [38, 40, 18, 3.9, 0.1]
```

실제 `layerExpectedValue`·`dropThreshold` 함수로 자기일관적으로 재계산한 결과
(T3·T4 비중을 낮추면 층 기대평가액이 낮아져 `dropThreshold`가 작아지고 전체
드랍 빈도 자체가 올라가는 상쇄 효과가 있어, 리뷰가 제안한 대로 가중치 비율만
낮추면 목표에 못 미친다 — 이 상쇄까지 반영해 다시 풀었다):

| D | T3(로컬 12점) 소진 | T4(로컬 1점) 기대 대기 |
| --- | --- | --- |
| 5,209/s(σ<1 정체 기준) | 0.66h → **327h(13.6일)** | 2.1h → **163.5h(6.8일)** |
| 300,000/s(σ=1+`MAX_GEAR_LEVEL` 상한, 위험 시나리오) | 5.7h | 2.8h |

정체 기준 플레이(D≈5,209)에서 한 거점의 국보·유일이 1~2주에 걸쳐 나오도록
늘어난다 — 12주 시즌 동안 희소성이 유지된다. 최적화한 봇(D=300,000)도 한 거점을
5~6시간에 털 수 있지만, v0.2의 이동시간(6분~44시간 편도)이 "12거점을 순식간에
전부 훑는" 것을 막는다.

### 6.2 정상상태 정의 (개정 — G23/A9, 흐름 대 흐름 비율로 교체)

기존 `ARTIFACT_TO_CURRENCY_STEADY_RATIO`(절대 통화량 대 고정 스톡 비교)는 **차원이
안 맞는 비교**였다 — 통화량은 시간에 걸쳐 누적되는 흐름의 적분값이고 세계 총가치는
한 시점의 고정 스톡이라, 시즌이 길수록 전자가 후자를 압도하는 게 당연하다(실측:
G21 적용 후에도 σ=1+전액재투자 시즌 말 추정 `M`은 천장의 수천~수만 배다 — 어떤
상수를 넣어도 이 극단 시나리오를 절대량 비교로 통과시킬 수 없다). **폐기하고
흐름 대 흐름 비율로 바꾼다**:

```
FINITE_STOCK_REALIZATION_SHARE_MIN = 0.15
(시즌 누적 T1~T4 매각 총액) / (시즌 누적 전체 매각 총액) ≥ FINITE_STOCK_REALIZATION_SHARE_MIN
```

"유한재고 매각이 시즌 내내 전체 매각액의 15% 이상을 차지해야 한다"로 지표를
바꿨다 — 희소성이 시즌 후반까지 경제에 실질적으로 기여하는지를 직접 잰다. T0
(무한 재고)가 매 시즌 끝까지 경제를 100% 지배하면 이 비율이 0에 수렴해 위반으로
잡힌다. §6.1의 소진 시점 재설계(위)와 이 지표는 같은 문제(희소성이 시즌 전체에
걸쳐 유지되는가)를 **속도**(소진까지 걸리는 시간)와 **비중**(매각액 구성비)
두 각도에서 잡는다.

## 7. 척추 2번 항목별 판정 — "깊이는 돈을 벌어 주지 않는다"

| 시스템 | 판정 | 근거 |
| --- | --- | --- |
| 세계지도·거점 이동 | **성립** | 거리는 시간·비용(K5·K6)만 늘리고, 무엇을 캐는지만 바꾼다. 소득 산식(§1.1)은 발굴력에만 종속된다 |
| 발굴단 단장·스텝 스탯 | **성립(G21로 재확인)** | 스탯이 발굴력 `D`에 **가산항으로만** 결합한다(`FOREMAN_DIG_COEFF=0.05`, 기존 0.8에서 하향). 팀별 비용 곡선을 합산 인덱스로 통일해 "여러 팀에 분산해 싸게 산다" 착취도 닫았다. 재투자 피드백 자체는 `MAX_GEAR_LEVEL=16`(v0.1 실코드)로 별도 상한을 걸었다(G21) |
| 박물관 | **성립(G5로 교정)** | 소장량이 아니라 슬롯에 묶고 발굴 소득의 30%로 캡(§1.2). 캡을 걷으면 즉시 위반으로 되돌아간다 |
| 경매장 | **성립** | 신규 소스가 아니라 §1.1의 처분 경로 중 하나(배율만 다름). 화폐 창출의 근원은 여전히 발굴이다 |
| 거래소(유저 간) | **v0.2에서 삭제** | G15/A4 — 실현 배율이 직접매각보다 항상 낮아 산수로 지배당한 죽은 채널이었다. v0.4에서 다시 설계할 때 이 행도 다시 판정한다 |
| 암시장 | **성립(G42로 재확정)** | 매입은 싱크(K9)이고, 재판매는 §1.1의 처분 경로로 이미 계산된다. `BLACK_MARKET_BUY_PRICE_RATIO=0.75`(기존 0.4는 `BLIND_SELL_RATE`(0.7)보다 낮아 즉시 되팔기로 무위험 차익이 났다 — G42/A5로 닫았다)는 "저가에 사서 감정 후 되판다"는 재미를 주면서도 무위험 차익도, 반복 매입만으로 발굴을 능가하는 소득도 만들지 않는다 |
| 스텝 급여·유지비·원정비·이전비 | **무관(성립)** | 전부 싱크(지출)다. 수입원이 아니므로 척추 2번의 대상이 아니다 |
| 유물 리젠(T1~T2) | **성립** | 재고가 늘어도 그 재고를 화폐로 바꾸려면 여전히 발굴력으로 캐내야 한다. 리젠이 원래 총량을 캡으로 두므로(G6) 재고 자체의 인플레이션도 없다 |
| 도난(보험 삭제) | **무관(성립) — 개정 G50/C#1** | 보험은 삭제됐다(산수로 죽은 채널). 도난 자체는 소득원이 아니라 리스크이고, 회수는 현물 복구일 뿐 화폐를 창출하지 않는다 |

## 8. `balance.ts` 상수 총람

이 문서에서 새로 이름 붙인 상수 전부. 구현 시 그대로 옮긴다.

```ts
// 참조(모델링용, 게임 밸런스 상수 아님) — 개정 G21/A7: ECONOMY_REF_DIG_POWER(단일 스칼라)는 폐기.
// 대신 D(t) 실측 곡선표(§0)를 쓴다. σ<1 정체 기준 D≈5,209/s, σ=1+MAX_GEAR_LEVEL 상한 후 D≈300,000/s.
export const ECONOMY_AVG_VALUE_FACTOR = 1.2;
export const E_LOCAL_PRICE_MULT = 1.0; // G26/B3 — REGIONAL_PRICE_MULT_MIN/MAX=0.60/1.40 재조정 후 평균

// G6 — 상태 축
export const CONDITION_NAME = ["파손", "보통", "양호", "완품", "관급"] as const;
export const CONDITION_VALUE_FACTOR = [0.4, 0.7, 1.0, 1.3, 1.6] as const;

// G6 — 리젠 (TIER3_SEASON_SUPPLY는 G23/A9로 독립 상수에서 제거 — TIER_STOCK_PER_SPECIES[3]의 별칭이었을 뿐이다)
export const TIER1_REGEN_INTERVAL_HOURS = 24;
export const TIER1_REGEN_AMOUNT = 4;
export const TIER2_REGEN_INTERVAL_HOURS = 168;
export const TIER2_REGEN_AMOUNT = 1;
export const RELIC_T4_REGEN_ENABLED = false;

// G21/A6 — 발굴단 재투자 상한(v0.1 app/src/game/balance.ts에 실코드로 이미 반영)
export const MAX_GEAR_LEVEL = 16; // 팀 합산 장비 구매 인덱스에도 동일 적용(v0.2)
export const FOREMAN_HIRE_COST = 200_000;

// G23/A9 재역산(G41/A3+A4) — 심층 티어 가중 재설계(설계값, 480종 데이터
// 파이프라인과 함께 balance.ts에 반영). 드랍 간격은 이제 가중치가 아니라
// DROP_INTERVAL_FLOOR_SECONDS가 전담한다(간격·희소성 분리)
export const LAYER_BASE_WEIGHTS_8_9 = [52, 36, 11, 0.01, 0] as const;      // 기존 [52, 36, 11, 0.00004, 0](G23) ← 원 [52, 36, 11, 1, 0]
export const LAYER_BASE_WEIGHTS_10_12 = [38, 40, 18, 0.03, 0.005] as const; // 기존 [38, 40, 18, 0.00015, 0.000025](G23) ← 원 [38, 40, 18, 3.9, 0.1]
export const DROP_INTERVAL_FLOOR_SECONDS = 20;   // 신설 — G41/A3+A4. dropThreshold_v2(L,D) = max(raw, FLOOR × 그 순간 실제 D)
export const FINITE_STOCK_REALIZATION_SHARE_MIN = 0.15;

// G7 — 데이터 목표
export const ARTIFACT_SPECIES_TARGET = 480;
export const SPECIES_PER_SITE_BY_TIER = [25, 8, 4, 2, 1] as const; // T0~T4
export const T4_MIN_INDEPENDENT_SOURCES = 2;

// G5 — 박물관(개정 G24/B1: 캡 기준을 그 거점 D → 플레이어 전체 D 합으로, POP·RARITY 캡 정직화)
export const MUSEUM_NET_INCOME_CAP = 0.30; // 이제 Σ_teams D_team 기준. 박물관 위치로 우회 불가
export const MUSEUM_UPKEEP_RATE = 0.20;
export const MUSEUM_TICKET_PRICE = 20_000; // 기존 8,000에서 인상(회수기간 442h→177h)
export const MUSEUM_POP_CONTRIB_CAP = 4.0; // 기존 6.0(실제 도달 가능한 최댓값 4.003과 맞춤 — 사문 조항 제거)
export const MUSEUM_RARITY_CONTRIB_CAP = 15.0; // 기존 5.0(등급4·15슬롯이 현실적 구성에서도 클램프 안 되게)

// 가격 공식(§3. TRADE_*는 거래소 제거로 v0.2에서 삭제 — notes/decisions.md G15/A4)
export const AUCTION_PRICE_MULT_MIN = 1.15; // 기존 1.0(G50/C#6 — CLIENTELE 스탯 삭제로 수수료 고정 8%가 되며 등급1이 직접매각보다 항상 손해가 되는 걸 막았다)
export const AUCTION_PRICE_MULT_MAX = 1.4;
export const AUCTION_FEE_RATE = 0.08; // 고정 — AUCTIONEER_FEE_DISCOUNT_COEFF/CAP 삭제(G50/C#5)
export const AUCTION_GRADE_MAX = 4; // G30/C — "등급진행도" 분모
export const BLACK_MARKET_BUY_PRICE_RATIO = 0.75; // 기존 0.4(G42/A5 — BLIND_SELL_RATE(0.7)보다 낮아 무위험 되팔기 차익이 났다)
export const BLACK_MARKET_STOLEN_PRICE_RATIO = 0.32; // 평가액 기준, BLACK_MARKET_BUY_PRICE_RATIO와 독립
export const BLACK_MARKET_SLOT_CAPACITY = 12;

// 업그레이드 비용 곡선(§2 K1, G30/C — 기존에 가격이 없던 7종)
export const AUCTION_GRADE_COST_BASE = 30_000_000;
export const AUCTION_GRADE_COST_GROWTH = 3.0;
export const MUSEUM_GRADE_COST_BASE = 40_000_000;
export const MUSEUM_GRADE_COST_GROWTH = 3.0;
export const MARKETING_LEVEL_COST_BASE = 2_000_000;
export const MARKETING_LEVEL_COST_GROWTH = 1.5;
export const HUMIDITY_LEVEL_COST_BASE = 500_000;
export const HUMIDITY_LEVEL_COST_GROWTH = 1.8;
export const RESTORATION_LEVEL_COST_BASE = 800_000;
export const RESTORATION_LEVEL_COST_GROWTH = 1.9;
export const SECURITY_LEVEL_COST_BASE = 600_000;
export const SECURITY_LEVEL_COST_GROWTH = 1.8;
export const VAULT_LEVEL_COST_BASE = 1_000_000;
export const VAULT_LEVEL_COST_GROWTH = 1.7;

// 싱크 목표 비율(§2)
export const UPGRADE_SINK_SHARE_TARGET = 0.55;
export const STAFF_TOTAL_SALARY_SHARE_TARGET = 0.08;
export const EXPEDITION_COST_INCOME_RATIO = 0.15; // G27/B5 — 선지급 → 귀환 시 후불로 지급 시점 변경
export const RELOCATION_COST_ASSET_RATIO = 0.10;
export const EXPEDITION_DISTANCE_YIELD_COEFF = 0.5; // G27/B5 — 거리 업사이드(비용 계수와 대칭)
export const EXPEDITION_ONSITE_RATIO = 3.0; // G27/B5 — 가동률 33%→60%

// 도난(§2, G9. 보험(THEFT_INSURANCE_PREMIUM_RATE·THEFT_INSURANCE_PAYOUT_RATE)은
// G50/C#1로 삭제됐다 — 산수로 항상 죽은 채널이었다. 더 이상 balance.ts에 없다)
export const THEFT_APPLICABLE_MAX_TIER = 3;
export const THEFT_RECOVERY_WINDOW_HOURS = 72; // 온라인 경과 시간 기준(G39/A1)
export const THEFT_RATE_BASE = 0.0014; // 시간당, 독립 설계값(하루 약 3.4%)
export const THEFT_JUDGEMENT_ONLINE_ONLY = true; // 신설 — G39/A1. 제보와 동일하게 온라인 중에만 판정

// 고정비 — 급여를 매각 시점 원천징수로 전환하며(G29/B7) 체납·강제은퇴 계열 전부 삭제:
// SALARY_ARREARS_GRACE_HOURS, STAFF_ARREARS_STAT_PENALTY_MULT,
// STAFF_QUIT_CHANCE_PER_HOUR_IN_ARREARS, STAFF_RETIREMENT_TENURE_HOURS,
// STAFF_RETIREMENT_WARNING_HOURS, STAFF_RETIREMENT_SEVERANCE_MULT — 더 이상 balance.ts에 없다.

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

// 정상상태 측정(§5, §6 — 개정 G22/A8·G23/A9)
export const CURRENCY_GROWTH_24H_EXCESS_CAP = 0.15;   // 기존 CURRENCY_GROWTH_24H_CAP(절대율 0.12, 자기 수식으로 위반됨) 폐기
export const CURRENCY_GROWTH_24H_EXCESS_FLOOR = -0.10;
export const MATURE_PHASE_START_HOUR = 48; // 기존 168(review 원안 448도 기각 — G21 적용 후 24h 안에 정체하므로 불필요)
export const ARTIFACT_WORLD_VALUE_CEILING = 250_000_000_000; // 2,500억, 정확히는 249,984,000,000
// ARTIFACT_TO_CURRENCY_STEADY_RATIO(절대량 비교, 차원 불일치)는 FINITE_STOCK_REALIZATION_SHARE_MIN(위, §6.2)으로 대체됐다.
```
