/*
 * MSW 주식회사 — 월드 시뮬레이션 (규칙 R1~R5, spec.md §2)
 *
 * 화면과 분리된 순수 로직이다. 브라우저와 Node(점검 스크립트)가 같은 코드를 쓴다.
 * 서버 시간 모델: 화면이 켜져 있든 아니든 같은 step()으로 월드를 굴린다.
 * 단위: 시간은 월드 분(minute). step(w, dt)는 dt분만큼 진행한다.
 */
import { CHAPTERS, PLOTS, SPECIES, FIELD_BOSSES, plotInfo, fieldBoss, bossDexKey, type PlotId, type SpeciesId } from './content';
export { homesOf } from './content';
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
export interface Tickets { hire: SpeciesId[]; event: number; plot: number; /** 모객권 (v1.7). 옛 세이브에는 없다 */ recruit?: number }
export interface Elite { d: PlotId; mon: number; until: number }
export interface Boss { ch: number; at: number; d: PlotId | null; kills: number; until: number | null }
export type MarkReward = { kind: 'hire'; sp: SpeciesId } | { kind: 'event'; n: number } | { kind: 'boss' };
/** 드랍 상자 (v1.6): 던전 앞에 떨어져 열 때까지 기다린다 */
export interface Box { id: number; d: PlotId; at: number }
export type BoxReward = { kind: 'hire'; sp: SpeciesId } | { kind: 'event' };
/** 모객 이벤트 (v1.7): 신규(입구 ×x) 또는 복귀(풀에서 돌아옴). 월드에 하나 */
export type RecruitKind = 'fresh' | 'return';
export interface Recruit { kind: RecruitKind; start: number; end: number; acc: number }
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
  tut: { buffUntil: number; instant: number; script?: TutParty[] };
  /** 무료권: 채용권(계열), 이벤트권, 개업권 — 입사 선물과 결재 막대 눈금 보상 (v1.3) */
  tickets: Tickets;
  /** 이번 장에서 받은 ② 막대 눈금 보상 (v1.3). 길이 = 지난 눈금 수 */
  marks: MarkReward[];
  /** 엘리트 (v1.3): 지금 들뜬 던전 하나. eliteAcc = 지난 엘리트 뒤 월드 퇴근, eliteBy = 던전별 */
  elite: Elite | null; eliteAcc: number; eliteBy: Record<PlotId, number>;
  /** 필드 보스 (v1.3): 찾아온 손님 하나 (d가 null이면 초대 기다림). bossDone = 토벌한 장 */
  boss: Boss | null; bossDone: number[];
  stats: { arrivals: number; levelups: number; grads: number; left: { entrance: number; search: number; busy: number }; evolves: number; elites: number; bosses: number; /** 돌아온 손님 (v1.7) */ returned?: number };
  /** 이번 장 누적 즐거움 (명·시간) — 결재 조건 ② (v1.2) */
  cjoy: number;
  /** 챕터가 열린 월드 시각 (리포트·점검용) */
  chapterAt: number[];
  /** 구간 개방 (v1.4): 이번 장에서 연 구간(0부터), 다음 구간까지 쌓인 퇴근. 없으면 장 전체가 열려 있다(옛 세이브) */
  zone?: number; zoneAcc?: number;
  /** 드랍 상자 (v1.6): 떨어져 있는 상자, 지난 상자 뒤 월드 퇴근(드랍 이벤트 ×2), 던전별. 없으면 규칙에 상자가 없다(옛 세이브는 첫 걸음에 채운다) */
  boxes?: Box[]; boxAcc?: number; boxBy?: Record<PlotId, number>; nextBox?: number;
  /** 도감 운영 기록 (v1.7): 계열마다 일한 사냥터, 퇴근왕 횟수, 단계마다 처음 진화한 월드 시각. 없어도 되는 칸(옛 세이브는 비어 있다) */
  rec?: Record<string, SpRecord>;
  /** 모객 (v1.7): 떠난 손님 풀(레벨별 인원, 1~100)과 지금 걸린 모객 이벤트. 없어도 되는 칸(옛 세이브는 첫 걸음에 채운다) */
  pool?: number[]; recruit?: Recruit | null;
}
/** 계열 하나의 운영 기록 (v1.7). plots는 일한 사냥터(순서대로), kings는 밤사이 퇴근왕 횟수, at은 단계별 첫 진화 시각(월드 분, 1단계는 첫 채용) */
export interface SpRecord { plots: PlotId[]; kings: number; at: (number | null)[] }
/** 대본 도착 (v1.4): at분에 이 레벨·진행도의 모험가가 함께 온다. 첫 레벨업과 첫 빈틈을 배속 없이 제시간에 */
export interface TutParty { at: number; lv: number[]; prog: number[] }
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
  | { type: 'mark'; pct: number; reward: MarkReward }
  | { type: 'elite'; d: PlotId; mon: number }
  | { type: 'eliteEnd'; d: PlotId }
  | { type: 'bossCall'; ch: number }
  | { type: 'bossIn'; ch: number; d: PlotId; auto: boolean }
  | { type: 'bossDown'; ch: number; d: PlotId | null; bonus: number }
  | { type: 'zone'; ch: number; from: number; to: number }
  | { type: 'box'; id: number; d: PlotId }
  /** 돌아온 손님 (v1.7 모객) */
  | { type: 'return'; id: number; lv: number }
  | { type: 'recruitEnd'; kind: RecruitKind };

export const SAVE_VERSION = 3;
/** v1.3까지의 기본 자리. 지금 값은 RULES.seatBase */
export const SEAT_BASE = 8, SEAT_STEP = 4;
export const SLOT_BASE = 3;
export const EVENT_MIN = 240;
export const TRAY_MAX = 10;
export const BUFF_X = 30;
/** 고참의 첫 근속: 첫 진화 근속의 80% */
export const VET_SHARE = 0.8;
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
    tut: RULES.arrive ? { buffUntil: RULES.buffMin, instant: 0, script: TUT_PARTIES.map(p => ({ ...p, lv: [...p.lv], prog: [...p.prog] })) } : { buffUntil: RULES.buffMin, instant: 3 },
    tickets: { hire: ['mush'], event: 1, plot: RULES.firstLoop ? 1 : 0 }, marks: [],
    elite: null, eliteAcc: 0, eliteBy: {}, boss: null, bossDone: [],
    stats: { arrivals: 0, levelups: 0, grads: 0, left: { entrance: 0, search: 0, busy: 0 }, evolves: 0, elites: 0, bosses: 0 },
    chapterAt: [0], cjoy: 0,
  };
  if (RULES.zones) { w.zone = 0; w.zoneAcc = 0; }
  if (RULES.drop) initBoxes(w);
  if (RULES.guests) initGuests(w);
  unlockPlots(w, 1);
  w.plots.h1.open = true;
  w.plots.h2.open = true; // 입사 선물: 두 번째 부지
  w.dungeons.h1.seats = plotSeats('h1') + SEAT_STEP; w.dungeons.h1.seatUp = 1; // 입사 선물: 들판 자리 +4 (v1.3 12석, v1.4 16석)
  addMonster(w, 'snail', 'h1', { tenure: Math.round(RULES.evolveNeed[0] * VET_SHARE), vet: true });
  addMonster(w, 'snail', 'h1');
  return w;
}

/**
 * 첫 파티 대본 (v1.4). 첫 파티는 레벨업 직전이라 0:25부터 빛기둥이 오르고, 0:36에 온 둘째 파티의 Lv 8이
 * 달팽이 발판(Lv 1–7) 너머에 멈춰 첫 빈틈이 된다. 배속 없이 v1.3과 같은 시각(첫 레벨업 0:25, 첫 빈틈 1:30 안)을 지킨다
 */
export const TUT_PARTIES: TutParty[] = [
  { at: 0, lv: [1, 1, 2], prog: [10.62, 10.3, 11.4] },
  { at: 0.6, lv: [8, 5, 3], prog: [0, 9, 6] },
];

/** 이 규칙에서 쓰는 부지 (v1.4 초반 사냥터 포함 여부) */
export const plotsInPlay = () => PLOTS.filter(p => !p.extra || RULES.morePlots);
/** 이 규칙에서 쓰는 계열인가 (v1.5 계열 사다리 포함 여부) */
export const spInPlay = (sp: SpeciesId) => !SPECIES[sp].extra || RULES.moreSpecies;
export const speciesInPlay = () => (Object.keys(SPECIES) as SpeciesId[]).filter(spInPlay);
/**
 * 도감 전체 칸 수: 직원 36(10계열 × 3단계 + 보스 5 + 발록) + 필드 보스 4 = 40.
 * v1.5 계열 사다리는 3단계 계열 4개로 +12 = 52
 */
