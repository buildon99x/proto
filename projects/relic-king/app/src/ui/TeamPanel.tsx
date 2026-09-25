import { useState } from "react";
import {
  EXPEDITION_TEAM_UNLOCK_BASE, EXPEDITION_TEAM_UNLOCK_GROWTH, FOREMAN_HIRE_COST,
  MAX_EXPEDITION_TEAMS_CAP, SITE_BY_ID, gearCost, layerCost, workerCost
} from "../game/balance";
import { staffCandidates } from "../game/staff";
import { staffMarketCycle, teamHomeSite } from "../game/engine";
import { clock, josa, withJosa, usd } from "../game/format";
import type { ExpeditionTeam, Foreman } from "../game/types";
import { SitePickerModal } from "./SitePickerModal";
import { useTeamPreset } from "./useTeamPreset";
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
  const teamPreset = useTeamPreset();
  return (
    <section className="card team-panel">
      <h3>발굴단</h3>
      <div className="team-slots">
        {Array.from({ length: MAX_EXPEDITION_TEAMS_CAP }, (_, i) => i).map((slot) => {
          if (slot < world.teams.length) {
            return (
              <TeamCard key={world.teams[slot].id} game={game} team={world.teams[slot]} index={slot} teamPreset={teamPreset} />
            );
          }
          if (slot < world.maxTeams) {
            return <HireForemanCard key={`hire-${slot}`} game={game} teamPreset={teamPreset} />;
          }
          return <LockedSlotCard key={`locked-${slot}`} game={game} n={slot + 1} />;
        })}
      </div>
    </section>
  );
}

function TeamCard({
  game, team, index, teamPreset
}: { game: Game; team: ExpeditionTeam; index: number; teamPreset: ReturnType<typeof useTeamPreset> }) {
  const { world } = game;
  const [open, setOpen] = useState(false);
  const [pickingNewSite, setPickingNewSite] = useState(false);
  const foreman = world.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
  const sp = world.sites[team.targetSite];

  let statusLine: string;
  if (team.status === "idle") statusLine = "다음 파견을 기다리는 중";
  else if (team.status === "traveling_out") statusLine = `${withJosa(SITE_BY_ID[team.targetSite].city, "로으로")} 이동 중 · 도착 ${clock(Math.max(0, team.arrivesAt - world.t))} 후`;
  else if (team.status === "on_site") statusLine = `${SITE_BY_ID[team.targetSite].city} ${sp.layer}층 발굴 중`;
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
            재파견({SITE_BY_ID[team.targetSite].city})
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
      {open ? <TeamDetail game={game} team={team} foreman={foreman} teamPreset={teamPreset} /> : null}
    </div>
  );
}

