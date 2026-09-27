/*
 * 지역 배경 — 자체 픽셀아트 (규칙 v1.7, G1). 공식 리소스를 쓰지 않는다. 한 팔레트(PAL), 한 픽셀 격자(도트 3배).
 *
 * 지역마다 네 겹이 다르다: 먼 배경(far) · 바닥(ground) · 발판(plat) · 소품(props).
 *   1 헤네시스  햇살 들판 — 둥근 언덕, 풀밭, 통나무 발판, 둥근 나무·버섯집·푯말
 *   2 엘리니아  깊은 숲 — 키 큰 나무 기둥과 우듬지, 이끼 땅, 가지 발판, 소나무·덩굴 등불·큰 버섯
 *   3 페리온    바위 벌판 — 붉은 바위 첨탑, 마른 돌땅, 석판 발판, 바위·토템·마른 덤불·모닥불
 *   4 커닝시티  회색 도시 — 창 켜진 건물 실루엣, 포장 도로, 철골 발판, 가로등·공사 콘·지하철 표지·쓰레기통
 *   5 슬리피우드 어두운 숲 — 죽은 나무와 검은 산, 보랏빛 이끼 땅, 검은 돌 발판, 비석·등롱·개미 둔덕·신전 기둥
 * 월드 길(S1)의 지역 띠와 던전 현장(S2)이 같은 타일을 쓴다. 세부는 결정에 쓰이지 않는 그림이다(P4): 지역이 어디인지 읽히는 것이 목적이다.
 */
import { G, K, map, px, rect, ell, outline, drawGrid, type Grid } from './art';

/** 한 팔레트. 새 그림은 여기서만 색을 고른다 */
export const PAL = {
  ink: '#2D2A3E', out: K, white: '#FFFFFF',
  g1: '#2f6b3a', g2: '#3f9a3f', g3: '#5cb85c', g4: '#7fd07a', g5: '#b8f5a5',
  b1: '#4d2e12', b2: '#7a4b22', b3: '#a86b3c', b4: '#c9a06a', b5: '#e0b27a',
  s1: '#3b4250', s2: '#4f5b69', s3: '#6c7890', s4: '#8a8f99', s5: '#b9c3cf', s6: '#e3ecf4',
  o1: '#6b3320', o2: '#8a4a3a', o3: '#c0502a', o4: '#c98b55', o5: '#e8b07a', o6: '#f7d3a0',
  p1: '#231a33', p2: '#3a2e4a', p3: '#5b4a7a', p4: '#8B6CFF', p5: '#a391c0', p6: '#c9b8e8',
  y1: '#a67c00', y2: '#FFC531', y3: '#ffe08a', y4: '#fff7c2',
  r1: '#c0392b', r2: '#e0533d', r3: '#ff8a80',
  bl1: '#2a74b0', bl2: '#4aa3e0', bl3: '#9ad8ff',
  t1: '#2a9d9a', t2: '#6cc2a0', m1: '#7f93ab', bone: '#e8e0c8', fire: '#ff7a2e',
};
const P = PAL;

/** 결정적 잡음 (시드는 지역 번호). 같은 지역은 언제나 같은 그림이다 */
function noise(seed: number) {
  let t = (seed * 2654435761) >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), t | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
/** 가로로 이어 붙일 수 있게, 열마다 같은 값이 나오는 잡음 */
const fill = (g: Grid, c: string) => { for (const r of g) r.fill(c); };

