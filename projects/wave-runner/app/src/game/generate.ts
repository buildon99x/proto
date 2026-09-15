/**
 * 절차적 섹터 생성 — 3단계의 본체.
 *
 * 2단계까지는 수제 섹터 12개를 조합했다. 여기서는 형상을 매개변수로 만들고,
 * 후보를 **솔버로 채점해** 목표 난이도에 가장 가까운 것만 내보낸다.
 * 솔버가 있어서 "생성했는데 통과 불가"가 원천적으로 걸러지고, 난이도를
 * 눈대중이 아니라 **생존 회랑 폭**이라는 수치로 겨냥할 수 있다.
 *
 * ── 리듬 격자 ──────────────────────────────────────────────
 * 장애물·셔터·계단 경계는 박자 격자에 스냅한다(core-loop.md §12 ④).
 * 격자는 **월드 거리**로 정의된다 — 기본 속도에서 한 박이 BEAT_WORLD 단위다.
 * 속도 축이 바뀌면 같은 패턴을 더 빠르게/느리게 지나게 되므로, 속도 축은
 * 리듬 게임의 **배속(rate) 조절**과 같은 역할을 한다. 음악 동기화는 배속에
 * 맞춰 오디오를 늘여야 성립하므로 범위 밖으로 남긴다.
 */
import { resolve } from "./axes";
import { CUFF_LEN, SECTOR_LEN } from "./sectors";
import { solvePiece } from "./solver";
import type { Block, Build, CoursePiece, Sector, SectorType, Shutter, Tuning } from "./types";
import { CUFF_BOT, CUFF_TOP } from "./sectors";

const H = 100;

/** 120 BPM, 기본 속도 42 → 한 박에 21 월드 단위. */
export const BEAT_WORLD = 21;

