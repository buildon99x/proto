/*
 * 플레이 리뷰 계측 — 입사부터 엔딩까지 한 판을 체크인 단위로 기록한다.
 *   pnpm --filter msw-inc playreview                    (표준·가벼운·진화 즉시·퇴근 직전, 시드 0)
 *   pnpm --filter msw-inc playreview -- --out <file>    (기본 notes/data/playreview.json)
 *
 * 봇은 bots.ts의 "오렌 따라하기" 그대로다. 게임 규칙에 훅을 심지 않고 체크인 전후의 월드를 비교한다.
 * 결과는 notes/play-review/index.html(플레이 리뷰 보고서)이 읽는다. 해석은 그 보고서에 적는다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PERSONAS, checkIn, firstSession, dayNum, type Persona } from '../bots';
import * as S from '../sim';
import { SPECIES, CHAPTERS } from '../content';

const args = process.argv.slice(2);
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.resolve(import.meta.dirname, '../../../../notes/data/playreview.json');
const START = 21 * 60;
const MAX_DAYS = 60;

interface Checkin {
  i: number; t: number; day: number; hh: number; ch: number; persona: string;
  away: { min: number; levelups: number; grads: number; smile: number; happy: number; happyDelta: number; ready: number; entranceMin: number; walkMin: number; busyLeft: number; newDex: string[]; approval: boolean };
  before: { gapN: number; gaps: S.Seg[]; entrance: boolean; walkers: number; busy: number; badges: { gap: number; busy: number; evolve: number }; smile: number; joy: number; joyGoal: number; tray: number; open: number; staff: number; dex: number; happy: number };
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
    badges: { gap: b.filter(x => x.kind === 'gap').length, busy: b.filter(x => x.kind === 'busy').length, evolve: b.filter(x => x.kind === 'evolve').length },
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

  // ── 입사 첫 세션: 1초(=월드 1/60분) 해상도로 첫 사건들을 적는다 ──
  const first: { sec: number; kind: string; label: string }[] = [];
  {
    const once = new Set<string>();
    const note = (kind: string, label: string) => { if (!once.has(kind)) { once.add(kind); first.push({ sec: Math.round(w.t * 60), kind, label }); } };
    let placed = false;
    for (let i = 0; i < 12 * 8; i++) {
      const ev: S.SimEvent[] = [];
      S.step(w, 1 / 12, ev);
      for (const e of ev) {
        if (e.type === 'arrive') note('arrive', '첫 모험가 입장');
        if (e.type === 'levelup') note('levelup', `첫 레벨업 (Lv ${e.lv})`);
        if (e.type === 'stuck') note('stuck', `첫 빈틈 — Lv ${e.lv} 모험가가 갈 곳이 없다`);
        if (e.type === 'ready') note('ready', '고참 달팽이 진화 준비');
        if (e.type === 'grad') note('grad', '첫 졸업');
      }
      if (!placed && w.advs.some(a => a.st === 'search')) {
        const h = S.hire(w, 'mush');
        if (h.ok) S.place(w, h.mon.id, 'h2');
        placed = true; note('hire', '주황버섯 채용 → 사냥터 배치');
      }
      if (w.t >= 5 && w.tut.freeEvent) { S.startEvent(w, 'h1', 'exp'); note('event', '경험치 2배 (첫 번 무료)'); }
      const v = w.monsters.find(m => m.vet);
      if (v && v.stage === 0 && w.t >= 6.5) { v.tenure = Math.max(v.tenure, S.evolveNeed(v)); S.evolve(w, v.id); note('evolve', '고참 달팽이 → 파란 달팽이'); }
    }
    first.push({ sec: Math.round(w.t * 60), kind: 'off', label: '퇴근 (첫 세션 끝)' });
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
        for (const e of ev) if (e.type === 'approval') mile('ready', `${w.chapter}장 결재 조건 충족`);
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
        away: { min: Math.round(rep.minutes), levelups: rep.levelups, grads: rep.grads, smile: rep.smile, happy: rep.happy, happyDelta: rep.happyDelta, ready: rep.ready.length, entranceMin: rep.entranceMin, walkMin, busyLeft: w.stats.left.busy - busyLeft0, newDex, approval: rep.approval },
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
writeFileSync(OUT, JSON.stringify({ generated: 'pnpm --filter msw-inc playreview', rules: 'v1.2', runs }));
for (const r of runs) {
  const acts = r.checkins.reduce((s, c) => s + c.acts.length, 0);
  const idle = r.checkins.filter(c => c.acts.length === 0).length;
  console.log(`${r.persona.padEnd(6)} 엔딩 D${r.endDay} · 체크인 ${r.checkins.length} · 행동 ${acts} · 빈 체크인 ${idle} (${Math.round(idle / r.checkins.length * 100)}%) · 도감 ${r.dex}`);
}
console.log('→', OUT);
