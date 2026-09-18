import {
  BASE_DIG, EXPEDITION_DISTANCE_COST_COEFF, EXPEDITION_DISTANCE_REF_KM,
  EXPEDITION_DISTANCE_YIELD_COEFF, EXPEDITION_MISHAP_BASE, EXPEDITION_MISHAP_CHANCE_CAP,
  EXPEDITION_MISHAP_PER_1000KM, EXPEDITION_ONSITE_MIN_HOURS, EXPEDITION_ONSITE_RATIO,
  EXPEDITION_SPEED_KMH, GEAR_MULT, WORKER_DIG
} from "./balance";
import { foremanDigContribution, foremanSpeedMult } from "./staff";
import type { ExpeditionTeam } from "./types";

/**
 * 원정 회차제의 순수 계산부(spec.md §8.3, notes/world-map.md §2·§3). World를
 * 모르는 순수 함수만 둔다 — 실제 파견·틱·귀환 정산은 engine.ts가 이 함수들을
 * 엮어서 한다.
 */

/** 편도 이동시간(h). 단장 항해술이 실효 속도를 최대 30%까지 올린다 */
export function travelHoursOneWay(distanceKm: number, navigation: number): number {
  const speed = EXPEDITION_SPEED_KMH * foremanSpeedMult(navigation);
  return distanceKm / speed;
}

/** 현지작업시간(h) — 가동률 60%(EXPEDITION_ONSITE_RATIO=3.0, G27/B5) */
export function onsiteHoursOf(travelOneWayHours: number): number {
  return Math.max(EXPEDITION_ONSITE_MIN_HOURS, travelOneWayHours * EXPEDITION_ONSITE_RATIO);
}

export function mishapChance(distanceKm: number): number {
  return Math.min(
    EXPEDITION_MISHAP_CHANCE_CAP,
    EXPEDITION_MISHAP_BASE + (EXPEDITION_MISHAP_PER_1000KM * distanceKm) / 1000
  );
}

export function distanceCostMult(distanceKm: number): number {
  return 1 + EXPEDITION_DISTANCE_COST_COEFF * Math.min(1, distanceKm / EXPEDITION_DISTANCE_REF_KM);
}

/** world-map.md §3 — "원정 기대소득" 계산에서만 쓰는 거리 업사이드. 실제 드랍
 *  확률·티어 가중은 바뀌지 않는다(spec.md §8.3, "층 돌파·드랍 임계·티어 가중
 *  중 바뀌는 게 없다") — 이 상수는 원정비를 사이징하는 노셔널(notional) 소득
 *  계산에만 들어간다. notes/decisions.md G52 보고 대상: world-map.md §4 문장
 *  ("수확도 오른다")은 실제 드랍가치 공식이 아니라 이 노셔널 계산만을 가리키는
 *  것으로 해석해 구현했다.
 */
export function distanceYieldBonus(distanceKm: number): number {
  return 1 + EXPEDITION_DISTANCE_YIELD_COEFF * Math.min(1, distanceKm / EXPEDITION_DISTANCE_REF_KM);
}

/** D_team = (BASE_DIG + workers×WORKER_DIG + LEADERSHIP×FOREMAN_DIG_COEFF) × GEAR_MULT^gearLevel */
export function teamDigPower(workers: number, gearLevel: number, leadership: number): number {
  return (BASE_DIG + workers * WORKER_DIG + foremanDigContribution(leadership)) * Math.pow(GEAR_MULT, gearLevel);
}

/** 팀의 현지작업 구간 [start, end)를 절대 world.t 초 단위로 돌려준다. 왕복 거리가
 *  같으므로 편도 이동시간 = arrivesAt − dispatchedAt으로 역산한다(추가 필드 불필요) */
export function onsiteWindow(team: ExpeditionTeam): { start: number; end: number } {
  const travelSeconds = team.arrivesAt - team.dispatchedAt;
  return { start: team.arrivesAt, end: team.returnsAt - travelSeconds };
}
