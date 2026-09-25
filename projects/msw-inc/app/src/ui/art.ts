/*
 * 자리표시용 도트 — 코드로 그린다. 실제 게임은 메이플스토리 월드 공식 리소스를 쓴다.
 *   url(key, scale) → 이미지 dataURL (캐시)
 *   작은 도트(m:*)는 월드 길, 큰 도트는 던전 현장·사원증·리포트에 쓴다.
 * 크기 규격(04 §11): 월드 길 모험가 약 30×42, 직원 약 40×36, 현장은 3배.
 */
type Grid = (string | null)[][];
const K = '#3b2a20';
const G = (w: number, h: number): Grid => Array.from({ length: h }, () => Array(w).fill(null));
function ell(g: Grid, cx: number, cy: number, rx: number, ry: number, c: string, f?: (x: number, y: number) => boolean) {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (!f || f(x, y))) g[y][x] = c;
}
function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && x >= 0 && x < g[0].length) g[y][x] = c;
}
function px(g: Grid, x: number, y: number, c: string) { if (g[y] && x >= 0 && x < g[0].length) g[y][x] = c; }
function outline(g: Grid): Grid {
  const h = g.length, w = g[0].length, o = g.map(r => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x]) {
    if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) o[y][x] = K;
  }
  for (let y = 0; y < h; y++) g[y] = o[y];
  return g;
}
/** 문자 지도 → 격자 (테두리 1칸 여백 + 자동 외곽선) */
function map(rows: string[], pal: Record<string, string>): Grid {
  const w = rows[0].length + 2, h = rows.length + 2, g = G(w, h);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') g[y + 1][x + 1] = pal[ch] || K; }));
  return outline(g);
}
const CROWN = '#ffcc33';

