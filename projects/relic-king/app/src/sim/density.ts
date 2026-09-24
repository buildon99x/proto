/**
 * 밀도 원장 — **첫 1분과 첫 10분에 무엇이 일어나는가**를 한 번의 명령으로 찍는다.
 *
 *   pnpm --filter relic-king density
 *   pnpm --filter relic-king density -- --seeds 7 --tail-minutes 60
 *   pnpm --filter relic-king density -- --json out.json
 *
 * ## 왜 playlog로는 안 되는가
 *
 * `playlog --bucket N`은 **분 단위**다. 첫 60초가 한 칸으로 뭉개지므로 "첫 1분에
 * 몇 종류의 사건이 일어났나"를 물을 수 없다. 이 도구는 첫 60초를 **5초 격자**로,
 * 첫 10분을 **30초 격자**로 찍고, 원장 A~E를 그 자리에서 판정한다.
 *
 * ## 원장 다섯 축 (prompts/v0.6-first-session-density.md §2)
 *
 * - **A 사건 종류** — `MEANINGFUL` 23종 중 그 창에서 몇 종을 겪는가.
 * - **B 결정** — 기회비용이 있거나 되돌릴 수 없는 선택이 몇 번 제시되는가.
 *   **강제가 아니다**(척추 4번): 안 누르면 기본값이 대신 고르고 게임은 계속 돈다.
 *   그래서 이 축은 "조작 횟수"가 아니라 **"선택지가 열린 횟수"**를 센다.
 *   v0.6.6부터는 **등급이 결정인 것만** 센다 — 버튼이 없는 제보, 지배 전략,
 *   잡무는 기록만 한다(`DecisionWatcher` 주석의 표). 첫 1시간 결정 수와 결정 간
 *   최장 간격도 같이 잰다. 그래서 판은 `--tail-minutes`와 무관하게 최소 1시간을 돈다.
 * - **C 긴장 사건** — 제보·레이스 승패·영구 상실·순위 추월.
 * - **D 반복:의미** — 화면에서 일어나는 일 몇 건당 기억할 만한 일이 하나인가.
 * - **E 첫 도달 시각** — 첫 제보·첫 레이스 결과·첫 T4 조우·첫 거점 해금.
 *
 * ## 이 도구가 지키는 것 셋
 *
 * 1. **계측이 게임을 바꾸지 않는다.** 샘플러·결정 감시자는 전부 `advance()`
 *    **바깥에서 읽기만** 한다(v0.3.3 관행 — 스텝 무관성 검증이 서 있는 경계를
 *    흔들지 않는다). 엔진에 훅을 심지 않고 `World` 스냅샷 차이만 본다.
 * 2. **시드 1개로 판정하지 않는다.** 첫 10분은 제보·드랍 순서의 시드 흔들림이
 *    가장 큰 구간이라, 기본 5시드의 **중앙값과 최악값**을 같이 적는다.
 * 3. **두 극단을 같이 잰다.** 탭만 열어 둔 플레이(`idle`)와 운영 플레이
 *    (`active`). 방치가 죽으면 이 게임은 방치형이 아니다.
 *
 * 첫 10분은 **1초 스텝**으로 적분한다 — 5초 격자가 스텝 경계에 정확히 떨어지게
 * 하기 위해서다. 그래서 같은 시드라도 `playlog`(2초 스텝)와 이벤트 순서가 미세하게
 * 갈라질 수 있다. 스텝 무관성 자체는 `qa_expedition`·`qa_economy`가 따로 지킨다.
 */
import { writeFileSync } from "node:fs";
import {
  AUTO_ROUTINE_INTERVAL_SECONDS, EMERGENCY_DISPATCH_MAX_REACH_HOURS, EMERGENCY_DISPATCH_TRAVEL_MULT,
  FIRST_RELOCATION_FREE_WINDOW_HOURS, FOREMAN_HIRE_COST, SITES,
  TIP_DURATION_ONSITE_MAX, TIP_DURATION_ONSITE_MIN
} from "../game/balance";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  advance, codexProgress, createPersistentRecord, createWorld, digPower, fullRanking, ownedSiteCap,
  grantStartingTeam, isGhostId,
  playerCanReactAt, runAutoRoutine, teamHomeSite, tipPoolStages
} from "../game/engine";
import { travelHoursOneWay } from "../game/expedition";
import { distanceKm } from "../game/sites";
import { duration } from "../game/format";
import { actExpansion, liquidateSurplus, STEP_LATE } from "./policy";
import { MEANINGFUL, PlayRecorder } from "./telemetry";
import type { EventKind, PlayEvent } from "./telemetry";
import type { Foreman, PersistentRecord, StepReport, Tip, World } from "../game/types";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(k);
  return i > -1 ? args[i + 1] : d;
};
const SEED_COUNT = Number(arg("--seeds", "5"));
/** §6.3 — 목표 창 **직후** 구간의 최장 무의미 구간을 재는 꼬리 길이(분) */
const TAIL_MIN = Number(arg("--tail-minutes", "60"));
const JSON_OUT = arg("--json", "");
const SHOW_GRID = !args.includes("--no-grid");

/** 기본 시드는 결정론이다 — 같은 명령을 다시 돌리면 같은 표가 나온다 */
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => 20260917 + i * 7919);

const MINUTE = 60;
const TEN_MIN = 600;
const HOUR = 3600;
/** 첫 10분은 1초 스텝. 그 뒤는 playlog와 같은 굵은 스텝 */
const FINE_STEP = 1;
const FINE_UNTIL = TEN_MIN;

// ── 결정(B축) ────────────────────────────────────────────────────────────