// ── 먼 배경 (far): 128 × 44, 아래가 땅에 닿는다 ─────────────────
const FW = 128, FH = 44;
function far1(): Grid { // 둥근 언덕 둘
  const g = G(FW, FH), rnd = noise(1);
  for (let x = 0; x < FW; x++) {
    const h1 = 18 + Math.round(9 * Math.sin((x / FW) * Math.PI * 2)), h2 = 10 + Math.round(6 * Math.sin((x / FW) * Math.PI * 4 + 1));
    for (let y = FH - h1; y < FH; y++) px(g, x, y, P.g3);
    for (let y = FH - h2; y < FH; y++) px(g, x, y, P.g4);
  }
  for (let i = 0; i < 9; i++) { // 언덕 위 작은 나무
    const x = Math.floor(rnd() * FW), h = 18 + Math.round(9 * Math.sin((x / FW) * Math.PI * 2)), y = FH - h;
    rect(g, x, y - 5, x + 2, y - 2, P.g2); px(g, x + 1, y - 1, P.b2); px(g, x + 1, y, P.b2);
  }
  for (let i = 0; i < 14; i++) px(g, Math.floor(rnd() * FW), FH - 3 - Math.floor(rnd() * 6), P.g5); // 풀꽃
  return g;
}
function far2(): Grid { // 키 큰 나무 기둥과 우듬지
  const g = G(FW, FH), rnd = noise(2);
  fill(g, P.g1);
  for (let x = 0; x < FW; x += 12) {
    const w = 3 + Math.floor(rnd() * 2), top = 2 + Math.floor(rnd() * 8);
    rect(g, x + 4, top + 8, x + 4 + w, FH - 1, P.b1);
    px(g, x + 5, top + 9, P.b2);
    ell(g, x + 6, top + 6, 7, 6, P.g2); ell(g, x + 5, top + 4, 4, 3, P.g3);
  }
  for (let i = 0; i < 30; i++) px(g, Math.floor(rnd() * FW), Math.floor(rnd() * 20), P.g3);
  for (let y = FH - 6; y < FH; y++) for (let x = 0; x < FW; x++) if ((x + y) % 5 === 0) px(g, x, y, P.g2);
  return g;
}
function far3(): Grid { // 붉은 바위 첨탑
  const g = G(FW, FH), rnd = noise(3);
  for (let x = 0; x < FW; x++) { const h = 8 + Math.round(4 * Math.sin(x / 9)); for (let y = FH - h; y < FH; y++) px(g, x, y, P.o4); }
  let x = 2;
  while (x < FW - 6) {
    const w = 6 + Math.floor(rnd() * 10), h = 14 + Math.floor(rnd() * 24);
    for (let i = 0; i < w; i++) { const hh = h - Math.abs(i - w / 2) * (2 + Math.floor(rnd() * 2)); for (let y = FH - Math.max(6, hh); y < FH; y++) px(g, x + i, y, (i + y) % 7 === 0 ? P.o2 : P.o3); }
    x += w + 2 + Math.floor(rnd() * 6);
  }
  for (let i = 0; i < 20; i++) px(g, Math.floor(rnd() * FW), FH - 1 - Math.floor(rnd() * 5), P.o5);
  return g;
}
function far4(): Grid { // 창 켜진 건물
  const g = G(FW, FH), rnd = noise(4);
  let x = 0;
  while (x < FW) {
    const w = 8 + Math.floor(rnd() * 10), h = 12 + Math.floor(rnd() * 28), c = rnd() < 0.5 ? P.s2 : P.s3;
    rect(g, x, FH - h, x + w - 2, FH - 1, c);
    for (let yy = FH - h + 2; yy < FH - 2; yy += 3) for (let xx = x + 1; xx < x + w - 3; xx += 3) px(g, xx, yy, rnd() < 0.55 ? P.y3 : P.s1);
    if (rnd() < 0.4) rect(g, x + 2, FH - h - 4, x + 2, FH - h - 1, P.s4); // 안테나
    x += w;
  }
  for (let xx = 0; xx < FW; xx++) px(g, xx, FH - 1, P.s1);
  return g;
}
function far5(): Grid { // 검은 산과 죽은 나무
  const g = G(FW, FH), rnd = noise(5);
  for (let x = 0; x < FW; x++) { const h = 14 + Math.round(10 * Math.abs(Math.sin(x / 13))); for (let y = FH - h; y < FH; y++) px(g, x, y, P.p2); }
  for (let x = 0; x < FW; x++) { const h = 6 + Math.round(4 * Math.abs(Math.sin(x / 7 + 2))); for (let y = FH - h; y < FH; y++) px(g, x, y, P.p1); }
  for (let i = 0; i < 9; i++) {
    const x = 4 + Math.floor(rnd() * (FW - 8)), h = 10 + Math.floor(rnd() * 12);
    rect(g, x, FH - h, x + 1, FH - 1, P.p1);
    rect(g, x - 3, FH - h + 3, x, FH - h + 3, P.p1); rect(g, x + 1, FH - h + 6, x + 4, FH - h + 6, P.p1);
    px(g, x - 3, FH - h + 2, P.p1); px(g, x + 4, FH - h + 5, P.p1);
  }
  for (let i = 0; i < 10; i++) px(g, Math.floor(rnd() * FW), Math.floor(rnd() * 14), P.p5); // 별
  return g;
}

