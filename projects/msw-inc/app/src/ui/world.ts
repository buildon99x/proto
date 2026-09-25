/*
 * S1 월드 길 — 레벨이 곧 위치다.
 * 가로축 = 레벨. 던전 = 떠 있는 발판(폭 = 적정 구간 11칸). 모험가 = 자기 레벨 위치에 선 사람.
 * 발판이 없는 땅 = 빈틈. 모험가는 거기서 😐로 혼자 천천히 걷는다(v1.2).
 */
import { A, $, $$, must, h, n, lerp, img, monArt, plotName, plotShort, lvColor, segTxt, snd, nope, toast, emit, refresh, renderDock, rectOf, toStage, markLabel, M } from './app';
import { REGIONS, fieldBoss, type PlotId } from '../sim/content';
import { ART } from './art';

const X0 = 34, GROUND = 452, TOP = 56;
const WS = 3, WW = 30, WH = 42; // 월드 도트 배율, 모험가 크기
const VIEW = [25, 40, 55, 70, 76];
const CROWD = 150; // 이보다 많으면 레벨 칸마다 대표 한 명 + 인원

interface Plat { el: HTMLElement; D: number; y: number; sig: string; left: number; w: number; top: number }
interface MonV { el: HTMLElement; art: string; iw: number; ih: number; ph: number; ready: boolean | null; cx: number; cy: number }
interface Walker { key: string; el: HTMLElement; emo: HTMLElement; cnt: HTMLElement; x: number; y: number; surf: string; jump: null | { t: number; dur: number; x0: number; y0: number }; face: number; emoSt: string; flashUntil: number; n: number; ids: number[] }
interface Figure { key: string; a: M.Adventurer; n: number; ids: number[] }
export interface PreviewView extends M.Preview { kind: 'move' | 'evolve' | 'promote'; lostSet?: Set<number>; label?: Record<string, string> }

export const V = {
  k: 1, max: 25, lanes: {} as Record<PlotId, number>, laneH: 100,
  plats: {} as Record<PlotId, Plat>, mons: {} as Record<number, MonV>, walkers: new Map<string, Walker>(),
  exits: {} as Record<number, 'grad' | 'leave'>, figOf: new Map<number, string>(),
  gapSegs: [] as M.Seg[], dirty: true, preview: null as PreviewView | null, snap: true,
  drag: null as null | { id: number; el: HTMLElement; x0: number; y0: number; started: boolean; target?: Target | null },
  x: (L: number) => X0 + L * V.k,
  laneTop: (i: number) => GROUND - V.laneH * (i + 1),
  GROUND, TOP,
  build, tick, bindInput, setPreview, poofMon, fxText, confetti, mote,
};
A.world = V;

const L = (id: string) => must('#' + id);

// ── 카메라 ──────────────────────────────────────────────────
const camTarget = () => VIEW[A.w.chapter - 1];
function initCam() { V.max = camTarget(); V.k = (1280 - X0 - 24) / V.max; V.snap = true; }
let camMoving = false;
function camTick(dt: number) {
  const t = camTarget();
  camMoving = Math.abs(V.max - t) > 0.02;
  V.max = camMoving ? lerp(V.max, t, Math.min(1, dt * 1.4)) : t;
  V.k = (1280 - X0 - 24) / V.max;
}

// ── 발판 층 배정 (겹치지 않게, 한번 앉은 층은 되도록 유지) ──
function assignLanes(levels: Record<PlotId, number>, keep = true): { res: Record<PlotId, number>; count: number } {
  const ids = Object.keys(levels).sort((a, b) => levels[a] - levels[b]);
  const used: [number, number][][] = [], res: Record<PlotId, number> = {};
  const fits = (i: number, lo: number, hi: number) => !(used[i] || []).some(([a, b]) => lo < b + 0.8 && hi > a - 0.8);
  for (const id of ids) {
    const lo = levels[id] - 5.5, hi = levels[id] + 5.5;
    let li = keep ? V.lanes[id] : undefined;
    if (li == null || !fits(li, lo, hi)) { li = 0; while (!fits(li, lo, hi) && li < 7) li++; }
    (used[li] = used[li] || []).push([lo, hi]);
    res[id] = li;
  }
  return { res, count: used.length };
}

// ── 지역 띠 ─────────────────────────────────────────────────
function buildBands() {
  const box = L('bands');
  box.innerHTML = '';
  REGIONS.forEach(r => {
    box.appendChild(h(`<div class="band b${r.n}" data-r="${r.n}"><div class="sky"></div><div class="hills"></div>
      <div class="name">${r.name}<small>Lv ${Math.max(1, r.from)}–${Math.min(70, r.to)}</small></div>
      <div class="lamps"></div><div class="fog"></div><div class="lock"><b>🔒</b><span>${r.n - 1}장 결재 후 개방</span></div></div>`));
  });
  REGIONS.forEach(r => { if (r.n <= A.w.chapter) lightUp(r.n, false); });
}
/** 지역 불빛: 결재하면 새 지역에 등불이 하나씩 켜진다 (F4) */
function lightUp(k: number, animate: boolean) {
  const band = $(`.band[data-r="${k}"] .lamps`, L('bands'));
  if (!band || band.childElementCount) return;
  const spots = [[12, 58], [24, 70], [37, 52], [50, 66], [63, 55], [76, 72], [88, 60]];
  spots.forEach(([x, y], i) => {
    band.appendChild(h(`<i class="lamp" style="left:${x}%;top:${y}%;${animate ? `animation-delay:${1.4 + i * 0.22}s` : 'animation:none'}"></i>`));
    if (animate) setTimeout(() => snd.play('tinyup'), (1.4 + i * 0.22) * 1000);
  });
}
function layoutBands() {
  $$('.band', L('bands')).forEach(el => {
    const r = REGIONS[+(el.dataset.r || 1) - 1];
    const left = r.n === 1 ? 0 : V.x(r.from), right = r.n === 5 ? Math.max(1280, V.x(r.to)) : V.x(r.to);
    el.style.left = left + 'px'; el.style.width = Math.max(0, right - left) + 'px';
    el.classList.toggle('lit', r.n <= A.w.chapter);
    el.style.display = left > 1290 ? 'none' : '';
  });
}

