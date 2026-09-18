import { MAP_DOT_PX, MAP_REGION_ZOOM_FACTOR, MAP_WORLD_DOT_GRID_H, MAP_WORLD_DOT_GRID_W, SITES, SITE_BY_ID } from "../game/balance";
import { PALETTE, RAMPS } from "./palette";
import type { SiteId } from "../game/types";

/**
 * 세계지도 — 세계 줌 1단계(notes/world-map.md §6, G8). 이번 5단계는 3단 줌 중
 * **세계·권역 2단**까지 구현한다(작업 지시) — 유적 줌은 여전히 새 캔버스가
 * 아니라 기존 `render/strata.ts`로 전환하는 것뿐이라 이 모듈이 다루지 않는다.
 *
 * **실제 해안선 벡터를 넣지 않는다** — 외부 네트워크·타일 서버를 쓸 수 없고
 * (`AGENTS.md` 환경 제약), Natural Earth GeoJSON을 정적으로 내장해 빌드타임에
 * 굽는 파이프라인(`scripts/build-worldmap.mjs`, world-map.md §6이 그리는 이상적
 * 형태)은 범위를 넘는 별도 작업이다. 대신 2단계가 정한 대체안 그대로: **거점
 * 노드 + 연결선 + 위경도 그리드**의 순수 도트 지도로 간다.
 */

export const MAP_W = MAP_WORLD_DOT_GRID_W * MAP_DOT_PX; // 640
export const MAP_H = MAP_WORLD_DOT_GRID_H * MAP_DOT_PX; // 320

/** 정거방형(equirectangular) 도법 — 위경도를 320×160 도트 그리드 좌표로 투영한다 */
export function projectToGrid(lat: number, lon: number): { gx: number; gy: number } {
  const gx = ((lon + 180) / 360) * MAP_WORLD_DOT_GRID_W;
  const gy = ((90 - lat) / 180) * MAP_WORLD_DOT_GRID_H;
  return { gx, gy };
}

function toPx(g: number): number {
  return g * MAP_DOT_PX;
}

/**
 * 대륙 실루엣 근사(작업 지시 B) — 실제 해안선 벡터 없이, 대륙별로 5~10개 정점짜리
 * 아주 성긴 위경도 다각형을 손으로 박아 넣는다. 정확한 해안선이 아니라 "이건
 * 아프리카, 이건 유라시아"라고 알아볼 정도의 실루엣이면 된다.
 */
type LatLon = [lat: number, lon: number];

const CONTINENT_POLYGONS: LatLon[][] = [
  // 아프리카
  [[35, -6], [31, 32], [11, 51], [-26, 33], [-34, 19], [-4, 12], [10, -16]],
  // 유라시아(유럽+아시아, 대략 하나로 뭉뚱그린다)
  [
    [70, 25], [75, 110], [60, 170], [35, 140], [10, 105], [8, 78],
    [25, 55], [40, 20], [43, -9], [60, 5]
  ],
  // 북아메리카
  [[70, -160], [70, -70], [45, -52], [25, -80], [15, -95], [23, -110], [48, -125], [60, -140]],
  // 남아메리카
  [[12, -72], [5, -52], [-23, -43], [-34, -58], [-53, -68], [-33, -71], [-4, -81], [4, -77]],
  // 호주
  [[-11, 131], [-12, 143], [-28, 153], [-38, 147], [-35, 118], [-20, 114], [-14, 126]]
];

/** 점-다각형 판정(ray casting). gx/gy 그리드 좌표계에서 그대로 쓴다 — 정거방형
 *  투영이 선형이라 위경도 다각형을 그리드로 투영해도 형태가 보존된다. */
function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const CONTINENT_GRID_POLYGONS: [number, number][][] = CONTINENT_POLYGONS.map((poly) =>
  poly.map(([lat, lon]) => {
    const { gx, gy } = projectToGrid(lat, lon);
    return [gx, gy] as [number, number];
  })
);

/** 육지 도트 좌표(픽셀) — 모듈 로드 시 1회만 계산해 캐싱한다. 320×160 전체를
 *  검사하지 않고 6칸 간격으로만 샘플링해 렌더 비용을 낮춘다. */
