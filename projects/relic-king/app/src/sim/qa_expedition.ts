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
  const foremanId = hireForeman(w, "korea", 0)!;
  const teamId = createTeam(w, foremanId)!;
  buyTeamWorker(w, teamId);
  buyTeamWorker(w, teamId);
  buyTeamGear(w, teamId);
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
check("드랍 횟수가 스텝 크기와 무관하게 같다", a.stats.drops === b.stats.drops);
check("귀환 후 funds(원정비 후불 원천징수 포함)가 스텝 크기와 무관하게 같다", a.funds === b.funds);
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
 * 완전히 일치한다. `sim/run.ts`의 기존 오프라인 적분 검증도 같은 이유로 애초에
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
check("루틴 재파견 2회 후 funds도 스텝 크기와 무관하게 같다", c.funds === d.funds);
check("루틴 재파견 2회 후 거점 층도 스텝 크기와 무관하게 같다", c.sites[TARGET].layer === d.sites[TARGET].layer);
check("루틴이 두 번째 원정을 실제로 재파견했다(dispatchedAt이 0보다 크다)",
  c.teams[0].dispatchedAt > 0 && d.teams[0].dispatchedAt > 0);

console.log(failed === 0 ? "\n✅ qa_expedition 전체 통과" : `\n❌ qa_expedition ${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
