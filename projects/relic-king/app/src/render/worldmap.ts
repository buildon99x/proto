import { MAP_DOT_PX, MAP_WORLD_DOT_GRID_H, MAP_WORLD_DOT_GRID_W, SITES } from "../game/balance";
import { PALETTE, RAMPS } from "./palette";
import type { SiteId } from "../game/types";

/**
 * 세계지도 — 세계 줌 1단계(notes/world-map.md §6, G8). 3단 줌 중 이번 2단계는
 * 이 한 단계만 구현한다(권역·유적 줌은 5단계 UI 몫 — 유적 줌은 어차피 새 캔버스가
 * 아니라 기존 `render/strata.ts`로 전환하는 것뿐이라 신규 렌더 파이프라인이 필요
 * 없다).
 *
 * **실제 해안선 벡터를 넣지 않는다** — 외부 네트워크·타일 서버를 쓸 수 없고
 * (`AGENTS.md` 환경 제약), Natural Earth GeoJSON을 정적으로 내장해 빌드타임에
 * 굽는 파이프라인(`scripts/build-worldmap.mjs`, world-map.md §6이 그리는 이상적
 * 형태)은 이번 2단계 범위를 넘는 별도 작업이다. 대신 2단계 작업 지시가 명시한
 * 대체안 그대로: **거점 노드 + 연결선 + 위경도 그리드**의 순수 도트 지도로
 * 간다 — 12거점의 상대 위치가 실제 지리와 맞도록 좌표만 정확히 투영한다
 * (notes/decisions.md G52 보고 대상).
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

export type WorldMapView = {
  /** 거점별 마커 상태 — base(본거지, 로컬 시세 프리미엄) > visited(방문만) > unvisited */
  markerState: Record<SiteId, WorldMapMarkerState>;
  /** 강조 표시할 거점(선택 중) */
  selected?: SiteId | null;
  /** 현재 이동 중이거나 현지작업 중인 발굴단의 목적지 — 연결선을 굵게 그린다 */
  activeTeamTargets?: SiteId[];
};

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

/** 세계 줌 캔버스를 그린다. `ctx.canvas`는 반드시 MAP_W×MAP_H(640×320)이어야 한다 */
export function drawWorldMap(ctx: CanvasRenderingContext2D, view: WorldMapView) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PALETTE.sky;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  drawGrid(ctx);

  const bases = SITES.filter((s) => view.markerState[s.id] === "base");
  const activeTargets = new Set(view.activeTeamTargets ?? []);

  // 연결선 — 보유 본거지에서 다른 모든 거점까지, 실제 원정이 거리를 지불한다는
  // 감각을 지도만 보고도 알 수 있게 한다(world-map.md §2 "계산 없이도 맞아떨어진다")
  for (const base of bases) {
    const from = projectToGrid(base.lat, base.lon);
    for (const s of SITES) {
      if (s.id === base.id) continue;
      const to = projectToGrid(s.lat, s.lon);
      const active = activeTargets.has(s.id);
      ctx.strokeStyle = active ? "rgba(240,205,85,0.55)" : "rgba(255,255,255,0.08)";
      ctx.lineWidth = active ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(toPx(from.gx), toPx(from.gy));
      ctx.lineTo(toPx(to.gx), toPx(to.gy));
      ctx.stroke();
    }
  }

  for (const s of SITES) {
    const { gx, gy } = projectToGrid(s.lat, s.lon);
    const x = toPx(gx);
    const y = toPx(gy);
    const state = view.markerState[s.id] ?? "unvisited";
    const selected = view.selected === s.id;

    if (selected) {
      ctx.strokeStyle = RAMPS.gold.ramp[3];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
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
