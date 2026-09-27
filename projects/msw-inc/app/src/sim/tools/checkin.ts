/*
 * 체크인 점검 — Day 2~30 동안 "하루 몇 번, 10분씩" 들어오는 체크인이 어떤 경험인가 (규칙 v1.7, G3).
 *   pnpm --filter msw-inc checkin                              (게임 규칙 · 표준·가벼운·열성·퇴근 직전 · 시드 5)
 *   pnpm --filter msw-inc checkin -- --rules v1.6 --only std --days 30 --json out.json
 *   pnpm --filter msw-inc checkin -- --step 1 --once            (audit와 같은 1분 걸음, 체크인 시작에만 결정)
 *
 * 주의: 월드는 걸음 크기에 따라 조금 다르게 흐른다. 표준 봇 엔딩이 1분 걸음이면 D29.8(audit와 같다), 5초 걸음이면 D31.4다.
 * 화면이 켜져 있는 동안은 5초보다 작은 걸음이므로, 지켜보는 플레이어의 달력은 audit보다 조금 늦다(plan-v17 §2).
 *
 * 체크인 하나 = 출근(리포트) → 오렌 따라 결정(성향의 수 제한, bots.checkIn) → 10분 지켜보기 → 퇴근.
 * 지켜보는 10분 동안 새 결정거리(C층: 빈틈·붐빔·진화 준비·상자·보스·결재·모객)가 생기면 5분 뒤에 한 번 더 둔다(같은 수 제한).
 * 사건 층의 정의는 tools/moments.ts(cadence와 같은 잣대). 시간은 월드 분 = 실제 분(배속이 없다).
 *
 * 재는 것 (체크인마다):
 *   결정  = 둔 수. 상자 열기(탭)·진화 뒤 메우기(fix:)·되돌리기는 빼고 센다. 상자는 따로 센다
 *   감탄  = 출근 리포트의 명장면(결재·눈금·엘리트·보스·첫 졸업·기다리는 상자·돌아온 손님)과 10분 안의 사건(뚫림·구간·상자·엘리트·보스·눈금·결재·졸업·복귀·진화). 레벨업은 뺀다
 *   이벤트만 = 둔 수가 있는데 전부 이벤트(event · event-free · recruit)뿐인 체크인
 *   사건 사이 = 10분 안 A∪C 사건 간격의 중앙값(초)
 *   같은 수 반복 = 둔 수의 갈래 집합이 직전 체크인과 같은 연속 횟수
 *   새 결정 종류 = 그 장에서 처음 둔 수의 종류(가족이 아니라 종류: seat · split · promote …)
 * 합격선(제안, plan-v17 §2에서 확정): 결정 중앙 ≥ 2 · 감탄 있는 체크인 ≥ 90% · 이벤트만 ≤ 10% · 사건 사이 중앙 ≤ 30초 · 같은 수 반복 연속 ≤ 3 · 장마다 새 결정 종류 ≥ 1
 */
import { writeFileSync } from 'node:fs';
import * as S from '../sim';
import { useRules, V13, V14, V15, V16, RULES, GUESTS_V17, type Rules } from '../rules';
import { PERSONAS, firstSession, checkIn, type Persona } from '../bots';
import { makeWatcher, gapStats, famOf, WOW_KINDS, med, type Moment } from './moments';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const BY_ID: Record<string, Rules> = { 'v1.3': V13, 'v1.4': V14, 'v1.5': V15, 'v1.6': V16 };
if (arg('--rules')) useRules({ ...(BY_ID[arg('--rules')!] || RULES) });
// --patch '{"dexMile":{"at":[0.5],"event":2,"recruit":1}}' (1.10.0): 규칙 필드 일부를 덮는다 (갈래 실험)
if (arg('--patch')) useRules({ ...RULES, ...JSON.parse(arg('--patch')!) });
// --order before|after (1.10.0 실험): 오렌·봇 순서에서 모객을 진화 앞에 둘지
if (arg('--order') && RULES.guests) useRules({ ...RULES, guests: { ...(RULES.guests || GUESTS_V17), order: arg('--order') === 'before' ? 'before' : 'after' } });
const SEEDS = arg('--seed') ? [+arg('--seed')!] : [7, 11, 23, 42, 99];
const DAYS = +(arg('--days') || 30);
const ONLY = (arg('--only') || 'std,light,heavy,night').split(',');
const START = 21 * 60;
const WINDOW = 10; // 체크인 길이 (분)
/** 지켜보는 동안의 걸음(분). 기본 5초 = 화면이 켜져 있을 때와 같다. --step 1이면 audit와 같은 1분 걸음 */
const STEP = arg('--step') ? +arg('--step')! : 1 / 12;
/** --once: 5분에 한 번 더 두지 않는다 (체크인 시작에만 결정) */
const ONCE = args.includes('--once');

