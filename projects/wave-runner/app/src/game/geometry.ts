/**
 * 순수 지오메트리 — 코스 조각 하나에서 "지금 여기 있을 수 있는가"를 답한다.
 *
 * 엔진·렌더·오토파일럿·솔버가 모두 이 층을 읽는다. 어느 것에도 의존하지 않으므로
 * 모듈 순환이 생기지 않는다(생성기가 솔버를 부르고 솔버가 지오메트리를 부른다).
 */
import { CUFF_BOT, CUFF_TOP, sample, shutterDepth } from "./sectors";
import type { CoursePiece, Gate, Sector, Tuning } from "./types";

export interface Span {
  lo: number;
  hi: number;
}

export interface Lanes {
  outerTop: number;
  outerBot: number;
  /** 분기 중이면 칸막이 상/하단. 아니면 null */
  dividerTop: number | null;
  dividerBot: number | null;
}

const GATE_OPEN_TOP = 18;
const GATE_OPEN_BOT = 82;

export function smooth(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
}

/** 통로를 중앙 기준으로 조인다. squeeze 1 이면 그대로. */
export function squeezeBounds(b: { top: number; bot: number }, squeeze: number): { top: number; bot: number } {
  if (squeeze >= 1) return b;
  const mid = (b.top + b.bot) / 2;
  const half = ((b.bot - b.top) / 2) * squeeze;
  return { top: mid - half, bot: mid + half };
}

/**
 * 게이트 구간의 통로 형상.
 *
 * 바깥 벽은 섹터의 규격 출구(CUFF)에서 넓게 벌어졌다가 다시 규격 입구로 좁혀진다 —
 * 어느 이음매에서도 갑자기 벽이 생기지 않아야 한다. 칸막이는 0에서 자라났다가
 * **게이트가 끝나기 전에 다시 사라진다.** 갈라진 길이 도로 합쳐져야 출구에서
 * 바깥벽이 좁아지는 것과 겹쳐 아바타를 끼우지 않는다.
 *
 * ## 0.7.2 — 리드인이 죽어 있었다
 *
 * `flatness.ts` 가 산개 다음으로 게이트를 지목했다(2336단위). 범인은 리드인이다.
 * 87단위(약 2초)이고 스테이지당 3번이라 한 판의 12%인데, **양 벽이 대칭으로 벌어져
 * 중앙선이 50 에 고정**이었다 — 넓고(여유가 최난점의 두 배) 곧다(기울기 0).
 * 제안을 읽는 시간이라 넓은 것은 옳지만, 곧을 이유는 없었다.
 *
 * 그래서 리드인 동안 **중앙선을 한 번 흔든다.** 폭 곡선은 손대지 않는다 — 여유는
 * `W/(2·rate)` 라 폭의 함수이므로 중앙선만 움직이면 여유가 그대로다. 0.7.1 의 산개에서
 * 폭과 주기를 갈라 측정해 확인한 규칙이고, 여기에 그대로 적용한다.
 *
 * 흔들림은 `sin(2πu)` 한 주기다. **양 끝에서 정확히 0** 이라 섹터 출구(CUFF)와
 * 칸막이가 서는 자리 어디에서도 이음매가 생기지 않고, 무엇보다 **칸막이가 설 때는
 * 중앙선이 제자리로 돌아와 있어 두 관이 대칭**이다 — 한쪽 관이 더 멀면 그건 밋밋함을
 * 없앤 것이 아니라 한쪽 길에 벌을 준 것이다.
 *
 * 방향은 게이트 시드가 정한다. 같은 스테이지 안에서 세 게이트가 같은 모양으로
 * 흔들리면 그것 자체가 다시 예측 가능한 리듬이 된다.
 */
/**
 * 리드인 중앙선 흔들림의 진폭. 기울기 최대는 `2π·AMP/리드인 길이` = 0.29 이고,
 * 기체의 하강 한계 최악 0.397 아래다(`sectors.ts` 의 `CorridorSpec` 주석).
 */
const LEAD_SWING = 4;
export function gateLanes(gate: Gate, x: number, t: Tuning): Lanes {
  const span = Math.max(1e-6, gate.endX - gate.startX);
  let top: number;
  let bot: number;
  if (x < gate.startX) {
    const u = (x - gate.leadInX) / Math.max(1e-6, gate.startX - gate.leadInX);
    const w = smooth(u);
    top = CUFF_TOP + (GATE_OPEN_TOP - CUFF_TOP) * w;
    bot = CUFF_BOT + (GATE_OPEN_BOT - CUFF_BOT) * w;
    // 폭은 그대로 두고 중앙선만 한 주기 흔든다 — 양 끝에서 0 이라 이음매가 생기지 않는다.
    const swing = LEAD_SWING * (gate.seed & 1 ? 1 : -1) * Math.sin(u * Math.PI * 2);
    top += swing;
    bot += swing;
  } else {
    const closing = smooth(((x - gate.startX) / span - 0.75) / 0.25);
    top = GATE_OPEN_TOP + (CUFF_TOP - GATE_OPEN_TOP) * closing;
    bot = GATE_OPEN_BOT + (CUFF_BOT - GATE_OPEN_BOT) * closing;
  }
  const outer = { outerTop: top, outerBot: bot };
  if (x < gate.startX) return { ...outer, dividerTop: null, dividerBot: null };

  const u = (x - gate.startX) / span;
  const grow = smooth(u / 0.35);
  const fade = 1 - smooth((u - 0.7) / 0.3);
  const d = t.gateDivider * Math.min(grow, fade);
  if (d <= 1e-6) return { ...outer, dividerTop: null, dividerBot: null };
  return { ...outer, dividerTop: 50 - d / 2, dividerBot: 50 + d / 2 };
}

