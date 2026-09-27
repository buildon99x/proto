import { useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { BLACK_MARKET_BUY_PRICE_RATIO, BLACK_MARKET_SLOT_CAPACITY, BLACK_MARKET_STOLEN_PRICE_RATIO, TIER_NAME } from "../game/balance";
import { usd } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import { Sprite } from "./Sprite";
import { CrewNote } from "./Crew";
import type { BlackMarketListing } from "../game/types";
import type { Game } from "./useGame";

/**
 * 시장 탭(notes/ux-v02.md §1.3, §6.2) — 거래소 제거(G15/A4)로 암시장 단일 화면이다.
 * 고정 12슬롯(B12) — 데스크톱은 그리드, 모바일은 1열 리스트(B11, CSS 미디어
 * 쿼리로만 전환한다). 빈 칸도 "매물 없음" 행으로 자리를 지킨다.
 */
export function MarketView({ game }: { game: Game }) {
  const { world } = game;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const listings = world.blackMarket.listings.filter((l) => !q || ARTIFACT_BY_ID[l.artifactId].name.toLowerCase().includes(q));
  const rows: (BlackMarketListing | null)[] = [...listings];
  while (rows.length < BLACK_MARKET_SLOT_CAPACITY) rows.push(null);

  return (
    <div className="market">
      <CrewNote screen="market" />
      <input
        type="search"
        className="explorer-search"
        placeholder="🔍 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="market-grid">
        {rows.map((listing, i) => (
          <MarketRow key={listing?.id ?? `empty-${i}`} game={game} listing={listing} />
        ))}
      </div>
    </div>
  );
}

function MarketRow({ game, listing }: { game: Game; listing: BlackMarketListing | null }) {
  const { world } = game;
  if (!listing) {
    return <div className="market-row market-row-empty muted small">(매물 없음)</div>;
  }
  const a = ARTIFACT_BY_ID[listing.artifactId];
  const ratio = listing.kind === "stolen" ? BLACK_MARKET_STOLEN_PRICE_RATIO : BLACK_MARKET_BUY_PRICE_RATIO;
  const cost = Math.round(listing.estimate * ratio);
  const afford = world.funds >= cost;
  return (
    <div className="market-row">
      <Sprite artifact={a} size={40} />
      <span className="market-row-name">
        {a.name} <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
        {listing.kind === "stolen" ? <em className="market-stolen-badge">🏴 장물</em> : null}
      </span>
      <button type="button" className="ghost" disabled={!afford} onClick={() => game.buyBlackMarketListing(listing.id)}>
        {usd(cost)}
      </button>
    </div>
  );
}