// ── 땅 표시: 눈금, 연결 띠, 빈틈, 입구·졸업 문 ───────────────
let marksSig = '';
function stuckIn(g: M.Seg) { let k = 0; for (const a of A.w.advs) if (a.st === 'search' && a.lv >= g[0] && a.lv <= g[1]) k++; return k; }
function layoutMarks(force: boolean) {
  const w = A.w, end = M.roadEnd(w);
  const lv = M.levelsOf(w);
  const segs = M.gapSegments(w, lv);
  const stuck = segs.map(stuckIn);
  const zl = M.zoneLeft(w), zNext = zl ? M.zoneEnds(w)![w.zone! + 1] : 0;
  const zPct = zl ? Math.min(99, Math.floor((100 * (w.zoneAcc || 0)) / Math.max(1, M.zoneNeed(w)))) : 0;
  const sig = JSON.stringify([segs, stuck, lv, end, Math.round(V.k * 100), zl, zPct]);
  if (!force && sig === marksSig && !camMoving) return;
  marksSig = sig;
  let html = '', badges = '';
  const step = V.max > 50 ? 10 : 5;
  for (let Lv = 1; Lv <= V.max; Lv++) if (Lv === 1 || Lv % step === 0) html += `<div class="tick" style="left:${V.x(Lv)}px">${Lv}</div>`;
  REGIONS.forEach(r => { if (r.n <= w.chapter + 1 && V.x(r.from) < 1280) html += `<div class="rname" style="left:${(V.x(Math.max(r.from, 0.5)) + Math.min(1270, V.x(r.to))) / 2}px">${r.name} · Lv ${Math.max(1, r.from)}–${Math.min(70, r.to)}</div>`; });
  // 연결 띠 (1 ~ 졸업선)
  const c = M.coveredSet(lv);
  let s: number | null = null;
  for (let Lv = 1; Lv <= end + 1; Lv++) {
    if (Lv <= end && c[Lv]) { if (s === null) s = Lv; }
    else if (s !== null) { html += `<div class="cov" style="left:${V.x(s - 0.5)}px;width:${(Lv - s) * V.k}px"></div>`; s = null; }
  }
  // 빈틈: 멈춘 모험가가 있으면 "지금 고칠 곳"(진한 빨강 + !), 없으면 "끊긴 길"(옅은 점선)
  segs.forEach((g, i) => {
    const x0 = V.x(g[0] - 0.5), wd = (g[1] - g[0] + 1) * V.k, cx = x0 + wd / 2;
    const hot = stuck[i] > 0;
    const label = g[0] === 1 && hot ? '입구 막힘' : hot ? '빈틈' : '끊긴 길';
    html += `<div class="gap ${hot ? '' : 'cold'}" style="left:${x0}px;width:${wd}px"></div>`;
    html += `<div class="gaplabel ${hot ? '' : 'cold'}" data-gap="${i}" style="left:${Math.max(40, cx)}px" title="눌러서 이 구간에 맞는 직원 채용">${label} ${segTxt(g)}</div>`;
    if (hot) badges += `<div class="gapb" data-gap="${i}" style="left:${Math.max(24, cx)}px;top:${GROUND - 104}px" title="갈 곳이 없는 모험가 ${stuck[i]}명 — 눌러서 고치기">!<small>${stuck[i]}</small></div>`;
  });
  // 입구와 졸업 문
  html += `<div class="gate" style="left:${V.x(0.2)}px;top:${GROUND}px"><div class="post" style="left:-4px;height:44px;top:-44px"></div><div class="sign" style="left:-18px;top:-66px">입구</div></div>`;
  const gx = V.x(end + 0.5);
  // 다음 구간 (v1.4): 졸업 문 너머 잠긴 땅. 퇴근이 쌓이고 길이 이어져 있으면 열린다
  if (zl) {
    const zx = V.x(zNext + 0.5), wait = segs.length ? ' · 길을 이으면 열려요' : '';
    html += `<div class="zlock" style="left:${gx}px;width:${Math.max(0, zx - gx)}px" title="다음 구간 — 이 장 퇴근이 쌓이면 열려요"><span>🔒 Lv ${end + 1}–${zNext}<small>퇴근 ${zPct}%${wait}</small></span></div>`;
  }
  html += `<div class="gate grad" style="left:${gx}px;top:${GROUND}px"><div class="arch" style="top:-74px"></div><div class="sign" style="left:-24px;top:-98px">🎓 졸업</div></div>`;
  L('marks').innerHTML = html;
  L('gapUi').innerHTML = badges;
  // 빈틈 해소 감지 (F3)
  if (!V.snap) V.gapSegs.forEach(g => {
    const healed: number[] = [];
    for (let Lv = g[0]; Lv <= g[1]; Lv++) if (Lv <= end && c[Lv]) healed.push(Lv);
    if (healed.length) healGap(healed[0], healed[healed.length - 1]);
  });
  V.gapSegs = segs;
}
function healGap(a: number, b: number) {
  const x0 = V.x(a - 0.5), wd = (b - a + 1) * V.k;
  const el = h(`<div class="gap heal" style="left:${x0}px;width:${wd}px;z-index:7"></div>`);
  L('fxL').appendChild(el); if (!A.demo) setTimeout(() => el.remove(), 1000);
  fxText('뚫렸다!', x0 + wd / 2, GROUND - 60, 'pop g');
  snd.play('pop');
  emit([{ type: 'healed', a, b }]);
}

