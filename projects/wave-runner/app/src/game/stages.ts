import type { Block, CorridorNode, Stage } from "./types";

const H = 100;

/**
 * 통로 구간 하나를 노드 배열로 펼친다.
 * center(x), width(x) 는 구간 내 정규화 위치 u∈[0,1] 을 받는다.
 */
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

/** 구간들을 이어 붙인다. 이음매의 중복 노드는 버린다. */
function chain(...parts: CorridorNode[][]): CorridorNode[] {
  const out: CorridorNode[] = [];
  for (const part of parts) {
    for (const node of part) {
      if (out.length > 0 && Math.abs(node.x - out[out.length - 1].x) < 1e-6) continue;
      out.push(node);
    }
  }
  return out;
}

const flat = (v: number) => () => v;
const lerp = (a: number, b: number) => (u: number) => a + (b - a) * u;
const wave = (mid: number, amp: number, cycles: number, phase = 0) => (u: number) =>
  mid + amp * Math.sin((u * cycles + phase) * Math.PI * 2);

/** 위/아래 벽에서 번갈아 튀어나오는 이빨. */
function teeth(
  x0: number,
  len: number,
  count: number,
  nodes: CorridorNode[],
  depth: number,
  thickness = 5
): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = x0 + (len * (i + 0.5)) / count;
    const { top, bot } = sample(nodes, x);
    const fromTop = i % 2 === 0;
    blocks.push({
      x: x - thickness / 2,
      y: fromTop ? top : bot - depth,
      w: thickness,
      h: depth
    });
  }
  return blocks;
}

/** x 지점의 통로 상/하 경계. 노드 바깥은 양 끝 값으로 고정. */
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

export function stageLength(stage: Stage): number {
  return stage.nodes.length === 0 ? 0 : stage.nodes[stage.nodes.length - 1].x;
}

function build(): Stage[] {
  // 1 — 첫 물결: 넓은 통로. 홀드/릴리스의 의미만 가르친다.
  const s1 = run(0, 500, wave(50, 12, 1.5), flat(46));

  // 2 — 좁아지는 길: 폭이 46에서 22로 조여든다.
  const s2 = run(0, 580, wave(50, 14, 2), lerp(46, 22));

  // 3 — 톱니: 폭은 여유롭지만 이빨이 진입 각도를 강제한다.
  const s3nodes = run(0, 620, wave(50, 16, 2.5), flat(36));
  const s3blocks = teeth(60, 520, 9, s3nodes, 13);

  // 4 — 회랑: 좁고 긴 수평 통로. 중립이 없으므로 짧은 탭 연타로
  //     사실상의 직진을 합성해야 통과된다. 원작에서 플레이어가
  //     스스로 발명한 기술을 여기서는 의도된 해법으로 요구한다.
  const s4 = chain(
    run(0, 120, wave(50, 10, 0.5), lerp(42, 18)),
    run(120, 200, flat(50), flat(16), 8),
    run(320, 90, wave(50, 9, 0.5), lerp(16, 34)),
    run(410, 220, lerp(50, 38), flat(15), 8),
    run(630, 80, lerp(38, 50), lerp(15, 30))
  );

  // 5 — 합류: 앞의 넷을 순서대로 짧게 묻고, 마지막을 조인다.
  const s5nodes = chain(
    run(0, 150, wave(50, 13, 1), flat(40)),
    run(150, 160, wave(50, 12, 1), lerp(40, 24)),
    run(310, 180, wave(50, 15, 1.5), flat(32)),
    run(490, 170, flat(46), flat(15), 8),
    run(660, 110, lerp(46, 50), lerp(15, 20))
  );
  const s5blocks = teeth(320, 160, 4, s5nodes, 11);

  return [
    {
      id: 1,
      name: "첫 물결",
      asks: "누르면 오르고 놓으면 내려간다 — 그것만.",
      nodes: s1,
      blocks: [],
      startY: 50,
      startRising: true
    },
    {
      id: 2,
      name: "좁아지는 길",
      asks: "같은 조작을 더 작은 여유에서.",
      nodes: s2,
      blocks: [],
      startY: 50,
      startRising: true
    },
    {
      id: 3,
      name: "톱니",
      asks: "지나갈 곳을 미리 고르고 진입한다.",
      nodes: s3nodes,
      blocks: s3blocks,
      startY: 50,
      startRising: true
    },
    {
      id: 4,
      name: "회랑",
      asks: "중립이 없는 곳에서 직진을 만들어낸다.",
      nodes: s4,
      blocks: [],
      startY: 50,
      startRising: true
    },
    {
      id: 5,
      name: "합류",
      asks: "넷을 이어서.",
      nodes: s5nodes,
      blocks: s5blocks,
      startY: 50,
      startRising: true
    }
  ];
}

export const STAGES: Stage[] = build();
