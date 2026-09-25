/* MSW 주식회사 프로토타입 — 시작, 입사 컷, 매 프레임 루프, 버튼 */
(function () {
  'use strict';
  const A = window.A, M = A.M;
  const IDLE_MS = 10 * 60 * 1000; // 무입력 끊김 (플랫폼 값 확인 전 가정)

  function newGame() {
    A.w = M.createWorld((Date.now() & 0xffffff) ^ 0x5eed);
    A.T.reset();
    A.checkin = { happy0: 0 };
    A.world.build();
  }

  // ── 입사 컷 (첫 출근) ───────────────────────────────────
  function intro() {
    A.ui.intro = true;
    const el = A.h(`<div class="cut" style="background:radial-gradient(ellipse at 50% 70%,#fff8e1,#f3ebdd)"><div style="color:var(--ink)">
      <h1 style="text-shadow:none"><small style="color:var(--ink2)">MONSTER SMILE WORKS</small>MSW 주식회사</h1>
      <div class="lines" style="margin-top:26px">
        <div class="ln" style="background:#fff;box-shadow:0 3px 0 #0001">${A.img('mom', 2)}신입 월드 매니저죠. 모험가들이 이 월드를 좋아하게 만들어요.</div>
        <div class="ln" style="background:#fff;box-shadow:0 3px 0 #0001">${A.img('oren', 2)}매니저님!! 저는 비서 오렌이에요!! 간단하죠?!</div>
      </div>
      <button class="btn red" data-go style="margin:0 auto;height:58px;font-size:20px">첫 출근 도장 찍기</button>
      <div style="margin-top:18px;font-size:12.5px;font-weight:800;color:var(--ink2)">플레이 프로토타입 · 입사 ~ 3장 페리온 · 도트는 자리표시용</div>
    </div></div>`);
    A.$('#stage').appendChild(el);
    el.querySelector('[data-go]').onclick = () => {
      A.snd.unlock(); A.snd.play('tak');
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).onfinish = () => el.remove();
      A.ui.intro = false;
      A.ui.lastInput = performance.now();
      A.refresh();
    };
  }

  function bind() {
    A.$('#bDex').onclick = () => A.openCodex();
    A.$('#bSound').onclick = () => { A.snd.on = !A.snd.on; A.hudStatic(); };
    A.$('#bOff').onclick = () => A.offDuty('manual');
    A.$$('.proto [data-speed]').forEach(b => (b.onclick = () => { A.speed = +b.dataset.speed; A.hudStatic(); A.toast(`배속 ×${A.speed} (프로토타입 전용)`); }));
    A.$('#bSkip').onclick = () => { if (A.ui.modal || A.ui.off) return; A.closeSheet(); if (A.ui.mode === 'dungeon') A.closeDungeon(); A.snd.play('tak'); A.catchUp(480); };
    let resetArm = 0;
    A.$('#bReset').onclick = () => {
      if (performance.now() - resetArm > 2500) { resetArm = performance.now(); A.toast('처음부터 다시 하려면 ↺를 한 번 더 누르세요', { bad: true }); return; }
      A.clearSave(); location.reload();
    };
    A.$('#bHire').onclick = () => A.openHire();
    A.$('#oren').onclick = () => { A.snd.play('ui'); if (A.ui.orenGo) A.ui.orenGo(); };
    A.$('#docw').onclick = () => A.openApproval();
    A.$('#plots').addEventListener('click', e => {
      const p = e.target.closest('[data-plot]');
      if (p) A.toast(`직원을 끌어다 “${A.plotName(p.dataset.plot)}”에 놓으면 ${A.w.plots[p.dataset.plot].open ? '던전이 열려요' : '개업해요'}`);
    });
    window.addEventListener('keydown', e => {
      A.ui.lastInput = performance.now();
      if (e.key === 'Escape') { if (A.ui.sheet) A.closeSheet(); else if (A.ui.mode === 'dungeon' && !A.ui.modal) A.closeDungeon(); }
    });
    window.addEventListener('resize', A.refit);
    document.addEventListener('visibilitychange', () => { if (document.hidden) A.save(); });
    A.world.bindInput();
    A.dv.bind();
    A.$('#orenImg').src = ART.url('oren', 3);
  }

  // ── 루프 ────────────────────────────────────────────────
  let last = performance.now(), slow = 0, saveT = 0;
  function tick(dt, now) {
    if (A.ui.intro) return;
    A.simLive(dt);
    A.world.tick(dt, now);
    A.dv.tick(dt, now);
    A.hudTick(dt);
    A.T.tick(dt);
    slow -= dt;
    if (slow <= 0) { slow = 0.5; A.renderOren(); A.renderDoc(); if (!A.world.drag) A.renderDock(); }
    saveT -= dt;
    if (saveT <= 0) { saveT = 5; A.save(); }
    if (!A.ui.off && !A.ui.modal && now - A.ui.lastInput > IDLE_MS) A.offDuty('idle');
  }
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!A.frozen) tick(dt, now);
    requestAnimationFrame(frame);
  }
  /** 테스트용: 화면이 가려져 프레임이 멈춘 환경에서도 sec초만큼 동기로 굴린다 */
  A.pump = sec => { let now = performance.now(); for (let t = 0; t < sec; t += 1 / 30) { now += 1000 / 30; tick(1 / 30, now); } A.ui.lastInput = performance.now(); };

  // ── 시작 ────────────────────────────────────────────────
  A.refit();
  bind();
  A.introCut = intro;
  const s = A.demoBoot ? null : A.loadSave();
  if (A.demoBoot) {
    A.demoBoot();
  } else if (s && s.w && s.w.v === 1) {
    A.w = s.w;
    if (s.tut) A.T.st = s.tut;
    A.checkin = s.checkin || { happy0: 0 };
    A.world.build();
    A.refresh();
    const away = (Date.now() - s.savedAt) / 60000;
    // 서버 시간 모델: 잠깐 새로고침해도 흐른 시간만큼 굴린다. 2분 넘게 떠나 있었으면 리포트
    if (away >= 2) { if (away > 1440) A.ui.longAway = true; A.catchUp(away); }
    else if (away > 0.01) M.step(A.w, away, []);
  } else {
    newGame();
    A.refresh();
    intro();
  }
  window.__msw = A; // 디버그용
  requestAnimationFrame(frame);
})();
