/*
 * 기다림 점검 (1.12.0) — 선택에 따라 "할 수 있는 게 없는 기다림"이 얼마나 벌어지는가.
 *   pnpm --filter msw-inc waits                       (8성향 + 서툰 선택 성향)
 *   pnpm --filter msw-inc waits -- --only std,sloppy --json out.json
 *
 * 장마다 결재 조건이 어떤 상태로 시간을 보냈는지 1분 걸음으로 센다.
 *   둘 다 미달 / ②만 남음(길은 다 이었다 — 기다리면 된다) / ①만 남음(②는 찼는데 길이 막혔다 — 무언가를 해야 한다) / 결재 대기(조건 충족, 도장 전)
 * "①만 남음"이 길면 플레이어는 결재 막대가 찼는데 넘어가지 못한다. 그 동안 봇이 둔 수가 없으면(막힘) 며칠을 기다려야 풀리는 벽이다.
 * 체크인마다: 오렌이 권하는 수가 스마일이 모자라 못 두는가(돈 막힘), 이벤트·상자·모객 말고 둔 수가 있는가(실질 결정).
 */
import { writeFileSync } from 'node:fs';
import * as S from '../sim';
import { PERSONAS, firstSession, checkIn, dayNum, type Persona } from '../bots';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const SEEDS = [7, 11, 23, 42, 99];
const MAX_DAYS = 70;
const START = 21 * 60;

/**
 * 서툰 선택 성향 (1.12.0): 표준 위에서 사람이 흔히 하는 실수 하나씩. 봇 목록(PERSONAS)에는 넣지 않는다 — 달력 점검(audit)의 기준을 바꾸지 않으려고.
 *   sloppy: 진화는 뜨면 바로(결과를 안 본다), 이벤트를 안 건다, 하루 두 번
 *   away: 하루 한 번 저녁에만 (가장 긴 부재)
 *   stamp: 결재 도장을 다음 날 아침에야 누른다
 *   nighttab: 퇴근 직전 진화인데 퇴근 버튼 없이 탭을 닫는다 (1.14.0 — 화면의 퇴근 붙잡기를 겪지 않는 하한선)
 *   screen: 표준이지만 던전을 비우고 다시 여는 수를 모른다 (1.11.0까지 화면이 권하지 않았다)
 */
