import { useMemo, useState } from "react";
import { SITES, SITE_BY_ID } from "../game/balance";
import { distanceKm, siteSearchText } from "../game/sites";
import { recommendSites, teamHomeSite } from "../game/engine";
import { won } from "../game/format";
import type { SiteId } from "../game/types";
import { MARKER_STYLE } from "../render/worldmap";
import { WorldMapCanvas } from "./WorldMapCanvas";
import { useBookmarks } from "./useBookmarks";
import type { Game } from "./useGame";

/**
 * 발굴 탭의 탐색 패널(notes/ux-v02.md §6.1) — 북마크·추천·검색·지도를 한 자리에
 * 묶는다. 거점 선택은 여기서 끝나고(표#1의 1단계), 실제 파견은 `DispatchSheet`가
 * 이어받는다. 모바일에서는 지도가 보조 시각화로 밀려난다(§5) — 리스트가 기본
 * 화면이고, "지도로 보기"를 눌러야 지도가 뜬다.
 *
 * 거점 표기는 전 화면 공통 규칙을 따른다(작업 지시 B4): **1차 도시명, 2차 앵커
 * 유적, 3차 나라**. 상태 뱃지의 색·글리프는 지도와 같은 `MARKER_STYLE`에서 온다.
 */
export function WorldExplorer({ game, onSelectSite }: { game: Game; onSelectSite: (site: SiteId) => void }) {
  const { world } = game;
  const { bookmarks, toggle, isBookmarked } = useBookmarks();
  const [query, setQuery] = useState("");
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const home = teamHomeSite(world);

  const distanceOf = (id: SiteId) => distanceKm(home, id);
  const stateOf = (id: SiteId) =>
    world.sites[id].unlocked ? "base" as const : world.visitedSites[id] ? "visited" as const : "unvisited" as const;

  const bookmarkedSorted = useMemo(
    () => bookmarks.map((id) => SITE_BY_ID[id]).sort((a, b) => distanceOf(a.id) - distanceOf(b.id)),
    [bookmarks, home]
  );

  const recommended = useMemo(() => recommendSites(world).map((id) => SITE_BY_ID[id]), [world]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // 도시명·나라·앵커·유물 종류 넷 모두에 걸린다 — 화면 1차 표기를 도시로
    // 바꿨다고 검색어에서까지 나라를 지우면 "이집트"로 찾던 사람이 길을 잃는다.
    const base = q ? SITES.filter((s) => siteSearchText(s).includes(q)) : SITES;
    return [...base].sort((a, b) => distanceOf(a.id) - distanceOf(b.id));
  }, [query, home]);

  return (
    <div className={`explorer${mobileMapOpen ? " mobile-map-open" : ""}`}>
      {bookmarkedSorted.length > 0 ? (
        <div className="explorer-block">
          <h4>★ 즐겨찾기</h4>
          <div className="explorer-chip-row">
            {bookmarkedSorted.map((s) => (
              <button key={s.id} type="button" className="explorer-chip" onClick={() => onSelectSite(s.id)}>
                {s.city} <em className="muted">{formatHours(distanceOf(s.id))}</em>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="explorer-block">
        <h4>추천 {recommended.length > 0 ? "" : <span className="muted small">(방문할 곳이 충분히 남았다)</span>}</h4>
        {recommended.length > 0 ? (
          <div className="explorer-chip-row">
            {recommended.map((s) => (
              <button key={s.id} type="button" className="explorer-chip explorer-chip-accent" onClick={() => onSelectSite(s.id)}>
                {s.city} <em className="muted">{s.country}</em>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small">12거점의 검증된 종을 이미 대부분 확보했다.</p>
        )}
      </div>

      <div className="explorer-block">
        <input
          type="search"
          className="explorer-search"
          placeholder="🔍 도시·나라·유적·유물 종류로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <button type="button" className="ghost wide explorer-map-toggle" onClick={() => setMobileMapOpen((v) => !v)}>
        {mobileMapOpen ? "목록으로 보기" : "🗺 지도로 보기"}
      </button>

      <div className="explorer-map-panel">
        <WorldMapCanvas world={world} selected={null} onSelectSite={onSelectSite} />
      </div>

      <div className="explorer-list-panel">
        {filtered.length === 0 ? (
          <p className="empty">"{query}"에 걸리는 거점이 없다.</p>
        ) : null}
        <ul className="site-list">
          {filtered.map((s) => {
            const sp = world.sites[s.id];
            const bookmarked = isBookmarked(s.id);
            const state = stateOf(s.id);
            return (
              <li key={s.id} className="site-row-line">
                <button type="button" className="star-btn" onClick={() => toggle(s.id)} aria-label="북마크">
                  {bookmarked ? "★" : "☆"}
                </button>
                <button type="button" className="site-row-main" onClick={() => onSelectSite(s.id)}>
                  <span>
                    <span className="worldmap-legend-glyph" style={{ color: MARKER_STYLE[state].color }} aria-hidden="true">
                      {MARKER_STYLE[state].glyph}
                    </span>
                    {s.city} <em className="muted small">{s.anchor} · {s.country}</em>
                  </span>
                  <span className="muted small">
                    {MARKER_STYLE[state].label} · {formatHours(distanceOf(s.id))} · {sp.layer}층
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function formatHours(km: number): string {
  const hours = km / 400; // EXPEDITION_SPEED_KMH — 표시용 대략치(단장 항해술 보정 전)
  if (hours < 1) return `${Math.round(hours * 60)}분`;
  return `${hours.toFixed(1)}h`;
}

export function unlockCostLabel(site: SiteId): string {
  return `${won(SITE_BY_ID[site].unlockCost)} ₩`;
}
