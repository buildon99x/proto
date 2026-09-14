import { PALETTE } from "../game/config";
import type { Standing } from "../game/types";

type Props = {
  standings: Standing[];
  detailed?: boolean;
};

export function Standings({ standings, detailed = false }: Props) {
  return (
    <ol className={detailed ? "standings standings--detailed" : "standings"}>
      {standings.map((entry, rank) => (
        <li key={entry.id} className={entry.kind === "human" ? "standing standing--me" : "standing"}>
          <span className="standing__rank">{rank + 1}</span>
          <span className="standing__chip" style={{ background: PALETTE[entry.id].territory }} />
          <span className="standing__name">
            {entry.kind === "human" ? "나" : `AI ${PALETTE[entry.id].name}`}
          </span>
          <span className="standing__share">{(entry.share * 100).toFixed(1)}%</span>
          {detailed ? (
            <>
              <span className="standing__kills">킬 {entry.kills}</span>
              <span className="standing__score">{entry.score.toLocaleString("ko-KR")}점</span>
            </>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
