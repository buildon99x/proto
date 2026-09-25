/*
 * 입사 첫 10분 (spec.md §8, v1.3 "첫 10분 한 바퀴") — 규칙 다섯 줄을 한 번에 하나씩, 몸으로 익힌다.
 * 빈틈 → 채용·배치 → 승진 발령(Lv 14–15) → 이벤트 → 엘리트 → 결재 도장 → 새 지역 채용 → 필드 보스 예고 → 퇴근.
 * 오렌이 한 줄로 말하고, 노란 테두리가 누를 곳을 가리킨다.
 * 단계 완료는 순서가 아니라 월드 상태로 판정한다. 플레이어가 먼저 해 버려도 막히지 않는다.
 */
import { A, $, must, rectOf, snd, refresh, emit, plotShort, plotName, josa, M, type OrenLine } from './app';

/** rev: 단계 순서 판. 2 = v1.3.1 (고참 승진 발령). 없으면 옛 순서라 MOVED로 옮긴다 */
interface St { step: number; done: boolean; age: number; flags: Record<string, boolean>; id?: string; rev?: number }

interface Step { id: string; line: string | ((s: St) => string); spot: () => string | Element | null; done: (s: St) => boolean }

const w = () => A.w;
const vet = () => w().monsters.find(m => m.vet);
const mush = () => w().monsters.find(m => m.sp === 'mush');
/** 옮기기만으로 남은 빈틈이 닫히는 수 (그냥 진화를 골랐을 때 길 잇는 법) */
const fix = () => { const g = M.gapSegments(w())[0]; return g ? M.moveFix(w(), g) : null; };
const slime = () => w().monsters.find(m => m.sp === 'slime');
const road = () => M.gapSegments(w()).length === 0;
const ch2 = () => w().chapter >= 2;
const stuck = () => w().advs.filter(a => a.st === 'search');
/** 방금 열린 구간의 첫 레벨 */
const zoneFrom = () => { const z = M.zoneEnds(w()); return z && w().zone ? z[w().zone! - 1] + 1 : 1; };
const plat = (id: string) => (A.world.plats[id] ? A.world.plats[id].el : null);

