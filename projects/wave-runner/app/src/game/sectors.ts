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
  /** 경사를 몇 토막으로 끊는가. 1 이면 한 번에 내려간다(0.5.3 이전) */
  segments: number;
  /** 토막 사이 평탄 회복 구간의 길이 */
  recover: number;
}

/**
 * 회랑의 형상.
 *
 * **경사를 한 번에 내려가면 뒤처짐이 누적돼 통로 폭을 넘는다.** 0.5.3 이전의 회랑은
 * 경사 0.92 를 64단위 내리 달려서, 그 기울기를 못 내는 기체가 조작과 무관하게 벽에
 * 닿았다 — `corridor-up` 7개 · `corridor-down` 13개 빌드가 그렇게 봉쇄돼 있었다.
 *
 * 경사를 낮추는 것은 답이 아니다. 낮추면 통과는 되지만 **편향의 유불리 뒤집힘이
 * 사라진다** — 경사가 하강 속도를 실제로 압박해야만 편향이 의미를 갖기 때문이다.
 * 0.5 로 낮춰 보니 하강 회랑인데 편향 + 가 +60ms 유리해졌고, 최소 여유가 224ms 로
 * 뛰면서 "좁고 긴 통로" 라는 성격도 함께 사라졌다.
 *
 * 그래서 **경사를 짧게 끊고 사이에 평탄한 회복 구간을 둔다.** 토막 하나에서 벌어지는
 * 거리는 `(경사 − 기체 dy/dx) × 토막 길이` 로 토막 수에 반비례하고, 평탄 구간에서
 * 그만큼을 도로 메운다. **압박은 남고 누적만 사라진다.**
 *
 * 끊고 나면 경사를 오히려 **더 가파르게**(0.92 → 1.3) 해야 한다. 토막이 짧아진 만큼
 * 기울기를 올리지 않으면 하강 속도를 압박하지 못해, 하강 회랑인데 편향 0 이 편향 ±
 * 양쪽보다 유리해진다(실측: 편− 189 · 편0 229 · 편+ 178). 지금은 편− 266 · 편0 254 ·
 * 편+ 185 로 뒤집힘이 제자리를 찾았다.
 *
 * 회복 구간은 덤이 아니다 — 중립이 없는 좁은 평탄 통로는 짧은 탭 연타로 직진을
 * 합성해야 유지되므로, 회랑이 본래 묻던 기술을 한 번 더 묻는다.
 *
 * 두 방향은 대칭이 아니다. 세 축의 합이 0 이라 (각도 −3, 편향 −3)은 존재하지 않으므로
 * **상승 한계의 최악은 0.62** 인데, (각도 −3, 편향 +3)은 존재하므로 **하강 한계의 최악은
 * 0.397** 이다. 하강 회랑이 감당해야 하는 뒤처짐이 훨씬 크다.
 */
export type CorridorDrift = "up" | "down" | "flat";

/**
 * 회랑 9종 — **드리프트 × 난이도**.
 *
 * 0.5.4 까지는 난이도 번호가 드리프트에 용접돼 있었다(1=상승 · 2=하강 · 3=평탄).
 * 그래서 사양이 약속한 세 질문(평탄은 각도 − · 상승은 편향 + · 하강은 편향 −)이
 * **티어마다 한 종류씩만** 물어졌다 — 티어 1 에서는 상승만, 티어 2~3 에서는 하강만,
 * 평탄은 티어 4 에서만. 축을 가르는 자리가 난이도에 묶여 낭비되고 있었다.
 *
 * 둘을 떼어 9칸으로 만들면 어느 티어에서도 세 질문을 다 물을 수 있고, 수제 섹터 풀이
 * 12개에서 18개로 늘어 큐레이션의 다양성 여지도 함께 커진다.
 *
 * 난이도는 **폭과 오르내리는 높이**로 가른다. 둘을 함께 움직이는 이유는 월드 크기다 —
 * 중앙선이 `50 ± rise/2` 를 오가므로 `rise + width` 가 94 를 넘으면 통로가 월드 밖으로
 * 나간다. 쉬운 칸은 넓고 짧게, 어려운 칸은 좁고 길게.
 *
 * 값은 전부 솔버로 골랐다 — 9칸 모두 도달 가능한 빌드를 하나도 막지 않으면서
 * (`sector-fairness.ts`) 난이도가 드리프트마다 단조로 내려간다.
 */
