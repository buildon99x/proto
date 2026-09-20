import { useEffect, useRef, useState } from "react";
import { SITE_BY_ID } from "../game/balance";
import { rivalExpeditions } from "../game/engine";
import {
  MAP_H, MAP_W, drawWorldMap, pickSiteAt
} from "../render/worldmap";
import type { MapZoom, WorldMapMarkerState } from "../render/worldmap";
import type { SiteId, World } from "../game/types";
import { MAP_REGION_ZOOM_FACTOR } from "../game/balance";

/** 세계지도 캔버스 — `render/worldmap.ts`를 React에 배선한다(notes/decisions.md
 *  G52.9가 미배선으로 남긴 부분). 세계 줌 ↔ 권역 줌(거점 마커를 탭하면 확대) 2단. */
export function WorldMapCanvas({ world, selected, onSelectSite }: {
  world: World; selected: SiteId | null; onSelectSite: (site: SiteId) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomSite, setZoomSite] = useState<SiteId | null>(null);

  const zoom: MapZoom = zoomSite ? { center: zoomSite, factor: MAP_REGION_ZOOM_FACTOR } : null;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const markerState: Record<SiteId, WorldMapMarkerState> = {} as Record<SiteId, WorldMapMarkerState>;
    for (const id of Object.keys(SITE_BY_ID) as SiteId[]) {
      markerState[id] = world.sites[id].unlocked ? "base" : world.visitedSites[id] ? "visited" : "unvisited";
    }
    const activeTeamTargets = world.teams.filter((t) => t.status !== "idle").map((t) => t.targetSite);
    const rivalTargets = rivalExpeditions(world).filter((r) => r.status === "chasing").map((r) => r.site);
    drawWorldMap(ctx, { markerState, selected, activeTeamTargets, rivalTargets }, zoom);
  });

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * MAP_W;
    const py = ((e.clientY - rect.top) / rect.height) * MAP_H;
    const hit = pickSiteAt(px, py, zoom, zoom ? 20 : 10);
    if (!hit) return;
    if (zoom && hit === zoomSite) {
      onSelectSite(hit);
    } else if (zoom) {
      setZoomSite(hit);
    } else {
      setZoomSite(hit);
    }
  };

  return (
    <div className="worldmap-wrap">
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        className="worldmap-canvas"
        onClick={handleClick}
        aria-label="세계지도 — 거점을 눌러 확대, 확대 중 다시 눌러 선택"
      />
      <div className="worldmap-controls">
        {zoom ? (
          <>
            <span className="muted small">{SITE_BY_ID[zoomSite!].name} 권역 — 다시 누르면 파견 대상으로 선택</span>
            <button type="button" className="ghost" onClick={() => setZoomSite(null)}>
              세계 지도로
            </button>
          </>
        ) : (
          <span className="muted small">거점을 눌러 권역으로 확대</span>
        )}
      </div>
    </div>
  );
}
