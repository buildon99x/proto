import { Standings } from "../components/Standings";
import { BOARD_SIZE, WALL_THICKNESS, type Difficulty } from "../game/config";
import type { MatchResult } from "../game/engine";

const PLAYABLE_TILES = (BOARD_SIZE - WALL_THICKNESS * 2) ** 2;

type Props = {
  result: MatchResult;
  difficulty: Difficulty;
  onRestart: () => void;
  onExit: () => void;
};

const HEADLINE: Record<MatchResult["outcome"], string> = {
  win: "승리",
  lose: "목숨을 전부 잃었다",
  ranked: "시간 종료"
};

export function ResultScreen({ result, difficulty, onRestart, onExit }: Props) {
  const multi = result.humans > 1;
  const me = result.standings.find((entry) => entry.kind === "human");
  const headline = multi ? `${result.winner.label} 승리` : HEADLINE[result.outcome];
  const subtitle = multi
    ? `${result.humans}인 · AI ${result.standings.length - result.humans}명 · ` +
      `${difficulty.label} 난이도 · ` +
      `${result.winner.label} ${result.winner.score.toLocaleString("ko-KR")}점` +
      ` (땅 ${(result.winner.share * 100).toFixed(1)}% · 킬 ${result.winner.kills})`
    : `${difficulty.label} 난이도 · ${result.playerRank}위` +
      (me
        ? ` · 최고 점유율 ${((me.peakTiles / PLAYABLE_TILES) * 100).toFixed(1)}%` +
          ` · 한 번에 가장 넓게 막은 땅 ${me.bestCapture}칸 · 킬 ${me.kills}`
        : "");

  return (
    <div className="screen screen--result">
      <header className="title">
        <h1>{headline}</h1>
        <p>{subtitle}</p>
      </header>

      <section className="panel">
        <h2>최종 순위</h2>
        <Standings standings={result.standings} detailed meId={multi ? undefined : me?.id} />
      </section>

      <div className="overlay__actions">
        <button type="button" className="primary" onClick={onRestart}>
          다시 하기
        </button>
        <button type="button" className="ghost" onClick={onExit}>
          타이틀로
        </button>
      </div>
    </div>
  );
}
