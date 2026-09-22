import { vaultCarePlan } from "../game/engine";
import { won } from "../game/format";
import type { World } from "../game/types";

/**
 * 정원 초과 한 줄 — 엔진의 `vaultCarePlan()`이 고른 것을 그대로 옮긴다.
 * 두 화면(소장고·시설)이 같은 문장을 쓰게 하려고 여기 하나만 둔다.
 */
export function vaultCareLine(world: World): string | null {
  const plan = vaultCarePlan(world);
  if (plan.kind === "ok") return null;
  const head = `정원 ${plan.capacity}점을 ${plan.stored - plan.capacity}점 넘겼다 — 넘긴 동안 모든 소장 유물의 보존 저하 확률이 2배다.`;
  if (plan.kind === "backlog") {
    return `${head} 중복 ${plan.waiting}점이 **경매 출품 대기**로 묶여 있다 — 경매장을 늘리거나 보낼 곳을 직접 매각으로 바꾸면 빠진다. 정원이 좁은 게 아니라 출구가 막힌 것이다.`.replace(/\*\*/g, "");
  }
  if (plan.kind === "off") return `${head} 자동 재투자가 꺼져 있어 자동 대응도 쉰다 — 정원을 직접 늘리거나 중복분을 정리한다.`;
  if (plan.kind === "expand") {
    return plan.affordable
      ? `${head} 한 칸 증축하면 풀린다 — 자동으로 산다(${won(plan.cost)} ₩).`
      : `${head} 한 칸 증축하면 풀린다(${won(plan.cost)} ₩). 자금이 모이면 자동으로 산다.`;
  }
  return plan.affordable
    ? `${head} 정원으로는 따라잡을 수 없다(수집품 자체가 정원을 넘었다) — 자동으로 습도조절을 Lv.${plan.level + 1}로 올려 저하를 상쇄한다.`
    : `${head} 정원으로는 따라잡을 수 없다 — 습도조절 Lv.${plan.level + 1}(${won(plan.cost)} ₩)이 그 저하를 상쇄한다. 자금이 모이면 자동으로 오른다.`;
}