function snapToBeat(x: number, division = 1): number {
  const cell = BEAT_WORLD / division;
  return Math.round(x / cell) * cell;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Shape {
  center: (u: number) => number;
  width: (u: number) => number;
  blocks?: Block[];
  shutters?: Shutter[];
}

function buildNodes(shape: Shape, step = 5) {
  const count = Math.max(2, Math.round(SECTOR_LEN / step));
  const nodes = [];
  for (let i = 0; i <= count; i += 1) {
    const u = i / count;
    const c = shape.center(u);
    const w = shape.width(u);
    const x = SECTOR_LEN * u;
    // 규격 입구·출구로 물린다 — 어떤 순서로 이어 붙여도 이음매에 벽이 없어야 한다.
    const blend = Math.max(0, Math.min(1, Math.min(x, SECTOR_LEN - x) / CUFF_LEN));
    const eased = blend * blend * (3 - 2 * blend);
    const top = CUFF_TOP + (c - w / 2 - CUFF_TOP) * eased;
    const bot = CUFF_BOT + (c + w / 2 - CUFF_BOT) * eased;
    nodes.push({ x, top, bot });
  }
  return nodes;
}

/** 형상 매개변수 하나. k 는 0(가장 쉬움) ~ 1(가장 어려움). */
type ShapeFactory = (k: number, rand: () => number) => Shape;

const body = (u: number) => (SECTOR_LEN * u - CUFF_LEN) / Math.max(1, SECTOR_LEN - 2 * CUFF_LEN);

/** 협곡 — 램프 기울기가 각도 계수를 넘으면 따라잡을 수 없다. */
const gorge: ShapeFactory = (k, rand) => {
  const amp = 14 + k * 10;
  const width = 34 - k * 14;
  const beats = Math.max(2, Math.round(((SECTOR_LEN - 2 * CUFF_LEN) / BEAT_WORLD / (2 + Math.floor(k * 2)))));
  const stepLen = beats * BEAT_WORLD;
  const rampSlope = 0.85 + k * 0.4;
  const rampLen = Math.min(stepLen * 0.85, (2 * amp) / rampSlope);
  const phase = rand() < 0.5 ? 0 : 1;
  return {
    center: (u) => {
      const p = Math.max(0, body(u)) * ((SECTOR_LEN - 2 * CUFF_LEN) / stepLen);
      const i = Math.floor(p) + phase;
      const f = p - Math.floor(p);
      const dir = i % 2 === 0 ? 1 : -1;
      const rampFrac = rampLen / stepLen;
      const e = Math.max(0, Math.min(1, (f - (1 - rampFrac) / 2) / rampFrac));
      const from = dir > 0 ? -amp : amp;
      const to = dir > 0 ? amp : -amp;
      return 50 + from + (to - from) * e;
    },
    width: () => width
  };
};

/** 회랑 — 좁고 긴 통로. 가파른 등반/하강이 편향의 유불리를 가른다. */
function corridorFactory(drift: "up" | "down" | "flat"): ShapeFactory {
  return (k) => {
    const width = 24 - k * 10;
    if (drift === "flat") return { center: () => 50, width: () => width };
    const grade = 0.7 + k * 0.35;
    const rise = (drift === "up" ? -1 : 1) * 62;
    const runLen = Math.min(SECTOR_LEN - 2 * CUFF_LEN, Math.abs(rise) / grade);
    const startU = 0.5 - runLen / (2 * SECTOR_LEN);
    const endU = 0.5 + runLen / (2 * SECTOR_LEN);
    return {
      center: (u) => {
        const mid = 50 - rise / 2;
        if (u <= startU) return mid;
        if (u >= endU) return mid + rise;
        return mid + rise * ((u - startU) / (endU - startU));
      },
      width: () => width
    };
  };
}

/** 산개 — 넓은 통로에 박자 위로 흩뿌린 장애물. 판단 시간이 필요하다. */
const scatter: ShapeFactory = (k, rand) => {
  const width = 62 - k * 8;
  const count = Math.round(5 + k * 9);
  const blocks: Block[] = [];
  const usable = SECTOR_LEN - 2 * CUFF_LEN - BEAT_WORLD;
  for (let i = 0; i < count; i += 1) {
    const x = snapToBeat(CUFF_LEN + BEAT_WORLD / 2 + (usable * i) / count + rand() * BEAT_WORLD * 0.4, 2);
    const h = 9 + k * 8 + rand() * 5;
    const top = 50 - width / 2;
    const y = top + 3 + rand() * Math.max(1, width - h - 6);
    blocks.push({ x, y, w: 6, h });
  }
  return { center: (u) => 50 + 8 * Math.sin(u * Math.PI * 2), width: () => width, blocks };
};

/** 맥동 — 셔터 위상을 목표 속도로 역산한다. 도착 위상이 통과를 가른다. */
function pulseFactory(tunedSpeed: number): ShapeFactory {
  return (k, rand) => {
    const width = 58 - k * 6;
    const period = (2 * BEAT_WORLD) / 42;
    const openFrac = 0.62 - k * 0.16;
    const depth = 24 + k * 13;
    const count = Math.round(4 + k * 3);
    const shutters: Shutter[] = [];
    const usable = SECTOR_LEN - 2 * CUFF_LEN - BEAT_WORLD;
    const flip = rand() < 0.5 ? 1 : 0;
    for (let i = 0; i < count; i += 1) {
      const x = snapToBeat(CUFF_LEN + BEAT_WORLD / 2 + (usable * i) / Math.max(1, count - 1));
      const arrival = x / tunedSpeed;
      const phase = (((openFrac / 2 - arrival / period) % 1) + 1) % 1;
      shutters.push({
        x,
        w: 7,
        depth,
        side: (i + flip) % 2 === 0 ? "top" : "bot",
        period,
        phase,
        openFrac
      });
    }
    return { center: (u) => 50 + 6 * Math.sin(u * Math.PI * 1.5), width: () => width, shutters };
  };
}

const FACTORIES: Record<SectorType, ShapeFactory[]> = {
  gorge: [gorge],
  corridor: [corridorFactory("up"), corridorFactory("down"), corridorFactory("flat")],
  scatter: [scatter],
  pulse: [pulseFactory(50), pulseFactory(34), pulseFactory(42)]
};

const FAVORS: Record<SectorType, string> = {
  gorge: "각도 +",
  corridor: "편향 / 각도 −",
  scatter: "속도 −",
  pulse: "속도가 양날"
};

function materialize(type: SectorType, k: number, seed: number, variant: number): Sector {
  const rand = rng(seed);
  const factory = FACTORIES[type][variant % FACTORIES[type].length];
  const shape = factory(k, rand);
  return {
    id: `gen-${type}-${seed.toString(36)}`,
    type,
    difficulty: 1 + k * 2,
    favors: FAVORS[type],
    nodes: buildNodes(shape),
    blocks: shape.blocks ?? [],
    shutters: shape.shutters ?? []
  };
}

export interface GenerateRequest {
  type: SectorType;
  /** 목표 생존 회랑 폭(월드 단위). 작을수록 어렵다 */
  targetWidth: number;
  seed: number;
  build: Build;
  base: Tuning;
  squeeze?: number;
  /** 후보 개수 */
  candidates?: number;
}

export interface Candidate {
  sector: Sector;
  minWidth: number;
  minSlackSec: number;
}

/**
 * 후보를 하나씩 평가하는 반복자.
 *
 * 한 번에 다 돌리면 프레임을 훔치므로 호출자가 예산에 맞춰 쪼개 돌린다 —
 * Performance Reliability 는 이 게임의 유일한 필수 Contract 다.
 */
export function* generateCandidates(req: GenerateRequest): Generator<Candidate | null, Candidate | null, void> {
  const total = req.candidates ?? 12;
  let best: Candidate | null = null;
  let bestErr = Number.POSITIVE_INFINITY;

  for (let i = 0; i < total; i += 1) {
    const seed = (req.seed + i * 2654435761) >>> 0;
    // 난이도 손잡이를 0..1 로 훑되, 목표 폭에서 먼 쪽부터 빠르게 좁힌다.
    const k = total === 1 ? 0.5 : i / (total - 1);
    const sector = materialize(req.type, k, seed, i);
    const piece: CoursePiece = {
      kind: "sector",
      startX: 0,
      endX: SECTOR_LEN,
      sector,
      squeeze: req.squeeze ?? 1
    };
    const res = solvePiece({
      piece,
      build: req.build,
      base: req.base,
      startSpans: [{ lo: CUFF_TOP + req.base.radius, hi: CUFF_BOT - req.base.radius }],
      startTime: 0,
      dt: 1 / 90
    });
    if (res.passable) {
      const err = Math.abs(res.minWidth - req.targetWidth);
      if (err < bestErr) {
        bestErr = err;
        best = { sector, minWidth: res.minWidth, minSlackSec: res.minSlackSec };
      }
    }
    yield best;
  }
  return best;
}

/** 한 번에 끝내는 동기 버전 — 검증 스크립트와 큐레이션이 쓴다. */
export function generateSector(req: GenerateRequest): Candidate | null {
  const it = generateCandidates(req);
  let last: Candidate | null = null;
  for (;;) {
    const step = it.next();
    if (step.done) return step.value ?? last;
    last = step.value;
  }
}

/** 난이도(1~3+)를 목표 생존 회랑 폭으로 옮긴다. */
export function widthForDifficulty(difficulty: number): number {
  return Math.max(7, 30 - (difficulty - 1) * 7);
}

void resolve;
void H;