const STEPS: Step[] = [
  { id: 'arrive', line: '모험가님들이 들어와요!! 자기 레벨에 맞는 던전을 알아서 찾아가요!!', spot: () => null, done: s => s.age > 7 && M.happyCount(w()) >= 2 },
  { id: 'watch', line: '“헤네시스 들판” 발판을 눌러서 구경해봐요!!', spot: () => (A.ui.mode === 'world' ? plat('h1') : null), done: s => A.ui.mode === 'dungeon' || !!s.flags.levelup },
  { id: 'levelup', line: '모험가님이 즐거우면 레벨이 올라요!! 빛기둥 보이죠?!', spot: () => null, done: s => (!!s.flags.levelup && s.age > 5) || s.age > 30 || A.ui.mode === 'world' },
  { id: 'back', line: '월드로 돌아가 볼까요?! 자란 모험가님은 위 던전으로 옮겨가요!!', spot: () => (A.ui.mode === 'dungeon' ? '#dBack' : null), done: () => A.ui.mode === 'world' },
  {
    id: 'grow', line: s => ['오른쪽으로 갈수록 레벨이 높아요!! 모험가님은 레벨만큼 서 있어요!!', '발판 폭 = 그 던전에 맞는 레벨이에요!!', '레벨업하면 오른쪽으로 한 칸씩 걸어가요!!'][Math.floor(s.age / 7) % 3],
    spot: () => null, done: () => stuck().length > 0 || !!mush(),
  },
  {
    id: 'gap', line: () => `매니저님!! 방금 온 Lv ${stuck()[0] ? stuck()[0].lv : 8} 모험가님이 갈 데가 없대요!! 빨간 !를 눌러요!!`,
    spot: () => (A.ui.mode === 'world' && !A.ui.sheet ? '.gapb' : A.ui.mode === 'dungeon' ? '#dBack' : null), done: () => A.ui.sheet === 'hire' || !!mush(),
  },
  { id: 'hire', line: '입사 선물 채용권이에요!! 주황버섯(Lv 8)을 뽑아요!!', spot: () => (A.ui.sheet === 'hire' ? '[data-hire="mush"]' : '#bHire'), done: () => !!mush() },
  {
    id: 'place', line: '주황버섯을 끌어서 “헤네시스 사냥터”에 놓아요!! 던전 레벨 = 직원 레벨이에요!!',
    spot: () => (A.world.drag && A.world.drag.started ? '[data-plot="h2"]' : $('#tray .tok[data-mon]') ? '#tray .tok[data-mon]' : '[data-plot="h2"]'), done: () => !!mush() && !!mush()!.d,
  },
  { id: 'fixed', line: () => (M.gapSegments(w()).some(g => g[0] <= 13) ? '음… 아직 끊겨 있어요!! 주황버섯을 “사냥터”로 옮겨봐요!!' : '뚫렸다!! 멈춰 있던 모험가님들이 다시 올라가요!!'), spot: () => null, done: s => s.age > 6 && !M.gapSegments(w()).some(g => g[0] <= 13) },
  // v1.4: 길이 이어지면 헤네시스 다음 구간(Lv 11–15)이 열린다. 퇴근으로 열리지만 대본은 6초 넘게 기다리게 하지 않는다
  {
    id: 'zone', line: () => (M.zoneLeft(w()) ? '길이 이어졌으니 퇴근이 쌓이면 다음 구간이 열려요!! 졸업 문 너머 🔒 보이죠?!' : `헤네시스 Lv ${zoneFrom()}–${M.roadEnd(w())} 구간이 열렸어요!! 졸업 문이 오른쪽으로 옮겨갔어요!!`),
    spot: () => (A.ui.mode === 'world' && M.zoneLeft(w()) ? '.zlock span' : null),
    done: s => {
      if (w().zone == null || w().chapter > 1) return true;
      if (M.zoneLeft(w()) && s.age > 6) { const ev: M.SimEvent[] = []; M.forceZone(w(), ev); if (ev.length) emit(ev); }
      return !M.zoneLeft(w()) && s.age > 11;
    },
  },
  // v1.3.1: 1장 Lv 14–15는 채용으로 안 닿는다. 고참 달팽이를 승진 발령으로 버섯 언덕에 보내 한 번에 잇는다.
  // (전에는 그냥 진화 → 둘째 달팽이 기다림 → 승진 발령이라 빨간 빈틈을 61초 봤다. 이벤트도 길을 이은 뒤로 옮겼다)
  {
    id: 'vetwait', line: 'Lv 14–15는 채용으로는 안 닿아요!! 고참 달팽이 근속이 거의 찼어요!! 진화하면 Lv 10이에요!!', spot: () => (A.ui.mode === 'dungeon' ? '#dBack' : null),
    // 대본 보장: 12초 넘게 기다리게 하지 않는다 (입사 첫날 버프가 끝나도 막히지 않게)
    done: s => { const v = vet(); if (v && v.stage === 0 && s.age > 12) v.tenure = Math.max(v.tenure, M.evolveNeed(v)); return !v || M.canEvolve(v) || v.stage > 0; },
  },
  {
    id: 'promote', line: () => (A.ui.sheet === 'evolve' ? '[▲ 승진 발령]을 눌러요!! 진화 + 버섯 언덕 개업이 한 번에!! 그냥 진화하면 들판 평균이라 안 닿아요!!' : '고참 달팽이가 진화할 수 있대요!! 보라색 ▲를 눌러요!!'),
    spot: () => { const v = vet(); if (!v) return null; if (A.ui.sheet === 'evolve') return $('#sheet [data-promote]') ? '#sheet [data-promote]' : '#sheet [data-go]'; return A.ui.mode === 'world' ? `.evb[data-ev="${v.id}"]` : `.evbtn[data-ev="${v.id}"]`; },
    done: () => !vet() || vet()!.stage > 0,
  },
  {
    id: 'promoted', line: () => {
      if (road()) return 'Lv 1–15가 다 이어졌어요!! 승진 발령 = 진화 + 맞는 던전으로 옮기기예요!! 빈자리가 생기면 신입도 뽑아 줘요!!';
      if ($('#toast button')) return '아직 끊겨 있어요!! 5초 안에 되돌리고 승진 발령을 골라봐요!!';
      const mv = fix();
      return mv ? `${josa(M.monName(mv.mon), '을', '를')} 끌어서 “${plotName(mv.to)}”에 놓아요!! 옮기기만 해도 이어져요!!` : '아직 끊겨 있어요!! 빨간 !를 눌러 방법을 봐요!!';
    },
    spot: () => {
      if (road()) return null;
      if ($('#toast button')) return '#toast button';
      const mv = fix();
      if (!mv) return A.ui.mode === 'world' ? '.gapb' : null;
      return A.world.drag && A.world.drag.started ? `[data-plot="${mv.to}"]` : `#world .mon[data-id="${mv.mon.id}"]`;
    },
    // 길이 이어져야 넘어간다. 옮길 수도 되돌릴 수도 없으면 막지 않는다
    done: s => A.ui.modal !== 'evolve' && ((road() && s.age > 7) || (!road() && !$('#toast button') && !fix() && s.age > 20)),
  },
  {
    id: 'event', line: () => (A.ui.mode === 'dungeon' && A.dv.id === 'h1' ? '경험치 2배를 눌러요!! 첫 번은 공짜예요!!' : '길이 다 이어졌으니 이벤트 한 번 걸어볼까요?! 첫 번은 공짜예요!! 들판을 눌러요!!'),
    spot: () => (A.ui.mode === 'world' ? plat('h1') : A.dv.id === 'h1' ? '[data-evt="exp"]' : '#dBack'), done: () => M.activeEvents(w()) > 0 || w().tickets.event === 0,
  },
  { id: 'burst', line: '경험치 2배!! 모험가님들이 두 배로 빨리 자라요!! 대신 다음 던전이 붐빌 수 있어요!!', spot: () => null, done: s => s.age > 8 },
  { id: 'doc', line: '1장 결재 서류가 왔어요!! 눌러서 조건을 확인해요!!', spot: () => (A.ui.modal ? null : '#docw'), done: s => !!s.flags.docSeen },
  // ── v1.3 첫 10분 한 바퀴 ─────────────────────────────────
  {
    id: 'elite', line: () => { const el = w().elite, m = el && w().monsters.find(x => x.id === el.mon); return m && el ? `${plotShort(el.d)}에 엘리트 ${M.monName(m)}!! 한 시간 동안 결재 막대가 두 배로 차요!!` : '사냥이 쌓이면 가끔 엘리트가 나와요!!'; },
    spot: () => (A.ui.mode === 'world' && w().elite ? plat(w().elite!.d) : null),
    // 대본 보장: 첫 엘리트는 이 단계에서 부른다
    done: s => { if (!s.flags.eliteCalled) { s.flags.eliteCalled = true; const ev: M.SimEvent[] = []; M.forceElite(w(), undefined, ev); if (ev.length) emit(ev); } return s.age > 8; },
  },
  {
    id: 'joy', line: () => `결재 막대 ${Math.floor(Math.min(100, (100 * w().cjoy) / Math.max(1, M.approvalConds(w()).joyGoal)))}%!! 😊 모험가님이 많을수록 빨리 차요!! 지금 퇴근해도 계속 차요!!`,
    spot: () => (A.ui.modal ? null : '#docw'),
    // 대본 보장: 길이 이어졌는데 15초 넘게 안 차면 채워 준다(v1.4: 30 → 15초). 길이 끊긴 채면 기다리지 않고 넘어간다
    done: s => { const c = M.approvalConds(w()); if (w().approvalReady || ch2()) return true; if (s.age > 15 && c.road) w().cjoy = Math.max(w().cjoy, c.joyGoal); return s.age > 15 && !c.road; },
  },
  {
    id: 'stamp', line: () => (A.ui.modal === 'approval' ? '[결재 받기]를 눌러요!! 쾅!!' : '결재 서류에 도장 받을 수 있어요!! 눌러요!!'),
    spot: () => (A.ui.modal === 'approval' ? '[data-stamp]' : A.ui.modal ? null : '#docw'),
    done: () => (ch2() && !A.ui.modal) || (!w().approvalReady && !ch2()),
  },
  {
    id: 'newRegion', line: () => (A.ui.sheet === 'hire' ? '슬라임 채용권이에요!! 🎁 잘 퍼준다 특성!! 뽑아요!!' : '엘리니아 입사 선물!! 슬라임 채용권이에요!! 신입 채용을 눌러요!!'),
    spot: () => (A.ui.mode !== 'world' ? '#dBack' : A.ui.sheet === 'hire' ? '[data-hire="slime"]' : '#bHire'),
    done: s => !ch2() || !!slime() || s.age > 60,
  },
  {
    id: 'place2', line: '슬라임을 끌어서 엘리니아 빈 부지에 놓아요!! 개업권이 있어서 공짜예요!!',
    spot: () => (A.world.drag && A.world.drag.started ? '[data-plot^="e"]' : $('#tray .tok[data-mon]') ? '#tray .tok[data-mon]' : null),
    done: s => !ch2() || !slime() || !!slime()!.d || s.age > 60,
  },
  {
    id: 'bossTease', line: '결재 막대 가운데 눈금 보이죠?! 절반이 차면 필드 보스가 찾아온대요!!',
    spot: () => (A.ui.modal || !ch2() ? null : '#docw'), done: s => !ch2() || s.age > 9,
  },
  { id: 'bye', line: '끝!! 퇴근하셔도 월드는 돌아가요!! 다음 출근 땐 막대가 얼마나 찼는지 봐요!!', spot: () => null, done: s => s.age > 14 },
];
/** v1.2 세이브의 튜토리얼 단계 (번호로 저장했다). 번호를 이름으로 옮긴다 */
const V12_STEPS = ['arrive', 'watch', 'levelup', 'back', 'grow', 'gap', 'hire', 'place', 'fixed', 'event', 'burst', 'vetwait', 'evolve', 'evolved', 'doc', 'bye'];

