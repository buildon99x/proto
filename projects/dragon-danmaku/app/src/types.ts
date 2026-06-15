// 공유 타입 정의 — 게임 데이터, 메타 진행, 런 설정, HUD 스냅샷.

export type WeaponStyle = "shot" | "laser";

export interface DragonDef {
  id: string;
  name: string;
  title: string;
  /** 셀렉트/캔버스에서 쓰는 대표 색(16진수). */
  color: number;
  /** 기본 이동 속도(px/frame @60fps). */
  speed: number;
  /** 샷 한 번에 발사되는 탄 수. */
  shotCount: number;
  /** 샷 확산 각(도). */
  shotSpread: number;
  /** 샷 발당 위력. */
  shotPower: number;
  /** 레이저 초당 위력. */
  laserDps: number;
  /** 유도 산탄 여부(뇌룡). */
  homing: boolean;
  /** 근접 격파 시 연환 가산(암흑룡). */
  closeKillBonus: number;
  /** 해금 비용(용비늘). 0이면 기본 해금. */
  unlockCost: number;
  /** 추가 해금 조건 설명(없으면 빈 문자열). */
  unlockNote: string;
  blurb: string;
}

export interface DifficultyDef {
  id: string;
  name: string;
  note: string;
  /** 적탄 속도 배율. */
  bulletSpeedMul: number;
  /** 적 발사 빈도 배율. */
  fireRateMul: number;
  /** 연환 배수 상한. */
  chainCap: number;
  /** 점수 난이도 계수. */
  scoreMul: number;
  /** 피격 시 봄 자동 발동(Novice). */
  autoBomb: boolean;
  /** 해금 조건 설명(빈 문자열이면 기본 해금). */
  unlockNote: string;
}

export interface StageDef {
  index: number;
  name: string;
  stage: string;
  /** 배경 그라데이션 상/하 색. */
  bgTop: number;
  bgBottom: number;
  /** 잡몹 기본 HP. */
  enemyHp: number;
  /** 잡몹 점수. */
  enemyScore: number;
  /** 적탄 기본 속도(px/frame). */
  bulletSpeed: number;
  /** 잡몹 편대 웨이브 수. */
  waveCount: number;
  /** 보스 HP. */
  bossHp: number;
  bossName: string;
  /** 보스 탄막 패턴 강도(0~). */
  bossIntensity: number;
}

export interface UpgradeDef {
  id: keyof DragonUpgrades;
  name: string;
  effect: string;
  /** 레벨별 누적 비용. 길이 = 최대 레벨. */
  costs: number[];
}

export interface DragonUpgrades {
  startLives: number;
  bombs: number;
  awaken: number;
  options: number;
}

export interface MetaState {
  version: number;
  scales: number;
  unlockedDragons: string[];
  unlockedDifficulties: string[];
  clearedFirstLoop: boolean;
  trueEnding: boolean;
  upgrades: Record<string, DragonUpgrades>;
  bestScore: number;
  bestChain: number;
  defeatedBosses: string[];
}

export interface RunConfig {
  dragon: DragonDef;
  difficulty: DifficultyDef;
  upgrades: DragonUpgrades;
  /** 연습 모드 시작 스테이지(0-base). 일반 플레이는 undefined. */
  practiceStage?: number;
}

export interface HudSnapshot {
  score: number;
  best: number;
  chain: number;
  chainGrade: string;
  chainMul: number;
  lives: number;
  bombs: number;
  awakenGauge: number; // 0..1
  awakening: boolean;
  power: number; // 1..maxPower
  stageName: string;
  stageNo: number;
  bossHp: number; // 0..1, 0이면 보스 없음
  bossName: string;
  hiddenScales: number;
}

export type GameEventKind =
  | { type: "continue" } // 잔기 소진 → 컨티뉴 프롬프트
  | { type: "stageclear"; stage: number }
  | { type: "gameover"; result: RunResult }
  | { type: "victory"; result: RunResult };

export interface RunResult {
  score: number;
  bestChain: number;
  stageReached: number;
  hiddenScales: number;
  noMiss: boolean;
  noBomb: boolean;
  noContinue: boolean;
  cleared: boolean;
  trueEnding: boolean;
  earnedScales: number;
  newBest: boolean;
}
