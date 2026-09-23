import {
  CATCHUP_MAX, CATCHUP_SLOPE, EMERGENCY_DISPATCH_COST_MULT, EMERGENCY_DISPATCH_MAX_REACH_HOURS,
  EMERGENCY_DISPATCH_MISHAP_MULT, OFFLINE_EFFICIENCY, RANK_WEIGHT, SITE_BY_ID, THEFT_RATE_BASE,
  THEFT_RECOVERY_BASE, THEFT_RECOVERY_CHANCE_CAP, THEFT_RECOVERY_WINDOW_HOURS, TIER_NAME,
  TIP_FOCUS_DIG_COST_MULT, TIP_FOCUS_DIG_HIT_CHANCE, TIP_MEAN_INTERVAL, TIP_PLAYER_HIT,
  CURATOR_RECOVERY_COEFF, FAME_FIRST_T4_WEIGHT, FAME_VISITOR_NORMALIZATION, FAME_VISITOR_WEIGHT, tierWeights
} from "../game/balance";
import { rivalExpeditions } from "../game/engine";
import { clock, withJosa } from "../game/format";
import { Modal } from "./Modal";
import type { Game } from "./useGame";

/**
 * 📋 규칙(척추 5번, notes/ux-v02.md §1.4) — 확률표·추격 계수·오프라인 효율은
 * v0.1 세계 탭 그대로 옮기고, v0.2가 새로 공개해야 하는 항목(3축 가중식·제보
 * 집중굴착/급파 규칙·도난 확률/회수율·라이벌 원정 ETA)을 더한다. 라이벌이
 * "반칙"하지 않는다는 걸 확인하는 자리가 바로 여기다.
 */
export function RulesModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const { world } = game;
  const rivals = rivalExpeditions(world);

  return (
    <Modal title="규칙" onClose={onClose} wide>
      <section className="rules-block">
        <h4>층별 티어 확률 — {SITE_BY_ID[world.activeSite].city} 기준</h4>
        <table className="rules">
          <thead>
            <tr><th>층</th>{TIER_NAME.map((n) => <th key={n}>{n}</th>)}</tr>
          </thead>
          <tbody>
            {[1, 3, 5, 8, 10, 12].map((L) => (
              <tr key={L}>
                <td>{L}</td>
                {tierWeights(world.activeSite, L).map((w, i) => (
                  <td key={i}>{w < 0.05 ? "–" : `${w.toFixed(1)}%`}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rules-block">
        <h4>순위 3축 가중식</h4>
        <ul className="rules-notes">
          <li>종합 점수 = 자산×{RANK_WEIGHT.asset} + 도감×{RANK_WEIGHT.codex} + 명성×{RANK_WEIGHT.fame}. 도감+명성(0.70)이 자산(0.30)보다 커서 "팔아서 1위"는 구조적으로 막힌다.</li>
          <li>명성 = min(1, {FAME_VISITOR_WEIGHT} × min(1, 박물관 누적 관람객 ÷ {FAME_VISITOR_NORMALIZATION.toLocaleString("ko-KR")}명) + {FAME_FIRST_T4_WEIGHT} × 유일 최초발굴 ÷ 12). 전시한 유물은 자산에서 빠진다 — 전시는 약 6일(엔딩 무렵)이면 본전이고, 더 오래 두면 명성으로 남는다.</li>
          <li>추격 계수 = min({CATCHUP_MAX}, 1 + {CATCHUP_SLOPE} × log₁₀(1위 자산 ÷ 본인 자산)).</li>
          <li>오프라인 효율 {Math.round(OFFLINE_EFFICIENCY * 100)}%, 최대 12시간까지 누적된다.</li>
        </ul>
      </section>

      <section className="rules-block">
        <h4>제보 — 집중 굴착 · 급파</h4>
        <ul className="rules-notes">
          <li>평균 {TIP_MEAN_INTERVAL / 60}분마다 뜬다. 배너는 60~150초만 유지된다.</li>
          <li>on_site 팀이 있으면 자동으로 {Math.round(TIP_PLAYER_HIT * 100)}% 확률로 판정된다. [집중 굴착]을 누르면 {Math.round(TIP_FOCUS_DIG_HIT_CHANCE * 100)}%로 오르는 대신, 그 원정의 원정비가 {TIP_FOCUS_DIG_COST_MULT}배가 된다.</li>
          <li>[급파]는 유휴 발굴단을 압축 이동시간 {EMERGENCY_DISPATCH_MAX_REACH_HOURS}시간 이내인 거점에 즉시 출발시킨다. 원정비 {EMERGENCY_DISPATCH_COST_MULT}배·미스헵 확률 {EMERGENCY_DISPATCH_MISHAP_MULT}배가 붙는다. 배너가 사라진 뒤에도 도착하면 판정은 그대로 유효하다 — 세계 재고가 남아 있는지가 유일한 기준이다.</li>
          <li><strong>라이벌은 제보 레이스 밖에서 유일 유물을 가져가지 못한다.</strong> 오프라인 중에는 진귀 이하만 가져간다 — 영구 상실은 당신이 그 자리에 있었을 때만 일어난다.</li>
        </ul>
      </section>

      <section className="rules-block">
        <h4>도난·회수</h4>
        <ul className="rules-notes">
          <li>전시 중인 국보 이하 유물만 대상이다. 시간당 도난 확률 {(THEFT_RATE_BASE * 100).toFixed(2)}%.</li>
          <li>도난 후 {THEFT_RECOVERY_WINDOW_HOURS}시간(온라인 경과 기준 — 오프라인 중에는 흐르지 않는다) 안에 관장이 회수를 시도한다. 회수 확률 = min({Math.round(THEFT_RECOVERY_CHANCE_CAP * 100)}%, {Math.round(THEFT_RECOVERY_BASE * 100)}% + 보안감각×{CURATOR_RECOVERY_COEFF}).</li>
          <li>회수에 실패하면 절반은 암시장 장물로, 절반은 라이벌 소장고로 넘어간다. 보험은 없다 — 회수가 유일한 대응이다.</li>
        </ul>
      </section>

      <section className="rules-block">
        <h4>라이벌 원정 현황 — 반칙하지 않는다는 확인</h4>
        <ul className="rank-list rival-eta-list">
          {rivals.map((r) => (
            <li key={r.id}>
              <span className="rank-name">{r.name}</span>
              <span className="muted small">
                {r.status === "home"
                  ? `${SITE_BY_ID[r.site].city}(홈 거점)에서 발굴 중`
                  : `제보를 쫓아 ${withJosa(SITE_BY_ID[r.site].city, "로으로")} 이동 중 — 도착까지 ${clock(Math.max(0, (r.arrivesAt ?? 0) - world.t))}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </Modal>
  );
}
