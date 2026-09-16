import { NEUTRAL_BUILD, gateOffer } from "./axes";
import { SectorFactory } from "./factory";
import { widthForDifficulty } from "./generate";
import { mulberry32 } from "./rand";
import SEEDS from "./stage-seeds.json";
import { SECTORS, SECTOR_LEN, sectorsOfType } from "./sectors";
import type { Build, Course, CoursePiece, Gate, Sector, SectorType, Tuning } from "./types";

/** 게이트 길이를 시간이 아니라 월드 길이로 고정하되, 가장 빠른 빌드에서도 시간 제약이 성립하게 잡는다. */
const MAX_SPEED = 58;

/**
 * Endless 후반의 통로 조임.
 *
 * 손으로 만든 가장 어려운 섹터를 다 쓰고 나면 더 올릴 난이도가 없다.
 * 통로를 중앙으로 조이는 것이 그 천장을 여는 가장 싼 방법이고,
 * 3단계의 런타임 생성이 들어오면 회랑 폭 목표치가 이 역할을 대신한다.
 */
/**
 * 런타임 생성은 몇 번째 자리부터 쓰는가.
 *
 * 0·1번 자리는 생성자가 곧바로 채우고, 2번 자리는 첫 프레임에 지평선 안으로
 * 들어온다 — 공장에 줄 시간이 사실상 0이다. 그래서 이 세 자리는 기기 속도에
 * 따라 생성물이 되기도 폴백이 되기도 했고, 그것이 같은 시드의 코스를 갈랐다.
 *
 * 세 자리를 **항상** 사전 검증된 수제 섹터로 고정한다. 3번 자리는 14초쯤 뒤에
 * 필요해지므로 공장이 질 수 없고(생성 한 번은 100ms 남짓, 주어지는 예산은
 * 14초 × 3ms/프레임 ≈ 2.5초), 결과적으로 배달 패턴이 프레임 속도와 무관해진다.
 * 런 시작 30초를 손으로 검증한 코스로 여는 것은 그 자체로도 낫다.
 */
const GEN_FROM_INDEX = 3;

export function squeezeFor(index: number): number {
  return Math.max(0.55, 1 - Math.max(0, index - 3) * 0.045);
}

export function gateLeadInLen(t: Tuning): number {
  return t.gateLeadInSec * MAX_SPEED;
}

export function gateSpanLen(t: Tuning): number {
  return t.gateSpanSec * MAX_SPEED;
}

/**
 * 게이트를 놓는다. 제안은 여기서 확정하지 않는다 —
 * 시드만 고정하고, 지나갈 때의 빌드로 `gateOffer` 가 정한다(axes.ts 참고).
 * top/bot 에 담는 것은 아직 확정 전에 읽히더라도 말이 되게 하는 잠정값이다.
 */
