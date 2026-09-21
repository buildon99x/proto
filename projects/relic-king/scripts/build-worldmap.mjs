#!/usr/bin/env node
// 세계 해안선 베이크 — Natural Earth 1:110m 육지 지오메트리를 320×160 이진 비트맵으로
// 굽는다(notes/world-map.md §6, notes/decisions.md G8·G75.1).
//
//   node scripts/build-worldmap.mjs [--check]
//
// 빌드타임 전용이다. 런타임은 이 스크립트가 커밋한 산출물
// (`app/src/render/worldmap-raster.ts`)만 읊는다 — 타일 서버도 CDN도 부르지 않는다.
// `world-atlas`/`topojson-client`는 `app/package.json`의 devDependencies에만 있고
// 앱 진입점(`src/main.tsx`)에서 import 되지 않으므로 런타임 번들에 들어가지 않는다.
//
// --check 를 주면 파일을 쓰지 않고 기존 산출물과 다른지만 검사한다(CI/회귀용).
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
// devDependency는 `app/`에 설치돼 있고 이 스크립트는 `scripts/`에 있다. ESM 해석은
// 파일 위치를 기준으로 올라가므로 app/node_modules를 못 본다 — require를 app/package.json에
// 앵커해 명시적으로 집어 온다. 이 참조가 빌드타임에만 존재한다는 사실이 더 또렷해지기도 한다.
const require = createRequire(path.join(ROOT, "app/package.json"));
const { feature } = require("topojson-client");
const LAND_TOPOJSON = path.join(ROOT, "app/node_modules/world-atlas/land-110m.json");
const OUT = path.join(ROOT, "app/src/render/worldmap-raster.ts");

// notes/world-map.md §6 = app/src/game/balance.ts 의 MAP_* 상수와 같은 값이다.
// 이 스크립트는 `balance.ts`(TypeScript)를 import 할 수 없으므로 값을 복사해 두고,
// 아래 `assertBalanceConstants()`가 실제 파일을 읽어 어긋나면 빌드를 깬다.
const GRID_W = 320;
const GRID_H = 160;
const COASTLINE_LAND_THRESHOLD = 0.5;
/** 도트 하나를 SUBSAMPLE×SUBSAMPLE 격자로 찔러 육지 비율을 잰다. 4×4=16표본이면
 *  임계 0.5 판정이 1/16 해상도로 갈린다 — 110m 벡터의 정밀도에 이미 충분하다. */
const SUBSAMPLE = 4;

/** 320×160 도트 그리드의 (gx, gy) 도트가 덮는 위경도 사각형의 한 표본점 */
function samplePoint(gx, gy, sx, sy) {
  const fx = (gx + (sx + 0.5) / SUBSAMPLE) / GRID_W;
  const fy = (gy + (sy + 0.5) / SUBSAMPLE) / GRID_H;
  // 정거방형(equirectangular) 역투영 — render/worldmap.ts의 projectToGrid와 짝이다
  return [fx * 360 - 180, 90 - fy * 180];
}

/** 점-다각형 판정(ray casting). GeoJSON 링은 [lon, lat] 순이다. */
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * 날짜변경선 언랩 — Natural Earth는 ±180을 넘는 링(유라시아의 축치반도, 피지)을
 * 경도가 +179 → -179로 튀는 좌표열로 저장한다. 그대로 평면 ray casting에 넣으면
 * 그 "튀는 변" 하나가 지도를 가로지르는 가짜 경계가 돼 태평양 한복판이 육지로
 * 판정된다(실제로 그렇게 구웠다가 남태평양·노르웨이해가 육지로 나왔다).
 * 연속한 두 점의 경도 차가 180을 넘으면 ±360을 더해 링을 하나로 편다 —
 * 편 뒤에는 경도 범위가 [-180,180]을 벗어날 수 있고, 질의점도 같은 배수만큼
 * 옮겨 가며(candidate) 검사한다.
 */
