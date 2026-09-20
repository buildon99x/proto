import { useEffect, useMemo, useRef, useState } from "react";
import { MAP_REGION_ZOOM_FACTOR, SITES, SITE_BY_ID } from "../game/balance";
import { rivalExpeditions, teamHomeSite } from "../game/engine";
import { distanceKm } from "../game/sites";
import {
  MAP_H, MAP_W, MARKER_STYLE, drawWorldMap, hitRadiusForScale, pickSiteAt, siteScreenPositions
} from "../render/worldmap";
import type { MapZoom, WorldMapMarkerState } from "../render/worldmap";
import type { SiteId, World } from "../game/types";

/**
 * 세계지도 캔버스 — `render/worldmap.ts`를 React에 배선한다. 세계 줌 ↔ 권역 줌 2단.
 *
 * **조작 경로는 셋 다 같은 판정을 쓴다**(notes/decisions.md G69.4):
 * - 포인터: 캔버스 클릭 → `pickSiteAt`(가장 가까운 마커가 이긴다, 반경은 CSS 44px 기준)
 * - 키보드: 마커마다 투명 버튼을 얹은 오버레이 — Tab으로 거리순 순회, Enter로 진행,
 *   ESC로 권역 줌 해제. 캔버스는 포커스를 받지 못하므로 실제 `<button>`이 필요하다.
 * - 스크린리더: 그 버튼의 aria-label이 "도시명 · 상태 · 거리"를 읽는다.
 *
 * 오버레이 버튼은 `pointer-events: none`이라 포인터 판정을 가리지 않는다 — 밀집
 * 구간에서 44px 버튼끼리 겹치면 위에 쌓인 놈이 아래를 영영 가리기 때문이다.
 */
