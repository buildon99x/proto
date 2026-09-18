export type Tier = 0 | 1 | 2 | 3 | 4;

/** 유물 데이터 검증 상태(notes/artifacts-dataset.md §5, G-B8). "pending"은
 *  드랍 풀에서 제외된다(engine.ts의 candidates()·spawnTip()) — 데이터는 존재하되
 *  아직 세계 원장에 등재되지 않은 상태다. */
export type SourceStatus = "verified" | "pending";

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
  /** 드랍 시점 보존 상태 기준값(notes/artifacts-dataset.md §4 공식으로 결정론
   *  산출). VaultItem.condition의 초기값으로 그대로 쓰인다. */
  condition: Condition;
  /** 출처. 기관 공식 소장품 페이지·공공 DB·학술자료. 최소 1개, T4는 독립 출처 2개
   *  이상(notes/artifacts-dataset.md §5). */
  source: string[];
  /** "pending"은 드랍 풀에서 제외된다(G-B8, engine.ts candidates()·spawnTip()). */
  sourceStatus: SourceStatus;
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
  /** 드랍 시점 결정론적 기준값(artifact.condition — artifacts.ts의 티어별 기준값+지터)
   *  으로 채워지고, 이후 습도(저하)·복원(상승) 틱이 갱신한다(spec.md §9.4, 4단계).
   *  `value`는 condition이 바뀔 때마다 CONDITION_VALUE_FACTOR를 다시 곱해 갱신된다
   *  (engine.ts recomputeVaultValue) — G6/G51.7이 미배선으로 남긴 항목을 여기서 잇는다. */
  condition: Condition;
  /** 박물관에 전시 중이면 true(spec.md §10, 4단계). ASSET_SCORE(§13.1, G49/B4)가
   *  전시 중 유물을 자산 축에서 제외한다. */
  displayed?: boolean;
  /** 전시 중인 거점·슬롯(displayed=true일 때만 유효) */
  museumSite?: SiteId;
  slot?: number;
  /** 이번 전시 세션이 시작된 world.t — FRESHNESS(전시경과시간) 계산의 기준점.
   *  전시를 내리는 순간 그 시점의 freshness를 restBaseline에 스냅샷하고 비운다. */
  displaySessionStart?: number;
  /** 마지막으로 전시에서 내려온 시각의 freshness 값(회복 곡선의 시작점) */
  restBaseline?: number;
  /** 마지막으로 전시에서 내려온 world.t(회복 경과시간 계산 기준) */
  restSince?: number;
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
  /** 이 라이벌이 한 번이라도 얻은 종 id 목록(고유 종 단위). **종 단위로만** 채운다
   *  (마무리 패스 — 사본을 매번 push하면 fullRanking()의 도감 축이 step()마다
   *  이 배열을 읽어 O(n²)로 느려진다, notes/decisions.md G56). 매각해도 빠지지
   *  않는다 — "한 번이라도 소유"를 영구히 기록한다. */
  owned: string[];
  catchup: number;
  /**
   * 라이벌의 홈 거점(spec.md §12.1, notes/decisions.md G18/A14). 시작 시
   * favSite와 같은 곳으로 고정된다 — 라이벌도 플레이어처럼 무료 base 1곳에서
   * 시작한다는 규칙을 그대로 반영한 것이다. 원정 이동시간·제보 급파 거리 계산의
   * 기준점이다.
   */
  homeSite: SiteId;
  /**
   * 제보 레이스 중 원거리(§8.6 급파) 추적 상태. 홈 거점이 아닌 곳의 제보를
   * 쫓을 때만 채워진다(같은 거점이면 즉시 반응이라 필요 없다) — spawnTip이
   * 가장 가까운 유휴(추적 중이 아닌) 라이벌 1명에게만 부여한다(§12.3).
   * arrivesAt에 도달하면 engine.ts의 resolveRivalTipChases가 1회 판정하고 비운다.
   */
  tipChase?: { artifactId: string; layer: number; arrivesAt: number } | null;
};

