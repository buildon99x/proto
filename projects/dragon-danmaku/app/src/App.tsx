// 앱 루트 — 화면 라우팅(ux-flow.md) + 메타 상태(localStorage) 관리.

import { useCallback, useState } from "react";
import { GameScreen } from "./screens/GameScreen";
import { Hub, PracticeSelect } from "./screens/Hub";
import { DifficultySelect, DragonSelect, OptionsScreen, ResultScreen, TitleScreen } from "./screens/Menus";
import { applyResult, buildRunConfig, buyDragon, buyUpgrade, loadMeta, saveMeta } from "./meta";
import { STAGES } from "./data";
import type { DragonUpgrades, MetaState, RunConfig, RunResult } from "./types";

type Screen =
  | "title"
  | "dragon"
  | "difficulty"
  | "game"
  | "result"
  | "hub"
  | "practiceSelect"
  | "options";

export default function App() {
  const [meta, setMetaState] = useState<MetaState>(() => loadMeta());
  const [screen, setScreen] = useState<Screen>("title");
  const [dragonId, setDragonId] = useState("ignis");
  const [difficultyId, setDifficultyId] = useState("novice");
  const [runConfig, setRunConfig] = useState<RunConfig | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  // 연습 스테이지(드래곤/난이도 거쳐 시작). null = 일반 캠페인.
  const [pendingPractice, setPendingPractice] = useState<number | null>(null);

  const persist = useCallback((next: MetaState) => {
    setMetaState(next);
    saveMeta(next);
  }, []);

  const startRun = useCallback(() => {
    const practiceStage = pendingPractice ?? undefined;
    const config = buildRunConfig(meta, dragonId, difficultyId, practiceStage);
    setRunConfig(config);
    setScreen("game");
  }, [meta, dragonId, difficultyId, pendingPractice]);

  const handleFinish = useCallback(
    (r: RunResult, bossName: string) => {
      const newBest = r.score > meta.bestScore;
      const finalResult: RunResult = { ...r, newBest };
      setResult(finalResult);
      if (pendingPractice !== null) {
        // 연습: 클리어/해금 영향 없이 용비늘만 절반 적립.
        persist({ ...meta, scales: meta.scales + Math.floor(r.earnedScales / 2) });
      } else {
        persist(applyResult(meta, finalResult, bossName, difficultyId));
      }
      setScreen("result");
    },
    [meta, persist, pendingPractice, difficultyId]
  );

  const beginCampaign = () => {
    setPendingPractice(null);
    setScreen("dragon");
  };

  let body: React.ReactNode = null;
  switch (screen) {
    case "title":
      body = (
        <TitleScreen
          meta={meta}
          onStart={beginCampaign}
          onPractice={() => setScreen("practiceSelect")}
          onHub={() => setScreen("hub")}
          onOptions={() => setScreen("options")}
        />
      );
      break;
    case "dragon":
      body = (
        <DragonSelect
          meta={meta}
          selectedId={dragonId}
          onSelect={setDragonId}
          onConfirm={() => setScreen("difficulty")}
          onBack={() => setScreen(pendingPractice !== null ? "practiceSelect" : "title")}
        />
      );
      break;
    case "difficulty":
      body = (
        <DifficultySelect
          meta={meta}
          selectedId={difficultyId}
          onSelect={setDifficultyId}
          onConfirm={startRun}
          onBack={() => setScreen("dragon")}
        />
      );
      break;
    case "game":
      body = runConfig ? <GameScreen config={runConfig} onFinish={handleFinish} /> : null;
      break;
    case "result":
      body = result ? (
        <ResultScreen
          result={result}
          onHub={() => setScreen("hub")}
          onRetry={() => {
            setPendingPractice(null);
            setScreen("dragon");
          }}
          onTitle={() => setScreen("title")}
        />
      ) : null;
      break;
    case "hub":
      body = (
        <Hub
          meta={meta}
          onBuyDragon={(id) => persist(buyDragon(meta, id))}
          onBuyUpgrade={(dId, uId: keyof DragonUpgrades) => persist(buyUpgrade(meta, dId, uId))}
          onPractice={() => setScreen("practiceSelect")}
          onBack={() => setScreen("title")}
        />
      );
      break;
    case "practiceSelect":
      body = (
        <PracticeSelect
          meta={meta}
          onPick={(stage) => {
            setPendingPractice(stage);
            setScreen("dragon");
          }}
          onBack={() => setScreen("title")}
        />
      );
      break;
    case "options":
      body = <OptionsScreen onBack={() => setScreen("title")} />;
      break;
  }

  return (
    <main className="app-shell">
      <div className="app-frame">{body}</div>
      <footer className="app-credit">
        용린난무 龍鱗亂舞 · 도돈파치 계보 연환 탄막 슈팅 · STAGE {STAGES.length} + 심연
      </footer>
    </main>
  );
}
