import { SITE_BY_ID } from "../game/balance";
import { usd } from "../game/format";
import { expansionForkOptions, formatTravelHours } from "./baseChoice";
import type { Game } from "./useGame";

/**
 * "다음 확장"(v0.6.8, `notes/decisions.md` G117) — 셋째 거점이냐 둘째 발굴단이냐.
 * 같은 목돈을 두고 다투는 두 선택을 나란히 놓고, 각각 무엇을 얻는지 한 줄씩 적는다.
 * 고르지 않고 닫아도 된다(척추 4번). 발굴 탭에서 다시 연다.
 */
export function ExpansionFork({ game }: { game: Game }) {
  const { world } = game;
  const o = expansionForkOptions(world);
  if (!o) return null;
  const site = SITE_BY_ID[o.site.site];
  const pickSite = () => {
    if (game.openBase(o.site.site)) game.closeExpansionFork();
  };
  const pickTeam = () => {
    if (game.unlockTeamSlot()) game.closeExpansionFork();
  };
  return (
    <div className="modal-back" onClick={game.closeExpansionFork}>
      <div className="modal base-chooser expansion-fork" role="dialog" aria-label="다음 확장" onClick={(e) => e.stopPropagation()}>
        <h2>다음 확장</h2>
        <p className="muted small">
          같은 돈으로 둘 중 하나를 먼저 할 수 있다. 나머지는 돈이 더 모이면 한다.
        </p>
        <div className="base-chooser-cards">
          <div className="base-chooser-card expansion-card" data-choice="site">
            <h3>셋째 거점 — {site.city}</h3>
            <p className="small">새 유물 <strong>{o.site.species}종</strong>. 직접 발굴이 그리로 옮겨 가 새 종이 빨리 는다.</p>
            <p className="small muted">
              거리 {formatTravelHours(o.site.hours)} · 홈 라이벌 {o.site.homeRivals}명
              {o.site.unique ? ` · 유일 ${o.site.unique.name}(${o.site.unique.minLayer}층)` : ""}
            </p>
            <button type="button" className="base-chooser-open" disabled={!o.site.affordable} onClick={pickSite}>
              {o.site.affordable ? `열기 ${usd(o.site.cost)}` : `${usd(o.site.cost - world.funds)} 더 필요`}
            </button>
          </div>
          <div className="base-chooser-card expansion-card" data-choice="team">
            <h3>둘째 발굴단</h3>
            <p className="small">
              팀 하나가 원정을 떠나 있어도 <strong>다른 팀이 제보에 대응</strong>한다. 원정으로 다른 거점을 동시에 캔다.
            </p>
            <p className="small muted">슬롯을 연 뒤 단장을 한 명 고른다.</p>
            <button type="button" className="base-chooser-open" disabled={!o.slotAffordable} onClick={pickTeam}>
              {o.slotAffordable ? `슬롯 열기 ${usd(o.slotCost)}` : `${usd(o.slotCost - world.funds)} 더 필요`}
            </button>
          </div>
        </div>
        <button type="button" className="base-chooser-later" onClick={game.closeExpansionFork}>
          나중에
        </button>
      </div>
    </div>
  );
}
