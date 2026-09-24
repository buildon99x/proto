import { useEffect, useRef, useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  EMERGENCY_DISPATCH_MAX_REACH_HOURS, EMERGENCY_DISPATCH_TRAVEL_MULT, SITE_BY_ID, TIER_NAME,
  TIP_MIN_RESPONSE_SECONDS, TIP_PLAYER_HIT, TIP_EMERGENCY_CREW_HIT_CHANCE
} from "../game/balance";
import { emergencyCrewOffer, teamHomeSite, tipRaceOdds } from "../game/engine";
import { travelHoursOneWay } from "../game/expedition";
import { distanceKm } from "../game/sites";
import { clock, usd } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import type { ExpeditionTeam, Foreman, Tip, World } from "../game/types";
import { playCue } from "./sound";
import type { Game } from "./useGame";

/**
 * L1 배너 — 제보 전용, 동시 1장(spec.md §3.4, notes/ux-v02.md §7). 대상 거점에
 * on_site 팀이 있으면 [집중 굴착], 유휴 팀의 압축 이동시간이 4시간 이내면
 * [급파], 둘 다 아니면 정보 표시로만 뜬다(spec.md §8.6). 슬롯 자체는 min-height
 * 고정이라 제보가 없어도 아래 레이아웃이 밀리지 않는다.
 */
export function TipBanner({ game }: { game: Game }) {
  const tip = game.world.tip;
  useTipCues(game.world);
  return (
    <div className="tip-slot">
      {tip ? <TipContent game={game} tip={tip} /> : null}
      {tip ? <UniqueTipAlert game={game} tip={tip} /> : null}
    </div>
  );
}

/** 제보 한 건의 식별자. 같은 유물이 다시 제보될 수 있으니 뜬 시각까지 묶는다. */
function tipKey(tip: Tip): string {
  return `${tip.artifactId}@${tip.openedAt}`;
}

/**
 * 제보 신호음(v0.6.6, `notes/decision-tree-10h.md` P4). 유일 제보가 뜬 순간과
 * 레이스 결판(승·패) 순간에 한 번씩 울린다. 음소거 설정을 따른다.
 */
function useTipCues(world: World) {
  const openedRef = useRef<string | null>(null);
  const resolvedRef = useRef<string | null>(null);
  const tip = world.tip;
  const key = tip ? tipKey(tip) : null;
  const outcome = tip?.resolved?.outcome ?? null;
  useEffect(() => {
    if (!tip || !key) return;
    if (openedRef.current !== key) {
      openedRef.current = key;
      if (!tip.resolved && ARTIFACT_BY_ID[tip.artifactId].tier === 4) playCue("uniqueTip", world.settings.muted);
    }
    if (outcome && resolvedRef.current !== key) {
      resolvedRef.current = key;
      playCue(outcome === "won" ? "raceWon" : "raceLost", world.settings.muted);
    }
  }, [key, outcome]);
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
  // 반응 유예(v0.6) — 이 시간 동안은 어느 쪽도 그 유물을 가져가지 못한다.
  // 남은 유예를 그대로 적는다(척추 5번: 규칙은 공개한다).
  const graceLeft = tip.resolved ? 0 : Math.max(0, TIP_MIN_RESPONSE_SECONDS - (game.world.t - tip.openedAt));
  // 마감 판정의 승산을 **엔진이 낸 값 그대로** 적는다(척추 5번 — 화면이 규칙과 같은
  // 말을 해야 한다). `tipRaceOdds`는 `decideTipRace`와 같은 가중을 쓴다.
  const odds = tipRaceOdds(game.world, tip);

  return (
    <div className={`tip${tip.resolved ? ` tip-${tip.resolved.outcome}` : ""}`} role="alert">
      <span className="tip-mark">{tip.resolved ? (tip.resolved.outcome === "won" ? "확보" : "놓침") : "제보"}</span>
      <span className="tip-text">
        <strong>{site.city} {tip.layer}층</strong>에서 반응 — {a.name}{" "}
        <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
        {tip.rivals.length > 0 ? <em className="muted"> · 같은 제보를 받은 수집가 {tip.rivals.length}명</em> : null}
      </span>
      <span className="tip-clock">{clock(tip.remain)}</span>
      {tip.resolved ? (
        <span className="tip-resolved small">
          {tip.resolved.outcome === "won" ? "먼저 도달했다 — 내 것이 됐다" : "한발 늦었다 — 라이벌이 가져갔다"}
        </span>
      ) : graceLeft > 0 ? (
        <span className="tip-grace small">반응 유예 {Math.ceil(graceLeft)}초 — 아직 아무도 못 가져간다</span>
      ) : (
        <span className="tip-odds small">
          {odds.guaranteed
            ? `첫 제보는 배우는 자리 — 참가하면 확보한다 · 결판까지 ${Math.ceil(odds.decideIn)}초`
            : odds.needsResponse && odds.playerChance === 0
              ? `유일 — 대응하지 않으면 놓친다 · 결판까지 ${Math.ceil(odds.decideIn)}초`
              : `승산 ${Math.round(odds.playerChance * 100)}%(경쟁 ${odds.contenders}명)${
                  odds.eyeBonus > 0.005 ? ` · 안목 +${Math.round(odds.eyeBonus * 100)}%` : ""
                }${odds.needsResponse ? " — 유일은 대응해야 승산이 산다" : ""} · 결판까지 ${Math.ceil(odds.decideIn)}초`}
        </span>
      )}
      {tip.resolved ? null : <TipAction game={game} tip={tip} />}
    </div>
  );
}