export interface CheckinRow {
  day: number; ch: number; hh: number;
  dec: number; boxes: number; acts: string[]; fams: string[]; kinds: string[];
  wow: string[]; wowReport: string[]; onlyEvent: boolean;
  gapMed: number; gapMax: number; moments: number;
  /** 같은 갈래 집합이 직전 체크인과 같으면 +1 */
  repeat: number;
  newKinds: string[];
}
export interface CheckinRun { persona: string; seed: number; rows: CheckinRow[]; endDay: number | null }

const DEC_SKIP = /^(fix:|box:|undo|night-evolve|welcome)/;
const EVENT_ONLY = /^(event|event-free|recruit)/;

export function runCheckin(p: Persona, seed: number, days = DAYS): CheckinRun {
  const w = S.createWorld(seed);
  firstSession(w);
  const rows: CheckinRow[] = [];
  let L = S.ledgerStart(w);
  let prevFams = '', repeat = 0;
  const seenKinds = new Map<number, Set<string>>();
  const seenAll = new Set<string>();
  for (let d = 0; d < days && !w.ended; d++) {
    for (const [i, hh] of p.times.entries()) {
      if (w.ended) break;
      const jit = seed ? (hash(seed, d, i) % 181) - 90 : 0;
      const target = d * 1440 + 1440 + hh + jit - START;
      while (w.t < target - 0.5) { const ev: S.SimEvent[] = []; S.step(w, 1, ev); S.ledgerAdd(L, w, ev); }
      // 출근 리포트의 명장면 = 떠나 있던 동안의 감탄
      const rep = S.ledgerReport(L, w);
      const wowReport: string[] = [];
      if (rep.approval) wowReport.push('approval');
      if (rep.marks.length) wowReport.push('mark');
      if (rep.elites.length) wowReport.push('elite');
      if (rep.bossDown.length) wowReport.push('bossDown'); else if (rep.bossCall) wowReport.push('boss');
      if (rep.firstGrad) wowReport.push('grad');
      if (rep.boxesWaiting) wowReport.push('box');
      if (rep.returned) wowReport.push('return');
      S.recordReport(w, rep);
      // 결정 → 10분 지켜보기 (새 결정거리가 생기면 5분에 한 번 더)
      const t0 = w.t, eye = makeWatcher(w);
      const acts: string[] = [];
      const doActs = (log: string[]) => { for (const a of log) { acts.push(a); if (!DEC_SKIP.test(a)) eye.act(a.split(':')[0], (w.t - t0) * 60); } eye.settle(); };
      doActs(checkIn(w, p, { last: i === p.times.length - 1, first: i === 0, awayMin: rep.minutes }).acts);
      let second = false, cAt = eye.moments.length;
      while (w.t < t0 + WINDOW - 1e-9) {
        const ev: S.SimEvent[] = [];
        S.step(w, STEP, ev);
        S.ledgerAdd(L, w, ev);
        eye.tap(ev, (w.t - t0) * 60);
        if (!second && w.t >= t0 + WINDOW / 2 - 1e-9) {
          second = true;
          if (!ONCE && eye.moments.slice(cAt).some(m => m.layer === "C" && !m.kind.startsWith("act:"))) doActs(checkIn(w, p, { last: i === p.times.length - 1 }).acts);
        }
      }
      void cAt;
      const decs = acts.filter(a => !DEC_SKIP.test(a));
      const kinds = [...new Set(decs.map(a => a.split(':')[0]))];
      const fams = [...new Set(decs.map(a => famOf('act:' + a)))].sort();
      const famKey = fams.join('|');
      repeat = decs.length && famKey === prevFams ? repeat + 1 : 0;
      prevFams = decs.length ? famKey : prevFams;
      const wow = [...new Set(eye.moments.filter(m => WOW_KINDS.has(m.kind)).map(m => m.kind.replace('act:', '')))];
      const ms: Moment[] = eye.moments;
      const g = gapStats(ms.map(m => m.s), 0, WINDOW * 60);
      const ch = rows.length ? w.chapter : w.chapter;
      const seen = seenKinds.get(ch) || new Set<string>();
      const newKinds = kinds.filter(k => !seenAll.has(k));
      for (const k of kinds) { seen.add(k); seenAll.add(k); }
      seenKinds.set(ch, seen);
      rows.push({
        day: +(((t0 + START) / 1440) + 1).toFixed(2), ch, hh: Math.round(((t0 + START) % 1440) / 60),
        dec: decs.length, boxes: acts.filter(a => a.startsWith('box:')).length, acts, fams, kinds,
        wow, wowReport, onlyEvent: decs.length > 0 && decs.every(a => EVENT_ONLY.test(a)),
        gapMed: g.med, gapMax: g.max, moments: ms.length, repeat, newKinds,
      });
      L = S.ledgerStart(w);
    }
  }
  return { persona: p.id, seed, rows, endDay: w.ended && w.endedAt != null ? +(((w.endedAt + START) / 1440) + 1).toFixed(1) : null };
}
function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export interface Summary {
  persona: string; n: number;
  decByCh: Record<number, number>; dec: number; wowRate: number; wowStrictRate: number; onlyEvent: number; gapMed: number; gapP90: number;
  repeatMax: Record<number, number>; newKinds: Record<number, string[]>; boxes: number; endDay: number | null;
}
/** 시드별 값을 합쳐 성향 하나의 요약. 비율은 체크인 전체(시드 합)에서, 중앙값은 시드 합 체크인의 중앙값 */
export function summarize(runs: CheckinRun[]): Summary {
  const rows = runs.flatMap(r => r.rows);
  const byCh = (f: (r: CheckinRow) => number) => Object.fromEntries([2, 3, 4, 5].map(c => [c, med(rows.filter(r => r.ch === c).map(f))]));
  const repeatMax: Record<number, number> = {};
  for (const c of [2, 3, 4, 5]) repeatMax[c] = Math.max(0, ...rows.filter(r => r.ch === c).map(r => r.repeat));
  const newKinds: Record<number, string[]> = {};
  for (const c of [2, 3, 4, 5]) newKinds[c] = [...new Set(rows.filter(r => r.ch === c).flatMap(r => r.newKinds))];
  const wow = (r: CheckinRow) => r.wow.length + r.wowReport.length > 0;
  const gaps = rows.map(r => r.gapMed).sort((a, b) => a - b);
  return {
    persona: runs[0].persona, n: rows.length,
    decByCh: byCh(r => r.dec), dec: med(rows.map(r => r.dec)),
    wowRate: rows.filter(wow).length / Math.max(1, rows.length),
    wowStrictRate: rows.filter(r => r.wow.length > 0).length / Math.max(1, rows.length),
    onlyEvent: rows.filter(r => r.onlyEvent).length / Math.max(1, rows.length),
    gapMed: med(gaps), gapP90: gaps[Math.floor(gaps.length * 0.9)] ?? 0,
    repeatMax, newKinds, boxes: rows.reduce((s, r) => s + r.boxes, 0) / Math.max(1, rows.length),
    endDay: med(runs.map(r => r.endDay ?? 99)),
  };
}

