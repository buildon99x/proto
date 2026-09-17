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
  SECTOR_POOL_COST,
  STAGES_PER_TIER,
  bestDistanceOverall,
  clearedByAny,
  coresForDistance,
  coresForStage,
  countClearedInTier,
  highestTierCleared,
  endlessUnlocked,
  stageKey,
  tierUnlocked
} from "./game/meta";
import type { Meta } from "./game/meta";
import { RUNNERS, runnerById, silhouetteOf, zigzagPoints } from "./game/runners";
import GRADES from "./game/runner-grades.json";
import type { Runner } from "./game/runners";
import { exportMeta, importMeta, loadMeta, saveMeta } from "./game/storage";
import { initTelemetry, setTelemetryEnabled } from "./game/telemetry";
import type { Phase, Tuning } from "./game/types";

type Screen =
  | { kind: "home" }
  | { kind: "stages" }
  | { kind: "shop" }
  | { kind: "play"; config: RunConfig };

const PREVIEW_W = 116;
const PREVIEW_H = 44;

/**
 * 기체의 실제 지그재그.
 *
 * ## 봉우리 수로는 벌어지지 않는다 — 세어 보고 알았다
 *
 * 앞 판본은 "같은 폭에 담기는 봉우리 수가 기울기에 반비례한다"에 기댔는데, 실제로 극값을
 * 세 보니 표준 1 · 둔각 1 · 예봉 2 · 환 1 이었다. 표준과 둔각이 같은 그림이었다는 뜻이다.
 * 이유는 식에 있다 — 카드 안의 다리 개수는 `w × slope / (2 × h × amp)` 라 **창 너비가
 * 약분되어** 누적이라는 레버 자체가 없다. 남는 것은 진폭과 카드 비율뿐이고, 둘 다 기체
 * 값이 바뀌면 정수 경계를 넘나들어 부서진다.
 *
 * 그래서 누적 대신 **비교**로 바꿨다. 표준(45°)의 지그재그를 점선으로 깔면, 차이는 세는
 * 것이 아니라 보이는 것이 된다 — 오른쪽으로 갈수록 위상차가 벌어져 카드 끝에서 진폭의
 * 절반만큼 어긋난다. 과장은 한 줄도 없다. 깔린 선도 실제 궤적이고 위의 선도 실제 궤적이다.
 * 표준 카드에만 기준선이 없는데, 그 카드에서는 본선이 곧 기준선이기 때문이다.
 */
function RunnerTrace({ runner }: { runner: Runner }) {
  const pts = zigzagPoints(runner, PREVIEW_W, PREVIEW_H);
  const base = runner.id === "dart" ? null : zigzagPoints(RUNNERS[0], PREVIEW_W, PREVIEW_H);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [hx, hy] = pts[pts.length - 1];
  const [px, py] = pts[pts.length - 2];
  const angle = (Math.atan2(hy - py, hx - px) * 180) / Math.PI;
  const shape = silhouetteOf(runner)
    .points.map(([x, y]) => `${(x * 9).toFixed(2)},${(y * 9).toFixed(2)}`)
    .join(" ");
  const baseD = base
    ? base.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
    : null;
  return (
    <svg
      className="runner-trace"
      viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {baseD ? <path className="base" d={baseD} /> : null}
      <path d={d} />
      <polygon points={shape} transform={`translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${angle.toFixed(1)})`} />
    </svg>
  );
}

/**
 * 측정된 성격 두 축. 절대값이 아니라 **기체 사이의 비교**이므로 막대로만 그린다 —
 * 오토파일럿이 잰 값이라 사람의 밀리초와 같은 눈금이 아니다. (`runner-grades.json`)
 */
