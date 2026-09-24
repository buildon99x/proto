/*
 * S2 던전 현장 (+ S4 매니저 권한)
 * 현장은 결과를 바꾸지 않는다. 서버(sim)가 낸 사건을 샘플로 재생한다.
 */
import { A, $, must, h, n, clamp, img, monArt, ro, plotName, plotShort, lvColor, dur, snd, nope, toast, emit, refresh, M } from './app';
import { REGIONS, SPECIES, TRAITS, type PlotId } from '../sim/content';
import { ART } from './art';

const GY = 212, PLAT = { y: 104, x0: 720, x1: 1120 };
interface MonA { id: number; el: HTMLElement; art: string; iw: number; ih: number; x: number; home: number; y: number; ph: number; dead: boolean }
interface AdvA { id: number; el: HTMLElement; x: number; y: number; tx: number; speed: number; swingT: number; mon: MonA | null; face: number; leaving: boolean; fresh: boolean; lvT?: number }
const DV = {
  id: null as PlotId | null, mons: {} as Record<number, MonA>, advs: new Map<number, AdvA>(), killAcc: 0, panelT: 0,
  hl: null as string | null, hlUntil: 0,
  panel, tick, bind,
};
A.dv = DV;

function regionOf(D: number) { return REGIONS.find(r => D <= r.to) || REGIONS[4]; }

A.openDungeon = (id, opt) => {
  const w = A.w, D = M.levelsOf(w)[id];
  if (!D) return;
  A.closeSheet();
  A.ui.mode = 'dungeon';
  DV.id = id; DV.hl = (opt && opt.hl) || null; DV.hlUntil = performance.now() + 3500; DV.mons = {}; DV.advs = new Map(); DV.killAcc = 0;
  const r = regionOf(D);
  const el = must('#dview');
  el.hidden = false;
  el.innerHTML = `
    <div class="subbar">
      <button class="back" id="dBack" title="월드 길로 (Esc)">← 월드</button>
      <span class="dname">${plotName(id)}</span>
      <span class="chip lv" id="dLv" title="던전 레벨 = 직원 평균 레벨. 모험가는 ±5 안에서 즐겁다"></span>
      <span class="chip" id="dSeat"></span>
      <span id="dEv"></span>
      <span class="meta" id="dMeta"></span>
    </div>
    <div class="scene b${r.n}" id="dScene">
      <div class="sky"></div>
      <div class="hill" style="left:-60px;bottom:40px;width:520px;height:190px;background:#0000000d"></div>
      <div class="hill" style="left:640px;bottom:40px;width:700px;height:230px;background:#0000000a"></div>
      <div class="cloud" style="left:150px;top:22px;width:120px"></div><div class="cloud" style="left:880px;top:14px;width:160px"></div>
      <div class="pl" style="left:${PLAT.x0}px;width:${PLAT.x1 - PLAT.x0}px;top:${PLAT.y}px"></div>
      <div class="gr"></div>
      <div id="dActors" style="position:absolute;inset:0"></div>
      <div id="dFx" style="position:absolute;inset:0;pointer-events:none"></div>
    </div>
    <div class="dpanel" id="dPanel"></div>`;
  must('#dBack').onclick = A.closeDungeon;
  panel();
  snd.play('ui');
  if (A.T) A.T.poke();
};
A.closeDungeon = () => {
  A.ui.mode = 'world';
  const el = must('#dview');
  el.hidden = true; el.innerHTML = '';
  DV.id = null;
  A.world.snap = true;
  refresh();
  if (A.T) A.T.poke();
};

