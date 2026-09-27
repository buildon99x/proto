// 키 비주얼 · 타이틀 로고 · 장소 컨셉.
// 형식은 **발굴 단면도 한 장**이다: 위는 기계가 갈아 낸 땅(선 없음), 곧은 선 하나,
// 아래는 살아 있는 층서(선 있음). 제목은 도면 표제란에 들어간다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { P, INK } from "./palette.mjs";
import { hatchDefs, grind, machine, strata } from "./svg.mjs";
import { crewSvg } from "./crew-vector.mjs";
import { IP } from "./lib.mjs";

const find = (id) => "data:image/png;base64," + readFileSync(path.join(IP, "art/finds", id + ".png")).toString("base64");

/** 타이틀 워드마크. 갈린 선이 글자를 가른다 — 위는 선 없는 회색 띠 속, 아래는 잉크.
 *  취소선으로 읽히지 않게 선은 글자 위가 아니라 **띠의 아래 가장자리**로만 그린다. */
export function wordmark(x, y, size, opts = {}) {
  const cut = opts.cut ?? 0.42;
  const id = "wm" + Math.round(x + y + size);
  const top = y - size * 0.86, h = size * 1.02, cy = top + h * cut;
  const bandX = opts.bandX ?? x - 40, bandW = opts.bandW ?? size * 4.9;
  const txt = (fill) => `<text x="${x}" y="${y}" font-family="RK Serif" font-weight="900" font-size="${size}" letter-spacing="${size * 0.02}" fill="${fill}">지구 출토</text>`;
  return `<defs>
      <clipPath id="${id}t"><rect x="${bandX}" y="${top - 60}" width="${bandW}" height="${cy - top + 60}"/></clipPath>
      <clipPath id="${id}b"><rect x="${bandX}" y="${cy}" width="${bandW}" height="${h + 60}"/></clipPath></defs>
    <rect x="${bandX}" y="${opts.bandTop ?? top - size * 0.22}" width="${bandW}" height="${cy - (opts.bandTop ?? top - size * 0.22)}" fill="${opts.band ?? P.grind[0]}"/>
    <rect x="${bandX}" y="${opts.bandTop ?? top - size * 0.22}" width="${bandW}" height="${cy - (opts.bandTop ?? top - size * 0.22)}" fill="url(#h-grind)"/>
    <g clip-path="url(#${id}t)">${txt(opts.gray ?? "#8f8b82")}</g>
    <g clip-path="url(#${id}b)">${txt(opts.ink ?? INK)}</g>
    <line x1="${bandX}" y1="${cy}" x2="${bandX + bandW}" y2="${cy}" stroke="${opts.ink ?? INK}" stroke-width="${Math.max(2, size / 40)}"/>`;
}

