/* MSW 주식회사 프로토타입 — 시연 장면 (문서용 캡처)
 * index.html?demo=<장면> 으로 열면 정해진 상태를 만들고 그 순간에 멈춘다. 저장하지 않는다.
 * 장면: intro · gap · hire · heal · dungeon · drag · evolve · report · approval · ch2 · offduty
 */
(function () {
  'use strict';
  const A = window.A, M = A.M;
  const q = new URLSearchParams(location.search).get('demo');
  if (!q) return;
  A.demo = q;
  document.documentElement.classList.add('demo');
  const SEED = 20260924;

  /** 입사 첫 세션을 대본대로 굴린다. until: 'gap' | 'exp' | 'full' */
  function firstSession(until) {
    const w = M.createWorld(SEED);
    let stuckAt = null;
    for (let i = 0; i < 12 * 8; i++) { // pacing-check.js와 같은 96걸음(5초 × 8분)
      M.step(w, 1 / 12, []);
      if (stuckAt === null && w.advs.some(a => a.st === 'search')) stuckAt = w.t;
      if (until === 'gap' && stuckAt !== null && w.t >= stuckAt + 0.6) return w;
      if (until !== 'gap' && stuckAt !== null && w.t >= stuckAt + 0.5 && !w.monsters.some(m => m.sp === 'mush')) { const h = M.hire(w, 'mush'); M.place(w, h.mon.id, 'h2'); }
      if (w.t >= 5 && w.tut.freeEvent) M.startEvent(w, 'h1', 'exp');
      if (until === 'exp' && w.t >= 6) return w;
      const v = w.monsters.find(m => m.vet);
      if (v.stage === 0 && w.t >= 6.5) { v.tenure = Math.max(v.tenure, M.EVOLVE_NEED[0]); M.evolve(w, v.id); }
    }
    return w;
  }
  function day2() {
    const w = firstSession('full');
    const L = M.ledgerStart(w);
    M.advance(w, 600, L);
    return { w, rep: M.ledgerReport(L, w) };
  }
  function day2Fixed() {
    const { w } = day2();
    const blue = w.monsters.find(m => m.sp === 'snail' && m.stage === 1);
    M.place(w, blue.id, 'h3');
    M.advance(w, 20);
    return w;
  }
  /** 2장 중반: 엘리니아에 슬라임 던전을 세우고 드랍 이벤트를 건 상태 */
  function ch2World() {
    const w = day2Fixed();
    let n = 0; while (!w.approvalReady && n++ < 96) M.advance(w, 15);
    M.approve(w);
    w.smile += 8000;
    for (let i = 0; i < 3; i++) { const sl = M.hire(w, 'slime'); M.place(w, sl.mon.id, 'e1'); }
    const mush = w.monsters.find(m => m.sp === 'mush'); if (M.canEvolve(mush)) M.evolve(w, mush.id);
    M.advance(w, 360);
    M.startEvent(w, 'e1', 'drop');
    M.advance(w, 25);
    return w;
  }
  function tutDone() { A.T.st = { step: 99, done: true, age: 0, flags: {} }; }
  function tutAt(id) { const i = A.T.stepIndex(id); A.T.st = { step: i, done: false, age: 3, flags: {} }; }

  function mount(w) {
    A.w = w;
    A.speed = 0;
    A.checkin = { happy0: 0 };
    A.world.build();
    A.refresh();
    A.pump(1.2);
  }
  const freeze = () => { A.frozen = true; };
  const fire = ev => A.handlers.forEach(f => f(ev));

  const S = {
    intro() { A.w = M.createWorld(SEED); A.world.build(); A.refresh(); A.introCut(); },
    gap() { mount(firstSession('gap')); tutAt('gap'); A.pump(0.4); freeze(); },
    hire() { mount(firstSession('gap')); tutAt('hire'); A.openHire(); A.renderOren(); A.pump(0.4); freeze(); },
    heal() {
      mount(firstSession('gap')); tutAt('fixed');
      const h = M.hire(A.w, 'mush'); M.place(A.w, h.mon.id, 'h2');
      A.refresh(); A.speed = 1; A.pump(0.4); A.speed = 0; freeze();
    },
    dungeon() {
      const w = ch2World();
      mount(w); tutDone();
      A.openDungeon('e1');
      A.speed = 1; A.pump(4); A.speed = 0;
      const shown = [...A.dv.advs.values()].filter(a => !a.leaving);
      if (shown[1]) fire([{ type: 'levelup', id: shown[1].id, lv: 21, d: 'e1' }]);
      A.dv.killAcc = 1; A.pump(0.15);
      freeze();
    },
    drag() {
      const { w } = day2(); mount(w); tutDone(); A.pump(0.5);
      const blue = w.monsters.find(m => m.sp === 'snail' && m.stage === 1);
      const el = A.$(`#world .mon[data-id="${blue.id}"]`), r = el.getBoundingClientRect();
      const p = A.$('[data-plot="h3"]').getBoundingClientRect();
      const ev = (t, x, y, target) => (target || window).dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
      ev('pointerdown', r.x + r.width / 2, r.y + r.height / 2, el);
      ev('pointermove', r.x + 40, r.y + 20);
      ev('pointermove', p.x + p.width / 2, p.y + 6);
      A.pump(0.2); freeze();
    },
    evolve() {
      mount(day2Fixed()); tutDone(); A.pump(0.5);
      const sn = A.w.monsters.find(m => m.sp === 'snail' && m.stage === 0 && m.d === 'h1');
      sn.tenure = Math.max(sn.tenure, M.EVOLVE_NEED[0]);
      A.openEvolve(sn.id); A.pump(0.4); freeze();
    },
    report() { const { w, rep } = day2(); mount(w); tutDone(); A.showReport(rep, 600); },
    approval() {
      const w = day2Fixed();
      let n = 0; while (!w.approvalReady && n++ < 96) M.advance(w, 15);
      mount(w); tutDone();
      A.openApproval();
      setTimeout(() => { const s = A.$('#bigstamp'); if (s) s.classList.add('slam'); }, 300);
    },
    ch2() { mount(ch2World()); tutDone(); A.pump(1); freeze(); },
    offduty() { mount(day2Fixed()); tutDone(); A.offDuty('manual'); },
  };
  A.demoBoot = () => { (S[q] || S.gap)(); };
})();
