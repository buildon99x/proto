/**
 * 메트로폴리탄 오픈액세스 레코드를 이 게임의 12거점·12층 연대에 배치하는 분류표.
 *
 * 수집 파이프라인(notes/artifacts-dataset.md §7)의 1단계다. 여기 있는 건 전부
 * **사실 대조 규칙**이지 게임 밸런스가 아니다 — 어떤 문화권 유물이 어느 거점에
 * 속하고 어느 시대에 놓이는가는 역사가 정하지 우리가 정하지 않는다.
 *
 * 연대 밴드는 **겹쳐도 된다.** `eraIndexFor()`가 그 해를 담는 밴드 중 가장 좁은
 * 것을 고른다 — 로마의 "포에니 전쟁기"가 "공화정 중기" 안에 들어 있는 것 같은
 * 실제 역사의 포함 관계를 억지로 펴지 않기 위해서다. 거점의 eras 배열 순서
 * (app/src/game/sites.ts, 1층 = 가장 얕고 최근)는 그대로 지킨다.
 */

/** 거점별 12층 연대 밴드. 인덱스 0 = 1층(가장 최근). [from, to] 단위는 년(음수 = 기원전) */
export const ERA_BANDS = {
  korea: [
    ["조선 후기", 1700, 1910], ["조선 전기", 1392, 1700],
    ["고려 후기", 1170, 1392], ["고려 전기", 918, 1170],
    ["통일신라", 780, 918], ["남북국 초", 668, 780],
    ["신라 전성", 500, 668], ["신라 중고", 356, 500],
    ["가야", 42, 356], ["삼국 초", -57, 42],
    ["원삼국", -300, -57], ["초기 철기", -1500, -300]
  ],
  greece: [
    ["오스만 지배기", 1453, 1830], ["비잔티움 후기", 1204, 1453],
    ["비잔티움 중기", 600, 1204], ["로마 속주기", -146, 600],
    ["헬레니즘기", -323, -146], ["고전기 말", -404, -323],
    ["고전기 전성(페리클레스 시대)", -450, -404], ["페르시아 전쟁기", -499, -450],
    ["아르카익기 말", -560, -499], ["아르카익기 초", -700, -560],
    ["기하학 문양기", -900, -700], ["미케네 문명", -1600, -900]
  ],
  egypt: [
    ["로마 이집트", -30, 641], ["프톨레마이오스", -332, -30],
    ["말기 왕조", -664, -332], ["제3중간기", -1069, -664],
    ["신왕국 말", -1189, -1069], ["람세스 시대", -1292, -1189],
    ["투트모세 시대", -1550, -1292], ["제2중간기", -1650, -1550],
    ["중왕국", -2055, -1650], ["제1중간기", -2181, -2055],
    ["고왕국", -2686, -2181], ["초기 왕조", -3100, -2686]
  ],
  turkey: [
    ["오스만 후기", 1700, 1922], ["오스만 초기", 1453, 1700],
    ["비잔티움 말기(팔레올로고스 왕조)", 1261, 1453], ["비잔티움 중기(마케도니아 왕조)", 843, 1261],
    ["비잔티움 성상파괴기", 726, 843], ["유스티니아누스 시대", 527, 726],
    ["콘스탄티누스 천도기", 330, 527], ["로마 제정 후기", 96, 330],
    ["로마 제정 초", -27, 96], ["헬레니즘기", -323, -27],
    ["고전 그리스 식민기", -800, -323], ["청동기 트로이 문명", -3000, -800]
  ],
  israel: [
    ["오스만기", 1517, 1917], ["맘루크기", 1291, 1517],
    ["십자군기", 1099, 1291], ["초기 이슬람기(우마이야·아바스)", 638, 1099],
    ["비잔티움기", 324, 638], ["로마 제정기(제2성전 파괴 이후)", 70, 324],
    ["헤롯 시대(제2성전기)", -37, 70], ["하스몬 왕조", -140, -37],
    ["페르시아기(제2성전 초)", -539, -140], ["신바빌로니아 유수기", -605, -539],
    ["왕정기(유다 왕국)", -930, -605], ["청동기 가나안", -3300, -930]
  ],
  india: [
    ["영국령 인도", 1757, 1947], ["무굴 후기", 1707, 1757],
    ["무굴 전성기", 1526, 1707], ["로디 왕조", 1451, 1526],
    ["투글루크 왕조", 1320, 1451], ["킬지 왕조", 1290, 1320],
    ["노예 왕조(델리 술탄국 초)", 1206, 1290], ["라지푸트기", 700, 1206],
    ["굽타 후기", 450, 700], ["굽타 전성기", 320, 450],
    ["마우리아 왕조", -322, 320], ["초기 철기 베다 후기", -1500, -322]
  ],
  china: [
    ["청대", 1644, 1912], ["명대", 1368, 1644],
    ["원대", 1271, 1368], ["송대", 960, 1271],
    ["당대", 618, 960], ["수대", 581, 618],
    ["위진남북조", 220, 581], ["한대(전한·후한)", -206, 220],
    ["진(秦)대 — 병마용 조성기", -221, -206], ["전국시대", -475, -221],
    ["춘추시대", -770, -475], ["서주 시대", -1046, -770]
  ],
  iraq: [
    ["오스만기", 1534, 1918], ["아바스 칼리프국", 750, 1534],
    ["사산조 페르시아", 224, 750], ["파르티아기", -247, 224],
    ["셀레우코스기", -312, -247], ["신바빌로니아(네부카드네자르 시대)", -626, -312],
    ["아시리아 제국기", -911, -626], ["카시트기", -1595, -911],
    ["고바빌로니아(함무라비 시대)", -1894, -1595], ["아카드 제국기", -2334, -1894],
    ["초기 왕조기(수메르 도시국가)", -2900, -2334], ["우루크기", -4000, -2900]
  ],
  japan: [
    ["메이지 유신기", 1868, 1912], ["에도 시대", 1603, 1868],
    ["아즈치모모야마 시대", 1568, 1603], ["무로마치 시대", 1336, 1568],
    ["가마쿠라 시대", 1185, 1336], ["헤이안 후기(인세이기)", 1068, 1185],
    ["헤이안 전성기(고쿠후 문화)", 894, 1068], ["헤이안 천도기", 794, 894],
    ["나라 시대", 710, 794], ["아스카 시대", 538, 710],
    ["고훈 시대", 250, 538], ["야요이 시대", -300, 250]
  ],
  rome: [
    ["중세 초", 476, 800], ["서로마 말", 395, 476],
    ["제정 후기", 284, 395], ["제정 중기", 180, 284],
    ["5현제 시대", 96, 180], ["율리우스 왕조", 14, 96],
    ["제정 초", -27, 14], ["공화정 말", -133, -27],
    ["공화정 중기", -287, -133], ["포에니 전쟁기", -264, -146],
    ["공화정 초", -509, -287], ["왕정기", -753, -509]
  ],
  mexico: [
    ["스페인 식민 초기", 1521, 1700], ["아스텍 제국 전성기", 1428, 1521],
    ["아스텍 건국기(테노치티틀란)", 1325, 1428], ["톨텍 문명", 900, 1168],
    ["후기 고전기 쇠퇴기", 650, 900], ["테오티우아칸 전성기", 250, 650],
    ["테오티우아칸 건설기", -100, 250], ["초기 고전기", 200, 600],
    ["프레클래식 말기(초기 도시화)", -400, -100], ["올멕 후기", -900, -400],
    ["올멕 전성기", -1200, -900], ["프레클래식 초기", -2000, -1200]
  ],
  peru: [
    ["스페인 정복 직후", 1532, 1700], ["잉카 제국 전성기(파차쿠티 시대)", 1438, 1532],
    ["잉카 건국기", 1200, 1438], ["치무 왕국", 900, 1470],
    ["와리 제국", 600, 1000], ["티와나쿠 문명", 500, 1000],
    ["모체 문명 후기", 400, 800], ["모체 문명 전기", 100, 400],
    ["나스카 문명", -100, 800], ["파라카스 문명", -800, -100],
    ["차빈 문명", -900, -200], ["초기 형성기(카랄 문명)", -3000, -900]
  ]
};

