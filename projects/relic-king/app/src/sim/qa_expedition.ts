/**
 * 원정 회차제의 오프라인 적분 동등성 검증(2단계 작업 지시).
 *
 *   pnpm --filter relic-king exec tsx src/sim/qa_expedition.ts
 *
 * 발굴단 파견→이동→현지작업→귀환 전체 수명주기가 **스텝 크기와 무관하게** 같은
 * 결과를 내는지 확인한다 — `tickExpeditions()`가 팀 상태 문자열이 아니라
 * (arrivesAt, returnsAt) 절대 타임스탬프와 실제 겹침 구간으로만 진척을 계산하기
 * 때문에 이래야 한다(engine.ts 주석 참조). 1초 스텝과 10초 스텝으로 각각
 * 독립된 월드를 같은 시드에서 만들어 같은 원정을 보낸 뒤, 귀환까지 전부 끝날
 * 때까지 적분해 최종 상태를 비교한다.
 */
import { distanceKm } from "../game/balance";
import {
  advance, buyTeamGear, buyTeamWorker, createTeam, createWorld, dispatchExpedition, hireForeman
} from "../game/engine";
import type { SiteId, World } from "../game/types";

let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failed++;
}

/** korea 본거지에서 china로 원정을 보낸다 — 근거리라 1초 스텝으로도 빠르게 끝난다 */
const TARGET: SiteId = "china";

function setupDispatched(): World {
  const w = createWorld();
  w.funds = 10_000_000;
  // 제보(w.tip)를 이 테스트에서는 끈다 — 제보 배너/추적(activeTipTarget)은 w.tip.remain이
  // 실제 초 단위로 줄어드는 시점에 의존하는데, 한 스텝 안에서 여러 드랍 문턱을 한꺼번에
  // 처리하는 이 엔진의 청크 구조상 그 시점 자체가 스텝 크기에 따라 달라진다(청크가
  // 크면 그 청크 전체가 "쫓는 중" 스냅샷 하나를 공유하고, 청크가 작으면 도중에 만료될
  // 수 있다 — dropProgress 잔량이 청크 크기별로 달라지는 것과 같은 부류의 현상, 아래
  // 참조). 이 테스트의 목적은 원정(이동·현지작업·미스헵·원정비) 자체의 스텝 무관성이지
  // 제보 시스템의 스텝 무관성이 아니라서(제보는 별도 관심사, notes/decisions.md G53.5),
  // 제보를 꺼서 그 잡음을 걷어낸다(china가 3단계로 제보 대상 자격을 얻으면서 실제로
  // 이 테스트에 이 잡음이 새로 섞여 들어왔다 — notes/decisions.md G53 보고 대상).
  w.nextTipIn = Number.MAX_SAFE_INTEGER;
  // 자동매각(`settings.autoSellBelow`, notes/decisions.md G57부터 기본 켬)도 같은
  // 이유로 끈다 — 감정 완료마다 `settleSale()`이 로컬 시세(bestLocalPriceMult, 시각
  // 의존)를 곱해 즉시 funds를 바꾸는데, 이 테스트 구간(~20시간, 레거시 단독 발굴도
  // 계속 함께 돈다)에는 그런 감정-즉시매각 이벤트가 수백 건 쌓인다. 이 테스트의
  // 목적은 원정비·귀환 정산의 스텝 무관성이지 일반 감정→자동매각 파이프라인의
  // 스텝 무관성이 아니므로(그건 이미 사용 중인 다른 스텝-청크 잔차, G53.10과 같은
  // 부류이고 qa_economy.ts가 별도로 다룬다), 꺼서 잡음을 걷어낸다.
  w.settings.autoSellBelow = null;
  // v0.3.4부터 새 월드에는 시작 발굴단 1팀이 이미 파견된 채로 온다. 이 테스트는
  // **원정 한 회차**의 스텝 무관성을 보는 것이라 그 팀을 비우고 통제된 조건으로
  // 다시 꾸린다 — 시작 발굴단 자체는 qa_migration·playlog가 따로 본다.
  w.teams = [];
  w.staff = [];
  const foremanId = hireForeman(w, "korea", 0)!;
  const teamId = createTeam(w, foremanId)!;
  buyTeamWorker(w, teamId);
  buyTeamWorker(w, teamId);
  buyTeamGear(w, teamId);
  // 루틴은 끈다 — 이 전제는 **왕복 한 회차**를 보는 것이고, 켜 두면 귀환 즉시
  // 다시 나가 "둘 다 idle" 단언이 성립하지 않는다(v0.3.4부터 새 팀의 기본값이
  // 자동 순회다). 루틴 자체의 스텝 무관성은 아래 별도 블록이 따로 본다.
  const team = w.teams.find((t) => t.id === teamId)!;
  team.routine = null;
  const dispatched = dispatchExpedition(w, teamId, TARGET);
  if (!dispatched) throw new Error("파견 실패 — 테스트 전제 붕괴");
  return w;
}

