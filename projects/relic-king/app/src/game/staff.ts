import {
  AUCTIONEER_LOGISTICS_COEFF, AUCTIONEER_NEGOTIATION_COEFF, AUCTION_GRADE_MAX,
  AUCTION_PRICE_MULT_MAX, AUCTION_PRICE_MULT_MIN, AUCTION_SLOT_CAP_BY_GRADE,
  CURATOR_RECOVERY_COEFF, CURATOR_SALARY_INCOME_SHARE,
  FOREMAN_DIG_COEFF, FOREMAN_NAV_SPEED_COEFF, FOREMAN_SALARY_INCOME_SHARE,
  AUCTIONEER_SALARY_FEE_SHARE, MUSEUM_CURATOR_COEFF, MUSEUM_CURATOR_CONTRIB_CAP,
  STAFF_MARKET_CANDIDATE_COUNT, STAFF_PROMOTION_STAT_GAIN, STAFF_SALARY_STAT_COEFF,
  STAFF_STAT_MAX, STAFF_STAT_MIN, THEFT_RECOVERY_BASE, THEFT_RECOVERY_CHANCE_CAP
} from "./balance";
import { hashFrac } from "./hash";
import type { Auctioneer, Curator, Foreman, SiteId, Staff } from "./types";

/**
 * 스텝(고용) 3직군 × 2스탯(notes/staff.md, G50/C#5로 4→2 축소). 후보는 결정론
 * 해시로 생성돼 고용 전에 전부 공개된다(§0, 척추 5번) — 가챠가 아니다.
 */

export type StaffRole = "foreman" | "curator" | "auctioneer";

export type StaffCandidate =
  | { role: "foreman"; name: string; leadership: number; navigation: number }
  | { role: "curator"; name: string; curation: number; securitySense: number }
  | { role: "auctioneer"; name: string; negotiation: number; logistics: number };

const NAME_POOL = [
  "김도윤", "이서연", "박지훈", "최유나", "정민재", "한소율", "임태호", "장하은",
  "R. 베넷", "M. 뒤부아", "S. 코바치", "J. 알메이다", "A. 나카무라", "T. 오코너", "E. 슈미트", "N. 파텔"
];

/**
 * `notes/staff.md` §4의 CANDIDATE_STAT 식 그대로다. 단, 문서 식(`${site}:${cycle}:
 * ${role}:${statName}`)에는 후보 슬롯 구분 항이 없어 3후보가 전부 같은 값이 되는
 * 공백이 있다 — 슬롯 인덱스를 해시 키에 추가해 3명이 실제로 다른 스탯을 갖도록
 * 확장했다(notes/decisions.md G52 보고 대상). 같은 (site, cycle, role, slot)에는
 * 항상 같은 값이 나온다 — 결정론은 유지된다.
 */
function candidateStat(site: SiteId, cycle: number, role: StaffRole, slot: number, statName: string): number {
  const frac = hashFrac(`${site}:${cycle}:${role}:${slot}:${statName}`);
  return Math.round(STAFF_STAT_MIN + (STAFF_STAT_MAX - STAFF_STAT_MIN) * frac);
}

function candidateName(site: SiteId, cycle: number, role: StaffRole, slot: number): string {
  const idx = Math.floor(hashFrac(`${site}:${cycle}:${role}:${slot}:name`) * NAME_POOL.length);
  return NAME_POOL[idx];
}

/** 그 거점의 그 갱신 회차·직군 후보 3명(STAFF_MARKET_CANDIDATE_COUNT). 무료로 언제든 다시
 *  계산할 수 있다 — World에 저장하지 않는다(순수 함수, 24시간마다 자연히 회차가 바뀐다). */
export function staffCandidates(site: SiteId, cycle: number, role: StaffRole): StaffCandidate[] {
  const out: StaffCandidate[] = [];
  for (let slot = 0; slot < STAFF_MARKET_CANDIDATE_COUNT; slot++) {
    const name = candidateName(site, cycle, role, slot);
    if (role === "foreman") {
      out.push({
        role, name,
        leadership: candidateStat(site, cycle, role, slot, "LEADERSHIP"),
        navigation: candidateStat(site, cycle, role, slot, "NAVIGATION")
      });
    } else if (role === "curator") {
      out.push({
        role, name,
        curation: candidateStat(site, cycle, role, slot, "CURATION"),
        securitySense: candidateStat(site, cycle, role, slot, "SECURITY_SENSE")
      });
    } else {
      out.push({
        role, name,
        negotiation: candidateStat(site, cycle, role, slot, "NEGOTIATION"),
        logistics: candidateStat(site, cycle, role, slot, "LOGISTICS")
      });
    }
  }
  return out;
}

// ── 발굴단 단장(staff.md §1) ─────────────────────────────────────────────

