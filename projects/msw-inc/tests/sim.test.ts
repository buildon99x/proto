/*
 * 규칙 테스트 — pnpm --filter msw-inc test
 * 1) 이식 검증: 옛 규칙(v1.1)으로 굴리면 컨셉 프로토타입(sim.js)과 같은 수치가 나온다
 * 2) v1.2 약속: 월드가 멈추지 않는다, 되돌리기는 상태를 그대로 돌려놓는다, 결재 조건 ②는 줄지 않는다
 * 3) v1.3 (플레이 리뷰 뒤): 막대 눈금 보상, 옛 세이브 올리기
 * 4) v1.4 (첫 40분 밀도): 배속 없음, 파티 도착 박자, 구간 개방, 붐빔 풀기, 경험 간격
 * 5) v1.5 (계열 사다리): 2장부터 새 계열, 사다리로 줄 나누기, 싼 2장 개업, 옛 규칙 재현
 * 6) v1.6 (드랍 상자): 2장부터 떨어진다, 월드에 하나, 고르기와 되돌리기, 난수 흐름은 v1.5 그대로
 * 7) v1.7 (사냥터·모객): 새 필드를 끄면 v1.6과 같다
 * 2)~7)은 게임 규칙(v1.7)으로 돈다
 */
import assert from 'node:assert/strict';
import * as S from '../app/src/sim/sim';
import { useRules, V11, V13, V14, V15, V16, V17, GUESTS_V17, RULES } from '../app/src/sim/rules';
import { PERSONAS, runPersona, firstSession, lightClone, checkIn } from '../app/src/sim/bots';
import { runCadence, gapStats } from '../app/src/sim/tools/cadence';
import { PLOTS, CHAPTERS, SPECIES } from '../app/src/sim/content';

let passed = 0;
const t = (name: string, fn: () => void) => {
  try { fn(); passed++; console.log('✓', name); } catch (e) { console.log('✕', name); throw e; }
};
// id 번호는 되돌리지 않는다. 도감과 운영 기록(v1.7)도 되돌리지 않는다(한 번 본 모습은 본 것이다)
const snap = (w: S.World) => JSON.stringify({ ...w, advs: w.advs.length, nextMon: 0, dex: 0, rec: 0 });

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
    if (w.t >= 5 && w.tickets.event) S.startEvent(w, 'h1', 'exp');
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

// ── 2. v1.2 약속 (게임 규칙 v1.7로) ─────────────────────────
useRules(V17);
t('첫 10분 한 바퀴: 첫 세션 안에 엘리트·승진 발령·1장 결재·새 지역 채용까지 겪는다', () => {
  const w = S.createWorld(20260924);
  const kinds: string[] = [];
  firstSession(w, k => kinds.push(k));
  for (const k of ['levelup', 'stuck', 'hire', 'zone', 'promote', 'event', 'elite', 'stamp', 'region']) assert.ok(kinds.includes(k), k);
  assert.equal(w.chapter, 2, '1장 결재를 받았다');
  assert.ok(w.t < 12, '월드 12분 안 (실제로는 튜토리얼 배속 때문에 더 짧다) ' + w.t.toFixed(1));
  assert.equal(w.tickets.plot, 0, '개업권 두 장(입사 선물·1장 결재 선물)을 다 썼다');
  assert.ok(w.monsters.some(m => m.sp === 'slime' && m.d), '슬라임을 엘리니아에 두었다');
});

t('첫 출근 리포트: 세 숫자가 모두 늘어 있고 진화 가능이 있다', () => {
  const w = S.createWorld(20260924);
  firstSession(w);
  const L = S.ledgerStart(w);
  S.advance(w, 600, L);
  const r = S.ledgerReport(L, w);
  assert.ok(r.happy >= 12, 'happy ' + r.happy);
  assert.ok(r.levelups > 500 && r.smile > 2000);
  assert.ok(r.ready.length >= 1);
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
  S.unevolve(w, m.id, r.from, r.tenureBefore, r.retIds);
  assert.deepEqual({ stage: m.stage, tenure: m.tenure }, before);
});