export const CORRIDOR_SPEC: Record<string, CorridorSpec> = {
  //                     폭   경사   높이  토막 회복      최소 여유   축 선호
  "up-1":   { width: 34, grade: 1.3, rise: 44, segments: 2, recover: 55 }, // 126ms  편향+ 139
  "up-2":   { width: 32, grade: 1.3, rise: 54, segments: 2, recover: 55 }, //  98ms  편향+ 148
  "up-3":   { width: 30, grade: 1.3, rise: 64, segments: 2, recover: 55 }, //  69ms  편향+ 158
  "down-1": { width: 30, grade: 1.3, rise: 54, segments: 2, recover: 55 }, // 115ms  편향− 58
  "down-2": { width: 28, grade: 1.3, rise: 54, segments: 2, recover: 55 }, //  87ms  편향− 63
  "down-3": { width: 30, grade: 1.3, rise: 64, segments: 2, recover: 55 }, //  62ms  편향− 81
  // 평탄한 회랑에는 경사가 없다. 좁은 관을 탭 연타로 유지하는 것 자체가 시험이고,
  // 큰 각도는 진폭을 키워 불리하다 — 그래서 각도가 양날이 되는 유일한 자리다.
  "flat-1": { width: 22, grade: 1.3, rise: 0, segments: 1, recover: 0 }, // 107ms  각도− 166
  "flat-2": { width: 18, grade: 1.3, rise: 0, segments: 1, recover: 0 }, //  84ms  각도− 131
  "flat-3": { width: 14, grade: 1.3, rise: 0, segments: 1, recover: 0 } //   61ms  각도−  95
};

export const corridorSpecKey = (drift: CorridorDrift, difficulty: number) => `${drift}-${difficulty}`;

export function makeCorridor(
  difficulty: number,
  drift: CorridorDrift,
  spec: CorridorSpec = CORRIDOR_SPEC[corridorSpecKey(drift, difficulty)]
): Sector {
  const { width, grade, rise, segments, recover } = spec;
  const span = drift === "flat" ? 0 : rise * (drift === "up" ? -1 : 1);
  const clamped = Math.max(-64, Math.min(64, span));
  const mid = drift === "flat" ? 50 : 50 - clamped / 2;

  let raw: CorridorNode[];
  if (drift === "flat") {
    raw = run(0, SECTOR_LEN, flat(mid), flat(width), 7);
  } else {
    const legRise = clamped / segments;
    const legLen = Math.abs(legRise) / grade;
    const LEAD = 60;
    raw = [...run(0, LEAD, flat(mid), flat(width + 6), 6)];
    let x = LEAD;
    let y = mid;
    for (let i = 0; i < segments; i += 1) {
      raw.push(...run(x, legLen, lerp(y, y + legRise), flat(width), 4));
      x += legLen;
      y += legRise;
      // 마지막 토막 뒤에는 회복 구간을 두지 않는다 — 남은 자리가 곧 꼬리다.
      //
      // 회복 구간은 리드인·꼬리와 같은 폭으로 넓힌다. 이 구간의 일은 **뒤처짐을
      // 메우게 해 주는 것**이지 새 시험을 내는 것이 아니다. 같은 폭으로 두면 한쪽으로
      // 치우친 기체가 평탄 구간에서 벌을 받아, 경사가 묻는 편향의 질문을 도로 상쇄한다
      // (실측: 하강 회랑에서 편향 0 이 편향 ± 양쪽보다 유리해졌다).
      if (i < segments - 1) {
        raw.push(...run(x, recover, flat(y), flat(width + 6), 5));
        x += recover;
      }
    }
    raw.push(...run(x, Math.max(20, SECTOR_LEN - x), flat(y), flat(width + 6), 6));
  }
  const nodes = withCuffs(raw);
  return {
    id: `corridor-${drift}-${difficulty}`,
    type: "corridor",
    difficulty,
    favors: drift === "flat" ? "각도 −" : drift === "up" ? "편향 + (상승)" : "편향 − (하강)",
    nodes,
    blocks: [],
    shutters: []
  };
}

const corridor = (difficulty: number, drift: CorridorDrift) => makeCorridor(difficulty, drift);

