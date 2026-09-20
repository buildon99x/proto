import { useState } from "react";
import { FIRST_RELOCATION_FREE_WINDOW_HOURS, RELOCATION_COOLDOWN_HOURS, RELOCATION_COST_ASSET_RATIO, SITES, SITE_BY_ID } from "../game/balance";
import { playerAssets } from "../game/engine";
import { josa, won } from "../game/format";
import type { SiteId } from "../game/types";
import { DispatchSheet } from "./DispatchSheet";
import { LegacyDigCard } from "./LegacyDigCard";
import { Modal } from "./Modal";
import { SitePickerModal } from "./SitePickerModal";
import { TeamPanel } from "./TeamPanel";
import { WorldExplorer } from "./WorldExplorer";
import type { Game } from "./useGame";

/** 발굴 탭(notes/ux-v02.md §6.1) — 이 게임의 기본 진입 탭. 탐색 패널(지도·북마크·
 *  추천·검색) + 발굴단 4칸 + 직접 발굴(레거시) 카드로 구성한다. */
export function ExpeditionView({ game }: { game: Game }) {
  const { world } = game;
  const [dispatchSite, setDispatchSite] = useState<SiteId | null>(null);
  const [pickingRelocateTarget, setPickingRelocateTarget] = useState(false);
  const [relocateTarget, setRelocateTarget] = useState<SiteId | null>(null);

  return (
    <div className="expedition">
      <div className="expedition-columns">
        <div className="expedition-explore">
          <MyBasesPanel world={world} onRelocate={() => setPickingRelocateTarget(true)} />
          <WorldExplorer game={game} onSelectSite={setDispatchSite} />
        </div>
        <TeamPanel game={game} />
      </div>

      <LegacyDigCard game={game} />

      {dispatchSite ? <DispatchSheet game={game} site={dispatchSite} onClose={() => setDispatchSite(null)} /> : null}
      {pickingRelocateTarget ? (
        <SitePickerModal
          game={game}
          title="새 본거지 선택"
          onPick={(site) => setRelocateTarget(site)}
          onClose={() => setPickingRelocateTarget(false)}
        />
      ) : null}
      {relocateTarget ? (
        <RelocateConfirm game={game} site={relocateTarget} onClose={() => setRelocateTarget(null)} />
      ) : null}
    </div>
  );
}

function MyBasesPanel({ world, onRelocate }: { world: Game["world"]; onRelocate: () => void }) {
  const owned = SITES.filter((s) => world.sites[s.id].unlocked);
  return (
    <section className="card my-bases">
      <h3>내 거점</h3>
      <ul className="my-bases-list">
        {owned.map((s) => (
          <li key={s.id}>
            {s.city} <em className="muted small">{s.anchor}</em>
          </li>
        ))}
      </ul>
      {owned.length === 1 ? (
        <button type="button" className="ghost wide" onClick={onRelocate}>
          이전
        </button>
      ) : (
        <p className="muted small">거점이 2곳 이상이면 이전 대신 지도에서 새 거점을 열어 확장한다.</p>
      )}
    </section>
  );
}

function RelocateConfirm({ game, site, onClose }: { game: Game; site: SiteId; onClose: () => void }) {
  const { world } = game;
  const withinFreeWindow = world.t < FIRST_RELOCATION_FREE_WINDOW_HOURS * 3600;
  const onCooldown =
    !withinFreeWindow && world.lastRelocationAt !== null && world.t - world.lastRelocationAt < RELOCATION_COOLDOWN_HOURS * 3600;
  const cost = withinFreeWindow ? 0 : Math.round(playerAssets(world) * RELOCATION_COST_ASSET_RATIO);

  return (
    <Modal title="본거지 이전 확인" onClose={onClose}>
      <p>
        본거지를 <strong>{SITE_BY_ID[site].city}</strong>{josa(SITE_BY_ID[site].city, "로으로")} 옮긴다. 그 거점의 초기 보너스를 새로 받는 대신,
        지금 배치된 발굴단은 새 본거지 기준으로 거리가 다시 계산된다.
      </p>
      <p className="muted small">
        {withinFreeWindow
          ? "최초 12시간 무료 변경 창 — 비용·쿨다운 없음."
          : `비용 ${won(cost)} ₩(총자산의 ${Math.round(RELOCATION_COST_ASSET_RATIO * 100)}%) · 쿨다운 ${RELOCATION_COOLDOWN_HOURS / 24}일`}
      </p>
      <button type="button" disabled={onCooldown || world.funds < cost} onClick={() => { game.relocateBase(site); onClose(); }}>
        {onCooldown ? "쿨다운 중" : "확인"}
      </button>
    </Modal>
  );
}