// ── 발판 (던전) ─────────────────────────────────────────────
function layoutPlats(dt: number) {
  const w = A.w, lv = M.levelsOf(w), { res: lanes, count } = assignLanes(lv), end = M.roadEnd(w);
  V.lanes = lanes;
  // 층이 4개를 넘으면 간격을 좁힌다 (05 D3)
  const want = count > 4 ? Math.floor(400 / count) : 100;
  L('world').classList.toggle('dense', count > 4);
  V.laneH = V.snap ? want : lerp(V.laneH, want, Math.min(1, dt * 4));
  const box = L('plats');
  const occ: Record<string, number> = {}, busy: Record<string, number> = {};
  for (const a of w.advs) { if (a.st === 'happy' && a.d) occ[a.d] = (occ[a.d] || 0) + 1; else if (a.st === 'busy' && a.near) busy[a.near] = (busy[a.near] || 0) + 1; }
  for (const id in lv) {
    let p = V.plats[id];
    const D = lv[id];
    if (!p) {
      const el = h(`<div class="plat" data-plat="${id}" title="눌러서 현장 보기"><div class="aura"></div><div class="top"></div><div class="body"></div><div class="pb"></div></div>`);
      box.appendChild(el);
      p = V.plats[id] = { el, D, y: V.laneTop(lanes[id]) + (V.snap ? 0 : -30), sig: '', left: 0, w: 0, top: 0 };
      if (!V.snap && !A.demo) el.animate([{ opacity: 0, transform: 'scaleX(.4)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' });
    }
    const ty = V.laneTop(lanes[id]);
    p.D = V.snap ? D : lerp(p.D, D, Math.min(1, dt * 3.2));
    if (Math.abs(p.D - D) < 0.01) p.D = D;
    p.y = V.snap ? ty : lerp(p.y, ty, Math.min(1, dt * 5));
    const left = V.x(Math.max(0.5, p.D - 5.5)), wd = V.x(p.D + 5.5) - left;
    p.left = left; p.w = wd; p.top = p.y;
    const s = p.el.style;
    s.left = left + 'px'; s.width = wd + 'px'; s.top = p.y + 'px';
    s.setProperty('--pg', lvColor(D));
    const d = w.dungeons[id], ev = d.event;
    p.el.classList.toggle('exp', !!ev && ev.kind === 'exp');
    p.el.classList.toggle('drop', !!ev && ev.kind === 'drop');
    p.el.classList.toggle('fog', D - 5 > end);
    p.el.classList.toggle('boss', M.monsIn(w, id).some(M.isBoss));
    const elite = !!w.elite && w.elite.d === id, guest = !!w.boss && w.boss.d === id;
    p.el.classList.toggle('elite', elite);
    p.el.classList.toggle('guest', guest);
    const o = occ[id] || 0;
    const seats = M.seatsOf(w, id);
    const sig = `${D}|${o}|${seats}|${busy[id] || 0}|${ev ? ev.kind + Math.ceil((ev.end - w.t) / 5) : ''}|${Math.round(wd / 20)}|${M.dungeonStars(d)}|${elite}|${guest}`;
    if (sig !== p.sig) {
      p.sig = sig;
      const narrow = wd < 230;
      const st = M.dungeonStars(d);
      p.el.querySelector('.body')!.innerHTML = `${elite ? '<span class="elb" title="엘리트 출현 — 이 던전 모험가는 레벨업 ×1.5, 결재 ② ×2">★ 엘리트</span>' : ''}<b>${narrow ? plotShort(id) : plotName(id)}</b><span class="lv">Lv ${D}</span><span class="seat ${o >= seats ? 'full' : ''}">${o}/${seats}</span>${st && !narrow ? `<span class="st">${'★'.repeat(st)}</span>` : ''}`;
      let pb = '';
      if (busy[id]) pb += `<div class="pill busy" data-busy="${id}" title="자리가 없어 기다리는 모험가 — 눌러서 자리 늘리기">🌀 ${busy[id]}</div>`;
      if (ev) {
        const rem = ev.end - w.t, c = ev.kind === 'exp' ? 'var(--exp)' : 'var(--drop)';
        pb += `<div class="ring" style="--c:${c};--p:${(rem / M.EVENT_MIN).toFixed(3)}" title="${ev.kind === 'exp' ? '경험치' : '드랍'} 2배 남은 시간"><b>${ev.kind === 'exp' ? 'EXP' : 'DROP'}<br>${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2, '0')}</b></div>`;
      }
      p.el.querySelector('.pb')!.innerHTML = pb;
    }
  }
  for (const id in V.plats) if (!lv[id]) {
    const el = V.plats[id].el;
    if (A.demo) el.remove();
    else el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(40px)' }], { duration: 400 }).onfinish = () => el.remove();
    delete V.plats[id];
  }
}

// ── 직원 (발판 위를 천천히 오간다) ─────────────────────────
function layoutMons(now: number) {
  const w = A.w, box = L('plats');
  const alive = new Set<number>();
  const picks = M.evolvePicks(w);
  for (const id in V.plats) {
    const p = V.plats[id];
    const ms = M.monsIn(w, id);
    ms.forEach((m, i) => {
      alive.add(m.id);
      let e = V.mons[m.id];
      const art = 'm:' + monArt(m);
      if (!e || e.art !== art) {
        if (e) e.el.remove();
        const [iw, ih] = ART.size(art, WS);
        const el = h(`<div class="mon walk" data-id="${m.id}" title="${M.monName(m)} Lv ${M.monLevel(m)} · 누르면 정보, 끌면 옮기기">${img(art, WS)}</div>`);
        box.appendChild(el);
        e = V.mons[m.id] = { el, art, iw, ih, ph: (m.id * 1.7) % 6.28, ready: null, cx: 0, cy: 0 };
      }
      const base = p.left + p.w * (i + 1) / (ms.length + 1);
      const wob = Math.sin(now / 1000 * 0.45 + e.ph) * Math.min(22, p.w / (ms.length + 1) / 3);
      const dir = Math.cos(now / 1000 * 0.45 + e.ph);
      const x = base + wob;
      e.el.style.left = (x - e.iw / 2) + 'px';
      e.el.style.top = (p.top - e.ih + 3) + 'px';
      e.el.classList.toggle('flip', dir > 0);
      e.cx = x; e.cy = p.top - e.ih / 2;
      // v1.3 (F3): 지금 해도 되는 진화만, 최대 3개. 나머지는 독의 "진화 대기" 칩으로
      const r = M.canEvolve(m) && !A.T.hideEvolve() && !!picks.get(m.id)?.shown;
      if (r !== e.ready) {
        e.ready = r;
        const old = e.el.querySelector('.evb'); if (old) old.remove();
        if (r) e.el.appendChild(h(`<div class="evb" data-ev="${m.id}" title="진화할 수 있어요 — 눌러서 결과 미리 보기">▲</div>`));
      }
      e.el.classList.toggle('dragging', !!(V.drag && V.drag.started && V.drag.id === m.id));
      e.el.classList.toggle('elite', !!w.elite && w.elite.mon === m.id);
    });
  }
  for (const id in V.mons) if (!alive.has(+id)) { V.mons[id].el.remove(); delete V.mons[id]; }
  layoutBoss(now);
  layoutBoxes();
}
/**
 * 드랍 상자 (v1.6): 발판 왼쪽 끝에 얹는다. 직원 도트(z 3)보다 위에 두어 누를 수 있게 한다.
 * 금색 볼거리다. 빨강은 지금 고칠 곳에만 쓴다
 */
const boxEls = new Map<number, HTMLElement>();
function layoutBoxes() {
  const alive = new Set<number>();
  for (const b of M.boxesOf(A.w)) {
    const p = V.plats[b.d];
    if (!p) continue;
    alive.add(b.id);
    let el = boxEls.get(b.id);
    if (!el) {
      el = h(`<div class="pill box" data-box="${b.id}" title="드랍 상자 — 눌러서 채용권이나 이벤트권 고르기">📦</div>`);
      L('plats').appendChild(el);
      boxEls.set(b.id, el);
      if (!V.snap && !A.demo) el.animate([{ transform: 'translateY(-40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.6,1)' });
    }
    el.style.left = (p.left + 2) + 'px';
    el.style.top = (p.top - 26) + 'px';
  }
  for (const [id, el] of boxEls) if (!alive.has(id) || !el.isConnected) { el.remove(); boxEls.delete(id); }
}
/** 방문 중인 필드 보스: 초대받은 발판 위에 크게, 토벌 게이지와 함께 (v1.3) */
let bossEl: HTMLElement | null = null, bossKey = '';
function layoutBoss(now: number) {
  const w = A.w, b = w.boss, p = b && b.d ? V.plats[b.d] : null;
  const fb = b && fieldBoss(b.ch);
  if (!b || !p || !fb) { if (bossEl) { bossEl.remove(); bossEl = null; bossKey = ''; } return; }
  const key = fb.art;
  if (!bossEl || bossKey !== key) {
    if (bossEl) bossEl.remove();
    const [iw, ih] = ART.size('m:' + fb.art, 4);
    bossEl = h(`<div class="fboss" title="필드 보스 ${fb.name} · Lv ${fb.lv} · 이 던전 퇴근으로 토벌 게이지가 찬다"><div class="fb-img" style="width:${iw}px;height:${ih}px">${img('m:' + fb.art, 4)}</div><div class="fb-g"><i></i></div><span class="fb-n">👑 ${fb.name}</span></div>`);
    L('plats').appendChild(bossEl);
    bossKey = key;
  }
  const pct = Math.min(1, b.kills / Math.max(1, M.bossNeed(b.ch)));
  const [iw, ih] = ART.size('m:' + fb.art, 4);
  const x = p.left + p.w - iw / 2 - 6, bob = Math.sin(now / 420) * 2;
  bossEl.style.left = (x - iw / 2) + 'px';
  bossEl.style.top = (p.top - ih - 22 + bob) + 'px';
  (bossEl.querySelector('.fb-g i') as HTMLElement).style.width = Math.round(pct * 100) + '%';
}
function poofMon(monId: number) {
  const e = V.mons[monId];
  if (!e || e.el.classList.contains('poofed')) return;
  e.el.classList.add('poofed');
  puff(e.cx, e.cy + 6);
  fxText('퇴근!', e.cx, e.cy - 14, 'pop');
  setTimeout(() => e.el.classList.remove('poofed'), 1100);
}

// ── 모험가 ──────────────────────────────────────────────────
const EMO: Record<string, string> = { search: '😐', busy: '😠' };
function figures(): Figure[] {
  const w = A.w;
  if (w.advs.length <= CROWD) return w.advs.map(a => ({ key: 'a' + a.id, a, n: 1, ids: [a.id] }));
  // 많으면 같은 곳·같은 레벨·같은 표정끼리 한 명으로 (04 §3: 4장부터 대표 한 명 + 인원)
  const g = new Map<string, Figure>();
  for (const a of w.advs) {
    const key = `${a.st}|${a.st === 'happy' ? a.d : a.st === 'busy' ? a.near : 'g'}|${a.lv}`;
    const f = g.get(key);
    if (f) { f.n++; f.ids.push(a.id); } else g.set(key, { key, a, n: 1, ids: [a.id] });
  }
  return [...g.values()];
}
function walkerTarget(a: M.Adventurer) {
  if (a.st === 'happy' && a.d && V.plats[a.d]) {
    const need = 10 + a.lv, f = Math.min(0.92, a.prog / need);
    return { surf: a.d, x: V.x(a.lv - 0.46 + f * 0.9 + a.jit * 0.1), y: V.plats[a.d].top };
  }
  // 빈틈을 걷는 사람은 레벨 칸 안에서 조금씩 오른쪽으로. 기다리는 사람은 겹치지 않게 흩어 선다
  if (a.st === 'search') { const f = Math.min(0.92, a.prog / (10 + a.lv)); return { surf: 'g', x: V.x(a.lv - 0.46 + f * 0.9) + (((a.id * 7) % 5) - 2) * 4, y: GROUND - 1 }; }
  if (a.st === 'busy') return { surf: 'g', x: V.x(a.lv) + (((a.id * 7) % 5) - 2) * 11, y: GROUND - 1 };
  return { surf: 'g', x: V.x(0.3), y: GROUND - 1 };
}
function layoutWalkers(dt: number, now: number) {
  const box = L('walkers');
  const alive = new Set<string>();
  const figOf = new Map<number, string>();
  for (const f of figures()) {
    const a = f.a;
    alive.add(f.key);
    for (const id of f.ids) figOf.set(id, f.key);
    let v = V.walkers.get(f.key);
    const tg = walkerTarget(a);
    if (!v) {
      const el = h(`<div class="wk">${img('m:a' + a.look, WS)}<span class="emo"></span><span class="cnt"></span></div>`);
      box.appendChild(el);
      const sx = V.snap ? tg.x : V.x(0) - 20;
      v = { key: f.key, el, emo: el.querySelector('.emo') as HTMLElement, cnt: el.querySelector('.cnt') as HTMLElement, x: sx, y: V.snap ? tg.y : GROUND - 1, surf: V.snap ? tg.surf : 'g', jump: null, face: 1, emoSt: '', flashUntil: 0, n: 0, ids: [] };
      V.walkers.set(f.key, v);
    }
    v.ids = f.ids;
    if (v.n !== f.n) { v.n = f.n; v.cnt.textContent = f.n > 1 ? '×' + f.n : ''; }
    if (V.snap) { v.x = tg.x; v.y = tg.y; v.surf = tg.surf; v.jump = null; }
    else if (tg.surf !== v.surf && !v.jump) { v.jump = { t: 0, dur: 0.55, x0: v.x, y0: v.y }; v.surf = tg.surf; }
    let moving = false;
    if (v.jump) {
      const j = v.jump; j.t += dt;
      const p = Math.min(1, j.t / j.dur);
      v.x = lerp(j.x0, tg.x, p);
      v.y = lerp(j.y0, tg.y, p) - Math.sin(Math.PI * p) * (36 + Math.abs(tg.y - j.y0) * 0.35);
      if (p >= 1) { v.jump = null; v.y = tg.y; }
      moving = true;
      v.face = tg.x >= j.x0 ? 1 : -1;
    } else {
      const dx = tg.x - v.x;
      const sp = Math.max(70, Math.abs(dx) * 2.2);
      if (Math.abs(dx) > 1.5) { v.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt); moving = true; v.face = Math.sign(dx); }
      v.y = tg.y;
    }
    v.el.style.transform = `translate(${v.x - WW / 2}px,${v.y - WH}px)`;
    v.el.classList.toggle('moving', moving || a.st === 'search');
    v.el.classList.toggle('slow', a.st === 'search');
    v.el.classList.toggle('flip', v.face < 0);
    let emo = EMO[a.st] || '';
    if (now < v.flashUntil) emo = '😊';
    if (emo !== v.emoSt) {
      v.emoSt = emo;
      v.emo.textContent = emo;
      v.emo.className = 'emo' + (emo ? ' on' : '') + (a.st === 'search' && emo === '😐' ? ' search' : '');
    }
    v.el.classList.toggle('pv', !!(V.preview && V.preview.lostSet && a.st === 'happy' && V.preview.lostSet.has(a.lv)));
  }
  for (const [key, v] of V.walkers) if (!alive.has(key)) {
    const how = v.ids.map(id => V.exits[id]).find(Boolean) || 'leave';
    exitWalker(v, how);
  }
  for (const id of Object.keys(V.exits)) if (!figOf.has(+id)) delete V.exits[+id];
  V.figOf = figOf;
}
function exitWalker(v: Walker, how: 'grad' | 'leave') {
  V.walkers.delete(v.key);
  if (V.snap || A.ui.mode !== 'world' || A.demo) { v.el.remove(); return; }
  if (how === 'grad') {
    const gx = V.x(M.roadEnd(A.w) + 0.5);
    v.emo.textContent = '🎓'; v.emo.className = 'emo on';
    v.el.animate([
      { transform: `translate(${v.x - WW / 2}px,${v.y - WH}px)` },
      { transform: `translate(${gx - WW / 2}px,${GROUND - WH - 1}px)`, offset: 0.55 },
      { transform: `translate(${gx - WW / 2}px,${GROUND - 130}px)`, opacity: 0 },
    ], { duration: 1500, easing: 'ease-in-out' }).onfinish = () => v.el.remove();
    setTimeout(() => { confetti(gx, GROUND - 60); fxText('+' + M.RULES_GRAD(), gx, GROUND - 90, 'pop y'); snd.play('grad'); }, 800);
  } else {
    v.emo.textContent = '😢'; v.emo.className = 'emo on';
    v.el.animate([{ opacity: 1, transform: `translate(${v.x - WW / 2}px,${v.y - WH}px)` }, { opacity: 0, transform: `translate(${v.x - WW / 2 - 20}px,${v.y - WH + 8}px)` }], { duration: 1300, delay: 300 }).onfinish = () => v.el.remove();
  }
}

// ── 연출 ────────────────────────────────────────────────────
function fx(html: string, x: number, y: number, life = 1200) {
  const el = h(`<div class="fx" style="left:${x}px;top:${y}px">${html}</div>`);
  L('fxL').appendChild(el);
  if (!A.demo) setTimeout(() => el.remove(), life);
  return el;
}
function fxText(t: string, x: number, y: number, cls: string) { return fx(`<div class="${cls}" style="transform:translateX(-50%)">${t}</div>`, x, y, 1300); }
function puff(x: number, y: number) {
  fx(`<div class="puff">${[[0, 4, 14], [10, 0, 16], [18, 5, 13], [6, 9, 12]].map(([l, t, s]) => `<i style="left:${l}px;top:${t}px;width:${s}px;height:${s}px"></i>`).join('')}</div>`, x, y - 10, 700);
}
function confetti(x: number, y: number) {
  const cols = ['#FFC531', '#3CC47C', '#FF7BB0', '#3FA9F5', '#8B6CFF'];
  let html = '';
  for (let i = 0; i < 16; i++) html += `<i class="confetti" style="background:${cols[i % 5]};--dx:${(Math.random() - 0.5) * 120}px;--dy:${-30 - Math.random() * 70}px"></i>`;
  fx(html, x, y, 1300);
}
/** 파티 도착 (v1.4): 한 틱에 함께 온 인원을 입구 위에 한 번만 띄운다 */
let partyN = 0;
function partyFx() {
  if (partyN++) return;
  requestAnimationFrame(() => { fxText(`👋 +${partyN}`, V.x(0.8), GROUND - 58, 'pop small'); partyN = 0; });
}
let lvFxBudget = 0;
function levelFx(id: number) {
  const key = V.figOf.get(id);
  const v = key ? V.walkers.get(key) : null;
  if (!v || lvFxBudget <= 0) return;
  lvFxBudget--;
  fx(`<div class="pillar"></div>`, v.x, v.y - 78, 800);
  fx(`<div class="uptxt">UP</div>`, v.x, v.y - 64, 1000);
  v.flashUntil = performance.now() + 1100;
  snd.play('tinyup');
}
/** 스마일 알갱이 → HUD 캔 */
function mote(sx: number, sy: number) {
  const can = $('#can');
  if (!can || A.demo) return;
  const r = rectOf(can);
  const el = h(`<div class="mote" style="left:0;top:0"></div>`);
  must('#stage').appendChild(el);
  el.animate([
    { transform: `translate(${sx}px,${sy}px) scale(1)` },
    { transform: `translate(${(sx + r.x) / 2}px,${Math.min(sy, r.y) - 60}px) scale(1.2)`, offset: 0.45 },
    { transform: `translate(${r.x + 6}px,${r.y + 8}px) scale(.6)` },
  ], { duration: 750, easing: 'cubic-bezier(.4,0,.8,.6)' }).onfinish = () => {
    el.remove(); can.classList.remove('gulp'); void can.offsetWidth; can.classList.add('gulp'); snd.play('coin');
  };
}
let moteT = 0, poofT = 0;
function ambient(dt: number) {
  const w = A.w;
  moteT -= dt; poofT -= dt;
  if (moteT <= 0) {
    moteT = 0.55 + Math.random() * 0.5;
    const happy = w.advs.filter(a => a.st === 'happy');
    const a = happy[Math.floor(Math.random() * happy.length)];
    const key = a && V.figOf.get(a.id), v = key && V.walkers.get(key);
    if (v) mote(v.x, v.y - 26 + TOP);
  }
  if (poofT <= 0) {
    poofT = 1.6 + Math.random() * 1.4;
    const ids = [...new Set(w.advs.filter(a => a.st === 'happy').map(a => a.d))].filter((id): id is PlotId => !!id && !!V.plats[id]);
    if (ids.length) {
      const ms = M.monsIn(w, ids[Math.floor(Math.random() * ids.length)]);
      if (ms.length) poofMon(ms[Math.floor(Math.random() * ms.length)].id);
    }
  }
}

// ── 사건 수신 ───────────────────────────────────────────────
A.handlers.push(ev => {
  for (const e of ev) {
    if (e.type === 'chapter') lightUp(e.n, true);
    else if (e.type === 'zone') {
      // 구간 개방 (v1.4): 새 땅이 열리고 졸업 문이 옮겨 간다
      if (A.ui.mode === 'world') { const cx = (V.x(e.from + 0.5) + V.x(e.to + 0.5)) / 2; fxText(`Lv ${e.from + 1}–${e.to} 개방!`, cx, GROUND - 70, 'pop g'); confetti(cx, GROUND - 40); }
      snd.play('event');
      toast(`🗺️ 새 구간 개방 · Lv ${e.from + 1}–${e.to} · 졸업선 Lv ${e.to}`);
      refresh();
    }
    else if (e.type === 'arrive' && A.ui.mode === 'world' && !V.snap && !A.demo) partyFx();
    else if (e.type === 'grad') V.exits[e.id] = 'grad';
    else if (e.type === 'leave') V.exits[e.id] = 'leave';
    else if (e.type === 'levelup' && A.ui.mode === 'world') levelFx(e.id);
    else if (e.type === 'approval') { snd.play('event'); }
    else if (e.type === 'box') {
      // 드랍 상자 (v1.6): 발판 위에서 톡 떨어진다
      const p = V.plats[e.d];
      if (p && A.ui.mode === 'world' && !V.snap) fxText('상자!', p.left + 16, p.top - 48, 'pop y');
      snd.play('box');
      refresh();
    }
    else if (e.type === 'mark') { snd.play('event'); toast(`결재 막대 ${Math.round(e.pct * 100)}% · ${markLabel(e.reward)}!`); refresh(); }
    else if (e.type === 'elite') {
      const m = A.w.monsters.find(x => x.id === e.mon), p = V.plats[e.d];
      if (p && A.ui.mode === 'world') { fxText('★ 엘리트!', p.left + p.w / 2, p.top - 70, 'pop y'); confetti(p.left + p.w / 2, p.top - 40); }
      snd.play('event');
      if (m) toast(`${plotShort(e.d)}에 엘리트 ${M.monName(m)}!! 한 시간 동안 레벨업 ×1.5 · 결재 ② ×2`);
      refresh();
    } else if (e.type === 'bossCall') {
      const fb = fieldBoss(e.ch);
      snd.play('stamp');
      if (fb) toast(`👑 필드 보스 ${fb.name}(Lv ${fb.lv})가 찾아왔어요! 어느 던전에서 맞을지 골라요`);
      refresh();
    } else if (e.type === 'bossIn') {
      const fb = fieldBoss(e.ch);
      if (fb && e.auto) toast(`👑 ${fb.name}를 ${plotShort(e.d)}에서 맞았어요 (자동 초대)`);
      refresh();
    } else if (e.type === 'bossDown') {
      const fb = fieldBoss(e.ch), p = e.d ? V.plats[e.d] : null;
      if (p && A.ui.mode === 'world') { confetti(p.left + p.w - 40, p.top - 60); fxText('토벌!', p.left + p.w - 40, p.top - 96, 'pop y'); }
      snd.play('evolve');
      if (fb) toast(`👑 ${fb.name} 토벌!! 도감 +1${e.bonus ? ` · 결재 ② +${n(e.bonus)}` : ''}`);
      refresh();
    }
  }
});

// ── 미리보기 (드래그·진화·발령): 결과를 월드 위에서 본다 ──────
function setPreview(pv: M.Preview | null, opt?: { kind: PreviewView['kind']; label?: Record<string, string> }) {
  V.preview = pv ? Object.assign({}, pv, opt || { kind: 'move' as const }) : null;
  if (V.preview) V.preview.lostSet = new Set(pv!.lost.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)));
  drawPreview();
}
function drawPreview() {
  const box = L('ui');
  box.querySelectorAll('.ghost,.gap.preview').forEach(e => e.remove());
  const pv = V.preview;
  if (!pv) return;
  const { res: lanes } = assignLanes(pv.after, false);
  for (const id in pv.after) {
    if (pv.before[id] === pv.after[id]) continue;
    const D = pv.after[id];
    const top = V.plats[id] ? V.plats[id].top : V.laneTop(lanes[id] ?? 0);
    const gl = V.x(Math.max(0.5, D - 5.5));
    const txt = pv.label && pv.label[id] ? pv.label[id] : `Lv ${pv.before[id] ? pv.before[id] + ' → ' : ''}${D}`;
    box.appendChild(h(`<div class="ghost ${pv.kind === 'evolve' ? '' : 'move'}" style="left:${gl}px;width:${V.x(D + 5.5) - gl}px;top:${top}px"><span>${txt}</span></div>`));
  }
  for (const id in pv.before) if (!pv.after[id] && V.plats[id]) {
    const p = V.plats[id];
    box.appendChild(h(`<div class="ghost closed" style="left:${p.left}px;width:${p.w}px;top:${p.top}px"><span>휴업</span></div>`));
  }
  pv.lost.forEach(([a, b]) => box.appendChild(h(`<div class="gap preview" style="left:${V.x(a - 0.5)}px;width:${(b - a + 1) * V.k}px"></div>`)));
}

