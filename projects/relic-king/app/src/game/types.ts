export type Tier = 0 | 1 | 2 | 3 | 4;

/**
 * 12거점(v0.2, notes/world-map.md §0·§1). 기존 3거점(korea/egypt/rome)은
 * 이름을 바꾸지 않는다 — 이미 앵커 도시 하나짜리 지역이었다.
 */
export type SiteId =
  | "korea" | "egypt" | "rome" | "greece" | "china" | "turkey" | "iraq"
  | "india" | "mexico" | "peru" | "japan" | "israel";

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
  /** base(본거지) 승격 여부. `unlockCost`는 이제 원정 자격이 아니라 이 승격에만 든다
   *  (notes/decisions.md G17/A10). 필드 이름은 v0.1을 유지하지만 의미가 넓어졌다. */
  unlocked: boolean;
  /** base로 승격된 world.t 시각. HOME_BASE_BONUS_DURATION_HOURS 창 판정에 쓴다.
   *  base가 아니면 null. */
  baseSince: number | null;
};

export type PendingItem = {
  uid: number;
  artifactId: string;
  /** 감정 완료까지 남은 초. 큐 전체가 병렬로 처리되므로 대기 중인 모든 항목이 동시에 줄어든다. */
  remain: number;
  estimate: number;
  /** 이 유물을 캐낸 발굴단의 단장 id(있으면). 단장 급여(staff.md §5) 원천징수의 근거다 —
   *  레거시 단독 발굴(클릭·인부)이나 라이벌 발굴은 undefined다. */
  diggerForemanId?: string;
};

/** 보존 상태 축(0=파손 ~ 4=관급). 희소도(Tier)와 독립이다(notes/decisions.md G6) */
export type Condition = 0 | 1 | 2 | 3 | 4;

export type VaultItem = {
  uid: number;
  artifactId: string;
  value: number;
  /** 드랍 시점 결정론적 기준값으로 채워진다(CONDITION_INITIAL_BASE_BY_TIER).
   *  습도·복원에 의한 변화(spec.md §9.4)는 시설 시스템과 함께 후속 단계에서 붙는다. */
  condition: Condition;
  /** 박물관에 전시 중이면 true. 박물관 시스템이 아직 없어 이번 단계에서는 항상
   *  false/undefined다 — ASSET_SCORE(§13.1, G49/B4)가 전시 중 유물을 자산 축에서
   *  제외해야 하므로 그 필터가 걸 수 있게 필드만 미리 선언해 둔다. */
  displayed?: boolean;
  /** PendingItem.diggerForemanId가 감정을 거쳐 그대로 넘어온 값 — 매각 시점 단장
   *  급여 원천징수(staff.md §5)의 근거. */
  diggerForemanId?: string;
};

/**
 * v0.2 5종(spec.md §13.3, notes/decisions.md G16/A5·G20/B8).
 * - unseen: 미발견
 * - discovered_not_owned: 존재를 알지만 현재 소장하지 않음(전부 매각했거나,
 *   시즌 롤오버로 헌정됐거나, 다시 채워진 세계 원장을 아직 못 얻은 경우)
 * - owned_unidentified: 드랍(소유 확정)은 됐지만 감정 전 — 이름은 아직 "???"
 * - owned: 감정 완료 + vault에 1점 이상 소장 중
 * - lost: 세계 재고 0인 상태에서 플레이어는 한 번도 갖지 못함(라이벌이 가져감)
 */
export type CodexState = "unseen" | "discovered_not_owned" | "owned_unidentified" | "owned" | "lost";

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
  /**
   * 유일(T4) 최초 발굴 횟수 — **이번 시즌분만** 쌓는다. 매각과 무관하게 유지된다
   * (spec.md §13.3 — "최초 발견 여부는 계정 영구 기록"). 계정 영구 누적은
   * `PersistentRecord.firstT4Finds`가 맡고, 시즌 롤오버(`applySeasonRollover`)가
   * 이 값을 그쪽으로 흡수한 뒤 0으로 되돌린다 — World 자체는 시즌 한정 스키마라서다.
   */
  firstT4Finds: number;
};

/** 시즌 진행 메타(spec.md §13.2·§13.4). World에 두는 건 시즌 번호처럼 "그 시즌
 *  안에서" 의미 있는 값뿐이다 — 계정 영구 기록은 PersistentRecord가 따로 맡는다. */
export type SeasonState = {
  season: number;
  /** world.t 기준 시즌 시작 시각(초) */
  startedAt: number;
  /** world.t 기준 시즌 종료 예정 시각(초) = startedAt + SEASON_LENGTH_WEEKS×7×24×3600 */
  endsAt: number;
  /** RANK_SCORE 종합 1위를 연속 유지 중인 소유자. UI·크라운 판정은 후속 단계 담당이라
   *  이번 단계에서는 갱신 로직 없이 항상 null로 안전하게 둔다. */
  titleHolderId: OwnerId | null;
  /** titleHolderId가 연속 유지되기 시작한 world.t. 미달성이면 null */
  titleHeldSinceT: number | null;
};