// ── 바닥 (ground): 48 × 36. 위 10줄이 표면, 아래는 흙 ───────────
const GW = 48, GH = 36;
function ground(n: number): Grid {
  const g = G(GW, GH), rnd = noise(10 + n);
  const [top, top2, soil, soil2] = [[P.g3, P.g4, P.b3, P.b2], [P.g1, P.g2, P.b2, P.b1], [P.o4, P.o5, P.o2, P.o1], [P.s4, P.s5, P.s2, P.s1], [P.p3, P.p5, P.p2, P.p1]][n - 1];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) px(g, x, y, y < 10 ? top : soil);
  for (let i = 0; i < 50; i++) px(g, Math.floor(rnd() * GW), Math.floor(rnd() * 9), top2);
  for (let i = 0; i < 40; i++) { const x = Math.floor(rnd() * GW), y = 12 + Math.floor(rnd() * 22); px(g, x, y, soil2); px(g, x + 1, y, soil2); }
  for (let x = 0; x < GW; x++) px(g, x, 10, soil2); // 표면 아래 그늘 한 줄
  if (n === 1) for (let i = 0; i < 6; i++) { const x = Math.floor(rnd() * GW); px(g, x, 2 + Math.floor(rnd() * 5), rnd() < 0.5 ? P.y3 : P.r3); } // 들꽃
  if (n === 2) for (let i = 0; i < 5; i++) { const x = Math.floor(rnd() * GW); rect(g, x, 11, x + 4 + Math.floor(rnd() * 5), 12, P.b1); } // 뿌리
  if (n === 3) for (let i = 0; i < 8; i++) { const x = Math.floor(rnd() * GW), y = 2 + Math.floor(rnd() * 6); rect(g, x, y, x + 2, y, P.o3); } // 갈라진 돌
  if (n === 4) { for (let x = 0; x < GW; x++) if (x % 12 < 6) px(g, x, 5, P.y2); for (let x = 0; x < GW; x++) if (x % 16 === 0) rect(g, x, 0, x, 9, P.s3); rect(g, 30, 2, 36, 4, P.s2); rect(g, 31, 3, 35, 3, P.s3); } // 차선·보도 블록·맨홀
  if (n === 5) for (let i = 0; i < 6; i++) { const x = Math.floor(rnd() * GW), y = 3 + Math.floor(rnd() * 5); rect(g, x, y, x + 2, y, P.bone); } // 뼈
  return g;
}

// ── 발판 (plat): 몸통 타일 16 × 12 (윗면은 레벨 색이 맡는다) ──────
function platBody(n: number): Grid {
  const g = G(16, 12), rnd = noise(20 + n);
  const [a, b] = [[P.b3, P.b2], [P.b2, P.g1], [P.o4, P.o2], [P.s3, P.s1], [P.p2, P.p1]][n - 1];
  fill(g, a);
  if (n === 1 || n === 2) for (let x = 0; x < 16; x++) if ((x * 5) % 7 < 2) rect(g, x, 3, x, 8, b); // 통나무 결
  if (n === 2) for (let i = 0; i < 4; i++) rect(g, Math.floor(rnd() * 16), 0, Math.floor(rnd() * 16), 1, P.g2); // 이끼
  if (n === 3) { rect(g, 0, 5, 15, 5, b); rect(g, 7, 0, 7, 5, b); rect(g, 12, 6, 12, 11, b); } // 석판 이음새
  if (n === 4) { rect(g, 0, 0, 15, 1, P.s4); for (let x = 0; x < 16; x++) if (x % 8 < 4) rect(g, x, 8, x, 11, P.y2); rect(g, 3, 3, 4, 4, P.s5); rect(g, 11, 3, 12, 4, P.s5); } // 철골·위험 줄무늬·리벳
  if (n === 5) { for (let i = 0; i < 5; i++) px(g, Math.floor(rnd() * 16), Math.floor(rnd() * 12), P.p4); rect(g, 0, 11, 15, 11, b); } // 보랏빛 돌
  for (let x = 0; x < 16; x++) px(g, x, 11, b);
  return g;
}