function makeGate(x: number, rand: () => number, t: Tuning): Gate {
  const seed = (rand() * 0xffffffff) >>> 0;
  const leadIn = gateLeadInLen(t);
  const span = gateSpanLen(t);
  const provisional = gateOffer(seed, NEUTRAL_BUILD, t);
  return {
    seed,
    armed: false,
    leadInX: x,
    startX: x + leadIn,
    endX: x + leadIn + span,
    top: provisional.top,
    bot: provisional.bot
  };
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
 * 값은 큐레이션의 산물이다 — curate-stages.ts 가 후보 시드를 솔버로 훑어
 * (1) 모든 경로가 통과 가능하고 (2) 최선 경로의 여유가 티어별 목표 구간에 들며
 * (3) 최선과 최악 경로의 여유 차이가 충분한 것만 남겼다. 차이가 없으면 어느
 * 관으로 가든 같으므로 게이트가 아무것도 묻지 않는다.
 */
export function stageSeed(tier: number, stageNo: number): number {
  const curated = (SEEDS as Record<string, number>)[`${tier}:${stageNo}`];
  return curated !== undefined ? curated >>> 0 : (tier * 1000 + stageNo * 37 + 12345) >>> 0;
}

/**
 * 스테이지 코스. **수제 섹터 18개 전부**를 풀로 쓴다.
 *
 * Endless 와 달리 여기서는 해금 상태(`maxSectorDifficulty`)를 보지 않는다.
 * 보게 두면 확장 섹터 풀을 사는 순간 같은 번호의 스테이지가 다른 코스가 되어
 * "같은 스테이지는 언제나 같은 코스"가 깨지고, 큐레이션한 여유 수치도 그 즉시
 * 다른 코스의 것이 된다.
 */
export function buildStageCourse(tier: number, stageNo: number, t: Tuning, seedOverride?: number): Course {
  const rand = mulberry32(seedOverride ?? stageSeed(tier, stageNo));
  const sectors: Sector[] = [];
  for (let i = 0; i < STAGE_SECTORS; i += 1) {
    const difficulty = 1 + ((tier - 1) * 2 + i) / 5;
    sectors.push(pickSector(typeAt(i, rand), difficulty, rand, 3));
  }
  return assemble(sectors, t, rand, true);
}

/**
 * Endless 코스. 앞서 나가며 계속 이어 붙인다.
 * 난이도는 섹터마다 조금씩 올라가고, 램프는 목표 난이도 하나로만 관리한다.
 */
interface SectorSpec {
  /** 코스에서 이 섹터가 놓일 자리 */
  index: number;
  type: SectorType;
  difficulty: number;
  seed: number;
  /** 공장이 제때 끝내지 못했을 때 쓸 수제 섹터. 사양과 함께 미리 정해 둔다 */
  fallback: Sector;
}

export class EndlessCourse {
  readonly course: Course = { pieces: [], finishX: Number.POSITIVE_INFINITY };
  readonly factory = new SectorFactory();
  private readonly rand: () => number;
  private index = 0;
  private cursor = 0;
  /** 다음에 붙일 섹터의 사양. pump 의 주문과 ensure 의 폴백이 **같은 사양**을 본다 */
  private spec: SectorSpec;
  /** 공장에 이미 걸어 둔 사양의 자리. 같은 자리를 두 번 주문하지 않는다 */
  private requested = -1;

  constructor(
    seed: number,
    private readonly t: Tuning,
    private readonly maxDifficulty = 3
  ) {
    this.rand = mulberry32(seed >>> 0);
    this.spec = this.makeSpec(0);
    this.ensure(0);
  }

  /**
   * index 번째 섹터의 사양을 뽑는다. **난수 소비량이 고정되어야 한다.**
   *
   * 폴백 섹터까지 여기서 미리 고르는 이유가 그것이다. 공장이 제때 끝냈는지에
   * 따라 난수를 더 쓰거나 덜 쓰면 프레임 타이밍이 코스를 바꾼다 — 같은 시드가
   * 같은 코스를 주지 못한다.
   */
  private makeSpec(index: number): SectorSpec {
    const difficulty = 1 + index * this.t.endlessRampPerSector;
    const type = typeAt(index, this.rand);
    const fallback = pickSector(type, difficulty, this.rand, this.maxDifficulty);
    const seed = (this.rand() * 0xffffffff) >>> 0;
    return { index, type, difficulty, seed, fallback };
  }

  /**
   * 매 프레임 호출. 앞으로 필요한 섹터를 **현재 빌드 기준으로** 미리 만들어 둔다.
   *
   * 빌드를 입력으로 받는 것이 핵심이다 — 코스를 플레이어의 지금 기체에 맞춰 뽑으므로
   * "생성했는데 이 빌드로는 통과 불가"가 원천적으로 생기지 않는다. Stage 가 고정
   * 코스라서 전 경로 검증이 필요한 것과 정확히 대비되는 지점이다.
   */
  pump(build: Build, budgetMs = 3): void {
    if (this.spec.index >= GEN_FROM_INDEX && !this.factory.busy && this.requested !== this.spec.index) {
      const spec = this.spec;
      const squeeze = squeezeFor(spec.index);
      const ok = this.factory.request(
        {
          type: spec.type,
          targetWidth: widthForDifficulty(spec.difficulty) / Math.max(0.5, squeeze),
          seed: spec.seed,
          build,
          base: this.t,
          squeeze,
          candidates: 10
        },
        spec.index
      );
      if (ok) this.requested = spec.index;
    }
    this.factory.tick(budgetMs);
  }

  /** x 기준 두 조각 앞까지 채워 둔다. */
  ensure(x: number): void {
    const horizon = x + (SECTOR_LEN + gateTotalLen(this.t)) * 2;
    while (this.cursor < horizon) {
      const spec = this.spec;
      // 공장이 이 자리의 것을 제때 끝냈으면 생성물을, 아니면 사양이 지목한 수제 섹터를 쓴다.
      // 어느 쪽이든 유형은 spec.type 으로 같다 — 유형 순환이 예측 가능해야 빌드 판단에 지평이 생긴다.
      const sector = this.factory.take(spec.index) ?? spec.fallback;
      this.course.pieces.push({
        kind: "sector",
        startX: this.cursor,
        endX: this.cursor + SECTOR_LEN,
        sector,
        squeeze: squeezeFor(spec.index)
      });
      this.cursor += SECTOR_LEN;
      const gate = makeGate(this.cursor, this.rand, this.t);
      this.course.pieces.push({ kind: "gate", startX: gate.leadInX, endX: gate.endX, gate });
      this.cursor = gate.endX;
      this.index += 1;
      this.spec = this.makeSpec(this.index);
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
