/**
 * 규칙 수치의 근거는 docs/design/splix-analysis.md 에 정리돼 있다.
 * splix.io의 이동 속도(0.006 타일/ms = 초당 6칸)와 시작 영토 반지름 2를 그대로 쓴다.
 */

export const BOARD_SIZE = 60;

/** 가장 바깥 한 줄은 벽이다. 닿으면 죽고, 소유할 수 없다. */
export const WALL_THICKNESS = 1;

export const MATCH_DURATION_MS = 90_000;

/** 초당 6칸. */
export const PLAYER_TICK_MS = 167;

export const PLAYER_LIVES = 3;
export const RESPAWN_DELAY_MS = 1_200;

/** 시작·리스폰 영토는 `HOME_RADIUS * 2 + 1` 변의 정사각형이다. */
export const HOME_RADIUS = 2;

/** 가장 최근 꼬리 이만큼은 자기 충돌 판정에서 제외한다. */
export const SELF_TRAIL_GRACE = 2;

export const KILL_SCORE = 500;

/** 플레이어 번호(1..4)별 고정 팔레트. 0번 자리는 중립이다. */
export const PALETTE = [
  { territory: "#1b2437", unit: "#1b2437", name: "중립" },
  { territory: "#22d3ee", unit: "#ecfeff", name: "나" },
  { territory: "#fb923c", unit: "#fff7ed", name: "주황" },
  { territory: "#c084fc", unit: "#faf5ff", name: "보라" },
  { territory: "#a3e635", unit: "#f7fee7", name: "연두" }
] as const;

export type DifficultyId = "easy" | "normal" | "hard";

export type Difficulty = {
  id: DifficultyId;
  label: string;
  description: string;
  /** 플레이어를 제외한 AI 수. */
  aiCount: number;
  aiTickMs: number;
  /** AI가 한 번에 그리려는 직사각형 변 길이 범위. */
  rectMin: number;
  rectMax: number;
  /** 적 꼬리가 이만큼 노출되면 사냥을 시도한다. `Infinity`면 사냥하지 않는다. */
  huntTrailThreshold: number;
  /** 사냥 대상을 찾는 맨해튼 거리. */
  huntRange: number;
  /** AI가 복귀를 결심하는 꼬리 길이. */
  maxTrail: number;
};

export const DIFFICULTIES: Difficulty[] = [
  {
    id: "easy",
    label: "쉬움",
    description: "AI 2명. 느리고, 쫓아오지 않는다.",
    aiCount: 2,
    aiTickMs: 220,
    rectMin: 3,
    rectMax: 5,
    huntTrailThreshold: Number.POSITIVE_INFINITY,
    huntRange: 0,
    maxTrail: 26
  },
  {
    id: "normal",
    label: "보통",
    description: "AI 3명. 꼬리가 길게 노출되면 노린다.",
    aiCount: 3,
    aiTickMs: 180,
    rectMin: 4,
    rectMax: 7,
    huntTrailThreshold: 6,
    huntRange: 14,
    maxTrail: 34
  },
  {
    id: "hard",
    label: "어려움",
    description: "AI 3명. 빠르고, 조금만 나가도 쫓아온다.",
    aiCount: 3,
    aiTickMs: 150,
    rectMin: 5,
    rectMax: 9,
    huntTrailThreshold: 3,
    huntRange: 20,
    maxTrail: 42
  }
];

export function findDifficulty(id: DifficultyId): Difficulty {
  const found = DIFFICULTIES.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown difficulty: ${id}`);
  }
  return found;
}
