export type Tier = 0 | 1 | 2 | 3 | 4;

/** 유물 데이터 검증 상태(notes/artifacts-dataset.md §5, G-B8). "pending"은
 *  드랍 풀에서 제외된다(engine.ts의 candidates()·spawnTip()) — 데이터는 존재하되
 *  아직 세계 원장에 등재되지 않은 상태다. */
export type SourceStatus = "verified" | "pending";

/**
 * 실사 이미지 라이선스 허용 목록 (v0.4 — notes/decisions.md G72,
 * notes/artifacts-dataset.md §6).
 *
 * **전파조건(share-alike)이 붙은 라이선스는 이 목록에 없다.** CC BY-SA 이미지를
 * 게임 번들에 넣으면 그 번들을 SA 조건으로 배포해야 한다는 해석을 감당해야 하는데,
 * 장식·보조 자료 한 장 때문에 레포 전체의 배포 조건을 건드릴 이유가 없다. 퍼블릭
 * 도메인·CC0·CC BY만 쓴다 — CC BY는 저작자 표시만 하면 되고, 그 표시는 상세
 * 화면에 기계가 읽을 수 있는 형태로 같이 싣는다.
 */
export type ImageLicense =
  | "pd"          // 퍼블릭 도메인(저작권 만료·저작권 포기·미국 정부 저작물 등)
  | "cc0"         // CC0 1.0
  | "cc-by-4.0"
  | "cc-by-3.0"
  | "cc-by-2.5"
  | "cc-by-2.0";

/**
 * 실사 이미지 한 장 (v0.4 — notes/decisions.md G72).
 *
 * `file`은 **번들 안의 경로**다. 런타임에 외부 요청을 하지 않는다는 협상불가 항목
 * (프로젝트 AGENTS.md)을 지키기 위해, 수집은 개발 시점에 끝나고 파일만 레포에
 * 들어온다(scripts/fetch-images.mjs).
 *
 * 라이선스·저작자·원본 URL은 **선택 필드가 아니다.** 이미지를 화면에 띄우는 쪽이
 * 표기 의무를 지므로, 데이터가 그 의무를 이행할 수 있는 형태로 들고 있어야 한다.
 */
export type ArtifactImage = {
  /** 번들 내 경로(예: `artifacts/tutankhamun-mask.jpg`). BASE_URL 기준 상대경로 */
  file: string;
  width: number;
  height: number;
  bytes: number;
  license: ImageLicense;
  /** 저작자 표기 문자열. 라이선스가 요구하면 반드시 화면에 노출한다 */
  credit: string;
  /** 원본 파일 설명 페이지 URL(위키미디어 커먼즈 File: 페이지) */
  sourceUrl: string;
  /** 라이선스 전문 URL. pd·cc0는 생략 가능 */
  licenseUrl?: string;
  /** 수집 시각(ISO 8601). 원본 라이선스가 나중에 바뀌었는지 추적하는 기준점 */
  fetchedAt: string;
};

/**
 * 실사 디테일 (v0.4 — notes/decisions.md G73).
 *
 * `note`는 2~3문장 규격이다(notes/artifacts-dataset.md §5 B8) — 카드 뒤집기 연출의
 * 리듬 때문이다. 그래서 "왜 남았는지, 무엇이 특이한지" 같은 밀도 높은 사실은
 * `note`에 밀어 넣지 않고 이 필드로 갈라, **상세 화면에서만** 접힌 채로 둔다.
 * 드랍 연출(RevealModal)은 이 필드를 읽지 않는다.
 */
