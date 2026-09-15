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

/** 월드 상/하한. 통로를 벌릴 때 여기서 멈춘다. */
const WORLD_TOP = 0;
const WORLD_BOT = 100;

/**
 * 통로를 중앙 기준으로 조이거나 **벌린다**. squeeze 1 이면 그대로.
 *
 * 1 미만은 Endless 후반의 난이도 천장(`squeezeFor`), 1 초과는 반복 완화
 * (`relief.ts`)가 쓴다. 어느 쪽이든 **중심선은 움직이지 않는다** — 그래서
 * 외운 주행선이 그대로 살아 있고 바뀌는 것은 벽까지의 여백뿐이다.
 */
export function squeezeBounds(b: { top: number; bot: number }, squeeze: number): { top: number; bot: number } {
  if (squeeze === 1) return b;
  const mid = (b.top + b.bot) / 2;
  const half = ((b.bot - b.top) / 2) * squeeze;
  return { top: Math.max(WORLD_TOP, mid - half), bot: Math.min(WORLD_BOT, mid + half) };
}

/**
 * 이 조각에 실제로 걸리는 통로 배율.
 *
 * 코스가 들고 있는 조임(Endless 램프)과 런이 들고 있는 완화(반복 완화)는
 * 서로 다른 축이므로 곱한다. 엔진·솔버·렌더·오토파일럿이 전부 이 하나를 읽어야
 * "솔버는 통과 가능하다는데 실제로는 죽는다" 가 생기지 않는다.
 */
export function pieceSqueeze(piece: CoursePiece, t: Tuning): number {
  return (piece.squeeze ?? 1) * (t.relief ?? 1);
}

/**
 * 게이트 구간의 통로 형상.
 *
 * 바깥 벽은 섹터의 규격 출구(CUFF)에서 넓게 벌어졌다가 다시 규격 입구로 좁혀진다 —
 * 어느 이음매에서도 갑자기 벽이 생기지 않아야 한다. 칸막이는 0에서 자라났다가
 * **게이트가 끝나기 전에 다시 사라진다.** 갈라진 길이 도로 합쳐져야 출구에서
 * 바깥벽이 좁아지는 것과 겹쳐 아바타를 끼우지 않는다.
 */
export function gateLanes(gate: Gate, x: number, t: Tuning): Lanes {
  const span = Math.max(1e-6, gate.endX - gate.startX);
  let top: number;
  let bot: number;
  if (x < gate.startX) {
    const w = smooth((x - gate.leadInX) / Math.max(1e-6, gate.startX - gate.leadInX));
    top = CUFF_TOP + (GATE_OPEN_TOP - CUFF_TOP) * w;
    bot = CUFF_BOT + (GATE_OPEN_BOT - CUFF_BOT) * w;
  } else {
    const closing = smooth(((x - gate.startX) / span - 0.75) / 0.25);
    top = GATE_OPEN_TOP + (CUFF_TOP - GATE_OPEN_TOP) * closing;
    bot = GATE_OPEN_BOT + (CUFF_BOT - GATE_OPEN_BOT) * closing;
  }
  // 완화는 게이트의 바깥 벽에도 똑같이 걸어야 한다. 섹터만 벌리면 규격 입구
  // (CUFF)에서 벽이 어긋나 이음매에 없던 턱이 생긴다 — 2단계에서 이미 낸 버그다.
  const widened = squeezeBounds({ top, bot }, t.relief ?? 1);
  top = widened.top;
  bot = widened.bot;
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
    return sectorFreeSpans(piece.sector, x - piece.startX, r, time, pieceSqueeze(piece, t));
  }
  if (piece.kind === "gate" && piece.gate) {
    return gateFreeSpans(piece.gate, x, r, t, lane);
  }
  return [];
}