function TeamDetail({
  game, team, foreman, teamPreset
}: { game: Game; team: ExpeditionTeam; foreman?: Foreman; teamPreset: ReturnType<typeof useTeamPreset> }) {
  const { world } = game;
  const [picking, setPicking] = useState(false);
  const wCost = workerCost(world.teams.reduce((s, t) => s + t.workers, 0));
  const gCost = gearCost(world.teams.reduce((s, t) => s + t.gearLevel, 0));
  // "auto"는 거점 하나가 아니라 **자동 순회**다(v0.3.4) — 귀환할 때마다
  // 아직 못 채운 거점 중에서 고른다. 화면도 그렇게 말해야 한다.
  const routineTarget = team.routine?.target ?? "auto";
  // 거점 이름은 v0.4부터 도시명(`city`)으로 부른다 — 조사도 그 이름에 맞춰 붙인다.
  const routineName = routineTarget === "auto" ? "아직 못 채운 거점" : SITE_BY_ID[routineTarget].city;
  const routineParticle = routineTarget === "auto" ? "으로" : josa(routineName, "로으로");

  return (
    <div className="team-detail">
      <div className="team-detail-row">
        <span>인원 {team.workers}명</span>
        <button type="button" className="ghost" disabled={world.funds < wCost} onClick={() => game.buyTeamWorker(team.id)}>
          +1 ({usd(wCost)})
        </button>
      </div>
      <div className="team-detail-row">
        <span>장비 Lv.{team.gearLevel}</span>
        <button type="button" className="ghost" disabled={world.funds < gCost} onClick={() => game.buyTeamGear(team.id)}>
          업그레이드 ({usd(gCost)})
        </button>
      </div>
      <div className="team-detail-row">
        <span>항해술 {foreman?.navigation ?? 0} · 통솔 {foreman?.leadership ?? 0}</span>
      </div>
      <label className="team-detail-row">
        <span>
          루틴 — 귀환 시 <strong>{routineName}</strong>{routineParticle} 자동 재파견
        </span>
        <input
          type="checkbox"
          checked={!!team.routine?.enabled}
          onChange={(e) => game.setRoutine(team.id, e.target.checked, routineTarget)}
        />
      </label>
      <button type="button" className="ghost wide" onClick={() => setPicking(true)}>
        루틴 대상 거점 고정
      </button>
      {routineTarget !== "auto" ? (
        <button type="button" className="ghost wide" onClick={() => game.setRoutine(team.id, true, "auto")}>
          자동 순회로 되돌리기
        </button>
      ) : null}
      <button
        type="button"
        className="ghost wide"
        onClick={() => teamPreset.save({ workers: team.workers, gearLevel: team.gearLevel })}
        title="지금 이 팀의 인원·장비 조합을 저장해 두면, 새 팀을 만들 때 후보 카드에서 1탭으로 똑같이 적용할 수 있다."
      >
        빠른 설정으로 저장(인원 {team.workers} · 장비 Lv.{team.gearLevel})
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

function HireForemanCard({ game, teamPreset }: { game: Game; teamPreset: ReturnType<typeof useTeamPreset> }) {
  const { world } = game;
  const home = teamHomeSite(world);
  const candidates = staffCandidates(home, staffMarketCycle(world), "foreman");
  const preset = teamPreset.preset;
  // 자금이 자동 재투자로 요동쳐 이 카드가 켜졌다 꺼졌다 한다(실측: 고용 가능
  // 상태가 유지되는 비율 9.3%). 얼마가 모자란지와 **왜** 잔고가 안 쌓이는지를
  // 여기서 말해 준다 — v0.3.2 결함 5 보강(notes/decisions.md G69.5).
  const short = Math.max(0, FOREMAN_HIRE_COST - world.funds);
  return (
    <div className="team-card team-card-empty">
      <h4>빈 슬롯 — 단장 고용</h4>
      <p className="muted small">
        단장을 고용하면 그 자리에 새 발굴단이 꾸려진다.
        {preset ? ` 빠른 설정(인원 ${preset.workers}·장비 Lv.${preset.gearLevel})이 그 자리에 그대로 적용된다.` : ""}
      </p>
      {short > 0 ? (
        <p className="stalled small">
          {usd(short)} 모자란다(지금 {usd(world.funds)}).
          {world.settings.autoReinvest
            ? " 자동 재투자가 남는 자금을 인부·장비·감정소와 발굴단 증강에 쓰고 있어 잔고가 오르락내리락한다 — ⚙ 설정에서 끄면 그대로 쌓인다."
            : " 유물을 팔아 모으면 된다."}
        </p>
      ) : null}
      <div className="candidate-list">
        {candidates.map((c, slot) => (
          <button
            key={slot}
            type="button"
            className="candidate-row"
            disabled={world.funds < FOREMAN_HIRE_COST || c.role !== "foreman"}
            onClick={() => {
              const foremanId = game.hireForeman(home, slot);
              if (!foremanId) return;
              const teamId = game.createTeam(foremanId);
              if (!teamId || !preset) return;
              for (let i = 0; i < preset.workers; i++) game.buyTeamWorker(teamId);
              for (let i = 0; i < preset.gearLevel; i++) game.buyTeamGear(teamId);
            }}
          >
            <strong>{c.name}</strong>
            <span className="muted small">
              통솔 {c.role === "foreman" ? c.leadership : 0} · 항해술 {c.role === "foreman" ? c.navigation : 0}
            </span>
            <span className="price">{usd(FOREMAN_HIRE_COST)}</span>
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
        해금 — {usd(cost)}
      </button>
    </div>
  );
}
