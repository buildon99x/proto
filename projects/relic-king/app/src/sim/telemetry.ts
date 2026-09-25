/**
 * 플레이 계측 — "무슨 일이, 언제, 누구의 손으로 일어났는가"를 기록한다.
 *
 * ## 왜 상태 diff인가
 *
 * 엔진에 훅을 심지 않는다. `World`는 이미 플레이어가 화면에서 보는 모든 것을
 * 들고 있으므로, 틱 전후 스냅샷을 비교하면 이벤트가 그대로 떨어진다. 엔진을
 * 건드리면 스텝 무관성 검증(`qa_expedition`·`qa_economy`)이 서 있는 경계를
 * 흔들게 되고, 계측 때문에 게임이 달라지면 계측의 의미가 없다.
 *
 * ## 왜 phase 가 핵심인가
 *
 * 같은 틱 안에서 두 번 잰다 —
 * - `act()`(정책, = 사람이 화면에서 눌렀어야 할 것) 전후 → **player**
 * - `advance()`(엔진이 저 혼자 흘러간 시간) 전후 → **auto**
 *
 * 이 구분이 "어느 정도 노력으로"에 대한 답이다. player 이벤트는 전부 실제
 * 조작이 필요했던 것이고, 각 종류의 조작 단계 수(`eval.md` §22.9·§23.3 실측)를
 * 곱하면 그 세션이 사람에게 요구한 **총 조작량**이 나온다.
 */
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { LOCKED_HOLD_CAP, SITES, vaultCapacity } from "../game/balance";
import { codexProgress } from "../game/engine";
import type { StepReport, Tier, Tip, World } from "../game/types";

export type EventPhase = "player" | "auto";

export type EventKind =
  // ── 코어 루프 ──────────────────────────────────────────────
  | "drop"            // 유물이 나왔다
  | "appraised"       // 감정이 끝나 이름·평가액이 열렸다
  | "newSpecies"      // 도감에 처음 오른 종 (재미 정의 ③)
  | "sold"            // 감정 후 매각
  | "blindSold"       // 미감정 매각
  | "auctionSettled"  // 경매 낙찰
  | "layerUp"         // 층 돌파
  // ── 선점·상실 (재미 정의 ①②) ────────────────────────────
  | "tipOpened"       // 제보 배너가 떴다
  | "tipClosed"       // 제보가 끝났다(승·패·만료 — detail 참조)
  | "raceWon"
  | "raceLost"
  | "lostToRival"     // 세계 재고 0 — 영구 상실
  | "firstT4"         // 유일 최초 획득
  // ── 확장 (거의 전부 플레이어 조작) ────────────────────────
  | "siteUnlocked"
  | "teamSlotUnlocked"
  | "foremanHired"
  | "teamDispatched"
  | "teamReturned"
  | "teamUpgraded"
  | "digUpgraded"     // 인부·장비·감정소
  | "facilityUpgraded" // 보관소·습도·복원·보안
  | "museumBuilt" | "museumUpgraded" | "curatorHired" | "displayed"
  | "auctionBuilt" | "auctionUpgraded" | "auctioneerHired" | "auctionListed"
  // ── 위협·정산 ────────────────────────────────────────────
  | "theft" | "theftResolved"
  | "vaultOverflow"   // 소장고 정원 초과 시작 — 보존 저하 2배
  | "sealedBacklog"   // 봉인 보관이 경고 임계를 넘었다
  | "seasonRollover"
  | "ending";

/**
 * **반복 이벤트** — 화면이 움직이긴 하지만 하나하나를 기억하지는 않는 것들.
 * 드랍 주기가 하한에 걸려 시간당 수백 건으로 나온다(실측).
 */
export const AMBIENT: EventKind[] = [
  "drop", "appraised", "sold", "blindSold", "auctionSettled", "auctionListed"
];

/**
 * **의미 있는 이벤트** — 플레이어가 "아, 뭔가 일어났다"고 기억할 만한 것.
 * 재미 정의 3문장이 걸리는 자리가 전부 여기 있다: 신규 종(③ 실존의 무게),
 * 레이스·상실(② 선점의 스릴), 유일 최초 획득(① 배타적 소유).
 * 지루함은 "아무 일도 없다"가 아니라 **이 목록이 비어 있는 시간**이다.
 *
 * 밀도 원장(A축)이 "23종 중 몇 종"을 셀 때 쓰는 분모가 이 배열의 길이다 —
 * `playlog`와 `density`가 같은 목록을 봐야 두 계측이 같은 게임을 말한다.
 */
