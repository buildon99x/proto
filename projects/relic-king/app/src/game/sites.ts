import type { Shape, SiteId } from "./types";

/**
 * 12거점 데이터(v0.2, notes/world-map.md §1·§1.1·§2). 기존 3거점(korea/egypt/rome)은
 * `unlockCost`·`dropMod`·`tierBias`·`eras`를 v0.1 값 그대로 승계한다(economy.md §1.1의
 * 화폐 창출률 범위를 건드리지 않기 위해 — world-map.md §0). 신규 9거점은
 * `NEW_SITE_DEFS`(world-map.md §9)와 `NEW_SITE_ERAS`(§1.1)를 그대로 옮겼다.
 */
export type SiteDef = {
  id: SiteId;
  /** 표시 1차 — 거점 도시명. `SiteId`(지역 슬러그)와 다르다: id는 세이브에 박힌
   *  영속 키라 바꾸지 않고, 화면에 나가는 이름은 전부 이 필드 하나에서 나온다. */
  city: string;
  /** 표시 3차 — 나라. 검색어로도 걸린다("이집트"로 찾으면 룩소르가 나와야 한다) */
  country: string;
  /** 표시 2차 — 그 도시의 발굴 앵커 유적 */
  anchor: string;
  lat: number;
  lon: number;
  population: number;
  unlockCost: number;
  /** 층 비용 계수 — 높을수록 파기 어렵다 */
  layerCostMod: number;
  /** 드랍 임계 계수 — 낮을수록 자주 나온다 */
  dropMod: number;
  /** 층별 시대 라벨 (1층 = 가장 얕고 최근) */
  eras: string[];
  /** 티어 가중 보정 (곱) */
  tierBias: [number, number, number, number, number];
  /** 그 거점이 구조적으로 유리한 유물 종류 2종(world-map.md §8.2 PREFERENCE 가산 대상) */
  thematicCategory: [Shape, Shape];
};

