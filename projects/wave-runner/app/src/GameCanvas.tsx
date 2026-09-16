import { useEffect, useRef } from "react";
import { applyOverrides, createState, launch, restart, update } from "./game/engine";
import type { GameState, RunConfig } from "./game/engine";
import { render } from "./game/render";
import { sfx } from "./game/audio";
import { targetY } from "./game/pilot";
import type { Build, Phase, Tuning } from "./game/types";

export interface RunReport {
  cleared: boolean;
  sec: number;
  distance: number;
  attempts: number;
  build: Build;
  /** 섹터 경계 도착 시각. 최고 기록을 갱신했을 때만 메타에 실린다 */
  splits: number[];
}

interface Props {
  config: RunConfig;
  onPhase: (phase: Phase) => void;
  /**
   * 시도가 시작될 때. `progress` 는 이 세션에서 도달한 최고 진행률(Stage 0..1)이고
   * 기록 이정표가 읽는다 — 이미 시도마다 저장하고 있으므로 **추가 쓰기가 0** 이다.
   */
  onAttempt: (progress: number) => void;
  onRunEnd: (report: RunReport) => void;
  onExit: () => void;
  onSample?: (s: { fps: number; attempts: number }) => void;
  /** 개발 튜닝 패널의 값. 실행 중에도 즉시 반영된다 */
  overrides?: Partial<Tuning>;
}

interface WaveDebug {
  readonly state: GameState | null;
  /** 오토파일럿이 지금 향해야 할 y. 자동 플레이테스트가 쓴다 */
  targetY(lookaheadSec: number, lane: "top" | "bot"): number;
}

export function GameCanvas({ config, onPhase, onAttempt, onRunEnd, onExit, onSample, overrides }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const cbRef = useRef({ onPhase, onAttempt, onRunEnd, onExit, onSample });
  cbRef.current = { onPhase, onAttempt, onRunEnd, onExit, onSample };

  useEffect(() => {
    stateRef.current = createState(config);
    cbRef.current.onPhase("ready");
  }, [config]);

  // 개발 패널은 문서가 아니라 손끝으로 축을 비교하기 위한 계측기다 — 실행 중 즉시 반영한다.
  useEffect(() => {
    if (stateRef.current && overrides) applyOverrides(stateRef.current, overrides);
  }, [overrides]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const debug: WaveDebug = {
      get state() {
        return stateRef.current;
      },
      targetY(lookaheadSec: number, lane: "top" | "bot") {
        const s = stateRef.current;
        return s ? targetY(s, lookaheadSec, lane) : 50;
      }
    };
    (window as unknown as { __wave?: WaveDebug }).__wave = debug;

    let raf = 0;
    let last = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let sampleAt = 0;
    let reported: Phase = "ready";

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
        cbRef.current.onAttempt(s.best);
        sfx.launch();
      } else if (s.phase === "cleared" && s.sincePhase > 0.5) {
        cbRef.current.onExit();
      } else if (s.phase === "dead" && s.mode === "endless" && s.sincePhase > 0.6) {
        restart(s);
        cbRef.current.onAttempt(s.best);
      }
    };
    const release = () => {
      const s = stateRef.current;
      if (s) s.holding = false;
    };

    const isHoldKey = (e: KeyboardEvent) => e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp";

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

      const result = update(s, dt);
      if (result.event === "died") {
        sfx.die();
        if (s.mode === "endless") {
          cbRef.current.onRunEnd({
            cleared: false,
            sec: s.elapsed,
            distance: s.x,
            attempts: s.attempts,
            build: { ...s.build },
            splits: [...s.splits]
          });
        }
      }
      if (result.event === "restarted") cbRef.current.onAttempt(s.best);
      if (result.event === "cleared") {
        sfx.clear();
        cbRef.current.onRunEnd({
          cleared: true,
          sec: s.elapsed,
          distance: s.x,
          attempts: s.attempts,
          build: { ...s.build },
          splits: [...s.splits]
        });
      }
      if (s.phase !== reported) {
        reported = s.phase;
        cbRef.current.onPhase(s.phase);
      }

      const rect = canvas.getBoundingClientRect();
      render(ctx, s, rect.width, rect.height);

      fpsAccum += dt;
      fpsFrames += 1;
      if (now - sampleAt > 400) {
        sampleAt = now;
        cbRef.current.onSample?.({ fps: fpsFrames / Math.max(fpsAccum, 1e-6), attempts: s.attempts });
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
