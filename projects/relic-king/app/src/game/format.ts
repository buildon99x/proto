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

// ── 조사 ──────────────────────────────────────────────────

type JosaPair = "은는" | "이가" | "을를" | "와과" | "로으로";

const JOSA: Record<JosaPair, [withFinal: string, withoutFinal: string]> = {
  은는: ["은", "는"],
  이가: ["이", "가"],
  을를: ["을", "를"],
  와과: ["과", "와"],
  로으로: ["으로", "로"]
};

/** 숫자를 읽었을 때 받침이 남는가 — 0(영) 1(일) 3(삼) 6(육) 7(칠) 8(팔) */
const DIGIT_HAS_FINAL: Record<string, boolean> = {
  "0": true, "1": true, "2": false, "3": true, "4": false,
  "5": false, "6": true, "7": true, "8": true, "9": false
};

/**
 * 마지막으로 **읽는** 글자의 종성 코드. 받침 없으면 0, 판정 불가면 null.
 * 끝의 괄호·따옴표·마침표는 걷어낸다 — "금동대향로 (국보 287호)" 는 '호'로 읽힌다.
 */
function finalConsonant(word: string): number | null {
  const cleaned = word.replace(/[^가-힣a-zA-Z0-9]+$/, "");
  const last = cleaned.slice(-1);
  if (!last) return null;
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
  if (last >= "0" && last <= "9") return DIGIT_HAS_FINAL[last] ? 1 : 0;
  return null;
}

/**
 * 앞말의 받침에 맞는 조사를 고른다. 판정할 수 없으면 받침 없는 형태를 쓴다.
 * "이(가)" 같은 병기는 게임 로그가 사람 이름과 유물 이름을 그대로 끼워 넣기 때문에
 * 눈에 계속 걸린다 — "L. 로시이(가)".
 */
export function josa(word: string, pair: JosaPair): string {
  const final = finalConsonant(word);
  const [withFinal, withoutFinal] = JOSA[pair];
  if (final === null) return withoutFinal;
  // '로/으로'는 ㄹ 받침(종성 8)일 때 받침 없는 쪽을 따른다
  if (pair === "로으로" && final === 8) return withoutFinal;
  return final === 0 ? withoutFinal : withFinal;
}

/** 앞말과 조사를 붙여서 돌려준다. `withJosa("신라 금관", "을를")` → "신라 금관을" */
export function withJosa(word: string, pair: JosaPair): string {
  return word + josa(word, pair);
}