// ── 드래그: 직원 옮기기 ─────────────────────────────────────
interface Target { id: PlotId | null; kind: 'plat' | 'plot' | 'tray'; x: number; y: number; w: number; h: number; el?: HTMLElement }
function dropTargets(): Target[] {
  const t: Target[] = [];
  for (const id in V.plats) { const p = V.plats[id]; t.push({ id, kind: 'plat', x: p.left, y: TOP + p.top - 70, w: p.w, h: 98, el: p.el }); }
  $$('#plots .plot[data-plot]').forEach(el => t.push({ id: el.dataset.plot!, kind: 'plot', el, ...rectOf(el) }));
  t.push({ id: null, kind: 'tray', ...rectOf(must('.trayw')) });
  return t;
}
function hitTarget(sx: number, sy: number): Target | null {
  let best: Target | null = null, bd = 1e9;
  for (const t of dropTargets()) {
    if (sx >= t.x && sx <= t.x + t.w && sy >= t.y && sy <= t.y + t.h) {
      const d = Math.abs(sy - (t.y + t.h - 20));
      if (d < bd) { bd = d; best = t; }
    }
  }
  return best;
}
function dragCard(sx: number, sy: number, html: string) {
  const box = must('#drag');
  let c = box.querySelector('.card') as HTMLElement | null;
  if (!c) { c = h('<div class="card"></div>'); box.appendChild(c); }
  c.innerHTML = html;
  // 포인터가 아래·오른쪽 끝이면 카드를 위·왼쪽으로 뒤집는다
  c.style.top = sy > 400 ? 'auto' : '-8px'; c.style.bottom = sy > 400 ? '40px' : 'auto';
  c.style.left = sx > 980 ? 'auto' : '24px'; c.style.right = sx > 980 ? '24px' : 'auto';
  box.style.transform = `translate(${sx}px,${sy}px)`;
}
function startDrag(d: NonNullable<typeof V.drag>) {
  const m = A.w.monsters.find(x => x.id === d.id)!;
  const art = monArt(m);
  const [iw, ih] = ART.size(art, 3);
  must('#drag').innerHTML = `<div style="position:absolute;left:${-iw / 2}px;top:${-ih + 10}px;filter:drop-shadow(0 6px 6px #0005)">${img(art, 3)}</div>`;
  d.el.classList.add('dragging');
  must('#stage').classList.add('dragging');
  renderDock({ all: true });
  snd.play('ui');
}
const segList = (ss: M.Seg[]) => ss.map(segTxt).join(', ');
function moveDrag(d: NonNullable<typeof V.drag>, sx: number, sy: number) {
  const w = A.w, m = w.monsters.find(x => x.id === d.id)!;
  const t = hitTarget(sx, sy);
  $$('.plat.hover,.plot.hover,.plat.bad,.plot.bad').forEach(e => e.classList.remove('hover', 'bad'));
  const head = `<b>${M.monName(m)}</b> Lv ${M.monLevel(m)}`;
  if (!t || t.id === m.d || (t.kind === 'tray' && !m.d)) { setPreview(null); d.target = null; dragCard(sx, sy, head + '<br><span class="dim">던전 발판이나 빈 부지에 놓아요</span>'); return; }
  d.target = t;
  const check = M.placeCheckAuto(w, m, t.id);
  if (!check.ok) {
    t.el?.classList.add('bad');
    setPreview(null);
    dragCard(sx, sy, `${head}<br><span class="bad">✕ ${check.msg}</span>`);
    return;
  }
  t.el?.classList.add('hover');
  const mods: M.Mods = { move: { id: m.id, to: t.id } };
  if (t.id && !w.plots[t.id].open) mods.open = t.id;
  const pv = M.preview(w, mods);
  setPreview(pv, { kind: 'move' });
  const name = t.kind === 'tray' ? '대기실' : plotName(t.id!);
  const lines = [`${head} → <b>${name}</b>`];
  if (t.id) lines.push(pv.before[t.id] ? `던전 Lv ${pv.before[t.id]} → ${pv.after[t.id]}` : `새 던전 Lv ${pv.after[t.id]}${check.opens ? (check.ticket ? ' · 🎫 개업권 사용' : ` · 개업 스마일 ${n(check.openCost || 0)}`) : ''}`);
  if (check.slotCost) lines.push(`직원 자리 +1 · 스마일 ${n(check.slotCost)}`);
  if (m.d && pv.before[m.d] !== pv.after[m.d]) lines.push(`${plotName(m.d)} Lv ${pv.before[m.d]} → ${pv.after[m.d] || '휴업'}`);
  if (pv.lost.length) lines.push(`<span class="bad">✕ ${segList(pv.lost)} 비어요${pv.stranded ? ` · ${pv.stranded}명 갈 곳 잃음` : ''}${pv.entranceBlocked ? ' · 입구가 막혀요' : ''}</span>`);
  if (pv.gained.length) lines.push(`<span class="ok">✓ ${segList(pv.gained)} 이어져요${pv.rescued ? ` · ${pv.rescued}명 구출` : ''}</span>`);
  if (!pv.lost.length && !pv.gained.length) lines.push('<span class="dim">빈틈 변화 없음</span>');
  dragCard(sx, sy, lines.join('<br>'));
}
function endDrag(d: NonNullable<typeof V.drag>) {
  const w = A.w, t = d.target;
  $$('.plat.hover,.plot.hover,.plat.bad,.plot.bad').forEach(e => e.classList.remove('hover', 'bad'));
  must('#drag').innerHTML = '';
  d.el.classList.remove('dragging');
  must('#stage').classList.remove('dragging');
  V.drag = null;
  setPreview(null);
  A.ui.targets = null; A.ui.newTok = null;
  $$('.plat.target').forEach(e => e.classList.remove('target'));
  if (!t) { renderDock(); return; }
  const m = w.monsters.find(x => x.id === d.id)!;
  const r = M.placeAuto(w, d.id, t.id);
  if (!r.ok) { nope(r.msg); renderDock(); return; }
  snd.play('place');
  if (r.opened || r.slotCost) {
    const parts = [r.opened ? `${plotName(t.id!)} 개업${r.ticket ? ' (개업권)' : ''}` : '', r.slotCost ? '직원 자리 +1' : ''].filter(Boolean).join(' · ');
    toast(`${parts}${r.openCost + r.slotCost ? ` · 스마일 −${n(r.openCost + r.slotCost)}` : ''}`, {
      undo: () => {
        if (r.opened) M.unopen(w, t.id!, m.id, r.from, r.openCost, r.ticket); else m.d = r.from;
        if (r.slotCost) M.slotDown(w, t.id!, r.slotCost);
      },
    });
  }
  emit([{ type: 'placed', mon: m.id, to: t.id, from: r.from }]);
  refresh();
}

