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

/**
 * 협곡 — 중앙선이 빠르게 오르내린다. 계단을 따라잡으려면 높은 각도가 필요하고,
 * 빠른 속도는 계단 하나에 쓸 수 있는 시간을 줄여 불리하다.
 */
function gorge(difficulty: number): Sector {
  const amp = [16, 19, 22][difficulty - 1];
  const count = [3, 4, 4][difficulty - 1];
  const width = [30, 26, 22][difficulty - 1];
  const rampSlope = [0.95, 1.05, 1.15][difficulty - 1];
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

/**
 * 회랑 — 좁고 긴 통로. 큰 각도는 진폭이 커져 벽을 때리므로 불리하다.
 * 오르는 회랑과 내려가는 회랑이 있어 **편향의 유불리가 정확히 뒤집힌다.**
 * 중립이 없는 통로를 유지하려면 짧은 탭 연타로 직진을 합성해야 한다 —
 * 원작에서 플레이어가 스스로 발명한 기술이 여기서는 의도된 해법이다.
 */
function corridor(difficulty: number, drift: "up" | "down" | "flat"): Sector {
  const width = [22, 20, 16][difficulty - 1];
  // 가파른 지속 경사. 상승 한계는 각도×(1+편향), 하강 한계는 각도×(1−편향)이므로
  // 오르는 회랑과 내려가는 회랑에서 편향의 유불리가 정확히 뒤집힌다.
  const grade = 0.92;
  const span = drift === "flat" ? 0 : SECTOR_LEN * grade * (drift === "up" ? -1 : 1);
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
