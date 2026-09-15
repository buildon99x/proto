import { useCallback, useMemo, useRef, useState } from "react";
import { GameScreen } from "./screens/GameScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { TitleScreen } from "./screens/TitleScreen";
import { AiController } from "./game/ai";
import { findDifficulty, type DifficultyId } from "./game/config";
import { Effects } from "./game/effects";
import { Match, type MatchResult } from "./game/engine";
import { hookFromMatch, publishHook } from "./testHook";

type Session = {
  match: Match;
  effects: Effects;
  ai: AiController;
};

function createSession(difficultyId: DifficultyId, humans: number): Session {
  const difficulty = findDifficulty(difficultyId);
  const match = new Match(difficulty, { humans });
  return {
    match,
    effects: new Effects(),
    ai: new AiController(match, difficulty)
  };
}

export default function App() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>("normal");
  const [humans, setHumans] = useState(1);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const sampleRef = useRef(0);

  const difficulty = useMemo(() => findDifficulty(difficultyId), [difficultyId]);

  const start = useCallback(() => {
    setResult(null);
    setSession(createSession(difficultyId, humans));
  }, [difficultyId, humans]);

  const exit = useCallback(() => {
    setSession(null);
    setResult(null);
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
      trailLength: 0,
      x: 0,
      y: 0,
      dir: "right",
      alive: false,
      onOwnLand: false
    });
  }, [difficultyId, humans]);

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
      onStart={start}
    />
  );
}
