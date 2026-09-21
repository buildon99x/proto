import { useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  AUCTIONEER_LOGISTICS_COEFF, AUCTION_GRADE_MAX, AUCTION_SLOT_CAP_BY_GRADE, FOREMAN_HIRE_COST,
  MUSEUM_SLOT_BY_GRADE, SITES, SITE_BY_ID, TIER_NAME, auctionGradeCost, auctionHouseBuildCost, marketingLevelCost,
  museumBuildCost, museumGradeCost
} from "../game/balance";
import { auctionHouseOf, freshnessOf, museumOf, museumSlotCount, staffMarketCycle } from "../game/engine";
import { museumUpkeepHourly, museumVisitorIncomeHourly, museumVisitorsPerDay } from "../game/museum";
import { auctioneerSlotBonus, staffCandidates } from "../game/staff";
import { clock, percent, won } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import { Modal } from "./Modal";
import { Sprite } from "./Sprite";
import type { Auctioneer, Curator, SiteId } from "../game/types";
import type { Game } from "./useGame";

type SubTab = "museum" | "auction";

/** 시설 탭(notes/ux-v02.md §1.3) — [박물관][경매장] 상시 서브탭. base가 여럿이면
 *  거점 선택 행이 하나 더 붙는다(서브탭 전환과 별개 — 표에는 안 잡히는 "요청해야
 *  보인다" 층의 세부 관리다). */
export function FacilityView({ game }: { game: Game }) {
  const { world } = game;
  const [sub, setSub] = useState<SubTab>("museum");
  const bases = SITES.filter((s) => world.sites[s.id].unlocked);
  const [site, setSite] = useState<SiteId>(bases[0]?.id ?? world.activeSite);
  const activeSite = bases.some((s) => s.id === site) ? site : bases[0]?.id;

  return (
    <div className="facility">
      <nav className="subtabs" role="tablist">
        <button type="button" className={sub === "museum" ? "active" : ""} onClick={() => setSub("museum")}>박물관</button>
        <button type="button" className={sub === "auction" ? "active" : ""} onClick={() => setSub("auction")}>경매장</button>
      </nav>

      {bases.length > 1 ? (
        <div className="facility-site-picker">
          {bases.map((s) => (
            <button key={s.id} type="button" className={activeSite === s.id ? "active" : ""} onClick={() => setSite(s.id)}>
              {s.city}
            </button>
          ))}
        </div>
      ) : null}

      {!activeSite ? (
        <p className="empty">아직 base가 없다 — 발굴 탭에서 거점을 먼저 연다.</p>
      ) : sub === "museum" ? (
        <MuseumPanel game={game} site={activeSite} />
      ) : (
        <AuctionPanel game={game} site={activeSite} />
      )}
    </div>
  );
}

