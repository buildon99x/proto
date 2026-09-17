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
import { resolve } from "./axes";
import { pieceAt } from "./course";
import { gateLanes, squeezeBounds } from "./engine";
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
  const squeeze = piece.squeeze ?? 1;
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

/**
 * 조준점까지의 **세로 거리**. 시간이 아니라 거리인 것이 요점이다.
 *
 * 0.7.3 이전에는 호출부마다 `LOOKAHEAD = 0.14`(초)를 들고 있었다 — 11개 파일에 같은
 * 숫자가 복사돼 있었고, 그보다 나쁘게 **기체마다 다른 뜻이었다.** 이 조종기는 조준점을
 * 향해 뱅뱅으로 붙으므로 지나치는 양이 `수직 속도 × 조준 시간` 이다. 시간을 고정하면
 * 0.14초에 세로로 둔각은 4.8단위, 예봉은 7.8단위를 간다 — **빠른 기체일수록 조준기가
 * 나쁘게 튜닝된 채로 측정되고, 그 핸디캡이 그 기체의 "성격" 으로 보고된다.**
 *
 * 실제로 예봉은 12스테이지 중 3개를 8경로 전부 실패하고 있었는데, 같은 코스를 솔버는
 * 93~121ms 여유로 전부 통과 가능하다고 판정했다. 조준 거리로 바꾸니 네 기체 모두
 * 벽이 0 이 되고 클리어가 258/384 → 338/384 로 올랐다.
 *
 * 값은 측정으로 정했고, **무엇을 기준으로 훑느냐가 답을 바꾼다.** 처음에는 지연 0 에서의
 * 클리어 수로 훑어 3.5 를 골랐는데, 그 값에서는 조준점이 너무 가까워 선행이 사라지고
 * **지연 내성이 무너진다**(여유 중앙값 30/30/40/40ms). 등급표가 피커에 내보내는 머리
 * 숫자가 지연 내성이므로 그쪽으로 다시 훑었다.
 *
 * | 조준 거리 | 표준 | 둔각 | 예봉 | 환 | 벽 |
 * |---|---|---|---|---|---|
 * | 3.5 | 30 | 30 | 40 | 40 | 0 |
 * | 4.5 | 70 | 40 | 70 | 70 | 0 |
 * | **5.0** | 70 | 40 | 90 | 70 | **0** |
 * | 5.5 | 70 | 70 | 90 | 60 | 둔각 1 |
 * | 7.0 | 100 | 80 | 100 | 70 | 표준 1 · 둔각 3 |
 *
 * **벽 0 을 지키면서 여유 합이 가장 큰 5.0** 을 골랐다. 아바타 반지름(1.6)의 약 3배다.
 * 벽을 먼저 보는 이유는 그것이 코스를 못 깬다는 뜻이고, 솔버가 통과 가능하다고 한
 * 코스에서 벽이 나오면 그건 기체의 성격이 아니라 계측기의 고장이기 때문이다.
 *
 * **이것은 사람의 반응 시간 모델이 아니다.** 지연은 호출부가 따로 준다
 * (`runner-grades.ts` 의 `latencySec`). 여기서 정하는 것은 조종기가 어디를 겨냥하느냐뿐이고,
 * 그래서 기체 사이에 공평해야 한다.
 */
const AIM_DIST = 5.0;

/** 지금 이 기체·이 빌드에서 `AIM_DIST` 만큼 세로로 가는 데 걸리는 시간. */
export function aimLookahead(state: GameState): number {
  const r = resolve(state.build, state.base);
  return AIM_DIST / Math.max(1e-6, Math.max(r.riseRate, r.fallRate));
}

/**
 * 여러 시점을 통로 상대 좌표에서 교집합해 목표 y 를 낸다.
 *
 * `lookaheadSec` 를 주지 않으면 `aimLookahead` 가 정한다 — **호출부는 그렇게 쓰는 것이
 * 기본이다.** 명시값은 선행 시간 자체를 훑어 보는 실험에만 쓴다.
 */
export function targetY(state: GameState, lane: "top" | "bot", lookaheadSec?: number): number {
  const look = lookaheadSec ?? aimLookahead(state);
  const near = windowAt(state, look, lane);
  if (!near || near.free.length === 0) return state.y;

  let merged = near.free;
  for (const mult of [2.2, 3.6]) {
    const w = windowAt(state, look * mult, lane);
    if (!w || w.free.length === 0) break;
    const next = intersect(merged, w.free);
    if (next.length === 0) break;
    merged = next;
  }

  const height = near.bot - near.top;
  const u = Math.max(0, Math.min(1, (state.y - near.top) / height));
  return near.top + pickNearest(merged, u) * height;
}