/**
 * **결정**의 정의: 기회비용이 있거나 되돌릴 수 없고, **기본값이 딸려 있어서
 * 안 눌러도 게임이 굴러가는** 선택. 아래는 전부 이미 화면에 있는 자리다 — 새
 * 시스템이 아니라 기존 선택지에 이름을 붙여 센 것이다.
 *
 * ### 등급 (v0.6.6 — `notes/decision-tree-10h.md` §1)
 *
 * 화면에 선택지가 떴다는 것과 그것이 결정이라는 것은 다른 명제다. 감시자는
 * 제시된 선택지를 전부 기록하되, 등급이 **결정**인 것만 B축에 센다. 지배 전략
 * (한쪽이 항상 이긴다)·잡무(판단 없이 누르기만 한다)·통보(누를 것이 없다)는
 * 기록만 하고 세지 않는다 — 세면 아무것도 안 고쳐도 B축이 통과한다.
 *
 * | 종류 | 화면 | 기회비용 | 안 누르면 | 등급 |
 * | --- | --- | --- | --- | --- |
 * | `base` | (v0.6.6에서 폐지 — 첫 거점 카드 `unlock`에 합침) | — | — | — |
 * | `unlock` | 첫 거점 카드(`FirstBaseChooser`)·세계 지도 거점 해금 | base 슬롯 상한·해금비 | 안 연다 | 결정(무게 작음, §5.3) |
 * | `dispatch` | 새 발굴단의 **첫** 목적지 | 그 회차 동안 다른 거점 포기 | 루틴이 추천 1위로 | 결정 |
 * | `routine` | 귀환 뒤 자동 순회 재파견 | — | 루틴이 알아서 | **잡무 → 자동**(안 셈) |
 * | `tip` | 유일(T4) 제보 [집중 굴착] · 모든 티어 [급파] | 원정비 2~3배·팀을 뺀다 | 28% 자동 추격 / 유일은 놓침 | 결정 |
 * | `tipFocus` | 진귀 이하 제보의 [집중 굴착] | 원정비 2배(원정당 1회) | 28% 자동 추격 | **지배 전략**(§5.2, 안 셈) |
 * | `tipNotice` | 버튼 없는 배너(직접 발굴 추격·자동 집중·반응 불가) | — | — | **통보**(안 셈) |
 * | `keep` | 소장고 T3+ 입고(매각/전시/보유) | 성장↔점수 맞교환 | 자동매각 규칙대로 | **제시 없음**(입고 창에 [확인]뿐, 안 셈 — v0.6.6 중간 리뷰 §1.5) |
 * | `foreman` | 빈 슬롯의 단장 후보 3명 | 스탯·급여 차이 | 안 뽑는다 | 결정(약하지만 실재, §2) |
 * | `slot` | 발굴단 슬롯 해금 | — | 안 산다 | **지배 전략**(살 수 있으면 산다, 안 셈) |
 *
 * **제보는 버튼이 실제로 뜰 때만 센다**(`ui/TipBanner.tsx` `findReaction()`과 같은
 * 조건 — 완성도 진단 2판 §3.1). 예전 자는 `playerCanReactAt()`이 참이면 셌는데,
 * 그 함수는 레거시 직접 발굴(`w.activeSite === site`)만으로도 참이라 배너에 누를
 * 것이 없는 제보까지 결정으로 찍혔다(첫 10분 제보 4~5 중 버튼은 1~2). 배너가 떠
 * 있는 동안 버튼이 **한 번이라도** 뜨면 그 제보를 한 번 센다(팀이 도중에 현지에
 * 닿는 경우). `Tip.autoFocused`(v0.6.6 P2-가)가 선 제보는 현지 팀이 있어도 버튼이
 * 없다 — 그 필드가 들어오기 전에도 진귀 이하의 [집중 굴착]은 지배 전략이라 세지
 * 않으므로, P2-가가 들어와도 B축 값은 달라지지 않아야 한다.
 *
 * **옛 자**(`legacy`)는 v0.6.5까지의 규칙(제보 = `playerCanReactAt`, 파견 = 기존
 * 팀의 모든 파견, 해금 = 해금 가능해진 순간만, 고용·슬롯은 안 셈)으로 같이 세 둔다
 * — 전·후를 같은 판에서 나란히 보기 위해서다. 게이트는 등급 기준만 본다.
 */
export type DecisionKind =
  | "base" | "tip" | "dispatch" | "unlock" | "keep" | "foreman"
  | "tipFocus" | "tipNotice" | "routine" | "slot";

/** B축에 세는 종류 — 위 표에서 등급이 "결정"인 것 */
// `keep`은 v0.6.6 중간 리뷰(§1.5)에서 뺐다 — T3+ 입고 창에는 [확인]뿐이라 그 순간 제시되는 선택이 없다.
// 입고 창에 [쥔다]/[판다]가 생기면 다시 넣는다. `base`는 첫 거점 카드(`unlock`)에 합쳐져 더는 찍히지 않는다.
export const GRADED_KINDS: DecisionKind[] = ["tip", "dispatch", "unlock", "foreman"];

export type DecisionEvent = {
  t: number; kind: DecisionKind; detail?: string;
  /** 등급이 결정인가(B축에 세는가) */
  graded: boolean;
};

/** `autoFocused`는 v0.6.6 P2-가가 `Tip`에 넣는다 — 들어오기 전 엔진에서도 돌게 선택 필드로 읽는다 */
type TipLike = Tip & { autoFocused?: boolean };

/**
 * 배너에 뜨는 버튼 — `ui/TipBanner.tsx`의 `findReaction()`과 같은 조건이다. 한쪽을
 * 고치면 다른 쪽도 고친다(계측 자와 화면이 다른 말을 하면 B축이 거짓이 된다).
 * - 대상 거점에 on_site 팀 → [집중 굴착]. 단 `autoFocused`면 버튼이 없다.
 * - 아니면 유휴 팀의 압축 이동시간(항해술 반영) ≤ `EMERGENCY_DISPATCH_MAX_REACH_HOURS` → [급파].
 * - 레거시 직접 발굴만 그 자리에 있으면 버튼이 없다(추격 중 통보).
 * - 결판이 난 배너(`resolved`)에는 버튼이 없다.
 */
export function tipButton(w: World, tip: TipLike): "focus" | "emergency" | null {
  if (tip.resolved) return null;
  const onSite = w.teams.some((t) => t.status === "on_site" && t.targetSite === tip.site);
  if (onSite) return tip.autoFocused ? null : "focus";
  const dist = distanceKm(teamHomeSite(w), tip.site);
  for (const t of w.teams) {
    if (t.status !== "idle") continue;
    const foreman = w.staff.find((s) => s.id === t.foremanId && s.role === "foreman") as Foreman | undefined;
    const hours = travelHoursOneWay(dist, foreman?.navigation ?? 0) * EMERGENCY_DISPATCH_TRAVEL_MULT;
    if (hours <= EMERGENCY_DISPATCH_MAX_REACH_HOURS) return "emergency";
  }
  return null;
}

/**
 * 결정 감시자 — World를 **읽기만** 한다. 엔진에 카운터를 심지 않는 이유는
 * 세이브 스키마를 계측 때문에 늘리지 않기 위해서다(계측은 게임의 일부가 아니다).
 *
 * 정책은 `advance()` **앞에서** 누르므로, "할 수 있게 됐다"와 "했다"가 같은 틱에
 * 끝나 감시자가 제시 순간을 못 보는 경우가 있다(운영 플레이의 거점 해금 — 매각으로
 * 자금이 문턱을 넘자마자 연다. 옛 자는 그래서 운영 플레이의 해금을 한 번도 못
 * 셌다). 해금·고용은 **제시(가능해진 순간)**와 **실행(개수가 늘어난 순간)** 중
 * 먼저 보인 쪽에서 한 번만 센다.
 */
