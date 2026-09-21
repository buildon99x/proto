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
import type { StepReport, Tier, World } from "../game/types";

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

export type PlayEvent = {
  t: number;
  kind: EventKind;
  phase: EventPhase;
  n: number;          // 한 번에 몇 건인가(드랍 3점이면 n=3)
  tier?: Tier;
  detail?: string;
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
    teamStatuses: w.teams.map((t) => `${t.id}:${t.status}`).join(","),
    displayed: w.vault.filter((v) => v.displayed).length,
    museums: w.museums.map((m) => `${m.site}:${m.grade}:${m.marketingLevel}`).join(","),
    auctionHouses: w.auctionHouses.map((a) => `${a.site}:${a.grade}`).join(","),
    curators: w.staff.filter((s) => s.role === "curator").length,
    auctioneers: w.staff.filter((s) => s.role === "auctioneer").length,
    auctionListings: w.auctionHouses.reduce((a, h) => a + h.listings.length, 0),
    theftEvents: w.theftEvents.length,
    theftIds: w.theftEvents.map((e) => e.id).join(","),
    tipId: w.tip ? `${w.tip.artifactId}@${w.tip.site}` : null,
    season: w.seasonState.season, ended: w.ended,
    overflow: stored > vaultCapacity(w.vaultLevel),
    sealedOver: sealed >= LOCKED_HOLD_CAP,
    layers
  };
}

/** 한 판(run)의 이벤트 기록기. 정책 호출과 엔진 전진을 각각 감싼다. */
export class PlayRecorder {
  readonly events: PlayEvent[] = [];
  private prev: Snap;
  private tipOpenedAt: number | null = null;

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
      const before = new Map(p.teamStatuses.split(",").filter(Boolean).map((s) => s.split(":") as [string, string]));
      let dispatched = 0;
      let returned = 0;
      for (const entry of cur.teamStatuses.split(",").filter(Boolean)) {
        const [id, status] = entry.split(":");
        const was = before.get(id);
        if (was === status) continue;
        if (status === "traveling_out") dispatched++;
        else if (status === "idle" && was) returned++;
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
        this.push(t, "tipClosed", phase, 1, { detail: dur === null ? "" : `${dur.toFixed(0)}초 지속` });
      }
      if (cur.tipId !== null) {
        this.tipOpenedAt = t;
        this.push(t, "tipOpened", phase, 1, { detail: cur.tipId });
      }
    }

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
