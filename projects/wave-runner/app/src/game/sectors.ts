import type { Block, CorridorNode, Sector, SectorType, Shutter } from "./types";

const H = 100;

/** 모든 섹터의 월드 길이. 기본 속도(42)에서 약 13초. */
export const SECTOR_LEN = 460;

/**
 * 모든 섹터는 같은 입구·출구로 시작하고 끝난다.
 * 그래야 섹터와 게이트를 어떤 순서로 이어 붙여도 이음매에서 벽이 생기지 않는다.
 */
export const CUFF_LEN = 56;
export const CUFF_TOP = 30;
export const CUFF_BOT = 70;

// ── 형상 헬퍼 ────────────────────────────────────────────────

function run(
  x0: number,
  len: number,
  center: (u: number) => number,
  width: (u: number) => number,
  step = 6
): CorridorNode[] {
  const nodes: CorridorNode[] = [];
  const count = Math.max(2, Math.round(len / step));
  for (let i = 0; i <= count; i += 1) {
    const u = i / count;
    const c = center(u);
    const w = width(u);
    nodes.push({ x: x0 + len * u, top: c - w / 2, bot: c + w / 2 });
  }
  return nodes;
}

const flat = (v: number) => () => v;
const lerp = (a: number, b: number) => (u: number) => a + (b - a) * u;
const wave = (mid: number, amp: number, cycles: number, phase = 0) => (u: number) =>
  mid + amp * Math.sin((u * cycles + phase) * Math.PI * 2);

/**
 * 톱니형 계단 — 협곡의 골격.
 *
 * 램프의 기울기 dy/dx 를 직접 지정한다. 아바타가 낼 수 있는 최대 기울기는
 * 각도 계수와 같으므로, 램프를 각도 −2 로는 따라잡을 수 없고 +2 로는
 * 여유 있는 값으로 두면 **각도 축이 협곡에서만 유리해진다.**
 */
function steps(mid: number, amp: number, count: number, rampSlope: number, len: number) {
  const stepLen = len / count;
  const rampLen = Math.min(stepLen * 0.9, (2 * amp) / rampSlope);
  const rampFrac = rampLen / stepLen;
  return (u: number) => {
    const p = u * count;
    const i = Math.floor(p);
    const f = p - i;
    const dir = i % 2 === 0 ? 1 : -1;
    const eased = Math.max(0, Math.min(1, (f - (1 - rampFrac) / 2) / rampFrac));
    const from = dir > 0 ? -amp : amp;
    const to = dir > 0 ? amp : -amp;
    return mid + (from + (to - from) * eased);
  };
}

/** 결정적 의사난수 — 산개 배치를 재현 가능하게 둔다. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 양 끝 CUFF_LEN 구간을 규격 입구로 매끄럽게 물린다. */
function withCuffs(nodes: CorridorNode[]): CorridorNode[] {
  const blend = (n: CorridorNode, w: number): CorridorNode => ({
    x: n.x,
    top: CUFF_TOP + (n.top - CUFF_TOP) * w,
    bot: CUFF_BOT + (n.bot - CUFF_BOT) * w
  });
  return nodes.map((n) => {
    const fromStart = n.x;
    const fromEnd = SECTOR_LEN - n.x;
    const w = Math.max(0, Math.min(1, Math.min(fromStart, fromEnd) / CUFF_LEN));
    const eased = w * w * (3 - 2 * w);
    return blend(n, eased);
  });
}

export function sample(nodes: CorridorNode[], x: number): { top: number; bot: number } {
  if (nodes.length === 0) return { top: 0, bot: H };
  if (x <= nodes[0].x) return { top: nodes[0].top, bot: nodes[0].bot };
  const last = nodes[nodes.length - 1];
  if (x >= last.x) return { top: last.top, bot: last.bot };

  let lo = 0;
  let hi = nodes.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (nodes[mid].x <= x) lo = mid;
    else hi = mid;
  }
  const a = nodes[lo];
  const b = nodes[hi];
  const u = (x - a.x) / (b.x - a.x);
  return { top: a.top + (b.top - a.top) * u, bot: a.bot + (b.bot - a.bot) * u };
}

