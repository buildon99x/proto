/*
 * MSW 주식회사 — 화면 공통: 상태, 저장, 소리, 시뮬레이션 구동, HUD, 독, 오렌, 토스트
 *
 * 화면은 결과를 그릴 뿐 바꾸지 않는다. 월드를 바꾸는 것은 sim의 행동 함수뿐이다.
 * 각 화면 모듈(world·dungeon·sheets·tut)이 이 객체에 자기 함수를 붙인다.
 */
import * as M from '../sim/sim';
import { plotInfo, SPECIES, DEX_TOTAL, fieldBoss, type PlotId } from '../sim/content';
import { RULES } from '../sim/rules';
import { ART } from './art';

export type Handler = (ev: UIEvent[]) => void;
export type UIEvent = M.SimEvent
  | { type: 'placed'; mon: number; to: PlotId | null; from: PlotId | null }
  | { type: 'hired'; mon: number; placed: boolean }
  | { type: 'evolved'; mon: number; isNew: boolean }
  | { type: 'eventStart'; d: PlotId; kind: 'exp' | 'drop' }
  | { type: 'chapter'; n: number }
  | { type: 'healed'; a: number; b: number }
  | { type: 'docSeen' }
  | { type: 'released'; mon: number };

export interface OrenLine { t: string; go: (() => void) | null }

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface App {
  openBoss: () => void;
  /** 이 탭에서 실제로 흐른 플레이 시간(초). 입사 컷과 퇴근 화면은 빼고 센다 (첫 세션 길이 계측) */
  playSec: number;
  w: M.World;
  speed: number;
  demo: string | null;
  frozen: boolean;
  ui: {
    mode: 'world' | 'dungeon'; sheet: string | null; modal: string | null;
    lastInput: number; off: boolean; offAt: number; offSpeed: number; intro: boolean;
    targets: PlotId[] | null; newTok: number | null; orenGo: (() => void) | null; longAway: boolean; paused?: boolean;
  };
  checkin: { happy0: number };
  ledger: M.Ledger | null;
  handlers: Handler[];
  fit: { s: number; ox: number; oy: number };
  // 화면 모듈이 붙이는 것들
  world: any; dv: any; T: any;
  openDungeon: (id: PlotId, opt?: { hl?: string }) => void;
  closeDungeon: () => void;
  openHire: (opt?: { into?: PlotId | null; seg?: M.Seg }) => void;
  openEvolve: (monId: number) => void;
  openApproval: () => void;
  openCodex: () => void;
  openMonPop: (id: number, el: Element) => void;
  closeSheet: () => void;
  showReport: (rep: M.Report, awayMin: number) => void;
  catchUp: (minutes: number) => void;
  offDuty: (why: 'idle' | 'manual') => void;
  highlightBest: (monId: number, only?: PlotId[]) => PlotId[];
  openFullClear: () => void;
}

export const A = {
  speed: 1, demo: null, frozen: false, playSec: 0,
  ui: { mode: 'world', sheet: null, modal: null, lastInput: performance.now(), off: false, offAt: 0, offSpeed: 1, intro: false, targets: null, newTok: null, orenGo: null, longAway: false },
  checkin: { happy0: 0 }, ledger: null, handlers: [], fit: { s: 1, ox: 0, oy: 0 },
} as unknown as App;

