import { WALL_THICKNESS } from "./config";
import type { Cell, PlayerId } from "./types";

/** 벽 셀의 소유자 코드. 플레이어 번호나 중립(0)과 겹치지 않는 값을 쓴다. */
export const WALL = 255;

/** 소유자 코드가 1바이트라, 벽 값을 빼고 쓸 수 있는 번호의 상한. */
export const MAX_OWNER_ID = 254;

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const EMPTY_BOUNDS: Bounds = {
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY
};

/**
 * 격자 상태. 소유권과 꼬리를 각각 평면 `Uint8Array` 로 들고 있다.
 * 시뮬레이션만 이 클래스를 변경하고, 렌더는 읽기만 한다.
 *
 * `600 × 600` 에서는 전면 스캔이 통하지 않는다(36만 칸). 그래서 splix 처럼
 * **플레이어별 경계 상자를 추적**하고 **소유 칸 수를 증분으로 유지**한다.
 * 경계 상자는 늘어나기만 하고 줄지 않는다 — 원본과 같은 선택이다.
 */
export class Board {
  readonly size: number;
  readonly owner: Uint8Array;
  readonly trail: Uint8Array;

  /** 폐허 해제 시각(경기 경과 ms). 폐허 규칙을 켤 때만 할당한다. */
  private rubble: Float64Array | null = null;

  /** 소유 칸 수. 소유권이 바뀔 때마다 갱신한다. */
  private readonly counts = new Int32Array(256);
  /** 플레이어별 경계 상자. 늘어나기만 한다. */
  private readonly bounds: Bounds[] = [];

  /** flood fill 방문 표시. 매번 0으로 되돌리지 않으려고 스탬프를 증가시킨다. */
  private readonly visited: Int32Array;
  private visitStamp = 0;
  private readonly stack: number[] = [];

