/* MSW 주식회사 프로토타입 — 공통: 상태, 저장, 소리, 시뮬레이션 구동, HUD, 독, 오렌, 토스트 */
(function () {
  'use strict';
  const M = window.MSW;
  const A = (window.A = {});
  A.M = M;

  // ── 도구 ────────────────────────────────────────────────
  A.$ = (s, r) => (r || document).querySelector(s);
  A.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  A.h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  A.n = x => Math.floor(x).toLocaleString('ko-KR');
  A.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  A.lerp = (a, b, t) => a + (b - a) * t;
  A.img = (key, s, cls) => `<img class="px ${cls || ''}" src="${ART.url(key, s)}" width="${ART.size(key, s)[0]}" height="${ART.size(key, s)[1]}" alt="">`;
  A.monArt = m => M.SPECIES[m.sp].art[m.stage];
  A.josa = (word, a, b) => { const c = word.charCodeAt(word.length - 1); return word + ((c - 0xac00) % 28 > 0 ? a : b); };
  A.START_MIN = 21 * 60; // 입사는 저녁 9시 — 첫 출근 리포트가 다음 날 아침이 되게
  A.clockText = t => { const tt = t + A.START_MIN; const d = Math.floor(tt / 1440) + 1, m = Math.floor(tt % 1440); return `D${d} · ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  A.dur = min => { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}시간 ${m}분` : `${m}분`; };
  A.lvColor = L => `hsl(${A.clamp(110 + (L - 1) * 2.4, 110, 285)} 62% 52%)`;
  A.plotName = id => M.plotInfo(id).name;

  // ── 상태 ────────────────────────────────────────────────
  A.w = null;
  A.speed = 1;
  A.ui = { mode: 'world', dview: null, sheet: null, modal: null, lastInput: performance.now(), off: false, intro: false };
  A.checkin = { happy0: 0 };

  // ── 저장 (이 브라우저에만) ──────────────────────────────
  const KEY = 'msw-inc-proto-v2';
  A.save = () => {
    if (!A.w || A.ui.intro || A.demo) return;
    try { localStorage.setItem(KEY, JSON.stringify({ w: A.w, tut: A.T && A.T.st, savedAt: Date.now(), checkin: A.checkin })); } catch (e) { /* 저장 불가 환경 */ }
  };
  A.loadSave = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  A.clearSave = () => { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } };

  // ── 소리 (WebAudio 합성, 신규 효과음 6종 + 원작 대체음) ──
  A.snd = (() => {
    let ac = null, on = true;
    const last = {};
    function ctx() {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(f, t0, dur, type, vol, f2) {
      const a = ctx(); if (!a) return;
      const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
      o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
    }
    function noise(t0, dur, vol, freq) {
      const a = ctx(); if (!a) return;
      const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
      s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq || 1000; g.gain.value = vol || 0.1;
      s.connect(f).connect(g).connect(a.destination); s.start(t);
    }
    const lib = {
      levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.06, 0.16, 'square', 0.035)); tone(1319, 0.24, 0.32, 'triangle', 0.05); },
      tinyup() { tone(988, 0, 0.08, 'square', 0.018); tone(1319, 0.05, 0.1, 'square', 0.015); },
      poof() { noise(0, 0.16, 0.05, 900); },
      coin() { tone(1568, 0, 0.05, 'square', 0.018); tone(2093, 0.045, 0.08, 'square', 0.018); },
      pop() { tone(420, 0, 0.14, 'sine', 0.16, 1200); tone(1400, 0.1, 0.12, 'triangle', 0.05); }, // 빈틈 해소 "뽁"
      stamp() { tone(120, 0, 0.4, 'sine', 0.4, 40); noise(0, 0.14, 0.25, 600); }, // 결재 "쾅"
      tak() { tone(320, 0, 0.07, 'sine', 0.16, 160); noise(0, 0.05, 0.08, 2500); }, // 출근 도장 "탁"
      evolve() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle', 0.07)); [523, 659, 784, 1047].forEach(f => tone(f, 0.46, 0.7, 'triangle', 0.035)); },
      grad() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.13, 'square', 0.028)); },
      ui() { tone(700, 0, 0.05, 'sine', 0.05); },
      place() { tone(240, 0, 0.09, 'sine', 0.14, 120); noise(0, 0.06, 0.05, 1500); },
      event() { [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle', 0.06)); },
      hire() { [660, 880].forEach((f, i) => tone(f, i * 0.08, 0.14, 'triangle', 0.07)); },
    };
    const gap = { levelup: 350, tinyup: 90, poof: 120, coin: 90, grad: 250 };
    return {
      play(n) {
        if (!on) return;
        const now = performance.now();
        if (last[n] && now - last[n] < (gap[n] || 40)) return;
        last[n] = now;
        try { lib[n](); } catch (e) { /* 소리 실패는 무시 */ }
      },
      unlock: ctx,
      get on() { return on; }, set on(v) { on = v; },
    };
  })();

  // ── 화면 맞춤 (1280×720 무대를 창에 맞춘다) ────────────
  A.fit = { s: 1, ox: 0, oy: 0 };
  A.refit = () => {
    const st = A.$('#stage');
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    const ox = (innerWidth - 1280 * s) / 2, oy = (innerHeight - 720 * s) / 2;
    A.fit = { s, ox, oy };
    const tf = `translate(${ox}px,${oy}px) scale(${s})`;
    st.style.transform = tf; st.style.setProperty('--fit', tf);
  };
  A.toStage = (cx, cy) => [(cx - A.fit.ox) / A.fit.s, (cy - A.fit.oy) / A.fit.s];
  A.rectOf = el => { const r = el.getBoundingClientRect(); const [x, y] = A.toStage(r.left, r.top); return { x, y, w: r.width / A.fit.s, h: r.height / A.fit.s }; };
  A.shake = () => { const st = A.$('#stage'); st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); };

  // ── 토스트 (되돌리기 5초) ───────────────────────────────
  A.toast = (msg, opt) => {
    opt = opt || {};
    const box = A.$('#toast');
    const el = A.h(`<div class="tst ${opt.bad ? 'bad' : ''}"><span>${msg}</span></div>`);
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    let life = opt.undo ? 5 : (opt.bad ? 2.2 : 2.4);
    if (opt.undo) {
      const b = A.h(`<button>되돌리기 5</button>`);
      el.appendChild(b);
      let n = 5;
      const iv = setInterval(() => { n--; b.textContent = '되돌리기 ' + n; if (n <= 0) clearInterval(iv); }, 1000);
      b.onclick = () => { clearInterval(iv); opt.undo(); el.remove(); A.snd.play('ui'); A.refresh(); };
    }
    setTimeout(() => el.remove(), life * 1000);
  };
  A.nope = msg => { A.toast(msg, { bad: true }); };

  // ── 숫자 굴리기 ─────────────────────────────────────────
  const shown = { happy: 0, smile: 0 };
  A.hudTick = dt => {
    const w = A.w;
    const hc = M.happyCount(w);
    shown.happy = Math.abs(hc - shown.happy) < 0.6 ? hc : A.lerp(shown.happy, hc, Math.min(1, dt * 6));
    shown.smile = Math.abs(w.smile - shown.smile) < 1 ? w.smile : A.lerp(shown.smile, w.smile, Math.min(1, dt * 5));
    A.$('#vHappy').textContent = Math.round(shown.happy);
    const d = hc - A.checkin.happy0;
    A.$('#vHappyD').textContent = d > 0 ? '▲' + d : '';
    A.$('#vSmile').textContent = A.n(shown.smile);
    A.$('#vClock').textContent = A.clockText(w.t);
  };
  A.hudStatic = () => {
    const w = A.w;
    A.$('#vStars').innerHTML = '★'.repeat(w.stars) + '<i>' + '★'.repeat(5 - w.stars) + '</i>';
    A.$('#vDex').textContent = Object.keys(w.dex).length;
    A.$('#bSound').textContent = A.snd.on ? '🔊' : '🔇';
    A.$$('.proto [data-speed]').forEach(b => b.classList.toggle('on', +b.dataset.speed === A.speed));
  };
  A.bump = id => { const el = A.$(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

  // ── 독: 대기실, 빈 부지, 결재 서류 ──────────────────────
  A.renderDock = opt => {
    opt = opt || {};
    const w = A.w;
    const tr = M.tray(w);
    A.$('#vTray').textContent = `${tr.length}/${M.TRAY_MAX}`;
    const trayEl = A.$('#tray');
    trayEl.innerHTML = '';
    tr.slice(0, 4).forEach(m => {
      const el = A.h(`<div class="tok ${A.ui.newTok === m.id ? 'new' : ''}" data-mon="${m.id}" title="${M.monName(m)} Lv ${M.monLevel(m)}">${A.img('m:' + A.monArt(m), 2)}<span>Lv ${M.monLevel(m)}</span></div>`);
      trayEl.appendChild(el);
    });
    if (tr.length > 4) trayEl.appendChild(A.h(`<div class="tok" style="cursor:default"><b>+${tr.length - 4}</b></div>`));
    if (!tr.length) trayEl.appendChild(A.h(`<div style="font-size:12px;font-weight:800;color:#9aa3ae;width:200px;line-height:1.4">비어 있어요. 채용한 직원은 여기서 기다려요</div>`));

    const pl = A.$('#plots');
    pl.innerHTML = '';
    const lv = M.levelsOf(w);
    // 추천 부지와 이미 열린 빈 던전이 먼저. 드래그 중에는 전부 펼친다
    const tg = A.ui.targets || [];
    const empties = Object.keys(w.plots).filter(id => !lv[id])
      .sort((a, b) => (tg.includes(b) - tg.includes(a)) || (w.plots[b].open - w.plots[a].open) || (M.plotInfo(a).region - M.plotInfo(b).region));
    A.$('.plotsw').classList.toggle('expanded', !!opt.all && empties.length > 2);
    empties.slice(0, opt.all ? 9 : 2).forEach(id => {
      const open = w.plots[id].open;
      const cost = 1000 * M.plotInfo(id).region;
      pl.appendChild(A.h(`<div class="plot ${(A.ui.targets || []).includes(id) ? 'target' : ''}" data-plot="${id}"><b>${A.plotName(id)}</b>${open ? '<em style="color:#1f9d57">빈 던전</em>' : `<em><i class="mini-can"></i>${A.n(cost)}</em>`}</div>`));
    });
    if (!empties.length) pl.appendChild(A.h(`<div class="plot none">부지를 다 썼어요. 다음 결재 때 부지 +3</div>`));
    if (!opt.all && empties.length > 2) pl.lastChild.insertAdjacentHTML('beforeend', ` <small style="margin-left:4px">+${empties.length - 2}</small>`);
    A.renderDoc();
  };
  A.renderDoc = () => {
    const w = A.w, ch = M.chapterInfo(w);
    const segs = M.gapSegments(w);
    const gapN = segs.reduce((s, g) => s + g[1] - g[0] + 1, 0);
    const hc = M.happyCount(w);
    const doc = A.$('#doc');
    doc.classList.toggle('ready', w.approvalReady);
    doc.innerHTML = `
      <h5>결재 서류 · ${ch.n}장</h5><h4>${ch.region}${ch.n === 1 ? '를' : '까지'} 잇자</h4>
      <div class="stampslot">${w.approvalReady ? '도장<br>받기' : '결재<br>대기'}</div>
      <div class="cond ${w.approvalReady || !gapN ? 'ok' : ''}"><span class="t">① Lv 1–${ch.road} 잇기</span><div class="bar"><i style="width:${Math.round(100 * (ch.road - gapN) / ch.road)}%"></i></div><span class="v ${gapN && !w.approvalReady ? 'no' : ''}">${w.approvalReady || !gapN ? '✓' : '빈틈 ' + gapN}</span></div>
      <div class="cond ${w.approvalReady || hc >= ch.happy ? 'ok' : ''}"><span class="t">② 즐기는 모험가</span><div class="bar"><i style="width:${Math.min(100, Math.round(100 * hc / ch.happy))}%;background:var(--smile)"></i></div><span class="v">${w.approvalReady ? '✓' : hc + '/' + ch.happy}</span></div>`;
  };

  // ── 오렌 (지금 가장 급한 한 가지, 1줄) ──────────────────
  A.orenPick = () => {
    const w = A.w;
    if (A.T && A.T.active()) return A.T.line();
    if (A.ui.longAway) return { t: '매니저님 어디 가셨었어요?! 하루 넘게 비우시면 월드가 멈춰요!!', go: () => { A.ui.longAway = false; A.renderOren(); } };
    if (w.approvalReady) return { t: w.chapter >= 3 ? '3장 조건 달성!! 프로토타입은 여기까지예요. 고생하셨어요!!' : '매니저님!! 결재 서류에 도장 받을 수 있어요!!', go: () => A.openApproval() };
    const trNew = A.ui.newTok && M.tray(w).find(m => m.id === A.ui.newTok);
    if (trNew) return { t: `대기실에 ${A.josa(M.monName(trNew), '이', '가')} 기다려요!! 초록으로 빛나는 곳에 놓아주세요!!`, go: () => A.highlightBest(trNew.id) };
    const b = M.badges(w);
    const gap = b.find(x => x.kind === 'gap' && x.n > 0) || b.find(x => x.kind === 'gap');
    if (gap) {
      const [a, z] = gap.seg;
      const rng = a === z ? `Lv ${a}` : `Lv ${a}–${z}`;
      return { t: gap.n ? `매니저님!! ${rng} 모험가님 ${gap.n}명이 갈 데가 없대요!!` : `${rng}가 비어 있어요!! 길을 이어요!!`, go: () => A.openHire() };
    }
    const tr = M.tray(w);
    if (tr.length) return { t: `대기실에 ${A.josa(M.monName(tr[0]), '이', '가')} 기다려요!! 던전에 놓아주세요!!`, go: () => A.highlightBest(tr[0].id) };
    const busy = b.filter(x => x.kind === 'busy').sort((p, q) => q.n - p.n)[0];
    if (busy && busy.n >= 2) return { t: `${A.plotName(busy.d)} 만원이에요!! 자리를 늘리거나 옆 던전에 드랍 이벤트를 걸어봐요!!`, go: () => A.openDungeon(busy.d, { hl: 'seat' }) };
    const ev = b.find(x => x.kind === 'evolve');
    if (ev) { const m = w.monsters.find(x => x.id === ev.mon); return { t: `${A.josa(M.monName(m), '이', '가')} 진화할 수 있대요!! ▲를 눌러봐요!!`, go: () => A.openEvolve(m.id) }; }
    if (M.activeEvents(w) === 0 && w.smile > 800) return { t: '스마일이 넉넉해요!! 경험치 2배 한 번 어때요?!', go: () => { const lv = M.levelsOf(w); const id = Object.keys(lv).sort((p, q) => lv[p] - lv[q])[0]; if (id) A.openDungeon(id, { hl: 'exp' }); } };
    const idle = ['오늘도 다들 퇴근 잘하고 있어요!!', '직원들이 퇴근할수록 근속이 쌓여요!!', '모험가님들 표정 좀 보세요!! 😊', '매니저님 퇴근하셔도 월드는 돌아가요!!'];
    return { t: idle[Math.floor(w.t / 7) % idle.length], go: null };
  };
  let lastOren = '';
  A.renderOren = () => {
    const o = A.orenPick();
    A.ui.orenGo = o.go;
    if (o.t !== lastOren) {
      lastOren = o.t;
      const b = A.$('#orenTxt');
      b.textContent = o.t;
      b.classList.remove('new'); void b.offsetWidth; b.classList.add('new');
      A.$('#orenF .bubble').textContent = o.t;
    }
    // 시트가 독을 가리면 오렌이 시트 위로 올라온다
    const f = A.$('#orenF');
    const want = !!A.ui.sheet && A.ui.sheet !== 'evolve';
    if (f.hidden === want) { f.hidden = !want; if (want) A.$('#orenFImg').src = ART.url('oren', 2); }
  };

  // ── 시뮬레이션 구동 ─────────────────────────────────────
  let acc = 0;
  A.simLive = dtReal => {
    if (A.ui.off || A.ui.intro || A.ui.modal === 'report' || A.ui.paused) return;
    acc += (dtReal / 60) * A.speed;
    let n = 0;
    while (acc >= 1 / 600 && n < 10) {
      const d = Math.min(acc, 1);
      const ev = [];
      M.step(A.w, d, ev);
      if (A.ledger) M.ledgerAdd(A.ledger, A.w, ev);
      A.onEvents(ev);
      acc -= d; n++;
    }
    if (n >= 10) acc = 0;
  };
  A.handlers = [];
  A.onEvents = ev => { if (ev.length) for (const f of A.handlers) f(ev); };

  // 상태가 바뀌는 행동 뒤에 부른다
  A.refresh = () => { A.renderDock(); A.hudStatic(); A.renderOren(); if (A.world) A.world.dirty = true; if (A.ui.mode === 'dungeon' && A.dv) A.dv.panel(); A.save(); };
})();
