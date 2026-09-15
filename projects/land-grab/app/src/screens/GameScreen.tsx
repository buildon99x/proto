import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "../components/GameCanvas";
import { Standings } from "../components/Standings";
import type { AiController } from "../game/ai";
import { KILL_SCORE, PALETTE, PLAYER_KEYS, type Difficulty } from "../game/config";
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

/**
 * 눌린 키가 어느 자리의 어느 방향인지 찾는다.
 * 혼자일 때는 1번 자리가 방향키와 WASD 를 같이 받는다 — 싱글 조작을 좁히지 않기 위해서다.
 */
function resolveKey(code: string, humans: number): { slot: number; dir: Direction } | null {
  if (humans === 1) {
    const solo = PLAYER_KEYS[0].map[code] ?? PLAYER_KEYS[1].map[code];
    return solo ? { slot: 0, dir: solo } : null;
  }
  for (let slot = 0; slot < humans; slot += 1) {
    const dir = PLAYER_KEYS[slot].map[code];
    if (dir) {
      return { slot, dir };
    }
  }
  return null;
}

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
    // 여럿이 하면 목숨이 무한이다. `Infinity` 를 그대로 흘리면 표시에서 터진다.
    lives: Number.isFinite(match.human.lives) ? Math.max(0, match.human.lives) : Number.POSITIVE_INFINITY,
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
    (dir: Direction, slot = 0) => {
      const runner = match.runners[slot];
      if (runner) {
        match.queueDirection(runner, dir);
      }
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
      const pressed = resolveKey(event.code, match.humans);
      if (!pressed) {
        return;
      }
      event.preventDefault();
      steer(pressed.dir, pressed.slot);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [match, steer, togglePause]);

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
        {match.humans > 1 ? (
          <div className="hud__cell">
            <span className="hud__label">사람</span>
            <strong className="hud__value">{match.humans}명</strong>
          </div>
        ) : null}
        <div className="hud__cell" hidden={match.humans > 1}>
          <span className="hud__label">내 점유율</span>
          <strong className="hud__value" style={{ color: PALETTE[1].territory }}>
            {(hud.share * 100).toFixed(1)}%
          </strong>
        </div>
        <div className="hud__cell" hidden={match.humans > 1}>
          <span className="hud__label">점수</span>
          <strong className="hud__value">{hud.score.toLocaleString("ko-KR")}</strong>
        </div>
        <div className="hud__cell" hidden={match.humans > 1}>
          <span className="hud__label">킬 (1회 {KILL_SCORE}점)</span>
          <strong className={hud.kills > 0 ? "hud__value hud__value--kill" : "hud__value"}>
            {hud.kills}
          </strong>
        </div>
        <div className="hud__cell" hidden={match.humans > 1}>
          <span className="hud__label">목숨</span>
          <strong className="hud__value">
            {Number.isFinite(hud.lives) ? "●".repeat(hud.lives) || "—" : "∞"}
          </strong>
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
              <p>
                {difficulty.label} 난이도
                {match.humans > 1 ? ` · ${match.humans}인` : ""}
              </p>
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
          <Standings
            standings={hud.standings}
            meId={match.humans === 1 ? match.human.id : undefined}
          />
          <p className="hint hint--tight">
            남의 꼬리를 밟으면 그 상대가 죽고 <b>{KILL_SCORE}점</b> — 땅 {KILL_SCORE}칸과 같다.
          </p>
        </aside>
      </div>

      <nav className="dpad" aria-label="방향 조작" hidden={match.humans > 1}>
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
