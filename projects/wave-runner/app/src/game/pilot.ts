/**
 * 오토파일럿 — 검증과 자동 플레이테스트가 함께 쓴다.
 *
 * 통로 중앙이 아니라 **실제로 비어 있는 틈**을 향하고, 한 점이 아니라 여러 시점을
 * 함께 본다 — 이 게임의 숙련이 아바타가 아니라 2~3개 앞을 보는 데 있는 것과 같은 이유다.
 *
 * 핵심은 좌표계다. 여러 시점의 자유 구간을 **절대 y 로 교집합하면 안 된다** —
 * 경사진 통로는 시점마다 통로 자체가 다른 높이에 있으므로 교집합이 비거나
 * 엉뚱한 자리를 가리킨다. 그래서 통로 상대 좌표 u = (y − top) / (bot − top) 에서
 * 교집합한 뒤, 가까운 시점의 통로로 되돌려 목표 y 를 낸다.
 *
 * 사람처럼 잘 하기 위한 것이 아니라 코스가 통과 가능한지를 기계적으로 묻기 위한 것이다.
 */
import { pieceAt } from "./course";
import { gateLanes, pieceSqueeze, squeezeBounds } from "./engine";
import type { GameState } from "./engine";
import { sample, shutterDepth } from "./sectors";
import type { Sector } from "./types";

interface Span {
  lo: number;
  hi: number;
}

interface Window {
  /** 통로(또는 선택한 관)의 상/하 경계 */
  top: number;
  bot: number;
  /** 반지름을 뺀 뒤의 자유 구간, 통로 상대 좌표 */
  free: Span[];
}

function subtract(spans: Span[], lo: number, hi: number): Span[] {
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

function intersect(a: Span[], b: Span[]): Span[] {
  const out: Span[] = [];
  for (const x of a) {
    for (const y of b) {
      const lo = Math.max(x.lo, y.lo);
      const hi = Math.min(x.hi, y.hi);
      if (hi > lo) out.push({ lo, hi });
    }
  }
  return out;
}

/** localX 지점에서 시각 time 에 반지름 r 인 원이 놓일 수 있는 y 구간들. */
export function freeSpans(sector: Sector, localX: number, r: number, time: number, squeeze = 1): Span[] {
  const { top, bot } = squeezeBounds(sample(sector.nodes, localX), squeeze);
  let spans: Span[] = [{ lo: top + r, hi: bot - r }];
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

function windowAt(state: GameState, dt: number, lane: "top" | "bot"): Window | null {
  const aheadX = state.x + state.tuning.speed * dt;
  const piece = pieceAt(state.course, aheadX);
  if (!piece) return null;
  const r = state.tuning.radius;

  if (piece.kind === "gate" && piece.gate) {
    const l = gateLanes(piece.gate, aheadX, state.tuning);
    let top = l.outerTop;
    let bot = l.outerBot;
    if (l.dividerTop !== null && l.dividerBot !== null) {
      if (lane === "bot") top = l.dividerBot;
      else bot = l.dividerTop;
    } else {
      // 리드인 구간 — 칸막이는 아직 없지만 **지금 한쪽으로 붙어 둬야** 한다.
      // 칸막이는 통로 한가운데에서 자라나므로, 중앙에 머물다 갈라짐을 맞으면 늦다.
      if (lane === "bot") top = 50;
      else bot = 50;
    }
    if (bot - top <= 2 * r) return null;
    return { top, bot, free: [{ lo: r / (bot - top), hi: 1 - r / (bot - top) }] };
  }

  if (piece.kind !== "sector" || !piece.sector) return null;
  const localX = aheadX - piece.startX;
  const squeeze = pieceSqueeze(piece, state.tuning);
  const { top, bot } = squeezeBounds(sample(piece.sector.nodes, localX), squeeze);
  const height = bot - top;
  if (height <= 2 * r) return null;
  const spans = freeSpans(piece.sector, localX, r, state.elapsed + dt, squeeze);
  return { top, bot, free: spans.map((s) => ({ lo: (s.lo - top) / height, hi: (s.hi - top) / height })) };
}

function pickNearest(spans: Span[], u: number): number {
  let best = spans[0];
  let bestCost = Number.POSITIVE_INFINITY;
  for (const s of spans) {
    const mid = (s.lo + s.hi) / 2;
    // 가까운 쪽을 우선하되 지나치게 좁은 틈은 피한다.
    const cost = Math.abs(mid - u) - (s.hi - s.lo) * 1.2;
    if (cost < bestCost) {
      bestCost = cost;
      best = s;
    }
  }
  return (best.lo + best.hi) / 2;
}

/** 여러 시점을 통로 상대 좌표에서 교집합해 목표 y 를 낸다. */
export function targetY(state: GameState, lookaheadSec: number, lane: "top" | "bot"): number {
  const near = windowAt(state, lookaheadSec, lane);
  if (!near || near.free.length === 0) return state.y;

  let merged = near.free;
  for (const mult of [2.2, 3.6]) {
    const w = windowAt(state, lookaheadSec * mult, lane);
    if (!w || w.free.length === 0) break;
    const next = intersect(merged, w.free);
    if (next.length === 0) break;
    merged = next;
  }

  const height = near.bot - near.top;
  const u = Math.max(0, Math.min(1, (state.y - near.top) / height));
  return near.top + pickNearest(merged, u) * height;
}
