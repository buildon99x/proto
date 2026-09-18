import { useState } from "react";
import {
  EXPEDITION_TEAM_UNLOCK_BASE, EXPEDITION_TEAM_UNLOCK_GROWTH, FOREMAN_HIRE_COST,
  MAX_EXPEDITION_TEAMS_CAP, SITE_BY_ID, gearCost, layerCost, workerCost
} from "../game/balance";
import { staffCandidates } from "../game/staff";
import { staffMarketCycle, teamHomeSite } from "../game/engine";
import { clock, won } from "../game/format";
import type { ExpeditionTeam, Foreman } from "../game/types";
import { SitePickerModal } from "./SitePickerModal";
import type { Game } from "./useGame";

const STATUS_LABEL: Record<ExpeditionTeam["status"], string> = {
  idle: "유휴",
  traveling_out: "이동 중",
  on_site: "현지 작업 중",
  traveling_back: "귀환 중"
};

/**
 * 발굴단 패널(notes/ux-v02.md §6.1) — 고정 4칸(spec.md §3.1.1, B12 "팀은 id 고정
 * 슬롯"). 해금 안 된 칸은 자물쇠, 해금됐지만 단장이 없는 칸은 고용 패널, 팀이
 * 있으면 상태 카드. 칸 순서·개수는 파견·귀환에 따라 절대 바뀌지 않는다.
 */
export function TeamPanel({ game }: { game: Game }) {
  const { world } = game;
  return (
    <section className="card team-panel">
      <h3>발굴단</h3>
      <div className="team-slots">
        {Array.from({ length: MAX_EXPEDITION_TEAMS_CAP }, (_, i) => i).map((slot) => {
          if (slot < world.teams.length) {
            return <TeamCard key={world.teams[slot].id} game={game} team={world.teams[slot]} index={slot} />;
          }
          if (slot < world.maxTeams) {
            return <HireForemanCard key={`hire-${slot}`} game={game} />;
          }
          return <LockedSlotCard key={`locked-${slot}`} game={game} n={slot + 1} />;
        })}
      </div>
    </section>
  );
}

function TeamCard({ game, team, index }: { game: Game; team: ExpeditionTeam; index: number }) {
  const { world } = game;
  const [open, setOpen] = useState(false);
  const [pickingNewSite, setPickingNewSite] = useState(false);
  const foreman = world.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
  const sp = world.sites[team.targetSite];

  let statusLine: string;
  if (team.status === "idle") statusLine = "다음 파견을 기다리는 중";
  else if (team.status === "traveling_out") statusLine = `${SITE_BY_ID[team.targetSite].name}(으)로 이동 중 · 도착 ${clock(Math.max(0, team.arrivesAt - world.t))} 후`;
  else if (team.status === "on_site") statusLine = `${SITE_BY_ID[team.targetSite].name} ${sp.layer}층 발굴 중`;
  else statusLine = `귀환 중 · ${clock(Math.max(0, team.returnsAt - world.t))} 후 복귀`;

  return (
    <div className="team-card">
      <div className="team-card-head">
        <strong>{index + 1}팀 · {foreman?.name ?? "단장 없음"}</strong>
        <span className={`status-badge status-${team.status}`}>{STATUS_LABEL[team.status]}</span>
      </div>
      <p className="muted small">{statusLine}</p>
      {team.status !== "idle" ? (
        <div className="bar" role="progressbar">
          <i style={{ width: `${Math.min(100, (sp.layerProgress / Math.max(1, layerCost(team.targetSite, sp.layer))) * 100)}%` }} />
        </div>
      ) : null}

      {team.status === "idle" ? (
        <div className="team-card-actions">
          <button type="button" className="ghost" onClick={() => game.dispatch(team.id, team.targetSite)}>
            재파견({SITE_BY_ID[team.targetSite].name})
          </button>
          <button type="button" className="ghost" onClick={() => setPickingNewSite(true)}>
            새 유적 선택
          </button>
        </div>
      ) : null}
      {pickingNewSite ? (
        <SitePickerModal
          game={game}
          title="파견 대상 거점 선택"
          onPick={(site) => game.dispatch(team.id, site)}
          onClose={() => setPickingNewSite(false)}
        />
      ) : null}

      <button type="button" className="ghost wide" onClick={() => setOpen((v) => !v)}>
        상세 {open ? "▴" : "▾"}
      </button>
      {open ? <TeamDetail game={game} team={team} foreman={foreman} /> : null}
    </div>
  );
}

