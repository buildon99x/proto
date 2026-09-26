/*
 * S3 진화(+승진 발령) · S5 채용 · S6 결재 · S0 출근 리포트 · S7 매니저 퇴근 · 직원 말풍선 · 도감 · 엔딩 · 완전 클리어
 */
import { A, $, $$, must, h, n, clamp, img, sil, monArt, josa, ro, plotName, plotShort, segTxt, clockText, dur, snd, nope, toast, emit, refresh, renderOren, rectOf, shake, joyText, save, markTicks, markLabel, boxReason, RULES, M } from './app';
import { CHAPTERS, SPECIES, SPECIES_IDS, TRAITS, FIELD_BOSSES, fieldBoss, bossDexKey, homesOf, plotInfo, type PlotId, type SpeciesId } from '../sim/content';

const segList = (ss: M.Seg[]) => ss.map(segTxt).join(', ');

// ── 시트 공통 ───────────────────────────────────────────────
A.closeSheet = () => {
  const sh = must('#sheet');
  sh.hidden = true; sh.innerHTML = '';
  A.ui.sheet = null;
  renderOren();
  if (A.world) A.world.setPreview(null);
  if (A.T) A.T.poke();
};
function openSheet(kind: string, color: string, html: string) {
  closePop();
  const sh = must('#sheet');
  sh.hidden = false;
  sh.className = 'sheet-' + kind;
  sh.style.setProperty('--sc', color);
  sh.innerHTML = `<button class="x" data-close title="닫기 (Esc)">✕</button>${html}`;
  A.ui.sheet = kind;
  renderOren();
  must('[data-close]', sh).onclick = () => { snd.play('ui'); A.closeSheet(); };
  if (A.T) A.T.poke();
  return sh;
}

// ── S5 신입 채용 ────────────────────────────────────────────
A.openHire = (opt = {}) => {
  const w = A.w;
  if (opt.seg) A.world.focus((opt.seg[0] + opt.seg[1]) / 2);
  else if (opt.crowd) A.world.focus(M.levelsOf(w)[opt.crowd.d] ?? 0);
  const into = opt.into || (A.ui.mode === 'dungeon' ? A.dv.id : null);
  const cf = opt.crowd || null;
  const seg = cf ? null : opt.seg || M.hotGap(w) || M.gapSegments(w)[0] || null;
  const rec = cf ? cf.sp : seg ? M.recommendSpecies(w, seg) : null;
  const grow = seg && !rec ? M.recommendGrow(w, seg) : null;
  const growing = seg && grow ? M.growingToward(w, seg) : null;
  const want3 = M.needsNative(w) && !M.hasNativeDungeon(w);
  const cond3 = (sp: SpeciesId) => want3 && M.isNative(sp);
  const list = SPECIES_IDS.filter(sp => M.spInPlay(sp) && SPECIES[sp].chapter > 0 && SPECIES[sp].chapter <= w.chapter + 1)
    .sort((a, b) => (+(b === rec || b === grow?.sp) - +(a === rec || a === grow?.sp)) || (+cond3(b) - +cond3(a)) || (SPECIES[a].chapter - SPECIES[b].chapter) || (SPECIES[a].base - SPECIES[b].base));
  let cards = '';
  for (const sp of list) {
    const s = SPECIES[sp];
    const locked = s.chapter > w.chapter;
    const tr = s.trait ? TRAITS[s.trait] : null;
    const ticket = M.hasHireTicket(w, sp);
    const cost = M.hireCost(sp);
    const can = ticket || w.smile >= cost;
    const isRec = !locked && (sp === rec || (!rec && cond3(sp))), isGrow = !locked && grow && sp === grow.sp && !growing;
    const rib = isRec && cf && sp === rec ? `<span class="rib">줄 선 Lv ${cf.lo}–${cf.hi}에 딱!</span>` : isRec && seg && sp === rec ? `<span class="rib">${segTxt(seg)}에 딱!</span>` : isRec && cond3(sp) ? '<span class="rib">결재 ③ 슬리피우드 식구</span>' : isGrow && seg ? `<span class="rib grow">진화 ${grow!.stage}번이면 ${segTxt(seg)}!</span>` : '';
    // v1.7: 식구 사냥터 — 거기서 일하면 근속 ×1.2. 열려 있거나 열 수 있는 부지만 보인다
    const homes = M.RULES_GROUNDS() && !locked ? homesOf(sp).filter(p => w.plots[p.id]).map(p => p.short) : [];
    cards += `<div class="hcard ${isRec ? 'rec' : ''} ${isGrow ? 'grow' : ''} ${locked ? 'locked' : ''}" data-sp="${sp}">
      ${rib}
      <div class="ph">${locked ? sil(s.art[0], 2) : img(s.art[0], 2)}</div>
      <b>${locked ? '???' : s.names[0]}</b><span class="lvl">Lv ${s.base} · 적정 ${Math.max(1, s.base - 5)}–${s.base + 5}</span>
      <span class="trait" title="${tr ? tr.desc : ''}">${tr ? tr.icon + ' ' + tr.name : '— 표준'}${homes.length ? ` · <i class="hm" title="식구 사냥터 — 여기서 일하면 근속 ×${M.RULES_GROUNDS()!.homeX}">🏠 ${homes.join('·')}</i>` : ''}</span>
      ${locked ? `<div class="go dis">${s.chapter - 1}장 결재 후</div>`
        : `<button class="go ${can ? '' : 'dis'}" data-hire="${sp}">${ticket ? '🎟 채용권 · 무료' : `<i class="mini-can"></i>${n(cost)}`}</button>`}
    </div>`;
  }
  let sub = '1단계 직원만 뽑을 수 있어요. 높은 단계는 키워서만 얻어요';
  if (into) sub += ` · 뽑으면 바로 <b>${plotName(into)}</b>에 배치`;
  else sub += ' · 뽑은 직원은 대기실로';
  const mv = seg && !rec && !(growing && M.canEvolve(growing)) ? M.moveFix(w, seg) : null;
  if (mv && seg) sub = `<b>${segTxt(seg)}</b>는 ${josa(M.monName(mv.mon), '을', '를')} <b>${ro(plotName(mv.to))}</b> 옮기면 바로 이어져요${mv.ticket ? ' (개업권 · 공짜)' : ''} <button class="subev mv" data-mv="${mv.mon.id}" data-to="${mv.to}">옮길 곳 보기</button>`;
  else if (growing && seg && M.canEvolve(growing)) sub = `<b>${segTxt(seg)}</b>는 ${josa(M.monName(growing), '이', '가')} 지금 진화하면 이어져요 <button class="subev" data-ev="${growing.id}">▲ 진화 보기</button>`;
  else if (growing && seg) sub = `<b>${segTxt(seg)}</b>는 ${josa(M.monName(growing), '이', '가')} 한 번 더 진화하면 이어져요 (근속 ${n(growing.tenure)} / ${n(M.evolveNeed(growing))})`;
  else if (grow && seg) sub = `<b>${segTxt(seg)}</b>는 채용으로는 안 닿아요. <b>${SPECIES[grow.sp].names[0]}</b>를 뽑아 혼자 두고 키우면 진화 ${grow.stage}번에 Lv ${grow.lv}가 돼요`;
  if (cf) sub = cf.split
    ? `<b>${plotName(cf.d)}</b> 앞에 ${cf.n}명이 줄 섰어요(Lv ${cf.lo}–${cf.hi}). 자리를 늘려도 되지만, 레벨이 다른 계열로 던전을 하나 더 열면 줄이 나뉘어요 — 뽑으면 <b>${plotName(cf.to)}</b>가 빛나요`
    : `<b>${plotName(cf.d)}</b> 앞에 ${cf.n}명이 줄 섰어요(Lv ${cf.lo}–${cf.hi}). 자리는 더 못 늘리니 같은 레벨 던전을 하나 더 — 뽑으면 <b>${plotName(cf.to)}</b>가 빛나요`;
  const sh = openSheet('hire', 'var(--flow)', `<div class="sh-title">신입 채용 <small>${sub}</small></div><div class="cards">${cards}</div>`);
  $$<HTMLElement>('[data-hire]', sh).forEach(b => (b.onclick = () => doHire(b.dataset.hire as SpeciesId, into, cf && b.dataset.hire === cf.sp ? cf.to : null)));
  const subev = $<HTMLElement>('.subev', sh);
  if (subev && subev.dataset.mv) subev.onclick = () => { A.closeSheet(); A.highlightBest(+(subev.dataset.mv || 0), [subev.dataset.to || '']); };
  else if (subev) subev.onclick = () => { A.closeSheet(); A.openEvolve(+(subev.dataset.ev || 0)); };
  snd.play('ui');
};
function doHire(sp: SpeciesId, into: PlotId | null, crowdTo: PlotId | null = null) {
  const w = A.w;
  const r = M.hire(w, sp, into);
  if (!r.ok) { nope(r.msg); return; }
  snd.play('hire');
  const m = r.mon;
  let placed = false;
  if (into) placed = M.place(w, m.id, into).ok;
  A.closeSheet();
  toast(`${M.monName(m)} 채용${r.free ? ' · 채용권 사용' : ` · 스마일 −${n(r.cost)}`}${placed ? ` · ${plotName(into!)} 배치` : ''}`, { undo: () => M.unhire(w, m.id, r.free ? 'ticket' : r.cost) });
  emit([{ type: 'hired', mon: m.id, placed }]);
  if (!placed) A.highlightBest(m.id, crowdTo ? [crowdTo] : undefined);
  refresh();
}

