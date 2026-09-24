/*
 * 규칙 테스트 — pnpm --filter msw-inc test
 * 1) 이식 검증: 옛 규칙(v1.1)으로 굴리면 컨셉 프로토타입(sim.js)과 같은 수치가 나온다
 * 2) v1.2 약속: 월드가 멈추지 않는다, 되돌리기는 상태를 그대로 돌려놓는다, 결재 조건 ②는 줄지 않는다
 */
import assert from 'node:assert/strict';
import * as S from '../app/src/sim/sim';
import { useRules, V11, V12 } from '../app/src/sim/rules';
import { PERSONAS, runPersona, firstSession, lightClone } from '../app/src/sim/bots';
import { DEX_TOTAL, PLOTS } from '../app/src/sim/content';

let passed = 0;
const t = (name: string, fn: () => void) => {
  try { fn(); passed++; console.log('✓', name); } catch (e) { console.log('✕', name); throw e; }
};
const snap = (w: S.World) => JSON.stringify({ ...w, advs: w.advs.length, nextMon: 0 }); // id 번호는 되돌리지 않는다

// ── 1. 이식 검증 (v1.1 = 컨셉 프로토타입) ─────────────────────
useRules(V11);
t('v1.1 첫 10분·Day 2 수치가 컨셉 페이싱 점검과 같다', () => {
  const w = S.createWorld(20260924);
  let firstLv: number | null = null, gap: { t: number; lv: number } | null = null, placed = false, evolved = false;
  for (let i = 0; i < 96; i++) {
    const ev: S.SimEvent[] = [];
    S.step(w, 1 / 12, ev);
    for (const e of ev) {
      if (e.type === 'levelup' && firstLv == null) firstLv = w.t;
      if (e.type === 'stuck' && !gap) gap = { t: w.t, lv: e.lv };
    }
    if (gap && !placed && w.t >= gap.t + 0.5) { const h = S.hire(w, 'mush'); assert.ok(h.ok); S.place(w, h.mon.id, 'h2'); placed = true; }
    if (w.t >= 5 && w.tut.freeEvent) S.startEvent(w, 'h1', 'exp');
    const v = w.monsters.find(m => m.vet)!;
    if (w.t >= 6.5 && !evolved) { S.evolve(w, v.id); evolved = true; }
  }
  assert.equal(Math.round(firstLv! * 60), 25);
  assert.equal(Math.round(gap!.t * 60), 205);
  assert.equal(gap!.lv, 8);
  const L = S.ledgerStart(w);
  S.advance(w, 600, L);
  const r = S.ledgerReport(L, w);
  assert.equal(r.happy, 14);
  assert.equal(r.levelups, 678);
  assert.equal(r.smile, 3269);
});

// ── 2. v1.2 ────────────────────────────────────────────────
useRules(V12);
t('v1.2 첫 출근 리포트: 세 숫자가 모두 늘어 있고 진화 가능이 있다', () => {
  const w = S.createWorld(20260924);
  firstSession(w);
  const L = S.ledgerStart(w);
  S.advance(w, 600, L);
  const r = S.ledgerReport(L, w);
  assert.ok(r.happy >= 12, 'happy ' + r.happy);
  assert.ok(r.levelups > 500 && r.smile > 2000);
  assert.ok(r.ready.length >= 1);
  assert.equal(r.grads, 0, '첫날 밤에는 Lv 14–15가 끊겨 졸업이 없다');
});

t('빈틈의 모험가는 떠나지 않고 걷는다 — 입구가 막혀도 월드가 비지 않는다', () => {
  const w = S.createWorld(1);
  firstSession(w);
  for (const m of w.monsters) if (m.d === 'h1') m.d = null; // 입구를 맡던 던전을 통째로 비운다
  S.advance(w, 1440);
  assert.ok(w.advs.some(a => a.st === 'search' && a.lv > 1), '입구에서 걸어 나간 사람이 있다');
  assert.equal(w.stats.left.entrance, 0);
});