/**
 * 시각 t 에서 셔터가 벽에서 뻗어 나온 깊이.
 * 열림→닫힘 전환은 짧은 램프를 거친다 — 순간적으로 나타나는 벽은 불공정한 죽음이 된다.
 */
export function shutterDepth(s: Shutter, t: number): number {
  const p = (((t / s.period + s.phase) % 1) + 1) % 1;
  const ramp = 0.12;
  if (p < s.openFrac - ramp) return 0;
  if (p < s.openFrac) return s.depth * ((p - (s.openFrac - ramp)) / ramp);
  if (p < 1 - ramp) return s.depth;
  return s.depth * ((1 - p) / ramp);
}

// ── 섹터 제작 ────────────────────────────────────────────────

/** 협곡의 형상 파라미터. 튜닝 도구가 이 표를 스윕한다. */
export interface GorgeSpec {
  /** 중앙선이 위아래로 흔들리는 폭 */
  amp: number;
  /** 계단 수 */
  count: number;
  /** 통로 폭 */
  width: number;
  /** 램프의 dy/dx. 기체가 낼 수 있는 dy/dx 가 이보다 작으면 램프에서 뒤처진다 */
  rampSlope: number;
}

/**
 * 협곡 3종의 형상.
 *
 * **램프 기울기는 기체가 낼 수 있는 값보다 크게 잡아도 된다** — 뒤처진 만큼을 통로
 * 폭이 흡수하기 때문이다. 램프 하나에서 벌어지는 거리는 `(rampSlope − 기체 dy/dx) ×
 * 램프 길이` 이고, 이것이 통로의 여유 폭보다 작으면 통과한다. 협곡이 각도를 묻는
 * 방식이 바로 이 뒤처짐이다.
 *
 * 0.5.3 에서 이 관계를 처음 계산에 넣었다. 그전 `gorge-3`(폭 22 · 램프 1.15)은
 * 뒤처짐이 폭을 넘어서, **도달 가능한 19개 빌드 중 5개가 어떤 조작으로도 통과할 수
 * 없었다.** 묻는 것이 아니라 막는 섹터였다. `gorge-2` 도 ±3 에서 최소 여유가 10ms 라
 * 사람에게는 사실상 같은 문제였다.
 *
 * 그래서 **진폭은 고정하고 램프 기울기와 계단 수로만 난이도를 올린다.** 뒤처짐을
 * 흡수할 폭은 넉넉히 두되(30~32) 램프를 가파르게 해서 각도를 묻는다 — 그러면
 * 낮은 각도가 벌을 받되 죽지는 않는다. 계단 수가 늘어나는 것은 같은 질문을 더 여러 번
 * 묻는다는 뜻이다.
 *
 * 부수 효과로 협곡이 처음으로 사양대로 각도를 묻게 됐다. 그전 `gorge-1` 은 각도를
 * 올려도 여유가 오히려 8ms 줄었다 — 통로가 충분히 넓어 램프를 따라잡을 필요가 없었고,
 * 큰 각도는 오버슈트만 키웠기 때문이다. 지금은 셋 다 각도가 오를수록 여유가 늘고
 * (+60 / +84 / +104ms) 어려운 협곡일수록 더 강하게 묻는다.
 */
export const GORGE_SPEC: Record<number, GorgeSpec> = {
  1: { amp: 17, count: 3, width: 32, rampSlope: 1.05 },
  2: { amp: 17, count: 5, width: 30, rampSlope: 1.15 },
  3: { amp: 17, count: 7, width: 30, rampSlope: 1.35 }
};

/**
 * 협곡 — 중앙선이 빠르게 오르내린다. 계단을 따라잡으려면 높은 각도가 필요하고,
 * 빠른 속도는 계단 하나에 쓸 수 있는 시간을 줄여 불리하다.
 */