// ── 도구 ────────────────────────────────────────────────────
export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
export const must = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => { const e = r.querySelector(s); if (!e) throw new Error('missing ' + s); return e as T; };
export const h = (html: string): HTMLElement => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
export const n = (x: number) => Math.floor(x).toLocaleString('ko-KR');
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const img = (key: string, s: number, cls = '') => { const [w, hh] = ART.size(key, s); return `<img class="px ${cls}" src="${ART.url(key, s)}" width="${w}" height="${hh}" alt="">`; };
export const sil = (key: string, s: number) => { const [w, hh] = ART.size(key, s); return `<img class="px" src="${ART.silhouette(key, s)}" width="${w}" height="${hh}" alt="">`; };
export const monArt = (m: M.Monster) => SPECIES[m.sp].art[m.stage];
export const josa = (word: string, a: string, b: string) => { const c = word.charCodeAt(word.length - 1); return word + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0 ? a : b); };
/** "~으로/로": 받침이 없거나 ㄹ이면 "로" */
export const ro = (word: string) => { const c = word.charCodeAt(word.length - 1); const j = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0; return word + (j === 0 || j === 8 ? '로' : '으로'); };
export const START_MIN = 21 * 60; // 입사는 저녁 9시 — 첫 출근 리포트가 다음 날 아침이 되게
export const clockText = (t: number) => { const tt = t + START_MIN; const d = Math.floor(tt / 1440) + 1, m = Math.floor(tt % 1440); return `D${d} · ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export const dur = (min: number) => { min = Math.round(min); const hh = Math.floor(min / 60), m = min % 60; if (hh >= 48) return `${Math.floor(hh / 24)}일 ${hh % 24}시간`; return hh ? `${hh}시간 ${m}분` : `${m}분`; };
export const lvColor = (L: number) => `hsl(${clamp(110 + (L - 1) * 2.4, 110, 285)} 62% 52%)`;
export const plotName = (id: PlotId) => plotInfo(id).name;
export const plotShort = (id: PlotId) => plotInfo(id).short;
export const segTxt = (s: M.Seg) => (s[0] === s[1] ? `Lv ${s[0]}` : `Lv ${s[0]}–${s[1]}`);
export const emit = (ev: UIEvent[]) => { for (const f of A.handlers) f(ev); };

// ── 저장 (이 브라우저에만) ──────────────────────────────────
const KEY = 'msw-inc-v2';
export function save() {
  if (!A.w || A.ui.intro || A.demo) return;
  try { localStorage.setItem(KEY, JSON.stringify({ w: A.w, tut: A.T && A.T.st, savedAt: Date.now(), checkin: A.checkin, sound: snd.on })); } catch { /* 저장 불가 환경 */ }
}
export function loadSave(): { w: unknown; tut?: unknown; savedAt: number; checkin?: { happy0: number }; sound?: boolean } | null {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* 무시 */ } }

// ── 소리 (WebAudio 합성: 신규 효과음 6종 + 원작 대체음. 경고음은 없다) ──
export const snd = (() => {
  let ac: AudioContext | null = null, on = true;
  const last: Record<string, number> = {};
  function ctx(): AudioContext | null {
    if (!ac) { try { ac = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; } }
    if (ac && ac.state === 'suspended') void ac.resume();
    return ac;
  }
  function tone(f: number, t0: number, d: number, type: OscillatorType = 'triangle', vol = 0.1, f2?: number) {
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
  }
  function noise(t0: number, d: number, vol = 0.1, freq = 1000) {
    const a = ctx(); if (!a) return;
    const len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  const lib: Record<string, () => void> = {
    levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.06, 0.16, 'square', 0.035)); tone(1319, 0.24, 0.32, 'triangle', 0.05); },
    tinyup() { tone(988, 0, 0.08, 'square', 0.018); tone(1319, 0.05, 0.1, 'square', 0.015); },
    poof() { noise(0, 0.16, 0.05, 900); },
    coin() { tone(1568, 0, 0.05, 'square', 0.018); tone(2093, 0.045, 0.08, 'square', 0.018); },
    pop() { tone(420, 0, 0.14, 'sine', 0.16, 1200); tone(1400, 0.1, 0.12, 'triangle', 0.05); }, // 빈틈 해소 "뽁"
    stamp() { tone(120, 0, 0.4, 'sine', 0.4, 40); noise(0, 0.14, 0.25, 600); }, // 결재 "쾅"
    tak() { tone(320, 0, 0.07, 'sine', 0.16, 160); noise(0, 0.05, 0.08, 2500); }, // 출근 도장 "탁"
    evolve() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle', 0.07)); [523, 659, 784, 1047].forEach(f => tone(f, 0.46, 0.7, 'triangle', 0.035)); },
    grad() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.13, 'square', 0.028)); },
    ui() { tone(700, 0, 0.05, 'sine', 0.05); },
    place() { tone(240, 0, 0.09, 'sine', 0.14, 120); noise(0, 0.06, 0.05, 1500); },
    event() { [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle', 0.06)); },
    hire() { [660, 880].forEach((f, i) => tone(f, i * 0.08, 0.14, 'triangle', 0.07)); },
    ending() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.12, 0.5, 'triangle', 0.06)); [262, 392, 523].forEach(f => tone(f, 0.8, 1.6, 'sine', 0.06)); },
  };
  const gap: Record<string, number> = { levelup: 350, tinyup: 90, poof: 120, coin: 90, grad: 250 };
  return {
    play(k: string) {
      if (!on || A.demo) return;
      const now = performance.now();
      if (last[k] && now - last[k] < (gap[k] || 40)) return;
      last[k] = now;
      try { lib[k](); } catch { /* 소리 실패는 무시 */ }
    },
    unlock: ctx,
    get on() { return on; }, set on(v: boolean) { on = v; },
  };
})();

// ── 화면 맞춤 (1280×720 무대를 창에 맞춘다) ─────────────────
export function refit() {
  const st = must('#stage');
  const s = Math.min(innerWidth / 1280, innerHeight / 720);
  const ox = (innerWidth - 1280 * s) / 2, oy = (innerHeight - 720 * s) / 2;
  A.fit = { s, ox, oy };
  const tf = `translate(${ox}px,${oy}px) scale(${s})`;
  st.style.transform = tf; st.style.setProperty('--fit', tf);
  document.body.classList.toggle('portrait', innerHeight > innerWidth * 1.15);
}
export const toStage = (cx: number, cy: number): [number, number] => [(cx - A.fit.ox) / A.fit.s, (cy - A.fit.oy) / A.fit.s];
export const rectOf = (el: Element) => { const r = el.getBoundingClientRect(); const [x, y] = toStage(r.left, r.top); return { x, y, w: r.width / A.fit.s, h: r.height / A.fit.s }; };
export const shake = () => { const st = must('#stage'); st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); };

// ── 토스트 (되돌리기 5초) ───────────────────────────────────
export function toast(msg: string, opt: { undo?: () => void; bad?: boolean } = {}) {
  const box = must('#toast');
  const el = h(`<div class="tst ${opt.bad ? 'bad' : ''}"><span>${msg}</span></div>`);
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild!.remove();
  const life = opt.undo ? 5 : opt.bad ? 2.4 : 2.6;
  if (opt.undo) {
    const b = h(`<button>되돌리기 5</button>`);
    el.appendChild(b);
    let k = 5;
    const iv = setInterval(() => { k--; b.textContent = '되돌리기 ' + k; if (k <= 0) clearInterval(iv); }, 1000);
    b.onclick = () => { clearInterval(iv); opt.undo!(); el.remove(); snd.play('ui'); refresh(); };
  }
  setTimeout(() => el.remove(), life * 1000);
}
export const nope = (msg: string) => toast(msg, { bad: true });

// ── HUD ─────────────────────────────────────────────────────
const shown = { happy: 0, smile: 0 };
export function hudTick(dt: number) {
  const w = A.w;
  const hc = M.happyCount(w);
  shown.happy = Math.abs(hc - shown.happy) < 0.6 ? hc : lerp(shown.happy, hc, Math.min(1, dt * 6));
  shown.smile = Math.abs(w.smile - shown.smile) < 1 ? w.smile : lerp(shown.smile, w.smile, Math.min(1, dt * 5));
  must('#vHappy').textContent = String(Math.round(shown.happy));
  const d = hc - A.checkin.happy0;
  must('#vHappyD').textContent = d > 0 ? '▲' + d : '';
  must('#vSmile').textContent = n(shown.smile);
  must('#vClock').textContent = clockText(w.t);
}
export function hudStatic() {
  const w = A.w;
  must('#vStars').innerHTML = '★'.repeat(w.stars) + '<i>' + '★'.repeat(5 - w.stars) + '</i>';
  must('#vDex').textContent = String(M.dexCount(w));
  must('#vDexT').textContent = String(DEX_TOTAL);
  must('#bSound').textContent = snd.on ? '🔊' : '🔇';
  $$('.proto [data-speed]').forEach(b => b.classList.toggle('on', +(b.dataset.speed || 0) === A.speed));
}

// ── 독: 대기실, 빈 부지, 결재 서류 ──────────────────────────
export function renderDock(opt: { all?: boolean } = {}) {
  const w = A.w;
  const tr = M.tray(w);
  must('#vTray').textContent = `${tr.length}/${M.TRAY_MAX}`;
  // 진화 대기 칩: 월드 위 ▲로 띄우지 않은 진화 가능 직원 (F3)
  const held = heldEvolves(w);
  const chip = must('#evChip');
  chip.hidden = !held.length;
  chip.innerHTML = `▲ 진화 대기 <b>${held.length}</b>`;
  chip.title = '근속이 찼지만 지금 진화하면 길이 끊기는 직원이에요. 눌러서 결과를 미리 봐요';
  const trayEl = must('#tray');
  trayEl.innerHTML = '';
  tr.slice(0, 4).forEach(m => {
    trayEl.appendChild(h(`<div class="tok ${A.ui.newTok === m.id ? 'new' : ''} ${m.sp === 'balrog' ? 'story' : ''}" data-mon="${m.id}" title="${M.monName(m)} Lv ${M.monLevel(m)} · 끌어서 던전에 놓아요">${img('m:' + monArt(m), 2)}<span>Lv ${M.monLevel(m)}</span></div>`));
  });
  if (tr.length > 4) trayEl.appendChild(h(`<div class="tok more" title="대기실 전체">+${tr.length - 4}</div>`));
  if (!tr.length) trayEl.appendChild(h(`<div class="trayempty">비어 있어요. 채용한 직원은 여기서 기다려요</div>`));

  const pl = must('#plots');
  pl.innerHTML = '';
  const lv = M.levelsOf(w);
  // 추천 부지와 이미 열린 빈 던전이 먼저. 드래그 중에는 전부 펼친다
  const tg = A.ui.targets || [];
  const empties = Object.keys(w.plots).filter(id => !lv[id])
    .sort((a, b) => (+tg.includes(b) - +tg.includes(a)) || (+w.plots[b].open - +w.plots[a].open) || (plotInfo(a).region - plotInfo(b).region));
  must('.plotsw').classList.toggle('expanded', !!opt.all && empties.length > 2);
  empties.slice(0, opt.all ? 15 : 2).forEach(id => {
    const open = w.plots[id].open;
    pl.appendChild(h(`<div class="plot ${tg.includes(id) ? 'target' : ''}" data-plot="${id}"><b>${plotName(id)}</b>${open ? '<em class="okc">빈 던전</em>' : w.tickets.plot > 0 ? '<em class="okc">🎫 개업권</em>' : `<em><i class="mini-can"></i>${n(M.plotCost(id))}</em>`}</div>`));
  });
  if (!empties.length) pl.appendChild(h(`<div class="plot none">${w.chapter < 5 ? '부지를 다 썼어요. 다음 결재 때 부지 +3' : '부지를 다 썼어요'}</div>`));
  if (!opt.all && empties.length > 2) pl.lastElementChild!.insertAdjacentHTML('beforeend', ` <small>+${empties.length - 2}</small>`);
  renderDoc();
  renderBoss();
}

/** 필드 보스 카드 (v1.3): 초대 기다림이면 [어디서 맞을까?], 방문 중이면 토벌 게이지 */
export function renderBoss() {
  const w = A.w, el = must('#bossCard');
  const b = w.boss, fb = b && fieldBoss(b.ch);
  if (!b || !fb || A.ui.mode !== 'world' || A.ui.sheet === 'boss') { el.hidden = true; return; }
  el.hidden = false;
  el.classList.toggle('wait', !b.d);
  if (!b.d) {
    const left = Math.max(0, b.at + (RULES.fieldBoss ? RULES.fieldBoss.wait : 0) - w.t);
    el.innerHTML = `${img('m:' + fb.art, 2)}<span><b>👑 ${fb.name} · Lv ${fb.lv}</b><small>눌러서 맞을 던전 고르기 · ${dur(left)} 뒤 자동</small></span>`;
    el.title = '필드 보스 초대장';
  } else {
    const pct = Math.min(100, Math.floor((100 * b.kills) / Math.max(1, M.bossNeed(b.ch))));
    el.innerHTML = `${img('m:' + fb.art, 2)}<span><b>👑 ${fb.name} · ${plotShort(b.d)}</b><small>토벌 ${pct}% · 자리 +${RULES.fieldBoss?.seats} · 결재 ② ×${RULES.fieldBoss?.joyX}</small></span><div class="bar"><i style="width:${pct}%;background:var(--smile)"></i></div>`;
    el.title = '방문 중인 필드 보스 — 눌러서 그 던전 보기';
  }
}

/** 근속이 찼지만 월드 위 ▲로 띄우지 않은 직원 (보류가 맞거나, 안전한 것이 이미 3개) */
export function heldEvolves(w: M.World): M.Monster[] {
  if (A.T && A.T.hideEvolve()) return [];
  const picks = M.evolvePicks(w);
  return w.monsters.filter(m => M.canEvolve(m) && !picks.get(m.id)?.shown)
    .sort((a, b) => (picks.get(a.id)!.rank - picks.get(b.id)!.rank) || (b.tenure - M.evolveNeed(b)) - (a.tenure - M.evolveNeed(a)));
}

/** 결재 조건 ②: 이번 장 누적 즐거움. 지금 속도로 며칠 남았는지도 함께 */
export function joyText(w: M.World) {
  const c = M.approvalConds(w);
  const goal = c.joyGoal || 0;
  const perDay = M.happyCount(w) * 24;
  const left = Math.max(0, goal - c.joy);
  const eta = left <= 0 ? '' : perDay > 0 ? (left / perDay < 1 ? `약 ${Math.max(1, Math.round(left / perDay * 24))}시간` : `약 ${(left / perDay).toFixed(1)}일`) : '';
  return { goal, joy: c.joy, pct: goal ? Math.min(100, (100 * c.joy) / goal) : 0, eta, ok: c.happy };
}

/** 눈금 보상 한 칸의 이름 */
export function markLabel(r: M.MarkReward): string {
  if (r.kind === 'hire') return `🎟 ${SPECIES[r.sp].names[0]} 채용권`;
  if (r.kind === 'event') return `🎫 무료 이벤트권${r.n > 1 ? ' ' + r.n + '장' : ''}`;
  return '👑 필드 보스 방문';
}
/** ② 막대 위 눈금 (2장부터). 지난 눈금은 채워져 보인다 */
export function markTicks(w: M.World): string {
  const jm = RULES.joyMarks;
  if (!jm || w.chapter < jm.from || w.ended) return '';
  return jm.at.map((p, i) => `<b class="nt ${i < w.marks.length ? 'on' : ''}" style="left:${p * 100}%" title="${Math.round(p * 100)}% · ${markLabel(w.marks[i] || M.markReward(w, i))}${i < w.marks.length ? ' (받음)' : ''}"></b>`).join('');
}
/** 자리 확장 +4가 결재 ②를 얼마나 당기는가 (기다리는 사람이 앉을 때만). 시간 단위 */
export function seatJoyGain(w: M.World, did: PlotId): number {
  const c = M.approvalConds(w);
  if (!c.joyGoal || c.happy || w.approvalReady) return 0;
  const hc = M.happyCount(w), wait = w.advs.filter(a => a.st === 'busy' && a.near === did).length;
  const extra = Math.min(M.SEAT_STEP, wait);
  if (!hc || !extra) return 0;
  const left = c.joyGoal - c.joy;
  return left / hc - left / (hc + extra);
}

export function renderDoc() {
  const w = A.w;
  const doc = must('#doc');
  if (w.ended) {
    const fc = M.fullClear(w);
    doc.classList.remove('ready');
    doc.innerHTML = `<h5>완전 클리어</h5><h4>섬 전체에 불이 켜졌어요</h4>
      <div class="stampslot done">완료</div>
      <div class="cond ${fc.starred >= fc.plots ? 'ok' : ''}"><span class="t">던전 ★3</span><div class="bar"><i style="width:${100 * fc.starred / fc.plots}%;background:var(--smile)"></i></div><span class="v">${fc.starred}/${fc.plots}</span></div>
      <div class="cond ${fc.dex >= DEX_TOTAL ? 'ok' : ''}"><span class="t">도감</span><div class="bar"><i style="width:${100 * fc.dex / DEX_TOTAL}%;background:var(--evolve)"></i></div><span class="v">${fc.dex}/${DEX_TOTAL}</span></div>`;
    return;
  }
  const ch = M.chapterInfo(w), c = M.approvalConds(w), j = joyText(w);
  doc.classList.toggle('ready', w.approvalReady);
  doc.classList.toggle('c3', c.needBalrog);
  doc.innerHTML = `
    <h5>결재 서류 · ${ch.n}장</h5><h4>${ch.region}${ch.n === 1 ? '를' : '까지'} 잇자</h4>
    <div class="stampslot">${w.approvalReady ? '도장<br>받기' : '결재<br>대기'}</div>
    <div class="cond ${w.approvalReady || c.road ? 'ok' : ''}"><span class="t">① Lv 1–${ch.road} 잇기</span><div class="bar"><i style="width:${Math.round(100 * (ch.road - c.gapN) / ch.road)}%"></i></div><span class="v ${!c.road && !w.approvalReady ? 'no' : ''}">${w.approvalReady || c.road ? '✓' : '빈틈 ' + c.gapN}</span></div>
    <div class="cond ${w.approvalReady || j.ok ? 'ok' : ''}"><span class="t">② 즐거운 시간</span><div class="bar mk"><i style="width:${w.approvalReady ? 100 : j.pct}%;background:var(--smile)"></i>${markTicks(w)}</div><span class="v">${w.approvalReady || j.ok ? '✓' : Math.floor(j.pct) + '%'}</span></div>
    ${c.needBalrog ? `<div class="cond ${c.balrog && c.native ? 'ok' : ''}"><span class="t">③ 발록${c.needNative ? '·식구' : ''} 던전</span><span class="v" style="margin-left:auto">${c.balrog && c.native ? '✓' : c.needNative ? `${+c.balrog + +c.native}/2` : '개장 전'}</span></div>` : ''}`;
}

// ── 오렌 (지금 가장 급한 한 가지, 1줄) ──────────────────────
export function orenPick(): OrenLine {
  const w = A.w;
  if (A.T && A.T.active()) return A.T.line();
  if (A.ui.longAway) return { t: '매니저님 어디 가셨었어요?! 하루 넘게 비우시면 월드가 멈춰 있어요!!', go: () => { A.ui.longAway = false; renderOren(); } };
  if (w.approvalReady) return { t: w.chapter >= 5 ? '매니저님!! 마지막 결재 서류예요!! 도장 받으러 가요!!' : '매니저님!! 결재 서류에 도장 받을 수 있어요!!', go: () => A.openApproval() };
  if (w.boss && !w.boss.d) { const fb = fieldBoss(w.boss.ch); if (fb) return { t: `필드 보스 ${fb.name}가 찾아왔어요!! 어느 던전에서 맞을지 골라요!!`, go: () => A.openBoss() }; }
  const bal = w.monsters.find(m => m.sp === 'balrog' && !m.d);
  if (bal) return { t: '주니어 발록 씨가 입사했어요!! 대기실에서 끌어서 빈 부지에 놓아 주세요!!', go: () => A.highlightBest(bal.id) };
  const trNew = A.ui.newTok != null ? M.tray(w).find(m => m.id === A.ui.newTok) : null;
  if (trNew) return { t: `대기실에 ${josa(M.monName(trNew), '이', '가')} 기다려요!! 초록으로 빛나는 곳에 놓아주세요!!`, go: () => A.highlightBest(trNew.id) };
  const b = M.badges(w);
  if (M.needsNative(w) && !M.hasNativeDungeon(w) && !bal && !M.gapSegments(w).length) {
    const nat = M.tray(w).find(m => M.isNative(m.sp));
    if (nat) return { t: `${josa(M.monName(nat), '을', '를')} 빈 부지에 놓아요!! 결재 ③ 슬리피우드 식구 던전이 돼요!!`, go: () => A.highlightBest(nat.id) };
    return { t: '결재 ③에 슬리피우드 식구가 필요해요!! 드레이크나 이블아이를 뽑아 빈 부지에 놓아요!!', go: () => A.openHire() };
  }
  const gaps = b.filter((x): x is Extract<M.Badge, { kind: 'gap' }> => x.kind === 'gap');
  const gap = gaps.filter(x => x.n > 0).sort((p, q) => q.n - p.n)[0] || gaps[0];
  if (gap) {
    const rng = segTxt(gap.seg);
    const entrance = gap.seg[0] === 1;
    if (!M.recommendSpecies(w, gap.seg)) {
      const g = M.recommendGrow(w, gap.seg);
      const grow = g && M.growingToward(w, gap.seg);
      // F4: 이미 근속이 찼으면 기다리라고 하지 않는다 — 지금 진화 시트로 보낸다
      if (grow && M.canEvolve(grow)) return { t: `${rng}는 ${josa(M.monName(grow), '이', '가')} 지금 진화할 수 있어요!! ▲ 눌러서 승진 발령해요!!`, go: () => A.openEvolve(grow.id) };
      // v1.3.1: 이미 닿는 직원이 있으면 기다리라고 하기 전에 옮기라고 한다 (1장 Lv 14–15 정체)
      const mv = M.moveFix(w, gap.seg);
      if (mv) {
        const pay = mv.cost === 0 ? (mv.ticket ? ' 개업권이 있어서 공짜예요!!' : '') : ` 개업 스마일 ${n(mv.cost)}!!`;
        return { t: `${rng}는 ${josa(M.monName(mv.mon), '을', '를')} “${plotName(mv.to)}”${ro(plotName(mv.to)).slice(plotName(mv.to).length)} 옮기면 이어져요!!${pay}`, go: () => A.highlightBest(mv.mon.id, [mv.to]) };
      }
      if (grow) return { t: `${rng}는 ${josa(M.monName(grow), '이', '가')} 진화하면 이어져요!! 근속을 기다려요!!`, go: null };
      if (g) return { t: `${rng}는 채용으로는 안 닿아요!! ${josa(SPECIES[g.sp].names[0], '을', '를')} 뽑아 키워봐요!!`, go: () => A.openHire({ seg: gap.seg }) };
    }
    if (entrance && gap.n) return { t: `매니저님!! 입구가 막혔어요!! 새로 온 모험가님 ${gap.n}명이 혼자 걷고 있어요!!`, go: () => A.openHire({ seg: gap.seg }) };
    return { t: gap.n ? `매니저님!! ${rng} 모험가님 ${gap.n}명이 갈 데가 없대요!!` : `${josa(rng, '이', '가')} 끊겨 있어요!! 길을 이어요!!`, go: () => A.openHire({ seg: gap.seg }) };
  }
  const tr = M.tray(w);
  if (tr.length) return { t: `대기실에 ${josa(M.monName(tr[0]), '이', '가')} 기다려요!! 던전에 놓거나 본사로 보내요!!`, go: () => A.highlightBest(tr[0].id) };
  const busy = b.filter((x): x is Extract<M.Badge, { kind: 'busy' }> => x.kind === 'busy').sort((p, q) => q.n - p.n)[0];
  if (busy && busy.n >= 2) return { t: `${plotName(busy.d)} 만원이에요!! 자리를 늘리거나 옆 던전에 드랍 이벤트를 걸어봐요!!`, go: () => A.openDungeon(busy.d, { hl: 'seat' }) };
  const ev = b.find((x): x is Extract<M.Badge, { kind: 'evolve' }> => x.kind === 'evolve' && x.shown);
  if (ev) { const m = w.monsters.find(x => x.id === ev.mon)!; return { t: `${josa(M.monName(m), '이', '가')} 진화할 수 있대요!! ▲를 눌러봐요!!`, go: () => A.openEvolve(m.id) }; }
  if (w.ended) {
    const fc = M.fullClear(w);
    if (fc.starred < fc.plots || fc.dex < DEX_TOTAL) return { t: `완전 클리어까지 던전 ★3 ${fc.plots - fc.starred}곳, 도감 ${DEX_TOTAL - fc.dex}칸 남았어요!!`, go: () => A.openFullClear() };
    return { t: '완전 클리어!! 매니저님은 이 섬의 전설이에요!!', go: null };
  }
  if (w.tickets.event > 0 && M.activeEvents(w) < M.maxEvents(w)) return { t: `무료 이벤트권 ${w.tickets.event}장 있어요!! 붐비는 던전에 경험치 2배 걸어봐요!!`, go: () => { const occ = (id: string) => w.advs.filter(a => a.st === 'happy' && a.d === id).length; const id = Object.keys(M.levelsOf(w)).filter(x => !w.dungeons[x].event).sort((p, q) => occ(q) - occ(p))[0]; if (id) A.openDungeon(id, { hl: 'exp' }); } };
  if (M.activeEvents(w) === 0 && w.smile > 1500) return { t: '스마일이 넉넉해요!! 경험치 2배 한 번 어때요?!', go: () => { const lv = M.levelsOf(w); const id = Object.keys(lv).sort((p, q) => lv[p] - lv[q])[0]; if (id) A.openDungeon(id, { hl: 'exp' }); } };
  const j = joyText(w);
  const idle = [
    j.eta ? `결재까지 즐거운 시간 ${Math.floor(j.pct)}%!! 지금 속도면 ${j.eta} 남았어요!!` : '오늘도 다들 퇴근 잘하고 있어요!!',
    '직원들이 퇴근할수록 근속이 쌓여요!!', '모험가님들 표정 좀 보세요!! 😊', '매니저님 퇴근하셔도 월드는 돌아가요!!',
  ];
  return { t: idle[Math.floor(w.t / 7) % idle.length], go: null };
}
let lastOren = '';
export function renderOren() {
  const o = orenPick();
  A.ui.orenGo = o.go;
  if (o.t !== lastOren) {
    lastOren = o.t;
    const b = must('#orenTxt');
    b.textContent = o.t;
    b.classList.remove('new'); void b.offsetWidth; b.classList.add('new');
    must('#orenF .bubble').textContent = o.t;
  }
  must('#oren').classList.toggle('act', !!o.go);
  // 시트가 독을 가리면 오렌이 시트 위로 올라온다 (진화 시트는 월드를 가리지 않게 예외)
  const f = must('#orenF');
  const want = !!A.ui.sheet && A.ui.sheet !== 'evolve';
  if (f.hidden === want) { f.hidden = !want; if (want) must<HTMLImageElement>('#orenFImg').src = ART.url('oren', 2); }
}

// ── 시뮬레이션 구동 ─────────────────────────────────────────
let acc = 0;
export function simLive(dtReal: number) {
  if (A.ui.off || A.ui.intro || A.ui.modal === 'report' || A.ui.modal === 'ending' || A.ui.paused) return;
  // 튜토리얼이 배속을 걸 수 있다 (F6: "가로 = 레벨" 단계 ×3 — 누를 곳 없는 3분을 1분으로)
  acc += (dtReal / 60) * A.speed * (A.T && A.T.boost ? A.T.boost() : 1);
  let k = 0;
  while (acc >= 1 / 600 && k < 12) {
    const d = Math.min(acc, 1);
    const ev: M.SimEvent[] = [];
    M.step(A.w, d, ev);
    if (A.ledger) M.ledgerAdd(A.ledger, A.w, ev);
    if (ev.length) emit(ev);
    acc -= d; k++;
  }
  if (k >= 12) acc = 0;
}

/** 상태가 바뀌는 행동 뒤에 부른다 */
export function refresh() {
  renderDock(); hudStatic(); renderOren();
  if (A.world) A.world.dirty = true;
  if (A.ui.mode === 'dungeon' && A.dv) A.dv.panel();
  save();
}

export { M, RULES };