class DecisionWatcher {
  readonly events: DecisionEvent[] = [];
  private sawFirstAppraisal = false;
  private lastTipKey: string | null = null;
  private tipCounted = false;
  private tipLegacy = false;
  private lastTeamStatuses = "";
  private unlockAffordable = false;
  private unlockOfferCounted = false;
  private lastOwned = 0;
  private hireOfferCounted = false;
  private lastForemen = 0;
  private lastMaxTeams = 0;
  /** 첫 틱에 기준선을 잡았는가 — 시작 발굴단은 감시자 생성 뒤에 붙는다 */
  private primed = false;
  /** 첫 원정을 이미 나간 팀. 시작 발굴단의 첫 파견은 자동이라 결정이 아니다 */
  private dispatchedOnce = new Set<string>();

  constructor(w: World) {
    this.lastTeamStatuses = statuses(w);
    this.unlockAffordable = canUnlockNow(w);
    this.lastOwned = ownedCount(w);
    this.lastMaxTeams = w.maxTeams;
  }

  /** v0.6.5까지의 자가 결정으로 셌을 시각들(전·후 비교용). 등급과 따로 센다 */
  readonly legacyTimes: number[] = [];

  private push(t: number, kind: DecisionKind, legacy: boolean, detail?: string) {
    this.events.push({ t, kind, detail, graded: GRADED_KINDS.includes(kind) });
    if (legacy) this.legacyTimes.push(t);
  }

  tick(w: World, report?: StepReport) {
    const t = w.t;
    if (!this.primed) {
      this.primed = true;
      for (const x of w.teams) this.dispatchedOnce.add(x.id);
      this.lastForemen = foremenCount(w);
    }

    // ① 본거지 — v0.6.6에서 첫 감정 시점의 "본거지를 정하자" 오버레이를 없앴다
    //    (`notes/decision-tree-10h.md` P1). 그 결정은 첫 거점 해금 카드(④ `unlock`)에
    //    합쳐졌으므로 여기서는 따로 세지 않는다 — 같은 결정을 두 번 세지 않기 위해서다.

    // ⑤ 보유/매각 — 진귀(T3) 이상이 감정돼 소장고에 들어오면 그 자리에서
    //    "팔아 성장할 것인가, 쥐고 점수로 둘 것인가"가 돌아온다(brief.md §문제/동기).
    if (report) {
      for (const a of report.appraised) {
        if (a.tier >= 3) {
          this.push(t, "keep", true, `${ARTIFACT_BY_ID[a.artifactId]?.name ?? a.artifactId} T${a.tier}`);
        }
      }
    }

    // ② 제보 — 배너에 버튼이 뜰 때만 결정이다. 버튼이 없으면 배너는 통보다.
    const tip = w.tip as TipLike | null;
    const tipKey = tip ? `${tip.artifactId}@${tip.site}@${tip.openedAt}` : null;
    if (tip && tipKey !== this.lastTipKey) {
      this.tipCounted = false;
      // 옛 자: 새 제보가 뜬 순간 playerCanReactAt이 참이면 셌다
      this.tipLegacy = playerCanReactAt(w, tip.site);
      const button = tipButton(w, tip);
      if (!button) {
        // 버튼 없이 뜬 제보는 뜬 순간 통보로 적는다(도중에 버튼이 생기면 아래에서 다시 센다)
        this.push(t, "tipNotice", this.tipLegacy, tipDetail(tip));
        this.tipLegacy = false;
      }
    }
    if (tip && !this.tipCounted) {
      const button = tipButton(w, tip);
      if (button) {
        this.tipCounted = true;
        const tier = ARTIFACT_BY_ID[tip.artifactId]?.tier ?? 0;
        // 진귀 이하의 [집중 굴착]은 원정당 한 번 누르면 모든 축에서 이긴다(§5.2)
        const kind: DecisionKind = button === "emergency" || tier >= 4 ? "tip" : "tipFocus";
        this.push(t, kind, this.tipLegacy, `${tipDetail(tip)} [${button === "focus" ? "집중 굴착" : "급파"}]`);
        this.tipLegacy = false;
      }
    }
    this.lastTipKey = tipKey;

    // ③ 원정 목적지 — 파견 시각이 새로 찍히는 순간이 "어디로 보낼 것인가"가 닫힌 순간이다.
    //    새 발굴단의 첫 목적지만 결정이다. 귀환 뒤 재파견은 루틴(기본 켬)이 고른다 — 잡무.
    const cur = statuses(w);
    if (cur !== this.lastTeamStatuses) {
      const before = new Map(
        this.lastTeamStatuses.split(",").filter(Boolean)
          .map((s) => { const [id, target, at, st] = s.split(":"); return [id, { target, at: Number(at), st }] as const; })
      );
      for (const entry of cur.split(",").filter(Boolean)) {
        const [id, target, at, st] = entry.split(":");
        const was = before.get(id);
        // 옛 자와 같은 조건 — 기존 팀의 파견 시각이 새로 찍혔거나 유휴에서 나갔다.
        // 거리 0 원정·같은 틱 재파견 둘 다 이 기준으로만 잡힌다(telemetry.ts 참조).
        const legacyDispatch = !!was && (Number(at) > was.at || (was.st === "idle" && st !== "idle"));
        // 새로 꾸려진 팀이 같은 틱에 바로 나간 경우(운영 정책) — 옛 자는 이것을 놓쳤다
        const fresh = !was && st !== "idle";
        if (!legacyDispatch && !fresh) continue;
        if (!this.dispatchedOnce.has(id)) {
          this.dispatchedOnce.add(id);
          this.push(t, "dispatch", legacyDispatch, `${target}(새 발굴단 첫 원정)`);
        } else {
          this.push(t, "routine", legacyDispatch, target);
        }
      }
      this.lastTeamStatuses = cur;
    }

    // ④ 거점 해금 — "지금 열 수 있게 됐다"(제시) 또는 "열었다"(실행) 중 먼저 보인 쪽.
    const affordable = canUnlockNow(w);
    const owned = ownedCount(w);
    if (owned > this.lastOwned) {
      if (!this.unlockOfferCounted) this.push(t, "unlock", false, "거점을 열었다(제시와 같은 틱)");
      this.unlockOfferCounted = false;
    }
    if (affordable && !this.unlockAffordable) {
      // 옛 자는 "가능해진 순간"마다 셌다 — 자동 재투자로 잔고가 문턱을 오르내리면
      // 같은 선택지가 여러 번 찍혔다. 등급 기준은 열 때까지 한 번만 센다.
      this.legacyTimes.push(t);
      if (!this.unlockOfferCounted) {
        this.push(t, "unlock", false, "해금 가능한 거점이 생겼다");
        this.unlockOfferCounted = true;
      }
    }
    this.unlockAffordable = affordable;
    this.lastOwned = owned;

    // ⑥ 슬롯 해금 — 지배 전략. 기록만 한다.
    if (w.maxTeams > this.lastMaxTeams) this.push(t, "slot", false, `${w.maxTeams}번째 슬롯`);
    this.lastMaxTeams = w.maxTeams;

    // ⑦ 단장 고용 — 빈 슬롯 + 고용비가 있으면 후보 3명 카드가 눌린다(TeamPanel.tsx).
    const foremen = foremenCount(w);
    if (foremen > this.lastForemen) {
      if (!this.hireOfferCounted) this.push(t, "foreman", false, "단장 고용(제시와 같은 틱)");
      this.hireOfferCounted = false;
    }
    if (w.teams.length < w.maxTeams && w.funds >= FOREMAN_HIRE_COST && !this.hireOfferCounted) {
      this.push(t, "foreman", false, "단장 후보 3명");
      this.hireOfferCounted = true;
    }
    this.lastForemen = foremen;
  }
}

