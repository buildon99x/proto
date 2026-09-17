import { ARTIFACTS } from "../game/artifacts";
import { CATCHUP_MAX, CATCHUP_SLOPE, OFFLINE_EFFICIENCY, TIER_NAME, TIP_MEAN_INTERVAL, TIP_PLAYER_HIT, tierWeights } from "../game/balance";
import { ranking } from "../game/engine";
import { duration, rate, won } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import type { Game } from "./useGame";

export function WorldView({ game }: { game: Game }) {
  const { world } = game;
  const rank = ranking(world);
  const top = Math.max(1, rank[0].assets);
  const uniques = ARTIFACTS.filter((a) => a.tier === 4);

  return (
    <div className="world">
      <section className="card">
        <h3>자산 순위</h3>
        <ul className="rank-list">
          {rank.map((r, i) => (
            <li key={String(r.id)} className={r.id === "player" ? "me" : ""}>
              <span className="rank-no">{i + 1}</span>
              <span className="rank-name">{r.name}</span>
              <span className="rank-bar">
                <i style={{ width: `${(r.assets / top) * 100}%` }} />
              </span>
              <span className="rank-val">{won(r.assets)} ₩</span>
              <span className="rank-dig muted">
                {rate(r.dig)}/s{r.catchup > 1.01 ? ` · 추격 ×${r.catchup.toFixed(2)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>세계 원장 — 유일 유물</h3>
        <ul className="ledger-list">
          {uniques.map((a) => {
            const e = world.ledger[a.id];
            const owner = e.owners[0];
            const mine = owner === "player";
            return (
              <li key={a.id}>
                <span style={{ color: TIER_COLOR[4] }}>✦</span>
                <span className="ledger-name">{a.name}</span>
                <span className={`ledger-state ${owner ? (mine ? "mine" : "gone") : "open"}`}>
                  {owner === undefined
                    ? "세상에 남아 있음"
                    : mine
                      ? "내 소장"
                      : `${world.rivals.find((r) => r.id === owner)?.name ?? owner} 소장`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h3>활동 기록</h3>
        <ul className="log-list">
          {world.log.slice(0, 22).map((l, i) => (
            <li key={`${l.t}-${i}`} className={`log-${l.kind}`}>
              <em className="muted">{duration(l.t)}</em> {l.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>규칙 공개</h3>
        <p className="muted small">
          라이벌이 반칙하지 않는다는 걸 확인할 수 있어야 한다. 이 게임의 확률과 공식은 전부 여기에 있다.
        </p>
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
        <ul className="rules-notes">
          <li>제보는 평균 {TIP_MEAN_INTERVAL / 60}분마다 뜬다. 대상 층에서 파는 동안 롤마다 {Math.round(TIP_PLAYER_HIT * 100)}% 확률로 대상 유물이 걸린다.</li>
          <li>추격 계수 = min({CATCHUP_MAX}, 1 + {CATCHUP_SLOPE} × log₁₀(1위 자산 ÷ 본인 자산)).</li>
          <li>오프라인 효율 {Math.round(OFFLINE_EFFICIENCY * 100)}%, 최대 12시간까지 누적된다.</li>
          <li>
            <strong>라이벌은 제보 레이스 밖에서 유일 유물을 가져가지 못한다.</strong> 오프라인 중에는
            진귀 이하만 가져간다 — 영구 상실은 당신이 그 자리에 있었을 때만 일어난다.
          </li>
        </ul>
      </section>

      <section className="card">
        <h3>세이브</h3>
        <SaveTools game={game} />
      </section>
    </div>
  );
}

function SaveTools({ game }: { game: Game }) {
  return (
    <div className="save-tools">
      <button
        type="button"
        className="ghost"
        onClick={() => {
          const text = game.exportSave();
          navigator.clipboard?.writeText(text).catch(() => undefined);
          window.prompt("세이브 코드 (복사해 두세요)", text);
        }}
      >
        내보내기
      </button>
      <button
        type="button"
        className="ghost"
        onClick={() => {
          const text = window.prompt("세이브 코드를 붙여 넣으세요");
          if (text) {
            try {
              game.importSave(text);
            } catch {
              window.alert("세이브 코드를 읽지 못했습니다.");
            }
          }
        }}
      >
        가져오기
      </button>
      <button
        type="button"
        className="ghost danger"
        onClick={() => {
          if (window.confirm("진행 상황을 모두 지우고 처음부터 시작합니다.")) game.reset();
        }}
      >
        초기화
      </button>
    </div>
  );
}
