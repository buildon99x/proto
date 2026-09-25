/* MSW 주식회사 프로토타입 — S2 던전 현장 (+ S4 매니저 권한)
 * 현장은 결과를 바꾸지 않는다. 서버(sim)가 낸 사건을 샘플로 재생한다.
 */
(function () {
  'use strict';
  const A = window.A, M = A.M;
  const GY = 212, PLAT = { y: 104, x0: 720, x1: 1120 };
  const DV = (A.dv = { id: null, mons: {}, advs: new Map(), killAcc: 0, panelT: 0, hl: null });

  function regionOf(D) { return M.REGIONS.find(r => D <= r.to) || M.REGIONS[4]; }

  A.openDungeon = (id, opt) => {
    const w = A.w, D = M.levelsOf(w)[id];
    if (!D) return;
    A.closeSheet();
    A.ui.mode = 'dungeon';
    DV.id = id; DV.hl = opt && opt.hl; DV.hlUntil = performance.now() + 3500; DV.mons = {}; DV.advs = new Map(); DV.killAcc = 0;
    const r = regionOf(D);
    const el = A.$('#dview');
    el.hidden = false;
    el.innerHTML = `
      <div class="subbar">
        <button class="back" id="dBack">← 월드</button>
        <span class="dname">${A.plotName(id)}</span>
        <span class="chip lv" id="dLv" style="--pg:${A.lvColor(D)}"></span>
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
    A.$('#dBack').onclick = A.closeDungeon;
    DV.panel();
    A.snd.play('ui');
    if (A.T) A.T.poke();
  };
  A.closeDungeon = () => {
    A.ui.mode = 'world';
    A.$('#dview').hidden = true;
    A.$('#dview').innerHTML = '';
    DV.id = null;
    A.world.snap = true;
    A.refresh();
    if (A.T) A.T.poke();
  };

  // ── 하단 패널: 직원 슬롯 · 매니저 권한 · 표정 ───────────
  DV.panel = () => {
    const w = A.w, id = DV.id;
    if (!id) return;
    const D = M.levelsOf(w)[id];
    if (!D) { A.closeDungeon(); return; }
    const d = w.dungeons[id], ms = M.monsIn(w, id);
    const occ = w.advs.filter(a => a.st === 'happy' && a.d === id).length;
    const wait = w.advs.filter(a => a.st === 'busy' && a.near === id).length;
    A.$('#dLv').textContent = `던전 Lv ${D} · 적정 Lv ${Math.max(1, D - 5)}–${D + 5}`;
    A.$('#dLv').style.setProperty('--pg', A.lvColor(D));
    A.$('#dSeat').textContent = `자리 ${occ} / ${d.seats}`;
    A.$('#dEv').innerHTML = d.event ? `<span class="chip ev" style="--c:${d.event.type === 'exp' ? 'var(--exp)' : 'var(--drop)'}">${d.event.type === 'exp' ? '경험치 2배' : '드랍 2배'} · ${A.dur(d.event.end - w.t)} 남음</span>` : '';
    const stars = d.joy >= 2000 ? 3 : d.joy >= 500 ? 2 : d.joy >= 100 ? 1 : 0;
    A.$('#dMeta').textContent = `던전 ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · 누적 즐거움 ${A.n(d.joy)}명·시간`;

    let slots = '';
    ms.forEach(m => {
      const need = M.evolveNeed(m), ready = M.canEvolve(m) && !A.T.hideEvolve(), sp = M.SPECIES[m.sp];
      const tr = sp.trait ? M.TRAITS[sp.trait] : null;
      slots += `<div class="slot ${ready ? 'ready' : ''}">
        <div class="nm">${M.monName(m)}</div><div class="lvl">Lv ${M.monLevel(m)} · ${m.stage + 1}단계${M.isBoss(m) ? ' · 보스' : ''}</div>
        <div class="ph">${A.img(A.monArt(m), 3)}</div>
        <span class="trait">${tr ? tr.icon + ' ' + tr.name : '— 표준'}</span>
        ${ready ? `<button class="evbtn" data-ev="${m.id}">▲ 진화 가능</button>` : ''}
        <div class="tenure"><div class="t"><span>근속(퇴근)</span><span>${need === Infinity ? '최종 단계' : A.n(Math.min(m.tenure, need)) + ' / ' + A.n(need)}</span></div>
        <div class="bar"><i style="width:${need === Infinity ? 100 : Math.min(100, 100 * m.tenure / need)}%"></i></div></div></div>`;
    });
    for (let i = ms.length; i < d.slots; i++) slots += `<div class="slot empty" data-hire="1"><div><div class="plus">+</div>신입 채용<br><small style="font-weight:700">빈 직원 자리</small></div></div>`;
    const sc = M.slotCost(d);
    if (sc != null && d.slots < 5) slots += `<div class="slot lock" data-slotup="1" style="width:92px"><div>+ 직원 자리<br><span style="display:flex;gap:3px;justify-content:center;align-items:center;margin-top:4px"><i class="mini-can"></i>${A.n(sc)}</span></div></div>`;

    const hl = performance.now() < (DV.hlUntil || 0) ? DV.hl : null;
    const evCost = M.eventCost(w, id), free = w.tut.freeEvent > 0;
    const lim = M.activeEvents(w) >= M.maxEvents(w);
    const pw = (type, c, ic, name, line) => {
      const on = d.event && d.event.type === type;
      const other = d.event && !on;
      const dis = !on && (other || lim);
      const sub = on ? `${A.dur(d.event.end - w.t)} 남음` : other ? '던전당 이벤트 하나' : lim ? `동시에 ${M.maxEvents(w)}개까지` : line;
      const cost = on ? `<div class="ring" style="--c:${c};--p:${((d.event.end - w.t) / M.EVENT_MIN).toFixed(3)}"><b>ON</b></div>` : free ? '<span style="color:var(--flow)">첫 번 무료</span>' : `<i class="mini-can"></i>${A.n(evCost)}`;
      return `<button class="pw ${on ? 'on' : ''} ${dis ? 'dis' : ''} ${hl === type ? 'hl' : ''}" style="--c:${c}" data-evt="${type}" ${dis || on ? 'disabled' : ''}>
        <span class="ei" style="background:${c}">${ic}</span><span><b>${name}</b><small>${sub}</small></span><span class="cost">${cost}</span></button>`;
    };
    const seatC = M.seatCost(d);
    const powers = pw('exp', 'var(--exp)', 'EXP', '경험치 2배 · 4시간', '모험가를 위로 올려보낸다')
      + pw('drop', 'var(--drop)', 'DROP', '드랍 2배 · 4시간', '모험가를 불러 모은다')
      + `<button class="pw ${seatC == null ? 'dis' : ''} ${hl === 'seat' ? 'hl' : ''}" data-seat="1" ${seatC == null ? 'disabled' : ''}><span class="ei" style="background:var(--flow)">+4</span><span><b>자리 확장</b><small>${seatC == null ? '20석이 최대' : `자리 ${d.seats} → ${d.seats + 4}`}</small></span><span class="cost">${seatC == null ? '' : `<i class="mini-can"></i>${A.n(seatC)}`}</span></button>`;

    const recent = Math.round(d.recentLv);
    A.$('#dPanel').innerHTML = `
      <div><h5>직원 <small>던전 레벨 = 직원 평균 레벨 · ${ms.length}/${d.slots}</small></h5><div class="slots">${slots}</div></div>
      <div class="powers"><h5>매니저 권한 <small>이벤트 ${M.activeEvents(w)}/${M.maxEvents(w)} 사용 중</small></h5>${powers}</div>
      <div class="moods"><h5>지금 이 던전의 모험가</h5>
        <div class="mrow"><span class="e">😊</span>즐거움<div class="bar"><i style="width:${Math.min(100, 100 * occ / d.seats)}%;background:var(--smile)"></i></div><span class="n">${occ}</span></div>
        <div class="mrow"><span class="e">😠</span>자리 기다림<div class="bar"><i style="width:${Math.min(100, 100 * wait / d.seats)}%;background:var(--busy)"></i></div><span class="n">${wait}</span></div>
        <div class="mrow"><span class="e">✨</span>최근 1시간 레벨업<span class="n" style="margin-left:auto;width:auto">${recent}</span></div>
        <div class="mrow" style="color:var(--ink2);font-size:11.5px;line-height:1.4;margin-top:4px">적정 구간 밖으로 자란 모험가는<br>맞는 던전을 찾아 스스로 떠나요</div>
      </div>`;
  };

  function bindPanel() {
    A.$('#dview').addEventListener('click', e => {
      const w = A.w, id = DV.id;
      if (!id) return;
      const ev = e.target.closest('[data-ev]');
      if (ev) { A.openEvolve(+ev.dataset.ev); return; }
      if (e.target.closest('[data-hire]')) { A.openHire(); return; }
      if (e.target.closest('[data-slotup]')) {
        const r = M.slotUp(w, id);
        if (!r.ok) return A.nope(r.msg);
        A.snd.play('hire'); A.toast(`직원 자리 +1 · 스마일 −${A.n(r.cost)}`, { undo: () => M.slotDown(w, id, r.cost) }); A.refresh(); return;
      }
      const t = e.target.closest('[data-evt]');
      if (t) {
        const type = t.dataset.evt;
        const r = M.startEvent(w, id, type);
        if (!r.ok) return A.nope(r.msg);
        A.snd.play('event');
        eventBurst(type);
        A.toast(`${type === 'exp' ? '경험치' : '드랍'} 2배 시작${r.free ? ' · 무료' : ` · 스마일 −${A.n(r.cost)}`}`, { undo: () => M.cancelEvent(w, id, r.cost, r.free) });
        A.handlers.forEach(f => f([{ type: 'eventStart', d: id, kind: type }]));
        A.refresh(); return;
      }
      if (e.target.closest('[data-seat]')) {
        const r = M.seatUp(w, id);
        if (!r.ok) return A.nope(r.msg);
        A.snd.play('hire');
        fx(`<div class="pop g" style="font-size:22px">자리 +4</div>`, 640, 90, 1300);
        A.toast(`자리 확장 · 스마일 −${A.n(r.cost)}`, { undo: () => M.seatDown(w, id, r.cost) });
        A.refresh(); return;
      }
    });
  }

  // ── 현장 배우들 ─────────────────────────────────────────
  function fx(html, x, y, life) {
    const box = A.$('#dFx'); if (!box) return;
    const el = A.h(`<div class="fx" style="left:${x}px;top:${y}px">${html}</div>`);
    box.appendChild(el); if (!A.demo) setTimeout(() => el.remove(), life || 1200);
  }
  function eventBurst(type) {
    if (!A.$('#dFx')) return;
    const c = type === 'exp' ? '#3FA9F5' : '#FF7BB0';
    fx(`<div style="font:italic 900 46px 'Arial Black',sans-serif;color:#fff;-webkit-text-stroke:3px ${c};text-shadow:0 4px 0 ${c};white-space:nowrap;transform:translateX(-50%);animation:rise 1.6s forwards">${type === 'exp' ? 'EXP' : 'DROP'} ×2!</div>`, 640, 70, 1700);
    for (const [, a] of DV.advs) {
      if (a.leaving) continue;
      fx(`<div style="width:54px;height:54px;margin-left:-27px;border-radius:50%;border:3px solid ${c};animation:puff .9s forwards"></div>`, a.x, a.y - 60, 1000);
    }
  }
  function monSpots(n) {
    // 땅과 발판에 고르게 흩어 놓는다. 3마리부터 발판을 쓴다.
    const out = [];
    const onPlat = i => n >= 3 && i % 2 === 1;
    const ground = [...Array(n).keys()].filter(i => !onPlat(i)), plat = [...Array(n).keys()].filter(onPlat);
    ground.forEach((i, k) => { out[i] = { y: GY, x: 170 + (k + 0.5) * (n >= 3 ? 520 : 940) / ground.length }; });
    plat.forEach((i, k) => { out[i] = { y: PLAT.y, x: PLAT.x0 + (k + 0.5) * (PLAT.x1 - PLAT.x0) / plat.length }; });
    if (n >= 3) ground.forEach((i, k) => { if (k === ground.length - 1 && ground.length > 1) out[i].x = 1180; });
    return out;
  }
  function syncMons() {
    const w = A.w, ms = M.monsIn(w, DV.id), spots = monSpots(ms.length), box = A.$('#dActors');
    const alive = new Set();
    ms.forEach((m, i) => {
      alive.add(m.id);
      let a = DV.mons[m.id];
      const art = A.monArt(m);
      if (!a || a.art !== art) {
        if (a) a.el.remove();
        const [iw, ih] = ART.size(art, 3);
        const el = A.h(`<div class="actor walking">${A.img(art, 3)}</div>`);
        box.appendChild(el);
        a = DV.mons[m.id] = { id: m.id, el, art, iw, ih, x: spots[i].x, home: spots[i].x, y: spots[i].y, ph: Math.random() * 6, dead: false };
      }
      a.home = spots[i].x; a.y = spots[i].y;
    });
    for (const id in DV.mons) if (!alive.has(+id)) { DV.mons[id].el.remove(); delete DV.mons[id]; }
  }
  function syncAdvs() {
    const w = A.w, id = DV.id, box = A.$('#dActors');
    const here = w.advs.filter(a => a.st === 'happy' && a.d === id);
    const hereSet = new Set(here.map(a => a.id));
    for (const [aid, a] of DV.advs) {
      if (!hereSet.has(aid) && !a.leaving) {
        a.leaving = true;
        const s = w.advs.find(x => x.id === aid);
        const to = s && s.d ? A.plotName(s.d).replace('헤네시스 ', '') : '';
        const tag = s ? (s.st === 'happy' ? `Lv ${s.lv} · ${A.josa(to, '으로', '로')} →` : s.st === 'search' ? `Lv ${s.lv} · 갈 곳을 찾는 중 😐` : `Lv ${s.lv} · 자리 기다리는 중 😠`) : '🎓 졸업!';
        a.el.insertAdjacentHTML('beforeend', `<span class="tag">${tag}</span>`);
        a.tx = 1340; a.speed = 110;
        setTimeout(() => { a.el.remove(); DV.advs.delete(aid); }, 3200);
      }
    }
    const shown = [...DV.advs.values()].filter(a => !a.leaving).length;
    let slot = shown;
    for (const s of here) {
      if (DV.advs.has(s.id) || slot >= 12) continue;
      const el = A.h(`<div class="actor walking">${A.img('a' + s.look, 3)}<span class="emo">😊</span></div>`);
      box.appendChild(el);
      DV.advs.set(s.id, { id: s.id, el, x: -40, y: GY, tx: 0, speed: 160, swingT: 1 + Math.random(), mon: null, side: 0, leaving: false, fresh: true });
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
      a.tx = onPlat ? A.clamp(m.home + off, PLAT.x0 + 18, PLAT.x1 - 18) : A.clamp(m.home + off, 30, 1250);
      a.face = a.tx < m.home ? 1 : -1;
      // 새로 온 모험가는 제자리 가까이에서 걸어 들어온다 (발판이면 발판 끝에서)
      if (a.fresh) { a.fresh = false; a.x = onPlat ? PLAT.x0 + 12 : Math.max(-40, a.tx - 240); if (!A.demo) a.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }); }
      k++;
    }
  }

  let kT = 0;
  DV.tick = (dt, now) => {
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
          a.mon.el.classList.add('hit'); setTimeout(() => a.mon && a.mon.el.classList.remove('hit'), 90);
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
        fxPuff(m.x, m.y - 20);
        fx(`<div class="pop" style="transform:translateX(-50%)">퇴근!</div>`, m.x, m.y - m.ih - 20, 1200);
        fx(`<div class="pop y" style="transform:translateX(-50%);font-size:13px">+😊</div>`, m.x + 30, m.y - m.ih, 1100);
        const [sx, sy] = [m.x, m.y - 30 + 56 + 44];
        A.world.mote(sx, sy);
        A.snd.play('poof');
        setTimeout(() => {
          m.dead = false; m.el.classList.remove('dead');
          fx(`<div class="pop" style="transform:translateX(-50%);font-size:12px;-webkit-text-stroke:1px #3e9fdb;text-shadow:0 2px 0 #3e9fdb">출근! 🪪</div>`, m.x, m.y - m.ih - 16, 1100);
        }, 1400);
      }
    }
    DV.killAcc = Math.min(DV.killAcc, 6);
    DV.panelT -= dt;
    if (DV.panelT <= 0) { DV.panelT = 0.6; if (!A.$('#dPanel:hover')) DV.panel(); }
  };
  function fxPuff(x, y) {
    fx(`<div class="puff" style="transform:scale(2)">${[[0, 4, 14], [10, 0, 16], [18, 5, 13], [6, 9, 12]].map(([l, t, s]) => `<i style="left:${l}px;top:${t}px;width:${s}px;height:${s}px"></i>`).join('')}</div>`, x, y, 700);
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
        A.snd.play('levelup');
        A.T && A.T.saw('levelup');
      }
    }
  });

  DV.bind = bindPanel;
})();