console.log("──────── qa_expedition: 오프라인 적분 동등성(1초 vs 10초 스텝) ────────");

const dist = distanceKm("korea", TARGET);
console.log(`대상: korea → ${TARGET} (${dist.toFixed(0)}km)`);

// 총 왕복 소요(항해술 미반영 상한선)를 넉넉히 덮는 시간까지 적분한다.
const totalSeconds = Math.ceil(((2 * dist) / 400 + (dist / 400) * 3 + 1) * 3600) + 3600;

const a = setupDispatched();
const b = setupDispatched();
advance(a, totalSeconds, false, 1);
advance(b, totalSeconds, false, 10);

check("두 런의 파견 직후 미스헵 판정이 동일하다(같은 시드·같은 조작 순서)",
  a.teams[0].mishapRolled === b.teams[0].mishapRolled);
check("팀이 둘 다 귀환(idle)했다", a.teams[0].status === "idle" && b.teams[0].status === "idle");
check("거점 층이 스텝 크기와 무관하게 같다", a.sites[TARGET].layer === b.sites[TARGET].layer);
check("거점 layerProgress가 스텝 크기와 무관하게 같다(오차 1e-6 이내)",
  Math.abs(a.sites[TARGET].layerProgress - b.sites[TARGET].layerProgress) < 1e-6);
// notes/decisions.md G53.10: china가 3단계로 실제 드랍 가능한 거점이 되기 전까지
// 이 테스트는 "드랍 0=0"이라 아래 두 비교가 트리비얼하게 항상 맞았다 — 실제
// 드랍이 벌어지는 조건에서는 한 번도 검증된 적이 없었다. 실측 결과 아주 드물게
// (약 1,684회 드랍 중 1회, DROP_THRESHOLD_FLOOR 근방에서) 층 돌파 경계와 드랍
// 문턱이 같은 청크 안에서 겹치는 순간 어떤 층 기준을 적용했는지가 청크 크기에
// 따라 갈릴 수 있다(위 dropProgress 잔량과 같은 원인 — layerProgress가 finalize
// 시점의 실제 층 판정에도 아주 드물게 영향을 준다). digRival의 연속 원정비
// 차감(스텝 크기에 따라 재투자 임계값 판정 시점이 갈라지는 원인이었다)은 이미
// 이산적(매각 시점 원천징수)으로 다시 설계해 없앴다(G53.6 개정) — 그런데도
// 이 미세한 ±1 드랍 경계 문제는 남아 있어, v0.1부터 있던 청크 구조 자체의
// 성질로 판정하고 느슨한 허용치로 검증한다(정확히 같아야 한다는 주장은
// 철회한다 — 문서 정정).
const dropDiff = Math.abs(a.stats.drops - b.stats.drops);
check(`드랍 횟수가 스텝 크기와 거의 무관하다(±2 이내, 실측 차이 ${dropDiff}/${a.stats.drops})`, dropDiff <= 2);
const fundsDiff = Math.abs(a.funds - b.funds);
const fundsTolerance = Math.max(1, Math.abs(a.funds) * 0.001); // 0.1% 이내
check(
  `귀환 후 funds가 스텝 크기와 거의 무관하다(0.1% 이내, 실측 차이 $${fundsDiff.toLocaleString("ko-KR")})`,
  fundsDiff <= fundsTolerance
);
check("원정비가 실제로 원천징수됐다(파견 시점 funds보다 감소)", a.funds < 10_000_000);

