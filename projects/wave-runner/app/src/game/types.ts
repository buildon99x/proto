/** 부사 3축. 동사(홀드=상승 / 릴리스=하강)는 불변이고 이 계수만 런마다 조립된다. */
export type AxisKey = "slope" | "speed" | "bias";

/** 각 축의 현재 눈금. tuning.axisMin ~ axisMax 로 클램프된다. */
export type Build = Record<AxisKey, number>;

/** 섹터 유형. 어떤 빌드가 유리한지가 유형마다 다르고, 그것이 Optimization 축의 원천이다. */
export type SectorType = "gorge" | "corridor" | "scatter" | "pulse";

export interface CorridorNode {
  x: number;
  top: number;
  bot: number;
}

/** 통로 안에 고정된 장애물. */
export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 맥동 셔터. 주기적으로 벽에서 자라났다 물러난다.
 * 도착 위상이 통과 여부를 가르므로 **전진 속도가 양날이 되는 유일한 자리**다.
 */
export interface Shutter {
  x: number;
  w: number;
  /** 벽에서 뻗는 최대 깊이 */
  depth: number;
  /** "top" 이면 천장에서, "bot" 이면 바닥에서 */
  side: "top" | "bot";
  /** 개폐 주기(초) */
  period: number;
  /** 위상 0..1 */
  phase: number;
  /** 주기 중 열려 있는 비율 0..1 */
  openFrac: number;
}

export interface Sector {
  id: string;
  type: SectorType;
  /** 1(쉬움) ~ 3(어려움) */
  difficulty: number;
  /** 한 줄 — 이 섹터가 어떤 빌드를 묻는가 */
  favors: string;
  nodes: CorridorNode[];
  blocks: Block[];
  shutters: Shutter[];
}

/** 게이트의 한쪽 길이 주는 교환. 한 축 +1, 다른 축 −1. 순수 상승은 없다. */
export interface AxisTrade {
  plus: AxisKey;
  minus: AxisKey;
}

/**
 * 분기 게이트. 통로가 두 개의 관으로 갈라지고, 어느 관을 지나느냐가 곧 선택이다.
 * 게임은 멈추지 않는다 — 선택 행위 자체가 회피 조작이다.
 */
export interface Gate {
  /**
   * 제안을 뽑을 때 쓰는 고정 시드. 제안 자체는 코스를 조립할 때가 아니라
   * **직전 게이트를 지날 때** 현재 빌드로 정해진다 — 이미 상한에 닿은 축을
   * 제안하면 교환이 한쪽만 먹혀 순손해나 공짜 상승이 되기 때문이다.
   */
  seed: number;
  /** 현재 빌드로 제안이 확정되었는가. 확정 전 top/bot 은 중립 빌드 기준의 잠정값이다 */
  armed: boolean;
  /** 저밀도 리드인이 시작되는 x */
  leadInX: number;
  /** 분기 시작 x */
  startX: number;
  /** 분기 종료 x. 이 지점에서 어느 관에 있었는지가 확정된다 */
  endX: number;
  top: AxisTrade;
  bot: AxisTrade;
}

export type PieceKind = "sector" | "gate";

export interface CoursePiece {
  kind: PieceKind;
  startX: number;
  endX: number;
  sector?: Sector;
  gate?: Gate;
  /** 통로를 중앙으로 조이는 계수(1 = 그대로). Endless 후반 난이도용 */
  squeeze?: number;
}

export interface Course {
  pieces: CoursePiece[];
  /** 종료선. Endless 는 Infinity */
  finishX: number;
}

export type RunMode = "stage" | "endless";

export type Phase = "ready" | "running" | "dead" | "cleared";

export interface Tuning {
  worldHeight: number;
  speed: number;
  slope: number;
  bias: number;
  inertiaMs: number;
  radius: number;
  /**
   * 반복 완화로 통로를 벌리는 배율(1 = 그대로). 상수가 아니라 **런이 들고 다니는
   * 값**이라 tuning.json 에는 없다 — 엔진이 완화 단계를 보고 채운다.
   */
  relief?: number;
  /**
   * 게이트 제안 풀에서 남길 교환 쌍의 수(0 = 제한 없음). 완화가 상위 단계에서
   * 빌드를 극단으로 미는 교환을 빼는 데 쓴다. 상수가 아니라 런이 들고 다니는 값이다.
   */
  gateOfferPool?: number;
  lookaheadMinSec: number;
  cameraAnchor: number;
  retryDelayMs: number;
  fixedStepHz: number;
  axisMin: number;
  axisMax: number;
  gateLeadInSec: number;
  gateSpanSec: number;
  gateDivider: number;
  endlessRampPerSector: number;
}
