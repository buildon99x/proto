import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";
import { createForgeGame, ForgeScene } from "./ForgeScene";
import {
  GameState,
  MaterialKey,
  UpgradeKey,
  applyProgress,
  buyUpgrade,
  createInitialState,
  enhanceCost,
  enhanceWeapon,
  materialLabels,
  salvageWeapon,
  sellWeapon,
  storeWeapon,
  upgradeCost,
  weaponLabel
} from "./gameLogic";

const materialOrder: MaterialKey[] = ["iron", "coal", "crystal", "essence"];
const upgradeOrder: UpgradeKey[] = ["hammer", "workbench", "furnace", "staff", "merchant", "salvage", "enhance"];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ForgeScene | null>(null);
  const forgeRef = useRef<HTMLDivElement | null>(null);
  const pendingGrade = gameState.pendingWeapon?.grade;

  const progressRatio = Math.min(100, Math.round((gameState.progress / gameState.target) * 100));
  const totalCollectionScore = useMemo(
    () => gameState.storedWeapons.reduce((sum, weapon) => sum + weapon.collectionScore, 0),
    [gameState.storedWeapons]
  );

  useEffect(() => {
    const parent = forgeRef.current;
    if (!parent || gameRef.current) return;

    const phaserGame = createForgeGame(parent, {
      onForgeClick: () => {
        sceneRef.current?.playStrike();
        setGameState((current) => applyProgress(current, current.clickPower));
      }
    });

    gameRef.current = phaserGame;
    sceneRef.current = phaserGame.scene.getScene("ForgeScene") as ForgeScene;

    return () => {
      phaserGame.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGameState((current) => applyProgress(current, current.autoPower / 5));
    }, 200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    sceneRef.current?.setProgress(gameState.progress, gameState.target);
  }, [gameState.progress, gameState.target]);

  useEffect(() => {
    if (!pendingGrade) return;
    sceneRef.current?.playComplete(pendingGrade === "Epic" || pendingGrade === "Legendary");
  }, [pendingGrade, gameState.pendingWeapon?.id]);

  return (
    <main className="game-shell">
      <aside className="resource-panel">
        <div>
          <p className="eyebrow">대장간 자원</p>
          <h1>대장장이 클릭커</h1>
        </div>
        <div className="gold-box">
          <span>골드</span>
          <strong>{gameState.gold.toLocaleString()}</strong>
        </div>
        <div className="material-grid">
          {materialOrder.map((key) => (
            <div className="material" key={key}>
              <span>{materialLabels[key]}</span>
              <strong>{gameState.materials[key]}</strong>
            </div>
          ))}
        </div>
        <section className="collection-panel" aria-label="무기 보관함과 도감">
          <div className="panel-title">
            <span>무기 보관함</span>
            <strong>{gameState.storedWeapons.length}/24</strong>
          </div>
          <p>도감 가치 {totalCollectionScore.toLocaleString()}</p>
          <div className="stored-list">
            {gameState.storedWeapons.length === 0 ? (
              <span className="empty-state">완성 무기를 보관해 도감을 채우세요.</span>
            ) : (
              gameState.storedWeapons.slice(0, 7).map((weapon) => (
                <div className={`stored-item grade-${weapon.grade.toLowerCase()}`} key={weapon.id}>
                  <span>{weaponLabel(weapon)}</span>
                  <strong>{weapon.collectionScore}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className="forge-stage" aria-label="메인 제작 화면">
        <div className="forge-canvas" ref={forgeRef} />
        <div className="progress-card">
          <div className="progress-head">
            <span>제작 게이지</span>
            <strong>{progressRatio}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressRatio}%` }} />
          </div>
          <div className="stat-row">
            <span>클릭 +{gameState.clickPower.toFixed(1)}</span>
            <span>자동 +{gameState.autoPower.toFixed(1)}/초</span>
            <span>목표 {gameState.target}</span>
          </div>
        </div>
        <div className="feedback-line">{gameState.lastFeedback}</div>
        <div className="recent-log">
          <div className="panel-title">
            <span>최근 완성 무기</span>
            <strong>{gameState.craftedCount}</strong>
          </div>
          <div className="log-list">
            {gameState.recentWeapons.length === 0 ? (
              <span className="empty-state">첫 제작을 기다리는 중</span>
            ) : (
              gameState.recentWeapons.map((weapon) => (
                <span className={`log-chip grade-${weapon.grade.toLowerCase()}`} key={weapon.id}>
                  {weaponLabel(weapon)}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <aside className="upgrade-panel">
        <div className="panel-title">
          <span>대장간 업그레이드</span>
          <strong>성장</strong>
        </div>
        <div className="upgrade-list">
          {upgradeOrder.map((key) => {
            const upgrade = gameState.upgrades[key];
            const cost = upgradeCost(upgrade);
            return (
              <button
                className="upgrade-button"
                disabled={gameState.gold < cost}
                key={key}
                type="button"
                onClick={() => setGameState((current) => buyUpgrade(current, key))}
              >
                <span>
                  <strong>{upgrade.name}</strong>
                  <small>{upgrade.description}</small>
                </span>
                <span className="upgrade-cost">
                  Lv.{upgrade.level}
                  <b>{cost}G</b>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {gameState.pendingWeapon ? (
        <div className="result-backdrop" role="dialog" aria-modal="true" aria-label="무기 완성 결과">
          <div className={`result-modal grade-${gameState.pendingWeapon.grade.toLowerCase()}`}>
            <p className="eyebrow">무기 완성</p>
            <h2>{weaponLabel(gameState.pendingWeapon)}</h2>
            <div className="weapon-stats">
              <span>판매가 {gameState.pendingWeapon.value.toLocaleString()}G</span>
              <span>도감 가치 {gameState.pendingWeapon.collectionScore.toLocaleString()}</span>
              <span>강화 단계 +{gameState.pendingWeapon.enhanceLevel}</span>
            </div>
            <div className="result-actions">
              <button type="button" onClick={() => setGameState((current) => sellWeapon(current, gameState.pendingWeapon!))}>
                판매
              </button>
              <button
                type="button"
                onClick={() => setGameState((current) => salvageWeapon(current, gameState.pendingWeapon!))}
              >
                분해
              </button>
              <button
                type="button"
                onClick={() => setGameState((current) => enhanceWeapon(current, gameState.pendingWeapon!))}
              >
                강화
                <small>
                  {enhanceCost(gameState, gameState.pendingWeapon).gold}G / 철{" "}
                  {enhanceCost(gameState, gameState.pendingWeapon).iron}
                </small>
              </button>
              <button type="button" onClick={() => setGameState((current) => storeWeapon(current, gameState.pendingWeapon!))}>
                보관
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
