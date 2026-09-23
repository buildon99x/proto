import { useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  APPRAISAL_UNLOCK_LAB_LEVEL, APPRAISE_FEE, AUCTION_SETTLE_HOURS, AUTO_SELL_SPARE_MAX_TIER, BLIND_SELL_RATE, CONDITION_NAME,
  LOCKED_HOLD_CAP, SITES, SITE_BY_ID, TIER_NAME, appraiseSeconds, vaultCapacity
} from "../game/balance";
import {
  auctionFreeSlots, bulkVaultTargets, freshnessOf, museumOf, museumSlotCount, spareVaultItems, speciesEmptiedBy
} from "../game/engine";
import { usd } from "../game/format";
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
  // 다중 선택(v0.5.2). 선택 단위는 종(그리드 칸)이고, 그 종의 어느 사본이 나가는지는
  // 엔진의 `bulkVaultTargets`가 정한다.
  const [selecting, setSelecting] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * **메모이즈하지 않는다.** 엔진은 `World`를 제자리에서 고친다 — `w.vault`를
   * 통째로 갈아끼우는 경로(`sellArtifactCopies`)도 있고 배열만 건드리는 경로
   * (`listAtAuction`의 `splice`, `runAppraisal`의 `push`)도 있다. 후자는 배열
   * **참조가 그대로**라 `useMemo(…, [world.vault])`가 다시 계산하지 않는다.
   *
   * 실제로 그래서 앱이 죽었다(v0.3.2 계측): 경매에 1점을 등록하면 `splice`로
   * 금고에서 빠지는데 이 목록은 그대로라, 아래 `Detail`이 이미 사라진 uid를
   * `DisplayAction`에 넘기고 거기서 `find(...)!`가 undefined를 터뜨려 **화면
   * 전체가 언마운트**됐다. 168시간 계측에서 경매 출품은 전체 플레이어 조작의
   * 57%(189회)를 차지하는 조작이다(`eval.md` §23.2).
   *
   * 금고는 수백 점 규모이고 이 묶음 계산은 O(n)이다 — 매 렌더 다시 계산하는
   * 비용보다, 참조 기반 메모이즈가 조용히 낡는 위험이 훨씬 크다.
   */
  const stacks: Stack[] = (() => {
    const byId = new Map<string, Stack>();
    for (const item of world.vault) {
      const hit = byId.get(item.artifactId);
      if (hit) hit.items.push(item);
      else byId.set(item.artifactId, { artifact: ARTIFACT_BY_ID[item.artifactId], items: [item] });
    }
    return [...byId.values()].sort(
      (a, b) => b.artifact.tier - a.artifact.tier || a.artifact.name.localeCompare(b.artifact.name, "ko")
    );
  })();

  const filtered = stacks.filter((s) => {
    if (tierFilter !== null && s.artifact.tier !== tierFilter) return false;
    if (siteFilter !== null && s.artifact.site !== siteFilter) return false;
    if (conditionFilter !== null && !s.items.some((i) => i.condition === conditionFilter)) return false;
    return true;
  });

  const picked = stacks.find((s) => s.artifact.id === selected) ?? null;
  /** 전부 전시 중인 종은 고를 거리가 없다 — 선택 모드에서 흐리게 막는다 */
  const selectable = (s: Stack) => s.items.some((i) => !i.displayed);
  // 방금 판 종·자동 정리로 사라진 종이 선택에 남아 있지 않게, 지금 금고에 있는 종만 센다
  const chosenIds = stacks.filter((s) => chosen.has(s.artifact.id) && selectable(s)).map((s) => s.artifact.id);
  const visibleSelectable = filtered.filter(selectable).map((s) => s.artifact.id);

  const toggleChosen = (id: string) =>
    setChosen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleSelecting = () => {
    setSelecting((on) => !on);
    setChosen(new Set());
    setNotice(null);
  };
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
                          {stalled ? `자금 부족 — 감정비 ${usd(fee)} 필요` : `감정까지 ${p.remain.toFixed(1)}초`}
                        </em>
                        <span>추정 {usd(p.estimate)}</span>
                      </span>
                      <button type="button" className="ghost" onClick={() => game.blind(p.uid)}>
                        {usd(Math.round(p.estimate * BLIND_SELL_RATE))}
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
          <button
            type="button"
            className={`ghost select-toggle${selecting ? " on" : ""}`}
            disabled={!selecting && stacks.length === 0}
            aria-pressed={selecting}
            onClick={toggleSelecting}
          >
            {selecting ? "선택 끝내기" : "여러 개 선택"}
          </button>
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
                  // 칸이 손가락 밑에서 재배열되지 않는지 검사가 종 단위로 대조한다
                  // (tests/e2e/smoke.mjs). 새 종이 들어와 칸이 하나 느는 것과,
                  // 이미 있던 칸이 움직이는 것은 다른 일이다.
                  data-aid={s.artifact.id}
                  className={`stack${
                    selecting
                      ? `${chosen.has(s.artifact.id) ? " chosen" : ""}${selectable(s) ? "" : " unselectable"}`
                      : selected === s.artifact.id ? " picked" : ""
                  }`}
                  disabled={selecting && !selectable(s)}
                  aria-pressed={selecting ? chosen.has(s.artifact.id) : undefined}
                  onClick={() => (selecting ? toggleChosen(s.artifact.id) : setSelected(s.artifact.id))}
                  title={`${s.artifact.name} ×${s.items.length}`}
                >
                  <Sprite artifact={s.artifact} size={44} />
                  {selecting && chosen.has(s.artifact.id) ? <i className="stack-check">✓</i> : null}
                  {s.items.length > 1 ? <i className="stack-count">{s.items.length}</i> : null}
                  {displayedCount > 0 ? <i className="stack-displayed" title="전시 중">🖼</i> : null}
                </button>
              );
            })}
          </div>
        )}

        {selecting ? (
          <BulkBar
            game={game}
            chosenIds={chosenIds}
            visibleIds={visibleSelectable}
            notice={notice}
            onSelectVisible={() => setChosen(new Set([...chosenIds, ...visibleSelectable]))}
            onClear={() => setChosen(new Set())}
            onDone={(message) => {
              setChosen(new Set());
              setNotice(message);
            }}
          />
        ) : picked ? (
          <Detail game={game} stack={picked} />
        ) : null}
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
  const toAuction = world.settings.spareDestination === "auction";
  const noHouse = toAuction && world.auctionHouses.length === 0;

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
        <label className="filter-chip">
          보낼 곳
          <select
            value={world.settings.spareDestination}
            onChange={(e) => game.setSpareDestination(e.target.value as "sell" | "auction")}
          >
            <option value="sell">직접 매각</option>
            <option value="auction">경매 출품</option>
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
            : toAuction
              ? `지금 경매로 ${targeted.length}점`
              : `지금 정리 ${targeted.length}점 · ${usd(targetedValue)}`}
        </button>
      </div>
      {stored > capacity ? (
        <p className="stalled small">
          소장고 정원 {capacity}점을 {stored - capacity}점 넘겼다 — 넘긴 동안은 <strong>모든</strong> 소장 유물의
          보존 상태 저하 확률이 2배가 된다.
        </p>
      ) : noHouse ? (
        <p className="stalled small">
          보낼 곳이 <strong>경매 출품</strong>인데 경매장이 없다 — 시설 탭에서 먼저 짓는다. 그때까지 중복분은
          그대로 쌓인다(직접매각으로 몰래 바꾸지 않는다).
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

/**
 * 다중 선택 막대(v0.5.2) — 소장고 칸을 여러 개 고른 뒤 한 번에 매각하거나 경매에
 * 올린다. 조작은 "여러 개 선택 → 칸 누르기(또는 필터 + 보이는 것 전부) → 매각/경매"
 * 세 단계로 끝나고, 1점 상세의 버튼과 채널이 같다(엔진 `sellVaultItems`·
 * `listManyAtAuction`).
 *
 * - **종당 1점 남기기**가 기본으로 켜져 있다. 켜 둔 채로는 도감이 줄지 않으므로
 *   확인 없이 바로 실행된다.
 * - 되돌릴 수 없는 손실(국보·유일 포함, 도감에서 빠지는 종)이 있을 때만 확인 한 줄이
 *   끼어든다. 무엇을 잃는지 숫자로 적는다(척추 5번).
 * - 경매는 남은 자리만큼만 올리고 나머지는 금고에 둔다 — 넘치는 분을 직접매각으로
 *   몰래 돌리지 않는다(중복 자동 정리와 같은 규율).
 */
function BulkBar({ game, chosenIds, visibleIds, notice, onSelectVisible, onClear, onDone }: {
  game: Game;
  chosenIds: string[];
  visibleIds: string[];
  notice: string | null;
  onSelectVisible: () => void;
  onClear: () => void;
  onDone: (message: string) => void;
}) {
  const { world } = game;
  const [keepOne, setKeepOne] = useState(true);
  const [confirming, setConfirming] = useState<"sell" | "auction" | null>(null);

  const targets = bulkVaultTargets(world, chosenIds, keepOne);
  const uids = targets.map((t) => t.uid);
  const value = targets.reduce((sum, t) => sum + t.value, 0);
  const precious = targets.filter((t) => ARTIFACT_BY_ID[t.artifactId].tier >= 3).length;
  const emptied = speciesEmptiedBy(world, uids).length;
  const hasHouse = world.auctionHouses.length > 0;
  const freeSlots = auctionFreeSlots(world);
  const toAuction = Math.min(targets.length, freeSlots);
  const allVisibleChosen = visibleIds.length > 0 && visibleIds.every((id) => chosenIds.includes(id));

  const sell = () => {
    const { count, gained } = game.sellMany(uids);
    setConfirming(null);
    onDone(`${count}점을 매각했다(+${usd(gained)}).`);
  };
  const auction = () => {
    const { listed, skipped } = game.auctionMany(uids);
    setConfirming(null);
    onDone(
      `${listed}점을 경매에 올렸다(${AUCTION_SETTLE_HOURS}시간 뒤 낙찰).` +
        (skipped > 0 ? ` 자리가 없어 ${skipped}점은 소장고에 남았다.` : "")
    );
  };
  const risky = precious > 0 || emptied > 0;
  const run = (kind: "sell" | "auction") => {
    if (risky) setConfirming(kind);
    else if (kind === "sell") sell();
    else auction();
  };

  return (
    <div className="bulk-bar" role="region" aria-label="여러 개 처분">
      <div className="bulk-line">
        <span className="bulk-summary">
          <strong>{chosenIds.length}</strong>종 선택 · 처분 <strong>{targets.length}</strong>점 ·{" "}
          평가액 <strong>{usd(value)}</strong>
        </span>
        <button
          type="button"
          className="ghost"
          disabled={visibleIds.length === 0 || allVisibleChosen}
          onClick={onSelectVisible}
          title="지금 필터에 보이는 칸을 전부 고른다"
        >
          보이는 {visibleIds.length}종 전부
        </button>
        <button type="button" className="ghost" disabled={chosenIds.length === 0} onClick={onClear}>
          해제
        </button>
      </div>
      <label className="bulk-keep">
        <input type="checkbox" checked={keepOne} onChange={(e) => setKeepOne(e.target.checked)} />
        종당 1점 남기기 <em className="muted small">도감이 줄지 않는다 · 가장 비싼 사본이 남는다</em>
      </label>

      {confirming ? (
        <div className="bulk-confirm">
          <p>
            {confirming === "sell"
              ? `${targets.length}점을 직접 매각한다 — 평가액 ${usd(value)}.`
              : `${toAuction}점을 경매에 올린다.`}{" "}
            {precious > 0 ? <strong>국보·유일 {precious}점이 들어 있다. </strong> : null}
            {emptied > 0 ? <strong>도감에서 {emptied}종이 빠진다. </strong> : null}
            되돌릴 수 없다.
          </p>
          <div className="bulk-actions">
            <button type="button" className="ghost danger" onClick={confirming === "sell" ? sell : auction}>
              {confirming === "sell" ? "그래도 매각" : "그래도 경매 등록"}
            </button>
            <button type="button" className="ghost" onClick={() => setConfirming(null)}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="bulk-actions">
          <button
            type="button"
            className="bulk-go"
            disabled={targets.length === 0}
            onClick={() => run("sell")}
          >
            {targets.length}점 매각 · {usd(value)}
          </button>
          <button
            type="button"
            className="bulk-go"
            disabled={targets.length === 0 || !hasHouse || freeSlots === 0}
            onClick={() => run("auction")}
          >
            {!hasHouse
              ? "경매장 없음"
              : freeSlots === 0
                ? "경매 자리 없음"
                : `${toAuction}점 경매 등록${targets.length > freeSlots ? ` (자리 ${freeSlots})` : ""}`}
          </button>
        </div>
      )}

      {chosenIds.length === 0 ? (
        <p className="muted small">칸을 눌러 고른다. 필터로 좁힌 뒤 “보이는 전부”를 누르면 한 번에 고를 수 있다.</p>
      ) : chosenIds.length > 0 && targets.length === 0 ? (
        <p className="muted small">고른 종이 모두 1점뿐이다 — “종당 1점 남기기”를 끄면 처분할 수 있다.</p>
      ) : null}
      {notice ? <p className="bulk-notice small">{notice}</p> : null}
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
              <strong>{usd(total)}</strong>
              <button type="button" className="ghost" onClick={() => game.sell(a.id, 1)}>
                1점 매각 {usd(unit)}
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

/** 그 거점에 지금 이 유물을 전시하면 기대되는 시간당 관람수입($/s 아니라 $/h) —
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
  const [swapping, setSwapping] = useState(false);
  const [chosenId, setChosenId] = useState<SiteId | null>(null);
  // 이 유물이 바로 직전 조작(매각·경매 등록)으로 금고를 떠났을 수 있다. 예전엔
  // `find(...)!`로 단정해 그 순간 화면 전체가 언마운트됐다 — 버튼 하나가
  // 게임을 통째로 죽이는 경로였다(위 `stacks` 주석 참조).
  const item = world.vault.find((v) => v.uid === uid);
  if (!item) return null;
  const artifact = ARTIFACT_BY_ID[item.artifactId];
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
              title={`시간당 기대 관람수입 ${usd(estimateDisplayIncome(world, b.id, artifact))}`}
            >
              {b.city} {usd(estimateDisplayIncome(world, b.id, artifact))}/h
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
