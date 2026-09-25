/*
 * 자리표시용 도트 — 코드로 그린다. 실제 게임은 메이플스토리 월드 공식 리소스를 쓴다.
 * ART.url(key, scale) → 이미지 dataURL (캐시)
 *   작은 도트(m:*)는 월드 길, 큰 도트는 던전 현장·사원증·리포트에 쓴다.
 */
(function (root) {
  'use strict';
  const K = '#3b2a20';
  const G = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));
  function ell(g, cx, cy, rx, ry, c, f) {
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (!f || f(x, y))) g[y][x] = c;
  }
  function rect(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && x >= 0 && x < g[0].length) g[y][x] = c; }
  function px(g, x, y, c) { if (g[y] && x >= 0 && x < g[0].length) g[y][x] = c; }
  function outline(g) {
    const h = g.length, w = g[0].length, o = g.map(r => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x]) {
      if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) o[y][x] = K;
    }
    for (let y = 0; y < h; y++) g[y] = o[y];
    return g;
  }
  /** 문자 지도 → 격자 (테두리 1칸 여백 + 자동 외곽선) */
  function map(rows, pal) {
    const w = rows[0].length + 2, h = rows.length + 2, g = G(w, h);
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') g[y + 1][x + 1] = pal[ch] || K; }));
    return outline(g);
  }

  // ── 작은 도트 (월드 길) ───────────────────────────────────
  const LOOKS = [
    { H: '#4a2e1c', C: '#e0533d', P: '#3d4a6b' }, { H: '#f0c24a', C: '#4a78d8', P: '#3d4a6b' },
    { H: '#2b2b33', C: '#4cae4c', P: '#5b4a3b' }, { H: '#a0522d', C: '#8b5cc4', P: '#3d4a6b' },
    { H: '#e8e2d6', C: '#2a9d9a', P: '#4a3b5b' }, { H: '#d9534f', C: '#f0a030', P: '#3d4a6b' },
  ];
  const mAdv = l => map([
    '..HHHH..',
    '.HHHHHH.',
    'HHHHHHHH',
    'HSSSSSSH',
    'HSKSSKSH',
    '.SSSSSS.',
    '..CCCC..',
    'SCCCCCCS',
    'SCCCCCCS',
    '.CCCCCC.',
    '.PP..PP.',
    '.PP..PP.',
  ], Object.assign({ S: '#f6d2b0', K: '#2d2a3e' }, LOOKS[l]));
  const mSnail = (S, s, crown) => {
    const rows = [
      '.k..k.......',
      '.b..b..SSS..',
      '.bbbb.SsssS.',
      'bbbbbSsSSsSS',
      'bbbbbSsSsSsS',
      'bbbbbSSssSSS',
      'bbbbbbSSSSSb',
      'bbbbbbbbbbbb',
    ];
    if (crown) rows.unshift('.......y.y.y', '.......yyyyy');
    return map(rows, { k: '#2d2a3e', b: '#f3d9a4', S, s, y: '#ffcc33' });
  };
  const mMush = (C, D, w, B, horn) => {
    const rows = [
      '...CCCCCC...',
      '.CCwwCCCCCC.',
      'CCCwwCCCwCCC',
      'CCCCCCCCCCCC',
      'DDDDDDDDDDDD',
      '..BBBBBBBB..',
      '..BkBBBBkB..',
      '..BBBrrBBB..',
      '..BBBBBBBB..',
      '..ff....ff..',
    ];
    if (horn) rows.unshift('.....hh.....');
    return map(rows, { C, D, w, B, k: '#2d2a3e', r: '#c0392b', f: '#c9a06a', h: '#fff4dc' });
  };
  const mSlime = (G1, D, crown) => {
    const rows = [
      '....GG.....',
      '...GGGG....',
      '.GGGGGGGGG.',
      'GGlGGGGGGGG',
      'GGGkGGGkGGG',
      'GGGGGGGGGGG',
      'GGGGrrrGGGG',
      '.DDDDDDDDD.',
    ];
    if (crown) rows.unshift('..y.y.y....', '..yyyyy....');
    return map(rows, { G: G1, D, l: '#ffffffaa', k: '#2d2a3e', r: '#2d2a3e', y: '#ffcc33' });
  };
  const mStump = (W, L, crown) => {
    const rows = [
      '..LL.ll...',
      '.LLLLlll..',
      '..TTTTTT..',
      '.WWWWWWWW.',
      '.WkWWWWkW.',
      '.WWWWWWWW.',
      '.WWWrrWWW.',
      '.WWWWWWWW.',
      'RR......RR',
    ];
    if (crown) rows.unshift('..y.y.y...', '..yyyyy...');
    return map(rows, { W, L, l: '#43a043', T: '#e0b27a', k: '#2d2a3e', r: '#2d2a3e', R: '#6b4423', y: '#ffcc33' });
  };

  // ── 큰 도트 (던전 현장·사원증) ────────────────────────────
  function mushroom({ cap = '#f7902a', shade = '#d4661c', spot = '#ffd08a', body = '#fbe2b4', horn = false }) {
    const g = G(20, 22), d = 2;
    ell(g, 9.5, 8 + d, 9, 7, cap, (x, y) => y <= 9 + d); rect(g, 1, 9 + d, 18, 9 + d, shade);
    ell(g, 6, 4 + d, 1.7, 1.2, spot); ell(g, 12.5, 5 + d, 1.4, 1.1, spot); ell(g, 9.5, 2.4 + d, 1, 0.8, spot);
    if (horn) rect(g, 9, 0, 10, 2, '#fff4dc');
    rect(g, 5, 10 + d, 14, 16 + d, body); rect(g, 5, 17 + d, 7, 17 + d, '#c9a06a'); rect(g, 12, 17 + d, 14, 17 + d, '#c9a06a');
    outline(g);
    rect(g, 7, 12 + d, 7, 13 + d, K); rect(g, 12, 12 + d, 12, 13 + d, K); rect(g, 9, 15 + d, 10, 15 + d, '#c0392b');
    return g;
  }
  function snail({ shell = '#79c94f', shade = '#4e9a2f', crown = false }) {
    const g = G(22, 18);
    rect(g, 2, 13, 19, 15, '#f3d9a4'); ell(g, 4, 11, 2.5, 3, '#f3d9a4'); rect(g, 3, 6, 3, 9, '#f3d9a4'); rect(g, 6, 6, 6, 9, '#f3d9a4');
    ell(g, 12, 8, 6.5, 6.5, shell, (x, y) => y <= 14); ell(g, 12, 8, 4.3, 4.3, shade); ell(g, 12, 8, 3.1, 3.1, shell);
    ell(g, 12.5, 8.5, 1.7, 1.7, shade); ell(g, 12.5, 8.5, 0.7, 0.7, shell);
    outline(g); px(g, 3, 6, K); px(g, 6, 6, K); px(g, 3, 11, K); px(g, 5, 11, K);
    if (crown) [[10, 0], [12, 0], [14, 0], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1]].forEach(([x, y]) => (g[y][x] = '#ffcc33'));
    return g;
  }
  function slime({ c = '#72d46c', shade = '#45a84a', crown = false }) {
    const g = G(20, 20), o = 2;
    ell(g, 9.5, 11 + o, 8.5, 6, c, (x, y) => y <= 16 + o); rect(g, 2, 16 + o, 17, 16 + o, shade); ell(g, 9.5, 4.5 + o, 1.5, 2, c); ell(g, 6, 8 + o, 1.6, 1, '#ffffffaa');
    outline(g); rect(g, 7, 11 + o, 7, 12 + o, K); rect(g, 12, 11 + o, 12, 12 + o, K); rect(g, 9, 14 + o, 10, 14 + o, K);
    if (crown) { rect(g, 6, 1, 13, 2, '#ffcc33'); [6, 9, 10, 13].forEach(x => px(g, x, 0, '#ffcc33')); }
    return g;
  }
  function stump({ wood = '#a86b3c', leaf = '#5cb85c', crown = false }) {
    const g = G(20, 22), o = 2;
    rect(g, 5, 7 + o, 14, 17 + o, wood); ell(g, 9.5, 7 + o, 5, 1.6, '#e0b27a'); ell(g, 7, 3.5 + o, 2.6, 2, leaf); ell(g, 12, 4 + o, 2.1, 1.8, '#43a043');
    rect(g, 3, 17 + o, 5, 17 + o, '#6b4423'); rect(g, 14, 17 + o, 16, 17 + o, '#6b4423');
    outline(g); rect(g, 7, 11 + o, 7, 12 + o, K); rect(g, 12, 11 + o, 12, 12 + o, K); rect(g, 9, 14 + o, 10, 14 + o, K);
    if (crown) { rect(g, 6, 0, 13, 1, '#ffcc33'); }
    return g;
  }
  function adv({ H = '#4a2e1c', C = '#e0533d', P = '#3d4a6b' }) {
    const g = G(14, 21);
    rect(g, 4, 16, 5, 19, P); rect(g, 8, 16, 9, 19, P); rect(g, 3, 11, 10, 15, C);
    rect(g, 2, 12, 2, 14, '#f6d2b0'); rect(g, 11, 12, 11, 14, '#f6d2b0'); ell(g, 6.5, 6.5, 5, 5, '#f6d2b0');
    ell(g, 6.5, 4.6, 5.3, 3.7, H, (x, y) => y <= 5); rect(g, 1, 5, 2, 8, H); rect(g, 11, 5, 12, 8, H);
    outline(g); rect(g, 4, 7, 4, 8, K); rect(g, 9, 7, 9, 8, K); rect(g, 6, 10, 7, 10, '#d98b7a');
    return g;
  }
  function mom() { // 머쉬맘 사장 (자리표시)
    const g = mushroom({ cap: '#e8578a', shade: '#b83a66', spot: '#ffd1e0', body: '#fbe2b4' });
    rect(g, 9, 17, 10, 19, '#2d4a8a');
    return g;
  }
  function oren() { // 비서 오렌 (주황버섯 + 사원증 목걸이)
    const g = mushroom({});
    rect(g, 8, 18, 11, 20, '#5DB8EC'); px(g, 9, 17, '#2d2a3e'); px(g, 10, 17, '#2d2a3e');
    return g;
  }
  function balrog() {
    const g = G(22, 22);
    ell(g, 11, 12, 8, 8, '#6b2a3a'); rect(g, 3, 2, 5, 7, '#c9c0a8'); rect(g, 16, 2, 18, 7, '#c9c0a8');
    outline(g); rect(g, 7, 10, 8, 11, '#ffcc33'); rect(g, 13, 10, 14, 11, '#ffcc33'); rect(g, 8, 15, 13, 15, K);
    return g;
  }

  const SPR = {
    // 작은 도트
    'm:snail': () => mSnail('#79c94f', '#4e9a2f'), 'm:bsnail': () => mSnail('#4aa3e0', '#2a74b0'),
    'm:rsnail': () => mSnail('#e5533f', '#a8321f'), 'm:mano': () => mSnail('#c0392b', '#7b1e14', true),
    'm:mush': () => mMush('#f7902a', '#d4661c', '#ffd08a', '#fbe2b4'),
    'm:horn': () => mMush('#c46a33', '#97491f', '#f0b07a', '#fbe2b4', true),
    'm:zombie': () => mMush('#7f93ab', '#5b6d86', '#b8c7d9', '#cfd9c6'),
    'm:slime': () => mSlime('#72d46c', '#45a84a'), 'm:slime2': () => mSlime('#5ab4f0', '#2f86c4'),
    'm:slime3': () => mSlime('#a97be0', '#7a4fbf'), 'm:kslime': () => mSlime('#62c35c', '#3d9440', true),
    'm:stump': () => mStump('#a86b3c', '#5cb85c'), 'm:dstump': () => mStump('#6b5448', '#4f7f4f'),
    'm:astump': () => mStump('#8a4a3a', '#c07a3a'), 'm:stumpy': () => mStump('#a86b3c', '#5cb85c', true),
    // 큰 도트
    mush: () => mushroom({}), horn: () => mushroom({ cap: '#c46a33', shade: '#97491f', spot: '#f0b07a', horn: true }),
    zombie: () => mushroom({ cap: '#7f93ab', shade: '#5b6d86', spot: '#b8c7d9', body: '#cfd9c6' }),
    snail: () => snail({}), bsnail: () => snail({ shell: '#4aa3e0', shade: '#2a74b0' }), rsnail: () => snail({ shell: '#e5533f', shade: '#a8321f' }),
    mano: () => snail({ shell: '#c0392b', shade: '#7b1e14', crown: true }),
    slime: () => slime({}), slime2: () => slime({ c: '#5ab4f0', shade: '#2f86c4' }), slime3: () => slime({ c: '#a97be0', shade: '#7a4fbf' }),
    kslime: () => slime({ c: '#62c35c', shade: '#3d9440', crown: true }),
    stump: () => stump({}), dstump: () => stump({ wood: '#6b5448', leaf: '#4f7f4f' }), astump: () => stump({ wood: '#8a4a3a', leaf: '#c07a3a' }),
    stumpy: () => stump({ crown: true }),
    mom: () => mom(), oren: () => oren(), balrog: () => balrog(),
  };
  for (let i = 0; i < LOOKS.length; i++) { SPR['m:a' + i] = () => mAdv(i); SPR['a' + i] = () => adv(LOOKS[i]); }

  const cache = {};
  function canvas(key, s) {
    const g = SPR[key]();
    const cv = document.createElement('canvas');
    cv.width = g[0].length * s; cv.height = g.length * s;
    const c = cv.getContext('2d');
    g.forEach((r, y) => r.forEach((v, x) => { if (v) { c.fillStyle = v; c.fillRect(x * s, y * s, s, s); } }));
    return cv;
  }
  function url(key, s) {
    const k = key + '@' + s;
    if (!cache[k]) cache[k] = canvas(key, s).toDataURL();
    return cache[k];
  }
  function size(key, s) { const g = SPR[key](); return [g[0].length * s, g.length * s]; }
  /** 실루엣 (도감 빈칸) */
  function silhouette(key, s) {
    const k = key + '@sil' + s;
    if (!cache[k]) {
      const g = SPR[key](), cv = document.createElement('canvas');
      cv.width = g[0].length * s; cv.height = g.length * s;
      const c = cv.getContext('2d'); c.fillStyle = '#b9c3cf';
      g.forEach((r, y) => r.forEach((v, x) => { if (v) c.fillRect(x * s, y * s, s, s); }));
      cache[k] = cv.toDataURL();
    }
    return cache[k];
  }
  root.ART = { url, size, silhouette, LOOKS: LOOKS.length };
})(window);
