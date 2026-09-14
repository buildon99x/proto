const KEY = "wave-runner/progress/v1";

export interface Progress {
  /** 클리어한 스테이지 id */
  cleared: number[];
  /** 스테이지별 최고 기록(초) */
  bestSec: Record<number, number>;
  /** 스테이지별 누적 시도 — 1단계 kill criterion 관찰용 */
  attempts: Record<number, number>;
}

const EMPTY: Progress = { cleared: [], bestSec: {}, attempts: {} };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared : [],
      bestSec: parsed.bestSec ?? {},
      attempts: parsed.attempts ?? {}
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // 저장 불가(프라이빗 모드 등)여도 플레이는 계속된다.
  }
}

export function recordClear(p: Progress, stageId: number, sec: number): Progress {
  const cleared = p.cleared.includes(stageId) ? p.cleared : [...p.cleared, stageId];
  const prev = p.bestSec[stageId];
  const next: Progress = {
    cleared,
    bestSec: { ...p.bestSec, [stageId]: prev === undefined ? sec : Math.min(prev, sec) },
    attempts: p.attempts
  };
  saveProgress(next);
  return next;
}

export function recordAttempt(p: Progress, stageId: number): Progress {
  const next: Progress = {
    ...p,
    attempts: { ...p.attempts, [stageId]: (p.attempts[stageId] ?? 0) + 1 }
  };
  saveProgress(next);
  return next;
}
