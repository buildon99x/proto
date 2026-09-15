import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "../components/GameCanvas";
import { Standings } from "../components/Standings";
import type { AiController } from "../game/ai";
import { KILL_SCORE, PALETTE, type Difficulty } from "../game/config";
import type { Effects } from "../game/effects";
import type { Match, MatchResult } from "../game/engine";
import type { Direction, Standing } from "../game/types";

type Props = {
  match: Match;
  effects: Effects;
  ai: AiController;
  difficulty: Difficulty;
  onFinished: (result: MatchResult) => void;
  onRestart: () => void;
  onExit: () => void;
  onSample: (match: Match) => void;
};

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right"
};

const HUD_INTERVAL_MS = 100;

type Hud = {
  remainingMs: number;
  share: number;
  lives: number;
  score: number;
  kills: number;
  standings: Standing[];
  paused: boolean;
};

function readHud(match: Match): Hud {
  return {
    remainingMs: match.remainingMs,
    share: match.shareOf(match.human.id),
    lives: Math.max(0, match.human.lives),
    score: match.scoreOf(match.human),
    kills: match.human.kills,
    standings: match.standings(),
    paused: match.phase === "paused"
  };
}

export function GameScreen({
  match,
  effects,
  ai,
  difficulty,
  onFinished,
  onRestart,
  onExit,
  onSample
}: Props) {
  const [hud, setHud] = useState<Hud>(() => readHud(match));
  const lastHudRef = useRef(0);
  const finishedRef = useRef(false);

  const steer = useCallback(
    (dir: Direction) => {
      match.queueDirection(match.human, dir);
    },
    [match]
  );

  const togglePause = useCallback(() => {
    if (match.phase === "playing") {
      match.pause();
    } else if (match.phase === "paused") {
      match.resume();
    }
    setHud(readHud(match));
  }, [match]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" || event.code === "KeyP") {
        event.preventDefault();
        togglePause();
        return;
      }
      const dir = KEY_DIRECTIONS[event.code];
      if (!dir) {
        return;
      }
      event.preventDefault();
      steer(dir);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [steer, togglePause]);

  const onFrame = useCallback(
    (current: Match) => {
      onSample(current);

      const now = performance.now();
      if (now - lastHudRef.current >= HUD_INTERVAL_MS) {
        lastHudRef.current = now;
        setHud(readHud(current));
      }

      if (current.phase === "result" && !finishedRef.current) {
        finishedRef.current = true;
        onFinished(current.result());
      }
    },
    [onFinished, onSample]
  );

  const seconds = Math.ceil(hud.remainingMs / 1000);

  return (
    <div className="screen screen--game">
      <header className="hud">
        <div className="hud__cell">
          <span className="hud__label">남은 시간</span>
          <strong className={seconds <= 10 ? "hud__value hud__value--urgent" : "hud__value"}>
            {seconds}초
          </strong>
        </div>
        <div className="hud__cell">
          <span className="hud__label">내 점유율</span>
          <strong className="hud__value" style={{ color: PALETTE[1].territory }}>
            {(hud.share * 100).toFixed(1)}%
          </strong>
        </div>
        <div className="hud__cell">
          <span className="hud__label">점수</span>
          <strong className="hud__value">{hud.score.toLocaleString("ko-KR")}</strong>
        </div>
        <div className="hud__cell">
          <span className="hud__label">킬 (1회 {KILL_SCORE}점)</span>
          <strong className={hud.kills > 0 ? "hud__value hud__value--kill" : "hud__value"}>
            {hud.kills}
          </strong>
        </div>
        <div className="hud__cell">
          <span className="hud__label">목숨</span>
          <strong className="hud__value">{"●".repeat(hud.lives) || "—"}</strong>
        </div>
        <button type="button" className="ghost" onClick={togglePause}>
          {hud.paused ? "계속" : "일시정지"}
        </button>
      </header>

      <div className="stage">
        <div className="stage__board">
          <GameCanvas match={match} effects={effects} ai={ai} onFrame={onFrame} onSwipe={steer} />
          {hud.paused ? (
            <div className="overlay">
              <h2>일시정지</h2>
              <p>{difficulty.label} 난이도</p>
              <div className="overlay__actions">
                <button type="button" className="primary" onClick={togglePause}>
                  계속하기
                </button>
                <button type="button" className="ghost" onClick={onRestart}>
                  다시 시작
                </button>
                <button type="button" className="ghost" onClick={onExit}>
                  타이틀로
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="sidebar">
          <h2>순위</h2>
          <Standings standings={hud.standings} />
          <p className="hint hint--tight">
            남의 꼬리를 밟으면 그 상대가 죽고 <b>{KILL_SCORE}점</b> — 땅 {KILL_SCORE}칸과 같다.
          </p>
        </aside>
      </div>

      <nav className="dpad" aria-label="방향 조작">
        <button type="button" onClick={() => steer("up")} aria-label="위">
          ↑
        </button>
        <button type="button" onClick={() => steer("left")} aria-label="왼쪽">
          ←
        </button>
        <button type="button" onClick={() => steer("down")} aria-label="아래">
          ↓
        </button>
        <button type="button" onClick={() => steer("right")} aria-label="오른쪽">
          →
        </button>
      </nav>
    </div>
  );
}