t('걷기로는 졸업하지 못한다 (졸업선 바로 앞에서 멈춘다)', () => {
  const w = S.createWorld(2);
  firstSession(w);
  S.advance(w, 1440);
  const beyond = w.advs.filter(a => a.st === 'search' && a.lv >= S.roadEnd(w));
  assert.equal(beyond.length, 0);
});

t('결재 조건 ②(누적 즐거움)는 줄지 않는다', () => {
  const w = S.createWorld(3);
  firstSession(w);
  let prev = 0;
  for (let i = 0; i < 48; i++) { S.advance(w, 60); assert.ok(w.cjoy >= prev); prev = w.cjoy; }
});

t('진화 되돌리기는 단계·근속을 그대로 돌려놓는다 (도감은 남는다)', () => {
  const w = S.createWorld(4);
  firstSession(w);
  S.advance(w, 600);
  const m = w.monsters.find(x => S.canEvolve(x))!;
  const before = { stage: m.stage, tenure: m.tenure };
  const r = S.evolve(w, m.id);
  assert.ok(r.ok);
  S.unevolve(w, m.id, r.from, r.tenureBefore);
  assert.deepEqual({ stage: m.stage, tenure: m.tenure }, before);
});

t('근속 이월: 보류한 만큼 다음 단계로 넘어간다', () => {
  const w = S.createWorld(5);
  const m = S.addMonster(w, 'snail', 'h1', { tenure: 2600 });
  S.evolve(w, m.id);
  assert.equal(m.tenure, 600);
});

t('승진 발령과 되돌리기: 월드가 발령 전과 똑같아진다', () => {
  const p = PERSONAS[0];
  const w = S.createWorld(7);
  firstSession(w);
  S.advance(w, 600);
  const m = w.monsters.find(x => S.canEvolve(x) && S.bestPromote(w, x.id));
  assert.ok(m, 'Day 2에 발령 거리가 있다');
  const plan = S.bestPromote(w, m!.id)!;
  const before = snap(w);
  const r = S.promote(w, plan);
  assert.ok(r.ok);
  assert.equal(S.gapSize(S.gapSegments(w)), plan.gapAfter, '미리보기와 결과가 같다');
  S.unpromote(w, plan, r);
  assert.equal(snap(w), before);
  void p;
});

t('Day 2 발령은 컨셉의 한 수(버섯 언덕 개업 → Lv 14–15)를 입구를 비우지 않고 푼다', () => {
  const w = S.createWorld(20260924);
  firstSession(w);
  S.advance(w, 600);
  const sn = S.monsIn(w, 'h1').find(m => m.stage === 0 && S.canEvolve(m))!;
  const plain = S.preview(w, { evolve: sn.id });
  assert.ok(plain.entranceBlocked, '그냥 진화하면 입구가 막힌다');
  const plan = S.bestPromote(w, sn.id)!;
  assert.ok(plan && !plan.pv.entranceBlocked);
  assert.equal(plan.gapAfter, 0);
});

t('꽉 찬 던전에도 놓을 수 있다 (직원 자리 +1을 같이 산다)', () => {
  const w = S.createWorld(8);
  firstSession(w);
  w.smile = 10000;
  S.addMonster(w, 'snail', 'h1');
  const extra = S.addMonster(w, 'mush', null);
  assert.equal(S.monsIn(w, 'h1').length, 3);
  const c = S.placeCheckAuto(w, extra, 'h1');
  assert.ok(c.ok && c.slotCost === 1000);
  const r = S.placeAuto(w, extra.id, 'h1');
  assert.ok(r.ok && w.dungeons.h1.slots === 4 && w.smile === 9000);
});

