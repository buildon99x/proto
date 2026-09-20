/**
 * data/met-species.json → app/src/game/artifacts.generated.ts
 *
 *   node scripts/build-artifacts.mjs [목표종수]
 *
 * 손으로 쓴 280종(app/src/game/artifacts.ts)은 건드리지 않는다. 이 스크립트가
 * 만드는 건 그 위에 얹히는 확장분이고, 둘을 합친 총 종수가 목표(기본 2000)다.
 *
 * ── 티어를 어떻게 정하는가 (중요) ──────────────────────────────────────────
 * 이 게임의 티어는 **현실의 현존 개체 수**다(notes/artifacts-dataset.md §1).
 * 그런데 그 수를 적어 둔 필드는 어느 오픈액세스 데이터에도 없다. 그래서 여기서는
 * 대리 지표를 쓴다 — **메트 한 곳의 소장 점수**다. 한 박물관이 같은 종류를 N점
 * 갖고 있으면 세계 전체에는 최소 그만큼 있다는 하한이 되기 때문이다.
 *
 * 하한이라는 성질 때문에 이 추정은 **항상 흔한 쪽으로만 틀린다** — §1이 명시한
 * "애매하면 더 흔한 쪽으로 내린다"와 방향이 같다. 그래서 이 파이프라인은
 * **T3·T4를 절대 만들지 않는다.** "국보급"과 "세상에 하나"는 사람이 근거를 들고
 * 판정할 일이지 소장 점수로 추론할 일이 아니다 — 그 두 티어는 손으로 쓴 280종이
 * 독점한다(거점당 T4 쿼터 1도 그래서 그대로 지켜진다).
 */
import fs from "node:fs";
import { LEXICON } from "./lexicon.mjs";
import { ERA_BANDS } from "./taxonomy.mjs";

const TARGET_TOTAL = Number(process.argv[2] ?? 2000);
const HANDWRITTEN = 280; // app/src/game/artifacts.ts의 손글씨 종수(아래에서 실측 검증)

const data = JSON.parse(fs.readFileSync(new URL("../data/met-species.json", import.meta.url), "utf8"));

// ── 재질 → 한국어·팔레트 ────────────────────────────────────────────────
const MEDIUM = [
  ["gilt bronze", "금동", "gold"], ["bronze", "청동", "silver"], ["brass", "놋쇠", "gold"],
  ["copper alloy", "동합금", "silver"], ["cupreous", "구리질 금속", "silver"], ["copper", "구리", "silver"],
  ["gold", "금", "gold"], ["silver", "은", "silver"], ["electrum", "호박금", "gold"],
  ["iron", "철", "silver"], ["steel", "강철", "silver"], ["lead", "납", "silver"],
  ["terracotta", "테라코타", "earthenware"], ["earthenware", "질그릇", "earthenware"],
  ["stoneware", "석기(炻器)", "celadon"], ["porcelain", "자기", "celadon"],
  ["ceramic", "도자", "celadon"], ["pottery", "토기", "earthenware"],
  ["stonepaste", "석고토", "celadon"], ["faience", "파이앙스", "glass"],
  ["clay", "점토", "earthenware"], ["mud", "흙", "earthenware"],
  ["glass", "유리", "glass"], ["rock crystal", "수정", "glass"],
  ["limestone", "석회암", "stone"], ["sandstone", "사암", "stone"], ["marble", "대리석", "stone"],
  ["travertine", "트래버틴", "stone"], ["basalt", "현무암", "stone"], ["diorite", "섬록암", "stone"],
  ["schist", "편암", "stone"], ["steatite", "동석", "stone"], ["gypsum", "석고", "stone"],
  ["alabaster", "설화석고", "stone"], ["flint", "부싯돌", "stone"], ["obsidian", "흑요석", "stone"],
  ["jadeite", "경옥", "celadon"], ["nephrite", "연옥", "celadon"], ["jade", "옥", "celadon"],
  ["carnelian", "홍옥수", "glass"], ["chalcedony", "옥수", "glass"], ["agate", "마노", "glass"],
  ["jasper", "벽옥", "stone"], ["hematite", "적철석", "stone"], ["sardonyx", "홍줄마노", "glass"],
  ["amber", "호박", "glass"], ["lapis", "청금석", "glass"], ["turquoise", "터키석", "glass"],
  ["ivory", "상아", "wood"], ["bone", "뼈", "wood"], ["shell", "조개껍데기", "wood"],
  ["antler", "사슴뿔", "wood"], ["horn", "뿔", "wood"], ["leather", "가죽", "wood"],
  ["lacquer", "칠기", "wood"], ["wood", "나무", "wood"], ["bamboo", "대나무", "wood"],
  ["silk", "비단", "gold"], ["cotton", "무명", "wood"], ["linen", "아마포", "wood"],
  ["wool", "양모", "wood"], ["camelid hair", "낙타과 짐승털", "wood"],
  ["paper", "종이", "wood"], ["ink", "먹", "wood"], ["stone", "돌", "stone"]
];
function mediumInfo(raw) {
  const s = (raw || "").toLowerCase();
  for (const [needle, ko, palette] of MEDIUM) if (s.includes(needle)) return { ko, palette };
  return null;
}

