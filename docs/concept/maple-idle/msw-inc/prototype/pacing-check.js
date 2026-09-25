/*
 * 페이싱 점검 — 문서가 약속한 시각이 규칙으로 실제로 나오는지 확인한다.
 * 사용: node pacing-check.js
 *
 * 1) 첫 10분 대본 (02 §6.2): 첫 레벨업, Lv 8 빈틈, 고참 달팽이 진화 가능 시각
 * 2) Day 2 첫 출근 (02 §6.3): 8시간 뒤 리포트에 무엇이 들어오는가
 * 3) 챕터 달력 (02 §6.4): 욕심쟁이 봇 매니저로 1장·2장 결재 날짜 (사람보다 빠른 하한선)
 */
require('./sim.js');
const M = globalThis.MSW;

const fmt = m => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;
const START = 21 * 60; // 입사는 저녁 9시 (core.js와 같다)
const day = t => `D${Math.floor((t + START) / 1440) + 1} ${String(Math.floor(((t + START) % 1440) / 60)).padStart(2, '0')}시`;

// ── 1. 첫 10분 ────────────────────────────────────────────────
const w = M.createWorld(20260924);
const marks = {};
let placedAt = null, evolvedAt = null;
const dt = 1 / 12; // 5초
// 대본(tut.js 순서): 빈틈 → 채용·배치 → 5:00 경험치 2배 → 6:30 고참 진화(그전엔 ▲ 숨김) → 8:00 퇴근
for (let i = 0; i < 12 * 8; i++) {
  const ev = [];
  M.step(w, dt, ev);
  for (const e of ev) {
    if (e.type === 'levelup' && !marks.firstLevelUp) marks.firstLevelUp = w.t;
    if (e.type === 'stuck' && !marks.firstGap) marks.firstGap = { t: w.t, lv: e.lv };
    if (e.type === 'ready' && !marks.vetReady) marks.vetReady = w.t;
  }
  // 대본대로 움직이는 플레이어
  if (marks.firstGap && !placedAt && w.t >= marks.firstGap.t + 0.5) {
    const h = M.hire(w, 'mush');
    M.place(w, h.mon.id, 'h2');
    placedAt = w.t;
    marks.gapAfterPlace = M.gapSegments(w).map(s => s.join('–')).join(', ') || '없음';
  }
  if (w.t >= 5 && !marks.event) { marks.event = M.startEvent(w, 'h1', 'exp'); }
  const vet = w.monsters.find(m => m.vet);
  if (vet && w.t >= 6.5 && !evolvedAt) {
    if (!M.canEvolve(vet)) { marks.vetForced = true; vet.tenure = M.EVOLVE_NEED[0]; }
    marks.evolvePreview = M.preview(w, { evolve: vet.id });
    M.evolve(w, vet.id); evolvedAt = w.t;
  }
}
console.log('── 입사 첫 세션 8분 (입사 첫날 버프) ──');
console.log('첫 레벨업          ', fmt(marks.firstLevelUp), '(목표: 첫 출근 뒤 30초 안)');
console.log('첫 빈틈 (갈 곳 없음)', marks.firstGap ? fmt(marks.firstGap.t) + ' Lv ' + marks.firstGap.lv : '없음', '(대본 3:25, Lv 8)');
console.log('주황버섯 배치 후 빈틈', marks.gapAfterPlace);
console.log('고참 진화 가능     ', marks.vetReady ? fmt(marks.vetReady) : '없음', marks.vetForced ? '(6:30에 못 채워 튜토리얼이 보정)' : '(6:30 진화 단계 전에 이미 준비됨 — 그때까지 ▲는 숨긴다)');
console.log('진화 미리보기 잃는 구간', marks.evolvePreview ? JSON.stringify(marks.evolvePreview.lost) : '-', ' 레벨', JSON.stringify(marks.evolvePreview && marks.evolvePreview.after));
console.log('8분 퇴근 시점  즐기는', M.happyCount(w), '/ 모험가', w.advs.length, '/ 스마일', Math.round(w.smile), '/ 빈틈', JSON.stringify(M.gapSegments(w)));

// ── 2. Day 2 첫 출근 ─────────────────────────────────────────
const L = M.ledgerStart(w);
M.advance(w, 10 * 60, L);
const r = M.ledgerReport(L, w);
console.log(`\n── 10시간 뒤 첫 출근 리포트 (${day(w.t)}) ──`);
console.log('즐기는 모험가', r.happy, `(지난 출근 0명 대비 +${r.happy}, 퇴근 순간 대비 ${r.happyDelta >= 0 ? '+' : ''}${r.happyDelta})`, '/ 레벨업', r.levelups, '/ 졸업', r.grads, '/ 스마일 +', r.smile);
console.log('진화 가능', r.ready.map(id => { const m = w.monsters.find(x => x.id === id); return M.monName(m) + '#' + m.no; }).join(', ') || '없음');
console.log('밤사이 퇴근왕', r.king ? (M.monName(w.monsters.find(x => x.id === r.king.id)) + ' ' + r.king.n + '회') : '-');
console.log('명장면: 레벨업 최다', JSON.stringify(r.bestBurst), '과밀 최대', JSON.stringify(r.crowdMax));
console.log('빈틈', JSON.stringify(M.gapSegments(w)), '떠남', JSON.stringify(w.stats.left));
const field = M.monsIn(w, 'h1');
const snail = field.find(m => m.stage === 0);
if (snail && M.canEvolve(snail)) {
  const p = M.preview(w, { evolve: snail.id });
  console.log('남은 달팽이 진화 미리보기: 들판', p.before.h1, '→', p.after.h1, ' 잃는 구간', JSON.stringify(p.lost), ' 갈 곳 잃는 모험가', p.stranded);
}

