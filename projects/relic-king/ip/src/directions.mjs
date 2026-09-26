// 발산 4안의 썸네일 — 방향마다 "그림 한 장" 수준까지 민 것. 블라인드 리뷰용이라
// 고유명사(제목·실존 기관명)는 가렸다(○○).
import { P, INK } from "./palette.mjs";
import { page, strata, grind, machine, card, LINE } from "./svg.mjs";

const W = 600, H = 800;

function pot(x, y, s = 1, fill = P.soil[0]) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
   <path d="M-18 -60 h36 v10 q34 16 34 56 q0 44 -52 50 q-52 -6 -52 -50 q0 -40 34 -56 z" fill="${fill}" stroke="${INK}" stroke-width="${LINE}"/>
   <path d="M-40 0 q40 12 80 0" stroke="${INK}" stroke-width="2" fill="none"/>
   <path d="M-44 18 q44 12 88 0" stroke="${INK}" stroke-width="2" fill="none"/></g>`;
}
function person(x, y, s = 1, suit = P.orange[1]) {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="${LINE}">
   <circle cx="0" cy="-70" r="14" fill="${P.paper}"/>
   <rect x="-16" y="-56" width="32" height="40" rx="6" fill="${suit}"/>
   <rect x="-14" y="-16" width="11" height="34" fill="${P.navy[2]}"/><rect x="3" y="-16" width="11" height="34" fill="${P.navy[2]}"/></g>`;
}