// ── S3 진화: 결과를 월드 위에서 미리 본다 (+ 승진 발령) ─────────
function planHint(plan: M.PromotePlan): string {
  const w = A.w;
  const where = plan.stay ? '그 자리에 두고' : plan.to && w.plots[plan.to].open ? `${ro(plotShort(plan.to))} 보내고` : `${plotShort(plan.to!)}에 개업하고${w.tickets.plot > 0 ? '(개업권)' : ''}`;
  const back = plan.hireSp ? `빈자리엔 ${josa(SPECIES[plan.hireSp].names[0], '을', '를')}` : '';
  return `💡 승진 발령: ${where} ${back} ${plan.gapAfter ? `— ${segList(plan.pv.gapsAfter)}만 남아요` : '— 빈틈 없이 이어져요'}`;
}
A.openEvolve = monId => {
  const w = A.w, m = w.monsters.find(x => x.id === monId);
  if (!m || !M.canEvolve(m)) return;
  if (A.ui.mode === 'dungeon') A.closeDungeon();
  A.world.focus(M.monLevel(m));
  const sp = SPECIES[m.sp], next = m.stage + 1;
  const pv = M.preview(w, { evolve: m.id });
  // 승진 발령을 권하는 때: 그냥 진화하면 길이 비거나(v1.2), 발령해야 남은 빈틈이 더 이어질 때(v1.3.1 — 1장 Lv 14–15)
  const cand = M.bestPromote(w, m.id);
  const plan = cand && (pv.lost.length || cand.gapAfter < M.gapSize(pv.gapsAfter)) ? cand : null;
  const known = !!w.dex[m.sp + ':' + next];
  const block = M.evolveBlock(w, m);
  let dex = '';
  sp.names.forEach((nm, i) => {
    const k = w.dex[m.sp + ':' + i];
    dex += `<div class="r ${i === m.stage ? 'now' : ''} ${!k && i !== next ? 'q' : ''}">${k ? img('m:' + sp.art[i], 1) : sil('m:' + sp.art[i], 1)}${k || i === next ? (k ? nm : '<b class="evc">NEW?</b>') : '?'}${sp.boss && i === sp.names.length - 1 ? ' 👑' : ''}</div>`;
  });
  const D0 = m.d ? pv.before[m.d] : null, D1 = m.d ? pv.after[m.d] : null;
  let res: string, hint = '';
  if (block) res = `<div class="res bad">✕ ${block}</div>`;
  else if (pv.lost.length) {
    res = `<div class="res bad">⚠ ${pv.entranceBlocked ? '입구가 막혀요 · ' : ''}${segList(pv.lost)}가 비어요${pv.stranded ? ` · 모험가 ${pv.stranded}명이 혼자 걷게 돼요` : ''}</div>`;
    hint = plan ? planHint(plan) : '💡 진화한 뒤 5초 안에 되돌릴 수 있어요. 보류해도 근속은 그대로 남아요';
  } else if (plan) {
    res = `<div class="res ok">✓ 빈틈이 생기지 않아요 · 그냥 진화로는 ${segList(pv.gapsAfter)}가 그대로예요</div>`;
    hint = planHint(plan);
  } else res = `<div class="res ok">✓ 빈틈이 생기지 않아요${pv.gained.length ? ` · ${segList(pv.gained)} 새로 이어져요` : ''}</div>`;
  const btns = plan && !block
    ? `<button class="btn pri" data-promote title="진화 + 옮기기 + 빈자리 채용을 한 번에">▲ 승진 발령<small>${plan.cost ? `스마일 ${n(plan.cost)}` : '무료'}</small></button><button class="btn" data-go>그냥 진화</button><button class="btn ghostb" data-hold>보류</button>`
    : `<button class="btn pri" data-go ${block ? 'disabled' : ''}>▲ 진화시키기</button><button class="btn" data-hold>보류</button>`;
  const sh = openSheet('evolve', 'var(--evolve)', `
    <div class="evs">
      <div class="idc"><div class="ph">${img(sp.art[m.stage], 3)}</div><b>${M.monName(m)}</b><span>Lv ${M.monLevel(m)} · ${m.stage + 1}단계</span></div>
      <div class="arrow">➜<small>사원증<br>사진 교체</small></div>
      <div class="idc after"><div class="ph">${known ? img(sp.art[next], 3) : sil(sp.art[next], 3)}</div><b>${known ? sp.names[next] : '???'}</b><span>Lv ${M.monLevel(m) + 8} · ${next + 1}단계${sp.boss && next === sp.names.length - 1 ? ' · 보스' : ''}</span></div>
      <div class="dexrow"><b>${sp.names[0]} 계열 ${sp.trait ? TRAITS[sp.trait].icon : ''}</b>${dex}</div>
      <div class="conseq">
        <div class="lvch">${m.d ? `${plotName(m.d)} · 던전 Lv ${D0} → ${D1}` : '대기실에서 진화'}</div>
        ${res}
        <div class="hint">${hint || '보류해도 벌칙은 없어요. 근속은 그대로 남아요'}</div>
      </div>
      <div class="btns">${btns}</div>
    </div>`);
  // 발령이 있으면 발령 결과를 먼저 보여 준다. 버튼에 손을 올리면 그 결과로 바뀐다
  const showPlain = () => A.world.setPreview(pv, { kind: 'evolve' });
  const showPlan = () => { if (plan) A.world.setPreview(plan.pv, { kind: 'promote', label: plan.hireInto ? { [plan.hireInto]: `신입 ${SPECIES[plan.hireSp!].names[0]} · Lv ${plan.pv.after[plan.hireInto]}` } : undefined }); };
  if (plan) showPlan(); else showPlain();
  must('[data-hold]', sh).onclick = () => { snd.play('ui'); A.closeSheet(); };
  const go = must('[data-go]', sh);
  go.onclick = () => doEvolve(m.id);
  go.onpointerenter = showPlain;
  const pr = $('[data-promote]', sh);
  if (pr && plan) { pr.onclick = () => doPromote(plan); pr.onpointerenter = showPlan; go.onpointerleave = showPlan; }
  snd.play('ui');
};
function evolveCut(from: { art: string; name: string; lv: number }, m: M.Monster, isNew: boolean, extra = '') {
  const st = must('#stage');
  st.appendChild(h('<div class="flash"></div>'));
  setTimeout(() => $$('.flash').forEach(e => e.remove()), 800);
  const to = { art: monArt(m), name: M.monName(m), lv: M.monLevel(m) };
  const modal = must('#modal');
  modal.hidden = false; A.ui.modal = 'evolve';
  modal.innerHTML = `<div class="evwrap"><div class="flipwrap"><div class="flipcard" id="flip">
      <div class="f"><div class="ph">${img(from.art, 5)}</div><b>${from.name}</b><span>Lv ${from.lv}</span></div>
      <div class="f b">${isNew ? '<span class="newrib">NEW · 도감 +1</span>' : ''}<div class="ph">${img(to.art, 5)}</div><b>${to.name}</b><span>Lv ${to.lv} · ${m.stage + 1}단계</span></div>
    </div></div><div class="evcap" id="evcap">사원증 사진 교체 중…</div></div>`;
  setTimeout(() => { $('#flip')?.classList.add('flipped'); snd.play('evolve'); }, A.demo ? 0 : 250);
  setTimeout(() => { const c = $('#evcap'); if (c) c.innerHTML = `${josa(to.name, '이', '가')} 됐어요!${extra ? ' ' + extra : ''} <span class="dim">(눌러서 닫기)</span>`; }, A.demo ? 0 : 1100);
  const close = () => { if (A.ui.modal !== 'evolve') return; modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null; refresh(); };
  modal.onclick = close;
  if (!A.demo) setTimeout(close, 3200);
}
function doEvolve(monId: number) {
  const w = A.w, m = w.monsters.find(x => x.id === monId)!;
  const from = { art: monArt(m), name: M.monName(m), lv: M.monLevel(m) };
  const r = M.evolve(w, monId);
  if (!r.ok) { nope(r.msg); return; }
  A.closeSheet();
  evolveCut(from, m, r.isNew);
  // 진화도 5초 되돌리기. 도감 칸은 남는다 — 한 번 본 모습은 본 것이다
  setTimeout(() => toast(`${M.monName(m)} 진화`, { undo: () => M.unevolve(w, monId, r.from, r.tenureBefore, r.retIds) }), A.demo ? 0 : 400);
  emit([{ type: 'evolved', mon: m.id, isNew: r.isNew }]);
  refresh();
}
function doPromote(plan: M.PromotePlan) {
  const w = A.w, m = w.monsters.find(x => x.id === plan.mon)!;
  const from = { art: monArt(m), name: M.monName(m), lv: M.monLevel(m) };
  const r = M.promote(w, plan);
  if (!r.ok) { nope(r.msg); return; }
  A.closeSheet();
  snd.play('place');
  const where = plan.stay ? '' : `${ro(plotShort(plan.to!))} 발령`;
  evolveCut(from, m, r.evo.isNew, where ? `${where}!` : '');
  const parts = [where, r.hired ? `${M.monName(r.hired)} 채용` : '', r.hireCost + r.openCost ? `스마일 −${n(r.hireCost + r.openCost)}` : ''].filter(Boolean).join(' · ');
  setTimeout(() => toast(`승진 발령 · ${parts}`, { undo: () => M.unpromote(w, plan, r) }), A.demo ? 0 : 400);
  emit([{ type: 'evolved', mon: m.id, isNew: r.evo.isNew }]);
  refresh();
}