// ── 출토지 한국어 표기 ──────────────────────────────────────────────────
const SITE_KO = {
  korea: "한반도", egypt: "이집트", rome: "이탈리아", greece: "그리스", turkey: "튀르키예",
  israel: "레반트", india: "인도", china: "중국", iraq: "메소포타미아", japan: "일본",
  mexico: "메소아메리카", peru: "안데스"
};
const PLACE_KO = [
  ["upper egypt, thebes", "상이집트 테베"], ["wadi gabbanat el-qurud", "와디 가바나트 엘쿠루드"],
  ["nimrud", "님루드"], ["nippur", "니푸르"], ["ctesiphon", "크테시폰"], ["hasanlu", "하산루"],
  ["qasr-i abu nasr", "카스르이아부나스르"], ["shahr-i qumis", "샤흐리쿠미스"], ["tawilan", "타윌란"],
  ["tell taya", "텔 타야"], ["acemhöyük", "아젬회윅"], ["nishapur", "니샤푸르"], ["petra", "페트라"],
  ["pasargadae", "파사르가다에"], ["persepolis", "페르세폴리스"], ["saqqara", "사카라"],
  ["lachish", "라키시"], ["ur ", "우르"], ["uruk", "우루크"], ["babylon", "바빌론"],
  ["susa", "수사"], ["luristan", "루리스탄"], ["thebes", "테베"], ["memphis", "멤피스"],
  ["giza", "기자"], ["amarna", "아마르나"], ["abydos", "아비도스"], ["lisht", "리슈트"],
  ["malqata", "말카타"], ["dendera", "덴데라"], ["hierakonpolis", "히에라콘폴리스"],
  ["central anatolia", "중앙 아나톨리아"], ["anatolia", "아나톨리아"], ["caucasus", "캅카스"],
  ["bactria-margiana", "박트리아·마르기아나"], ["southern mesopotamia", "남부 메소포타미아"],
  ["mesopotamia", "메소포타미아"], ["mesoamerica", "메소아메리카"], ["levant", "레반트"],
  ["western iran", "서부 이란"], ["iran", "이란"], ["iraq", "이라크"], ["syria", "시리아"],
  ["turkey", "튀르키예"], ["cyprus", "키프로스"], ["greece", "그리스"], ["italy", "이탈리아"],
  ["egypt", "이집트"], ["israel", "이스라엘"], ["jordan", "요르단"], ["lebanon", "레바논"],
  ["morocco", "모로코"], ["tunisia", "튀니지"], ["spain", "스페인"], ["uzbekistan", "우즈베키스탄"],
  ["india", "인도"], ["pakistan", "파키스탄"], ["nepal", "네팔"], ["afghanistan", "아프가니스탄"],
  ["china", "중국"], ["japan", "일본"], ["korea", "한반도"], ["tibet", "티베트"],
  ["peru", "페루"], ["bolivia", "볼리비아"], ["ecuador", "에콰도르"], ["chile", "칠레"],
  ["argentina", "아르헨티나"], ["colombia", "콜롬비아"], ["panama", "파나마"],
  ["costa rica", "코스타리카"], ["guatemala", "과테말라"], ["honduras", "온두라스"],
  ["mexico", "멕시코"]
];
function placeKo(raw, site) {
  const s = (raw || "").toLowerCase();
  if (s) for (const [needle, ko] of PLACE_KO) if (s.includes(needle)) return ko;
  return `${SITE_KO[site]} 일원`;
}