export function directionPages(fontCss) {
  const pages = [];
  // A — v0.7.2 그대로: 도감의 빈칸 + 제보 배너 + 산 사람 한 줄
  {
    let cells = "";
    const cols = 6, rows = 7, cw = 78, ch = 78, x0 = 66, y0 = 170;
    const fills = [P.celadon[1], P.gold[1], P.soil[1], P.silver[1], P.wood[1], P.rock[0]];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const blank = (r === 3 && c === 2);
      const x = x0 + c * (cw + 3), y = y0 + r * (ch + 3);
      cells += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${blank ? "#5a5f66" : P.sky2}" stroke="${blank ? P.signal : INK}" stroke-width="${blank ? 4 : 2}"/>`;
      if (!blank) cells += `<path d="M${x + 24} ${y + 20} h30 v8 q10 8 10 22 q0 16 -25 18 q-25 -2 -25 -18 q0 -14 10 -22z" fill="${fills[(r * 7 + c) % 6]}" stroke="${INK}" stroke-width="2"/>`;
      else cells += `<text x="${x + cw / 2}" y="${y + 50}" text-anchor="middle" font-family="RK Dot" font-size="28" fill="#9aa0a8">?</text>`;
    }
    const body = `<rect width="${W}" height="${H}" fill="${P.sky}"/>
      <rect x="0" y="40" width="${W}" height="80" fill="${P.signal}"/>
      <text x="30" y="75" font-family="RK Dot" font-weight="700" font-size="22" fill="${P.paper}">제보 · 유일 · 여섯 팀이 같이 듣는다</text>
      <text x="30" y="104" font-family="RK Dot" font-size="18" fill="${P.paper}">남은 시간 00:42 · 승산 50%</text>
      ${cells}
      ${card(60, 740 - 30, 480, 64, [{ t: "화성 3구역, 4세대. 할머니가 ○○ 사람이었다고 한다." }], { fs: 16 })}`;
    pages.push({ name: "dir-a", w: W, h: H, html: page(W, H, fontCss, body, P.sky) });
  }
  // B — 봉인한 사람들: 단면도, 갈린 선 아래의 상자와 카드
  {
    const gy = 300;
    const body = `<rect width="${W}" height="${H}" fill="${P.paper}"/>
      <rect x="0" y="0" width="${W}" height="120" fill="${P.sky}"/>
      ${grind(0, 120, W, gy - 120, 1)}
      ${machine(330, 40, 0.55, 0)}
      ${strata(0, W, [gy, 390, 470, 560, 660, H], [P.soil[1], P.soil[3], P.soil[0], P.rock[1], P.soil[4]], ["h-soil", "h-soil2", "h-soil", "h-rock", "h-soil2"])}
      <line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="${INK}" stroke-width="4"/>
      <!-- 트렌치 -->
      <path d="M180 120 L180 610 L420 610 L420 120" fill="${P.shadow}" fill-opacity=".92"/>
      <line x1="300" y1="0" x2="300" y2="470" stroke="${P.orange[1]}" stroke-width="4"/>
      <!-- 상자 -->
      <g stroke="${INK}" stroke-width="${LINE}"><rect x="220" y="520" width="160" height="90" fill="${P.wood[1]}"/>
        <line x1="220" y1="550" x2="380" y2="550"/><path d="M220 520 L240 480 L400 480 L380 520" fill="${P.wood[0]}"/></g>
      ${person(300, 505, 0.9)}
      <path d="M312 440 L420 540 L200 540 Z" fill="#fff3c4" fill-opacity=".18"/>
      ${card(330, 600, 250, 118, ["마지막 확인", "○○박물관, 2094년 3월", "확인자 ________"], { fs: 17, rot: -4, hole: true })}
      <text x="20" y="${gy - 10}" font-family="RK Dot" font-size="14" fill="${INK}" fill-opacity=".7">갈린 선 · 이 위는 기계가 지나갔다</text>`;
    pages.push({ name: "dir-b", w: W, h: H, html: page(W, H, fontCss, body) });
  }
  // C — 갈이선: 전선이 도시를 지나기 전에
  {
    let city = "";
    for (let i = 0; i < 9; i++) {
      const x = 330 + i * 30, hh = 80 + ((i * 37) % 120);
      city += `<rect x="${x}" y="${470 - hh}" width="26" height="${hh}" fill="${P.soil[i % 4]}" stroke="${INK}" stroke-width="2"/>`;
    }
    const body = `<rect width="${W}" height="${H}" fill="#8f98a0"/>
      <rect x="0" y="0" width="${W}" height="470" fill="${P.sky2}"/>
      ${grind(0, 470, 320, 330, 1)}
      ${machine(-60, 330, 0.8, 0)}
      <rect x="320" y="470" width="280" height="330" fill="${P.soil[2]}"/><rect x="320" y="470" width="280" height="330" fill="url(#h-soil)"/>
      ${city}
      <line x1="320" y1="300" x2="320" y2="800" stroke="${INK}" stroke-width="4" stroke-dasharray="10 8"/>
      ${person(370, 640, 0.9)}${person(430, 650, 0.9, P.navy[1])}
      <rect x="380" y="590" width="60" height="36" fill="${P.wood[1]}" stroke="${INK}" stroke-width="3"/>
      <line x1="540" y1="700" x2="540" y2="560" stroke="${INK}" stroke-width="3"/><circle cx="540" cy="552" r="12" fill="${P.signal}" stroke="${INK}" stroke-width="3"/>`;
    pages.push({ name: "dir-c", w: W, h: H, html: page(W, H, fontCss, body) });
  }
  // D — 지구 출토: 콜로니의 감정 책상
  {
    const body = `<rect width="${W}" height="${H}" fill="${P.navy[3]}"/>
      <path d="M170 60 h260 v220 a130 130 0 0 1 -260 0z" fill="#b98a6a"/>
      <path d="M170 280 q130 -40 260 0" fill="#9c6e52"/>
      <path d="M170 60 h260 v220 a130 130 0 0 1 -260 0z" fill="none" stroke="${INK}" stroke-width="6"/>
      <rect x="0" y="470" width="${W}" height="330" fill="${P.wood[2]}" stroke="${INK}" stroke-width="3"/>
      <path d="M220 330 L380 330 L470 520 L130 520Z" fill="#fff3c4" fill-opacity=".14"/>
      <path d="M280 300 h40 l20 30 h-80z" fill="${P.gold[2]}" stroke="${INK}" stroke-width="3"/>
      ${pot(300, 470, 1.1, P.celadon[1])}
      ${card(70, 580, 300, 120, [{ t: "지구 출토", c: INK }, "○○박물관 등재 기록과 일치", "감정 ______"], { fs: 20, rot: 3 })}
      <circle cx="320" cy="660" r="34" fill="none" stroke="${P.vermilion}" stroke-width="5"/>
      <text x="320" y="668" text-anchor="middle" font-family="RK Serif" font-weight="900" font-size="22" fill="${P.vermilion}">진</text>
      <rect x="420" y="560" width="140" height="190" fill="${P.paper}" stroke="${INK}" stroke-width="3"/>
      ${Array.from({ length: 8 }, (_, i) => `<line x1="435" y1="${585 + i * 20}" x2="545" y2="${585 + i * 20}" stroke="${INK}" stroke-opacity=".4"/>`).join("")}`;
    pages.push({ name: "dir-d", w: W, h: H, html: page(W, H, fontCss, body, P.navy[3]) });
  }
  return pages.map((p) => ({ ...p, out: `art/directions/${p.name}.png` }));
}