export const dexTotal = () => speciesInPlay().reduce((n, sp) => n + SPECIES[sp].names.length, 0) + FIELD_BOSSES.length;
/** 계열이 사는 지역 (없으면 합류한 장) */
export const spRegion = (sp: SpeciesId) => SPECIES[sp].region ?? SPECIES[sp].chapter;
export const plotsOfRegion = (region: number) => plotsInPlay().filter(p => p.region === region).length;
function unlockPlots(w: World, region: number) {
  for (const p of plotsInPlay()) {
    if (p.region !== region) continue;
    if (!w.plots[p.id]) w.plots[p.id] = { open: false };
    if (!w.dungeons[p.id]) w.dungeons[p.id] = { id: p.id, slots: SLOT_BASE, seats: plotSeats(p.id), seatUp: 0, slotUp: 0, event: null, joy: 0, recentLv: 0 };
  }
}

export function addMonster(w: World, sp: SpeciesId, d: PlotId | null, opt: { tenure?: number; vet?: boolean } = {}): Monster {
  const m: Monster = { id: w.nextMon++, sp, stage: 0, tenure: opt.tenure || 0, work: 0, d, vet: !!opt.vet, no: 0 };
  m.no = w.monsters.filter(x => x.sp === sp).length + 1;
  w.monsters.push(m);
  w.dex[sp + ':0'] = true;
  recordStage(w, sp, 0);
  if (d) recordPlot(w, sp, d);
  return m;
}

// ── 사냥터 값 · 도감 운영 기록 (v1.7) ──────────────────────
/** 부지의 기본 자리: 규칙 grounds가 켜져 있으면 부지 값(8·12·16), 아니면 seatBase */
export const plotSeats = (id: PlotId) => (RULES.grounds ? plotInfo(id).seats : RULES.seatBase);
/** 이 직원이 자기 식구 사냥터에서 일하는가 (근속 ×homeX) */
export const atHome = (m: Monster) => !!RULES.grounds && !!m.d && plotInfo(m.d).home.includes(m.sp);
export const isHome = (sp: SpeciesId, id: PlotId) => !!RULES.grounds && plotInfo(id).home.includes(sp);
/** 계열의 운영 기록 (없으면 빈 기록). 화면은 읽기만 한다 */
export function recordOf(w: World, sp: SpeciesId): SpRecord {
  const r = (w.rec ||= {});
  return (r[sp] ||= { plots: [], kings: 0, at: [] });
}
function recordStage(w: World, sp: SpeciesId, stage: number) {
  const r = recordOf(w, sp);
  if (r.at[stage] == null) { while (r.at.length < stage) r.at.push(null); r.at[stage] = w.t; }
}
function recordPlot(w: World, sp: SpeciesId, id: PlotId) {
  const r = recordOf(w, sp);
  if (!r.plots.includes(id)) r.plots.push(id);
}
/** 출근 리포트를 보여 준 뒤 퇴근왕을 기록한다 (화면이 부르는 기록 행동. 봇 checkIn도 같은 것을 부른다) */
export function recordReport(w: World, rep: { king: { id: number; n: number } | null }): void {
  if (!rep.king) return;
  const m = w.monsters.find(x => x.id === rep.king!.id);
  if (m) recordOf(w, m.sp).kings++;
}