t('근속 이월: 보류한 만큼 다음 단계로 넘어간다', () => {
  const w = S.createWorld(5);
  const need = RULES.evolveNeed[0];
  const m = S.addMonster(w, 'snail', 'h1', { tenure: need + 600 });
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

t('1장 Lv 14–15: 고참 달팽이 승진 발령 한 번에 버섯 언덕을 열어 잇는다 (그냥 진화는 들판 평균이라 안 닿는다)', () => {
  const w = S.createWorld(20260924);
  firstSession(w, undefined, x => x.monsters.some(m => m.sp === 'mush' && m.d === 'h2'));
  assert.deepEqual(S.gapSegments(w), [], '주황버섯으로 첫 구간(Lv 1–10)은 이어진다');
  assert.ok(S.forceZone(w), '헤네시스 둘째 구간(Lv 11–15)');
  assert.deepEqual(S.gapSegments(w), [[14, 15]], '둘째 구간을 열면 Lv 14–15가 남는다');
  const vet = w.monsters.find(m => m.vet)!;
  vet.tenure = S.evolveNeed(vet);
  assert.ok(S.preview(w, { evolve: vet.id }).gapsAfter.length > 0, '그냥 진화하면 빈틈이 그대로');
  const plan = S.bestPromote(w, vet.id)!;
  assert.ok(plan && !plan.pv.entranceBlocked);
  assert.equal(plan.gapAfter, 0);
  assert.equal(plan.to, 'h3');
  assert.equal(plan.openCost, 0, '개업권');
  const before = snap(w);
  const r = S.promote(w, plan);
  assert.ok(r.ok && w.tickets.plot === 0 && !S.gapSegments(w).length);
  S.unpromote(w, plan, r);
  assert.equal(snap(w), before, '되돌리면 개업권도 돌아온다');
});

t('그냥 진화를 골라도 기다리지 않는다: 파란 달팽이를 버섯 언덕으로 옮기면 이어진다 (moveFix)', () => {
  const w = S.createWorld(20260924);
  firstSession(w, undefined, x => x.monsters.some(m => m.sp === 'mush' && m.d === 'h2'));
  S.forceZone(w);
  const vet = w.monsters.find(m => m.vet)!;
  vet.tenure = S.evolveNeed(vet);
  S.evolve(w, vet.id);
  const mv = S.moveFix(w, [14, 15])!;
  assert.ok(mv, '옮기는 수가 있다');
  assert.equal(mv.mon.id, vet.id);
  assert.equal(mv.to, 'h3');
  assert.ok(mv.ticket && mv.cost === 0, '개업권으로 공짜');
  assert.ok(S.place(w, mv.mon.id, mv.to).ok);
  assert.equal(S.gapSegments(w).length, 0);
  assert.equal(S.moveFix(w, [14, 15]), null, '닫힌 뒤에는 권하지 않는다');
});

t('첫 세션: Lv 14–15 빈틈은 월드 1.5분 안에 닫히고 둘째 달팽이를 기다리지 않는다', () => {
  const w = S.createWorld(20260924);
  let open: number | null = null, closed: number | null = null;
  firstSession(w, undefined, x => {
    const g = S.gapSegments(x).some(s => s[1] >= 14);
    if (g && open == null && x.monsters.some(m => m.sp === 'mush' && m.d)) open = x.t;
    if (!g && open != null && closed == null) closed = x.t;
    return false;
  });
  assert.ok(open != null && closed != null, `${open} → ${closed}`);
  assert.ok(closed! - open! < 1.5, `빈틈 ${(closed! - open!).toFixed(2)}분`);
  assert.ok(w.monsters.some(m => m.sp === 'snail' && !m.vet && m.stage === 0), '둘째 달팽이는 그대로 들판');
});

t('꽉 찬 던전에도 놓을 수 있다 (직원 자리 +1을 같이 산다)', () => {
  const w = S.createWorld(8);
  firstSession(w);
  w.smile = 10000;
  while (S.monsIn(w, 'h1').length < w.dungeons.h1.slots) S.addMonster(w, 'snail', 'h1');
  const extra = S.addMonster(w, 'mush', null);
  assert.equal(S.monsIn(w, 'h1').length, 3);
  const price = S.slotCost(w, w.dungeons.h1)!; // 챕터 비용 배율을 탄다 (첫 세션 뒤 2장이면 1,500)
  const c = S.placeCheckAuto(w, extra, 'h1');
  assert.ok(c.ok && c.slotCost === price);
  const r = S.placeAuto(w, extra.id, 'h1');
  assert.ok(r.ok && w.dungeons.h1.slots === 4 && w.smile === 10000 - price);
});

t('본사 전근(퇴사): 채용비 절반 환급 · 고참과 발록은 안 된다 · 되돌리기', () => {
  const w = S.createWorld(9);
  const vet = w.monsters.find(m => m.vet)!;
  assert.equal(S.release(w, vet.id).ok, false);
  const m = S.addMonster(w, 'mush', null);
  const s0 = w.smile, n0 = w.monsters.length;
  const r = S.release(w, m.id);
  const half = S.hireCost('mush') / 2;
  assert.ok(r.ok && r.refund === half && w.smile === s0 + half);
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

t('5장: 결재 서류에 발록이 붙어 오고, 발록 던전과 슬리피우드 식구 던전이 조건 ③이다', () => {
  const w = S.createWorld(11);
  for (let c = 1; c < 5; c++) { w.approvalReady = true; S.approve(w); }
  assert.equal(w.chapter, 5);
  const bal = w.monsters.find(m => m.sp === 'balrog');
  assert.ok(bal && !bal.d && S.isBoss(bal));
  assert.equal(S.approvalConds(w).balrog, false);
  w.plots.s1.open = true; bal!.d = 's1';
  assert.equal(S.approvalConds(w).balrog, true);
  // v1.3 ③: 슬리피우드 식구(드레이크·이블아이)가 일하는 던전도 있어야 한다
  assert.equal(S.approvalConds(w).native, false);
  const dr = S.addMonster(w, 'drake', null);
  assert.deepEqual(S.bestPlaces(w, dr.id).every(id => !S.monsIn(w, id).length), true, '식구는 빈 부지를 먼저 권한다');
  w.plots.s2.open = true; dr.d = 's2';
  assert.equal(S.approvalConds(w).native, true);
  w.approvalReady = true;
  const r = S.approve(w);
  assert.ok(r.ok && r.ending && w.ended && w.stars === 5);
  assert.equal(S.approve(w).ok, false, '엔딩 뒤 결재는 없다');
});

// ── 3. v1.3 ────────────────────────────────────────────────
t('결재 ② 눈금: 25%에 이번 장 계열 채용권, 75%까지 이벤트권 3장이 저절로 들어온다', () => {
  const w = S.createWorld(15);
  w.approvalReady = true; S.approve(w);
  assert.equal(w.chapter, 2);
  const goal = S.approvalConds(w).joyGoal;
  const ev0 = w.tickets.event, hire0 = w.tickets.hire.length;
  w.cjoy = goal * 0.26;
  const out: S.SimEvent[] = [];
  S.step(w, 1, out);
  const m1 = out.find(e => e.type === 'mark');
  assert.ok(m1 && m1.type === 'mark' && m1.reward.kind === 'hire');
  assert.equal(w.tickets.hire.length, hire0 + 1);
  assert.equal(SPECIES[w.tickets.hire[w.tickets.hire.length - 1]].chapter, 2, '2장에 합류한 계열 (v1.5는 사다리 계열 포함)');
  w.cjoy = goal * 0.8;
  S.step(w, 1);
  assert.equal(w.marks.length, 3);
  assert.ok(w.tickets.event >= ev0 + 2, '75% 눈금 이벤트권 2장');
  w.approvalReady = true; S.approve(w);
  assert.equal(w.marks.length, 0, '새 장은 눈금을 처음부터 센다');
});

t('엘리트·필드 보스가 있어도 던전 레벨은 직원 평균 그대로다 (P2)', () => {
  const w = S.createWorld(17);
  firstSession(w);
  S.advance(w, 120);
  const lv0 = JSON.stringify(S.levelsOf(w));
  assert.ok(S.forceElite(w));
  w.approvalReady = true; S.approve(w);
  w.boss = { ch: 2, at: w.t, d: null, kills: 0, until: null };
  const host = S.bossHosts(w)[0];
  assert.ok(host && S.inviteBoss(w, host).ok);
  assert.equal(JSON.stringify(S.levelsOf(w)), lv0);
  assert.equal(S.dungeonInfo(w)[host].seats, w.dungeons[host].seats + 8, '보스가 오면 자리 +8');
});

t('필드 보스는 ② 50%에 찾아오고, 초대하지 않아도 저절로 토벌된다 (실패 없음)', () => {
  const w = S.createWorld(18);
  firstSession(w);
  S.advance(w, 600);
  w.approvalReady = true; S.approve(w);
  const goal = S.approvalConds(w).joyGoal;
  w.cjoy = goal * 0.51;
  const out: S.SimEvent[] = [];
  S.step(w, 1, out);
  assert.ok(out.some(e => e.type === 'bossCall'), '보스가 찾아온다');
  assert.ok(w.boss && !w.boss.d);
  const before = w.cjoy;
  let down = false;
  for (let i = 0; i < 180 + 480 + 5 && !down; i++) { const ev: S.SimEvent[] = []; S.step(w, 1, ev); down = ev.some(e => e.type === 'bossDown'); }
  assert.ok(down, '자동 초대 3시간 + 방문 최대 8시간 안에 토벌');
  assert.ok(w.dex['fb:' + w.chapter], '도감 칸');
  assert.ok(w.cjoy >= before + goal * 0.05, '② 목표의 5%를 더한다');
});

t('필드 보스 초대 되돌리기는 초대 전과 똑같이 돌려놓는다', () => {
  const w = S.createWorld(19);
  firstSession(w);
  S.advance(w, 600);
  w.approvalReady = true; S.approve(w);
  w.boss = { ch: 2, at: w.t, d: null, kills: 0, until: null };
  const before = JSON.stringify(w);
  assert.ok(S.inviteBoss(w, S.bossHosts(w)[0]).ok);
  S.uninviteBoss(w);
  assert.equal(JSON.stringify(w), before);
});

t('머쉬맘 결재 대사는 옛 조건(동시 인원 N명)을 말하지 않는다', () => {
  for (const c of CHAPTERS) assert.ok(!/\d+\s*명/.test(c.say), c.say);
});

t('옛 세이브(v2)는 버리지 않고 v3로 올린다', () => {
  const w = JSON.parse(JSON.stringify(S.createWorld(16)));
  delete w.tickets; delete w.marks; delete w.elite; delete w.boss; delete w.bossDone; delete w.eliteAcc; delete w.eliteBy;
  w.v = 2; w.tut.ticket = 'mush'; w.tut.freeEvent = 1;
  const up = S.migrate(w);
  assert.ok(S.isWorld(up));
  const u = up as S.World;
  assert.deepEqual(u.tickets.hire, ['mush']);
  assert.equal(u.tickets.event, 1);
  assert.deepEqual(u.marks, []);
  assert.equal(u.boss, null);
  assert.deepEqual(u.bossDone, []);
});

t('콘텐츠: 도감 52칸(직원 48 + 필드 보스 4), 부지 15곳 + v1.4 초반 사냥터 4곳', () => {
  assert.equal(S.dexTotal(), 52);
  assert.equal(PLOTS.length, 19);
  assert.equal(S.plotsInPlay().length, 19);
  useRules(V13);
  assert.equal(S.plotsInPlay().length, 15, 'v1.3 규칙은 옛 부지 15곳 그대로');
  assert.equal(S.createWorld(1).dungeons.h1.seats, 12, 'v1.3 들판 12석(8+4)');
  useRules(V14);
  assert.equal(S.createWorld(1).dungeons.h1.seats, 16, 'v1.4 들판 16석(12+4)');
  assert.equal(S.dexTotal(), 40, 'v1.4 도감 40칸 그대로');
  useRules(V17);
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

t('표준 봇: 엔딩을 보고, 5장 결재가 목표 달력(D28~35) 근처다', () => {
  const r = runPersona(PERSONAS[0], 7, 45);
  assert.ok(r.ending != null, '엔딩');
  const day = (r.ending! + 21 * 60) / 1440 + 1;
  assert.ok(day > 24 && day < 40, 'D' + day.toFixed(1));
  assert.ok(r.happyEnd > 0);
});

t('퇴근 직전 진화 봇도 월드가 멈추지 않는다', () => {
  const r = runPersona(PERSONAS.find(p => p.id === 'night')!, 7, 45);
  assert.ok(r.happyEnd > 0);
  assert.ok(r.chapters[2] != null, '3장까지는 간다');
});

// ── 4. v1.4 첫 40분 밀도 ─────────────────────────────────────
t('배속 없음: 입사 버프가 없고, 한 사람의 레벨업 속도는 처음부터 같다', () => {
  const w = S.createWorld(3);
  assert.equal(w.tut.buffUntil, 0);
  S.step(w, 1 / 60);
  const a = w.advs.find(x => x.st === 'happy' && x.lv === 1)!;
  const p0 = a.prog;
  S.step(w, 0.1);
  assert.ok(Math.abs(a.prog - p0 - 0.1) < 1e-9 || a.lv > 1, '분당 1 (×30이 아니다)');
});

t('파티 도착: 첫 40분은 20초 박자로 1~2명씩, 90분 뒤에는 v1.3 기본 도착률', () => {
  const w = S.createWorld(5);
  let last = 0, maxGap = 0, parties = 0, people = 0;
  while (w.t < 40) {
    const ev: S.SimEvent[] = [];
    S.step(w, 1 / 12, ev);
    const n = ev.filter(e => e.type === 'arrive').length;
    if (n && w.t > 1.5) { parties++; people += n; maxGap = Math.max(maxGap, w.t - last); assert.ok(n <= 2, '파티는 1~2명'); }
    if (n) last = w.t;
  }
  assert.ok(maxGap <= 20 / 60 + 1e-9, `도착 사이 최장 ${(maxGap * 60).toFixed(0)}초`);
  assert.ok(people / 38.5 > 4 && people / 38.5 < 5, `분당 ${(people / 38.5).toFixed(2)}명`);
  const later = S.createWorld(5); later.t = 91;
  assert.equal(S.arrivalPerMin(later), 0.1, '시간당 6명');
  assert.equal(S.tipX(later), 1, '팁도 끝났다');
});

t('구간 개방: 길이 끊긴 채로는 열리지 않고, 결재 ①은 마지막 구간까지 열려야 채워진다', () => {
  const w = S.createWorld(20260924);
  assert.equal(S.roadEnd(w), 10);
  w.zoneAcc = 1e6;
  w.advs.push({ id: 999, lv: 9, prog: 0, st: 'search', d: null, near: null, wait: 0, look: 0, jit: 0 });
  S.step(w, 1 / 12);
  assert.equal(w.zone, 0, 'Lv 8–10 빈틈이 있으면 열리지 않는다');
  const h = S.hire(w, 'mush'); S.place(w, (h as { mon: S.Monster }).mon.id, 'h2');
  const ev: S.SimEvent[] = [];
  S.step(w, 1 / 12, ev);
  assert.equal(w.zone, 1);
  assert.ok(ev.some(e => e.type === 'zone' && e.from === 10 && e.to === 15));
  assert.equal(S.roadEnd(w), 15);
  w.cjoy = 1e6;
  assert.equal(S.approvalConds(w).road, false, '빈틈 14–15');
  // 장이 넘어가면 첫 구간부터
  w.approvalReady = true; S.approve(w);
  assert.equal(S.roadEnd(w), 20);
  assert.equal(S.approvalConds(w).roadNote, '빈틈 7', 'Lv 14–20');
});

t('옛 세이브(구간 없음)는 장 전체 길 그대로다', () => {
  const w = S.createWorld(4);
  delete w.zone; delete w.zoneAcc;
  assert.equal(S.roadEnd(w), 15);
  assert.equal(S.zoneLeft(w), 0);
});

t('붐빔 풀기: 자리 확장을 다 한 던전 앞 줄에는 같은 레벨 새 던전을 권하고, 새 던전은 빈틈을 만들지 않는다', () => {
  const w = S.createWorld(6);
  assert.equal(RULES.id, 'v1.7');
  w.smile = 1e5;
  const d = w.dungeons.h1; d.seatUp = RULES.seatCost.length; d.seats = 99;
  for (let i = 0; i < 99; i++) w.advs.push({ id: 5000 + i, lv: 3, prog: 0, st: 'happy', d: 'h1', near: null, wait: 0, look: 0, jit: 0 });
  for (let i = 0; i < 6; i++) w.advs.push({ id: 6000 + i, lv: 2 + (i % 3), prog: 0, st: 'busy', d: null, near: 'h1', wait: 0, look: 0, jit: 0 });
  const cf = S.crowdFix(w)!;
  assert.ok(cf, '권한다');
  assert.equal(cf.d, 'h1');
  assert.equal(cf.sp, 'snail');
  const gap0 = S.gapSize(S.gapSegments(w));
  const lv = S.levelsOf(w, { add: { sp: cf.sp, to: cf.to }, open: w.plots[cf.to].open ? undefined : cf.to });
  assert.ok(S.gapSize(S.gapSegments(w, lv)) <= gap0);
  d.seatUp = 0;
  useRules(V14);
  assert.equal(S.crowdFix(w), null, 'v1.4: 자리를 늘릴 수 있으면 자리부터');
  useRules(V17);
});

t('경험 간격: 첫 40분 동안 사건 사이 최장 20초, 둔 수 25 이상, 결정 사이 최장 4분 이하', () => {
  const r = runCadence(7, 40);
  const g = gapStats(r.moments.map(m => m.s), 0, 2400);
  assert.ok(g.max <= 20.5, `최장 ${g.max.toFixed(0)}초`);
  assert.ok(r.acts.length >= 25, `둔 수 ${r.acts.length}`);
  const dec = gapStats(r.acts.map(m => m.s), r.tutEnd, 2400);
  assert.ok(dec.max <= 240, `결정 사이 최장 ${dec.max.toFixed(0)}초`);
});

// ── 5. v1.5 계열 사다리 ──────────────────────────────────────
t('계열 사다리: 새 계열 넷은 2장부터 채용하고, 1장 결재 선물은 여전히 슬라임이다', () => {
  const w = S.createWorld(8);
  for (const sp of ['pig', 'octo', 'necki', 'lupin'] as const) assert.equal(S.canHireSpecies(w, sp), false, sp + ' 1장');
  w.approvalReady = true; S.approve(w);
  for (const sp of ['pig', 'octo', 'necki', 'lupin'] as const) assert.ok(S.canHireSpecies(w, sp), sp + ' 2장');
  assert.ok(w.tickets.hire.includes('slime'), '엘리니아 첫 계열 채용권');
  // 헤네시스·엘리니아는 지역당 4종, 기본 레벨이 서로 다르다
  for (const r of [1, 2]) {
    const bases = S.speciesInPlay().filter(sp => S.spRegion(sp) === r).map(sp => SPECIES[sp].base);
    assert.equal(bases.length, 4, '지역 ' + r);
    assert.equal(new Set(bases).size, 4);
  }
  // 2장 길(Lv 1–29)은 어느 레벨이든 채용으로 닿는 계열이 둘 이상이다. Lv 30은 키워서만(구간 ③의 진화 결정)
  const hireable = S.speciesInPlay().filter(sp => S.canHireSpecies(w, sp));
  for (let L = 1; L <= 30; L++) {
    const n = hireable.filter(sp => Math.abs(SPECIES[sp].base - L) <= 5).length;
    if (L === 30) assert.equal(n, 0, 'Lv 30');
    else assert.ok(n >= 1 && (L < 26 ? n >= 2 : true), `Lv ${L}: ${n}종`);
  }
});

t('계열 사다리는 규칙이 꺼지면 사라진다 (v1.4 재현)', () => {
  useRules(V14);
  const w = S.createWorld(8);
  w.approvalReady = true; S.approve(w);
  for (const sp of ['pig', 'octo', 'necki', 'lupin'] as const) assert.equal(S.canHireSpecies(w, sp), false, sp);
  assert.equal(S.plotCost(w, 'e1'), 1000, 'v1.4 엘리니아 개업 1,000');
  useRules(V15);
  assert.equal(S.plotCost(w, 'e1'), 500, 'v1.5 2장 엘리니아 개업 500');
  w.chapter = 3;
  assert.equal(S.plotCost(w, 'p1'), 1500, '3장부터는 그대로');
  useRules(V17);
});

t('사다리로 나누기: 자리를 늘릴 수 있어도 레벨이 다른 계열로 줄을 나누는 수를 권한다', () => {
  const w = S.createWorld(6);
  w.approvalReady = true; S.approve(w);
  w.smile = 1e5;
  const lv = S.levelsOf(w).h1;
  for (let i = 0; i < 40; i++) w.advs.push({ id: 5000 + i, lv: 3, prog: 0, st: 'happy', d: 'h1', near: null, wait: 0, look: 0, jit: 0 });
  for (let i = 0; i < 4; i++) w.advs.push({ id: 6000 + i, lv: 5 + (i % 3), prog: 0, st: 'busy', d: null, near: 'h1', wait: 0, look: 0, jit: 0 });
  const cf = S.crowdFix(w)!;
  assert.ok(cf && cf.split, '나누기를 권한다');
  assert.ok(Math.abs(SPECIES[cf.sp].base - lv) >= S.SPLIT_GAP, `던전 Lv ${lv}와 다른 계열 (${cf.sp})`);
  assert.ok(S.seatCost(w, w.dungeons.h1) != null, '자리는 아직 늘릴 수 있다');
  const gap0 = S.gapSize(S.gapSegments(w));
  const after = S.levelsOf(w, { add: { sp: cf.sp, to: cf.to }, open: w.plots[cf.to].open ? undefined : cf.to });
  assert.ok(S.gapSize(S.gapSegments(w, after)) <= gap0, '빈틈을 만들지 않는다');
});

// ── 6. v1.6 드랍 상자 ────────────────────────────────────────
t('드랍 상자: 1장에는 없고, 결재하면 게이지 절반으로 2장이 시작해 곧 떨어진다', () => {
  const w = S.createWorld(20260924);
  firstSession(w, undefined, x => x.chapter >= 2);
  assert.equal(w.chapter, 2);
  assert.equal(S.boxesOf(w).length, 0, '1장(튜토리얼)에는 떨어지지 않는다');
  const need = RULES.drop!.need[1];
  assert.ok(w.boxAcc! >= need / 2, '결재하면 절반 찬 채로 시작 ' + w.boxAcc);
  const ev: S.SimEvent[] = [];
  const t0 = w.t;
  for (let i = 0; i < 12 * 20 && !S.boxesOf(w).length; i++) S.step(w, 1 / 12, ev);
  const box = ev.find(e => e.type === 'box');
  assert.ok(box && box.type === 'box', '20분 안에 떨어진다');
  assert.ok(w.t - t0 < 10, `도장 뒤 ${(w.t - t0).toFixed(1)}분`);
  assert.ok(S.levelsOf(w)[box.d], '문을 연 던전 앞');
});

t('드랍 상자는 월드에 하나까지만 기다리고, 가득 차면 쌓지 않는다', () => {
  const w = S.createWorld(7);
  firstSession(w);
  S.advance(w, 600);
  assert.equal(S.boxesOf(w).length, RULES.drop!.max);
  const acc = w.boxAcc;
  S.advance(w, 600);
  assert.equal(S.boxesOf(w).length, RULES.drop!.max);
  assert.equal(w.boxAcc, acc, '가득 찬 동안 게이지가 오르지 않는다');
});

t('쥔 무료권이 hold장이면 상자가 쉬고, 권을 쓰면 다시 떨어진다', () => {
  const w = S.createWorld(7);
  firstSession(w);
  const hold = RULES.drop!.hold;
  w.tickets.event = hold; w.tickets.hire = [];
  const acc = w.boxAcc;
  S.advance(w, 600);
  assert.equal(S.boxesOf(w).length, 0, '가득 쥐고 있으면 떨어지지 않는다');
  assert.equal(w.boxAcc, acc, '쉬는 동안 게이지도 오르지 않는다');
  const id = Object.keys(S.levelsOf(w)).find(x => !w.dungeons[x].event)!;
  assert.ok(S.startEvent(w, id, 'exp').ok, '무료 이벤트권을 쓴다');
  S.advance(w, 120);
  assert.equal(S.boxesOf(w).length, 1, '권을 쓰면 다시 떨어진다');
});

t('상자 열기: 채용권이나 이벤트권 하나. 되돌리면 월드가 연 전과 똑같다', () => {
  const w = S.createWorld(7);
  firstSession(w);
  S.advance(w, 600);
  const b = S.boxesOf(w)[0];
  const [hire, event] = S.boxOptions(w);
  assert.equal(hire.kind, 'hire');
  assert.equal(event.kind, 'event');
  if (hire.kind === 'hire') assert.ok(S.canHireSpecies(w, hire.sp), '뽑을 수 있는 계열 ' + hire.sp);
  for (const pick of [hire, event]) {
    const before = snap(w);
    const r = S.openBox(w, b.id, pick);
    assert.ok(r.ok);
    assert.equal(S.boxesOf(w).length, 0);
    if (pick.kind === 'hire') assert.ok(w.tickets.hire.includes(pick.sp)); else assert.ok(w.tickets.event >= 1);
    assert.ok(S.unopenBox(w, r));
    assert.equal(snap(w), before);
  }
  assert.equal(S.openBox(w, 999, event).ok, false, '없는 상자');
  // 받은 이벤트권을 벌써 썼으면 되돌리지 않는다
  w.tickets.event = 0;
  const r = S.openBox(w, b.id, { kind: 'event' });
  assert.ok(r.ok);
  const id = Object.keys(S.levelsOf(w)).find(x => !w.dungeons[x].event)!;
  assert.ok(S.startEvent(w, id, 'exp').ok);
  assert.equal(S.unopenBox(w, r), false);
  assert.equal(S.boxesOf(w).length, 0);
});

t('오렌·봇이 권하는 상자: 줄을 나눌 계열이 있으면 그 채용권, 없으면 이벤트권', () => {
  const w = S.createWorld(6);
  w.approvalReady = true; S.approve(w);
  const g = S.gapSegments(w)[0];
  assert.ok(g, '2장이 열리면 새 구간에 빈틈이 있다');
  assert.deepEqual(S.boxPick(w), { kind: 'hire', sp: S.recommendSpecies(w)! }, '빈틈을 메우는 계열');
  // 길을 다 이으면(Lv 1–20) 줄도 빈틈도 없다 → 이벤트권
  S.addMonster(w, 'mush', 'h2'); w.plots.h2.open = true;
  S.addMonster(w, 'slime', 'e1'); w.plots.e1.open = true;
  assert.deepEqual(S.gapSegments(w), []);
  assert.deepEqual(S.boxPick(w), { kind: 'event' }, '줄도 빈틈도 없으면 이벤트권');
  w.smile = 1e5;
  for (let i = 0; i < 40; i++) w.advs.push({ id: 5000 + i, lv: 3, prog: 0, st: 'happy', d: 'h1', near: null, wait: 0, look: 0, jit: 0 });
  for (let i = 0; i < 4; i++) w.advs.push({ id: 6000 + i, lv: 5 + (i % 3), prog: 0, st: 'busy', d: null, near: 'h1', wait: 0, look: 0, jit: 0 });
  const cf = S.crowdFix(w)!;
  assert.deepEqual(S.boxPick(w), { kind: 'hire', sp: cf.sp });
  assert.equal(S.boxHireSp(w), cf.sp);
});

t('드랍 이벤트 중인 던전의 퇴근은 상자 게이지에 두 배로 쌓인다', () => {
  const a = S.createWorld(9), b = S.createWorld(9);
  for (const w of [a, b]) { firstSession(w, undefined, x => x.chapter >= 2); w.boxAcc = 0; w.boxBy = {}; }
  const id = Object.keys(S.levelsOf(b)).find(x => !b.dungeons[x].event)!;
  b.tickets.event = 1;
  assert.ok(S.startEvent(b, id, 'drop').ok);
  S.step(a, 1); S.step(b, 1);
  assert.ok((b.boxBy![id] || 0) > (a.boxBy![id] || 0), `${b.boxBy![id]} > ${a.boxBy![id]}`);
});

t('상자가 떨어진 던전이 문을 닫으면 상자는 다른 던전 앞으로 옮긴다', () => {
  const w = S.createWorld(7);
  firstSession(w);
  S.advance(w, 600);
  const b = S.boxesOf(w)[0];
  for (const m of S.monsIn(w, b.d)) if (!m.vet) m.d = null;
  for (const m of S.monsIn(w, b.d)) m.d = 'h5';
  if (!w.plots.h5.open) w.plots.h5.open = true;
  S.step(w, 1);
  assert.ok(S.levelsOf(w)[S.boxesOf(w)[0].d], '상자는 문을 연 던전 앞에 있다');
});

t('드랍 상자는 난수를 쓰지 않는다: 열지 않으면 월드가 v1.5와 똑같이 흐른다', () => {
  const run = (r: typeof V15) => {
    useRules(r);
    const w = S.createWorld(11);
    firstSession(w);
    S.advance(w, 1440);
    return JSON.stringify({ advs: w.advs, smile: w.smile, rng: w.rng, cjoy: w.cjoy, stats: w.stats });
  };
  const v15 = run(V15), v16 = run(V16);
  assert.equal(v16, v15);
});

t('드랍 상자는 규칙이 꺼지면 없다 (v1.5 재현), 옛 세이브는 첫 걸음에 칸을 채운다', () => {
  useRules(V15);
  const old = S.createWorld(12);
  assert.equal(old.boxes, undefined);
  firstSession(old);
  S.advance(old, 600);
  assert.equal(S.boxesOf(old).length, 0);
  useRules(V17);
  S.step(old, 1);
  assert.deepEqual(old.boxes, []);
  S.advance(old, 600);
  assert.equal(S.boxesOf(old).length, 1, 'v1.6으로 올리면 상자가 떨어진다');
});

t('봇은 상자를 열어도 수 제한에 세지 않고, 모든 성향에서 월드가 멈추지 않는다 (v1.6)', () => {
  for (const p of PERSONAS) {
    const r = runPersona(p, 11, 45);
    assert.ok(r.happyEnd > 0, p.id + ' 멈춤');
    assert.ok(r.boxes > 0, p.id + ' 상자를 열었다');
    assert.ok(r.acts / r.checkins <= p.acts + 1, p.id + ' 체크인당 행동 ' + (r.acts / r.checkins).toFixed(1));
  }
});

// ── 7. v1.7 사냥터·모객 ──────────────────────────────────────
/** v1.7의 새 필드를 모두 끈 규칙. 필드를 더할 때마다 여기에 기본값(null·false)을 적는다 */
const V17_OFF = { ...V17, grounds: null, guests: null };
t('규칙 v1.7은 새 필드를 끄면 v1.6과 똑같이 흐른다 (봇 한 달, 난수 흐름까지)', () => {
  const run = (r: typeof V16) => {
    useRules(r);
    const w = S.createWorld(13);
    firstSession(w);
    S.advance(w, 1440 * 3);
    const res = runPersona(PERSONAS[0], 7, 20);
    return JSON.stringify({ advs: w.advs.length, smile: Math.round(w.smile), rng: w.rng, cjoy: Math.round(w.cjoy), stats: w.stats, ch: res.chapters, acts: res.acts });
  };
  const a = run(V16), b = run(V17_OFF);
  assert.equal(b, a);
  useRules(V17);
});

t('사냥터 값 (v1.7): 부지 자리는 초반 두 지역 12, 3장부터 8·12·16이고 지역 합은 12 × 부지 수 그대로, 식구는 자기 사냥터에서 근속 ×homeX', () => {
  const w = S.createWorld(21);
  for (let r = 1; r <= 5; r++) {
    const ps = PLOTS.filter(p => p.region === r);
    assert.equal(ps.reduce((s, p) => s + p.seats, 0), 12 * ps.length, `지역 ${r} 자리 합`);
    for (const p of ps) { assert.ok((r <= 2 ? [12] : [8, 12, 16]).includes(p.seats), p.id); assert.ok(p.home.length >= 1 && p.home.every(sp => SPECIES[sp]), p.id + ' 식구'); if (r >= 3) assert.equal(p.tiers, p.seats < 12 ? 1 : p.seats === 12 ? 2 : 3, p.id + ' 층 수 = 자리'); }
  }
  assert.equal(w.dungeons.h1.seats, 16, '들판 12 + 선물 4');
  w.plots.h4.open = true; w.plots.h5.open = true;
  assert.equal(w.dungeons.h4.seats, 12); assert.equal(w.dungeons.h5.seats, 12);
  w.plots.p1 = { open: true }; w.dungeons.p1 = { id: 'p1', slots: 3, seats: S.plotSeats('p1'), seatUp: 0, slotUp: 0, event: null, joy: 0, recentLv: 0 };
  assert.equal(w.dungeons.p1.seats, 16); assert.equal(S.plotSeats('p2'), 8);
  // 식구: 같은 조건에서 자기 사냥터의 근속이 1.2배
  const a = S.createWorld(22), b = S.createWorld(22);
  for (const x of [a, b]) { x.plots.h4.open = true; x.plots.h2.open = true; for (const m of x.monsters) m.d = null; }
  const pa = S.addMonster(a, 'pig', 'h4'), pb = S.addMonster(b, 'pig', 'h2');
  assert.ok(S.atHome(pa) && !S.atHome(pb));
  for (const x of [a, b]) for (let i = 0; i < 12; i++) x.advs.push({ id: 900 + i, lv: 5, prog: 0, st: 'happy', d: x === a ? 'h4' : 'h2', near: null, wait: 0, look: 0, jit: 0 });
  S.step(a, 1); S.step(b, 1);
  const per = (x: S.World, m: S.Monster) => m.tenure / S.happyCount(x); // 자리 수가 달라 즐거운 인원이 다르니 한 명당 근속으로 비교한다
  assert.ok(Math.abs(per(a, pa) / per(b, pb) - RULES.grounds!.homeX) < 1e-6, `${per(a, pa)} / ${per(b, pb)}`);
  // 추천 자리: 빈틈·비용이 같으면 식구 사냥터가 먼저
  const w2 = S.createWorld(23);
  w2.plots.h4.open = true; w2.plots.h5.open = true; w2.smile = 1e5;
  const m = S.addMonster(w2, 'pig', null);
  const best = S.bestPlaces(w2, m.id);
  assert.ok(best.length && best.every(id => S.isHome('pig', id)), JSON.stringify(best));
  // 규칙을 끄면 v1.6 그대로
  useRules({ ...V17, grounds: null });
  const old = S.createWorld(21); old.plots.h4.open = true;
  assert.equal(old.dungeons.h4.seats, 12);
  assert.equal(S.atHome(S.addMonster(old, 'pig', 'h4')), false);
  useRules(V17);
});

t('도감 운영 기록 (v1.7): 일한 사냥터·퇴근왕·단계별 첫 진화 시각이 쌓이고, 옛 세이브는 비어 있어도 된다', () => {
  const w = S.createWorld(24);
  firstSession(w);
  const r = S.recordOf(w, 'snail');
  assert.ok(r.plots.includes('h1') && r.plots.includes('h3'), '고참이 들판에서 버섯 언덕으로 발령 ' + JSON.stringify(r.plots));
  assert.equal(r.at[0], 0, '첫 채용 시각');
  assert.ok(r.at[1] != null && r.at[1]! > 0, '첫 진화 시각');
  assert.equal(r.kings, 0);
  S.recordReport(w, { king: { id: w.monsters[0].id, n: 10 } });
  assert.equal(S.recordOf(w, w.monsters[0].sp).kings, 1);
  // 봇 판단용 복제본에서 진화해도 진짜 월드의 기록은 바뀌지 않는다
  const c = lightClone(w);
  const ready = c.monsters.find(x => x.stage === 0 && !x.vet)!;
  ready.tenure = S.evolveNeed(ready); S.evolve(c, ready.id);
  assert.equal(S.recordOf(w, ready.sp).at[1] == null || S.recordOf(w, ready.sp).at[1] === r.at[1] && ready.sp === 'snail', true);
  // 옛 세이브: rec가 없어도 읽을 수 있다
  const old = JSON.parse(JSON.stringify(w)); delete old.rec;
  assert.ok(S.isWorld(old));
  assert.deepEqual(S.recordOf(old, 'mush').plots, []);
});

/** 모객 규칙을 켠 v1.7 (1.8.0부터 게임 값). 게임 규칙에 켜지면 이 줄은 V17과 같다 */
const V17G = { ...V17, guests: V17.guests || GUESTS_V17 };
t('모객 (v1.7): 떠난 손님은 풀에 남고, 복귀 모객이 자기 레벨로 데려온다. 신규 모객은 입구 도착 ×2. 둘 다 이벤트 자리 하나를 쓴다', () => {
  useRules(V17G);
  const w = S.createWorld(31);
  firstSession(w);
  assert.equal(S.recruitTickets(w), 0, '튜토리얼에서 모객권 1장을 썼다');
  assert.ok(w.recruit && w.recruit.kind === 'fresh', '첫 세션에 신규 모객이 걸려 있다');
  const later = { ...w, t: 200, recruit: null }, later2 = { ...w, t: 200 };
  assert.ok(Math.abs(S.arrivalPerMin(later2) / S.arrivalPerMin(later) - 2) < 1e-9, '붐빔이 끝난 뒤 기본 도착 ×2');
  assert.equal(S.arrivalPerMin({ ...w, t: 10 }), S.arrivalPerMin({ ...w, t: 10, recruit: null }), '첫날 붐빔의 파티 박자는 그대로');
  assert.equal(S.activeEvents(w), 1 + Object.values(w.dungeons).filter(d => d.event).length, '모객이 이벤트 자리를 쓴다');
  S.advance(w, 600);
  assert.equal(w.recruit, null, '4시간이면 끝난다');
  const pool = S.poolCount(w);
  assert.ok(pool > 0 && pool <= w.stats.left.busy + w.stats.left.search + w.stats.left.entrance, `떠난 손님이 풀에 남는다 ${pool}`);
  assert.equal(w.pool![1] + w.pool![2], 0, 'Lv 1~2는 남기지 않는다');
  // 복귀: 돌아온 손님은 자기 레벨(1이 아니라 풀의 레벨)로 온다
  w.smile = 1e5;
  const rr = S.returnRoom(w);
  const r = S.startRecruit(w, 'return');
  assert.ok(r.ok && r.cost === RULES.guests!.return.cost * w.chapter);
  const out: S.SimEvent[] = [];
  const before = pool;
  for (let i = 0; i < 60; i++) S.step(w, 1, out);
  const ret = out.filter(e => e.type === 'return') as { type: 'return'; lv: number }[];
  assert.ok(ret.length >= Math.min(RULES.guests!.return.rate - 1, rr.room, before) - 1 && ret.length > 0, `한 시간에 돌아온 손님 ${ret.length} (풀 ${before}, 자리 ${rr.room})`);
  assert.ok(ret.every(e => e.lv >= 1) && ret.some(e => e.lv > 1), '자기 레벨로 돌아온다');
  assert.ok(S.poolCount(w) >= before - ret.length && S.poolCount(w) <= RULES.guests!.pool, '풀에서 나간 만큼 줄고(그 사이 새로 떠난 손님은 더해진다), 상한을 넘지 않는다');
  assert.equal(w.stats.returned, ret.length);
  // 되돌리기: 모객 취소는 이벤트 자리와 스마일을 돌려놓는다 (돌아온 손님은 그대로)
  const w2 = S.createWorld(32); firstSession(w2); S.advance(w2, 600); w2.smile = 1e4;
  const s0 = w2.smile, r2 = S.startRecruit(w2, 'return');
  assert.ok(r2.ok);
  S.cancelRecruit(w2, r2.cost, r2.free);
  assert.equal(w2.recruit, null); assert.equal(w2.smile, s0);
  // 모객권: 6시간 넘게 떠났다 돌아오면 1장, 2장까지만
  assert.equal(S.welcomeBack(w2, 100), false);
  assert.equal(S.welcomeBack(w2, 400), true);
  assert.equal(S.welcomeBack(w2, 400), true);
  assert.equal(S.welcomeBack(w2, 400), false, '쥔 모객권 상한');
  assert.equal(S.recruitTickets(w2), 2);
  // 규칙을 끄면 v1.6 그대로: 풀도 모객권도 없다
  useRules({ ...V17, guests: null });
  const old = S.createWorld(31); firstSession(old); S.advance(old, 600);
  assert.equal(old.pool, undefined); assert.equal(S.poolCount(old), 0); assert.equal(S.recruitPick(old), null);
  assert.equal(S.startRecruit(old, 'fresh').ok, false);
  useRules(V17G);
  // 옛 세이브: 풀·모객권 칸이 없어도 첫 걸음에 채운다
  const sv = JSON.parse(JSON.stringify(w2)); delete sv.pool; delete sv.recruit; delete sv.tickets.recruit;
  assert.ok(S.isWorld(sv)); S.step(sv, 1);
  assert.ok(Array.isArray(sv.pool) && sv.tickets.recruit === 0);
  useRules(V17);
});

t('모객은 놓쳐도 잃는 것이 없고, 봇은 오렌이 권할 때만 건다 (모든 성향에서 월드가 멈추지 않는다)', () => {
  useRules(V17G);
  for (const p of PERSONAS) {
    const r = runPersona(p, 11, 45);
    assert.ok(r.happyEnd > 0, p.id + ' 멈춤');
    assert.ok(r.recruits >= 0);
  }
  const w = S.createWorld(33); firstSession(w);
  S.advance(w, 1440 * 3);
  const c = S.poolCount(w);
  S.advance(w, 1440 * 3);
  assert.ok(S.poolCount(w) >= Math.min(c, RULES.guests!.pool), '풀은 줄지 않는다');
  useRules(V17);
});

t('완전 클리어 (v1.7): 엔딩 뒤 던전 전부 ★3 · 도감 전부가 되는 걸음에 한 번만 사건이 나고, 리포트가 진척과 순간을 안다', () => {
  const w = S.createWorld(41); firstSession(w);
  const std = PERSONAS[0];
  for (let d = 0; d < 60 && !w.ended; d++) for (const tm of std.times) { S.advance(w, Math.max(0, d * 1440 + tm - w.t)); checkIn(w, std); }
  assert.ok(w.ended, '엔딩');
  assert.equal(w.clearedAt, undefined);
  const L = S.ledgerStart(w);
  for (const p of S.plotsInPlay()) { if (!w.plots[p.id].open) w.plots[p.id].open = true; const dg = w.dungeons[p.id]; if (dg) dg.joy = Math.max(dg.joy, S.JOY_STARS[2]); }
  for (const sp of S.speciesInPlay()) SPECIES[sp].names.forEach((_, i) => { w.dex[sp + ':' + i] = true; });
  for (let c = 2; c <= 5; c++) w.dex[S.bossDexKey(c)] = true;
  const ev: S.SimEvent[] = [];
  S.step(w, 1, ev); S.ledgerAdd(L, w, ev);
  assert.equal(ev.filter(e => e.type === 'fullclear').length, 1);
  assert.ok(w.clearedAt != null);
  const ev2: S.SimEvent[] = []; S.step(w, 1, ev2);
  assert.equal(ev2.filter(e => e.type === 'fullclear').length, 0, '한 번만');
  const rep = S.ledgerReport(L, w);
  assert.ok(rep.cleared && rep.starred === S.plotsInPlay().length && rep.starredDelta > 0 && rep.dex === S.dexTotal());
  // 옛 세이브: clearedAt 칸이 없어도 올라온다
  const sv = JSON.parse(JSON.stringify(w)); delete sv.clearedAt;
  assert.ok(S.isWorld(sv));
});

console.log(`\n${passed} passed`);
