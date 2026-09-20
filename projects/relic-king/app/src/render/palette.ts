import type { PaletteId, SiteId } from "../game/types";

/** 고정 40색. 지층·유물·UI가 같은 팔레트를 공유한다. */
export const PALETTE = {
  ink: "#12100e",
  shadow: "#241f1a",
  soil: ["#6b4f35", "#5d4430", "#7a5a3c", "#4f3a29", "#87663f", "#453222"],
  rock: ["#6f6a63", "#5a554f", "#807a71"],
  sky: "#2b3a4a",
  gold: ["#4a3410", "#8a6218", "#c9942a", "#f0cd55"],
  paper: "#efe6d2"
} as const;

type Ramp = { outline: string; ramp: [string, string, string, string] };

/** 유물 스프라이트용 5단 램프 (외곽선 + 어두움→밝음 4단) */
export const RAMPS: Record<PaletteId, Ramp> = {
  celadon: { outline: "#1d3330", ramp: ["#2f5a53", "#478079", "#6aa89c", "#a8d4c4"] },
  gold: { outline: "#3a2708", ramp: ["#7a5512", "#b98a20", "#e3b63c", "#f7e08a"] },
  silver: { outline: "#232a30", ramp: ["#4a555e", "#6f7b85", "#98a4ad", "#d2dade"] },
  earthenware: { outline: "#30211a", ramp: ["#60412e", "#8a5f42", "#ae8059", "#d4ab82"] },
  stone: { outline: "#2a2825", ramp: ["#55514a", "#767065", "#9a9184", "#c6bfae"] },
  wood: { outline: "#2a1d12", ramp: ["#503421", "#6f4a2d", "#91663f", "#b98f5e"] },
  glass: { outline: "#1b2c36", ramp: ["#2f5566", "#3f7b8f", "#63a8b8", "#b7e2e8"] }
};

export const TIER_COLOR = ["#8d8577", "#5fa3c7", "#9b7ad1", "#e0a92e", "#e4553a"] as const;
export const TIER_GLOW = ["#00000000", "#5fa3c744", "#9b7ad155", "#e0a92e66", "#e4553a77"] as const;

// ════════════════════════════════════════════════════════════════════════
// 거점 악센트 12색 (v0.4 — notes/decisions.md G69)
//
// 아이콘만 보고 거점이 읽혀야 한다는 요구를 색으로 받는 채널이다. `RAMPS`(재질)와
// 겹치지 않게 **별도 축**으로 둔다 — palette는 "무엇으로 만들었나"(청자·금·은…)를
// 뜻하므로 거점 신호로 덮어쓰면 재질 정보가 사라진다.
//
// 12색은 냉/온 두 계열로 6색씩 갈라 색상환에서 최대한 떼어 놨고, 인접 색상끼리는
// 테두리 양식(SITE_RIM_STYLE)이 다르게 배정돼 있다 — 색 하나에만 의존하지 않는다.
// `rim`은 외곽선 바로 안쪽 1px 링, `motif`는 표면 문양(render/motifs.ts)에 쓴다.
// ════════════════════════════════════════════════════════════════════════
export const SITE_ACCENT: Record<SiteId, { rim: string; motif: string; name: string }> = {
  korea:  { rim: "#2d7a61", motif: "#7fd3b2", name: "청자 녹" },
  turkey: { rim: "#14807f", motif: "#5fd4d8", name: "터키석" },
  iraq:   { rim: "#1a68a6", motif: "#6ebeee", name: "라피스 청" },
  greece: { rim: "#5f74c4", motif: "#b4c4f0", name: "백람" },
  japan:  { rim: "#4a3f9a", motif: "#9d92e6", name: "감청" },
  rome:   { rim: "#8f3080", motif: "#dd85c9", name: "자주(purpura)" },
  israel: { rim: "#6a8a1c", motif: "#c3da68", name: "올리브" },
  egypt:  { rim: "#93820f", motif: "#e8dc63", name: "황금 황토" },
  india:  { rim: "#bd7411", motif: "#f6bd5c", name: "사프란" },
  peru:   { rim: "#7d4a22", motif: "#c99a68", name: "구리 갈색" },
  china:  { rim: "#a22a22", motif: "#ef8172", name: "주홍" },
  mexico: { rim: "#a82b4e", motif: "#f0819c", name: "연지" }
};

/**
 * 테두리 양식 — 거점 신호의 두 번째 채널. 색상환에서 가까운 거점끼리는 반드시
 * 다른 양식을 갖도록 배정했다(예: 주홍 china는 dotted, 연지 mexico는 dashed).
 * 색약·저채도 화면에서도 거점이 갈리게 하는 장치이기도 하다.
 */
export type RimStyle = "solid" | "dashed" | "dotted";
export const SITE_RIM_STYLE: Record<SiteId, RimStyle> = {
  peru: "solid", iraq: "solid", rome: "solid", egypt: "solid",
  japan: "dashed", turkey: "dashed", mexico: "dashed", india: "dashed",
  china: "dotted", greece: "dotted", korea: "dotted", israel: "dotted"
};
