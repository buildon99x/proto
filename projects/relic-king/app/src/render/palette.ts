import type { PaletteId } from "../game/types";

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
