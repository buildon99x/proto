import {
  PRICE_CYCLE_HOURS, PRICE_DRIFT_AMPLITUDE, PRICE_UPDATE_INTERVAL_HOURS,
  REGIONAL_PRICE_MULT_MAX, REGIONAL_PRICE_MULT_MIN, SUPPLY_SHOCK_DECAY_HOURS,
  SUPPLY_SHOCK_MAGNITUDE, THEMATIC_PREFERENCE_BONUS
} from "./balance";
import { hashFrac } from "./hash";
import { SITE_BY_ID } from "./sites";
import type { Shape, SiteId } from "./types";

/**
 * 거점별 시세 모델(notes/world-map.md §8, G26/B3). 직접매각·경매장의 최종 가격에
 * 곱해진다. 순수 함수만 둔다 — World 상태를 갖지 않고, 시간(t)과 공급 충격 시각만
 * 인자로 받는다(T1·T2 리젠이 아직 없어 공급 충격은 항상 0이다 — 아래 참조).
 */

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function basePreference(site: SiteId, category: Shape): number {
  const frac = hashFrac(`${site}:${category}`);
  return REGIONAL_PRICE_MULT_MIN + (REGIONAL_PRICE_MULT_MAX - REGIONAL_PRICE_MULT_MIN) * frac;
}

/** 거점·카테고리 고정 선호도(§8.2). 테마 카테고리면 가산 보너스가 붙는다 */
export function preference(site: SiteId, category: Shape): number {
  const themed = SITE_BY_ID[site].thematicCategory.includes(category);
  const v = basePreference(site, category) + (themed ? THEMATIC_PREFERENCE_BONUS : 0);
  return clamp(v, REGIONAL_PRICE_MULT_MIN, REGIONAL_PRICE_MULT_MAX);
}

/** 6시간 단위 계단식 드리프트(§8.3) — 72시간 주기 사인파를 거점·카테고리별 위상차로 샘플링 */
function demandDriftStep(site: SiteId, category: Shape, tSeconds: number): number {
  const bucketHours = Math.floor(tSeconds / 3600 / PRICE_UPDATE_INTERVAL_HOURS) * PRICE_UPDATE_INTERVAL_HOURS;
  const phase = hashFrac(`${site}:${category}:phase`);
  return PRICE_DRIFT_AMPLITUDE * Math.sin((2 * Math.PI * bucketHours) / PRICE_CYCLE_HOURS + 2 * Math.PI * phase);
}

/**
 * T1·T2 리젠(G6) 발생 시각 이후 지수 감쇠하는 공급 충격(§8.3). 리젠 시스템 자체가
 * 아직 엔진에 없어(notes/decisions.md G51.5 — 이번 2단계 범위 밖) `shockAtHours`를
 * 넘기는 호출부가 없다 — 항상 0을 반환한다. 리젠이 붙으면 그 시각을 그대로
 * 넘기기만 하면 이 함수는 그대로 동작한다.
 */
function supplyShock(shockAtHours: number | undefined, nowHours: number): number {
  if (shockAtHours === undefined || nowHours < shockAtHours) return 0;
  return SUPPLY_SHOCK_MAGNITUDE * Math.exp(-(nowHours - shockAtHours) / SUPPLY_SHOCK_DECAY_HOURS);
}

/**
 * 그 거점·카테고리·시각의 로컬 가격 배율(§8.4). `clampMax`는 기본
 * REGIONAL_PRICE_MULT_MAX(1.40)지만, 원거리 교역 정보 우위(§8.5)가 있으면
 * 호출부가 REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX(1.60)를 넘겨 상한을 확장한다.
 */
export function localPriceMult(
  site: SiteId, category: Shape, tSeconds: number,
  clampMax = REGIONAL_PRICE_MULT_MAX, shockAtHours?: number
): number {
  const v = preference(site, category) + demandDriftStep(site, category, tSeconds) - supplyShock(shockAtHours, tSeconds / 3600);
  return clamp(v, REGIONAL_PRICE_MULT_MIN, clampMax);
}
