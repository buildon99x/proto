import { useEffect, useRef } from "react";
import type { AiController } from "../game/ai";
import type { Effects } from "../game/effects";
import type { Match } from "../game/engine";
import { drawMatch, type Camera } from "../game/render";
import type { Direction } from "../game/types";

type Props = {
  match: Match;
  effects: Effects;
  ai: AiController;
  /** 프레임마다 호출된다. HUD 갱신 빈도는 호출부가 조절한다. */
  onFrame: (match: Match) => void;
  onSwipe: (dir: Direction) => void;
};

const SWIPE_THRESHOLD_PX = 24;

/**
 * 보드가 한 화면에 들어오면 전부 보여 주고, 그렇지 않으면 내 말을 따라간다.
 * 카메라는 보드 밖을 비추지 않도록 가장자리에서 멈춘다.
 */
function cameraFor(match: Match): Camera {
  const board = match.board;
  const tiles = Math.min(board.size, match.viewTiles);

  if (tiles >= board.size) {
    return { x: board.size / 2, y: board.size / 2, tiles: board.size };
  }

  const me = match.human;
  const progress = me.alive ? match.moveProgress(me) : 1;
  const half = tiles / 2;
  const targetX = me.prevX + (me.x - me.prevX) * progress + 0.5;
  const targetY = me.prevY + (me.y - me.prevY) * progress + 0.5;

  return {
    x: Math.min(board.size - half, Math.max(half, targetX)),
    y: Math.min(board.size - half, Math.max(half, targetY)),
    tiles
  };
}

export function GameCanvas({ match, effects, ai, onFrame, onSwipe }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<(match: Match) => void>(onFrame);
  const swipeRef = useRef<(dir: Direction) => void>(onSwipe);

  frameRef.current = onFrame;
  swipeRef.current = onSwipe;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let logicalSize = 0;
    let scale = 1;
    let running = true;
    let previous = performance.now();
    let handle = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const side = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(side * dpr);
      canvas.height = Math.floor(side * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      logicalSize = side;
      scale = dpr;
    };

    const loop = (now: number) => {
      if (!running) {
        return;
      }
      const deltaMs = now - previous;
      previous = now;

      if (match.phase === "playing") {
        ai.update();
        match.update(deltaMs);
        effects.ingest(match.drainEvents());
        effects.update(deltaMs);
      }

      if (logicalSize > 0) {
        drawMatch(ctx, match, effects, logicalSize, scale, cameraFor(match));
      }
      frameRef.current(match);
      handle = window.requestAnimationFrame(loop);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    handle = window.requestAnimationFrame(loop);

    return () => {
      running = false;
      window.cancelAnimationFrame(handle);
      observer.disconnect();
    };
  }, [match, effects, ai]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const start = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    };

    const move = (event: TouchEvent) => {
      if (!tracking) {
        return;
      }
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) {
        return;
      }
      event.preventDefault();
      const dir: Direction =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      swipeRef.current(dir);
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const end = () => {
      tracking = false;
    };

    canvas.addEventListener("touchstart", start, { passive: true });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end, { passive: true });
    canvas.addEventListener("touchcancel", end, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
      canvas.removeEventListener("touchcancel", end);
    };
  }, []);

  return <canvas ref={canvasRef} className="board" aria-label="땅따먹기 보드" />;
}