function bindInput() {
  const stage = must('#stage');
  stage.addEventListener('pointerdown', e => {
    A.ui.lastInput = performance.now();
    snd.unlock();
    const tgt = e.target as Element;
    if (tgt.closest('.evb')) return;
    const el = tgt.closest('#world .mon, #dock .tok[data-mon]') as HTMLElement | null;
    if (!el || A.ui.mode !== 'world' || A.ui.sheet || A.ui.modal) return;
    V.drag = { id: +(el.dataset.id || el.dataset.mon || 0), el, x0: e.clientX, y0: e.clientY, started: false };
    e.preventDefault();
  });
  window.addEventListener('pointermove', e => {
    A.ui.lastInput = performance.now();
    const d = V.drag;
    if (!d) return;
    const [sx, sy] = toStage(e.clientX, e.clientY);
    if (!d.started && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6 * A.fit.s) { d.started = true; startDrag(d); }
    if (d.started) moveDrag(d, sx, sy);
  });
  window.addEventListener('pointerup', () => {
    const d = V.drag;
    if (!d) return;
    if (d.started) endDrag(d); else { V.drag = null; A.openMonPop(d.id, d.el); }
  });
  window.addEventListener('pointercancel', () => { if (V.drag && V.drag.started) { V.drag.target = null; endDrag(V.drag); } V.drag = null; });
  must('#world').addEventListener('click', e => {
    if (A.ui.sheet === 'evolve') return;
    const tgt = e.target as Element;
    const ev = tgt.closest('.evb') as HTMLElement | null;
    if (ev) { A.openEvolve(+(ev.dataset.ev || 0)); return; }
    const bx = tgt.closest('[data-box]') as HTMLElement | null;
    if (bx) { A.openBox(+(bx.dataset.box || 0), bx); return; }
    const g = tgt.closest('.gapb, .gaplabel') as HTMLElement | null;
    if (g) { A.openHire({ seg: V.gapSegs[+(g.dataset.gap || 0)] }); return; }
    const b = tgt.closest('[data-busy]') as HTMLElement | null;
    if (b) { A.openDungeon(b.dataset.busy!, { hl: 'seat' }); return; }
    const p = tgt.closest('.plat') as HTMLElement | null;
    if (p) { A.openDungeon(p.dataset.plat!); return; }
  });
}

