# 유물왕 — 세계지도·거점 설계 (v0.2)

> `prompts/v0.2-deepening.md` §5.1, §8 4단계의 산출물. `notes/decisions.md`의 G2(시즌제)·
> G6(등급 분리)·G7(480종·거점당 분포)·G8(지도 렌더)·G9(도난)와 `notes/economy.md`의
> K5(원정비)·K6(거점 이전비)·§3(가격 공식)·§4(인플레이션 방어)가 이 문서의 전제다.
> 여기서 정하는 거리·시세·거점 목록은 `notes/staff.md`(발굴단 단장의 이동 스탯)와
> `spec.md` v0.2 절(발굴단·원정, 경매장·거래소·암시장)이 그대로 참조한다.

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
(31.3억~104.4억 ₩)가 전부 틀어진다.

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

| 거점 | 인근 유적(앵커) | 인구 | `dropMod` | `layerCostMod` | `unlockCost`(₩, **base 승격 비용** — 원정 자격 아님) | 테마 카테고리 | 초기 보너스(첫 12h) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 경주 | 경주 고분군 | 264,000 | 1.00 | 1.00 | 0(항상 무료) | 도자기·장신구 | dropMod ×0.85 |
| 아테네 | 아크로폴리스 | 3,153,000 | 0.95 | 1.10 | 3,000,000 | 조각·화폐 | dropMod ×0.85 |
| 룩소르 | 왕가의 계곡 | 506,000 | 1.15 | 1.40 | 5,000,000(기존값 유지) | 관·석판 | dropMod ×0.85 |
| 이스탄불 | 콘스탄티노플 유적 | 15,462,000 | 0.90 | 1.20 | 12,000,000 | 장신구·기물 | dropMod ×0.85 |
| 예루살렘 | 구시가 발굴지구 | 936,400 | 1.05 | 1.25 | 20,000,000 | 두루마리·석판 | dropMod ×0.85 |
| 델리 | 델리 술탄왕조 유적군 | 32,065,760 | 1.00 | 1.15 | 35,000,000 | 화폐·장신구 | dropMod ×0.85 |
| 시안 | 병마용 갱 | 12,953,000 | 1.10 | 1.30 | 60,000,000 | 조각·기물 | dropMod ×0.85 |
| 바그다드 | 바빌론·우르 유적 | 7,922,000 | 0.85 | 1.35 | 100,000,000 | 석판·두루마리 | dropMod ×0.85 |
| 교토 | 헤이안쿄 유적·고찰군 | 1,463,000 | 0.95 | 1.30 | 150,000,000 | 검·그림 | dropMod ×0.85 |
| 폼페이 | 폼페이 유적 | 2,185,000 | 0.80 | 1.15 | 300,000,000(기존값 유지) | 조각·기계 | dropMod ×0.85 |
| 멕시코시티 | 테오티우아칸·템플로 마요르 | 21,804,000 | 1.00 | 1.45 | 500,000,000 | 장신구·조각 | dropMod ×0.85 |
| 쿠스코 | 마추픽추·삭사이우아만 | 428,450 | 0.90 | 1.50 | 800,000,000 | 장신구·기물 | dropMod ×0.85 |

`dropMod` 최솟값(0.80, 폼페이)·최댓값(1.15, 룩소르)이 기존 3곳과 정확히 같다 —
economy.md §1.1의 범위를 건드리지 않는다. `tierBias`(층별 티어 가중 보정, 5개
값 T0~T4)와 `eras`(층별 시대 라벨 12개)는 유물 데이터 파이프라인(G7,
`notes/artifacts-dataset.md` 개정, 이번 실행 범위 밖)에서 1차 사료 대조와 함께
확정한다. 신규 9곳의 `tierBias`는 그 파이프라인이 작업할 수 있도록 잠정값을
`balance.ts` 상수 총람(§9)에 남긴다 — tierBias는 `layerExpectedValue`의 분자·분모
양쪽에 들어가 상쇄되므로(economy.md §1.1) 화폐 창출률에 영향을 주지 않고, 어떤
티어가 나오는지에만 영향을 준다. 이 상쇄 성질 때문에 tierBias 잠정값은 이후 데이터
파이프라인에서 조정되어도 §1.1의 수치를 무효화하지 않는다.

