import { useCallback, useEffect, useMemo, useState } from "react";
import { GameCanvas } from "./GameCanvas";
import type { RunReport } from "./GameCanvas";
import { TuningPanel } from "./TuningPanel";
import { AXES, AXIS_COLOR, AXIS_LABEL } from "./game/axes";
import type { RunConfig } from "./game/engine";
import { isMuted, setMuted } from "./game/audio";
import {
  AXIS_CAP_COST,
  MAX_TIER,
  PRESETS,
  PRESET_BY_ID,
  SECTOR_POOL_COST,
  STAGES_PER_TIER,
  coresForDistance,
  countClearedInTier,
  countProgressInTier,
  endlessUnlocked,
  recordStageClear,
  stageKey,
  tierUnlocked
} from "./game/meta";
import type { Meta } from "./game/meta";
import { RELIEF_MAX, reliefLevel } from "./game/relief";
import { exportMeta, importMeta, loadMeta, saveMeta } from "./game/storage";
import type { Phase, Tuning } from "./game/types";

type Screen =
  | { kind: "home" }
  | { kind: "stages" }
  | { kind: "shop" }
  | { kind: "play"; config: RunConfig };

function AxisLegend() {
  return (
    <ul className="legend">
      {AXES.map((axis) => (
        <li key={axis}>
          <span className="swatch" style={{ background: AXIS_COLOR[axis] }} />
          {AXIS_LABEL[axis]}
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [meta, setMetaState] = useState<Meta>(() => loadMeta());
  const [presetId, setPresetId] = useState("neutral");
  const [phase, setPhase] = useState<Phase>("ready");
  const [report, setReport] = useState<RunReport | null>(null);
  const [overrides, setOverrides] = useState<Partial<Tuning>>({});
  const [showTuning, setShowTuning] = useState(false);
  const [fps, setFps] = useState(60);
  const [muted, setMutedState] = useState(isMuted());
  const [transfer, setTransfer] = useState("");
  const [practice, setPractice] = useState(false);
  /** 방금 끝난 클리어가 실제로 지급한 코어. 반복 클리어와 완화 통과는 0 이다 */
  const [reward, setReward] = useState(0);

  const commit = useCallback((next: Meta) => setMetaState(saveMeta(next)), []);

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

  const preset = PRESET_BY_ID.get(presetId) ?? PRESETS[0];

  const startStage = useCallback(
    (tier: number, stageNo: number) => {
      setReport(null);
      setReward(0);
      setScreen({
        kind: "play",
        config: {
          mode: "stage",
          tier,
          stageNo,
          seed: 0,
          startBuild: { ...preset.build },
          axisCap: meta.axisCap,
          maxSectorDifficulty: meta.fullPool ? 3 : 2,
          overrides,
          practice,
          // 연습 모드는 이미 체크포인트라는 다른 완화를 쓴다 — 둘을 겹치면
          // 무엇 덕분에 통과했는지 알 수 없어진다.
          relief: !practice,
          priorFails: meta.fails[stageKey(tier, stageNo)] ?? 0
        }
      });
    },
    [meta.axisCap, meta.fullPool, meta.fails, overrides, practice, preset]
  );

  const startEndless = useCallback(() => {
    setReport(null);
    setScreen({
      kind: "play",
      config: {
        mode: "endless",
        tier: 1,
        stageNo: 0,
        seed: (Date.now() & 0xffff) >>> 0,
        startBuild: { ...preset.build },
        axisCap: meta.axisCap,
        maxSectorDifficulty: meta.fullPool ? 3 : 2,
        overrides
      }
    });
  }, [meta.axisCap, meta.fullPool, overrides, preset]);

  const handleRunEnd = useCallback(
    (r: RunReport) => {
      setReport(r);
      if (screen.kind !== "play") return;
      const cfg = screen.config;
      // 연습 통과는 클리어가 아니다 — 긴장이 빠진 주행을 기록으로 남기면
      // 티어 지표의 의미가 사라진다.
      if (cfg.mode === "stage" && r.cleared && !cfg.practice) {
        const next = recordStageClear(meta, cfg.tier, cfg.stageNo, r.sec, r.relief);
        setReward(next.cores);
        commit(next.meta);
      }
      if (cfg.mode === "endless" && !r.cleared) {
        commit({
          ...meta,
          cores: meta.cores + coresForDistance(r.distance),
          bestDistance: Math.max(meta.bestDistance, r.distance)
        });
      }
    },
    [commit, meta, screen]
  );

  /**
   * Stage 사망. 반복 완화의 **유일한 입력**이다.
   *
   * 연습 모드에서는 세지 않는다 — 체크포인트에서 이어가는 죽음은 같은 무게가 아니고,
   * 두 완화를 겹치면 무엇 덕분에 통과했는지 구분할 수 없게 된다.
   */
  const handleFail = useCallback(() => {
    if (screen.kind !== "play") return;
    const cfg = screen.config;
    if (cfg.mode !== "stage" || cfg.practice) return;
    const key = stageKey(cfg.tier, cfg.stageNo);
    setMetaState((m) => saveMeta({ ...m, fails: { ...m.fails, [key]: (m.fails[key] ?? 0) + 1 } }));
  }, [screen]);

  const handleAttempt = useCallback(() => {
    if (screen.kind !== "play") return;
    const cfg = screen.config;
    const key = cfg.mode === "stage" ? stageKey(cfg.tier, cfg.stageNo) : "endless";
    setMetaState((m) => saveMeta({ ...m, attempts: { ...m.attempts, [key]: (m.attempts[key] ?? 0) + 1 } }));
  }, [screen]);

  const exitPlay = useCallback(() => {
    setScreen({ kind: "home" });
    setReport(null);
  }, []);

  const buy = useCallback(
    (cost: number, apply: (m: Meta) => Meta) => {
      if (meta.cores < cost) return;
      commit(apply({ ...meta, cores: meta.cores - cost }));
    },
    [commit, meta]
  );

  const tiers = useMemo(() => Array.from({ length: MAX_TIER }, (_, i) => i + 1), []);

  /**
   * 지금 이 런에 걸릴 완화 단계. `running` 중에는 화면에 아무것도 띄우지 않고,
   * 시작 전 오버레이에서만 알린다 — 완화된 통과가 기록에서 갈린다는 사실을
   * 나중에 알게 되는 것이 더 나쁘기 때문이다.
   */
  const reliefNow =
    screen.kind === "play" && screen.config.relief
      ? reliefLevel(screen.config.priorFails ?? 0)
      : 0;

  return (
    <main className="app">
      {screen.kind === "home" ? (
        <section className="panel">
          <header className="panel-head">
            <h1>Wave Runner</h1>
            <p>
              누르면 오르고 놓으면 내려간다. 가만히 있는 선택지는 없다.
              <br />
              <span className="dim">
                갈림길을 지나면 한 축이 오르고 다른 축이 내린다 — 순수한 상승은 없다.
              </span>
            </p>
          </header>

          <div className="cores">
            코어 <strong>{meta.cores}</strong>
          </div>

          <div className="preset-row">
            <span className="field-label">출발 형태</span>
            <div className="chips">
              {PRESETS.map((p) => {
                const owned = meta.presets.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`chip${presetId === p.id ? " on" : ""}${owned ? "" : " locked"}`}
                    disabled={!owned}
                    onClick={() => setPresetId(p.id)}
                    title={p.note}
                  >
                    {p.name}
                    <em>{owned ? p.note : `${p.cost} 코어`}</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mode-row">
            <button type="button" className="mode" onClick={() => setScreen({ kind: "stages" })}>
              <strong>Stage</strong>
              <small>정해진 코스. 얼마나 어려운 것을 넘는가</small>
              <em>최고 티어 {tiers.filter((t) => countClearedInTier(meta, t) > 0).length}</em>
            </button>
            <button
              type="button"
              className="mode"
              disabled={!endlessUnlocked(meta)}
              onClick={startEndless}
            >
              <strong>Endless</strong>
              <small>
                {endlessUnlocked(meta)
                  ? "끝이 없다. 얼마나 멀리 가는가"
                  : "Stage 하나를 클리어하면 열린다"}
              </small>
              <em>최고 {Math.round(meta.bestDistance)}m</em>
            </button>
          </div>

          <button type="button" className="link" onClick={() => setScreen({ kind: "shop" })}>
            해금 →
          </button>

          <footer className="panel-foot">
            <AxisLegend />
            <span>스페이스 · 클릭 · 탭 = 상승 · T 튜닝 · M 음소거{muted ? "(꺼짐)" : ""}</span>
          </footer>
        </section>
      ) : null}

      {screen.kind === "stages" ? (
        <section className="panel">
          <header className="panel-head">
            <h1>Stage</h1>
            <p className="dim">같은 스테이지는 언제나 같은 코스다. 해법을 찾고, 그 해법을 관철한다.</p>
          </header>
          {tiers.map((tier) => {
            const open = tierUnlocked(meta, tier);
            return (
              <div key={tier} className={`tier${open ? "" : " locked"}`}>
                <h2>
                  티어 {tier}
                  <span>
                    {open
                      ? `${countClearedInTier(meta, tier)}/${STAGES_PER_TIER}` +
                        (countProgressInTier(meta, tier) > countClearedInTier(meta, tier)
                          ? ` (+완화 ${countProgressInTier(meta, tier) - countClearedInTier(meta, tier)})`
                          : "")
                      : "잠김"}
                  </span>
                </h2>
                <div className="tier-row">
                  {Array.from({ length: STAGES_PER_TIER }, (_, i) => i + 1).map((no) => {
                    const key = stageKey(tier, no);
                    const cleared = meta.clearedStages.includes(key);
                    const assisted = !cleared && meta.assistedStages.includes(key);
                    const best = meta.bestStageSec[key];
                    const tries = meta.attempts[key] ?? 0;
                    const level = reliefLevel(meta.fails[key] ?? 0);
                    return (
                      <button
                        key={no}
                        type="button"
                        className={`stage-cell${cleared ? " cleared" : ""}${assisted ? " assisted" : ""}`}
                        disabled={!open}
                        onClick={() => startStage(tier, no)}
                        title={
                          assisted
                            ? "완화 통과 — 기록과 코어에는 들어가지 않는다. 완화 없이 다시 넘으면 승격된다"
                            : undefined
                        }
                      >
                        <strong>{no}</strong>
                        <small>
                          {cleared && best !== undefined ? `${best.toFixed(1)}초` : assisted ? "완화 통과" : "—"}
                        </small>
                        {tries > 0 ? <em>{tries}회</em> : null}
                        {level > 0 ? <i className="relief-dots">{"·".repeat(level)}</i> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <label className="toggle">
            <input type="checkbox" checked={practice} onChange={(e) => setPractice(e.target.checked)} />
            <span>
              <strong>연습 모드</strong>
              <small>게이트마다 체크포인트. 막힌 구간만 반복한다 — 기록에는 남지 않는다</small>
            </span>
          </label>

          <button type="button" className="link" onClick={() => setScreen({ kind: "home" })}>
            ← 돌아가기
          </button>
        </section>
      ) : null}

      {screen.kind === "shop" ? (
        <section className="panel">
          <header className="panel-head">
            <h1>해금</h1>
            <p className="dim">
              전부 <strong>출발점이 넓어지는 것</strong>이지 강해지는 것이 아니다. 런 안의 빌드는 언제나 교환이다.
            </p>
          </header>
          <div className="cores">
            코어 <strong>{meta.cores}</strong>
          </div>

          <ul className="shop">
            {PRESETS.filter((p) => p.cost > 0).map((p) => {
              const owned = meta.presets.includes(p.id);
              return (
                <li key={p.id}>
                  <div>
                    <strong>프리셋 · {p.name}</strong>
                    <small>{p.note}</small>
                  </div>
                  <button
                    type="button"
                    disabled={owned || meta.cores < p.cost}
                    onClick={() => buy(p.cost, (m) => ({ ...m, presets: [...m.presets, p.id] }))}
                  >
                    {owned ? "보유" : `${p.cost}`}
                  </button>
                </li>
              );
            })}
            <li>
              <div>
                <strong>축 상한 ±3</strong>
                <small>각 축이 더 멀리까지 간다. 극단이 열린다</small>
              </div>
              <button
                type="button"
                disabled={meta.axisCap >= 3 || meta.cores < AXIS_CAP_COST}
                onClick={() => buy(AXIS_CAP_COST, (m) => ({ ...m, axisCap: 3 }))}
              >
                {meta.axisCap >= 3 ? "보유" : `${AXIS_CAP_COST}`}
              </button>
            </li>
            <li>
              <div>
                <strong>확장 섹터 풀</strong>
                <small>더 많은 종류의 구간이 나온다. 깊이는 축이 아니라 여기서 온다</small>
              </div>
              <button
                type="button"
                disabled={meta.fullPool || meta.cores < SECTOR_POOL_COST}
                onClick={() => buy(SECTOR_POOL_COST, (m) => ({ ...m, fullPool: true }))}
              >
                {meta.fullPool ? "보유" : `${SECTOR_POOL_COST}`}
              </button>
            </li>
          </ul>

          <details className="transfer">
            <summary>진행도 옮기기</summary>
            <p className="dim">
              브라우저 저장은 지워질 수 있다. 영구 해금이 생긴 이상 이건 임시 방편이고, 계정 동기화가 제대로 된 답이다.
            </p>
            <textarea
              value={transfer}
              onChange={(e) => setTransfer(e.target.value)}
              placeholder="여기에 붙여넣고 가져오기"
              rows={3}
            />
            <div className="transfer-row">
              <button type="button" onClick={() => setTransfer(exportMeta(meta))}>
                내보내기
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = importMeta(transfer);
                  if (next) commit(next);
                }}
              >
                가져오기
              </button>
            </div>
          </details>

          <button type="button" className="link" onClick={() => setScreen({ kind: "home" })}>
            ← 돌아가기
          </button>
        </section>
      ) : null}

      {screen.kind === "play" ? (
        <section className="play">
          <GameCanvas
            config={screen.config}
            onPhase={setPhase}
            onAttempt={handleAttempt}
            onFail={handleFail}
            onRunEnd={handleRunEnd}
            onExit={exitPlay}
            onSample={(s) => setFps(s.fps)}
            overrides={overrides}
          />

          {phase === "ready" ? (
            <div className="overlay">
              <p className="eyebrow">
                {screen.config.mode === "stage"
                  ? `티어 ${screen.config.tier} · ${screen.config.stageNo}${screen.config.practice ? " · 연습" : ""}`
                  : "ENDLESS"}
              </p>
              <h2>{preset.name}</h2>
              <p className="dim">{preset.note}</p>
              <AxisLegend />
              {reliefNow > 0 ? (
                <p className="dim">
                  완화 {reliefNow}/{RELIEF_MAX} — 아바타가 작아지고 통로가 넓어진다. 이 상태의 통과는 기록에 남지 않는다
                </p>
              ) : null}
              <p className="cue">누르면 오른다</p>
            </div>
          ) : null}

          {phase === "cleared" && report ? (
            <div className="overlay">
              <h2 className="good">CLEAR</h2>
              <p>
                {report.sec.toFixed(2)}초 · 시도 {report.attempts}회
              </p>
              <p className="dim">
                {screen.config.practice
                  ? "연습 통과 — 기록에 남지 않는다"
                  : report.relief > 0
                    ? `완화 ${report.relief}/${RELIEF_MAX} 통과 — 기록은 따로 남는다. 완화 없이 다시 넘으면 승격된다`
                    : reward > 0
                      ? `+${reward} 코어`
                      : "이미 클리어한 스테이지 — 코어는 최초 1회만"}
              </p>
              <p className="cue">누르면 계속</p>
            </div>
          ) : null}

          {phase === "dead" && screen.config.mode === "endless" && report ? (
            <div className="overlay">
              <h2>{Math.round(report.distance)}m</h2>
              <p className="dim">
                +{coresForDistance(report.distance)} 코어 · 최고 {Math.round(meta.bestDistance)}m
              </p>
              <p className="cue">누르면 다시 · Esc 나가기</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {showTuning ? (
        <TuningPanel
          overrides={overrides}
          onChange={setOverrides}
          onReset={() => setOverrides({})}
          fps={fps}
        />
      ) : null}
    </main>
  );
}