export const CLUMSY: Persona[] = [
  { id: 'sloppy', label: '서툰 (진화 즉시 · 이벤트 없음 · 하루 2회)', times: [9 * 60, 21 * 60], acts: 2, evolve: 'hasty', place: 'best', events: false },
  { id: 'away', label: '하루 한 번 (저녁 9시, 3수)', times: [21 * 60], acts: 3, evolve: 'planner', place: 'best', events: true },
  { id: 'stamp', label: '도장을 늦게 (다음 날 아침)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'planner', place: 'best', events: true, lateStamp: true },
  { id: 'nighttab', label: '퇴근 직전 진화 · 탭을 닫고 떠난다 (퇴근 붙잡기 없음)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'planner', place: 'best', events: true, nightEvolve: true },
  { id: 'screen', label: '화면이 권하는 수만 (던전 비우고 다시 열기를 모른다)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'planner', place: 'best', events: true, noRebuild: true },
];

export interface ChapterWait { ch: number; days: number; neither: number; joyOnly: number; roadOnly: number; ready: number; roadOnlyMax: number; gapMax: number }
export interface WaitRun {
  persona: string; seed: number; end: number | null; chapters: ChapterWait[];
  /** 실질 결정(이벤트·상자·모객·결재 말고)이 없던 가장 긴 기간(일) */
  idleMax: number;
  /** 오렌이 권하는 채용·자리 수가 스마일 모자라 못 둔 체크인 비율 */
  brokeRate: number;
  checkins: number;
}
const TRIVIAL = /^(event|event-free|box|recruit|welcome|approve|night-evolve)/;

export function runWaits(p: Persona, seed: number): WaitRun {
  const w = S.createWorld(seed);
  firstSession(w);
  const chapters: ChapterWait[] = [];
  let cw: ChapterWait = { ch: w.chapter, days: 0, neither: 0, joyOnly: 0, roadOnly: 0, ready: 0, roadOnlyMax: 0, gapMax: 0 };
  let roadRun = 0, gapRun = 0, chStart = w.t;
  let lastReal = w.t, idleMax = 0, broke = 0, checkins = 0;
  const tick = () => {
    const c = S.approvalConds(w);
    const roadOk = c.road && c.balrog && c.native;
    if (roadOk && c.happy) cw.ready++;
    else if (roadOk) cw.joyOnly++;
    else if (c.happy) { cw.roadOnly++; roadRun++; cw.roadOnlyMax = Math.max(cw.roadOnlyMax, roadRun); }
    else cw.neither++;
    if (!(c.happy && !roadOk)) roadRun = 0;
    // 걷는 사람이 있는 빈틈(빨간 빈틈)이 이어진 시간
    if (c.gapN > 0 && w.advs.some(a => a.st === 'search')) { gapRun++; cw.gapMax = Math.max(cw.gapMax, gapRun); } else gapRun = 0;
  };
  const closeChapter = () => { cw.days = (w.t - chStart) / 1440; chapters.push(cw); chStart = w.t; cw = { ch: w.chapter, days: 0, neither: 0, joyOnly: 0, roadOnly: 0, ready: 0, roadOnlyMax: 0, gapMax: 0 }; roadRun = 0; gapRun = 0; };
  for (let d = 0; d < MAX_DAYS && !w.ended; d++) {
    p.times.forEach((hh, i) => {
      if (w.ended) return;
      const jit = seed ? (hash(seed, d, i) % 181) - 90 : 0;
      const target = d * 1440 + 1440 + hh + jit - START;
      const t0 = w.t;
      while (w.t < target - 0.5) { S.step(w, 1, []); tick(); }
      const ch0 = w.chapter;
      // 돈 막힘: 두기 전에 오렌 몫(빈틈 채용·붐빔 풀기·자리)이 있는데 스마일이 모자란가
      const cf = S.crowdFix(w);
      const busy = S.badges(w).filter((b): b is Extract<S.Badge, { kind: 'busy' }> => b.kind === 'busy' && b.n >= 2);
      const seatShort = busy.length > 0 && busy.every(b => { const cost = S.seatCost(w, w.dungeons[b.d]); return cost != null && cost > w.smile; });
      if ((cf && cf.cost > w.smile) || seatShort) broke++;
      const log = checkIn(w, p, { last: i === p.times.length - 1, first: i === 0, awayMin: w.t - t0 });
      checkins++;
      if (log.acts.some(a => !TRIVIAL.test(a))) { idleMax = Math.max(idleMax, (w.t - lastReal) / 1440); lastReal = w.t; }
      if (w.chapter > ch0) closeChapter();
    });
  }
  closeChapter();
  return { persona: p.id, seed, end: w.ended ? dayNum(w.endedAt ?? w.t) : null, chapters, idleMax, brokeRate: broke / Math.max(1, checkins), checkins };
}

function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
const h1 = (min: number) => (min / 60).toFixed(0).padStart(4);

function main() {
  const only = arg('--only')?.split(',');
  const all = [...PERSONAS, ...CLUMSY].filter(p => !only || only.includes(p.id));
  const out: WaitRun[] = [];
  console.log(`기다림 점검 · 시드 ${SEEDS.join(',')} · 1분 걸음 · 시간(h)은 시드 중앙값, 최장은 시드 최댓값`);
  console.log('성향        장 | 길이(일)  둘 다   ②만  ①만(최장)  결재대기 | 빨간 빈틈 최장(h)');
  for (const p of all) {
    const runs = SEEDS.map(s => runWaits(p, s));
    out.push(...runs);
    for (let c = 1; c <= 5; c++) {
      const cs = runs.map(r => r.chapters.find(x => x.ch === c)).filter((x): x is ChapterWait => !!x);
      if (!cs.length) continue;
      console.log(`${p.id.padEnd(10)} ${c}장 | ${med(cs.map(x => x.days)).toFixed(1).padStart(6)} ${h1(med(cs.map(x => x.neither)))} ${h1(med(cs.map(x => x.joyOnly)))} ${h1(med(cs.map(x => x.roadOnly)))}(${h1(Math.max(...cs.map(x => x.roadOnlyMax)))}) ${h1(med(cs.map(x => x.ready)))}    | ${h1(Math.max(...cs.map(x => x.gapMax)))}`);
    }
    console.log(`${''.padEnd(10)} 엔딩 D${med(runs.map(r => r.end ?? 99)).toFixed(1)} · 실질 결정 없는 최장 ${Math.max(...runs.map(r => r.idleMax)).toFixed(1)}일 · 돈 막힘 체크인 ${(100 * med(runs.map(r => r.brokeRate))).toFixed(0)}%`);
  }
  const j = arg('--json');
  if (j) { writeFileSync(j, JSON.stringify(out, null, 1)); console.log('→', j); }
}

if (process.argv[1] && /waits\.ts$/.test(process.argv[1])) main();