// ── 소품 (props) ────────────────────────────────────────────
const M = (rows: string[], pal: Record<string, string>) => map(rows, pal);
const PROPS: Record<string, () => Grid> = {
  tree: () => M(['...GGGG...', '..GGgGGG..', '.GGGGGGGG.', 'GGgGGGGGgG', 'GGGGGgGGGG', '.GGGGGGGG.', '..GGGGGG..', '....bb....', '....bb....', '...bbbb...'], { G: P.g2, g: P.g4, b: P.b2 }),
  bush: () => M(['..GGGG..', '.GGgGGG.', 'GGGGGGgG', '.GgGGGG.'], { G: P.g3, g: P.g5 }),
  flower: () => M(['.rr.', 'ryyr', '.rr.', '.g..', '.gg.'], { r: P.r3, y: P.y2, g: P.g2 }),
  sign: () => M(['wwwwwwww', 'wiiiiiiw', 'wiiiiiiw', 'wwwwwwww', '...bb...', '...bb...', '...bb...'], { w: P.b4, i: P.b5, b: P.b2 }),
  mushhouse: () => M(['....RRRR....', '..RRwRRRwR..', '.RRRRRRRRRR.', 'RRwRRRRRRwRR', 'DDDDDDDDDDDD', '..ccccccc...', '..cwwccdcc..', '..cwwccdcc..', '..ccccccc...'], { R: P.r2, w: P.white, D: P.r1, c: P.b5, d: P.b2 }),
  pine: () => M(['....g....', '...ggg...', '..ggggg..', '...ggg...', '..ggggg..', '.ggggggg.', '..ggggg..', '.ggggggg.', 'ggggggggg', '....b....', '....b....', '...bbb...'], { g: P.g1, b: P.b1 }),
  vinelamp: () => M(['g........', 'gg.......', '.gg......', '..gg.....', '...gg....', '....gy...', '....yYy..', '....yYy..', '.....y...'], { g: P.g2, y: P.y1, Y: P.y3 }),
  bigmush: () => M(['...BBBBBB...', '.BBwBBBBBwB.', 'BBBBBBwBBBBB', 'BBBBBBBBBBBB', '.DDDDDDDDDD.', '....cccc....', '....cccc....', '....cccc....', '...cccccc...'], { B: P.bl2, w: P.white, D: P.bl1, c: P.bone }),
  stumpprop: () => M(['.TTTTTT.', 'TwwTTwwT', 'TTTTTTTT', '.bbbbbb.', '.bbbbbb.', '.bbbbbb.', 'bb....bb'], { T: P.b5, w: P.b4, b: P.b2 }),
  rock: () => M(['...ooo...', '..ooOOo..', '.ooOOOoo.', 'oooooooo.', 'oooooooo.'], { o: P.o4, O: P.o5 }),
  totem: () => M(['.yyyy.', '.yiiy.', '.yyyy.', '.rrrr.', '.riir.', '.rrrr.', '.bbbb.', '.biib.', '.bbbb.', 'bbbbbb'], { y: P.y2, i: P.ink, r: P.r2, b: P.b3 }),
  drybush: () => M(['b..b..b', '.b.b.b.', '..bbb..', '...b...', '...b...'], { b: P.b4 }),
  campfire: () => M(['...f...', '..fFf..', '.fFFFf.', '.fFyFf.', 'bbbbbbb', '.bb.bb.'], { f: P.fire, F: P.y2, y: P.y4, b: P.b2 }),
  lamp: () => M(['.yYy.', 'yYYYy', '.yYy.', '..s..', '..s..', '..s..', '..s..', '..s..', '..s..', '..s..', '.sss.'], { y: P.y3, Y: P.y4, s: P.s2 }),
  cone: () => M(['..o..', '..o..', '.ooo.', '.www.', '.ooo.', 'ooooo'], { o: P.fire, w: P.white }),
  subway: () => M(['bbbbbbbbbb', 'bwwwwwwwwb', 'bwbbwwbbwb', 'bwwwwwwwwb', 'bbbbbbbbbb', '....ss....', '....ss....', '....ss....'], { b: P.bl1, w: P.white, s: P.s2 }),
  dumpster: () => M(['gggggggggg', 'gGGGGGGGGg', 'gGGGGGGGGg', 'gGGGGGGGGg', 'gggggggggg', '.ss....ss.'], { g: P.g1, G: P.g2, s: P.s1 }),
  deadtree: () => M(['b......b.', '.b....b..', '..b..b...', 'b..bb..b.', '.b.bb.b..', '..bbbb...', '...bb....', '...bb....', '...bb....', '..bbbb...'], { b: P.p1 }),
  tomb: () => M(['..sss..', '.sssss.', '.sisis.', '.sssss.', '.sssss.', '.sssss.', 'sssssss'], { s: P.s4, i: P.s2 }),
  lantern: () => M(['..s..', '.sss.', '.pYp.', '.pYp.', '.sss.', '..s..', '..s..', '..s..', '..s..', '.sss.'], { s: P.s1, p: P.p4, Y: P.y3 }),
  mound: () => M(['.....bb.....', '...bbbbbb...', '.bbbbbbbbbb.', 'bbbbkkbbbbbb', 'bbbbbbbbbbbb'], { b: P.o1, k: P.p1 }),
  pillar: () => M(['ssssss', '.ssss.', '.sPss.', '.ssss.', '.ssPs.', '.ssss.', '.sPss.', '.ssss.', '.ssss.', 'ssssss'], { s: P.s5, P: P.p5 }),
};
/** 지역별 소품 배치 (띠 폭의 %, 왼쪽부터). 같은 지역은 언제나 같은 자리다 */
export const PROP_SETS: Record<number, { key: string; x: number }[]> = {
  1: [{ key: 'tree', x: 4 }, { key: 'flower', x: 10 }, { key: 'bush', x: 17 }, { key: 'sign', x: 26 }, { key: 'mushhouse', x: 40 }, { key: 'flower', x: 50 }, { key: 'tree', x: 58 }, { key: 'bush', x: 70 }, { key: 'flower', x: 78 }, { key: 'tree', x: 88 }, { key: 'bush', x: 95 }],
  2: [{ key: 'pine', x: 3 }, { key: 'bigmush', x: 12 }, { key: 'vinelamp', x: 24 }, { key: 'pine', x: 33 }, { key: 'stumpprop', x: 44 }, { key: 'pine', x: 55 }, { key: 'vinelamp', x: 66 }, { key: 'bigmush', x: 76 }, { key: 'pine', x: 87 }, { key: 'stumpprop', x: 95 }],
  3: [{ key: 'rock', x: 5 }, { key: 'drybush', x: 14 }, { key: 'totem', x: 25 }, { key: 'rock', x: 38 }, { key: 'campfire', x: 50 }, { key: 'drybush', x: 60 }, { key: 'rock', x: 72 }, { key: 'totem', x: 84 }, { key: 'drybush', x: 94 }],
  4: [{ key: 'lamp', x: 4 }, { key: 'cone', x: 12 }, { key: 'subway', x: 22 }, { key: 'dumpster', x: 36 }, { key: 'lamp', x: 50 }, { key: 'cone', x: 58 }, { key: 'cone', x: 62 }, { key: 'lamp', x: 76 }, { key: 'dumpster', x: 88 }, { key: 'lamp', x: 96 }],
  5: [{ key: 'deadtree', x: 4 }, { key: 'tomb', x: 13 }, { key: 'lantern', x: 22 }, { key: 'mound', x: 34 }, { key: 'deadtree', x: 46 }, { key: 'pillar', x: 58 }, { key: 'pillar', x: 64 }, { key: 'lantern', x: 74 }, { key: 'tomb', x: 84 }, { key: 'deadtree', x: 93 }],
};