**초기 보너스의 통일 공식** (도시마다 다른 숫자를 임의로 배정하지 않고, 하나의
식에 거점별 상수를 대입한다):

```
HOME_BASE_BONUS_DROPMOD_MULT = 0.85
HOME_BASE_BONUS_DURATION_HOURS = 12

첫 12시간 그 거점의 dropMod(실제) = dropMod(원래) × HOME_BASE_BONUS_DROPMOD_MULT
```

모든 거점에 같은 배율을 적용하지만, 원래 `dropMod`가 거점마다 다르므로 체감
효과는 다르다(예: 룩소르를 고르면 1.15 × 0.85 = 0.9775, 폼페이를 고르면
0.80 × 0.85 = 0.68 — 원래 드랍이 뜸한 거점일수록 초반 보너스의 상대적 체감이 크다).
테마 카테고리 우위는 별도 보너스가 아니라 §8의 시세 모델이 만드는 **구조적 결과**다
— 그 거점을 고르면 그 거점의 테마 카테고리를 그 거점 시세로 팔 때 이미 유리하다.

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
| 폼페이 | 40.85 | 14.27 |
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
| 경주 | 0 | 8919 | 9213 | 8792 | 1850 | 8230 | 7509 | 4901 | 12038 | 16754 | 601 | 8330 |
| 룩소르 | 8919 | 0 | 2391 | 1604 | 7244 | 1738 | 1415 | 4397 | 12783 | 12099 | 9491 | 723 |
| 폼페이 | 9213 | 2391 | 0 | 872 | 7950 | 1234 | 2782 | 5785 | 10427 | 10676 | 9679 | 2123 |
| 아테네 | 8792 | 1604 | 872 | 0 | 7380 | 562 | 1931 | 5009 | 11281 | 11421 | 9300 | 1253 |
| 시안 | 1850 | 7244 | 7950 | 7380 | 0 | 6832 | 5863 | 3063 | 13345 | 17707 | 2448 | 6720 |
| 이스탄불 | 8230 | 1738 | 1234 | 562 | 6832 | 0 | 1606 | 4551 | 11427 | 11901 | 8738 | 1168 |
| 바그다드 | 7509 | 1415 | 2782 | 1931 | 5863 | 1606 | 0 | 3162 | 12987 | 13262 | 8078 | 873 |
| 델리 | 4901 | 4397 | 5785 | 5009 | 3063 | 4551 | 3162 | 0 | 14659 | 16421 | 5501 | 4026 |
| 멕시코시티 | 12038 | 12783 | 10427 | 11281 | 13345 | 11427 | 12987 | 14659 | 0 | 4719 | 11639 | 12527 |
| 쿠스코 | 16754 | 12099 | 10676 | 11421 | 17707 | 11901 | 13262 | 16421 | 4719 | 0 | 16350 | 12405 |
| 교토 | 601 | 9491 | 9679 | 9300 | 2448 | 8738 | 8078 | 5501 | 11639 | 16350 | 0 | 8889 |
| 예루살렘 | 8330 | 723 | 2123 | 1253 | 6720 | 1168 | 873 | 4026 | 12527 | 12405 | 8889 | 0 |

최소 거리(0 제외) 601km(경주-교토), 최대 거리 17,707km(쿠스코-시안). 이 두 값이
아래 이동시간·비용 공식의 실효 범위를 정한다.

## 3. 이동 시간·비용 공식

```
EXPEDITION_SPEED_KMH = 400          // 대항해시대풍 선박·대상(隊商) 속도. 여객기 속도가 아니다
EXPEDITION_ONSITE_MIN_HOURS = 0.1   // 6분. 거점 로컬 유적의 최소 현지 작업 시간

이동시간(편도, h) = DISTANCE_KM / EXPEDITION_SPEED_KMH
현지작업시간(h) = max(EXPEDITION_ONSITE_MIN_HOURS, 이동시간)
원정 총 소요시간(h) = 2 × 이동시간 + 현지작업시간
```