function MuseumPanel({ game, site }: { game: Game; site: SiteId }) {
  const { world } = game;
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const museum = museumOf(world, site);
  const slotCount = museumSlotCount(world, site);
  const displayed = world.vault.filter((v) => v.displayed && v.museumSite === site);
  const curator = world.staff.find((s) => s.id === museum.curatorId && s.role === "curator") as Curator | undefined;

  const slots = displayed.map((v) => ({ tier: ARTIFACT_BY_ID[v.artifactId].tier, freshness: freshnessOf(v, world.t) }));
  const visitors = museumVisitorsPerDay(SITES.find((s) => s.id === site)!.population, slots, curator?.curation ?? 0, museum.marketingLevel);
  const incomeHourly = museumVisitorIncomeHourly(visitors);
  const upkeepHourly = museumUpkeepHourly(incomeHourly);

  const built = museum.grade > 0;
  const cycle = staffMarketCycle(world);
  const candidates = staffCandidates(site, cycle, "curator");

  return (
    <section className="card">
      <div className="card-head">
        <h3>{SITE_BY_ID[site].city} 박물관 — {built ? `등급${museum.grade}` : "임시 전시대"}</h3>
        <span className="muted small">순수익 {won(Math.max(0, incomeHourly - upkeepHourly))}₩/h · 관람 {Math.round(visitors).toLocaleString("ko-KR")}명/일</span>
      </div>

      <div className="museum-slots">
        {Array.from({ length: slotCount }, (_, slot) => {
          const item = displayed.find((v) => v.slot === slot);
          if (!item) {
            return (
              <button key={slot} type="button" className="museum-slot empty" onClick={() => setPickSlot(slot)}>
                + 빈칸
              </button>
            );
          }
          const a = ARTIFACT_BY_ID[item.artifactId];
          return (
            <div key={slot} className="museum-slot filled">
              <Sprite artifact={a} size={40} />
              <span className="muted small">신선도 {percent(freshnessOf(item, world.t))}</span>
              <button type="button" className="ghost" onClick={() => game.undisplay(item.uid)}>보관소로</button>
            </div>
          );
        })}
      </div>
      {pickSlot !== null ? (
        <MuseumSlotPicker game={game} site={site} slot={pickSlot} onClose={() => setPickSlot(null)} />
      ) : null}

      <div className="facility-actions">
        {!built ? (
          <button type="button" disabled={world.funds < museumBuildCost(world.museums.length + 1)} onClick={() => game.buildMuseum(site)}>
            박물관 건립 — {won(museumBuildCost(world.museums.length + 1))} ₩
          </button>
        ) : museum.grade < MUSEUM_SLOT_BY_GRADE.length - 1 ? (
          <button type="button" disabled={world.funds < museumGradeCost(museum.grade)} onClick={() => game.upgradeMuseumGrade(site)}>
            등급 승급 — {won(museumGradeCost(museum.grade))} ₩
          </button>
        ) : null}
        {built ? (
          <button type="button" disabled={world.funds < marketingLevelCost(museum.marketingLevel)} onClick={() => game.buyMuseumMarketing(site)}>
            마케팅 Lv.{museum.marketingLevel} → {won(marketingLevelCost(museum.marketingLevel))} ₩
          </button>
        ) : null}
      </div>

      {built ? (
        <div className="staff-hire">
          <h4>관장 {curator ? `— ${curator.name}(보안감각 ${curator.securitySense})` : "미고용"}</h4>
          {!curator ? (
            <div className="candidate-list">
              {candidates.map((c, slot) => (
                <button
                  key={slot}
                  type="button"
                  className="candidate-row"
                  disabled={world.funds < FOREMAN_HIRE_COST || c.role !== "curator"}
                  onClick={() => game.hireCurator(site, slot)}
                >
                  <strong>{c.name}</strong>
                  <span className="muted small">전시노하우 {c.role === "curator" ? c.curation : 0} · 보안감각 {c.role === "curator" ? c.securitySense : 0}</span>
                  <span className="price">{won(FOREMAN_HIRE_COST)} ₩</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function MuseumSlotPicker({ game, site, slot, onClose }: { game: Game; site: SiteId; slot: number; onClose: () => void }) {
  const { world } = game;
  const available = world.vault.filter((v) => !v.displayed);
  return (
    <Modal title="전시할 유물 선택" onClose={onClose}>
      {available.length === 0 ? (
        <p className="empty">전시할 수 있는(비전시) 유물이 없다.</p>
      ) : (
        <ul className="swap-list">
          {available.map((v) => {
            const a = ARTIFACT_BY_ID[v.artifactId];
            return (
              <li key={v.uid}>
                <Sprite artifact={a} size={32} />
                <span>{a.name} <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em></span>
                <button type="button" className="ghost" onClick={() => { game.display(v.uid, site, slot); onClose(); }}>
                  이 칸에 전시
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

function AuctionPanel({ game, site }: { game: Game; site: SiteId }) {
  const { world } = game;
  const house = auctionHouseOf(world, site);
  const cycle = staffMarketCycle(world);
  const candidates = staffCandidates(site, cycle, "auctioneer");

  if (!house) {
    return (
      <section className="card">
        <h3>{SITE_BY_ID[site].city} 경매장 — 미건립</h3>
        <button type="button" disabled={world.funds < auctionHouseBuildCost(world.auctionHouses.length + 1)} onClick={() => game.buildAuctionHouse(site)}>
          경매장 건립 — {won(auctionHouseBuildCost(world.auctionHouses.length + 1))} ₩
        </button>
      </section>
    );
  }

  const auctioneer = world.staff.find((s) => s.id === house.auctioneerId && s.role === "auctioneer") as Auctioneer | undefined;
  const activeCap = auctioneer ? auctioneerSlotBonus(house.grade, auctioneer.logistics) : AUCTION_SLOT_CAP_BY_GRADE[house.grade - 1];
  // 이론상 최댓값(B12-a) — 그 등급 cap + LOGISTICS=100일 때의 물류 보너스. 등급업 때만 그리드가 다시 그려진다.
  const theoreticalMax = AUCTION_SLOT_CAP_BY_GRADE[house.grade - 1] + Math.floor(100 * AUCTIONEER_LOGISTICS_COEFF);

  return (
    <section className="card">
      <div className="card-head">
        <h3>{SITE_BY_ID[site].city} 경매장 — 등급{house.grade}</h3>
        <span className="muted small">실질 {activeCap}/{theoreticalMax}칸</span>
      </div>

      <ul className="auction-slot-list">
        {Array.from({ length: theoreticalMax }, (_, i) => {
          const listing = house.listings[i];
          if (i >= activeCap) {
            return <li key={i} className="auction-slot locked">🔒 물류처리력 부족</li>;
          }
          if (!listing) {
            return <li key={i} className="auction-slot empty muted small">빈칸 — 소장고에서 "경매 등록"으로 채운다</li>;
          }
          const a = ARTIFACT_BY_ID[listing.artifactId];
          return (
            <li key={i} className="auction-slot filled">
              <span>{a.name}</span>
              <span className="muted small">낙찰까지 {clock(Math.max(0, listing.settleAt - world.t))}</span>
            </li>
          );
        })}
      </ul>

      <div className="facility-actions">
        {house.grade < AUCTION_GRADE_MAX ? (
          <button type="button" disabled={world.funds < auctionGradeCost(house.grade)} onClick={() => game.upgradeAuctionGrade(site)}>
            등급 승급 — {won(auctionGradeCost(house.grade))} ₩
          </button>
        ) : null}
      </div>

      <div className="staff-hire">
        <h4>경매관장 {auctioneer ? `— ${auctioneer.name}(물류처리력 ${auctioneer.logistics})` : "미고용"}</h4>
        {!auctioneer ? (
          <div className="candidate-list">
            {candidates.map((c, slot) => (
              <button
                key={slot}
                type="button"
                className="candidate-row"
                disabled={world.funds < FOREMAN_HIRE_COST || c.role !== "auctioneer"}
                onClick={() => game.hireAuctioneer(site, slot)}
              >
                <strong>{c.name}</strong>
                <span className="muted small">고객관리 {c.role === "auctioneer" ? c.negotiation : 0} · 물류처리력 {c.role === "auctioneer" ? c.logistics : 0}</span>
                <span className="price">{won(FOREMAN_HIRE_COST)} ₩</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