// ── 필드 보스 초대 (v1.3): 어느 던전에서 맞을까 ────────────────
A.openBoss = () => {
  const w = A.w, b = w.boss, fb = b && fieldBoss(b.ch), rule = RULES.fieldBoss;
  if (!b || !fb || !rule || b.d) return;
  if (A.ui.mode === 'dungeon') A.closeDungeon();
  const lv = M.levelsOf(w), hosts = M.bossHosts(w);
  const occ = (id: string) => w.advs.filter(a => a.st === 'happy' && a.d === id).length;
  const wait = (id: string) => w.advs.filter(a => a.st === 'busy' && a.near === id).length;
  const need = M.bossNeed(b.ch);
  let cards = '';
  hosts.forEach((id, i) => {
    // 토벌 예상: 방문하면 자리 +8이 차고(기다리던 사람 + 새 손님), 즐거운 모험가 1명 = 분당 퇴근 1회
    const per = Math.max(1, Math.min(occ(id) + wait(id) + rule.seats, w.dungeons[id].seats + rule.seats));
    const hrs = need / per / 60;
    cards += `<div class="hcard bosshost ${i === 0 ? 'rec' : ''}" data-host="${id}">${i === 0 ? '<span class="rib">자리가 가장 많아요</span>' : ''}
      <b>${plotName(id)}</b><span class="lvl">던전 Lv ${lv[id]} · 적정 ${lv[id] - 5}–${lv[id] + 5}</span>
      <span class="trait">😊 ${occ(id)} · 자리 ${w.dungeons[id].seats} → ${w.dungeons[id].seats + rule.seats}</span>
      <span class="trait">토벌까지 약 ${hrs < 1 ? Math.max(1, Math.round(hrs * 60)) + '분' : hrs.toFixed(1) + '시간'}</span>
      <button class="go" data-invite="${id}">여기서 맞기</button></div>`;
  });
  const left = Math.max(0, b.at + rule.wait - w.t);
  const sh = openSheet('boss', 'var(--smile)', `<div class="sh-title">👑 필드 보스 ${fb.name} · Lv ${fb.lv} <small>손님이라 던전 레벨은 그대로 · 머무는 동안 자리 +${rule.seats} · ② ×${rule.joyX} · 도착 ×${rule.arriveX} · 토벌하면 도감 +1, ② +${Math.round(rule.bonus * 100)}% · ${dur(left)} 뒤 자동 초대</small></div>
    <div class="cards"><div class="hcard bossid"><div class="ph">${img('m:' + fb.art, 4)}</div><b>${fb.name}</b><span class="lvl">Lv ${fb.lv}</span><span class="trait">“${fb.line}”</span></div>${cards}</div>`);
  const clearHl = () => $$('.plat.target').forEach(e => e.classList.remove('target'));
  $$<HTMLElement>('[data-host]', sh).forEach(c => {
    c.onpointerenter = () => { clearHl(); const p = A.world.plats[c.dataset.host!]; if (p) p.el.classList.add('target'); };
    c.onpointerleave = clearHl;
  });
  $$<HTMLElement>('[data-invite]', sh).forEach(bt => (bt.onclick = () => {
    const id = bt.dataset.invite!;
    const r = M.inviteBoss(w, id);
    if (!r.ok) return nope(r.msg);
    clearHl();
    A.closeSheet();
    snd.play('event');
    toast(`👑 ${fb.name}를 ${plotShort(id)}에서 맞아요`, { undo: () => M.uninviteBoss(w) });
    emit([{ type: 'bossIn', ch: b.ch, d: id, auto: false }]);
    refresh();
  }));
  // 처음 열면 추천 던전을 월드 위에서 보여 준다
  if (hosts[0] && A.world.plats[hosts[0]]) A.world.plats[hosts[0]].el.classList.add('target');
  snd.play('ui');
};

// ── S9 모객 (v1.7): 신규냐 복귀냐 ──────────────────────────
/**
 * 신규(입구 도착 ×2)와 복귀(떠난 손님이 자기 레벨로 돌아옴)는 다른 결정이다. 입구가 비었으면 신규, 중간 자리가 비었고 풀에 그 레벨 손님이 있으면 복귀.
 * 둘 다 동시 이벤트 한 자리를 쓴다. 오렌이 권하는 카드에 리본. 모객권이 있으면 공짜. 5초 되돌리기(이미 돌아온 손님은 돌려보내지 않는다)
 */