export type ArtifactDetail = {
  /** 계측·재질 사실. 라벨-값 짧은 쌍의 목록 */
  specs?: { label: string; value: string }[];
  /** 이 물건이 왜 남았는지 · 무엇이 특이한지. 2~4문장. `note`와 겹치지 않게 쓴다 */
  story?: string;
  /** 발견·소장 경위(발굴 연도·발굴자·이동 경로) */
  provenance?: string;
  /** 이 절의 근거 URL. `Artifact.source`와 별도로, 문장 단위 근거가 있을 때만 채운다 */
  refs?: string[];
  /**
   * 이 디테일의 검증 상태. §5의 `sourceStatus`와 같은 어휘를 쓴다 — 1차 자료를
   * 실제로 열어 대조했을 때만 "verified"다. 네트워크가 막힌 세션에서 쓴 항목은
   * 전부 "pending"이고, 상세 화면의 이 블록에만 "검증 대기" 배지가 붙는다
   * (드랍 연출·감정 카드에는 붙지 않는다 — §5 B8).
   */
  sourceStatus: SourceStatus;
};

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
  /**
   * 실루엣 변형 인덱스(0 ~ SHAPE_VARIANTS-1, v0.4 — notes/decisions.md G69).
   * `shape` 하나에 실루엣 6종이 있고 이 값이 그중 하나를 고른다. 시드 해시로
   * 뽑으면 같은 (거점, shape, palette) 조합 안에서 1/6 확률로 겹쳐 아이콘이
   * 나란히 붙으므로, `artifacts.ts`가 조합별 라운드로빈으로 배정한다.
   */
  spriteVariant: number;
  /** 드랍 시점 보존 상태 기준값(notes/artifacts-dataset.md §4 공식으로 결정론
   *  산출). VaultItem.condition의 초기값으로 그대로 쓰인다. */
  condition: Condition;
  /** 출처. 기관 공식 소장품 페이지·공공 DB·학술자료. 최소 1개, T4는 독립 출처 2개
   *  이상(notes/artifacts-dataset.md §5). */
  source: string[];
  /** "pending"은 드랍 풀에서 제외된다(G-B8, engine.ts candidates()·spawnTip()). */
  sourceStatus: SourceStatus;
  /** 실사 디테일(v0.4). 없으면 상세 화면에서 그 블록이 뜨지 않는다 — `game/details.ts` */
  detail?: ArtifactDetail;
  /** 실사 이미지(v0.4). 없으면 도트 아이콘만 뜬다 — `game/images.generated.ts` */
  image?: ArtifactImage;
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
  /**
   * 기록패로 받은 사람 상대(고스트)일 때만 채워진다(v0.5, notes/decisions.md G76).
   * 없으면 NPC 라이벌이다 — `RIVAL_SEED`가 만드는 6명은 이 세 필드가 전부 undefined이고,
   * `fullRanking()`도 undefined를 0으로 취급하므로 NPC 채점은 v0.4와 완전히 같다.
   */
  ghost?: GhostMeta;
  /**
   * 기록패 시점에 상대가 이미 갖고 있던 종 수 중 **이 세계에서 실제로 캐지 않은 몫**.
   * `owned` 배열에 가짜 id를 1,400개 채우는 대신 숫자로 들고 있는다 — 배열을 채우면
   * 세이브가 그만큼 커지고 `owned.includes()`가 매 드랍마다 그 길이를 훑는다.
   * `fullRanking()`의 도감 축이 `owned.length`에 이 값을 더해 읽는다.
   */
  ownedExtra?: number;
  /**
   * 기록패의 명성 점수 중 유일(T4) 최초발굴로 설명되지 않는 몫 = 관람객 항.
   * 라이벌 채점식에는 관람객 항이 없어(박물관이 없다) 이걸 따로 들지 않으면
   * 사람 상대의 명성이 실제보다 낮게 찍힌다 — 기록패 왕복이 어긋나는 유일한 축이었다.
   */
  fameExtra?: number;
};

/** 고스트의 출처 정보(v0.5). 화면이 "언제 찍힌 기록인지"를 숨기지 않기 위해 필요하다 */
export type GhostMeta = {
  /** 같은 사람인지 판별하는 키. 기록패 본문에서 파생되며 이름과 무관하다 */
  key: string;
  /** 기록패를 구울 때의 상대 `world.t`(초) — "상대의 플레이 시간" */
  capturedT: number;
  /** 내 세계에서 이 고스트를 받아들인 시각(내 `world.t`, 초) */
  receivedT: number;
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
  /** 엔진이 [집중 굴착]을 대신 걸었는가(v0.6.6) — 진귀·국보 제보에 현지 팀이 있으면
   *  자동으로 켜진다(`settings.autoFocusTips`). 유일은 늘 수동이라 여기 걸리지 않는다.
   *  `focused`와 같이 켜지며, 화면이 "눌렀다"와 "자동으로 걸렸다"를 가르는 데 쓴다. */
  autoFocused?: boolean;
  /** 배너가 뜬 시각(world.t, 초). `TIP_MIN_RESPONSE_SECONDS` 반응 유예의 기준이다(v0.6) */
  openedAt: number;
  /** 결판이 난 뒤의 상태. 나도 배너는 수명을 다 산다 — 결과를 보여 주고 닫힌다
   *  (v0.6, `notes/play-telemetry.md` §7.3의 "결과를 몇 초 보여 준 뒤 닫는다"). */
  resolved?: { outcome: "won" | "lost"; at: number } | null;
};

export type LogKind = "drop" | "rival" | "lost" | "won" | "system";
export type LogEntry = { t: number; kind: LogKind; text: string };

