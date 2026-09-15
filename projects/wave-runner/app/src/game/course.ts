import { AXES } from "./axes";
import { SectorFactory } from "./factory";
import { widthForDifficulty } from "./generate";
import SEEDS from "./stage-seeds.json";
import { SECTORS, SECTOR_LEN, sectorsOfType } from "./sectors";
import type { AxisKey, AxisTrade, Build, Course, CoursePiece, Gate, Sector, SectorType, Tuning } from "./types";

/** 게이트 길이를 시간이 아니라 월드 길이로 고정하되, 가장 빠른 빌드에서도 시간 제약이 성립하게 잡는다. */
const MAX_SPEED = 58;

/**
 * Endless 후반의 통로 조임.
 *
 * 손으로 만든 가장 어려운 섹터를 다 쓰고 나면 더 올릴 난이도가 없다.
 * 통로를 중앙으로 조이는 것이 그 천장을 여는 가장 싼 방법이고,
 * 3단계의 런타임 생성이 들어오면 회랑 폭 목표치가 이 역할을 대신한다.
 */
export function squeezeFor(index: number): number {
  return Math.max(0.55, 1 - Math.max(0, index - 3) * 0.045);
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gateLeadInLen(t: Tuning): number {
  return t.gateLeadInSec * MAX_SPEED;
}

export function gateSpanLen(t: Tuning): number {
  return t.gateSpanSec * MAX_SPEED;
}

function pickTrade(rand: () => number, exclude?: AxisTrade): AxisTrade {
  for (let guard = 0; guard < 40; guard += 1) {
    const plus = AXES[Math.floor(rand() * AXES.length)] as AxisKey;
    const minus = AXES[Math.floor(rand() * AXES.length)] as AxisKey;
    if (plus === minus) continue;
    if (exclude && exclude.plus === plus && exclude.minus === minus) continue;
    return { plus, minus };
  }
  return { plus: "slope", minus: "speed" };
}

function makeGate(x: number, rand: () => number, t: Tuning): Gate {
  const top = pickTrade(rand);
  const bot = pickTrade(rand, top);
  const leadIn = gateLeadInLen(t);
  const span = gateSpanLen(t);
  return { leadInX: x, startX: x + leadIn, endX: x + leadIn + span, top, bot };
}

export function gateTotalLen(t: Tuning): number {
  return gateLeadInLen(t) + gateSpanLen(t);
}

/** 난이도 수치(1.0~3.0)에 가장 가까운 섹터를 유형 안에서 고른다. */
function pickSector(type: SectorType, difficulty: number, rand: () => number, maxDifficulty: number): Sector {
  const all = sectorsOfType(type);
  const pool = all.filter((s) => s.difficulty <= maxDifficulty);
  const usable = pool.length > 0 ? pool : all;
  const target = Math.max(1, Math.min(maxDifficulty, difficulty));
  const sorted = [...usable].sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target));
  const best = sorted.filter((s) => Math.abs(s.difficulty - target) <= 0.75);
  const from = best.length > 0 ? best : sorted.slice(0, 2);
  return from[Math.floor(rand() * from.length)];
}

const TYPE_CYCLE: SectorType[] = ["gorge", "corridor", "scatter", "pulse"];

/** 유형은 순환에 변주를 얹는다 — 다음에 무엇이 올지 어렴풋이 예측 가능해야 빌드 판단에 지평이 생긴다. */
function typeAt(index: number, rand: () => number): SectorType {
  const base = TYPE_CYCLE[index % TYPE_CYCLE.length];
  if (rand() < 0.25) return TYPE_CYCLE[Math.floor(rand() * TYPE_CYCLE.length)];
  return base;
}

function assemble(sectors: Sector[], t: Tuning, rand: () => number, finish: boolean): Course {
  const pieces: CoursePiece[] = [];
  let x = 0;
  sectors.forEach((sector, i) => {
    pieces.push({ kind: "sector", startX: x, endX: x + SECTOR_LEN, sector });
    x += SECTOR_LEN;
    if (i < sectors.length - 1 || !finish) {
      const gate = makeGate(x, rand, t);
      pieces.push({ kind: "gate", startX: gate.leadInX, endX: gate.endX, gate });
      x = gate.endX;
    }
  });
  return { pieces, finishX: finish ? x : Number.POSITIVE_INFINITY };
}

export const STAGE_SECTORS = 5;

/**
 * 티어·번호로 결정되는 시드. 같은 스테이지는 언제나 같은 코스다.
 *
 * 값은 큐레이션의 산물이다 — curate-stages.ts 가 후보 시드를 훑어 통과율이
 * 목표 구간(45~85%)에 드는 것만 남겼다. 너무 낮으면 시행착오 강요이고,
 * 너무 높으면 무슨 선택을 해도 통과돼 게이트가 무의미해진다.
 */