// ── 파생 값 ─────────────────────────────────────────────────
export const monLevel = (m: Monster) => SPECIES[m.sp].base + 8 * m.stage;
export const monName = (m: Monster) => SPECIES[m.sp].names[m.stage];
export const maxStage = (m: Monster) => SPECIES[m.sp].names.length - 1;
export const isBoss = (m: Monster) => SPECIES[m.sp].boss && m.stage === maxStage(m);
export const evolveNeed = (m: Monster) => (m.stage < maxStage(m) ? RULES.evolveNeed[m.stage] : Infinity);
export const canEvolve = (m: Monster) => m.stage < maxStage(m) && m.tenure >= evolveNeed(m);
/** 이번 장의 구간 끝 목록 (v1.4). 없으면 null */
export const zoneEnds = (w: World) => (RULES.zones && w.zone != null ? RULES.zones.ends[w.chapter - 1] : null);
/** 지금 길 끝: 구간 개방이 있으면 연 구간까지, 없으면 장 전체 */
export const roadEnd = (w: World) => { const z = zoneEnds(w); return z ? z[Math.min(w.zone!, z.length - 1)] : CHAPTERS[w.chapter - 1].road; };
/** 이번 장에 남은 구간 수 */
export const zoneLeft = (w: World) => { const z = zoneEnds(w); return z ? Math.max(0, z.length - 1 - w.zone!) : 0; };
/** 다음 구간까지 필요한 퇴근 */
export const zoneNeed = (w: World) => (RULES.zones ? RULES.zones.kills[w.chapter - 1] * Math.pow(RULES.zones.grow, w.zone || 0) : 0);
export const chapterInfo = (w: World) => CHAPTERS[w.chapter - 1];
export const monsIn = (w: World, did: PlotId) => w.monsters.filter(m => m.d === did);
export const tray = (w: World) => w.monsters.filter(m => !m.d);
export const maxEvents = (w: World) => (w.chapter >= 3 ? 3 : 2);
/** 동시 이벤트 수에 모객 이벤트(v1.7)도 든다 */
export const activeEvents = (w: World) => Object.values(w.dungeons).filter(d => d.event).length + (w.recruit ? 1 : 0);
export const happyCount = (w: World) => { let n = 0; for (const a of w.advs) if (a.st === 'happy') n++; return n; };
export const dungeonStars = (d: Dungeon) => JOY_STARS.filter(x => d.joy >= x).length;
export const dexCount = (w: World) => Object.keys(w.dex).length;
export const hasBalrogDungeon = (w: World) => w.monsters.some(m => m.sp === 'balrog' && m.d && w.plots[m.d] && w.plots[m.d].open);
export const needsBalrog = (w: World) => w.chapter === 5;
/** 지금 자리 수: 필드 보스가 방문 중이면 임시로 늘어난다 (v1.3) */
export const seatsOf = (w: World, did: PlotId) => w.dungeons[did].seats + (RULES.fieldBoss && w.boss && w.boss.d === did ? RULES.fieldBoss.seats : 0);
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
  /** 엘리트가 있는 던전 · 필드 보스가 방문 중인 던전 (v1.3) */
  elite: boolean; guest: boolean;
}
export function dungeonInfo(w: World): Record<PlotId, DInfo> {
  const lv = levelsOf(w), info: Record<PlotId, DInfo> = {};
  for (const id in lv) {
    const d = w.dungeons[id], ms = monsIn(w, id);
    const guest = !!w.boss && w.boss.d === id && !!RULES.fieldBoss;
    info[id] = {
      id, D: lv[id], lo: lv[id] - 5, hi: lv[id] + 5, seats: d.seats + (guest ? RULES.fieldBoss!.seats : 0), occ: 0,
      elite: !!w.elite && w.elite.d === id, guest,
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
  const ar = RULES.arrive;
  if (!ar && w.t < w.tut.buffUntil) return 1;
  // 필드 보스 소식에 손님이 더 온다 (v1.3)
  const fb = RULES.fieldBoss, bossX = fb && w.boss && w.boss.d ? fb.arriveX : 1;
  // 신규 모객 (v1.7): 기본 도착률 ×x. 첫날 붐빔의 파티 박자에는 곱하지 않는다(첫 40분 줄이 터진다)
  const rx = RULES.guests && w.recruit && w.recruit.kind === 'fresh' ? RULES.guests.fresh.x : 1;
  const base = ((6 * (1 + 0.5 * w.stars)) / 60) * bossX * rx;
  if (!ar || w.t >= ar.fade) return base;
  // v1.4: 첫 hold분은 붐비고, fade분까지 기본 도착률로 서서히 줄어든다
  const f = w.t < ar.hold ? 0 : (w.t - ar.hold) / (ar.fade - ar.hold);
  return Math.max(base, ar.rate + (base - ar.rate) * f);
}
/** 첫날 팁 (v1.4): 붐비는 동안 스마일 수입 배율. 도착률과 같이 줄어든다 */
export function tipX(w: World): number {
  const ar = RULES.arrive;
  if (!ar || w.t >= ar.fade) return 1;
  const f = w.t < ar.hold ? 0 : (w.t - ar.hold) / (ar.fade - ar.hold);
  return ar.tip + (1 - ar.tip) * f;
}
/** 도착 레벨 (v1.4): 붐비는 동안 mid 비율은 열린 길 가운데(Lv 2 ~ 길 끝−2)로 온다 */
function arriveLv(w: World): number {
  const ar = RULES.arrive, end = roadEnd(w);
  if (!ar || w.t >= ar.fade || end < 5 || rnd(w) >= ar.mid) return 1;
  return 2 + Math.floor(rnd(w) * (end - 3));
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
  const tip = tipX(w);
  const info = dungeonInfo(w);
  const infoList = Object.values(info);
  const end = roadEnd(w);

  // 1. 도착
  const spawn = (lv = 1, prog = 0) => {
    const a: Adventurer = { id: w.nextAdv++, lv, prog, st: 'new', d: null, near: null, wait: 0, look: Math.floor(rnd(w) * 6), jit: rnd(w) * 0.7 - 0.35 };
    if (lv > 1) a.seen = true;
    w.advs.push(a); w.stats.arrivals++; emit({ type: 'arrive', id: a.id });
  };
  while (w.tut.instant > 0) { w.tut.instant--; spawn(); }
  const sc = w.tut.script;
  while (sc && sc.length && w.t >= sc[0].at) { const p = sc.shift()!; p.lv.forEach((lv, i) => spawn(lv, p.prog[i] || 0)); }
  const ar = RULES.arrive;
  if (ar) {
    // v1.4: 파티가 고른 박자로 온다(도착 한 번 = 사건 한 번). arrAcc는 파티 단위로 쌓는다
    const avg = (ar.party[0] + ar.party[1]) / 2;
    w.arrAcc += (arrivalPerMin(w) * dt) / avg;
    while (w.arrAcc >= 1) {
      w.arrAcc -= 1;
      const n = ar.party[0] + Math.floor(rnd(w) * (ar.party[1] - ar.party[0] + 1));
      for (let i = 0; i < n; i++) { const lv = arriveLv(w); spawn(lv, lv > 1 ? rnd(w) * (10 + lv) : 0); }
    }
  } else {
    w.arrAcc += arrivalPerMin(w) * dt;
    while (w.arrAcc >= 1) { w.arrAcc -= 1; spawn(); }
  }
  // 복귀 모객 (v1.7): 풀에서 자기 레벨로 돌아온다. 난수를 쓰지 않는다 — 자리 있는 던전이 덮는 레벨 가운데 빈자리가 가장 많은 레벨부터
  const gu = RULES.guests, rc = w.recruit;
  if (gu && rc && rc.kind === 'return' && w.pool) {
    rc.acc += (gu.return.rate / 60) * dt;
    while (rc.acc >= 1) {
      rc.acc -= 1;
      const lv = pickReturnLevel(w, info);
      if (lv == null) { rc.acc = Math.min(rc.acc, 1); break; }
      w.pool[lv]--;
      const a: Adventurer = { id: w.nextAdv++, lv, prog: 0, st: 'new', d: null, near: null, wait: 0, look: lv % 6, jit: ((lv * 7) % 10) / 14 - 0.35, seen: true };
      w.advs.push(a); w.stats.arrivals++; w.stats.returned = (w.stats.returned || 0) + 1;
      emit({ type: 'return', id: a.id, lv });
    }
  }

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
        gone.add(a.id); w.stats.left[why]++; toPool(w, a.lv); emit({ type: 'leave', id: a.id, why });
      }
      continue;
    }
    if (!free) {
      if (prevSt !== 'busy') a.wait = 0;
      a.st = 'busy'; a.near = anyCand.id; a.wait += dt;
      if (a.wait >= RULES.busyWait) { gone.add(a.id); w.stats.left.busy++; toPool(w, a.lv); emit({ type: 'leave', id: a.id, why: 'busy' }); }
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
        if (a.wait >= RULES.searchWait) { gone.add(a.id); w.stats.left.search++; toPool(w, a.lv); emit({ type: 'leave', id: a.id, why: 'search' }); }
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
    const speed = bx * (d.exp ? 2 : 1) * (d.strong ? 1.2 : 1) * (d.elite ? RULES.elite!.lvX : 1);
    a.prog += dt * speed;
    let need = 10 + a.lv;
    while (a.prog >= need) {
      a.prog -= need; a.lv++; w.smile += RULES.smileLevelup * RULES.incomeCurve[w.chapter - 1] * tip; w.stats.levelups++;
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
      m.tenure += share * bx * (SPECIES[m.sp].trait === 'fast' ? 1.5 : 1) * (RULES.grounds && plotInfo(id).home.includes(m.sp) ? RULES.grounds.homeX : 1);
      if (!before && canEvolve(m)) emit({ type: 'ready', mon: m.id });
    }
    emit({ type: 'kill', d: id, n: kills });
    w.smile += RULES.smileHappy * RULES.incomeCurve[w.chapter - 1] * tip * hs * dt * (d.drop ? 2 : 1) * (d.gift ? 1.3 : 1) * (d.boss ? 1.5 : 1);
    dd.joy += hs * dt / 60;
    // ② 누적: 엘리트·필드 보스가 있는 던전은 더 빨리 찬다. 첫 세션은 입사 버프도 붙는다 (v1.3)
    w.cjoy += (hs * dt / 60) * (d.elite ? RULES.elite!.joyX : 1) * (d.guest ? RULES.fieldBoss!.joyX : 1) * (RULES.firstLoop ? bx : 1);
    if (RULES.elite && !w.elite) { w.eliteAcc += kills; w.eliteBy[id] = (w.eliteBy[id] || 0) + kills; }
    if (w.zoneAcc != null) w.zoneAcc += kills;
    if (d.guest && w.boss) w.boss.kills += kills;
    // 드랍 상자 (v1.6): 상자가 떨어질 자리가 있을 때만 쌓는다(월드에 상자가 없고 쥔 무료권이 hold장 미만). 드랍 이벤트 중이면 ×2
    const dr = RULES.drop;
    if (dr && w.boxes && w.chapter >= dr.from && boxRoom(w)) {
      const k = kills * (d.drop ? 2 : 1);
      w.boxAcc = (w.boxAcc || 0) + k; w.boxBy![id] = (w.boxBy![id] || 0) + k;
    }
  }

  // 이벤트 종료
  for (const id in w.dungeons) {
    const d = w.dungeons[id];
    if (d.event && w.t + dt >= d.event.end) { emit({ type: 'eventEnd', d: id, kind: d.event.kind }); d.event = null; }
  }
  if (w.recruit && w.t + dt >= w.recruit.end) { emit({ type: 'recruitEnd', kind: w.recruit.kind }); w.recruit = null; }
  if (RULES.guests && !w.pool) initGuests(w);

  w.t += dt;

  // 구간 개방 (v1.4)
  tickZone(w, emit);

  // 엘리트·필드 보스 (v1.3)
  tickElite(w, emit);
  tickBoss(w, emit);

  // 드랍 상자 (v1.6)
  tickBox(w, emit);

  // 결재 ② 막대 눈금 (v1.3): 지나는 순간 보상이 저절로 들어온다
  checkMarks(w, emit);

  // 결재 판정 — 한 번 채우면 서류가 올라와 기다린다
  if (!w.approvalReady && !w.ended && approvalMet(w)) { w.approvalReady = true; emit({ type: 'approval' }); }
}

/** ② 막대 눈금 보상: 25% 이번 장 계열 채용권 · 50% 필드 보스(없으면 이벤트권) · 75% 이벤트권 2장 */
export function markReward(w: World, i: number): MarkReward {
  if (i === 0) {
    const sps = speciesInPlay().filter(sp => SPECIES[sp].chapter === w.chapter);
    const count = (sp: SpeciesId) => w.monsters.filter(m => m.sp === sp).length;
    sps.sort((a, b) => count(a) - count(b) || SPECIES[a].base - SPECIES[b].base);
    return { kind: 'hire', sp: sps[0] };
  }
  if (i === 1) return RULES.fieldBoss && fieldBoss(w.chapter) && !w.bossDone.includes(w.chapter) && !w.boss ? { kind: 'boss' } : { kind: 'event', n: 1 };
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
    if (reward.kind === 'boss') { w.boss = { ch: w.chapter, at: w.t, d: null, kills: 0, until: null }; emit({ type: 'bossCall', ch: w.chapter }); }
  }
}

