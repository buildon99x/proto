import { useState } from "react";
import { SITES, SITE_BY_ID } from "../game/balance";
import { distanceKm, siteSubtitle, siteTitle } from "../game/sites";
import { teamHomeSite, ownedSiteCap } from "../game/engine";
import { usd } from "../game/format";
import type { Foreman, SiteId } from "../game/types";
import { Modal } from "./Modal";
import { CrewNote } from "./Crew";
import type { Game } from "./useGame";

/**
 * 발굴단 파견 시트(표#1, notes/ux-v02.md §2) — 지도/목록에서 거점을 고른 뒤(1단계)
 * 여기서 발굴단 선택(2) → 파견 확정(3)까지 끝낸다. 유휴 팀이 있으면 기본으로
 * 선택돼 있어 확정만 누르면 된다. 아직 base가 아닌 거점이면 "새 본거지로
 * 열기"(표#10, 2단계)도 같은 시트에서 바로 이어진다 — 거점 선택은 이미 끝났으니
 * 여기서 추가로 시작할 이유가 없다.
 */
export function DispatchSheet({ game, site, onClose }: { game: Game; site: SiteId; onClose: () => void }) {
  const { world } = game;
  const def = SITE_BY_ID[site];
  const sp = world.sites[site];
  const idleTeams = world.teams.filter((t) => t.status === "idle");
  const [teamId, setTeamId] = useState<string | null>(idleTeams[0]?.id ?? null);
  const home = teamHomeSite(world);
  const dist = distanceKm(home, site);
  const ownedCount = SITES.filter((s) => world.sites[s.id].unlocked).length;
  // base 슬롯 상한은 안목(전체 도감 비율)이 연다 — 화면도 같은 함수를 쓴다(G91)
  const slotCap = ownedSiteCap(world);
  const canOpenBase = !sp.unlocked && ownedCount < slotCap;

  return (
    <Modal
      title={siteTitle(def.id)}
      subtitle={`${siteSubtitle(def.id)} · 편도 ${Math.round(dist).toLocaleString("ko-KR")}km`}
      onClose={onClose}
    >
      <p className="muted small">
        {sp.unlocked ? "본거지" : "방문 가능"} · 현재 {sp.layer}층
      </p>
      <CrewNote screen="dispatch" />

      {idleTeams.length === 0 ? (
        <p className="empty">유휴 발굴단이 없다. 발굴단이 귀환하거나 새 팀을 꾸려야 파견할 수 있다.</p>
      ) : (
        <>
          <div className="team-pick-list">
            {idleTeams.map((t) => {
              const foreman = world.staff.find((s) => s.id === t.foremanId && s.role === "foreman") as Foreman | undefined;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`team-pick${teamId === t.id ? " active" : ""}`}
                  onClick={() => setTeamId(t.id)}
                >
                  <strong>{foreman?.name ?? "단장 없음"}</strong>
                  <span className="muted small">인원 {t.workers} · 장비 Lv.{t.gearLevel} · 항해술 {foreman?.navigation ?? 0}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="wide"
            disabled={!teamId}
            onClick={() => {
              if (teamId) game.dispatch(teamId, site);
              onClose();
            }}
          >
            파견 확정
          </button>
        </>
      )}

      {canOpenBase ? (
        <button
          type="button"
          className="ghost wide"
          disabled={world.funds < def.unlockCost}
          onClick={() => {
            game.openBase(site);
            onClose();
          }}
        >
          이 거점을 새 본거지로 열기 — {usd(def.unlockCost)}
        </button>
      ) : sp.unlocked ? null : (
        // 슬롯이 없어 못 여는 경우 — **이유와 여는 방법**을 그 자리에 적는다.
        // 예전에는 버튼이 그냥 사라져서 "왜 못 여는지"가 화면 어디에도 없었다.
        <p className="muted small">
          본거지 슬롯 {ownedCount}/{slotCap} — 다 찼다. 여기는 <strong>원정</strong>으로 캔다
          (원정은 12거점 어디든 항상 갈 수 있다). 본거지를 옮기려면 보유 base가 1곳일 때만 가능하다.
        </p>
      )}
    </Modal>
  );
}
