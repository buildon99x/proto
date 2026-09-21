import { useMemo, useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  APPRAISAL_UNLOCK_LAB_LEVEL, APPRAISE_FEE, AUTO_SELL_SPARE_MAX_TIER, BLIND_SELL_RATE, CONDITION_NAME,
  LOCKED_HOLD_CAP, SITES, SITE_BY_ID, TIER_NAME, appraiseSeconds, vaultCapacity
} from "../game/balance";
import { freshnessOf, museumOf, museumSlotCount, spareVaultItems } from "../game/engine";
import { won } from "../game/format";
import { museumVisitorIncomeHourly, museumVisitorsPerDay } from "../game/museum";
import { TIER_COLOR } from "../render/palette";
import { auctionPriceMult } from "../game/staff";
import { Modal } from "./Modal";
import { SPARE_SELL_OPTIONS } from "./sellOptions";
import { Sprite } from "./Sprite";
import { ArtifactDetailBlock } from "./ArtifactDetail";
import type { Artifact, Auctioneer, Condition, Curator, SiteId, Tier, VaultItem, World } from "../game/types";
import type { Game } from "./useGame";

type Stack = { artifact: Artifact; items: VaultItem[] };

/**
 * 소장고 탭(spec.md §3.1.1, notes/ux-v02.md §6.5) — 미감정·봉인 보관·소장고
 * 세 블록. 미감정·봉인 보관은 고정 높이(내부 스크롤)라 요소 수가 늘어도 그
 * 옆(또는 아래) 소장고 그리드가 밀리지 않는다(B12-c).
 */