A.openRecruit = () => {
  const w = A.w, gu = RULES.guests;
  if (!gu || !w.pool) return;
  if (A.ui.mode === 'dungeon') A.closeDungeon();
  const rc = w.recruit, pk = M.recruitPick(w), rr = M.returnRoom(w), er = M.entranceRoom(w), tk = M.recruitTickets(w);
  const lim = !rc && M.activeEvents(w) >= M.maxEvents(w);
  const price = (k: M.RecruitKind) => (tk ? `<span class="okc">🎟 모객권 · 무료${tk > 1 ? ' ×' + tk : ''}</span>` : `<i class="mini-can"></i>${n(M.recruitCost(w, k))}`);
  const card = (k: M.RecruitKind, icon: string, name: string, eff: string, why: string, can: boolean, note: string) => `
    <div class="hcard rcard ${pk && pk.kind === k ? 'rec' : ''} ${can ? '' : 'locked'}" data-rk="${k}">
      ${pk && pk.kind === k ? `<span class="rib">오렌 추천 · ${pk.n}명</span>` : ''}
      <div class="ph"><i class="ric">${icon}</i></div>
      <b>${name}</b><span class="lvl">${eff}</span>
      <span class="trait">${why}</span>
      ${can ? `<button class="go" data-recruit="${k}">${price(k)}</button>` : `<div class="go dis">${note}</div>`}
    </div>`;
  const busyLow = w.advs.filter(a => a.st === 'busy' && a.lv <= 3).length;
  const status = rc ? `<div class="hcard rcard on"><div class="ph"><i class="ric">📣</i></div><b>${rc.kind === 'return' ? '복귀' : '신규'} 모객 중</b><span class="lvl">${dur(rc.end - w.t)} 남음</span><span class="trait">${rc.kind === 'return' ? `돌아온 손님 ${n(w.stats.returned || 0)}명 · 풀에 ${rr.pool}명` : `입구 도착 ×${gu.fresh.x}`}</span><div class="go dis">한 번에 하나</div></div>` : '';
  const sh = openSheet('recruit', 'var(--flow)', `<div class="sh-title">📣 모객 <small>손님을 부르는 이벤트 · 한 번에 하나 · 동시 이벤트 ${M.activeEvents(w)}/${M.maxEvents(w)} · 놓쳐도 잃는 것은 없어요</small></div>
    <div class="cards">${status}
      ${card('return', '🔁', '복귀 모객', `떠난 손님 ${rr.pool}명 가운데 자리 있는 레벨 ${rr.room}명 · ${gu.return.min / 60}시간 동안 시간당 ${gu.return.rate}명이 자기 레벨로`, rr.room >= 8 ? '중간 던전에 빈자리가 있어요' : rr.pool ? '자리가 없으면 돌아와도 줄을 서요' : '아직 떠난 손님이 없어요', !rc && !lim && rr.pool > 0, rc ? '모객 중' : lim ? '이벤트 자리 없음' : '떠난 손님 없음')}
      ${card('fresh', '👋', '신규 모객', `${gu.fresh.min / 60}시간 동안 입구 도착 ×${gu.fresh.x} · 지금 입구 빈자리 ${er}석`, busyLow ? `입구 앞에 ${busyLow}명이 줄 서 있어요` : er >= 6 ? '입구가 한산해요' : '입구가 거의 찼어요', !rc && !lim, rc ? '모객 중' : '이벤트 자리 없음')}
    </div>`);
  $$<HTMLElement>('[data-recruit]', sh).forEach(bt => (bt.onclick = () => {
    const k = bt.dataset.recruit as M.RecruitKind;
    const r = M.startRecruit(w, k);
    if (!r.ok) return nope(r.msg);
    A.closeSheet();
    snd.play('event');
    toast(`📣 ${k === 'return' ? '복귀' : '신규'} 모객 시작${r.free ? ' · 모객권 사용' : ` · 스마일 −${n(r.cost)}`}`, { undo: () => M.cancelRecruit(w, r.cost, r.free) });
    emit([{ type: 'recruitStart', kind: k }]);
    refresh();
  }));
  snd.play('ui');
};

// ── 직원 말풍선 (탭) ────────────────────────────────────────
function closePop() { $$('.pop-mon').forEach(e => e.remove()); }
/**
 * 드랍 상자 (v1.6): 채용권(지금 줄·빈틈에 맞는 계열)과 이벤트권 가운데 하나를 고른다. 오렌이 권하는 쪽이 노랗다.
 * 스마일은 나오지 않는다. 고른 뒤 5초 되돌리기 (받은 권을 이미 썼으면 되돌리지 않는다)
 */
A.openBox = (id, el) => {
  closePop();
  const w = A.w, bx = M.boxesOf(w).find(b => b.id === id);
  if (!bx) return;
  A.world.focus(M.levelsOf(w)[bx.d] ?? 0);
  const anchor = el && el.isConnected ? el : $(`#world [data-box="${id}"]`) || must('#oren');
  const r = rectOf(anchor), pick = M.boxPick(w);
  const hireOpt = M.boxOptions(w).find((o): o is Extract<M.BoxReward, { kind: 'hire' }> => o.kind === 'hire')!;
  const sp = SPECIES[hireOpt.sp];
  const pop = h(`<div class="pop-mon pop-box">
    <div class="hd"><span class="bxi">📦</span><div><b>드랍 상자</b><div class="s">${plotName(bx.d)} 앞 · 하나만 골라요</div></div></div>
    <div class="row col">
      <button data-pick="hire" class="${pick.kind === 'hire' ? 'pri' : ''}">${img('m:' + sp.art[0], 2)}<span><b>🎟 ${sp.names[0]} 채용권</b><small>Lv ${sp.base} · ${boxReason(w, hireOpt.sp)}</small></span></button>
      <button data-pick="event" class="${pick.kind === 'event' ? 'pri' : ''}"><i class="ic">🎫</i><span><b>무료 이벤트권</b><small>경험치·드랍 2배 한 번 · 지금 ${w.tickets.event}장</small></span></button>
    </div>
    <div class="tip">스마일은 안 나와요. 무료권을 ${RULES.drop ? RULES.drop.hold : 3}장 쥐고 있으면 상자가 쉬어요. 고르고 5초 안에 되돌릴 수 있어요</div></div>`);
  const x = clamp(r.x + r.w / 2 - 135, 8, 1280 - 278), y = r.y > 300 ? r.y - 214 : r.y + r.h + 8;
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
  must('#stage').appendChild(pop);
  $$<HTMLElement>('[data-pick]', pop).forEach(bt => (bt.onclick = () => {
    closePop();
    const choice: M.BoxReward = bt.dataset.pick === 'hire' ? hireOpt : { kind: 'event' };
    const res = M.openBox(w, id, choice);
    if (!res.ok) return nope(res.msg);
    snd.play('hire');
    toast(`📦 ${choice.kind === 'hire' ? `🎟 ${sp.names[0]} 채용권` : '🎫 무료 이벤트권'}을 받았어요`, { undo: () => { if (!M.unopenBox(w, res)) toast('벌써 쓴 권이라 되돌리지 못했어요'); } });
    refresh();
  }));
  snd.play('ui');
  setTimeout(() => {
    const off = (e: Event) => { if (!pop.contains(e.target as Node)) { closePop(); window.removeEventListener('pointerdown', off, true); } };
    window.addEventListener('pointerdown', off, true);
  }, 0);
};

A.openMonPop = (id, el) => {
  closePop();
  const w = A.w, m = w.monsters.find(x => x.id === id);
  if (!m) return;
  const r = rectOf(el), need = M.evolveNeed(m), sp = SPECIES[m.sp];
  const tr = sp.trait ? TRAITS[sp.trait] : null;
  const canRel = M.RULES_RELEASE() && !m.vet && m.sp !== 'balrog';
  const pop = h(`<div class="pop-mon">
    <div class="hd">${img(monArt(m), 2)}<div><b>${M.monName(m)} #${m.no}</b><div class="s">Lv ${M.monLevel(m)} · ${m.stage + 1}단계 · ${tr ? tr.icon + ' ' + tr.name : '표준'}${m.vet ? ' · 고참' : ''}</div><div class="s">${m.d ? plotName(m.d) : '대기실'} · 퇴근 ${n(m.work)}회</div></div></div>
    <div class="tenure"><div class="t"><span>근속(퇴근)</span><span>${need === Infinity ? '최종 단계' : n(Math.min(m.tenure, need)) + ' / ' + n(need)}</span></div><div class="bar"><i style="width:${need === Infinity ? 100 : Math.min(100, 100 * m.tenure / need)}%;background:${M.canEvolve(m) ? 'var(--evolve)' : 'color-mix(in srgb,var(--evolve) 45%,var(--white))'}"></i></div></div>
    <div class="row">${M.canEvolve(m) && !A.T.hideEvolve() ? '<button class="pri" data-ev>▲ 진화</button>' : ''}${m.d ? '<button data-see>현장 보기</button><button data-tray>대기실로</button>' : ''}${canRel ? `<button data-rel title="채용비 절반을 돌려받아요">본사 전근 +${n(M.releaseRefund(m))}</button>` : ''}</div>
    <div class="tip">끌어서 다른 발판에 놓으면 옮겨져요. 놓기 전에 결과가 보여요</div></div>`);
  const x = clamp(r.x + r.w / 2 - 135, 8, 1280 - 278), y = r.y > 300 ? r.y - 196 : r.y + r.h + 8;
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
  must('#stage').appendChild(pop);
  const ev = $('[data-ev]', pop); if (ev) ev.onclick = () => { closePop(); A.openEvolve(id); };
  const see = $('[data-see]', pop); if (see) see.onclick = () => { closePop(); A.openDungeon(m.d!); };
  const tr2 = $('[data-tray]', pop); if (tr2) tr2.onclick = () => {
    closePop();
    const pv = M.preview(w, { move: { id, to: null } });
    const from = m.d, res = M.place(w, id, null);
    if (!res.ok) return nope(res.msg);
    snd.play('place');
    toast(`${M.monName(m)} 대기실로${pv.lost.length ? ` · ${segList(pv.lost)} 비어요` : ''}`, { undo: () => { m.d = from; } });
    refresh();
  };
  const rel = $('[data-rel]', pop); if (rel) rel.onclick = () => {
    closePop();
    const res = M.release(w, id);
    if (!res.ok) return nope(res.msg);
    snd.play('hire');
    toast(`${M.monName(m)} 본사 전근 · 스마일 +${n(res.refund)}`, { undo: () => M.unrelease(w, res.mon, res.idx, res.refund) });
    emit([{ type: 'released', mon: id }]);
    refresh();
  };
  snd.play('ui');
  setTimeout(() => {
    const off = (e: Event) => { if (!pop.contains(e.target as Node)) { closePop(); window.removeEventListener('pointerdown', off, true); } };
    window.addEventListener('pointerdown', off, true);
  }, 0);
};

