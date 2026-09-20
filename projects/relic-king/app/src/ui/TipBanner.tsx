import { ARTIFACT_BY_ID } from "../game/artifacts";
import { EMERGENCY_DISPATCH_MAX_REACH_HOURS, EMERGENCY_DISPATCH_TRAVEL_MULT, SITE_BY_ID, TIER_NAME, TIP_PLAYER_HIT } from "../game/balance";
import { teamHomeSite } from "../game/engine";
import { travelHoursOneWay } from "../game/expedition";
import { distanceKm } from "../game/sites";
import { clock } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import type { ExpeditionTeam, Foreman, Tip, World } from "../game/types";
import type { Game } from "./useGame";

/**
 * L1 배너 — 제보 전용, 동시 1장(spec.md §3.4, notes/ux-v02.md §7). 대상 거점에
 * on_site 팀이 있으면 [집중 굴착], 유휴 팀의 압축 이동시간이 4시간 이내면
 * [급파], 둘 다 아니면 정보 표시로만 뜬다(spec.md §8.6). 슬롯 자체는 min-height
 * 고정이라 제보가 없어도 아래 레이아웃이 밀리지 않는다.
 */
export function TipBanner({ game }: { game: Game }) {
  const tip = game.world.tip;
  return <div className="tip-slot">{tip ? <TipContent game={game} tip={tip} /> : null}</div>;
}

function findReaction(world: World, tip: Tip): { onSite?: ExpeditionTeam; emergency?: ExpeditionTeam } {
  const onSite = world.teams.find((t) => t.status === "on_site" && t.targetSite === tip.site);
  const home = teamHomeSite(world);
  const dist = distanceKm(home, tip.site);
  let best: { team: ExpeditionTeam; hours: number } | undefined;
  for (const t of world.teams) {
    if (t.status !== "idle") continue;
    const foreman = world.staff.find((s) => s.id === t.foremanId && s.role === "foreman") as Foreman | undefined;
    const hours = travelHoursOneWay(dist, foreman?.navigation ?? 0) * EMERGENCY_DISPATCH_TRAVEL_MULT;
    if (hours <= EMERGENCY_DISPATCH_MAX_REACH_HOURS && (!best || hours < best.hours)) best = { team: t, hours };
  }
  return { onSite, emergency: best?.team };
}

function TipContent({ game, tip }: { game: Game; tip: Tip }) {
  const a = ARTIFACT_BY_ID[tip.artifactId];
  const site = SITE_BY_ID[tip.site];
  const { onSite, emergency } = findReaction(game.world, tip);
  // 레거시 직접 발굴이 그 거점을 파고 있으면 **이미 레이스에 참가 중**이다 —
  // 엔진(`drainSiteDrops`→`activeTipTarget`→`rollDrop`)이 발굴단인지 직접
  // 발굴인지 가리지 않고 TIP_PLAYER_HIT를 그대로 적용하고, 제보를 띄울지
  // 고르는 `playerCanReactAt()`도 `w.activeSite === site`를 "그 자리에 있다"로
  // 친다. 그런데 배너는 팀만 보고 "반응할 발굴단이 없다"라고 썼다 — 발굴단을
  // 꾸리기 전(초반 30분 이상)의 모든 제보가 구경거리로 표시됐다는 뜻이다
  // (`eval.md` §19.2). 척추 5번("규칙은 공개한다")은 화면이 실제 규칙과 같은
  // 말을 할 때만 성립한다.
  const legacyOnSite = game.world.activeSite === tip.site && game.world.sites[tip.site].layer >= tip.layer;

  return (
    <div className="tip" role="alert">
      <span className="tip-mark">제보</span>
      <span className="tip-text">
        <strong>{site.name} {tip.layer}층</strong>에서 반응 — {a.name}{" "}
        <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
        {tip.rivals.length > 0 ? <em className="muted"> · 같은 제보를 받은 수집가 {tip.rivals.length}명</em> : null}
      </span>
      <span className="tip-clock">{clock(tip.remain)}</span>
      {onSite ? (
        <button type="button" disabled={!!tip.focused} onClick={() => game.focusDig(onSite.id)}>
          {tip.focused ? "집중 굴착 적용됨" : "집중 굴착"}
        </button>
      ) : emergency ? (
        <button type="button" onClick={() => game.emergencyDispatch(emergency.id)}>
          급파
        </button>
      ) : legacyOnSite ? (
        <span className="tip-racing small">직접 발굴이 이 자리에서 쫓는 중 — 적중 {Math.round(TIP_PLAYER_HIT * 100)}%</span>
      ) : (
        <span className="tip-info-only muted small">반응할 발굴단이 없다 — 정보로만 뜬다</span>
      )}
    </div>
  );
}