/**
 * 문화(Culture) 문자열 → [거점, 층]. 층이 `null`이면 거점만 정하고 시대는 연도가 결정한다.
 * 국가·광역권 이름(Peru·Japan·Roman…)은 수천 년을 덮으므로 반드시 `null`이다 —
 * 고정했더니 17세기 아이마라 튜닉이 티와나쿠 층(6세기)에 박히는 오류가 났다.
 * 시대 이름이기도 한 문화(모체·나스카·아시리아·미노아…)만 층을 직접 갖는다.
 *
 * (원문) 문화 문자열이 거점과 층을 **직접** 지정하는 경우. 미주·고대근동은
 * 문화 이름 자체가 시대 이름이라(모체·나스카·아시리아…) 연도 추정보다 이쪽이 정확하다.
 * 값은 [siteId, 1-based 층]. 부분 일치(소문자 포함)로 검사하므로 긴 것을 앞에 둔다.
 */
export const CULTURE_DIRECT = [
  // ── 페루 ──
  ["inca", ["peru", 2]], ["chimú", ["peru", 4]], ["chimu", ["peru", 4]],
  ["chancay", ["peru", 4]], ["ica", ["peru", 4]],
  ["wari", ["peru", 5]], ["huari", ["peru", 5]],
  ["tiwanaku", ["peru", 6]], ["tiahuanaco", ["peru", 6]], ["aymara", ["peru", null]],
  ["moche", ["peru", 7]], ["vicús", ["peru", 8]], ["vicus", ["peru", 8]],
  ["nasca", ["peru", 9]], ["nazca", ["peru", 9]],
  ["paracas", ["peru", 10]], ["chavín", ["peru", 11]], ["chavin", ["peru", 11]],
  ["cupisnique", ["peru", 11]], ["peruvian", ["peru", null]], ["peru", ["peru", null]],
  ["bolivia", ["peru", null]], ["ecuador", ["peru", null]],
  // ── 멕시코·중미 ──
  ["aztec", ["mexico", 2]], ["mexica", ["mexico", 2]],
  ["toltec", ["mexico", 4]], ["huastec", ["mexico", 5]], ["mixtec", ["mexico", 5]],
  ["zapotec", ["mexico", 6]], ["teotihuacan", ["mexico", 6]],
  ["maya", ["mexico", 6]], ["veracruz", ["mexico", 6]],
  ["olmec", ["mexico", 11]], ["mezcala", ["mexico", 9]], ["guerrero", ["mexico", 9]],
  ["colima", ["mexico", 7]], ["nayarit", ["mexico", 7]], ["jalisco", ["mexico", 7]],
  ["tlatilco", ["mexico", 12]], ["mexican", ["mexico", null]],
  ["costa rica", ["mexico", null]], ["atlantic watershed", ["mexico", null]],
  ["panama", ["mexico", null]], ["honduras", ["mexico", null]], ["guatemala", ["mexico", null]],
  // ── 이라크·이란(고대근동) ──
  ["neo-sumerian", ["iraq", 10]], ["sumerian", ["iraq", 11]],
  ["akkadian", ["iraq", 10]], ["assyro-babylonian", ["iraq", 7]],
  ["old assyrian trading colony", ["turkey", 12]],
  ["assyrian", ["iraq", 7]], ["babylonian", ["iraq", 6]], ["kassite", ["iraq", 8]],
  ["achaemenid", ["iraq", 5]], ["seleucid", ["iraq", 5]],
  ["parthian", ["iraq", 4]], ["sasanian", ["iraq", 3]],
  ["elamite", ["iraq", 8]], ["ubaid", ["iraq", 12]], ["uruk", ["iraq", 12]],
  ["bactria-margiana", ["iraq", 9]], ["scythian", ["iraq", 5]], ["alanic", ["iraq", 4]],
  ["iran", ["iraq", null]], ["mesopotamia", ["iraq", null]],
  // ── 튀르키예(아나톨리아) ──
  ["hittite", ["turkey", 12]], ["hattian", ["turkey", 12]], ["urartian", ["turkey", 12]],
  ["lydian", ["turkey", 11]], ["sardis", ["turkey", 11]], ["anatolia", ["turkey", null]],
  ["yortan", ["turkey", 12]], ["phrygian", ["turkey", 11]], ["byzantine", ["turkey", null]],
  // ── 이스라엘·레반트 ──
  ["israelite", ["israel", 11]], ["canaanite", ["israel", 12]],
  ["ghassulian", ["israel", 12]], ["edomite", ["israel", 11]],
  ["phoenician", ["israel", 11]], ["nabataean", ["israel", 6]],
  ["syro-anatolian-levantine", ["israel", null]], ["levant", ["israel", null]],
  // ── 그리스·로마 ──
  ["minoan", ["greece", 12]], ["mycenaean", ["greece", 12]], ["helladic", ["greece", 12]],
  ["cycladic", ["greece", 12]], ["aegean", ["greece", null]],
  ["greek, attic", ["greece", null]], ["greek, laconian", ["greece", null]],
  ["greek, corinthian", ["greece", null]], ["greek, boeotian", ["greece", null]],
  ["greek, cretan", ["greece", null]], ["greek, cypriot", ["greece", null]],
  ["east greek", ["greece", null]], ["cypriot", ["greece", null]],
  ["greek, south italian", ["rome", null]], ["etruscan", ["rome", 11]],
  ["villanovan", ["rome", 12]], ["italic", ["rome", null]],
  ["roman", ["rome", null]], ["greek", ["greece", null]],
  // ── 동아시아·남아시아 ──
  ["japan", ["japan", null]], ["ryūkyū", ["japan", null]],
  ["korea", ["korea", null]],
  ["china", ["china", null]], ["north china", ["china", null]], ["northwest china", ["china", null]],
  ["northeast china", ["china", null]], ["tibet", ["china", null]], ["xinjiang", ["china", null]],
  ["gandhara", ["india", 11]], ["pakistan", ["india", null]], ["baluchistan", ["india", null]],
  ["kashmir", ["india", null]], ["nepal", ["india", null]], ["bengal", ["india", null]],
  ["gujarat", ["india", null]], ["sri lanka", ["india", null]], ["india", ["india", null]],
  ["indus", ["india", 12]]
];

