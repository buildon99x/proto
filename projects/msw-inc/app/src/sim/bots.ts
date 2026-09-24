/*
 * 봇 매니저 — 규칙이 약속한 달력과 선택별 진행 속도를 재는 데 쓴다.
 *
 * 사람을 흉내 내는 "오렌 따라하기" 봇이 기본이다. 화면이 권하는 순서 그대로 움직인다:
 *   결재 → 빈틈(추천 계열 채용 → 초록으로 빛나는 자리) → 대기실 → 과밀(자리 확장) → 진화 → 이벤트
 * 페르소나는 이 흐름 위에서 한 가지 선택만 바꾼다. 그래야 "그 선택 하나"가 만든 차이가 보인다.
 */
import { SPECIES, SPECIES_IDS, type PlotId, type SpeciesId } from './content';
import * as S from './sim';
import type { World } from './sim';

export type EvolvePolicy = 'hasty' | 'planner' | 'hoarder';
export type PlacePolicy = 'best' | 'stack' | 'spread';
export interface Persona {
  id: string; label: string;
  /** 하루 체크인 시각 (분, 0 = 자정) */
  times: number[];
  acts: number;
  evolve: EvolvePolicy;
  place: PlacePolicy;
  events: boolean;
  /** 하루 마지막 체크인에서 진화 가능한 직원을 전부 진화시키고 떠난다 */
  nightEvolve?: boolean;
  /** 결재 서류가 올라와도 도장을 늦게 받는다 (다음 날 첫 체크인) */
  lateStamp?: boolean;
  /** 퇴사를 쓴다 (v1.2) */
  release?: boolean;
  /** 진화 되돌리기를 쓴다 (v1.2): 진화했더니 빈틈이 생기고 바로 못 메우면 되돌린다 */
  undo?: boolean;
}

const START = 21 * 60; // 입사는 저녁 9시

