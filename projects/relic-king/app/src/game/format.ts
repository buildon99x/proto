const UNITS: [number, string][] = [
  [1e12, "조"],
  [1e8, "억"],
  [1e4, "만"]
];

/** 한글 단위 표기(통화 기호 없음). 1,234,000 → "123.4만" */
export function amount(value: number): string {
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

/**
 * 금액 표기. 게임 내 화폐 단위는 **미국 달러**다 — 흔함(T0) 유물 한 점이
 * 약 1만 달러(`TIER_VALUE[0]` = 12,000)인 것이 기준선이다. 자릿수는 한국어
 * 독자가 바로 읽는 만·억·조 단위를 그대로 쓴다. 12,000 → "$1.2만"
 */
export function usd(value: number): string {
  return `$${amount(value)}`;
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

/**
 * 배지·칩처럼 폭이 좁은 자리에 쓰는 남은 시간(notes/ux-v02.md §7 "L2 시한부 뱃지").
 * `clock()`은 m:ss라 72시간짜리 회수 기한이 "4320:00"이 돼 읽을 수 없다.
 */
export function countdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s >= 3600) return `${Math.ceil(s / 3600)}h`;
  if (s >= 60) return `${Math.ceil(s / 60)}m`;
  return `${s}s`;
}

export function percent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** 초당 속도처럼 작은 값이 섞이는 수치. 100 미만은 소수 1자리까지 보여 준다 */
export function rate(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value < 100) return value.toFixed(1);
  return amount(value);
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
