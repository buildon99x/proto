import { useState } from "react";
import { CrewNote } from "./Crew";
import { SITES, SITE_BY_ID } from "../game/balance";
import { josa, usd } from "../game/format";
import { siteAnchorLabel } from "../game/sites";
import type { SiteId } from "../game/types";
import {
  CHOOSER_RULE_TEXT, firstBaseCandidates, formatTravelHours, ownedSites, siteFacts, speciesCount, tipUnresolved
} from "./baseChoice";
import type { SiteFacts } from "./baseChoice";
import type { Game } from "./useGame";

/**
 * "첫 거점을 연다"(v0.6.6, `notes/decision-tree-10h.md` P1·P3). 예전 36초 "본거지를
 * 정하자" 모달을 대신한다. 그 모달은 첫 제보 레이스를 덮었고, 카드에 숫자가 없어
 * 눈을 가린 채 고르는 결정이었다. 이제는 첫 해금 비용이 모이는 순간(약 3분)에
 * 뜨고, 제보가 결판나기 전에는 뜨지 않는다.
 *
 * 카드에는 결과를 가르는 숫자만 적는다. 종 수 · 유일 1종과 층 · 홈 라이벌 수 ·
 * 거리 · 해금 비용이다. 카드 세 장을 고른 규칙도 한 줄로 적는다(척추 5번).
 */
export function FirstBaseChooser({ game }: { game: Game }) {
  const { world } = game;
  const [showAll, setShowAll] = useState(false);
  // 뜬 순간에 제보 레이스가 진행 중이었는가. 그러면 안 된다(첫 레이스를 덮지 않는다) —
  // `tests/e2e/play.mjs`가 이 값을 읽어 확인한다.
  const [tipOpenAtOpen] = useState(() => tipUnresolved(world));
  const owned = ownedSites(world);
  const current = owned[0];
  const cards = firstBaseCandidates(world).map((id) => siteFacts(world, id));

  const open = (site: SiteId) => {
    if (game.openBase(site)) game.closeBaseChooser();
  };

  return (
    <div className="modal-back" onClick={game.closeBaseChooser}>
      <div
        className="modal base-chooser"
        role="dialog"
        aria-label="첫 거점을 연다"
        data-tip-open-at-open={tipOpenAtOpen ? "1" : "0"}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>첫 거점을 연다</h2>
        <CrewNote screen="base" />
        <p className="muted small">
          두 번째 거점을 열 자금이 모였다. 거점마다 나오는 유물 종이 다르다.{" "}
          {current ? (
            <>
              지금 거점 <strong>{SITE_BY_ID[current].city}</strong>{josa(SITE_BY_ID[current].city, "은는")}{" "}
              {speciesCount(current)}종이다.
            </>
          ) : null}
        </p>
        <p className="base-chooser-rule small">{CHOOSER_RULE_TEXT}</p>

        <div className="base-chooser-cards">
          {cards.map((f) => (
            <SiteCard key={f.site} facts={f} funds={world.funds} onOpen={() => open(f.site)} />
          ))}
        </div>

        <button type="button" className="ghost wide base-chooser-all" onClick={() => setShowAll((v) => !v)}>
          전체 12곳 보기 {showAll ? "▴" : "▾"}
        </button>
        {showAll ? <AllSites game={game} onOpen={open} /> : null}

        <button type="button" className="base-chooser-later" onClick={game.closeBaseChooser}>
          나중에
        </button>
        <p className="muted small">
          발굴 탭 "내 거점"에서 다시 열 수 있다. 본거지를 통째로 옮기려면 거기서 [이전]을 쓴다.
        </p>
      </div>
    </div>
  );
}

function SiteCard({ facts, funds, onOpen }: { facts: SiteFacts; funds: number; onOpen: () => void }) {
  const def = SITE_BY_ID[facts.site];
  return (
    <div className="base-chooser-card" data-site={facts.site}>
      <h4>{def.city}</h4>
      <p className="muted small">{siteAnchorLabel(def)} · {def.country}</p>
      <dl className="base-chooser-facts">
        <div>
          <dt>유물 종</dt>
          <dd className="base-chooser-species" data-species={facts.species}>{facts.species}종</dd>
        </div>
        <div>
          <dt>유일</dt>
          <dd>{facts.unique ? `${facts.unique.name} · ${facts.unique.minLayer}층부터` : "없음"}</dd>
        </div>
        <div>
          <dt>홈 라이벌</dt>
          <dd>{facts.homeRivals}명</dd>
        </div>
        <div>
          <dt>거리</dt>
          <dd>{Math.round(facts.km).toLocaleString("ko-KR")}km · 편도 {formatTravelHours(facts.hours)}</dd>
        </div>
        <div>
          <dt>해금</dt>
          <dd className="price">{usd(facts.cost)}</dd>
        </div>
      </dl>
      <button type="button" className="base-chooser-open" disabled={!facts.affordable} onClick={onOpen}>
        {facts.affordable ? "열기" : `${usd(facts.cost - funds)} 더 필요`}
      </button>
    </div>
  );
}

function AllSites({ game, onOpen }: { game: Game; onOpen: (site: SiteId) => void }) {
  const { world } = game;
  const rows = [...SITES].sort((a, b) => a.unlockCost - b.unlockCost);
  return (
    <ul className="base-chooser-all-list">
      {rows.map((s) => {
        const f = siteFacts(world, s.id);
        const owned = world.sites[s.id].unlocked;
        return (
          <li key={s.id}>
            <span>
              {s.city} <em className="muted small">{f.species}종 · 라이벌 {f.homeRivals}명 · {formatTravelHours(f.hours)}</em>
            </span>
            {owned ? (
              <em className="muted small">보유 중</em>
            ) : (
              <button type="button" className="ghost" disabled={!f.affordable} onClick={() => onOpen(s.id)}>
                {usd(f.cost)} 열기
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
