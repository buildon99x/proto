import { useMemo, useState } from "react";
import { SITES, SITE_BY_ID } from "../game/balance";
import { distanceKm } from "../game/sites";
import { recommendSites, teamHomeSite } from "../game/engine";
import { won } from "../game/format";
import type { SiteId } from "../game/types";
import { WorldMapCanvas } from "./WorldMapCanvas";
import { useBookmarks } from "./useBookmarks";
import type { Game } from "./useGame";

/**
 * 발굴 탭의 탐색 패널(notes/ux-v02.md §6.1) — 북마크·추천·검색·지도를 한 자리에
 * 묶는다. 거점 선택은 여기서 끝나고(표#1의 1단계), 실제 파견은 `DispatchSheet`가
 * 이어받는다. 모바일에서는 지도가 보조 시각화로 밀려난다(§5) — 리스트가 기본
 * 화면이고, "지도로 보기"를 눌러야 지도가 뜬다.
 */
export function WorldExplorer({ game, onSelectSite }: { game: Game; onSelectSite: (site: SiteId) => void }) {
  const { world } = game;
  const { bookmarks, toggle, isBookmarked } = useBookmarks();
  const [query, setQuery] = useState("");
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const home = teamHomeSite(world);

  const distanceOf = (id: SiteId) => distanceKm(home, id);

  const bookmarkedSorted = useMemo(
    () => bookmarks.map((id) => SITE_BY_ID[id]).sort((a, b) => distanceOf(a.id) - distanceOf(b.id)),
    [bookmarks, home]
  );

  // `world`는 엔진이 제자리에서 고치는 **같은 객체**다 — 의존성 배열에 넣어 봐야
  // 참조가 영원히 그대로라 추천이 마운트 시점에 굳는다(층이 깊어지고 거점을 열어도
  // 목록이 안 바뀐다). 추천 계산은 12거점 순회라 매 렌더 해도 싸다.
  const recommended = recommendSites(world).map((id) => SITE_BY_ID[id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? SITES.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.anchor.toLowerCase().includes(q) ||
            s.thematicCategory.some((c) => c.toLowerCase().includes(q))
        )
      : SITES;
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
                {s.name} <em className="muted">{formatHours(distanceOf(s.id))}</em>
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
                {s.name}
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
          placeholder="🔍 거점·유적·유물 종류로 검색"
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
        <ul className="site-list">
          {filtered.map((s) => {
            const sp = world.sites[s.id];
            const bookmarked = isBookmarked(s.id);
            return (
              <li key={s.id} className="site-row-line">
                <button type="button" className="star-btn" onClick={() => toggle(s.id)} aria-label="북마크">
                  {bookmarked ? "★" : "☆"}
                </button>
                <button type="button" className="site-row-main" onClick={() => onSelectSite(s.id)}>
                  <span>
                    {s.name} <em className="muted small">{s.anchor}</em>
                  </span>
                  <span className="muted small">
                    {sp.unlocked ? "base" : ""} {formatHours(distanceOf(s.id))} · {sp.layer}층
                    {!sp.unlocked && world.funds < s.unlockCost ? "" : ""}
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