// ── 구간 개방 (v1.4) ────────────────────────────────────────
/** 퇴근이 쌓이고 지금 길이 이어져 있으면 다음 구간을 연다. 끊긴 채로 새 구간을 얹지 않는다 */
function tickZone(w: World, emit: (e: SimEvent) => void) {
  if (!zoneLeft(w) || (w.zoneAcc || 0) < zoneNeed(w) || gapSegments(w).length) return;
  openZone(w, emit);
}
function openZone(w: World, emit: (e: SimEvent) => void) {
  const from = roadEnd(w);
  w.zone = (w.zone || 0) + 1; w.zoneAcc = 0;
  emit({ type: 'zone', ch: w.chapter, from, to: roadEnd(w) });
}
/** 대본용: 지금 다음 구간을 연다 (튜토리얼이 기다리게 하지 않게) */
export function forceZone(w: World, out?: SimEvent[]): boolean {
  if (!zoneLeft(w)) return false;
  openZone(w, out ? e => out.push(e) : () => {});
  return true;
}

// ── 엘리트 (v1.3) ───────────────────────────────────────────
/** 문턱을 넘으면 지난 엘리트 뒤 퇴근이 많았던 던전일수록 잘 뽑힌다. 추첨은 월드 시드로 결정적이다 */
function tickElite(w: World, emit: (e: SimEvent) => void) {
  const el = RULES.elite;
  if (!el) return;
  if (w.elite) {
    const m = w.monsters.find(x => x.id === w.elite!.mon);
    if (w.t >= w.elite.until || !m || m.d !== w.elite.d) { emit({ type: 'eliteEnd', d: w.elite.d }); w.elite = null; }
    return;
  }
  if (w.eliteAcc < el.every[w.chapter - 1]) return;
  const lv = levelsOf(w);
  const ids = Object.keys(w.eliteBy).filter(id => lv[id] && monsIn(w, id).length);
  const total = ids.reduce((s, id) => s + w.eliteBy[id], 0);
  if (!total) return;
  let r = rnd(w) * total, pick = ids[ids.length - 1];
  for (const id of ids) { r -= w.eliteBy[id]; if (r <= 0) { pick = id; break; } }
  startElite(w, pick, emit);
}
function startElite(w: World, did: PlotId, emit: (e: SimEvent) => void) {
  const m = monsIn(w, did).sort((a, b) => b.tenure - a.tenure)[0];
  if (!m || !RULES.elite) return;
  w.elite = { d: did, mon: m.id, until: w.t + RULES.elite.min };
  w.eliteAcc = 0; w.eliteBy = {}; w.stats.elites++;
  emit({ type: 'elite', d: did, mon: m.id });
}
/** 대본용: 지금 엘리트를 부른다 (튜토리얼 첫 출현 보장). 던전을 안 주면 즐거운 모험가가 가장 많은 곳 */
export function forceElite(w: World, did?: PlotId, out?: SimEvent[]): boolean {
  if (!RULES.elite || w.elite) return false;
  const lv = levelsOf(w);
  const occ = (id: string) => w.advs.filter(a => a.st === 'happy' && a.d === id).length;
  const id = did && lv[did] ? did : Object.keys(lv).sort((a, b) => occ(b) - occ(a))[0];
  if (!id) return false;
  startElite(w, id, out ? e => out.push(e) : () => {});
  return !!w.elite;
}

// ── 필드 보스 (v1.3) ────────────────────────────────────────
/** 보스를 맞을 수 있는 던전: 보스 레벨을 적정 구간에 품는 곳(자리 많은 순). 없으면 레벨이 가장 가까운 곳 */
export function bossHosts(w: World): PlotId[] {
  const b = w.boss && fieldBoss(w.boss.ch);
  if (!b) return [];
  const lv = levelsOf(w), ids = Object.keys(lv);
  const seats = (id: string) => w.dungeons[id].seats;
  const cover = ids.filter(id => Math.abs(lv[id] - b.lv) <= 5).sort((a, b2) => seats(b2) - seats(a) || lv[b2] - lv[a]);
  if (cover.length) return cover.slice(0, 3);
  return ids.sort((a, b2) => Math.abs(lv[a] - b.lv) - Math.abs(lv[b2] - b.lv)).slice(0, 1);
}
export const bossNeed = (ch: number) => (RULES.fieldBoss ? RULES.fieldBoss.need[ch - 1] : 0);
export function inviteBoss(w: World, did: PlotId): Result<{ ch: number }> {
  const fb = RULES.fieldBoss;
  if (!fb || !w.boss) return no('찾아온 필드 보스가 없어요');
  if (w.boss.d) return no('이미 방문 중이에요');
  if (!bossHosts(w).includes(did)) return no('보스 레벨에 맞는 던전이 아니에요');
  w.boss.d = did; w.boss.kills = 0; w.boss.until = w.t + fb.max;
  return ok({ ch: w.boss.ch });
}
/** 초대 되돌리기 (5초) */
export function uninviteBoss(w: World): void {
  if (!w.boss) return;
  w.boss.d = null; w.boss.kills = 0; w.boss.until = null;
}
function tickBoss(w: World, emit: (e: SimEvent) => void) {
  const fb = RULES.fieldBoss, b = w.boss;
  if (!fb || !b) return;
  if (!b.d) {
    // 초대를 기다리다 시간이 지나면 자리가 가장 많은 곳으로 자동 초대 — 놓쳐도 잃는 것이 없다(P5)
    if (w.t >= b.at + fb.wait) {
      const host = bossHosts(w)[0];
      if (host && inviteBoss(w, host).ok) emit({ type: 'bossIn', ch: b.ch, d: host, auto: true });
    }
    return;
  }
  // 방문한 던전이 문을 닫으면 다른 곳으로 옮긴다
  if (!levelsOf(w)[b.d]) { const host = bossHosts(w)[0]; b.d = host || null; if (!host) return; }
  if (b.kills >= bossNeed(b.ch) || w.t >= (b.until ?? Infinity)) {
    const goal = RULES.joyGoal ? RULES.joyGoal[w.chapter - 1] : 0;
    const bonus = w.ended ? 0 : goal * fb.bonus;
    w.cjoy += bonus;
    w.dex[bossDexKey(b.ch)] = true;
    w.bossDone.push(b.ch); w.stats.bosses++;
    w.boss = null;
    emit({ type: 'bossDown', ch: b.ch, d: b.d, bonus });
  }
}

// ── 드랍 상자 (v1.6) ────────────────────────────────────────
/**
 * 사냥이 쌓이면 던전 앞에 상자가 떨어진다. 볼거리이자 결정거리다: 열 때 채용권과 이벤트권 가운데 하나를 고른다.
 * 스마일은 주지 않는다(후반 스마일 과잉, 컨셉 D1). 놓쳐도 잃는 것이 없고 떠나 있어도 max개까지 기다린다(P5).
 * 쥔 무료권이 hold장이면 쉰다: 권을 쓰는 만큼만 떨어져야 권이 쌓여 결정이 사라지지 않는다(drop-v16 §4).
 * 어디에 떨어질지는 난수를 쓰지 않는다. 월드 난수 흐름이 v1.5와 같아야 상자가 만든 차이만 보인다
 */
function initBoxes(w: World) { w.boxes = []; w.boxAcc = 0; w.boxBy = {}; w.nextBox = 1; }
/** 쥔 무료권 가운데 상자가 주는 것 (채용권 + 이벤트권) */
export const heldTickets = (w: World) => w.tickets.hire.length + w.tickets.event;
/** 상자가 떨어질 자리가 있는가: 월드에 max개 미만이고, 쥔 무료권이 hold장 미만 */
export const boxRoom = (w: World) => !!RULES.drop && (w.boxes || []).length < RULES.drop.max && heldTickets(w) < RULES.drop.hold;
function tickBox(w: World, emit: (e: SimEvent) => void) {
  const dr = RULES.drop;
  if (!dr) return;
  if (!w.boxes) { initBoxes(w); return; }
  const lv = levelsOf(w), has = (id: string) => w.boxes!.some(b => b.d === id);
  // 문을 닫은 던전 앞의 상자는 상자가 없는 다른 던전 앞으로 옮긴다 (필드 보스와 같다)
  for (const b of w.boxes) if (!lv[b.d]) { const to = Object.keys(lv).find(id => !has(id)); if (to) b.d = to; }
  if (w.chapter < dr.from || !boxRoom(w) || (w.boxAcc || 0) < dr.need[w.chapter - 1]) return;
  const by = w.boxBy || {};
  const to = Object.keys(by).filter(id => lv[id] && !has(id)).sort((a, b) => by[b] - by[a])[0];
  if (!to) return;
  const box: Box = { id: w.nextBox || 1, d: to, at: w.t };
  w.nextBox = box.id + 1;
  w.boxes.push(box); w.boxAcc = 0; w.boxBy = {};
  emit({ type: 'box', id: box.id, d: to });
}
export const boxesOf = (w: World) => w.boxes || [];
/**
 * 상자 채용권의 계열: 줄을 나누거나 붐빔을 푸는 계열 → 빈틈을 메우는 계열 → 이번 장 계열 가운데 가장 적게 가진 것(눈금 25%와 같다)
 */
