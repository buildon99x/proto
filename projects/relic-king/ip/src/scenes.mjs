// 장소 컨셉 셋. 선의 굵기가 출처를 말한다(visual-guide.md §2):
//   지구에서 만든 것 — 굵고 흔들리는 잉크(4)
//   콜로니에서 인쇄한 것 — 가늘고 곧은 선(1.5)
//   기계가 갈아 낸 것 — 선 없음
import { P, INK } from "./palette.mjs";
import { hatchDefs, grind, machine } from "./svg.mjs";
import { crewSvg } from "./crew-vector.mjs";

const wrap = (fontCss, W, H, body, bg = P.paper) => `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
  html,body{margin:0;background:${bg}}svg{display:block}</style></head><body>
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${hatchDefs()}${body}</svg></body></html>`;

function caption(W, H, no, title, sub, dark = false) {
  const c = dark ? P.paper : INK;
  return `<g><rect x="${W - 470}" y="${H - 118}" width="440" height="88" fill="${dark ? P.navy[3] : P.paper}" stroke="${c}" stroke-width="3"/>
    <text x="${W - 450}" y="${H - 84}" font-family="RK Dot" font-size="15" fill="${c}" fill-opacity=".7">장소 ${no}</text>
    <text x="${W - 450}" y="${H - 50}" font-family="RK Serif" font-weight="900" font-size="28" fill="${c}">${title}</text>
    <text x="${W - 50}" y="${H - 84}" text-anchor="end" font-family="RK Dot" font-size="15" fill="${c}" fill-opacity=".7">${sub}</text></g>`;
}
function callout(x1, y1, x2, y2, text, dark = false, anchor = "start") {
  const c = dark ? P.paper : INK;
  return `<g><circle cx="${x1}" cy="${y1}" r="4" fill="${c}"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="2"/>
    <text x="${x2 + (anchor === "end" ? -8 : 8)}" y="${y2 + 5}" text-anchor="${anchor}" font-family="RK Dot" font-size="17" fill="${c}"
      stroke="${dark ? P.navy[3] : P.paper}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${text}</text></g>`;
}
/** 흔들리는 잉크 윤곽(지구에서 만든 것) */
function wobble(pts, close = true, amp = 2.2, seed = 1) {
  let d = "";
  pts.forEach(([x, y], i) => {
    const j = Math.sin(i * 2.3 + seed) * amp, k = Math.cos(i * 1.7 + seed) * amp;
    d += (i ? " L" : "M") + (x + j).toFixed(1) + " " + (y + k).toFixed(1);
  });
  return d + (close ? " Z" : "");
}

