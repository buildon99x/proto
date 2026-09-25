/*
 * MSW 주식회사 — 월드 시뮬레이션 (규칙 R1~R5, 03-systems.md)
 *
 * 화면과 분리된 순수 로직이다. 브라우저(index.html)와 Node(pacing-check.js)가 같은 파일을 쓴다.
 * 서버 시간 모델: 화면이 켜져 있든 아니든 같은 step()으로 월드를 굴린다.
 * 단위: 시간은 월드 분(minute). step(w, dt)는 dt분만큼 진행한다.
 */
(function (root) {
  'use strict';

  // ── 콘텐츠 ────────────────────────────────────────────────
  const SPECIES = {
    snail: { names: ['달팽이', '파란 달팽이', '빨간 달팽이', '마노'], art: ['snail', 'bsnail', 'rsnail', 'mano'], base: 2, trait: 'fast', boss: true, cost: 200, chapter: 1 },
    mush: { names: ['주황버섯', '뿔버섯', '좀비버섯'], art: ['mush', 'horn', 'zombie'], base: 8, trait: null, boss: false, cost: 800, chapter: 1 },
    slime: { names: ['슬라임', '버블 슬라임', '퍼플 슬라임', '킹 슬라임'], art: ['slime', 'slime2', 'slime3', 'kslime'], base: 15, trait: 'gift', boss: true, cost: 1500, chapter: 2 },
    stump: { names: ['스텀프', '다크 스텀프', '액스 스텀프', '스텀피'], art: ['stump', 'dstump', 'astump', 'stumpy'], base: 28, trait: 'strong', boss: true, cost: 2800, chapter: 3 },
  };
  const TRAITS = {
    fast: { icon: '⏩', name: '빨리 큰다', desc: '근속 ×1.5' },
    gift: { icon: '🎁', name: '잘 퍼준다', desc: '던전 스마일 ×1.3' },
    strong: { icon: '💪', name: '튼튼하다', desc: '던전 레벨업 ×1.2' },
  };
  const EVOLVE_NEED = [2000, 12000, 45000];
  const CHAPTERS = [
    { n: 1, region: '헤네시스', road: 15, happy: 20 },
    { n: 2, region: '엘리니아', road: 30, happy: 60 },
    { n: 3, region: '페리온', road: 45, happy: 110 },
    { n: 4, region: '커닝시티', road: 60, happy: 160 },
    { n: 5, region: '슬리피우드', road: 70, happy: 220 },
  ];
  const REGIONS = [
    { n: 1, name: '헤네시스', from: 0, to: 15 },
    { n: 2, name: '엘리니아', from: 15, to: 30 },
    { n: 3, name: '페리온', from: 30, to: 45 },
    { n: 4, name: '커닝시티', from: 45, to: 60 },
    { n: 5, name: '슬리피우드', from: 60, to: 75 },
  ];
  const PLOTS = [
    { id: 'h1', name: '헤네시스 들판', region: 1 },
    { id: 'h2', name: '헤네시스 사냥터', region: 1 },
    { id: 'h3', name: '버섯 언덕', region: 1 },
    { id: 'e1', name: '숲 입구', region: 2 },
    { id: 'e2', name: '나무 위 쉼터', region: 2 },
    { id: 'e3', name: '마법 숲', region: 2 },
    { id: 'p1', name: '바위 언덕', region: 3 },
    { id: 'p2', name: '불타는 땅', region: 3 },
    { id: 'p3', name: '전사의 길', region: 3 },
  ];
  const SEAT_BASE = 8, SEAT_STEP = 4, SEAT_COST = [500, 1000, 2000];
  const SLOT_BASE = 3, SLOT_COST = [1000, 3000];
  const EVENT_MIN = 240;
  const TRAY_MAX = 10;
  const BUFF_MIN = 15, BUFF_X = 30;
  const SMILE_HAPPY = 0.25, SMILE_LEVELUP = 2, SMILE_GRAD = 20; // 즐거운 모험가 1명 = 4분에 스마일 1
  const VET_TENURE = 1600;

  // ── 결정적 난수 ───────────────────────────────────────────
  function rnd(w) {
    let t = (w.rng = (w.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ── 월드 생성 ─────────────────────────────────────────────
  function createWorld(seed) {
    const w = {
      v: 1, seed: seed >>> 0, rng: seed >>> 0, t: 0,
      smile: 500, chapter: 1, stars: 0, approvalReady: false,
      plots: {}, dungeons: {}, monsters: [], advs: [],
      nextMon: 1, nextAdv: 1, arrAcc: 0,
      dex: {},
      tut: { buffUntil: BUFF_MIN, instant: 3, ticket: 'mush', freeEvent: 1 },
      stats: { arrivals: 0, levelups: 0, grads: 0, left: { entrance: 0, search: 0, busy: 0 } },
    };
    unlockPlots(w, 1);
    w.plots.h1.open = true;
    w.plots.h2.open = true; // 입사 선물: 두 번째 부지
    w.dungeons.h1.seats = SEAT_BASE + SEAT_STEP; w.dungeons.h1.seatUp = 1; // 입사 선물: 들판 자리 12석 (첫날 밤 입구가 덜 막힌다)
    addMonster(w, 'snail', 'h1', { tenure: VET_TENURE, vet: true });
    addMonster(w, 'snail', 'h1');
    return w;
  }

  function unlockPlots(w, region) {
    PLOTS.filter(p => p.region === region).forEach(p => {
      if (!w.plots[p.id]) w.plots[p.id] = { open: false };
      if (!w.dungeons[p.id]) w.dungeons[p.id] = { id: p.id, slots: SLOT_BASE, seats: SEAT_BASE, seatUp: 0, slotUp: 0, event: null, joy: 0, recentLv: 0 };
    });
  }

  function addMonster(w, sp, d, opt) {
    opt = opt || {};
    const m = { id: w.nextMon++, sp, stage: 0, tenure: opt.tenure || 0, work: 0, d: d || null, vet: !!opt.vet };
    m.no = w.monsters.filter(x => x.sp === sp).length + 1;
    w.monsters.push(m);
    w.dex[sp + ':0'] = true;
    return m;
  }

  // ── 파생 값 ───────────────────────────────────────────────
  const monLevel = m => SPECIES[m.sp].base + 8 * m.stage;
  const monName = m => SPECIES[m.sp].names[m.stage];
  const maxStage = m => SPECIES[m.sp].names.length - 1;
  const isBoss = m => SPECIES[m.sp].boss && m.stage === 3;
  const evolveNeed = m => (m.stage < maxStage(m) ? EVOLVE_NEED[m.stage] : Infinity);
  const canEvolve = m => m.stage < maxStage(m) && m.tenure >= evolveNeed(m);
  const roadEnd = w => CHAPTERS[w.chapter - 1].road;
  const chapterInfo = w => CHAPTERS[w.chapter - 1];
  const plotInfo = id => PLOTS.find(p => p.id === id);
  const monsIn = (w, did) => w.monsters.filter(m => m.d === did);
  const tray = w => w.monsters.filter(m => !m.d);
  const maxEvents = w => (w.chapter >= 3 ? 3 : 2);
  const activeEvents = w => Object.values(w.dungeons).filter(d => d.event).length;

  /** 던전 레벨 목록. mods로 가상의 변화를 얹어 미리보기에 쓴다. */
  function levelsOf(w, mods) {
    mods = mods || {};
    const byD = {};
    for (const m of w.monsters) {
      let d = m.d, stage = m.stage;
      if (mods.move && mods.move.id === m.id) d = mods.move.to;
      if (mods.evolve === m.id) stage = m.stage + 1;
      if (!d || !w.plots[d] || !w.plots[d].open) {
        if (!(mods.open && mods.open === d)) continue;
      }
      (byD[d] = byD[d] || []).push(SPECIES[m.sp].base + 8 * stage);
    }
    const out = {};
    for (const d in byD) {
      const a = byD[d];
      out[d] = Math.round(a.reduce((s, x) => s + x, 0) / a.length);
    }
    return out;
  }

  function coveredSet(levels) {
    const c = new Uint8Array(101);
    for (const d in levels) {
      const D = levels[d];
      for (let L = Math.max(1, D - 5); L <= Math.min(100, D + 5); L++) c[L] = 1;
    }
    return c;
  }

  /** 길(1 ~ 졸업선) 위의 빈틈 구간 목록 [[a,b], ...] */
  function gapSegments(w, levels) {
    levels = levels || levelsOf(w);
    const c = coveredSet(levels), end = roadEnd(w), segs = [];
    let s = null;
    for (let L = 1; L <= end; L++) {
      if (!c[L]) { if (s === null) s = L; }
      else if (s !== null) { segs.push([s, L - 1]); s = null; }
    }
    if (s !== null) segs.push([s, end]);
    return segs;
  }

  const happyCount = w => w.advs.filter(a => a.st === 'happy').length;

  function dungeonInfo(w) {
    const lv = levelsOf(w), info = {};
    for (const id in lv) {
      const d = w.dungeons[id], ms = monsIn(w, id);
      info[id] = {
        id, D: lv[id], lo: lv[id] - 5, hi: lv[id] + 5, seats: d.seats, occ: 0,
        drop: d.event && d.event.type === 'drop', exp: d.event && d.event.type === 'exp',
        gift: ms.some(m => SPECIES[m.sp].trait === 'gift'),
        strong: ms.some(m => SPECIES[m.sp].trait === 'strong'),
        boss: ms.some(isBoss), mons: ms,
      };
    }
    return info;
  }

  // ── 한 걸음 ───────────────────────────────────────────────
  /**
   * dt분 진행. out은 연출·리포트용 사건 목록(선택).
   * 순서: 도착 → 이동 판정 → 레벨업 → 퇴근 분배(근속) → 스마일 → 결재 판정
   */
  function step(w, dt, out) {
    const emit = out ? e => out.push(e) : () => {};
    const buffOn = w.t < w.tut.buffUntil;
    const bx = buffOn ? BUFF_X : 1;
    const info = dungeonInfo(w);
    const end = roadEnd(w);

    // 1. 도착
    const spawn = () => {
      const a = { id: w.nextAdv++, lv: 1, prog: 0, st: 'new', d: null, near: null, wait: 0, look: Math.floor(rnd(w) * 6), jit: rnd(w) * 0.7 - 0.35 };
      w.advs.push(a); w.stats.arrivals++; emit({ type: 'arrive', id: a.id });
    };
    while (w.tut.instant > 0) { w.tut.instant--; spawn(); }
    const perMin = buffOn ? 1 : (6 * (1 + 0.5 * w.stars)) / 60;
    w.arrAcc += perMin * dt;
    while (w.arrAcc >= 1) { w.arrAcc -= 1; spawn(); }

    // 2. 이동 판정 — 머무는 사람의 자리를 먼저 잡는다
    const keep = new Set();
    for (const a of w.advs) {
      const cur = a.d && info[a.d];
      if (a.lv < end && cur && a.lv >= cur.lo && a.lv <= cur.hi && a.st === 'happy') { cur.occ++; keep.add(a.id); }
    }
    const gone = [];
    for (const a of w.advs) {
      if (a.lv >= end) { gone.push(a); w.stats.grads++; w.smile += SMILE_GRAD; emit({ type: 'grad', id: a.id, from: a.d }); continue; }
      if (keep.has(a.id)) { a.wait = 0; continue; }
      const prevSt = a.st, from = a.d;
      a.d = null;
      const cands = Object.values(info).filter(x => a.lv >= x.lo && a.lv <= x.hi);
      if (!cands.length) {
        // 갈 곳이 없으면 그 자리(입구 포함)에 😐로 멈춰 기다린다. 60분이 지나면 떠난다
        if (prevSt !== 'search') a.wait = 0;
        a.st = 'search'; a.near = null; a.wait += dt;
        if (prevSt !== 'search') emit({ type: 'stuck', id: a.id, lv: a.lv, from });
        if (a.wait >= 60) {
          const why = a.lv === 1 && !a.seen ? 'entrance' : 'search';
          gone.push(a); w.stats.left[why]++; emit({ type: 'leave', id: a.id, why });
        }
        continue;
      }
      const free = cands.filter(x => x.occ < x.seats);
      if (!free.length) {
        if (prevSt !== 'busy') a.wait = 0;
        a.st = 'busy'; a.near = cands[0].id; a.wait += dt;
        if (a.wait >= 30) { gone.push(a); w.stats.left.busy++; emit({ type: 'leave', id: a.id, why: 'busy' }); }
        continue;
      }
      free.sort((p, q) => (q.drop - p.drop) || ((q.seats - q.occ) - (p.seats - p.occ)) || (q.D - p.D));
      const to = free[0];
      to.occ++; a.d = to.id; a.st = 'happy'; a.wait = 0; a.near = null; a.seen = true;
      emit({ type: 'move', id: a.id, from, to: to.id, was: prevSt });
    }
    if (gone.length) {
      const g = new Set(gone.map(a => a.id));
      w.advs = w.advs.filter(a => !g.has(a.id));
    }

    // 3~6. 즐거운 모험가가 만드는 것: 레벨업, 퇴근(근속), 스마일
    const happyBy = {};
    for (const a of w.advs) {
      if (a.st !== 'happy') continue;
      const d = info[a.d];
      (happyBy[a.d] = happyBy[a.d] || []).push(a);
      const speed = bx * (d.exp ? 2 : 1) * (d.strong ? 1.2 : 1);
      a.prog += dt * speed;
      let need = 10 + a.lv;
      while (a.prog >= need) {
        a.prog -= need; a.lv++; w.smile += SMILE_LEVELUP; w.stats.levelups++;
        w.dungeons[a.d].recentLv += 1;
        emit({ type: 'levelup', id: a.id, lv: a.lv, d: a.d });
        need = 10 + a.lv;
        // 적정 구간을 벗어나면 더는 즐겁지 않다 — 큰 걸음에서도 빈틈을 건너뛰지 못한다
        if (a.lv > d.hi) { a.prog = 0; break; }
      }
    }
    for (const id in info) {
      const d = info[id], hs = happyBy[id] || [], dd = w.dungeons[id];
      dd.recentLv *= Math.exp(-dt / 60);
      if (!hs.length) continue;
      const kills = hs.length * dt;
      const share = kills / d.mons.length;
      for (const m of d.mons) {
        const before = canEvolve(m);
        m.work += share;
        m.tenure += share * bx * (SPECIES[m.sp].trait === 'fast' ? 1.5 : 1);
        if (!before && canEvolve(m)) emit({ type: 'ready', mon: m.id });
      }
      emit({ type: 'kill', d: id, n: kills });
      w.smile += SMILE_HAPPY * hs.length * dt * (d.drop ? 2 : 1) * (d.gift ? 1.3 : 1) * (d.boss ? 1.5 : 1);
      dd.joy += hs.length * dt / 60;
    }

    // 이벤트 종료
    for (const id in w.dungeons) {
      const d = w.dungeons[id];
      if (d.event && w.t + dt >= d.event.end) { emit({ type: 'eventEnd', d: id, kind: d.event.type }); d.event = null; }
    }

    w.t += dt;

    // 결재 판정 — 한 번 채우면 서류가 올라와 기다린다
    if (!w.approvalReady && !w.ended && w.chapter <= CHAPTERS.length) {
      if (!gapSegments(w).length && happyCount(w) >= chapterInfo(w).happy) {
        w.approvalReady = true; emit({ type: 'approval' });
      }
    }
  }

  /** 오프라인 진행: 1분 단위, 최대 24시간. 리포트용 장부를 돌려준다. */
  function advance(w, minutes, ledger) {
    const n = Math.min(Math.floor(minutes), 1440);
    for (let i = 0; i < n; i++) {
      const ev = [];
      step(w, 1, ev);
      if (ledger) ledgerAdd(ledger, w, ev);
    }
    return n;
  }

  // ── 리포트 장부 ───────────────────────────────────────────
  function ledgerStart(w) {
    return {
      t0: w.t, happy0: happyCount(w), smile0: w.smile, lv0: w.stats.levelups, grad0: w.stats.grads,
      work0: Object.fromEntries(w.monsters.map(m => [m.id, m.work])),
      hourLv: {}, bestBurst: null, crowdMax: null, ready: [], approval: false, firstGrad: w.stats.grads === 0,
    };
  }
  function ledgerAdd(L, w, ev) {
    const hour = Math.floor(w.t / 60);
    for (const e of ev) {
      if (e.type === 'levelup') {
        const k = e.d + '@' + hour;
        L.hourLv[k] = (L.hourLv[k] || 0) + 1;
        if (!L.bestBurst || L.hourLv[k] > L.bestBurst.n) L.bestBurst = { d: e.d, n: L.hourLv[k] };
      } else if (e.type === 'ready') { if (!L.ready.includes(e.mon)) L.ready.push(e.mon); }
      else if (e.type === 'approval') L.approval = true;
    }
    const busy = {};
    for (const a of w.advs) if (a.st === 'busy' && a.near) busy[a.near] = (busy[a.near] || 0) + 1;
    for (const d in busy) if (!L.crowdMax || busy[d] > L.crowdMax.n) L.crowdMax = { d, n: busy[d] };
  }
  function ledgerReport(L, w) {
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
      ready: L.ready.filter(id => { const m = w.monsters.find(x => x.id === id); return m && canEvolve(m); }),
      king: king && king.n >= 1 ? { id: king.m.id, n: Math.round(king.n) } : null,
      approval: w.approvalReady,
    };
  }

  // ── 매니저 행동 ───────────────────────────────────────────
  const ok = (extra) => Object.assign({ ok: true }, extra);
  const no = (msg, extra) => Object.assign({ ok: false, msg }, extra);

  function hire(w, sp, into) {
    const s = SPECIES[sp];
    if (!s || s.chapter > w.chapter) return no('아직 채용할 수 없어요');
    const direct = into && w.plots[into] && w.plots[into].open && monsIn(w, into).length < w.dungeons[into].slots;
    if (!direct && tray(w).length >= TRAY_MAX) return no('대기실이 꽉 찼어요');
    const free = w.tut.ticket === sp;
    if (!free && w.smile < s.cost) return no(`스마일 ${Math.ceil(s.cost - w.smile).toLocaleString()} 모자라요`, { short: s.cost - w.smile });
    if (free) w.tut.ticket = null; else w.smile -= s.cost;
    const m = addMonster(w, sp, null);
    return ok({ mon: m, cost: free ? 0 : s.cost, free });
  }
  function unhire(w, monId, refund) {
    const i = w.monsters.findIndex(m => m.id === monId);
    if (i < 0) return;
    const m = w.monsters[i];
    w.monsters.splice(i, 1);
    if (refund === 'ticket') w.tut.ticket = m.sp; else w.smile += refund || 0;
  }

  function placeCheck(w, m, did) {
    if (!did) return tray(w).length >= TRAY_MAX && m.d ? no('대기실이 꽉 찼어요') : ok();
    const p = w.plots[did];
    if (!p) return no('아직 열리지 않은 부지예요');
    const d = w.dungeons[did];
    const inD = monsIn(w, did).filter(x => x.id !== m.id);
    if (inD.length >= d.slots) return no('직원 자리가 꽉 찼어요');
    if (isBoss(m) && inD.some(isBoss)) return no('보스는 던전에 한 마리만');
    if (!p.open) {
      const cost = 1000 * plotInfo(did).region;
      if (w.smile < cost) return no(`개업 비용 스마일 ${cost.toLocaleString()}이 필요해요`);
      return ok({ openCost: cost });
    }
    return ok();
  }
  function place(w, monId, did) {
    const m = w.monsters.find(x => x.id === monId);
    if (!m) return no('없는 직원');
    if (m.d === did) return ok({ same: true });
    const c = placeCheck(w, m, did);
    if (!c.ok) return c;
    if (c.openCost) { w.smile -= c.openCost; w.plots[did].open = true; }
    const from = m.d;
    m.d = did;
    return ok({ from, openCost: c.openCost || 0 });
  }

  function evolve(w, monId) {
    const m = w.monsters.find(x => x.id === monId);
    if (!m || !canEvolve(m)) return no('아직 진화할 수 없어요');
    if (m.d && SPECIES[m.sp].boss && m.stage + 1 === 3 && monsIn(w, m.d).some(x => x.id !== m.id && isBoss(x)))
      return no('보스는 던전에 한 마리만 — 다른 던전으로 옮긴 뒤 진화해요');
    const from = m.stage;
    m.stage++; m.tenure = 0;
    const key = m.sp + ':' + m.stage, isNew = !w.dex[key];
    w.dex[key] = true;
    return ok({ mon: m, from, isNew });
  }

  function eventCost(w, did) {
    const D = levelsOf(w)[did];
    return D ? 30 * D : 0;
  }
  function startEvent(w, did, type) {
    const d = w.dungeons[did], D = levelsOf(w)[did];
    if (!D) return no('직원이 없는 던전이에요');
    if (d.event) return no('이미 이벤트 중이에요');
    if (activeEvents(w) >= maxEvents(w)) return no(`이벤트는 동시에 ${maxEvents(w)}개까지`);
    const free = w.tut.freeEvent > 0, cost = free ? 0 : 30 * D;
    if (w.smile < cost) return no(`스마일 ${Math.ceil(cost - w.smile).toLocaleString()} 모자라요`);
    if (free) w.tut.freeEvent--; else w.smile -= cost;
    d.event = { type, end: w.t + EVENT_MIN, start: w.t };
    return ok({ cost, free });
  }
  function cancelEvent(w, did, refund, wasFree) {
    const d = w.dungeons[did];
    if (!d.event) return;
    d.event = null;
    if (wasFree) w.tut.freeEvent++; else w.smile += refund;
  }

  function seatCost(d) { return d.seatUp < SEAT_COST.length ? SEAT_COST[d.seatUp] : null; }
  function seatUp(w, did) {
    const d = w.dungeons[did], c = seatCost(d);
    if (c == null) return no('자리는 20석이 최대예요');
    if (w.smile < c) return no(`스마일 ${Math.ceil(c - w.smile).toLocaleString()} 모자라요`);
    w.smile -= c; d.seatUp++; d.seats += SEAT_STEP;
    return ok({ cost: c });
  }
  function seatDown(w, did, refund) { const d = w.dungeons[did]; d.seatUp--; d.seats -= SEAT_STEP; w.smile += refund; }
  function slotCost(d) { return d.slotUp < SLOT_COST.length ? SLOT_COST[d.slotUp] : null; }
  function slotUp(w, did) {
    const d = w.dungeons[did], c = slotCost(d);
    if (c == null) return no('직원 자리는 5개가 최대예요');
    if (w.smile < c) return no(`스마일 ${Math.ceil(c - w.smile).toLocaleString()} 모자라요`);
    w.smile -= c; d.slotUp++; d.slots++;
    return ok({ cost: c });
  }

  function slotDown(w, did, refund) { const d = w.dungeons[did]; d.slotUp--; d.slots--; w.smile += refund; }

  function approve(w) {
    if (!w.approvalReady) return no('아직 조건을 채우지 못했어요');
    w.approvalReady = false;
    w.stars++;
    if (w.chapter >= CHAPTERS.length) { w.ended = true; return ok({ chapter: w.chapter, ending: true }); }
    w.chapter = w.chapter + 1;
    unlockPlots(w, w.chapter);
    return ok({ chapter: w.chapter });
  }

  // ── 미리보기와 추천 ───────────────────────────────────────
  /** 변화 전후 비교: 새로 생기는 빈틈, 갈 곳을 잃는 모험가 수 */
  function preview(w, mods) {
    const before = levelsOf(w), after = levelsOf(w, mods);
    const cb = coveredSet(before), ca = coveredSet(after), end = roadEnd(w);
    const lost = [], gained = [];
    for (let L = 1; L <= end; L++) {
      if (cb[L] && !ca[L]) lost.push(L);
      if (!cb[L] && ca[L]) gained.push(L);
    }
    const stranded = w.advs.filter(a => a.lv < end && lost.includes(a.lv)).length;
    const rescued = w.advs.filter(a => a.st === 'search' && gained.includes(a.lv)).length;
    return { before, after, lost: toSegs(lost), gained: toSegs(gained), stranded, rescued, gapsAfter: gapSegments(w, after) };
  }
  function toSegs(list) {
    const segs = [];
    for (const L of list) {
      const s = segs[segs.length - 1];
      if (s && s[1] === L - 1) s[1] = L; else segs.push([L, L]);
    }
    return segs;
  }

  /** 대기실 직원을 놓을 최선의 곳들 (빈틈이 가장 적어지는 곳) */
  function bestPlaces(w, monId) {
    const m = w.monsters.find(x => x.id === monId);
    if (!m) return [];
    const opts = [];
    for (const id in w.plots) {
      if (m.d === id) continue;
      const c = placeCheck(w, m, id);
      if (!c.ok) continue;
      const mods = { move: { id: m.id, to: id } };
      if (!w.plots[id].open) mods.open = id;
      const lv = levelsOf(w, mods);
      const segs = gapSegments(w, lv);
      const gapN = segs.reduce((s, g) => s + g[1] - g[0] + 1, 0);
      opts.push({ id, gapN, cost: c.openCost || 0 });
    }
    if (!opts.length) return [];
    opts.sort((a, b) => a.gapN - b.gapN || a.cost - b.cost);
    const best = opts[0].gapN;
    const cur = gapSegments(w).reduce((s, g) => s + g[1] - g[0] + 1, 0);
    return best < cur ? opts.filter(o => o.gapN === best && o.cost === opts[0].cost).map(o => o.id) : [];
  }

  /** 첫 빈틈을 메울 수 있는 계열 */
  function recommendSpecies(w) {
    const segs = gapSegments(w);
    if (!segs.length) return null;
    const a = segs[0][0];
    let best = null;
    for (const sp in SPECIES) {
      const s = SPECIES[sp];
      if (s.chapter > w.chapter) continue;
      const dist = Math.abs(s.base - a);
      if (!best || dist < best.dist) best = { sp, dist };
    }
    return best && best.dist <= 5 ? best.sp : null;
  }

  function badges(w) {
    const out = [];
    const segs = gapSegments(w);
    for (const g of segs) {
      const n = w.advs.filter(a => a.st === 'search' && a.lv >= g[0] && a.lv <= g[1]).length;
      out.push({ kind: 'gap', seg: g, n });
    }
    const busy = {};
    for (const a of w.advs) if (a.st === 'busy' && a.near) busy[a.near] = (busy[a.near] || 0) + 1;
    for (const d in busy) out.push({ kind: 'busy', d, n: busy[d] });
    for (const m of w.monsters) if (canEvolve(m)) out.push({ kind: 'evolve', mon: m.id, d: m.d });
    return out;
  }

  root.MSW = {
    SPECIES, TRAITS, EVOLVE_NEED, CHAPTERS, REGIONS, PLOTS, SEAT_COST, SLOT_COST, EVENT_MIN, TRAY_MAX, BUFF_MIN, SMILE_HAPPY, SMILE_LEVELUP, SMILE_GRAD,
    createWorld, step, advance, rnd,
    monLevel, monName, maxStage, isBoss, evolveNeed, canEvolve, roadEnd, chapterInfo, plotInfo, monsIn, tray,
    maxEvents, activeEvents, levelsOf, coveredSet, gapSegments, happyCount, dungeonInfo,
    ledgerStart, ledgerAdd, ledgerReport,
    hire, unhire, placeCheck, place, evolve, eventCost, startEvent, cancelEvent,
    seatCost, seatUp, seatDown, slotCost, slotUp, slotDown, approve,
    preview, bestPlaces, recommendSpecies, badges,
  };
})(typeof window !== 'undefined' ? window : globalThis);