function TeamDetail({ game, team, foreman }: { game: Game; team: ExpeditionTeam; foreman?: Foreman }) {
  const { world } = game;
  const [picking, setPicking] = useState(false);
  const wCost = workerCost(world.teams.reduce((s, t) => s + t.workers, 0));
  const gCost = gearCost(world.teams.reduce((s, t) => s + t.gearLevel, 0));
  const routineTarget = team.routine?.target ?? team.targetSite;

  return (
    <div className="team-detail">
      <div className="team-detail-row">
        <span>인원 {team.workers}명</span>
        <button type="button" className="ghost" disabled={world.funds < wCost} onClick={() => game.buyTeamWorker(team.id)}>
          +1 ({won(wCost)}₩)
        </button>
      </div>
      <div className="team-detail-row">
        <span>장비 Lv.{team.gearLevel}</span>
        <button type="button" className="ghost" disabled={world.funds < gCost} onClick={() => game.buyTeamGear(team.id)}>
          업그레이드 ({won(gCost)}₩)
        </button>
      </div>
      <div className="team-detail-row">
        <span>항해술 {foreman?.navigation ?? 0} · 통솔 {foreman?.leadership ?? 0}</span>
      </div>
      <label className="team-detail-row">
        <span>
          루틴 — 귀환 시 <strong>{SITE_BY_ID[routineTarget].name}</strong>(으)로 자동 재파견
        </span>
        <input
          type="checkbox"
          checked={!!team.routine?.enabled}
          onChange={(e) => game.setRoutine(team.id, e.target.checked, routineTarget)}
        />
      </label>
      <button type="button" className="ghost wide" onClick={() => setPicking(true)}>
        루틴 대상 거점 변경
      </button>
      {picking ? (
        <SitePickerModal
          game={game}
          title="루틴 대상 거점 선택"
          onPick={(site) => game.setRoutine(team.id, true, site)}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
}

function HireForemanCard({ game }: { game: Game }) {
  const { world } = game;
  const home = teamHomeSite(world);
  const candidates = staffCandidates(home, staffMarketCycle(world), "foreman");
  return (
    <div className="team-card team-card-empty">
      <h4>빈 슬롯 — 단장 고용</h4>
      <p className="muted small">단장을 고용하면 그 자리에 새 발굴단이 꾸려진다.</p>
      <div className="candidate-list">
        {candidates.map((c, slot) => (
          <button
            key={slot}
            type="button"
            className="candidate-row"
            disabled={world.funds < FOREMAN_HIRE_COST || c.role !== "foreman"}
            onClick={() => {
              const id = game.hireForeman(home, slot);
              if (id) game.createTeam(id);
            }}
          >
            <strong>{c.name}</strong>
            <span className="muted small">
              통솔 {c.role === "foreman" ? c.leadership : 0} · 항해술 {c.role === "foreman" ? c.navigation : 0}
            </span>
            <span className="price">{won(FOREMAN_HIRE_COST)} ₩</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LockedSlotCard({ game, n }: { game: Game; n: number }) {
  const cost = EXPEDITION_TEAM_UNLOCK_BASE * Math.pow(EXPEDITION_TEAM_UNLOCK_GROWTH, n - 2);
  return (
    <div className="team-card team-card-locked">
      <h4>🔒 {n}번째 슬롯</h4>
      <button type="button" className="ghost wide" disabled={game.world.funds < cost} onClick={game.unlockTeamSlot}>
        해금 — {won(cost)} ₩
      </button>
    </div>
  );
}
