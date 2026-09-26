/*
 * 사건 층 — 플레이어가 화면에서 "무언가 일어났다"고 느끼는 순간을 센다. cadence(첫 40분)와 checkin(Day 2~30)이 같은 잣대를 쓴다.
 *
 * 같은 5초 틱 안의 같은 종류는 한 번으로 센다(파티 3명 도착 = 도착 1번).
 *   A 볼거리: 파티 도착 · 졸업 · 다음 던전으로 이사 · 5의 배수 레벨업 · 새로 막힘 · 길 뚫림 · 구간 개방 · 돌아온 손님
 *   C 결정  : 결정할 거리가 생김(새 빈틈 · 진화 준비 · 붐빔 · 눈금 · 엘리트 · 필드 보스 · 결재 · 드랍 상자 · 모객 권유) + 실제로 둔 수(act:*)
 * 레벨업 하나하나(빛기둥)는 lvups에 따로 둔다. 인원만 늘면 저절로 채워지는 값이라 기준에서 뺀다.
 */
import * as S from '../sim';

export interface Moment { s: number; layer: 'A' | 'C'; kind: string }

/** 감탄 — "올라간다·진화했다·뚫렸다·돌아왔다·상자·보스" 가운데 하나. 체크인마다 한 번은 있어야 한다(G3) */
export const WOW_KINDS = new Set(['heal', 'zone', 'box', 'elite', 'boss', 'bossIn', 'bossDown', 'mark', 'approval', 'grad', 'return', 'act:evolve', 'act:promote', 'act:night-evolve']);

export interface Watcher {
  moments: Moment[];
  lvups: number[];
  /** 한 걸음의 사건을 받는다. now = 이 걸음 뒤의 시각(초, 호출자가 정한 기준) */
  tap: (ev: S.SimEvent[], now: number) => void;
  /** 행동이 바꾼 빈틈·붐빔은 결정할 거리로 다시 세지 않는다 */
  settle: () => void;
  /** 둔 수를 적는다 */
  act: (kind: string, now: number) => Moment;
}

/** 월드 w를 지켜보는 눈. 틱 상태(뜨거운 빈틈 수 · 빈틈 크기 · 붐비는 던전 · 구간 · 장)를 기억해 "새로 생긴 것"만 센다 */
export function makeWatcher(w: S.World): Watcher {
  const moments: Moment[] = [], lvups: number[] = [];
  const zoneOf = (x: S.World) => (x as { zone?: number }).zone ?? 0;
  const hotN = () => S.gapSegments(w).filter(sg => w.advs.some(a => a.st === 'search' && a.lv >= sg[0] && a.lv <= sg[1])).length;
  const busyOf = () => {
    const busy: Record<string, number> = {};
    for (const a of w.advs) if (a.st === 'busy' && a.near) busy[a.near] = (busy[a.near] || 0) + 1;
    return Object.values(busy).filter(n => n >= 2).length;
  };
  let hot = hotN(), gapN = S.gapSize(S.gapSegments(w)), busyN = busyOf(), zone = zoneOf(w), chapter = w.chapter;
  let recruit = !!S.recruitPick(w);
  return {
    moments, lvups,
    tap(ev, s) {
      const kinds = new Set<string>();
      const A = (k: string) => { if (!kinds.has(k)) { kinds.add(k); moments.push({ s, layer: 'A', kind: k }); } };
      const C = (k: string) => { if (!kinds.has(k)) { kinds.add(k); moments.push({ s, layer: 'C', kind: k }); } };
      for (const e of ev) {
        if (e.type === 'arrive') A('party');
        else if (e.type === 'grad') A('grad');
        else if (e.type === 'move' && e.from && e.from !== e.to) A('moveup');
        else if (e.type === 'stuck') A('stuck');
        else if (e.type === 'levelup') { lvups.push(s); if (e.lv % 5 === 0) A('lv5'); }
        else if (e.type === 'ready') C('ready');
        else if (e.type === 'mark') C('mark');
        else if (e.type === 'elite') C('elite');
        else if (e.type === 'bossCall') C('boss');
        else if (e.type === 'bossIn') A('bossIn');
        else if (e.type === 'bossDown') A('bossDown');
        else if (e.type === 'approval') C('approval');
        else if (e.type === 'box') C('box');
        else if (e.type === 'zone') A('zone');
        else if ((e as { type: string }).type === 'return') A('return');
        else if ((e as { type: string }).type === 'recruitReady') C('recruit');
      }
      const segs = S.gapSegments(w), g = S.gapSize(segs);
      const h = segs.filter(sg => w.advs.some(a => a.st === 'search' && a.lv >= sg[0] && a.lv <= sg[1])).length;
      if (h > hot) C('gap');
      if (g < gapN) A('heal');
      hot = h; gapN = g;
      const b = busyOf();
      if (b > busyN) C('busy');
      busyN = b;
      const z = zoneOf(w);
      if (z !== zone && w.chapter === chapter) A('zone');
      zone = z; chapter = w.chapter;
      // 모객을 권할 수 있게 된 순간 = 결정거리 (v1.7)
      const rp = !!S.recruitPick(w);
      if (rp && !recruit) C('recruit');
      recruit = rp;
    },
    settle() { hot = hotN(); gapN = S.gapSize(S.gapSegments(w)); recruit = !!S.recruitPick(w); },
    act(kind, s) { const m: Moment = { s, layer: 'C', kind: 'act:' + kind }; moments.push(m); return m; },
  };
}

export interface Gaps { n: number; max: number; med: number; p90: number; over20: number; longest: [number, number] }
/** from~to 사이 시각 목록의 간격 통계. 양 끝은 from·to로 닫는다 */
export function gapStats(ts: number[], from: number, to: number): Gaps {
  const xs = [from, ...ts.filter(s => s > from && s < to), to];
  const d: number[] = [];
  let longest: [number, number] = [from, from];
  for (let i = 1; i < xs.length; i++) {
    const g = xs[i] - xs[i - 1];
    d.push(g);
    if (g > longest[1] - longest[0]) longest = [xs[i - 1], xs[i]];
  }
  const s = [...d].sort((a, b) => a - b);
  return { n: xs.length - 2, max: s[s.length - 1], med: s[Math.floor(s.length / 2)], p90: s[Math.floor(s.length * 0.9)], over20: d.filter(x => x > 20.5).length, longest };
}

/** 둔 수의 갈래: 자리 · 채용 · 진화 · 상자 · 모객 · 기타 (cadence·checkin 공통) */
export const famOf = (k: string) =>
  /^act:(seat|slot)/.test(k) ? '자리' : /^act:(hire|split|crowd|expand|grow|rebuild|region)/.test(k) ? '채용' : /^act:(evolve|promote|night-evolve)/.test(k) ? '진화' : /^act:box/.test(k) ? '상자' : /^act:recruit/.test(k) ? '모객' : '기타';
export const FAMS = ['자리', '채용', '진화', '상자', '모객', '기타'];
export const med = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
export const mmss = (x: number) => { const s = Math.round(x); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
