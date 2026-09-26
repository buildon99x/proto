// IP 팔레트 — 게임 고정 40색(app/src/render/palette.ts)에서 출발해 넷만 더했다.
// 더한 넷: 갈린 땅 회색 3단(기계가 지나간 자리)과 안전 주황 1단(서가온).
// 네온·보라-청록 그라데이션은 쓰지 않는다(지시서 §4-4).
export const INK = "#12100e";
export const P = {
  // 게임 팔레트에서 그대로
  ink: INK, shadow: "#241f1a", paper: "#efe6d2", sky: "#2b3a4a", sky2: "#3d5165",
  soil: ["#87663f", "#7a5a3c", "#6b4f35", "#5d4430", "#4f3a29", "#453222"],
  rock: ["#807a71", "#6f6a63", "#5a554f"],
  gold: ["#f0cd55", "#c9942a", "#8a6218", "#4a3410"],
  signal: "#e4553a",             // TIER_COLOR[4] — 유일, 그리고 제보 신호
  celadon: ["#a8d4c4", "#6aa89c", "#478079", "#2f5a53"],
  silver: ["#d2dade", "#98a4ad", "#6f7b85", "#4a555e"],
  navy: ["#6f84a8", "#4d6084", "#33405a", "#232c3e"],
  wood: ["#b98f5e", "#91663f", "#6f4a2d", "#503421"],
  vermilion: "#a22a22",          // SITE_ACCENT.china.rim — 미라의 인주
  // IP에서 더한 넷
  grind: ["#e3e0d8", "#cfcbc2", "#a9a59b"], // 갈린 땅: 윤곽선 없이 칠만 한다
  orange: ["#f09a4a", "#d9692b", "#9c4318"], // 안전 주황(서가온)
  paperShade: "#cbbd9c"
};