export function makeGorge(difficulty: number, spec: GorgeSpec = GORGE_SPEC[difficulty]): Sector {
  const { amp, count, width, rampSlope } = spec;
  return {
    id: `gorge-${difficulty}`,
    type: "gorge",
    difficulty,
    favors: "각도 +",
    nodes: withCuffs(run(0, SECTOR_LEN, steps(50, amp, count, rampSlope, SECTOR_LEN), flat(width), 4)),
    blocks: [],
    shutters: []
  };
}

const gorge = (difficulty: number) => makeGorge(difficulty);

/**
 * 회랑 — 좁고 긴 통로. 큰 각도는 진폭이 커져 벽을 때리므로 불리하다.
 * 오르는 회랑과 내려가는 회랑이 있어 **편향의 유불리가 정확히 뒤집힌다.**
 * 중립이 없는 통로를 유지하려면 짧은 탭 연타로 직진을 합성해야 한다 —
 * 원작에서 플레이어가 스스로 발명한 기술이 여기서는 의도된 해법이다.
 */
export interface CorridorSpec {
  /** 통로 폭 */
  width: number;
  /**
   * 지속 경사의 dy/dx. 상승 한계는 각도×(1+편향), 하강 한계는 각도×(1−편향)이므로
   * 오르는 회랑과 내려가는 회랑에서 편향의 유불리가 정확히 뒤집힌다.
   */
  grade: number;
  /** 경사 구간에서 오르내리는 총 높이 */
  rise: number;
}

/**
 * 회랑의 형상.
 *
 * **협곡과 같은 함정이 여기에도 있고, 아직 고치지 못했다.** 경사에서 뒤처지는 거리가
 * 통로 폭을 넘으면 조작과 무관하게 벽에 닿는데, `corridor-up` 은 7개 · `corridor-down`
 * 은 13개 빌드를 그렇게 봉쇄한다(`tests/verify/sector-fairness.ts`).
 *
 * 협곡처럼 파라미터로 풀리지 않는다. 경사를 낮추면 통과는 되지만 **편향의 유불리
 * 뒤집힘이 사라진다** — 하강 회랑인데 편향 + 가 유리해진다. 경사가 하강 속도를 실제로
 * 압박해야만 편향이 의미를 갖기 때문이다.
 *
 * 게다가 두 방향이 대칭이 아니다. 세 축의 합이 0 이라 (각도 −3, 편향 −3)은 존재하지
 * 않으므로 **상승 한계의 최악은 0.62**인데, (각도 −3, 편향 +3)은 존재하므로 **하강
 * 한계의 최악은 0.397**이다. 하강 회랑이 감당해야 하는 폭이 훨씬 크다.
 *
 * 답은 협곡의 수법이다 — 경사를 유지한 채 **짧게 끊고 사이에 평탄한 회복 구간**을 두면
 * 뒤처짐이 누적되지 않는다. 계산상 0.92 경사를 두 토막(각 29단위)으로 끊고 50단위
 * 평탄을 끼우면 토막당 뒤처짐이 16.5 로 폭 22 의 여유(18.8) 안에 든다. 형상 생성을
 * 다시 써야 하므로 별도 작업으로 둔다.
 */
export const CORRIDOR_SPEC: Record<number, CorridorSpec> = {
  1: { width: 22, grade: 0.92, rise: 64 },
  2: { width: 20, grade: 0.92, rise: 64 },
  3: { width: 16, grade: 0.92, rise: 64 }
};

export function makeCorridor(
  difficulty: number,
  drift: "up" | "down" | "flat",
  spec: CorridorSpec = CORRIDOR_SPEC[difficulty]
): Sector {
  const { width, grade, rise } = spec;
  const span = drift === "flat" ? 0 : rise * (drift === "up" ? -1 : 1);
  const clamped = Math.max(-64, Math.min(64, span));
  const mid = drift === "flat" ? 50 : 50 - clamped / 2;
  const useLen = drift === "flat" ? SECTOR_LEN : Math.abs(clamped) / grade;
  const raw =
    drift === "flat"
      ? run(0, SECTOR_LEN, flat(mid), flat(width), 7)
      : [
          ...run(0, 60, flat(mid), flat(width + 6), 6),
          ...run(60, useLen, lerp(mid, mid + clamped), flat(width), 4),
          ...run(60 + useLen, Math.max(20, SECTOR_LEN - 60 - useLen), flat(mid + clamped), flat(width + 6), 6)
        ];
  const nodes = withCuffs(raw);
  return {
    id: `corridor-${drift}`,
    type: "corridor",
    difficulty,
    favors: drift === "flat" ? "각도 −" : drift === "up" ? "편향 + (상승)" : "편향 − (하강)",
    nodes,
    blocks: [],
    shutters: []
  };
}