// ── S6 결재함 ───────────────────────────────────────────────
A.openApproval = () => {
  const w = A.w;
  if (w.ended) { A.openFullClear(); return; }
  const ch = M.chapterInfo(w), c = M.approvalConds(w), j = joyText(w);
  const ok1 = w.approvalReady || c.road, ok2 = w.approvalReady || c.happy, ok3 = w.approvalReady || c.balrog, ok3n = w.approvalReady || c.native;
  const next = CHAPTERS[ch.n];
  const nextSp = SPECIES_IDS.filter(k => M.spInPlay(k) && SPECIES[k].chapter === ch.n + 1).map(k => SPECIES[k].names[0]);
  const modal = must('#modal');
  modal.hidden = false; A.ui.modal = 'approval';
  modal.innerHTML = `<div class="paper appr">
    <div class="bigstamp" id="bigstamp">결재<small>머쉬맘</small></div>
    <h5>결재 서류 · ${ch.n}장${ch.n === 5 ? ' · 마지막' : ''}</h5><h2>${ch.region}${ch.n === 1 ? '를' : '까지'} 잇자</h2>
    <div class="c ${ok1 ? 'ok' : ''}"><span class="ck">${ok1 ? '✓' : '1'}</span><span class="lb">Lv 1–${ch.road} 빈틈 없이</span><div class="bar"><i style="width:${Math.round(100 * (ch.road - c.roadLeft) / ch.road)}%"></i></div><span class="v">${ok1 ? '완료' : c.roadNote}</span></div>
    <div class="c ${ok2 ? 'ok' : ''}"><span class="ck">${ok2 ? '✓' : '2'}</span><span class="lb">모험가들의 즐거운 시간<small>😊 즐기는 모험가 × 머문 시간이 쌓여요</small></span><div class="bar mk"><i style="width:${ok2 ? 100 : j.pct}%;background:var(--smile)"></i>${markTicks(w)}</div><span class="v">${ok2 ? '완료' : `${n(j.joy)}<small>/${n(j.goal)}</small>`}</span></div>
    ${marksRow(w)}
    ${c.needBalrog ? `<div class="c ${ok3 ? 'ok' : ''}"><span class="ck">${ok3 ? '✓' : '3'}</span><span class="lb">주니어 발록 던전 개장</span><div class="bar"><i style="width:${ok3 ? 100 : 0}%;background:var(--evolve)"></i></div><span class="v">${ok3 ? '완료' : '대기실에'}</span></div>` : ''}
    ${c.needNative ? `<div class="c ${ok3n ? 'ok' : ''}"><span class="ck">${ok3n ? '✓' : '3'}</span><span class="lb">슬리피우드 식구 던전<small>드레이크나 이블아이 계열이 일하는 던전 1곳</small></span><div class="bar"><i style="width:${ok3n ? 100 : 0}%;background:var(--evolve)"></i></div><span class="v">${ok3n ? '완료' : '채용 전'}</span></div>` : ''}
    ${!ok2 && j.eta ? `<div class="eta">지금 😊 ${M.happyCount(w)}명이면 ${j.eta} 뒤에 채워져요. 사람이 늘면 더 빨라요. <b>줄지는 않아요.</b></div>` : ''}
    <div class="rw">결재 보상: <b>★ +1</b> · 모험가 도착 +3명/시간 ${next ? `· <b>${next.region}</b> 개방 · 부지 +${M.plotsOfRegion(next.n)}${nextSp.length ? ' · ' + nextSp.join(', ') + ' 채용' : ''} · 졸업선 Lv ${ch.road} → ${next.road}` : '· <b>섬 전체에 불</b>'}${ch.n === 2 ? ' · 동시 이벤트 +1' : ''}${ch.n === 4 ? ' · 주니어 발록 입사 지원서' : ''}</div>
    ${ch.n === 5 ? `<div class="clip">${img('balrog', 2)}<div><b>입사 지원서 · 주니어 발록</b><br>"…손님이 오면, 맞아 드리겠습니다."</div></div>` : ''}
    <div class="boss">${img('mom', 3)}<div class="say">${w.approvalReady ? '좋아요. 결재.' : ch.say}</div></div>
    <div class="foot"><button class="btn" data-close>닫기</button>${w.approvalReady ? '<button class="btn red" data-stamp>결재 받기</button>' : ''}</div>
  </div>`;
  const close = () => { modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null; emit([{ type: 'docSeen' }]); refresh(); };
  must('[data-close]', modal).onclick = () => { snd.play('ui'); close(); };
  modal.onclick = e => { if (e.target === modal) close(); };
  const st = $<HTMLButtonElement>('[data-stamp]', modal);
  if (st) st.onclick = () => {
    st.disabled = true;
    must('#bigstamp').classList.add('slam');
    setTimeout(() => { snd.play('stamp'); shake(); }, 280);
    setTimeout(() => {
      const r = M.approve(w);
      modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null;
      if (!r.ok) return;
      save();
      if (r.ending) ending(); else chapterCut(r.chapter);
    }, A.demo ? 0 : 1200);
  };
  snd.play('ui');
};
/** 결재함: 이번 장 막대 눈금 보상 목록 */
function marksRow(w: M.World) {
  const jm = RULES.joyMarks;
  if (!jm || w.chapter < jm.from || w.ended) return '';
  const cells = jm.at.map((p, i) => { const got = w.marks[i]; return `<span class="${got ? 'got' : ''}">${Math.round(p * 100)}% ${markLabel(got || M.markReward(w, i))}${got ? ' ✓' : ''}</span>`; }).join('');
  return `<div class="marks"><b>막대 눈금 보상</b>${cells}</div>`;
}
const CUT_LINES: Record<number, [string, string]> = {
  2: ['좋아요. 결재. 다음은 엘리니아예요. 막대가 절반쯤 차면, 손님이 하나 더 올 거예요.', '매니저님!! 엘리니아에 불이 켜졌어요!! 슬라임 채용권이랑 개업권도 받았어요!!'],
  3: ['좋아요. 결재. 페리온은 바위투성이예요.', '매니저님!! 헤네시스에서 키운 직원을 위로 발령 보내요!!'],
  4: ['좋아요. 결재. 커닝시티는 사람이 많아요.', '매니저님!! 모험가님이 엄청 늘어요!! 자리 넉넉히요!!'],
  5: ['좋아요. 결재. 마지막은 슬리피우드. 발록 씨가 기다려요.', '매니저님!! 주니어 발록 씨가 입사 지원서를 냈어요!! 대기실에 있어요!!'],
};
function chapterCut(k: number) {
  const w = A.w, ch = CHAPTERS[k - 1];
  const [mom, oren] = CUT_LINES[k] || ['좋아요. 결재.', '매니저님!!'];
  const cut = h(`<div class="cut"><div>
    <h1><small>CHAPTER ${k}</small>${k}장 · ${ch.region}</h1>
    <div class="lines">
      <div class="ln">${img('mom', 2)}${mom}</div>
      <div class="ln">${img('oren', 2)}${oren}</div>
    </div>
    <button class="btn go" data-go>불 켜러 가기 →</button></div></div>`);
  must('#stage').appendChild(cut);
  A.ui.modal = 'cut';
  must('[data-go]', cut).onclick = () => {
    cut.remove(); A.ui.modal = null;
    A.world.dirty = true;
    snd.play('event');
    setTimeout(() => snd.play('pop'), 900);
    toast(`★ ${w.stars} · ${ch.region} 개방 · 졸업선 Lv ${ch.road}`);
    emit([{ type: 'chapter', n: k }]);
    refresh();
  };
}
/** 엔딩 컷: 발록 던전에 첫 파티가 도착하고, 섬 전체에 불이 켜진다 */
function ending() {
  A.ui.modal = 'ending';
  snd.play('ending');
  const cut = h(`<div class="cut ending"><div>
    <div class="endscene">${img('balrog', 5)}<div class="party">${[0, 1, 2, 3].map(i => img('a' + i, 3)).join('')}</div></div>
    <div class="lines">
      <div class="ln">${img('balrog', 2)}…손님인가.</div>
      <div class="ln late">${img('balrog', 2)}…퇴근!</div>
      <div class="ln late2">${img('mom', 2)}좋아요. 이 월드, 사람들이 좋아하네요.</div>
    </div>
    <h1 class="late3"><small>THE END</small>섬 전체에 불이 켜졌어요</h1>
    <button class="btn go late3" data-go>계속 운영하기 →</button></div></div>`);
  must('#stage').appendChild(cut);
  must('[data-go]', cut).onclick = () => {
    cut.remove(); A.ui.modal = null;
    A.world.dirty = true;
    emit([{ type: 'chapter', n: 5 }]);
    refresh();
    A.openFullClear();
  };
}

