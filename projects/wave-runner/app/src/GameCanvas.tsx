import { useEffect, useRef } from "react";
import { createState, currentStage, goToStage, launch, update } from "./game/engine";
import type { GameState } from "./game/engine";
import { render } from "./game/render";
import { sample } from "./game/stages";
import { sfx } from "./game/audio";
import type { Tuning } from "./game/types";

interface WaveDebug {
  readonly state: GameState | null;
  centerAt(worldX: number): number;
}

interface Props {
  stageIndex: number;
  tuning: Tuning;
  onClear: (stageId: number, sec: number, attempts: number) => void;
  onAttempt: (stageId: number) => void;
  onExit: () => void;
  /** 개발 패널이 읽는 상태 스냅샷 */
  onSample?: (snapshot: { fps: number; attempts: number; best: number }) => void;
}

export function GameCanvas({ stageIndex, tuning, onClear, onAttempt, onExit, onSample }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const cbRef = useRef({ onClear, onAttempt, onExit, onSample });
  cbRef.current = { onClear, onAttempt, onExit, onSample };

  // 스테이지 전환. 상태 객체는 유지하고 내용만 갈아끼워 rAF 루프를 끊지 않는다.
  useEffect(() => {
    if (!stateRef.current) {
      stateRef.current = createState(stageIndex, tuning);
    } else {
      goToStage(stateRef.current, stageIndex);
    }
  }, [stageIndex, tuning]);

  // 튜닝 값이 바뀌면 즉시 반영한다 — 개발 패널에서 손끝으로 비교하기 위한 것.
  useEffect(() => {
    if (stateRef.current) stateRef.current.tuning = tuning;
  }, [tuning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // e2e 훅. 자동 플레이테스트가 상태를 읽고 통로 중앙을 질의한다.
    // (repo 관례 — retro-bowling 의 window.__bowling 과 같은 목적)
    const debug: WaveDebug = {
      get state() {
        return stateRef.current;
      },
      centerAt(worldX: number) {
        const s = stateRef.current;
        if (!s) return 0;
        const { top, bot } = sample(currentStage(s).nodes, worldX);
        return (top + bot) / 2;
      }
    };
    (window as unknown as { __wave?: WaveDebug }).__wave = debug;

    let raf = 0;
    let last = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let sampleAt = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const press = () => {
      const s = stateRef.current;
      if (!s) return;
      s.holding = true;
      if (s.phase === "ready") {
        launch(s);
        cbRef.current.onAttempt(currentStage(s).id);
        sfx.launch();
      } else if (s.phase === "cleared" && s.sincePhase > 0.5) {
        cbRef.current.onExit();
      }
    };
    const release = () => {
      const s = stateRef.current;
      if (s) s.holding = false;
    };

    const isHoldKey = (e: KeyboardEvent) =>
      e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        cbRef.current.onExit();
        return;
      }
      if (isHoldKey(e)) {
        e.preventDefault();
        if (!e.repeat) press();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isHoldKey(e)) {
        e.preventDefault();
        release();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      press();
    };
    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
      release();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("blur", release);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const s = stateRef.current;
      if (!s) return;

      const wasPhase = s.phase;
      const result = update(s, dt);
      if (result.event === "died") sfx.die();
      if (result.event === "restarted") cbRef.current.onAttempt(currentStage(s).id);
      if (wasPhase !== "cleared" && s.phase === "cleared") {
        sfx.clear();
        cbRef.current.onClear(currentStage(s).id, s.elapsed, s.attempts);
      }

      const rect = canvas.getBoundingClientRect();
      render(ctx, s, rect.width, rect.height);

      fpsAccum += dt;
      fpsFrames += 1;
      if (now - sampleAt > 400) {
        sampleAt = now;
        cbRef.current.onSample?.({
          fps: fpsFrames / Math.max(fpsAccum, 1e-6),
          attempts: s.attempts,
          best: s.best
        });
        fpsAccum = 0;
        fpsFrames = 0;
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      delete (window as unknown as { __wave?: WaveDebug }).__wave;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", release);
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Wave Runner" />;
}
