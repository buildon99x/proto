import { computeView } from "./game/camera";
import type { Tuning } from "./game/types";

interface Props {
  tuning: Tuning;
  onChange: (next: Tuning) => void;
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
 * 개발 전용 패널. 본 플레이에서는 숨어 있다(T 로 토글).
 *
 * 존재 이유는 하나다 — core-loop.md §12 ①의 미해결 쟁점, 즉
 * "크기 축에 하방이 없으니 관성으로 바꿔야 하는가"를 문서가 아니라
 * 손끝으로 판정하기 위한 계측기다. 각도·속도·관성·크기를 실시간으로
 * 바꿔가며 어느 축이 진짜 양날인지 비교한다.
 */
const ROWS: Row[] = [
  { key: "slope", label: "각도", min: 0.4, max: 2.0, step: 0.05, note: "대각 기울기. 1.0 = 45°" },
  { key: "speed", label: "속도", min: 20, max: 90, step: 1, note: "전진 속도. 선행 가시 시간에 직결" },
  { key: "inertiaMs", label: "관성", min: 0, max: 220, step: 5, note: "0 = 즉시 반응(원작). 크면 부드럽고 늦다" },
  { key: "radius", label: "크기", min: 0.8, max: 3.2, step: 0.1, note: "히트박스 반지름" }
];

export function TuningPanel({ tuning, onChange, onReset, fps }: Props) {
  const view = computeView(window.innerWidth, window.innerHeight, tuning);
  const lookaheadOk = view.lookaheadSec >= tuning.lookaheadMinSec;

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
            <em>{tuning[row.key]}</em>
          </span>
          <input
            type="range"
            min={row.min}
            max={row.max}
            step={row.step}
            value={tuning[row.key] as number}
            onChange={(e) => onChange({ ...tuning, [row.key]: Number(e.target.value) })}
          />
          <small>{row.note}</small>
        </label>
      ))}

      <dl className="tuning-readout">
        <div>
          <dt>선행 가시</dt>
          <dd className={lookaheadOk ? "ok" : "bad"}>
            {view.lookaheadSec.toFixed(2)}s / 최소 {tuning.lookaheadMinSec}s
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
