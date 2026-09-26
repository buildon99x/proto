/*
 * 경험 간격 점검 — 첫 40분 동안 플레이어에게 무언가가 얼마나 자주 일어나는가.
 *   pnpm --filter msw-inc cadence                      (게임 규칙)
 *   pnpm --filter msw-inc cadence -- --rules v1.3      (다른 규칙으로)
 *   pnpm --filter msw-inc cadence -- --json out.json --trace
 *
 * 튜토리얼은 봇 대본(bots.firstSession)이 화면 대본을 흉내 낸다. 그 뒤로는 "지켜보는 플레이어"가
 * 30초마다 오렌을 따라 최대 2수 둔다(bots.checkIn). 시간은 실제 초다(튜토리얼 배속을 되돌린 추정).
 *
 * 사건은 층으로 나눈다. 같은 5초 틱 안의 같은 종류는 한 번으로 센다(파티 3명 도착 = 도착 1번).
 *   A 볼거리: 파티 도착 · 졸업 · 다음 던전으로 이사 · 5의 배수 레벨업 · 새로 막힘 · 길 뚫림 · 구간 개방
 *   C 결정  : 결정할 거리가 생김(새 빈틈 · 진화 준비 · 붐빔 · 눈금 · 엘리트 · 필드 보스 · 결재 · 드랍 상자) + 실제로 둔 수
 * 합격선(v1.4): 0~40분 A∪C 최장 간격 ≤ 20초, 중앙값 ≤ 15초, 둔 수 25 이상, 결정 사이 최장 ≤ 3분.
 * 사건 층의 정의는 tools/moments.ts(checkin과 같은 잣대). 레벨업 하나하나(빛기둥)는 기준에서 뺀다.
 */
import { writeFileSync } from 'node:fs';
import * as S from '../sim';
import { useRules, V12, V13, V14, V15, V16, RULES, GUESTS_V17, type Rules } from '../rules';
import { firstSession, watchTo, realMinutes } from '../bots';
import { makeWatcher, gapStats, famOf, med, mmss, type Moment } from './moments';
export { gapStats, type Moment };

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const BY_ID: Record<string, Rules> = { 'v1.2': V12, 'v1.3': V13, 'v1.4': V14, 'v1.5': V15, 'v1.6': V16 };
const rules = BY_ID[arg('--rules') || ''] || RULES;
useRules({ ...rules });
// --guests '{"evolveBurst":0}' (1.10.0): 모객 값 일부를 덮어 첫 40분 기여를 가른다
if (arg('--guests') && RULES.guests) useRules({ ...RULES, guests: { ...(RULES.guests || GUESTS_V17), ...JSON.parse(arg('--guests')!) } });
const SEEDS = arg('--seed') ? [+arg('--seed')!] : [7, 11, 23, 42, 99];
const HORIZON = 90; // 분 (40분 뒤 하강까지 본다)
const WINDOW = 40;


export interface CadenceRun {
  seed: number; moments: Moment[]; lvups: number[]; acts: Moment[];
  tutEnd: number; end: { t: number; chapter: number; happy: number; advs: number; smile: number; gaps: S.Seg[]; zone?: number };
  /** 40분 순간 (v1.5): 줄 선 사람, 문을 연 던전, 그때까지 채용한 계열 수(튜토리얼 포함) */
  at40: { queue: number; dungeons: number; species: number };
}