/** 국가(Country)/지역(Region) 문자열 → 거점. 이슬람부는 Culture가 비어 있어 여기에 의존한다 */
export const COUNTRY_SITE = [
  ["egypt", "egypt"], ["iraq", "iraq"], ["iran", "iraq"], ["mesopotamia", "iraq"],
  ["turkey", "turkey"], ["anatolia", "turkey"], ["asia minor", "turkey"],
  ["syria", "israel"], ["israel", "israel"], ["palestine", "israel"], ["jordan", "israel"],
  ["lebanon", "israel"], ["jerusalem", "israel"],
  ["india", "india"], ["pakistan", "india"], ["nepal", "india"], ["afghanistan", "india"],
  ["china", "china"], ["japan", "japan"], ["korea", "korea"],
  ["greece", "greece"], ["cyprus", "greece"], ["italy", "rome"],
  ["mexico", "mexico"], ["guatemala", "mexico"], ["costa rica", "mexico"], ["panama", "mexico"],
  ["peru", "peru"], ["bolivia", "peru"], ["ecuador", "peru"], ["chile", "peru"],
  ["spain", "rome"], ["morocco", "israel"], ["tunisia", "rome"], ["uzbekistan", "iraq"],
  ["central asia", "iraq"], ["azerbaijan", "iraq"], ["armenia", "turkey"]
];