// ── 완전 클리어 컷 (v1.7): 엔딩(밤, 발록의 첫 손님)과 다르게 — 낮, 직원 전원이 줄 서고, 머쉬맘이 마침표로 말한다 ─────
A.openClearCut = () => {
  const w = A.w;
  const sps = Array.from(new Set(w.monsters.filter(m => m.d).map(m => monArt(m)))).slice(0, 9);
  A.ui.modal = 'clear';
  snd.play('ending');
  const cut = h(`<div class="cut clear"><div>
    <div class="confetti">${Array.from({ length: 14 }, (_, i) => `<i style="left:${4 + i * 7}%;animation-delay:${(i % 5) * 0.35}s"></i>`).join('')}</div>
    <div class="clearscene">${sps.map(a => img(a, 3)).join('')}${img('mom', 3)}</div>
    <div class="lines">
      <div class="ln">${img('mom', 2)}완전 클리어. 던전 ${M.plotsInPlay().length}곳이 모두 별 셋이고, 도감 ${M.dexTotal()}칸이 다 찼어요.</div>
      <div class="ln late">${img('balrog', 2)}…축하한다.</div>
    </div>
    <h1 class="late2"><small>ALL CLEAR</small>🏝️ 이 섬의 전설이에요</h1>
    <button class="btn go late2" data-go>계속 운영하기 →</button></div></div>`);
  must('#stage').appendChild(cut);
  must('[data-go]', cut).onclick = () => { cut.remove(); A.ui.modal = null; A.world.dirty = true; snd.play('pop'); refresh(); };
};
A.handlers.push(ev => { for (const e of ev) if (e.type === 'fullclear' && !A.ui.modal && !A.ui.off) A.openClearCut(); });

// ── 완전 클리어 체크리스트 (엔딩 직후, 목적 상실 방지 02 §6.6) ─────
A.openFullClear = () => {
  const w = A.w, fc = M.fullClear(w);
  const rows = M.plotsInPlay().map(p => {
    const d = w.dungeons[p.id];
    const st = d ? M.dungeonStars(d) : 0;
    return `<div class="fcr ${st >= 3 ? 'ok' : ''}"><span>${p.name}</span><span class="st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span><small>${d ? n(d.joy) : 0}/${n(M.JOY_STARS[2])}</small></div>`;
  }).join('');
  const modal = must('#modal');
  modal.hidden = false; A.ui.modal = 'fullclear';
  modal.innerHTML = `<div class="codex fc"><button class="x" data-close>✕</button>
    <h2>🏝️ 완전 클리어 체크리스트</h2>
    <div class="fcsum"><div class="${fc.ending ? 'ok' : ''}">엔딩 ${fc.ending ? '✓' : '—'}</div><div class="${fc.starred >= fc.plots ? 'ok' : ''}">던전 ★3 ${fc.starred}/${fc.plots}</div><div class="${fc.dex >= M.dexTotal() ? 'ok' : ''}">도감 ${fc.dex}/${M.dexTotal()}</div></div>
    <div class="fcgrid">${rows}</div>
    <div class="dim" style="margin-top:10px">던전 ★은 그 던전의 누적 즐거움(😊 × 시간)으로 올라요. ★1 100 · ★2 500 · ★3 2,000</div></div>`;
  const close = () => { modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null; };
  must('[data-close]', modal).onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
};