export type Tip = {
  artifactId: string;
  site: SiteId;
  layer: number;
  remain: number;
  /** 같은 제보를 받은 라이벌 id(같은 거점에 홈을 둔 라이벌 — 즉시 반응 대상) */
  rivals: string[];
  /** [집중 굴착]을 눌렀는가(spec.md §8.6, G45/A8) — TIP_PLAYER_HIT 대신
   *  TIP_FOCUS_DIG_HIT_CHANCE를 적용하고, 그 팀의 원정비를 2배로 만든다. */
  focused?: boolean;
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
  version: 2 | 3 | 4 | 5 | 6;
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

  // ── v0.2 4단계: 시설과 시장(신설) ────────────────────────────────────────
  /** 보관소 정원 레벨(1부터, vaultCapacity(level)) */
  vaultLevel: number;
  /** 습도조절 레벨(1부터, conditionDecayChancePerDay) */
  humidityLevel: number;
  /** 복원기술 레벨(1부터, restorationAttemptHours·restorationSuccessChance) */
  restorationLevel: number;
  /** 보안 레벨(1부터, theftInitialGraceHours) */
  securityLevel: number;
  /** 마지막으로 습도저하 판정을 처리한 일(day) 인덱스 — floor(t/86400) 경계
   *  판정용(스텝 크기 무관, promoteStaffTick과 같은 패턴). */
  lastConditionDay: number;
  /** 다음 복원 시도 예정 world.t. RESTORATION_BASE_HOURS/level 간격이 복원기술
   *  레벨이 오를 때마다 짧아지므로(동적 간격), 고정 나머지 연산 대신 다음 시각을
   *  직접 들고 다니며 발동 때마다 그 시점의 레벨로 재계산한다. */
  nextRestorationAttemptAt: number;
  /** 박물관 30% 캡(G24) 분모의 지수이동평균 근사(₩/s). spec.md의 "1시간 이동평균"을
   *  버퍼 없이 구현한 것 — 표준 1차 저역통과 필터로, 짧은 발굴 공백에서 캡이
   *  순간적으로 0으로 붕괴하는 걸 막는다(§10.2 취지 그대로). */
  museumDigEma: number;
  /** 건립된 박물관(등급1~4만 — 등급0 임시 전시대는 별도 레코드 없이 base마다
   *  암묵적으로 존재한다, museum.ts의 museumOf() 참조). */
  museums: Museum[];
  /** 건립된 경매장 */
  auctionHouses: AuctionHouse[];
  /** 암시장 — 누적 슬롯(시간 리셋 아님, G3) */
  blackMarket: BlackMarketState;
  /** 진행 중인 도난 사건(72h 회수 창). 회수기간 타이머는 world.t가 아니라
   *  onlineElapsedSeconds로 잰다 — 척추 3번(오프라인 중 영구 상실 금지)의 핵심 장치. */
  theftEvents: TheftEvent[];
  /** 플레이어가 온라인이었던 시간의 누적 합(초). step(w, dt, offline=false)일 때만
   *  증가한다. 도난 회수기간·회수 시도 주기가 전부 이 값만 참조해야
   *  "오프라인 중 회수기간이 흐르면 안 된다"(척추 3번)를 만족한다. */
  onlineElapsedSeconds: number;

  // ── 마무리 패스: G51.2/G55.1이 남긴 명성 축 공백 ─────────────────────────
  /** 박물관 누적 관람객(spec.md §13.1 FAME_SCORE의 첫 항). 4단계(G54)가
   *  순간 관람객(museumVisitorsPerDay)만 계산하고 누적 카운터를 두지 않아
   *  명성 축이 항상 0이었다(G55.1 보고) — 이 필드가 그 누적분을 받는다.
   *  시즌 한정(applySeasonRollover가 0으로 되돌린다) — PersistentRecord로
   *  이월되는 건 legacyFame·firstT4Finds뿐이다(spec.md §13.4가 관람객 이월을
   *  요구하지 않는다). */
  museumCumulativeVisitors: number;
};

/** 박물관(spec.md §10). 등급0(임시 전시대)은 건립 액션이 없어(TEMP_EXHIBIT_COST=0)
 *  이 배열에 들어가지 않는다 — base인데 이 배열에 항목이 없으면 등급0으로 취급한다
 *  (museum.ts museumOf() 참조). */
export type Museum = {
  id: string;
  site: SiteId;
  grade: number; // 1~4
  marketingLevel: number; // 1부터
  curatorId?: string;
};

