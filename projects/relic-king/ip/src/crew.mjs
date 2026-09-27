// 크루 도트 검수 시트: 배율 1·2·4·8 × 밝은/어두운 바탕 × 실루엣.
import { P, INK } from "./palette.mjs";
import { CREW, COLORS } from "./crew-sprites.mjs";
import { asciiToRgba, scaleRgba, encodePng, pngDataUrl } from "./lib.mjs";

export function sprite(c) { return asciiToRgba(c.rows, COLORS); }
export function silhouette(c, color = INK) {
  const map = Object.fromEntries(Object.keys(COLORS).map((k) => [k, color]));
  return asciiToRgba(c.rows, map);
}
const img = (im, s, extra = "") =>
  `<img src="${pngDataUrl(scaleRgba(im, s))}" width="${im.w * s}" height="${im.h * s}" style="image-rendering:pixelated;${extra}">`;

export function pages(fontCss) {
  const out = [];
  for (const c of CREW) {
    const im = sprite(c);
    out.push({ name: `crew-${c.id}-1x`, out: `art/crew/sprite-${c.id}.png`, png: encodePng(im.rgba, im.w, im.h), html: "" });
    const big = scaleRgba(im, 8);
    out.push({ name: `crew-${c.id}-8x`, out: `art/crew/sprite-${c.id}@8x.png`, png: encodePng(big.rgba, big.w, big.h), html: "" });
  }
  const row = (label, cells, bg, fg = INK) => `<div class="row" style="background:${bg};color:${fg}"><div class="lab">${label}</div>${cells}</div>`;
  const scales = [1, 2, 4, 8];
  let body = `<h1>크루 도트 검수 — 16×24</h1>`;
  for (const s of scales) {
    body += row(`${s}배 · 밝은 바탕`, CREW.map((c) => `<div class="c">${img(sprite(c), s)}</div>`).join(""), P.paper);
    body += row(`${s}배 · 흙 바탕`, CREW.map((c) => `<div class="c">${img(sprite(c), s)}</div>`).join(""), P.soil[3], P.paper);
  }
  body += row(`실루엣 4배`, CREW.map((c) => `<div class="c">${img(silhouette(c), 4)}</div>`).join(""), P.paper);
  body += row(`실루엣 1배`, CREW.map((c) => `<div class="c">${img(silhouette(c), 1)}</div>`).join(""), P.paper);
  body += row(`이름`, CREW.map((c) => `<div class="c n">${c.name}<br><small>${c.role}</small></div>`).join(""), P.paper);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
  body{margin:0;background:${P.paper};font-family:"RK Dot";color:${INK};width:1100px}
  h1{font:700 22px "RK Dot";margin:16px 20px}
  .row{display:flex;align-items:flex-end;gap:0;padding:10px 20px;border-top:2px solid ${INK}}
  .lab{width:160px;font-size:13px}
  .c{width:180px;display:flex;justify-content:center;align-items:flex-end}
  .n{font-size:15px;text-align:center}.n small{font-size:12px;opacity:.7}
  </style></head><body>${body}</body></html>`;
  out.push({ name: "crew-qa", out: "art/crew/crew-qa-sheet.png", w: 1100, h: 1460, html });
  return out.concat(sheetPages(fontCss), conversionPage(fontCss), reviewPages(fontCss));
}

// ── 캐릭터 시트 ──────────────────────────────────────────────────────────
import { crewSvg } from "./crew-vector.mjs";
import { hatchDefs } from "./svg.mjs";

export const PROFILE = {
  "seo-gaon": {
    origin: "달 3세대 · 아홉 번째 강하", want: "내려간 사람을 전부 데리고 올라온다",
    key: "위로 뻗은 주황 줄 한 가닥", prop: "윈치 배낭과 줄", color: ["안전 주황", "#d9692b"],
    never: "줄을 풀지 않는다. 사람이 없는 현장에는 내려가지 않는다",
    line: "\"줄 걸었어? 그럼 내려가.\""
  },
  "mira-anyango": {
    origin: "화성 아카이브 출신", want: "빈칸을 실물로 메우고, 모두가 보는 자리에 둔다",
    key: "몸 앞으로 비어져 나온 네모난 판", prop: "기록판·확대경·'소실 추정' 도장", color: ["종이색", "#efe6d2"],
    never: "갈린 가루를 흙이라 부르지 않는다. 도장을 찍지 않는다 — 들고만 다닌다",
    line: "\"다음 확인. 2351년 5월. 미라 아냥고.\""
  },
  "jeong-dokyeong": {
    origin: "콜로니 신용시장 출신", want: "다음 달에도 이 팀이 있는 것",
    key: "넓게 벌어진 코트 자락과 옆구리의 상자", prop: "잠금 상자(견본·카드 사본)", color: ["콜로니 남색", "#4d6084"],
    never: "카드에 자기 이름을 쓰지 않는다. 서명은 늘 미라가 한다",
    line: "\"우리가 안 팔면 저건 누구도 못 만져.\""
  },
  "haedal-hd8": {
    origin: "하역 규격 8호기 · 2091년 울산 제조", want: "없다. 다만 해달도 지구제다",
    key: "낮고 긴 몸, 짧은 다리 넷, 앞에 안은 짐, 귀 두 개", prop: "앞에 안은 상자·습도계", color: ["하역 황색", "#e0a92e"],
    never: "독백하지 않는다. 자아를 얻지 않는다. 존재감은 습도 수치로만 나온다",
    line: "\"습도 45. 유지.\""
  },
  "yeoe7": {
    origin: "탈출 좌석 계산 계통에서 갈라진 운영 AI", want: "지우지 못한 명단 — 그중 '잔류' 열",
    key: "다리 셋 + 윤곽선 없는 머리", prop: "측량기 몸(삼각대)·붉은 렌즈", color: ["갈린 회색", "#cfcbc2"],
    never: "배신하지 않는다. 유일을 다투지 않는다(서가온의 규칙). 명단을 지우지 않는다",
    line: "\"재통과까지 3시간 12분. 신호 하나.\""
  }
};

function sheetHtml(fontCss, c) {
  const pr = PROFILE[c.id];
  const im = sprite(c);
  const W = 1400, H = 820;
  const sil = `<g transform="translate(560 170) scale(1.6)" filter="url(#ink)">${crewSvg(c.id, 0, 0, 1)}</g>`;
  const swatches = [...new Set(c.rows.join("").replace(/\./g, ""))]
    .map((ch) => COLORS[ch]).filter((v, i, a) => a.indexOf(v) === i);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
  body{margin:0;background:${P.paper};width:${W}px;height:${H}px;overflow:hidden;font-family:"RK Sans";color:${INK}}
  .t{position:absolute;left:880px;top:40px;width:480px}
  h1{font:900 54px/1 "RK Serif";margin:0 0 6px}
  .role{font:700 18px "RK Dot";letter-spacing:.04em;margin-bottom:22px;color:${P.orange[2]}}
  dl{margin:0;display:grid;grid-template-columns:96px 1fr;gap:9px 12px;font-size:16px;line-height:1.45}
  dt{font:700 13px "RK Dot";padding-top:3px;opacity:.7} dd{margin:0}
  .line{margin-top:22px;font:400 20px "RK Serif";border-left:4px solid ${INK};padding-left:14px}
  .sp{position:absolute;left:880px;bottom:36px;display:flex;align-items:flex-end;gap:26px}
  .sp div{font:12px "RK Dot";text-align:center}
  .sw{position:absolute;left:880px;bottom:215px;display:flex;gap:6px}
  .sw span{width:30px;height:30px;border:2px solid ${INK}}
  .cap{position:absolute;font:12px "RK Dot";opacity:.75}
  img{image-rendering:pixelated;display:block;margin:0 auto 4px}
  </style></head><body>
  <svg width="${W}" height="${H}" style="position:absolute;left:0;top:0">
    ${hatchDefs()}
    <defs><filter id="ink"><feFlood flood-color="${INK}"/><feComposite in2="SourceAlpha" operator="in"/></filter>
      <clipPath id="clip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>
    <line x1="840" y1="30" x2="840" y2="${H - 30}" stroke="${INK}" stroke-width="2"/>
    <line x1="30" y1="${H - 44}" x2="820" y2="${H - 44}" stroke="${INK}" stroke-width="2"/>
    <g clip-path="url(#clip)">${crewSvg(c.id, 110, 150, 2.45)}</g>
    ${sil}
  </svg>
  <div class="cap" style="left:90px;top:${H - 36}px">큰 그림 — 도트 좌표 × 10</div>
  <div class="cap" style="left:600px;top:${H - 36}px">실루엣 — 색을 빼도 갈린다</div>
  <div class="t"><h1>${c.name}</h1><div class="role">${c.role} · ${pr.origin}</div>
    <dl><dt>원하는 것</dt><dd>${pr.want}</dd><dt>실루엣 키</dt><dd>${pr.key}</dd>
    <dt>소품</dt><dd>${pr.prop}</dd><dt>대표색</dt><dd>${pr.color[0]} <code>${pr.color[1]}</code></dd>
    <dt>하지 않는 것</dt><dd>${pr.never}</dd></dl>
    <div class="line">${pr.line}</div></div>
  <div class="sw">${swatches.map((s) => `<span style="background:${s}"></span>`).join("")}</div>
  <div class="sp">${[1, 2, 4, 6].map((s) => `<div>${img(im, s)}${s}배</div>`).join("")}</div>
  </body></html>`;
}

