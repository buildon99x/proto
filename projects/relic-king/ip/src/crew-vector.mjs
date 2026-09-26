// 크루 5인 — 큰 그림(벡터). **도트 좌표 × 10**으로 그렸다.
// 16×24 도트의 한 칸 = 이 그림의 10×10. 그래서 도트와 큰 그림은 같은 실루엣이다.
//
// 변환 규칙(visual-guide.md §3):
//   1. 실루엣은 도트 격자를 따라간다. 모서리만 최대 한 칸(10) 반경으로 둥글린다.
//   2. 색 덩어리는 도트와 같은 자리, 같은 색이다.
//   3. 큰 그림이 더하는 디테일은 **도트 한 칸 안에** 들어가는 것만(주름·솔기·글자).
//   4. 사람이 만든 것은 잉크 윤곽(4). 예외7의 머리만 윤곽이 없다.
import { P, INK } from "./palette.mjs";
import { COLORS as C } from "./crew-sprites.mjs";

const S = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

export const VECTOR = {
  "seo-gaon": () => `
    <line x1="125" y1="-400" x2="125" y2="80" stroke="${C.o}" stroke-width="9"/>
    <line x1="125" y1="-400" x2="125" y2="80" stroke="${C.L}" stroke-width="3" transform="translate(-2 0)"/>
    <rect x="110" y="72" width="40" height="82" rx="8" fill="${C.M}" ${S}/>
    <circle cx="130" cy="96" r="12" fill="${C.m}" ${S}/><circle cx="130" cy="96" r="3" fill="${INK}"/>
    <rect x="112" y="122" width="36" height="6" fill="${C.m}"/>
    <rect x="12" y="98" width="110" height="64" rx="12" fill="${C.o}" ${S}/>
    <path d="M22 104 v50 M112 104 v50" stroke="${C.O}" stroke-width="10"/>
    <rect x="46" y="126" width="42" height="26" rx="3" fill="${C.w}" ${S}/>
    <line x1="54" y1="136" x2="80" y2="136" ${S} stroke-width="3"/><line x1="54" y1="144" x2="72" y2="144" ${S} stroke-width="3"/>
    <rect x="8" y="104" width="26" height="58" rx="11" fill="${C.L}" ${S}/>
    <circle cx="21" cy="162" r="10" fill="${C.t}" ${S}/>
    <rect x="22" y="160" width="100" height="13" rx="3" fill="${C.M}" ${S}/>
    <rect x="34" y="172" width="36" height="44" rx="6" fill="${C.o}" ${S}/>
    <rect x="80" y="172" width="36" height="44" rx="6" fill="${C.o}" ${S}/>
    <path d="M60 176 v36 M90 176 v36" stroke="${C.O}" stroke-width="8"/>
    <rect x="26" y="212" width="46" height="26" rx="6" fill="${C.M}" ${S}/>
    <rect x="80" y="212" width="46" height="26" rx="6" fill="${C.M}" ${S}/>
    <rect x="24" y="34" width="84" height="60" rx="28" fill="${C.w}" ${S}/>
    <rect x="38" y="56" width="60" height="20" rx="8" fill="${C.v}" ${S}/>
    <rect x="80" y="60" width="10" height="6" rx="2" fill="${C.V}"/>
    <path d="M30 86 q36 14 72 0" fill="none" ${S} stroke-width="3"/>`,

  "mira-anyango": () => `
    <rect x="12" y="108" width="80" height="104" rx="10" fill="${C.p}" ${S}/>
    <path d="M22 118 v84 M50 150 v56" stroke="${C.q}" stroke-width="6"/>
    <rect x="22" y="200" width="30" height="30" rx="4" fill="${C.p}" ${S}/>
    <rect x="56" y="200" width="30" height="30" rx="4" fill="${C.p}" ${S}/>
    <rect x="20" y="220" width="34" height="18" rx="5" fill="${C.H}" ${S}/>
    <rect x="54" y="220" width="34" height="18" rx="5" fill="${C.H}" ${S}/>
    <rect x="30" y="92" width="44" height="22" rx="6" fill="${C.T}" ${S}/>
    <line x1="58" y1="104" x2="58" y2="170" stroke="${C.R}" stroke-width="4"/>
    <rect x="60" y="120" width="92" height="66" rx="4" fill="${C.q}" ${S}/>
    <rect x="70" y="130" width="72" height="46" fill="${C.w}" stroke="${INK}" stroke-width="2"/>
    <path d="M78 142 h56 M78 152 h40 M78 162 h50" stroke="${INK}" stroke-width="3"/>
    <rect x="50" y="130" width="22" height="24" rx="10" fill="${C.T}" ${S}/>
    <circle cx="58" cy="176" r="9" fill="${C.R}" ${S} stroke-width="3"/>
    <ellipse cx="62" cy="68" rx="36" ry="36" fill="${C.h}" ${S}/>
    <circle cx="40" cy="36" r="14" fill="${C.h}" ${S}/>
    <ellipse cx="68" cy="76" rx="24" ry="26" fill="${C.T}" ${S}/>
    <path d="M46 54 q20 -14 46 0" fill="${C.h}" stroke="none"/>
    <circle cx="64" cy="74" r="3.5" fill="${INK}"/><path d="M64 92 q6 3 12 0" ${S} stroke-width="3" fill="none"/>
    <path d="M84 60 l22 10" ${S} stroke-width="5"/>
    <circle cx="110" cy="72" r="11" fill="${C.n}" ${S}/><circle cx="107" cy="69" r="3" fill="#fff"/>`,

  "jeong-dokyeong": () => `
    <rect x="22" y="196" width="34" height="42" rx="5" fill="${C.C}" ${S}/>
    <rect x="72" y="196" width="34" height="42" rx="5" fill="${C.C}" ${S}/>
    <path d="M26 86 L114 86 Q122 88 124 100 L130 146 L112 146 L110 198 L6 198 L10 146 L12 100 Q14 88 26 86Z" fill="${C.B}" ${S}/>
    <path d="M24 104 v88 M112 104 v40" stroke="${C.N}" stroke-width="8"/>
    <line x1="70" y1="92" x2="70" y2="198" ${S} stroke-width="3"/>
    <path d="M56 86 L70 108 L84 86Z" fill="${C.w}" ${S} stroke-width="3"/>
    <circle cx="16" cy="150" r="10" fill="${C.s}" ${S}/>
    <circle cx="128" cy="148" r="10" fill="${C.s}" ${S}/>
    <path d="M128 156 v8 M138 156 v8" ${S} stroke-width="3"/>
    <path d="M126 164 q7 -10 14 0" fill="none" ${S} stroke-width="4"/>
    <rect x="118" y="164" width="42" height="38" rx="4" fill="${C.M}" ${S}/>
    <rect x="133" y="176" width="12" height="10" rx="2" fill="${C.u}" ${S} stroke-width="2"/>
    <rect x="44" y="18" width="52" height="62" rx="18" fill="${C.s}" ${S}/>
    <path d="M44 42 Q44 16 70 16 Q96 16 96 40 L90 34 L50 34 Z" fill="${C.h}" ${S}/>
    <circle cx="58" cy="52" r="3.5" fill="${INK}"/><circle cx="80" cy="52" r="3.5" fill="${INK}"/>
    <path d="M60 66 h18" ${S} stroke-width="3"/>`,

  "haedal-hd8": () => `
    <rect x="14" y="196" width="146" height="30" rx="15" fill="${C.M}" ${S}/>
    ${[34, 58, 82, 106, 130].map((x) => `<circle cx="${x}" cy="211" r="6" fill="${C.m}" ${S} stroke-width="3"/>`).join("")}
    <rect x="66" y="112" width="92" height="88" rx="10" fill="${C.y}" ${S}/>
    <rect x="66" y="186" width="92" height="12" fill="${C.Y}"/>
    <g><path d="M70 136 h86 v14 h-86z" fill="${INK}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<path d="M${74 + i * 18} 150 l10 -14 h8 l-10 14z" fill="${C.y}"/>`).join("")}</g>
    <text x="84" y="178" font-family="RK Dot" font-weight="700" font-size="17" fill="${INK}">HD-8</text>
    <rect x="18" y="72" width="16" height="22" rx="5" fill="${C.y}" ${S}/>
    <rect x="50" y="72" width="16" height="22" rx="5" fill="${C.y}" ${S}/>
    <rect x="4" y="84" width="84" height="62" rx="24" fill="${C.y}" ${S}/>
    <circle cx="28" cy="112" r="8" fill="${C.v}" ${S} stroke-width="3"/><circle cx="26" cy="109" r="2.5" fill="#fff"/>
    <circle cx="64" cy="112" r="8" fill="${C.v}" ${S} stroke-width="3"/><circle cx="62" cy="109" r="2.5" fill="#fff"/>
    <path d="M40 128 q6 4 12 0" ${S} stroke-width="3" fill="none"/>
    <path d="M60 176 h20 M60 150 h20" ${S} stroke-width="6"/>
    <rect x="4" y="140" width="58" height="44" rx="3" fill="${C.D}" ${S}/>
    <path d="M4 162 h58 M20 140 v44 M46 140 v44" ${S} stroke-width="3"/>`,

  "yeoe7": () => `
    <path d="M80 150 L18 236 M80 150 L80 238 M80 150 L142 236" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <path d="M80 150 L18 236 M80 150 L80 238 M80 150 L142 236" stroke="${C.m}" stroke-width="5" stroke-linecap="round"/>
    <path d="M36 212 L124 212" stroke="${INK}" stroke-width="3" stroke-dasharray="2 6"/>
    <rect x="62" y="128" width="36" height="26" rx="4" fill="${C.m}" ${S}/>
    <rect x="42" y="70" width="80" height="56" rx="10" fill="${C.g}"/>
    <rect x="52" y="80" width="60" height="36" rx="6" fill="${C.G}"/>
    <circle cx="70" cy="98" r="11" fill="${C.r}"/>
    <path d="M68 70 q14 -22 28 0" fill="none" stroke="${C.e}" stroke-width="8" stroke-linecap="round"/>`
};

/** 크루 한 명의 큰 그림. (x,y)는 발밑 기준 좌상단이 아니라 160×240 상자의 좌상단. */
export function crewSvg(id, x, y, scale = 1, extra = "") {
  return `<g transform="translate(${x} ${y}) scale(${scale})" ${extra}>${VECTOR[id]()}</g>`;
}
