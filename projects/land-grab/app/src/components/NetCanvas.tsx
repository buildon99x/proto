import { useEffect, useRef } from "react";
import { Effects } from "../game/effects";
import { drawScene, type Camera } from "../game/render";
import type { Direction, PlayerId } from "../game/types";
import type { NetWorld } from "../net/client-state";
import { NetScene } from "../net/scene";

type Props = {
  world: NetWorld;
  /** 프레임마다 호출된다. HUD 갱신 빈도는 호출부가 조절한다. */
  onFrame: () => void;
  onSteer: (dir: Direction) => void;
};

const SWIPE_THRESHOLD_PX = 24;

/** 온라인은 혼자 하므로 방향키와 WASD 를 둘 다 받는다. */
const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right"
};

/** 카메라는 내 말을 따라가되 보드 밖을 비추지 않는다. */
function cameraFor(world: NetWorld, stamp: number): Camera {
  const tiles = Math.min(world.mapSize, world.viewTiles);
  const half = tiles / 2;
  const me = world.me;

  if (!me) {
    return { x: world.mapSize / 2, y: world.mapSize / 2, tiles };
  }

  const progress = Math.min(1, (stamp - me.movedAt) / Math.max(1, world.tickMs));
  const targetX = me.prevX + (me.x - me.prevX) * progress + 0.5;
  const targetY = me.prevY + (me.y - me.prevY) * progress + 0.5;

  return {
    x: Math.min(world.mapSize - half, Math.max(half, targetX)),
    y: Math.min(world.mapSize - half, Math.max(half, targetY)),
    tiles
  };
}

/**
 * 온라인 보드. 시뮬레이션을 돌리지 않는다 — 서버가 보낸 것을 그리기만 한다.
 * 연출(파편·충격파)만 이쪽에서 굴린다. 그건 규칙이 아니라 화면이다.
 */
export function NetCanvas({ world, onFrame, onSteer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(onFrame);
  const steerRef = useRef(onSteer);

  frameRef.current = onFrame;
  steerRef.current = onSteer;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const scene = new NetScene(world);
    const effects = new Effects();

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

    const loop = (stamp: number) => {
      if (!running) {
        return;
      }
      const deltaMs = stamp - previous;
      previous = stamp;

      for (const death of world.takeDeaths()) {
        // 지워진 영토 목록은 규약에 없다. 파편 대신 충격파만 남는다.
        // 킬 점수 팝업도 마찬가지 — 점수를 클라이언트가 지어내면 규칙이 둘이 된다.
        effects.ingest([
          {
            type: "death",
            // `PlayerId` 는 1~4 로 좁게 적혀 있지만 실제 번호는 254까지 간다.
            // 엔진도 세계 모드에서 같은 자리를 이렇게 넘긴다.
            id: death.id as PlayerId,
            killerId: death.killerId === 0 ? null : (death.killerId as PlayerId),
            awardedScore: 0,
            x: death.x,
            y: death.y,
            cells: []
          }
        ]);
      }
      effects.update(deltaMs);

      if (logicalSize > 0) {
        drawScene(ctx, scene, effects, logicalSize, scale, cameraFor(world, stamp));
      }
      frameRef.current();
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
  }, [world]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const dir = KEY_MAP[event.code];
      if (!dir) {
        return;
      }
      // 방향키로 화면이 스크롤되면 보드가 움직이는 것처럼 보인다.
      event.preventDefault();
      steerRef.current(dir);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      steerRef.current(dir);
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

  return <canvas ref={canvasRef} className="board" aria-label="땅따먹기 온라인 보드" />;
}
