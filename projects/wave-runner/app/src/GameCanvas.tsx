import { useEffect, useRef } from "react";
import { applyOverrides, createState, launch, restart, update } from "./game/engine";
import type { GameState, RunConfig } from "./game/engine";
import { render } from "./game/render";
import { sfx } from "./game/audio";
import { flushTelemetry, recordDeath, recordEnd, setTelemetryFps } from "./game/telemetry";
import { targetY } from "./game/pilot";
import type { Build, Phase, Tuning } from "./game/types";

export interface RunReport {
  cleared: boolean;
  sec: number;
  distance: number;
  attempts: number;
  build: Build;
}

interface Props {
  config: RunConfig;
  onPhase: (phase: Phase) => void;
  onAttempt: () => void;
  onRunEnd: (report: RunReport) => void;
  onExit: () => void;
  /**
   * 클리어 화면에서 누른 것. **나가기와 갈라 둔다** — 여기서 누르는 것은 그만두기가
   * 아니라 다음이고, 목적지가 다르다. 한 콜백으로 합쳐 두면 오버레이가 티어 기록표로
   * "다음은 2번" 이라 말해 놓고 홈으로 떨어뜨린다.
   */
  onAdvance: () => void;
  onToggleHud: () => void;
  onSample?: (s: { fps: number; attempts: number }) => void;
  /** 개발 튜닝 패널의 값. 실행 중에도 즉시 반영된다 */
  overrides?: Partial<Tuning>;
  /** 주행 표시를 그릴지 */
  hud: boolean;
  /** 이 런이 겨루는 자기 기록. Stage 는 초, Endless 는 거리. 0 이면 기록 없음 */
  record: number;
}

interface WaveDebug {
  readonly state: GameState | null;
  /** 오토파일럿이 지금 향해야 할 y. 자동 플레이테스트가 쓴다 */
  targetY(lookaheadSec: number, lane: "top" | "bot"): number;
}

export function GameCanvas({
  config,
  onPhase,
  onAttempt,
  onRunEnd,
  onExit,
  onAdvance,
  onToggleHud,
  onSample,
  overrides,
  hud,
  record
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const cbRef = useRef({ onPhase, onAttempt, onRunEnd, onExit, onAdvance, onToggleHud, onSample });
  cbRef.current = { onPhase, onAttempt, onRunEnd, onExit, onAdvance, onToggleHud, onSample };

  useEffect(() => {
    stateRef.current = createState(config);
    cbRef.current.onPhase("ready");
  }, [config]);

  // 표시 설정과 기록은 상태에 밀어 넣는다 — config 에 담으면 값이 바뀔 때마다
  // 런이 통째로 다시 만들어져 주행 중에 리셋된다.
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.hud = hud;
    s.record = record;
  }, [config, hud, record]);

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
    // 엔진은 노드 검증기에서도 도는 순수 모듈이라 오디오를 모른다. 교환 시각의
    // 변화를 여기서 관찰해 소리를 낸다.
    let tradeAt = -1;

    // 프레임마다 getBoundingClientRect() 를 부르면 매 프레임 강제 리플로우가 걸린다.
    // 크기는 resize 에서만 바뀌므로 거기서 캐시한다.
    let cssW = 1;
    let cssH = 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
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
        cbRef.current.onAttempt();
        sfx.launch();
      } else if (s.phase === "cleared" && s.sincePhase > 0.5) {
        cbRef.current.onAdvance();
      } else if (s.phase === "dead" && s.mode === "endless" && s.sincePhase > 0.6) {
        restart(s);
        cbRef.current.onAttempt();
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
      if (e.code === "KeyH") {
        cbRef.current.onToggleHud();
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
    /**
     * 세로 모바일에서 두 엄지로 번갈아 누르는 건 홀드 게임의 자연스러운 조작인데,
     * `pointerup` 하나만 와도 홀드가 풀려 손가락을 바꾸는 순간 낙하했다. 활성 포인터를
     * 세서 **하나라도 닿아 있으면** 홀드로 친다.
     */
    const down = new Set<number>();
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      down.add(e.pointerId);
      press();
    };
    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
      down.delete(e.pointerId);
      if (down.size === 0) release();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    const onBlur = () => {
      down.clear();
      release();
    };
    window.addEventListener("blur", onBlur);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const s = stateRef.current;
      if (!s) return;

      const result = update(s, dt);
      if (result.event === "died") {
        sfx.die();
        // Stage 사망은 셸로 올라오지 않는다(0.5초 뒤 스스로 재시작한다). 기록은
        // 두 모드 모두 남겨야 한다 — 티어별 난이도는 Stage 사망에서만 읽힌다.
        recordDeath(s);
        if (s.mode === "endless") {
          cbRef.current.onRunEnd({
            cleared: false,
            sec: s.elapsed,
            distance: s.x,
            attempts: s.attempts,
            build: { ...s.build }
          });
        }
      }
      if (result.event === "restarted") cbRef.current.onAttempt();
      if (result.event === "cleared") {
        sfx.clear();
        recordEnd(s, "clear");
        cbRef.current.onRunEnd({
          cleared: true,
          sec: s.elapsed,
          distance: s.x,
          attempts: s.attempts,
          build: { ...s.build }
        });
      }
      if (s.lastTrade && s.lastTrade.at !== tradeAt) {
        tradeAt = s.lastTrade.at;
        sfx.trade(s.lastTrade.trade.plus);
      }
      if (s.phase !== reported) {
        reported = s.phase;
        cbRef.current.onPhase(s.phase);
      }

      render(ctx, s, cssW, cssH);

      fpsAccum += dt;
      fpsFrames += 1;
      if (now - sampleAt > 400) {
        sampleAt = now;
        const fps = fpsFrames / Math.max(fpsAccum, 1e-6);
        setTelemetryFps(fps);
        cbRef.current.onSample?.({ fps, attempts: s.attempts });
        fpsAccum = 0;
        fpsFrames = 0;
      }
    };
    raf = requestAnimationFrame(frame);

    /**
     * 주행 도중에 사라지는 것. 나가기(언마운트)와 탭 종료 둘 다 여기로 온다.
     *
     * `running` 일 때만 남긴다 — `dead` 는 이미 사망 이벤트를 냈고, `cleared` 는
     * 클리어를 냈다. 거기서 또 남기면 한 주행이 두 번 집계된다.
     *
     * 자기 배치를 스스로 비우는 것이 중요하다. telemetry 모듈도 `pagehide` 를 듣지만
     * 먼저 등록되어 있어 이 이벤트보다 앞서 돌기 때문이다.
     */
    const bail = () => {
      const s = stateRef.current;
      if (s && s.phase === "running") recordEnd(s, "abort");
      flushTelemetry(true);
    };
    window.addEventListener("pagehide", bail);

    return () => {
      delete (window as unknown as { __wave?: WaveDebug }).__wave;
      cancelAnimationFrame(raf);
      window.removeEventListener("pagehide", bail);
      bail();
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Wave Runner" />;
}