export function stageSeed(tier: number, stageNo: number): number {
  const curated = (SEEDS as Record<string, number>)[`${tier}:${stageNo}`];
  return curated !== undefined ? curated >>> 0 : (tier * 1000 + stageNo * 37 + 12345) >>> 0;
}

export function buildStageCourse(
  tier: number,
  stageNo: number,
  t: Tuning,
  maxDifficulty = 3,
  seedOverride?: number
): Course {
  const rand = mulberry32(seedOverride ?? stageSeed(tier, stageNo));
  const sectors: Sector[] = [];
  for (let i = 0; i < STAGE_SECTORS; i += 1) {
    const difficulty = 1 + ((tier - 1) * 2 + i) / 5;
    sectors.push(pickSector(typeAt(i, rand), difficulty, rand, maxDifficulty));
  }
  return assemble(sectors, t, rand, true);
}

/**
 * Endless 코스. 앞서 나가며 계속 이어 붙인다.
 * 난이도는 섹터마다 조금씩 올라가고, 램프는 목표 난이도 하나로만 관리한다.
 */
export class EndlessCourse {
  readonly course: Course = { pieces: [], finishX: Number.POSITIVE_INFINITY };
  readonly factory = new SectorFactory();
  private readonly rand: () => number;
  private index = 0;
  private cursor = 0;
  /** 다음에 만들어야 할 조각의 사양. pump 가 이걸 보고 공장에 건다 */
  private nextSpec: { type: SectorType; difficulty: number; seed: number } | null = null;

  constructor(
    seed: number,
    private readonly t: Tuning,
    private readonly maxDifficulty = 3
  ) {
    this.rand = mulberry32(seed >>> 0);
    this.ensure(0);
  }

  /**
   * 매 프레임 호출. 앞으로 필요한 섹터를 **현재 빌드 기준으로** 미리 만들어 둔다.
   *
   * 빌드를 입력으로 받는 것이 핵심이다 — 코스를 플레이어의 지금 기체에 맞춰 뽑으므로
   * "생성했는데 이 빌드로는 통과 불가"가 원천적으로 생기지 않는다. Stage 가 고정
   * 코스라서 전 경로 검증이 필요한 것과 정확히 대비되는 지점이다.
   */
  pump(build: Build, budgetMs = 3): void {
    if (!this.factory.busy && this.nextSpec) {
      const spec = this.nextSpec;
      const squeeze = squeezeFor(this.index);
      this.factory.request({
        type: spec.type,
        targetWidth: widthForDifficulty(spec.difficulty) / Math.max(0.5, squeeze),
        seed: spec.seed,
        build,
        base: this.t,
        squeeze,
        candidates: 10
      });
    }
    this.factory.tick(budgetMs);
  }

  /** x 기준 두 조각 앞까지 채워 둔다. */
  ensure(x: number): void {
    const horizon = x + (SECTOR_LEN + gateTotalLen(this.t)) * 2;
    while (this.cursor < horizon) {
      const difficulty = 1 + this.index * this.t.endlessRampPerSector;
      const type = typeAt(this.index, this.rand);
      // 공장이 제때 끝냈으면 생성물을, 아니면 사전 검증된 수제 섹터를 쓴다.
      const sector =
        this.factory.take() ?? pickSector(type, difficulty, this.rand, this.maxDifficulty);
      this.nextSpec = {
        type: typeAt(this.index + 1, this.rand),
        difficulty: 1 + (this.index + 1) * this.t.endlessRampPerSector,
        seed: (this.rand() * 0xffffffff) >>> 0
      };
      this.course.pieces.push({
        kind: "sector",
        startX: this.cursor,
        endX: this.cursor + SECTOR_LEN,
        sector,
        squeeze: squeezeFor(this.index)
      });
      this.cursor += SECTOR_LEN;
      const gate = makeGate(this.cursor, this.rand, this.t);
      this.course.pieces.push({ kind: "gate", startX: gate.leadInX, endX: gate.endX, gate });
      this.cursor = gate.endX;
      this.index += 1;
    }
  }
}

export function pieceAt(course: Course, x: number): CoursePiece | null {
  const pieces = course.pieces;
  if (pieces.length === 0) return null;
  let lo = 0;
  let hi = pieces.length - 1;
  if (x < pieces[0].startX) return pieces[0];
  if (x >= pieces[hi].endX) return pieces[hi];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pieces[mid].startX <= x) lo = mid;
    else hi = mid - 1;
  }
  return pieces[lo];
}

export { SECTORS };
