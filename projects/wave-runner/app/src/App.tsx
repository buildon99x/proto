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
  coresForStage,
  countClearedInTier,
  endlessUnlocked,
  stageKey,
  tierUnlocked
} from "./game/meta";
import type { Meta } from "./game/meta";
import { exportMeta, importMeta, loadMeta, saveMeta } from "./game/storage";
import type { Phase, RunMode, Tuning } from "./game/types";

type Screen =
  | { kind: "home" }
  | { kind: "stages" }
  | { kind: "shop" }
  | { kind: "play"; config: RunConfig };

/**
 * 끝난 런의 결과. `RunReport` 가 엔진이 말하는 것이라면 이쪽은 **메타와 대조한 뒤**의
 * 것이다 — 기록을 갱신했는지, 직전 최고가 무엇이었는지는 저장본을 덮어쓰기 전에만
 * 알 수 있으므로 여기서 한 번 얼려 둔다.
 */
interface RunResult {
  mode: RunMode;
  cleared: boolean;
  sec: number;
  distance: number;
  attempts: number;
  /** 이 런 직전까지의 최고 기록. Stage 는 초, Endless 는 거리. 없으면 null */
  prevBest: number | null;
  /** 이번 주행이 기록을 갱신했는가 */
  record: boolean;
  /** 실제로 지급된 코어. 반복 클리어는 0 이다 */
  reward: number;
  /** 기록으로 집계되는 주행인가 (연습 통과는 아니다) */
  counted: boolean;
}

const fmtSec = (v: number) => `${v.toFixed(2)}초`;
const fmtDist = (v: number) => `${Math.round(v)}m`;

