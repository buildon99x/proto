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

/** 지도 캔버스를 그린다(세계 줌 또는 권역 줌). `ctx.canvas`는 반드시
 *  MAP_W×MAP_H(640×320)이어야 한다. `zoom`이 있으면 그 거점을 중심으로
 *  MAP_REGION_ZOOM_FACTOR배 확대한 권역 줌을 그린다(notes/world-map.md §6). */
export function drawWorldMap(ctx: CanvasRenderingContext2D, view: WorldMapView, zoom: MapZoom = null) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PALETTE.sky;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  if (!zoom) drawGrid(ctx);

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

    ctx.fillStyle = "rgba(239,230,210,0.85)";
    ctx.font = "9px monospace";
    ctx.textBaseline = "bottom";
    ctx.fillText(s.name, x + 5, y - 3);
  }
}