const CONTINENT_DOT_GRID_STEP = 6;
const WORLD_LAND_DOTS: { x: number; y: number }[] = (() => {
  const dots: { x: number; y: number }[] = [];
  for (let gy = 0; gy < MAP_WORLD_DOT_GRID_H; gy += CONTINENT_DOT_GRID_STEP) {
    for (let gx = 0; gx < MAP_WORLD_DOT_GRID_W; gx += CONTINENT_DOT_GRID_STEP) {
      if (CONTINENT_GRID_POLYGONS.some((poly) => pointInPolygon(gx, gy, poly))) {
        dots.push({ x: toPx(gx), y: toPx(gy) });
      }
    }
  }
  return dots;
})();

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// PALETTE.rock[0](= unvisited 마커와 같은 회갈색 계열) 그대로, 아주 낮은 알파로만
// 깐다 — 새 색을 만들지 않고 고정 팔레트 안에서만 고른다(palette.ts 주석).
const CONTINENT_DOT_COLOR = hexToRgba(PALETTE.rock[0], 0.16);

/** 세계 줌 배경에 대륙 실루엣을 옅은 도트로 흩뿌린다. 그리드선·연결선·마커·라벨보다
 *  먼저(아래) 그려야 한다 — 가독성이 항상 우선이다. */
function drawContinents(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = CONTINENT_DOT_COLOR;
  for (const d of WORLD_LAND_DOTS) {
    ctx.fillRect(d.x, d.y, MAP_DOT_PX, MAP_DOT_PX);
  }
}

export type WorldMapMarkerState = "base" | "visited" | "unvisited";

/** 권역 줌(notes/world-map.md §6) — 선택한 거점을 화면 중심에 고정하고 그
 *  주변을 MAP_REGION_ZOOM_FACTOR배 확대한다. null이면 세계 줌. */
export type MapZoom = { center: SiteId; factor: number } | null;

export type WorldMapView = {
  /** 거점별 마커 상태 — base(본거지, 로컬 시세 프리미엄) > visited(방문만) > unvisited */
  markerState: Record<SiteId, WorldMapMarkerState>;
  /** 강조 표시할 거점(선택 중) */
  selected?: SiteId | null;
  /** 현재 이동 중이거나 현지작업 중인 발굴단의 목적지 — 연결선을 굵게 그린다 */
  activeTeamTargets?: SiteId[];
  /** 라이벌이 지금 쫓고 있는(제보 급파 중) 거점 — 마커에 라이벌 표시를 덧그린다 */
  rivalTargets?: SiteId[];
};

/** 그 줌 상태에서 각 거점이 캔버스의 어느 픽셀에 그려지는지. 마커를 그릴 때와
 *  클릭 좌표를 거점으로 되짚을 때(hit test) 양쪽에서 공유한다. */
export function siteScreenPositions(zoom: MapZoom): Record<SiteId, { x: number; y: number }> {
  const out = {} as Record<SiteId, { x: number; y: number }>;
  if (!zoom) {
    for (const s of SITES) {
      const { gx, gy } = projectToGrid(s.lat, s.lon);
      out[s.id] = { x: toPx(gx), y: toPx(gy) };
    }
    return out;
  }
  const center = SITE_BY_ID[zoom.center];
  const c = projectToGrid(center.lat, center.lon);
  for (const s of SITES) {
    const g = projectToGrid(s.lat, s.lon);
    out[s.id] = {
      x: MAP_W / 2 + (g.gx - c.gx) * zoom.factor * MAP_DOT_PX,
      y: MAP_H / 2 + (g.gy - c.gy) * zoom.factor * MAP_DOT_PX
    };
  }
  return out;
}

/** 캔버스 클릭 좌표(px, canvas 내부 좌표계)에서 가장 가까운 거점을 찾는다.
 *  radiusPx 안에 아무 마커도 없으면 null. */
