import { useState } from "react";
import { vaultCareLine } from "./vaultCare";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  AUCTIONEER_LOGISTICS_COEFF, AUCTION_GRADE_MAX, AUCTION_SLOT_CAP_BY_GRADE, FOREMAN_HIRE_COST,
  MUSEUM_SLOT_BY_GRADE, SITES, SITE_BY_ID, THEFT_APPLICABLE_MAX_TIER, TIER_NAME, auctionGradeCost,
  CONDITION_TICK_SECONDS, auctionHouseBuildCost, conditionDecayChancePerDay, humidityLevelCost,
  marketingLevelCost,
  museumBuildCost, museumGradeCost, restorationAttemptHours, restorationLevelCost,
  restorationSuccessChance, securityLevelCost, theftInitialGraceHours, vaultCapacity, vaultLevelCost
} from "../game/balance";
import { auctionHouseOf, freshnessOf, museumOf, museumSlotCount, staffMarketCycle, codexProgress } from "../game/engine";
import { museumUpkeepHourly, museumVisitorIncomeHourly, museumVisitorsPerDay } from "../game/museum";
import { auctioneerSlotBonus, staffCandidates } from "../game/staff";
import { clock, percent, usd } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import { Modal } from "./Modal";
import { Sprite } from "./Sprite";
import type { Auctioneer, Curator, SiteId } from "../game/types";
import type { Game } from "./useGame";

type SubTab = "storage" | "museum" | "auction";

/** 시설 탭(notes/ux-v02.md §1.3) — [보관소][박물관][경매장] 상시 서브탭. base가 여럿이면
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
        <button type="button" className={sub === "storage" ? "active" : ""} onClick={() => setSub("storage")}>보관소</button>
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

      {sub === "storage" ? (
        <StoragePanel game={game} />
      ) : !activeSite ? (
        <p className="empty">아직 base가 없다 — 발굴 탭에서 거점을 먼저 연다.</p>
      ) : sub === "museum" ? (
        <MuseumPanel game={game} site={activeSite} />
      ) : (
        <AuctionPanel game={game} site={activeSite} />
      )}
    </div>
  );
}

/**
 * 보관소(spec.md §9.3·§9.4) — 정원·습도조절·복원기술·보안.
 *
 * **왜 이 패널이 뒤늦게 생겼나.** 네 시스템 모두 엔진에는 처음부터 있었고
 * (`buyVaultLevel`·`buyHumidityLevel`·`buyRestorationLevel`·`buySecurityLevel`),
 * `useGame`도 그대로 내보냈고, 시뮬 정책(`sim/policy.ts`의 `ensureFacilities`)은
 * 이걸 사 왔다 — 그래서 168시간 기준선은 "보관소를 키운 플레이"였다. 그런데
 * **어떤 화면도 그 함수를 부르지 않았다.** 플레이 계측이 "조작 단계 수를 셀 수
 * 없는 조작 15회"로 이 공백을 처음 드러냈다(`eval.md` §20.4).
 *
 * 소장고 탭은 이미 "정원을 넘기면 보존 저하가 2배"라고 경고하고 있었는데,
 * 정작 정원을 올릴 방법이 없었다 — 문제를 알려 주고 해결 수단을 주지 않는 화면이었다.
 */
