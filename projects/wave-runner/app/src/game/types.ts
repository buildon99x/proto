/** 코스는 상/하 경계 폴리라인 + 내부 블록으로 표현한다. y는 0(위)~worldHeight(아래). */
export interface CorridorNode {
  x: number;
  top: number;
  bot: number;
}

/** 통로 안에 박힌 장애물. 축 정렬 사각형. */
export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Stage {
  id: number;
  name: string;
  /** 한 줄 설명 — 이 스테이지가 무엇을 묻는가 */
  asks: string;
  nodes: CorridorNode[];
  blocks: Block[];
  /** 시작 y. 통로 중앙이 기본. */
  startY: number;
  /** 시작 시 상승 중인지 */
  startRising: boolean;
}

export type Phase = "ready" | "running" | "dead" | "cleared";

export interface Tuning {
  worldHeight: number;
  speed: number;
  slope: number;
  inertiaMs: number;
  radius: number;
  lookaheadMinSec: number;
  cameraAnchor: number;
  retryDelayMs: number;
  fixedStepHz: number;
}
