// 메뉴 화면들 — 타이틀, 드래곤 선택, 난이도 선택, 리절트, 옵션.

import { DIFFICULTIES, DRAGONS, STAGES } from "../data";
import { isDifficultyUnlocked, isDragonUnlocked } from "../meta";
import type { DragonDef, MetaState, RunResult } from "../types";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

// ── 타이틀 ──────────────────────────────────────────────────
export function TitleScreen(props: {
  meta: MetaState;
  onStart: () => void;
  onPractice: () => void;
  onHub: () => void;
  onOptions: () => void;
}) {
  return (
    <div className="menu title-screen">
      <div className="title-hero">
        <h1 className="game-title">
          용린난무 <span className="title-sub">龍鱗亂舞</span>
        </h1>
        <p className="title-tag">DRAGONPACHI — 연환 탄막 슈팅</p>
      </div>
      <div className="title-stats">
        <span>최고 점수 {props.meta.bestScore.toLocaleString()}</span>
        <span>최고 연환 {props.meta.bestChain}</span>
        <span>용비늘 {props.meta.scales.toLocaleString()}</span>
      </div>
      <div className="title-menu">
        <button className="btn primary big" onClick={props.onStart}>
          게임 시작
        </button>
        <button className="btn" onClick={props.onPractice}>
          연습 모드
        </button>
        <button className="btn" onClick={props.onHub}>
          용소 (해금·업글)
        </button>
        <button className="btn" onClick={props.onOptions}>
          옵션
        </button>
      </div>
      <p className="hint">
        이동 방향키·WASD / 빔(정밀) Shift·C / 포효(봄) X / 각성 Space — 모바일은 화면을 끌어 이동.
      </p>
    </div>
  );
}