export const MEANINGFUL: EventKind[] = [
  "newSpecies", "layerUp", "tipOpened", "raceWon", "raceLost", "lostToRival", "firstT4",
  "siteUnlocked", "teamSlotUnlocked", "foremanHired", "teamDispatched", "teamReturned",
  "displayed", "museumBuilt", "museumUpgraded", "auctionBuilt", "curatorHired",
  "theft", "theftResolved", "vaultOverflow", "sealedBacklog", "seasonRollover", "ending"
];

export type PlayEvent = {
  t: number;
  kind: EventKind;
  phase: EventPhase;
  n: number;          // 한 번에 몇 건인가(드랍 3점이면 n=3)
  tier?: Tier;
  detail?: string;
  /**
   * `tipClosed`에만 붙는다 — 그 배너가 **어떻게 끝났는가**. v0.6.1부터 결판은
   * 배너 수명 **안에서** 나고(`tip.resolved`), 배너는 결과를 보여 주며 남은 수명을
   * 산다. 그래서 "닫힌 틱에 승·패가 같이 찍혔는가"로 이유를 추정하던 옛 집계는
   * 결판을 한 번도 못 읽고 전부 만료로 셌다(완성도 진단 2판 §7 결함 4 — "승 0 /
   * 패 0 / 만료 169"). 배너가 떠 있는 동안 본 `tip.resolved`를 그대로 옮겨 적는다.
   */
  outcome?: "won" | "lost" | "expired";
};

type Snap = {
  drops: number; sold: number; blindSold: number; racesWon: number; racesLost: number;
  firstT4Finds: number;
  codexOwned: number;
  workers: number; gear: number; lab: number;
  vaultLevel: number; humidityLevel: number; restorationLevel: number; securityLevel: number;
  unlockedSites: number; maxTeams: number; teams: number; foremen: number;
  teamWorkers: number; teamGear: number;
  teamStatuses: string;
  displayed: number;
  museums: string; auctionHouses: string; curators: number; auctioneers: number;
  auctionListings: number;
  theftEvents: number; theftIds: string;
  tipId: string | null;
  tipResolved: "won" | "lost" | null;
  season: number; ended: boolean;
  overflow: boolean; sealedOver: boolean;
  layers: number;
};

function snap(w: World): Snap {
  let layers = 0;
  for (const s of SITES) layers += w.sites[s.id].layer;
  const stored = w.vault.filter((v) => !v.displayed).length;
  const sealed = w.pending.filter(
    (p) => w.lab < [1, 1, 2, 3, 4][ARTIFACT_BY_ID[p.artifactId].tier]
  ).length;
  return {
    drops: w.stats.drops, sold: w.stats.sold, blindSold: w.stats.blindSold,
    racesWon: w.stats.racesWon, racesLost: w.stats.racesLost, firstT4Finds: w.stats.firstT4Finds,
    codexOwned: codexProgress(w).owned,
    workers: w.workers, gear: w.gear, lab: w.lab,
    vaultLevel: w.vaultLevel, humidityLevel: w.humidityLevel,
    restorationLevel: w.restorationLevel, securityLevel: w.securityLevel,
    unlockedSites: SITES.filter((s) => w.sites[s.id].unlocked).length,
    maxTeams: w.maxTeams, teams: w.teams.length,
    foremen: w.staff.filter((s) => s.role === "foreman").length,
    teamWorkers: w.teams.reduce((a, t) => a + t.workers, 0),
    teamGear: w.teams.reduce((a, t) => a + t.gearLevel, 0),
    /**
     * `id:status:dispatchedAt`. **파견 시각을 같이 들고 다니는 이유**: 루틴이
     * 켜진 팀은 `finalizeExpedition`이 귀환 정산과 재파견을 **같은 틱에** 하므로
     * status만 보면 `on_site → traveling_out`으로만 보이고, 귀환도 파견도 둘 다
     * 사라진다(v0.6 실측 — 첫 10분 A축에서 "귀환"이 통째로 없었다). 거리 0
     * 원정은 같은 틱에 도착까지 해서 `idle → on_site`가 된다. 두 경우 모두
     * `dispatchedAt`이 바뀌는 것으로 잡힌다.
     */
    teamStatuses: w.teams.map((t) => `${t.id}:${t.status}:${t.dispatchedAt}`).join(","),
    displayed: w.vault.filter((v) => v.displayed).length,
    museums: w.museums.map((m) => `${m.site}:${m.grade}:${m.marketingLevel}`).join(","),
    auctionHouses: w.auctionHouses.map((a) => `${a.site}:${a.grade}`).join(","),
    curators: w.staff.filter((s) => s.role === "curator").length,
    auctioneers: w.staff.filter((s) => s.role === "auctioneer").length,
    auctionListings: w.auctionHouses.reduce((a, h) => a + h.listings.length, 0),
    theftEvents: w.theftEvents.length,
    theftIds: w.theftEvents.map((e) => e.id).join(","),
    tipId: w.tip ? `${w.tip.artifactId}@${w.tip.site}` : null,
    tipResolved: w.tip?.resolved?.outcome ?? null,
    season: w.seasonState.season, ended: w.ended,
    overflow: stored > vaultCapacity(w.vaultLevel, codexProgress(w).owned),
    sealedOver: sealed >= LOCKED_HOLD_CAP,
    layers
  };
}