// ── 하단 패널: 직원 슬롯 · 매니저 권한 · 표정 ─────────────────
function panel() {
  const w = A.w, id = DV.id;
  if (!id) return;
  const D = M.levelsOf(w)[id];
  if (!D) { A.closeDungeon(); return; }
  const d = w.dungeons[id], ms = M.monsIn(w, id);
  const occ = w.advs.filter(a => a.st === 'happy' && a.d === id).length;
  const wait = w.advs.filter(a => a.st === 'busy' && a.near === id).length;
  const lvEl = must('#dLv');
  lvEl.textContent = `던전 Lv ${D} · 적정 Lv ${Math.max(1, D - 5)}–${D + 5}`;
  lvEl.style.setProperty('--pg', lvColor(D));
  must('#dSeat').textContent = `자리 ${occ} / ${d.seats}`;
  must('#dEv').innerHTML = d.event ? `<span class="chip ev" style="--c:${d.event.kind === 'exp' ? 'var(--exp)' : 'var(--drop)'}">${d.event.kind === 'exp' ? '경험치 2배' : '드랍 2배'} · ${dur(d.event.end - w.t)} 남음</span>` : '';
  const stars = M.dungeonStars(d), nextStar = M.JOY_STARS[stars];
  must('#dMeta').textContent = `던전 ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · 누적 즐거움 ${n(d.joy)}${nextStar ? ` / ${n(nextStar)}` : ''}명·시간`;

  let slots = '';
  ms.forEach(m => {
    const need = M.evolveNeed(m), ready = M.canEvolve(m) && !A.T.hideEvolve(), sp = SPECIES[m.sp];
    const tr = sp.trait ? TRAITS[sp.trait] : null;
    slots += `<div class="slot ${ready ? 'ready' : ''} ${M.isBoss(m) ? 'bossc' : ''}">
      <div class="nm">${M.monName(m)}</div><div class="lvl">Lv ${M.monLevel(m)} · ${m.stage + 1}단계${M.isBoss(m) ? ' · 보스' : ''}</div>
      <div class="ph">${img(monArt(m), 3)}</div>
      <span class="trait" title="${tr ? tr.desc : '특성 없음'}">${tr ? tr.icon + ' ' + tr.name : '— 표준'}</span>
      ${ready ? `<button class="evbtn" data-ev="${m.id}">▲ 진화 가능</button>` : ''}
      <div class="tenure"><div class="t"><span>근속(퇴근)</span><span>${need === Infinity ? '최종 단계' : n(Math.min(m.tenure, need)) + ' / ' + n(need)}</span></div>
      <div class="bar"><i style="width:${need === Infinity ? 100 : Math.min(100, 100 * m.tenure / need)}%"></i></div></div></div>`;
  });
  for (let i = ms.length; i < d.slots; i++) slots += `<button class="slot empty" data-hire="1" title="뽑으면 이 던전에 바로 배치"><div><div class="plus">+</div>신입 채용<br><small>빈 직원 자리</small></div></button>`;
  const sc = M.slotCost(w, d);
  if (sc != null) slots += `<button class="slot lock" data-slotup="1"><div>+ 직원 자리<br><span class="costrow"><i class="mini-can"></i>${n(sc)}</span></div></button>`;

  const hl = performance.now() < DV.hlUntil ? DV.hl : null;
  const evCost = M.eventCost(w, id), free = w.tut.freeEvent > 0;
  const lim = M.activeEvents(w) >= M.maxEvents(w);
  const pw = (kind: 'exp' | 'drop', c: string, ic: string, name: string, line: string) => {
    const on = !!d.event && d.event.kind === kind;
    const other = !!d.event && !on;
    const dis = !on && (other || lim);
    const sub = on ? `${dur(d.event!.end - w.t)} 남음` : other ? '던전당 이벤트 하나' : lim ? `동시에 ${M.maxEvents(w)}개까지` : line;
    const cost = on ? `<div class="ring" style="--c:${c};--p:${((d.event!.end - w.t) / M.EVENT_MIN).toFixed(3)}"><b>ON</b></div>` : free ? '<span class="okc">첫 번 무료</span>' : `<i class="mini-can"></i>${n(evCost)}`;
    return `<button class="pw ${on ? 'on' : ''} ${dis ? 'dis' : ''} ${hl === kind ? 'hl' : ''}" style="--c:${c}" data-evt="${kind}" ${dis || on ? 'disabled' : ''}>
      <span class="ei" style="background:${c}">${ic}</span><span><b>${name}</b><small>${sub}</small></span><span class="cost">${cost}</span></button>`;
  };
  const seatC = M.seatCost(w, d);
  const powers = pw('exp', 'var(--exp)', 'EXP', '경험치 2배 · 4시간', '모험가를 위로 올려보낸다')
    + pw('drop', 'var(--drop)', 'DROP', '드랍 2배 · 4시간', '모험가를 불러 모은다')
    + `<button class="pw ${seatC == null ? 'dis' : ''} ${hl === 'seat' ? 'hl' : ''}" data-seat="1" ${seatC == null ? 'disabled' : ''}><span class="ei" style="background:var(--flow)">+4</span><span><b>자리 확장</b><small>${seatC == null ? '20석이 최대' : `자리 ${d.seats} → ${d.seats + 4}`}</small></span><span class="cost">${seatC == null ? '' : `<i class="mini-can"></i>${n(seatC)}`}</span></button>`;

  const recent = Math.round(d.recentLv);
  const html = `
    <div class="slotsw"><h5>직원 <small>던전 레벨 = 직원 평균 레벨 · ${ms.length}/${d.slots}</small></h5><div class="slots">${slots}</div></div>
    <div class="powers"><h5>매니저 권한 <small>이벤트 ${M.activeEvents(w)}/${M.maxEvents(w)} 사용 중</small></h5>${powers}</div>
    <div class="moods"><h5>지금 이 던전의 모험가</h5>
      <div class="mrow"><span class="e">😊</span>즐거움<div class="bar"><i style="width:${Math.min(100, 100 * occ / d.seats)}%;background:var(--smile)"></i></div><span class="n">${occ}</span></div>
      <div class="mrow"><span class="e">😠</span>자리 기다림<div class="bar"><i style="width:${Math.min(100, 100 * wait / d.seats)}%;background:var(--busy)"></i></div><span class="n">${wait}</span></div>
      <div class="mrow"><span class="e">✨</span>최근 1시간 레벨업<span class="n wide">${recent}</span></div>
      <div class="mrow note">적정 구간 밖으로 자란 모험가는<br>맞는 던전을 찾아 스스로 떠나요</div>
    </div>`;
  const p = must('#dPanel');
  if ((p as HTMLElement & { _h?: string })._h !== html) { p.innerHTML = html; (p as HTMLElement & { _h?: string })._h = html; }
}

