/* MSW 주식회사 프로토타입 — S1 월드 길: 레벨이 곧 위치다
 * 가로축 = 레벨. 던전 = 떠 있는 발판(폭 = 적정 구간 11칸). 모험가 = 자기 레벨 위치에 선 사람.
 * 발판이 없는 땅 = 빈틈. 모험가가 거기 멈춰 선다.
 */
(function () {
  'use strict';
  const A = window.A, M = A.M;
  const X0 = 34, GROUND = 452, LANE = 100, TOP = 56;
  const WS = 3, WW = 30, WH = 42; // 월드 도트 배율, 모험가 크기
  const VIEW = [25, 40, 55, 70, 76];
  const V = (A.world = { k: 1, max: 25, lanes: {}, disp: {}, plats: {}, mons: {}, walkers: new Map(), exits: {}, gapSegs: [], dirty: true, preview: null, snap: true });
  V.x = L => X0 + L * V.k;
  V.laneTop = i => GROUND - LANE * (i + 1);
  V.GROUND = GROUND; V.TOP = TOP;

  const L_bands = () => A.$('#bands'), L_marks = () => A.$('#marks'), L_plats = () => A.$('#plats'), L_walk = () => A.$('#walkers'), L_fx = () => A.$('#fxL'), L_ui = () => A.$('#ui');

  // ── 카메라 ──────────────────────────────────────────────
  const camTarget = () => VIEW[A.w.chapter - 1];
  V.initCam = () => { V.max = camTarget(); V.k = (1280 - X0 - 24) / V.max; V.snap = true; };
  let camMoving = false;
  function camTick(dt) {
    const t = camTarget();
    camMoving = Math.abs(V.max - t) > 0.02;
    V.max = camMoving ? A.lerp(V.max, t, Math.min(1, dt * 1.4)) : t;
    V.k = (1280 - X0 - 24) / V.max;
  }

  // ── 발판 층 배정 (겹치지 않게, 한번 앉은 층은 되도록 유지) ──
  function assignLanes(levels) {
    const ids = Object.keys(levels).sort((a, b) => levels[a] - levels[b]);
    const used = [], res = {};
    const fits = (i, lo, hi) => !(used[i] || []).some(([a, b]) => lo < b + 0.8 && hi > a - 0.8);
    for (const id of ids) {
      const lo = levels[id] - 5.5, hi = levels[id] + 5.5;
      let li = V.lanes[id];
      if (li == null || !fits(li, lo, hi)) { li = 0; while (!fits(li, lo, hi) && li < 3) li++; }
      (used[li] = used[li] || []).push([lo, hi]);
      res[id] = li;
    }
    return res;
  }

  // ── 지역 띠 ─────────────────────────────────────────────
  function buildBands() {
    const box = L_bands();
    box.innerHTML = '';
    M.REGIONS.forEach(r => {
      box.appendChild(A.h(`<div class="band b${r.n}" data-r="${r.n}"><div class="sky"></div><div class="hills"></div>
        <div class="name">${r.name}<small>Lv ${Math.max(1, r.from)}–${Math.min(70, r.to)}</small></div>
        <div class="lamps"></div><div class="fog"></div><div class="lock"><b>🔒</b><span>${r.n - 1}장 결재 후 개방</span></div></div>`));
    });
    M.REGIONS.forEach(r => { if (r.n <= A.w.chapter) lightUp(r.n, false); });
  }
  /** 지역 불빛: 결재하면 새 지역에 등불이 하나씩 켜진다 (F4) */
  function lightUp(n, animate) {
    const band = A.$(`.band[data-r="${n}"] .lamps`, L_bands());
    if (!band || band.childElementCount) return;
    const spots = [[12, 58], [24, 70], [37, 52], [50, 66], [63, 55], [76, 72], [88, 60]];
    spots.forEach(([x, y], i) => {
      const el = A.h(`<i class="lamp" style="left:${x}%;top:${y}%;${animate ? `animation-delay:${1.4 + i * 0.22}s` : 'animation:none'}"></i>`);
      band.appendChild(el);
      if (animate) setTimeout(() => A.snd.play('tinyup'), (1.4 + i * 0.22) * 1000);
    });
  }
  function layoutBands() {
    A.$$('.band', L_bands()).forEach(el => {
      const r = M.REGIONS[+el.dataset.r - 1];
      const left = r.n === 1 ? 0 : V.x(r.from), right = r.n === 5 ? Math.max(1280, V.x(r.to)) : V.x(r.to);
      el.style.left = left + 'px'; el.style.width = Math.max(0, right - left) + 'px';
      el.classList.toggle('lit', r.n <= A.w.chapter);
      el.style.display = left > 1290 ? 'none' : '';
    });
  }

  // ── 땅 표시: 눈금, 연결 띠, 빈틈, 입구·졸업 문 ─────────────
  let marksSig = '';
  function layoutMarks(force) {
    const w = A.w, end = M.roadEnd(w);
    const lv = M.levelsOf(w);
    const segs = M.gapSegments(w, lv);
    const stuck = segs.map(g => w.advs.filter(a => a.st === 'search' && a.lv >= g[0] && a.lv <= g[1]).length);
    const sig = JSON.stringify([segs, stuck, lv, end, Math.round(V.k * 100)]);
    if (!force && sig === marksSig && !camMoving) return;
    marksSig = sig;
    const box = L_marks();
    let html = '', badges = '';
    for (let L = 1; L <= V.max; L++) if (L === 1 || L % 5 === 0) html += `<div class="tick" style="left:${V.x(L)}px">${L}</div>`;
    M.REGIONS.forEach(r => { if (r.n <= w.chapter + 1 && V.x(r.from) < 1280) html += `<div class="rname" style="left:${(V.x(Math.max(r.from, 0.5)) + Math.min(1270, V.x(r.to))) / 2}px">${r.name} · Lv ${Math.max(1, r.from)}–${r.to}</div>`; });
    // 연결 띠 (1 ~ 졸업선)
    const c = M.coveredSet(lv);
    let s = null;
    for (let L = 1; L <= end + 1; L++) {
      if (L <= end && c[L]) { if (s === null) s = L; }
      else if (s !== null) { html += `<div class="cov" style="left:${V.x(s - 0.5)}px;width:${(L - s) * V.k}px"></div>`; s = null; }
    }
    // 빈틈: 멈춘 모험가가 있으면 "지금 고칠 곳"(진한 빨강 + !), 없으면 "끊긴 길"(옅은 점선)
    segs.forEach((g, i) => {
      const x0 = V.x(g[0] - 0.5), wd = (g[1] - g[0] + 1) * V.k, cx = x0 + wd / 2;
      const hot = stuck[i] > 0, rng = g[0] === g[1] ? g[0] : g[0] + '–' + g[1];
      html += `<div class="gap ${hot ? '' : 'cold'}" style="left:${x0}px;width:${wd}px"></div>`;
      html += `<div class="gaplabel ${hot ? '' : 'cold'}" data-gap="${i}" style="left:${cx}px">${hot ? '빈틈' : '끊긴 길'} Lv ${rng}</div>`;
      if (hot) badges += `<div class="gapb" data-gap="${i}" style="left:${cx}px;top:${GROUND - 104}px">!<small>${stuck[i]}</small></div>`;
    });
    // 입구와 졸업 문
    html += `<div class="gate" style="left:${V.x(0.2)}px;top:${GROUND}px"><div class="post" style="left:-4px;height:44px;top:-44px"></div><div class="sign" style="left:-18px;top:-66px">입구</div></div>`;
    const gx = V.x(end + 0.5);
    html += `<div class="gate grad" style="left:${gx}px;top:${GROUND}px"><div class="arch" style="top:-74px"></div><div class="sign" style="left:-24px;top:-98px">🎓 졸업</div></div>`;
    box.innerHTML = html;
    A.$('#gapUi').innerHTML = badges;
    // 빈틈 해소 감지 (F3)
    const prev = V.gapSegs;
    if (!V.snap) prev.forEach(g => {
      const healed = [];
      for (let L = g[0]; L <= g[1]; L++) if (L <= end && c[L]) healed.push(L);
      if (healed.length) healGap(healed[0], healed[healed.length - 1]);
    });
    V.gapSegs = segs;
  }
  function healGap(a, b) {
    const x0 = V.x(a - 0.5), wd = (b - a + 1) * V.k;
    const el = A.h(`<div class="gap heal" style="left:${x0}px;width:${wd}px;z-index:7"></div>`);
    L_fx().appendChild(el); if (!A.demo) setTimeout(() => el.remove(), 1000);
    fxText('뚫렸다!', x0 + wd / 2, GROUND - 60, 'pop g');
    A.snd.play('pop');
    A.handlers.forEach(f => f([{ type: 'healed', a, b }]));
  }

  // ── 발판 (던전) ─────────────────────────────────────────
  function layoutPlats(dt) {
    const w = A.w, lv = M.levelsOf(w), lanes = assignLanes(lv), end = M.roadEnd(w);
    V.lanes = lanes;
    const box = L_plats();
    const occ = {}, busy = {};
    for (const a of w.advs) { if (a.st === 'happy') occ[a.d] = (occ[a.d] || 0) + 1; else if (a.st === 'busy' && a.near) busy[a.near] = (busy[a.near] || 0) + 1; }
    for (const id in lv) {
      let p = V.plats[id];
      const D = lv[id];
      if (!p) {
        const el = A.h(`<div class="plat" data-plat="${id}"><div class="aura"></div><div class="top"></div><div class="body"></div><div class="pb"></div></div>`);
        box.appendChild(el);
        p = V.plats[id] = { el, D, y: V.laneTop(lanes[id]) + (V.snap ? 0 : -30), sig: '' };
        if (!V.snap) el.animate([{ opacity: 0, transform: 'scaleX(.4)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' });
      }
      const ty = V.laneTop(lanes[id]);
      p.D = V.snap ? D : A.lerp(p.D, D, Math.min(1, dt * 3.2));
      if (Math.abs(p.D - D) < 0.01) p.D = D;
      p.y = V.snap ? ty : A.lerp(p.y, ty, Math.min(1, dt * 5));
      const left = V.x(Math.max(0.5, p.D - 5.5)), wd = V.x(p.D + 5.5) - left;
      p.left = left; p.w = wd; p.top = p.y;
      const s = p.el.style;
      s.left = left + 'px'; s.width = wd + 'px'; s.top = p.y + 'px';
      s.setProperty('--pg', A.lvColor(D));
      const d = w.dungeons[id];
      const ev = d.event;
      p.el.classList.toggle('exp', !!ev && ev.type === 'exp');
      p.el.classList.toggle('drop', !!ev && ev.type === 'drop');
      p.el.classList.toggle('fog', D - 5 > end);
      const o = occ[id] || 0;
      const sig = `${D}|${o}|${d.seats}|${busy[id] || 0}|${ev ? ev.type + Math.ceil((ev.end - w.t) / 5) : ''}|${Math.round(wd / 20)}`;
      if (sig !== p.sig) {
        p.sig = sig;
        const narrow = wd < 250;
        p.el.querySelector('.body').innerHTML = `<b>${narrow ? A.plotName(id).replace('헤네시스 ', '') : A.plotName(id)}</b><span class="lv">Lv ${D}</span><span class="seat ${o >= d.seats ? 'full' : ''}">${o}/${d.seats}</span>`;
        let pb = '';
        if (busy[id]) pb += `<div class="pill busy" data-busy="${id}" title="자리가 없어 기다리는 모험가">🌀 ${busy[id]}</div>`;
        if (ev) {
          const rem = ev.end - w.t, c = ev.type === 'exp' ? 'var(--exp)' : 'var(--drop)';
          pb += `<div class="ring" style="--c:${c};--p:${(rem / M.EVENT_MIN).toFixed(3)}"><b>${ev.type === 'exp' ? 'EXP' : 'DROP'}<br>${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2, '0')}</b></div>`;
        }
        p.el.querySelector('.pb').innerHTML = pb;
      }
    }
    for (const id in V.plats) if (!lv[id]) {
      const el = V.plats[id].el;
      el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(40px)' }], { duration: 400 }).onfinish = () => el.remove();
      delete V.plats[id];
    }
  }

  // ── 직원 (발판 위를 천천히 오간다) ───────────────────────
  function layoutMons(now) {
    const w = A.w, box = L_plats();
    const alive = new Set();
    for (const id in V.plats) {
      const p = V.plats[id];
      const ms = M.monsIn(w, id);
      ms.forEach((m, i) => {
        alive.add(m.id);
        let e = V.mons[m.id];
        const art = 'm:' + A.monArt(m);
        if (!e || e.art !== art) {
          if (e) e.el.remove();
          const [iw, ih] = ART.size(art, WS);
          const el = A.h(`<div class="mon walk" data-id="${m.id}">${A.img(art, WS)}</div>`);
          box.appendChild(el);
          e = V.mons[m.id] = { el, art, iw, ih, ph: (m.id * 1.7) % 6.28, ready: null, x: null };
        }
        const base = p.left + p.w * (i + 1) / (ms.length + 1);
        const wob = Math.sin(now / 1000 * 0.45 + e.ph) * Math.min(22, p.w / (ms.length + 1) / 3);
        const dir = Math.cos(now / 1000 * 0.45 + e.ph);
        const x = base + wob;
        e.el.style.left = (x - e.iw / 2) + 'px';
        e.el.style.top = (p.top - e.ih + 3) + 'px';
        e.el.classList.toggle('flip', dir > 0);
        e.cx = x; e.cy = p.top - e.ih / 2;
        const r = M.canEvolve(m) && !A.T.hideEvolve();
        if (r !== e.ready) {
          e.ready = r;
          const old = e.el.querySelector('.evb'); if (old) old.remove();
          if (r) e.el.appendChild(A.h(`<div class="evb" data-ev="${m.id}" title="진화할 수 있어요">▲</div>`));
        }
        e.el.classList.toggle('dragging', !!(V.drag && V.drag.id === m.id));
      });
    }
    for (const id in V.mons) if (!alive.has(+id)) { V.mons[id].el.remove(); delete V.mons[id]; }
  }
  V.poofMon = (monId) => {
    const e = V.mons[monId];
    if (!e || e.el.classList.contains('poofed')) return;
    e.el.classList.add('poofed');
    puff(e.cx, e.cy + 6);
    fxText('퇴근!', e.cx, e.cy - 14, 'pop');
    setTimeout(() => { e.el.classList.remove('poofed'); }, 1100);
  };

  // ── 모험가 ──────────────────────────────────────────────
  const EMO = { search: '😐', busy: '😠' };
  function walkerTarget(a, v) {
    const w = A.w;
    if (a.st === 'happy' && a.d && V.plats[a.d]) {
      const need = 10 + a.lv, f = Math.min(0.92, a.prog / need);
      return { surf: a.d, x: V.x(a.lv - 0.46 + f * 0.9 + a.jit * 0.1), y: V.plats[a.d].top };
    }
    // 멈춰 선 사람들은 겹치지 않게 조금씩 흩어 선다
    if (a.st === 'busy' || a.st === 'search') return { surf: 'g', x: V.x(a.lv) + (((a.id * 7) % 5) - 2) * 11, y: GROUND - 1 };
    return { surf: 'g', x: V.x(0.3), y: GROUND - 1 };
  }
  function layoutWalkers(dt, now) {
    const w = A.w, box = L_walk();
    const alive = new Set();
    for (const a of w.advs) {
      alive.add(a.id);
      let v = V.walkers.get(a.id);
      const tg = walkerTarget(a, v);
      if (!v) {
        const el = A.h(`<div class="wk">${A.img('m:a' + a.look, WS)}<span class="emo"></span></div>`);
        box.appendChild(el);
        const sx = V.snap ? tg.x : V.x(0) - 20;
        v = { id: a.id, el, emo: el.querySelector('.emo'), x: sx, y: V.snap ? tg.y : GROUND - 1, surf: V.snap ? tg.surf : 'g', jump: null, face: 1, emoSt: '', flashUntil: 0 };
        V.walkers.set(a.id, v);
      }
      if (V.snap) { v.x = tg.x; v.y = tg.y; v.surf = tg.surf; v.jump = null; }
      else if (tg.surf !== v.surf && !v.jump) {
        v.jump = { t: 0, dur: 0.55, x0: v.x, y0: v.y };
        v.surf = tg.surf;
      }
      let moving = false;
      if (v.jump) {
        const j = v.jump; j.t += dt;
        const p = Math.min(1, j.t / j.dur);
        v.x = A.lerp(j.x0, tg.x, p);
        v.y = A.lerp(j.y0, tg.y, p) - Math.sin(Math.PI * p) * (36 + Math.abs(tg.y - j.y0) * 0.35);
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
      v.el.classList.toggle('moving', moving);
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
    for (const [id, v] of V.walkers) if (!alive.has(id)) exitWalker(v, V.exits[id] || 'leave');
  }
  function exitWalker(v, how) {
    V.walkers.delete(v.id);
    delete V.exits[v.id];
    if (V.snap || A.ui.mode !== 'world') { v.el.remove(); return; }
    if (how === 'grad') {
      const gx = V.x(M.roadEnd(A.w) + 0.5);
      v.emo.textContent = '🎓'; v.emo.className = 'emo on';
      v.el.animate([
        { transform: `translate(${v.x - WW / 2}px,${v.y - WH}px)` },
        { transform: `translate(${gx - WW / 2}px,${GROUND - WH - 1}px)`, offset: 0.55 },
        { transform: `translate(${gx - WW / 2}px,${GROUND - 130}px)`, opacity: 0 },
      ], { duration: 1500, easing: 'ease-in-out' }).onfinish = () => v.el.remove();
      setTimeout(() => { confetti(gx, GROUND - 60); fxText('+' + M.SMILE_GRAD, gx, GROUND - 90, 'pop y'); A.snd.play('grad'); }, 800);
    } else {
      v.emo.textContent = '😢'; v.emo.className = 'emo on';
      v.el.animate([{ opacity: 1, transform: `translate(${v.x - WW / 2}px,${v.y - WH}px)` }, { opacity: 0, transform: `translate(${v.x - WW / 2 - 20}px,${v.y - WH + 8}px)` }], { duration: 1300, delay: 300 }).onfinish = () => v.el.remove();
    }
  }

  // ── 연출 ────────────────────────────────────────────────
  function fx(html, x, y, life) {
    const el = A.h(`<div class="fx" style="left:${x}px;top:${y}px">${html}</div>`);
    L_fx().appendChild(el);
    if (!A.demo) setTimeout(() => el.remove(), life || 1200);
    return el;
  }
  function fxText(t, x, y, cls) { return fx(`<div class="${cls}" style="transform:translateX(-50%)">${t}</div>`, x, y, 1300); }
  V.fxText = fxText;
  function puff(x, y) {
    fx(`<div class="puff">${[[0, 4, 14], [10, 0, 16], [18, 5, 13], [6, 9, 12]].map(([l, t, s]) => `<i style="left:${l}px;top:${t}px;width:${s}px;height:${s}px"></i>`).join('')}</div>`, x, y - 10, 700);
  }
  function confetti(x, y) {
    const cols = ['#FFC531', '#3CC47C', '#FF7BB0', '#3FA9F5', '#8B6CFF'];
    let html = '';
    for (let i = 0; i < 16; i++) html += `<i class="confetti" style="background:${cols[i % 5]};--dx:${(Math.random() - 0.5) * 120}px;--dy:${-30 - Math.random() * 70}px"></i>`;
    fx(html, x, y, 1300);
  }
  V.confetti = confetti;
  let lvFxBudget = 0;
  function levelFx(id) {
    const v = V.walkers.get(id);
    if (!v || lvFxBudget <= 0) return;
    lvFxBudget--;
    fx(`<div class="pillar"></div>`, v.x, v.y - 78, 800);
    fx(`<div class="uptxt">UP</div>`, v.x, v.y - 64, 1000);
    v.flashUntil = performance.now() + 1100;
    A.snd.play('tinyup');
  }
  // 스마일 알갱이 → 캔
  V.mote = (sx, sy) => {
    const can = A.$('#can');
    if (!can) return;
    const r = A.rectOf(can);
    const el = A.h(`<div class="mote" style="left:0;top:0"></div>`);
    A.$('#stage').appendChild(el);
    el.animate([
      { transform: `translate(${sx}px,${sy}px) scale(1)` },
      { transform: `translate(${(sx + r.x) / 2}px,${Math.min(sy, r.y) - 60}px) scale(1.2)`, offset: 0.45 },
      { transform: `translate(${r.x + 6}px,${r.y + 8}px) scale(.6)` },
    ], { duration: 750, easing: 'cubic-bezier(.4,0,.8,.6)' }).onfinish = () => {
      el.remove(); can.classList.remove('gulp'); void can.offsetWidth; can.classList.add('gulp'); A.snd.play('coin');
    };
  };

  let moteT = 0, poofT = 0;
  function ambient(dt) {
    const w = A.w;
    moteT -= dt; poofT -= dt;
    const happy = w.advs.filter(a => a.st === 'happy');
    if (moteT <= 0 && happy.length) {
      moteT = 0.55 + Math.random() * 0.5;
      const a = happy[Math.floor(Math.random() * happy.length)], v = V.walkers.get(a.id);
      if (v) V.mote(v.x, v.y - 26 + TOP);
    }
    if (poofT <= 0) {
      poofT = 1.6 + Math.random() * 1.4;
      const ids = [...new Set(happy.map(a => a.d))].filter(id => V.plats[id]);
      if (ids.length) {
        const ms = M.monsIn(w, ids[Math.floor(Math.random() * ids.length)]);
        if (ms.length) V.poofMon(ms[Math.floor(Math.random() * ms.length)].id);
      }
    }
  }

  // ── 사건 수신 ───────────────────────────────────────────
  A.handlers.push(ev => {
    for (const e of ev) {
      if (e.type === 'chapter') lightUp(e.n, true);
      if (e.type === 'grad') V.exits[e.id] = 'grad';
      else if (e.type === 'leave') V.exits[e.id] = 'leave';
      else if (e.type === 'levelup' && A.ui.mode === 'world') levelFx(e.id);
      else if (e.type === 'approval') { A.renderDoc(); A.snd.play('event'); }
    }
  });

  // ── 미리보기 (드래그·진화): 결과를 월드 위에서 본다 ────────
  V.setPreview = (pv, opt) => {
    V.preview = pv ? Object.assign({}, pv, opt || {}) : null;
    if (pv) V.preview.lostSet = new Set(pv.lost.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)));
    drawPreview();
  };
  function drawPreview() {
    const box = L_ui();
    box.querySelectorAll('.ghost,.gap.preview').forEach(e => e.remove());
    const pv = V.preview;
    if (!pv) return;
    const lanes = assignLanes(pv.after);
    for (const id in pv.after) {
      if (pv.before[id] === pv.after[id]) continue;
      const D = pv.after[id];
      const top = V.plats[id] ? V.plats[id].top : V.laneTop(lanes[id]);
      const gl = V.x(Math.max(0.5, D - 5.5));
      const el = A.h(`<div class="ghost ${pv.kind === 'move' ? 'move' : ''}" style="left:${gl}px;width:${V.x(D + 5.5) - gl}px;top:${top}px">Lv ${pv.before[id] ? pv.before[id] + ' → ' : ''}${D}</div>`);
      box.appendChild(el);
    }
    for (const id in pv.before) if (!pv.after[id] && V.plats[id]) {
      const p = V.plats[id];
      box.appendChild(A.h(`<div class="ghost" style="left:${p.left}px;width:${p.w}px;top:${p.top}px;border-color:var(--alert);background:#ff5a4e22">휴업</div>`));
    }
    pv.lost.forEach(([a, b]) => box.appendChild(A.h(`<div class="gap preview" style="left:${V.x(a - 0.5)}px;width:${(b - a + 1) * V.k}px"></div>`)));
  }

  // ── 드래그: 직원 옮기기 ─────────────────────────────────
  function dropTargets() {
    const t = [];
    for (const id in V.plats) {
      const p = V.plats[id];
      t.push({ id, kind: 'plat', x: p.left, y: TOP + p.top - 70, w: p.w, h: 98 });
    }
    A.$$('#plots .plot[data-plot]').forEach(el => { const r = A.rectOf(el); t.push(Object.assign({ id: el.dataset.plot, kind: 'plot', el }, r)); });
    const tr = A.rectOf(A.$('.trayw'));
    t.push(Object.assign({ id: null, kind: 'tray' }, tr));
    return t;
  }
  function hitTarget(sx, sy) {
    const ts = dropTargets();
    // 겹치면 발판 위쪽(더 높은 층)보다 포인터에 가까운 것을 고른다
    let best = null, bd = 1e9;
    for (const t of ts) {
      if (sx >= t.x && sx <= t.x + t.w && sy >= t.y && sy <= t.y + t.h) {
        const d = Math.abs(sy - (t.y + t.h - 20));
        if (d < bd) { bd = d; best = t; }
      }
    }
    return best;
  }
  function dragCard(sx, sy, html) {
    const box = A.$('#drag');
    let c = box.querySelector('.card');
    if (!c) { c = A.h('<div class="card"></div>'); box.appendChild(c); }
    c.innerHTML = html;
    // 포인터가 아래·오른쪽 끝이면 카드를 위·왼쪽으로 뒤집는다
    c.style.top = sy > 400 ? 'auto' : '-8px'; c.style.bottom = sy > 400 ? '40px' : 'auto';
    c.style.left = sx > 980 ? 'auto' : '24px'; c.style.right = sx > 980 ? '24px' : 'auto';
    box.style.transform = `translate(${sx}px,${sy}px)`;
  }
  function startDrag(d) {
    const m = A.w.monsters.find(x => x.id === d.id);
    const art = A.monArt(m);
    const [iw, ih] = ART.size(art, 3);
    const box = A.$('#drag');
    box.innerHTML = `<div style="position:absolute;left:${-iw / 2}px;top:${-ih + 10}px;filter:drop-shadow(0 6px 6px #0005)">${A.img(art, 3)}</div>`;
    d.el.classList.add('dragging');
    V.drag = d;
    A.renderDock({ all: true });
    A.snd.play('ui');
  }
  function moveDrag(d, sx, sy) {
    const w = A.w, m = w.monsters.find(x => x.id === d.id);
    const t = hitTarget(sx, sy);
    A.$$('.plat.hover,.plot.hover,.plat.bad').forEach(e => e.classList.remove('hover', 'bad'));
    let html = `<b>${M.monName(m)}</b> Lv ${M.monLevel(m)}`;
    if (!t || t.id === m.d || (t.kind === 'tray' && !m.d)) { V.setPreview(null); d.target = null; dragCard(sx, sy, html + '<br><span style="opacity:.7">던전 발판이나 빈 부지에 놓아요</span>'); return; }
    d.target = t;
    const check = M.placeCheck(w, m, t.id);
    const tel = t.kind === 'plat' ? V.plats[t.id].el : t.el;
    if (!check.ok) {
      if (tel) tel.classList.add('bad');
      V.setPreview(null);
      dragCard(sx, sy, `${html}<br><span class="bad">✕ ${check.msg}</span>`);
      return;
    }
    if (tel) tel.classList.add('hover');
    const mods = { move: { id: m.id, to: t.id } };
    if (t.kind === 'plot' && !w.plots[t.id].open) mods.open = t.id;
    const pv = M.preview(w, mods);
    V.setPreview(pv, { kind: 'move' });
    const name = t.kind === 'tray' ? '대기실' : A.plotName(t.id);
    let lines = [`${html} → <b>${name}</b>`];
    if (t.id) lines.push(pv.before[t.id] ? `던전 Lv ${pv.before[t.id]} → ${pv.after[t.id]}` : `새 던전 Lv ${pv.after[t.id]}${check.openCost ? ` · 개업 스마일 ${A.n(check.openCost)}` : ''}`);
    if (m.d && pv.before[m.d] !== pv.after[m.d]) lines.push(`${A.plotName(m.d)} Lv ${pv.before[m.d]} → ${pv.after[m.d] || '휴업'}`);
    if (pv.lost.length) lines.push(`<span class="bad">✕ ${pv.lost.map(s => s[0] === s[1] ? 'Lv ' + s[0] : `Lv ${s[0]}–${s[1]}`).join(', ')} 비어요${pv.stranded ? ` · ${pv.stranded}명 갈 곳 잃음` : ''}</span>`);
    if (pv.gained.length) lines.push(`<span class="ok">✓ ${pv.gained.map(s => s[0] === s[1] ? 'Lv ' + s[0] : `Lv ${s[0]}–${s[1]}`).join(', ')} 이어져요${pv.rescued ? ` · ${pv.rescued}명 구출` : ''}</span>`);
    if (!pv.lost.length && !pv.gained.length) lines.push('<span style="opacity:.75">빈틈 변화 없음</span>');
    dragCard(sx, sy, lines.join('<br>'));
  }
  function endDrag(d) {
    const w = A.w, t = d.target;
    A.$$('.plat.hover,.plot.hover,.plat.bad').forEach(e => e.classList.remove('hover', 'bad'));
    A.$('#drag').innerHTML = '';
    d.el.classList.remove('dragging');
    V.drag = null;
    V.setPreview(null);
    A.ui.targets = null; A.ui.newTok = null;
    A.$$('.plat.target').forEach(e => e.classList.remove('target'));
    if (!t) { A.renderDock(); return; }
    const m = w.monsters.find(x => x.id === d.id);
    const from = m.d;
    const r = M.place(w, d.id, t.id);
    if (!r.ok) { A.nope(r.msg); A.renderDock(); return; }
    A.snd.play('place');
    if (r.openCost) {
      A.toast(`${A.plotName(t.id)} 개업 · 스마일 −${A.n(r.openCost)}`, { undo: () => { M.monsIn(w, t.id).forEach(x => { x.d = x.id === m.id ? from : null; }); w.plots[t.id].open = false; w.smile += r.openCost; } });
    }
    A.handlers.forEach(f => f([{ type: 'placed', mon: m.id, to: t.id, from }]));
    A.refresh();
  }
  V.tapMon = (id, el) => A.openMonPop(id, el);

  function bindInput() {
    const stage = A.$('#stage');
    let d = null;
    stage.addEventListener('pointerdown', e => {
      A.ui.lastInput = performance.now();
      A.snd.unlock();
      if (e.target.closest('.evb')) return;
      const el = e.target.closest('#world .mon, #dock .tok[data-mon]');
      if (!el || A.ui.mode !== 'world' || A.ui.sheet || A.ui.modal) return;
      d = { id: +(el.dataset.id || el.dataset.mon), el, x0: e.clientX, y0: e.clientY, started: false };
      e.preventDefault();
    });
    window.addEventListener('pointermove', e => {
      A.ui.lastInput = performance.now();
      if (!d) return;
      const [sx, sy] = A.toStage(e.clientX, e.clientY);
      if (!d.started && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6 * A.fit.s) { d.started = true; startDrag(d); }
      if (d.started) moveDrag(d, sx, sy);
    });
    window.addEventListener('pointerup', e => {
      if (!d) return;
      const dd = d; d = null;
      if (dd.started) endDrag(dd); else V.tapMon(dd.id, dd.el);
    });
    A.$('#world').addEventListener('click', e => {
      if (A.ui.sheet === 'evolve') return;
      const ev = e.target.closest('.evb');
      if (ev) { A.openEvolve(+ev.dataset.ev); return; }
      const g = e.target.closest('.gapb, .gaplabel');
      if (g) { A.openHire(); return; }
      const b = e.target.closest('[data-busy]');
      if (b) { A.openDungeon(b.dataset.busy, { hl: 'seat' }); return; }
      const p = e.target.closest('.plat');
      if (p) { A.openDungeon(p.dataset.plat); return; }
    });
  }

  // ── 추천 자리 강조 ──────────────────────────────────────
  A.highlightBest = monId => {
    const best = M.bestPlaces(A.w, monId);
    A.ui.targets = best;
    A.ui.newTok = monId;
    A.renderDock();
    A.$$('.plat.target').forEach(e => e.classList.remove('target'));
    best.forEach(id => { if (V.plats[id]) V.plats[id].el.classList.add('target'); });
    return best;
  };

  // ── 매 프레임 ───────────────────────────────────────────
  V.build = () => { buildBands(); L_bands().classList.add('notrans'); setTimeout(() => L_bands().classList.remove('notrans'), 300); L_plats().innerHTML = ''; L_walk().innerHTML = ''; V.plats = {}; V.mons = {}; V.walkers = new Map(); V.initCam(); V.snap = true; };
  V.tick = (dt, now) => {
    if (A.ui.mode !== 'world') { V.snap = true; return; }
    lvFxBudget = Math.min(6, lvFxBudget + dt * 5);
    camTick(dt);
    layoutBands();
    layoutPlats(dt);
    layoutMarks(V.dirty);
    layoutMons(now);
    layoutWalkers(dt, now);
    if (!V.snap) ambient(dt);
    if (V.preview && (camMoving || V.dirty)) drawPreview();
    V.dirty = false;
    V.snap = false;
  };
  V.bindInput = bindInput;
  V.puff = puff;
})();