export type World = {
  version: 2 | 3;
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
  /** v0.2 신설(spec.md §13.2·§13.4) — 기본값(시즌 1, t=0 시작)으로 항상 안전하게 채워진다 */
  seasonState: SeasonState;

  // ── v0.2 2단계: 세계지도·거점·원정·스텝(신설) ───────────────────────────
  /** 발굴단(spec.md §8.1). 초기엔 0개 — 단장을 고용해 팀을 만들어야 생긴다. */
  teams: ExpeditionTeam[];
  /** 해금된 발굴단 슬롯 수(1~MAX_EXPEDITION_TEAMS_CAP). `teams.length`의 상한이다. */
  maxTeams: number;
  /** 고용한 스텝 전원(단장·관장·경매관장, notes/staff.md). */
  staff: Staff[];
  /** 무료 감정권 보유 수(world-map.md §4 미탐사 보너스). runAppraisal이 소비한다. */
  appraisalVouchers: number;
  /** 한 번이라도 on_site로 도달한 거점(영구 플래그, 시즌 한정 — world-map.md §8.5). */
  visitedSites: Partial<Record<SiteId, boolean>>;
  /** 그 거점에서 미탐사 보너스(층1 최초 돌파)를 이미 지급했는가(시즌 한정). */
  unexploredBonusGranted: Partial<Record<SiteId, boolean>>;
  /** 마지막 거점 이전(relocateBase) 시각. 쿨다운(RELOCATION_COOLDOWN_HOURS) 판정용 */
  lastRelocationAt: number | null;
};

export type StepReport = {
  drops: { artifactId: string; tier: Tier }[];
  appraised: { artifactId: string; tier: Tier; value: number }[];
  lost: { artifactId: string; owner: string }[];
  won: string[];
  layerUps: number;
};

/** 발굴단(spec.md §8.1). 감정소·보관소와 달리 거점에 종속되지 않는 전역 자원이다.
 *  `World.teams`에 실제로 연결된다(2단계 — app/src/game/expedition.ts). */
export type ExpeditionTeam = {
  id: string;
  foremanId: string;
  workers: number;
  gearLevel: number;
  status: "idle" | "traveling_out" | "on_site" | "traveling_back";
  targetSite: SiteId;
  dispatchedAt: number;
  /** status가 on_site로 바뀌는 시각 */
  arrivesAt: number;
  /** status가 idle로 바뀌는 시각(귀환 완료) */
  returnsAt: number;
  /** 이 원정에 미스헵이 발생했는가(파견 시점 1회 판정, spec.md §8.3) */
  mishapRolled: boolean;
  routine: { enabled: boolean; target: SiteId } | null;
};

/**
 * 고용 스텝 3직군(notes/staff.md §1~§3). 직군마다 스탯 이름이 달라 판별
 * 유니온으로 선언한다 — `any`로 뭉개지 않는다. 스탯 범위는 공통으로 1~100
 * (`STAFF_STAT_MIN`~`STAFF_STAT_MAX`, notes/staff.md §0). `World.staff`에
 * 실제로 연결된다(2단계 — app/src/game/staff.ts). 단, 관장·경매관장은 박물관·
 * 경매장 시설(3단계 이후 범위)이 없어 아직 고용 액션이 없다 — 급여·능력치
 * 공식만 미리 구현해 둔다.
 */
export type Foreman = { id: string; name: string; role: "foreman"; leadership: number; navigation: number };
export type Curator = { id: string; name: string; role: "curator"; curation: number; securitySense: number };
export type Auctioneer = { id: string; name: string; role: "auctioneer"; negotiation: number; logistics: number };
export type Staff = Foreman | Curator | Auctioneer;

// ════════════════════════════════════════════════════════════════════════
// v0.2 후속 단계 타입 — 선언만 한다(spec.md §9·§13.4). 시설·시즌 영속화는
// 이번 2단계 범위가 아니다. 아래 타입은 아직 World의 어떤 필드에도 연결돼
// 있지 않다 — 후속 단계가 실제로 배선한다.
// ════════════════════════════════════════════════════════════════════════

/** 감정소·보관소(전역)와 박물관·경매장(거점 종속, spec.md §8.1)을 함께 표현한다.
 *  등급/레벨의 의미는 kind에 따라 다르다(§9.1·§10.4·§11.1의 비용 곡선 참조). */
export type FacilityKind = "lab" | "vault" | "museum" | "auctionHouse";
export type Facility = {
  id: string;
  kind: FacilityKind;
  /** 박물관·경매장은 거점에 종속된 건물이라 site가 있다. 감정소·보관소는 전역이라 없다 */
  site?: SiteId;
  grade: number;
};

/** 시즌 종료 시 vault에서 헌정된 T4 유물의 영구 기록(spec.md §13.4 1항) */
export type HallOfFameEntry = { artifactId: string; dedicatedSeason: number; ownerName: string };

/**
 * 계정 영구 기록(spec.md §13.4, notes/decisions.md G2 — "SaveV1과 분리된 스키마").
 * World(시즌 한정)와 다른 저장 단위다 — 이번 단계는 이 타입과 `applySeasonRollover`
 * 순수 함수만 구현한다. localStorage 영속화는 후속 단계가 맡는다.
 */
export type PersistentRecord = {
  legacyFame: number;
  hallOfFame: HallOfFameEntry[];
  carryoverFundsCredit: number;
  /** T4 최초 발굴 누적(시즌을 넘어 영구). FAME_SCORE가 이 값 + 이번 시즌
   *  `Stats.firstT4Finds`를 더해 쓴다 */
  firstT4Finds: number;
  /** 시즌 종료 시점 RANK_SCORE 1위 기록(spec.md §13.2 2번). 크라운 판정 로직은
   *  후속 단계 — 이번 단계는 필드만 선언한다 */
  championHistory: { season: number; ownerName: string; rankScore: number }[];
};
