import {
  CATCHUP_MAX, CATCHUP_SLOPE, EMERGENCY_DISPATCH_COST_MULT, EMERGENCY_DISPATCH_MAX_REACH_HOURS,
  EMERGENCY_DISPATCH_MISHAP_MULT, OFFLINE_EFFICIENCY, RANK_WEIGHT, SITE_BY_ID, THEFT_RATE_BASE,
  THEFT_RECOVERY_BASE, THEFT_RECOVERY_CHANCE_CAP, THEFT_RECOVERY_WINDOW_HOURS, TIER_NAME,
  DROP_INTERVAL_CEILING_SECONDS, DROP_INTERVAL_FLOOR_SECONDS,
  TIP_DURATION_ONSITE_MAX, TIP_DURATION_ONSITE_MIN,
  TIP_FOCUS_DIG_COST_MULT, TIP_FOCUS_DIG_HIT_CHANCE, TIP_MEAN_INTERVAL,
  TIP_MIN_RESPONSE_SECONDS, TIP_PLAYER_HIT, TIP_RIVAL_HIT,
  CURATOR_RECOVERY_COEFF, tierWeights
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
        <h4>드랍 간격 — 하한과 천장</h4>
        <ul className="rules-notes">
          <li>드랍 간격은 그 층의 기대 평가액에 비례한다. <strong>깊이는 희소성만 열고, 수입은 발굴력에서만 나온다.</strong></li>
          <li>다만 양쪽에 벽이 있다 — 아무리 발굴력을 올려도 <strong>{DROP_INTERVAL_FLOOR_SECONDS}초보다 자주</strong> 나오지 않고, 아무리 깊이 내려가도 <strong>{DROP_INTERVAL_CEILING_SECONDS}초보다 드물게</strong> 나오지 않는다.</li>
          <li>천장에 걸린 구간에서는 드랍 <em>횟수</em>가 고정되고 한 건의 값이 커진다. 하한에 걸린 구간에서는 그 반대다 — 발굴력을 더 올려도 드랍은 그대로고 층만 빨리 내려간다.</li>
        </ul>
      </section>

      <section className="rules-block">
        <h4>순위 3축 가중식</h4>
        <ul className="rules-notes">
          <li>종합 점수 = 자산×{RANK_WEIGHT.asset} + 도감×{RANK_WEIGHT.codex} + 명성×{RANK_WEIGHT.fame}. 도감+명성(0.70)이 자산(0.30)보다 커서 "팔아서 1위"는 구조적으로 막힌다.</li>
          <li>추격 계수 = min({CATCHUP_MAX}, 1 + {CATCHUP_SLOPE} × log₁₀(1위 자산 ÷ 본인 자산)).</li>
          <li>오프라인 효율 {Math.round(OFFLINE_EFFICIENCY * 100)}%, 최대 12시간까지 누적된다.</li>
        </ul>
      </section>

      <section className="rules-block">
        <h4>제보 — 집중 굴착 · 급파</h4>
        <ul className="rules-notes">
          <li>평균 {TIP_MEAN_INTERVAL / 60}분마다 뜬다. 배너는 {TIP_DURATION_ONSITE_MIN}~{TIP_DURATION_ONSITE_MAX}초 유지된다.</li>
          <li><strong>처음 {TIP_MIN_RESPONSE_SECONDS}초는 반응 유예다</strong> — 그 동안은 당신도 라이벌도 그 유물을 가져가지 못한다. 결판이 난 뒤에도 배너는 결과를 보여 주며 수명을 다 채운다.</li>
          <li>on_site 팀이 있으면(또는 직접 발굴이 그 자리를 파고 있으면) 자동으로 {Math.round(TIP_PLAYER_HIT * 100)}% 확률로 판정된다 — <strong>같은 제보를 받은 라이벌도 {Math.round(TIP_RIVAL_HIT * 100)}%로 같다.</strong> 아무것도 안 누르면 공정한 레이스이고, [집중 굴착]을 누르면 {Math.round(TIP_FOCUS_DIG_HIT_CHANCE * 100)}%로 오르는 대신 그 원정의 원정비가 {TIP_FOCUS_DIG_COST_MULT}배가 된다.</li>
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