export const SITES: SiteDef[] = [
  {
    id: "korea",
    city: "경주",
    country: "대한민국",
    anchor: "경주 고분군",
    lat: 35.84,
    lon: 129.22,
    population: 264_000,
    unlockCost: 0,
    layerCostMod: 1,
    dropMod: 1,
    eras: [
      "조선 후기", "조선 전기", "고려 후기", "고려 전기",
      "통일신라", "남북국 초", "신라 전성", "신라 중고",
      "가야", "삼국 초", "원삼국", "초기 철기"
    ],
    tierBias: [1, 1, 1, 1, 1],
    thematicCategory: ["jar", "ornament"]
  },
  {
    id: "greece",
    city: "아테네",
    country: "그리스",
    anchor: "아크로폴리스",
    lat: 37.98,
    lon: 23.73,
    population: 3_153_000,
    unlockCost: 3_000_000,
    layerCostMod: 1.10,
    dropMod: 0.95,
    eras: [
      "오스만 지배기", "비잔티움 후기", "비잔티움 중기", "로마 속주기",
      "헬레니즘기", "고전기 말", "고전기 전성(페리클레스 시대)", "페르시아 전쟁기",
      "아르카익기 말", "아르카익기 초", "기하학 문양기", "미케네 문명"
    ],
    tierBias: [1.00, 1.05, 1.25, 1.15, 1.05],
    thematicCategory: ["statue", "coin"]
  },
  {
    id: "egypt",
    city: "룩소르",
    country: "이집트",
    anchor: "왕가의 계곡",
    lat: 25.68,
    lon: 32.64,
    population: 506_000,
    unlockCost: 5_000_000,
    layerCostMod: 1.4,
    dropMod: 1.15,
    eras: [
      "로마 이집트", "프톨레마이오스", "말기 왕조", "제3중간기",
      "신왕국 말", "람세스 시대", "투트모세 시대", "제2중간기",
      "중왕국", "제1중간기", "고왕국", "초기 왕조"
    ],
    tierBias: [0.85, 1, 1.2, 1.6, 1.5],
    thematicCategory: ["crown", "tablet"]
  },
  {
    id: "turkey",
    city: "이스탄불",
    country: "튀르키예",
    anchor: "콘스탄티노플 유적",
    lat: 41.01,
    lon: 28.98,
    population: 15_462_000,
    unlockCost: 12_000_000,
    layerCostMod: 1.20,
    dropMod: 0.90,
    eras: [
      "오스만 후기", "오스만 초기", "비잔티움 말기(팔레올로고스 왕조)",
      "비잔티움 중기(마케도니아 왕조)", "비잔티움 성상파괴기", "유스티니아누스 시대",
      "콘스탄티누스 천도기", "로마 제정 후기", "로마 제정 초", "헬레니즘기",
      "고전 그리스 식민기", "청동기 트로이 문명"
    ],
    tierBias: [0.95, 1.00, 1.20, 1.25, 1.15],
    thematicCategory: ["ornament", "mechanism"]
  },
  {
    id: "israel",
    city: "예루살렘",
    country: "이스라엘",
    anchor: "구시가 발굴지구",
    lat: 31.78,
    lon: 35.22,
    population: 936_400,
    unlockCost: 20_000_000,
    layerCostMod: 1.25,
    dropMod: 1.05,
    eras: [
      "오스만기", "맘루크기", "십자군기", "초기 이슬람기(우마이야·아바스)",
      "비잔티움기", "로마 제정기(제2성전 파괴 이후)", "헤롯 시대(제2성전기)",
      "하스몬 왕조", "페르시아기(제2성전 초)", "신바빌로니아 유수기",
      "왕정기(유다 왕국)", "청동기 가나안"
    ],
    tierBias: [0.90, 0.95, 1.15, 1.35, 1.40],
    thematicCategory: ["scroll", "tablet"]
  },
  {
    id: "india",
    city: "델리",
    country: "인도",
    anchor: "델리 술탄왕조 유적군",
    lat: 28.61,
    lon: 77.21,
    population: 32_065_760,
    unlockCost: 35_000_000,
    layerCostMod: 1.15,
    dropMod: 1.00,
    eras: [
      "영국령 인도", "무굴 후기", "무굴 전성기", "로디 왕조", "투글루크 왕조",
      "킬지 왕조", "노예 왕조(델리 술탄국 초)", "라지푸트기", "굽타 후기",
      "굽타 전성기", "마우리아 왕조", "초기 철기 베다 후기"
    ],
    tierBias: [1.05, 1.05, 1.00, 0.95, 0.90],
    thematicCategory: ["coin", "ornament"]
  },
  {
    id: "china",
    city: "시안",
    country: "중국",
    anchor: "병마용 갱",
    lat: 34.27,
    lon: 108.95,
    population: 12_953_000,
    unlockCost: 60_000_000,
    layerCostMod: 1.30,
    dropMod: 1.10,
    eras: [
      "청대", "명대", "원대", "송대", "당대", "수대", "위진남북조",
      "한대(전한·후한)", "진(秦)대 — 병마용 조성기", "전국시대", "춘추시대", "서주 시대"
    ],
    tierBias: [1.20, 1.15, 0.90, 0.85, 0.95],
    thematicCategory: ["statue", "mechanism"]
  },
  {
    id: "iraq",
    city: "바그다드",
    country: "이라크",
    anchor: "바빌론·우르 유적",
    lat: 33.31,
    lon: 44.36,
    population: 7_922_000,
    unlockCost: 100_000_000,
    layerCostMod: 1.35,
    dropMod: 0.85,
    eras: [
      "오스만기", "아바스 칼리프국", "사산조 페르시아", "파르티아기", "셀레우코스기",
      "신바빌로니아(네부카드네자르 시대)", "아시리아 제국기", "카시트기",
      "고바빌로니아(함무라비 시대)", "아카드 제국기", "초기 왕조기(수메르 도시국가)", "우루크기"
    ],
    tierBias: [0.85, 0.90, 1.10, 1.40, 1.50],
    thematicCategory: ["tablet", "scroll"]
  },
  {
    id: "japan",
    city: "교토",
    country: "일본",
    anchor: "헤이안쿄 유적·고찰군",
    lat: 35.01,
    lon: 135.77,
    population: 1_463_000,
    unlockCost: 150_000_000,
    layerCostMod: 1.30,
    dropMod: 0.95,
    eras: [
      "메이지 유신기", "에도 시대", "아즈치모모야마 시대", "무로마치 시대",
      "가마쿠라 시대", "헤이안 후기(인세이기)", "헤이안 전성기(고쿠후 문화)",
      "헤이안 천도기", "나라 시대", "아스카 시대", "고훈 시대", "야요이 시대"
    ],
    tierBias: [1.10, 1.10, 1.00, 0.90, 0.85],
    thematicCategory: ["sword", "mask"]
  },
  {
    id: "rome",
    city: "폼페이",
    country: "이탈리아",
    anchor: "폼페이 유적",
    // 폼페이 유적(40.75/14.49). v0.3까지 박혀 있던 40.85/14.27은 나폴리였다 —
    // 이름("로마")·앵커("폼페이 유적")·좌표(나폴리) 셋이 서로 다른 곳을 가리켰다
    // (notes/decisions.md G69.3). 인구 218.5만은 §1이 밝힌 대로 광역권 근사치라
    // 나폴리 광역권 기준이고, 폼페이는 그 안에 있으므로 그대로 둔다.
    lat: 40.75,
    lon: 14.49,
    population: 2_185_000,
    unlockCost: 300_000_000,
    layerCostMod: 1.15,
    dropMod: 0.8,
    eras: [
      "중세 초", "서로마 말", "제정 후기", "제정 중기",
      "5현제 시대", "율리우스 왕조", "제정 초", "공화정 말",
      "공화정 중기", "포에니 전쟁기", "공화정 초", "왕정기"
    ],
    tierBias: [1.15, 1.1, 0.95, 0.8, 0.9],
    thematicCategory: ["statue", "mechanism"]
  },
  {
    id: "mexico",
    city: "멕시코시티",
    country: "멕시코",
    anchor: "테오티우아칸·템플로 마요르",
    lat: 19.43,
    lon: -99.13,
    population: 21_804_000,
    unlockCost: 500_000_000,
    layerCostMod: 1.45,
    dropMod: 1.00,
    eras: [
      "스페인 식민 초기", "아스텍 제국 전성기", "아스텍 건국기(테노치티틀란)",
      "톨텍 문명", "후기 고전기 쇠퇴기", "테오티우아칸 전성기", "테오티우아칸 건설기",
      "초기 고전기", "프레클래식 말기(초기 도시화)", "올멕 후기", "올멕 전성기", "프레클래식 초기"
    ],
    tierBias: [0.95, 1.00, 1.15, 1.20, 1.30],
    thematicCategory: ["ornament", "statue"]
  },
  {
    id: "peru",
    city: "쿠스코",
    country: "페루",
    anchor: "마추픽추·삭사이우아만",
    lat: -13.53,
    lon: -71.97,
    population: 428_450,
    unlockCost: 800_000_000,
    layerCostMod: 1.50,
    dropMod: 0.90,
    eras: [
      "스페인 정복 직후", "잉카 제국 전성기(파차쿠티 시대)", "잉카 건국기",
      "치무 왕국", "와리 제국", "티와나쿠 문명", "모체 문명 후기", "모체 문명 전기",
      "나스카 문명", "파라카스 문명", "차빈 문명", "초기 형성기(카랄 문명)"
    ],
    tierBias: [0.90, 0.95, 1.10, 1.30, 1.35],
    thematicCategory: ["ornament", "mechanism"]
  }
];