// ── 추천 자리 강조 ──────────────────────────────────────────
A.highlightBest = (monId: number, only?: PlotId[]) => {
  const best = only || M.bestPlaces(A.w, monId);
  A.ui.targets = best;
  A.ui.newTok = monId;
  renderDock();
  $$('.plat.target').forEach(e => e.classList.remove('target'));
  best.forEach(id => { if (V.plats[id]) V.plats[id].el.classList.add('target'); });
  return best;
};

// ── 매 프레임 ───────────────────────────────────────────────
function build() {
  buildBands();
  const b = L('bands'); b.classList.add('notrans'); setTimeout(() => b.classList.remove('notrans'), 300);
  L('plats').innerHTML = ''; L('walkers').innerHTML = ''; L('fxL').innerHTML = ''; boxEls.clear();
  V.plats = {}; V.mons = {}; V.walkers = new Map(); V.lanes = {};
  initCam(); V.snap = true;
}
function tick(dt: number, now: number) {
  if (A.ui.mode !== 'world') { V.snap = true; return; }
  lvFxBudget = Math.min(6, lvFxBudget + dt * 5);
  camTick(dt);
  layoutBands();
  layoutPlats(dt);
  layoutMarks(V.dirty);
  layoutMons(now);
  layoutWalkers(dt, now);
  if (!V.snap && !A.demo) ambient(dt);
  if (V.preview && (camMoving || V.dirty)) drawPreview();
  V.dirty = false;
  V.snap = false;
}
