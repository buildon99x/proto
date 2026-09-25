/*
 * 페이싱 점검 — 문서가 약속한 시각이 규칙으로 실제로 나오는지 확인한다.
 *   pnpm --filter msw-inc pacing            (게임 규칙 v1.3)
 *   pnpm --filter msw-inc pacing -- v1.1    (컨셉 v1.1 규칙으로 다시 굴린다)
 *
 * 1) 첫 10분 대본: 첫 레벨업, Lv 8 빈틈, 승진 발령, 1장 결재 도장 (v1.1은 고참 진화까지)
 * 2) Day 2 첫 출근: 10시간 뒤 리포트에 무엇이 들어오는가
 * 3) 챕터 달력: 표준·가벼운 매니저 봇으로 1~5장 결재 날짜
 */
import * as S from '../sim';
import { useRules, V11, V14 } from '../rules';
import { PERSONAS, runPersona, dayLabel, firstSession, realMinutes } from '../bots';

const legacy = process.argv.includes('v1.1');
useRules(legacy ? V11 : V14);
const fmt = (m: number) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;

console.log(`규칙 ${legacy ? 'v1.1 (컨셉)' : 'v1.4 (게임)'}\n`);

// ── 1. 첫 10분 ──────────────────────────────────────────────
const w = S.createWorld(20260924);
if (legacy) legacyFirst(); else loopFirst();

/** v1.3 첫 10분 한 바퀴: 봇 대본(bots.firstSession)의 사건 시각. 실제 시각은 튜토리얼 "가로 = 레벨" 배속(×3)을 되돌려 잰 추정이다 */
function loopFirst() {
  const notes: { t: number; k: string; l: string }[] = [];
  firstSession(w, (k, l) => notes.push({ t: w.t, k, l }));
  const gap = notes.find(x => x.k === 'stuck');
  const real = (t: number) => realMinutes(t, gap ? gap.t : null);
  console.log(`── 입사 첫 세션 (봇 대본 · ${V14.buffMin ? '입사 첫날 버프' : '첫 파티 대본, 배속 없음'}) ── 월드 시각 / 실제 시각(추정)`);
  const want: Record<string, string> = { levelup: '0:25', stuck: '1:30 안', promote: '', stamp: '10:00 안 (화면 실측은 playreview:ui)' };
  for (const x of notes) console.log(x.l.padEnd(28), fmt(x.t).padStart(6), '/', fmt(real(x.t)).padStart(6), want[x.k] ? `(목표 ${want[x.k]})` : '');
  console.log('세션 끝  즐기는', S.happyCount(w), '/ 모험가', w.advs.length, '/ 스마일', Math.round(w.smile), '/ 장', w.chapter, '/ 빈틈', JSON.stringify(S.gapSegments(w)), '/ 남은 무료권', JSON.stringify(w.tickets));
}
function legacyFirst() {
const w = S.createWorld(20260924);
  const marks: Record<string, unknown> = {};
  let placed = false, evolved = false;
  let firstLv: number | null = null, firstGap: { t: number; lv: number } | null = null, vetReady: number | null = null;
  for (let i = 0; i < 12 * 8; i++) {
    const ev: S.SimEvent[] = [];
    S.step(w, 1 / 12, ev);
    for (const e of ev) {
      if (e.type === 'levelup' && firstLv == null) firstLv = w.t;
      if (e.type === 'stuck' && !firstGap) firstGap = { t: w.t, lv: e.lv };
      if (e.type === 'ready' && vetReady == null) vetReady = w.t;
    }
    if (firstGap && !placed && w.t >= firstGap.t + 0.5) {
      const h = S.hire(w, 'mush');
      if (h.ok) S.place(w, h.mon.id, 'h2');
      placed = true;
      marks.gapAfterPlace = S.gapSegments(w).map(s => s.join('–')).join(', ') || '없음';
    }
    if (w.t >= 5 && !marks.event) marks.event = S.startEvent(w, 'h1', 'exp');
    const vet = w.monsters.find(m => m.vet);
    if (vet && w.t >= 6.5 && !evolved) {
      if (!S.canEvolve(vet)) { marks.forced = true; vet.tenure = S.evolveNeed(vet); }
      marks.pv = S.preview(w, { evolve: vet.id });
      S.evolve(w, vet.id); evolved = true;
    }
  }
  const pv = marks.pv as S.Preview;
  console.log('── 입사 첫 세션 8분 (입사 첫날 버프) ──');
  console.log('첫 레벨업           ', firstLv != null ? fmt(firstLv) : '없음', '(대본 0:25)');
  console.log('첫 빈틈 (갈 곳 없음)', firstGap ? `${fmt(firstGap.t)} Lv ${firstGap.lv}` : '없음', '(대본 3:25, Lv 8)');
  console.log('주황버섯 배치 후 빈틈', marks.gapAfterPlace);
  console.log('고참 진화 가능      ', vetReady != null ? fmt(vetReady) : '없음', marks.forced ? '(튜토리얼이 보정)' : '(6:30 전에 준비됨)');
  console.log('진화 미리보기 잃는 구간', JSON.stringify(pv.lost), '레벨', JSON.stringify(pv.after));
  console.log('8분 퇴근 시점  즐기는', S.happyCount(w), '/ 모험가', w.advs.length, '/ 스마일', Math.round(w.smile), '/ 빈틈', JSON.stringify(S.gapSegments(w)));
}

// ── 2. Day 2 첫 출근 ────────────────────────────────────────
const L = S.ledgerStart(w);
S.advance(w, 10 * 60, L);
const r = S.ledgerReport(L, w);
console.log(`\n── 10시간 뒤 첫 출근 리포트 (${dayLabel(w.t)}) ──`);
console.log('즐기는 모험가', r.happy, `(퇴근 순간 대비 ${r.happyDelta >= 0 ? '+' : ''}${r.happyDelta})`, '/ 레벨업', r.levelups, '/ 스마일 +', r.smile);
console.log('진화 가능', r.ready.map(id => { const m = w.monsters.find(x => x.id === id)!; return S.monName(m) + '#' + m.no; }).join(', ') || '없음');
console.log('밤사이 퇴근왕', r.king ? `${S.monName(w.monsters.find(x => x.id === r.king!.id)!)} ${r.king.n}회` : '-');
console.log('빈틈', JSON.stringify(S.gapSegments(w)), '떠남', JSON.stringify(w.stats.left));
const snail = S.monsIn(w, 'h1').find(m => m.stage === 0);
if (snail && S.canEvolve(snail)) {
  const p2 = S.preview(w, { evolve: snail.id });
  console.log('남은 달팽이 진화 미리보기: 들판', p2.before.h1, '→', p2.after.h1, ' 잃는 구간', JSON.stringify(p2.lost), ' 갈 곳 잃는 모험가', p2.stranded);
}

// ── 3. 챕터 달력 ────────────────────────────────────────────
for (const id of ['std', 'light']) {
  const p = PERSONAS.find(x => x.id === id)!;
  const res = runPersona(p, 7, 70);
  console.log(`\n── 봇 매니저: ${p.label} ──`);
  console.log(res.chapters.map((t, i) => `${i + 1}장 ${dayLabel(t)}`).join(' | '));
  console.log('체크인당 행동', (res.acts / res.checkins).toFixed(1), '| 최종 즐기는', res.happyEnd, '| 스마일', res.smileEnd, '| 스마일 최고', Math.round(res.smilePeak));
}
