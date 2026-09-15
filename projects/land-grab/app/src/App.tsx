import { useCallback, useMemo, useRef, useState } from "react";
import { GameScreen } from "./screens/GameScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { TitleScreen, type TitleMode } from "./screens/TitleScreen";
import { OnlineScreen } from "./screens/OnlineScreen";
import { AiController } from "./game/ai";
import { findDifficulty, type DifficultyId, type GameMode } from "./game/config";
import { Effects } from "./game/effects";
import { Match, type MatchResult } from "./game/engine";
import { hookFromMatch, publishHook } from "./testHook";

type Session = {
  match: Match;
  effects: Effects;
  ai: AiController;
};

const NAME_KEY = "land-grab:name";

/** 온라인은 `Match` 의 모드가 아니다. 로컬 계기판에 적을 때는 큰 맵 쪽으로 친다. */
function localMode(mode: TitleMode): GameMode {
  return mode === "online" ? "world" : mode;
}

function readStoredName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    // 사생활 보호 모드에서는 접근이 막힌다. 이름이 없어도 게임은 된다.
    return "";
  }
}

function storeName(name: string): void {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // 저장하지 못해도 이번 판에는 영향이 없다.
  }
}

function createSession(difficultyId: DifficultyId, humans: number, mode: GameMode): Session {
  const difficulty = findDifficulty(difficultyId);
  const match = new Match(difficulty, { mode, humans });
  return {
    match,
    effects: new Effects(),
    ai: new AiController(match, difficulty)
  };
}

export default function App() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>("normal");
  const [humans, setHumans] = useState(1);
  const [mode, setMode] = useState<TitleMode>("online");
  const [name, setName] = useState(() => readStoredName());
  const [online, setOnline] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const sampleRef = useRef(0);

  const difficulty = useMemo(() => findDifficulty(difficultyId), [difficultyId]);

  const start = useCallback(() => {
    setResult(null);
    if (mode === "online") {
      storeName(name);
      setOnline(true);
      return;
    }
    setSession(createSession(difficultyId, humans, mode));
  }, [difficultyId, humans, mode, name]);

  const exit = useCallback(() => {
    setSession(null);
    setResult(null);
    setOnline(false);
    publishHook({
      phase: "title",
      difficulty: difficultyId,
      tiles: [],
      shares: [],
      scores: [],
      elapsedMs: 0,
      remainingMs: 0,
      lives: 0,
      kills: 0,
      deaths: 0,
      humans,
      mode: localMode(mode),
      boardSize: 0,
      players: 0,
      rank: 0,
      trailLength: 0,
      x: 0,
      y: 0,
      dir: "right",
      alive: false,
      onOwnLand: false
    });
  }, [difficultyId, humans, mode]);

  const sample = useCallback(
    (match: Match) => {
      const now = performance.now();
      if (now - sampleRef.current < 80) {
        return;
      }
      sampleRef.current = now;
      publishHook(hookFromMatch(match, difficultyId));
    },
    [difficultyId]
  );

  if (online) {
    return <OnlineScreen name={name} onExit={exit} />;
  }

  if (session && !result) {
    return (
      <GameScreen
        match={session.match}
        effects={session.effects}
        ai={session.ai}
        difficulty={difficulty}
        onFinished={setResult}
        onRestart={start}
        onExit={exit}
        onSample={sample}
      />
    );
  }

  if (result) {
    return (
      <ResultScreen
        result={result}
        difficulty={difficulty}
        onRestart={start}
        onExit={exit}
      />
    );
  }

  return (
    <TitleScreen
      selected={difficultyId}
      onSelect={setDifficultyId}
      humans={humans}
      onHumansChange={setHumans}
      mode={mode}
      onModeChange={setMode}
      name={name}
      onNameChange={setName}
      onStart={start}
    />
  );
}