// ── 캐시와 API ──────────────────────────────────────────────
const FARS = [far1, far2, far3, far4, far5];
const gridCache: Record<string, Grid> = {};
const urlCache: Record<string, string> = {};
const gridOf = (key: string): Grid => {
  if (gridCache[key]) return gridCache[key];
  const [kind, a] = key.split(':');
  let g: Grid;
  if (kind === 'far') g = FARS[+a - 1]();
  else if (kind === 'gnd') g = ground(+a);
  else if (kind === 'plat') g = platBody(+a);
  else if (kind === 'prop') { if (!PROPS[a]) throw new Error('no prop ' + a); g = PROPS[a](); }
  else throw new Error('no scenery ' + key);
  return (gridCache[key] = g);
};
export const SCENERY = {
  /** dataURL. far:n · gnd:n · plat:n · prop:key */
  url(key: string, s: number): string { return (urlCache[key + '@' + s] ||= drawGrid(gridOf(key), s)); },
  size(key: string, s: number): [number, number] { const g = gridOf(key); return [g[0].length * s, g.length * s]; },
  /** 지역 띠 안에 넣을 배경 겹 HTML (먼 배경 · 소품 · 바닥). scale은 도트 배율 */
  layers(region: number, scale = 3): string {
    const far = this.url('far:' + region, scale), gnd = this.url('gnd:' + region, scale);
    const [, fh] = this.size('far:' + region, scale), [gw, gh] = this.size('gnd:' + region, scale);
    const props = (PROP_SETS[region] || []).map(p => { const [w, h] = this.size('prop:' + p.key, scale); return `<img class="px prop" src="${this.url('prop:' + p.key, scale)}" width="${w}" height="${h}" style="left:${p.x}%" alt="">`; }).join('');
    return `<div class="far" style="background-image:url(${far});height:${fh}px"></div><div class="props">${props}</div><div class="gnd" style="background-image:url(${gnd});background-size:${gw}px ${gh}px"></div>`;
  },
  platStyle(region: number, scale = 3): string { const [w, h] = this.size('plat:' + region, scale); return `background-image:url(${this.url('plat:' + region, scale)});background-size:${w}px ${h}px`; },
  outline, ell,
};