function tipDetail(tip: Tip): string {
  return `${tip.site} ${tip.layer}층 T${ARTIFACT_BY_ID[tip.artifactId]?.tier ?? 0}`;
}

function ownedCount(w: World): number {
  return SITES.filter((s) => w.sites[s.id].unlocked).length;
}

function foremenCount(w: World): number {
  return w.staff.filter((s) => s.role === "foreman").length;
}

function statuses(w: World): string {
  return w.teams.map((t) => `${t.id}:${t.targetSite}:${t.dispatchedAt}:${t.status}`).join(",");
}

function canUnlockNow(w: World): boolean {
  const owned = ownedCount(w);
  // 상한은 안목이 연다(G91) — 계측도 엔진과 같은 함수를 써야 선택지 수가 맞는다
  if (owned >= ownedSiteCap(w)) return false;
  return SITES.some((s) => !w.sites[s.id].unlocked && w.funds >= s.unlockCost);
}

// ── 긴장(C축) ────────────────────────────────────────────────────────────

/**
 * **고스트 추월**만 센다 — 라이벌 간 순위가 초반에 수없이 뒤바뀌는 것은 긴장이
 * 아니라 소음이다(초기 측정에서 첫 10분 11회가 전부 그것이었고, 그걸 C축에
 * 넣으면 아무것도 안 고쳐도 C가 통과해 버린다). 기록패로 들어온 고스트가 나를
 * 지나가는 것만이 "지금 지고 있다"는 실제 신호다(v0.5, `notes/decisions.md` G76).
 * 고스트가 없는 판에서는 이 값이 항상 0이고, 그게 맞다.
 */
function ghostLead(w: World, record: PersistentRecord): number {
  if (!w.rivals.some((r) => isGhostId(w, r.id))) return 0;
  const rows = fullRanking(w, record);
  const me = rows.find((r) => r.id === "player");
  if (!me) return 0;
  return rows.filter((r) => isGhostId(w, r.id) && r.rank > me.rank).length;
}

const TENSION: EventKind[] = ["tipOpened", "raceWon", "raceLost", "lostToRival"];

// ── 한 판 ────────────────────────────────────────────────────────────────

export type GridRow = {
  from: number; to: number;
  ambient: number; meaningful: number; kinds: EventKind[];
  decisions: number; tension: number; codex: number; dig: number; funds: number;
};

export type RunLedger = {
  label: "idle" | "active";
  seed: number;
  /** A */ kinds1m: number; kinds10m: number;
  /** B — 등급 기준(결정만). 게이트가 보는 값 */ decisions1m: number; decisions10m: number;
  decisions1h: number;
  /** B — 등급 결정 사이의 최장 간격(초). 창의 시작(0초)과 끝도 경계로 친다 */
  decisionMaxGap10m: number; decisionMaxGap1h: number; decisionGapFrom1h: number;
  /** B — 버튼 기준(지배 전략·잡무를 빼기 전). 등급 기준과의 차이를 보기 위한 참고값 */
  buttonDecisions10m: number;
  /** B — v0.6.5까지의 자로 잰 값(전·후 비교용) */
  legacyDecisions1m: number; legacyDecisions10m: number;
  /** C */ tension1m: number; tension10m: number; wins10m: number; losses10m: number;
  /** D */ ambient10m: number; meaningful10m: number; ratio10m: number;
  /** E */ firstTip: number | null; firstRaceResult: number | null;
  firstT4Encounter: number | null; firstSiteUnlock: number | null;
  /** 제보 창(첫 10분) — 설계값 60~150초 안에 있는가 */
  tipWindowMedian: number | null; tipWindowMin: number | null; tipCount10m: number;
  /** §6.3 — 목표 창 직후의 최장 무의미 구간 */
  tailMaxGap: number; tailFrom: number; tailTo: number;
  /** 참고 상태 — **10분 시점**의 값이다(끝값이 아니다) */
  codex10m: number; dig10m: number; funds10m: number; vault10m: number;
  kindList1m: EventKind[]; kindList10m: EventKind[];
  decisionKinds10m: Record<string, number>; decisionKinds1h: Record<string, number>;
  grid5s: GridRow[]; grid30s: GridRow[];
  tipProbe: { t: number; all: number; stock: number; layer: number; reactable: number; sites: string; myLayer: string }[];
  events: PlayEvent[]; decisions: DecisionEvent[];
};

/**
 * [0, until] 안에서 결정 사이의 최장 간격. **창의 양 끝도 경계로 친다** — 시작 후
 * 첫 결정까지, 마지막 결정 뒤 창 끝까지도 "고를 것이 없는 시간"이기 때문이다.
 * 같은 틱에 몰린 결정은 간격 0으로 합쳐진다(몰림은 간격이 아니라 결정 수로 본다).
 */
function maxGap(list: { t: number }[], until: number): { gap: number; from: number } {
  const ts = list.filter((d) => d.t <= until).map((d) => d.t).sort((a, b) => a - b);
  let prev = 0;
  let best = { gap: 0, from: 0 };
  for (const t of [...ts, until]) {
    if (t - prev > best.gap) best = { gap: t - prev, from: prev };
    prev = Math.max(prev, t);
  }
  return best;
}