export function VaultView({ game }: { game: Game }) {
  const { world } = game;
  const [selected, setSelected] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);
  const [conditionFilter, setConditionFilter] = useState<Condition | null>(null);
  const [siteFilter, setSiteFilter] = useState<SiteId | null>(null);

  const stacks = useMemo<Stack[]>(() => {
    const byId = new Map<string, Stack>();
    for (const item of world.vault) {
      const hit = byId.get(item.artifactId);
      if (hit) hit.items.push(item);
      else byId.set(item.artifactId, { artifact: ARTIFACT_BY_ID[item.artifactId], items: [item] });
    }
    return [...byId.values()].sort(
      (a, b) => b.artifact.tier - a.artifact.tier || a.artifact.name.localeCompare(b.artifact.name, "ko")
    );
  }, [world.vault]);

  const filtered = stacks.filter((s) => {
    if (tierFilter !== null && s.artifact.tier !== tierFilter) return false;
    if (siteFilter !== null && s.artifact.site !== siteFilter) return false;
    if (conditionFilter !== null && !s.items.some((i) => i.condition === conditionFilter)) return false;
    return true;
  });

  const picked = stacks.find((s) => s.artifact.id === selected) ?? null;
  const usedSites = [...new Set(stacks.map((s) => s.artifact.site))];

  const sealed = world.pending.filter((p) => world.lab < APPRAISAL_UNLOCK_LAB_LEVEL[ARTIFACT_BY_ID[p.artifactId].tier]);
  const activeQueue = world.pending.filter((p) => !sealed.includes(p));
  const sealedT2 = sealed.filter((p) => ARTIFACT_BY_ID[p.artifactId].tier === 2).length;

  return (
    <div className="vault">
      <div className="vault-left">
        <section className="card vault-pending">
          <h3>
            미감정 <span className="muted">{activeQueue.length}</span>
          </h3>
          <p className="muted small">
            감정을 기다릴 것인가, 지금 {Math.round(BLIND_SELL_RATE * 100)}%에 털 것인가.
            감정에는 1점당 {appraiseSeconds(world.lab).toFixed(1)}초와 추정가의 2%가 든다.
          </p>
          <div className="pending-body">
            {activeQueue.length === 0 ? (
              <p className="empty">대기 중인 유물이 없다.</p>
            ) : (
              <ul className="pending-list">
                {activeQueue.map((p) => {
                  const fee = Math.round(p.estimate * APPRAISE_FEE);
                  const stalled = world.funds < fee && world.appraisalVouchers === 0;
                  return (
                    <li key={p.uid}>
                      <span className="card-back">?</span>
                      <span className="pending-info">
                        <em className={stalled ? "stalled" : "muted"}>
                          {stalled ? `자금 부족 — 감정비 ${won(fee)} ₩ 필요` : `감정까지 ${p.remain.toFixed(1)}초`}
                        </em>
                        <span>추정 {won(p.estimate)} ₩</span>
                      </span>
                      <button type="button" className="ghost" onClick={() => game.blind(p.uid)}>
                        {won(Math.round(p.estimate * BLIND_SELL_RATE))} ₩
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <button type="button" className="ghost wide" disabled={world.pending.length === 0} onClick={game.blindAll}>
            전부 미감정 매각
          </button>
        </section>

        <section className="card vault-sealed">
          <h3>
            봉인 보관 <span className={`muted${sealedT2 >= LOCKED_HOLD_CAP ? " stalled" : ""}`}>{sealed.length}</span>
          </h3>
          <p className="muted small">
            감정소 티어가 못 미치는 유물은 여기서 무기한 기다린다 — 파손·강제매각 없음. 감정소를 올리면 다음 틱부터
            자동으로 합류한다.
          </p>
          <div className="sealed-body">
            {sealed.length === 0 ? (
              <p className="empty">봉인된 유물이 없다.</p>
            ) : (
              <ul className="pending-list">
                {sealed.map((p) => {
                  const a = ARTIFACT_BY_ID[p.artifactId];
                  return (
                    <li key={p.uid}>
                      <span className="card-back">🔒</span>
                      <span className="pending-info">
                        <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
                        <span className="muted small">감정소 Lv.{APPRAISAL_UNLOCK_LAB_LEVEL[a.tier]} 필요</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {sealedT2 >= LOCKED_HOLD_CAP ? (
            <p className="stalled small">진귀 봉인 {sealedT2}점 — 감정소를 올려 정리하는 걸 권한다(방치해도 손실은 없다).</p>
          ) : null}
        </section>
      </div>

      <section className="card vault-main">
        <div className="card-head">
          <h3>
            소장고 <span className="muted">{world.vault.length}점 · {stacks.length}종</span>
          </h3>
        </div>
        <p className="muted small">
          팔면 자금이 늘고 <strong>순위는 떨어진다.</strong> 자산 점수는 전시 중이 아닌 소장 유물의 평가액 합이다.
        </p>

        <SpareStrip game={game} />

        <div className="filter-chips">
          <FilterSelect
            label="티어"
            value={tierFilter}
            onChange={setTierFilter}
            options={TIER_NAME.map((n, i) => ({ label: n, value: i as Tier }))}
          />
          <FilterSelect
            label="상태"
            value={conditionFilter}
            onChange={setConditionFilter}
            options={CONDITION_NAME.map((n, i) => ({ label: n, value: i as Condition }))}
          />
          <FilterSelect
            label="거점"
            value={siteFilter}
            onChange={setSiteFilter}
            options={usedSites.map((id) => ({ label: SITE_BY_ID[id].city, value: id }))}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="empty">{stacks.length === 0 ? "아직 소장한 유물이 없다." : "필터에 맞는 유물이 없다."}</p>
        ) : (
          <div className="vault-grid">
            {filtered.map((s) => {
              const displayedCount = s.items.filter((i) => i.displayed).length;
              return (
                <button
                  key={s.artifact.id}
                  type="button"
                  className={`stack${selected === s.artifact.id ? " picked" : ""}`}
                  onClick={() => setSelected(s.artifact.id)}
                  title={`${s.artifact.name} ×${s.items.length}`}
                >
                  <Sprite artifact={s.artifact} size={44} />
                  {s.items.length > 1 ? <i className="stack-count">{s.items.length}</i> : null}
                  {displayedCount > 0 ? <i className="stack-displayed" title="전시 중">🖼</i> : null}
                </button>
              );
            })}
          </div>
        )}

        {picked ? <Detail game={game} stack={picked} /> : null}
      </section>
    </div>
  );
}

/**
 * 중복 정리 스트립(v0.3.1, notes/decisions.md G68) — 희귀도 조건을 고르고, 지금
 * 정리하고, 왜 정리해야 하는지(정원 초과 시 보존 저하 2배)를 한 줄에 모은다.
 *
 * 설정 모달(ux-v02.md §1.4가 설정을 한자리로 모은 그곳)에도 같은 항목이 있지만,
 * 여기 있는 것은 **같은 설정값 하나**를 유물이 실제로 쌓이는 화면에서 만지게
 * 하는 것이다(두 번째 설정이 아니다 — 둘 다 `world.settings.autoSellSpareBelow`를
 * 읽고 쓴다). 조건을 정하는 화면과 결과를 보는 화면이 다르면 "몇 점이 팔리는가"를
 * 확인할 방법이 없다.
 *
 * 대상 점수·금액은 엔진의 `spareVaultItems()`를 그대로 불러 센다 — 화면이 규칙을
 * 다시 구현하지 않는다.
 */
function SpareStrip({ game }: { game: Game }) {
  const { world } = game;
  const rule = world.settings.autoSellSpareBelow;
  // 설정과 무관한 "지금 소장고에 있는 중복분 전체"(상한 티어 기준) — 기능을 꺼 둔
  // 플레이어에게도 정리할 거리가 얼마나 쌓였는지는 보여야 한다.
  const all = spareVaultItems(world, AUTO_SELL_SPARE_MAX_TIER);
  const targeted = spareVaultItems(world, rule);
  const targetedValue = targeted.reduce((sum, i) => sum + i.value, 0);
  const stored = world.vault.filter((v) => !v.displayed).length;
  const capacity = vaultCapacity(world.vaultLevel);

  return (
    <div className="spare-strip">
      <div className="spare-line">
        <span>
          중복 <strong>{all.length}</strong>점 <em className="muted small">진귀 이하 · 종당 1점은 제외</em>
        </span>
        <label className="filter-chip">
          자동 정리
          <select
            value={rule === null ? "off" : String(rule)}
            onChange={(e) =>
              game.setAutoSellSpare(e.target.value === "off" ? null : (Number(e.target.value) as Tier))
            }
          >
            {SPARE_SELL_OPTIONS.map((o) => (
              <option key={o.label} value={o.value === null ? "off" : String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ghost"
          disabled={targeted.length === 0}
          onClick={() => game.sellSpares(rule)}
        >
          {rule === null
            ? "지금 정리 — 기준을 고르면 켜진다"
            : `지금 정리 ${targeted.length}점 · ${won(targetedValue)} ₩`}
        </button>
      </div>
      {stored > capacity ? (
        <p className="stalled small">
          소장고 정원 {capacity}점을 {stored - capacity}점 넘겼다 — 넘긴 동안은 <strong>모든</strong> 소장 유물의
          보존 상태 저하 확률이 2배가 된다.
        </p>
      ) : (
        <p className="muted small">
          종당 1점, 전시 중인 사본, 국보·유일은 설정과 무관하게 남는다(방치 중에도 돈다). 회수한 자금은
          거점 해금·시설·원정에 <strong>쓸 때만</strong> 순위로 돌아온다 — 쌓아 두기만 하면 자산 축만 깎인다.
        </p>
      )}
    </div>
  );
}

function FilterSelect<T extends string | number>({ label, value, onChange, options }: {
  label: string; value: T | null; onChange: (v: T | null) => void; options: { label: string; value: T }[];
}) {
  return (
    <label className="filter-chip">
      {label}
      <select
        value={value === null ? "all" : String(value)}
        onChange={(e) => {
          if (e.target.value === "all") return onChange(null);
          const match = options.find((o) => String(o.value) === e.target.value);
          onChange(match ? match.value : null);
        }}
      >
        <option value="all">전체</option>
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Detail({ game, stack }: { game: Game; stack: Stack }) {
  const a = stack.artifact;
  const { world } = game;
  const available = stack.items.filter((i) => !i.displayed);
  const displayed = stack.items.filter((i) => i.displayed);
  const total = available.reduce((sum, i) => sum + i.value, 0);
  const unit = available[0]?.value ?? stack.items[0]?.value ?? 0;

  return (
    <div className="detail">
      <Sprite artifact={a} size={72} />
      <div className="detail-body">
        <h4>
          {a.name} {stack.items.length > 1 ? <span className="muted">×{stack.items.length}</span> : null}{" "}
          <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
        </h4>
        <p className="muted small">{a.era} · {a.origin} · 현 소장처 {a.holder}</p>
        <p className="note">{a.note}</p>
        {a.disputed ? <p className="disputed">반환 논쟁 — {a.disputed}</p> : null}
        <ArtifactDetailBlock artifact={a} />
        {available.length > 0 ? (
          <p className="muted small">
            상태 {available.map((i) => CONDITION_NAME[i.condition]).join(", ")}
          </p>
        ) : null}

        <div className="detail-actions">
          {available.length > 0 ? (
            <>
              <strong>{won(total)} ₩</strong>
              <button type="button" className="ghost" onClick={() => game.sell(a.id, 1)}>
                1점 매각 {won(unit)} ₩
              </button>
              {available.length > 1 ? (
                <button type="button" className="ghost" onClick={() => game.sell(a.id, available.length)}>
                  전부 매각
                </button>
              ) : null}
              <DisplayAction game={game} uid={available[0].uid} />
              <AuctionAction game={game} uid={available[0].uid} />
            </>
          ) : (
            <p className="muted small">전부 전시 중이다 — 팔거나 경매에 내려면 먼저 내려야 한다.</p>
          )}
        </div>

        {displayed.length > 0 ? (
          <ul className="displayed-list">
            {displayed.map((i) => (
              <li key={i.uid}>
                <span className="muted small">{SITE_BY_ID[i.museumSite!].city} 전시 중</span>
                <button type="button" className="ghost" onClick={() => game.undisplay(i.uid)}>
                  내리기
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/** 그 거점에 지금 이 유물을 전시하면 기대되는 시간당 관람수입(₩/s 아니라 ₩/h) —
 *  base 비교 칩(마무리 패스, notes/decisions.md G56)의 "가격" 지표다. 기존
 *  전시 슬롯 구성 + 이 유물(신선도 1.0)을 더해 museumVisitorsPerDay를 그대로
 *  재사용한다(엔진이 accrueMuseums에서 쓰는 것과 같은 순수 함수 — UI가 점수
 *  계산식을 새로 만들지 않는다). */
function estimateDisplayIncome(world: World, site: SiteId, artifact: Artifact): number {
  const museum = museumOf(world, site);
  const curator = world.staff.find((s) => s.id === museum.curatorId && s.role === "curator") as Curator | undefined;
  const existing = world.vault
    .filter((v) => v.displayed && v.museumSite === site)
    .map((v) => ({ tier: ARTIFACT_BY_ID[v.artifactId].tier, freshness: freshnessOf(v, world.t) }));
  const displayed = [...existing, { tier: artifact.tier, freshness: 1 }];
  const population = SITE_BY_ID[site].population;
  const visitors = museumVisitorsPerDay(population, displayed, curator?.curation ?? 0, museum.marketingLevel);
  return museumVisitorIncomeHourly(visitors);
}

/** 전시(표#3, spec.md §10.5) — 빈 슬롯이면 즉시(2단계), 다 찼으면 내릴 유물을
 *  고르는 확인이 1탭 더 붙는다(3단계). base가 여럿이면 base 비교 칩(가격 =
 *  기대 관람수입)을 상시 노출하고 최고가를 기본 선택한다 — 칩을 안 건드려도
 *  버튼 1탭으로 그대로 실행되므로 조작 단계 수(표#3, ux-v02.md §2)는 늘지
 *  않는다(notes/decisions.md G56, G55.7 보고를 닫는다). */
function DisplayAction({ game, uid }: { game: Game; uid: number }) {
  const { world } = game;
  const artifact = ARTIFACT_BY_ID[world.vault.find((v) => v.uid === uid)!.artifactId];
  const [swapping, setSwapping] = useState(false);
  const [chosenId, setChosenId] = useState<SiteId | null>(null);
  const bases = SITES.filter((s) => world.sites[s.id].unlocked);
  if (bases.length === 0) return null;
  const ranked = [...bases].sort(
    (a, b) => estimateDisplayIncome(world, b.id, artifact) - estimateDisplayIncome(world, a.id, artifact)
  );
  const site = chosenId ?? ranked[0].id;
  const slotCount = museumSlotCount(world, site);
  const displayedHere = world.vault.filter((v) => v.displayed && v.museumSite === site);
  const takenSlots = new Set(displayedHere.map((v) => v.slot));
  let emptySlot: number | null = null;
  for (let i = 0; i < slotCount; i++) {
    if (!takenSlots.has(i)) { emptySlot = i; break; }
  }

  return (
    <>
      {ranked.length > 1 ? (
        <div className="base-chips" role="group" aria-label="전시할 거점 선택">
          {ranked.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`base-chip${b.id === site ? " picked" : ""}`}
              onClick={() => setChosenId(b.id)}
              title={`시간당 기대 관람수입 ${won(estimateDisplayIncome(world, b.id, artifact))} ₩`}
            >
              {b.city} {won(estimateDisplayIncome(world, b.id, artifact))}₩/h
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="ghost"
        onClick={() => {
          if (emptySlot !== null) game.display(uid, site, emptySlot);
          else setSwapping(true);
        }}
      >
        전시({museumOf(world, site).grade === 0 ? "임시 전시대" : `${SITE_BY_ID[site].city} 박물관`})
      </button>
      {swapping ? (
        <Modal title="내릴 유물 선택" onClose={() => setSwapping(false)}>
          <ul className="swap-list">
            {displayedHere.map((d) => (
              <li key={d.uid}>
                <span>{ARTIFACT_BY_ID[d.artifactId].name}</span>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    game.undisplay(d.uid);
                    game.display(uid, site, d.slot!);
                    setSwapping(false);
                  }}
                >
                  이 자리와 교체
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}
    </>
  );
}

/** 그 경매장에 지금 등록하면 적용될 가격배율(staff.md §3) — settleAuctions의
 *  hammer 계산이 실제로 쓰는 항(house.grade + auctioneer.negotiation)과 같은
 *  함수를 그대로 재사용한다. bestLocalPriceMult(지역시세)는 정산 시점에 보유
 *  base 전체에서 다시 최댓값을 뽑아 등록한 경매장과 무관하게 적용되므로
 *  (engine.ts settleAuctions) base별로 갈리는 항은 이것뿐이다. */
function auctionPriceMultAt(world: World, house: { grade: number; auctioneerId?: string }): number {
  const auctioneer = world.staff.find((s) => s.id === house.auctioneerId && s.role === "auctioneer") as
    | Auctioneer
    | undefined;
  return auctionPriceMult(house.grade, auctioneer?.negotiation ?? 0);
}

/** 경매 등록(표#6) — 경매장은 거점 종속이라 "경매장 선택" 단계 자체가 없다는
 *  원래 판단(spec.md §10.5 표#6)은 유지한다. 경매장이 여럿이면 base 비교
 *  칩(가격 = 등급·경매관장이 만드는 가격배율)을 상시 노출하고 최고가를 기본
 *  선택한다 — 등록 버튼은 여전히 1탭이라 표#6의 3단계를 넘기지 않는다
 *  (notes/decisions.md G56, G55.7 보고를 닫는다). */
function AuctionAction({ game, uid }: { game: Game; uid: number }) {
  const { world } = game;
  const [chosenSite, setChosenSite] = useState<SiteId | null>(null);
  if (world.auctionHouses.length === 0) return null;
  const ranked = [...world.auctionHouses].sort(
    (a, b) => auctionPriceMultAt(world, b) - auctionPriceMultAt(world, a)
  );
  const house = ranked.find((h) => h.site === chosenSite) ?? ranked[0];

  return (
    <>
      {ranked.length > 1 ? (
        <div className="base-chips" role="group" aria-label="경매 등록할 거점 선택">
          {ranked.map((h) => (
            <button
              key={h.site}
              type="button"
              className={`base-chip${h.site === house.site ? " picked" : ""}`}
              onClick={() => setChosenSite(h.site)}
              title={`가격배율 ×${auctionPriceMultAt(world, h).toFixed(2)}`}
            >
              {SITE_BY_ID[h.site].city} ×{auctionPriceMultAt(world, h).toFixed(2)}
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className="ghost" onClick={() => game.listAtAuction(uid, house.site)}>
        경매 등록({SITE_BY_ID[house.site].city})
      </button>
    </>
  );
}