/**
 * 유물 종류의 한국어 라벨(notes/world-map.md §1 테마 카테고리 표기). 검색이
 * "도자기"·"장신구"로도 걸려야 하는데 `Shape`는 영문 슬러그뿐이라 여기서 잇는다.
 * 게임 데이터라 `game/`에 둔다 — UI가 제 나름의 번역표를 또 갖게 하지 않는다.
 */
export const SHAPE_LABEL: Record<Shape, string> = {
  jar: "도자기",
  sword: "검",
  crown: "관",
  mask: "가면",
  scroll: "두루마리",
  coin: "화폐",
  tablet: "석판",
  statue: "조각",
  ornament: "장신구",
  mechanism: "기물"
};

/**
 * 거점 표시 규칙(작업 지시 B4, 전 화면 공통) — **1차 도시명 · 2차 앵커 유적 · 3차 나라**.
 * 화면마다 제각기 조합하면 어느 화면은 나라를, 어느 화면은 도시를 부르게 된다.
 *
 *   siteTitle("egypt")    → "룩소르 — 왕가의 계곡"   (시트·모달 제목)
 *   siteTitle("korea")    → "경주 — 고분군"           (앵커의 도시명 중복은 떼어 낸다)
 *   siteSubtitle("egypt") → "이집트"                 (그 밑 부제)
 *   SITE_BY_ID.egypt.city → "룩소르"                 (목록·로그·상태줄의 단독 표기)
 */
