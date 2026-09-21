# 유물왕 — 세계지도·거점 설계 (v0.2)

> `prompts/v0.2-deepening.md` §5.1, §8 4단계의 산출물. `notes/decisions.md`의 G2(시즌제)·
> G6(등급 분리)·G7(480종·거점당 분포)·G8(지도 렌더)·G9(도난)와 `notes/economy.md`의
> K5(원정비)·K6(거점 이전비)·§3(가격 공식)·§4(인플레이션 방어)가 이 문서의 전제다.
> 여기서 정하는 거리·시세·거점 목록은 `notes/staff.md`(발굴단 단장의 이동 스탯)와
> `spec.md` v0.2 절(발굴단·원정, 경매장·암시장 — 거래소는 v0.2에 없다, G15/A4)이
> 그대로 참조한다.

## 0. v0.1과의 관계

v0.1의 "발굴지"(권역, `SITES: SiteDef[]`, 한반도·이집트·로마 3곳)는 그대로
**거점 도시**로 승격된다. 층(`layer`)과 층별 티어 가중(`tierWeights`)은 폐기하지 않고
유적 단위로 그대로 유지한다(§5.2 답, 아래 재확인). v0.2는 이 3곳에 9곳을 더해
**12거점**으로 확장한다 — `notes/decisions.md` G7이 확정한 "12거점 × 40종 = 480종"의
그 12거점이 바로 이 문서가 정의하는 거점이다. 기존 3곳의 `unlockCost`(이집트
5,000,000 / 로마 300,000,000)와 `dropMod`(1 / 1.15 / 0.8)는 `notes/economy.md`
§1.1이 이미 이 값들로 화폐 창출률 범위(`bonus/dropMod ∈ [0.87, 2.9]`)를 계산해
문서에 박아 놓았으므로 **바꾸지 않는다.** 신규 9곳의 `dropMod`도 기존 범위
`[0.8, 1.15]` 안에서만 고른다 — 벗어나면 economy.md §1.1의 시간당 규모 표
(163.15억~543.82억 ₩, 정정 — `notes/decisions.md` G46/A9. 기존 "31.3억~104.4억"은
`D=1,000` 기준이었는데 economy.md §1.1은 `D≈5,209` 기준을 자처해 분모가
달랐다 — 이제 세 문서가 같은 분모를 쓴다)가 전부 틀어진다.

`types.ts`의 `SiteId`는 지역명 3개(`"korea" | "egypt" | "rome"`)에서 12개로
늘어난다: `"korea" | "egypt" | "rome" | "greece" | "china" | "turkey" | "iraq" |
"india" | "mexico" | "peru" | "japan" | "israel"`. 도시명이 아니라 v0.1과 같은
지역명 규칙을 따른다 — 기존 3개(`korea`=경주, `egypt`=룩소르, `rome`=폼페이)는
이미 앵커 도시 하나짜리 지역이었으므로 이름을 바꾸지 않는다.

## 1. 거점 도시 12곳

인구는 광역권 기준 근사치(만 명 단위 반영, 박물관 관람객 수식의 입력일 뿐 실측
검증 대상이 아니다 — `notes/artifacts-dataset.md`의 `source` 필수 규칙은 **유물**에만
적용되고 도시 인구에는 적용되지 않는다). 시세 성향은 §8의 거점별 시세 모델이 만드는
결과 중 **테마 카테고리**(그 거점이 구조적으로 유리한 유물 종류 2종)만 표에 요약한다.
초기 보너스는 §5의 통일 공식을 그 거점의 `dropMod`·테마 카테고리에 대입한 값이다.

> **`unlockCost`의 의미가 바뀌었다**(`notes/decisions.md` G17/A10). 원정 대상은
> 12거점 전부이고 보유 여부와 무관하게 언제나 파견 가능하다(거리비용만 부과).
> `unlockCost`는 오직 그 거점을 **base로 승격**(박물관·경매장 건립 자격 + 그
> 거점의 로컬 시세 프리미엄이 붙는 본거지 지위)하는 데만 든다 — "원정 자격 비용"이
> 아니라 "base 승격 비용"이다.

| 거점(도시) | 나라 | 인근 유적(앵커) | 인구 | `dropMod` | `layerCostMod` | `unlockCost`(₩, **base 승격 비용** — 원정 자격 아님) | 테마 카테고리 | 초기 보너스(첫 12h) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 경주 | 대한민국 | 경주 고분군 | 264,000 | 1.00 | 1.00 | 0(항상 무료) | 도자기·장신구 | dropMod ×0.85 |
| 아테네 | 그리스 | 아크로폴리스 | 3,153,000 | 0.95 | 1.10 | 3,000,000 | 조각·화폐 | dropMod ×0.85 |
| 룩소르 | 이집트 | 왕가의 계곡 | 506,000 | 1.15 | 1.40 | 5,000,000(기존값 유지) | 관·석판 | dropMod ×0.85 |
| 이스탄불 | 튀르키예 | 콘스탄티노플 유적 | 15,462,000 | 0.90 | 1.20 | 12,000,000 | 장신구·기물 | dropMod ×0.85 |
| 예루살렘 | 이스라엘 | 구시가 발굴지구 | 936,400 | 1.05 | 1.25 | 20,000,000 | 두루마리·석판 | dropMod ×0.85 |
| 델리 | 인도 | 델리 술탄왕조 유적군 | 32,065,760 | 1.00 | 1.15 | 35,000,000 | 화폐·장신구 | dropMod ×0.85 |
| 시안 | 중국 | 병마용 갱 | 12,953,000 | 1.10 | 1.30 | 60,000,000 | 조각·기물 | dropMod ×0.85 |
| 바그다드 | 이라크 | 바빌론·우르 유적 | 7,922,000 | 0.85 | 1.35 | 100,000,000 | 석판·두루마리 | dropMod ×0.85 |
| 교토 | 일본 | 헤이안쿄 유적·고찰군 | 1,463,000 | 0.95 | 1.30 | 150,000,000 | 검·가면 | dropMod ×0.85 |
| 폼페이 | 이탈리아 | 폼페이 유적 | 2,185,000 | 0.80 | 1.15 | 300,000,000(기존값 유지) | 조각·기물 | dropMod ×0.85 |
| 멕시코시티 | 멕시코 | 테오티우아칸·템플로 마요르 | 21,804,000 | 1.00 | 1.45 | 500,000,000 | 장신구·조각 | dropMod ×0.85 |
| 쿠스코 | 페루 | 마추픽추·삭사이우아만 | 428,450 | 0.90 | 1.50 | 800,000,000 | 장신구·기물 | dropMod ×0.85 |

> **v0.4(G75.2)** — `SiteDef`가 `name`(나라 단위) 하나였던 걸 `city`/`country`/`anchor`
> 셋으로 쪼갰다. 표시 규칙은 전 화면 공통으로 **1차 도시명 · 2차 앵커 유적 · 3차 나라**다
> (`sites.ts`의 `siteTitle`/`siteSubtitle`가 유일한 조합 지점). 검색은 넷 다 걸린다
> (`siteSearchText`) — "이집트"로 찾아도 룩소르가 나와야 한다. `SiteId`(korea·egypt·rome…)는
> 세이브에 박힌 영속 키라 그대로 둔다. 교토·폼페이의 테마 카테고리 한글 표기가
> `thematicCategory`의 실제 값(mask=가면, mechanism=기물)과 어긋나 있어 표를 코드에 맞췄다.

`dropMod` 최솟값(0.80, 폼페이)·최댓값(1.15, 룩소르)이 기존 3곳과 정확히 같다 —
economy.md §1.1의 범위를 건드리지 않는다. `tierBias`(층별 티어 가중 보정, 5개
값 T0~T4)는 유물 데이터 파이프라인(G7, `notes/artifacts-dataset.md` 개정, 이번
실행 범위 밖)에서 실제 종 구성과 함께 확정한다 — 그 파이프라인이 작업할 수
있도록 잠정값을 `balance.ts` 상수 총람(§9)에 남긴다. tierBias는
`layerExpectedValue`의 분자·분모 양쪽에 들어가 상쇄되므로(economy.md §1.1)
화폐 창출률에 영향을 주지 않고, 어떤 티어가 나오는지에만 영향을 준다. 이
상쇄 성질 때문에 tierBias 잠정값은 이후 데이터 파이프라인에서 조정되어도
§1.1의 수치를 무효화하지 않는다.

