/*
 * 플레이 리뷰 계측 — 입사부터 엔딩까지 한 판을 체크인 단위로 기록한다.
 *   pnpm --filter msw-inc playreview                    (표준·가벼운·진화 즉시·퇴근 직전, 시드 0)
 *   pnpm --filter msw-inc playreview -- --out <file>    (기본 notes/data/playreview.json)
 *   pnpm --filter msw-inc playreview -- --rules v1.2|v1.3|v1.6    (옛 규칙으로 기준 측정)
 *
 * 봇은 bots.ts의 "오렌 따라하기" 그대로다. 게임 규칙에 훅을 심지 않고 체크인 전후의 월드를 비교한다.
 * 결과는 notes/play-review/index.html(플레이 리뷰 보고서)이 읽는다. 해석은 그 보고서에 적는다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PERSONAS, checkIn, firstSession, dayNum, realMinutes, type Persona } from '../bots';
import * as S from '../sim';
import { SPECIES, CHAPTERS } from '../content';
import { RULES, useRules, V12, V13, V16 } from '../rules';

const args = process.argv.slice(2);
// --rules v1.2·v1.3·v1.6: 옛 규칙으로 기준 측정을 다시 만든다. 기본은 게임 규칙(v1.7)
if (args.includes('--rules')) { const id = args[args.indexOf('--rules') + 1]; useRules(id === 'v1.2' ? V12 : id === 'v1.3' ? V13 : V16); }
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.resolve(import.meta.dirname, '../../../../notes/data/playreview.json');
const START = 21 * 60;
const MAX_DAYS = 60;

interface Checkin {
  i: number; t: number; day: number; hh: number; ch: number; persona: string;
  away: { min: number; levelups: number; grads: number; smile: number; happy: number; happyDelta: number; ready: number; entranceMin: number; walkMin: number; busyLeft: number; newDex: string[]; approval: boolean; marks: number[]; elites: number; bossCall: number | null; bossDown: number[] };
  before: { gapN: number; gaps: S.Seg[]; entrance: boolean; walkers: number; busy: number; badges: { gap: number; busy: number; evolve: number; shown: number }; smile: number; joy: number; joyGoal: number; tray: number; open: number; staff: number; dex: number; happy: number };
  acts: string[];
  after: { gapN: number; entrance: boolean; happy: number; smile: number; dex: number; ch: number };
  etaDays: number | null;
}
interface Hour { t: number; day: number; ch: number; happy: number; walkers: number; busy: number; advs: number; smile: number; joyPct: number; gapN: number; entrance: boolean; dex: number; staff: number; open: number }
interface Milestone { t: number; day: number; kind: string; label: string }

function snapshot(w: S.World) {
  const segs = S.gapSegments(w);
  const b = S.badges(w);
  let walkers = 0, busy = 0;
  for (const a of w.advs) { if (a.st === 'search') walkers++; else if (a.st === 'busy') busy++; }
  const c = S.approvalConds(w);
  return {
    gapN: S.gapSize(segs), gaps: segs, entrance: segs.some(g => g[0] === 1), walkers, busy,
    badges: { gap: b.filter(x => x.kind === 'gap').length, busy: b.filter(x => x.kind === 'busy').length, evolve: b.filter(x => x.kind === 'evolve').length, shown: b.filter(x => x.kind === 'evolve' && x.shown).length },
    smile: Math.round(w.smile), joy: Math.round(c.joy), joyGoal: c.joyGoal, tray: S.tray(w).length,
    open: Object.values(w.plots).filter(p => p.open).length, staff: w.monsters.filter(m => m.d).length, dex: S.dexCount(w), happy: S.happyCount(w),
  };
}

function run(p: Persona, seed = 0) {
  const w = S.createWorld(seed);
  const hours: Hour[] = [];
  const miles: Milestone[] = [];
  const checkins: Checkin[] = [];
  const dexSeen = new Set<string>();
  const mile = (kind: string, label: string) => miles.push({ t: w.t, day: +dayNum(w.t)!.toFixed(3), kind, label });

  // ── 입사 첫 세션: 봇 대본(bots.firstSession, 튜토리얼 순서)의 사건. sec = 월드 초, real = 실제 초(추정, "가로 = 레벨" ×3 배속을 되돌림) ──
  const first: { sec: number; real: number; kind: string; label: string }[] = [];
  {
    const raw: { t: number; kind: string; label: string }[] = [];
    firstSession(w, (kind, label) => {
      raw.push({ t: w.t, kind, label });
      if (kind === 'stamp') mile('chapter', `1장 결재 → ${CHAPTERS[1].region} 개방 (첫 세션)`);
      if (kind === 'elite') mile('elite', '엘리트 첫 출현 (첫 세션)');
    });
    const gap = raw.find(x => x.kind === 'stuck');
    for (const x of raw) first.push({ sec: Math.round(x.t * 60), real: Math.round(realMinutes(x.t, gap ? gap.t : null) * 60), kind: x.kind, label: x.label });
    first.push({ sec: Math.round(w.t * 60), real: Math.round(realMinutes(w.t, gap ? gap.t : null) * 60), kind: 'off', label: '퇴근 (첫 세션 끝)' });
  }
  for (const k of Object.keys(w.dex)) dexSeen.add(k);
  const firstEnd = { ...snapshot(w) };

  let L = S.ledgerStart(w);
  let walkMin = 0, busyLeft0 = w.stats.left.busy;
  let idx = 0;
  const pushHour = () => {
    const s = snapshot(w);
    hours.push({ t: w.t, day: +dayNum(w.t)!.toFixed(3), ch: w.chapter, happy: s.happy, walkers: s.walkers, busy: s.busy, advs: w.advs.length, smile: s.smile, joyPct: s.joyGoal ? Math.min(1, s.joy / s.joyGoal) : 0, gapN: s.gapN, entrance: s.entrance, dex: s.dex, staff: s.staff, open: s.open });
  };
  let lastGrad = w.stats.grads;
  for (let d = 0; d < MAX_DAYS && !w.ended; d++) {
    for (let i = 0; i < p.times.length && !w.ended; i++) {
      const target = d * 1440 + 1440 + p.times[i] - START;
      while (w.t < target - 0.5) {
        const ev: S.SimEvent[] = [];
        S.step(w, 1, ev);
        S.ledgerAdd(L, w, ev);
        for (const a of w.advs) if (a.st === 'search') { walkMin++; break; }
        for (const e of ev) {
          if (e.type === 'approval') mile('ready', `${w.chapter}장 결재 조건 충족`);
          if (e.type === 'elite') mile('elite', `엘리트 · ${e.d}`);
          if (e.type === 'bossCall') mile('bossCall', `${e.ch}장 필드 보스 방문`);
          if (e.type === 'bossDown') mile('bossDown', `${e.ch}장 필드 보스 토벌`);
        }
        if (w.stats.grads > 0 && lastGrad === 0) mile('grad', '첫 졸업');
        lastGrad = w.stats.grads;
        if (Math.floor(w.t) % 60 === 0) pushHour();
      }
      const rep = S.ledgerReport(L, w);
      const newDex = Object.keys(w.dex).filter(k => !dexSeen.has(k));
      newDex.forEach(k => dexSeen.add(k));
      const before = snapshot(w);
      const ch0 = w.chapter;
      const log = checkIn(w, p, { last: i === p.times.length - 1, first: i === 0 });
      const after = snapshot(w);
      // 체크인 중 새로 본 도감 (진화)
      const dexNow = Object.keys(w.dex).filter(k => !dexSeen.has(k));
      dexNow.forEach(k => { dexSeen.add(k); const [sp, st] = k.split(':'); mile('dex', `${SPECIES[sp as keyof typeof SPECIES].names[+st]}`); });
      if (w.chapter > ch0) mile('chapter', `${ch0}장 결재 → ${CHAPTERS[w.chapter - 1].region} 개방`);
      if (w.ended) mile('ending', '엔딩');
      const c = S.approvalConds(w);
      const perH = S.happyCount(w);
      const etaDays = c.joyGoal && perH > 0 && !w.ended ? Math.max(0, (c.joyGoal - c.joy) / perH / 24) : null;
      checkins.push({
        i: idx++, t: w.t, day: +dayNum(w.t)!.toFixed(3), hh: Math.round(((w.t + START) % 1440) / 60), ch: ch0, persona: p.id,
        away: { min: Math.round(rep.minutes), levelups: rep.levelups, grads: rep.grads, smile: rep.smile, happy: rep.happy, happyDelta: rep.happyDelta, ready: rep.ready.length, entranceMin: rep.entranceMin, walkMin, busyLeft: w.stats.left.busy - busyLeft0, newDex, approval: rep.approval, marks: rep.marks.map(m => m.pct), elites: rep.elites.length, bossCall: rep.bossCall, bossDown: rep.bossDown.map(b => b.ch) },
        before: { ...before },
        acts: log.acts,
        after: { gapN: after.gapN, entrance: after.entrance, happy: after.happy, smile: after.smile, dex: after.dex, ch: w.chapter },
        etaDays: etaDays == null ? null : +etaDays.toFixed(2),
      });
      L = S.ledgerStart(w); walkMin = 0; busyLeft0 = w.stats.left.busy;
    }
  }
  return { persona: p.id, label: p.label, times: p.times, first, firstEnd, checkins, hours, miles, endDay: w.ended ? +dayNum(w.endedAt)!.toFixed(2) : null, stats: w.stats, dex: S.dexCount(w) };
}

const ids = ['std', 'light', 'hasty', 'night'];
const runs = ids.map(id => run(PERSONAS.find(p => p.id === id)!));
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generated: 'pnpm --filter msw-inc playreview', rules: RULES.id, runs }));
for (const r of runs) {
  const acts = r.checkins.reduce((s, c) => s + c.acts.length, 0);
  const idle = r.checkins.filter(c => c.acts.length === 0).length;
  console.log(`${r.persona.padEnd(6)} 엔딩 D${r.endDay} · 체크인 ${r.checkins.length} · 행동 ${acts} · 빈 체크인 ${idle} (${Math.round(idle / r.checkins.length * 100)}%) · 도감 ${r.dex}`);
}
console.log('→', OUT);