function lander(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="4" stroke-linejoin="round">
    <path d="M20 118 L0 150 M200 118 L220 150 M60 120 L50 150 M160 120 L170 150" stroke-width="6"/>
    <rect x="-8" y="146" width="24" height="8" fill="${P.silver[3]}"/><rect x="204" y="146" width="24" height="8" fill="${P.silver[3]}"/>
    <rect x="10" y="20" width="200" height="100" rx="6" fill="${P.wood[1]}"/>
    <path d="M10 50 H210 M10 88 H210 M76 20 V120 M144 20 V120" stroke-width="3"/>
    <rect x="30" y="0" width="80" height="24" rx="4" fill="${P.silver[2]}"/>
    <rect x="40" y="6" width="30" height="10" fill="${P.sky}"/>
    <text x="112" y="78" text-anchor="middle" font-family="RK Dot" font-weight="700" font-size="20" fill="${INK}" stroke="none">강하 09</text>
    <circle cx="196" cy="68" r="14" fill="${P.silver[1]}"/><circle cx="196" cy="68" r="4" fill="${INK}" stroke="none"/>
  </g>`;
}
function crate(x, y, w, h, opts = {}) {
  const open = opts.open;
  return `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
    ${open ? `<path d="M${x} ${y} L${x + 24} ${y - 46} L${x + w + 24} ${y - 46} L${x + w} ${y}Z" fill="${P.wood[0]}"/>` : ""}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${P.wood[1]}"/>
    <path d="M${x} ${y + h * 0.35} H${x + w} M${x} ${y + h * 0.7} H${x + w}" stroke-width="3"/>
    <rect x="${x - 3}" y="${y - 3}" width="14" height="14" fill="${P.silver[2]}"/><rect x="${x + w - 11}" y="${y - 3}" width="14" height="14" fill="${P.silver[2]}"/>
    ${opts.no ? `<text x="${x + w / 2}" y="${y + h * 0.58}" text-anchor="middle" font-family="RK Dot" font-weight="700" font-size="${opts.fs || 16}" fill="${INK}" fill-opacity=".8" stroke="none">${opts.no}</text>` : ""}
  </g>`;
}
function ctx(x, y, n) {
  return `<g><circle cx="${x}" cy="${y}" r="17" fill="${P.paper}" stroke="${INK}" stroke-width="2.5"/>
    <text x="${x}" y="${y + 5}" text-anchor="middle" font-family="RK Dot" font-size="13" fill="${INK}">${n}</text></g>`;
}
function munsell(x, y, t) {
  return `<g><line x1="${x}" y1="${y}" x2="${x + 34}" y2="${y}" stroke="${INK}" stroke-width="1.5"/>
    <text x="${x + 40}" y="${y + 5}" font-family="RK Dot" font-size="13" fill="${P.paper}">${t}</text></g>`;
}
/** 기록 카드 — 이 IP의 시그니처 */
export function recordCard(x, y, rot, a) {
  const w = 470, h = 262;
  const row = (yy, k, v, strong) => `<text x="150" y="${yy}" font-family="RK Dot" font-size="14" fill="${INK}" fill-opacity=".65">${k}</text>
     <text x="236" y="${yy}" font-family="${strong ? "RK Serif" : "RK Dot"}" font-weight="${strong ? 700 : 400}" font-size="${strong ? 17 : 16}" fill="${INK}">${v}</text>`;
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="6" y="8" width="${w}" height="${h}" fill="${INK}" fill-opacity=".3"/>
    <rect width="${w}" height="${h}" fill="${P.paper}" stroke="${INK}" stroke-width="3"/>
    <circle cx="${w - 24}" cy="24" r="8" fill="none" stroke="${INK}" stroke-width="3"/>
    <path d="M${w - 24} 16 C ${w + 10} -30, ${w + 60} -10, ${w + 90} -60" fill="none" stroke="${P.wood[0]}" stroke-width="3"/>
    <rect x="22" y="22" width="112" height="112" fill="${P.sky}" stroke="${INK}" stroke-width="2"/>
    <image href="${a.img}" x="30" y="30" width="96" height="96" style="image-rendering:pixelated"/>
    <text x="150" y="44" font-family="RK Serif" font-weight="900" font-size="24" fill="${INK}">${a.name}</text>
    ${row(76, "소장처", a.holder)}${row(102, "마지막 확인", a.last, true)}${row(128, "상태", a.cond)}
    <line x1="22" y1="156" x2="${w - 22}" y2="156" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/>
    <text x="22" y="192" font-family="RK Dot" font-size="15" fill="${INK}" fill-opacity=".65">다음 확인</text>
    <line x1="110" y1="196" x2="${w - 26}" y2="196" stroke="${INK}" stroke-width="2"/>
    <text x="22" y="232" font-family="RK Dot" font-size="15" fill="${INK}" fill-opacity=".65">확인자</text>
    <line x1="110" y1="236" x2="${w - 26}" y2="236" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

export function pages(fontCss) {
  const out = [];
  const wrap = (W, H, body, bg = P.paper) => `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
    html,body{margin:0;background:${bg}}svg{display:block}</style></head><body>
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${hatchDefs()}${body}</svg></body></html>`;

  // ── 키 비주얼 1200×1700 (masked = 블라인드 리뷰용: 제목·기관명을 가린다) ──
  for (const masked of [false, true]) {
    const W = 1200, H = 1700, M = 28;
    const SURF = 300, LINE_Y = 660, BOT = 1440;
    const layers = [LINE_Y, 790, 900, 1040, 1210, 1330, BOT];
    const fills = [P.soil[1], P.soil[4], P.soil[0], P.soil[3], P.rock[1], P.soil[5]];
    const pats = ["h-soil", "h-soil2", "h-soil", "h-soil2", "h-rock", "h-soil"];
    const TL = 400, TR = 860, BL = 520, BR = 760, TB = 1200;
    const body = `
      <rect width="${W}" height="${H}" fill="${P.paper}"/>
      <clipPath id="sec"><rect x="${M}" y="${M}" width="${W - 2 * M}" height="${BOT - M}"/></clipPath>
      <g clip-path="url(#sec)">
        <rect x="0" y="0" width="${W}" height="${SURF}" fill="${P.sky}"/>
        <rect x="0" y="${SURF - 70}" width="${W}" height="70" fill="${P.sky2}"/>
        ${machine(600, 241, 0.42, 0)}<rect x="560" y="${SURF - 3}" width="240" height="3" fill="${P.grind[0]}"/>
        ${grind(0, SURF, W, LINE_Y - SURF, 1)}
        ${Array.from({ length: 7 }, (_, i) => `<path d="M${-100 + i * 220} ${SURF + 40 + (i % 3) * 90} q110 -30 220 0" fill="none" stroke="${P.grind[0]}" stroke-width="10" stroke-opacity=".7"/>`).join("")}
        ${strata(0, W, layers, fills, pats)}
        <!-- 트렌치(파낸 빈 공간) -->
        <path d="M${TL} ${SURF} L${TL} ${LINE_Y} L${BL} ${LINE_Y} L${BL} ${TB} L${BR} ${TB} L${BR} ${LINE_Y} L${TR} ${LINE_Y} L${TR} ${SURF} Z" fill="${P.shadow}"/>
        <path d="M${TL} ${SURF} L${TL} ${LINE_Y} L${BL} ${LINE_Y} L${BL} ${TB} L${BR} ${TB} L${BR} ${LINE_Y} L${TR} ${LINE_Y} L${TR} ${SURF}" fill="none" stroke="${INK}" stroke-width="4"/>
        <line x1="0" y1="${LINE_Y}" x2="${TL}" y2="${LINE_Y}" stroke="${INK}" stroke-width="6"/>
        <line x1="${TR}" y1="${LINE_Y}" x2="${W}" y2="${LINE_Y}" stroke="${INK}" stroke-width="6"/>
        <!-- 불빛 -->
        <path d="M${BL + 70} ${LINE_Y + 250} L${BR + 10} ${TB} L${BL - 10} ${TB} Z" fill="#fff3c4" fill-opacity=".13"/>
        <!-- 더 깊은 상자, 못 찾은 상자 -->
        ${crate(110, 1250, 150, 70, { no: "C-1330", fs: 15 })}
        <g><rect x="930" y="940" width="150" height="72" fill="none" stroke="${P.paper}" stroke-width="3" stroke-dasharray="10 8"/>
          <text x="1005" y="986" text-anchor="middle" font-family="RK Dot" font-weight="700" font-size="26" fill="${P.paper}" fill-opacity=".8">?</text></g>
        ${crate(BL + 96, TB - 86, 130, 86, { open: true })}
        <rect x="${BL + 110}" y="${TB - 96}" width="100" height="12" fill="${P.gold[0]}" stroke="${INK}" stroke-width="3"/>
        <!-- 지표: 강하선, 줄, 크루 -->
        ${lander(60, SURF - 156, 1)}
        <path d="M256 ${SURF - 88} C 330 ${SURF - 110}, 440 ${SURF - 60}, 508 ${SURF}" fill="none" stroke="${P.orange[1]}" stroke-width="6"/>
        ${crewSvg("yeoe7", 280, SURF - 168, 0.7)}
        ${crewSvg("haedal-hd8", TR + 70, SURF - 180, 0.75)}
        <!-- 서가온: 줄에 걸려 턱에 서 있다 -->
        <g clip-path="url(#below)"></g>
        <clipPath id="trench"><rect x="${TL}" y="${SURF}" width="${TR - TL}" height="${TB - SURF}"/></clipPath>
        <g clip-path="url(#trench)">${crewSvg("seo-gaon", TL + 4, LINE_Y - 200, 0.83)}</g>
        
        <!-- 정도경: 오른쪽 턱에서 상자를 내려다본다(지표에서 기다리지 않는다) -->
        ${crewSvg("jeong-dokyeong", BR + 4, LINE_Y - 146, 0.61)}
        <!-- 미라: 상자 곁 -->
        ${crewSvg("mira-anyango", BL + 8, TB - 206, 0.86)}
        <!-- 표기 -->
        <g font-family="RK Dot" fill="${INK}">
          <line x1="60" y1="${LINE_Y - 40}" x2="60" y2="${LINE_Y}" stroke="${INK}" stroke-width="2"/>
          <text x="70" y="${LINE_Y - 22}" font-size="17">갈린 선 · 계약 깊이 4.2 m</text>
          <text x="70" y="${LINE_Y - 44}" font-size="14" fill-opacity=".6">위 — 기계가 지나간 자리</text>
        </g>
        ${ctx(1130, 725, "101")}${ctx(1130, 845, "102")}${ctx(1130, 970, "103")}${ctx(1130, 1125, "104")}${ctx(1130, 1270, "105")}${ctx(1130, 1385, "106")}
        ${munsell(60, 845, "10YR 3/2")}${munsell(60, 970, "7.5YR 5/6")}${munsell(270, 1125, "10YR 4/3")}
        <text x="${BL + 20}" y="${LINE_Y + 40}" font-family="RK Dot" font-size="14" fill="${P.paper}" fill-opacity=".7">T-09 · ${masked ? "○○" : "경주"} 거점</text>
      </g>
      <rect x="${M}" y="${M}" width="${W - 2 * M}" height="${BOT - M}" fill="none" stroke="${INK}" stroke-width="4"/>
      ${recordCard(700, 1180, -3, { img: find("silla-gold-crown"), name: masked ? "○○ ○○" : "신라 금관", holder: masked ? "○○○○박물관" : "국립경주박물관", last: "2094년 3월", cond: "양호 · 습도 45" })}
      <!-- 표제란 -->
      <rect x="${M}" y="${BOT + 18}" width="${W - 2 * M}" height="${H - BOT - 18 - M}" fill="none" stroke="${INK}" stroke-width="4"/>
      <line x1="${W - 330}" y1="${BOT + 18}" x2="${W - 330}" y2="${H - M}" stroke="${INK}" stroke-width="2"/>
      ${masked ? `<rect x="${M + 2}" y="${BOT + 20}" width="${W - 330 - M - 3}" height="${H - BOT - 22 - M}" fill="${P.grind[2]}"/><text x="80" y="${BOT + 130}" font-family="RK Dot" font-size="28" fill="${P.paper}">[제목 가림]</text>` : `${wordmark(64, BOT + 146, 118, { bandX: M + 2, bandW: W - 330 - M - 3, bandTop: BOT + 20 })}
      <text x="68" y="${BOT + 194}" font-family="RK Dot" font-weight="700" font-size="20" letter-spacing="4" fill="${INK}">FINDSPOT: EARTH</text>
      <text x="68" y="${BOT + 222}" font-family="RK Sans" font-size="17" fill="${INK}">257년 비어 있던 카드의 다음 줄에, 누구의 이름을 쓸 것인가.</text>`}
      <g font-family="RK Dot" font-size="15" fill="${INK}">
        ${[["도면", "단면 A–A′"], ["거점", masked ? "○○" : "경주"], ["축척", "1 : 20"], ["기록", "2351. 05."], ["확인자", "________"]].map(([k, v], i) =>
          `<text x="${W - 306}" y="${BOT + 58 + i * 34}" fill-opacity=".6">${k}</text><text x="${W - 216}" y="${BOT + 58 + i * 34}">${v}</text>`).join("")}
      </g>`;
    out.push(masked
      ? { name: "review-keyvisual-masked", out: "art/review/keyvisual-masked.png", w: W, h: H, html: wrap(W, H, body) }
      : { name: "keyvisual", out: "art/keyvisual/keyvisual.png", w: W, h: H, html: wrap(W, H, body) });
  }

  // ── 타이틀 로고 ────────────────────────────────────────────────────────
  {
    const W = 1400, H = 520;
    const body = `<rect width="${W}" height="${H}" fill="${P.paper}"/>
      ${wordmark(90, 290, 220)}
      <text x="96" y="370" font-family="RK Dot" font-weight="700" font-size="34" letter-spacing="10" fill="${INK}">FINDSPOT: EARTH</text>
      <text x="96" y="420" font-family="RK Dot" font-size="20" fill="${INK}" fill-opacity=".65">갈린 선 위는 선 없는 회색, 아래는 잉크 — 글자도 땅과 같은 규칙을 따른다</text>`;
    out.push({ name: "logo", out: "art/logo/logo.png", w: W, h: H, html: wrap(W, H, body) });
    const bodyD = `<rect width="${W}" height="${H}" fill="${P.sky}"/>
      ${wordmark(90, 290, 220, { ink: P.paper, gray: "#7d8791", band: "#3a4756" })}
      <text x="96" y="370" font-family="RK Dot" font-weight="700" font-size="34" letter-spacing="10" fill="${P.paper}">FINDSPOT: EARTH</text>`;
    out.push({ name: "logo-dark", out: "art/logo/logo-dark.png", w: W, h: H, html: wrap(W, H, bodyD, P.sky) });
  }
  return out;
}