// ── 구간 집합 연산 ────────────────────────────────────────────

export function subtract(spans: Span[], lo: number, hi: number): Span[] {
  const out: Span[] = [];
  for (const s of spans) {
    if (hi <= s.lo || lo >= s.hi) {
      out.push(s);
      continue;
    }
    if (lo > s.lo) out.push({ lo: s.lo, hi: lo });
    if (hi < s.hi) out.push({ lo: hi, hi: s.hi });
  }
  return out;
}

export function intersect(a: Span[], b: Span[]): Span[] {
  const out: Span[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i].lo, b[j].lo);
    const hi = Math.min(a[i].hi, b[j].hi);
    if (hi > lo) out.push({ lo, hi });
    if (a[i].hi < b[j].hi) i += 1;
    else j += 1;
  }
  return out;
}

/** 정렬된 두 집합의 합집합. 맞닿거나 겹치는 구간은 합친다. */
export function union(a: Span[], b: Span[]): Span[] {
  const all = [...a, ...b].sort((x, y) => x.lo - y.lo);
  const out: Span[] = [];
  for (const s of all) {
    const last = out[out.length - 1];
    if (last && s.lo <= last.hi + 1e-9) last.hi = Math.max(last.hi, s.hi);
    else out.push({ lo: s.lo, hi: s.hi });
  }
  return out;
}

export function shift(spans: Span[], delta: number): Span[] {
  return spans.map((s) => ({ lo: s.lo + delta, hi: s.hi + delta }));
}

export function measure(spans: Span[]): number {
  let m = 0;
  for (const s of spans) m += s.hi - s.lo;
  return m;
}

export function contains(spans: Span[], y: number): boolean {
  for (const s of spans) if (y >= s.lo && y <= s.hi) return true;
  return false;
}

// ── 조각별 자유 구간 ──────────────────────────────────────────

/** 섹터 로컬 좌표에서, 시각 time 에 반지름 r 인 원이 놓일 수 있는 y 구간들. */
export function sectorFreeSpans(
  sector: Sector,
  localX: number,
  r: number,
  time: number,
  squeeze = 1
): Span[] {
  const { top, bot } = squeezeBounds(sample(sector.nodes, localX), squeeze);
  let spans: Span[] = [{ lo: top + r, hi: bot - r }];
  if (spans[0].hi <= spans[0].lo) return [];

  for (const b of sector.blocks) {
    if (localX < b.x - r || localX > b.x + b.w + r) continue;
    spans = subtract(spans, b.y - r, b.y + b.h + r);
  }
  for (const s of sector.shutters) {
    if (localX < s.x - r || localX > s.x + s.w + r) continue;
    const depth = shutterDepth(s, time);
    if (depth <= 0) continue;
    if (s.side === "top") spans = subtract(spans, top - r, top + depth + r);
    else spans = subtract(spans, bot - depth - r, bot + r);
  }
  return spans.filter((s) => s.hi > s.lo);
}

/** 게이트 구간의 자유 구간. lane 을 주면 그 관으로만 제한한다. */
export function gateFreeSpans(
  gate: Gate,
  x: number,
  r: number,
  t: Tuning,
  lane?: "top" | "bot"
): Span[] {
  const l = gateLanes(gate, x, t);
  let top = l.outerTop;
  let bot = l.outerBot;
  if (l.dividerTop !== null && l.dividerBot !== null) {
    if (lane === "bot") top = l.dividerBot;
    else if (lane === "top") bot = l.dividerTop;
    else {
      const upper = { lo: l.outerTop + r, hi: l.dividerTop - r };
      const lower = { lo: l.dividerBot + r, hi: l.outerBot - r };
      return [upper, lower].filter((s) => s.hi > s.lo);
    }
  }
  const span = { lo: top + r, hi: bot - r };
  return span.hi > span.lo ? [span] : [];
}

/** 코스 조각 하나의 자유 구간. 솔버와 오토파일럿이 같은 함수를 쓴다. */
export function pieceFreeSpans(
  piece: CoursePiece,
  x: number,
  r: number,
  time: number,
  t: Tuning,
  lane?: "top" | "bot"
): Span[] {
  if (piece.kind === "sector" && piece.sector) {
    return sectorFreeSpans(piece.sector, x - piece.startX, r, time, piece.squeeze ?? 1);
  }
  if (piece.kind === "gate" && piece.gate) {
    return gateFreeSpans(piece.gate, x, r, t, lane);
  }
  return [];
}
