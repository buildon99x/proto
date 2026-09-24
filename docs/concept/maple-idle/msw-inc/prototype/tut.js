/* MSW 주식회사 프로토타입 — 입사 첫 10분 (02 §6.2)
 * 규칙 다섯 줄을 한 번에 하나씩, 몸으로 익힌다. 오렌이 한 줄로 말하고, 노란 테두리가 누를 곳을 가리킨다.
 * 단계 완료는 순서가 아니라 월드 상태로 판정한다. 플레이어가 먼저 해버려도 막히지 않는다.
 */
(function () {
  'use strict';
  const A = window.A, M = A.M;
  const T = (A.T = { st: { step: 0, done: false, age: 0, flags: {} } });
  const w = () => A.w;
  const vet = () => w().monsters.find(m => m.vet);
  const mush = () => w().monsters.find(m => m.sp === 'mush');
  const stuck = () => w().advs.filter(a => a.st === 'search');
  const plat = id => A.world.plats[id] && A.world.plats[id].el;

  const STEPS = [
    { id: 'arrive', line: '모험가님들이 들어와요!! 자기 레벨에 맞는 던전을 알아서 찾아가요!!', spot: () => null, done: s => s.age > 7 && M.happyCount(w()) >= 2 },
    { id: 'watch', line: '“헤네시스 들판” 발판을 눌러서 구경해봐요!!', spot: () => (A.ui.mode === 'world' ? plat('h1') : null), done: () => A.ui.mode === 'dungeon' || T.st.flags.levelup },
    { id: 'levelup', line: '모험가님이 즐거우면 레벨이 올라요!! 빛기둥 보이죠?!', spot: () => null, done: s => (s.flags.levelup && s.age > 5) || s.age > 30 || A.ui.mode === 'world' },
    { id: 'back', line: '월드로 돌아가 볼까요?! 자란 모험가님은 위 던전으로 옮겨가요!!', spot: () => (A.ui.mode === 'dungeon' ? '#dBack' : null), done: () => A.ui.mode === 'world' },
    {
      id: 'grow', line: s => ['오른쪽으로 갈수록 레벨이 높아요!! 모험가님은 레벨만큼 서 있어요!!', '발판 폭 = 그 던전에 맞는 레벨이에요!!', '레벨업하면 오른쪽으로 한 칸씩 걸어가요!!'][Math.floor(s.age / 7) % 3],
      spot: () => null, done: () => stuck().length > 0 || !!mush(),
    },
    {
      id: 'gap', line: () => `매니저님!! Lv ${stuck()[0] ? stuck()[0].lv : 8} 모험가님이 갈 데가 없대요!! 빨간 !를 눌러요!!`,
      spot: () => (A.ui.mode === 'world' && !A.ui.sheet ? '.gapb' : A.ui.mode === 'dungeon' ? '#dBack' : null), done: () => A.ui.sheet === 'hire' || !!mush(),
    },
    { id: 'hire', line: '입사 선물 채용권이에요!! 주황버섯(Lv 8)을 뽑아요!!', spot: () => (A.ui.sheet === 'hire' ? '[data-hire="mush"]' : '#bHire'), done: () => !!mush() },
    {
      id: 'place', line: '주황버섯을 끌어서 “헤네시스 사냥터”에 놓아요!! 던전 레벨 = 직원 레벨이에요!!',
      spot: () => (A.world.drag ? '[data-plot="h2"]' : A.$('#tray .tok[data-mon]') ? '#tray .tok[data-mon]' : '[data-plot="h2"]'), done: () => mush() && mush().d,
    },
    { id: 'fixed', line: () => (M.gapSegments(w()).some(g => g[0] <= 13) ? '음… 아직 끊겨 있어요!! 주황버섯을 “사냥터”로 옮겨봐요!!' : '뚫렸다!! 멈춰 있던 모험가님들이 다시 올라가요!!'), spot: () => null, done: s => s.age > 6 && !M.gapSegments(w()).some(g => g[0] <= 13) },
    {
      id: 'event', line: () => (A.ui.mode === 'dungeon' && A.dv.id === 'h1' ? '경험치 2배를 눌러요!! 첫 번은 공짜예요!!' : '이벤트 한 번 걸어볼까요?! 첫 번은 공짜예요!! 들판을 눌러요!!'),
      spot: () => (A.ui.mode === 'world' ? plat('h1') : A.dv.id === 'h1' ? '[data-evt="exp"]' : '#dBack'), done: () => M.activeEvents(w()) > 0 || w().tut.freeEvent === 0,
    },
    { id: 'burst', line: '경험치 2배!! 모험가님들이 두 배로 빨리 자라요!! 대신 다음 던전이 붐빌 수 있어요!!', spot: () => null, done: s => s.age > 8 },
    {
      id: 'vetwait', line: '고참 달팽이 근속이 거의 찼어요!! 조금만 기다려요!!', spot: () => (A.ui.mode === 'dungeon' ? '#dBack' : null),
      // 대본 보장: 20초 넘게 기다리게 하지 않는다 (입사 첫날 버프가 끝나도 막히지 않게)
      done: s => { const v = vet(); if (v && v.stage === 0 && s.age > 20) v.tenure = Math.max(v.tenure, M.EVOLVE_NEED[0]); return !v || M.canEvolve(v) || v.stage > 0; },
    },
    {
      id: 'evolve', line: '고참 달팽이가 진화할 수 있대요!! 보라색 ▲를 눌러요!!',
      spot: () => { const v = vet(); if (!v) return null; if (A.ui.sheet === 'evolve') return '#sheet [data-go]'; return A.ui.mode === 'world' ? `.evb[data-ev="${v.id}"]` : `.evbtn[data-ev="${v.id}"]`; },
      done: () => !vet() || vet().stage > 0,
    },
    { id: 'evolved', line: '파란 달팽이!! 들판 레벨이 올라서 발판이 오른쪽으로 갔어요!!', spot: () => null, done: s => s.age > 6 && A.ui.modal !== 'evolve' },
    { id: 'doc', line: '1장 결재 서류가 왔어요!! 눌러서 조건을 확인해요!!', spot: () => (A.ui.modal ? null : '#docw'), done: s => s.flags.docSeen },
    { id: 'bye', line: '끝!! 매니저님 퇴근하셔도 월드는 돌아가요!! 내일은 Lv 14–15를 이어봐요!!', spot: () => null, done: s => s.age > 14 },
  ];

  T.active = () => !T.st.done && !A.ui.intro;
  T.cur = () => STEPS[T.st.step];
  T.line = () => {
    const s = T.cur();
    const t = typeof s.line === 'function' ? s.line(T.st) : s.line;
    return { t, go: null };
  };
  T.saw = flag => { T.st.flags[flag] = true; };
  T.poke = () => { /* 화면 전환 직후 다음 프레임에서 다시 판정 */ T.dirtySpot = true; };

  A.handlers.push(ev => {
    for (const e of ev) {
      if (e.type === 'docSeen') T.st.flags.docSeen = true;
      if (e.type === 'levelup' && A.ui.mode === 'dungeon') T.st.flags.levelup = true;
    }
  });

  let spotEl = null, spotSel = null;
  function placeSpot(target) {
    const sp = A.$('#spot');
    if (!target) { sp.hidden = true; return; }
    const el = typeof target === 'string' ? A.$(target) : target;
    if (!el || !el.getBoundingClientRect().width) { sp.hidden = true; return; }
    const r = A.rectOf(el), pad = 6;
    sp.hidden = false;
    sp.style.left = r.x - pad + 'px'; sp.style.top = r.y - pad + 'px';
    sp.style.width = r.w + pad * 2 + 'px'; sp.style.height = r.h + pad * 2 + 'px';
    sp.classList.toggle('up', r.y > 500);
  }

  T.tick = dt => {
    if (!T.active()) { A.$('#spot').hidden = true; return; }
    const s = T.cur();
    T.st.age += dt;
    if (s.done(T.st)) {
      T.st.step++; T.st.age = 0;
      A.snd.play('ui');
      if (T.st.step >= STEPS.length) { T.st.done = true; A.$('#spot').hidden = true; A.refresh(); return; }
    }
    placeSpot(A.ui.modal && A.ui.modal !== 'approval' ? null : T.cur().spot());
  };
  /** 튜토리얼이 진화를 가르치기 전에는 ▲를 숨긴다 (한 번에 하나만) */
  T.hideEvolve = () => T.active() && T.st.step < STEPS.findIndex(s => s.id === 'vetwait');
  T.stepIndex = id => STEPS.findIndex(s => s.id === id);
  T.reset = () => { T.st = { step: 0, done: false, age: 0, flags: {} }; };
})();