function unwrapRing(ring) {
  const out = [ring[0].slice(0, 2)];
  for (let i = 1; i < ring.length; i++) {
    let x = ring[i][0];
    const prev = out[i - 1][0];
    while (x - prev > 180) x -= 360;
    while (x - prev < -180) x += 360;
    out.push([x, ring[i][1]]);
  }
  return out;
}

/** 폴리곤 = [외곽링, 구멍링...]. 외곽에 들어가고 구멍에 안 들어가면 육지다. */
function pointInPolygon(lon, lat, poly) {
  for (let k = poly.kMin; k <= poly.kMax; k++) {
    const x = lon + k * 360;
    if (x < poly.box[0] || x > poly.box[2]) continue;
    if (!pointInRing(x, lat, poly.rings[0])) continue;
    let inHole = false;
    for (let r = 1; r < poly.rings.length; r++) {
      if (pointInRing(x, lat, poly.rings[r])) { inHole = true; break; }
    }
    if (!inHole) return true;
  }
  return false;
}

function bbox(ring) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/** 링을 펴고 bbox·질의 배수 범위를 미리 재 둔다 — 도트마다 다시 계산하면 느리다 */
function preparePolygon(rings) {
  const unwrapped = rings.map(unwrapRing);
  const box = bbox(unwrapped[0]);
  return {
    rings: unwrapped,
    box,
    // 질의점 lon ∈ [-180,180]을 box 안으로 옮기는 데 필요한 360 배수 범위
    kMin: Math.floor((box[0] + 180) / 360),
    kMax: Math.ceil((box[2] - 180) / 360)
  };
}

/**
 * `balance.ts`의 MAP_* 상수가 이 스크립트의 복사본과 어긋나면 산출물이 조용히 틀어진다
 * (그리드가 320×160이 아닌데 비트맵만 320×160이면 투영이 어긋난 채로 렌더된다).
 * 문자열로 직접 읽어 확인한다 — 빌드타임 스크립트가 TS를 컴파일할 필요는 없다.
 */
async function assertBalanceConstants() {
  const src = await readFile(path.join(ROOT, "app/src/game/balance.ts"), "utf8");
  const read = (name) => {
    const m = src.match(new RegExp(`export const ${name}\\s*=\\s*([0-9.]+)`));
    if (!m) throw new Error(`balance.ts에서 ${name}을 찾지 못했다`);
    return Number(m[1]);
  };
  const pairs = [
    ["MAP_WORLD_DOT_GRID_W", GRID_W],
    ["MAP_WORLD_DOT_GRID_H", GRID_H],
    ["COASTLINE_LAND_THRESHOLD", COASTLINE_LAND_THRESHOLD]
  ];
  for (const [name, expected] of pairs) {
    const actual = read(name);
    if (actual !== expected) {
      throw new Error(`balance.ts의 ${name}=${actual}인데 build-worldmap.mjs는 ${expected}를 가정한다`);
    }
  }
}

/**
 * `app/src/game/sites.ts`에서 12거점의 id·도시명·좌표를 읽는다. TS를 컴파일하지 않고
 * 정규식으로 긁는다 — 이 스크립트가 필요한 건 세 필드뿐이고, 형식이 바뀌면
 * 아래 개수 단언에서 바로 깨진다.
 */
async function readSites() {
  const src = await readFile(path.join(ROOT, "app/src/game/sites.ts"), "utf8");
  const re = /id: "([a-z]+)",\s*\n\s*city: "([^"]+)",[\s\S]*?\n\s*lat: (-?[0-9.]+),\n\s*lon: (-?[0-9.]+),/g;
  const sites = [];
  for (const m of src.matchAll(re)) {
    sites.push({ id: m[1], city: m[2], lat: Number(m[3]), lon: Number(m[4]) });
  }
  if (sites.length !== 12) throw new Error(`sites.ts에서 거점 12개를 못 읽었다(${sites.length}개)`);
  return sites;
}

