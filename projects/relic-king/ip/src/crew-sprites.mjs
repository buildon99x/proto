// 크루 5인 — 게임 해상도 도트(16×24). 인부 스프라이트(app/src/render/strata.ts
// drawDigger, 약 13×23)와 같은 키로 찍었다. 손으로 찍은 비트맵이라 git diff로
// 그림이 그대로 읽힌다(unique-sprites.ts와 같은 방식).
//
// 다섯은 **실루엣 계열**이 다르다 — 색을 빼도 갈린다(visual-guide.md §3).
//   서가온   위로 뻗은 줄 한 가닥   (세로선)
//   미라     몸 앞의 네모난 판       (판)
//   정도경   넓은 어깨 + 옆구리 상자 (사다리꼴)
//   해달     낮고 긴 몸 + 짧은 다리 넷 + 앞에 안은 짐 (가로 덩어리)
//   예외7    다리 셋 + 선 없는 머리  (삼각대)
//
// 예외7의 머리만 외곽선(k)이 없다. "사람이 만든 것에는 선이 있다"는 규칙의
// 도트판이다 — 그것은 지구를 갈아 낸 계통에서 왔다.
import { P, INK } from "./palette.mjs";

export const COLORS = {
  k: INK,
  w: P.paper, q: P.paperShade, p: "#e9dcc0",
  v: P.sky, V: P.navy[0],
  L: P.orange[0], o: P.orange[1], O: P.orange[2],
  n: P.silver[0], m: P.silver[1], M: P.silver[3],
  s: "#e6c79b", t: "#c49a6c", T: "#8a5a3a", U: "#6b4430",
  h: P.shadow, H: "#3a2f26",
  N: P.navy[1], B: P.navy[2], C: P.navy[3],
  u: P.gold[0], y: "#e0a92e", Y: P.gold[2],
  e: P.grind[0], g: P.grind[1], G: P.grind[2],
  r: P.signal, R: P.vermilion,
  d: P.wood[2], D: P.wood[1]
};

export const CREW = [
  {
    id: "seo-gaon", name: "서가온", role: "강하 책임",
    rows: [
      "............o...",
      "............o...",
      "............o...",
      "....kkkkk...o...",
      "...kwwwwwk..o...",
      "..kwwwwwwwk.o...",
      "..kwvvvvVwk.o...",
      "..kwvvvvvwkkokk.",
      "..kkwwwwwkkMmMk.",
      "...kkkkkkkkMMMk.",
      "..kLooooooookMk.",
      ".kLooooooooookk.",
      ".kLoOoooooOoook.",
      ".koOkwwwwkOoook.",
      ".koOkwkkwkOoook.",
      ".ktkkwwwwkkotk..",
      "..kkMMMMMMMMkk..",
      "...kooooooook...",
      "...kooOkkOook...",
      "...kooOkkOook...",
      "...kooOkkOook...",
      "...kMMMkkMMMk...",
      "..kMMMMkkMMMMk..",
      "..kkkkkk.kkkkk.."
    ]
  },
  {
    id: "mira-anyango", name: "미라 아냥고", role: "감정·전시",
    rows: [
      "................",
      "................",
      "................",
      "....kkkk........",
      "...khhhhk.......",
      "..khhhhhhk......",
      "..khTTTThkk.....",
      "..khTkTTkknk....",
      "..khTTTTTkk.....",
      "...kTTUTk.......",
      "..kkkRkkkk......",
      ".kppkRkppk......",
      ".kppkRkkkkkkkkk.",
      ".kppkTkqqqqqqqk.",
      ".kppkkkqkkkkkqk.",
      ".kppppkqqqqqqqk.",
      ".kppppkqkkkqqqk.",
      ".kppppkqqqqqqqk.",
      ".kppppkkkkkkkkk.",
      ".kpppqppk.......",
      "..kppkppk.......",
      "..kppkppk.......",
      "..kHHkHHk.......",
      "..kkkkkkk......."
    ]
  },
  {
    id: "jeong-dokyeong", name: "정도경", role: "시장",
    rows: [
      "................",
      "................",
      ".....kkkk.......",
      "....khhhhk......",
      "....khsssk......",
      "....kskssk......",
      "....kssssk......",
      ".....kssk.......",
      "..kkkkwwkkkk....",
      ".kNNNNkwkNNNk...",
      ".kNVNNNkNNNVk...",
      ".kNVNNNkNNNVk...",
      ".kNVNNNkNNNVk...",
      ".kNkNNNkNNNkk...",
      ".kskNNNkNNNksk..",
      ".kNNNNNkNNNk.k..",
      "kNNNNNkNNNk.kkkk",
      "kNNNNNkNNNk.kuMk",
      "kNNNNNkNNNk.kMMk",
      ".kNNNNkNNNk.kkkk",
      "..kCCk.kCCk.....",
      "..kCCk.kCCk.....",
      ".kkCCk.kCCkk....",
      ".kkkkk.kkkkk...."
    ]
  },
  {
    id: "haedal-hd8", name: "해달 (HD-8)", role: "하역·보존",
    rows: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "..k..k..........",
      ".kyk.kyk........",
      ".kyyyyyk........",
      "kyyyyyyyk.......",
      "kyvyyyvyk.kkkkk.",
      "kyyyyyyykkyyyyyk",
      ".kkyyyykyyyyyyyk",
      "kdDDdkkyYkYkYkyk",
      "kDddDkyyyyyyyyyk",
      "kdDDdkyykkkyyyyk",
      "kkkkkkyykuukyyyk",
      ".kmkkyyykkkkyyYk",
      ".kmkYYYYYYYYYYYk",
      ".kkkkkkkkkkkkkkk",
      ".kYk.kYk.kYk.kYk",
      ".kMk.kMk.kMk.kMk",
      ".kkk.kkk.kkk.kkk"
    ]
  },
  {
    id: "yeoe7", name: "예외7", role: "신호·운영",
    rows: [
      "................",
      "................",
      "................",
      "................",
      "................",
      ".......ee.......",
      "......e..e......",
      "....geeeeeeg....",
      "....gGGGGGGg....",
      "....gGrrGGGg....",
      "....gGrrGGGg....",
      "....gGGGGGGg....",
      "....gggggggg....",
      "......kmmk......",
      "......kmmk......",
      ".....kmkkmk.....",
      ".....kmkkmk.....",
      "....kmk.kmk.....",
      "....kmkkkmk.....",
      "...kmk.km.kmk...",
      "...kmk.km.kmk...",
      "..kmk..km..kmk..",
      "..kmk..km..kmk..",
      ".kkk...kk...kkk."
    ]
  }
];
