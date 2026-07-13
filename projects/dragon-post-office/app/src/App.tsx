import { useState } from "react";

const blueprint = {
  "name": "Dragon Post Office",
  "slug": "dragon-post-office",
  "pitch": "용이 우체국을 운영하는 경영 게임",
  "theme": "mystic",
  "actionLabel": "마력 불어넣기",
  "resourceName": "마력",
  "itemName": "유물",
  "goalCount": 5,
  "rewardPerAction": 3,
  "upgradeCost": 9,
  "tags": [
    "factory-generated",
    "mystic",
    "microgame"
  ],
  "playerGoal": "유물 5개를 완성하고 작업 효율을 한 번 강화하세요.",
  "successMessage": "Dragon Post Office의 첫 번째 운영 사이클을 완성했습니다!"
} as const;
const progressTarget = 5;

export default function App() {
  const [resource, setResource] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [power, setPower] = useState(1);
  const [upgraded, setUpgraded] = useState(false);

  const success = completed >= blueprint.goalCount && upgraded;

  function act() {
    if (success) return;
    setResource((value) => value + blueprint.rewardPerAction);
    setProgress((value) => {
      const next = value + power;
      if (next >= progressTarget) {
        setCompleted((count) => Math.min(blueprint.goalCount, count + 1));
        return 0;
      }
      return next;
    });
  }

  function upgrade() {
    if (upgraded || resource < blueprint.upgradeCost) return;
    setResource((value) => value - blueprint.upgradeCost);
    setPower(2);
    setUpgraded(true);
  }

  function reset() {
    setResource(0);
    setProgress(0);
    setCompleted(0);
    setPower(1);
    setUpgraded(false);
  }

  return (
    <main className="factory-app theme-mystic">
      <header>
        <p className="eyebrow">AI Prototype Factory · playable proof</p>
        <h1>{blueprint.name}</h1>
        <p className="pitch">{blueprint.pitch}</p>
      </header>

      <section className="goal-card" aria-label="현재 목표">
        <span>현재 목표</span>
        <strong>{blueprint.playerGoal}</strong>
      </section>

      <section className="dashboard">
        <article>
          <span>{blueprint.resourceName}</span>
          <strong data-factory="resource">{resource}</strong>
        </article>
        <article>
          <span>완성한 {blueprint.itemName}</span>
          <strong data-factory="completed">{completed} / {blueprint.goalCount}</strong>
        </article>
        <article>
          <span>작업 효율</span>
          <strong data-factory="power">x{power}</strong>
        </article>
      </section>

      <section className="workbench">
        <div className="progress-copy">
          <span>다음 {blueprint.itemName}</span>
          <strong>{Math.round((progress / progressTarget) * 100)}%</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${(progress / progressTarget) * 100}%` }} /></div>
        <button data-factory="action" className="primary-action" type="button" onClick={act} disabled={success}>
          {success ? "목표 완료" : blueprint.actionLabel}
          <small>클릭당 {blueprint.resourceName} +{blueprint.rewardPerAction} · 진행 +{power}</small>
        </button>
      </section>

      <section className="upgrade-card">
        <div>
          <span>효율 강화</span>
          <strong>{upgraded ? "강화 완료 · 작업 속도 x2" : `${blueprint.resourceName} ${blueprint.upgradeCost} 필요`}</strong>
        </div>
        <button data-factory="upgrade" type="button" onClick={upgrade} disabled={upgraded || resource < blueprint.upgradeCost}>
          {upgraded ? "완료" : "강화하기"}
        </button>
      </section>

      <section className={success ? "result success" : "result"} data-factory="status">
        <strong>{success ? blueprint.successMessage : "행동 → 보상 → 강화 → 목표 완료의 짧은 루프를 체험하세요."}</strong>
        {success ? <button data-factory="reset" type="button" onClick={reset}>다시 시작</button> : null}
      </section>
    </main>
  );
}