async function bake() {
  await assertBalanceConstants();

  const topo = JSON.parse(await readFile(LAND_TOPOJSON, "utf8"));
  const land = feature(topo, topo.objects.land);
  /** 모든 폴리곤을 펴서 평탄화해 둔다 — 도트마다 링을 다시 펴면 느리다 */
  const polygons = [];
  for (const f of land.features) {
    const geoms = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const rings of geoms) polygons.push(preparePolygon(rings));
  }

  const bits = new Uint8Array(GRID_W * GRID_H);
  const needed = Math.ceil(SUBSAMPLE * SUBSAMPLE * COASTLINE_LAND_THRESHOLD);
  let landDots = 0;
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      let hits = 0;
      for (let sy = 0; sy < SUBSAMPLE; sy++) {
        for (let sx = 0; sx < SUBSAMPLE; sx++) {
          const [lon, lat] = samplePoint(gx, gy, sx, sy);
          for (const poly of polygons) {
            if (lat < poly.box[1] || lat > poly.box[3]) continue;
            if (pointInPolygon(lon, lat, poly)) {
              hits++;
              break;
            }
          }
        }
      }
      // 육지 비율 > 임계 (엄격한 초과 — world-map.md §6 "넘으면 육지")
      if (hits >= needed && hits / (SUBSAMPLE * SUBSAMPLE) > COASTLINE_LAND_THRESHOLD - 1e-9) {
        bits[gy * GRID_W + gx] = 1;
        landDots++;
      }
    }
  }

  // 거점 앵커 보정 — 320×160 격자는 도트 하나가 약 1.125°(적도 기준 125km)라
  // 항구·해협 도시(아테네·이스탄불)의 도트는 육지 비율이 0.5에 못 미쳐 바다로
  // 이진화된다. 그러면 "12마커가 전부 육지 위"라는 요구(작업 지시 §4)가 임계값
  // 하나 때문에 깨진다. COASTLINE_LAND_THRESHOLD를 낮춰 해안선 전체를 부풀리는
  // 대신, 거점 도트만 육지로 승격한다 — 단, **이웃 8칸 중 하나라도 육지일 때만**.
  // 이웃까지 전부 바다면 그건 격자 해상도 문제가 아니라 좌표가 틀린 것이므로
  // 빌드를 깬다(나폴리 좌표에 "폼페이"를 붙여 놓았던 v0.3 같은 결함의 회귀 방지).
  const sites = await readSites();
  const promoted = [];
  for (const site of sites) {
    const gx = Math.min(GRID_W - 1, Math.floor(((site.lon + 180) / 360) * GRID_W));
    const gy = Math.min(GRID_H - 1, Math.floor(((90 - site.lat) / 180) * GRID_H));
    if (bits[gy * GRID_W + gx]) continue;
    let neighbourLand = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
        neighbourLand += bits[ny * GRID_W + nx];
      }
    }
    if (neighbourLand === 0) {
      throw new Error(`${site.id}(${site.city}, ${site.lat}/${site.lon})은 이웃 8칸까지 전부 바다다 — 좌표를 확인해라`);
    }
    bits[gy * GRID_W + gx] = 1;
    landDots++;
    promoted.push(`${site.city}(${site.id})`);
  }

  // 비트마스크 → base64. 320×160 = 51,200비트 = 6,400바이트 → base64 8,536자.
  // (PNG data URL도 §6이 허용하지만 비트마스크를 골랐다 — 이유는 산출 파일 주석 참조.)
  const bytes = new Uint8Array(GRID_W * GRID_H / 8);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i]) bytes[i >> 3] |= 0x80 >> (i & 7);
  }
  const b64 = Buffer.from(bytes).toString("base64");

  const ts = `// 생성 파일 — 손으로 고치지 마라. \`node scripts/build-worldmap.mjs\`가 다시 굽는다.
//
// Natural Earth 1:110m 육지 지오메트리(퍼블릭 도메인 데이터, npm \`world-atlas\`
// 2.0.2의 land-110m.json으로 배포 — 패키지 라이선스 ISC)를 정거방형 도법으로
// ${GRID_W}×${GRID_H} 그리드에 투영하고, 도트별 육지 비율이
// COASTLINE_LAND_THRESHOLD(${COASTLINE_LAND_THRESHOLD})를 넘으면 육지로 이진화한 비트맵이다
// (도트당 ${SUBSAMPLE}×${SUBSAMPLE} 표본). notes/world-map.md §6의 빌드타임 파이프라인 그대로다.
//
// **왜 PNG data URL이 아니라 비트마스크인가**: (1) 크기 — 비트 1개/도트라
// ${bytes.length}바이트(base64 ${b64.length}자)로 끝난다. 같은 그리드의 PNG는
// 헤더·필터·팔레트가 붙어 더 크다. (2) 권역 줌 — 4배 크롭을 최근접 이웃으로
// 리샘플할 때 배열 인덱싱 한 번이면 되지만, PNG는 Image 디코드 → 오프스크린
// 캔버스 → getImageData 를 거쳐야 하고 그건 동기 렌더 경로에서 쓸 수 없다.
// (3) 색 — 비트맵은 "육지냐"만 담고 색은 렌더가 palette.ts에서 고른다. 픽셀에
// 색을 구우면 팔레트 40색 밖의 값이 이 파일에 박힌다.
//
// 거점 앵커 보정: ${promoted.length}건${promoted.length ? ` (${promoted.join(", ")})` : ""} — 도트가
// 약 1.125°라 항구·해협 도시 셀은 육지 비율이 0.5에 못 미쳐 바다로 이진화된다.
// 임계값을 낮춰 해안선 전체를 부풀리는 대신 그 거점 도트만 육지로 올렸다
// (이웃 8칸에 육지가 있을 때만 — 없으면 좌표가 틀린 것이라 빌드가 깨진다).

export const WORLD_RASTER_W = ${GRID_W};
export const WORLD_RASTER_H = ${GRID_H};
/** 육지 도트 수 — 회귀 검사용(파이프라인이 빈 비트맵을 굽고 지나가지 못하게) */
export const WORLD_RASTER_LAND_DOTS = ${landDots};

const PACKED_BASE64 =
  "${b64}";

/** 모듈 로드 시 1회만 언팩한다. index = gy * WORLD_RASTER_W + gx, 1 = 육지. */
export const WORLD_LAND_MASK: Uint8Array = (() => {
  const bin = atob(PACKED_BASE64);
  const out = new Uint8Array(WORLD_RASTER_W * WORLD_RASTER_H);
  for (let i = 0; i < out.length; i++) {
    out[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
  }
  return out;
})();

/** 그리드 밖은 바다로 친다 — 권역 줌이 극지·날짜변경선 너머를 크롭해도 안전하다. */
export function isLandDot(gx: number, gy: number): boolean {
  if (gx < 0 || gx >= WORLD_RASTER_W || gy < 0 || gy >= WORLD_RASTER_H) return false;
  return WORLD_LAND_MASK[gy * WORLD_RASTER_W + gx] === 1;
}
`;

  return { ts, landDots, bytes: bytes.length, b64Len: b64.length, promoted };
}

const check = process.argv.includes("--check");
const { ts, landDots, bytes, b64Len, promoted } = await bake();
if (check) {
  const current = await readFile(OUT, "utf8").catch(() => "");
  if (current !== ts) {
    console.error("❌ worldmap-raster.ts가 파이프라인 산출물과 다르다. `node scripts/build-worldmap.mjs`를 다시 돌려라.");
    process.exit(1);
  }
  console.log("✅ worldmap-raster.ts가 최신이다.");
} else {
  await writeFile(OUT, ts);
  console.log(`✅ ${path.relative(ROOT, OUT)} — 육지 도트 ${landDots}/${GRID_W * GRID_H}, 비트맵 ${bytes}B (base64 ${b64Len}자)`);
  console.log(`   거점 앵커 보정 ${promoted.length}건${promoted.length ? `: ${promoted.join(", ")}` : ""}`);
}