export const LINE = { dec: 2, wowRate: 0.9, onlyEvent: 0.1, gapMed: 30, repeatMax: 3, newKinds: 1 };
export function pass(s: Summary): boolean {
  return s.dec >= LINE.dec && s.wowRate >= LINE.wowRate && s.onlyEvent <= LINE.onlyEvent && s.gapMed <= LINE.gapMed
    && [3, 4].every(c => s.repeatMax[c] <= LINE.repeatMax) && [3, 4].every(c => s.newKinds[c].length >= LINE.newKinds);
}

if (process.argv[1] && /checkin\.ts$/.test(process.argv[1])) main();

function main() {
  console.log(`규칙 ${RULES.id} · 시드 ${SEEDS.join(',')} · Day 2~${DAYS + 1} · 체크인 ${WINDOW}분 (결정 → 지켜보기, 새 결정거리가 생기면 5분에 한 번 더)\n`);
  const out: Record<string, { summary: Summary; runs: CheckinRun[] }> = {};
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  console.log('성향     체크인  결정/체크인 중앙 (2장·3장·4장·5장 | 전체)  감탄 있는 체크인(리포트 포함 | 10분 안)  이벤트만  사건 사이 중앙·p90  상자/체크인  엔딩');
  for (const id of ONLY) {
    const p = PERSONAS.find(x => x.id === id);
    if (!p) continue;
    const runs = SEEDS.map(s => runCheckin(p, s));
    const s = summarize(runs);
    out[id] = { summary: s, runs };
    console.log(id.padEnd(8), String(s.n).padStart(5), '  ', [2, 3, 4, 5].map(c => String(s.decByCh[c] ?? '—').padStart(3)).join('  '), ' |', String(s.dec).padStart(3), '      ',
      `${pct(s.wowRate)} | ${pct(s.wowStrictRate)}`.padStart(11), '          ', pct(s.onlyEvent).padStart(4), '   ', `${s.gapMed.toFixed(0)}초 · ${s.gapP90.toFixed(0)}초`.padStart(12), '  ', s.boxes.toFixed(1).padStart(5), '   ', s.endDay == null ? '—' : 'D' + s.endDay);
    console.log('         같은 수 반복 최장(장별):', [2, 3, 4, 5].map(c => `${c}장 ${s.repeatMax[c]}`).join(' · '), ' | 장마다 새 결정 종류:', [2, 3, 4, 5].map(c => `${c}장 ${s.newKinds[c].join('/') || '—'}`).join(' · '));
  }
  const std = out.std?.summary;
  if (std) {
    console.log(`\n합격선(제안): 결정 중앙 ≥ ${LINE.dec} · 감탄 ≥ ${pct(LINE.wowRate)} · 이벤트만 ≤ ${pct(LINE.onlyEvent)} · 사건 사이 중앙 ≤ ${LINE.gapMed}초 · 3~4장 같은 수 반복 ≤ ${LINE.repeatMax} · 3~4장 새 결정 종류 ≥ ${LINE.newKinds}`);
    for (const id of Object.keys(out)) console.log(`  ${id.padEnd(8)} → ${pass(out[id].summary) ? '합격' : '미달'}`);
  }
  // 10일 단위 하강: 결정·감탄이 뒤로 갈수록 어떻게 변하나 (표준)
  if (out.std) {
    const rows = out.std.runs.flatMap(r => r.rows);
    console.log('\n표준 · 10일 칸별 (시드 합 체크인 중앙값)   결정  감탄 있는 비율  사건 사이 중앙  이벤트만');
    for (const [a, b] of [[2, 11], [12, 21], [22, 31]]) {
      const rs = rows.filter(r => r.day >= a && r.day < b + 1);
      if (!rs.length) continue;
      console.log(`  D${a}~D${b}`.padEnd(14), String(med(rs.map(r => r.dec))).padStart(5), pct(rs.filter(r => r.wow.length + r.wowReport.length > 0).length / rs.length).padStart(13), `${med(rs.map(r => r.gapMed)).toFixed(0)}초`.padStart(14), pct(rs.filter(r => r.onlyEvent).length / rs.length).padStart(9));
    }
    const kinds: Record<string, number> = {};
    for (const r of rows) for (const k of r.wow) kinds[k] = (kinds[k] || 0) + 1;
    console.log('  10분 안 감탄 종류(시드 합):', Object.entries(kinds).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음');
    const rk: Record<string, number> = {};
    for (const r of rows) for (const k of r.wowReport) rk[k] = (rk[k] || 0) + 1;
    console.log('  리포트 감탄 종류(시드 합):', Object.entries(rk).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음');
  }
  const j = arg('--json');
  if (j) {
    writeFileSync(j, JSON.stringify({ rules: RULES.id, line: LINE, personas: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { summary: v.summary, runs: v.runs.map(r => ({ seed: r.seed, endDay: r.endDay, rows: r.rows.map(({ acts: _a, ...x }) => x) })) }])) }, null, 1));
    console.log('→', j);
  }
}
