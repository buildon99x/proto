/*
 * 선택 점검 — 플레이어의 선택 하나가 진행 속도를 얼마나 가르는가.
 *   pnpm --filter msw-inc audit                 (v1.2와 게임 규칙 v1.3을 나란히)
 *   pnpm --filter msw-inc audit -- --rules v1.1 (한 규칙만)
 *   pnpm --filter msw-inc audit -- --json out.json
 *
 * 성향(persona)은 "오렌 따라하기" 봇 위에서 선택 한 가지만 바꾼다(bots.ts).
 * 월드 규칙은 결정적이다. 시드마다 체크인 시각을 ±90분 흔들어(bots.ts) 중앙값과 범위를 쓴다. 결과 해석은 notes/choice-audit.md.
 */
import { writeFileSync } from 'node:fs';
import { useRules, V11, V12, V13, type Rules } from '../rules';
import { PERSONAS, runPersona, dayNum, type RunResult } from '../bots';

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const SEEDS = [7, 11, 23, 42, 99];
const MAX_DAYS = 70;

const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const f1 = (x: number | null) => (x == null ? '  —  ' : x.toFixed(1).padStart(5));

interface Row { rules: string; persona: string; label: string; ch: (number | null)[]; endDead: number; endDone: number; endMin: number | null; endMax: number | null; entranceH: number; smileMax: number; acts: number; runs: RunResult[] }

function runSet(r: Rules): Row[] {
  useRules(r);
  const rows: Row[] = [];
  for (const p of PERSONAS) {
    if (only && !only.includes(p.id)) continue;
    const runs = SEEDS.map(s => runPersona(p, s, MAX_DAYS));
    const ch = [0, 1, 2, 3, 4].map(i => {
      const ds = runs.map(x => dayNum(x.chapters[i]));
      // 절반 넘게 못 끝냈으면 미달
      if (ds.filter(d => d == null).length > runs.length / 2) return null;
      return med(ds.map(d => (d == null ? MAX_DAYS + 1 : d)));
    });
    const ends = runs.map(x => dayNum(x.chapters[4])).filter((d): d is number => d != null);
    rows.push({
      rules: r.id, persona: p.id, label: p.label, ch,
      endDone: ends.length, endMin: ends.length ? Math.min(...ends) : null, endMax: ends.length ? Math.max(...ends) : null,
      endDead: runs.filter(x => x.happyEnd === 0).length,
      entranceH: med(runs.map(x => x.entranceMin / 60)),
      smileMax: med(runs.map(x => x.smilePeak)),
      acts: med(runs.map(x => x.acts / x.checkins)),
      runs,
    });
  }
  return rows;
}

const all: Row[] = [];
const BY_ID: Record<string, Rules> = { 'v1.1': V11, 'v1.2': V12, 'v1.3': V13 };
const sets = args.includes('--rules') ? [BY_ID[args[args.indexOf('--rules') + 1]] || V13] : [V12, V13];
for (const r of args.includes('--ablate') && !args.includes('--rules') ? [] : sets) {
  const rows = runSet(r);
  all.push(...rows);
  console.log(`\n══ 규칙 ${r.id} · 시드 ${SEEDS.length}개 중앙값 · 결재한 날(D) ══`);
  console.log('성향'.padEnd(14), ' 1장   2장   3장   4장   5장 | 엔딩(시드별 최소~최대) 입구 막힘(h) 멈춘 월드 체크인당 행동 스마일 최고');
  for (const x of rows) {
    const spread = x.endMin == null ? '—' : `${x.endMin.toFixed(1)}~${x.endMax!.toFixed(1)} (${x.endDone}/${SEEDS.length})`;
    console.log(x.persona.padEnd(14), x.ch.map(f1).join(' '), '|', spread.padStart(20), x.entranceH.toFixed(0).padStart(8), `${x.endDead}/${SEEDS.length}`.padStart(9), x.acts.toFixed(1).padStart(10), Math.round(x.smileMax).toLocaleString().padStart(12));
  }
  const ends = rows.map(x => x.ch[4]).filter((d): d is number => d != null);
  const base = rows.find(x => x.persona === 'std');
  if (base && base.ch[4]) {
    console.log('\n표준 대비 엔딩이 늦어지는 날 (선택 하나가 만드는 차이):');
    for (const x of rows) if (x.persona !== 'std') console.log('  ', x.label.padEnd(30), x.ch[4] == null ? `엔딩 못 봄 (${MAX_DAYS}일 안)` : `${(x.ch[4] - base.ch[4]) >= 0 ? '+' : ''}${(x.ch[4] - base.ch[4]).toFixed(1)}일`);
  }
  if (ends.length) console.log(`엔딩 범위 D${Math.min(...ends).toFixed(1)} ~ D${Math.max(...ends).toFixed(1)} · 엔딩을 못 본 성향 ${rows.length - ends.length}`);
}