function RunnerBars({ id }: { id: string }) {
  const g = (GRADES.runners as Record<string, { slackBar: number; routeBar: number }>)[id];
  if (!g) return null;
  const rows: Array<[string, number]> = [
    ["여유", g.slackBar],
    ["길", g.routeBar]
  ];
  return (
    <dl className="runner-bars">
      {rows.map(([label, v]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {/*
              바닥을 비율(7%)로 깔았더니 0 이 "짧은 막대"가 아니라 렌더 오류처럼 읽혔다.
              폭은 값 그대로 두고 최소 두께는 CSS 의 min-width 3px 이 맡는다 — 눈금의
              바닥과 데이터 없음이 갈리면서 값은 거짓말하지 않는다.
            */}
            <i style={{ width: `${(v * 100).toFixed(1)}%` }} />
          </dd>
        </div>
      ))}
    </dl>
  );
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
  const [runnerId, setRunnerId] = useState(() => loadMeta().runner);
  const [phase, setPhase] = useState<Phase>("ready");
  const [report, setReport] = useState<RunReport | null>(null);
  const [overrides, setOverrides] = useState<Partial<Tuning>>({});
  const [showTuning, setShowTuning] = useState(false);
  const [fps, setFps] = useState(60);
  const [muted, setMutedState] = useState(isMuted());
  const [transfer, setTransfer] = useState("");
  const [practice, setPractice] = useState(false);
  /** 방금 끝난 클리어가 실제로 지급한 코어. 반복 클리어는 0 이다 */
  const [reward, setReward] = useState(0);
  /**
   * 이 런 직전까지의 자기 기록과 갱신 여부.
   *
   * 저장본을 덮어쓰기 전에만 알 수 있으므로 `handleRunEnd` 에서 한 번 얼려 둔다 —
   * 결과 화면이 렌더될 때는 `meta` 가 이미 새 기록으로 바뀌어 있다.
   */
  const [prev, setPrev] = useState<{ best: number | null; beat: boolean }>({ best: null, beat: false });

  const commit = useCallback((next: Meta) => setMetaState(saveMeta(next)), []);

  // 앱이 뜰 때 한 번. 지난 실행이 못 보낸 배치를 먼저 비운다.
  useEffect(() => {
    initTelemetry(meta.telemetry);
    // 최초 1회만 — 이후의 켬/끔은 토글이 직접 알린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const runner = runnerById(runnerId);

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
          runner: runner.id,
          startBuild: { ...runner.startBuild },
          axisCap: meta.axisCap,
          maxSectorDifficulty: meta.fullPool ? 3 : 2,
          overrides,
          practice
        }
      });
    },
    [meta.axisCap, meta.fullPool, overrides, practice, runner]
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
        runner: runner.id,
        startBuild: { ...runner.startBuild },
        axisCap: meta.axisCap,
        maxSectorDifficulty: meta.fullPool ? 3 : 2,
        overrides
      }
    });
  }, [meta.axisCap, meta.fullPool, overrides, runner]);

  const handleRunEnd = useCallback(
    (r: RunReport) => {
      setReport(r);
      if (screen.kind !== "play") return;
      const cfg = screen.config;
      // 연습 통과는 클리어가 아니다 — 긴장이 빠진 주행을 기록으로 남기면
      // 티어 지표의 의미가 사라진다.
      if (cfg.mode === "stage" && r.cleared && !cfg.practice) {
        const key = stageKey(cfg.runner ?? "dart", cfg.tier, cfg.stageNo);
        const before = meta.bestStageSec[key];
        const had = typeof before === "number" && Number.isFinite(before);
        setPrev({ best: had ? before : null, beat: !had || r.sec < before });
        const first = !meta.clearedStages.includes(key);
        setReward(first ? coresForStage(cfg.tier) : 0);
        commit({
          ...meta,
          cores: meta.cores + (first ? coresForStage(cfg.tier) : 0),
          clearedStages: first ? [...meta.clearedStages, key] : meta.clearedStages,
          bestStageSec: {
            ...meta.bestStageSec,
            [key]: Math.min(meta.bestStageSec[key] ?? Number.POSITIVE_INFINITY, r.sec)
          }
        });
      }
      if (cfg.mode === "endless" && !r.cleared) {
        const id = cfg.runner ?? "dart";
        const before = meta.bestDistance[id] ?? 0;
        setPrev({ best: before > 0 ? before : null, beat: r.distance > before });
        commit({
          ...meta,
          cores: meta.cores + coresForDistance(r.distance),
          bestDistance: { ...meta.bestDistance, [id]: Math.max(meta.bestDistance[id] ?? 0, r.distance) }
        });
      }
    },
    [commit, meta, screen]
  );

  const handleAttempt = useCallback(() => {
    if (screen.kind !== "play") return;
    const cfg = screen.config;
    const key = cfg.mode === "stage" ? stageKey(cfg.runner ?? "dart", cfg.tier, cfg.stageNo) : "endless";
    setMetaState((m) => saveMeta({ ...m, attempts: { ...m.attempts, [key]: (m.attempts[key] ?? 0) + 1 } }));
  }, [screen]);

  const toggleHud = useCallback(() => {
    setMetaState((m) => saveMeta({ ...m, hud: !m.hud }));
  }, []);

  const toggleTelemetry = useCallback(() => {
    setMetaState((m) => {
      const next = !m.telemetry;
      setTelemetryEnabled(next);
      return saveMeta({ ...m, telemetry: next });
    });
  }, []);

  /** 그만두기. 좌상단 버튼과 Escape 가 쓴다 — 목적지는 언제나 홈이다. */
  const exitPlay = useCallback(() => {
    setScreen({ kind: "home" });
    setReport(null);
  }, []);

  /**
   * 클리어 화면에서 누른 것.
   *
   * **오버레이가 티어 세 칸의 기록을 나란히 보여주면서 홈으로 떨어뜨리고 있었다** —
   * "다음은 2번이다" 라고 말해 놓고 길을 끊는 셈이라, 다음 칸을 하려면 홈 → Stage →
   * 셀로 세 번을 더 눌러야 했다. 목록으로 돌려보내면 방금 채워진 클리어 표시 옆에
   * 다음 칸이 그대로 있다. Endless 에는 클리어가 없으므로 그쪽은 방어적으로만 둔다.
   */
  const advanceFromClear = useCallback(() => {
    setScreen((s) => (s.kind === "play" && s.config.mode === "stage" ? { kind: "stages" } : { kind: "home" }));
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

  /** 이 런이 겨루는 자기 기록. 주행 중 표시와 결과 화면이 같은 값을 읽는다. */
  const runRecord = useMemo(() => {
    if (screen.kind !== "play") return 0;
    const cfg = screen.config;
    const id = cfg.runner ?? "dart";
    if (cfg.mode === "endless") return meta.bestDistance[id] ?? 0;
    const best = meta.bestStageSec[stageKey(id, cfg.tier, cfg.stageNo)];
    return typeof best === "number" && Number.isFinite(best) ? best : 0;
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

          <button type="button" className="cores cores-link" onClick={() => setScreen({ kind: "shop" })}>
            코어 <strong>{meta.cores}</strong>
            <span>해금 →</span>
          </button>

          <div className="mode-row">
            <button type="button" className="mode" onClick={() => setScreen({ kind: "stages" })}>
              <strong>Stage</strong>
              <small>정해진 코스. 얼마나 어려운 것을 넘는가</small>
              <em className={highestTierCleared(meta) > 0 ? "" : "zero"}>최고 티어 {highestTierCleared(meta)}</em>
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
              <em className={bestDistanceOverall(meta) > 0 ? "" : "zero"}>최고 {Math.round(bestDistanceOverall(meta))}m</em>
            </button>
          </div>

          <div className="preset-row">
            <span className="field-label">기체</span>
            <div className="chips">
              {RUNNERS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`chip runner${runnerId === r.id ? " on" : ""}`}
                  onClick={() => {
                    setRunnerId(r.id);
                    commit({ ...meta, runner: r.id });
                  }}
                >
                  <RunnerTrace runner={r} />
                  <strong>{r.name}</strong>
                  <RunnerBars id={r.id} />
                  {/* 설명문은 고른 기체에만. 넷을 다 펴면 그리드가 370px 이라 주 동선인
                      Stage 가 720px 화면의 접힘 아래로 밀려난다. */}
                  {runnerId === r.id ? <em>{r.note}</em> : null}
                </button>
              ))}
            </div>
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

          <label className="toggle compact">
            <input type="checkbox" checked={meta.telemetry} onChange={() => toggleTelemetry()} />
            <span>
              <strong>기록 보내기</strong>
              <small>
                죽은 자리와 클리어를 익명으로 모아 난이도를 다듬는 데만 쓴다. 계정도 개인정보도 없다
              </small>
            </span>
          </label>

          <footer className="panel-foot">
            <AxisLegend />
            {/* 폰에는 없는 키를 누르라고 쓰지 않는다. 음소거는 실제 버튼이 맡는다. */}
            <button
              type="button"
              className="icon-btn"
              aria-pressed={muted}
              onClick={() => {
                setMuted(!muted);
                setMutedState(!muted);
              }}
            >
              {muted ? "소리 꺼짐" : "소리 켜짐"}
            </button>
          </footer>
        </section>
      ) : null}

      {screen.kind === "stages" ? (
        <section className="panel">
          <button type="button" className="link back" onClick={() => setScreen({ kind: "home" })}>
            ← 돌아가기
          </button>
          <header className="panel-head">
            <h1>Stage</h1>
            <p className="dim">같은 스테이지는 언제나 같은 코스다. 해법을 찾고, 그 해법을 관철한다.</p>
            {/*
              기록도 초록 테두리도 **현재 기체의 것**인데 화면 어디에도 그게 누구인지가
              없었다. 아래 네 칸 슬롯의 "자리가 기체를 지정한다"는 규칙도 배울 길이
              없었다 — 현재 기체의 슬롯에 링을 둘러, 홈에서 기체를 바꾸면 링이 옮겨
              가며 매핑이 스스로 가르쳐진다.
            */}
            <p className="now-runner">
              <RunnerTrace runner={runner} />
              <span>{runner.name}</span>
            </p>
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
                    const key = stageKey(runner.id, tier, no);
                    const cleared = meta.clearedStages.includes(key);
                    const byAny = clearedByAny(meta, tier, no);
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
                        <small>{cleared && best !== undefined ? `${best.toFixed(1)}초` : "—"}</small>
                        {/*
                          어느 기체로 깼는지. 작은 실루엣을 나열했더니 개수만 읽히고 어느
                          기체인지는 읽히지 않았다 — 12px 에서 네 도형이 구분되지 않는다.
                          **자리를 고정해 위치가 기체를 지정하게** 했다. 빈 칸이 곧 남은 숙제다.
                        */}
                        <span className="cleared-by">
                          {RUNNERS.map((r) => (
                            <i
                              key={r.id}
                              className={`${byAny.includes(r.id) ? "on" : ""}${
                                r.id === runner.id ? " self" : ""
                              }`}
                            />
                          ))}
                        </span>
                        {/* 자리를 고정하지 않으면 티어마다 칸 높이가 달라진다 */}
                        <em style={tries > 0 ? undefined : { visibility: "hidden" }}>{tries || 0}회</em>
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
            <li>
              <div>
                <strong>축 상한 ±{meta.axisCap} → ±3</strong>
                <small>각 축이 더 멀리까지 간다. 극단이 열린다</small>
              </div>
              <button
                type="button"
                className={meta.axisCap >= 3 ? "owned" : ""}
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
                className={meta.fullPool ? "owned" : ""}
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
        <section className="play" data-phase={phase}>
          <GameCanvas
            config={screen.config}
            onPhase={setPhase}
            onAttempt={handleAttempt}
            onRunEnd={handleRunEnd}
            onExit={exitPlay}
            onAdvance={advanceFromClear}
            onToggleHud={toggleHud}
            onSample={(s) => setFps(s.fps)}
            overrides={overrides}
            hud={meta.hud}
            record={runRecord}
          />

          {/*
            **폰에서 런을 빠져나갈 방법이 없었다.** 종료는 Escape 키 하나뿐이고,
            오버레이는 `pointer-events:none` 이며, 스테이지 사망은 자동 재시작이라
            죽어도 못 나간다 — 들어가면 73초를 완주할 때까지 갇혔다.
            오버레이 안에 두면 running 중에 사라지므로 캔버스의 형제로 항상 둔다.
          */}
          <button type="button" className="exit-btn" onClick={exitPlay} aria-label="나가기">
            ←
          </button>

          {phase === "ready" ? (
            <div className="overlay">
              <p className="eyebrow">
                {screen.config.mode === "stage"
                  ? `티어 ${screen.config.tier} · ${screen.config.stageNo}${screen.config.practice ? " · 연습" : ""}`
                  : "ENDLESS"}
              </p>
              <h2>{runner.name}</h2>
              <p className="dim">{runner.note}</p>
              {/* 겨룰 상대를 출발 전에 말해 둔다 — 주행 중에 읽게 하면 그게 곧 시선 비용이다 */}
              {runRecord > 0 ? (
                <p className="target">
                  최고{" "}
                  <strong>{screen.config.mode === "stage" ? fmtSec(runRecord) : fmtDist(runRecord)}</strong>
                </p>
              ) : null}
              <AxisLegend />
              <p className="cue">누르면 오른다</p>
            </div>
          ) : null}

          {phase === "cleared" && report ? (
            <div className="overlay">
              <h2 className="good">CLEAR</h2>
              {prev.beat && !screen.config.practice ? <p className="badge">신기록</p> : null}
              <RecordRow
                items={[
                  { label: "이번", value: fmtSec(report.sec), tone: prev.beat ? "good" : undefined },
                  {
                    label: "최고",
                    value: runRecord > 0 ? fmtSec(runRecord) : fmtSec(report.sec),
                    tone: prev.beat ? "good" : "dim"
                  },
                  { label: "시도", value: `${report.attempts}회`, tone: "dim" }
                ]}
              />
              {prev.best !== null && !prev.beat ? (
                <p className="delta">이전 최고보다 +{(report.sec - prev.best).toFixed(2)}초</p>
              ) : null}
              {prev.beat && prev.best !== null ? (
                <p className="delta good">−{(prev.best - report.sec).toFixed(2)}초 단축</p>
              ) : null}
              {prev.beat && prev.best === null ? <p className="delta good">첫 기록</p> : null}

              {/* 방금 푼 것만이 아니라 이 티어 전체를 한 줄로 — 이 기체 기준이다 */}
              <div className="tier-bests">
                <span className="field-label">
                  {runner.name} · 티어 {screen.config.tier} 최고 기록
                </span>
                <ul>
                  {Array.from({ length: STAGES_PER_TIER }, (_, i) => i + 1).map((no) => {
                    const b = meta.bestStageSec[stageKey(runner.id, screen.config.tier, no)];
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
                  : reward > 0
                    ? `+${reward} 코어`
                    : "이미 클리어한 스테이지 — 코어는 최초 1회만"}
              </p>
              {/* 문구는 결과와 같아야 한다. 이 줄이 "계속" 이던 판본은 실제로 홈으로 나갔다 */}
              <p className="cue">누르면 목록으로</p>
            </div>
          ) : null}

          {phase === "dead" && screen.config.mode === "endless" && report ? (
            <div className="overlay">
              <p className="eyebrow">ENDLESS · {runner.name}</p>
              <h2 className={prev.beat ? "good" : ""}>{fmtDist(report.distance)}</h2>
              {prev.beat ? <p className="badge">신기록</p> : null}
              <RecordRow
                items={[
                  {
                    label: "최고",
                    value: fmtDist(meta.bestDistance[runner.id] ?? report.distance),
                    tone: prev.beat ? "good" : undefined
                  },
                  { label: "이전 최고", value: prev.best === null ? "—" : fmtDist(prev.best), tone: "dim" },
                  { label: "코어", value: `+${coresForDistance(report.distance)}`, tone: "dim" }
                ]}
              />
              {prev.beat && prev.best !== null ? (
                <p className="delta good">+{Math.round(report.distance - prev.best)}m 경신</p>
              ) : null}
              {prev.beat && prev.best === null ? <p className="delta good">첫 기록</p> : null}
              {!prev.beat && prev.best !== null ? (
                <p className="delta">최고까지 {Math.round(prev.best - report.distance)}m</p>
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