/** 받침이 있으면 "이다", 없으면 "다". 괄호 주기(발(鉢))는 건너뛰고 본체 끝 글자를 본다 */
function copula(noun) {
  const body = noun.replace(/\([^)]*\)\s*$/, "").trim();
  const last = body[body.length - 1];
  const code = last ? last.charCodeAt(0) : 0;
  if (code < 0xac00 || code > 0xd7a3) return "이다";          // 한글이 아니면 안전하게 "이다"
  return (code - 0xac00) % 28 === 0 ? "다" : "이다";
}

// ── 연대 한국어 표기 ────────────────────────────────────────────────────
function centuryOf(year) {
  return year >= 0 ? Math.floor((year - 1) / 100) + 1 : Math.floor((Math.abs(year) - 1) / 100) + 1;
}
function koreanPeriod(y0, y1) {
  if (y0 === null || y1 === null) return null;
  const bcA = y0 < 0;
  const bcB = y1 < 0;
  const cA = centuryOf(y0);
  const cB = centuryOf(y1);
  if (bcA && bcB) return cA === cB ? `기원전 ${cA}세기` : `기원전 ${cA}~${cB}세기`;
  if (bcA && !bcB) return `기원전 ${cA}세기~기원후 ${cB}세기`;
  return cA === cB ? `${cA}세기` : `${cA}~${cB}세기`;
}

