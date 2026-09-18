import { useState } from "react";
import { FIRST_RELOCATION_FREE_WINDOW_HOURS, SITES } from "../game/balance";
import type { SiteDef } from "../game/balance";
import { won } from "../game/format";
import type { Game } from "./useGame";

/**
 * "본거지를 정하자"(notes/ux-v02.md §1.5, A11) — 첫 감정 완료 시 1회 자동 오픈.
 * 추천 3장 + 전체 12곳 접기. 카드 문구는 수치가 아니라 정성 결과문 3줄로
 * 고정한다(§1.5-5, 카드마다 줄 수가 달라지면 §3.1.1 레이아웃 원칙이 목록
 * 안에서 깨진다).
 *
 * 추천 3곳 선정(구현 판단, notes/decisions.md G55 보고 대상): world-map.md §7의
 * RECOMMEND_TOP_N 알고리즘("도감 기여도")은 "아직 아무 데도 안 가봤다"는
 * 전제와 맞지 않는다(§1.5 본문이 이미 그렇게 서술한다) — 대신 dropMod가
 * 낮을수록·layerCostMod가 낮을수록·인구가 많을수록 가산하는 단순 정성 점수로
 * 상위 3곳을 고른다.
 */
export function OnboardingOverlay({ game, onDone }: { game: Game; onDone: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const withinFreeWindow = game.world.t < FIRST_RELOCATION_FREE_WINDOW_HOURS * 3600;

  const candidates = SITES.filter((s) => s.id !== "korea")
    .map((s) => ({ site: s, score: (1.15 - s.dropMod) + (1.5 - s.layerCostMod) + Math.min(1, s.population / 5_000_000) }))
    .sort((a, b) => b.score - a.score);
  const recommended = candidates.slice(0, 3).map((c) => c.site);

  const choose = (site: SiteDef) => {
    game.chooseHomeBase(site.id);
    onDone();
  };

  return (
    <div className="modal-back">
      <div className="modal onboarding-modal">
        <h2>본거지를 정하자</h2>
        <p className="muted small">
          방금 경주에서 첫 유물을 감정했다. 지금 base는 경주다 — 여기 계속 있어도, 다른 곳으로 옮겨도 된다.
        </p>

        <div className="onboarding-cards">
          {recommended.map((s) => (
            <SiteCard key={s.id} site={s} onChoose={() => choose(s)} />
          ))}
        </div>

        <button type="button" className="ghost wide" onClick={() => setShowAll((v) => !v)}>
          전체 12곳 보기 {showAll ? "▴" : "▾"}
        </button>
        {showAll ? (
          <ul className="onboarding-all-list">
            {SITES.map((s) => (
              <li key={s.id}>
                <span>{s.name} <em className="muted small">{s.anchor}</em></span>
                {s.id === "korea" ? (
                  <em className="muted small">현재 base</em>
                ) : (
                  <button type="button" className="ghost" onClick={() => choose(s)}>
                    이곳으로
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        <button type="button" className="onboarding-keep" onClick={onDone}>
          경주 유지하고 계속하기
        </button>
        <p className="muted small">
          {withinFreeWindow
            ? "최초 1회 변경은 무료·쿨다운 없음(12시간 안에만, 이후엔 이전 비용이 든다)."
            : "12시간 무료 변경 창이 지났다 — 이제 옮기려면 총자산의 10% + 7일 쿨다운이 든다."}
        </p>
      </div>
    </div>
  );
}

function SiteCard({ site, onChoose }: { site: SiteDef; onChoose: () => void }) {
  const lines = [
    site.dropMod <= 0.90 ? "유물이 자주 나온다" : "유물이 평범한 빈도로 나온다",
    site.layerCostMod >= 1.30 ? "층이 깊어지기 조금 더디다" : "층이 무난하게 깊어진다",
    site.population >= 5_000_000 ? "관람객이 많이 몰린다" : "관람객은 중간 규모다"
  ];
  return (
    <div className="onboarding-card">
      <h4>{site.name}</h4>
      <p className="muted small">{site.anchor}</p>
      <ul className="onboarding-card-lines">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <p className="price">{won(site.unlockCost)} ₩ 상당</p>
      <button type="button" onClick={onChoose}>이곳으로</button>
    </div>
  );
}