// ── 작은 도트 (월드 길) ─────────────────────────────────────
const LOOKS = [
  { H: '#4a2e1c', C: '#e0533d', P: '#3d4a6b' }, { H: '#f0c24a', C: '#4a78d8', P: '#3d4a6b' },
  { H: '#2b2b33', C: '#4cae4c', P: '#5b4a3b' }, { H: '#a0522d', C: '#8b5cc4', P: '#3d4a6b' },
  { H: '#e8e2d6', C: '#2a9d9a', P: '#4a3b5b' }, { H: '#d9534f', C: '#f0a030', P: '#3d4a6b' },
];
const mAdv = (l: number) => map([
  '..HHHH..', '.HHHHHH.', 'HHHHHHHH', 'HSSSSSSH', 'HSKSSKSH', '.SSSSSS.',
  '..CCCC..', 'SCCCCCCS', 'SCCCCCCS', '.CCCCCC.', '.PP..PP.', '.PP..PP.',
], Object.assign({ S: '#f6d2b0', K: '#2d2a3e' }, LOOKS[l]));
const crownRows = (w: number) => ['.'.repeat(w - 6) + 'y.y.y.', '.'.repeat(w - 6) + 'yyyyy.'];
const mSnail = (S: string, s: string, crown = false) => {
  const rows = ['.k..k.......', '.b..b..SSS..', '.bbbb.SsssS.', 'bbbbbSsSSsSS', 'bbbbbSsSsSsS', 'bbbbbSSssSSS', 'bbbbbbSSSSSb', 'bbbbbbbbbbbb'];
  if (crown) rows.unshift(...crownRows(12));
  return map(rows, { k: '#2d2a3e', b: '#f3d9a4', S, s, y: CROWN });
};
const mMush = (C: string, D: string, w: string, B: string, horn = false, leaf = false) => {
  const rows = ['...CCCCCC...', '.CCwwCCCCCC.', 'CCCwwCCCwCCC', 'CCCCCCCCCCCC', 'DDDDDDDDDDDD', '..BBBBBBBB..', '..BkBBBBkB..', '..BBBrrBBB..', '..BBBBBBBB..', '..ff....ff..'];
  if (horn) rows.unshift('.....hh.....');
  if (leaf) rows.unshift('....LLl.....');
  return map(rows, { C, D, w, B, k: '#2d2a3e', r: '#c0392b', f: '#c9a06a', h: '#fff4dc', L: '#3f9a3f', l: '#7fd07a' });
};
const mSlime = (G1: string, D: string, crown = false) => {
  const rows = ['....GG.....', '...GGGG....', '.GGGGGGGGG.', 'GGlGGGGGGGG', 'GGGkGGGkGGG', 'GGGGGGGGGGG', 'GGGGrrrGGGG', '.DDDDDDDDD.'];
  if (crown) rows.unshift('..y.y.y....', '..yyyyy....');
  return map(rows, { G: G1, D, l: '#ffffffaa', k: '#2d2a3e', r: '#2d2a3e', y: CROWN });
};
const mStump = (W: string, L: string, crown = false) => {
  const rows = ['..LL.ll...', '.LLLLlll..', '..TTTTTT..', '.WWWWWWWW.', '.WkWWWWkW.', '.WWWWWWWW.', '.WWWrrWWW.', '.WWWWWWWW.', 'RR......RR'];
  if (crown) rows.unshift('..y.y.y...', '..yyyyy...');
  return map(rows, { W, L, l: '#43a043', T: '#e0b27a', k: '#2d2a3e', r: '#2d2a3e', R: '#6b4423', y: CROWN });
};
const mBoar = (F: string, D: string, t: string) => map([
  '..FF.........', '.FFFFFFFFFF..', 'FFFFFFFFFFFF.', 'FFFFFFFFFFFFF', 'FkFFFFFFFFFFF', 'NNFFFFFFFFFFF', 'NtFFFFFFFFFF.', '.DD..DD.DD.DD',
], { F, D, N: '#e8a08a', t, k: '#2d2a3e' });
const mCroco = (C: string, B: string, crown = false) => {
  const rows = ['.....CCCC.......', '..CCCCkCCCCC....', 'CCCCCCCCCCCCCCCC', 'wwwCCCCCCCCCCCC.', 'BBBBBBBBBBBBB...', '..CC..CC..CC....'];
  if (crown) rows.unshift('.....y.y.y......', '.....yyyyy......');
  return map(rows, { C, B, k: '#2d2a3e', w: '#ffffff', y: CROWN });
};
const mBat = (W: string, B: string) => map([
  'W..........W', 'WW..BBBB..WW', 'WWWBBBBBBWWW', 'WWWBkBBkBWWW', '.WWBBrrBBWW.', '..W.BBBB.W..', '.....BB.....',
], { W, B, k: '#ffe14d', r: '#ffffff' });
const mDrake = (C: string, B: string, crown = false) => {
  const rows = ['..HH.........', '.CCCC........', 'CkCCCC..SS...', 'CCCCCCCSSSS..', '.CCCCCCCCCCC.', '..CCCCCCCCCCC', '..BBBBBBBBB.C', '..CC..CC..CC.'];
  if (crown) rows.unshift('..y.y.y......', '..yyyyy......');
  return map(rows, { C, B, S: '#ffffff88', H: '#e8e0c8', k: '#ffcc33', y: CROWN });
};
const mEye = (C: string, I: string) => map([
  '..WW....WW..', '.WWW.CC.WWW.', 'WWWCCCCCCWWW', '..CCwwwwCC..', '..CwwIIwwC..', '..CwwIIwwC..', '..CCwwwwCC..', '...CCCCCC...', '....t..t....',
], { C, W: '#4a3b5b', w: '#ffffff', I, t: C });
const mBalrog = () => map([
  'h..........h', 'hh.RRRRRR.hh', '.hRRRRRRRRh.', '.RRyRRRRyRR.', '.RRRRRRRRRR.', 'wRRRkkkkRRRw', 'wwRRRRRRRRww', '..RRRRRRRR..', '..RR....RR..',
], { R: '#6b2a3a', h: '#c9c0a8', y: CROWN, k: '#2d2a3e', w: '#4a2030' });

