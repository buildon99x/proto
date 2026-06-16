// 용소(龍巢) 허브 — 용비늘 소비: 드래곤 해금 / 영구 업글 / 난이도 현황 / 보스 도감 / 연습.

import { useState } from "react";
import { DIFFICULTIES, DRAGONS, STAGES, UPGRADES } from "../data";
import {
  dragonUnlockable,
  isDifficultyUnlocked,
  isDragonUnlocked,
  upgradeCost
} from "../meta";
import type { DragonUpgrades, MetaState } from "../types";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export function Hub(props: {
  meta: MetaState;
  onBuyDragon: (id: string) => void;
  onBuyUpgrade: (dragonId: string, upgradeId: keyof DragonUpgrades) => void;
  onPractice: () => void;
  onBack: () => void;
}) {
  const { meta } = props;
  const [upDragon, setUpDragon] = useState("ignis");

  return (
    <div className="menu hub">
      <header className="menu-head">
        <button className="btn ghost" onClick={props.onBack}>
          ← 타이틀
        </button>
        <h2>용소 龍巢</h2>
        <span className="scales-badge">용비늘 {meta.scales.toLocaleString()}</span>
      </header>

      <section className="hub-section">
        <h3>드래곤 해금</h3>
        <div className="hub-cards">
          {DRAGONS.map((d) => {
            const unlocked = isDragonUnlocked(meta, d.id);
            const can = dragonUnlockable(meta, d.id);
            return (
              <div key={d.id} className={`hub-card ${unlocked ? "owned" : ""}`}>
                <span className="dragon-emblem sm" style={{ background: hex(d.color) }} />
                <div className="hub-card-body">
                  <strong>{d.name}</strong>
                  <small>{d.title}</small>
                </div>
                {unlocked ? (
                  <span className="owned-tag">보유</span>
                ) : (
                  <button
                    className="btn small"
                    disabled={!can.ok}
                    onClick={() => props.onBuyDragon(d.id)}
                  >
                    {can.ok ? `${d.unlockCost} 비늘` : can.reason}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="hub-section">
        <h3>영구 업글</h3>
        <div className="up-tabs">
          {DRAGONS.filter((d) => isDragonUnlocked(meta, d.id)).map((d) => (
            <button
              key={d.id}
              className={`up-tab ${upDragon === d.id ? "active" : ""}`}
              onClick={() => setUpDragon(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
        <div className="hub-cards">
          {UPGRADES.map((u) => {
            const level = meta.upgrades[upDragon]?.[u.id] ?? 0;
            const cost = upgradeCost(meta, upDragon, u.id);
            const maxed = cost === null;
            return (
              <div key={u.id} className="hub-card">
                <div className="hub-card-body">
                  <strong>
                    {u.name} <span className="lvl">Lv.{level}</span>
                  </strong>
                  <small>{u.effect}</small>
                </div>
                <button
                  className="btn small"
                  disabled={maxed || (cost !== null && meta.scales < cost)}
                  onClick={() => props.onBuyUpgrade(upDragon, u.id)}
                >
                  {maxed ? "MAX" : `${cost} 비늘`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="hub-section two-col">
        <div>
          <h3>난이도</h3>
          <ul className="status-list">
            {DIFFICULTIES.map((d) => (
              <li key={d.id}>
                <span>{d.name}</span>
                <span className={isDifficultyUnlocked(meta, d.id) ? "ok" : "lock"}>
                  {isDifficultyUnlocked(meta, d.id) ? "해금" : `🔒 ${d.unlockNote}`}
                </span>
              </li>
            ))}
          </ul>
          <button className="btn" onClick={props.onPractice}>
            연습 모드 →
          </button>
        </div>
        <div>
          <h3>보스 도감</h3>
          <ul className="status-list">
            {STAGES.map((s) => (
              <li key={s.index}>
                <span>{s.bossName}</span>
                <span className={meta.defeatedBosses.includes(s.bossName) ? "ok" : "lock"}>
                  {meta.defeatedBosses.includes(s.bossName) ? "격파" : "???"}
                </span>
              </li>
            ))}
            <li>
              <span>시원의 고룡 아카식</span>
              <span className={meta.trueEnding ? "ok" : "lock"}>{meta.trueEnding ? "격파" : "???"}</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export function PracticeSelect(props: {
  meta: MetaState;
  onPick: (stage: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="menu">
      <header className="menu-head">
        <button className="btn ghost" onClick={props.onBack}>
          ← 뒤로
        </button>
        <h2>연습 — 스테이지 선택</h2>
        <span />
      </header>
      <p className="menu-hint">도달했던 스테이지를 단독으로 연습합니다(기록 별도).</p>
      <div className="difficulty-list">
        {STAGES.map((s) => {
          const unlocked = s.index === 0 || props.meta.clearedFirstLoop;
          return (
            <button
              key={s.index}
              className={`difficulty-card ${unlocked ? "" : "locked"}`}
              disabled={!unlocked}
              onClick={() => unlocked && props.onPick(s.index)}
            >
              <span className="diff-name">{s.stage}</span>
              <span className="diff-note">
                {s.name} · {s.bossName}
              </span>
              {!unlocked && <span className="lock-note">🔒 1주차 클리어 필요</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