/** 제보 풀 진단을 찍는 시각(초) — 첫 1분을 촘촘히 본다 */
const PROBE_TIMES = [5, 15, 30, 60, 120, 300, 600, 1800, 3600, 7200, 14400];

function runOne(label: "idle" | "active", seed: number, tailSeconds: number): RunLedger {
  // 시작 발굴단을 **스냅샷 뒤에** 배정한다 — 0초의 '단장 합류'·'첫 파견'을
  // 계측이 볼 수 있게(엔진 `createWorld`의 `grantTeam` 주석 참조).
  const w = createWorld(seed, false);
  const record = createPersistentRecord();
  const rec = new PlayRecorder(w);
  const dec = new DecisionWatcher(w);
  grantStartingTeam(w);
  const grid5: GridRow[] = [];
  const grid30: GridRow[] = [];
  const probe: RunLedger["tipProbe"] = [];
  const tension: { t: number; kind: string }[] = [];

  let nextProbe = 0;
  let ghostsAhead = ghostLead(w, record);
  let routineAcc = 0;
  let codexAt10m = 0;
  let digAt10m = 0;
  let fundsAt10m = 0;
  let vaultAt10m = 0;

  // 꼬리(§6.3)는 [10분, tailEnd]를 보고, 판 자체는 B축 1시간 지표를 위해 최소 1시간을 돈다
  const tailEnd = Math.max(tailSeconds, TEN_MIN);
  const total = Math.max(tailEnd, HOUR);
  while (w.t < total && !w.ended) {
    const stepNow = w.t < FINE_UNTIL ? FINE_STEP : STEP_LATE;
    if (label === "active") {
      liquidateSurplus(w);
      rec.mark(w, "player");
      runAutoRoutine(w);
      rec.mark(w, "auto");
      actExpansion(w);
      rec.mark(w, "player");
    }
    const report = advance(w, stepNow, false, stepNow, record);
    rec.mark(w, "auto", report);
    if (label === "idle") {
      routineAcc += stepNow;
      if (routineAcc >= AUTO_ROUTINE_INTERVAL_SECONDS) {
        routineAcc = 0;
        runAutoRoutine(w);
        rec.mark(w, "auto");
      }
    }
    dec.tick(w, report);
    if (codexAt10m === 0 && w.t >= TEN_MIN) {
      codexAt10m = codexProgress(w).owned;
      digAt10m = digPower(w);
      fundsAt10m = w.funds;
      vaultAt10m = w.vault.length;
    }

    // 고스트 추월 판정은 격자 해상도로만 본다(매 스텝 전체 순위를 세우는 비용이 크다)
    if (w.t % 5 < stepNow) {
      const now = ghostLead(w, record);
      if (now > ghostsAhead) tension.push({ t: w.t, kind: "고스트 추월" });
      ghostsAhead = now;
    }

    while (nextProbe < PROBE_TIMES.length && w.t >= PROBE_TIMES[nextProbe]) {
      const st = tipPoolStages(w);
      const mine = SITES.filter((x) => w.sites[x.id].unlocked)
        .map((x) => `${x.id.slice(0, 3)}${w.sites[x.id].layer}`)
        .join(" ");
      probe.push({ t: PROBE_TIMES[nextProbe], ...st, sites: st.sites.join(" "), myLayer: mine });
      nextProbe++;
    }
  }

  const events = rec.events;
  const decisions = dec.events;
  const graded = decisions.filter((d) => d.graded);
  const legacy = dec.legacyTimes.map((t) => ({ t }));

  /**
   * 창은 **[from, to]** 로 읽는다. `from`의 기본값이 -1인 이유: 첫 원정 파견처럼
   * **t=0에 일어나는 사건**이 있고, `t > 0`으로 자르면 그게 통째로 사라진다
   * (실측 — 운영 플레이의 A축에서 "파견"이 없어 보였다. 게임이 아니라 자가
   * 틀렸던 경우다).
   */
  const inWin = <T extends { t: number }>(list: T[], to: number, from = -1) =>
    list.filter((e) => e.t > from && e.t <= to);
  const sumN = (list: PlayEvent[], pred: (e: PlayEvent) => boolean) =>
    list.filter(pred).reduce((a, e) => a + e.n, 0);

  const ev1 = inWin(events, MINUTE);
  const ev10 = inWin(events, TEN_MIN);
  const kindList1m = [...new Set(ev1.filter((e) => MEANINGFUL.includes(e.kind)).map((e) => e.kind))];
  const kindList10m = [...new Set(ev10.filter((e) => MEANINGFUL.includes(e.kind)).map((e) => e.kind))];

  const tension1m = sumN(ev1, (e) => TENSION.includes(e.kind)) + inWin(tension, MINUTE).length;
  const tension10m = sumN(ev10, (e) => TENSION.includes(e.kind)) + inWin(tension, TEN_MIN).length;
  const wins10m = sumN(ev10, (e) => e.kind === "raceWon");
  const losses10m = sumN(ev10, (e) => e.kind === "raceLost" || e.kind === "lostToRival");

  const ambient10m = sumN(ev10, (e) => !MEANINGFUL.includes(e.kind) && e.kind !== "tipClosed");
  const meaningful10m = sumN(ev10, (e) => MEANINGFUL.includes(e.kind));

  const firstOf = (pred: (e: PlayEvent) => boolean) => events.find(pred)?.t ?? null;
  const firstTip = firstOf((e) => e.kind === "tipOpened");
  const firstRaceResult = firstOf((e) => e.kind === "raceWon" || e.kind === "raceLost");
  const firstT4Encounter = firstOf(
    (e) =>
      e.kind === "firstT4" ||
      (e.kind === "tipOpened" && (ARTIFACT_BY_ID[String(e.detail).split("@")[0]]?.tier ?? 0) >= 4) ||
      (e.kind === "lostToRival" && e.tier === 4)
  );
  const firstSiteUnlock = firstOf((e) => e.kind === "siteUnlocked");

  // 제보 창(첫 10분)
  const win: number[] = [];
  for (const e of ev10) {
    if (e.kind !== "tipClosed" || !e.detail) continue;
    const m = /^([\d.]+)초 지속$/.exec(e.detail);
    if (m) win.push(Number(m[1]));
  }
  win.sort((a, b) => a - b);

  // §6.3 — 10분 이후 꼬리의 최장 무의미 구간
  const tailTimes = events
    .filter((e) => MEANINGFUL.includes(e.kind) && e.t > TEN_MIN && e.t <= tailEnd)
    .map((e) => e.t)
    .sort((a, b) => a - b);
  let prev = TEN_MIN;
  let tailMaxGap = 0;
  let tailFrom = TEN_MIN;
  for (const t of [...tailTimes, Math.min(tailEnd, w.t)]) {
    if (t - prev > tailMaxGap) {
      tailMaxGap = t - prev;
      tailFrom = prev;
    }
    prev = Math.max(prev, t);
  }

  // 격자
  const buildGrid = (bucket: number, until: number): GridRow[] => {
    const rows: GridRow[] = [];
    for (let from = 0; from < until; from += bucket) {
      const to = from + bucket;
      const inB = events.filter((e) => (from === 0 ? e.t >= from : e.t > from) && e.t <= to);
      rows.push({
        from, to,
        ambient: sumN(inB, (e) => !MEANINGFUL.includes(e.kind) && e.kind !== "tipClosed"),
        meaningful: sumN(inB, (e) => MEANINGFUL.includes(e.kind)),
        kinds: [...new Set(inB.filter((e) => MEANINGFUL.includes(e.kind)).map((e) => e.kind))],
        decisions: graded.filter((d) => (from === 0 ? d.t >= from : d.t > from) && d.t <= to).length,
        tension: sumN(inB, (e) => TENSION.includes(e.kind)) + tension.filter((x) => x.t > from && x.t <= to).length,
        // (긴장 격자는 고스트 추월만 담기므로 t=0 경계 예외가 필요 없다)
        codex: 0, dig: 0, funds: 0
      });
    }
    return rows;
  };

  /** 내역은 등급과 무관하게 전부 센다 — 무엇을 뺐는지가 보여야 자가 정직하다 */
  const kindCount = (to: number) => {
    const out: Record<string, number> = {};
    for (const d of inWin(decisions, to)) out[d.kind] = (out[d.kind] ?? 0) + 1;
    return out;
  };
  const gap10m = maxGap(graded, TEN_MIN);
  const gap1h = maxGap(graded, HOUR);

  return {
    label, seed,
    kinds1m: kindList1m.length, kinds10m: kindList10m.length,
    decisions1m: inWin(graded, MINUTE).length, decisions10m: inWin(graded, TEN_MIN).length,
    decisions1h: inWin(graded, HOUR).length,
    decisionMaxGap10m: gap10m.gap, decisionMaxGap1h: gap1h.gap, decisionGapFrom1h: gap1h.from,
    buttonDecisions10m: inWin(decisions, TEN_MIN).filter((d) => d.graded || d.kind === "tipFocus").length,
    legacyDecisions1m: inWin(legacy, MINUTE).length, legacyDecisions10m: inWin(legacy, TEN_MIN).length,
    tension1m, tension10m, wins10m, losses10m,
    ambient10m, meaningful10m, ratio10m: meaningful10m > 0 ? ambient10m / meaningful10m : Infinity,
    firstTip, firstRaceResult, firstT4Encounter, firstSiteUnlock,
    tipWindowMedian: win.length ? win[Math.floor(win.length / 2)] : null,
    tipWindowMin: win.length ? win[0] : null,
    tipCount10m: sumN(ev10, (e) => e.kind === "tipOpened"),
    tailMaxGap, tailFrom, tailTo: tailFrom + tailMaxGap,
    codex10m: codexAt10m || codexProgress(w).owned,
    dig10m: digAt10m || digPower(w),
    funds10m: fundsAt10m, vault10m: vaultAt10m,
    kindList1m, kindList10m, decisionKinds10m: kindCount(TEN_MIN), decisionKinds1h: kindCount(HOUR),
    grid5s: buildGrid(5, MINUTE), grid30s: buildGrid(30, TEN_MIN),
    tipProbe: probe, events, decisions
  };
}

