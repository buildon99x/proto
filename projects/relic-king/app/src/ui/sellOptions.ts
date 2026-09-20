import type { Tier } from "../game/types";

/**
 * 자동 매각 드롭다운의 선택지. 설정 모달과 소장고 탭이 **같은 목록**을 쓴다 —
 * 두 화면이 각자 배열을 들고 있으면 상한 상수를 바꿨을 때 한쪽만 고치는 사고가
 * 난다(실제로 `AUTO_SELL_MAX_TIER`가 1인데 설정 화면만 "진귀 이하"를 계속
 * 보여주고 있었다, notes/decisions.md G68).
 */
export type SellOption = { label: string; value: Tier | null };

/** 감정 직후 자동매각 — 상한 `AUTO_SELL_MAX_TIER`(=1, 희귀) */
export const AUTO_SELL_OPTIONS: SellOption[] = [
  { label: "끄기", value: null },
  { label: "흔함", value: 0 },
  { label: "희귀 이하", value: 1 }
];

/** 소장고 중복분 자동매각 — 상한 `AUTO_SELL_SPARE_MAX_TIER`(=2, 진귀) */
export const SPARE_SELL_OPTIONS: SellOption[] = [
  { label: "끄기", value: null },
  { label: "흔함", value: 0 },
  { label: "희귀 이하", value: 1 },
  { label: "진귀 이하", value: 2 }
];