/**
 * 산개 — 넓은 통로에 흩뿌려진 장애물. 경로를 찾아 엮는 구간이라
 * 판단 시간이 긴 낮은 속도가 유리하다.
 *
 * ## 0.7.1 — 8.7초짜리 직선이었다
 *
 * `flatness.ts` 가 산개를 지목했다. 한 번 나올 때마다 460 중 365단위(8.7초)가 "여유가
 * 스테이지 최난점의 2배 이상이면서 중앙선이 직선" 이었고, 12스테이지 전체 밋밋 구간의
 * 절반을 혼자 냈다.
 *
 * 중앙선은 이미 `wave` 로 흐르고 있었다. 문제는 진폭이 아니라 **460단위에 1주기**라는
 * 것이었다 — 11초에 한 번 굽는 것은 직선이다(중앙선 기울기 최대 0.12).
 *
 * **주기를 난이도에 묶었다**(1.4 / 1.8 / 2.2 → 기울기 0.17 / 0.22 / 0.27). 상한의 근거는
 * 기체다 — 세 축의 합이 0 이라 **하강 한계의 최악이 0.397** 이므로(`CorridorSpec` 주석)
 * 가장 가파른 scatter-3 도 그 아래에 둔다.
 *
 * ## 폭은 건드리지 않는다 — 측정이 말린 곳
 *
 * 같이 재다가 알게 된 것이 둘 있다.
 *
 * **① `scatter-1·2·3` 의 최소 여유가 264ms 로 똑같다.** 난이도 숫자가 블록 수(6/8/10)와
 * 크기만 바꾸는데 통로가 폭 62 로 회랑(30)의 두 배라, **블록이 한 번도 최소 여유를 만들지
 * 못한다.** 세 변종이 여유로는 같은 섹터이고 그 264ms 는 다른 어떤 섹터보다 두 배 너그럽다.
 *
 * **② 그래도 폭을 좁히면 안 된다.** 폭을 62 → 48~60 으로 흔들어 봤더니 섹터 여유가
 * 264 → 178ms 로 떨어지면서 **오토파일럿이 무너졌다** — 여유 중앙값 110/80/80/70 →
 * −1/−1/−1/60, 벽 0/0/3/0 → 3/4/5/0. 그런데 **솔버 기준 티어 곡선은 1ms 도 움직이지
 * 않았다**(산개는 어느 스테이지에서도 병목이 아니다). 밋밋함은 2%p 더 줄었을 뿐이다.
 *
 * 여기서 배울 것은 지표의 한계다 — **최소 여유는 "통로가 순간적으로 얼마나 좁은가" 만 재고
 * "움직이는 통로를 따라가는 것이 얼마나 어려운가" 는 못 잰다.** 폭과 주기를 함께 올리면
 * 그 눈먼 방향으로 난이도가 오른다. 주기만 올리면 여유는 **264ms 그대로**이고 밋밋함만
 * 52% → 43% 로 내려간다. 그래서 폭과 블록은 원래대로 두었다.
 *
 * ①은 남은 문제로 기록해 둔다. 난이도 숫자가 통로에 닿게 하려면 폭이 아닌 다른 것을
 * 찾아야 한다 — 블록 배치의 조밀도나 통로를 가로막는 위치 같은 것.
 */
function scatter(difficulty: number): Sector {
  const count = [6, 8, 10][difficulty - 1];
  const size = [10, 11, 12][difficulty - 1];
  /** 460단위에 몇 번 굽는가. 중앙선 기울기 = 2π·진폭·주기/길이 로 0.20 / 0.26 / 0.32. */
  const cycles = [1.4, 1.8, 2.2][difficulty - 1];
  const nodes = withCuffs(
    // 폭의 위상을 1/4 주기 밀어, 가장 좁은 자리가 중앙선이 가장 가파른 자리를 피하게 한다.
    run(0, SECTOR_LEN, wave(50, 9, cycles), flat(62), 8)
  );
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

/**
 * 수제 섹터 18개.
 *
 * 협곡·산개·맥동은 3난이도씩이고, 회랑만 **드리프트 × 난이도로 9종**이다. 회랑은
 * 유형 하나가 축 세 개를 서로 다른 방향으로 묻는 유일한 자리라(평탄 각도 − · 상승
 * 편향 + · 하강 편향 −), 그 셋이 난이도에 묶이면 티어마다 한 질문씩만 물어진다.
 */
export const SECTORS: Sector[] = [
  gorge(1),
  gorge(2),
  gorge(3),
  corridor(1, "up"),
  corridor(2, "up"),
  corridor(3, "up"),
  corridor(1, "down"),
  corridor(2, "down"),
  corridor(3, "down"),
  corridor(1, "flat"),
  corridor(2, "flat"),
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