export function pages(fontCss) {
  const out = [];

  // ── 장소 01 · 경주 봉인지 ──────────────────────────────────────────────
  {
    const W = 1600, H = 900, HOR = 290;
    const mounds = [[620, 440, 150, 92], [1320, 470, 170, 100], [230, 540, 190, 120], [930, 600, 250, 150], [470, 770, 120, 70]];
    const body = `
      <rect width="${W}" height="${HOR}" fill="${P.sky}"/>
      <rect y="${HOR - 60}" width="${W}" height="60" fill="${P.sky2}"/>
      <path d="M0 ${HOR} L0 ${HOR - 70} Q180 ${HOR - 140} 380 ${HOR - 90} Q520 ${HOR - 60} 700 ${HOR - 120} Q900 ${HOR - 170} 1100 ${HOR - 90} Q1350 ${HOR - 40} 1600 ${HOR - 100} L1600 ${HOR}Z" fill="#46596d"/>
      ${grind(0, HOR, W, H - HOR, 1)}
      ${Array.from({ length: 12 }, (_, i) => `<rect x="0" y="${HOR + 18 + i * i * 4}" width="${W}" height="${2 + i * 0.4}" fill="${P.grind[0]}"/>`).join("")}
      ${machine(1210, 200, 0.5, 0)}
      ${Array.from({ length: 6 }, (_, i) => `<path d="M${1380 - i * 8} ${HOR + 2} L${1600} ${HOR + 60 + i * 30}" stroke="${P.grind[0]}" stroke-width="6"/>`).join("")}
      ${mounds.map(([x, y, rx, ry], i) => `
        <ellipse cx="${x}" cy="${y + ry * 0.2}" rx="${rx * 1.32}" ry="${ry * 0.62}" fill="${P.soil[0]}"/>
        <ellipse cx="${x}" cy="${y + ry * 0.2}" rx="${rx * 1.32}" ry="${ry * 0.62}" fill="url(#h-soil2)"/>
        <ellipse cx="${x}" cy="${y + ry * 0.2}" rx="${rx * 1.32}" ry="${ry * 0.62}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="12 8"/>
        <path d="${wobble(Array.from({ length: 25 }, (_, t) => { const a = Math.PI * (t / 24); return [x - Math.cos(a) * rx * 1.08, y - Math.pow(Math.sin(a), 0.75) * ry * 1.25 + ry * 0.35]; }), true, 1.4, i)}" fill="#9a8a55"/>
        <path d="${wobble(Array.from({ length: 25 }, (_, t) => { const a = Math.PI * (t / 24); return [x - Math.cos(a) * rx * 1.08, y - Math.pow(Math.sin(a), 0.75) * ry * 1.25 + ry * 0.35]; }), false, 1.4, i)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <ellipse cx="${x}" cy="${y + ry * 0.35}" rx="${rx * 1.08}" ry="${ry * 0.14}" fill="#7d6f44"/>
        <path d="M${x - rx * 0.55} ${y - ry * 0.6} q${rx * 0.4} -${ry * 0.3} ${rx * 0.8} 0" fill="none" stroke="#b8a66a" stroke-width="8" stroke-linecap="round"/>`).join("")}
      <!-- 트렌치와 강하선 -->
      <rect x="1060" y="660" width="120" height="46" fill="${P.shadow}" stroke="${INK}" stroke-width="3"/>
      <g transform="translate(1180 596) scale(.36)">
        <rect x="10" y="20" width="200" height="100" rx="6" fill="${P.wood[1]}" stroke="${INK}" stroke-width="8"/>
        <path d="M20 118 L0 150 M200 118 L220 150" stroke="${INK}" stroke-width="10"/></g>
      <path d="M1250 626 C 1230 640, 1200 650, 1150 668" fill="none" stroke="${P.orange[1]}" stroke-width="3"/>
      ${crewSvg("yeoe7", 1010, 624, 0.24)}${crewSvg("mira-anyango", 1060, 616, 0.26)}${crewSvg("seo-gaon", 1112, 612, 0.27)}
      ${crewSvg("jeong-dokyeong", 1196, 640, 0.26)}${crewSvg("haedal-hd8", 1260, 646, 0.27)}
      ${callout(660, 400, 760, 330, "봉분 — 계약 구역 밖")}
      ${callout(440, 572, 380, 700, "계약 경계는 무덤의 곡선을 따라간다", false, "end")}
      ${callout(160, 800, 70, 850, "갈린 땅 — 선이 없다", false)}
      ${callout(1100, 700, 1020, 800, "T-09 · 봉인 상자", false, "end")}
      ${callout(1290, 240, 1250, 150, "기계 — 재통과 중", true, "end")}
      ${caption(W, H, "01", "경주 거점 — 봉인지", "2351 · 계약 깊이 4.2 m")}`;
    out.push({ name: "place-gyeongju", out: "art/places/place-01-gyeongju.png", w: W, h: H, html: wrap(fontCss, W, H, body) });
  }

  // ── 장소 02 · 화성 3구역, 거실의 선반 ──────────────────────────────────
  {
    const W = 1200, H = 900;
    const thin = `stroke="${P.navy[2]}" stroke-width="1.5" fill="none"`;
    const panels = Array.from({ length: 7 }, (_, i) => `<rect x="${-40 + i * 190}" y="40" width="180" height="700" rx="14" ${thin}/>`).join("");
    const cup = (x, y) => `<g transform="translate(${x} ${y})">
      <path d="${wobble([[-70, -120], [70, -120], [66, -96], [40, -70], [22, -60], [22, -30], [60, -10], [64, 6], [-64, 6], [-60, -10], [-22, -30], [-22, -60], [-40, -70], [-66, -96]], true, 1.8, 3)}" fill="${P.soil[2]}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M-66 -104 q66 10 132 0" fill="none" stroke="${INK}" stroke-width="3"/>
      <path d="${wobble([[-52, -84], [-10, -80], [10, -90], [46, -82]], false, 1.2, 5)}" fill="none" stroke="${INK}" stroke-width="2.5"/>
      <path d="M18 -118 l-6 20 l8 10" fill="none" stroke="${INK}" stroke-width="2.5"/>
      ${[-12, 0, 12].map((d) => `<rect x="${d - 3}" y="-24" width="6" height="12" fill="${P.shadow}"/>`).join("")}</g>`;
    const cardLines = [
      ["신라 토기 고배", "RK Serif", 22, 900],
      ["소장처  여러 기관 소장", "RK Dot", 14, 400],
      ["마지막 확인  2094년 3월", "RK Dot", 14, 400],
      ["다음 확인  2351년 5월 · 미라 아냥고", "RK Dot", 14, 400],
      ["다음 확인  2352년 1월 · 화성 3구역 윤해솔", "RK Dot", 14, 400],
      ["다음 확인  2371년 2월 · 윤다온 (손녀)", "RK Dot", 14, 400],
      ["다음 확인  ____________________", "RK Dot", 14, 400]
    ];
    const body = `
      <rect width="${W}" height="${H}" fill="#dcdcd4"/>
      ${panels}
      <rect x="0" y="760" width="${W}" height="140" fill="#cfd0c8"/>
      <line x1="0" y1="760" x2="${W}" y2="760" ${thin}/>
      <!-- 창: 화성의 저녁 -->
      <clipPath id="win"><circle cx="930" cy="250" r="150"/></clipPath>
      <g clip-path="url(#win)"><rect x="770" y="90" width="320" height="320" fill="#b98a6a"/>
      <path d="M770 300 q160 -60 320 0 L1090 410 L770 410Z" fill="#9c6e52"/>
      <path d="M840 330 a70 40 0 0 1 140 0" fill="none" stroke="#e7cdb4" stroke-width="1.5"/></g>
      <circle cx="930" cy="250" r="150" fill="none" stroke="${P.navy[2]}" stroke-width="10"/>
      <circle cx="930" cy="250" r="162" ${thin}/>
      <g transform="translate(-40 20) scale(1.25)">
      <!-- 선반(인쇄물: 가는 선) -->
      <rect x="120" y="520" width="620" height="18" rx="4" fill="#e9e9e2" ${thin.replace('fill="none"', "")}/>
      <path d="M160 538 v40 M700 538 v40" ${thin}/>
      <!-- 습도 종 -->
      <path d="M270 520 L270 300 Q270 230 360 230 Q450 230 450 300 L450 520" fill="#ffffff" fill-opacity=".28" stroke="${P.navy[2]}" stroke-width="2"/>
      <path d="M292 300 Q292 256 340 250" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-opacity=".8"/>
      <circle cx="360" cy="222" r="10" ${thin}/>
      ${cup(360, 510)}
      <rect x="258" y="500" width="204" height="20" fill="#e9e9e2" ${thin.replace('fill="none"', "")}/>
      <text x="360" y="515" text-anchor="middle" font-family="RK Dot" font-size="12" fill="${P.navy[2]}">습도 45</text>
      <!-- 카드 — 족보 -->
      <g transform="translate(470 238) rotate(4)">
        <rect x="5" y="6" width="330" height="282" fill="${INK}" fill-opacity=".2"/>
        <rect width="330" height="282" fill="${P.paper}" stroke="${INK}" stroke-width="3"/>
        <circle cx="306" cy="22" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>
        ${cardLines.map(([t, f, fs, fw], i) => `<text x="18" y="${40 + i * 36 + (i ? 10 : 0)}" font-family="${f}" font-size="${fs}" font-weight="${fw}" fill="${INK}">${t}</text>`).join("")}
        <line x1="18" y1="136" x2="312" y2="136" stroke="${INK}" stroke-width="1.5" stroke-dasharray="5 4"/>
      </g>
      </g>
      ${callout(410, 570, 80, 770, "지구에서 만든 것 — 굵고 흔들리는 선")}
      ${callout(150, 300, 40, 240, "콜로니에서 인쇄한 것 — 가늘고 곧은 선")}
      ${callout(900, 430, 990, 470, "카드는 족보가 된다")}
      ${caption(W, H, "02", "화성 3구역 — 거실의 선반", "2371 · 4세대의 집")}`;
    out.push({ name: "place-mars", out: "art/places/place-02-mars-shelf.png", w: W, h: H, html: wrap(fontCss, W, H, body) });
  }

  // ── 장소 03 · 궤도 시장 — 복도 하나 차이 ───────────────────────────────
  {
    const W = 1600, H = 820;
    const thin = `stroke="${P.navy[0]}" stroke-width="1.5" fill="none"`;
    const body = `
      <rect width="${W}" height="${H}" fill="${P.navy[3]}"/>
      <path d="M0 560 Q800 690 1600 560 L1600 ${H} L0 ${H}Z" fill="${P.navy[2]}"/>
      <path d="M0 560 Q800 690 1600 560" ${thin}/>
      <path d="M0 110 Q800 40 1600 110" ${thin}/>
      ${Array.from({ length: 16 }, (_, i) => { const x = i * 106; const y = 560 + Math.sin((x / 1600) * Math.PI) * 60; return `<path d="M${x} ${110 - Math.sin((x / 1600) * Math.PI) * 70} L${x} ${y}" ${thin} stroke-opacity=".5"/>`; }).join("")}
      <!-- 경매장 문 -->
      <rect x="260" y="200" width="330" height="360" rx="10" fill="${P.navy[1]}" stroke="${P.navy[0]}" stroke-width="1.5"/>
      <rect x="290" y="160" width="270" height="44" fill="${P.paper}" stroke="${P.navy[0]}" stroke-width="1.5"/>
      <text x="425" y="191" text-anchor="middle" font-family="RK Sans" font-weight="700" font-size="22" fill="${INK}">경매장</text>
      <rect x="380" y="300" width="90" height="120" rx="4" fill="${P.navy[2]}" ${thin}/>
      <rect x="396" y="318" width="58" height="40" fill="${P.paper}"/><rect x="396" y="370" width="58" height="6" fill="${P.paper}"/>
      <text x="425" y="455" text-anchor="middle" font-family="RK Dot" font-size="15" fill="${P.paper}">카드를 넣어 주십시오</text>
      <text x="425" y="480" text-anchor="middle" font-family="RK Dot" font-size="13" fill="${P.paper}" fill-opacity=".7">수수료 8%</text>
      <!-- 암시장 문(표시 없음) -->
      <rect x="1080" y="250" width="200" height="300" rx="8" fill="${P.navy[2]}" stroke="${P.navy[0]}" stroke-width="1.5"/>
      <circle cx="1250" cy="400" r="6" fill="${P.gold[1]}"/>
      <rect x="1120" y="290" width="120" height="30" fill="none" stroke="${P.navy[0]}" stroke-width="1.5" stroke-dasharray="3 4"/>
      <!-- 콜로니 사람들: 가는 선 -->
      ${[[700, 440, 1], [780, 450, 0.9], [1380, 420, 1]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})" ${thin} stroke="${P.navy[0]}">
        <circle cx="0" cy="-10" r="16"/><path d="M-24 110 L-20 20 Q0 6 20 20 L24 110 M-12 110 v60 M12 110 v60"/></g>`).join("")}
      ${crewSvg("jeong-dokyeong", 880, 380, 0.9)}
      <text x="800" y="740" text-anchor="middle" font-family="RK Dot" font-size="18" fill="${P.paper}" fill-opacity=".8">복도 하나 차이 — 카드가 있으면 왼쪽, 없으면 오른쪽</text>
      ${callout(1130, 305, 1560, 200, "간판이 없다 · 카드를 묻지 않는다 · 장물 0.32", true, "end")}
      ${callout(700, 470, 640, 640, "콜로니 사람 — 가는 선", true, "end")}
      ${caption(W, H, "03", "궤도 시장 — 두 문", "정도경의 동선", true)}`;
    out.push({ name: "place-market", out: "art/places/place-03-orbital-market.png", w: W, h: H, html: wrap(fontCss, W, H, body, P.navy[3]) });
  }
  return out;
}