// ── S0 출근 리포트 ──────────────────────────────────────────
function scene(kind: string, data: Record<string, unknown>) {
  const w = A.w;
  const advs = (k: number) => Array.from({ length: k }, (_, i) => `<div class="a" style="left:${14 + i * 38}px;bottom:52px">${img('a' + (i % 6), 2)}</div>`).join('');
  if (kind === 'burst') return { cap: `✨ 한 시간에 레벨업 ${data.n}번`, html: advs(5) + Array.from({ length: 5 }, (_, i) => `<div class="a beam" style="left:${8 + i * 38}px;bottom:52px"></div>`).join('') + `<div class="a burstn">×${data.n}</div>` };
  if (kind === 'grad') return { cap: data.first ? '🎓 첫 졸업!' : `🎓 ${data.n}명 졸업`, html: `<div class="a" style="left:80px;bottom:52px">${img('a4', 3)}</div><div class="a" style="left:92px;top:14px;font-size:var(--fs-d1)">🎓</div><div class="a" style="left:24px;top:40px;font-size:var(--fs-xl)">🎉</div><div class="a" style="left:160px;top:36px;font-size:var(--fs-xl)">🎉</div>` };
  if (kind === 'crowd') return { cap: `🌀 ${plotShort(data.d as PlotId)} 만원`, html: advs(5) + `<div class="a" style="left:20px;top:16px;font-size:var(--fs-xl)">😠</div><div class="a" style="left:90px;top:10px;font-size:var(--fs-xl)">😠</div><div class="a" style="left:150px;top:18px;font-size:var(--fs-xl)">😊</div>` };
  if (kind === 'ready') { const m = w.monsters.find(x => x.id === data.mon); if (!m) return null; return { cap: `▲ ${M.monName(m)} 진화 준비`, html: `<div class="a glowev" style="left:60px;bottom:52px">${img(monArt(m), 4)}</div><div class="a evmini">▲</div>` }; }
  if (kind === 'doc') return { cap: '📋 결재 서류 도착', html: `<div class="a docp"></div><div class="a docs">결재</div>` };
  if (kind === 'elite') return { cap: `★ 엘리트 ${data.n}번 출현`, html: advs(4) + `<div class="a" style="left:128px;bottom:52px;filter:drop-shadow(0 0 6px var(--gold))">${img('m:' + (data.art as string), 4)}</div><div class="a" style="left:136px;top:18px;font-size:var(--fs-xl)">★</div>` };
  if (kind === 'boss') { const fb = fieldBoss(data.ch as number); if (!fb) return null; return { cap: data.down ? `👑 ${fb.name} 토벌!` : `👑 ${fb.name}가 찾아왔어요`, html: advs(3) + `<div class="a" style="left:118px;bottom:48px">${img('m:' + fb.art, 5)}</div>${data.down ? '<div class="a" style="left:24px;top:30px;font-size:var(--fs-xl)">🎉</div>' : ''}` }; }
  if (kind === 'mark') { const ms = data.list as M.Report['marks']; return { cap: `📊 결재 막대 ${ms.map(x => Math.round(x.pct * 100) + '%').join('·')}`, html: `<div class="a markbar"><i style="width:${Math.round(ms[ms.length - 1].pct * 100)}%"></i></div><div class="a markrw">${ms.map(x => markLabel(x.reward)).join('<br>')}</div>` }; }
  if (kind === 'box') return { cap: `📦 상자 ${data.n}개가 기다려요`, html: advs(3) + Array.from({ length: Math.min(3, data.n as number) }, (_, i) => `<div class="a" style="left:${36 + i * 52}px;top:${22 + (i % 2) * 8}px;font-size:var(--fs-d1)">📦</div>`).join('') };
  if (kind === 'entrance') return { cap: `😐 입구 막힘 ${dur(data.min as number)}`, html: advs(3) + `<div class="a" style="left:30px;top:14px;font-size:var(--fs-xl)">😐</div><div class="a" style="left:100px;top:10px;font-size:var(--fs-xl)">😐</div>` };
  // v1.7 모객: 돌아온 손님이 첫 명장면이다 — 돌아온 매니저가 자기 이야기로 읽는다
  if (kind === 'clear') return { cap: '🏝️ 완전 클리어!', html: advs(4) + `<div class="a" style="left:20px;top:10px;font-size:var(--fs-xl)">🎉</div><div class="a" style="left:96px;top:6px;font-size:var(--fs-d1)">🏝️</div><div class="a" style="left:170px;top:14px;font-size:var(--fs-xl)">🎉</div>` };
  if (kind === 'star3') return { cap: `⭐ 던전 ★3 +${data.n}`, html: advs(3) + `<div class="a" style="left:60px;top:12px;font-size:var(--fs-d1);color:var(--gold)">★★★</div>` };
  if (kind === 'return') return { cap: `🔁 손님 ${data.n}명이 돌아왔어요`, html: advs(4) + `<div class="a" style="left:24px;top:14px;font-size:var(--fs-xl)">🔁</div><div class="a" style="left:120px;top:10px;font-size:var(--fs-xl)">😊</div>` };
  return null;
}
A.showReport = (rep, awayMin) => {
  const w = A.w;
  A.ui.modal = 'report';
  const picks: [string, Record<string, unknown>][] = [];
  if (rep.cleared) picks.push(['clear', {}]);
  if (rep.returned) picks.push(['return', { n: rep.returned }]);
  if (w.ended && rep.starredDelta > 0) picks.push(['star3', { n: rep.starredDelta }]);
  if (rep.approval) picks.push(['doc', {}]);
  if (rep.bossDown.length) picks.push(['boss', { ch: rep.bossDown[0].ch, down: true }]);
  else if (rep.bossCall && w.boss && !w.boss.d) picks.push(['boss', { ch: rep.bossCall, down: false }]);
  if (rep.marks.length) picks.push(['mark', { list: rep.marks }]);
  if (rep.elites.length) { const m = w.monsters.find(x => x.id === rep.elites[rep.elites.length - 1].mon); picks.push(['elite', { n: rep.elites.length, art: m ? monArt(m) : 'snail' }]); }
  if (rep.firstGrad) picks.push(['grad', { first: true, n: rep.grads }]);
  if (rep.bestBurst && rep.bestBurst.n >= 5 && M.levelsOf(w)[rep.bestBurst.d]) picks.push(['burst', rep.bestBurst as unknown as Record<string, unknown>]);
  if (rep.ready.length) picks.push(['ready', { mon: rep.ready[0] }]);
  if (rep.entranceMin >= 60) picks.push(['entrance', { min: rep.entranceMin }]);
  if (rep.grads && !rep.firstGrad) picks.push(['grad', { n: rep.grads }]);
  if (rep.crowdMax && rep.crowdMax.n >= 3) picks.push(['crowd', rep.crowdMax as unknown as Record<string, unknown>]);
  if (rep.boxesWaiting) picks.push(['box', { n: rep.boxesWaiting }]);
  const scenes = picks.slice(0, 3).map(([k, d]) => scene(k, d)).filter((x): x is { cap: string; html: string } => !!x);
  const sinceIn = rep.happy - (A.checkin.happy0 || 0);
  const king = rep.king && w.monsters.find(x => x.id === rep.king!.id);
  const b = M.badges(w);
  const chips: string[] = [];
  if (w.approvalReady) chips.push(`<button class="tchip" data-go="doc"><i class="al">📋</i>결재 받기</button>`);
  const gaps = b.filter((x): x is Extract<M.Badge, { kind: 'gap' }> => x.kind === 'gap').sort((p, q) => q.n - p.n);
  const gap = gaps[0];
  if (gap) chips.push(gap.n ? `<button class="tchip" data-go="gap" data-a="${gap.seg[0]}" data-b="${gap.seg[1]}"><i class="al">!</i>${gap.seg[0] === 1 ? '입구 막힘' : '빈틈'} ${segTxt(gap.seg)} · ${gap.n}명</button>` : `<button class="tchip" data-go="gap" data-a="${gap.seg[0]}" data-b="${gap.seg[1]}"><i class="cold">⋯</i>끊긴 길 ${segTxt(gap.seg)}</button>`);
  const evs = b.filter((x): x is Extract<M.Badge, { kind: 'evolve' }> => x.kind === 'evolve' && x.shown); if (evs.length) chips.push(`<button class="tchip" data-go="ev" data-mon="${evs[0].mon}"><i class="ev">▲</i>진화 가능 ${evs.length}</button>`);
  const bz = b.filter((x): x is Extract<M.Badge, { kind: 'busy' }> => x.kind === 'busy').sort((p, q) => q.n - p.n)[0]; if (bz) chips.push(`<button class="tchip" data-go="busy" data-d="${bz.d}"><i class="bz">🌀</i>${plotShort(bz.d)} 과밀</button>`);
  if (w.boss && !w.boss.d) chips.push(`<button class="tchip" data-go="boss"><i class="ev">👑</i>필드 보스 초대</button>`);
  if (M.boxesOf(w).length) chips.push(`<button class="tchip" data-go="box"><i class="bx">📦</i>상자 ${M.boxesOf(w).length}</button>`);
  if (rep.recruit) chips.push(`<button class="tchip" data-go="recruit"><i class="rc">📣</i>${rep.recruit.kind === 'return' ? '복귀' : '신규'} 모객${M.recruitTickets(w) ? ' · 🎟' : ''}</button>`);
  const bal = w.monsters.find(m => m.sp === 'balrog' && !m.d); if (bal) chips.push(`<button class="tchip" data-go="world"><i class="ev">👹</i>발록 씨 배치</button>`);
  const ch = M.chapterInfo(w), c = M.approvalConds(w), j = joyText(w);
  const el = h(`<div class="report"><div class="paper rp">
    <div class="stamp" id="rstamp">출근<small>${clockText(w.t).split(' · ')[1]}</small></div>
    <h1>매니저님 출근!</h1><div class="sub">매니저님이 퇴근한 ${dur(awayMin)} 동안, 월드는 이렇게 돌았어요</div>
    <div class="tiles">
      <div class="tile main"><div class="k">😊 지금 월드를 즐기는 모험가</div><div class="v"><span data-count="${rep.happy}">0</span>${sinceIn > 0 ? `<span class="dd">▲ ${sinceIn}<small>지난 출근보다</small></span>` : ''}${rep.returned ? `<span class="dd rt">🔁 ${rep.returned}<small>돌아온 손님</small></span>` : ''}</div></div>
      <div class="tile"><div class="k">✨ 그동안 레벨업</div><div class="v"><span data-count="${rep.levelups}">0</span><span class="dd gray">회</span></div></div>
      <div class="tile"><div class="k">스마일</div><div class="v"><div class="can big"></div>+<span data-count="${Math.max(0, rep.smile)}">0</span></div></div>
    </div>
    <div class="scenes">
      ${scenes.map(s => `<div class="scn"><div class="g"></div>${s.html}<div class="cap">${s.cap}</div></div>`).join('')}
      ${king ? `<div class="king"><h5>👑 밤사이 퇴근왕</h5><div class="ph"><span class="crown">👑</span>${img(monArt(king), 3)}</div><b>${M.monName(king)} #${king.no}</b><span>퇴근 ${n(rep.king!.n)}회</span></div>` : ''}
    </div>
    <div class="todo"><span class="lbl">할 일</span>${chips.join('') || '<span class="dim">고칠 곳이 없어요. 구경하셔도 돼요!</span>'}<button class="cta" data-go="world">월드로 →</button></div>
    ${w.ended ? (w.clearedAt ? `<div class="goal"><b>🏝️ 완전 클리어 ✓</b><span class="dim">이 섬의 전설이에요. 구경하셔도 돼요!</span></div>` : `<div class="goal"><b>🏝️ 완전 클리어</b>던전 ★3 <div class="bar"><i style="width:${Math.round(100 * rep.starred / Math.max(1, M.plotsInPlay().length))}%;background:var(--smile)"></i></div>${rep.starred}/${M.plotsInPlay().length}${rep.starredDelta > 0 ? ` <em class="up">+${rep.starredDelta}</em>` : ''}
      <span class="g2">도감</span><div class="bar"><i style="width:${Math.round(100 * rep.dex / M.dexTotal())}%;background:var(--evolve)"></i></div>${rep.dex}/${M.dexTotal()}${rep.dexDelta > 0 ? ` <em class="up">+${rep.dexDelta}</em>` : ''}</div>`) : `<div class="goal"><b>📋 ${ch.n}장 결재</b>① Lv 1–${ch.road} 잇기 <div class="bar"><i style="width:${Math.round(100 * (ch.road - c.roadLeft) / ch.road)}%"></i></div>${!c.road && !w.approvalReady ? `<em class="no">${c.roadNote}</em>` : '✓'}
      <span class="g2">② 즐거운 시간</span><div class="bar"><i style="width:${w.approvalReady ? 100 : j.pct}%;background:var(--smile)"></i></div>${w.approvalReady || j.ok ? '✓' : Math.floor(j.pct) + '%' + (j.eta ? ` · ${j.eta}` : '')}</div>`}
  </div></div>`);
  must('#stage').appendChild(el);
  // 연출: 도장 → 숫자 → 명장면 → 퇴근왕
  const T = (ms: number, f: () => void) => (A.demo ? f() : setTimeout(f, ms));
  T(250, () => { el.querySelector('#rstamp')!.classList.add('slam'); snd.play('tak'); });
  $$('.tile', el).forEach((t, i) => T(500 + i * 150, () => t.classList.add('in')));
  T(700, () => {
    $$<HTMLElement>('[data-count]', el).forEach(s => {
      const to = +(s.dataset.count || 0), t0 = performance.now();
      if (A.demo) { s.textContent = n(to); return; }
      const f = (now: number) => { const p = clamp((now - t0) / 900, 0, 1); s.textContent = n(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    snd.play('coin');
  });
  $$('.scn', el).forEach((s, i) => T(1300 + i * 250, () => { s.classList.add('in'); snd.play('ui'); }));
  T(1300 + scenes.length * 250 + 150, () => { el.querySelector('.king')?.classList.add('in'); });
  const close = () => { el.remove(); A.ui.modal = null; A.world.snap = true; A.checkin.happy0 = M.happyCount(A.w); refresh(); };
  $$<HTMLElement>('[data-go]', el).forEach(bt => (bt.onclick = () => {
    const g = bt.dataset.go;
    close();
    if (rep.cleared) { A.openClearCut(); return; }
    if (g === 'doc') A.openApproval();
    else if (g === 'gap') A.openHire({ seg: [+(bt.dataset.a || 1), +(bt.dataset.b || 1)] });
    else if (g === 'ev') A.openEvolve(+(bt.dataset.mon || 0));
    else if (g === 'busy') A.openDungeon(bt.dataset.d!, { hl: 'seat' });
    else if (g === 'boss') A.openBoss();
    else if (g === 'recruit') A.openRecruit();
    else if (g === 'box') { const b0 = M.boxesOf(A.w)[0]; if (b0) setTimeout(() => A.openBox(b0.id), 80); }
  }));
};

/** 떠나 있던 시간을 서버처럼 한 번에 계산하고 리포트를 띄운다 */
A.catchUp = minutes => {
  const w = A.w;
  const L = M.ledgerStart(w);
  const k = M.advance(w, minutes, L);
  const rep = M.ledgerReport(L, w);
  M.recordReport(w, rep); // 도감 운영 기록: 밤사이 퇴근왕 (v1.7)
  // 매니저 복귀 (v1.7): 오래 떠났다 돌아오면 모객권 — 실제 플레이어의 복귀가 월드의 복귀 손님과 만난다
  if (M.welcomeBack(w, k)) setTimeout(() => toast('📣 돌아오신 기념 모객권 +1 · 손님도 불러요'), A.demo ? 0 : 2600);
  A.world.snap = true;
  A.showReport(rep, k);
  refresh();
};

// ── S7 매니저 퇴근 ──────────────────────────────────────────
A.offDuty = why => {
  if (A.ui.off) return;
  // 입구가 막힌 채 퇴근하려 하면 오렌이 한 번 붙잡는다 (밤새 새 손님이 못 들어오는 걸 막는다)
  if (why === 'manual' && !A.ui.modal) {
    const g = M.gapSegments(A.w)[0];
    if (g && g[0] === 1 && !(A.ui as { warned?: boolean }).warned) {
      (A.ui as { warned?: boolean }).warned = true;
      toast('입구가 막혀 있어요!! 밤새 새 손님이 혼자 걸어야 해요. 그래도 퇴근하려면 한 번 더 눌러요');
      A.openHire({ seg: g });
      setTimeout(() => { (A.ui as { warned?: boolean }).warned = false; }, 8000);
      return;
    }
  }
  A.closeSheet();
  if (A.ui.mode === 'dungeon') A.closeDungeon();
  $$('.pop-mon').forEach(e => e.remove());
  A.ui.off = true;
  A.ui.offAt = performance.now();
  A.ui.offSpeed = A.speed;
  save();
  const stars = Array.from({ length: 14 }, () => `<i style="left:${Math.random() * 140}px;top:${Math.random() * 100}px"></i>`).join('');
  const el = h(`<div class="offduty"><div>
    <div class="office"><div class="win">${stars}</div><div class="glow"></div><div class="lamp"></div><div class="desk"></div>
      <div class="cancan"><div class="can big"></div></div>
      <div class="who">${img('oren', 4)}</div></div>
    <h2>매니저님 퇴근!</h2>
    <p>${why === 'idle' ? '한동안 입력이 없어서 퇴근 처리했어요. ' : ''}월드는 서버 시간으로 계속 돌아요. 오렌이 지키고 있을게요!!</p>
    <button class="btn go big" data-in>출근하기</button>
    ${A.speed > 1 ? `<div class="dim small">테스트: 퇴근해 있는 동안 현재 배속(×${A.speed})으로 시간이 흐른 것으로 계산해요</div>` : ''}
  </div></div>`);
  must('#stage').appendChild(el);
  must('[data-in]', el).onclick = () => {
    const realMin = (performance.now() - A.ui.offAt) / 60000;
    const min = realMin * A.ui.offSpeed;
    el.remove(); A.ui.off = false;
    A.ui.lastInput = performance.now();
    snd.play('tak');
    if (min >= 1) A.catchUp(min); else { A.world.snap = true; refresh(); }
  };
};

// ── 도감 ────────────────────────────────────────────────────
A.openCodex = () => {
  const w = A.w;
  let rows = '';
  const dayOf = (t: number | null | undefined) => (t == null ? '' : clockText(t).split(' · ')[0]);
  for (const sp of M.speciesInPlay()) {
    const s = SPECIES[sp];
    const open = sp === 'balrog' ? !!w.dex['balrog:0'] : s.chapter <= w.chapter;
    // v1.7 운영 기록: 일한 사냥터 · 퇴근왕 횟수 · 단계마다 처음 진화한 날. 본 것만이 아니라 함께 일한 기록이다
    const r = M.recordOf(w, sp);
    const worked = r.plots.map(id => plotInfo(id).short).join('·');
    const recLine = open && (worked || r.kings) ? `<em>${worked ? `🏠 ${worked}` : ''}${r.kings ? `${worked ? ' · ' : ''}👑 퇴근왕 ${r.kings}번` : ''}</em>` : '';
    rows += `<div class="rowc"><div class="nm">${open ? (sp === 'balrog' ? '특별 입사' : s.names[0] + ' 계열') : '???'}<small>${s.trait ? TRAITS[s.trait].icon + ' ' + TRAITS[s.trait].name : s.note && open ? s.note : '표준'}</small>${recLine}</div>`;
    s.names.forEach((nm, i) => {
      const k = w.dex[sp + ':' + i];
      const at = k && r.at[i] != null ? dayOf(r.at[i]) : '';
      rows += `<div class="cell ${k ? 'got' : ''}"><div class="ph">${k ? img(s.art[i], 2) : sil(s.art[i], 2)}</div>${k ? nm : '?'}${s.boss && i === s.names.length - 1 ? ' 👑' : ''}<br><span>Lv ${s.base + 8 * i}${at ? ` · ${i ? '진화' : '입사'} ${at}` : ''}</span></div>`;
    });
    rows += `</div>`;
  }
  rows += `<div class="rowc"><div class="nm">필드 보스<small>장마다 한 번 찾아오는 손님</small></div>`;
  for (const fb of FIELD_BOSSES) {
    const k = w.dex[bossDexKey(fb.ch)];
    rows += `<div class="cell ${k ? 'got' : ''}"><div class="ph">${k ? img('m:' + fb.art, 3) : sil('m:' + fb.art, 3)}</div>${k ? fb.name : '?'} 👑<br><span>${fb.ch}장 · Lv ${fb.lv}</span></div>`;
  }
  rows += `</div>`;
  const modal = must('#modal');
  modal.hidden = false; A.ui.modal = 'codex';
  modal.innerHTML = `<div class="codex"><button class="x" data-close>✕</button><h2>📖 도감 <small>${M.dexCount(w)} / ${M.dexTotal()} · 높은 단계는 키워서만, 필드 보스는 토벌해서 얻어요</small></h2><div class="codexbody">${rows}</div></div>`;
  const close = () => { modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null; };
  must('[data-close]', modal).onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  snd.play('ui');
};
