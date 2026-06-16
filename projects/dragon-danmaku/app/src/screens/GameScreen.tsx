// 인게임 화면 — 캔버스 + HUD 오버레이 + 모바일 컨트롤 + 일시정지/컨티뉴/배너.

import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type GameCanvasHandle } from "../game/GameCanvas";
import type { HudSnapshot, RunConfig, RunResult } from "../types";

interface GameScreenProps {
  config: RunConfig;
  onFinish: (result: RunResult, bossName: string) => void;
}

const EMPTY_HUD: HudSnapshot = {
  score: 0,
  best: 0,
  chain: 0,
  chainGrade: "—",
  chainMul: 1,
  lives: 0,
  bombs: 0,
  awakenGauge: 0,
  awakening: false,
  power: 1,
  stageName: "",
  stageNo: 1,
  bossHp: 0,
  bossName: "",
  hiddenScales: 0
};

export function GameScreen({ config, onFinish }: GameScreenProps) {
  const handleRef = useRef<GameCanvasHandle | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [paused, setPaused] = useState(false);
  const [continuePrompt, setContinuePrompt] = useState(false);
  const [countdown, setCountdown] = useState(9);
  const [banner, setBanner] = useState<string>("");
  const bannerTimer = useRef<number | null>(null);

  const showBanner = useCallback((text: string) => {
    setBanner(text);
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(""), 2000);
  }, []);

  // 일시정지 동기화.
  useEffect(() => {
    handleRef.current?.setPaused(paused);
  }, [paused]);

  // Esc 일시정지 토글.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        if (!continuePrompt) setPaused((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [continuePrompt]);

  // 컨티뉴 카운트다운.
  useEffect(() => {
    if (!continuePrompt) return;
    setCountdown(9);
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          handleRef.current?.declineContinue();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [continuePrompt]);

  const doContinue = () => {
    setContinuePrompt(false);
    handleRef.current?.doContinue();
  };
  const declineContinue = () => {
    setContinuePrompt(false);
    handleRef.current?.declineContinue();
  };

  return (
    <div className="game-screen">
      <div className="game-stage">
        <GameCanvas
          config={config}
          onHud={setHud}
          onContinuePrompt={() => setContinuePrompt(true)}
          onStageBanner={showBanner}
          onFinish={onFinish}
          bindHandle={(h) => (handleRef.current = h)}
        />

        {/* HUD 오버레이 — 가장자리 배치(중앙 플레이존 비가림). */}
        <div className="hud" aria-hidden={false}>
          <div className="hud-top">
            <div className="hud-block">
              <span className="hud-label">SCORE</span>
              <span className="hud-score">{hud.score.toLocaleString()}</span>
            </div>
            <div className="hud-block hud-right">
              <span className="hud-label">STAGE {hud.stageNo}</span>
              <span className="hud-stage">{hud.stageName}</span>
            </div>
          </div>

          <div className="hud-chain" data-grade={hud.chainGrade}>
            <span className="chain-grade">{hud.chainGrade}</span>
            <span className="chain-count">연환 {hud.chain}</span>
            <span className="chain-mul">×{hud.chainMul.toFixed(1)}</span>
          </div>

          {hud.bossHp > 0 && (
            <div className="boss-bar">
              <span className="boss-name">{hud.bossName}</span>
              <div className="boss-track">
                <div className="boss-fill" style={{ width: `${Math.round(hud.bossHp * 100)}%` }} />
              </div>
            </div>
          )}

          <div className="hud-bottom">
            <span className="hud-pill">잔기 {"♦".repeat(Math.max(0, hud.lives))}</span>
            <span className="hud-pill">봄 {"✦".repeat(Math.max(0, hud.bombs))}</span>
            <span className="hud-pill">POWER {hud.power}</span>
            <span className="hud-pill">비늘 {hud.hiddenScales}</span>
            <div className={`awaken-meter ${hud.awakening ? "on" : ""}`}>
              <div className="awaken-fill" style={{ width: `${Math.round(hud.awakenGauge * 100)}%` }} />
              <span>{hud.awakening ? "광룡화!" : hud.awakenGauge >= 1 ? "각성 READY" : "각성"}</span>
            </div>
          </div>
        </div>

        {banner && <div className="stage-banner">{banner}</div>}

        {/* 모바일/마우스 컨트롤. */}
        <div className="touch-controls">
          <button
            className="tc-btn laser"
            onPointerDown={() => handleRef.current?.setLaserBtn(true)}
            onPointerUp={() => handleRef.current?.setLaserBtn(false)}
            onPointerLeave={() => handleRef.current?.setLaserBtn(false)}
          >
            빔
          </button>
          <button className="tc-btn bomb" onPointerDown={() => handleRef.current?.pressBomb()}>
            포효
          </button>
          <button className="tc-btn awaken" onPointerDown={() => handleRef.current?.pressAwaken()}>
            각성
          </button>
        </div>

        <button className="pause-btn" onClick={() => setPaused(true)} aria-label="일시정지">
          ⏸
        </button>

        {paused && (
          <div className="overlay">
            <div className="panel">
              <h2>일시정지</h2>
              <p className="muted">이동 방향키·WASD / 빔 Shift·C / 포효 X / 각성 Space</p>
              <div className="panel-actions">
                <button className="btn primary" onClick={() => setPaused(false)}>
                  계속하기
                </button>
                <button
                  className="btn danger"
                  onClick={() => {
                    setPaused(false);
                    handleRef.current?.giveUp();
                  }}
                >
                  포기하고 리절트로
                </button>
              </div>
            </div>
          </div>
        )}

        {continuePrompt && (
          <div className="overlay">
            <div className="panel">
              <h2>잔기 소진 — 컨티뉴?</h2>
              <p className="countdown">{countdown}</p>
              <p className="muted">컨티뉴 시 점수 일부가 차감되고 노컨티뉴 자격을 잃습니다.</p>
              <div className="panel-actions">
                <button className="btn primary" onClick={doContinue}>
                  컨티뉴 (용혼 소생)
                </button>
                <button className="btn danger" onClick={declineContinue}>
                  포기 (게임오버)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
