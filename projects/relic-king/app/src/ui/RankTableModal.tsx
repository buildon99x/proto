import { fullRanking } from "../game/engine";
import { percent } from "../game/format";
import { Modal } from "./Modal";
import type { Game } from "./useGame";

/** 헤더의 "종합 N위" 칩을 탭하면 1단계로 여기 들어온다(notes/ux-v02.md §1.1) */
export function RankTableModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const rows = [...fullRanking(game.world, game.record)].sort((a, b) => b.rank - a.rank);
  const top = Math.max(rows[0]?.rank ?? 1, 0.0001);

  return (
    <Modal title="순위표" onClose={onClose}>
      <ul className="rank-list">
        {rows.map((r, i) => (
          <li key={String(r.id)} className={r.id === "player" ? "me" : ""}>
            <span className="rank-no">{i + 1}</span>
            <span className="rank-name">{r.name}</span>
            <span className="rank-bar">
              <i style={{ width: `${(r.rank / top) * 100}%` }} />
            </span>
            <span className="rank-val">{percent(r.rank, 1)}</span>
            <span className="rank-dig muted">
              자산{percent(r.asset)} · 도감{percent(r.codex)} · 명성{percent(r.fame)}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small">
        "유물왕" 칭호는 종합 점수 1위 + 도감 75% 이상을 함께 유지해야 얻는다 — 팔아서 자산만 채워서는 1위에
        오를 수 없다(도감·명성 가중치 0.70 vs 자산 0.30).
      </p>
    </Modal>
  );
}