**`eras`(층별 시대 라벨 12개)는 아래 §1.1에서 실제로 확정한다** — "깊이 = 연대"가
이 게임의 척추 2번 옆의 또 다른 골격(`AGENTS.md` 척추 1·2, `spec.md` §2.2)이라,
9거점의 연대를 미정으로 남겨 두면 그 거점들만 지층을 파도 시대가 갱신되지
않는다. `tierBias`(어떤 종이 나오는지의 가중치)와 달리 `eras`(그 층이 어느
시대인지의 라벨)는 유물 데이터 없이도 각 거점의 실제 역사 연대기만으로 정할
수 있으므로 데이터 파이프라인을 기다릴 이유가 없다.

**초기 보너스의 통일 공식** (도시마다 다른 숫자를 임의로 배정하지 않고, 하나의
식에 거점별 상수를 대입한다):

```
HOME_BASE_BONUS_DROPMOD_MULT = 0.85
HOME_BASE_BONUS_DURATION_HOURS = 12

첫 12시간 그 거점의 dropMod(실제) = dropMod(원래) × HOME_BASE_BONUS_DROPMOD_MULT
```

모든 거점에 같은 배율을 적용하지만, 원래 `dropMod`가 거점마다 다르므로 체감
효과는 다르다. **방향 정정(review-r1.md A11)**: `balance.ts`의 실제 주석
("드랍 임계 계수 — 낮을수록 자주 나온다")과 `dropThreshold = (expected /
(PROGRESS_VALUE × bonus)) × dropMod` 식이 유일한 근거다 — `dropMod`가
**낮을수록** 드랍 임계가 낮아져 **더 자주** 나온다(폼페이 0.80이 "잦은" 쪽,
룩소르 1.15가 "뜸한" 쪽). 이전 문장("원래 드랍이 뜸한 거점일수록 체감이
크다")은 예시 순서상 0.80을 "뜸한" 쪽으로 읽히게 방치해 `spec.md` §2.2
("폼페이 — 드랍 간격 0.8배", 짧은 간격 = 잦은 드랍)와 정면으로 어긋났다 —
바로잡는다: 룩소르(원래 뜸함, 1.15 × 0.85 = 0.9775)처럼 **`dropMod`가
원래 높던(드랍이 뜸하던) 거점일수록** 초반 보너스로 줄어드는 절대량이 커서
체감이 크다. 폼페이(원래 잦음, 0.80 × 0.85 = 0.68)는 이미 잦은 드랍이 더
잦아질 뿐이라 상대적으로 체감이 작다.
테마 카테고리 우위는 별도 보너스가 아니라 §8의 시세 모델이 만드는 **구조적 결과**다
— 그 거점을 고르면 그 거점의 테마 카테고리를 그 거점 시세로 팔 때 이미 유리하다.

### 1.1 신규 9거점의 `eras` (층별 시대 라벨 12개, B10)

`app/src/game/balance.ts`의 기존 3거점 `eras` 배열(1층=가장 얕고 최근 →
12층=가장 깊고 오래됨)과 같은 형식이다. 각 거점의 앵커 유적이 속한 지역의
실제 역사 연대기를 근거로 삼는다 — 유물 종 배정(tierBias)과 달리 시대 라벨은
1차 사료 검증 파이프라인을 기다릴 필요가 없는 일반 역사 지식이므로 이번
실행에서 확정한다.

```ts
export const NEW_SITE_ERAS: Record<SiteId, string[]> = {
  greece: [ // 아테네 — 아크로폴리스
    "오스만 지배기", "비잔티움 후기", "비잔티움 중기", "로마 속주기",
    "헬레니즘기", "고전기 말", "고전기 전성(페리클레스 시대)", "페르시아 전쟁기",
    "아르카익기 말", "아르카익기 초", "기하학 문양기", "미케네 문명"
  ],
  turkey: [ // 이스탄불 — 콘스탄티노플 유적
    "오스만 후기", "오스만 초기", "비잔티움 말기(팔레올로고스 왕조)",
    "비잔티움 중기(마케도니아 왕조)", "비잔티움 성상파괴기", "유스티니아누스 시대",
    "콘스탄티누스 천도기", "로마 제정 후기", "로마 제정 초", "헬레니즘기",
    "고전 그리스 식민기", "청동기 트로이 문명"
  ],
  israel: [ // 예루살렘 — 구시가 발굴지구
    "오스만기", "맘루크기", "십자군기", "초기 이슬람기(우마이야·아바스)",
    "비잔티움기", "로마 제정기(제2성전 파괴 이후)", "헤롯 시대(제2성전기)",
    "하스몬 왕조", "페르시아기(제2성전 초)", "신바빌로니아 유수기",
    "왕정기(유다 왕국)", "청동기 가나안"
  ],
  india: [ // 델리 — 델리 술탄왕조 유적군
    "영국령 인도", "무굴 후기", "무굴 전성기", "로디 왕조", "투글루크 왕조",
    "킬지 왕조", "노예 왕조(델리 술탄국 초)", "라지푸트기", "굽타 후기",
    "굽타 전성기", "마우리아 왕조", "초기 철기 베다 후기"
  ],
  china: [ // 시안 — 병마용 갱
    "청대", "명대", "원대", "송대", "당대", "수대", "위진남북조",
    "한대(전한·후한)", "진(秦)대 — 병마용 조성기", "전국시대", "춘추시대", "서주 시대"
  ],
  iraq: [ // 바그다드 — 바빌론·우르 유적
    "오스만기", "아바스 칼리프국", "사산조 페르시아", "파르티아기", "셀레우코스기",
    "신바빌로니아(네부카드네자르 시대)", "아시리아 제국기", "카시트기",
    "고바빌로니아(함무라비 시대)", "아카드 제국기", "초기 왕조기(수메르 도시국가)", "우루크기"
  ],
  japan: [ // 교토 — 헤이안쿄 유적·고찰군
    "메이지 유신기", "에도 시대", "아즈치모모야마 시대", "무로마치 시대",
    "가마쿠라 시대", "헤이안 후기(인세이기)", "헤이안 전성기(고쿠후 문화)",
    "헤이안 천도기", "나라 시대", "아스카 시대", "고훈 시대", "야요이 시대"
  ],
  mexico: [ // 멕시코시티 — 테오티우아칸·템플로 마요르
    "스페인 식민 초기", "아스텍 제국 전성기", "아스텍 건국기(테노치티틀란)",
    "톨텍 문명", "후기 고전기 쇠퇴기", "테오티우아칸 전성기", "테오티우아칸 건설기",
    "초기 고전기", "프레클래식 말기(초기 도시화)", "올멕 후기", "올멕 전성기", "프레클래식 초기"
  ],
  peru: [ // 쿠스코 — 마추픽추·삭사이우아만
    "스페인 정복 직후", "잉카 제국 전성기(파차쿠티 시대)", "잉카 건국기",
    "치무 왕국", "와리 제국", "티와나쿠 문명", "모체 문명 후기", "모체 문명 전기",
    "나스카 문명", "파라카스 문명", "차빈 문명", "초기 형성기(카랄 문명)"
  ],
};
```

`korea`·`egypt`·`rome`(기존 3거점)의 `eras`는 `app/src/game/balance.ts`에
이미 실코드로 있으므로 여기 다시 옮기지 않는다. 위 9개를 합치면 12거점
전부의 `eras`가 채워진다 — "깊이 = 연대"가 신규 9거점에서도 성립한다.

## 2. 거리 정의와 거리 행렬

거리는 **권역 그래프의 홉이 아니라 실제 지리 거리**(대원 거리, haversine)다. 홉
그래프를 쓰면 "가까운데 비용이 높다"는 왜곡이 생기고, 실존 유적이라는 세계관의
전제(척추 1번의 연장)와도 어긋난다. 실제 좌표를 쓰면 "경주-교토는 가깝고
경주-쿠스코는 지구 반대편"이라는 감각이 계산 없이도 맞아떨어진다.

```
DISTANCE_KM(a, b) = 6371 × 2 × atan2(√h, √(1−h))
  h = sin²(Δlat/2) + cos(lat_a)·cos(lat_b)·sin²(Δlon/2)
```

좌표(`WORLD_CITY_COORDS`, 위도·경도):

| 거점 | 위도 | 경도 |
| --- | --- | --- |
| 경주 | 35.84 | 129.22 |
| 룩소르 | 25.68 | 32.64 |
| 폼페이 | 40.75 | 14.49 |
| 아테네 | 37.98 | 23.73 |
| 시안 | 34.27 | 108.95 |
| 이스탄불 | 41.01 | 28.98 |
| 바그다드 | 33.31 | 44.36 |
| 델리 | 28.61 | 77.21 |
| 멕시코시티 | 19.43 | -99.13 |
| 쿠스코 | -13.53 | -71.97 |
| 교토 | 35.01 | 135.77 |
| 예루살렘 | 31.78 | 35.22 |

계산된 거리 행렬(km, 위 공식으로 산출한 실측값. 빌드타임에 `WORLD_CITY_COORDS`에서
그대로 재계산되므로 이 표는 하드코딩되지 않는다 — 검증용으로만 싣는다):

| | 경주 | 룩소르 | 폼페이 | 아테네 | 시안 | 이스탄불 | 바그다드 | 델리 | 멕시코시티 | 쿠스코 | 교토 | 예루살렘 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 경주 | 0 | 8919 | 9207 | 8792 | 1850 | 8230 | 7509 | 4901 | 12038 | 16754 | 601 | 8330 |
| 룩소르 | 8919 | 0 | 2369 | 1604 | 7244 | 1738 | 1415 | 4397 | 12783 | 12099 | 9491 | 723 |
| 폼페이 | 9207 | 2369 | 0 | 851 | 7940 | 1217 | 2762 | 5768 | 10448 | 10692 | 9674 | 2102 |
| 아테네 | 8792 | 1604 | 851 | 0 | 7380 | 562 | 1931 | 5009 | 11281 | 11421 | 9300 | 1253 |
| 시안 | 1850 | 7244 | 7940 | 7380 | 0 | 6832 | 5863 | 3063 | 13345 | 17707 | 2448 | 6720 |
| 이스탄불 | 8230 | 1738 | 1217 | 562 | 6832 | 0 | 1606 | 4551 | 11427 | 11901 | 8738 | 1168 |
| 바그다드 | 7509 | 1415 | 2762 | 1931 | 5863 | 1606 | 0 | 3162 | 12987 | 13262 | 8078 | 873 |
| 델리 | 4901 | 4397 | 5768 | 5009 | 3063 | 4551 | 3162 | 0 | 14659 | 16421 | 5501 | 4026 |
| 멕시코시티 | 12038 | 12783 | 10448 | 11281 | 13345 | 11427 | 12987 | 14659 | 0 | 4719 | 11639 | 12527 |
| 쿠스코 | 16754 | 12099 | 10692 | 11421 | 17707 | 11901 | 13262 | 16421 | 4719 | 0 | 16350 | 12405 |
| 교토 | 601 | 9491 | 9674 | 9300 | 2448 | 8738 | 8078 | 5501 | 11639 | 16350 | 0 | 8889 |
| 예루살렘 | 8330 | 723 | 2102 | 1253 | 6720 | 1168 | 873 | 4026 | 12527 | 12405 | 8889 | 0 |

> **v0.4 갱신(G75.3)** — `rome`의 좌표를 40.85/14.27에서 **폼페이 유적 40.75/14.49**로
> 옮겼다. 옛 좌표는 나폴리였고, 이름("로마")·앵커("폼페이 유적")·좌표(나폴리) 셋이
> 서로 다른 곳을 가리켰다. 거리 변화는 최대 22km(룩소르·아테네·예루살렘 방향 −21~−22km,
> 멕시코시티·쿠스코 방향 +16~+21km)이고, 168시간 시뮬에서 엔딩 도달 시간은
> 140시간 44분 → 140시간 42분으로 2분 움직였다(`eval.md` §20).

최소 거리(0 제외) 562km(아테네-이스탄불), 그다음이 601km(경주-교토)다. 최대 거리는
17,707km(쿠스코-시안). 이 두 값이
아래 이동시간·비용 공식의 실효 범위를 정한다.

## 3. 이동 시간·비용 공식

```
EXPEDITION_SPEED_KMH = 400          // 대항해시대풍 선박·대상(隊商) 속도. 여객기 속도가 아니다
EXPEDITION_ONSITE_MIN_HOURS = 0.1   // 6분. 거점 로컬 유적의 최소 현지 작업 시간
EXPEDITION_ONSITE_RATIO = 3.0       // 개정 — notes/decisions.md G27/B5

이동시간(편도, h) = DISTANCE_KM / EXPEDITION_SPEED_KMH
현지작업시간(h) = max(EXPEDITION_ONSITE_MIN_HOURS, 이동시간 × EXPEDITION_ONSITE_RATIO)
원정 총 소요시간(h) = 2 × 이동시간 + 현지작업시간
```

**(개정 — `notes/decisions.md` G27/B5)** 기존 `현지작업시간 = max(ONSITE_MIN,
이동시간)`은 거리가 `EXPEDITION_ONSITE_MIN_HOURS`(6분)만 넘으면 가동률
(`현지작업/총소요`)이 `이동시간/(2×이동시간+이동시간) = 1/3`로 **거리와 무관하게
고정**됐다 — 게다가 원정비는 거리에 비례해 최대 1.5배까지 오르므로 원거리는
"동일 시간당 4.5배 불리"했다. `EXPEDITION_ONSITE_RATIO = 3.0`을 곱해 가동률을
`3/(2+3) = 60%`로 끌어올렸다(거리와 무관하게 일정 — 왕복 총 소요는 길어지지만
회차당 실작업 비중이 커진다). 검산: 601km(경주-교토) 편도 1.5h → 현지작업 4.5h,
총 7.5h, 가동률 60%(기존 33.3%). 17,707km(쿠스코-시안) 편도 44.3h → 현지작업
132.9h, 총 221.5h, 가동률 여전히 60%.

거점 로컬 유적(거리 0)은 여전히 총 소요 0.1시간(6분, `EXPEDITION_ONSITE_MIN_HOURS`가
`× RATIO`보다 크므로 바닥값이 그대로 적용된다) — G11의 "20분 안에 거점 선택 → 첫
원정 → 첫 감정 → 첫 전시" 마일스톤이 여기서 성립한다. 발굴단 단장의 항해술 스탯
(`notes/staff.md` §1)이 `EXPEDITION_SPEED_KMH` 자체가 아니라 실효 이동시간의
분모에 곱해져 이 값을 최대 30%까지 줄인다(현지작업시간도 이동시간에 연동되므로
같이 줄어든다).

원정비(`notes/economy.md` K5, `EXPEDITION_COST_INCOME_RATIO = 0.15`)에 거리
가산을 곱하고, **후불(귀환 시 원천징수)로 지급 시점을 바꾼다**(개정 —
G27/B5 — 기존 "선지급"은 자금 0에서 파견 자체가 불가능해 수입도 0인 채 영원히
회복 못 하는 데드락을 만들었다, `notes/decisions.md` G10 "파산 불가" 위반):

```
EXPEDITION_DISTANCE_COST_COEFF = 0.5
EXPEDITION_DISTANCE_REF_KM = 10,000
EXPEDITION_DISTANCE_YIELD_COEFF = 0.5     // 신설 — 비용 계수와 대칭

EXPEDITION_DISTANCE_COST_MULT = 1 + EXPEDITION_DISTANCE_COST_COEFF × min(1, DISTANCE_KM / EXPEDITION_DISTANCE_REF_KM)
DISTANCE_YIELD_BONUS = 1 + EXPEDITION_DISTANCE_YIELD_COEFF × min(1, DISTANCE_KM / EXPEDITION_DISTANCE_REF_KM)

원정 기대소득 = D_team × PROGRESS_VALUE × bonus(L) / dropMod(site) × 현지작업시간(h) × 3600   // 신설 수식(C — 기존엔 이름만 있었다)
실제 원정비 = 그 원정의 실현소득(귀환 시 확정) × EXPEDITION_COST_INCOME_RATIO × EXPEDITION_DISTANCE_COST_MULT
  — 귀환 시 원천징수(기존: 파견 시 선지급)
그 원정의 bonus(L)은 실제로는 DISTANCE_YIELD_BONUS가 곱해진 값을 쓴다: bonus(L) × DISTANCE_YIELD_BONUS
```

거리 0 → 비용·수확 모두 ×1.0. 10,000km 이상(쿠스코↔유라시아 대부분)에서 비용은
×1.5로 상한, 수확도 **동일 계수로 ×1.5까지** 오른다 — 원거리 원정이 자산 축에서도
"멀리 갈 이유"를 갖게 된다(기존엔 도감·명성 업사이드만 있었다, §4). 위험(이동시간·
미스헵)을 이미 지불한 대가와 정확히 상쇄되는 설계라 "위험 없이 공짜로 버는" 구조가
아니다. K5 비율형 싱크 원칙(economy.md §0)을 유지한 채 곱연산 가산과 지급 시점만
바뀌었으므로 인플레이션 방어 구조(economy.md §4)는 그대로 성립한다.

## 4. 거리에 상응하는 업사이드

거리가 시간·비용만 늘리면 "가까운 곳만 판다"가 정답이 된다. 그래서 업사이드는
**돈이 아니라 거래로 살 수 없는 두 순위 축**(`notes/decisions.md` G4의 도감·명성)에
건다.

1. **그 권역에만 있는 유물**: G7의 거점당 분포(`SPECIES_PER_SITE_BY_TIER = [25, 8,
   4, 2, 1]`)에 따라 각 거점의 유물 종은 그 거점에서만 드랍한다. 특히 T4(유일)는
   거점당 정확히 1종 — 도감을 완주하려면 12거점을 전부 방문해야 한다.
2. **티어 가중**(`tierBias`): 위 §1 표의 거점별 특성이 그대로 이 역할이다. 고대
   문명이 오래된 거점(바그다드·예루살렘·쿠스코)일수록 T3·T4 가중이 높다.
3. **미탐사 보너스**: 어떤 거점에 **최초로** 발굴단을 파견해 층 1을 돌파하면
   `UNEXPLORED_BONUS_APPRAISAL_VOUCHER = 1`장의 무료 감정권을 즉시 지급한다.
   반복되지 않는 1회성 이벤트라 economy.md §0의 "반복 소득이 아니면 정상상태
   계산에서 제외"(§1.4와 동일한 성격)에 해당하고, 화폐 소스가 아니다.

거리를 들여 얻는 것은 "더 버는 것"이 아니라 "도감을 채우고 유일을 최초로 찾는
것"이다. 이 두 축은 거래로 살 수 없으므로(G4), 순위를 진심으로 노리는 플레이어는
자금 효율과 무관하게 먼 거점을 가야 한다 — 세계지도가 이동시간 계산기로 남지
않는 이유다.

## 5. base와 원정 대상의 분리, 거점 이전 규칙

**원정 대상 선택과 base 승격은 별개 액션이다**(`notes/decisions.md` G17/A10).
발굴단은 12거점 중 어디든, base로 승격했는지와 무관하게 파견할 수 있다 —
`unlockCost`는 원정을 막지 않는다(§1). "도감을 완주하려면 12거점을 전부
방문해야 한다"(§4)는 이 분리 덕분에 문자 그대로 성립한다 — 방문(원정)은
자유롭고, base 슬롯(아래 `MAX_OWNED_SITES`)만 3개로 제한된다.

```
MAX_OWNED_SITES = 3
```

**(정정 — B9, `notes/ux-v02.md` §1.5와의 충돌 해소)** "시작 시 12거점 중
하나를 무료로 base로 고른다"는 v0.1식 즉시 선택 문장이었다 — 실제 온보딩은
`ux-v02.md` §1.5(A11)가 재설계했다: **게임은 항상 경주에서 선택 없이
시작한다**(경주는 `unlockCost=0`으로 이미 무료 base다). 첫 감정이 완료되는
시점에 "본거지를 정하자" 화면이 자동으로 한 번 열려, 그 시점에야 "경주를
유지"하거나 "다른 거점으로 바꾼다"는 첫 base 확정이 일어난다.

```
FIRST_RELOCATION_FREE_WINDOW_HOURS = 12
```

이 확정 창(`ux-v02.md` §1.5-6)은 `HOME_BASE_BONUS_DURATION_HOURS`(12h, §1)와
같은 길이로 잡았다 — "첫 보너스가 살아있는 동안은 원점을 되돌리는 것도
공짜"라는 감각을 통일하기 위해서다. 이 창 안에 경주가 아닌 거점을 고르면
아래 "거점 이전" 액션이 그대로 실행되지만 `RELOCATION_COST_ASSET_RATIO`(10%)
와 `RELOCATION_COOLDOWN_HOURS`(168h)가 **면제**된다. 창을 넘기면 정상 거점
이전 규칙이 적용된다. 이후 추가 base를 얻는 경로는 두 가지로 나뉜다.

- **거점 확장**(2번째·3번째 거점): 기존 거점을 유지한 채 새 거점을 추가한다.
  비용은 해당 거점의 `unlockCost`(§1 표)뿐이고 쿨다운이 없다. `MAX_OWNED_SITES`에
  닿으면 더 늘릴 수 없다 — 관리 부담이 §5.8의 조작 단계 예산(3단계 이내)을 넘기지
  않도록 하는 상한이다.
- **거점 이전**(주 거점 교체): 보유 거점이 **1개뿐일 때만** 쓸 수 있는, "잘못
  고른 첫 선택"을 되돌리는 액션이다. 확장으로 2개 이상을 보유한 뒤에는 이전이
  아니라 확장만 가능하다(기존 거점을 버릴 이유가 없으므로).

```
RELOCATION_COST_ASSET_RATIO = 0.10   // notes/economy.md K6, 이전 시점 총자산의 10%
RELOCATION_COOLDOWN_HOURS = 168      // 7일. 남발 방지
```

**이전 시 잃는 것**: 첫 거점에서 받은 §1의 초기 보너스는 소멸하고 새 거점의 초기
보너스로 대체된다(보너스가 12시간 한정 1회성이므로 실질 손실은 이전 시점에 남은
보너스 잔여 시간뿐이다). 그 거점에 배치돼 있던 발굴단은 새 거점 기준으로 거리가
재계산된다 — 더 멀어질 수 있고, 그게 이전의 진짜 대가다. 자산·소장고·도감·명성은
전혀 영향받지 않는다(G4의 거래 불가 축을 이전이 건드리면 안 된다).

## 6. 지도 렌더 규격

`notes/decisions.md` G8(빌드타임 래스터 + 3단 줌)의 구체화이고, **v0.4에서 실제로
구현됐다**(G75.1). 아래는 설계가 아니라 지금 도는 코드의 서술이다.

```
MAP_ZOOM_LEVELS = 3                 // 세계 → 권역 → 유적
MAP_WORLD_DOT_GRID_W = 320
MAP_WORLD_DOT_GRID_H = 160          // 정거방형 도법 2:1 비율
MAP_DOT_PX = 2                      // 도트 1개 = CSS 2×2px
MAP_REGION_ZOOM_FACTOR = 4          // 권역 단계는 세계 그리드의 1/4 영역을 같은 출력 해상도로 확대
COASTLINE_LAND_THRESHOLD = 0.5
MAP_MIN_HIT_CSS_PX = 44             // 탭 목표 최소 크기(CSS px, 캔버스 내부 좌표가 아니다)
```

### 6.1 빌드타임 파이프라인 — `scripts/build-worldmap.mjs`

런타임에서 실행하지 않는다. 손으로 돌려 산출물을 커밋하는 생성 단계다.

```
node scripts/build-worldmap.mjs          # 다시 굽는다
node scripts/build-worldmap.mjs --check  # 커밋된 산출물이 최신인지만 검사(파일을 쓰지 않는다)
```

1. **입력**: `world-atlas@2.0.2`의 `land-110m.json`(Natural Earth 1:110m 육지
   지오메트리. 데이터 자체는 퍼블릭 도메인, npm 패키지 라이선스는 ISC).
   `topojson-client@3.1.0`로 TopoJSON → GeoJSON. 둘 다 `app/package.json`의
   **devDependencies**에만 있고 앱 진입점에서 import 되지 않는다 — 빌드 산출물
   (`dist/assets/*.js`)에 문자열 `world-atlas`/`topojson`이 0건인 것으로 확인한다.
2. **투영·이진화**: 정거방형 도법으로 320×160 그리드에 투영하고, 도트마다 4×4=16
   표본을 찔러 육지 비율이 `COASTLINE_LAND_THRESHOLD`를 넘으면 육지로 친다.
3. **날짜변경선 언랩**: Natural Earth는 ±180을 넘는 링(유라시아의 축치반도, 피지)을
   경도가 +179 → −179로 튀는 좌표열로 저장한다. 평면 ray casting에 그대로 넣으면 그
   "튀는 변"이 지도를 가로지르는 가짜 경계가 돼 **남태평양·노르웨이해가 육지로 나온다**
   (처음 구웠을 때 실제로 그랬다). 연속한 두 점의 경도 차가 180을 넘으면 ±360을 더해
   링을 펴고, 질의점도 같은 배수만큼 옮겨 가며 검사한다.
4. **거점 앵커 보정**: 도트 하나가 약 1.125°(적도 기준 125km)라 항구·해협 도시
   (아테네·이스탄불)의 도트는 육지 비율이 0.5에 못 미쳐 바다로 이진화된다. 임계값을
   낮춰 해안선 전체를 부풀리는 대신 **그 12거점 도트만** 육지로 승격한다 — 단 이웃
   8칸 중 하나라도 육지일 때만. 전부 바다면 격자 해상도 문제가 아니라 좌표가 틀린
   것이므로 **빌드를 깬다**(나폴리 좌표에 "폼페이"를 붙여 놨던 v0.3 결함의 회귀 방지).
   현재 보정 2건(아테네·이스탄불). 육지 도트 15,566 / 51,200.
5. **산출**: 320×160 비트를 base64 비트마스크(6,400바이트 → base64 8,536자)로 굽고
   `app/src/render/worldmap-raster.ts`에 정적 상수로 커밋한다. 모듈 로드 시 1회 언팩한다.
   **PNG data URL 대신 비트마스크를 고른 이유**: (a) 작다 — 같은 그리드의 PNG는
   헤더·필터·팔레트가 붙는다. (b) 권역 줌 리샘플이 배열 인덱싱 한 번이면 끝난다 —
   PNG는 Image 디코드 → 오프스크린 캔버스 → `getImageData`를 거쳐야 하고 그건 동기
   렌더 경로에서 못 쓴다. (c) 비트맵은 "육지냐"만 담고 색은 렌더가 `palette.ts`에서
   고른다. 픽셀에 색을 구우면 팔레트 40색 밖의 값이 생성 파일에 박힌다.
6. **정합 가드**: 스크립트가 `balance.ts`의 `MAP_WORLD_DOT_GRID_W/H`·
   `COASTLINE_LAND_THRESHOLD`를 읽어 제 가정과 다르면 빌드를 깬다. 그리드가 어긋난 채
   비트맵만 320×160이면 투영이 조용히 틀어진다.

### 6.2 런타임 렌더 — `app/src/render/worldmap.ts`

그리는 순서는 **바다 → 육지(해안선) → 위경도 그리드선 → 연결선 → 마커 → 라벨**이다.
가독성이 항상 우선이라 지형은 언제나 맨 아래다.

- **세계 줌**: 320×160 도트 그리드 전체(CSS 640×320px). 12거점 마커를 실제 위경도에 찍는다.
- **권역 줌**: 같은 비트맵을 `MAP_REGION_ZOOM_FACTOR`배로 키운 **최근접 이웃 리샘플**이다.
  도트가 4배로 커지는 픽셀아트 확대이지 벡터 재투영이 아니다(의도적이다 — 픽셀 그리드를
  유지한다). 화면에 들어오는 그리드 범위만 훑으므로 4배 확대라도 그리는 사각형 수는
  오히려 준다. v0.3은 `if (!zoom)` 가드 때문에 권역 줌 배경이 맨 바다였다(G55.10 →
  이번에 닫혔다). 그리드선 간격은 세계 30°, 권역 10°다.
- **유적 줌**: 새 캔버스를 만들지 않는다 — 기존 `render/strata.ts`의 240×360 지층 단면
  캔버스로 전환한다(v0.1과 동일한 화면).
- **색**: 전부 `palette.ts` 고정 40색에서만 고르고 알파로만 누른다. 바다 `PALETTE.sky`,
  육지 `PALETTE.soil[3]`@0.62, 해안(바다에 접한 육지 도트) `PALETTE.rock[2]`@0.55,
  그리드·연결선·라벨 `PALETTE.paper` 계열. 이 파일에 새 색 리터럴을 적지 않는다.
- **마커 5상태**는 `MARKER_STYLE` 한 곳에 모은다(base/visited/unvisited/selected/
  rival-target). 지도 밖 UI(범례, 목록의 상태 뱃지)가 같은 표를 읽으므로 어긋날 수 없다.
  **색만으로 구분하지 않는다**: base 마름모, visited 찬 원, unvisited 빈 원, selected
  두른 고리, rival-target 점선 고리.
- **라벨**: 본문과 같은 폰트 스택 10px(9px monospace는 한글에서 CJK 폴백으로 새 앱
  나머지와 어긋났다). base > visited > unvisited 순으로 16개 후보 위치를 그리디 배치하고,
  모든 마커를 장애물로 먼저 깐다. `drawWorldMap()`이 `{labelsDrawn, labelsOmitted}`를
  돌려주고 캔버스의 `data-labels-omitted`로 노출한다 — 스모크가 **생략 0건 / 12개 전부**를
  단언한다. 도시명으로 길어진 지금(멕시코시티) 실측으로 12개가 전부 자리를 잡는다.
  후보를 더 늘리는 쪽은 택하지 않는다(리더선이 길어져 어느 라벨이 어느 점의 것인지 되레
  안 읽힌다) — 장래에 터지면 "권역 줌 전체 라벨 + 세계 줌 밀집 구간 묶음"으로 간다.

### 6.3 조작 — 포인터·키보드·스크린리더

- **포인터**: 캔버스 클릭 → `pickSiteAt`이 **가장 가까운 마커**를 고른다. 반경은
  `MAP_MIN_HIT_CSS_PX`를 캔버스 스케일로 역산한 값이다(640px 캔버스가 375px로 줄어
  그려지면 내부 1px은 화면에서 0.59px이다 — v0.3은 이 환산이 없어 실제 탭 영역이 규정의
  1/4도 안 됐다).
- **키보드·스크린리더**: 마커마다 44×44 CSS px 투명 버튼을 얹은 오버레이 레이어를 둔다.
  Tab 순서는 본거지에서 **가까운 순**, Enter로 진행, ESC로 권역 줌 해제.
  `aria-label`은 "도시명 · 상태 · 거리 — 다음 동작"을 읽는다.
- 오버레이는 `pointer-events: none`이다. 밀집 구간(지중해~메소포타미아 6거점)에서 44px
  버튼끼리 겹치면 위에 쌓인 놈이 아래를 영영 가려 어떤 거점은 못 누르게 된다 — 포인터
  판정은 "가장 가까운 마커가 이긴다"로 두어 사각지대를 없애고, 오버레이는 포커스만 맡는다.
  Enter가 발생시키는 click은 `pointer-events`와 무관하게 그대로 전달된다.
- **범례**는 지도 밖에 둔다. 본거지·발굴단 위치·라이벌 추격을 색·점이 아니라 문장으로도
  읽을 수 있어야 한다(색각 이상 대응, 작업 지시 C3).

## 7. 원정 대상 선택의 조작 단계·북마크·추천·검색

원정 대상을 고르는 데 **3단계**를 넘지 않는다.

| 단계 | 조작 | 비고 |
| --- | --- | --- |
| 1 | 지도에서 거점 선택 | 검색·북마크·추천이 줌 3단계(세계→권역→유적) 드릴다운을 대신한다 |
| 2 | 발굴단 선택 | 유휴 발굴단이 있으면 기본값으로 미리 선택돼 있다(엔터만 눌러도 확정) |
| 3 | 파견 확정 | |

- **북마크**: 거점마다 즐겨찾기 토글. `MAP_BOOKMARK_CAP = 10`. 지도 첫 화면 상단에
  북마크한 거점을 거리순으로 나열해 1단계를 클릭 한 번으로 줄인다.
- **추천**: `RECOMMEND_TOP_N = 3`. "현재 발굴력 대비, 아직 방문 안 했거나 오래
  방치된 거점 중 도감 기여도가 높은 상위 3곳"을 지도 진입 즉시 카드로 띄운다.
  카드를 누르면 1단계가 끝난다.
- **검색**: 거점명·앵커 유적명·테마 카테고리로 실시간 텍스트 필터. 결과를 누르면
  1단계가 끝난다.

반복 원정(같은 거점에 계속 보내는 경우)은 **루틴**(`spec.md` v0.2 §발굴단과 원정)이
이 3단계 자체를 건너뛰게 한다 — 루틴이 자동 재파견을 수행하므로, 매번 찾아가는
행위는 "새 거점을 처음 열 때"와 "루틴을 바꿀 때"에만 필요하다.

## 8. 거점별 시세 모델 (미싱 링크)

대항해시대의 교역이 재미있는 이유는 지역 간 가격차다. 이 절이 그 가격차를 만든다.
채널별 적용 범위부터 정한다(정정 — B5, v0.2에는 거래소가 없다. G15/A4) —
**직접매각과 경매장은 로컬**(그 거점의 시세가 적용), **암시장은 로컬**(그
거점에서 나오는 매물의 구성만 지역을 반영하고, 매입가율은 전역 고정
`BLACK_MARKET_BUY_PRICE_RATIO = 0.75`(G42/A5로 상향, 기존 0.4는 미감정
즉시매각(`BLIND_SELL_RATE=0.7`)보다 낮아 무위험 되팔기 차익이 났다)로
유지한다 — 매입가까지 지역차를 두면 아래 §8.4의 차익거래 상한과 별개로
새로운 화폐 소스가 생긴다). 지역 차익은 "그 거점에서 즉시 판다"는 선택에만
붙는 보상이다.

### 8.1 유물 종류(카테고리)

`Shape` 열거형(`jar, sword, crown, mask, scroll, coin, tablet, statue, ornament,
mechanism`) 10종을 그대로 시세 카테고리로 쓴다. 새 분류를 만들지 않는다.

### 8.2 거점별 수요·유물 종류별 선호

**(개정 — `notes/decisions.md` G26/B3)** `REGIONAL_PRICE_MULT_MIN/MAX`를
`0.90/1.26 → 0.60/1.40`으로 재조정했다 — 두 문제를 동시에 닫는 값이다. (1)
`economy.md` §1.1이 이 배율을 곱하지 않고 규모를 추정해 실제 수입이 문서
가정보다 상시 +8~15% 높았다(균등분포 평균이 1.08~1.151이었기 때문) — 새 값의
평균은 정확히 `(0.60+1.40)/2 = 1.00`이라 이 편향이 사라진다. (2) `MAX_OWNED_SITES=3`
거점 중 최고가를 골라 파는 "개입"의 기대이득이 `1.170/1.080−1=8.3%`로
`ENGAGEMENT_UPSIDE_MIN(0.20)`에 못 미쳤다 — 균등분포 n개 표본 최댓값 기대식
`MIN+(MAX−MIN)×n/(n+1)`에 `n=3`을 대입하면 새 값에서는
`0.60+(1.40−0.60)×3/4=1.20`, 이득 `1.20/1.00−1=20.0%`로 **정확히 하한에 닿는다**
(테마 보너스·시간 드리프트가 추가로 얹히므로 실측 이득은 여유 있게 20%를 넘길
것이다 — 과소추정이지 과대추정이 아니다).

```
REGIONAL_PRICE_MULT_MIN = 0.60   // 기존 0.90
REGIONAL_PRICE_MULT_MAX = 1.40   // 기존 1.26
THEMATIC_PREFERENCE_BONUS = 0.08

BASE_HASH_PREF(city, category) = REGIONAL_PRICE_MULT_MIN
  + (REGIONAL_PRICE_MULT_MAX − REGIONAL_PRICE_MULT_MIN) × frac(FNV1a32(`${city}:${category}`) / 2^32)

PREFERENCE(city, category) = clamp(
  BASE_HASH_PREF(city, category) + (category ∈ SITE_THEMATIC_CATEGORY[city] ? THEMATIC_PREFERENCE_BONUS : 0),
  REGIONAL_PRICE_MULT_MIN, REGIONAL_PRICE_MULT_MAX
)
```

`SITE_THEMATIC_CATEGORY[city]`는 §1 표의 "테마 카테고리" 열(거점당 2개)이다.
FNV1a32는 표준 32비트 FNV-1a 해시(문자열 → 정수)이고, `frac(x/2^32)`는 그 정수를
[0,1) 구간으로 정규화한다 — 시드 기반 절차 생성(스프라이트 생성기와 같은 방식,
`notes/decisions.md` "도트 스프라이트는 절차 생성" 결정과 동형)이라 120칸(12거점
× 10카테고리)을 손으로 채우지 않고도 결정론적으로, 매번 같은 값이 나온다.

### 8.3 변동 주기·공급 충격

```
PRICE_UPDATE_INTERVAL_HOURS = 6
PRICE_CYCLE_HOURS = 72
PRICE_DRIFT_AMPLITUDE = 0.06
SUPPLY_SHOCK_MAGNITUDE = 0.10
SUPPLY_SHOCK_DECAY_HOURS = 48

DEMAND_DRIFT_STEP(city, category, t) = PRICE_DRIFT_AMPLITUDE
  × sin(2π × ⌊t / PRICE_UPDATE_INTERVAL_HOURS⌋ × PRICE_UPDATE_INTERVAL_HOURS / PRICE_CYCLE_HOURS
        + 2π × frac(FNV1a32(`${city}:${category}:phase`) / 2^32))

SUPPLY_SHOCK(city, category, t) = SUPPLY_SHOCK_MAGNITUDE × exp(−(t − t_shock) / SUPPLY_SHOCK_DECAY_HOURS)   // t_shock 이후에만, 없으면 0
```

`t_shock`은 그 거점·카테고리에서 T1·T2 리젠(G6, `TIER1_REGEN_INTERVAL_HOURS`·
`TIER2_REGEN_INTERVAL_HOURS`)이 발생한 시각이다 — 리젠은 그 지역에 그 종류의
유물이 갑자기 더 확인됐다는 뜻이므로 그 지역 시세가 일시적으로 내려간다는
서사와 정확히 맞물린다. `PRICE_UPDATE_INTERVAL_HOURS`마다 값을 다시 샘플링해
계단식으로 갱신한다(연속 갱신은 UI에서 "지금 봤던 가격이 1초 뒤 또 바뀌는"
피로를 만든다).

### 8.4 로컬 가격 배율과 차익거래 상한

```
LOCAL_PRICE_MULT(city, category, t) = clamp(
  PREFERENCE(city, category) + DEMAND_DRIFT_STEP(city, category, t) − SUPPLY_SHOCK(city, category, t),
  REGIONAL_PRICE_MULT_MIN, REGIONAL_PRICE_MULT_MAX
)

ARBITRAGE_MAX_SPREAD_RATIO = REGIONAL_PRICE_MULT_MAX / REGIONAL_PRICE_MULT_MIN = 1.40 / 0.60 ≈ 2.33   // 개정 G26/B3(기존 1.40)
```

하드 클램프이므로 어떤 시점에도 (같은 유물, 최고가 거점 / 최저가 거점)의 비율은
`ARBITRAGE_MAX_SPREAD_RATIO`(≈2.33)를 넘지 못한다 — 무한 차익거래 루프가 될 수
없다. **(정정 — G26/B3)** "1.40이 `ENGAGEMENT_UPSIDE_MAX`(0.40)와 정확히
일치한다"는 기존 서술은 **틀렸다** — 1.40은 12거점 전역 최대/최소 비율인데,
직접매각·경매장에서 실제로 체감하는 개입은 **보유 3거점 중 선택**(로컬)이라 전역
스프레드와는 다른 수치다(재검산 결과 실제 개입 이득은 8.3%에 불과했다). 이
서술은 삭제했다 — 개입 이득 20% 보장은 위 `REGIONAL_PRICE_MULT_MIN/MAX` 값
자체의 재조정(G26)으로 달성한다. 이 배율은 직접매각·경매장의 최종 가격에
곱해진다(`notes/economy.md` §3.2의 가격식에 이어
`× LOCAL_PRICE_MULT(그 거점, 그 유물의 shape, 현재 시각)`을 추가한다).

**어느 거점의 `LOCAL_PRICE_MULT`를 적용하는가**(신설 — `notes/decisions.md`
G48/B3): 소장고는 §8.1(v0.1과의 관계)이 이미 전역 단일로 확정했고 유물을
거점 간에 옮기는 액션이 데이터 모델에 없다 — G26이 "보유 3거점 중 최고가를
골라 판다"고 정당화한 계산이 실제로는 **어떻게 그 선택을 하는지** 정의하지
않고 있었다. 매각 시 `LOCAL_PRICE_MULT`는 **그 유물이 발굴된 거점이 아니라,
플레이어가 현재 보유한 base(최대 `MAX_OWNED_SITES`=3곳) 중 그 유물의 shape
카테고리 기준 최댓값**을 자동 적용한다 — 유물이 물리적으로 이동하는 게
아니라, 판매 행위 자체가 보유 base의 거래 인프라를 통해 최적 경로로
라우팅되는 것으로 추상화한다(§1의 "base = 로컬 시세 프리미엄이 붙는
본거지 지위"라는 서술과 정확히 일치한다). 원정으로 방문만 하고 base로
승격하지 않은 거점은 거래 인프라가 없어 매각가에 영향을 주지 않는다. 이
규칙으로 G26의 `E[max of 3]=1.20` 계산이 문자 그대로 성립한다 — 수치
재조정은 필요 없었다. 개입의 실제 가치는 "어느 거점에서 파는가"가 아니라
§8.3의 72시간 주기 시세 드리프트 안에서 **언제 파는가**에서 나온다.

### 8.5 정보 공개 규칙 — 미탐사 거점의 시세는 가려진다 (`notes/decisions.md` G19/B4, 단순화 G50/C#3)

`LOCAL_PRICE_MULT`가 완전 공개된 결정론 함수(해시+sin 드리프트)라 "어디가
비싼지 아는 것"의 가치가 0이었다 — 계산기만 있으면 최적해가 상수였다. 위
§8.2~§8.4의 수식·상수(`REGIONAL_PRICE_MULT_MIN/MAX`, `THEMATIC_PREFERENCE_BONUS`,
`PRICE_DRIFT_AMPLITUDE` 등)는 **바꾸지 않는다** — 그 위에 "정보"라는 축만 얹는다.

```
REMOTE_ARBITRAGE_MIN_DISTANCE_KM = 3_000
REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX = 1.60   // 개정 G26/B3 — 아래 참조
```

**(단순화 — `notes/decisions.md` G50/C#3)** 기존 설계는 `PRICE_INTEL_WINDOW_
HOURS=48h` 갱신 창을 뒀다 — 방문 시점부터 48시간만 정보가 유효하고, 넘기면
다시 가려지고 재방문해야 갱신됐다. 이건 원거리(그 자체로 편도 수 시간~수십
시간) 거점에서 "정보를 유지하려면 48시간 안에 다시 왕복하라"는 비현실적
요구였다 — 클램프 확장분(+14.3%) 하나를 위해 시한부 추적 상태를 관리해야
했다. **한 번이라도 `on_site`로 방문한 거점은 그 정보가 영구히 남는다**로
바꾼다 — 갱신·만료 개념 자체를 없앤다. 탐사 보상(Discovery)은 그대로 살고,
시한부 추적이라는 구현·UX 비용만 제거된다.

**(개정 — `notes/decisions.md` G26/B3)** `REGIONAL_PRICE_MULT_MIN/MAX`를
0.60/1.40으로 재조정하면서 `ARBITRAGE_MAX_SPREAD_RATIO`(≈2.33)가
`REMOTE_ARBITRAGE_BONUS_MAX`(1.60)보다 커졌다 — 기존 비율식
(`REGIONAL_PRICE_MULT_MAX × (REMOTE_ARBITRAGE_BONUS_MAX/ARBITRAGE_MAX_SPREAD_RATIO)`)을
그대로 두면 원거리 보너스가 로컬 최댓값보다 **낮아져** 정보 우위의 가치가
사라진다. 그래서 `REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX`를 비율식에서 분리해
**고정 절대값 1.60**으로 재정의했다 — 새 로컬 최댓값(1.40) 대비 `1.60/1.40=
14.3%` 보너스로, 기존(`1.44/1.26=14.3%`)과 **정확히 같은 비율의 보너스**를
유지한다(체감상 바뀌는 게 없다). `REMOTE_ARBITRAGE_BONUS_MAX`라는 별도 이름은
더 이상 쓰지 않는다 — `REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX` 하나로 충분하다.

1. **미탐사 = 비공개**: 한 번도 발굴단을 파견하지 않은 거점의 `LOCAL_PRICE_MULT`는
   지도·시장 UI에 "미탐사"로만 표시된다.
2. **정보 획득(영구)**: 발굴단이 그 거점에 처음 `on_site`로 진입하는 순간,
   그 거점의 `LOCAL_PRICE_MULT`가 즉시 "정보"로 공개되고 **다시 가려지지
   않는다**(§8.2~§8.4가 전부 결정론적 폐쇄형 함수이므로 미래값도 언제든
   계산해 보여줄 수 있다 — 서버 부정행위 우려가 없는 정적 계산).
3. **원거리 교역 상한(정보를 가진 경우에만)**: base로부터
   `REMOTE_ARBITRAGE_MIN_DISTANCE_KM`(3,000km) 이상 떨어진 거점에서, 그 거점을
   **한 번이라도 방문한 적 있으면** 직접매각·경매장에 팔 때 `LOCAL_PRICE_MULT`
   클램프 상한이 `REGIONAL_PRICE_MULT_MAX`(1.40, G26/B3로 재조정됨)에서
   `REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX`(1.60)로 확장된다. 방문한 적 없으면 기본
   클램프(1.40)만 받는다 — 확장분(1.40~1.60)은 탐사를 마친 쪽의 몫이다. 이건
   이동시간·미스헵 리스크를 이미 지불한 거리에만 적용되므로, `notes/decisions.md`
   G3의 "손대면 20~40%"(비용 없는 개입에 대한 상한)와는 성격이 다르다 —
   위험수당이라 그 밴드를 넘어도 된다.

**버린 선택지**: (i) 시세 완전 비공개(사전 스냅샷도 없음) — 편도 최장 44.3시간인
원정에서 "도착해서야 안다"로 두면 계획 자체를 세울 수 없어 세계지도 활용이
오히려 더 준다. (ii) `ARBITRAGE_MAX_SPREAD_RATIO` 자체를 올린다 — B3(개입
이득)과 얽힌 기존 수치를 다시 열게 된다. 정보라는 새 축을 쌓는 쪽이 기존
수치를 안 건드리고도 문제를 푼다. (iii) 48시간 갱신 창을 유지한다 — 리뷰
2회차 C#3이 지적한 대로 원거리일수록 갱신 자체가 비현실적이 되는 자기모순이
있다. 영구 플래그로 바꾸면 "미탐사=비공개"(1번)와 동일한 패턴이 돼 상태
관리가 하나로 단순해진다.

## 9. `balance.ts` 상수 총람

```ts
// 거점 정의(§1)
export const MAX_OWNED_SITES = 3;
export const WORLD_CITY_COORDS: Record<SiteId, { lat: number; lon: number }> = {
  korea: { lat: 35.84, lon: 129.22 },
  egypt: { lat: 25.68, lon: 32.64 },
  rome: { lat: 40.75, lon: 14.49 },  // 폼페이 유적(v0.4, G75.3 — 옛 값은 나폴리였다)
  greece: { lat: 37.98, lon: 23.73 },
  china: { lat: 34.27, lon: 108.95 },
  turkey: { lat: 41.01, lon: 28.98 },
  iraq: { lat: 33.31, lon: 44.36 },
  india: { lat: 28.61, lon: 77.21 },
  mexico: { lat: 19.43, lon: -99.13 },
  peru: { lat: -13.53, lon: -71.97 },
  japan: { lat: 35.01, lon: 135.77 },
  israel: { lat: 31.78, lon: 35.22 },
};
export const CITY_POPULATION: Record<SiteId, number> = {
  korea: 264_000, greece: 3_153_000, egypt: 506_000, turkey: 15_462_000,
  israel: 936_400, india: 32_065_760, china: 12_953_000, iraq: 7_922_000,
  japan: 1_463_000, rome: 2_185_000, mexico: 21_804_000, peru: 428_450,
};
export const SITE_THEMATIC_CATEGORY: Record<SiteId, [Shape, Shape]> = {
  korea: ["jar", "ornament"], greece: ["statue", "coin"],
  egypt: ["crown", "tablet"], turkey: ["ornament", "mechanism"],
  israel: ["scroll", "tablet"], india: ["coin", "ornament"],
  china: ["statue", "mechanism"], iraq: ["tablet", "scroll"],
  japan: ["sword", "mask"], rome: ["statue", "mechanism"],
  mexico: ["ornament", "statue"], peru: ["ornament", "mechanism"],
};

// 이동(§3, EXPEDITION_ONSITE_RATIO·EXPEDITION_DISTANCE_YIELD_COEFF는 G27/B5로 신설)
export const EXPEDITION_SPEED_KMH = 400;
export const EXPEDITION_ONSITE_MIN_HOURS = 0.1;
export const EXPEDITION_ONSITE_RATIO = 3.0;
export const EXPEDITION_DISTANCE_COST_COEFF = 0.5;
export const EXPEDITION_DISTANCE_YIELD_COEFF = 0.5;
export const EXPEDITION_DISTANCE_REF_KM = 10_000;

// 초기 보너스(§1)
export const HOME_BASE_BONUS_DROPMOD_MULT = 0.85;
export const HOME_BASE_BONUS_DURATION_HOURS = 12;
export const UNEXPLORED_BONUS_APPRAISAL_VOUCHER = 1;

// 이전 규칙(§5)
export const RELOCATION_COOLDOWN_HOURS = 168;
export const FIRST_RELOCATION_FREE_WINDOW_HOURS = 12; // 온보딩 최초 1회 무료 변경 창(B9, ux-v02.md §1.5-6)
// RELOCATION_COST_ASSET_RATIO = 0.10 는 notes/economy.md K6에 이미 정의됨(재정의하지 않음)

// 지도 렌더(§6)
export const MAP_WORLD_DOT_GRID_W = 320;
export const MAP_WORLD_DOT_GRID_H = 160;
export const MAP_DOT_PX = 2;
export const MAP_REGION_ZOOM_FACTOR = 4;
export const COASTLINE_LAND_THRESHOLD = 0.5;
// MAP_ZOOM_LEVELS = 3 는 notes/economy.md(G8)에 이미 정의됨

// 탐색 UX(§7)
export const MAP_BOOKMARK_CAP = 10;
export const RECOMMEND_TOP_N = 3;

// 거점별 시세 모델(§8, MIN/MAX는 G26/B3로 재조정 — 기존 0.90/1.26)
export const REGIONAL_PRICE_MULT_MIN = 0.60;
export const REGIONAL_PRICE_MULT_MAX = 1.40;
export const THEMATIC_PREFERENCE_BONUS = 0.08;
export const ARBITRAGE_MAX_SPREAD_RATIO = 2.33; // = MAX / MIN(파생값). "ENGAGEMENT_UPSIDE_MAX와 정확히 일치" 서술은 G26/B3로 삭제(틀린 서술이었다)
export const PRICE_UPDATE_INTERVAL_HOURS = 6;
export const PRICE_CYCLE_HOURS = 72;
export const PRICE_DRIFT_AMPLITUDE = 0.06;
export const SUPPLY_SHOCK_MAGNITUDE = 0.10;
export const SUPPLY_SHOCK_DECAY_HOURS = 48;

// 정보 비대칭·원거리 교역(§8.5, G19/B4. CLAMP_MAX는 G26/B3로 고정 절대값 재정의 — 기존 1.44.
// PRICE_INTEL_WINDOW_HOURS는 G50/C#3로 삭제 — 48시간 갱신 창 대신 영구 방문 플래그로 단순화)
export const REMOTE_ARBITRAGE_MIN_DISTANCE_KM = 3_000;
export const REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX = 1.60; // 로컬 최댓값(1.40) 대비 +14.3%, 기존과 동일 비율

// 신규 9거점의 unlockCost·layerCostMod·dropMod·tierBias(§1) — 기존 SITES 배열에 추가.
// eras(§1.1의 NEW_SITE_ERAS)는 별도 상수로 분리돼 있다 — 구현 시 SiteDef.eras에 병합한다.
export const NEW_SITE_DEFS: Record<SiteId, {
  unlockCost: number; layerCostMod: number; dropMod: number;
  tierBias: [number, number, number, number, number];
}> = {
  greece: { unlockCost: 3_000_000,   layerCostMod: 1.10, dropMod: 0.95, tierBias: [1.00, 1.05, 1.25, 1.15, 1.05] },
  turkey: { unlockCost: 12_000_000,  layerCostMod: 1.20, dropMod: 0.90, tierBias: [0.95, 1.00, 1.20, 1.25, 1.15] },
  israel: { unlockCost: 20_000_000,  layerCostMod: 1.25, dropMod: 1.05, tierBias: [0.90, 0.95, 1.15, 1.35, 1.40] },
  india:  { unlockCost: 35_000_000,  layerCostMod: 1.15, dropMod: 1.00, tierBias: [1.05, 1.05, 1.00, 0.95, 0.90] },
  china:  { unlockCost: 60_000_000,  layerCostMod: 1.30, dropMod: 1.10, tierBias: [1.20, 1.15, 0.90, 0.85, 0.95] },
  iraq:   { unlockCost: 100_000_000, layerCostMod: 1.35, dropMod: 0.85, tierBias: [0.85, 0.90, 1.10, 1.40, 1.50] },
  japan:  { unlockCost: 150_000_000, layerCostMod: 1.30, dropMod: 0.95, tierBias: [1.10, 1.10, 1.00, 0.90, 0.85] },
  mexico: { unlockCost: 500_000_000, layerCostMod: 1.45, dropMod: 1.00, tierBias: [0.95, 1.00, 1.15, 1.20, 1.30] },
  peru:   { unlockCost: 800_000_000, layerCostMod: 1.50, dropMod: 0.90, tierBias: [0.90, 0.95, 1.10, 1.30, 1.35] },
};
```