export function sheetPages(fontCss) {
  const out = CREW.map((c) => ({ name: `sheet-${c.id}`, out: `art/crew/sheet-${c.id}.png`, w: 1400, h: 820, html: sheetHtml(fontCss, c) }));
  // 라인업 — 다섯이 나란히, 큰 그림과 도트
  const W = 1600, H = 760;
  const xs = [80, 380, 680, 980, 1280];
  const body = CREW.map((c, i) => `${crewSvg(c.id, xs[i], 170, 1.7)}
    <text x="${xs[i] + 136}" y="640" text-anchor="middle" font-family="RK Serif" font-weight="900" font-size="30" fill="${INK}">${c.name}</text>
    <text x="${xs[i] + 136}" y="668" text-anchor="middle" font-family="RK Dot" font-size="15" fill="${INK}" fill-opacity=".75">${c.role}</text>
    <image href="${pngDataUrl(scaleRgba(sprite(c), 3))}" x="${xs[i] + 112}" y="684" width="48" height="72" style="image-rendering:pixelated"/>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}body{margin:0;background:${P.paper}}</style></head><body>
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${hatchDefs()}
    <rect width="${W}" height="${H}" fill="${P.paper}"/>
    <rect x="0" y="0" width="${W}" height="100" fill="${P.grind[1]}"/><rect x="0" y="0" width="${W}" height="100" fill="url(#h-grind)"/>
    <line x1="0" y1="100" x2="${W}" y2="100" stroke="${INK}" stroke-width="4"/>
    <text x="40" y="64" font-family="RK Serif" font-weight="900" font-size="40" fill="${INK}">크루 다섯 — 아홉 번째 강하</text>
    <text x="${W - 40}" y="64" text-anchor="end" font-family="RK Dot" font-size="18" fill="${INK}">2351 · 경주 거점</text>
    <defs><clipPath id="below"><rect x="0" y="104" width="${W}" height="${H}"/></clipPath></defs>
    <g clip-path="url(#below)">${body}</g></svg></body></html>`;
  out.push({ name: "crew-lineup", out: "art/crew/crew-lineup.png", w: W, h: H, html });
  return out;
}

// ── 변환 증명: 도트 격자(×10) 위에 큰 그림을 반투명으로 얹는다 ─────────────
export function conversionPage(fontCss) {
  const S = 1.8, cell = 10 * S, W = 1600, H = 640;
  const cols = CREW.map((c, i) => {
    const x0 = 40 + i * 312, y0 = 120;
    const im = sprite(c);
    const grid = Array.from({ length: 17 }, (_, k) => `<line x1="${x0 + k * cell}" y1="${y0}" x2="${x0 + k * cell}" y2="${y0 + 24 * cell}" stroke="${INK}" stroke-opacity=".12"/>`).join("")
      + Array.from({ length: 25 }, (_, k) => `<line x1="${x0}" y1="${y0 + k * cell}" x2="${x0 + 16 * cell}" y2="${y0 + k * cell}" stroke="${INK}" stroke-opacity=".12"/>`).join("");
    return `<image href="${pngDataUrl(scaleRgba(im, 18))}" x="${x0}" y="${y0}" width="${16 * cell}" height="${24 * cell}" style="image-rendering:pixelated" opacity=".55"/>
      ${grid}<g opacity=".78">${crewSvg(c.id, x0, y0, S)}</g>
      <text x="${x0 + 8 * cell}" y="${y0 + 24 * cell + 40}" text-anchor="middle" font-family="RK Serif" font-weight="900" font-size="24" fill="${INK}">${c.name}</text>`;
  }).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}body{margin:0;background:${P.paper}}</style></head><body>
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${P.paper}"/>
    <defs><clipPath id="cv"><rect x="0" y="110" width="${W}" height="${H - 110}"/></clipPath></defs>
    <text x="40" y="60" font-family="RK Serif" font-weight="900" font-size="34" fill="${INK}">도트 → 큰 그림 — 같은 격자, 같은 색 덩어리</text>
    <text x="40" y="92" font-family="RK Dot" font-size="17" fill="${INK}" fill-opacity=".7">바탕: 16×24 도트(게임 해상도)를 격자째 확대 · 위: 큰 그림(좌표 = 도트 × 10). 어긋나는 곳은 모서리 반경(≤ 1칸)과 한 칸 안의 디테일이다 — 예외 하나: 미라의 머리는 도트보다 한 칸 크다</text>
    <g clip-path="url(#cv)">${cols}</g></svg></body></html>`;
  return [{ name: "crew-conversion", out: "art/crew/conversion-overlay.png", w: W, h: H, html }];
}

// ── 블라인드 식별 시험지(eval.md §38.5) — 순서를 섞고 이름을 뺀다 ─────────────
// 정답: 시험지 A  P=해달 Q=서가온 R=예외7 S=미라 T=정도경
//       시험지 B  1=정도경 2=예외7 3=서가온 4=해달 5=미라
export const REVIEW_KEY = {
  A: ["haedal-hd8", "seo-gaon", "yeoe7", "mira-anyango", "jeong-dokyeong"],
  B: ["jeong-dokyeong", "yeoe7", "seo-gaon", "haedal-hd8", "mira-anyango"]
};
export function reviewPages(fontCss) {
  const byId = Object.fromEntries(CREW.map((c) => [c.id, c]));
  const labA = ["P", "Q", "R", "S", "T"];
  // A: 게임 크기 그대로(1배)를 흙 바탕 게임 프레임에 넣고, 옆에 2배
  const W = 900, H = 330;
  const frame = REVIEW_KEY.A.map((id, i) => `<div class="c"><div class="g">${img(sprite(byId[id]), 1)}</div>${img(sprite(byId[id]), 2)}<b>${labA[i]}</b></div>`).join("");
  const htmlA = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
    body{margin:0;background:${P.paper};font-family:"RK Dot";color:${INK};width:${W}px}
    .row{display:flex;gap:30px;padding:26px}.c{display:flex;flex-direction:column;align-items:center;gap:10px;width:140px}
    .g{width:60px;height:60px;background:${P.soil[3]};display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;border:2px solid ${INK}}
    b{font-size:22px} p{margin:0 26px;font-size:14px}</style></head><body>
    <p>위 칸: 게임 화면 크기 그대로(16×24 픽셀) · 아래: 2배</p><div class="row">${frame}</div></body></html>`;
  const htmlB = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
    body{margin:0;background:${P.paper};font-family:"RK Dot";color:${INK};width:${W}px}
    .row{display:flex;gap:30px;padding:26px;align-items:flex-end}.c{display:flex;flex-direction:column;align-items:center;gap:10px;width:140px}
    b{font-size:22px} p{margin:0 26px;font-size:14px}</style></head><body>
    <p>실루엣 4배(64×96) · 색을 뺐다</p><div class="row">${REVIEW_KEY.B.map((id, i) => `<div class="c">${img(silhouette(byId[id]), 4)}<b>${i + 1}</b></div>`).join("")}</div></body></html>`;
  return [
    { name: "review-crew-a", out: "art/review/crew-test-a.png", w: W, h: 250, html: htmlA },
    { name: "review-crew-b", out: "art/review/crew-test-b.png", w: W, h: 200, html: htmlB }
  ];
}
