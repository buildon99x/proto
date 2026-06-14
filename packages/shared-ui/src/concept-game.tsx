import { useMemo, useState } from "react";

export type GameTrack = {
  key: string;
  label: string;
  value: number;
  max: number;
  dangerBelow?: number;
};

export type GameResource = {
  key: string;
  label: string;
  value: number;
};

export type GameZone = {
  key: string;
  name: string;
  description: string;
  effect: string;
};

export type GameCard = {
  key: string;
  name: string;
  cost: number;
  verb: string;
  text: string;
  effects: Record<string, number>;
  resourceEffects?: Record<string, number>;
};

export type ConceptGameConfig = {
  title: string;
  subtitle: string;
  concept: string;
  coreVerb: string;
  sessionGoal: string;
  winLabel: string;
  loseLabel: string;
  themeClass: string;
  tracks: GameTrack[];
  resources: GameResource[];
  zones: GameZone[];
  deck: GameCard[];
  encounters: string[];
  victory: Record<string, number>;
  failure: Record<string, number>;
};

type LogEntry = {
  id: number;
  text: string;
};

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function applyDelta(value: number, delta: number, max: number) {
  return clamp(value + delta, max);
}

function isMet(
  values: Record<string, number>,
  thresholds: Record<string, number>,
  comparator: "gte" | "lte"
) {
  return Object.entries(thresholds).every(([key, target]) =>
    comparator === "gte" ? values[key] >= target : values[key] <= target
  );
}

export function ConceptGame({ config }: { config: ConceptGameConfig }) {
  const [turn, setTurn] = useState(1);
  const [energy, setEnergy] = useState(3);
  const [selectedZone, setSelectedZone] = useState(config.zones[0].key);
  const [tracks, setTracks] = useState(() =>
    Object.fromEntries(config.tracks.map((track) => [track.key, track.value]))
  );
  const [resources, setResources] = useState(() =>
    Object.fromEntries(config.resources.map((resource) => [resource.key, resource.value]))
  );
  const [handOffset, setHandOffset] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, text: `${config.coreVerb} loop started. ${config.sessionGoal}` }
  ]);

  const selectedZoneData = config.zones.find((zone) => zone.key === selectedZone) ?? config.zones[0];
  const hand = useMemo(
    () => Array.from({ length: 4 }, (_, index) => config.deck[(handOffset + index) % config.deck.length]),
    [config.deck, handOffset]
  );

  const status = useMemo(() => {
    if (isMet(tracks, config.victory, "gte")) return "won";
    if (isMet(tracks, config.failure, "lte")) return "lost";
    return "playing";
  }, [config.failure, config.victory, tracks]);

  function addLog(text: string) {
    setLogs((current) => [{ id: Date.now() + Math.random(), text }, ...current].slice(0, 8));
  }

  function playCard(card: GameCard) {
    if (status !== "playing") return;
    if (energy < card.cost) {
      addLog(`${card.name}: not enough energy.`);
      return;
    }

    setEnergy((value) => value - card.cost);
    setTracks((current) => {
      const next = { ...current };
      for (const [key, delta] of Object.entries(card.effects)) {
        const def = config.tracks.find((track) => track.key === key);
        if (def) next[key] = applyDelta(next[key], delta, def.max);
      }
      return next;
    });
    setResources((current) => {
      const next = { ...current };
      for (const [key, delta] of Object.entries(card.resourceEffects ?? {})) {
        next[key] = Math.max(0, (next[key] ?? 0) + delta);
      }
      return next;
    });
    addLog(`${selectedZoneData.name}: ${card.verb}. ${card.text}`);
  }

  function endTurn() {
    if (status !== "playing") return;
    const encounter = config.encounters[(turn - 1) % config.encounters.length];
    setTurn((value) => value + 1);
    setEnergy(3);
    setHandOffset((value) => (value + 2) % config.deck.length);
    setTracks((current) => {
      const next = { ...current };
      for (const track of config.tracks) {
        const drift = track.dangerBelow ? -3 : 1;
        next[track.key] = applyDelta(next[track.key], drift, track.max);
      }
      return next;
    });
    addLog(`Turn pressure: ${encounter}`);
  }

  function resetRun() {
    setTurn(1);
    setEnergy(3);
    setSelectedZone(config.zones[0].key);
    setTracks(Object.fromEntries(config.tracks.map((track) => [track.key, track.value])));
    setResources(Object.fromEntries(config.resources.map((resource) => [resource.key, resource.value])));
    setHandOffset(0);
    setLogs([{ id: Date.now(), text: `${config.title} new run.` }]);
  }

  return (
    <main className={`concept-game ${config.themeClass}`}>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Prototype Lab playable concept</p>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className={`status-pill status-${status}`}>
          {status === "won" ? config.winLabel : status === "lost" ? config.loseLabel : `Turn ${turn}`}
        </div>
      </section>

      <section className="play-layout">
        <aside className="side-panel">
          <h2>Run State</h2>
          <div className="track-list">
            {config.tracks.map((track) => {
              const value = tracks[track.key];
              const percent = (value / track.max) * 100;
              const danger = track.dangerBelow !== undefined && value <= track.dangerBelow;
              return (
                <div className="track" key={track.key}>
                  <div>
                    <span>{track.label}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="track-bar">
                    <span className={danger ? "danger" : ""} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="resource-grid">
            {config.resources.map((resource) => (
              <div key={resource.key}>
                <span>{resource.label}</span>
                <strong>{resources[resource.key]}</strong>
              </div>
            ))}
          </div>
          <button className="secondary-action" type="button" onClick={resetRun}>
            New Run
          </button>
        </aside>

        <section className="board-panel">
          <div className="board-header">
            <div>
              <h2>{config.coreVerb}</h2>
              <p>{config.concept}</p>
            </div>
            <strong>{energy} Energy</strong>
          </div>

          <div className="zone-grid">
            {config.zones.map((zone) => (
              <button
                className={zone.key === selectedZone ? "zone selected" : "zone"}
                type="button"
                key={zone.key}
                onClick={() => {
                  setSelectedZone(zone.key);
                  addLog(`${zone.name} selected: ${zone.effect}`);
                }}
              >
                <strong>{zone.name}</strong>
                <span>{zone.description}</span>
              </button>
            ))}
          </div>

          <div className="scene-card">
            <div className="scene-orbit">
              <span />
              <span />
              <span />
            </div>
            <div>
              <h3>{selectedZoneData.name}</h3>
              <p>{selectedZoneData.effect}</p>
            </div>
          </div>
        </section>

        <aside className="side-panel">
          <h2>Action Hand</h2>
          <div className="hand-list">
            {hand.map((card) => (
              <button
                className="action-card"
                type="button"
                key={`${card.key}-${turn}`}
                onClick={() => playCard(card)}
                disabled={energy < card.cost || status !== "playing"}
              >
                <span>{card.cost}</span>
                <strong>{card.name}</strong>
                <em>{card.text}</em>
              </button>
            ))}
          </div>
          <button className="primary-action" type="button" onClick={endTurn} disabled={status !== "playing"}>
            End Turn
          </button>
        </aside>
      </section>

      <section className="log-panel">
        <h2>Run Log</h2>
        {logs.map((log) => (
          <p key={log.id}>{log.text}</p>
        ))}
      </section>
    </main>
  );
}
