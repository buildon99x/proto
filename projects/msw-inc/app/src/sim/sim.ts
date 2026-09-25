/*
 * MSW 주식회사 — 월드 시뮬레이션 (규칙 R1~R5, spec.md §2)
 *
 * 화면과 분리된 순수 로직이다. 브라우저와 Node(점검 스크립트)가 같은 코드를 쓴다.
 * 서버 시간 모델: 화면이 켜져 있든 아니든 같은 step()으로 월드를 굴린다.
 * 단위: 시간은 월드 분(minute). step(w, dt)는 dt분만큼 진행한다.
 */
import { CHAPTERS, PLOTS, SPECIES, plotInfo, type PlotId, type SpeciesId } from './content';
import { RULES } from './rules';

// ── 타입 ────────────────────────────────────────────────────
export interface Monster {
  id: number; sp: SpeciesId; stage: number; tenure: number; work: number;
  d: PlotId | null; vet: boolean; no: number;
}
export type AdvState = 'new' | 'happy' | 'search' | 'busy';
export interface Adventurer {
  id: number; lv: number; prog: number; st: AdvState; d: PlotId | null; near: PlotId | null;
  wait: number; look: number; jit: number; seen?: boolean;
}
export interface GameEvent { kind: 'exp' | 'drop'; start: number; end: number }
export interface Tickets { hire: SpeciesId[]; event: number; plot: number }
export type MarkReward = { kind: 'hire'; sp: SpeciesId } | { kind: 'event'; n: number } | { kind: 'boss' };
export interface Dungeon {
  id: PlotId; slots: number; seats: number; seatUp: number; slotUp: number;
  event: GameEvent | null; joy: number; recentLv: number;
}
export interface World {
  v: number; seed: number; rng: number; t: number;
  smile: number; chapter: number; stars: number; approvalReady: boolean; ended: boolean; endedAt: number | null;
  plots: Record<PlotId, { open: boolean }>;
  dungeons: Record<PlotId, Dungeon>;
  monsters: Monster[]; advs: Adventurer[];
  nextMon: number; nextAdv: number; arrAcc: number;
  dex: Record<string, true>;
  tut: { buffUntil: number; instant: number };
  /** 무료권: 채용권(계열), 이벤트권, 개업권 — 입사 선물과 결재 막대 눈금 보상 (v1.3) */
  tickets: Tickets;
  /** 이번 장에서 받은 ② 막대 눈금 보상 (v1.3). 길이 = 지난 눈금 수 */
  marks: MarkReward[];
  stats: { arrivals: number; levelups: number; grads: number; left: { entrance: number; search: number; busy: number }; evolves: number };
  /** 이번 장 누적 즐거움 (명·시간) — 결재 조건 ② (v1.2) */
  cjoy: number;
  /** 챕터가 열린 월드 시각 (리포트·점검용) */
  chapterAt: number[];
}
export type SimEvent =
  | { type: 'arrive'; id: number }
  | { type: 'grad'; id: number; from: PlotId | null }
  | { type: 'stuck'; id: number; lv: number; from: PlotId | null }
  | { type: 'leave'; id: number; why: 'entrance' | 'search' | 'busy' }
  | { type: 'move'; id: number; from: PlotId | null; to: PlotId; was: AdvState }
  | { type: 'levelup'; id: number; lv: number; d: PlotId }
  | { type: 'walkup'; id: number; lv: number }
  | { type: 'ready'; mon: number }
  | { type: 'kill'; d: PlotId; n: number }
  | { type: 'eventEnd'; d: PlotId; kind: 'exp' | 'drop' }
  | { type: 'approval' }
  | { type: 'mark'; pct: number; reward: MarkReward };

export const SAVE_VERSION = 3;
export const SEAT_BASE = 8, SEAT_STEP = 4;
export const SLOT_BASE = 3;
export const EVENT_MIN = 240;
export const TRAY_MAX = 10;
export const BUFF_MIN = 15, BUFF_X = 30;
export const VET_TENURE = 1600;
export const OFFLINE_CAP = 1440;
export const JOY_STARS = [100, 500, 2000];