export const PERSONAS: Persona[] = [
  { id: 'std', label: '표준 (하루 3회, 진화는 따져 보고)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'planner', place: 'best', events: true },
  { id: 'light', label: '가벼운 (하루 2회, 2수)', times: [9 * 60, 21 * 60], acts: 2, evolve: 'planner', place: 'best', events: false },
  { id: 'heavy', label: '열성 (하루 5회, 4수)', times: [8 * 60, 11 * 60, 14 * 60, 18 * 60, 22 * 60], acts: 4, evolve: 'planner', place: 'best', events: true },
  { id: 'hasty', label: '진화 즉시 (뜨면 바로 누른다)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'hasty', place: 'best', events: true },
  { id: 'hoarder', label: '진화 보류 (길을 잇는 데 필요할 때만)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'hoarder', place: 'best', events: true },
  { id: 'stack', label: '한 던전에 몰기 (빈 슬롯부터 채운다)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'planner', place: 'stack', events: true },
  { id: 'spread', label: '한 던전에 한 마리 (부지부터 연다)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'planner', place: 'spread', events: true },
  { id: 'night', label: '퇴근 직전 진화 (밤에 입구를 비운다)', times: [9 * 60, 13 * 60, 21 * 60], acts: 3, evolve: 'planner', place: 'best', events: true, nightEvolve: true },
];

// ── 가벼운 복제 (모험가는 공유한다 — 행동 판단은 모험가를 바꾸지 않는다) ──
export function lightClone(w: World): World {
  return {
    ...w,
    plots: JSON.parse(JSON.stringify(w.plots)),
    dungeons: JSON.parse(JSON.stringify(w.dungeons)),
    monsters: w.monsters.map(m => ({ ...m })),
    dex: { ...w.dex }, tut: { ...w.tut }, stats: { ...w.stats, left: { ...w.stats.left } },
  };
}

const gapN = (w: World) => S.gapSize(S.gapSegments(w));

/** 빈틈 하나를 채용 + 배치로 메울 수 있으면 그 수를 돌려준다 */
function planHireFix(w: World, place: PlacePolicy): { sp: SpeciesId; to: PlotId } | null {
  const segs = S.gapSegments(w);
  if (!segs.length) return null;
  const cur = S.gapSize(segs);
  let best: { sp: SpeciesId; to: PlotId; gap: number; cost: number; stack: number } | null = null;
  for (const sp of SPECIES_IDS) {
    if (!S.canHireSpecies(w, sp)) continue;
    const cost = w.tut.ticket === sp ? 0 : S.hireCost(sp);
    for (const id in w.plots) {
      const d = w.dungeons[id], open = w.plots[id].open;
      const full = S.monsIn(w, id).length >= d.slots;
      const sc = full ? S.slotCost(w, d) : 0;
      if (sc == null) continue;
      const total = cost + (open ? 0 : S.plotCost(id)) + sc;
      if (total > w.smile) continue;
      const lv = S.levelsOf(w, { add: { sp, to: id }, open: open ? undefined : id });
      const g = S.gapSize(S.gapSegments(w, lv));
      if (g >= cur) continue;
      const n = S.monsIn(w, id).length;
      const stack = place === 'stack' ? -n : place === 'spread' ? n : 0;
      const better = !best || g < best.gap || (g === best.gap && (stack < best.stack || (stack === best.stack && total < best.cost)));
      if (better) best = { sp, to: id, gap: g, cost: total, stack };
    }
  }
  return best && { sp: best.sp, to: best.to };
}

/** 던전 하나를 통째로 비우고 신입 한 명으로 다시 여는 수 (여러 번 눌러야 하는 복구) */
function planRebuild(w: World, p: Persona): { sp: SpeciesId; to: PlotId } | null {
  const cur = gapN(w);
  let best: { sp: SpeciesId; to: PlotId; g: number; n: number } | null = null;
  const room = S.TRAY_MAX - S.tray(w).length;
  for (const id in w.plots) {
    if (!w.plots[id].open) continue;
    const ms = S.monsIn(w, id);
    if (!ms.length || ms.some(m => m.vet || m.sp === 'balrog')) continue;
    if (ms.length > room && !((p.release ?? true) && S.RULES_RELEASE())) continue;
    for (const sp of SPECIES_IDS) {
      if (!S.canHireSpecies(w, sp) || S.hireCost(sp) > w.smile) continue;
      const c = lightClone(w);
      for (const m of S.monsIn(c, id)) m.d = null;
      const g = S.gapSize(S.gapSegments(c, S.levelsOf(c, { add: { sp, to: id } })));
      if (g < cur && (!best || g < best.g || (g === best.g && ms.length < best.n))) best = { sp, to: id, g, n: ms.length };
    }
  }
  return best && { sp: best.sp, to: best.to };
}

/** 키워서 잇기: 진화하면 빈틈에 닿는 계열을 빈 부지(없으면 가장 덜 아픈 던전을 비워)에 혼자 둔다 */
function planGrow(w: World, p: Persona): { sp: SpeciesId; to: PlotId } | null {
  for (const seg of S.gapSegments(w)) {
    if (S.recommendSpecies(w, seg) || S.growingToward(w, seg)) continue;
    const hint = S.recommendGrow(w, seg);
    if (!hint) continue;
    const cost = S.hireCost(hint.sp);
    const empty = Object.keys(w.plots).filter(id => !S.monsIn(w, id).length)
      .map(id => ({ id, c: cost + (w.plots[id].open ? 0 : S.plotCost(id)) })).filter(x => x.c <= w.smile).sort((a, b) => a.c - b.c);
    if (empty.length) return { sp: hint.sp, to: empty[0].id };
    // 빈 부지가 없으면: 비워도 빈틈이 늘지 않는 던전
    const room = S.TRAY_MAX - S.tray(w).length;
    const cur = gapN(w);
    for (const id in w.plots) {
      const ms = S.monsIn(w, id);
      if (!ms.length || ms.some(m => m.vet || m.sp === 'balrog')) continue;
      if (ms.length > room && !((p.release ?? true) && S.RULES_RELEASE())) continue;
      const c = lightClone(w);
      for (const m of S.monsIn(c, id)) m.d = null;
      if (gapN(c) <= cur && cost <= w.smile) return { sp: hint.sp, to: id };
    }
  }
  return null;
}

/** 대기실·발판 직원을 옮겨 빈틈을 줄이는 수 */
function planMove(w: World): { id: number; to: PlotId } | null {
  const cur = gapN(w);
  let best: { id: number; to: PlotId; g: number; cost: number } | null = null;
  for (const m of w.monsters) {
    for (const id in w.plots) {
      if (m.d === id) continue;
      const c = S.placeCheck(w, m, id);
      if (!c.ok) continue;
      const open = w.plots[id].open;
      const g = S.gapSize(S.gapSegments(w, S.levelsOf(w, { move: { id: m.id, to: id }, open: open ? undefined : id })));
      const cost = c.openCost || 0;
      if (g < cur && (!best || g < best.g || (g === best.g && cost < best.cost))) best = { id: m.id, to: id, g, cost };
    }
  }
  return best && { id: best.id, to: best.to };
}

/** 이 진화를 지금 할 것인가. 한다면 발령 계획도 같이 (v1.2 화면은 발령을 먼저 권한다) */
function wantEvolve(w: World, m: S.Monster, p: Persona): { go: boolean; plan: S.PromotePlan | null } {
  if (S.evolveBlock(w, m)) return { go: false, plan: null };
  const pv = S.preview(w, { evolve: m.id });
  const plan = pv.lost.length ? S.bestPromote(w, m.id) : null;
  const cur = gapN(w);
  if (p.evolve === 'hasty') return { go: true, plan };
  if (p.evolve === 'hoarder') {
    if (pv.gained.length && !pv.lost.length) return { go: true, plan: null };
    return { go: !!plan && plan.gapAfter < cur, plan };
  }
  // planner: 새 빈틈이 없거나, 발령으로 안 생기거나, 생겨도 바로 메울 수 있으면 한다
  if (!pv.lost.length) return { go: true, plan: null };
  if (plan && plan.gapAfter <= cur) return { go: true, plan };
  const c = lightClone(w);
  S.evolve(c, m.id);
  return { go: !!planHireFix(c, p.place) || !!planMove(c), plan: null };
}

export interface CheckinLog { acts: string[] }

function tryEvolve(w: World, p: Persona, log: string[], onlyHelping: boolean): boolean {
  const cur = gapN(w);
  for (const m of w.monsters.filter(x => S.canEvolve(x))) {
    const want = wantEvolve(w, m, p);
    if (!want.go) continue;
    if (onlyHelping) {
      const after = want.plan ? want.plan.gapAfter : S.gapSize(S.preview(w, { evolve: m.id }).gapsAfter);
      if (after >= cur) continue;
    }
    if (want.plan) {
      const r = S.promote(w, want.plan);
      if (r.ok) { log.push('promote'); return true; }
    }
    const before = gapN(w);
    const r = S.evolve(w, m.id);
    if (r.ok) {
      log.push('evolve');
      if (p.undo && gapN(w) > before && !planHireFix(w, p.place) && !planMove(w)) { S.unevolve(w, m.id, r.from, r.tenureBefore); log.push('undo'); }
      return true;
    }
  }
  return false;
}

/** 자리가 모자랄 때: 사람이 가장 많이 기다리는 레벨에 던전을 하나 더 연다 */
function planExpand(w: World): { sp: SpeciesId; to: PlotId } | null {
  const empty = Object.keys(w.plots).filter(id => !S.monsIn(w, id).length).sort((a, b) => +w.plots[b].open - +w.plots[a].open || S.plotCost(a) - S.plotCost(b));
  if (!empty.length) return null;
  // 레벨별 인구 (즐거움 + 기다림)
  const pop = new Array(101).fill(0);
  for (const a of w.advs) if (a.st === 'happy' || a.st === 'busy') pop[a.lv]++;
  const to = empty[0];
  let best: { sp: SpeciesId; score: number } | null = null;
  for (const sp of SPECIES_IDS) {
    if (!S.canHireSpecies(w, sp)) continue;
    const cost = S.hireCost(sp) + (w.plots[to].open ? 0 : S.plotCost(to));
    if (cost > w.smile) continue;
    const b = SPECIES[sp].base;
    let score = 0;
    for (let L = Math.max(1, b - 5); L <= Math.min(S.roadEnd(w) - 1, b + 5); L++) score += pop[L];
    if (!best || score > best.score) best = { sp, score };
  }
  return best && best.score >= 6 ? { sp: best.sp, to } : null;
}

export function checkIn(w: World, p: Persona, opts: { last?: boolean; first?: boolean } = {}): CheckinLog {
  const log: string[] = [];
  let acts = 0;
  const can = () => acts < p.acts;
  if (w.approvalReady && (!p.lateStamp || opts.first)) { S.approve(w); log.push('approve'); acts++; }
  // 5장: 발록 입사 지원서가 오면 바로 배치한다 (가장 비싼 부지라도)
  const bal = w.monsters.find(m => m.sp === 'balrog' && !m.d);
  if (bal && can()) {
    const empty = Object.keys(w.plots).filter(id => !S.monsIn(w, id).length).sort((a, b) => +w.plots[b].open - +w.plots[a].open);
    for (const id of empty) if (S.place(w, bal.id, id).ok) { log.push('balrog'); acts++; break; }
  }
  let guard = 0;
  while (can() && guard++ < 12) {
    // 빈틈: 옮기기로 되면 옮기고, 아니면 채용
    if (gapN(w)) {
      const mv = planMove(w);
      const fix = planHireFix(w, p.place);
      const mvGain = mv ? gapN(w) - S.gapSize(S.gapSegments(w, S.levelsOf(w, { move: { id: mv.id, to: mv.to }, open: w.plots[mv.to].open ? undefined : mv.to }))) : 0;
      const hireGain = fix ? gapN(w) - S.gapSize(S.gapSegments(w, S.levelsOf(w, { add: fix, open: w.plots[fix.to].open ? undefined : fix.to }))) : 0;
      if (mv && mvGain >= hireGain) { S.place(w, mv.id, mv.to); log.push('move'); acts++; continue; }
      if (fix) {
        if (S.monsIn(w, fix.to).length >= w.dungeons[fix.to].slots) { S.slotUp(w, fix.to); log.push('slot'); }
        const h = S.hire(w, fix.sp, fix.to);
        if (h.ok) { S.place(w, h.mon.id, fix.to); log.push('hire:' + fix.sp); acts++; continue; }
      }
      // 한 수로 안 되면: 던전 하나를 비우고(대기실·퇴사) 맞는 신입으로 다시 연다
      const rb = planRebuild(w, p);
      if (rb) {
        for (const m of S.monsIn(w, rb.to)) {
          if (S.tray(w).length < S.TRAY_MAX) S.place(w, m.id, null);
          else if (!S.release(w, m.id).ok) break;
          log.push('clear'); acts++;
        }
        const h = S.hire(w, rb.sp, rb.to);
        if (h.ok) { S.place(w, h.mon.id, rb.to); log.push('rebuild:' + rb.sp); acts++; continue; }
      }
      // 채용으로 닿지 않는 빈틈: 진화하면 닿는 신입을 혼자 두고 키운다 ("키워서 잇기")
      const gr = planGrow(w, p);
      if (gr) {
        for (const m of S.monsIn(w, gr.to)) {
          if (S.tray(w).length < S.TRAY_MAX) S.place(w, m.id, null);
          else if (!S.release(w, m.id).ok) break;
          log.push('clear'); acts++;
        }
        const h = S.hire(w, gr.sp, null);
        if (h.ok && S.place(w, h.mon.id, gr.to).ok) { log.push('grow:' + gr.sp); acts++; continue; }
      }
    }
    // 진화 ①: 길을 잇는 진화(빈틈이 줄어드는 것)는 먼저 한다
    if (gapN(w) && tryEvolve(w, p, log, true)) { acts++; continue; }
    // 대기실에 남은 직원
    const tr = S.tray(w).find(m => m.sp !== 'balrog');
    if (tr) {
      const bp = S.bestPlaces(w, tr.id);
      if (bp.length && S.place(w, tr.id, bp[0]).ok) { log.push('place'); acts++; continue; }
      if ((p.release ?? true) && S.release(w, tr.id).ok) { log.push('release'); acts++; continue; }
    }
    // 과밀: 자리 확장
    const busy = S.badges(w).filter((b): b is Extract<S.Badge, { kind: 'busy' }> => b.kind === 'busy').sort((a, b) => b.n - a.n)[0];
    if (busy && busy.n >= 2 && S.seatUp(w, busy.d).ok) { log.push('seat'); acts++; continue; }
    // 즐기는 모험가가 결재 조건보다 모자라면: 꽉 찬 던전 자리 확장 → 붐비는 레벨에 던전 하나 더
    if (S.happyCount(w) < S.chapterInfo(w).happy && !gapN(w)) {
      const lv = S.levelsOf(w);
      const ids = Object.keys(lv).filter(id => S.seatCost(w, w.dungeons[id]) != null && occ(w, id) >= w.dungeons[id].seats - 1)
        .sort((a, b) => occ(w, b) - occ(w, a));
      if (ids[0] && S.seatUp(w, ids[0]).ok) { log.push('seat+'); acts++; continue; }
      const ex = planExpand(w);
      if (ex) { const h = S.hire(w, ex.sp, null); if (h.ok && S.place(w, h.mon.id, ex.to).ok) { log.push('expand:' + ex.sp); acts++; continue; } if (h.ok) S.unhire(w, h.mon.id, h.free ? 'ticket' : h.cost); }
    }
    // 진화 ②: 나머지는 성향대로
    if (tryEvolve(w, p, log, false)) { acts++; continue; }
    // 이벤트: 스마일이 넉넉하면 가장 붐비는 던전에 경험치 2배
    if (p.events && S.activeEvents(w) < S.maxEvents(w)) {
      const lv = S.levelsOf(w);
      const id = Object.keys(lv).filter(x => !w.dungeons[x].event).sort((a, b) => occ(w, b) - occ(w, a))[0];
      if (id && occ(w, id) >= 4 && w.smile > 4 * S.eventCost(w, id) && S.startEvent(w, id, 'exp').ok) { log.push('event'); acts++; continue; }
    }
    break;
  }
  // 퇴근 직전 진화: 하루 마지막 체크인에서 결과를 보지 않고 누르고 떠난다
  if (opts.last && p.nightEvolve) {
    for (const m of w.monsters) if (S.canEvolve(m) && !S.evolveBlock(w, m)) { S.evolve(w, m.id); log.push('night-evolve'); }
  }
  return { acts: log };
}
const occ = (w: World, id: PlotId) => w.advs.filter(a => a.st === 'happy' && a.d === id).length;

/** 입사 첫 세션 대본 (tut 순서): 빈틈 → 채용·배치 → 경험치 2배 → 고참 진화 */
export function firstSession(w: World): void {
  let placed = false;
  for (let i = 0; i < 12 * 8; i++) {
    S.step(w, 1 / 12);
    if (!placed && w.advs.some(a => a.st === 'search')) {
      const h = S.hire(w, 'mush');
      if (h.ok) S.place(w, h.mon.id, 'h2');
      placed = true;
    }
    if (w.t >= 5 && w.tut.freeEvent) S.startEvent(w, 'h1', 'exp');
    const v = w.monsters.find(m => m.vet);
    if (v && v.stage === 0 && w.t >= 6.5) { v.tenure = Math.max(v.tenure, S.evolveNeed(v)); S.evolve(w, v.id); }
  }
}

export interface RunResult {
  persona: string; seed: number;
  chapters: (number | null)[]; // 결재 받은 월드 시각(분)
  ending: number | null;
  acts: number; checkins: number;
  entranceMin: number; stuckLeft: number; busyLeft: number;
  smileEnd: number; smilePeak: number; happyEnd: number;
  evolves: number; hires: number; releases: number; undos: number;
  daily: { day: number; chapter: number; happy: number; smile: number; gap: number }[];
}

export function runPersona(p: Persona, seed: number, maxDays = 60): RunResult {
  const w = S.createWorld(seed);
  firstSession(w);
  const res: RunResult = {
    persona: p.id, seed, chapters: [null, null, null, null, null], ending: null, acts: 0, checkins: 0,
    entranceMin: 0, stuckLeft: 0, busyLeft: 0, smileEnd: 0, smilePeak: 0, happyEnd: 0, evolves: 0, hires: 0, releases: 0, undos: 0, daily: [],
  };
  const L = S.ledgerStart(w);
  for (let d = 0; d < maxDays && !w.ended; d++) {
    p.times.forEach((hh, i) => {
      if (w.ended) return;
      // 월드 규칙은 결정적이라 난수 시드는 외형만 바꾼다. 사람은 매일 같은 시각에 오지 않으므로
      // 시드마다 체크인 시각을 ±90분 흔든다 (시드 0은 정시)
      const jit = seed ? (hash(seed, d, i) % 181) - 90 : 0;
      const target = d * 1440 + 1440 + hh + jit - START; // D2 아침부터
      while (w.t < target - 0.5) { const ev: S.SimEvent[] = []; S.step(w, 1, ev); S.ledgerAdd(L, w, ev); }
      const ch0 = w.chapter;
      const log = checkIn(w, p, { last: i === p.times.length - 1, first: i === 0 });
      res.checkins++;
      for (const a of log.acts) {
        if (a !== 'night-evolve') res.acts++;
        if (a.startsWith('hire')) res.hires++;
        if (a === 'release') res.releases++;
        if (a === 'undo') res.undos++;
      }
      if (w.chapter > ch0) res.chapters[ch0 - 1] = w.t;
      if (w.ended && res.ending == null) { res.ending = w.t; res.chapters[4] = w.t; }
      res.smilePeak = Math.max(res.smilePeak, w.smile);
    });
    res.daily.push({ day: d + 2, chapter: w.chapter, happy: S.happyCount(w), smile: Math.round(w.smile), gap: gapN(w) });
  }
  res.entranceMin = L.stuckMin;
  res.stuckLeft = w.stats.left.search + w.stats.left.entrance;
  res.busyLeft = w.stats.left.busy;
  res.smileEnd = Math.round(w.smile);
  res.happyEnd = S.happyCount(w);
  res.evolves = w.stats.evolves;
  return res;
}

function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** 월드 시각(분) → "D5 13시" */
export const dayLabel = (t: number | null) => (t == null ? '—' : `D${Math.floor((t + START) / 1440) + 1} ${String(Math.floor(((t + START) % 1440) / 60)).padStart(2, '0')}시`);
export const dayNum = (t: number | null) => (t == null ? null : (t + START) / 1440 + 1);

export { SPECIES };