/**
 * 제보에 대한 반응 수단 한 칸. 배너와 유일 알림이 같이 쓴다 — 두 곳이 서로 다른
 * 버튼을 내밀면 안 된다.
 */
function TipAction({ game, tip, big }: { game: Game; tip: Tip; big?: boolean }) {
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
  // 진귀·국보 제보는 현지 팀이 알아서 집중한다(v0.6.6, P2-가). 누를 것이 없다.
  if (tip.autoFocused) {
    return <span className="tip-autofocus small">자동 집중 중 — 현지 팀이 이미 파고 있다</span>;
  }
  const cls = big ? "tip-action-big" : undefined;
  if (onSite) {
    return (
      <button type="button" className={cls} disabled={!!tip.focused} onClick={() => game.focusDig(onSite.id)}>
        {tip.focused ? "집중 굴착 적용됨" : "집중 굴착"}
      </button>
    );
  }
  if (emergency) {
    return (
      <button type="button" className={cls} onClick={() => game.emergencyDispatch(emergency.id)}>
        급파
      </button>
    );
  }
  // 유일인데 발굴단이 없고 직접 발굴만 그 자리에 있으면 긴급 인부로 대응한다(v0.6.7).
  // 값은 현재 자금의 비율이라, 모자라면 소장품을 팔아야 한다 — 그 사실을 그대로 적는다.
  const crew = emergencyCrewOffer(game.world);
  if (crew) {
    return crew.affordable ? (
      <button type="button" className={cls} onClick={game.hireEmergencyCrew}>
        긴급 인부 {usd(crew.cost)}
      </button>
    ) : (
      <span className="tip-crew-short small">
        긴급 인부 {usd(crew.cost)} — 자금이 {usd(crew.cost - game.world.funds)} 모자란다. 소장품을 팔면 부를 수 있다
      </span>
    );
  }
  if (tip.focused && legacyOnSite && ARTIFACT_BY_ID[tip.artifactId].tier === 4) {
    return <span className="tip-racing small">긴급 인부가 쫓는 중 — 적중 {Math.round(TIP_EMERGENCY_CREW_HIT_CHANCE * 100)}%</span>;
  }
  if (legacyOnSite) {
    return (
      <span className="tip-racing small">
        직접 발굴이 이 자리에서 쫓는 중 — 적중 {Math.round(TIP_PLAYER_HIT * 100)}%
      </span>
    );
  }
  return <span className="tip-info-only muted small">반응할 발굴단이 없다 — 정보로만 뜬다</span>;
}

/**
 * 유일(T4) 제보 알림(v0.6.6, `notes/decision-tree-10h.md` P4). 방치 10시간 유일 0점의
 * 원인은 첫 유일 제보 하나를 알아채지 못한 것이었다. 평소 배너와 같은 자리·같은
 * 크기였기 때문이다. 그래서 유일만큼은 화면 위쪽 전체 폭으로 크게 띄우고 소리를 낸다.
 * 규칙(대응해야 산다)은 그대로다. 화면을 막지 않는다 — 접으면 평소 배너가 남는다.
 */
function UniqueTipAlert({ game, tip }: { game: Game; tip: Tip }) {
  const [folded, setFolded] = useState<string | null>(null);
  const a = ARTIFACT_BY_ID[tip.artifactId];
  if (a.tier !== 4 || tip.resolved || folded === tipKey(tip)) return null;
  const site = SITE_BY_ID[tip.site];
  return (
    <div className="unique-alert" role="alert">
      <div className="unique-alert-head">
        <span className="unique-alert-mark">유일 제보</span>
        <span className="tip-clock">{clock(tip.remain)}</span>
        <button type="button" className="unique-alert-fold" aria-label="접기" onClick={() => setFolded(tipKey(tip))}>
          ✕
        </button>
      </div>
      <p className="unique-alert-title">
        세계에 단 하나 — <strong>{a.name}</strong>
      </p>
      <p className="unique-alert-sub small">
        {site.city} {tip.layer}층에서 반응했다. 유일은 대응하지 않으면 놓친다.
      </p>
      <div className="unique-alert-action">
        <TipAction game={game} tip={tip} big />
      </div>
    </div>
  );
}