function StoragePanel({ game }: { game: Game }) {
  const { world } = game;
  const stored = world.vault.filter((v) => !v.displayed).length;
  const owned = codexProgress(world).owned;
  const capacity = vaultCapacity(world.vaultLevel, owned);
  const over = stored - capacity;

  return (
    <section className="card">
      <div className="card-head">
        <h3>보관소</h3>
        <span className="muted small">
          {stored} / {capacity}점 보관 중{over > 0 ? ` · ${over}점 초과` : ""}
        </span>
      </div>
      {over > 0 ? <p className="stalled small">{vaultCareLine(world)}</p> : null}

      <div className="storage-upgrades">
        <StorageUpgrade
          label="정원"
          now={`${capacity}점`}
          next={`${vaultCapacity(world.vaultLevel + 1, owned)}점`}
          detail={`Lv.${world.vaultLevel} — 정원을 넘기면 보존 저하가 2배가 된다`}
          cost={vaultLevelCost(world.vaultLevel)}
          funds={world.funds}
          onBuy={game.buyVaultLevel}
        />
        <StorageUpgrade
          label="습도조절"
          // `percent()`가 이미 100을 곱한다 — 예전엔 여기서 한 번 더 곱해 3.85%가
          // **384.62%**로 표시됐다(v0.3.3부터, 앱을 띄워 보고서야 드러났다).
          now={percent(conditionDecayChancePerDay(world.humidityLevel, false), 2)}
          next={percent(conditionDecayChancePerDay(world.humidityLevel + 1, false), 2)}
          // "하루당"이 아니라 **판정 격자당**이다(v0.6.3이 격자를 2.8시간으로 바꿨다,
          // G93). 상수에서 직접 읽어 화면과 규칙이 갈라지지 않게 한다(척추 5번).
          detail={`Lv.${world.humidityLevel} — ${(CONDITION_TICK_SECONDS / 3600).toFixed(1)}시간마다 보존 상태가 한 칸 내려갈 확률`}
          cost={humidityLevelCost(world.humidityLevel)}
          funds={world.funds}
          onBuy={game.buyHumidityLevel}
        />
        <StorageUpgrade
          label="복원기술"
          now={`${restorationAttemptHours(world.restorationLevel).toFixed(1)}h · ${percent(restorationSuccessChance(world.restorationLevel))}`}
          next={`${restorationAttemptHours(world.restorationLevel + 1).toFixed(1)}h · ${percent(restorationSuccessChance(world.restorationLevel + 1))}`}
          detail={`Lv.${world.restorationLevel} — 시도 간격과 성공률(자동으로 돈다, 조작 없음)`}
          cost={restorationLevelCost(world.restorationLevel)}
          funds={world.funds}
          onBuy={game.buyRestorationLevel}
        />
        <StorageUpgrade
          label="보안"
          now={`${theftInitialGraceHours(world.securityLevel).toFixed(1)}h`}
          next={`${theftInitialGraceHours(world.securityLevel + 1).toFixed(1)}h`}
          detail={`Lv.${world.securityLevel} — 전시 시작 후 도난 판정이 유예되는 시간(${TIER_NAME[THEFT_APPLICABLE_MAX_TIER]} 이하만 도난 대상)`}
          cost={securityLevelCost(world.securityLevel)}
          funds={world.funds}
          onBuy={game.buySecurityLevel}
        />
      </div>
      <p className="muted small">
        네 가지 모두 <strong>켜 두면 알아서 도는</strong> 배경 설비다 — 올리고 나면 따로 누를 것이 없다(척추 4번).
      </p>
    </section>
  );
}

function StorageUpgrade({ label, now, next, detail, cost, funds, onBuy }: {
  label: string; now: string; next: string; detail: string; cost: number; funds: number; onBuy: () => void;
}) {
  const afford = funds >= cost;
  return (
    <div className="storage-row">
      <div className="storage-row-main">
        <strong>{label}</strong>
        <em className="muted small">{detail}</em>
        <span className="muted small">{now} → {next}</span>
      </div>
      <button type="button" disabled={!afford} onClick={onBuy}>
        {label} 확장 — {usd(cost)}
      </button>
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
        <span className="muted small">순수익 {usd(Math.max(0, incomeHourly - upkeepHourly))}/h · 관람 {Math.round(visitors).toLocaleString("ko-KR")}명/일</span>
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
            박물관 건립 — {usd(museumBuildCost(world.museums.length + 1))}
          </button>
        ) : museum.grade < MUSEUM_SLOT_BY_GRADE.length - 1 ? (
          <button type="button" disabled={world.funds < museumGradeCost(museum.grade)} onClick={() => game.upgradeMuseumGrade(site)}>
            등급 승급 — {usd(museumGradeCost(museum.grade))}
          </button>
        ) : null}
        {built ? (
          <button type="button" disabled={world.funds < marketingLevelCost(museum.marketingLevel)} onClick={() => game.buyMuseumMarketing(site)}>
            마케팅 Lv.{museum.marketingLevel} → {usd(marketingLevelCost(museum.marketingLevel))}
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
                  <span className="price">{usd(FOREMAN_HIRE_COST)}</span>
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
          경매장 건립 — {usd(auctionHouseBuildCost(world.auctionHouses.length + 1))}
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
            등급 승급 — {usd(auctionGradeCost(house.grade))}
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
                <span className="price">{usd(FOREMAN_HIRE_COST)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