거점 로컬 유적(거리 0)은 총 소요 0.1시간(6분) — G11의 "20분 안에 거점 선택 → 첫
원정 → 첫 감정 → 첫 전시" 마일스톤이 여기서 성립한다. 최장거리(쿠스코-시안,
17,707km)는 이동편도 44.3시간, 총 소요 132.9시간(약 5.5일) — 매일 들여다볼 필요가
없는 장기 원정으로, `notes/decisions.md` G3의 관여 예산(하루 2~3회)과 자연히
어긋나지 않는다. 발굴단 단장의 항해술 스탯(`notes/staff.md` §1)이 `EXPEDITION_SPEED_KMH`
자체가 아니라 실효 이동시간의 분모에 곱해져 이 값을 최대 30%까지 줄인다.

원정비(`notes/economy.md` K5, `EXPEDITION_COST_INCOME_RATIO = 0.15`)에 거리
가산을 곱한다:

```
EXPEDITION_DISTANCE_COST_COEFF = 0.5
EXPEDITION_DISTANCE_REF_KM = 10,000

EXPEDITION_DISTANCE_COST_MULT = 1 + EXPEDITION_DISTANCE_COST_COEFF × min(1, DISTANCE_KM / EXPEDITION_DISTANCE_REF_KM)
실제 원정비 = 원정 기대소득 × EXPEDITION_COST_INCOME_RATIO × EXPEDITION_DISTANCE_COST_MULT
```

거리 0 → ×1.0. 10,000km 이상(쿠스코↔유라시아 대부분)에서 ×1.5로 상한. K5 비율형
싱크 원칙(economy.md §0)을 유지한 채 곱연산 가산만 얹었으므로 인플레이션 방어
구조(economy.md §4)는 그대로 성립한다.

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

시작 시 12거점 중 하나를 **무료로 base로** 고른다. 이후 추가 base를 얻는
경로는 두 가지로 나뉜다.

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

`notes/decisions.md` G8(빌드타임 래스터 + 3단 줌)의 구체화다.

```
MAP_ZOOM_LEVELS = 3                 // 세계 → 권역 → 유적
MAP_WORLD_DOT_GRID_W = 320
MAP_WORLD_DOT_GRID_H = 160          // 정거방형 도법 2:1 비율
MAP_DOT_PX = 2                      // 도트 1개 = CSS 2×2px
MAP_REGION_ZOOM_FACTOR = 4          // 권역 단계는 세계 그리드의 1/4 영역을 같은 출력 해상도로 확대
COASTLINE_LAND_THRESHOLD = 0.5
```

**빌드타임 파이프라인**(`scripts/build-worldmap.mjs`, 런타임에서 실행하지 않음):
Natural Earth 1:110m 해안선 벡터(퍼블릭 도메인, GeoJSON) → 정거방형 도법으로
320×160 그리드에 투영 → 각 도트의 육지 비율이 `COASTLINE_LAND_THRESHOLD`를 넘으면
육지, 아니면 해양으로 이진화 → 기존 40색 팔레트(`render/palette.ts`)의 육지·해양
2색을 배정 → data URL로 굽고 `render/worldmap-raster.ts`에 정적 상수로 커밋한다.
런타임은 이 결과만 읊는다 — 협상불가 항목(정적 산출물, 런타임 외부 리소스 금지)을
그대로 지킨다.

- **세계 줌**: 320×160 도트 그리드 전체(CSS 640×320px). 12거점 마커를 실제
  위도·경도 위치에 찍는다.
- **권역 줌**: 마커 클릭 시 그 좌표를 중심으로 `MAP_REGION_ZOOM_FACTOR`배 확대된
  크롭을 같은 출력 해상도로 리샘플. 인근 거점 마커가 함께 보인다.
- **유적 줌**: 새 캔버스를 만들지 않는다 — 기존 `render/strata.ts`의 240×360 지층
  단면 캔버스로 전환한다(v0.1과 동일한 화면, 신규 렌더 파이프라인 불필요).

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
채널별 적용 범위부터 정한다 — **직접매각과 경매장은 로컬**(그 거점의 시세가
적용), **거래소(유저 간)는 전역**(검색으로 매칭하는 특성상 지역성이 없다.
전역 기준가는 `notes/economy.md` §3.2의 24시간 이동평균을 그대로 쓴다), **암시장은
로컬**(그 거점에서 나오는 매물의 구성만 지역을 반영하고, 매입가율은 전역 고정
`BLACK_MARKET_BUY_PRICE_RATIO = 0.4`로 유지한다 — 매입가까지 지역차를 두면 아래
§8.4의 차익거래 상한과 별개로 새로운 화폐 소스가 생긴다). 거래소가 전역이므로 지역
시세와 거래소는 서로 잡아먹지 않는다 — 지역 차익은 "그 거점에서 즉시 판다"는
선택에만 붙는 보상이다.

