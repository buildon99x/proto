import { playerStyle } from "../game/config";
import type { Standing } from "../game/types";

type Props = {
  entries: Standing[];
  /** 목록 밖으로 밀려난 내 순위. 없으면 표시하지 않는다. */
  mine?: { rank: number; entry: Standing };
};

/** 참가자가 많은 세계 모드용 순위표. 상위 몇 명과 내 자리만 보여 준다. */
export function Leaderboard({ entries, mine }: Props) {
  return (
    <ol className="board">
      {entries.map((entry, index) => (
        <li key={entry.id} className={entry.kind === "human" ? "board__row board__row--me" : "board__row"}>
          <span className="board__rank">{index + 1}</span>
          <span className="board__chip" style={{ background: playerStyle(entry.id).territory }} />
          <span className="board__name">{entry.label}</span>
          <span className="board__score">{entry.score.toLocaleString("ko-KR")}</span>
        </li>
      ))}
      {mine ? (
        <li className="board__row board__row--me board__row--detached">
          <span className="board__rank">{mine.rank}</span>
          <span className="board__chip" style={{ background: playerStyle(mine.entry.id).territory }} />
          <span className="board__name">{mine.entry.label}</span>
          <span className="board__score">{mine.entry.score.toLocaleString("ko-KR")}</span>
        </li>
      ) : null}
    </ol>
  );
}