// ── 집계·출력 ────────────────────────────────────────────────────────────

const num = (v: number | null) => (v === null ? Infinity : v);
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
}
/** "최악"은 축마다 방향이 다르다 — 많을수록 좋은 축은 최소, 시각·비율은 최대 */
const worstLow = (xs: number[]) => (xs.length ? Math.min(...xs) : 0);
const worstHigh = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);

const fmtT = (v: number) => (Number.isFinite(v) ? duration(v) : "도달 못 함");

type AxisRow = {
  axis: string; window: string; goal: string;
  med: string; worst: string; pass: boolean;
  /**
   * `gate` — 통과해야 하는 축. `report` — 목표는 있지만 현재 빌드가 구조적으로
   * 못 닿는 새 축이라 **보고만** 한다(기준을 낮춘 것이 아니라 아직 판정에 넣지
   * 않은 것이다). `ref` — 목표 없이 옆에 적어 두는 참고값.
   */
  mode: "gate" | "report" | "ref";
};

function ledgerTable(runs: RunLedger[], strict: boolean): AxisRow[] {
  const col = <T,>(f: (r: RunLedger) => T) => runs.map(f);
  const rows: AxisRow[] = [];
  const add = (
    axis: string, window: string, goal: string,
    values: number[], ok: (v: number) => boolean, fmt: (v: number) => string,
    worst: (xs: number[]) => number, mode: AxisRow["mode"] = "gate"
  ) => {
    const m = median(values);
    const wv = worst(values);
    rows.push({ axis, window, goal, med: fmt(m), worst: fmt(wv), pass: ok(strict ? wv : m), mode });
  };
  const always = () => true;

  add("A 사건 종류", "첫 1분", "≥5종", col((r) => r.kinds1m), (v) => v >= 5, (v) => `${v}종`, worstLow);
  add("A 사건 종류", "첫 10분", "≥12종", col((r) => r.kinds10m), (v) => v >= 12, (v) => `${v}종`, worstLow);
  // B축은 등급 기준(결정만)이다 — DecisionWatcher 주석의 표 참조
  add("B 결정", "첫 1분", "≥1회", col((r) => r.decisions1m), (v) => v >= 1, (v) => `${v}회`, worstLow);
  add("B 결정", "첫 10분", "≥5회", col((r) => r.decisions10m), (v) => v >= 5, (v) => `${v}회`, worstLow);
  add("B 결정", "첫 1시간", "—", col((r) => r.decisions1h), always, (v) => `${v}회`, worstLow, "ref");
  add("B 최장 간격", "첫 10분", "—", col((r) => r.decisionMaxGap10m), always, fmtT, worstHigh, "ref");
  add("B 최장 간격", "첫 1시간", "≤10분", col((r) => r.decisionMaxGap1h), (v) => v <= TEN_MIN, fmtT, worstHigh, "report");
  add("B 옛 자", "첫 10분", "—", col((r) => r.legacyDecisions10m), always, (v) => `${v}회`, worstLow, "ref");
  add("C 긴장", "첫 1분", "≥1회", col((r) => r.tension1m), (v) => v >= 1, (v) => `${v}회`, worstLow);
  add("C 긴장", "첫 10분", "≥3회", col((r) => r.tension10m), (v) => v >= 3, (v) => `${v}회`, worstLow);
  add("C 승", "첫 10분", "≥1회", col((r) => r.wins10m), (v) => v >= 1, (v) => `${v}회`, worstLow);
  add("C 패", "첫 10분", "≥1회", col((r) => r.losses10m), (v) => v >= 1, (v) => `${v}회`, worstLow);
  add("D 반복:의미", "첫 10분", "≤1.5:1", col((r) => r.ratio10m), (v) => v <= 1.5, (v) => `${v.toFixed(2)}:1`, worstHigh);
  add("E 첫 제보", "—", "≤60초", col((r) => num(r.firstTip)), (v) => v <= 60, fmtT, worstHigh);
  add("E 제보 창", "첫 10분", "60~150초", col((r) => r.tipWindowMedian ?? 0),
    (v) => v >= TIP_DURATION_ONSITE_MIN && v <= TIP_DURATION_ONSITE_MAX, (v) => `${v.toFixed(0)}초`, worstLow);
  add("E 첫 레이스 결과", "—", "≤120초", col((r) => num(r.firstRaceResult)), (v) => v <= 120, fmtT, worstHigh);
  add("E 첫 T4 조우", "—", "≤10분", col((r) => num(r.firstT4Encounter)), (v) => v <= TEN_MIN, fmtT, worstHigh);
  add("E 첫 거점 해금", "—", "≤10분", col((r) => num(r.firstSiteUnlock)), (v) => v <= TEN_MIN, fmtT, worstHigh);
  return rows;
}

