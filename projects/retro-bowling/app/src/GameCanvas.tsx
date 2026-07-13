import { useEffect, useRef, useState } from "react";
import { BowlingGame } from "./game/engine";
import { render, VW, VH } from "./game/render";
import { audio } from "./game/audio";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<BowlingGame | null>(null);
  const [muted, setMuted] = useState(false);
  const [oil, setOil] = useState(false);

  if (!gameRef.current) gameRef.current = new BowlingGame();

  useEffect(() => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 디버그/자동화 검증용으로 게임 인스턴스 노출.
    (window as unknown as { __bowling?: BowlingGame }).__bowling = game;
    setOil(game.oilEnabled); // 저장된 설정 반영

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
        case "o":
        case "O":
          game.setOil(!game.oilEnabled);
          setOil(game.oilEnabled);
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

  const toggleOil = () => {
    game.setOil(!game.oilEnabled);
    setOil(game.oilEnabled);
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
        <button
          className={`oil-btn${oil ? " on" : ""}`}
          onClick={toggleOil}
          aria-label="toggle oil pattern"
        >
          {oil ? "OIL ON" : "OIL OFF"}
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
        키보드: ← → 조준 · SPACE 파워/스핀/투구 · M 음소거 · O 오일 패턴
        <br />
        POCKET 마커에 조준하고, 미터 노란 존(PERFECT)에 멈춰 스트라이크를 노리세요
        <br />
        오일 패턴(상급): 레인마다 훅 양이 달라져 매 게임 읽고 조정해야 합니다
      </p>
    </div>
  );
}