export function runCadence(seed: number, horizon = HORIZON): CadenceRun {
  const w = S.createWorld(seed);
  const acts: Moment[] = [];
  let gapT: number | null = null;
  const real = (t: number) => realMinutes(t, gapT) * 60;
  const eye = makeWatcher(w);
  const watch = (ev: S.SimEvent[]) => {
    if (gapT == null && ev.some(e => e.type === 'stuck')) gapT = w.t;
    eye.tap(ev, real(w.t));
  };
  const act = (kind: string) => { acts.push(eye.act(kind, real(w.t))); };

  // 1. 튜토리얼 대본
  const TUT_ACTS = new Set(['hire', 'promote', 'event', 'stamp', 'region', 'recruit']);
  firstSession(w, k => { if (TUT_ACTS.has(k)) act(k); }, undefined, watch);
  const tutEnd = real(w.t);
  // 2. 지켜보는 플레이어 (30초마다 최대 2수). 튜토리얼 배속이 없으면 월드 = 실제
  const at40 = { queue: 0, dungeons: 0, species: 0 };
  const hired = new Set<string>(w.monsters.map(m => m.sp));
  watchTo(w, w.t + horizon - real(w.t) / 60, (ev, acts) => {
    if (real(w.t) < WINDOW * 60) for (const m of w.monsters) hired.add(m.sp);
    else if (!at40.dungeons) Object.assign(at40, { queue: w.advs.filter(a => a.st === 'busy').length, dungeons: Object.keys(S.levelsOf(w)).length, species: hired.size });
    watch(ev);
    if (!acts.length) return;
    // 진화 뒤 바로 메우기(fix:)는 그 진화 결정의 일부라 따로 세지 않는다
    for (const a of acts) if (!a.startsWith('fix:')) act(a.split(':')[0]);
    // 행동이 바꾼 빈틈·붐빔은 결정할 거리로 다시 세지 않는다
    eye.settle();
  });
  return {
    seed, moments: eye.moments.sort((a, b) => a.s - b.s), lvups: eye.lvups, acts, tutEnd, at40,
    end: { t: w.t, chapter: w.chapter, happy: S.happyCount(w), advs: w.advs.length, smile: Math.round(w.smile), gaps: S.gapSegments(w), zone: zoneOf(w) },
  };
}
/** 구간 개방 규칙(v1.4)이 있으면 지금 열린 구간 수 — 없으면 0 */
function zoneOf(w: S.World): number { return (w as { zone?: number }).zone ?? 0; }

if (process.argv[1] && /cadence\.ts$/.test(process.argv[1])) main();