// ── 드래곤 선택 ─────────────────────────────────────────────
export function DragonSelect(props: {
  meta: MetaState;
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const selected = DRAGONS.find((d) => d.id === props.selectedId) ?? DRAGONS[0];
  return (
    <div className="menu">
      <header className="menu-head">
        <button className="btn ghost" onClick={props.onBack}>
          ← 뒤로
        </button>
        <h2>수호룡 선택</h2>
        <span />
      </header>
      <p className="menu-hint">첫 플레이 권장: 화룡 이그니스 + Novice</p>
      <div className="dragon-grid">
        {DRAGONS.map((d) => {
          const unlocked = isDragonUnlocked(props.meta, d.id);
          const active = d.id === props.selectedId;
          return (
            <button
              key={d.id}
              className={`dragon-card ${active ? "active" : ""} ${unlocked ? "" : "locked"}`}
              style={{ borderColor: active ? hex(d.color) : undefined }}
              onClick={() => unlocked && props.onSelect(d.id)}
              disabled={!unlocked}
            >
              <span className="dragon-emblem" style={{ background: hex(d.color) }} />
              <span className="dragon-name">{d.name}</span>
              <span className="dragon-title">{d.title}</span>
              {!unlocked && (
                <span className="lock-note">
                  🔒 {d.unlockCost} 비늘{d.unlockNote ? ` · ${d.unlockNote}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <DragonStat dragon={selected} />
      <div className="menu-foot">
        <button className="btn primary big" onClick={props.onConfirm}>
          난이도 선택 →
        </button>
      </div>
    </div>
  );
}

function DragonStat({ dragon }: { dragon: DragonDef }) {
  const bar = (v: number, max: number) => (
    <div className="stat-track">
      <div className="stat-fill" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
    </div>
  );
  return (
    <div className="dragon-stat">
      <p className="dragon-blurb">{dragon.blurb}</p>
      <div className="stat-row">
        <span>이동속도</span>
        {bar(dragon.speed, 6)}
      </div>
      <div className="stat-row">
        <span>샷 광역</span>
        {bar(dragon.shotCount * (dragon.shotSpread / 20), 12)}
      </div>
      <div className="stat-row">
        <span>빔 화력</span>
        {bar(dragon.laserDps, 45)}
      </div>
    </div>
  );
}

// ── 난이도 선택 ─────────────────────────────────────────────
export function DifficultySelect(props: {
  meta: MetaState;
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="menu">
      <header className="menu-head">
        <button className="btn ghost" onClick={props.onBack}>
          ← 뒤로
        </button>
        <h2>난이도 선택</h2>
        <span />
      </header>
      <div className="difficulty-list">
        {DIFFICULTIES.map((d) => {
          const unlocked = isDifficultyUnlocked(props.meta, d.id);
          const active = d.id === props.selectedId;
          return (
            <button
              key={d.id}
              className={`difficulty-card ${active ? "active" : ""} ${unlocked ? "" : "locked"}`}
              onClick={() => unlocked && props.onSelect(d.id)}
              disabled={!unlocked}
            >
              <span className="diff-name">{d.name}</span>
              <span className="diff-note">{d.note}</span>
              {!unlocked && <span className="lock-note">🔒 {d.unlockNote}</span>}
            </button>
          );
        })}
      </div>
      <div className="menu-foot">
        <button className="btn primary big" onClick={props.onConfirm}>
          출격 →
        </button>
      </div>
    </div>
  );
}

// ── 리절트 ──────────────────────────────────────────────────
export function ResultScreen(props: {
  result: RunResult;
  onHub: () => void;
  onRetry: () => void;
  onTitle: () => void;
}) {
  const r = props.result;
  const title = r.trueEnding
    ? "트루 엔딩 — 시원의 고룡 격파!"
    : r.cleared
      ? "1주차 클리어!"
      : "게임 오버";
  return (
    <div className="menu result-screen">
      <h2 className={`result-title ${r.cleared ? "win" : ""}`}>{title}</h2>
      {r.newBest && <p className="new-best">★ 신기록 ★</p>}
      <div className="result-grid">
        <Row label="최종 점수" value={r.score.toLocaleString()} />
        <Row label="최고 연환" value={`${r.bestChain}`} />
        <Row label="도달 스테이지" value={`STAGE ${r.stageReached + 1}`} />
        <Row label="숨은 비늘" value={`${r.hiddenScales}`} />
        <Row label="노미스" value={r.noMiss ? "달성" : "—"} />
        <Row label="노봄" value={r.noBomb ? "달성" : "—"} />
        <Row label="노컨티뉴" value={r.noContinue ? "달성" : "—"} />
      </div>
      <div className="earned-scales">
        <span>획득 용비늘</span>
        <strong>+{r.earnedScales.toLocaleString()}</strong>
      </div>
      <div className="panel-actions">
        <button className="btn primary" onClick={props.onHub}>
          용소로 (해금)
        </button>
        <button className="btn" onClick={props.onRetry}>
          재도전
        </button>
        <button className="btn ghost" onClick={props.onTitle}>
          타이틀
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// ── 옵션 ────────────────────────────────────────────────────
export function OptionsScreen(props: { onBack: () => void }) {
  return (
    <div className="menu">
      <header className="menu-head">
        <button className="btn ghost" onClick={props.onBack}>
          ← 뒤로
        </button>
        <h2>옵션 · 조작 안내</h2>
        <span />
      </header>
      <div className="options-body">
        <ul className="control-list">
          <li>
            <b>이동</b> 방향키 / WASD / 화면 드래그(모바일)
          </li>
          <li>
            <b>샷</b> 자동 연사(비늘 산탄)
          </li>
          <li>
            <b>레이저(정밀)</b> Shift · C 홀드 — 이동 감속, 고화력 빔
          </li>
          <li>
            <b>포효(봄)</b> X — 화면 탄막 소거 + 무적
          </li>
          <li>
            <b>각성(광룡화)</b> Space — 게이지 만충 시 강화 + 탄소거
          </li>
          <li>
            <b>일시정지</b> Esc · P
          </li>
        </ul>
        <p className="muted">
          탄막 가독성을 위해 적탄은 흰 코어로 표시됩니다. 피탄 판정은 드래곤 중심의 작은 점뿐입니다 — 큰 몸체로 스쳐도
          안전합니다.
        </p>
        <p className="muted">스테이지 구성: {STAGES.map((s) => s.name).join(" · ")} · 심연(진보스).</p>
      </div>
    </div>
  );
}
