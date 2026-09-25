import { ARTIFACTS } from "../game/artifacts";
import { EXPEDITION_SPEED_KMH, SITES, SITE_BY_ID } from "../game/balance";
import { nextTeamSlotCost, ownedSiteCap, teamHomeSite } from "../game/engine";
import { distanceKm } from "../game/sites";
import type { SiteId, World } from "../game/types";

/**
 * 첫 거점 카드(v0.6.6, `notes/decision-tree-10h.md` P1)에 적는 숫자를 만든다.
 * 전부 데이터에서 바로 읽는 순수 함수다. 게임 규칙은 바꾸지 않는다.
 */

/** 거점별 검증된 종 수. 드랍 풀은 검증된 종만 쓴다(`artifacts.ts` 머리 주석). */
const SPECIES_BY_SITE: Record<SiteId, number> = Object.fromEntries(
  SITES.map((s) => [s.id, ARTIFACTS.filter((a) => a.site === s.id && a.sourceStatus === "verified").length])
) as Record<SiteId, number>;

export function speciesCount(site: SiteId): number {
  return SPECIES_BY_SITE[site];
}

/** 그 거점의 유일(T4) 한 점. 거점마다 한 종이다. */
export function uniqueOf(site: SiteId): { name: string; minLayer: number } | null {
  const a = ARTIFACTS.find((x) => x.site === site && x.tier === 4 && x.sourceStatus === "verified");
  return a ? { name: a.name, minLayer: a.minLayer } : null;
}

/** 그 거점을 홈으로 둔 라이벌 수. 고스트(기록패)는 레이스에 끼지 않으므로 뺀다. */
export function homeRivalCount(w: World, site: SiteId): number {
  return w.rivals.filter((r) => !r.ghost && r.homeSite === site).length;
}

export type SiteFacts = {
  site: SiteId;
  species: number;
  unique: { name: string; minLayer: number } | null;
  homeRivals: number;
  km: number;
  /** 편도 이동시간(h). 단장 항해술 보정 전 값이다. */
  hours: number;
  cost: number;
  affordable: boolean;
};

export function siteFacts(w: World, site: SiteId): SiteFacts {
  const km = distanceKm(teamHomeSite(w), site);
  const cost = SITE_BY_ID[site].unlockCost;
  return {
    site,
    species: speciesCount(site),
    unique: uniqueOf(site),
    homeRivals: homeRivalCount(w, site),
    km,
    hours: km / EXPEDITION_SPEED_KMH,
    cost,
    affordable: w.funds >= cost
  };
}

export function ownedSites(w: World): SiteId[] {
  return SITES.filter((s) => w.sites[s.id].unlocked).map((s) => s.id);
}

/** 아직 열지 않은 거점. 해금 비용이 낮은 순이다. */
export function lockedSitesByCost(w: World): SiteId[] {
  return SITES.filter((s) => !w.sites[s.id].unlocked)
    .sort((a, b) => a.unlockCost - b.unlockCost)
    .map((s) => s.id);
}

/** 카드 세 장을 고르는 규칙. 화면에도 같은 문장을 적는다(척추 5번). */
export const CHOOSER_RULE_TEXT = "고른 기준: 아직 안 연 거점 중 해금 비용이 낮은 3곳이다. 지금 자금으로 먼저 닿는 순서다.";

export function firstBaseCandidates(w: World): SiteId[] {
  return lockedSitesByCost(w).slice(0, 3);
}

/** 제보가 열려 있고 아직 결판 전인가. 이때는 거점 카드를 띄우지 않는다. */
export function tipUnresolved(w: World): boolean {
  return !!w.tip && !w.tip.resolved;
}

/**
 * 첫 거점 카드를 띄울 조건. 거점이 하나뿐이고, 한 곳이라도 열 돈이 있고,
 * 제보 레이스가 진행 중이 아닐 때다.
 */
export function shouldOfferFirstBase(w: World): boolean {
  const owned = ownedSites(w);
  if (owned.length !== 1 || owned.length >= ownedSiteCap(w)) return false;
  const cheapest = lockedSitesByCost(w)[0];
  if (!cheapest || w.funds < SITE_BY_ID[cheapest].unlockCost) return false;
  return !tipUnresolved(w);
}

/**
 * 경주에만 있을 때 발굴 탭에 적는 한계 문구 재료. 경주의 종 수와 다른 11곳의 평균을
 * 비교한다. 경주 종 수를 늘리는 건 척추 1번과 부딪히므로 사실만 적는다.
 */
export function homeSpeciesGap(site: SiteId): { species: number; othersAvg: number; ratio: number } {
  const others = SITES.filter((s) => s.id !== site).map((s) => SPECIES_BY_SITE[s.id]);
  const othersAvg = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
  const species = SPECIES_BY_SITE[site];
  return { species, othersAvg, ratio: othersAvg > 0 ? species / othersAvg : 1 };
}

export function formatTravelHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}분`;
  return `${hours.toFixed(1)}시간`;
}

/**
 * "다음 확장" 갈림길(v0.6.8, `notes/decisions.md` G117) — 거점이 둘, 발굴단이 하나일 때 다음 목돈을
 * **셋째 거점**에 쓸지 **둘째 발굴단**에 쓸지 고른다. 둘 다 약 $25만이라 같은 돈을 두고 다툰다.
 *
 * 실측으로 둘 다 일리가 있다(`eval.md` §36.2). 거점을 먼저 열면 10시간 도감이 약 13% 많고,
 * 팀을 먼저 꾸리면 팀이 떠나 있는 동안에도 제보에 대응할 수단이 남는다. 예전에는 이 갈림길이
 * 화면에 없었고 정책만 몰래 골랐다. 대가가 분명한 진짜 결정이라 보여 준다.
 */
export function expansionForkOptions(w: World): { site: SiteFacts; slotCost: number; slotAffordable: boolean } | null {
  if (ownedSites(w).length !== 2 || w.maxTeams !== 1) return null;
  if (ownedSites(w).length >= ownedSiteCap(w)) return null;
  const cheapest = lockedSitesByCost(w)[0];
  if (!cheapest) return null;
  const slotCost = nextTeamSlotCost(w);
  return { site: siteFacts(w, cheapest), slotCost, slotAffordable: w.funds >= slotCost };
}

/** 갈림길을 띄울 때인가 — 둘 중 하나라도 살 수 있게 됐고, 결판 전 제보가 없다 */
export function shouldOfferExpansionFork(w: World): boolean {
  const o = expansionForkOptions(w);
  if (!o || tipUnresolved(w)) return false;
  return o.slotAffordable || o.site.affordable;
}