/** 한 판(run)의 이벤트 기록기. 정책 호출과 엔진 전진을 각각 감싼다. */
export class PlayRecorder {
  readonly events: PlayEvent[] = [];
  private prev: Snap;
  private tipOpenedAt: number | null = null;
  /** 지금 떠 있는 배너에서 본 결판(`tip.resolved`) — 닫힐 때 `tipClosed.outcome`이 된다 */
  private tipOutcome: "won" | "lost" | null = null;
  /** 지금 떠 있는 배너 객체 그 자체 — 닫힌 뒤에도 엔진이 적어 둔 `resolved`가 남아 있다 */
  private tipRef: Tip | null = null;

  constructor(w: World) {
    this.prev = snap(w);
  }

  private push(t: number, kind: EventKind, phase: EventPhase, n: number, extra?: Partial<PlayEvent>) {
    if (n <= 0) return;
    this.events.push({ t, kind, phase, n, ...extra });
  }

  /**
   * 한 구간을 기록한다. `report`가 있으면(엔진 전진 구간) 드랍·감정의 티어까지
   * 정확히 적고, 없으면(정책 구간) 상태 차이만으로 센다.
   */
  mark(w: World, phase: EventPhase, report?: StepReport) {
    const cur = snap(w);
    const p = this.prev;
    const t = w.t;
    const d = (k: keyof Snap) => (cur[k] as number) - (p[k] as number);

    if (report) {
      for (const drop of report.drops) this.push(t, "drop", phase, 1, { tier: drop.tier });
      for (const a of report.appraised) this.push(t, "appraised", phase, 1, { tier: a.tier });
      this.push(t, "layerUp", phase, report.layerUps);
      for (const l of report.lost) {
        this.push(t, "lostToRival", phase, 1, { detail: `${ARTIFACT_BY_ID[l.artifactId]?.name ?? l.artifactId} → ${l.owner}` });
      }
    } else {
      this.push(t, "drop", phase, d("drops"));
      this.push(t, "layerUp", phase, d("layers"));
    }

    this.push(t, "newSpecies", phase, d("codexOwned"));
    this.push(t, "sold", phase, d("sold"));
    this.push(t, "blindSold", phase, d("blindSold"));
    this.push(t, "raceWon", phase, d("racesWon"));
    this.push(t, "raceLost", phase, d("racesLost"));
    this.push(t, "firstT4", phase, d("firstT4Finds"), { tier: 4 });

    // 경매 낙찰은 listings가 줄면서 sold가 함께 느는 형태라 별도로 센다 —
    // "출품"(auctionListed)은 늘어난 쪽이다.
    const listingDelta = d("auctionListings");
    if (listingDelta > 0) this.push(t, "auctionListed", phase, listingDelta);
    else if (listingDelta < 0) this.push(t, "auctionSettled", phase, -listingDelta);

    this.push(t, "siteUnlocked", phase, d("unlockedSites"));
    this.push(t, "teamSlotUnlocked", phase, d("maxTeams"));
    this.push(t, "foremanHired", phase, d("foremen"));
    this.push(t, "teamUpgraded", phase, d("teamWorkers") + d("teamGear"));
    this.push(t, "digUpgraded", phase, d("workers") + d("gear") + d("lab"));
    this.push(t, "facilityUpgraded", phase,
      d("vaultLevel") + d("humidityLevel") + d("restorationLevel") + d("securityLevel"));
    this.push(t, "curatorHired", phase, d("curators"));
    this.push(t, "auctioneerHired", phase, d("auctioneers"));
    this.push(t, "displayed", phase, d("displayed"));

    if (cur.museums !== p.museums) {
      const before = p.museums ? p.museums.split(",").length : 0;
      const after = cur.museums ? cur.museums.split(",").length : 0;
      if (after > before) this.push(t, "museumBuilt", phase, after - before);
      else this.push(t, "museumUpgraded", phase, 1);
    }
    if (cur.auctionHouses !== p.auctionHouses) {
      const before = p.auctionHouses ? p.auctionHouses.split(",").length : 0;
      const after = cur.auctionHouses ? cur.auctionHouses.split(",").length : 0;
      if (after > before) this.push(t, "auctionBuilt", phase, after - before);
      else this.push(t, "auctionUpgraded", phase, 1);
    }

    // 파견·귀환은 상태 문자열이 바뀐 팀 수로 센다
    if (cur.teamStatuses !== p.teamStatuses) {
      const parse = (s: string) =>
        new Map(
          s.split(",").filter(Boolean).map((e) => {
            const [id, status, at] = e.split(":");
            return [id, { status, at: Number(at) }] as const;
          })
        );
      const before = parse(p.teamStatuses);
      let dispatched = 0;
      let returned = 0;
      for (const [id, now] of parse(cur.teamStatuses)) {
        const was = before.get(id);
        if (!was) continue; // 새로 꾸려진 팀은 foremanHired 쪽에서 센다
        // 세계 생성 직후의 첫 파견은 `dispatchedAt`이 0에서 0으로 그대로라
        // 시각 비교로는 안 잡힌다 — 그 경우만 상태 전이로 받는다.
        if (now.at > was.at || (was.status === "idle" && now.status !== "idle")) {
          dispatched++;
          // 재파견은 곧 직전 회차가 끝났다는 뜻이다(유휴 상태로 새로 나가는
          // 첫 회차만 예외).
          if (was.status !== "idle") returned++;
        } else if (now.status === "idle" && was.status !== "idle") {
          returned++;
        }
      }
      this.push(t, "teamDispatched", phase, dispatched);
      this.push(t, "teamReturned", phase, returned);
    }

    const theftDelta = d("theftEvents");
    if (theftDelta > 0) this.push(t, "theft", phase, theftDelta);
    else if (theftDelta < 0) this.push(t, "theftResolved", phase, -theftDelta);

    if (cur.tipId !== p.tipId) {
      if (p.tipId !== null) {
        const dur = this.tipOpenedAt === null ? null : t - this.tipOpenedAt;
        // 엔진은 결판을 배너 객체에 제자리로 적고(`tip.resolved = …`) 닫을 때
        // `w.tip = null`만 한다 — 붙들고 있던 그 객체를 읽으면 결판과 마감이 같은
        // 스텝에 났어도(마감 판정 직후 remain ≤ 0) 놓치지 않는다. 스냅샷으로 본
        // 결판은 객체를 못 붙든 경우(세이브 복원 등)의 예비다.
        const outcome = this.tipRef?.resolved?.outcome ?? this.tipOutcome ?? "expired";
        this.push(t, "tipClosed", phase, 1, { detail: dur === null ? "" : `${dur.toFixed(0)}초 지속`, outcome });
      }
      this.tipOutcome = null;
      if (cur.tipId !== null) {
        this.tipOpenedAt = t;
        this.push(t, "tipOpened", phase, 1, { detail: cur.tipId });
      }
    }
    this.tipRef = w.tip;
    if (cur.tipResolved) this.tipOutcome = cur.tipResolved;

    if (cur.overflow && !p.overflow) this.push(t, "vaultOverflow", phase, 1);
    if (cur.sealedOver && !p.sealedOver) this.push(t, "sealedBacklog", phase, 1);
    this.push(t, "seasonRollover", phase, cur.season - p.season);
    if (cur.ended && !p.ended) this.push(t, "ending", phase, 1);

    this.prev = cur;
  }
}