// v1.5 계열 사다리 (가칭 · 자리표시): 돼지·옥토퍼스(헤네시스), 주니어 네키·루팡(엘리니아)
const mPig = (P: string, D: string, top: 'ribbon' | 'iron' | null = null) => {
  const rows = ['.E........E.', '.EPPPPPPPPE.', 'PPPPPPPPPPPP', 'PPkPPPPPPkPP', 'PPPPNNNNPPPP', 'PPPPNnnNPPPP', '.PPPPPPPPPP.', '.DD.DD.DD.DD'];
  if (top === 'ribbon') rows.unshift('...rr..rr...', '....rrrr....');
  if (top === 'iron') rows.unshift('..IIIIIIII..', '.IIiIIIIIII.');
  return map(rows, { P, D, E: D, N: '#f4b8c0', n: '#b85a6a', k: '#2d2a3e', r: '#e0533d', I: '#7a8494', i: '#c9d2dc' });
};
const mOcto = (O: string, T: string, hat = false) => {
  const rows = ['...OOOOOO...', '..OOOOOOOO..', '.OOlOOOOOOO.', '.OOkOOOOkOO.', '.OOOOOOOOOO.', '..OOOrrOOO..', '.T.T.TT.T.T.', 'T.T.T..T.T.T'];
  if (hat) rows.unshift('....HHHH....', '...HHHHHH...');
  return map(rows, { O, T, l: '#ffffffaa', k: '#2d2a3e', r: '#2d2a3e', H: '#3a4a8a' });
};
const mSnake = (S: string, B: string, hood = false) => {
  const rows = ['.......SSS..', '......SkSSS.', '......SSSSrr', '.....SS.....', '....SS......', '..SSS.......', '.SSBBSSSSSS.', 'SSSSSSSSSSSS'];
  if (hood) { rows[0] = '......HSSSH.'; rows[1] = '.....HSkSSSH'; }
  return map(rows, { S, B, H: B, k: '#ffe14d', r: '#e0533d' });
};
const mMonkey = (M: string, F: string, t: string) => map([
  '..MMMMMM....', '.MMFFFFMM...', 'MMFkFFkFMM..', '.MFFFFFFM...', '..FFrrFF..tt', '.MMMMMMMM.t.', 'M.MMMMMM.t..', '..MM..MM....',
], { M, F, t, k: '#2d2a3e', r: '#c0392b' });
/** 작은 격자를 1.5배로 — 사다리 계열의 큰 도트 (자리표시, 다른 큰 도트와 폭을 맞춘다) */
const up = (g: Grid): Grid => {
  const h = Math.round(g.length * 1.5), w = Math.round(g[0].length * 1.5);
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => g[Math.floor(y / 1.5)][Math.floor(x / 1.5)]));
};

// 필드 보스 (v1.3, 가칭 · 자리표시): 작은 격자를 크게 그려 쓴다
const mFaust = () => map([
  '..h......h..', '..hh....hh..', '...PPPPPP...', '..PPPPPPPP..', '.PPkPPPPkPP.', '.PPPffffPPP.',
  'PPPPfrrfPPPP', 'PP.PPPPPP.PP', 'P..PPPPPP..P', '...PP..PP...',
], { h: '#e8e0c8', P: '#6a3a9a', k: '#ffcc33', f: '#caa8e8', r: '#2d2a3e' });
const mGolem = () => map([
  '...GGGG...', '..GkGGkG..', '..GGGGGG..', 'GGGGDDGGGG', 'GG.GGGG.GG', 'GG.GDDG.GG', '...GGGG...', '..GG..GG..',
], { G: '#8a8f99', D: '#6a6f79', k: '#ff7a2e' });
const mAnt = () => map([
  '.a......a.', '..a.yy.a..', '...KKKK...', '..KyKKyK..', '..KKKKKK..', '.l.KKKK.l.', 'l.KKKKKK.l', '.lKKKKKKl.', '..l....l..',
], { a: '#2d2a3e', K: '#7a2e1c', y: '#ffcc33', l: '#4a2016' });

