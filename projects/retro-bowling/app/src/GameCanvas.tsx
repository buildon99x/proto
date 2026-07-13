import { useEffect, useRef, useState } from "react";
import { BowlingGame } from "./game/engine";
import { render, VW, VH } from "./game/render";
import { audio } from "./game/audio";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<BowlingGame | null>(null);
  const [muted, setMuted] = useState(false);

  if (!gameRef.current) gameRef.current = new BowlingGame();

  useEffect(() => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 디버그/자동화 검증용으로 게임 인스턴스 노출.
    (window as unknown as { __bowling?: BowlingGame }).__bowling = game;

    let raf = 0;
    let last = performance.now();
    let running = true;

    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt);
      render(ctx, game, now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  // 키보드 입력.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          game.setHeld("left", true);
          e.preventDefault();
          break;
        case "ArrowRight":
        case "d":
        case "D":
          game.setHeld("right", true);
          e.preventDefault();
          break;
        case " ":
        case "Enter":
        case "ArrowUp":
          if (!e.repeat) game.action();
          e.preventDefault();
          break;
        case "m":
        case "M":
          audio.enabled = !audio.enabled;
          setMuted(!audio.enabled);
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") game.setHeld("left", false);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") game.setHeld("right", false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const game = gameRef.current!;

  // 터치/버튼 입력 헬퍼.
  const holdStart = (dir: "left" | "right") => (e: React.PointerEvent) => {
    e.preventDefault();
    game.setHeld(dir, true);
  };
  const holdEnd = (dir: "left" | "right") => (e: React.PointerEvent) => {
    e.preventDefault();
    game.setHeld(dir, false);
  };
  const doAction = (e: React.PointerEvent) => {
    e.preventDefault();
    game.action();
  };

  const toggleMute = () => {
    audio.enabled = !audio.enabled;
    setMuted(!audio.enabled);
  };

  return (
    <div className="game-wrap">
      <div className="screen-frame">
        <canvas
          ref={canvasRef}
          width={VW}
          height={VH}
          className="game-canvas"
          onPointerDown={doAction}
        />
        <div className="scanlines" />
        <button className="mute-btn" onClick={toggleMute} aria-label="toggle sound">
          {muted ? "SOUND OFF" : "SOUND ON"}
        </button>
      </div>

      <div className="controls">
        <button
          className="ctrl ctrl-dir"
          onPointerDown={holdStart("left")}
          onPointerUp={holdEnd("left")}
          onPointerLeave={holdEnd("left")}
          onPointerCancel={holdEnd("left")}
        >
          ◀
        </button>
        <button className="ctrl ctrl-action" onPointerDown={doAction}>
          ●
        </button>
        <button
          className="ctrl ctrl-dir"
          onPointerDown={holdStart("right")}
          onPointerUp={holdEnd("right")}
          onPointerLeave={holdEnd("right")}
          onPointerCancel={holdEnd("right")}
        >
          ▶
        </button>
      </div>
      <p className="hint">
        키보드: ← → 조준 · SPACE 파워/스핀/투구 · M 음소거
      </p>
    </div>
  );
}
