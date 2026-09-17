const UNITS: [number, string][] = [
  [1e12, "조"],
  [1e8, "억"],
  [1e4, "만"]
];

/** 한글 단위 표기. 1,234,000 → "123.4만" */
export function won(value: number): string {
  const v = Math.floor(value);
  if (v < 10_000) return v.toLocaleString("ko-KR");
  for (const [unit, label] of UNITS) {
    if (v >= unit) {
      const scaled = v / unit;
      const digits = scaled >= 100 ? 0 : 1;
      return `${scaled.toFixed(digits)}${label}`;
    }
  }
  return v.toLocaleString("ko-KR");
}

export function wonSuffixed(value: number): string {
  return `${won(value)} ₩`;
}

export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${sec}초`;
  return `${sec}초`;
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function percent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** 초당 속도처럼 작은 값이 섞이는 수치. 100 미만은 소수 1자리까지 보여 준다 */
export function rate(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value < 100) return value.toFixed(1);
  return won(value);
}