function printLedger(label: string, runs: RunLedger[], strict: boolean) {
  console.log(`\n── 원장 — ${label} (${runs.length}시드, 판정 기준: ${strict ? "최악값" : "중앙값"}) ──`);
  console.log("축                  창        목표          중앙값        최악값    판정");
  for (const r of ledgerTable(runs, strict)) {
    console.log(
      `${r.axis.padEnd(18)} ${r.window.padEnd(8)} ${r.goal.padEnd(12)} ` +
      `${r.med.padStart(11)}  ${r.worst.padStart(11)}   ` +
      (r.mode === "ref" ? "참고" : r.mode === "report" ? (r.pass ? "✅ (보고)" : "보고 — 미달") : r.pass ? "✅" : "❌")
    );
  }
}

/**
 * §6.4 — **방치 플레이도 같이 올라간다**. 운영 플레이만 좋아지면 이 게임은
 * 방치형이 아니게 된다. 기준은 A·C·E 목표의 **절반**이다(건수는 절반 이상,
 * 도달 시각은 두 배 이내 — 시각 축에서 "절반"은 그 뜻이다).
 */
function printIdleHalf(runs: RunLedger[]) {
  console.log("\n── §6.4 방치 판정 — A·C·E 목표의 절반 기준 ──");
  console.log("축                  절반 기준      중앙값        최악값    판정");
  const rows: [string, string, number[], (v: number) => boolean, (v: number) => string, (xs: number[]) => number][] = [
    ["A 사건 종류 1분", "≥3종", runs.map((r) => r.kinds1m), (v) => v >= 3, (v) => `${v}종`, worstLow],
    ["A 사건 종류 10분", "≥6종", runs.map((r) => r.kinds10m), (v) => v >= 6, (v) => `${v}종`, worstLow],
    ["C 긴장 1분", "≥1회", runs.map((r) => r.tension1m), (v) => v >= 1, (v) => `${v}회`, worstLow],
    ["C 긴장 10분", "≥2회", runs.map((r) => r.tension10m), (v) => v >= 2, (v) => `${v}회`, worstLow],
    ["E 첫 제보", "≤120초", runs.map((r) => num(r.firstTip)), (v) => v <= 120, fmtT, worstHigh],
    ["E 첫 레이스 결과", "≤240초", runs.map((r) => num(r.firstRaceResult)), (v) => v <= 240, fmtT, worstHigh],
    ["E 첫 T4 조우", "≤20분", runs.map((r) => num(r.firstT4Encounter)), (v) => v <= 2 * TEN_MIN, fmtT, worstHigh],
    ["E 첫 거점 해금", "≤20분", runs.map((r) => num(r.firstSiteUnlock)), (v) => v <= 2 * TEN_MIN, fmtT, worstHigh]
  ];
  for (const [axis, goal, values, ok, fmt, worst] of rows) {
    const m = median(values);
    console.log(
      `${axis.padEnd(18)} ${goal.padEnd(12)} ${fmt(m).padStart(11)}  ${fmt(worst(values)).padStart(11)}   ` +
      `${ok(m) ? "✅" : "❌"}${ok(worst(values)) ? "" : " (최악 미달)"}`
    );
  }
  console.log("※ 거점 해금은 방치 플레이에 구조적으로 없다 — 사람이 지도에서 눌러야 열린다(척추 4번의 경계).");
}

const KIND_KO: Partial<Record<EventKind, string>> = {
  newSpecies: "신규종", layerUp: "층↑", tipOpened: "제보", raceWon: "승", raceLost: "패",
  lostToRival: "상실", firstT4: "유일", siteUnlocked: "거점", teamSlotUnlocked: "슬롯",
  foremanHired: "단장", teamDispatched: "파견", teamReturned: "귀환", displayed: "전시",
  museumBuilt: "박물관", museumUpgraded: "박물관↑", auctionBuilt: "경매장", curatorHired: "관장",
  theft: "도난", theftResolved: "회수", vaultOverflow: "정원초과", sealedBacklog: "봉인적체",
  seasonRollover: "시즌", ending: "엔딩"
};

function printGrid(title: string, rows: GridRow[]) {
  console.log(`\n── ${title} ──`);
  console.log("구간          반복  의미  결정  긴장 │ 그 칸에서 처음 아닌 것 포함, 일어난 의미 사건");
  for (const r of rows) {
    console.log(
      `${duration(r.from).padStart(6)}~${duration(r.to).padStart(6)} ` +
      `${String(r.ambient).padStart(5)} ${String(r.meaningful).padStart(5)} ` +
      `${String(r.decisions).padStart(5)} ${String(r.tension).padStart(5)} │ ` +
      r.kinds.map((k) => KIND_KO[k] ?? k).join(" ")
    );
  }
}