// ── 결정론 해시(엔진의 hashFrac과 같은 성질 — 같은 id면 항상 같은 값) ──────
function hashFrac(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

// ── 티어 판정 ───────────────────────────────────────────────────────────
function tierOf(sp) {
  if (sp.count >= 10) return 0;                                  // 한 관에만 10점+ → 흔함
  if (sp.count >= 3) return 1;                                   // 3~9점 → 희귀
  if (sp.highlight > 0) return 2;                                // 1~2점 + 미술관 대표작 → 진귀
  if (sp.timeline > 0 && sp.count === 1) return 2;               // 1점 + 미술사 연표 등재 → 진귀
  return 1;
}

const slugMap = new Map();
function slug(key) {
  if (!slugMap.has(key)) {
    slugMap.set(key, key.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }
  return slugMap.get(key);
}

// ── 거점별 선발: 층(연대)을 라운드로빈으로 돌며 중요도 순으로 뽑는다 ─────────
// 12층 전부에 유물이 있어야 깊이가 보상으로 느껴진다. 거점별로 그냥 상위 N개를
// 자르면 유물이 많은 두세 개 층에 몰린다.
const bySite = new Map();
for (const sp of data.species) {
  if (!ERA_BANDS[sp.site]) continue;
  if (!LEXICON.has(sp.key)) continue;
  if (!bySite.has(sp.site)) bySite.set(sp.site, []);
  bySite.get(sp.site).push(sp);
}
const significance = (a, b) =>
  (b.highlight - a.highlight) || (b.timeline - a.timeline) || (b.count - a.count) || a.key.localeCompare(b.key);

function pickFromSite(list, quota) {
  const byEra = new Map();
  for (const sp of list) {
    if (!byEra.has(sp.era)) byEra.set(sp.era, []);
    byEra.get(sp.era).push(sp);
  }
  for (const arr of byEra.values()) arr.sort(significance);
  const eras = [...byEra.keys()].sort((a, b) => a - b);
  const out = [];
  let round = 0;
  while (out.length < quota) {
    let progressed = false;
    for (const era of eras) {
      if (out.length >= quota) break;
      const arr = byEra.get(era);
      if (round < arr.length) { out.push(arr[round]); progressed = true; }
    }
    if (!progressed) break;
    round++;
  }
  return out;
}

// 목표를 거점에 배분한다(물채우기 — 후보가 부족한 거점은 있는 만큼, 남은 몫은 재분배)
const needed = TARGET_TOTAL - HANDWRITTEN;
const siteIds = [...bySite.keys()].sort();
const quota = new Map(siteIds.map((s) => [s, 0]));
let remaining = needed;
let open = siteIds.slice();
while (remaining > 0 && open.length > 0) {
  const share = Math.floor(remaining / open.length) || 1;
  const nextOpen = [];
  for (const s of open) {
    if (remaining <= 0) { nextOpen.push(s); continue; }
    const avail = bySite.get(s).length - quota.get(s);
    const take = Math.min(share, avail, remaining);
    quota.set(s, quota.get(s) + take);
    remaining -= take;
    if (avail - take > 0) nextOpen.push(s);
  }
  if (nextOpen.length === open.length && share === 0) break;
  open = nextOpen;
}

const rows = [];
for (const site of siteIds) {
  for (const sp of pickFromSite(bySite.get(site), quota.get(site))) {
    const lex = LEXICON.get(sp.key);
    const med = mediumInfo(sp.medium);
    const tier = tierOf(sp);
    const eraShort = sp.eraLabel.replace(/\([^)]*\)/g, "").trim();
    const id = `met-${site}-${slug(sp.key)}-${sp.era}`;
    const name = med ? `${eraShort} ${med.ko} ${lex.ko}` : `${eraShort} ${lex.ko}`;
    // 그 종의 연대 폭을 **그 층의 밴드 안으로 자른다.** 자르지 않으면 한 오브젝트의
    // 넓은 편년("1600–2000")이 그룹 전체를 덮어 "청대 = 16~20세기" 같은 표기가 나온다.
    const [, bandFrom, bandTo] = ERA_BANDS[site][sp.era - 1];
    const y0 = sp.y0 === null ? null : Math.max(sp.y0, bandFrom);
    const y1 = sp.y1 === null ? null : Math.min(sp.y1, bandTo);
    const period = y0 !== null && y1 !== null && y0 <= y1 ? koreanPeriod(y0, y1) : koreanPeriod(bandFrom, bandTo);
    const origin = placeKo(sp.place || sp.culture, site);

    // note — 사실만 옮기고 문장은 새로 쓴다(§6). 출처 원문을 복사하지 않는다.
    const bits = [];
    bits.push(
      period
        ? `메트로폴리탄 미술관이 ${period}로 편년한 ${lex.ko}${copula(lex.ko)}.`
        : `메트로폴리탄 미술관이 소장한 ${lex.ko}${copula(lex.ko)}.`
    );
    if (med) bits.push(`재질은 ${med.ko}.`);
    if (tier === 2) {
      bits.push(sp.highlight > 0 ? "미술관이 대표 소장품으로 꼽는 개체다." : "미술사 연표에 오른 개체다.");
    } else if (sp.count >= 10) {
      bits.push(`같은 종류가 이 컬렉션에만 ${sp.count}점 있다.`);
    }
    const note = bits.join(" ");

    const links = sp.links.slice(0, 2);
    if (links.length === 0) links.push("https://www.metmuseum.org/art/collection");

    rows.push({
      id, name,
      era: sp.eraLabel,
      origin,
      holder: "메트로폴리탄 미술관",
      note,
      tier,
      valueFactor: Number((0.6 + hashFrac(`${id}:value`) * 1.2).toFixed(2)),
      shape: lex.shape,
      palette: med?.palette ?? lex.palette,
      source: links,
      site
    });
  }
}

// 같은 거점에서 이름이 겹치면(예: "ax"와 "axe"가 둘 다 "도끼") 출토지로 가른다.
const seenName = new Map();
for (const r of rows) {
  const k = `${r.site}|${r.name}`;
  const n = (seenName.get(k) ?? 0) + 1;
  seenName.set(k, n);
  if (n > 1) r.name = `${r.name} (${r.origin})`;
}

const esc = (s) => JSON.stringify(s);
const bySiteRows = new Map();
for (const r of rows) {
  if (!bySiteRows.has(r.site)) bySiteRows.set(r.site, []);
  bySiteRows.get(r.site).push(r);
}

let ts = `/**
 * **자동 생성 파일 — 직접 고치지 마세요.**
 *
 *   node scripts/build-artifacts.mjs
 *
 * 입력은 \`data/met-species.json\`(메트로폴리탄 오픈액세스 CC0 메타데이터를
 * \`scripts/distill-met.mjs\`가 증류한 것)이고, 분류·역어 규칙은
 * \`scripts/taxonomy.mjs\`·\`scripts/lexicon.mjs\`에 있다.
 *
 * 손으로 쓴 종은 \`artifacts.ts\`에 있고 이 파일은 그 위에 얹히는 확장분이다.
 * 이 파일에는 **T3·T4가 없다** — 국보급·유일 판정은 사람이 근거를 들고 할 일이라
 * 파이프라인이 만들지 않는다(scripts/build-artifacts.mjs 머리말 참조).
 *
 * 생성 시각 기준: 종 ${rows.length}개 / 거점 ${bySiteRows.size}곳
 */
import type { GeneratedRow } from "./artifacts";

`;

for (const [site, list] of [...bySiteRows.entries()].sort()) {
  const t = [0, 0, 0];
  for (const r of list) t[r.tier]++;
  ts += `/** ${site} — ${list.length}종 (T0 ${t[0]} · T1 ${t[1]} · T2 ${t[2]}) */\n`;
  ts += `const ${site.toUpperCase()}_MET: GeneratedRow[] = [\n`;
  for (const r of list) {
    ts += `  [${esc(r.id)}, ${esc(r.name)}, ${esc(r.era)}, ${esc(r.origin)}, ${esc(r.holder)}, ${esc(r.note)}, ${r.tier}, ${r.valueFactor}, ${esc(r.shape)}, ${esc(r.palette)}, [${r.source.map(esc).join(", ")}]],\n`;
  }
  ts += `];\n\n`;
}

ts += `export const GENERATED_BY_SITE: Record<string, GeneratedRow[]> = {\n`;
for (const [site] of [...bySiteRows.entries()].sort()) ts += `  ${site}: ${site.toUpperCase()}_MET,\n`;
ts += `};\n`;

const outPath = new URL("../app/src/game/artifacts.generated.ts", import.meta.url).pathname;
fs.writeFileSync(outPath, ts);

const tierTotal = [0, 0, 0];
for (const r of rows) tierTotal[r.tier]++;
console.log(`생성 ${rows.length}종  (T0 ${tierTotal[0]} · T1 ${tierTotal[1]} · T2 ${tierTotal[2]})`);
console.log(`손글씨 ${HANDWRITTEN}종 + 생성 ${rows.length}종 = ${HANDWRITTEN + rows.length}종`);
console.log("거점별:", [...bySiteRows.entries()].sort().map(([k, v]) => `${k} ${v.length}`).join(" · "));
console.log(`→ ${outPath}  (${(fs.statSync(outPath).size / 1024).toFixed(0)}KB)`);
