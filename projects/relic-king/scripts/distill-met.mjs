/**
 * 메트로폴리탄 오픈액세스 CSV → 종(species) 후보 JSON.
 *
 *   node scripts/distill-met.mjs <MetObjects.csv 경로> [출력경로]
 *
 * 입력 CSV(317MB)는 레포에 넣지 않는다. 출력(data/met-species.json)만 커밋해
 * `build-artifacts.mjs`가 네트워크 없이 재생성할 수 있게 한다
 * (notes/artifacts-dataset.md §7 6번 "런타임은 이 파일만 읽는다"의 연장).
 *
 * 원본: https://github.com/metmuseum/openaccess (CC0 메타데이터)
 *
 * **종의 정의**: (거점, 어휘 키, 층 연대) 조합 하나가 한 종이다. 같은 "항아리"라도
 * 신라 중고의 항아리와 조선 후기의 항아리는 다른 유물이다 — 이게 이 게임이 이미
 * 쓰고 있는 구분이고(거점 × 층), 개체 수천 점을 종 하나로 뭉개는 카탈로그의
 * 총칭 문제(예: "kylix fragment" 8,943점)를 피하는 방법이기도 하다.
 */
import fs from "node:fs";
import readline from "node:readline";
import { classify, eraIndexFor, eraLabel } from "./taxonomy.mjs";
import { lexKey, LEXICON } from "./lexicon.mjs";

const TARGET_DEPARTMENTS = new Set([
  "Egyptian Art", "Greek and Roman Art", "Ancient Near Eastern Art",
  "Asian Art", "Arts of Africa, Oceania, and the Americas", "Islamic Art"
]);

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const csvPath = process.argv[2];
const outPath = process.argv[3] ?? new URL("../data/met-species.json", import.meta.url).pathname;
if (!csvPath) {
  console.error("사용법: node scripts/distill-met.mjs <MetObjects.csv> [출력경로]");
  process.exit(1);
}

const rl = readline.createInterface({ input: fs.createReadStream(csvPath), crlfDelay: Infinity });
let header = null;
const H = {};
const groups = new Map();
let scanned = 0;
let kept = 0;

for await (const line of rl) {
  if (!header) {
    header = parseCsvLine(line);
    header.forEach((h, i) => { H[h.replace(/^﻿/, "").trim()] = i; });
    continue;
  }
  const r = parseCsvLine(line);
  const department = r[H["Department"]] ?? "";
  if (!TARGET_DEPARTMENTS.has(department)) continue;
  scanned++;

  const key = lexKey(r[H["Object Name"]]);
  if (!key) continue;

  const row = {
    department,
    culture: r[H["Culture"]] ?? "",
    country: r[H["Country"]] ?? "",
    region: r[H["Region"]] ?? "",
    subregion: r[H["Subregion"]] ?? "",
    excavation: r[H["Excavation"]] ?? ""
  };
  const placed = classify(row);
  if (!placed) continue;

  const begin = Number(r[H["Object Begin Date"]]);
  const end = Number(r[H["Object End Date"]]);
  const mid = Number.isFinite(begin) && Number.isFinite(end) ? Math.round((begin + end) / 2)
    : Number.isFinite(begin) ? begin : null;

  // 이집트부는 Culture가 비어 있어 Period/Dynasty가 유일한 시대 단서다.
  let era = placed.era;
  if (era === null && placed.site === "egypt") {
    const period = `${r[H["Period"]] ?? ""} ${r[H["Dynasty"]] ?? ""}`.toLowerCase();
    const { EGYPT_PERIOD_DIRECT } = await import("./taxonomy.mjs");
    for (const [needle, idx] of EGYPT_PERIOD_DIRECT) {
      if (period.includes(needle)) { era = idx; break; }
    }
  }
  if (era === null) era = eraIndexFor(placed.site, mid);
  if (era === null) continue;

  const gid = `${placed.site}|${key}|${era}`;
  let g = groups.get(gid);
  if (!g) {
    g = {
      site: placed.site, key, era, eraLabel: eraLabel(placed.site, era),
      count: 0, highlight: 0, timeline: 0,
      y0: null, y1: null,
      cultures: {}, media: {}, places: {}, dates: {}, links: [], objectIds: []
    };
    groups.set(gid, g);
  }
  g.count++;
  kept++;
  // 그 종의 실제 연대 폭(이 컬렉션 기준). note의 한국어 연대 표기에 쓴다.
  if (Number.isFinite(begin)) g.y0 = g.y0 === null ? begin : Math.min(g.y0, begin);
  if (Number.isFinite(end)) g.y1 = g.y1 === null ? end : Math.max(g.y1, end);
  if ((r[H["Is Highlight"]] ?? "").toLowerCase() === "true") g.highlight++;
  if ((r[H["Is Timeline Work"]] ?? "").toLowerCase() === "true") g.timeline++;
  const bump = (bag, v) => { const t = (v ?? "").trim(); if (t) bag[t] = (bag[t] ?? 0) + 1; };
  bump(g.cultures, row.culture);
  bump(g.media, (r[H["Medium"]] ?? "").slice(0, 80));
  // 발굴 크레딧("MMA excavations, 1913–14")은 장소 이름이 아니다 — 유적명일 때만 쓴다.
  const digName = /excavat|expedition|fund|purchase|\d{4}/i.test(row.excavation) ? "" : row.excavation;
  bump(g.places, [digName, row.subregion, row.region, row.country].filter(Boolean)[0]);
  bump(g.dates, r[H["Object Date"]]);
  if (g.links.length < 3) {
    const link = r[H["Link Resource"]] ?? "";
    if (link) { g.links.push(link); g.objectIds.push(r[H["Object ID"]] ?? ""); }
  }
}

/** 빈도 상위 n개 키만 남겨 출력 파일을 작게 유지한다 */
function topKeys(bag, n) {
  return Object.entries(bag).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

const list = [...groups.values()].map((g) => ({
  site: g.site, key: g.key, era: g.era, eraLabel: g.eraLabel,
  count: g.count, highlight: g.highlight, timeline: g.timeline,
  y0: g.y0, y1: g.y1,
  culture: topKeys(g.cultures, 1)[0] ?? "",
  medium: topKeys(g.media, 1)[0] ?? "",
  place: topKeys(g.places, 1)[0] ?? "",
  date: topKeys(g.dates, 1)[0] ?? "",
  links: g.links
}));

list.sort((a, b) => (b.highlight - a.highlight) || (b.timeline - a.timeline) || (b.count - a.count));

fs.mkdirSync(new URL("../data/", import.meta.url).pathname, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({
  source: "https://github.com/metmuseum/openaccess",
  license: "CC0 (메타데이터). 문장은 사실만 취하고 새로 쓴다 — notes/artifacts-dataset.md §6",
  generatedFrom: csvPath.split("/").pop(),
  lexiconTerms: LEXICON.size,
  scannedObjects: scanned,
  keptObjects: kept,
  species: list
}, null, 0));

console.log(`대상 부서 오브젝트 ${scanned}점 → 어휘·거점·연대 분류 통과 ${kept}점`);
console.log(`종 후보 ${list.length}개 → ${outPath}`);
const bySite = {};
for (const s of list) bySite[s.site] = (bySite[s.site] ?? 0) + 1;
console.log("거점별:", Object.entries(bySite).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