### 8.1 유물 종류(카테고리)

`Shape` 열거형(`jar, sword, crown, mask, scroll, coin, tablet, statue, ornament,
mechanism`) 10종을 그대로 시세 카테고리로 쓴다. 새 분류를 만들지 않는다.

### 8.2 거점별 수요·유물 종류별 선호

```
REGIONAL_PRICE_MULT_MIN = 0.90
REGIONAL_PRICE_MULT_MAX = 1.26
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

ARBITRAGE_MAX_SPREAD_RATIO = REGIONAL_PRICE_MULT_MAX / REGIONAL_PRICE_MULT_MIN = 1.40
```

하드 클램프이므로 어떤 시점에도 (같은 유물, 최고가 거점 / 최저가 거점)의 비율은
1.40을 넘지 못한다 — 무한 차익거래 루프가 될 수 없다. 그리고 1.40은 우연이
아니다: `notes/decisions.md` G3가 정한 개입 이득 상한(`ENGAGEMENT_UPSIDE_MAX =
0.40`, 손대면 이득이 20~40% 늘어난다)과 **정확히 일치**하도록 두 상수를 맞췄다.
가장 비싼 거점에서 팔도록 직접 챙기면 안 챙겼을 때보다 최대 40% 더 버는 구조라,
세계지도의 "어디서 팔까"라는 개입이 G3의 예산 안에 정확히 들어간다. 이 배율은
직접매각·경매장의 최종 가격에 곱해진다(`notes/economy.md` §3.2의 가격식에 이어
`× LOCAL_PRICE_MULT(그 거점, 그 유물의 shape, 현재 시각)`을 추가한다).

### 8.5 정보 공개 규칙 — 미탐사 거점의 시세는 가려진다 (`notes/decisions.md` G19/B4)

`LOCAL_PRICE_MULT`가 완전 공개된 결정론 함수(해시+sin 드리프트)라 "어디가
비싼지 아는 것"의 가치가 0이었다 — 계산기만 있으면 최적해가 상수였다. 위
§8.2~§8.4의 수식·상수(`REGIONAL_PRICE_MULT_MIN/MAX`, `THEMATIC_PREFERENCE_BONUS`,
`PRICE_DRIFT_AMPLITUDE` 등)는 **바꾸지 않는다** — 그 위에 "정보"라는 축만 얹는다.

```
PRICE_INTEL_WINDOW_HOURS = 48
REMOTE_ARBITRAGE_BONUS_MAX = 1.60
REMOTE_ARBITRAGE_MIN_DISTANCE_KM = 3_000
REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX = REGIONAL_PRICE_MULT_MAX × (REMOTE_ARBITRAGE_BONUS_MAX / ARBITRAGE_MAX_SPREAD_RATIO)
                                  = 1.26 × (1.60 / 1.40) = 1.44
```

1. **미탐사 = 비공개**: 한 번도 발굴단을 파견하지 않은 거점의 `LOCAL_PRICE_MULT`는
   지도·시장 UI에 "미탐사"로만 표시된다.
2. **정보 획득**: 발굴단이 그 거점에 처음 `on_site`로 진입하는 순간, 그 시점부터
   `PRICE_INTEL_WINDOW_HOURS`(48h) 동안의 `LOCAL_PRICE_MULT` 미래값이 즉시
   "정보"로 공개된다(§8.2~§8.4가 전부 결정론적 폐쇄형 함수이므로 미래를 미리
   계산해 보여줄 수 있다 — 서버 부정행위 우려가 없는 정적 계산). 48h는 델리(편도
   12.25h)급 중간 거리 왕복 원정의 총 소요(24.5h 이동 + 12.25h 현지작업 ≈
   36.75h)를 한 번은 덮는 값이다. 창을 넘기면 다시 가려지고, 재방문하면 48h가
   갱신된다.