function bind() {
  must('#dview').addEventListener('click', e => {
    const w = A.w, id = DV.id;
    if (!id) return;
    const tgt = e.target as Element;
    const ev = tgt.closest('[data-ev]') as HTMLElement | null;
    if (ev) { A.openEvolve(+(ev.dataset.ev || 0)); return; }
    if (tgt.closest('[data-hire]')) { A.openHire({ into: id }); return; }
    if (tgt.closest('[data-slotup]')) {
      const r = M.slotUp(w, id);
      if (!r.ok) return nope(r.msg);
      snd.play('hire'); toast(`직원 자리 +1 · 스마일 −${n(r.cost)}`, { undo: () => M.slotDown(w, id, r.cost) }); refresh(); return;
    }
    const t = tgt.closest('[data-evt]') as HTMLElement | null;
    if (t) {
      const kind = t.dataset.evt as 'exp' | 'drop';
      const r = M.startEvent(w, id, kind);
      if (!r.ok) return nope(r.msg);
      snd.play('event');
      eventBurst(kind);
      toast(`${kind === 'exp' ? '경험치' : '드랍'} 2배 시작${r.free ? ' · 무료' : ` · 스마일 −${n(r.cost)}`}`, { undo: () => M.cancelEvent(w, id, r.cost, r.free) });
      emit([{ type: 'eventStart', d: id, kind }]);
      refresh(); return;
    }
    if (tgt.closest('[data-seat]')) {
      const r = M.seatUp(w, id);
      if (!r.ok) return nope(r.msg);
      snd.play('hire');
      fx(`<div class="pop g" style="font-size:22px">자리 +4</div>`, 640, 90, 1300);
      toast(`자리 확장 · 스마일 −${n(r.cost)}`, { undo: () => M.seatDown(w, id, r.cost) });
      refresh(); return;
    }
  });
}