export function WorldMapCanvas({ world, selected, onSelectSite }: {
  world: World; selected: SiteId | null; onSelectSite: (site: SiteId) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomSite, setZoomSite] = useState<SiteId | null>(null);
  const [focusedSite, setFocusedSite] = useState<SiteId | null>(null);

  const zoom: MapZoom = zoomSite ? { center: zoomSite, factor: MAP_REGION_ZOOM_FACTOR } : null;
  const home = teamHomeSite(world);

  const markerState = useMemo(() => {
    const out = {} as Record<SiteId, WorldMapMarkerState>;
    for (const id of Object.keys(SITE_BY_ID) as SiteId[]) {
      out[id] = world.sites[id].unlocked ? "base" : world.visitedSites[id] ? "visited" : "unvisited";
    }
    return out;
  }, [world.sites, world.visitedSites]);

  /** Tab 순서 = 본거지에서 가까운 순. 지도를 눈으로 못 보는 사람에게도 "가까운
   *  곳부터"라는 순서가 원정 비용 감각과 같은 방향이다(world-map.md §2). */
  const byDistance = useMemo(
    () => [...SITES].sort((a, b) => distanceKm(home, a.id) - distanceKm(home, b.id)),
    [home]
  );

  const rivalTargets = useMemo(
    () => rivalExpeditions(world).filter((r) => r.status === "chasing").map((r) => r.site),
    [world]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const activeTeamTargets = world.teams.filter((t) => t.status !== "idle").map((t) => t.targetSite);
    const stats = drawWorldMap(
      ctx, { markerState, selected, focused: focusedSite, activeTeamTargets, rivalTargets }, zoom
    );
    // 스모크가 "라벨 생략 0건"을 여기서 읽는다(render가 스스로 센 값을 그대로 노출).
    canvas.dataset.labelsDrawn = String(stats.labelsDrawn);
    canvas.dataset.labelsOmitted = String(stats.labelsOmitted);
  });

  /** 권역 줌에서 ESC로 세계 줌 복귀. 지도 안 어디에 포커스가 있어도 먹는다. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && zoomSite) {
      e.preventDefault();
      e.stopPropagation();
      setZoomSite(null);
    }
  };

  /** 포인터·키보드가 공유하는 진행 규칙 — 세계 줌에서 누르면 권역으로, 권역 줌에서
   *  같은 거점을 다시 누르면 파견 시트로. §7의 "거점 선택 3단계 이내"를 지킨다
   *  (지도 2탭 = 1단계, 발굴단 선택 = 2단계, 파견 확정 = 3단계). */
  const advance = (hit: SiteId) => {
    if (zoom && hit === zoomSite) onSelectSite(hit);
    else setZoomSite(hit);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * MAP_W;
    const py = ((e.clientY - rect.top) / rect.height) * MAP_H;
    // 히트 반경을 CSS 표시 크기에서 역산한다 — 캔버스가 375px로 줄어 그려지면
    // 내부 좌표 1px은 화면에서 0.59px밖에 안 된다(v0.3은 이 환산이 없어서
    // 모바일 탭 영역이 규정의 1/4도 안 됐다).
    const hit = pickSiteAt(px, py, zoom, hitRadiusForScale(MAP_W / rect.width));
    if (hit) advance(hit);
  };

  const positions = siteScreenPositions(zoom);

  return (
    <div className="worldmap-wrap" data-zoom={zoomSite ?? ""} onKeyDown={handleKeyDown}>
      <div className="worldmap-stage">
        <canvas
          ref={canvasRef}
          width={MAP_W}
          height={MAP_H}
          className="worldmap-canvas"
          onClick={handleClick}
          aria-hidden="true"
        />
        {/* 포커스 오버레이 — 시각적으로는 투명하고, 키보드·스크린리더의 실제 타겟이다 */}
        <div className="worldmap-hitlayer" role="group" aria-label={
          zoomSite ? `${SITE_BY_ID[zoomSite].city} 권역 지도 — ESC로 세계 지도` : "세계 지도 — 거점 12곳"
        }>
          {byDistance.map((s) => {
            const p = positions[s.id];
            const visible = p.x >= 0 && p.x <= MAP_W && p.y >= 0 && p.y <= MAP_H;
            if (!visible) return null;
            const state = markerState[s.id];
            const km = Math.round(distanceKm(home, s.id));
            const stateLabel = MARKER_STYLE[state].label;
            const step = zoom && zoomSite === s.id ? "파견 시트 열기" : "권역으로 확대";
            return (
              <button
                key={s.id}
                type="button"
                className="worldmap-hit"
                style={{ left: `${(p.x / MAP_W) * 100}%`, top: `${(p.y / MAP_H) * 100}%` }}
                onFocus={() => setFocusedSite(s.id)}
                onBlur={() => setFocusedSite((cur) => (cur === s.id ? null : cur))}
                onClick={() => advance(s.id)}
                aria-label={`${s.city} · ${stateLabel} · ${km.toLocaleString("ko-KR")}km — ${step}`}
              />
            );
          })}
        </div>
      </div>

      <div className="worldmap-controls">
        <span className="muted small">
          {zoom
            ? `${SITE_BY_ID[zoomSite!].city} 권역 — 다시 누르면 파견 대상으로 선택 (ESC: 세계 지도)`
            : "거점을 눌러 권역으로 확대 · Tab으로 가까운 순 순회, Enter로 선택"}
        </span>
        {zoom ? (
          <button type="button" className="ghost" onClick={() => setZoomSite(null)}>
            세계 지도로
          </button>
        ) : null}
      </div>

      {/* 범례 — 색만으로 구분하지 않는다(색각 이상 대응). 글리프·라벨을 같이 준다.
          색·글리프는 `MARKER_STYLE` 한 곳에서 오므로 지도와 어긋날 수 없다. */}
      <ul className="worldmap-legend">
        {(["base", "visited", "unvisited", "selected", "rival-target"] as const).map((kind) => (
          <li key={kind}>
            <span className="worldmap-legend-glyph" style={{ color: MARKER_STYLE[kind].color }} aria-hidden="true">
              {MARKER_STYLE[kind].glyph}
            </span>
            {MARKER_STYLE[kind].label}
          </li>
        ))}
      </ul>

      {/* 지도 밖에서도 읽히는 현재 위치 — 색·점이 아니라 문장으로(작업 지시 C3) */}
      <ul className="worldmap-status">
        <li>
          <span className="worldmap-legend-glyph" style={{ color: MARKER_STYLE.base.color }} aria-hidden="true">◆</span>
          본거지 {SITES.filter((s) => markerState[s.id] === "base").map((s) => s.city).join(" · ") || "없음"}
        </li>
        <li>
          <span className="worldmap-legend-glyph" style={{ color: MARKER_STYLE.visited.color }} aria-hidden="true">▶</span>
          발굴단 {world.teams.length === 0
            ? "없음"
            : world.teams
                .map((t, i) => `${i + 1}팀 ${SITE_BY_ID[t.targetSite].city}${t.status === "idle" ? "(대기)" : ""}`)
                .join(" · ")}
        </li>
        <li>
          <span className="worldmap-legend-glyph" style={{ color: MARKER_STYLE["rival-target"].color }} aria-hidden="true">⊘</span>
          라이벌 추격 {rivalTargets.length === 0
            ? "없음"
            : rivalTargets.map((id) => SITE_BY_ID[id].city).join(" · ")}
        </li>
      </ul>
    </div>
  );
}
