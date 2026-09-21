import { ARTIFACT_BY_ID } from "../game/artifacts";
import { APPRAISAL_UNLOCK_LAB_LEVEL, LOCKED_HOLD_CAP, SITE_BY_ID } from "../game/balance";
import { codexProgress } from "../game/engine";
import { duration, won } from "../game/format";
import type { RankSnapshot } from "./useGame";
import type { Game } from "./useGame";

/**
 * 복귀 요약 2층(spec.md §3.3, notes/ux-v02.md §8) — 상단 고정 4줄 + 조치 필요
 * 카드만. 조치 0건이면 모달 대신 토스트 한 줄로 끝낸다. 손실 내역(라이벌이
 * 가져간 것)은 여기서 나열하지 않는다 — 도감 탭 원장 서브탭의 활동 기록에
 * 이미 전부 남아 있다("전체 기록 보기"가 그리로 연결한다).
 */
export function OfflineSummary({ game, onNavigate }: { game: Game; onNavigate: (tab: "vault" | "codex") => void }) {
  const o = game.offline;
  if (!o) return null;
  const { world } = game;

  const fundsDelta = Math.max(0, world.funds - o.fundsBefore);
  const codexAfter = codexProgress(world).owned;
  const codexDelta = codexAfter - o.codexBefore;

  const sealedT2 = world.pending.filter(
    (p) => ARTIFACT_BY_ID[p.artifactId].tier === 2 && world.lab < APPRAISAL_UNLOCK_LAB_LEVEL[2]
  ).length;
  const idleTeams = world.teams.filter((t) => t.status === "idle" && !t.routine?.enabled);

  const actionCount = world.theftEvents.length + (sealedT2 >= LOCKED_HOLD_CAP ? 1 : 0) + idleTeams.length;

  if (actionCount === 0) {
    return (
      <div className="offline-toast">
        <span>{duration(o.seconds)} 동안 자금 +{won(fundsDelta)} ₩</span>
        <button type="button" onClick={game.dismissOffline}>확인</button>
      </div>
    );
  }

  return (
    <div className="modal-back">
      <div className="modal offline-modal">
        <h2>{duration(o.seconds)} 동안</h2>
        <ul className="offline-fixed">
          <li>자금 +{won(fundsDelta)} ₩ (급여·유지비 차감후)</li>
          <li>유물 {o.drops}점 발굴 · 도감 {codexDelta >= 0 ? "+" : ""}{codexDelta}</li>
          <li>{rankLine(o.rankBefore, o.rankAfter)}</li>
          <li>종합 {o.rankBefore.composite}위 → {o.rankAfter.composite}위</li>
        </ul>

        <h3>조치 필요 ({actionCount}건)</h3>
        <ul className="offline-action-cards">
          {world.theftEvents.map((ev) => (
            <li key={ev.id} className="offline-action-card danger">
              <span>🔴 도난 — {ARTIFACT_BY_ID[ev.artifactId].name} ({SITE_BY_ID[ev.site].city})</span>
              <button type="button" onClick={game.dismissOffline}>확인</button>
            </li>
          ))}
          {sealedT2 >= LOCKED_HOLD_CAP ? (
            <li className="offline-action-card warn">
              <span>⚠ 봉인 보관 정리 권장(진귀 {sealedT2}점) — 방치해도 손실은 없다</span>
              <button type="button" onClick={() => { game.dismissOffline(); onNavigate("vault"); }}>지금 확인</button>
            </li>
          ) : null}
          {idleTeams.map((t) => (
            <li key={t.id} className="offline-action-card">
              <span>유휴 발굴단 — {SITE_BY_ID[t.targetSite].city}에서 대기 중</span>
              <button type="button" onClick={() => game.dispatch(t.id, t.targetSite)}>재파견</button>
            </li>
          ))}
        </ul>

        <div className="offline-modal-actions">
          <button type="button" className="ghost" onClick={() => { game.dismissOffline(); onNavigate("codex"); }}>
            전체 기록 보기
          </button>
          <button type="button" onClick={game.dismissOffline}>확인</button>
        </div>
      </div>
    </div>
  );
}

function rankLine(before: RankSnapshot, after: RankSnapshot): string {
  const arrow = (b: number, a: number) => `${b}위→${a}위`;
  return `순위 자산${arrow(before.asset, after.asset)} · 도감${arrow(before.codex, after.codex)} · 명성${arrow(before.fame, after.fame)}`;
}