/** 결과 화면의 기록 표. 이번과 최고를 같은 크기로 나란히 둔다 — 비교가 곧 내용이다. */
function RecordRow({ items }: { items: Array<{ label: string; value: string; tone?: "good" | "dim" }> }) {
  return (
    <dl className="record-row">
      {items.map((it) => (
        <div key={it.label}>
          <dt>{it.label}</dt>
          <dd className={it.tone ?? ""}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

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
  const [result, setResult] = useState<RunResult | null>(null);
  const [overrides, setOverrides] = useState<Partial<Tuning>>({});
  const [showTuning, setShowTuning] = useState(false);
  const [fps, setFps] = useState(60);
  const [muted, setMutedState] = useState(isMuted());
  const [transfer, setTransfer] = useState("");
  const [practice, setPractice] = useState(false);

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
      setResult(null);
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
          practice
        }
      });
    },
    [meta.axisCap, meta.fullPool, overrides, practice, preset]
  );

  const startEndless = useCallback(() => {
    setResult(null);
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
      if (screen.kind !== "play") return;
      const cfg = screen.config;

      if (cfg.mode === "stage") {
        const key = stageKey(cfg.tier, cfg.stageNo);
        const prev = meta.bestStageSec[key];
        const prevBest = typeof prev === "number" && Number.isFinite(prev) ? prev : null;
        // 연습 통과는 클리어가 아니다 — 긴장이 빠진 주행을 기록으로 남기면
        // 티어 지표의 의미가 사라진다.
        const counted = r.cleared && !cfg.practice;
        const first = counted && !meta.clearedStages.includes(key);
        const reward = first ? coresForStage(cfg.tier) : 0;
        setResult({
          mode: "stage",
          cleared: r.cleared,
          sec: r.sec,
          distance: r.distance,
          attempts: r.attempts,
          prevBest,
          record: counted && (prevBest === null || r.sec < prevBest),
          reward,
          counted
        });
        if (counted) {
          commit({
            ...meta,
            cores: meta.cores + reward,
            clearedStages: first ? [...meta.clearedStages, key] : meta.clearedStages,
            bestStageSec: { ...meta.bestStageSec, [key]: Math.min(prevBest ?? Number.POSITIVE_INFINITY, r.sec) }
          });
        }
        return;
      }

      const prevBest = meta.bestDistance > 0 ? meta.bestDistance : null;
      const reward = coresForDistance(r.distance);
      setResult({
        mode: "endless",
        cleared: r.cleared,
        sec: r.sec,
        distance: r.distance,
        attempts: r.attempts,
        prevBest,
        record: r.distance > meta.bestDistance,
        reward,
        counted: true
      });
      commit({
        ...meta,
        cores: meta.cores + reward,
        bestDistance: Math.max(meta.bestDistance, r.distance)
      });
    },
    [commit, meta, screen]
  );

  const toggleHud = useCallback(() => {
    setMetaState((m) => saveMeta({ ...m, hud: !m.hud }));
  }, []);

  const handleAttempt = useCallback(() => {
    if (screen.kind !== "play") return;
    const cfg = screen.config;
    const key = cfg.mode === "stage" ? stageKey(cfg.tier, cfg.stageNo) : "endless";
    setMetaState((m) => saveMeta({ ...m, attempts: { ...m.attempts, [key]: (m.attempts[key] ?? 0) + 1 } }));
  }, [screen]);

  const exitPlay = useCallback(() => {
    setScreen({ kind: "home" });
    setResult(null);
  }, []);

  const buy = useCallback(
    (cost: number, apply: (m: Meta) => Meta) => {
      if (meta.cores < cost) return;
      commit(apply({ ...meta, cores: meta.cores - cost }));
    },
    [commit, meta]
  );

  const tiers = useMemo(() => Array.from({ length: MAX_TIER }, (_, i) => i + 1), []);

  /** 이 런이 겨루는 자기 기록. 주행 중 표시와 결과 화면이 같은 값을 읽는다. */
  const runRecord = useMemo(() => {
    if (screen.kind !== "play") return 0;
    const cfg = screen.config;
    if (cfg.mode === "endless") return meta.bestDistance;
    const best = meta.bestStageSec[stageKey(cfg.tier, cfg.stageNo)];
    return typeof best === "number" && Number.isFinite(best) ? best : 0;
  }, [meta, screen]);

  /** 지금 화면 스테이지의 최고 기록. 저장본을 갱신한 뒤의 값이라 결과 화면이 그대로 읽는다. */
  const stageBest = useMemo(() => {
    if (screen.kind !== "play" || screen.config.mode !== "stage") return null;
    const b = meta.bestStageSec[stageKey(screen.config.tier, screen.config.stageNo)];
    return typeof b === "number" && Number.isFinite(b) ? b : null;
  }, [meta, screen]);

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
              <em>
                {meta.clearedStages.length > 0
                  ? `최고 티어 ${tiers.filter((t) => countClearedInTier(meta, t) > 0).length}`
                  : "아직 기록 없음"}
              </em>
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
              <em>{meta.bestDistance > 0 ? `최고 ${fmtDist(meta.bestDistance)}` : "아직 기록 없음"}</em>
            </button>
          </div>

          <label className="toggle compact">
            <input type="checkbox" checked={meta.hud} onChange={() => toggleHud()} />
            <span>
              <strong>주행 표시</strong>
              <small>
                화면 위 진행 레일과 거리·경과. 끄면 3단계까지의 무표시 주행 그대로다 — 주행 중 H
              </small>
            </span>
          </label>

          <button type="button" className="link" onClick={() => setScreen({ kind: "shop" })}>
            해금 →
          </button>

          <footer className="panel-foot">
            <AxisLegend />
            <span>
              스페이스 · 클릭 · 탭 = 상승 · H 주행 표시{meta.hud ? "" : "(꺼짐)"} · T 튜닝 · M 음소거
              {muted ? "(꺼짐)" : ""}
            </span>
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
                  <span>{open ? `${countClearedInTier(meta, tier)}/${STAGES_PER_TIER}` : "잠김"}</span>
                </h2>
                <div className="tier-row">
                  {Array.from({ length: STAGES_PER_TIER }, (_, i) => i + 1).map((no) => {
                    const key = stageKey(tier, no);
                    const cleared = meta.clearedStages.includes(key);
                    const best = meta.bestStageSec[key];
                    const tries = meta.attempts[key] ?? 0;
                    return (
                      <button
                        key={no}
                        type="button"
                        className={`stage-cell${cleared ? " cleared" : ""}`}
                        disabled={!open}
                        onClick={() => startStage(tier, no)}
                      >
                        <strong>{no}</strong>
                        <small>
                          {cleared && best !== undefined ? (
                            <>
                              <i>최고</i> {best.toFixed(2)}초
                            </>
                          ) : (
                            "—"
                          )}
                        </small>
                        {tries > 0 ? <em>{tries}회 시도</em> : null}
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
            onRunEnd={handleRunEnd}
            onExit={exitPlay}
            onToggleHud={toggleHud}
            onSample={(s) => setFps(s.fps)}
            overrides={overrides}
            hud={meta.hud}
            record={runRecord}
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
              {/* 겨룰 상대를 출발 전에 말해 둔다 — 주행 중에 읽게 하면 그게 곧 시선 비용이다 */}
              {runRecord > 0 ? (
                <p className="target">
                  최고 <strong>{screen.config.mode === "stage" ? fmtSec(runRecord) : fmtDist(runRecord)}</strong>
                </p>
              ) : null}
              <AxisLegend />
              <p className="cue">누르면 오른다</p>
            </div>
          ) : null}

          {phase === "cleared" && result ? (
            <div className="overlay">
              <p className="eyebrow">
                티어 {screen.config.tier} · {screen.config.stageNo}
                {screen.config.practice ? " · 연습" : ""}
              </p>
              <h2 className="good">CLEAR</h2>
              {result.record ? <p className="badge">신기록</p> : null}
              <RecordRow
                items={[
                  { label: "이번", value: fmtSec(result.sec), tone: result.record ? "good" : undefined },
                  {
                    label: "최고",
                    value:
                      stageBest === null ? "—" : fmtSec(stageBest),
                    tone: result.record ? "good" : "dim"
                  },
                  { label: "시도", value: `${result.attempts}회`, tone: "dim" }
                ]}
              />
              {result.prevBest !== null && !result.record ? (
                <p className="delta">이전 최고보다 +{(result.sec - result.prevBest).toFixed(2)}초</p>
              ) : null}
              {result.record && result.prevBest !== null ? (
                <p className="delta good">−{(result.prevBest - result.sec).toFixed(2)}초 단축</p>
              ) : null}
              {result.record && result.prevBest === null ? <p className="delta good">첫 기록</p> : null}

              {/* "Stage 별 최고 기록" — 방금 푼 것만이 아니라 이 티어 전체를 한 줄로 */}
              <div className="tier-bests">
                <span className="field-label">티어 {screen.config.tier} 최고 기록</span>
                <ul>
                  {Array.from({ length: STAGES_PER_TIER }, (_, i) => i + 1).map((no) => {
                    const b = meta.bestStageSec[stageKey(screen.config.tier, no)];
                    const has = typeof b === "number" && Number.isFinite(b);
                    return (
                      <li key={no} className={no === screen.config.stageNo ? "here" : ""}>
                        <em>{no}</em>
                        <strong>{has ? `${b.toFixed(2)}초` : "—"}</strong>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <p className="dim">
                {screen.config.practice
                  ? "연습 통과 — 기록에 남지 않는다"
                  : result.reward > 0
                    ? `+${result.reward} 코어`
                    : "이미 클리어한 스테이지 — 코어는 최초 1회만"}
              </p>
              <p className="cue">누르면 계속</p>
            </div>
          ) : null}

          {phase === "dead" && screen.config.mode === "endless" && result ? (
            <div className="overlay">
              <p className="eyebrow">ENDLESS</p>
              <h2 className={result.record ? "good" : ""}>{fmtDist(result.distance)}</h2>
              {result.record ? <p className="badge">신기록</p> : null}
              <RecordRow
                items={[
                  { label: "최고", value: fmtDist(meta.bestDistance), tone: result.record ? "good" : undefined },
                  {
                    label: "이전 최고",
                    value: result.prevBest === null ? "—" : fmtDist(result.prevBest),
                    tone: "dim"
                  },
                  { label: "코어", value: `+${result.reward}`, tone: "dim" }
                ]}
              />
              {result.record && result.prevBest !== null ? (
                <p className="delta good">+{Math.round(result.distance - result.prevBest)}m 경신</p>
              ) : null}
              {result.record && result.prevBest === null ? <p className="delta good">첫 기록</p> : null}
              {!result.record && result.prevBest !== null ? (
                <p className="delta">최고까지 {Math.round(result.prevBest - result.distance)}m</p>
              ) : null}
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