3. **원거리 교역 상한(정보를 가진 경우에만)**: base로부터
   `REMOTE_ARBITRAGE_MIN_DISTANCE_KM`(3,000km) 이상 떨어진 거점에서, 그 거점의
   시세 정보를 **사전에 획득한 상태로** 직접매각·경매장에 팔면 `LOCAL_PRICE_MULT`
   클램프 상한이 `REGIONAL_PRICE_MULT_MAX`(1.26)에서 `REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX`
   (1.44)로 확장된다. 정보 없이 도박으로 파견해도 기본 클램프(1.26)는 그대로
   받지만, 확장분(1.26~1.44)은 정보를 가진 쪽만 실현한다 — 이게 정보 우위의
   실제 가치다. 이동시간·미스헵 리스크를 이미 지불한 거리에만 적용되므로,
   `notes/decisions.md` G3의 "손대면 20~40%"(비용 없는 개입에 대한 상한)와는
   성격이 다르다 — 위험수당이라 그 밴드를 넘어도 된다.

**버린 선택지**: (i) 시세 완전 비공개(사전 스냅샷도 없음) — 편도 최장 44.3시간인
원정에서 "도착해서야 안다"로 두면 계획 자체를 세울 수 없어 세계지도 활용이
오히려 더 준다. (ii) `ARBITRAGE_MAX_SPREAD_RATIO` 자체를 올린다 — B3(개입 이득
8.3%, 이번 실행 범위 밖)과 얽힌 기존 수치를 다시 열게 된다. 정보라는 새 축을
쌓는 쪽이 기존 수치를 안 건드리고도 문제를 푼다.

## 9. `balance.ts` 상수 총람

```ts
// 거점 정의(§1)
export const MAX_OWNED_SITES = 3;
export const WORLD_CITY_COORDS: Record<SiteId, { lat: number; lon: number }> = {
  korea: { lat: 35.84, lon: 129.22 },
  egypt: { lat: 25.68, lon: 32.64 },
  rome: { lat: 40.85, lon: 14.27 },
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

// 이동(§3)
export const EXPEDITION_SPEED_KMH = 400;
export const EXPEDITION_ONSITE_MIN_HOURS = 0.1;
export const EXPEDITION_DISTANCE_COST_COEFF = 0.5;
export const EXPEDITION_DISTANCE_REF_KM = 10_000;

// 초기 보너스(§1)
export const HOME_BASE_BONUS_DROPMOD_MULT = 0.85;
export const HOME_BASE_BONUS_DURATION_HOURS = 12;
export const UNEXPLORED_BONUS_APPRAISAL_VOUCHER = 1;

// 이전 규칙(§5)
export const RELOCATION_COOLDOWN_HOURS = 168;
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

// 거점별 시세 모델(§8)
export const REGIONAL_PRICE_MULT_MIN = 0.90;
export const REGIONAL_PRICE_MULT_MAX = 1.26;
export const THEMATIC_PREFERENCE_BONUS = 0.08;
export const ARBITRAGE_MAX_SPREAD_RATIO = 1.40; // = MAX / MIN, 파생값이지만 명시적으로 상수화
export const PRICE_UPDATE_INTERVAL_HOURS = 6;
export const PRICE_CYCLE_HOURS = 72;
export const PRICE_DRIFT_AMPLITUDE = 0.06;
export const SUPPLY_SHOCK_MAGNITUDE = 0.10;
export const SUPPLY_SHOCK_DECAY_HOURS = 48;

// 정보 비대칭·원거리 교역(§8.5, G19/B4)
export const PRICE_INTEL_WINDOW_HOURS = 48;
export const REMOTE_ARBITRAGE_BONUS_MAX = 1.60;
export const REMOTE_ARBITRAGE_MIN_DISTANCE_KM = 3_000;
export const REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX = 1.44; // = REGIONAL_PRICE_MULT_MAX × (1.60/1.40)

// 신규 9거점의 unlockCost·layerCostMod·dropMod·tierBias(§1) — 기존 SITES 배열에 추가
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