// ── 현장 배우들 ─────────────────────────────────────────────
function fx(html: string, x: number, y: number, life = 1200) {
  const box = $('#dFx'); if (!box) return;
  const el = h(`<div class="fx" style="left:${x}px;top:${y}px">${html}</div>`);
  box.appendChild(el); if (!A.demo) setTimeout(() => el.remove(), life);
}
function eventBurst(kind: 'exp' | 'drop') {
  if (!$('#dFx')) return;
  const c = kind === 'exp' ? '#3FA9F5' : '#FF7BB0';
  fx(`<div class="burst" style="-webkit-text-stroke:3px ${c};text-shadow:0 4px 0 ${c}">${kind === 'exp' ? 'EXP' : 'DROP'} ×2!</div>`, 640, 70, 1700);
  for (const [, a] of DV.advs) {
    if (a.leaving) continue;
    fx(`<div class="ringfx" style="border-color:${c}"></div>`, a.x, a.y - 60, 1000);
  }
}
function monSpots(k: number) {
  // 땅과 발판에 고르게 흩어 놓는다. 3마리부터 발판을 쓴다.
  const out: { x: number; y: number }[] = [];
  const onPlat = (i: number) => k >= 3 && i % 2 === 1;
  const ground = [...Array(k).keys()].filter(i => !onPlat(i)), plat = [...Array(k).keys()].filter(onPlat);
  ground.forEach((i, j) => { out[i] = { y: GY, x: 170 + (j + 0.5) * (k >= 3 ? 520 : 940) / ground.length }; });
  plat.forEach((i, j) => { out[i] = { y: PLAT.y, x: PLAT.x0 + (j + 0.5) * (PLAT.x1 - PLAT.x0) / plat.length }; });
  if (k >= 3) ground.forEach((i, j) => { if (j === ground.length - 1 && ground.length > 1) out[i].x = 1180; });
  return out;
}
function syncMons() {
  const w = A.w, ms = M.monsIn(w, DV.id!), spots = monSpots(ms.length), box = must('#dActors');
  const alive = new Set<number>();
  ms.forEach((m, i) => {
    alive.add(m.id);
    let a = DV.mons[m.id];
    const art = monArt(m);
    if (!a || a.art !== art) {
      if (a) a.el.remove();
      const [iw, ih] = ART.size(art, 3);
      const el = h(`<div class="actor walking">${img(art, 3)}</div>`);
      box.appendChild(el);
      a = DV.mons[m.id] = { id: m.id, el, art, iw, ih, x: spots[i].x, home: spots[i].x, y: spots[i].y, ph: Math.random() * 6, dead: false };
    }
    a.home = spots[i].x; a.y = spots[i].y;
  });
  for (const id in DV.mons) if (!alive.has(+id)) { DV.mons[id].el.remove(); delete DV.mons[id]; }
}
function syncAdvs() {
  const w = A.w, id = DV.id!, box = must('#dActors');
  const here = w.advs.filter(a => a.st === 'happy' && a.d === id);
  const hereSet = new Set(here.map(a => a.id));
  for (const [aid, a] of DV.advs) {
    if (!hereSet.has(aid) && !a.leaving) {
      a.leaving = true;
      const s = w.advs.find(x => x.id === aid);
      const to = s && s.d ? plotShort(s.d) : '';
      const tag = s ? (s.st === 'happy' ? `Lv ${s.lv} · ${ro(to)} →` : s.st === 'search' ? `Lv ${s.lv} · 갈 곳을 찾는 중 😐` : `Lv ${s.lv} · 자리 기다리는 중 😠`) : '🎓 졸업!';
      a.el.insertAdjacentHTML('beforeend', `<span class="tag">${tag}</span>`);
      a.tx = 1340; a.speed = 110;
      setTimeout(() => { a.el.remove(); DV.advs.delete(aid); }, 3200);
    }
  }
  let slot = [...DV.advs.values()].filter(a => !a.leaving).length;
  for (const s of here) {
    if (DV.advs.has(s.id) || slot >= 12) continue;
    const el = h(`<div class="actor walking">${img('a' + s.look, 3)}<span class="emo">😊</span></div>`);
    box.appendChild(el);
    DV.advs.set(s.id, { id: s.id, el, x: -40, y: GY, tx: 0, speed: 160, swingT: 1 + Math.random(), mon: null, face: 1, leaving: false, fresh: true });
    slot++;
  }
  // 몬스터 배정: 한 몬스터에 양옆으로
  const ms = Object.values(DV.mons);
  let k = 0;
  for (const [, a] of DV.advs) {
    if (a.leaving || !ms.length) continue;
    const m = ms[k % ms.length], side = Math.floor(k / ms.length);
    a.mon = m; a.y = m.y;
    const off = [-62, 62, -104, 104][side % 4];
    const onPlat = m.y === PLAT.y;
    a.tx = onPlat ? clamp(m.home + off, PLAT.x0 + 18, PLAT.x1 - 18) : clamp(m.home + off, 30, 1250);
    a.face = a.tx < m.home ? 1 : -1;
    // 새로 온 모험가는 제자리 가까이에서 걸어 들어온다 (발판이면 발판 끝에서)
    if (a.fresh) { a.fresh = false; a.x = onPlat ? PLAT.x0 + 12 : Math.max(-40, a.tx - 240); if (!A.demo) a.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }); }
    k++;
  }
}