/**
 * v1.3의 옛 단계 → v1.3.1 단계. 고참 진화가 승진 발령이 되면서 "그냥 진화 · 둘째 달팽이 발령" 단계가 합쳐지고
 * 이벤트가 길을 이은 뒤로 갔다. 옛 순서에서 고참 진화 전이면 발령부터, 진화 뒤면 길 잇기부터 다시 한다
 */
const REV = 2;
const MOVED: Record<string, string> = { event: 'vetwait', burst: 'vetwait', evolve: 'promote', evolved: 'promoted', doc: 'promoted', elite: 'promoted', vet2wait: 'promoted' };

export const T = {
  st: { step: 0, done: false, age: 0, flags: {}, rev: REV } as St,
  active: () => !T.st.done && !A.ui.intro,
  cur: () => STEPS[T.st.step],
  line(): OrenLine { const s = T.cur(); return { t: typeof s.line === 'function' ? s.line(T.st) : s.line, go: null }; },
  saw(flag: string) { T.st.flags[flag] = true; },
  poke() { /* 화면 전환 직후 다음 프레임에서 다시 판정 */ },
  tick,
  /** 튜토리얼이 진화를 가르치기 전에는 ▲를 숨긴다 (한 번에 하나만) */
  hideEvolve: () => T.active() && T.st.step < STEPS.findIndex(s => s.id === 'vetwait'),
  /** 월드 배속 (F6): 누를 곳이 없는 "가로 = 레벨" 단계만 ×3 */
  boost: () => (T.active() && T.cur() && T.cur().id === 'grow' ? M.RULES_GROW_BOOST() : 1),
  stepIndex: (id: string) => STEPS.findIndex(s => s.id === id),
  skip() { T.st.done = true; must('#spot').hidden = true; refresh(); },
  reset() { T.st = { step: 0, done: false, age: 0, flags: {}, rev: REV }; },
  /** 저장된 튜토리얼 상태 불러오기. 단계는 이름으로 찾는다 (단계가 늘어나도 이어진다) */
  load(saved: St) {
    const raw = saved.id || V12_STEPS[saved.step];
    const id = raw && (saved.rev === REV ? raw : MOVED[raw] || raw);
    const i = id ? STEPS.findIndex(s => s.id === id) : -1;
    T.st = { ...saved, step: i >= 0 ? i : Math.min(saved.step, STEPS.length - 1), age: 0, rev: REV };
  },
};
A.T = T;