export type Settings = {
  /** 감정 **직후** 자동 매각 기준(§2.4) — `AUTO_SELL_MAX_TIER`(=1)로 한 번 더
   *  잘린다. 그 종을 이미 갖고 있을 때만 판다. */
  autoSellBelow: Tier | null;
  /** 소장고에 **이미 들어와 있는** 중복분의 자동 매각 기준(v0.3.1, G68) —
   *  `AUTO_SELL_SPARE_MAX_TIER`(=2)로 잘리고, 종당 1점·전시 중·국보·유일은
   *  절대 건드리지 않는다. null이면 끔(기본값) — 매각은 자산 축을 깎으므로
   *  켜고 끄는 것 자체가 전략적 선택이다. */
  autoSellSpareBelow: Tier | null;
  /**
   * 중복분을 **어디로 보낼 것인가**(v0.3.4). `"sell"`은 즉시 직접매각,
   * `"auction"`은 경매장에 출품한다(경매장이 없거나 슬롯이 차 있으면 그 회차는
   * 그냥 건너뛴다 — 직접매각으로 몰래 바꾸지 않는다).
   *
   * 경매 출품은 168시간 계측에서 **플레이어 조작의 64%**(189회 × 3단계)를
   * 차지한 단 하나의 조작이었다(`notes/play-telemetry.md` §2.1). 규칙 판정은
   * `spareVaultItems()` 하나가 이미 다 갖고 있어서, 출구만 바꾸면 된다.
   */
  spareDestination: "sell" | "auction";
  muted: boolean;
  /** 인부·장비·감정소 잉여 자금 자동 재투자(notes/decisions.md G57) — 기본 켬.
   *  클릭 없이도 발굴력이 자라게 하는 배경 루틴의 온/오프 스위치일 뿐, 꺼도
   *  손실이 생기지 않는다(척추 4번 — 클릭은 항상 선택). */
  autoReinvest: boolean;
  /** 진귀·국보 제보의 자동 집중 굴착(v0.6.6, `notes/decision-tree-10h.md` §6 P2) — 기본 켬.
   *  현지 팀이 있으면 엔진이 [집중 굴착]을 한 번 건다(원정비 ×2는 그대로 붙는다).
   *  유일(T4)은 이 설정과 무관하게 늘 버튼이다. */
  autoFocusTips: boolean;
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
  version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
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
  /**
   * 직전 제보가 유일(T4)이었는가 — 유일이 **연달아 편성되지 않게** 하는 한 칸짜리
   * 기억이다(`TIP_UNIQUE_PRIORITY`, engine.ts `spawnTip`).
   *
   * 선택 필드라 **세이브 버전을 올리지 않는다**: 값이 없으면 `false`로 읽히고,
   * 그 경우 다음 제보가 유일이 될 수 있을 뿐이라 옛 세이브가 겪는 차이는 제보
   * 한 번의 대상뿐이다. 진행 중이던 판정·원장·진척 중 어느 것도 이 값에 걸려
   * 있지 않다(v10→v11이 층 진척을 환산해야 했던 것과는 성격이 다르다).
   */
  lastTipWasUnique?: boolean;
  /**
   * 유일 제보가 이 세이브에서 한 번이라도 결판났는가 — "첫 유일은 대응해야 한다"를
   * 한 번만 가르치기 위한 표식이다(`TIP_FIRST_UNIQUE_TAUGHT`). `lastTipWasUnique`와
   * 같은 이유로 선택 필드이고 세이브 버전을 올리지 않는다(없으면 아직 안 배운 것).
   */
  taughtUniqueLoss?: boolean;
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
  /**
   * 순위 성장률 표본(v0.5). "이 속도면 몇 시간 뒤에 추월한다"를 계산하는 유일한 근거다 —
   * 순위 점수는 발굴력의 단순 함수가 아니라서(자산·도감·명성이 서로 다른 속도로 는다)
   * 추정식을 세우는 대신 **실제로 두 시점을 재서 나눈다**.
   *
   * `step()`이 아니라 UI 틱이 채운다(`sampleRanks`). `step()` 안에서 채우면 오프라인
   * 적분의 스텝 무관성 검증(`qa_expedition.ts`)이 보는 세계 상태가 스텝 크기에 따라
   * 갈라진다 — 표시용 값 하나 때문에 그 성질을 잃을 이유가 없다. 없어도(undefined)
   * 게임은 정상이고, 순위표가 "측정 중"이라고 적을 뿐이다.
   */
  rankSample?: { t: number; byId: Record<string, number> } | null;

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
  /** 박물관 30% 캡(G24) 분모의 지수이동평균 근사($/s). spec.md의 "1시간 이동평균"을
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
   *  팀 하나가 왕복 한 번에 수천만~수억 달러를 청구당해 funds가 영구 마이너스로
   *  고정됐다). 파견 시점 층과 귀환 시점 층 두 지점의 단가를 평균해 이 소급
   *  과청구를 완화한다. */
  layerAtDispatch: number;
  /**
   * 귀환 즉시 자동 재파견(spec.md §8.4). `target`이 `"auto"`면 그때그때
   * `recommendSites()`가 고른 곳으로 간다 — 미방문 거점을 먼저, 그다음 아직
   * 못 채운 종이 많은 순이다. 고정 거점을 물리면 그곳만 왕복한다.
   *
   * 기본값이 `{ enabled: true, target: "auto" }`인 이유는 계측이다(v0.3.3,
   * `notes/play-telemetry.md` §1): 루틴이 꺼진 채로는 발굴단이 한 거점만
   * 왕복하거나 유휴로 멈춰, 탭만 열어 둔 플레이가 2일차부터 완전히 정지했다.
   */
  routine: { enabled: boolean; target: SiteId | "auto" } | null;
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
  /**
   * 기록패에 찍히는 내 표시 이름(v0.5). 시즌이 아니라 계정에 붙는 값이라 여기 둔다.
   * `loadRecord()`가 기본값 위에 얕게 덮어쓰므로 이 필드가 없는 옛 저장도 그대로 읽힌다
   * — 마이그레이션 체인이 필요 없다.
   */
  ownerName: string;
};