export type AuctionListing = {
  vaultUid: number;
  artifactId: string;
  /** 상장 시점 평가액(감정 완료 값) — 낙찰가는 정산 시점의 LOCAL_PRICE_MULT·
   *  AUCTION_PRICE_MULT를 곱해 재계산한다(engine.ts settleAuctionListing). */
  value: number;
  listedAt: number;
  settleAt: number;
  diggerForemanId?: string;
};

export type AuctionHouse = {
  id: string;
  site: SiteId;
  grade: number; // 1~4
  auctioneerId?: string;
  listings: AuctionListing[];
};

export type BlackMarketListing = {
  id: number;
  kind: "loose" | "stolen";
  artifactId: string;
  /** loose: 추정가(층 기대평가액). stolen: 평가액(이미 감정된 값) — 기준이 다르다(§11.5) */
  estimate: number;
  theftEventId?: string; // kind==="stolen"일 때만
  /** 이 매물이 암시장에 상장된 world.t. G55.9가 남긴 공백(72h 우선권 배지가
   *  감쇠를 추적하지 못함)을 닫는 데 쓴다 — kind==="stolen"인 매물의 L2 배지가
   *  이 값 기준으로 THEFT_RECOVERY_WINDOW_HOURS(72h)가 지나면 사라진다. */
  listedAt: number;
};

export type BlackMarketState = {
  listings: BlackMarketListing[];
};

/** 도난 사건(spec.md §9.4·§11.5, G9). 72h 회수 창은 onlineElapsedSeconds 기준 —
 *  World.onlineElapsedSeconds 주석 참조(척추 3번). */
export type TheftEvent = {
  id: string;
  artifactId: string;
  tier: Tier;
  value: number;
  site: SiteId; // 도난이 발생한 박물관 거점 — 회수 시 그 거점 관장의 SECURITY_SENSE를 쓴다
  stolenAtOnlineSeconds: number;
  recoveryDeadlineOnlineSeconds: number;
  nextRecoveryAttemptOnlineSeconds: number;
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
  /** 파견 시점의 targetSite 층수(마무리 패스 신설, notes/decisions.md G56) —
   *  finalizeExpedition의 원정비 노셔널 계산이 귀환 시점(최종) 층만 쓰면, 한
   *  회차 안에서 여러 층을 오른 원정의 초반 저층 구간까지 최종(최고)층 단가로
   *  소급 청구해 원정비가 실제 벌어들인 현금 유동성보다 훨씬 크게 튄다(실측 —
   *  팀 하나가 왕복 한 번에 수천만~수억 원을 청구당해 funds가 영구 마이너스로
   *  고정됐다). 파견 시점 층과 귀환 시점 층 두 지점의 단가를 평균해 이 소급
   *  과청구를 완화한다. */
  layerAtDispatch: number;
  routine: { enabled: boolean; target: SiteId } | null;
  /** 이번 회차 원정비 배수 누적(집중 굴착 ×2, 급파 ×3, spec.md §8.6). 귀환 정산
   *  (finalizeExpedition) 후 1로 리셋된다. 생략 시 1(배수 없음)로 취급한다. */
  costMult?: number;
  /**
   * 제보 급파로 파견됐을 때, 배너(w.tip)가 만료된 뒤에도 그 팀이 이 특정 유물을
   * 계속 쫓고 있음을 기록한다(spec.md §8.6 — "제보 만료와 무관하게 세계 원장의
   * 실제 잔여 수량으로 판정한다"). on_site 전환 시 engine.ts가 이 값을 참조해
   * TIP_PLAYER_HIT을 적용한다. 그 유물을 얻거나(성공) 세계 재고가 바닥나면(실패)
   * null로 비운다.
   */
  tipChase?: { artifactId: string; layer: number } | null;
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
// v0.2 시즌 롤오버 타입(spec.md §13.4) — 시설(박물관·경매장·보관소)은 위에서
// World에 직접 연결된 구체 타입(Museum·AuctionHouse 등, 4단계)으로 배선됐다.
// 여기 남는 건 계정 영구 기록뿐이다 — localStorage 영속화는 여전히 후속(UI)
// 단계가 맡는다.
// ════════════════════════════════════════════════════════════════════════

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
