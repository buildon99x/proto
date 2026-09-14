import { useCallback, useEffect, useState } from "react";
import { GameCanvas } from "./GameCanvas";
import { TuningPanel } from "./TuningPanel";
import { BASE_TUNING, STAGES } from "./game/engine";
import { isMuted, setMuted } from "./game/audio";
import { loadProgress, recordAttempt, recordClear } from "./game/storage";
import type { Progress } from "./game/storage";
import type { Tuning } from "./game/types";

type Screen = { kind: "select" } | { kind: "play"; stageIndex: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "select" });
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [tuning, setTuning] = useState<Tuning>(BASE_TUNING);
  const [showTuning, setShowTuning] = useState(false);
  const [fps, setFps] = useState(60);
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyT") setShowTuning((v) => !v);
      if (e.code === "KeyM") {
        setMutedState((v) => {
          setMuted(!v);
          return !v;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleClear = useCallback((stageId: number, sec: number) => {
    setProgress((p) => recordClear(p, stageId, sec));
  }, []);

  const handleAttempt = useCallback((stageId: number) => {
    setProgress((p) => recordAttempt(p, stageId));
  }, []);

  const exitToSelect = useCallback(() => setScreen({ kind: "select" }), []);

  const unlockedCount = STAGES.reduce(
    (acc, stage, i) => (i === 0 || progress.cleared.includes(STAGES[i - 1].id) ? acc + 1 : acc),
    0
  );

  return (
    <main className="app">
      {screen.kind === "select" ? (
        <section className="select">
          <header className="select-head">
            <h1>Wave Runner</h1>
            <p>
              누르면 오르고 놓으면 내려간다. 가만히 있는 선택지는 없다.
              <br />
              <span className="dim">1단계 수직 슬라이스 — 빌드도 게이트도 없이 비행만 묻는다.</span>
            </p>
          </header>

          <ol className="stage-list">
            {STAGES.map((stage, i) => {
              const locked = i >= unlockedCount;
              const cleared = progress.cleared.includes(stage.id);
              const best = progress.bestSec[stage.id];
              const tries = progress.attempts[stage.id] ?? 0;
              return (
                <li key={stage.id}>
                  <button
                    type="button"
                    className={`stage-card${locked ? " locked" : ""}${cleared ? " cleared" : ""}`}
                    disabled={locked}
                    onClick={() => setScreen({ kind: "play", stageIndex: i })}
                  >
                    <span className="stage-no">{String(stage.id).padStart(2, "0")}</span>
                    <span className="stage-body">
                      <strong>{locked ? "잠김" : stage.name}</strong>
                      <small>{locked ? "앞 스테이지를 클리어하면 열린다" : stage.asks}</small>
                    </span>
                    <span className="stage-meta">
                      {cleared ? `${best?.toFixed(2)}초` : ""}
                      {tries > 0 ? <em>{tries}회</em> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <footer className="select-foot">
            <span>스페이스 · 클릭 · 탭 = 상승</span>
            <span>T 튜닝 · M 음소거{muted ? "(꺼짐)" : ""} · Esc 목록</span>
          </footer>
        </section>
      ) : (
        <section className="play">
          <GameCanvas
            stageIndex={screen.stageIndex}
            tuning={tuning}
            onClear={handleClear}
            onAttempt={handleAttempt}
            onExit={exitToSelect}
            onSample={(s) => setFps(s.fps)}
          />
        </section>
      )}

      {showTuning ? (
        <TuningPanel
          tuning={tuning}
          onChange={setTuning}
          onReset={() => setTuning(BASE_TUNING)}
          fps={fps}
        />
      ) : null}
    </main>
  );
}
