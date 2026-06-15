// Phaser 게임을 React에 마운트하고 HUD/이벤트를 브리지한다.
// 'game' 화면에서만 렌더되어 런마다 깨끗한 게임 인스턴스를 생성/파괴한다.

import Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { HudSnapshot, RunConfig, RunResult } from "../types";
import { DanmakuScene, GAME_H, GAME_W, type SceneHooks } from "./DanmakuScene";

export interface GameCanvasHandle {
  setPaused: (p: boolean) => void;
  setLaserBtn: (on: boolean) => void;
  pressBomb: () => void;
  pressAwaken: () => void;
  doContinue: () => void;
  declineContinue: () => void;
  giveUp: () => void;
}

interface GameCanvasProps {
  config: RunConfig;
  onHud: (snap: HudSnapshot) => void;
  onContinuePrompt: () => void;
  onStageBanner: (text: string) => void;
  onFinish: (result: RunResult, bossName: string) => void;
  bindHandle: (handle: GameCanvasHandle | null) => void;
}

export function GameCanvas({
  config,
  onHud,
  onContinuePrompt,
  onStageBanner,
  onFinish,
  bindHandle
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // 콜백을 ref로 고정해 effect 재실행 없이 최신값 사용.
  const cb = useRef({ onHud, onContinuePrompt, onStageBanner, onFinish, bindHandle });
  cb.current = { onHud, onContinuePrompt, onStageBanner, onFinish, bindHandle };
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const scene = new DanmakuScene();
    scene.config = configRef.current;
    const hooks: SceneHooks = {
      onHud: (s) => cb.current.onHud(s),
      onContinuePrompt: () => cb.current.onContinuePrompt(),
      onStageBanner: (t) => cb.current.onStageBanner(t),
      onFinish: (r, boss) => cb.current.onFinish(r, boss)
    };
    scene.hooks = hooks;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: "#0a0612",
      scene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      render: { antialias: true, powerPreference: "high-performance" }
    });
    gameRef.current = game;

    const handle: GameCanvasHandle = {
      setPaused: (p) => scene.setPaused(p),
      setLaserBtn: (on) => scene.setLaserBtn(on),
      pressBomb: () => scene.pressBomb(),
      pressAwaken: () => scene.pressAwaken(),
      doContinue: () => scene.doContinue(),
      declineContinue: () => scene.declineContinue(),
      giveUp: () => scene.giveUp()
    };
    cb.current.bindHandle(handle);

    return () => {
      cb.current.bindHandle(null);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div className="game-canvas" ref={hostRef} aria-label="게임 캔버스" />;
}
