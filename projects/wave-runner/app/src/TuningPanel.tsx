import { computeView } from "./game/camera";
import { BASE_TUNING } from "./game/engine";
import type { Tuning } from "./game/types";

interface Props {
  overrides: Partial<Tuning>;
  onChange: (next: Partial<Tuning>) => void;
  onReset: () => void;
  fps: number;
}

interface Row {
  key: keyof Tuning;
  label: string;
  min: number;
  max: number;
  step: number;
  note: string;
}

/**
 * 개발 전용 계측기(T 로 토글). 본 플레이에서는 숨어 있다.
 *
 * 여기서 조정하는 것은 **축 눈금 0 의 기준값**이다. 런 안의 빌드는 이 기준값을
 * 표에 따라 밀고 당길 뿐이므로, 기준이 바뀌면 전 구간의 감각이 함께 움직인다.
 */
const ROWS: Row[] = [
  { key: "slope", label: "각도 기준", min: 0.5, max: 1.8, step: 0.02, note: "1.0 = 45°" },
  { key: "speed", label: "속도 기준", min: 24, max: 80, step: 1, note: "선행 가시 시간에 직결" },
  { key: "bias", label: "편향 기준", min: -0.4, max: 0.4, step: 0.02, note: "+면 상승이 빠르고 하강이 느리다" },
  { key: "radius", label: "크기", min: 0.8, max: 3.2, step: 0.1, note: "히트박스 반지름" },
  { key: "inertiaMs", label: "관성", min: 0, max: 200, step: 5, note: "0 = 즉시 반응" }
];

export function TuningPanel({ overrides, onChange, onReset, fps }: Props) {
  const merged: Tuning = { ...BASE_TUNING, ...overrides };
  const view = computeView(window.innerWidth, window.innerHeight, merged);
  const lookaheadOk = view.lookaheadSec >= merged.lookaheadMinSec;

  return (
    <aside className="tuning">
      <header>
        <strong>튜닝</strong>
        <span className="tuning-hint">T 로 닫기</span>
      </header>

      {ROWS.map((row) => (
        <label key={row.key} className="tuning-row">
          <span className="tuning-label">
            {row.label}
            <em>{merged[row.key] as number}</em>
          </span>
          <input
            type="range"
            min={row.min}
            max={row.max}
            step={row.step}
            value={merged[row.key] as number}
            onChange={(e) => onChange({ ...overrides, [row.key]: Number(e.target.value) })}
          />
          <small>{row.note}</small>
        </label>
      ))}

      <dl className="tuning-readout">
        <div>
          <dt>선행 가시</dt>
          <dd className={lookaheadOk ? "ok" : "bad"}>
            {view.lookaheadSec.toFixed(2)}s / 최소 {merged.lookaheadMinSec}s
          </dd>
        </div>
        <div>
          <dt>FPS</dt>
          <dd className={fps >= 55 ? "ok" : "bad"}>{fps.toFixed(0)}</dd>
        </div>
      </dl>

      <button type="button" onClick={onReset}>
        기본값으로
      </button>
    </aside>
  );
}
