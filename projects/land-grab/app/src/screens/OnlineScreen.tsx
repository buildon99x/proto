import { useCallback, useEffect, useRef, useState } from "react";
import { NetCanvas } from "../components/NetCanvas";
import { playerStyle } from "../game/config";
import type { Direction } from "../game/types";
import { Connection } from "../net/connection";
import { publishNetHook } from "../net/testHook";

type Props = {
  name: string;
  onExit: () => void;
};

/** HUD 갱신 주기. 화면은 60fps 로 돌지만 숫자는 이 정도면 충분하다. */
const HUD_INTERVAL_MS = 120;

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
}

export function OnlineScreen({ name, onExit }: Props) {
  const [, bump] = useState(0);
  const hudRef = useRef(0);

  /**
   * 접속은 **이펙트 안에서** 만든다. 밖에서(`useRef`) 들고 있으면 이펙트보다 오래 살아
   * 남는데, StrictMode 는 개발 모드에서 마운트→정리→마운트를 한 번씩 더 돈다.
   * 그러면 첫 정리의 `dispose()` 가 그 객체를 영구히 닫아 버리고, 두 번째 마운트가
   * 이미 죽은 접속을 그대로 쓰게 된다 — 화면이 "깨우는 중"에서 멈춘다.
   */
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    const next = new Connection(() => {
      publishNetHook(next);
      bump((value) => value + 1);
    });
    setConnection(next);
    publishNetHook(next);
    void next.start(name);
    return () => next.dispose();
  }, [name]);

  const onFrame = useCallback(() => {
    const now = performance.now();
    if (now - hudRef.current < HUD_INTERVAL_MS) {
      return;
    }
    hudRef.current = now;
    if (connection) {
      publishNetHook(connection);
    }
    bump((value) => value + 1);
  }, [connection]);

  const onSteer = useCallback((dir: Direction) => connection?.steer(dir), [connection]);

  if (!connection) {
    return (
      <div className="screen screen--game screen--net">
        <div className="net-wait">
          <h2>서버를 깨우는 중</h2>
          <p>잠시만 기다려 주세요…</p>
        </div>
      </div>
    );
  }

  const world = connection.world;
  const phase = connection.phase;

  if (phase === "waking" || phase === "connecting") {
    return (
      <div className="screen screen--game screen--net">
        <div className="net-wait">
          <h2>{phase === "waking" ? "서버를 깨우는 중" : "접속하는 중"}</h2>
          <p>{connection.message}</p>
          <p className="net-wait__note">
            무료 인스턴스라 아무도 없으면 잠듭니다. 처음 들어갈 때 1분쯤 걸릴 수 있습니다.
          </p>
          <button type="button" className="ghost" onClick={onExit}>
            취소
          </button>
        </div>
      </div>
    );
  }

  if (phase === "error" || phase === "closed") {
    return (
      <div className="screen screen--game screen--net">
        <div className="net-wait">
          <h2>{phase === "error" ? "접속하지 못했습니다" : "연결이 끊겼습니다"}</h2>
          <p>{connection.message}</p>
          <button type="button" className="primary" onClick={onExit}>
            타이틀로
          </button>
        </div>
      </div>
    );
  }

  const over = world.gameOver;
  const score = world.score;

  return (
    <div className="screen screen--game screen--net">
      <div className="hud">
        <div className="hud__cell">
          <span className="hud__label">점수</span>
          <strong className="hud__value">{score.score.toLocaleString("ko-KR")}</strong>
        </div>
        <div className="hud__cell">
          <span className="hud__label">순위</span>
          <strong className="hud__value">
            {score.rank}
            <small> / {score.total}명</small>
          </strong>
        </div>
        <div className="hud__cell">
          <span className="hud__label">내 땅</span>
          <strong
            className="hud__value"
            style={{ color: world.myId === null ? undefined : playerStyle(world.myId).territory }}
          >
            {score.tiles.toLocaleString("ko-KR")}
          </strong>
        </div>
        <div className="hud__cell">
          <span className="hud__label">킬</span>
          <strong className={score.kills > 0 ? "hud__value hud__value--kill" : "hud__value"}>
            {score.kills}
          </strong>
        </div>
        <button type="button" className="ghost" onClick={onExit}>
          나가기
        </button>
      </div>

      <div className="stage">
        <div className="stage__board">
          <NetCanvas world={world} onFrame={onFrame} onSteer={onSteer} />
        </div>

        <aside className="sidebar">
          <h2>순위표</h2>
          <ol className="board">
            {world.leaderboard.map((row, index) => (
              <li
                key={row.id}
                className={row.id === world.myId ? "board__row board__row--me" : "board__row"}
              >
                <span className="board__rank">{index + 1}</span>
                <span className="board__chip" style={{ background: playerStyle(row.id).territory }} />
                <span className="board__name">{row.name}</span>
                <span className="board__score">{row.score.toLocaleString("ko-KR")}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {over && (
        <div className="net-over">
          <div className="net-over__card">
            <h2>탈락</h2>
            <p className="net-over__rank">
              {over.rank}위 <small>/ {over.total}명</small>
            </p>
            <dl className="net-over__stats">
              <div>
                <dt>점수</dt>
                <dd>{over.score.toLocaleString("ko-KR")}</dd>
              </div>
              <div>
                <dt>최대 영토</dt>
                <dd>{over.peakTiles.toLocaleString("ko-KR")}칸</dd>
              </div>
              <div>
                <dt>킬</dt>
                <dd>{over.kills}</dd>
              </div>
              <div>
                <dt>생존</dt>
                <dd>{formatDuration(over.survivalMs)}</dd>
              </div>
            </dl>
            <div className="net-over__actions">
              <button type="button" className="primary" onClick={() => connection.again()}>
                다시 들어가기
              </button>
              <button type="button" className="ghost" onClick={onExit}>
                타이틀로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