/** 부서만으로 정해지는 거점(문화·국가가 비었을 때의 최종 기본값) */
export const DEPARTMENT_DEFAULT = {
  "Egyptian Art": "egypt",
  "Greek and Roman Art": "greece",
  "Ancient Near Eastern Art": "iraq",
  "Islamic Art": "turkey",
  "Asian Art": null,                                  // 문화가 없으면 버린다(중국/일본 구분 불가)
  "Arts of Africa, Oceania, and the Americas": null   // 아프리카·오세아니아는 거점이 없다 — 버린다
};

/** 이집트부 Period/Dynasty 문자열 → 층(1-based). Culture가 없어 이 필드가 유일한 단서다 */
export const EGYPT_PERIOD_DIRECT = [
  ["roman period", 1], ["ptolemaic", 2], ["late period", 3], ["third intermediate", 4],
  ["dynasty 25", 4], ["dynasty 21", 4], ["dynasty 22", 4], ["dynasty 20", 5],
  ["ramesside", 6], ["dynasty 19", 6], ["dynasty 18", 7], ["new kingdom", 7],
  ["second intermediate", 8], ["dynasty 17", 8], ["dynasty 12", 9], ["middle kingdom", 9],
  ["dynasty 11", 9], ["first intermediate", 10], ["dynasty 6", 11], ["dynasty 5", 11],
  ["dynasty 4", 11], ["old kingdom", 11], ["early dynastic", 12], ["predynastic", 12]
];