export function boxHireSp(w: World): SpeciesId {
  const cf = crowdFix(w);
  if (cf) return cf.sp;
  const rs = recommendSpecies(w);
  if (rs) return rs;
  const r = markReward(w, 0);
  return r.kind === 'hire' ? r.sp : 'snail';
}
/** 상자에서 고를 수 있는 두 가지 */
export const boxOptions = (w: World): BoxReward[] => [{ kind: 'hire', sp: boxHireSp(w) }, { kind: 'event' }];
/** 오렌이 권하는 것: 줄·빈틈에 맞는 계열이 있으면 그 채용권, 없으면 이벤트권. 봇도 이것을 고른다 */
export function boxPick(w: World): BoxReward {
  const sp = crowdFix(w)?.sp ?? recommendSpecies(w);
  return sp ? { kind: 'hire', sp } : { kind: 'event' };
}
export function openBox(w: World, boxId: number, pick: BoxReward): Result<{ box: Box; idx: number; reward: BoxReward }> {
  const bs = boxesOf(w), i = bs.findIndex(b => b.id === boxId);
  if (i < 0) return no('상자가 없어요');
  if (pick.kind === 'hire' && !canHireSpecies(w, pick.sp)) return no('아직 채용할 수 없어요');
  const [box] = bs.splice(i, 1);
  if (pick.kind === 'hire') w.tickets.hire.push(pick.sp); else w.tickets.event++;
  return ok({ box, idx: i, reward: pick });
}
/** 상자 열기 되돌리기 (5초). 받은 권을 이미 썼으면 되돌리지 않는다 */
export function unopenBox(w: World, r: { box: Box; idx: number; reward: BoxReward }): boolean {
  if (r.reward.kind === 'hire') {
    const j = w.tickets.hire.lastIndexOf(r.reward.sp);
    if (j < 0) return false;
    w.tickets.hire.splice(j, 1);
  } else {
    if (w.tickets.event <= 0) return false;
    w.tickets.event--;
  }
  const bs = w.boxes || (w.boxes = []);
  bs.splice(Math.min(r.idx, bs.length), 0, r.box);
  return true;
}

// ── 모객 (v1.7) ─────────────────────────────────────────────
/**
 * 떠난 손님은 사라지지 않는다. 레벨별 풀에 남아 복귀 모객으로 자기 레벨에 돌아온다(P5: 풀은 줄지 않고 상한만 있다).
 * 신규(입구 ×2)와 복귀(풀에서 돌아옴)는 서로 다른 결정이다: 입구가 비었을 때와 중간이 비었을 때 답이 다르다.
 * 둘 다 동시 이벤트 수 한 자리를 쓴다(던전 이벤트와 겨룬다). 스마일은 주지 않는다. 난수를 쓰지 않는다
 */
function initGuests(w: World) { w.pool = new Array(101).fill(0); w.recruit = null; if (w.tickets.recruit == null) w.tickets.recruit = 0; }
/**
 * 떠난 손님을 풀에 남긴다. Lv 1~2는 새 손님과 같아 남기지 않는다. 풀이 가득 차면 가장 낮은 레벨의 손님 하나가 잊힌다 —
 * 풀은 "돌아올 만한 손님"(중간 레벨)을 지킨다. 첫 90분에 자리를 못 찾고 돌아간 손님(L10)도 이렇게 자원이 된다
 */
function toPool(w: World, lv: number) {
  if (!RULES.guests || !w.pool || lv < 3) return;
  if (poolCount(w) >= RULES.guests.pool) {
    const low = w.pool.findIndex((n, i) => i > 0 && n > 0);
    if (low < 0 || low >= lv) return;
    w.pool[low]--;
  }
  w.pool[Math.max(1, Math.min(100, lv))]++;
}
export const poolCount = (w: World) => (w.pool || []).reduce((s, n) => s + n, 0);
export const recruitTickets = (w: World) => w.tickets.recruit || 0;
/** 풀에서 돌아올 레벨: 자리 있는 던전이 덮는 레벨 가운데 빈자리가 가장 많은 것. 없으면 풀에서 가장 낮은 레벨(걷거나 기다린다) */
function pickReturnLevel(w: World, info: Record<PlotId, DInfo>): number | null {
  const pool = w.pool!;
  let best: number | null = null, bestFree = -1;
  for (let lv = 1; lv <= 100; lv++) {
    if (!pool[lv]) continue;
    let free = 0;
    for (const id in info) { const x = info[id]; if (lv >= x.lo && lv <= x.hi) free += Math.max(0, x.seats - x.occ); }
    if (free > bestFree) { bestFree = free; best = lv; }
  }
  // 빈자리가 없으면 돌아오지 않는다 — 복귀 손님이 줄을 만들지 않게 (자리가 나면 다음 걸음에 온다)
  return bestFree > 0 ? best : null;
}
/** 지금 걸면 얼마나 돌아올 수 있는가: 풀의 손님 가운데 자리 있는 던전이 덮는 레벨의 인원 */
export function returnRoom(w: World): { pool: number; room: number } {
  const pool = poolCount(w);
  if (!pool) return { pool: 0, room: 0 };
  const info = dungeonInfo(w);
  const occ: Record<string, number> = {};
  for (const a of w.advs) if (a.st === 'happy' && a.d) occ[a.d] = (occ[a.d] || 0) + 1;
  let room = 0;
  for (let lv = 1; lv <= 100; lv++) {
    if (!w.pool![lv]) continue;
    let free = 0;
    for (const id in info) { const x = info[id]; if (lv >= x.lo && lv <= x.hi) free += Math.max(0, x.seats - (occ[id] || 0)); }
    room += Math.min(w.pool![lv], free);
  }
  return { pool, room };
}
/** 입구가 한산한가: Lv 1을 덮는 던전의 빈자리 합 (신규 모객의 근거) */
export function entranceRoom(w: World): number {
  const info = dungeonInfo(w);
  const occ: Record<string, number> = {};
  for (const a of w.advs) if (a.st === 'happy' && a.d) occ[a.d] = (occ[a.d] || 0) + 1;
  let free = 0;
  for (const id in info) { const x = info[id]; if (x.lo <= 1) free += Math.max(0, x.seats - (occ[id] || 0)); }
  return free;
}
export const recruitCost = (w: World, kind: RecruitKind) => (RULES.guests ? (kind === 'return' ? RULES.guests.return.cost : RULES.guests.fresh.cost) * w.chapter : 0);
/**
 * 오렌이 권하는 모객: 풀에 손님이 있고 자리 있는 레벨이 8명 이상이면 복귀, 입구 던전에 빈자리가 6석 넘고 Lv 1~3 줄이 없으면 신규.
 * 이벤트 자리가 없거나 이미 모객 중이면 없다. 봇도 이것을 따른다
 */