export function siteTitle(id: SiteId): string {
  const s = SITE_BY_ID[id];
  return `${s.city} — ${siteAnchorLabel(s)}`;
}

/**
 * 도시명 옆에 붙일 앵커 표기. 앵커가 도시명으로 시작하면 그 앞머리를 떼어 낸다 —
 * 떼지 않으면 "경주 경주 고분군", "델리 델리 술탄왕조 유적군", "폼페이 폼페이 유적"이
 * 된다(실제 화면 3곳에서 그렇게 나왔다). 도시명이 안 들어간 앵커는 그대로 둔다.
 * 단독으로 쓰는 자리(검색·상세)는 `def.anchor` 원문을 그대로 쓴다.
 */
export function siteAnchorLabel(def: SiteDef): string {
  return def.anchor.startsWith(`${def.city} `) ? def.anchor.slice(def.city.length + 1) : def.anchor;
}

export function siteSubtitle(id: SiteId): string {
  return SITE_BY_ID[id].country;
}

/** 검색 대상 문자열 — 도시명·나라·앵커·유물 종류(한국어·영문 슬러그) 전부.
 *  나라 이름을 화면 1차에서 내렸다고 검색에서까지 내리면 플레이어가 길을 잃는다. */
export function siteSearchText(def: SiteDef): string {
  return [
    def.city,
    def.country,
    def.anchor,
    ...def.thematicCategory,
    ...def.thematicCategory.map((c) => SHAPE_LABEL[c])
  ].join(" ").toLowerCase();
}

export const SITE_BY_ID: Record<SiteId, SiteDef> = Object.fromEntries(
  SITES.map((s) => [s.id, s])
) as Record<SiteId, SiteDef>;

/** world-map.md §9 문서 이름과의 호환을 위한 파생 맵(단일 소스는 위 SITES다) */
export const WORLD_CITY_COORDS: Record<SiteId, { lat: number; lon: number }> = Object.fromEntries(
  SITES.map((s) => [s.id, { lat: s.lat, lon: s.lon }])
) as Record<SiteId, { lat: number; lon: number }>;
export const CITY_POPULATION: Record<SiteId, number> = Object.fromEntries(
  SITES.map((s) => [s.id, s.population])
) as Record<SiteId, number>;
export const SITE_THEMATIC_CATEGORY: Record<SiteId, [Shape, Shape]> = Object.fromEntries(
  SITES.map((s) => [s.id, s.thematicCategory])
) as Record<SiteId, [Shape, Shape]>;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 대원 거리(haversine, km). 권역 그래프 홉이 아니라 실제 지리 거리를 쓴다
 * (notes/world-map.md §2) — "경주-교토는 가깝고 경주-쿠스코는 지구 반대편"이라는
 * 감각이 계산 없이도 맞아떨어지도록.
 */
export function distanceKm(a: SiteId, b: SiteId): number {
  if (a === b) return 0;
  const A = SITE_BY_ID[a];
  const B = SITE_BY_ID[b];
  const R = 6371;
  const dLat = toRad(B.lat - A.lat);
  const dLon = toRad(B.lon - A.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(A.lat)) * Math.cos(toRad(B.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