// ── 결정적 난수 ─────────────────────────────────────────────
export function rnd(w: World): number {
  let t = (w.rng = (w.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ── 월드 생성 ───────────────────────────────────────────────
export function createWorld(seed: number): World {
  const w: World = {
    v: SAVE_VERSION, seed: seed >>> 0, rng: seed >>> 0, t: 0,
    smile: 500, chapter: 1, stars: 0, approvalReady: false, ended: false, endedAt: null,
    plots: {}, dungeons: {}, monsters: [], advs: [],
    nextMon: 1, nextAdv: 1, arrAcc: 0,
    dex: {},
    tut: { buffUntil: BUFF_MIN, instant: 3 },
    tickets: { hire: ['mush'], event: 1, plot: 0 }, marks: [],
    stats: { arrivals: 0, levelups: 0, grads: 0, left: { entrance: 0, search: 0, busy: 0 }, evolves: 0 },
    chapterAt: [0], cjoy: 0,
  };
  unlockPlots(w, 1);
  w.plots.h1.open = true;
  w.plots.h2.open = true; // 입사 선물: 두 번째 부지
  w.dungeons.h1.seats = SEAT_BASE + SEAT_STEP; w.dungeons.h1.seatUp = 1; // 입사 선물: 들판 12석
  addMonster(w, 'snail', 'h1', { tenure: VET_TENURE, vet: true });
  addMonster(w, 'snail', 'h1');
  return w;
}

function unlockPlots(w: World, region: number) {
  for (const p of PLOTS) {
    if (p.region !== region) continue;
    if (!w.plots[p.id]) w.plots[p.id] = { open: false };
    if (!w.dungeons[p.id]) w.dungeons[p.id] = { id: p.id, slots: SLOT_BASE, seats: SEAT_BASE, seatUp: 0, slotUp: 0, event: null, joy: 0, recentLv: 0 };
  }
}

export function addMonster(w: World, sp: SpeciesId, d: PlotId | null, opt: { tenure?: number; vet?: boolean } = {}): Monster {
  const m: Monster = { id: w.nextMon++, sp, stage: 0, tenure: opt.tenure || 0, work: 0, d, vet: !!opt.vet, no: 0 };
  m.no = w.monsters.filter(x => x.sp === sp).length + 1;
  w.monsters.push(m);
  w.dex[sp + ':0'] = true;
  return m;
}

// ── 파생 값 ─────────────────────────────────────────────────
export const monLevel = (m: Monster) => SPECIES[m.sp].base + 8 * m.stage;
export const monName = (m: Monster) => SPECIES[m.sp].names[m.stage];
export const maxStage = (m: Monster) => SPECIES[m.sp].names.length - 1;
export const isBoss = (m: Monster) => SPECIES[m.sp].boss && m.stage === maxStage(m);
export const evolveNeed = (m: Monster) => (m.stage < maxStage(m) ? RULES.evolveNeed[m.stage] : Infinity);
export const canEvolve = (m: Monster) => m.stage < maxStage(m) && m.tenure >= evolveNeed(m);
export const roadEnd = (w: World) => CHAPTERS[w.chapter - 1].road;
export const chapterInfo = (w: World) => CHAPTERS[w.chapter - 1];
export const monsIn = (w: World, did: PlotId) => w.monsters.filter(m => m.d === did);
export const tray = (w: World) => w.monsters.filter(m => !m.d);
export const maxEvents = (w: World) => (w.chapter >= 3 ? 3 : 2);
export const activeEvents = (w: World) => Object.values(w.dungeons).filter(d => d.event).length;
export const happyCount = (w: World) => { let n = 0; for (const a of w.advs) if (a.st === 'happy') n++; return n; };
export const dungeonStars = (d: Dungeon) => JOY_STARS.filter(x => d.joy >= x).length;
export const dexCount = (w: World) => Object.keys(w.dex).length;
export const hasBalrogDungeon = (w: World) => w.monsters.some(m => m.sp === 'balrog' && m.d && w.plots[m.d] && w.plots[m.d].open);
export const needsBalrog = (w: World) => w.chapter === 5;
/** 5장 결재 ③ (v1.3): 슬리피우드 계열 직원이 일하는 던전이 있는가 */
export const isNative = (sp: SpeciesId) => SPECIES[sp].chapter === 5;
export const needsNative = (w: World) => w.chapter === 5 && RULES.nativeCond;
export const hasNativeDungeon = (w: World) => w.monsters.some(m => isNative(m.sp) && m.d && w.plots[m.d] && w.plots[m.d].open);

export interface Mods { move?: { id: number; to: PlotId | null }; evolve?: number; open?: PlotId; add?: { sp: SpeciesId; to: PlotId } }

/** 던전 레벨 목록. mods로 가상의 변화를 얹어 미리보기에 쓴다. */
export function levelsOf(w: World, mods: Mods = {}): Record<PlotId, number> {
  const byD: Record<string, number[]> = {};
  const push = (d: PlotId | null, lv: number) => {
    if (!d) return;
    if (!(w.plots[d] && w.plots[d].open) && mods.open !== d) return;
    (byD[d] = byD[d] || []).push(lv);
  };
  for (const m of w.monsters) {
    let d = m.d, stage = m.stage;
    if (mods.move && mods.move.id === m.id) d = mods.move.to;
    if (mods.evolve === m.id) stage = m.stage + 1;
    push(d, SPECIES[m.sp].base + 8 * stage);
  }
  if (mods.add) push(mods.add.to, SPECIES[mods.add.sp].base);
  const out: Record<PlotId, number> = {};
  for (const d in byD) {
    const a = byD[d];
    out[d] = Math.round(a.reduce((s, x) => s + x, 0) / a.length);
  }
  return out;
}

export function coveredSet(levels: Record<PlotId, number>): Uint8Array {
  const c = new Uint8Array(101);
  for (const d in levels) {
    const D = levels[d];
    for (let L = Math.max(1, D - 5); L <= Math.min(100, D + 5); L++) c[L] = 1;
  }
  return c;
}

export type Seg = [number, number];
/** 길(1 ~ 졸업선) 위의 빈틈 구간 목록 */
export function gapSegments(w: World, levels?: Record<PlotId, number>): Seg[] {
  const c = coveredSet(levels || levelsOf(w)), end = roadEnd(w), segs: Seg[] = [];
  let s: number | null = null;
  for (let L = 1; L <= end; L++) {
    if (!c[L]) { if (s === null) s = L; }
    else if (s !== null) { segs.push([s, L - 1]); s = null; }
  }
  if (s !== null) segs.push([s, end]);
  return segs;
}
export const gapSize = (segs: Seg[]) => segs.reduce((s, g) => s + g[1] - g[0] + 1, 0);

export interface DInfo {
  id: PlotId; D: number; lo: number; hi: number; seats: number; occ: number;
  drop: boolean; exp: boolean; gift: boolean; strong: boolean; boss: boolean; mons: Monster[];
}
export function dungeonInfo(w: World): Record<PlotId, DInfo> {
  const lv = levelsOf(w), info: Record<PlotId, DInfo> = {};
  for (const id in lv) {
    const d = w.dungeons[id], ms = monsIn(w, id);
    info[id] = {
      id, D: lv[id], lo: lv[id] - 5, hi: lv[id] + 5, seats: d.seats, occ: 0,
      drop: !!d.event && d.event.kind === 'drop', exp: !!d.event && d.event.kind === 'exp',
      gift: ms.some(m => SPECIES[m.sp].trait === 'gift'),
      strong: ms.some(m => SPECIES[m.sp].trait === 'strong'),
      boss: ms.some(isBoss), mons: ms,
    };
  }
  return info;
}

/** 도착률 (명/분) */
export function arrivalPerMin(w: World): number {
  if (w.t < w.tut.buffUntil) return 1;
  return (6 * (1 + 0.5 * w.stars)) / 60;
}

// ── 한 걸음 ─────────────────────────────────────────────────
/**
 * dt분 진행. out은 연출·리포트용 사건 목록(선택).
 * 순서: 도착 → 이동 판정 → 레벨업 → 퇴근 분배(근속) → 스마일 → 결재 판정
 */
export function step(w: World, dt: number, out?: SimEvent[]): void {
  const emit = out ? (e: SimEvent) => { out.push(e); } : () => {};
  const buffOn = w.t < w.tut.buffUntil;
  const bx = buffOn ? BUFF_X : 1;
  const info = dungeonInfo(w);
  const infoList = Object.values(info);
  const end = roadEnd(w);

  // 1. 도착
  const spawn = () => {
    const a: Adventurer = { id: w.nextAdv++, lv: 1, prog: 0, st: 'new', d: null, near: null, wait: 0, look: Math.floor(rnd(w) * 6), jit: rnd(w) * 0.7 - 0.35 };
    w.advs.push(a); w.stats.arrivals++; emit({ type: 'arrive', id: a.id });
  };
  while (w.tut.instant > 0) { w.tut.instant--; spawn(); }
  w.arrAcc += arrivalPerMin(w) * dt;
  while (w.arrAcc >= 1) { w.arrAcc -= 1; spawn(); }

  // 2. 이동 판정 — 머무는 사람의 자리를 먼저 잡는다
  const keep = new Set<number>();
  for (const a of w.advs) {
    const cur = a.d ? info[a.d] : null;
    if (a.lv < end && cur && a.lv >= cur.lo && a.lv <= cur.hi && a.st === 'happy') { cur.occ++; keep.add(a.id); }
  }
  const gone = new Set<number>();
  for (const a of w.advs) {
    if (a.lv >= end) { gone.add(a.id); w.stats.grads++; w.smile += RULES.smileGrad; emit({ type: 'grad', id: a.id, from: a.d }); continue; }
    if (keep.has(a.id)) { a.wait = 0; continue; }
    const prevSt = a.st, from = a.d;
    a.d = null;
    let free: DInfo | null = null, anyCand: DInfo | null = null;
    for (const x of infoList) {
      if (a.lv < x.lo || a.lv > x.hi) continue;
      if (!anyCand) anyCand = x;
      if (x.occ >= x.seats) continue;
      // 우선순위: ① 드랍 이벤트 중 ② 빈자리 많은 곳 ③ 레벨 높은 곳
      if (!free || (+x.drop - +free.drop || (x.seats - x.occ) - (free.seats - free.occ) || x.D - free.D) > 0) free = x;
    }
    if (!anyCand) {
      // 갈 곳이 없으면 그 자리(입구 포함)에 😐로 멈춰 기다린다
      if (prevSt !== 'search') { a.wait = 0; emit({ type: 'stuck', id: a.id, lv: a.lv, from }); }
      a.st = 'search'; a.near = null; a.wait += dt;
      const atEntrance = a.lv === 1 && !a.seen;
      // v1.2: 빈틈의 모험가는 떠나지 않고 걸어서 건넌다 (아래 레벨업에서)
      if (!RULES.gapWalk && a.wait >= RULES.searchWait) {
        const why = atEntrance ? 'entrance' : 'search';
        gone.add(a.id); w.stats.left[why]++; emit({ type: 'leave', id: a.id, why });
      }
      continue;
    }
    if (!free) {
      if (prevSt !== 'busy') a.wait = 0;
      a.st = 'busy'; a.near = anyCand.id; a.wait += dt;
      if (a.wait >= RULES.busyWait) { gone.add(a.id); w.stats.left.busy++; emit({ type: 'leave', id: a.id, why: 'busy' }); }
      continue;
    }
    free.occ++; a.d = free.id; a.st = 'happy'; a.wait = 0; a.near = null; a.seen = true;
    emit({ type: 'move', id: a.id, from, to: free.id, was: prevSt });
  }
  if (gone.size) w.advs = w.advs.filter(a => !gone.has(a.id));

  // 3~6. 즐거운 모험가가 만드는 것: 레벨업, 퇴근(근속), 스마일
  const happyBy: Record<string, number> = {};
  const cov = RULES.gapWalk ? coveredSet(Object.fromEntries(infoList.map(x => [x.id, x.D]))) : null;
  for (const a of w.advs) {
    if (cov && a.st === 'search') {
      // 빈틈 걷기: 혼자 천천히 자란다. 스마일·근속은 없다. 맞는 레벨에 닿으면 멈춘다
      // 졸업은 즐겁게 끝까지 간 사람만 한다: 걷기는 졸업선 바로 앞에서 멈추고, 거기서 기다리다 떠난다
      if (a.lv >= end - 1) {
        if (a.wait >= RULES.searchWait) { gone.add(a.id); w.stats.left.search++; emit({ type: 'leave', id: a.id, why: 'search' }); }
        continue;
      }
      a.prog += dt * bx * RULES.gapWalk;
      let need = 10 + a.lv;
      while (a.prog >= need && a.lv < end - 1) {
        a.prog -= need; a.lv++;
        emit({ type: 'walkup', id: a.id, lv: a.lv });
        if (cov[a.lv]) { a.prog = 0; break; }
        need = 10 + a.lv;
      }
      if (a.lv >= end - 1) a.wait = 0;
      continue;
    }
    if (a.st !== 'happy' || !a.d) continue;
    const d = info[a.d];
    happyBy[a.d] = (happyBy[a.d] || 0) + 1;
    const speed = bx * (d.exp ? 2 : 1) * (d.strong ? 1.2 : 1);
    a.prog += dt * speed;
    let need = 10 + a.lv;
    while (a.prog >= need) {
      a.prog -= need; a.lv++; w.smile += RULES.smileLevelup * RULES.incomeCurve[w.chapter - 1]; w.stats.levelups++;
      w.dungeons[a.d].recentLv += 1;
      emit({ type: 'levelup', id: a.id, lv: a.lv, d: a.d });
      need = 10 + a.lv;
      // 적정 구간을 벗어나면 더는 즐겁지 않다 — 큰 걸음에서도 빈틈을 건너뛰지 못한다
      if (a.lv > d.hi) { a.prog = 0; break; }
    }
  }
  if (gone.size) w.advs = w.advs.filter(a => !gone.has(a.id));
  for (const id in info) {
    const d = info[id], hs = happyBy[id] || 0, dd = w.dungeons[id];
    dd.recentLv *= Math.exp(-dt / 60);
    if (!hs) continue;
    const kills = hs * dt;
    const share = tenureShare(kills, d.mons.length);
    for (const m of d.mons) {
      const before = canEvolve(m);
      m.work += kills / d.mons.length;
      m.tenure += share * bx * (SPECIES[m.sp].trait === 'fast' ? 1.5 : 1);
      if (!before && canEvolve(m)) emit({ type: 'ready', mon: m.id });
    }
    emit({ type: 'kill', d: id, n: kills });
    w.smile += RULES.smileHappy * RULES.incomeCurve[w.chapter - 1] * hs * dt * (d.drop ? 2 : 1) * (d.gift ? 1.3 : 1) * (d.boss ? 1.5 : 1);
    dd.joy += hs * dt / 60;
    w.cjoy += hs * dt / 60;
  }

  // 이벤트 종료
  for (const id in w.dungeons) {
    const d = w.dungeons[id];
    if (d.event && w.t + dt >= d.event.end) { emit({ type: 'eventEnd', d: id, kind: d.event.kind }); d.event = null; }
  }

  w.t += dt;

  // 결재 ② 막대 눈금 (v1.3): 지나는 순간 보상이 저절로 들어온다
  checkMarks(w, emit);

  // 결재 판정 — 한 번 채우면 서류가 올라와 기다린다
  if (!w.approvalReady && !w.ended && approvalMet(w)) { w.approvalReady = true; emit({ type: 'approval' }); }
}

/** ② 막대 눈금 보상: 25% 이번 장 계열 채용권 · 50% 필드 보스(없으면 이벤트권) · 75% 이벤트권 2장 */
export function markReward(w: World, i: number): MarkReward {
  if (i === 0) {
    const sps = (Object.keys(SPECIES) as SpeciesId[]).filter(sp => SPECIES[sp].chapter === w.chapter);
    const count = (sp: SpeciesId) => w.monsters.filter(m => m.sp === sp).length;
    sps.sort((a, b) => count(a) - count(b) || SPECIES[a].base - SPECIES[b].base);
    return { kind: 'hire', sp: sps[0] };
  }
  if (i === 1) return { kind: 'event', n: 1 };
  return { kind: 'event', n: 2 };
}
function checkMarks(w: World, emit: (e: SimEvent) => void) {
  const jm = RULES.joyMarks, goal = RULES.joyGoal ? RULES.joyGoal[w.chapter - 1] : 0;
  if (!jm || !goal || w.chapter < jm.from || w.ended) return;
  while (w.marks.length < jm.at.length && w.cjoy >= goal * jm.at[w.marks.length]) {
    const i = w.marks.length, reward = markReward(w, i);
    if (reward.kind === 'hire') w.tickets.hire.push(reward.sp);
    else if (reward.kind === 'event') w.tickets.event += reward.n;
    w.marks.push(reward);
    emit({ type: 'mark', pct: jm.at[i], reward });
  }
}

/** 한 던전의 퇴근(근속)이 직원들에게 어떻게 나뉘는가 */
export function tenureShare(kills: number, n: number): number {
  if (n <= 0) return 0;
  if (RULES.tenureSplit === 'share') return kills / n;
  // 'team': 한 명 몫은 1/n보다 덜 줄어든다 — 직원을 더 둬도 성장이 크게 꺾이지 않는다
  return kills * RULES.teamShare[Math.min(n, RULES.teamShare.length) - 1];
}

export function approvalConds(w: World) {
  const ch = chapterInfo(w), segs = gapSegments(w), gapN = gapSize(segs), hc = happyCount(w);
  const joyGoal = RULES.joyGoal ? RULES.joyGoal[ch.n - 1] : 0;
  return {
    road: gapN === 0, gapN, hc,
    // v1.2: ② 이번 장 누적 즐거움 (늘기만 한다 — 벽이 되지 않는다). v1.1: 동시에 즐기는 인원
    happy: joyGoal ? w.cjoy >= joyGoal : hc >= ch.happy,
    joy: w.cjoy, joyGoal, need: ch.happy,
    balrog: needsBalrog(w) ? hasBalrogDungeon(w) : true, needBalrog: needsBalrog(w),
    native: needsNative(w) ? hasNativeDungeon(w) : true, needNative: needsNative(w),
  };
}
export function approvalMet(w: World): boolean {
  const c = approvalConds(w);
  return c.road && c.happy && c.balrog && c.native;
}

/** 오프라인 진행: 1분 단위, 최대 24시간. 리포트용 장부를 채운다. */
export function advance(w: World, minutes: number, ledger?: Ledger): number {
  const n = Math.min(Math.floor(minutes), OFFLINE_CAP);
  for (let i = 0; i < n; i++) {
    const ev: SimEvent[] = [];
    step(w, 1, ledger ? ev : undefined);
    if (ledger) ledgerAdd(ledger, w, ev);
  }
  return n;
}

// ── 리포트 장부 ─────────────────────────────────────────────
export interface Ledger {
  t0: number; happy0: number; smile0: number; lv0: number; grad0: number;
  work0: Record<number, number>;
  hourLv: Record<string, number>;
  bestBurst: { d: PlotId; n: number } | null;
  crowdMax: { d: PlotId; n: number } | null;
  ready: number[]; approval: boolean; firstGrad: boolean;
  stuckMin: number;
  marks: { pct: number; reward: MarkReward }[];
}
export function ledgerStart(w: World): Ledger {
  return {
    t0: w.t, happy0: happyCount(w), smile0: w.smile, lv0: w.stats.levelups, grad0: w.stats.grads,
    work0: Object.fromEntries(w.monsters.map(m => [m.id, m.work])),
    hourLv: {}, bestBurst: null, crowdMax: null, ready: [], approval: false, firstGrad: w.stats.grads === 0,
    stuckMin: 0, marks: [],
  };
}
export function ledgerAdd(L: Ledger, w: World, ev: SimEvent[]): void {
  const hour = Math.floor(w.t / 60);
  for (const e of ev) {
    if (e.type === 'levelup') {
      const k = e.d + '@' + hour;
      L.hourLv[k] = (L.hourLv[k] || 0) + 1;
      if (!L.bestBurst || L.hourLv[k] > L.bestBurst.n) L.bestBurst = { d: e.d, n: L.hourLv[k] };
    } else if (e.type === 'ready') { if (!L.ready.includes(e.mon)) L.ready.push(e.mon); }
    else if (e.type === 'approval') L.approval = true;
    else if (e.type === 'mark') L.marks.push({ pct: e.pct, reward: e.reward });
  }
  const busy: Record<string, number> = {};
  let entrance = false;
  for (const a of w.advs) {
    if (a.st === 'busy' && a.near) busy[a.near] = (busy[a.near] || 0) + 1;
    if (a.st === 'search' && a.lv === 1 && !a.seen) entrance = true;
  }
  if (entrance) L.stuckMin++;
  for (const d in busy) if (!L.crowdMax || busy[d] > L.crowdMax.n) L.crowdMax = { d, n: busy[d] };
}
export interface Report {
  minutes: number; happy: number; happyDelta: number; levelups: number; grads: number; firstGrad: boolean;
  smile: number; bestBurst: Ledger['bestBurst']; crowdMax: Ledger['crowdMax']; ready: number[];
  king: { id: number; n: number } | null; approval: boolean; entranceMin: number;
  marks: Ledger['marks'];
}
export function ledgerReport(L: Ledger, w: World): Report {
  const king = w.monsters
    .map(m => ({ m, n: m.work - (L.work0[m.id] || 0) }))
    .sort((a, b) => b.n - a.n)[0];
  return {
    minutes: w.t - L.t0,
    happy: happyCount(w), happyDelta: happyCount(w) - L.happy0,
    levelups: w.stats.levelups - L.lv0,
    grads: w.stats.grads - L.grad0, firstGrad: L.firstGrad && w.stats.grads > 0,
    smile: Math.round(w.smile - L.smile0),
    bestBurst: L.bestBurst, crowdMax: L.crowdMax,
    ready: L.ready.filter(id => { const m = w.monsters.find(x => x.id === id); return !!m && canEvolve(m); }),
    king: king && king.n >= 1 ? { id: king.m.id, n: Math.round(king.n) } : null,
    approval: w.approvalReady,
    entranceMin: L.stuckMin,
    marks: L.marks,
  };
}

// ── 매니저 행동 ─────────────────────────────────────────────
export type Result<T = object> = ({ ok: true } & T) | { ok: false; msg: string; short?: number };
const ok = <T extends object>(extra: T): Result<T> => Object.assign({ ok: true as const }, extra);
const no = (msg: string, extra: { short?: number } = {}): { ok: false; msg: string; short?: number } => ({ ok: false, msg, ...extra });
const fmtN = (n: number) => Math.ceil(n).toLocaleString('ko-KR');

export const hireCost = (sp: SpeciesId) => 100 * SPECIES[sp].base;
export const plotCost = (id: PlotId) => RULES.plotCost * plotInfo(id).region;
export const canHireSpecies = (w: World, sp: SpeciesId) => SPECIES[sp].chapter > 0 && SPECIES[sp].chapter <= w.chapter;
export const hasHireTicket = (w: World, sp: SpeciesId) => w.tickets.hire.includes(sp);

export function hire(w: World, sp: SpeciesId, into?: PlotId | null): Result<{ mon: Monster; cost: number; free: boolean }> {
  if (!canHireSpecies(w, sp)) return no('아직 채용할 수 없어요');
  const direct = !!into && w.plots[into] && w.plots[into].open && monsIn(w, into).length < w.dungeons[into].slots;
  if (!direct && tray(w).length >= TRAY_MAX) return no('대기실이 꽉 찼어요');
  const free = hasHireTicket(w, sp), cost = hireCost(sp);
  if (!free && w.smile < cost) return no(`스마일 ${fmtN(cost - w.smile)} 모자라요`, { short: cost - w.smile });
  if (free) w.tickets.hire.splice(w.tickets.hire.indexOf(sp), 1); else w.smile -= cost;
  const m = addMonster(w, sp, null);
  return ok({ mon: m, cost: free ? 0 : cost, free });
}
export function unhire(w: World, monId: number, refund: number | 'ticket'): void {
  const i = w.monsters.findIndex(m => m.id === monId);
  if (i < 0) return;
  const m = w.monsters[i];
  w.monsters.splice(i, 1);
  if (refund === 'ticket') w.tickets.hire.push(m.sp); else w.smile += refund || 0;
}

export const RULES_RELEASE = () => RULES.releaseRefund > 0;
export const RULES_GRAD = () => RULES.smileGrad;
/** 퇴사 환급: 채용비의 절반 (v1.2). 진화한 직원도 1단계 채용비 기준 */
export const releaseRefund = (m: Monster) => Math.floor(hireCost(m.sp) * RULES.releaseRefund);
export function release(w: World, monId: number): Result<{ refund: number; mon: Monster; idx: number }> {
  const i = w.monsters.findIndex(m => m.id === monId);
  if (i < 0) return no('없는 직원');
  const m = w.monsters[i];
  if (m.vet) return no('고참은 회사의 얼굴이에요');
  if (m.sp === 'balrog') return no('발록 씨는 퇴사하지 않아요');
  if (!RULES.releaseRefund) return no('퇴사는 아직 없어요');
  const refund = releaseRefund(m);
  w.monsters.splice(i, 1);
  w.smile += refund;
  return ok({ refund, mon: m, idx: i });
}
export function unrelease(w: World, m: Monster, idx: number, refund: number): void {
  w.monsters.splice(Math.min(idx, w.monsters.length), 0, m);
  w.smile -= refund;
}

export function placeCheck(w: World, m: Monster, did: PlotId | null): Result<{ openCost?: number }> {
  if (!did) return tray(w).length >= TRAY_MAX && m.d ? no('대기실이 꽉 찼어요') : ok({});
  const p = w.plots[did];
  if (!p) return no('아직 열리지 않은 부지예요');
  const d = w.dungeons[did];
  const inD = monsIn(w, did).filter(x => x.id !== m.id);
  if (inD.length >= d.slots) return no('직원 자리가 꽉 찼어요');
  if (isBoss(m) && inD.some(isBoss)) return no('보스는 던전에 한 마리만');
  if (!p.open) {
    const cost = plotCost(did);
    if (w.smile < cost) return no(`개업 비용 스마일 ${cost.toLocaleString('ko-KR')}이 필요해요`, { short: cost - w.smile });
    return ok({ openCost: cost });
  }
  return ok({});
}
export function place(w: World, monId: number, did: PlotId | null): Result<{ from: PlotId | null; openCost: number; same?: boolean }> {
  const m = w.monsters.find(x => x.id === monId);
  if (!m) return no('없는 직원');
  if (m.d === did) return ok({ from: m.d, openCost: 0, same: true });
  const c = placeCheck(w, m, did);
  if (!c.ok) return c;
  if (c.openCost && did) { w.smile -= c.openCost; w.plots[did].open = true; }
  const from = m.d;
  m.d = did;
  return ok({ from, openCost: c.openCost || 0 });
}
/**
 * 놓기 판정 + 필요한 구매까지: 빈 부지면 개업, 직원 자리가 꽉 찼으면 자리 +1을 같이 산다.
 * v1.1은 꽉 찬 던전에 놓을 수 없어 "채용 → 둘 곳 없음"의 막다른 길이 생겼다.
 */
export function placeCheckAuto(w: World, m: Monster, did: PlotId | null): Result<{ openCost?: number; slotCost?: number }> {
  const c = placeCheck(w, m, did);
  if (c.ok || !did || c.msg !== '직원 자리가 꽉 찼어요') return c;
  const d = w.dungeons[did];
  const sc = slotCost(w, d);
  if (sc == null) return no('직원 자리가 꽉 찼어요 (최대 5)');
  const open = w.plots[did].open ? 0 : plotCost(did);
  if (w.smile < sc + open) return no(`직원 자리 +1에 스마일 ${fmtN(sc + open - w.smile)} 모자라요`, { short: sc + open - w.smile });
  const inD = monsIn(w, did).filter(x => x.id !== m.id);
  if (isBoss(m) && inD.some(isBoss)) return no('보스는 던전에 한 마리만');
  return ok({ slotCost: sc, openCost: open || undefined });
}
export function placeAuto(w: World, monId: number, did: PlotId | null): Result<{ from: PlotId | null; openCost: number; slotCost: number; same?: boolean }> {
  const m = w.monsters.find(x => x.id === monId);
  if (!m) return no('없는 직원');
  if (m.d === did) return ok({ from: m.d, openCost: 0, slotCost: 0, same: true });
  const c = placeCheckAuto(w, m, did);
  if (!c.ok) return c;
  if (c.slotCost && did) { const r = slotUp(w, did); if (!r.ok) return r; }
  const r = place(w, monId, did);
  if (!r.ok) { if (c.slotCost && did) slotDown(w, did, c.slotCost); return r; }
  return ok({ from: r.from, openCost: r.openCost, slotCost: c.slotCost || 0 });
}

/** 개업 되돌리기: 그 부지에 놓은 직원은 모두 대기실로, 옮겨 온 직원은 제자리로 */
export function unopen(w: World, did: PlotId, monId: number, from: PlotId | null, cost: number): void {
  for (const x of monsIn(w, did)) x.d = x.id === monId ? from : null;
  w.plots[did].open = false;
  w.smile += cost;
}

export function evolveBlock(w: World, m: Monster): string | null {
  if (!canEvolve(m)) return '아직 진화할 수 없어요';
  const next = m.stage + 1;
  if (m.d && SPECIES[m.sp].boss && next === maxStage(m) && monsIn(w, m.d).some(x => x.id !== m.id && isBoss(x)))
    return '보스는 던전에 한 마리만 — 다른 던전으로 옮긴 뒤 진화해요';
  return null;
}
export function evolve(w: World, monId: number): Result<{ mon: Monster; from: number; isNew: boolean; tenureBefore: number }> {
  const m = w.monsters.find(x => x.id === monId);
  if (!m) return no('없는 직원');
  const why = evolveBlock(w, m);
  if (why) return no(why);
  const from = m.stage, tenureBefore = m.tenure;
  const need = evolveNeed(m);
  m.stage++;
  // v1.2: 남은 근속을 이월한다 — 보류해도 손해가 없다
  m.tenure = RULES.tenureCarry ? Math.max(0, m.tenure - need) : 0;
  w.stats.evolves++;
  const key = m.sp + ':' + m.stage, isNew = !w.dex[key];
  w.dex[key] = true;
  return ok({ mon: m, from, isNew, tenureBefore });
}
/** 진화 되돌리기 (5초 토스트). 도감 칸은 남긴다 — 한 번 본 모습은 본 것이다 */
export function unevolve(w: World, monId: number, from: number, tenureBefore: number): void {
  const m = w.monsters.find(x => x.id === monId);
  if (!m) return;
  m.stage = from; m.tenure = tenureBefore; w.stats.evolves--;
}

export const eventCost = (w: World, did: PlotId) => { const D = levelsOf(w)[did]; return D ? 30 * D : 0; };
export function startEvent(w: World, did: PlotId, kind: 'exp' | 'drop'): Result<{ cost: number; free: boolean }> {
  const d = w.dungeons[did], D = levelsOf(w)[did];
  if (!D) return no('직원이 없는 던전이에요');
  if (d.event) return no('이미 이벤트 중이에요');
  if (activeEvents(w) >= maxEvents(w)) return no(`이벤트는 동시에 ${maxEvents(w)}개까지`);
  const free = w.tickets.event > 0, cost = free ? 0 : 30 * D;
  if (w.smile < cost) return no(`스마일 ${fmtN(cost - w.smile)} 모자라요`, { short: cost - w.smile });
  if (free) w.tickets.event--; else w.smile -= cost;
  d.event = { kind, end: w.t + EVENT_MIN, start: w.t };
  return ok({ cost, free });
}
export function cancelEvent(w: World, did: PlotId, refund: number, wasFree: boolean): void {
  const d = w.dungeons[did];
  if (!d.event) return;
  d.event = null;
  if (wasFree) w.tickets.event++; else w.smile += refund;
}

export const seatCost = (w: World, d: Dungeon) => (d.seatUp < RULES.seatCost.length ? Math.round(RULES.seatCost[d.seatUp] * costScale(w)) : null);
export function seatUp(w: World, did: PlotId): Result<{ cost: number }> {
  const d = w.dungeons[did], c = seatCost(w, d);
  if (c == null) return no('자리는 20석이 최대예요');
  if (w.smile < c) return no(`스마일 ${fmtN(c - w.smile)} 모자라요`, { short: c - w.smile });
  w.smile -= c; d.seatUp++; d.seats += SEAT_STEP;
  return ok({ cost: c });
}
export function seatDown(w: World, did: PlotId, refund: number): void { const d = w.dungeons[did]; d.seatUp--; d.seats -= SEAT_STEP; w.smile += refund; }
export const slotCost = (w: World, d: Dungeon) => (d.slotUp < RULES.slotCost.length ? Math.round(RULES.slotCost[d.slotUp] * costScale(w)) : null);
export function slotUp(w: World, did: PlotId): Result<{ cost: number }> {
  const d = w.dungeons[did], c = slotCost(w, d);
  if (c == null) return no('직원 자리는 5개가 최대예요');
  if (w.smile < c) return no(`스마일 ${fmtN(c - w.smile)} 모자라요`, { short: c - w.smile });
  w.smile -= c; d.slotUp++; d.slots++;
  return ok({ cost: c });
}
export function slotDown(w: World, did: PlotId, refund: number): void { const d = w.dungeons[did]; d.slotUp--; d.slots--; w.smile += refund; }
/** 자리·슬롯 비용은 챕터가 오를수록 오른다 (v1.2, 후반 스마일 과잉 D1) */
export const costScale = (w: World) => RULES.costCurve[w.chapter - 1];

export function approve(w: World): Result<{ chapter: number; ending: boolean }> {
  if (!w.approvalReady) return no('아직 조건을 채우지 못했어요');
  w.approvalReady = false;
  w.stars++;
  if (w.chapter >= CHAPTERS.length) { w.ended = true; w.endedAt = w.t; return ok({ chapter: w.chapter, ending: true }); }
  w.chapter++;
  w.chapterAt[w.chapter - 1] = w.t;
  w.cjoy = 0;
  w.marks = [];
  unlockPlots(w, w.chapter);
  // 5장 결재 서류에는 주니어 발록 입사 지원서가 붙어 온다
  if (w.chapter === 5 && !w.monsters.some(m => m.sp === 'balrog')) addMonster(w, 'balrog', null);
  return ok({ chapter: w.chapter, ending: false });
}

// ── 미리보기와 추천 ─────────────────────────────────────────
export interface Preview {
  before: Record<PlotId, number>; after: Record<PlotId, number>;
  lost: Seg[]; gained: Seg[]; stranded: number; rescued: number; gapsAfter: Seg[];
  entranceBlocked: boolean;
}
/** 변화 전후 비교: 새로 생기는 빈틈, 갈 곳을 잃는 모험가 수 */
export function preview(w: World, mods: Mods): Preview {
  const before = levelsOf(w), after = levelsOf(w, mods);
  const cb = coveredSet(before), ca = coveredSet(after), end = roadEnd(w);
  const lost: number[] = [], gained: number[] = [];
  for (let L = 1; L <= end; L++) {
    if (cb[L] && !ca[L]) lost.push(L);
    if (!cb[L] && ca[L]) gained.push(L);
  }
  const lostSet = new Set(lost), gainedSet = new Set(gained);
  const stranded = w.advs.filter(a => a.lv < end && lostSet.has(a.lv)).length;
  const rescued = w.advs.filter(a => a.st === 'search' && gainedSet.has(a.lv)).length;
  return { before, after, lost: toSegs(lost), gained: toSegs(gained), stranded, rescued, gapsAfter: gapSegments(w, after), entranceBlocked: !ca[1] };
}
export function toSegs(list: number[]): Seg[] {
  const segs: Seg[] = [];
  for (const L of list) {
    const s = segs[segs.length - 1];
    if (s && s[1] === L - 1) s[1] = L; else segs.push([L, L]);
  }
  return segs;
}

/** 직원을 놓을 최선의 곳들 (빈틈이 가장 적어지는 곳) */
export function bestPlaces(w: World, monId: number): PlotId[] {
  const m = w.monsters.find(x => x.id === monId);
  if (!m) return [];
  const opts: { id: PlotId; gapN: number; cost: number }[] = [];
  for (const id in w.plots) {
    if (m.d === id) continue;
    const c = placeCheckAuto(w, m, id);
    if (!c.ok) continue;
    const mods: Mods = { move: { id: m.id, to: id } };
    if (!w.plots[id].open) mods.open = id;
    const gapN = gapSize(gapSegments(w, levelsOf(w, mods)));
    opts.push({ id, gapN, cost: (c.openCost || 0) + (c.slotCost || 0) });
  }
  if (!opts.length) return [];
  opts.sort((a, b) => a.gapN - b.gapN || a.cost - b.cost);
  const best = opts[0].gapN;
  const cur = gapSize(gapSegments(w));
  // 5장 결재 ③: 슬리피우드 식구는 빈 부지에 혼자 두면 기존 길을 흔들지 않는다
  if (needsNative(w) && !hasNativeDungeon(w) && isNative(m.sp)) {
    const empty = opts.filter(o => !monsIn(w, o.id).length && o.gapN <= cur).sort((a, b) => a.cost - b.cost);
    if (empty.length) return empty.filter(o => o.cost === empty[0].cost).map(o => o.id);
    // 빈 부지가 없으면: 길을 끊지 않는 던전 가운데 가장 싼 곳
    const safe = opts.filter(o => o.gapN <= cur).sort((a, b) => a.cost - b.cost);
    if (safe.length) return [safe[0].id];
  }
  return best < cur ? opts.filter(o => o.gapN === best && o.cost === opts[0].cost).map(o => o.id) : [];
}

/** 첫 빈틈(막힌 사람이 있는 곳 먼저)을 메울 수 있는 계열 */
export function recommendSpecies(w: World, seg?: Seg): SpeciesId | null {
  const segs = gapSegments(w);
  const g = seg || hotGap(w) || segs[0];
  if (!g) return null;
  const mid = (g[0] + g[1]) / 2;
  let best: { sp: SpeciesId; dist: number } | null = null;
  for (const sp of Object.keys(SPECIES) as SpeciesId[]) {
    if (!canHireSpecies(w, sp)) continue;
    const s = SPECIES[sp];
    // 구간 앞머리를 덮는지가 먼저, 그다음 가운데와 가까운 것
    const covers = g[0] >= s.base - 5 && g[0] <= s.base + 5;
    const dist = (covers ? 0 : 100) + Math.abs(s.base - mid);
    if (!best || dist < best.dist) best = { sp, dist };
  }
  return best && best.dist < 100 ? best.sp : null;
}
/**
 * 채용으로는 닿지 않는 빈틈(주로 길 끝)을 "키워서" 메우는 계열.
 * 진화 k번이면 빈틈 앞머리를 덮는 계열 가운데 근속이 가장 적게 드는 것.
 */
export interface GrowHint { sp: SpeciesId; stage: number; lv: number; tenure: number }
export function recommendGrow(w: World, seg?: Seg): GrowHint | null {
  const g = seg || gapSegments(w).find(s => !recommendSpecies(w, s)) || null;
  if (!g) return null;
  let best: GrowHint | null = null;
  for (const sp of Object.keys(SPECIES) as SpeciesId[]) {
    if (!canHireSpecies(w, sp)) continue;
    const s = SPECIES[sp];
    let tenure = 0;
    for (let k = 1; k < s.names.length; k++) {
      tenure += RULES.evolveNeed[k - 1];
      const lv = s.base + 8 * k;
      if (g[0] >= lv - 5 && g[0] <= lv + 5) {
        if (!best || tenure < best.tenure || (tenure === best.tenure && lv > best.lv)) best = { sp, stage: k, lv, tenure };
        break;
      }
    }
  }
  return best;
}
/**
 * 이미 그 빈틈을 향해 크고 있는 직원이 있는가.
 * "진화하면 이어진다"는 약속은 실제로 지켜질 때만 한다: 그 직원이 진화한 뒤(그냥 진화든 발령이든)
 * 빈틈 전체가 덮이는지 미리보기로 확인한다. 평균에 섞여 닿지 못하면 크고 있는 것이 아니다.
 */
export function growingToward(w: World, seg: Seg): Monster | null {
  let best: Monster | null = null, bestLeft = Infinity;
  for (const m of w.monsters) {
    if (!m.d || m.stage >= maxStage(m) || m.sp === 'balrog') continue;
    const lv = monLevel(m) + 8;
    if (seg[0] < lv - 5 || seg[0] > lv + 5) continue;
    const all = (c: Uint8Array) => { for (let L = seg[0]; L <= seg[1]; L++) if (!c[L]) return false; return true; };
    const covers = all(coveredSet(levelsOf(w, { evolve: m.id }))) ||
      (RULES.promote && promotePlans({ ...w, smile: Infinity }, m.id).some(p => all(coveredSet(p.pv.after))));
    if (!covers) continue;
    const left = evolveNeed(m) - m.tenure;
    if (left < bestLeft) { bestLeft = left; best = m; }
  }
  return best;
}

/** 막힌 사람이 가장 많은 빈틈 */
export function hotGap(w: World): Seg | null {
  let best: Seg | null = null, bn = 0;
  for (const g of gapSegments(w)) {
    const n = w.advs.filter(a => a.st === 'search' && a.lv >= g[0] && a.lv <= g[1]).length;
    if (n > bn) { bn = n; best = g; }
  }
  return best;
}

export type Badge =
  | { kind: 'gap'; seg: Seg; n: number }
  | { kind: 'busy'; d: PlotId; n: number }
  /** safe: 지금 해도 빈틈이 늘지 않는다(그냥 진화나 승진 발령으로). shown: 월드 위 ▲로 띄운다(안전한 것 중 최대 3) */
  | { kind: 'evolve'; mon: number; d: PlotId | null; safe: boolean; shown: boolean };

/**
 * 진화 배지 고르기 (v1.3, 플레이 리뷰 F3). ▲가 "근속이 찼다"만 말하면 후반에 14개씩 쌓여 무시하는 배지가 된다.
 * 지금 해도 되는 진화만 월드 위에 띄운다: 빈틈을 줄이는 것 → 오래 기다린 것 순으로 최대 3개.
 * 미리보기를 여러 번 계산하므로 월드 1분·직원 배치가 같으면 다시 계산하지 않는다.
 */
export const EVOLVE_SHOWN = 3;
export interface EvoPick { mon: number; safe: boolean; shown: boolean; rank: number }
let evoMemo: { w: World; key: string; out: Map<number, EvoPick> } | null = null;
export function evolvePicks(w: World): Map<number, EvoPick> {
  const ready = w.monsters.filter(canEvolve);
  const key = `${Math.floor(w.t)}|${w.chapter}|${Math.floor(w.smile / 100)}|${w.tickets.hire.join(',')}${w.tickets.plot}|` +
    Object.keys(w.plots).filter(id => w.plots[id].open).join(',') + '|' + w.monsters.map(m => `${m.id}.${m.stage}.${m.d}.${canEvolve(m) ? 1 : 0}`).join(',');
  if (evoMemo && evoMemo.w === w && evoMemo.key === key) return evoMemo.out;
  const cur = gapSize(gapSegments(w));
  const list: (EvoPick & { over: number })[] = [];
  for (const m of ready) {
    const over = m.tenure - evolveNeed(m);
    if (evolveBlock(w, m)) { list.push({ mon: m.id, safe: false, shown: false, rank: 9, over }); continue; }
    const pv = preview(w, { evolve: m.id });
    if (!pv.lost.length) { list.push({ mon: m.id, safe: true, shown: false, rank: pv.gained.length ? 0 : 1, over }); continue; }
    const plan = RULES.promote ? bestPromote(w, m.id) : null;
    if (plan && plan.gapAfter <= cur) list.push({ mon: m.id, safe: true, shown: false, rank: plan.gapAfter < cur ? 0 : 1, over });
    else list.push({ mon: m.id, safe: false, shown: false, rank: 9, over });
  }
  list.sort((a, b) => a.rank - b.rank || b.over - a.over);
  list.filter(x => x.safe).slice(0, EVOLVE_SHOWN).forEach(x => (x.shown = true));
  const out = new Map(list.map(({ over: _o, ...x }) => [x.mon, x]));
  evoMemo = { w, key, out };
  return out;
}
export function badges(w: World): Badge[] {
  const out: Badge[] = [];
  for (const g of gapSegments(w)) {
    const n = w.advs.filter(a => a.st === 'search' && a.lv >= g[0] && a.lv <= g[1]).length;
    out.push({ kind: 'gap', seg: g, n });
  }
  const busy: Record<string, number> = {};
  for (const a of w.advs) if (a.st === 'busy' && a.near) busy[a.near] = (busy[a.near] || 0) + 1;
  for (const d in busy) out.push({ kind: 'busy', d, n: busy[d] });
  const picks = evolvePicks(w);
  for (const m of w.monsters) if (canEvolve(m)) { const p = picks.get(m.id); out.push({ kind: 'evolve', mon: m.id, d: m.d, safe: !!p?.safe, shown: !!p?.shown }); }
  return out;
}

// ── 승진 발령 (v1.2) ────────────────────────────────────────
/**
 * 진화하면 그 던전의 레벨이 올라 아래가 빈다. v1.1은 "신입을 같은 던전에 두라"고 권했는데,
 * 던전 레벨은 평균이라 섞을수록 모든 던전이 중간 레벨로 뭉개지고 결국 입구를 맡을 던전이 사라진다.
 * 승진 발령은 진화한 직원을 새 레벨에 맞는 던전으로 보내고, 빈자리에 신입을 앉힌다. 한 번에, 결과를 먼저 보여 주고.
 */
export interface PromotePlan {
  mon: number; to: PlotId | null; stay: boolean;
  hireSp: SpeciesId | null; hireInto: PlotId | null;
  cost: number; openCost: number; hire: number;
  pv: Preview; gapAfter: number;
}
export function promotePlans(w: World, monId: number): PromotePlan[] {
  const m = w.monsters.find(x => x.id === monId);
  if (!m || evolveBlock(w, m)) return [];
  const home = m.d;
  const plans: PromotePlan[] = [];
  const newLv = monLevel(m) + 8;
  const hires: (SpeciesId | null)[] = [null, ...(Object.keys(SPECIES) as SpeciesId[]).filter(sp => canHireSpecies(w, sp))];
  const dests: (PlotId | null)[] = [home, ...Object.keys(w.plots).filter(id => id !== home)];
  for (const to of dests) {
    const stay = to === home;
    let openCost = 0;
    if (!stay && to) {
      const inD = monsIn(w, to);
      if (inD.length >= w.dungeons[to].slots) continue;
      if (isBoss({ ...m, stage: m.stage + 1 }) && inD.some(isBoss)) continue;
      if (!w.plots[to].open) openCost = plotCost(to);
      // 새 레벨에서 너무 먼 던전으로는 보내지 않는다 (보내 봐야 섞여서 뭉개진다)
      const D = levelsOf(w)[to];
      if (D && Math.abs(D - newLv) > 8) continue;
    }
    for (const sp of hires) {
      if (sp && !home) continue;
      if (sp && stay && monsIn(w, home!).length >= w.dungeons[home!].slots) continue;
      const hire = sp ? (hasHireTicket(w, sp) ? 0 : hireCost(sp)) : 0;
      const cost = hire + openCost;
      if (cost > w.smile) continue;
      if (!sp && stay) continue; // 그냥 진화와 같다
      const mods: Mods = { evolve: m.id, move: { id: m.id, to }, open: openCost ? (to as PlotId) : undefined, add: sp ? { sp, to: home as PlotId } : undefined };
      const pv = preview(w, mods);
      plans.push({ mon: m.id, to, stay, hireSp: sp, hireInto: sp ? home : null, cost, openCost, hire, pv, gapAfter: gapSize(pv.gapsAfter) });
    }
  }
  plans.sort((a, b) => a.gapAfter - b.gapAfter || a.pv.lost.length - b.pv.lost.length || a.cost - b.cost);
  return plans;
}
/** 그냥 진화보다 빈틈이 줄어드는 가장 좋은 발령 (없으면 null) */
export function bestPromote(w: World, monId: number): PromotePlan | null {
  if (!RULES.promote) return null;
  const plain = preview(w, { evolve: monId });
  const plainGap = gapSize(plain.gapsAfter);
  const best = promotePlans(w, monId)[0];
  if (!best) return null;
  if (best.gapAfter < plainGap || (best.gapAfter === plainGap && best.pv.lost.length < plain.lost.length)) return best;
  return null;
}
export function promote(w: World, plan: PromotePlan): Result<{ evo: { mon: Monster; from: number; isNew: boolean; tenureBefore: number }; from: PlotId | null; hired: Monster | null; hireCost: number; openCost: number; hiredFree: boolean }> {
  const m = w.monsters.find(x => x.id === plan.mon);
  if (!m) return no('없는 직원');
  if (plan.cost > w.smile) return no(`스마일 ${fmtN(plan.cost - w.smile)} 모자라요`, { short: plan.cost - w.smile });
  const from = m.d;
  const evo = evolve(w, m.id);
  if (!evo.ok) return evo;
  if (!plan.stay) {
    const r = place(w, m.id, plan.to);
    if (!r.ok) { unevolve(w, m.id, evo.from, evo.tenureBefore); return r; }
  }
  let hired: Monster | null = null, hiredFree = false;
  if (plan.hireSp && plan.hireInto) {
    const h = hire(w, plan.hireSp, plan.hireInto);
    if (h.ok) { hired = h.mon; hiredFree = h.free; place(w, h.mon.id, plan.hireInto); }
  }
  return ok({ evo, from, hired, hireCost: hired && !hiredFree ? hireCost(plan.hireSp!) : 0, openCost: plan.openCost, hiredFree });
}
/** 승진 발령 되돌리기 */
export function unpromote(w: World, plan: PromotePlan, r: { evo: { from: number; tenureBefore: number }; from: PlotId | null; hired: Monster | null; hireCost: number; openCost: number; hiredFree: boolean }): void {
  if (r.hired) unhire(w, r.hired.id, r.hiredFree ? 'ticket' : r.hireCost);
  const m = w.monsters.find(x => x.id === plan.mon);
  if (!m) return;
  if (!plan.stay) {
    if (r.openCost && plan.to) { for (const x of monsIn(w, plan.to)) if (x.id !== m.id) x.d = null; w.plots[plan.to].open = false; w.smile += r.openCost; }
    m.d = r.from;
  }
  unevolve(w, m.id, r.evo.from, r.evo.tenureBefore);
}

/** 완전 클리어 진척 */
export function fullClear(w: World) {
  const starred = PLOTS.filter(p => w.dungeons[p.id] && dungeonStars(w.dungeons[p.id]) >= 3).length;
  return { ending: w.ended, starred, plots: PLOTS.length, dex: dexCount(w) };
}

/**
 * 옛 세이브를 지금 모양으로 올린다. 버리지 않는다.
 * v2 → v3: 입사 선물(tut.ticket·freeEvent)을 무료권(tickets)으로 옮기고, 눈금·엘리트·필드 보스 칸을 채운다.
 */
export function migrate(x: unknown): unknown {
  const w = x as Record<string, unknown> & { v?: number; tut?: Record<string, unknown> };
  if (!w || typeof w !== 'object') return x;
  if (w.v === 2) {
    const tut = w.tut || {};
    w.tickets = { hire: tut.ticket ? [tut.ticket] : [], event: (tut.freeEvent as number) || 0, plot: 0 };
    delete tut.ticket; delete tut.freeEvent;
    w.marks = [];
    w.v = 3;
  }
  return w;
}

/** 세이브 불러오기 전에 모양을 확인한다 */
export function isWorld(x: unknown): x is World {
  const w = x as World;
  return !!w && typeof w === 'object' && w.v === SAVE_VERSION && Array.isArray(w.monsters) && Array.isArray(w.advs) && typeof w.t === 'number';
}