export function recruitPick(w: World): { kind: RecruitKind; n: number } | null {
  if (!RULES.guests || !w.pool || w.recruit || activeEvents(w) >= maxEvents(w)) return null;
  const rr = returnRoom(w);
  if (rr.room >= 8) return { kind: 'return', n: rr.room };
  const busyLow = w.advs.filter(a => a.st === 'busy' && a.lv <= 3).length;
  const er = entranceRoom(w);
  if (er >= 6 && busyLow === 0 && !gapSegments(w).some(g => g[0] === 1)) return { kind: 'fresh', n: er };
  return null;
}
export function startRecruit(w: World, kind: RecruitKind): Result<{ cost: number; free: boolean }> {
  const gu = RULES.guests;
  if (!gu || !w.pool) return no('모객은 아직 없어요');
  if (w.recruit) return no('이미 모객 중이에요');
  if (activeEvents(w) >= maxEvents(w)) return no(`이벤트는 동시에 ${maxEvents(w)}개까지`);
  if (kind === 'return' && !poolCount(w)) return no('돌아올 손님이 아직 없어요');
  const free = recruitTickets(w) > 0, cost = free ? 0 : recruitCost(w, kind);
  if (w.smile < cost) return no(`스마일 ${fmtN(cost - w.smile)} 모자라요`, { short: cost - w.smile });
  if (free) w.tickets.recruit!--; else w.smile -= cost;
  w.recruit = { kind, start: w.t, end: w.t + (kind === 'return' ? gu.return.min : gu.fresh.min), acc: 0 };
  // 신규: 거는 순간 첫 손님 파티가 입구로 온다 (바로 보이는 효과). 난수를 쓰지 않는다
  if (kind === 'fresh') w.tut.instant += gu.fresh.burst;
  return ok({ cost, free });
}
/** 모객 되돌리기 (5초). 이미 돌아온 손님은 돌려보내지 않는다 */
export function cancelRecruit(w: World, refund: number, wasFree: boolean): void {
  if (!w.recruit) return;
  if (w.recruit.kind === 'fresh' && RULES.guests) w.tut.instant = Math.max(0, w.tut.instant - RULES.guests.fresh.burst);
  w.recruit = null;
  if (wasFree) w.tickets.recruit = recruitTickets(w) + 1; else w.smile += refund;
}
/**
 * 매니저 복귀 (v1.7): awayMin분 넘게 떠났다 돌아오면 모객권 1장 (쥔 모객권이 hold장 미만일 때).
 * 화면(출근 리포트)과 봇(체크인)이 같은 함수를 부른다. 놓쳐도 잃는 것은 없다
 */
export function welcomeBack(w: World, awayMin: number): boolean {
  const gu = RULES.guests;
  if (!gu || !w.pool || awayMin < gu.ticket.awayMin || recruitTickets(w) >= gu.ticket.hold) return false;
  w.tickets.recruit = recruitTickets(w) + 1;
  return true;
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
    // v1.4: 길은 이번 장의 마지막 구간까지 열려야 다 이어진 것이다
    road: gapN === 0 && !zoneLeft(w), gapN, hc, zoneLeft: zoneLeft(w),
    // ① 막대: 장 전체(졸업선) 가운데 아직 이어지지 않은 레벨 수 (열리지 않은 구간 포함)
    roadLeft: gapN + ch.road - roadEnd(w),
    roadNote: gapN ? `빈틈 ${gapN}` : zoneLeft(w) ? `구간 ${zoneLeft(w)}개 남음` : '',
    roadShort: gapN ? `빈틈 ${gapN}` : zoneLeft(w) ? `🔒 ${zoneLeft(w)}` : '',
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
  elites: { d: PlotId; mon: number }[]; bossCall: number | null; bossDown: { ch: number; bonus: number }[];
  /** 떠나 있는 동안 떨어진 드랍 상자 (v1.6) */
  boxes: number;
  /** 장부를 시작할 때까지 돌아온 손님 (v1.7 모객). 리포트는 지금 값과의 차이를 쓴다 */
  returned: number;
}
export function ledgerStart(w: World): Ledger {
  return {
    t0: w.t, happy0: happyCount(w), smile0: w.smile, lv0: w.stats.levelups, grad0: w.stats.grads,
    work0: Object.fromEntries(w.monsters.map(m => [m.id, m.work])),
    hourLv: {}, bestBurst: null, crowdMax: null, ready: [], approval: false, firstGrad: w.stats.grads === 0,
    stuckMin: 0, marks: [], elites: [], bossCall: null, bossDown: [], boxes: 0, returned: w.stats.returned || 0,
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
    else if (e.type === 'elite') L.elites.push({ d: e.d, mon: e.mon });
    else if (e.type === 'bossCall') L.bossCall = e.ch;
    else if (e.type === 'bossDown') L.bossDown.push({ ch: e.ch, bonus: e.bonus });
    else if (e.type === 'box') L.boxes++;
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
  elites: Ledger['elites']; bossCall: number | null; bossDown: Ledger['bossDown'];
  /** 떠나 있는 동안 떨어진 상자 · 지금 기다리는 상자 (v1.6) */
  boxes: number; boxesWaiting: number;
  /** 돌아온 손님 · 지금 풀에 남은 손님 · 오렌이 권하는 모객 (v1.7) */
  returned: number; pool: number; recruit: { kind: RecruitKind; n: number } | null;
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
    marks: L.marks, elites: L.elites, bossCall: L.bossCall, bossDown: L.bossDown,
    boxes: L.boxes || 0, boxesWaiting: boxesOf(w).length,
    returned: (w.stats.returned || 0) - (L.returned || 0), pool: poolCount(w), recruit: recruitPick(w),
  };
}

// ── 매니저 행동 ─────────────────────────────────────────────
export type Result<T = object> = ({ ok: true } & T) | { ok: false; msg: string; short?: number };
const ok = <T extends object>(extra: T): Result<T> => Object.assign({ ok: true as const }, extra);
const no = (msg: string, extra: { short?: number } = {}): { ok: false; msg: string; short?: number } => ({ ok: false, msg, ...extra });
const fmtN = (n: number) => Math.ceil(n).toLocaleString('ko-KR');

export const hireCost = (sp: SpeciesId) => RULES.hireUnit * SPECIES[sp].base;
/** 개업비 = 기본 × 지역. v1.5부터 챕터 배율(plotCurve)을 곱한다 */
export const plotCost = (w: World, id: PlotId) => Math.round(RULES.plotCost * plotInfo(id).region * (RULES.plotCurve ? RULES.plotCurve[w.chapter - 1] : 1));
/** 지금 이 부지를 여는 데 드는 스마일: 이미 열렸으면 0, 개업권이 있으면 0 (v1.3) */
const openCost_ = (w: World, id: PlotId) => openCost(w, id);
export const openCost = (w: World, id: PlotId) => (w.plots[id] && w.plots[id].open ? 0 : w.tickets.plot > 0 ? 0 : plotCost(w, id));
export const canHireSpecies = (w: World, sp: SpeciesId) => spInPlay(sp) && SPECIES[sp].chapter > 0 && SPECIES[sp].chapter <= w.chapter;
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
export const RULES_GROW_BOOST = () => RULES.growBoost;
export const RULES_GRAD = () => RULES.smileGrad;
export const RULES_GROUNDS = () => RULES.grounds;
export const RULES_GUESTS = () => RULES.guests;
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

export function placeCheck(w: World, m: Monster, did: PlotId | null): Result<{ openCost?: number; opens?: boolean; ticket?: boolean }> {
  if (!did) return tray(w).length >= TRAY_MAX && m.d ? no('대기실이 꽉 찼어요') : ok({});
  const p = w.plots[did];
  if (!p) return no('아직 열리지 않은 부지예요');
  const d = w.dungeons[did];
  const inD = monsIn(w, did).filter(x => x.id !== m.id);
  if (inD.length >= d.slots) return no('직원 자리가 꽉 찼어요');
  if (isBoss(m) && inD.some(isBoss)) return no('보스는 던전에 한 마리만');
  if (!p.open) {
    const cost = openCost(w, did);
    if (w.smile < cost) return no(`개업 비용 스마일 ${cost.toLocaleString('ko-KR')}이 필요해요`, { short: cost - w.smile });
    return ok({ openCost: cost, opens: true, ticket: w.tickets.plot > 0 });
  }
  return ok({});
}
export function place(w: World, monId: number, did: PlotId | null): Result<{ from: PlotId | null; openCost: number; opened: boolean; ticket: boolean; same?: boolean }> {
  const m = w.monsters.find(x => x.id === monId);
  if (!m) return no('없는 직원');
  if (m.d === did) return ok({ from: m.d, openCost: 0, opened: false, ticket: false, same: true });
  const c = placeCheck(w, m, did);
  if (!c.ok) return c;
  if (c.opens && did) { w.smile -= c.openCost || 0; if (c.ticket) w.tickets.plot--; w.plots[did].open = true; }
  const from = m.d;
  m.d = did;
  if (did) recordPlot(w, m.sp, did);
  return ok({ from, openCost: c.openCost || 0, opened: !!c.opens, ticket: !!c.ticket });
}
/**
 * 놓기 판정 + 필요한 구매까지: 빈 부지면 개업, 직원 자리가 꽉 찼으면 자리 +1을 같이 산다.
 * v1.1은 꽉 찬 던전에 놓을 수 없어 "채용 → 둘 곳 없음"의 막다른 길이 생겼다.
 */
