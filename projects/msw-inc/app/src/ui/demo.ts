/*
 * 시연 장면 — index.html?demo=<장면> 으로 열면 정해진 상태를 만들고 그 순간에 멈춘다. 저장하지 않는다.
 * 문서 그림(assets/screenshots)과 화면 점검(tests/e2e)에 쓴다.
 * 장면: intro · gap · hire · dungeon · evolve · promote · report · approval · ch2 · late · ch5 · ending · offduty · codex · fullclear · grow
 *       elite · boss · bossinv (v1.3)
 */
import { A, must, refresh, M } from './app';
import { T } from './tut';
import { PERSONAS, checkIn, firstSession } from '../sim/bots';

const SEED = 20260924;
const START = 21 * 60;

/** 입사 첫 세션을 봇 대본(bots.firstSession)대로 굴린다. until: 'gap'(첫 빈틈 직후) | 'evolve'(고참 진화 직후) | 'full'(첫 세션 끝) */
function first(until: 'gap' | 'evolve' | 'full'): M.World {
  const w = M.createWorld(SEED);
  let stuckAt: number | null = null;
  firstSession(w, undefined, x => {
    if (stuckAt === null && x.advs.some(a => a.st === 'search')) stuckAt = x.t;
    if (until === 'gap') return stuckAt !== null && x.t >= stuckAt + 0.4;
    if (until === 'evolve') return x.monsters.some(m => m.vet && m.stage > 0) && x.t >= (stuckAt ?? 0) + 1.6;
    return false;
  });
  return w;
}
/** 표준 봇으로 cond가 참이 될 때까지 굴린다 */
function botTo(cond: (w: M.World) => boolean, maxDays = 45): M.World {
  const p = PERSONAS[0];
  const w = M.createWorld(7);
  firstSession(w);
  for (let d = 0; d < maxDays; d++) for (const [i, hh] of p.times.entries()) {
    const target = d * 1440 + 1440 + hh - START;
    if (target > w.t) M.advance(w, target - w.t);
    if (cond(w)) return w;
    checkIn(w, p, { last: i === p.times.length - 1, first: i === 0 });
    if (cond(w)) return w;
  }
  return w;
}
/** 1분씩 굴려 cond가 참이 되는 순간에 멈춘다 */
function stepUntil(w: M.World, cond: (w: M.World) => boolean, maxMin = 2880): M.World {
  for (let i = 0; i < maxMin && !cond(w); i++) M.step(w, 1);
  return w;
}
/** 3장 막대 30~50%: 곧 필드 보스가 찾아온다 */
const beforeBoss = (x: M.World) => { const c = M.approvalConds(x); return x.chapter === 3 && !x.boss && c.joy >= c.joyGoal * 0.3 && c.joy < c.joyGoal * 0.5; };
function boot(w: M.World, tutDone = true) {
  A.w = w;
  if (tutDone) T.st.done = true; else T.reset();
  A.checkin = { happy0: 0 };
  A.world.build();
  refresh();
}
const settle = (sec = 2) => { setTimeout(() => { (window as unknown as { __msw: { pump: (s: number) => void } }).__msw.pump(sec); A.frozen = true; }, 50); };

export function runDemo(q: string, api: { newGame: () => void; intro: () => void }) {
  document.title = `MSW 주식회사 · ${q}`;
  const scenes: Record<string, () => void> = {
    intro() { api.newGame(); refresh(); api.intro(); A.frozen = true; },
    gap() { boot(first('gap'), false); T.st.step = T.stepIndex('gap'); settle(3); },
    hire() { boot(first('gap'), false); T.st.step = T.stepIndex('hire'); settle(1.5); setTimeout(() => A.openHire(), 120); },
    dungeon() {
      const w = first('full'); M.advance(w, 180); M.startEvent(w, 'h1', 'drop');
      boot(w); A.openDungeon('h1'); settle(4);
    },
    evolve() {
      const w = first('full'); M.advance(w, 600);
      boot(w); settle(1.5);
      const sn = M.monsIn(w, 'h1').find(m => m.stage === 0 && M.canEvolve(m));
      if (sn) setTimeout(() => A.openEvolve(sn.id), 150);
    },
    promote() {
      const w = botTo(x => x.chapter >= 3 && x.monsters.some(m => M.canEvolve(m) && !!M.bestPromote(x, m.id)));
      boot(w); settle(1.5);
      const m = w.monsters.find(x => M.canEvolve(x) && !!M.bestPromote(w, x.id));
      if (m) setTimeout(() => A.openEvolve(m.id), 150);
    },
    grow() {
      const w = botTo(x => x.chapter >= 3 && M.gapSegments(x).some(g => !M.recommendSpecies(x, g)));
      boot(w); settle(1.5);
      const g = M.gapSegments(w).find(s => !M.recommendSpecies(w, s));
      setTimeout(() => A.openHire({ seg: g }), 150);
    },
    report() {
      const w = first('full');
      boot(w); A.checkin.happy0 = 0;
      settle(0.2);
      setTimeout(() => { A.frozen = false; A.catchUp(600); A.frozen = true; }, 150);
    },
    approval() {
      const w = botTo(x => x.approvalReady && x.chapter === 2);
      boot(w); settle(1); setTimeout(() => A.openApproval(), 150);
    },
    ch2() { boot(botTo(x => x.chapter >= 2 && x.t > 5 * 1440)); settle(3); },
    late() { boot(botTo(x => x.chapter >= 4 && x.advs.length > 170)); settle(3); },
    ch5() { boot(botTo(x => x.chapter >= 5)); settle(3); },
    ending() {
      const w = botTo(x => x.chapter === 5 && x.approvalReady, 60);
      boot(w); settle(1);
      setTimeout(() => { A.openApproval(); const b = document.querySelector('[data-stamp]') as HTMLButtonElement | null; b?.click(); }, 150);
    },
    offduty() { boot(first('full')); settle(1); setTimeout(() => A.offDuty('idle'), 150); },
    codex() { boot(botTo(x => x.chapter >= 3)); settle(0.5); setTimeout(() => A.openCodex(), 150); },
    elite() {
      const w = botTo(x => x.chapter >= 3 && x.t > 10 * 1440);
      if (!w.elite) M.forceElite(w);
      boot(w); settle(2.5);
    },
    boss() {
      const w = stepUntil(botTo(beforeBoss), x => !!x.boss && !!x.boss.d && x.boss.kills > M.bossNeed(x.boss.ch) * 0.4);
      boot(w); settle(2.5);
    },
    bossinv() {
      const w = stepUntil(botTo(beforeBoss), x => !!x.boss);
      boot(w); settle(1);
      setTimeout(() => A.openBoss(), 150);
    },
    fullclear() { const w = botTo(x => x.ended, 60); M.advance(w, 1440); boot(w); settle(0.5); setTimeout(() => A.openFullClear(), 150); },
  };
  (scenes[q] || scenes.intro)();
  must('#stage').dataset.demo = q;
}