  constructor(size: number) {
    this.size = size;
    this.owner = new Uint8Array(size * size);
    this.trail = new Uint8Array(size * size);
    this.visited = new Int32Array(size * size);

    for (let i = 0; i < 256; i += 1) {
      this.bounds.push({ ...EMPTY_BOUNDS });
    }

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (this.isWall(x, y)) {
          this.owner[this.index(x, y)] = WALL;
        }
      }
    }
  }

  index(x: number, y: number): number {
    return y * this.size + x;
  }

  isWall(x: number, y: number): boolean {
    const max = this.size - WALL_THICKNESS;
    return x < WALL_THICKNESS || y < WALL_THICKNESS || x >= max || y >= max;
  }

  /** 보드 안이면서 벽이 아닌 칸인지. */
  isPlayable(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.size && y < this.size && !this.isWall(x, y);
  }

  ownerAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) {
      return WALL;
    }
    return this.owner[this.index(x, y)];
  }

  trailAt(x: number, y: number): number {
    if (!this.isPlayable(x, y)) {
      return 0;
    }
    return this.trail[this.index(x, y)];
  }

  /** 지금 이 칸이 폐허로 잠겨 있는지. 잠긴 칸은 누구도 점령할 수 없다. */
  isLocked(x: number, y: number, nowMs: number): boolean {
    if (!this.rubble || !this.isPlayable(x, y)) {
      return false;
    }
    return this.rubble[this.index(x, y)] > nowMs;
  }

  /** 폐허 해제 시각. 렌더가 옅어지는 정도를 계산하는 데 쓴다. */
  rubbleUntilAt(x: number, y: number): number {
    if (!this.rubble || !this.isPlayable(x, y)) {
      return 0;
    }
    return this.rubble[this.index(x, y)];
  }

  get hasRubble(): boolean {
    return this.rubble !== null;
  }

  tilesOf(id: number): number {
    return this.counts[id] ?? 0;
  }

  /** 벽을 제외한 플레이 가능한 칸 수. */
  get playableTiles(): number {
    const inner = this.size - WALL_THICKNESS * 2;
    return inner * inner;
  }

  /** 소유 영토를 감싸는 상자. 비어 있으면 `null`. */
  boundsOf(id: number): Bounds | null {
    const box = this.bounds[id];
    return box && box.maxX >= box.minX ? box : null;
  }

  /** `center` 를 중심으로 한 변 `radius * 2 + 1` 짜리 시작 영토를 만든다. */
  claimHome(id: PlayerId, centerX: number, centerY: number, radius: number): void {
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (!this.isPlayable(x, y)) {
          continue;
        }
        const i = this.index(x, y);
        this.setOwner(i, x, y, id);
        this.trail[i] = 0;
        // 리스폰 자리는 폐허라도 내준다. 그러지 않으면 돌아올 곳이 없다.
        if (this.rubble) {
          this.rubble[i] = 0;
        }
      }
    }
  }

  /**
   * 사망 처리: 소유 영토와 꼬리를 모두 지운다.
   * 경계 상자 안만 훑는다 — 큰 맵에서 전면 스캔은 감당이 안 된다.
   *
   * @param lockUntilMs `0` 보다 크면 비워진 칸을 그 시각까지 폐허로 잠근다.
   * @returns 비워진 영토 칸 목록. 파편 연출이 이 목록을 쓴다.
   */
  clearPlayer(id: PlayerId, lockUntilMs = 0): Cell[] {
    const cleared: Cell[] = [];
    const box = this.boundsOf(id);

    if (box) {
      if (lockUntilMs > 0) {
        this.ensureRubble();
      }
      for (let y = box.minY; y <= box.maxY; y += 1) {
        for (let x = box.minX; x <= box.maxX; x += 1) {
          const i = this.index(x, y);
          if (this.owner[i] !== id) {
            continue;
          }
          this.setOwner(i, x, y, 0);
          if (this.rubble) {
            this.rubble[i] = lockUntilMs;
          }
          cleared.push({ x, y });
        }
      }
      this.bounds[id] = { ...EMPTY_BOUNDS };
    }

    // 꼬리는 영토 밖에 있으므로 경계 상자로 좁힐 수 없다. 대신 호출부가
    // `clearTrail` 로 자기 꼬리 목록을 직접 지운다. 여기서는 남은 흔적만 정리한다.
    return cleared;
  }

  markTrail(id: PlayerId, x: number, y: number): void {
    if (!this.isPlayable(x, y)) {
      return;
    }
    this.trail[this.index(x, y)] = id;
  }

  clearTrail(cells: Cell[]): void {
    for (const cell of cells) {
      if (this.isPlayable(cell.x, cell.y)) {
        this.trail[this.index(cell.x, cell.y)] = 0;
      }
    }
  }

  countTiles(playerCount: number): number[] {
    const result = new Array<number>(playerCount + 1).fill(0);
    for (let id = 0; id <= playerCount; id += 1) {
      result[id] = this.counts[id] ?? 0;
    }
    return result;
  }

  /**
   * 꼬리를 닫았을 때의 점령. 꼬리를 영토로 바꾼 뒤, 영토+꼬리의 경계 상자 안에서
   * 바깥과 이어지지 않는 칸을 전부 가져온다.
   *
   * `opponents`(살아 있는 다른 유닛의 위치)는 장벽이 아니라 **채우기의 추가 출발점**이다.
   * 상대가 서 있는 칸의 상하좌우에서 채우기를 시작하므로, 상대를 가둔 영역은
   * "바깥"으로 취급돼 한 칸도 넘어오지 않는다.
   *
   * @returns 새로 내 것이 된 칸 목록 (꼬리 칸 포함). 점령 연출이 이 목록을 쓴다.
   */
  capture(id: PlayerId, trailCells: Cell[], opponents: Cell[], nowMs = 0): Cell[] {
    if (trailCells.length === 0) {
      return [];
    }

    const gained: Cell[] = [];

    for (const cell of trailCells) {
      if (!this.isPlayable(cell.x, cell.y)) {
        continue;
      }
      const i = this.index(cell.x, cell.y);
      this.trail[i] = 0;
      // 폐허는 꼬리가 지나가도 가져오지 못한다.
      if (this.rubble && this.rubble[i] > nowMs) {
        continue;
      }
      if (this.owner[i] !== id) {
        gained.push({ x: cell.x, y: cell.y });
      }
      this.setOwner(i, cell.x, cell.y, id);
    }

    const bounds = this.paddedBounds(id);
    if (!bounds) {
      return gained;
    }

    this.visitStamp += 1;
    const stamp = this.visitStamp;
    const stack = this.stack;
    stack.length = 0;

    const push = (x: number, y: number): void => {
      if (
        !this.isPlayable(x, y) ||
        x < bounds.minX ||
        x > bounds.maxX ||
        y < bounds.minY ||
        y > bounds.maxY
      ) {
        return;
      }
      const i = this.index(x, y);
      if (this.owner[i] === id || this.visited[i] === stamp) {
        return;
      }
      this.visited[i] = stamp;
      stack.push(i);
    };

    // 경계 상자의 테두리 = 바깥 세계.
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      push(x, bounds.minY);
      push(x, bounds.maxY);
    }
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      push(bounds.minX, y);
      push(bounds.maxX, y);
    }

    // 상대가 서 있는 자리도 바깥이다. 상대가 내 영토 위에 서 있으면 네 방향이
    // 모두 막혀 있어 아무 효과가 없다.
    for (const cell of opponents) {
      push(cell.x + 1, cell.y);
      push(cell.x - 1, cell.y);
      push(cell.x, cell.y + 1);
      push(cell.x, cell.y - 1);
    }

    while (stack.length > 0) {
      const i = stack.pop() as number;
      const x = i % this.size;
      const y = (i - x) / this.size;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (!this.isPlayable(x, y)) {
          continue;
        }
        const i = this.index(x, y);
        if (this.owner[i] === id || this.visited[i] === stamp) {
          continue;
        }
        if (this.rubble && this.rubble[i] > nowMs) {
          continue;
        }
        this.setOwner(i, x, y, id);
        gained.push({ x, y });
      }
    }

    return gained;
  }

  // --- 내부 ---

  /** 소유권을 바꾸면서 칸 수와 경계 상자를 같이 갱신한다. 모든 변경은 여기를 지난다. */
  private setOwner(index: number, x: number, y: number, id: number): void {
    const previous = this.owner[index];
    if (previous === id || previous === WALL) {
      return;
    }
    this.counts[previous] -= 1;
    this.counts[id] += 1;
    this.owner[index] = id;

    if (id === 0) {
      return;
    }
    const box = this.bounds[id];
    if (x < box.minX) box.minX = x;
    if (x > box.maxX) box.maxX = x;
    if (y < box.minY) box.minY = y;
    if (y > box.maxY) box.maxY = y;
  }

  /** 소유 영토를 감싸는 상자를 한 칸 넓혀 플레이 영역 안으로 자른 값. */
  private paddedBounds(id: PlayerId): Bounds | null {
    const box = this.boundsOf(id);
    if (!box) {
      return null;
    }
    const low = WALL_THICKNESS;
    const high = this.size - WALL_THICKNESS - 1;
    return {
      minX: Math.max(low, box.minX - 1),
      minY: Math.max(low, box.minY - 1),
      maxX: Math.min(high, box.maxX + 1),
      maxY: Math.min(high, box.maxY + 1)
    };
  }

  private ensureRubble(): void {
    if (!this.rubble) {
      this.rubble = new Float64Array(this.size * this.size);
    }
  }
}