export function placeCheckAuto(w: World, m: Monster, did: PlotId | null): Result<{ openCost?: number; opens?: boolean; ticket?: boolean; slotCost?: number }> {
  const c = placeCheck(w, m, did);
  if (c.ok || !did || c.msg !== '직원 자리가 꽉 찼어요') return c;
  const d = w.dungeons[did];
  const sc = slotCost(w, d);
  if (sc == null) return no('직원 자리가 꽉 찼어요 (최대 5)');
  const open = openCost(w, did);
  if (w.smile < sc + open) return no(`직원 자리 +1에 스마일 ${fmtN(sc + open - w.smile)} 모자라요`, { short: sc + open - w.smile });
  const inD = monsIn(w, did).filter(x => x.id !== m.id);
  if (isBoss(m) && inD.some(isBoss)) return no('보스는 던전에 한 마리만');
  return ok({ slotCost: sc, openCost: open || undefined });
}
export function placeAuto(w: World, monId: number, did: PlotId | null): Result<{ from: PlotId | null; openCost: number; opened: boolean; ticket: boolean; slotCost: number; same?: boolean }> {
  const m = w.monsters.find(x => x.id === monId);
  if (!m) return no('없는 직원');
  if (m.d === did) return ok({ from: m.d, openCost: 0, opened: false, ticket: false, slotCost: 0, same: true });
  const c = placeCheckAuto(w, m, did);
  if (!c.ok) return c;
  if (c.slotCost && did) { const r = slotUp(w, did); if (!r.ok) return r; }
  const r = place(w, monId, did);
  if (!r.ok) { if (c.slotCost && did) slotDown(w, did, c.slotCost); return r; }
  return ok({ from: r.from, openCost: r.openCost, opened: r.opened, ticket: r.ticket, slotCost: c.slotCost || 0 });
}

/** 개업 되돌리기: 그 부지에 놓은 직원은 모두 대기실로, 옮겨 온 직원은 제자리로 */
export function unopen(w: World, did: PlotId, monId: number, from: PlotId | null, cost: number, ticket = false): void {
  for (const x of monsIn(w, did)) x.d = x.id === monId ? from : null;
  w.plots[did].open = false;
  w.smile += cost;
  if (ticket) w.tickets.plot++;
}

export function evolveBlock(w: World, m: Monster): string | null {
  if (!canEvolve(m)) return '아직 진화할 수 없어요';
  const next = m.stage + 1;
  if (m.d && SPECIES[m.sp].boss && next === maxStage(m) && monsIn(w, m.d).some(x => x.id !== m.id && isBoss(x)))
    return '보스는 던전에 한 마리만 — 다른 던전으로 옮긴 뒤 진화해요';
  return null;
}
export function evolve(w: World, monId: number): Result<{ mon: Monster; from: number; isNew: boolean; tenureBefore: number; /** 승진 소식에 돌아온 손님 (v1.7 모객) */ returned: number; /** 돌아온 손님의 id (되돌리기가 풀로 돌려보낸다) */ retIds: number[] }> {
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
  recordStage(w, m.sp, m.stage);
  const retIds = evolveReturn(w, m);
  return ok({ mon: m, from, isNew, tenureBefore, returned: retIds.length, retIds });
}
/**
 * 승진 소식 (v1.7 모객): 직원이 진화하면 그 던전의 새 구간에 맞는 떠난 손님이 빈자리만큼 바로 돌아온다(최대 evolveBurst).
 * "진화했다 → 손님이 돌아온다". 진화를 미루기만 하는 것이 최선이 되지 않게 하는 경험 장치다. 5초 안에 되돌리면 돌아온 손님도 풀로 돌아간다(월드가 진화 전과 같아진다). 난수를 쓰지 않는다
 */