const corridor = (difficulty: number, drift: "up" | "down" | "flat") => makeCorridor(difficulty, drift);

/**
 * 산개 — 넓은 통로에 흩뿌려진 장애물. 경로를 찾아 엮는 구간이라
 * 판단 시간이 긴 낮은 속도가 유리하다.
 */
function scatter(difficulty: number): Sector {
  const count = [6, 8, 10][difficulty - 1];
  const size = [10, 11, 12][difficulty - 1];
  const nodes = withCuffs(run(0, SECTOR_LEN, wave(50, 9, 1), flat(62), 8));
  const r = rng(1000 + difficulty);
  const blocks: Block[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = 50 + ((SECTOR_LEN - 110) * (i + r() * 0.6)) / count;
    const { top, bot } = sample(nodes, x);
    const h = size + r() * 6;
    const y = top + 4 + r() * Math.max(1, bot - top - h - 8);
    blocks.push({ x, y, w: 6, h });
  }
  return {
    id: `scatter-${difficulty}`,
    type: "scatter",
    difficulty,
    favors: "속도 −",
    nodes,
    blocks,
    shutters: []
  };
}

/**
 * 맥동 — 주기적으로 열리고 닫히는 셔터. 도착 **위상**이 통과를 가르므로
 * 전진 속도가 단순한 빠름이 아니라 양날이 된다. 셔터 위상은 목표 속도에
 * 맞춰 역산되어 있어, 그 속도대에서 열려 있고 벗어나면 닫혀 있다.
 */
function pulse(difficulty: number, tuned: number, label: string): Sector {
  const period = 1.35;
  const openFrac = [0.62, 0.55, 0.5][difficulty - 1];
  const depth = [26, 31, 35][difficulty - 1];
  const count = [4, 5, 6][difficulty - 1];
  const nodes = withCuffs(run(0, SECTOR_LEN, wave(50, 7, 0.75), flat(56), 8));
  const shutters: Shutter[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = 70 + ((SECTOR_LEN - 140) * i) / Math.max(1, count - 1);
    // 목표 속도로 달렸을 때 이 셔터 도착 시각이 열림 구간 한가운데가 되도록 위상을 역산한다.
    const arrival = x / tuned;
    const phase = (((openFrac / 2 - arrival / period) % 1) + 1) % 1;
    shutters.push({ x, w: 7, depth, side: i % 2 === 0 ? "top" : "bot", period, phase, openFrac });
  }
  return {
    id: `pulse-${label}`,
    type: "pulse",
    difficulty,
    favors: label === "fast" ? "속도 +" : label === "slow" ? "속도 −" : "속도 0",
    nodes,
    blocks: [],
    shutters
  };
}

/** 수제 섹터 12개 — 4유형 × 3. 런타임 생성은 3단계 사안이므로 여기서는 조합만 한다. */
export const SECTORS: Sector[] = [
  gorge(1),
  gorge(2),
  gorge(3),
  corridor(1, "up"),
  corridor(2, "down"),
  corridor(3, "flat"),
  scatter(1),
  scatter(2),
  scatter(3),
  pulse(1, 50, "fast"),
  pulse(2, 34, "slow"),
  pulse(3, 42, "mixed")
];

export const SECTOR_BY_ID = new Map(SECTORS.map((s) => [s.id, s]));

export function sectorsOfType(type: SectorType): Sector[] {
  return SECTORS.filter((s) => s.type === type);
}

export const SECTOR_TYPE_LABEL: Record<SectorType, string> = {
  gorge: "협곡",
  corridor: "회랑",
  scatter: "산개",
  pulse: "맥동"
};