// ── 큰 도트 (던전 현장·사원증) ──────────────────────────────
function mushroom({ cap = '#f7902a', shade = '#d4661c', spot = '#ffd08a', body = '#fbe2b4', horn = false, leaf = false }) {
  const g = G(20, 22), d = 2;
  ell(g, 9.5, 8 + d, 9, 7, cap, (x, y) => y <= 9 + d); rect(g, 1, 9 + d, 18, 9 + d, shade);
  ell(g, 6, 4 + d, 1.7, 1.2, spot); ell(g, 12.5, 5 + d, 1.4, 1.1, spot); ell(g, 9.5, 2.4 + d, 1, 0.8, spot);
  if (horn) rect(g, 9, 0, 10, 2, '#fff4dc');
  if (leaf) { rect(g, 8, 0, 9, 1, '#3f9a3f'); px(g, 10, 1, '#7fd07a'); px(g, 11, 0, '#7fd07a'); }
  rect(g, 5, 10 + d, 14, 16 + d, body); rect(g, 5, 17 + d, 7, 17 + d, '#c9a06a'); rect(g, 12, 17 + d, 14, 17 + d, '#c9a06a');
  outline(g);
  rect(g, 7, 12 + d, 7, 13 + d, K); rect(g, 12, 12 + d, 12, 13 + d, K); rect(g, 9, 15 + d, 10, 15 + d, '#c0392b');
  return g;
}
function snail({ shell = '#79c94f', shade = '#4e9a2f', crown = false }) {
  const g = G(22, 18);
  rect(g, 2, 13, 19, 15, '#f3d9a4'); ell(g, 4, 11, 2.5, 3, '#f3d9a4'); rect(g, 3, 6, 3, 9, '#f3d9a4'); rect(g, 6, 6, 6, 9, '#f3d9a4');
  ell(g, 12, 8, 6.5, 6.5, shell, (_x, y) => y <= 14); ell(g, 12, 8, 4.3, 4.3, shade); ell(g, 12, 8, 3.1, 3.1, shell);
  ell(g, 12.5, 8.5, 1.7, 1.7, shade); ell(g, 12.5, 8.5, 0.7, 0.7, shell);
  outline(g); px(g, 3, 6, K); px(g, 6, 6, K); px(g, 3, 11, K); px(g, 5, 11, K);
  if (crown) ([[10, 0], [12, 0], [14, 0], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1]] as const).forEach(([x, y]) => (g[y][x] = CROWN));
  return g;
}
function slime({ c = '#72d46c', shade = '#45a84a', crown = false }) {
  const g = G(20, 20), o = 2;
  ell(g, 9.5, 11 + o, 8.5, 6, c, (_x, y) => y <= 16 + o); rect(g, 2, 16 + o, 17, 16 + o, shade); ell(g, 9.5, 4.5 + o, 1.5, 2, c); ell(g, 6, 8 + o, 1.6, 1, '#ffffffaa');
  outline(g); rect(g, 7, 11 + o, 7, 12 + o, K); rect(g, 12, 11 + o, 12, 12 + o, K); rect(g, 9, 14 + o, 10, 14 + o, K);
  if (crown) { rect(g, 6, 1, 13, 2, CROWN); [6, 9, 10, 13].forEach(x => px(g, x, 0, CROWN)); }
  return g;
}
function stump({ wood = '#a86b3c', leaf = '#5cb85c', crown = false }) {
  const g = G(20, 22), o = 2;
  rect(g, 5, 7 + o, 14, 17 + o, wood); ell(g, 9.5, 7 + o, 5, 1.6, '#e0b27a'); ell(g, 7, 3.5 + o, 2.6, 2, leaf); ell(g, 12, 4 + o, 2.1, 1.8, '#43a043');
  rect(g, 3, 17 + o, 5, 17 + o, '#6b4423'); rect(g, 14, 17 + o, 16, 17 + o, '#6b4423');
  outline(g); rect(g, 7, 11 + o, 7, 12 + o, K); rect(g, 12, 11 + o, 12, 12 + o, K); rect(g, 9, 14 + o, 10, 14 + o, K);
  if (crown) rect(g, 6, 0, 13, 1, CROWN);
  return g;
}
function boar({ fur = '#8a5a3a', dark = '#5f3a22', tusk = '#fff4dc', fire = false }) {
  const g = G(24, 18);
  ell(g, 13, 9, 9, 6, fur); ell(g, 5, 10, 4, 3.5, fur); rect(g, 1, 10, 3, 12, '#e8a08a');
  rect(g, 6, 14, 8, 16, dark); rect(g, 17, 14, 19, 16, dark); rect(g, 11, 14, 12, 16, dark);
  rect(g, 10, 3, 18, 4, dark);
  if (fire) { rect(g, 11, 1, 12, 2, '#ff7a2e'); rect(g, 14, 0, 15, 2, '#ffb02e'); rect(g, 17, 1, 18, 2, '#ff7a2e'); }
  outline(g); px(g, 5, 8, K); px(g, 2, 13, tusk); px(g, 3, 13, tusk);
  return g;
}
function croco({ c = '#5f9e4a', belly = '#e8e0a8', crown = false }) {
  const g = G(26, 16);
  rect(g, 1, 8, 24, 11, c); ell(g, 14, 8, 8, 4, c); rect(g, 1, 11, 10, 12, belly); rect(g, 13, 11, 22, 12, belly);
  rect(g, 4, 13, 5, 14, c); rect(g, 12, 13, 13, 14, c); rect(g, 19, 13, 20, 14, c);
  [3, 6, 9, 16, 19, 22].forEach(x => px(g, x, 7, '#3e7a30'));
  outline(g); rect(g, 7, 6, 7, 7, K); [2, 4, 6].forEach(x => px(g, x, 10, '#ffffff'));
  if (crown) { rect(g, 12, 1, 17, 2, CROWN); [12, 14, 15, 17].forEach(x => px(g, x, 0, CROWN)); }
  return g;
}
function bat({ wing = '#4a3b5b', body = '#6b4a7a' }) {
  const g = G(24, 16);
  for (let i = 0; i < 9; i++) { rect(g, i, 3 + Math.floor(i / 2), i, 9 - Math.floor(i / 3), wing); rect(g, 23 - i, 3 + Math.floor(i / 2), 23 - i, 9 - Math.floor(i / 3), wing); }
  ell(g, 11.5, 8, 4, 4.5, body); rect(g, 8, 2, 9, 4, body); rect(g, 14, 2, 15, 4, body);
  outline(g); px(g, 10, 7, '#ffe14d'); px(g, 13, 7, '#ffe14d'); px(g, 11, 10, '#ffffff'); px(g, 12, 10, '#ffffff');
  return g;
}
function drake({ c = '#6aa0c8', belly = '#e8e0c8', crown = false }) {
  const g = G(26, 20), o = 2;
  ell(g, 14, 10 + o, 8, 5, c); ell(g, 5, 6 + o, 4, 3.4, c); rect(g, 7, 8 + o, 9, 11 + o, c);
  rect(g, 21, 7 + o, 24, 9 + o, c); rect(g, 10, 13 + o, 18, 14 + o, belly);
  rect(g, 9, 15 + o, 10, 17 + o, c); rect(g, 18, 15 + o, 19, 17 + o, c);
  rect(g, 3, 2 + o, 3, 3 + o, '#e8e0c8'); rect(g, 6, 2 + o, 6, 3 + o, '#e8e0c8');
  ell(g, 15, 5 + o, 4, 2.5, '#ffffff66');
  outline(g); px(g, 4, 6 + o, '#ffcc33'); px(g, 1, 8 + o, K);
  if (crown) { rect(g, 2, 0, 7, 1, CROWN); }
  return g;
}
function eye({ c = '#8a5aa8', iris = '#d8433a' }) {
  const g = G(22, 20);
  ell(g, 11, 9, 7, 7, c); rect(g, 1, 5, 4, 7, '#4a3b5b'); rect(g, 17, 5, 20, 7, '#4a3b5b'); rect(g, 0, 4, 1, 5, '#4a3b5b'); rect(g, 20, 4, 21, 5, '#4a3b5b');
  ell(g, 11, 9, 4.6, 4.2, '#ffffff'); ell(g, 11, 9, 2.4, 2.4, iris); ell(g, 11, 9, 1, 1, K);
  rect(g, 8, 16, 8, 18, c); rect(g, 13, 16, 13, 18, c);
  outline(g); px(g, 9, 7, '#ffffff');
  return g;
}
function adv({ H = '#4a2e1c', C = '#e0533d', P = '#3d4a6b' }) {
  const g = G(14, 21);
  rect(g, 4, 16, 5, 19, P); rect(g, 8, 16, 9, 19, P); rect(g, 3, 11, 10, 15, C);
  rect(g, 2, 12, 2, 14, '#f6d2b0'); rect(g, 11, 12, 11, 14, '#f6d2b0'); ell(g, 6.5, 6.5, 5, 5, '#f6d2b0');
  ell(g, 6.5, 4.6, 5.3, 3.7, H, (_x, y) => y <= 5); rect(g, 1, 5, 2, 8, H); rect(g, 11, 5, 12, 8, H);
  outline(g); rect(g, 4, 7, 4, 8, K); rect(g, 9, 7, 9, 8, K); rect(g, 6, 10, 7, 10, '#d98b7a');
  return g;
}
function mom() { // 머쉬맘 사장 (자리표시)
  const g = mushroom({ cap: '#e8578a', shade: '#b83a66', spot: '#ffd1e0', body: '#fbe2b4' });
  rect(g, 9, 19, 10, 21, '#2d4a8a');
  return g;
}
function oren() { // 비서 오렌 (주황버섯 + 사원증 목걸이)
  const g = mushroom({});
  rect(g, 8, 18, 11, 20, '#5DB8EC'); px(g, 9, 17, '#2d2a3e'); px(g, 10, 17, '#2d2a3e');
  return g;
}
function balrog() {
  const g = G(26, 24);
  ell(g, 13, 14, 9, 8.5, '#6b2a3a'); rect(g, 3, 2, 5, 8, '#c9c0a8'); rect(g, 20, 2, 22, 8, '#c9c0a8');
  rect(g, 0, 10, 3, 16, '#4a2030'); rect(g, 22, 10, 25, 16, '#4a2030');
  rect(g, 8, 21, 10, 23, '#4a2030'); rect(g, 16, 21, 18, 23, '#4a2030');
  outline(g); rect(g, 8, 11, 9, 12, CROWN); rect(g, 16, 11, 17, 12, CROWN); rect(g, 10, 17, 15, 17, K);
  return g;
}

