// 큰 그림 공용 SVG 조각. 규칙 하나가 전부를 정한다:
//   **사람이 만든 것에는 선이 있다. 기계가 갈아 낸 것에는 선이 없다.**
// 고고학 유물 실측도의 잉크 윤곽선이 "기록된 것"의 표시이고, 갈린 땅·기계는
// 윤곽선 없이 평평한 회색으로만 칠한다(지워진 것처럼).
import { P, INK } from "./palette.mjs";

export const LINE = 3;            // 큰 그림 기본 윤곽선
export const hatchDefs = () => `
<defs>
  <pattern id="h-soil" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
    <line x1="0" y1="0" x2="0" y2="10" stroke="${INK}" stroke-opacity=".18" stroke-width="1.4"/></pattern>
  <pattern id="h-soil2" width="7" height="7" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1" fill="${INK}" fill-opacity=".22"/><circle cx="5.5" cy="5" r=".7" fill="${INK}" fill-opacity=".16"/></pattern>
  <pattern id="h-rock" width="22" height="14" patternUnits="userSpaceOnUse">
    <path d="M0 7h22M11 0v7M0 0v0M5 7v7M16 7v7" stroke="${INK}" stroke-opacity=".22" stroke-width="1.2" fill="none"/></pattern>
  <pattern id="h-grind" width="40" height="6" patternUnits="userSpaceOnUse">
    <line x1="0" y1="3" x2="40" y2="3" stroke="#ffffff" stroke-opacity=".35" stroke-width="1"/></pattern>
  <pattern id="h-ash" width="6" height="6" patternUnits="userSpaceOnUse">
    <circle cx="3" cy="3" r=".8" fill="${INK}" fill-opacity=".25"/></pattern>
</defs>`;

/** 층서 띠. 사람이 만든 층(선 있음). ys: 경계 y 배열 */
export function strata(x, w, ys, fills, pats) {
  let s = "";
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[i], y1 = ys[i + 1];
    const wob = (y, k) => {
      const n = 8; let d = `M${x} ${y}`;
      for (let j = 1; j <= n; j++) d += ` L${x + (w * j) / n} ${y + Math.sin(j * 1.7 + k) * 3}`;
      return d;
    };
    s += `<path d="${wob(y0, i)} L${x + w} ${y1} L${x} ${y1} Z" fill="${fills[i % fills.length]}"/>`;
    if (pats[i % pats.length]) s += `<path d="${wob(y0, i)} L${x + w} ${y1} L${x} ${y1} Z" fill="url(#${pats[i % pats.length]})"/>`;
    s += `<path d="${wob(y0, i)}" stroke="${INK}" stroke-width="2" fill="none" stroke-opacity=".8"/>`;
  }
  return s;
}
/** 갈린 땅 — 윤곽선 없음, 결만 있다 */
export function grind(x, y, w, h, tone = 1) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${P.grind[tone]}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#h-grind)"/>`;
}
/** 기계 — 선 없는 덩어리. 톱니 무늬만 */
export function machine(x, y, s = 1, tone = 0) {
  const c = P.grind[tone], d = P.grind[Math.min(2, tone + 1)];
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="0" y="0" width="320" height="120" rx="60" fill="${c}"/>
    <rect x="40" y="-60" width="180" height="80" rx="30" fill="${c}"/>
    <rect x="-40" y="70" width="400" height="70" rx="35" fill="${d}"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${-20 + i * 33}" y="92" width="16" height="26" rx="4" fill="${c}"/>`).join("")}
  </g>`;
}
/** 기록 카드(라벨) — 선이 있다 */
export function card(x, y, w, h, lines, opts = {}) {
  const fs = opts.fs || 15;
  const rot = opts.rot || 0;
  const t = lines.map((l, i) =>
    `<text x="${12}" y="${24 + i * (fs + 7)}" font-family="RK Dot" font-size="${fs}" fill="${l.c || INK}">${l.t ?? l}</text>`).join("");
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="3" y="4" width="${w}" height="${h}" fill="${INK}" fill-opacity=".25"/>
    <rect width="${w}" height="${h}" fill="${opts.fill || P.paper}" stroke="${INK}" stroke-width="2"/>
    ${opts.hole ? `<circle cx="${w - 14}" cy="14" r="5" fill="none" stroke="${INK}" stroke-width="2"/>` : ""}
    ${t}</g>`;
}
export const page = (w, h, fontCss, body, bg = P.paper) => `<!doctype html><html><head><meta charset="utf-8">
<style>${fontCss}
html,body{margin:0;padding:0;background:${bg};width:${w}px;height:${h}px;overflow:hidden}
svg{display:block}</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${hatchDefs()}${body}</svg>
</body></html>`;