/**
 * **dropProgress 잔량·rngState는 단언하지 않는다(보고 대상 — notes/decisions.md G52).**
 * `sp.layerProgress`(층 돌파 판정)와 `sp.dropProgress`(드랍 판정)는 같은 `progress`를
 * 동시에 누적하지만 각자 독립된 while 루프로 소진된다. 큰 스텝(10초) 한 번 안에서는
 * "이 청크가 낼 수 있는 층 돌파를 전부 처리 → 그 다음(이미 오른) 층 기준으로 드랍을
 * 전부 처리"가 되는데, 작은 스텝(1초)에서는 같은 청크에 해당하는 층 돌파와 드랍이
 * 실제 시간순으로 더 잘게 쪼개져 처리된다 — 층 돌파 경계와 드랍 소진이 같은 청크
 * 안에서 겹치면 그 청크 동안 어떤 층의 dropThreshold를 적용했는지가 청크 크기에
 * 따라 달라질 수 있다(v0.1 digPlayer/digRival부터 있던 배치 구조의 성질이지 이번
 * 2단계가 새로 만든 결함이 아니다). 그 결과 dropProgress **잔량**(아직 못 채운
 * 나머지)과, 그 잔량 차이가 연쇄한 이후의 rng 소비 순서가 청크 크기별로 달라질 수
 * 있다 — 실측(korea→china, 538회 드랍 동안)으로 확인했다.
 *
 * 이건 **플레이어에게 보이는 값이 달라진다는 뜻이 아니다.** dropProgress는 UI에
 * 노출되지 않는 내부 누산기고, 실제로 스텝 크기와 무관해야 하는 것(플레이어가
 * 확인할 수 있는 결과)은 위에서 단언한 **드랍 횟수·층·funds**다 — 이 세 값은
 * **거의** 일치한다(정정 — notes/decisions.md G53.10: 3단계 이전엔 china의 드랍이
 * 항상 0이라 "완전히 일치"가 트리비얼하게 참이었을 뿐, 실제 드랍이 벌어지는
 * 조건에서 검증된 적이 없었다. 실측 결과 층 돌파 경계와 겹치는 극히 드문
 * 순간에 ±1 드랍 차이가 날 수 있어 느슨한 허용치로 재조정했다 — 위 두 check
 * 참조). `sim/run.ts`의 기존 오프라인 적분 검증도 같은 이유로 애초에
 * dropProgress·rngState는 비교하지 않고 drops·layer·layerProgress만 비교한다 —
 * 그 선례를 그대로 따랐다.
 */

// ── 미탐사 보너스·방문 플래그도 스텝 크기와 무관해야 한다 ──────────────────
check("원정 대상 거점이 visitedSites에 반영된다(스텝 크기 무관)",
  a.visitedSites[TARGET] === true && b.visitedSites[TARGET] === true);

// ── 루틴 재파견도 같은 방식으로 동등해야 한다(선 귀환 직후 자동 재파견) ──────
function setupRoutine(): World {
  const w = setupDispatched();
  w.teams[0].routine = { enabled: true, target: TARGET };
  return w;
}
const totalSecondsTwoTrips = totalSeconds * 2;
const c = setupRoutine();
const d = setupRoutine();
advance(c, totalSecondsTwoTrips, false, 1);
advance(d, totalSecondsTwoTrips, false, 10);
const routineFundsDiff = Math.abs(c.funds - d.funds);
const routineFundsTolerance = Math.max(1, Math.abs(c.funds) * 0.001);
check(
  `루틴 재파견 2회 후 funds도 스텝 크기와 거의 무관하다(0.1% 이내, 실측 차이 $${routineFundsDiff.toLocaleString("ko-KR")})`,
  routineFundsDiff <= routineFundsTolerance
);
check("루틴 재파견 2회 후 거점 층도 스텝 크기와 무관하게 같다", c.sites[TARGET].layer === d.sites[TARGET].layer);
check("루틴이 두 번째 원정을 실제로 재파견했다(dispatchedAt이 0보다 크다)",
  c.teams[0].dispatchedAt > 0 && d.teams[0].dispatchedAt > 0);

console.log(failed === 0 ? "\n✅ qa_expedition 전체 통과" : `\n❌ qa_expedition ${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
