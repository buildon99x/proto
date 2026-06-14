import { useEffect, useMemo, useReducer } from "react";
import { EggStage } from "./EggStage";
import { dragons, eggTypes, resources, upgrades, type ResourceKey } from "./data";
import {
  activeEgg,
  buyOrSelectEgg,
  buyUpgrade,
  canAfford,
  clickPower,
  collectionStats,
  createInitialState,
  eggCost,
  handleEggClick,
  tickProduction,
  upgradeCost
} from "./gameLogic";

type Action =
  | { type: "click" }
  | { type: "tick"; seconds: number }
  | { type: "upgrade"; id: string }
  | { type: "egg"; id: string }
  | { type: "clearNew" };

function reducer(state: ReturnType<typeof createInitialState>, action: Action) {
  switch (action.type) {
    case "click":
      return handleEggClick(state);
    case "tick":
      return tickProduction(state, action.seconds);
    case "upgrade":
      return buyUpgrade(state, action.id);
    case "egg":
      return buyOrSelectEgg(state, action.id);
    case "clearNew":
      return { ...state, newDragonId: undefined };
    default:
      return state;
  }
}

function formatAmount(value: number) {
  if (value >= 1000) return value.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(0);
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function formatCost(cost: Partial<Record<ResourceKey, number>>) {
  const entries = Object.entries(cost) as [ResourceKey, number][];
  if (!entries.length) return "무료";
  return entries.map(([key, value]) => `${resources[key].icon} ${Math.ceil(value)}`).join("  ");
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const egg = activeEgg(state);
  const stats = useMemo(() => collectionStats(state), [state]);
  const progressRatio = state.hatchProgress / egg.hatchNeed;
  const perfectActive = Date.now() < state.perfectReadyUntil;
  const lastFloating = state.floatingTexts[state.floatingTexts.length - 1];

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "tick", seconds: 1 }), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!state.newDragonId) return;
    const id = window.setTimeout(() => dispatch({ type: "clearNew" }), 1800);
    return () => window.clearTimeout(id);
  }, [state.newDragonId]);

  return (
    <main className="game-shell">
      {lastFloating && (
        <span
          hidden
          data-floating-id={lastFloating.id}
          data-text={lastFloating.text}
          data-kind={lastFloating.kind}
        />
      )}

      <section className="hero-panel">
        <div className="title-cluster">
          <p className="eyebrow">Cozy Clicker Prototype</p>
          <h1>알톡! 드래곤 부화장</h1>
        </div>
        <div className="resource-bar" aria-label="자원 현황">
          {(Object.keys(resources) as ResourceKey[]).map((key) => (
            <div className="resource-pill" key={key}>
              <span>{resources[key].icon}</span>
              <strong>{formatAmount(state.resources[key])}</strong>
              <small>{resources[key].label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="play-layout">
        <aside className="panel egg-shop" aria-label="알 선택과 구매">
          <h2>알 선택</h2>
          <div className="egg-list">
            {eggTypes.map((item) => {
              const unlocked = state.unlockedEggIds.includes(item.id);
              const affordable = unlocked || canAfford(state.resources, eggCost(item));
              return (
                <button
                  className={`egg-card ${state.activeEggId === item.id ? "active" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => dispatch({ type: "egg", id: item.id })}
                  disabled={!affordable}
                >
                  <span className="egg-dot" style={{ background: item.accent }} />
                  <strong>{item.name}</strong>
                  <small>{item.subtitle}</small>
                  <em>{unlocked ? "선택 가능" : formatCost(eggCost(item))}</em>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`hatchery ${perfectActive ? "perfect" : ""}`} aria-label="메인 부화 화면">
          <div className="stage-frame">
            <EggStage
              egg={egg}
              progressRatio={progressRatio}
              perfectActive={perfectActive}
              lastFloatingTextId={lastFloating?.id ?? 0}
              lastHatchRarity={state.lastHatch?.rarity}
              onEggClick={() => dispatch({ type: "click" })}
            />
            <button className="click-catcher" type="button" onClick={() => dispatch({ type: "click" })}>
              알 톡톡
            </button>
          </div>
          <div className="progress-panel">
            <div className="progress-copy">
              <strong>{egg.name}</strong>
              <span>{Math.floor(progressRatio * 100)}%</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${Math.min(100, progressRatio * 100)}%` }} />
            </div>
            <div className="stat-row">
              <span>클릭 파워 {clickPower(state)}</span>
              <span>부화 {state.hatchCount}회</span>
              <span>Perfect {state.perfectHits}회</span>
            </div>
          </div>
          {state.lastHatch && (
            <div className={`hatch-toast ${state.lastHatch.rarity.toLowerCase()}`}>
              <strong>{state.lastHatch.name}</strong>
              <span>{state.lastHatch.rarity} · {state.lastHatch.element}</span>
            </div>
          )}
        </section>

        <aside className="panel upgrades" aria-label="업그레이드 패널">
          <h2>업그레이드</h2>
          <div className="upgrade-list">
            {upgrades.map((upgrade) => {
              const level = state.upgradeLevels[upgrade.id] ?? 0;
              const cost = upgradeCost(upgrade.id, level);
              const maxed = level >= upgrade.maxLevel;
              return (
                <button
                  className="upgrade-card"
                  type="button"
                  key={upgrade.id}
                  onClick={() => dispatch({ type: "upgrade", id: upgrade.id })}
                  disabled={maxed || !canAfford(state.resources, cost)}
                >
                  <span>
                    <strong>{upgrade.name}</strong>
                    <small>{upgrade.description}</small>
                  </span>
                  <em>Lv.{level}/{upgrade.maxLevel}</em>
                  <b>{maxed ? "완료" : formatCost(cost)}</b>
                  <i>{upgrade.value(level)}</i>
                </button>
              );
            })}
          </div>
        </aside>
      </section>

      <section className="lower-layout">
        <section className="panel collection" aria-label="드래곤 도감">
          <div className="panel-heading">
            <h2>드래곤 도감</h2>
            <span>{stats.owned}/{stats.total} 등록</span>
          </div>
          <div className="dragon-grid">
            {dragons.map((dragon) => {
              const count = state.collection[dragon.id] ?? 0;
              const owned = count > 0;
              return (
                <article
                  className={`dragon-card ${owned ? "owned" : "locked"} ${dragon.rarity.toLowerCase()} ${
                    state.newDragonId === dragon.id ? "new" : ""
                  }`}
                  key={dragon.id}
                >
                  <div className="dragon-avatar">{owned ? dragon.name.slice(0, 1) : "?"}</div>
                  <div>
                    <strong>{owned ? dragon.name : "미발견 드래곤"}</strong>
                    <span>{dragon.rarity} · {owned ? dragon.element : "??"}</span>
                    <small>{owned ? dragon.quote : "알을 부화해 등록하세요."}</small>
                  </div>
                  {owned && <em>x{count}</em>}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="panel log-panel">
          <h2>부화장 상태</h2>
          <div className="production">
            {(Object.keys(resources) as ResourceKey[]).map((key) => (
              <span key={key}>
                {resources[key].icon} +{formatAmount(stats.production[key])}/초
              </span>
            ))}
          </div>
          <ul>
            {state.eventLog.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