let kT = 0;
function tick(dt: number, now: number) {
  if (A.ui.mode !== 'dungeon' || !DV.id) return;
  if (!M.levelsOf(A.w)[DV.id]) { A.closeDungeon(); return; }
  syncMons(); syncAdvs();
  for (const id in DV.mons) {
    const m = DV.mons[id];
    const busy = [...DV.advs.values()].some(a => a.mon === m && !a.leaving);
    m.x = m.home + (busy ? 0 : Math.sin(now / 1000 * 0.6 + m.ph) * 30);
    m.el.style.transform = `translate(${m.x - m.iw / 2}px,${m.y - m.ih + 2}px)`;
    m.el.classList.toggle('walking', !busy);
  }
  for (const [, a] of DV.advs) {
    const dx = a.tx - a.x;
    const moving = Math.abs(dx) > 2;
    if (moving) { a.x += Math.sign(dx) * Math.min(Math.abs(dx), a.speed * dt); a.el.classList.toggle('flip', dx < 0); }
    else if (a.mon) a.el.classList.toggle('flip', a.face < 0);
    a.el.classList.toggle('walking', moving);
    a.el.style.transform = `translate(${a.x - 21}px,${a.y - 63}px)`;
    if (!moving && a.mon && !a.leaving && !a.mon.dead) {
      a.swingT -= dt;
      if (a.swingT <= 0) {
        a.swingT = 0.8 + Math.random() * 0.9;
        a.el.classList.remove('swing'); void a.el.offsetWidth; a.el.classList.add('swing');
        fx(`<div class="slash"></div>`, a.mon.x - 22, a.mon.y - 60, 300);
        const mm = a.mon;
        mm.el.classList.add('hit'); setTimeout(() => mm.el.classList.remove('hit'), 90);
      }
    }
  }
  // 퇴근: 서버가 낸 퇴근 수를 샘플로 재생 (초당 최대 2회)
  kT -= dt;
  if (DV.killAcc >= 1 && kT <= 0) {
    const targets = Object.values(DV.mons).filter(m => !m.dead && [...DV.advs.values()].some(a => a.mon === m && !a.leaving));
    if (targets.length) {
      DV.killAcc -= 1; kT = 0.5;
      const m = targets[Math.floor(Math.random() * targets.length)];
      m.dead = true; m.el.classList.add('dead');
      fx(`<div class="puff big">${[[0, 4, 14], [10, 0, 16], [18, 5, 13], [6, 9, 12]].map(([l, t, s]) => `<i style="left:${l}px;top:${t}px;width:${s}px;height:${s}px"></i>`).join('')}</div>`, m.x, m.y - 20, 700);
      fx(`<div class="pop" style="transform:translateX(-50%)">퇴근!</div>`, m.x, m.y - m.ih - 20, 1200);
      fx(`<div class="pop y" style="transform:translateX(-50%);font-size:13px">+😊</div>`, m.x + 30, m.y - m.ih, 1100);
      A.world.mote(m.x, m.y - 30 + 56 + 44);
      snd.play('poof');
      setTimeout(() => {
        m.dead = false; m.el.classList.remove('dead');
        fx(`<div class="pop b" style="transform:translateX(-50%)">출근! 🪪</div>`, m.x, m.y - m.ih - 16, 1100);
      }, 1400);
    }
  }
  DV.killAcc = Math.min(DV.killAcc, 6);
  DV.panelT -= dt;
  if (DV.panelT <= 0) { DV.panelT = 0.6; if (!$('#dPanel:hover')) panel(); }
}

A.handlers.push(ev => {
  if (A.ui.mode !== 'dungeon' || !DV.id) return;
  for (const e of ev) {
    if (e.type === 'kill' && e.d === DV.id) DV.killAcc += e.n;
    if (e.type === 'levelup' && e.d === DV.id) {
      let a = DV.advs.get(e.id);
      if (!a || a.leaving) {
        const cand = [...DV.advs.values()].filter(x => !x.leaving);
        if (!cand.length) continue;
        a = cand[Math.floor(Math.random() * cand.length)];
      }
      if (a.lvT && performance.now() - a.lvT < 700) continue;
      a.lvT = performance.now();
      const top = Math.max(40, a.y - 118);
      fx(`<div class="bigpillar" style="height:${a.y}px"></div>`, a.x, 0, 1100);
      fx(`<div class="lvup" style="transform:translateX(-50%)">LEVEL UP!</div>`, a.x, top, 1400);
      fx(`<div class="pop y" style="transform:translateX(-50%);font-size:14px">Lv ${e.lv}</div>`, a.x, top + 34, 1300);
      snd.play('levelup');
      if (A.T) A.T.saw('levelup');
    }
  }
});