function main() {
  console.log(`규칙 ${RULES.id} · 시드 ${SEEDS.join(',')} · 0~${WINDOW}분 (실제 시각 추정)\n`);
  const runs = SEEDS.map(s => runCadence(s));
  const rows = runs.map(r => {
    const W = WINDOW * 60;
    const all = gapStats(r.moments.map(m => m.s), 0, W);
    const withLv = gapStats([...r.moments.map(m => m.s), ...r.lvups].sort((a, b) => a - b), 0, W);
    const acts = r.acts.filter(m => m.s < W);
    const dec = gapStats(acts.map(m => m.s), r.tutEnd, W);
    return { r, all, withLv, acts: acts.length, dec };
  });
  console.log('시드   사건 최장  중앙  p90  >20초 | 레벨업 포함 최장 | 둔 수  결정 사이 최장');
  for (const x of rows) {
    console.log(String(x.r.seed).padEnd(5), String(x.all.n).padStart(4), `${x.all.max.toFixed(0)}초`.padStart(5), `${x.all.med.toFixed(0)}초`.padStart(5), `${x.all.p90.toFixed(0)}초`.padStart(5), String(x.all.over20).padStart(5),
      '|', `${x.withLv.max.toFixed(0)}초`.padStart(10), '|', String(x.acts).padStart(5), mmss(x.dec.max).padStart(9), `(${mmss(x.dec.longest[0])}~)`);
  }
  const pick = rows[0];
  console.log(`\n최장 공백 (시드 ${pick.r.seed}): ${mmss(pick.all.longest[0])} ~ ${mmss(pick.all.longest[1])}`);
  // 40분 뒤 하강: 10분 칸마다 사건·둔 수 (중앙값)
  console.log('\n10분 칸별 (시드 중앙값)   A 볼거리  C 결정거리  둔 수  레벨업');
  for (let b = 0; b < HORIZON / 10; b++) {
    const lo = b * 600, hi = lo + 600, inB = (s: number) => s >= lo && s < hi;
    const a = med(runs.map(r => r.moments.filter(m => m.layer === 'A' && inB(m.s)).length));
    const c = med(runs.map(r => r.moments.filter(m => m.layer === 'C' && !m.kind.startsWith('act:') && inB(m.s)).length));
    const n = med(runs.map(r => r.acts.filter(m => inB(m.s)).length));
    const lv = med(runs.map(r => r.lvups.filter(inB).length));
    console.log(`  ${String(b * 10).padStart(2)}~${String(b * 10 + 10).padStart(2)}분`.padEnd(24), String(a).padStart(6), String(c).padStart(10), String(n).padStart(6), String(lv).padStart(7));
  }
  const kinds: Record<string, number> = {};
  for (const m of pick.r.moments) if (m.s < WINDOW * 60) kinds[m.kind] = (kinds[m.kind] || 0) + 1;
  console.log(`\n종류별 0~${WINDOW}분 (시드 ${pick.r.seed}):`, Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
  // 결정 가짓수 (v1.5 계열 사다리): 0~40분 둔 수를 갈래로, 시드 5개 합. v1.6 드랍 상자는 따로 센다
  const fam = famOf;
  const famN: Record<string, number> = { 자리: 0, 채용: 0, 진화: 0, 상자: 0, 모객: 0, 기타: 0 };
  let actN = 0;
  for (const x of rows) for (const m of x.r.acts) if (m.s < WINDOW * 60) { famN[fam(m.kind)]++; actN++; }
  const noBox = actN - famN.상자;
  console.log(`결정 갈래 0~${WINDOW}분 (시드 합 ${actN}수):`, Object.entries(famN).map(([k, v]) => `${k} ${v} (${Math.round((100 * v) / Math.max(1, actN))}%)`).join(' · '));
  if (famN.상자) console.log(`  상자를 빼면 (${noBox}수): 자리 ${Math.round((100 * famN.자리) / Math.max(1, noBox))}% · 채용 ${Math.round((100 * famN.채용) / Math.max(1, noBox))}%`);
  console.log(`40분 순간 (시드 중앙값): 줄 선 사람 ${med(runs.map(r => r.at40.queue))} · 문을 연 던전 ${med(runs.map(r => r.at40.dungeons))} · 채용해 본 계열 ${med(runs.map(r => r.at40.species))}`);
  const e = pick.r.end;
  console.log(`${HORIZON}분 끝 (시드 ${pick.r.seed}): ${e.chapter}장 · 즐거움 ${e.happy}/${e.advs} · 스마일 ${e.smile} · 빈틈 ${JSON.stringify(e.gaps)}`);
  const summary = {
    rules: RULES.id,
    maxGap: med(rows.map(x => x.all.max)), medGap: med(rows.map(x => x.all.med)), over20: med(rows.map(x => x.all.over20)),
    acts: med(rows.map(x => x.acts)), decMax: med(rows.map(x => x.dec.max)),
  };
  const pass = summary.maxGap <= 20.5 && summary.medGap <= 15 && summary.acts >= 25 && summary.decMax <= 180.5;
  console.log(`\n중앙값: 최장 ${summary.maxGap.toFixed(0)}초 · 중앙 ${summary.medGap.toFixed(0)}초 · 20초 넘는 공백 ${summary.over20}번 · 둔 수 ${summary.acts} · 결정 사이 최장 ${mmss(summary.decMax)} → ${pass ? '합격' : '미달'}`);
  const out = arg('--json');
  if (out) {
    writeFileSync(out, JSON.stringify({ summary, runs: rows.map(x => ({ seed: x.r.seed, all: x.all, withLv: x.withLv, acts: x.acts, dec: x.dec, end: x.r.end, moments: args.includes('--trace') ? x.r.moments : undefined })) }, null, 1));
    console.log('→', out);
  }
}