function printProbe(runs: RunLedger[]) {
  console.log("\n── 제보 풀이 어디서 0이 되는가(운영 플레이, 시드 중앙판) ──");
  console.log("시각        전체   재고   층통과   반응가능 │ 내 거점·층        반응 가능한 거점");
  const r = runs[Math.floor(runs.length / 2)];
  for (const p of r.tipProbe) {
    console.log(
      `${duration(p.t).padStart(9)} ${String(p.all).padStart(6)} ${String(p.stock).padStart(6)} ` +
      `${String(p.layer).padStart(8)} ${String(p.reactable).padStart(10)} │ ${p.myLayer.padEnd(16)} ${p.sites || "—"}`
    );
  }
}

// ── 실행 ────────────────────────────────────────────────────────────────

const tailSeconds = TAIL_MIN * 60;
console.log(
  `밀도 원장 — 첫 60초 5초 격자 · 첫 10분 30초 격자 · 꼬리 ${TAIL_MIN}분, ` +
  `시드 ${SEED_COUNT}개(${SEEDS.join(", ")}), 클릭 0회 기준(척추 4번).`
);

const idleRuns = SEEDS.map((s) => runOne("idle", s, tailSeconds));
const activeRuns = SEEDS.map((s) => runOne("active", s, tailSeconds));

printLedger("② 운영 플레이(사람이 눌렀어야 할 것을 전부 눌러 준 기준선)", activeRuns, true);
printLedger("① 탭만 열어 둔 플레이", idleRuns, true);
printIdleHalf(idleRuns);

if (SHOW_GRID) {
  const mid = activeRuns[Math.floor(activeRuns.length / 2)];
  printGrid(`첫 60초 · 5초 격자 (운영, seed ${mid.seed})`, mid.grid5s);
  printGrid(`첫 10분 · 30초 격자 (운영, seed ${mid.seed})`, mid.grid30s);
}

printProbe(activeRuns);

console.log("\n── 겪은 사건 종류(A축) ──");
for (const [label, runs] of [["운영", activeRuns], ["방치", idleRuns]] as const) {
  const mid = runs[Math.floor(runs.length / 2)];
  const ko = (ks: EventKind[]) => ks.map((k) => KIND_KO[k] ?? k).join(" ");
  console.log(`${label} seed ${mid.seed} — 첫 1분(${mid.kinds1m}/23): ${ko(mid.kindList1m)}`);
  console.log(`${label} seed ${mid.seed} — 첫 10분(${mid.kinds10m}/23): ${ko(mid.kindList10m)}`);
  const never = MEANINGFUL.filter((k) => !mid.kindList10m.includes(k));
  console.log(`${" ".repeat(label.length)}   첫 10분에 없던 것: ${ko(never)}`);
}

/**
 * 내역은 **뺀 것까지** 적는다. `*`가 붙은 종류는 등급이 결정이 아니라 B축에 세지
 * 않았다(지배 전략·잡무·통보 — DecisionWatcher 주석의 표). 옛 자는 v0.6.5까지의
 * 값이다.
 */
for (const [label, runs] of [["운영", activeRuns], ["방치", idleRuns]] as const) {
  for (const [win, pick, count] of [
    ["첫 10분", (r: RunLedger) => r.decisionKinds10m, (r: RunLedger) => r.decisions10m],
    ["첫 1시간", (r: RunLedger) => r.decisionKinds1h, (r: RunLedger) => r.decisions1h]
  ] as const) {
    console.log(`\n── 결정의 내역(${win}, ${label}) — 결정 수 · 최장 간격 · 옛 자 │ 종류(* = 안 셈) ──`);
    for (const r of runs) {
      const parts = Object.entries(pick(r))
        .sort(([a], [b]) => Number(GRADED_KINDS.includes(b as DecisionKind)) - Number(GRADED_KINDS.includes(a as DecisionKind)))
        .map(([k, n]) => `${GRADED_KINDS.includes(k as DecisionKind) ? "" : "*"}${k} ${n}`);
      const gap = win === "첫 10분" ? r.decisionMaxGap10m : r.decisionMaxGap1h;
      const old = win === "첫 10분" ? ` · 옛 자 ${r.legacyDecisions10m}회` : "";
      const at = win === "첫 1시간" ? `(${duration(r.decisionGapFrom1h)}부터)` : "";
      console.log(`seed ${r.seed}: ${count(r)}회 · 최장 ${duration(gap)}${at}${old} │ ${parts.join(" · ") || "없음"}`);
    }
  }
}
console.log(
  "※ B 최장 간격(첫 1시간) ≤10분은 v0.6.6에서 새로 세운 축이다(decision-tree-10h.md §6 P8). " +
  "현재 빌드가 닿지 못하는 동안은 게이트가 아니라 '보고'로 적는다."
);

console.log(`\n── §6.3 절벽 — 10분 이후 ${TAIL_MIN}분 구간의 최장 무의미 구간 ──`);
for (const [label, runs] of [["운영", activeRuns], ["방치", idleRuns]] as const) {
  const gaps = runs.map((r) => r.tailMaxGap);
  const mid = runs[Math.floor(runs.length / 2)];
  console.log(
    `${label}: 중앙 ${duration(median(gaps))} · 최악 ${duration(worstHigh(gaps))} ` +
    `(중앙판 ${duration(mid.tailFrom)}~${duration(mid.tailTo)})`
  );
}

console.log("\n── 10분 시점 도달 상태 ──");
for (const [label, runs] of [["운영", activeRuns], ["방치", idleRuns]] as const) {
  console.log(
    `${label}: 도감 중앙 ${median(runs.map((r) => r.codex10m))}종 ` +
    `(최악 ${worstLow(runs.map((r) => r.codex10m))}종) · ` +
    `제보 중앙 ${median(runs.map((r) => r.tipCount10m))}회 · ` +
    `발굴력 중앙 ${median(runs.map((r) => r.dig10m)).toFixed(0)}/s · ` +
    `자금 중앙 $${median(runs.map((r) => r.funds10m)).toLocaleString("ko-KR")} · ` +
    `소장고 중앙 ${median(runs.map((r) => r.vault10m))}점`
  );
}

if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify({
      seeds: SEEDS, tailMinutes: TAIL_MIN,
      runs: [...activeRuns, ...idleRuns].map((r) => ({ ...r, events: r.events, decisions: r.decisions }))
    })
  );
  console.log(`\n원본 → ${JSON_OUT}`);
}

export { runOne };
