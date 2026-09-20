import {
  MUSEUM_CURATOR_CONTRIB_CAP, MUSEUM_FATIGUE_DECAY_RATE, MUSEUM_FRESHNESS_FLOOR,
  MUSEUM_FRESHNESS_RECOVERY_RATE, MUSEUM_MARKETING_COEFF, MUSEUM_MARKETING_LEVEL_CAP,
  MUSEUM_POP_CONTRIB_CAP, MUSEUM_POP_EXPONENT, MUSEUM_POP_REF, MUSEUM_RARITY_COEFF,
  MUSEUM_RARITY_CONTRIB_CAP, MUSEUM_TICKET_PRICE, MUSEUM_UPKEEP_RATE, MUSEUM_VISITOR_BASE,
  RARITY_WEIGHT
} from "./balance";
import { museumCuratorContribution } from "./staff";
import type { Tier } from "./types";

/**
 * 박물관 관람객·수입 순수 계산(spec.md §10.1). World 상태를 모른다 — engine.ts가
 * 전시 중 유물의 (tier, freshness) 목록과 인구·관장 스탯·마케팅 레벨을 뽑아 넘긴다.
 */

/** 전시 세션 경과시간(h)으로부터 FRESHNESS를 구한다(§10.4) */
export function freshnessOnDisplay(elapsedHours: number): number {
  return Math.max(MUSEUM_FRESHNESS_FLOOR, Math.exp(-MUSEUM_FATIGUE_DECAY_RATE * elapsedHours));
}

/** 휴식(비전시) 경과시간(h)과 내려간 시점 값으로부터 회복된 FRESHNESS를 구한다(§10.4) */
export function freshnessRecovered(baseline: number, restHours: number): number {
  return Math.min(1, baseline + MUSEUM_FRESHNESS_RECOVERY_RATE * restHours);
}

export type DisplayedSlot = { tier: Tier; freshness: number };

/** 관람객(1일, §10.1). curationStat은 관장이 없으면 0(보정 없음 = ×1)을 넘긴다 */
export function museumVisitorsPerDay(
  population: number, slots: DisplayedSlot[], curationStat: number, marketingLevel: number
): number {
  const popTerm = Math.min(MUSEUM_POP_CONTRIB_CAP, Math.pow(population / MUSEUM_POP_REF, MUSEUM_POP_EXPONENT));
  const raritySum = slots.reduce((sum, s) => sum + RARITY_WEIGHT[s.tier] * s.freshness, 0);
  const rarityTerm = Math.min(MUSEUM_RARITY_CONTRIB_CAP, 1 + MUSEUM_RARITY_COEFF * raritySum);
  const curatorTerm = Math.min(MUSEUM_CURATOR_CONTRIB_CAP, museumCuratorContribution(curationStat));
  const marketingTerm = 1 + MUSEUM_MARKETING_COEFF * Math.min(MUSEUM_MARKETING_LEVEL_CAP, marketingLevel);
  return MUSEUM_VISITOR_BASE * popTerm * rarityTerm * curatorTerm * marketingTerm;
}

/** 관람수입(시간당, 캡·급여·유지비 적용 전) */
export function museumVisitorIncomeHourly(visitorsPerDay: number): number {
  return (visitorsPerDay * MUSEUM_TICKET_PRICE) / 24;
}

export function museumUpkeepHourly(visitorIncome: number): number {
  return MUSEUM_UPKEEP_RATE * visitorIncome;
}