A.handlers.push(ev => {
  for (const e of ev) {
    if (e.type === 'docSeen') T.st.flags.docSeen = true;
    if (e.type === 'levelup' && A.ui.mode === 'dungeon') T.st.flags.levelup = true;
  }
});

function placeSpot(target: string | Element | null) {
  const sp = must('#spot');
  if (!target) { sp.hidden = true; return; }
  const el = typeof target === 'string' ? $(target) : target;
  if (!el || !el.getBoundingClientRect().width) { sp.hidden = true; return; }
  const r = rectOf(el), pad = 6;
  sp.hidden = false;
  sp.style.left = r.x - pad + 'px'; sp.style.top = r.y - pad + 'px';
  sp.style.width = r.w + pad * 2 + 'px'; sp.style.height = r.h + pad * 2 + 'px';
  sp.classList.toggle('up', r.y > 500);
}

function tick(dt: number) {
  const skip = $('#tutSkip');
  if (skip) skip.hidden = !T.active();
  if (!T.active()) { must('#spot').hidden = true; return; }
  const s = T.cur();
  T.st.age += dt;
  if (s.done(T.st)) {
    T.st.step++; T.st.age = 0;
    snd.play('ui');
    if (T.st.step >= STEPS.length) { T.st.done = true; must('#spot').hidden = true; refresh(); emit([]); return; }
    T.st.id = STEPS[T.st.step].id;
  }
  placeSpot(A.ui.modal && A.ui.modal !== 'approval' ? null : T.cur().spot());
}