/** D_team 기반항에 더해지는 가산분(곱연산 금지 — economy.md §7) */
export function foremanDigContribution(leadership: number): number {
  return leadership * FOREMAN_DIG_COEFF;
}

/** EXPEDITION_SPEED_KMH에 곱해지는 배율(1.0~1.3) */
export function foremanSpeedMult(navigation: number): number {
  return 1 + navigation * FOREMAN_NAV_SPEED_COEFF;
}

// ── 박물관 관장(staff.md §2, 4단계에서 실제로 구현) ────────────────────────

export function museumCuratorContribution(curation: number): number {
  return Math.min(MUSEUM_CURATOR_CONTRIB_CAP, 1 + MUSEUM_CURATOR_COEFF * curation);
}

export function theftRecoveryChance(securitySense: number): number {
  return Math.min(THEFT_RECOVERY_CHANCE_CAP, THEFT_RECOVERY_BASE + CURATOR_RECOVERY_COEFF * securitySense);
}

// ── 경매장 관장(staff.md §3, 4단계에서 실제로 구현) ────────────────────────

/**
 * 실질 슬롯 = AUCTION_SLOT_CAP_BY_GRADE[grade] + floor(LOGISTICS × COEFF)(staff.md §3).
 * **버그 수정**(notes/decisions.md G54): 2단계 구현은 `AUCTION_SLOT_CAP_BY_GRADE`가
 * 아직 balance.ts에 없어 `grade`(1~4 숫자) 자체를 슬롯 수 근사치로 대신 썼다
 * (G52.4 — "물류 슬롯 보너스만 먼저 구현"). 이제 그 상수가 있으니 문서 공식대로
 * 고친다. grade는 1부터 시작 — 배열은 0-index라 grade-1로 조회한다.
 */
export function auctioneerSlotBonus(grade: number, logistics: number): number {
  return AUCTION_SLOT_CAP_BY_GRADE[grade - 1] + Math.floor(logistics * AUCTIONEER_LOGISTICS_COEFF);
}

/** 경매장 가격배율(staff.md §3, G30/C·G50/C#6). auctioneer가 없으면 negotiation=0을 넘긴다 */
export function auctionPriceMult(grade: number, negotiation: number): number {
  const gradeProgress = (grade - 1) / (AUCTION_GRADE_MAX - 1);
  const reach = Math.min(1, gradeProgress + negotiation * AUCTIONEER_NEGOTIATION_COEFF);
  return AUCTION_PRICE_MULT_MIN + (AUCTION_PRICE_MULT_MAX - AUCTION_PRICE_MULT_MIN) * reach;
}

// ── 급여(staff.md §5, G29/B7 — 판매 시점 원천징수) ───────────────────────

/** 스탯배율 = 1 + 0.6 × (평균 스탯) / 100. 1.0~1.6 */
export function statMultiplier(stat1: number, stat2: number): number {
  return 1 + STAFF_SALARY_STAT_COEFF * ((stat1 + stat2) / 2) / STAFF_STAT_MAX;
}

export function foremanSalary(saleAmount: number, foreman: Foreman): number {
  return FOREMAN_SALARY_INCOME_SHARE * statMultiplier(foreman.leadership, foreman.navigation) * saleAmount;
}

/** 박물관 시간당 관람수입 정산(engine.ts accrueMuseumIncome)에 연결된다 */
export function curatorSalary(visitorIncome: number, curator: Curator): number {
  return CURATOR_SALARY_INCOME_SHARE * statMultiplier(curator.curation, curator.securitySense) * visitorIncome;
}

/** 경매 낙찰 확정(engine.ts settleAuctionListing)에 연결된다 */
export function auctioneerSalary(hammerPrice: number, auctioneer: Auctioneer): number {
  return AUCTIONEER_SALARY_FEE_SHARE * statMultiplier(auctioneer.negotiation, auctioneer.logistics) * hammerPrice;
}

// ── 승급(staff.md §6) ────────────────────────────────────────────────────

/** 가장 낮은 스탯 하나에 STAFF_PROMOTION_STAT_GAIN을 더한다(결정론, 무작위 아님) */
export function promote(staff: Staff): Staff {
  if (staff.role === "foreman") {
    const key = staff.leadership <= staff.navigation ? "leadership" : "navigation";
    return { ...staff, [key]: Math.min(STAFF_STAT_MAX, staff[key] + STAFF_PROMOTION_STAT_GAIN) };
  }
  if (staff.role === "curator") {
    const key = staff.curation <= staff.securitySense ? "curation" : "securitySense";
    return { ...staff, [key]: Math.min(STAFF_STAT_MAX, staff[key] + STAFF_PROMOTION_STAT_GAIN) };
  }
  const key = staff.negotiation <= staff.logistics ? "negotiation" : "logistics";
  return { ...staff, [key]: Math.min(STAFF_STAT_MAX, staff[key] + STAFF_PROMOTION_STAT_GAIN) };
}