export function pickSiteAt(px: number, py: number, zoom: MapZoom, radiusPx = 10): SiteId | null {
  const positions = siteScreenPositions(zoom);
  let best: SiteId | null = null;
  let bestDist = radiusPx;
  for (const s of SITES) {
    const p = positions[s.id];
    const d = Math.hypot(p.x - px, p.y - py);
    if (d <= bestDist) {
      bestDist = d;
      best = s.id;
    }
  }
  return best;
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  // 위경도 30도 간격 그리드 — "숫자를 숨기지 않는다"는 척추 5번의 지도판(좌표계 공개)
  for (let lon = -180; lon <= 180; lon += 30) {
    const { gx } = projectToGrid(0, lon);
    const x = Math.round(toPx(gx)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_H);
    ctx.stroke();
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    const { gy } = projectToGrid(lat, 0);
    const y = Math.round(toPx(gy)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_W, y);
    ctx.stroke();
  }
  // 적도·본초자오선은 조금 더 밝게
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  const equator = Math.round(toPx(projectToGrid(0, 0).gy)) + 0.5;
  const meridian = Math.round(toPx(projectToGrid(0, 0).gx)) + 0.5;
  ctx.beginPath();
  ctx.moveTo(0, equator);
  ctx.lineTo(MAP_W, equator);
  ctx.moveTo(meridian, 0);
  ctx.lineTo(meridian, MAP_H);
  ctx.stroke();
}

function markerColor(state: WorldMapMarkerState): string {
  if (state === "base") return RAMPS.gold.ramp[3];
  if (state === "visited") return RAMPS.silver.ramp[2];
  return PALETTE.rock[0];
}

/**
 * 라벨 충돌 회피(작업 지시 A) — 세계 줌에서 로마·그리스·튀르키예·이스라엘·이라크·
 * 이집트처럼 밀집된 구간의 라벨이 겹치지 않도록, 마커 주변 후보 위치를 순서대로
 * 시도하는 그리디 배치를 쓴다. 권역 줌(4배 확대라 여유 공간이 이미 충분하다)은
 * 기존 고정 오프셋(마커 우상단)을 그대로 쓴다 — `siteScreenPositions`/`pickSiteAt`
 * (마커 위치·클릭 판정)은 건드리지 않고 라벨 "텍스트"를 그리는 위치만 바꾼다.
 */
type LabelCandidate = { dx: number; dy: number; align: "left" | "right"; leader?: boolean };

const WORLD_LABEL_CANDIDATES: LabelCandidate[] = [
  { dx: 5, dy: -3, align: "left" }, // 우상단 — 기존 기본값
  { dx: -5, dy: -3, align: "right" }, // 좌상단
  { dx: 5, dy: 12, align: "left" }, // 우하단
  { dx: -5, dy: 12, align: "right" }, // 좌하단
  { dx: 11, dy: -12, align: "left", leader: true }, // 우상단, 더 멀리(리더선)
  { dx: -11, dy: -12, align: "right", leader: true }, // 좌상단, 더 멀리(리더선)
  { dx: 11, dy: 18, align: "left", leader: true }, // 우하단, 더 멀리(리더선)
  { dx: -11, dy: 18, align: "right", leader: true } // 좌하단, 더 멀리(리더선)
];

type LabelRect = { x0: number; y0: number; x1: number; y1: number };

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

const LABEL_FONT_H = 8; // "9px monospace" 대략 높이
const LABEL_PAD = 1;

function candidateRect(x: number, y: number, textW: number, c: LabelCandidate): LabelRect {
  const ax = x + c.dx;
  const ay = y + c.dy;
  const [x0, x1] = c.align === "right" ? [ax - textW, ax] : [ax, ax + textW];
  return { x0: x0 - LABEL_PAD, y0: ay - LABEL_FONT_H - LABEL_PAD, x1: x1 + LABEL_PAD, y1: ay + LABEL_PAD };
}

/** 이미 배치된 라벨들(`placed`)과 겹치지 않는 첫 후보를 그리디하게 고른다.
 *  우선순위가 높은(= base > visited > unvisited) 거점부터 순서대로 호출해야
 *  밀집 구간에서 보유·방문 거점 라벨이 먼저 자리를 차지한다. 못 찾으면
 *  null(마커만 남기고 라벨은 생략) */
function pickLabelPlacement(
  x: number, y: number, textW: number, placed: LabelRect[]
): { c: LabelCandidate; rect: LabelRect } | null {
  for (const c of WORLD_LABEL_CANDIDATES) {
    const rect = candidateRect(x, y, textW, c);
    if (!placed.some((p) => rectsOverlap(p, rect))) return { c, rect };
  }
  return null;
}

/** 지도 캔버스를 그린다(세계 줌 또는 권역 줌). `ctx.canvas`는 반드시
 *  MAP_W×MAP_H(640×320)이어야 한다. `zoom`이 있으면 그 거점을 중심으로
 *  MAP_REGION_ZOOM_FACTOR배 확대한 권역 줌을 그린다(notes/world-map.md §6). */