/**
 * 조작 단계 수 — "이 이벤트 하나가 사람에게 몇 번의 조작을 요구하는가".
 *
 * 전부 **실제 앱에서 클릭해 가며 잰 값**이다(`tests/e2e/play.mjs`의 `effort`
 * 시나리오, `eval.md` §23.3 표). 시작 화면은 항상 발굴 탭이고 탭·서브탭 전환도
 * 1단계로 센다(`notes/ux-v02.md` §2 규칙).
 *
 * 추정이 섞이면 "총 조작량"이 그럴듯한 허구가 되므로, 측정하지 못한 항목은
 * `null`로 두고 집계에서 따로 표시한다.
 */
export const STEPS_PER_EVENT: Partial<Record<EventKind, number | null>> = {
  digUpgraded: 1,        // 발굴 탭에 상시 노출 — 1탭
  foremanHired: 1,       // 후보 카드 1탭이 고용 + 팀 생성까지 한다
  teamSlotUnlocked: 1,
  teamDispatched: 2,     // [새 유적 선택] → 지도에서 거점 1탭
  teamUpgraded: 2,       // [상세] → [+1]
  siteUnlocked: 2,       // 거점 1탭 → [새 본거지로 열기]
  museumBuilt: 2,
  museumUpgraded: 2,
  curatorHired: 2,
  blindSold: 2,
  displayed: 3,          // 시설 탭 → 빈 슬롯 → 유물 고르기
  auctionBuilt: 3,
  auctionUpgraded: 3,
  auctioneerHired: 3,
  auctionListed: 3,      // 소장고 탭 → 유물 → [경매 등록]
  sold: 3,
  facilityUpgraded: 3    // 시설 탭 → 보관소 서브탭 → 확장 (v0.3.2에서 화면 신설)
};