if (jsonOut && all.length) {
  writeFileSync(jsonOut, JSON.stringify(all.map(({ runs, ...x }) => ({ ...x, seeds: runs.map(r => ({ seed: r.seed, ch: r.chapters.map(dayNum), happyEnd: r.happyEnd, entranceH: r.entranceMin / 60, daily: r.daily })) })), null, 1));
  console.log('\n→', jsonOut);
}

// ── 하나씩 빼 보기: v1.2의 각 변경이 무엇을 막는가 ──────────────
if (args.includes('--ablate')) {
  const variants: [string, Partial<Rules>][] = [
    ['v1.3 전부', {}],
    ['− 빈틈 걷기 (떠남)', { gapWalk: 0 }],
    ['− 누적 즐거움 결재 (동시 인원)', { joyGoal: null }],
    ['− 승진 발령', { promote: false }],
    ['− 근속 이월', { tenureCarry: false }],
    ['− 퇴사', { releaseRefund: 0 }],
    ['− 수입 곡선', { incomeCurve: [1, 1, 1, 1, 1], costCurve: [1, 1, 1, 1, 1] }],
    // v1.3 (플레이 리뷰 뒤)
    ['− 막대 눈금 보상 (F1)', { joyMarks: null }],
    ['− 5장 ③ 식구 (F2)', { nativeCond: false }],
    ['− 엘리트 (E)', { elite: null }],
    ['− 필드 보스 (E)', { fieldBoss: null }],
    ['− 첫 10분 한 바퀴 (T)', { firstLoop: false, joyGoal: [300, 3000, 21500, 34500, 36500] }],
  ];
  const ps = ['std', 'light', 'hasty', 'hoarder', 'night'];
  console.log('\n══ 하나씩 빼 보기 · 엔딩 날(D) 중앙값 · 멈춘 월드 ══');
  console.log('변형'.padEnd(26), ps.map(p => p.padStart(9)).join(''), '  범위');
  const out: Record<string, unknown> = {};
  for (const [label, patch] of variants) {
    useRules({ ...V13, ...patch, id: label });
    const cells: string[] = [], ends: number[] = [];
    for (const id of ps) {
      const p = PERSONAS.find(x => x.id === id)!;
      const runs = SEEDS.map(s => runPersona(p, s, MAX_DAYS));
      const ds = runs.map(r => dayNum(r.chapters[4]));
      const done = ds.filter((d): d is number => d != null);
      const dead = runs.filter(r => r.happyEnd === 0).length;
      const m = done.length > runs.length / 2 ? med(ds.map(d => d ?? MAX_DAYS + 1)) : null;
      if (m != null) ends.push(m);
      cells.push((m == null ? '  —' : m.toFixed(1)).padStart(6) + (dead ? `†${dead}` : '  '));
      out[label + ':' + id] = { end: m, dead, done: done.length };
    }
    console.log(label.padEnd(26), cells.join(' '), ends.length ? `  ${(Math.max(...ends) - Math.min(...ends)).toFixed(1)}일` : '');
  }
  console.log('(† = 즐기는 모험가 0으로 멈춘 월드 수, — = 70일 안에 엔딩 못 봄)');
  if (jsonOut) writeFileSync(jsonOut.replace('.json', '-ablate.json'), JSON.stringify(out, null, 1));
}