function evolveReturn(w: World, m: Monster): number[] {
  const gu = RULES.guests;
  const ids: number[] = [];
  if (!gu || !w.pool || !m.d || !gu.evolveBurst) return ids;
  const D = levelsOf(w)[m.d];
  if (!D) return ids;
  let free = seatsOf(w, m.d) - w.advs.filter(a => a.st === 'happy' && a.d === m.d).length;
  for (let lv = Math.min(100, D + 5); lv >= Math.max(1, D - 5) && ids.length < gu.evolveBurst && free > 0; lv--) {
    while (w.pool[lv] > 0 && ids.length < gu.evolveBurst && free > 0) {
      w.pool[lv]--; free--;
      const id = w.nextAdv++;
      ids.push(id);
      w.advs.push({ id, lv, prog: 0, st: 'new', d: null, near: null, wait: 0, look: lv % 6, jit: ((lv * 7) % 10) / 14 - 0.35, seen: true });
      w.stats.arrivals++; w.stats.returned = (w.stats.returned || 0) + 1;
    }
  }
  return ids;
}
/** 진화 되돌리기 (5초 토스트). 도감 칸은 남긴다 — 한 번 본 모습은 본 것이다. 승진 소식으로 돌아온 손님(retIds)은 풀로 돌려보낸다 */
export function unevolve(w: World, monId: number, from: number, tenureBefore: number, retIds: number[] = []): void {
  const m = w.monsters.find(x => x.id === monId);
  if (!m) return;
  m.stage = from; m.tenure = tenureBefore; w.stats.evolves--;
  if (retIds.length && w.pool) {
    const set = new Set(retIds);
    for (const a of w.advs) if (set.has(a.id)) { w.pool[Math.min(100, a.lv)]++; w.stats.arrivals--; w.stats.returned = Math.max(0, (w.stats.returned || 0) - 1); }
    if (!w.stats.returned) delete w.stats.returned;
    w.advs = w.advs.filter(a => !set.has(a.id));
    const lo = Math.min(...retIds);
    if (!w.advs.some(a => a.id >= lo)) w.nextAdv = lo;
  }
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
  if (c == null) return no(`자리는 ${d.seats}석이 최대예요`);
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
  if (w.zone != null) { w.zone = 0; w.zoneAcc = 0; }
  unlockPlots(w, w.chapter);
  // 드랍 상자 (v1.6): 새 장은 상자 게이지가 절반 찬 채로 시작한다 (도장 뒤 첫 상자가 금방 떨어진다)
  if (RULES.drop && w.boxes && w.chapter >= RULES.drop.from) w.boxAcc = Math.max(w.boxAcc || 0, RULES.drop.need[w.chapter - 1] / 2);
  // 첫 10분 한 바퀴 (v1.3): 1장 결재 선물 — 새 지역 첫 계열 채용권 + 개업권
  if (RULES.firstLoop && w.chapter === 2) {
    const first = speciesInPlay().filter(sp => SPECIES[sp].chapter === 2 && spRegion(sp) === 2).sort((a, b) => SPECIES[a].base - SPECIES[b].base)[0];
    if (first) w.tickets.hire.push(first);
    w.tickets.plot++;
    // v1.7: 1장 결재 선물에 모객권 — 튜토리얼이 새 지역에서 신규 모객을 한 번 가르친다
    if (RULES.guests) w.tickets.recruit = recruitTickets(w) + RULES.guests.ticket.gift;
  }
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
  // v1.7: 빈틈·비용이 같으면 식구 사냥터가 먼저 (근속 ×homeX)
  const home = (id: PlotId) => (isHome(m.sp, id) ? 0 : 1);
  opts.sort((a, b) => a.gapN - b.gapN || a.cost - b.cost || home(a.id) - home(b.id));
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
  if (best >= cur) return [];
  const top = opts.filter(o => o.gapN === best && o.cost === opts[0].cost);
  const homes = top.filter(o => isHome(m.sp, o.id));
  return (homes.length ? homes : top).map(o => o.id);
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

/**
 * 옮기기만으로 그 빈틈이 닫히는 직원과 부지 (v1.3.1, 1장 Lv 14–15 정체).
 * 진화를 기다리라고 하기 전에, 이미 닿는 직원을 빈 부지(개업권이면 공짜)로 옮기는 수를 먼저 찾는다.
 * 빈틈이 다른 곳에 새로 생기는 수는 고르지 않는다.
 */
export interface MoveFix { mon: Monster; to: PlotId; cost: number; ticket: boolean }
export function moveFix(w: World, seg: Seg): MoveFix | null {
  const cur = gapSize(gapSegments(w));
  const all = (c: Uint8Array) => { for (let L = seg[0]; L <= seg[1]; L++) if (!c[L]) return false; return true; };
  let best: (MoveFix & { gapN: number }) | null = null;
  for (const m of w.monsters) {
    if (!m.d) continue;
    for (const id in w.plots) {
      if (id === m.d) continue;
      const c = placeCheck(w, m, id);
      if (!c.ok) continue;
      const mods: Mods = { move: { id: m.id, to: id } };
      if (!w.plots[id].open) mods.open = id;
      const lv = levelsOf(w, mods);
      if (!all(coveredSet(lv))) continue;
      const gapN = gapSize(gapSegments(w, lv));
      if (gapN >= cur) continue;
      const cost = c.openCost || 0;
      if (!best || gapN < best.gapN || (gapN === best.gapN && cost < best.cost)) best = { mon: m, to: id, cost, ticket: !!c.ticket, gapN };
    }
  }
  return best ? { mon: best.mon, to: best.to, cost: best.cost, ticket: best.ticket } : null;
}

/**
 * 붐빔 풀기 (v1.4): 자리를 더 늘릴 수 없는 던전 앞에 4명 넘게 줄을 서면, 기다리는 사람들 레벨에 던전을 하나 더 연다.
 * 새 던전은 길을 덮기만 하므로 빈틈을 만들지 않는다. 채용권이 있으면 그 계열을 먼저 쓴다.
 * 사다리로 나누기 (v1.5, 계열 사다리): 자리를 늘릴 수 있어도 4명 넘게 줄을 섰고, 줄 선 사람 절반 이상을 덮으면서 레벨이 3 이상 다른 계열이 있으면
 * 그 계열로 던전을 하나 더 여는 수를 권한다(split). 같은 레벨 복제는 자리 확장이 싸니 권하지 않는다
 */
export interface CrowdFix { d: PlotId; n: number; lo: number; hi: number; sp: SpeciesId; to: PlotId; cost: number; split: boolean }
/** 사다리로 나눌 때 던전 레벨과 떨어져야 하는 최소 레벨 차 */
export const SPLIT_GAP = 3;
export function crowdFix(w: World): CrowdFix | null {
  const busy: Record<string, number[]> = {};
  for (const a of w.advs) if (a.st === 'busy' && a.near) (busy[a.near] = busy[a.near] || []).push(a.lv);
  const maxed = (id: string) => seatCost(w, w.dungeons[id]) == null;
  const byN = Object.keys(busy).sort((a, b) => busy[b].length - busy[a].length);
  const full = byN.find(maxed);
  // 자리가 꽉 찬 던전(가장 긴 줄) 먼저, 사다리가 켜져 있으면 자리를 늘릴 수 있는 던전도
  const ds = [...(full ? [full] : []), ...(RULES.moreSpecies ? byN.filter(id => !maxed(id)) : [])].filter(id => busy[id].length >= 4);
  if (!ds.length) return null;
  // 빈 부지: 열린 곳 → 싼 곳 → 자리가 큰 곳 (v1.7 사냥터 값: 줄이 길면 큰 사냥터를 연다)
  const to = Object.keys(w.plots).filter(id => !monsIn(w, id).length)
    .sort((a, b) => +w.plots[b].open - +w.plots[a].open || plotCost(w, a) - plotCost(w, b) || plotSeats(b) - plotSeats(a))[0];
  if (!to) return null;
  const lv = levelsOf(w);
  for (const d of ds) {
    const lvs = busy[d], split = !maxed(d);
    let best: CrowdFix | null = null, bestN = 0;
    for (const sp of Object.keys(SPECIES) as SpeciesId[]) {
      if (!canHireSpecies(w, sp)) continue;
      const b = SPECIES[sp].base, n = lvs.filter(L => Math.abs(L - b) <= 5).length;
      if (split && Math.abs(b - lv[d]) < SPLIT_GAP) continue;
      const cost = (hasHireTicket(w, sp) ? 0 : hireCost(sp)) + openCost(w, to);
      if (n * 2 < lvs.length) continue;
      if (!best || n > bestN || (n === bestN && cost < best.cost)) { best = { d, n: lvs.length, lo: Math.min(...lvs), hi: Math.max(...lvs), sp, to, cost, split }; bestN = n; }
    }
    if (best) return best;
  }
  return null;
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
  cost: number; openCost: number; opens: boolean; hire: number;
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
    let openCost = 0, opens = false;
    if (!stay && to) {
      const inD = monsIn(w, to);
      if (inD.length >= w.dungeons[to].slots) continue;
      if (isBoss({ ...m, stage: m.stage + 1 }) && inD.some(isBoss)) continue;
      if (!w.plots[to].open) { opens = true; openCost = openCost_(w, to); }
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
      const mods: Mods = { evolve: m.id, move: { id: m.id, to }, open: opens ? (to as PlotId) : undefined, add: sp ? { sp, to: home as PlotId } : undefined };
      const pv = preview(w, mods);
      plans.push({ mon: m.id, to, stay, hireSp: sp, hireInto: sp ? home : null, cost, openCost, opens, hire, pv, gapAfter: gapSize(pv.gapsAfter) });
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
export function promote(w: World, plan: PromotePlan): Result<{ evo: { mon: Monster; from: number; isNew: boolean; tenureBefore: number; returned: number; retIds: number[] }; from: PlotId | null; hired: Monster | null; hireCost: number; openCost: number; openTicket: boolean; hiredFree: boolean }> {
  const m = w.monsters.find(x => x.id === plan.mon);
  if (!m) return no('없는 직원');
  if (plan.cost > w.smile) return no(`스마일 ${fmtN(plan.cost - w.smile)} 모자라요`, { short: plan.cost - w.smile });
  const from = m.d;
  const evo = evolve(w, m.id);
  if (!evo.ok) return evo;
  let openTicket = false;
  if (!plan.stay) {
    const r = place(w, m.id, plan.to);
    if (!r.ok) { unevolve(w, m.id, evo.from, evo.tenureBefore, evo.retIds); return r; }
    openTicket = r.ticket;
  }
  let hired: Monster | null = null, hiredFree = false;
  if (plan.hireSp && plan.hireInto) {
    const h = hire(w, plan.hireSp, plan.hireInto);
    if (h.ok) { hired = h.mon; hiredFree = h.free; place(w, h.mon.id, plan.hireInto); }
  }
  return ok({ evo, from, hired, hireCost: hired && !hiredFree ? hireCost(plan.hireSp!) : 0, openCost: plan.openCost, openTicket, hiredFree });
}
/** 승진 발령 되돌리기 */
export function unpromote(w: World, plan: PromotePlan, r: { evo: { from: number; tenureBefore: number; retIds?: number[] }; from: PlotId | null; hired: Monster | null; hireCost: number; openCost: number; openTicket: boolean; hiredFree: boolean }): void {
  if (r.hired) unhire(w, r.hired.id, r.hiredFree ? 'ticket' : r.hireCost);
  const m = w.monsters.find(x => x.id === plan.mon);
  if (!m) return;
  if (!plan.stay) {
    if (plan.opens && plan.to) { for (const x of monsIn(w, plan.to)) if (x.id !== m.id) x.d = null; w.plots[plan.to].open = false; w.smile += r.openCost; if (r.openTicket) w.tickets.plot++; }
    m.d = r.from;
  }
  unevolve(w, m.id, r.evo.from, r.evo.tenureBefore, r.evo.retIds || []);
}

/** 완전 클리어 진척 */
export function fullClear(w: World) {
  const ps = plotsInPlay();
  const starred = ps.filter(p => w.dungeons[p.id] && dungeonStars(w.dungeons[p.id]) >= 3).length;
  return { ending: w.ended, starred, plots: ps.length, dex: dexCount(w) };
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
    w.elite = null; w.eliteAcc = 0; w.eliteBy = {}; w.boss = null; w.bossDone = [];
    const st = w.stats as Record<string, unknown> | undefined;
    if (st) { st.elites = 0; st.bosses = 0; }
    w.v = 3;
  }
  return w;
}

/** 세이브 불러오기 전에 모양을 확인한다 */
export function isWorld(x: unknown): x is World {
  const w = x as World;
  return !!w && typeof w === 'object' && w.v === SAVE_VERSION && Array.isArray(w.monsters) && Array.isArray(w.advs) && typeof w.t === 'number';
}