t('본사 전근(퇴사): 채용비 절반 환급 · 고참과 발록은 안 된다 · 되돌리기', () => {
  const w = S.createWorld(9);
  const vet = w.monsters.find(m => m.vet)!;
  assert.equal(S.release(w, vet.id).ok, false);
  const m = S.addMonster(w, 'mush', null);
  const s0 = w.smile, n0 = w.monsters.length;
  const r = S.release(w, m.id);
  assert.ok(r.ok && r.refund === 400 && w.smile === s0 + 400);
  S.unrelease(w, r.mon, r.idx, r.refund);
  assert.equal(w.monsters.length, n0);
  assert.equal(w.smile, s0);
});

t('키워서 잇기: 채용으로 안 닿는 길 끝에 진화하면 닿는 계열을 알려 준다', () => {
  const w = S.createWorld(10);
  w.chapter = 3; // 길 끝 Lv 45
  const g = S.recommendGrow(w, [42, 45]);
  assert.ok(g && g.lv >= 37 && g.lv <= 47);
  assert.equal(S.recommendSpecies(w, [42, 45]), null);
});

t('"진화하면 이어져요"는 지켜질 때만 약속한다 (평균에 섞여 못 닿으면 아니다)', () => {
  const w = S.createWorld(14);
  w.chapter = 4; w.plots.k1 = { open: true };
  w.dungeons.k1 = { ...w.dungeons.h1, id: 'k1', event: null };
  const a = S.addMonster(w, 'ligator', 'k1'); a.stage = 1;
  const b = S.addMonster(w, 'ligator', 'k1'); b.stage = 1;
  assert.equal(S.growingToward(w, [56, 60]), null, '크로코 둘이 섞이면 진화해도 Lv 54');
  b.d = null;
  assert.equal(S.growingToward(w, [56, 60])?.id, a.id, '혼자면 Lv 58 → 53–63');
});

t('5장: 결재 서류에 발록이 붙어 오고, 발록 던전이 조건 ③이다', () => {
  const w = S.createWorld(11);
  for (let c = 1; c < 5; c++) { w.approvalReady = true; S.approve(w); }
  assert.equal(w.chapter, 5);
  const bal = w.monsters.find(m => m.sp === 'balrog');
  assert.ok(bal && !bal.d && S.isBoss(bal));
  assert.equal(S.approvalConds(w).balrog, false);
  w.plots.s1.open = true; bal!.d = 's1';
  assert.equal(S.approvalConds(w).balrog, true);
  w.approvalReady = true;
  const r = S.approve(w);
  assert.ok(r.ok && r.ending && w.ended && w.stars === 5);
  assert.equal(S.approve(w).ok, false, '엔딩 뒤 결재는 없다');
});

t('콘텐츠: 도감 36칸, 부지 15곳', () => {
  assert.equal(DEX_TOTAL, 36);
  assert.equal(PLOTS.length, 15);
});

t('세이브 모양 확인', () => {
  const w = S.createWorld(12);
  assert.ok(S.isWorld(JSON.parse(JSON.stringify(w))));
  assert.equal(S.isWorld({ v: 1 }), false);
});

t('가벼운 복제는 원본을 바꾸지 않는다 (봇 판단용)', () => {
  const w = S.createWorld(13);
  const c = lightClone(w);
  c.monsters[0].stage = 3; c.plots.h1.open = false;
  assert.equal(w.monsters[0].stage, 0);
  assert.equal(w.plots.h1.open, true);
});

t('v1.2 표준 봇: 엔딩을 보고, 5장 결재가 목표 달력(D28~35) 근처다', () => {
  const r = runPersona(PERSONAS[0], 7, 45);
  assert.ok(r.ending != null, '엔딩');
  const day = (r.ending! + 21 * 60) / 1440 + 1;
  assert.ok(day > 24 && day < 40, 'D' + day.toFixed(1));
  assert.ok(r.happyEnd > 0);
});

t('v1.2 퇴근 직전 진화 봇도 월드가 멈추지 않는다', () => {
  const r = runPersona(PERSONAS.find(p => p.id === 'night')!, 7, 45);
  assert.ok(r.happyEnd > 0);
  assert.ok(r.chapters[2] != null, '3장까지는 간다');
});

console.log(`\n${passed} passed`);