// ── 3. 봇 매니저로 챕터 달력 ─────────────────────────────────
// 욕심쟁이 매니저: 가능한 행동을 전부 가상으로 해보고 점수가 가장 오르는 것을 고른다.
function score(w) {
  const lv = M.levelsOf(w);
  const gapN = M.gapSegments(w, lv).reduce((s, g) => s + g[1] - g[0] + 1, 0);
  const growth = w.monsters.filter(m => m.d).reduce((s, m) => s + M.monLevel(m), 0);
  const top = Math.max(0, ...Object.values(lv).map(D => D + 5));
  return -100 * gapN + 0.5 * growth + Math.min(top, M.roadEnd(w) + 15) - w.monsters.length * 3;
}
function tryAct(w, fn) { const c = JSON.parse(JSON.stringify(w)); const r = fn(c); return r && r.ok !== false ? c : null; }
function checkIn(w, maxActs) {
  let acts = 0;
  if (w.approvalReady) { M.approve(w); acts++; }
  for (let k = 0; k < maxActs; k++) {
    const base = score(w);
    let best = null;
    const consider = (label, fn) => { const c = tryAct(w, fn); if (!c) return; const s = score(c); if (s > base + 0.5 && (!best || s > best.s)) best = { s, c, label }; };
    for (const m of w.monsters) if (M.canEvolve(m)) consider('evolve', c => M.evolve(c, m.id));
    for (const m of w.monsters) for (const id in w.plots) if (m.d !== id) consider('move', c => M.place(c, m.id, id));
    for (const sp in M.SPECIES) for (const id in w.plots) consider('hire', c => { const h = M.hire(c, sp); return h.ok ? M.place(c, h.mon.id, id) : h; });
    // 진화 후 바로 채용으로 메우는 두 수 조합
    for (const m of w.monsters) if (M.canEvolve(m)) {
      for (const sp in M.SPECIES) for (const id in w.plots)
        consider('evolve+hire', c => { if (!M.evolve(c, m.id).ok) return { ok: false }; const h = M.hire(c, sp); return h.ok ? M.place(c, h.mon.id, id) : h; });
      for (const o of w.monsters) for (const id in w.plots) if (o.d !== id)
        consider('evolve+move', c => { if (!M.evolve(c, m.id).ok) return { ok: false }; return M.place(c, o.id, id); });
    }
    if (!best) break;
    Object.assign(w, best.c); acts++;
  }
  // 자리 확장도 행동 한 번으로 센다 (체크인당 행동 수 제한 안에서)
  for (const b of M.badges(w)) if (acts < maxActs && b.kind === 'busy' && b.n >= 2) { if (M.seatUp(w, b.d).ok) acts++; }
  if (M.happyCount(w) < M.chapterInfo(w).happy) for (const id in w.dungeons) { const d = w.dungeons[id]; if (acts < maxActs && M.levelsOf(w)[id] && d.seats < 12 && M.seatUp(w, id).ok) acts++; }
  return acts;
}
function runBot(label, times, maxActs) {
  const w2 = M.createWorld(7);
  M.advance(w2, 4);
  { const h = M.hire(w2, 'mush'); M.place(w2, h.mon.id, 'h2'); }
  M.advance(w2, 4);
  const got = {};
  let actsTotal = 0, checkins = 0;
  for (let d = 0; d < 24 && !got.c2; d++) {
    for (const hh of times) {
      const target = d * 1440 + 1440 + hh - START; // D2 아침부터
      if (target > w2.t) M.advance(w2, target - w2.t);
      const a = checkIn(w2, maxActs); actsTotal += a; checkins++;
      if (w2.chapter >= 2 && !got.c1) got.c1 = day(w2.t);
      if (w2.chapter >= 3 && !got.c2) got.c2 = day(w2.t);
      if (w2.chapter >= 4 && !got.c3) { got.c3 = day(w2.t); break; }
    }
  }
  console.log(`
── 봇 매니저: ${label} ──`);
  console.log('1장 결재', got.c1 || '미달', '(목표 D2~4)', '| 2장', got.c2 || '미달', '(목표 D5~11)');
  console.log('체크인당 행동', (actsTotal / checkins).toFixed(1), '| 최종 즐기는', M.happyCount(w2), '스마일', Math.round(w2.smile));
}
runBot('표준 매니저 (하루 3회, 체크인당 3수)', [9 * 60, 13 * 60, 21 * 60], 3);
runBot('가벼운 매니저 (하루 2회, 체크인당 2수)', [9 * 60, 21 * 60], 2);
