import type { Direction } from "./types";

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

/** 한 판의 최대 참가자 수. 팔레트 색 수와 시작 지점 수에 묶여 있다. */
export const MAX_PLAYERS = 4;

/**
 * 한 화면 멀티용 키 배치. 네 명이 한 키보드를 나눠 쓴다 —
 * 왼쪽부터 WASD · TFGH · IJKL · 방향키 순으로 앉으면 팔이 겹치지 않는다.
 * 1번 자리는 싱글 플레이와 같은 방향키라, 혼자 할 때 배치가 바뀌지 않는다.
 */
export const PLAYER_KEYS: Array<{
  label: string;
  hint: string;
  map: Record<string, Direction>;
}> = [
  {
    label: "P1",
    hint: "방향키 · 숫자패드",
    map: {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      Numpad8: "up",
      Numpad5: "down",
      Numpad2: "down",
      Numpad4: "left",
      Numpad6: "right"
    }
  },
  {
    label: "P2",
    hint: "W A S D",
    map: { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" }
  },
  {
    label: "P3",
    hint: "I J K L",
    map: { KeyI: "up", KeyK: "down", KeyJ: "left", KeyL: "right" }
  },
  {
    label: "P4",
    hint: "T F G H",
    map: { KeyT: "up", KeyG: "down", KeyF: "left", KeyH: "right" }
  }
];

/**
 * 물막이 배율 — 한 번에 닫은 면적이 클수록 점수를 더 준다.
 * 얕은 왕복을 반복하는 것이 최적해가 되지 않게 하려는 규칙이다.
 * 위에서부터 먼저 맞는 구간을 쓴다.
 */
export const CAPTURE_BONUS_TIERS: Array<{ minCells: number; multiplier: number }> = [
  { minCells: 60, multiplier: 2 },
  { minCells: 25, multiplier: 1.5 }
];

export function captureMultiplier(cells: number): number {
  for (const tier of CAPTURE_BONUS_TIERS) {
    if (cells >= tier.minCells) {
      return tier.multiplier;
    }
  }
  return 1;
}

/** 플레이어 번호(1..4)별 고정 팔레트. 0번 자리는 중립이다. */
export const PALETTE = [
  { territory: "#1b2437", unit: "#1b2437", name: "중립" },
  { territory: "#22d3ee", unit: "#ecfeff", name: "나" },
  { territory: "#fb923c", unit: "#fff7ed", name: "주황" },
  { territory: "#c084fc", unit: "#faf5ff", name: "보라" },
  { territory: "#a3e635", unit: "#f7fee7", name: "연두" }
] as const;

/**
 * 판마다 켜고 끌 수 있는 규칙. 설계 가설을 측정하려고 열어 둔다.
 * 측정 결과는 `docs/design/differentiation.md` 에 남긴다.
 */
export type MatchRules = {
  /** 물막이 배율. 기본 꺼짐 — 측정 결과 목적을 달성하지 못했다. */
  captureBonus: boolean;
  /**
   * 사망한 영토가 **아무도 못 먹는 폐허**로 남는 시간(ms). `0`이면 즉시 중립이 된다.
   * 내가 죽으면 그 땅을 옆의 상대가 먹어 눈덩이가 넘어가는 경로를 끊으려는 규칙이다.
   */
  rubbleLockMs: number;
  /**
   * 킬 1회의 점수. splix 의 값은 `500` 이지만, 그 값은 거대한 아레나에 수십 명이 있어
   * 킬이 드문 환경의 수치다. `60 × 60` 에 4명이 90초를 겨루면 조우가 훨씬 잦다.
   */
  killScore: number;
};

export const DEFAULT_RULES: MatchRules = {
  captureBonus: false,
  rubbleLockMs: 0,
  killScore: KILL_SCORE
};

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
