export type Tier = 0 | 1 | 2 | 3 | 4;

export type SiteId = "korea" | "egypt" | "rome";

export type Shape =
  | "jar" | "sword" | "crown" | "mask" | "scroll"
  | "coin" | "tablet" | "statue" | "ornament" | "mechanism";

export type PaletteId =
  | "celadon" | "gold" | "silver" | "earthenware" | "stone" | "wood" | "glass";

/**
 * 유물 한 점의 정의. `holder`/`disputed` 는 장식이 아니라 설계상 필수다 —
 * 개인이 유물을 캐서 금고에 넣는 구도의 윤리적 리스크를 완화하는 장치.
 * (notes/mda.md §7.1)
 */
export type Artifact = {
  id: string;
  name: string;
  era: string;
  origin: string;
  holder: string;
  note: string;
  disputed?: string;
  tier: Tier;
  valueFactor: number;
  site: SiteId;
  minLayer: number;
  shape: Shape;
  palette: PaletteId;
  seed: number;
};

export type OwnerId = "player" | string;

export type LedgerEntry = { total: number; remaining: number; owners: OwnerId[] };
export type Ledger = Record<string, LedgerEntry>;

export type SiteProgress = {
  layer: number;
  layerProgress: number;
  dropProgress: number;
  unlocked: boolean;
};

export type PendingItem = {
  uid: number;
  artifactId: string;
  /** 감정 완료까지 남은 초. 큐 전체가 병렬로 처리되므로 대기 중인 모든 항목이 동시에 줄어든다. */
  remain: number;
  estimate: number;
};

export type VaultItem = { uid: number; artifactId: string; value: number };

/**
 * v0.1 3종 상태. v0.2는 이 타입을 5종으로 확장한다(spec.md §13.3) — 아직
 * 코드가 없는 v0.2 시스템이라 여기서는 반영하지 않는다(v0.1 실코드 유지 원칙,
 * DROP_INTERVAL_FLOOR_SECONDS 등과 같은 패턴).
 */
export type CodexState = "unseen" | "owned" | "lost";

export type RivalState = {
  id: string;
  name: string;
  baseDig: number;
  favSite: SiteId;
  /** 이 티어 이하는 즉시 팔아 재투자한다. 높을수록 공격적으로 성장 */
  sellBelow: Tier;
  workers: number;
  gear: number;
  funds: number;
  layer: number;
  layerProgress: number;
  dropProgress: number;
  vaultValue: number;
  owned: string[];
  catchup: number;
};

export type Tip = {
  artifactId: string;
  site: SiteId;
  layer: number;
  remain: number;
  /** 같은 제보를 받은 라이벌 id */
  rivals: string[];
};

export type LogKind = "drop" | "rival" | "lost" | "won" | "system";
export type LogEntry = { t: number; kind: LogKind; text: string };

export type Settings = {
  autoSellBelow: Tier | null;
  muted: boolean;
};

export type Stats = {
  drops: number;
  clicks: number;
  sold: number;
  blindSold: number;
  racesWon: number;
  racesLost: number;
};

export type World = {
  version: 1;
  t: number;
  lastTickAt: number;
  funds: number;
  sites: Record<SiteId, SiteProgress>;
  activeSite: SiteId;
  workers: number;
  gear: number;
  lab: number;
  pending: PendingItem[];
  vault: VaultItem[];
  ledger: Ledger;
  rivals: RivalState[];
  codex: Record<string, CodexState>;
  tip: Tip | null;
  nextTipIn: number;
  log: LogEntry[];
  settings: Settings;
  stats: Stats;
  clickCombo: number;
  clickComboUntil: number;
  /** 클릭 진척 상한 계산용 (초 단위 창) */
  clickSecond: number;
  clickAccum: number;
  rngState: number;
  ended: boolean;
};

export type StepReport = {
  drops: { artifactId: string; tier: Tier }[];
  appraised: { artifactId: string; tier: Tier; value: number }[];
  lost: { artifactId: string; owner: string }[];
  won: string[];
  layerUps: number;
};