/**
 * 12거점 중 어디에도 속하지 않는 문화권. 아프리카·오세아니아·북미·동남아는 이 게임에
 * 거점이 없다 — 국가 필드만 보고 억지로 붙이면 라파누이 석상이 페루 발굴에서 나온다
 * (실제로 났다). 거점을 늘리기 전까지는 후보에서 뺀다.
 */
export const OUT_OF_SCOPE = [
  "rapa nui", "easter island", "polynesia", "melanesia", "micronesia", "hawaii", "maori",
  "fiji", "samoa", "tonga", "vanuatu", "new guinea", "papua", "sepik", "asmat", "kwoma",
  "australia", "aboriginal", "philippines", "indonesia", "javanese", "java", "borneo",
  "kalimantan", "sumatra", "sulawesi", "lampung", "batak", "nias", "timor", "bali",
  "malaysia", "thailand", "vietnam", "cambodia", "myanmar", "burma", "laos",
  "inuit", "cheyenne", "navajo", "pueblo", "hopi", "zuni", "apache", "sioux",
  "yoruba", "dogon", "kuba", "bamana", "senufo", "baule", "dan peoples", "edo peoples",
  "fon peoples", "igbo", "akan", "ashanti", "benin", "kongo", "luba", "chokwe",
  "mali", "nigeria", "ghana", "cameroon", "congo", "angola", "ethiopia", "sudan",
  "africa", "oceania", "siberia", "mongolia", "switzerland"
];

const norm = (s) => (s || "").toLowerCase();

/** 문화·국가·부서를 순서대로 보고 거점과(알 수 있으면) 층을 정한다 */
export function classify(row) {
  const culture = norm(row.culture);
  const scope = norm(`${row.culture} ${row.country} ${row.region} ${row.subregion}`);
  for (const bad of OUT_OF_SCOPE) if (scope.includes(bad)) return null;
  if (culture) {
    for (const [key, val] of CULTURE_DIRECT) {
      if (culture.includes(key)) return { site: val[0], era: val[1] ?? null };
    }
  }
  const geo = norm(`${row.country} ${row.region} ${row.subregion} ${row.excavation}`);
  if (geo.trim()) {
    for (const [key, site] of COUNTRY_SITE) {
      if (geo.includes(key)) return { site, era: null };
    }
  }
  const fallback = DEPARTMENT_DEFAULT[row.department];
  return fallback ? { site: fallback, era: null } : null;
}

/** 연도를 그 거점의 12층 라벨 중 하나로 접는다 — 담는 밴드 중 **가장 좁은** 것 */
export function eraIndexFor(site, year) {
  const bands = ERA_BANDS[site];
  if (!bands || year === null || Number.isNaN(year)) return null;
  let best = null;
  let bestWidth = Infinity;
  bands.forEach(([, from, to], i) => {
    if (year >= from && year <= to) {
      const width = to - from;
      if (width < bestWidth) { bestWidth = width; best = i + 1; }
    }
  });
  if (best !== null) return best;
  // 어느 밴드에도 안 들어가면 가장 가까운 경계를 가진 밴드로 붙인다
  let nearest = 1;
  let nearestDist = Infinity;
  bands.forEach(([, from, to], i) => {
    const d = year < from ? from - year : year - to;
    if (d < nearestDist) { nearestDist = d; nearest = i + 1; }
  });
  return nearest;
}

export function eraLabel(site, eraIndex) {
  return ERA_BANDS[site][eraIndex - 1][0];
}