export function drawWorldMap(ctx: CanvasRenderingContext2D, view: WorldMapView, zoom: MapZoom = null) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PALETTE.sky;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // 그리는 순서: 배경 → 대륙 도트 → 위경도 그리드선 → 연결선 → 마커 → 라벨
  // (작업 지시 B) — 대륙 도트는 세계 줌에서만, 항상 그 위의 요소들보다 아래.
  if (!zoom) {
    drawContinents(ctx);
    drawGrid(ctx);
  }

  const positions = siteScreenPositions(zoom);
  const bases = SITES.filter((s) => view.markerState[s.id] === "base");
  const activeTargets = new Set(view.activeTeamTargets ?? []);
  const rivalTargets = new Set(view.rivalTargets ?? []);

  // 연결선 — 보유 본거지에서 다른 모든 거점까지, 실제 원정이 거리를 지불한다는
  // 감각을 지도만 보고도 알 수 있게 한다(world-map.md §2 "계산 없이도 맞아떨어진다")
  for (const base of bases) {
    const from = positions[base.id];
    for (const s of SITES) {
      if (s.id === base.id) continue;
      const to = positions[s.id];
      const active = activeTargets.has(s.id);
      ctx.strokeStyle = active ? "rgba(240,205,85,0.55)" : "rgba(255,255,255,0.08)";
      ctx.lineWidth = active ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  }

  for (const s of SITES) {
    const { x, y } = positions[s.id];
    if (x < -20 || x > MAP_W + 20 || y < -20 || y > MAP_H + 20) continue; // 권역 줌에서 화면 밖은 건너뛴다
    const state = view.markerState[s.id] ?? "unvisited";
    const selected = view.selected === s.id;

    if (selected) {
      ctx.strokeStyle = RAMPS.gold.ramp[3];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (rivalTargets.has(s.id)) {
      ctx.strokeStyle = "#e4553a";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = markerColor(state);
    ctx.beginPath();
    ctx.arc(x, y, state === "base" ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 라벨 — 마커·연결선보다 위(맨 마지막)에 그린다. 세계 줌은 로마·그리스·튀르키예·
  // 이스라엘·이라크·이집트처럼 밀집된 구간의 겹침을 그리디 배치로 피하고, 권역
  // 줌(4배 확대라 여유 공간이 이미 충분하다)은 기존 고정 오프셋을 그대로 쓴다.
  ctx.font = "9px monospace";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(239,230,210,0.85)";

  if (!zoom) {
    const priority: Record<WorldMapMarkerState, number> = { base: 0, visited: 1, unvisited: 2 };
    // base > visited > unvisited 순으로 먼저 자리를 잡아야 밀집 구간에서 보유·
    // 방문 거점 라벨이 우선적으로 유지된다(작업 지시 A의 권장 우선순위).
    const order = [...SITES].sort((a, b) => {
      const pa = priority[view.markerState[a.id] ?? "unvisited"];
      const pb = priority[view.markerState[b.id] ?? "unvisited"];
      return pa - pb;
    });
    const placedRects: LabelRect[] = [];
    for (const s of order) {
      const { x, y } = positions[s.id];
      if (x < -20 || x > MAP_W + 20 || y < -20 || y > MAP_H + 20) continue;
      const textW = ctx.measureText(s.name).width;
      const placement = pickLabelPlacement(x, y, textW, placedRects);
      if (!placement) continue; // 극단적으로 밀집된 경우 마커만 남기고 라벨은 생략
      placedRects.push(placement.rect);
      const ax = x + placement.c.dx;
      const ay = y + placement.c.dy;
      if (placement.c.leader) {
        // 리더선 — 멀리 끌어낸 라벨만 가는 선으로 마커와 이어준다
        ctx.strokeStyle = "rgba(239,230,210,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ax, ay);
        ctx.stroke();
      }
      ctx.textAlign = placement.c.align;
      ctx.fillText(s.name, ax, ay);
    }
    ctx.textAlign = "left";
  } else {
    for (const s of SITES) {
      const { x, y } = positions[s.id];
      if (x < -20 || x > MAP_W + 20 || y < -20 || y > MAP_H + 20) continue;
      ctx.fillText(s.name, x + 5, y - 3);
    }
  }
}