const SPR: Record<string, () => Grid> = {
  // 작은 도트
  'm:snail': () => mSnail('#79c94f', '#4e9a2f'), 'm:bsnail': () => mSnail('#4aa3e0', '#2a74b0'),
  'm:rsnail': () => mSnail('#e5533f', '#a8321f'), 'm:mano': () => mSnail('#c0392b', '#7b1e14', true),
  'm:mush': () => mMush('#f7902a', '#d4661c', '#ffd08a', '#fbe2b4'),
  'm:horn': () => mMush('#c46a33', '#97491f', '#f0b07a', '#fbe2b4', true),
  'm:zombie': () => mMush('#7f93ab', '#5b6d86', '#b8c7d9', '#cfd9c6'),
  'm:gmush': () => mMush('#6cc35a', '#4a9a3a', '#d6f5c8', '#fbe2b4'),
  'm:moss': () => mMush('#4f8a3a', '#356a28', '#9fd07a', '#e8dcb4', false, true),
  'm:keeper': () => mMush('#2f6b3a', '#1f4f28', '#ffe08a', '#e8dcb4', true, true),
  'm:slime': () => mSlime('#72d46c', '#45a84a'), 'm:slime2': () => mSlime('#5ab4f0', '#2f86c4'),
  'm:slime3': () => mSlime('#a97be0', '#7a4fbf'), 'm:kslime': () => mSlime('#62c35c', '#3d9440', true),
  'm:stump': () => mStump('#a86b3c', '#5cb85c'), 'm:dstump': () => mStump('#6b5448', '#4f7f4f'),
  'm:astump': () => mStump('#8a4a3a', '#c07a3a'), 'm:stumpy': () => mStump('#a86b3c', '#5cb85c', true),
  'm:boar': () => mBoar('#8a5a3a', '#5f3a22', '#fff4dc'), 'm:fboar': () => mBoar('#c0502a', '#7a2e18', '#ffd08a'),
  'm:iboar': () => mBoar('#7a8494', '#4a5262', '#ffffff'),
  'm:ligator': () => mCroco('#7fb85a', '#e8e0a8'), 'm:croco': () => mCroco('#4f8a3a', '#d8d098'),
  'm:gcroco': () => mCroco('#c9a23a', '#f5e6a8'), 'm:kcroco': () => mCroco('#2f6b3a', '#e8e0a8', true),
  'm:stirge': () => mBat('#4a3b5b', '#6b4a7a'), 'm:dstirge': () => mBat('#2d2a3e', '#4a3b5b'), 'm:bstirge': () => mBat('#7a1e2a', '#a8323a'),
  'm:drake': () => mDrake('#6aa05a', '#e8e0c8'), 'm:rdrake': () => mDrake('#c0503a', '#f0d0a8'),
  'm:idrake': () => mDrake('#6aa0c8', '#e8f0f8'), 'm:ddrake': () => mDrake('#3a2e4a', '#8a7aa8', true),
  'm:eye': () => mEye('#8a5aa8', '#d8433a'), 'm:ceye': () => mEye('#5a3a6a', '#7fd07a'), 'm:coldeye': () => mEye('#5a8ab8', '#3fa9f5'),
  'm:balrog': () => mBalrog(),
  'm:pig': () => mPig('#f5b5c0', '#d9899a'), 'm:rpig': () => mPig('#f5b5c0', '#d9899a', 'ribbon'), 'm:ihog': () => mPig('#8a6a5a', '#5f463a', 'iron'),
  'm:octo': () => mOcto('#e0707a', '#b84a5a'), 'm:bocto': () => mOcto('#b0508a', '#7a2f60'), 'm:kocto': () => mOcto('#5a6ac0', '#3a4a8a', true),
  'm:necki': () => mSnake('#8ac05a', '#e8e0a8'), 'm:necki2': () => mSnake('#4f8a5a', '#d8d098'), 'm:kneck': () => mSnake('#5a3a8a', '#c9a23a', true),
  'm:lupin': () => mMonkey('#8a5a3a', '#f0c89a', '#8a5a3a'), 'm:zlupin': () => mMonkey('#6a7a6a', '#c9d2b0', '#6a7a6a'), 'm:glupin': () => mMonkey('#c9a23a', '#f5e6a8', '#c9a23a'),
  'm:faust': () => mFaust(), 'm:golem': () => mGolem(), 'm:dyle': () => mCroco('#2a6b6b', '#c8e0a0', true), 'm:antking': () => mAnt(),
  // 큰 도트
  mush: () => mushroom({}), horn: () => mushroom({ cap: '#c46a33', shade: '#97491f', spot: '#f0b07a', horn: true }),
  zombie: () => mushroom({ cap: '#7f93ab', shade: '#5b6d86', spot: '#b8c7d9', body: '#cfd9c6' }),
  gmush: () => mushroom({ cap: '#6cc35a', shade: '#4a9a3a', spot: '#d6f5c8' }),
  moss: () => mushroom({ cap: '#4f8a3a', shade: '#356a28', spot: '#9fd07a', body: '#e8dcb4', leaf: true }),
  keeper: () => mushroom({ cap: '#2f6b3a', shade: '#1f4f28', spot: '#ffe08a', body: '#e8dcb4', horn: true, leaf: true }),
  snail: () => snail({}), bsnail: () => snail({ shell: '#4aa3e0', shade: '#2a74b0' }), rsnail: () => snail({ shell: '#e5533f', shade: '#a8321f' }),
  mano: () => snail({ shell: '#c0392b', shade: '#7b1e14', crown: true }),
  slime: () => slime({}), slime2: () => slime({ c: '#5ab4f0', shade: '#2f86c4' }), slime3: () => slime({ c: '#a97be0', shade: '#7a4fbf' }),
  kslime: () => slime({ c: '#62c35c', shade: '#3d9440', crown: true }),
  stump: () => stump({}), dstump: () => stump({ wood: '#6b5448', leaf: '#4f7f4f' }), astump: () => stump({ wood: '#8a4a3a', leaf: '#c07a3a' }),
  stumpy: () => stump({ crown: true }),
  boar: () => boar({}), fboar: () => boar({ fur: '#c0502a', dark: '#7a2e18', tusk: '#ffd08a', fire: true }), iboar: () => boar({ fur: '#7a8494', dark: '#4a5262', tusk: '#ffffff' }),
  ligator: () => croco({ c: '#7fb85a' }), croco: () => croco({ c: '#4f8a3a', belly: '#d8d098' }), gcroco: () => croco({ c: '#c9a23a', belly: '#f5e6a8' }),
  kcroco: () => croco({ c: '#2f6b3a', crown: true }),
  stirge: () => bat({}), dstirge: () => bat({ wing: '#2d2a3e', body: '#4a3b5b' }), bstirge: () => bat({ wing: '#7a1e2a', body: '#a8323a' }),
  drake: () => drake({ c: '#6aa05a' }), rdrake: () => drake({ c: '#c0503a', belly: '#f0d0a8' }), idrake: () => drake({ c: '#6aa0c8', belly: '#e8f0f8' }),
  ddrake: () => drake({ c: '#3a2e4a', belly: '#8a7aa8', crown: true }),
  eye: () => eye({}), ceye: () => eye({ c: '#5a3a6a', iris: '#7fd07a' }), coldeye: () => eye({ c: '#5a8ab8', iris: '#3fa9f5' }),
  pig: () => up(SPR['m:pig']()), rpig: () => up(SPR['m:rpig']()), ihog: () => up(SPR['m:ihog']()),
  octo: () => up(SPR['m:octo']()), bocto: () => up(SPR['m:bocto']()), kocto: () => up(SPR['m:kocto']()),
  necki: () => up(SPR['m:necki']()), necki2: () => up(SPR['m:necki2']()), kneck: () => up(SPR['m:kneck']()),
  lupin: () => up(SPR['m:lupin']()), zlupin: () => up(SPR['m:zlupin']()), glupin: () => up(SPR['m:glupin']()),
  mom: () => mom(), oren: () => oren(), balrog: () => balrog(),
};
for (let i = 0; i < LOOKS.length; i++) { SPR['m:a' + i] = () => mAdv(i); SPR['a' + i] = () => adv(LOOKS[i]); }

const cache: Record<string, string> = {};
const gridCache: Record<string, Grid> = {};
const grid = (key: string): Grid => {
  if (!SPR[key]) throw new Error('no sprite ' + key);
  return (gridCache[key] ||= SPR[key]());
};
function draw(key: string, s: number, fill?: string): string {
  const g = grid(key);
  const cv = document.createElement('canvas');
  cv.width = g[0].length * s; cv.height = g.length * s;
  const c = cv.getContext('2d')!;
  g.forEach((r, y) => r.forEach((v, x) => { if (v) { c.fillStyle = fill || v; c.fillRect(x * s, y * s, s, s); } }));
  return cv.toDataURL();
}
export const ART = {
  url(key: string, s: number): string { return (cache[key + '@' + s] ||= draw(key, s)); },
  size(key: string, s: number): [number, number] { const g = grid(key); return [g[0].length * s, g.length * s]; },
  /** 실루엣 (도감 빈칸, 처음 보는 진화 단계) */
  silhouette(key: string, s: number): string { return (cache[key + '@sil' + s] ||= draw(key, s, '#b9c3cf')); },
  has: (key: string) => !!SPR[key],
  LOOKS: LOOKS.length,
};
