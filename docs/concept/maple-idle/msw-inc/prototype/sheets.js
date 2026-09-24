/* MSW 주식회사 프로토타입 — S3 진화 · S5 채용 · S6 결재 · S0 출근 리포트 · S7 매니저 퇴근 · 도감 · 입사 컷 */
(function () {
  'use strict';
  const A = window.A, M = A.M;
  const segTxt = s => (s[0] === s[1] ? `Lv ${s[0]}` : `Lv ${s[0]}–${s[1]}`);

  // ── 시트 공통 ───────────────────────────────────────────
  A.closeSheet = () => {
    const sh = A.$('#sheet');
    sh.hidden = true; sh.innerHTML = '';
    A.ui.sheet = null;
    A.renderOren();
    if (A.world) A.world.setPreview(null);
    if (A.T) A.T.poke();
  };
  function openSheet(kind, color, html) {
    closePop();
    const sh = A.$('#sheet');
    sh.hidden = false;
    sh.style.setProperty('--sc', color);
    sh.innerHTML = `<button class="x" data-close>✕</button>${html}`;
    A.ui.sheet = kind;
    A.renderOren();
    sh.querySelector('[data-close]').onclick = () => { A.snd.play('ui'); A.closeSheet(); };
    if (A.T) A.T.poke();
    return sh;
  }

  // ── S5 신입 채용 ────────────────────────────────────────
  A.openHire = opt => {
    opt = opt || {};
    const w = A.w;
    const into = opt.into || (A.ui.mode === 'dungeon' ? A.dv.id : null);
    const rec = M.recommendSpecies(w), seg = M.gapSegments(w)[0];
    let cards = '';
    for (const sp in M.SPECIES) {
      const s = M.SPECIES[sp];
      if (s.chapter > w.chapter + 1) continue;
      const locked = s.chapter > w.chapter;
      const tr = s.trait ? M.TRAITS[s.trait] : null;
      const ticket = w.tut.ticket === sp;
      const can = ticket || w.smile >= s.cost;
      const art = s.art[0];
      cards += `<div class="hcard ${rec === sp && !locked ? 'rec' : ''} ${locked ? 'locked' : ''}" data-sp="${sp}">
        ${rec === sp && !locked && seg ? `<span class="rib">빈틈 ${segTxt(seg)}에 딱!</span>` : ''}
        <div class="ph">${locked ? `<img class="px" src="${ART.silhouette(art, 3)}">` : A.img(art, 3)}</div>
        <b>${locked ? '???' : s.names[0]}</b><span class="lvl">Lv ${s.base} · 1단계</span>
        <span class="trait">${tr ? tr.icon + ' ' + tr.name + ' (' + tr.desc + ')' : '— 표준'}</span>
        ${locked ? `<div class="go dis">${s.chapter - 1}장 결재 후</div>`
          : `<button class="go ${can ? '' : 'dis'}" data-hire="${sp}">${ticket ? '🎟 입사 선물 · 무료' : `<i class="mini-can"></i>${A.n(s.cost)} 채용`}</button>`}
      </div>`;
    }
    const sh = openSheet('hire', 'var(--flow)', `
      <div class="sh-title">신입 채용 <small>1단계 직원만 뽑을 수 있어요. 높은 단계는 키워서만 얻어요${into ? ` · 뽑으면 바로 <b>${A.plotName(into)}</b>에 배치` : ' · 뽑은 직원은 대기실로'}</small></div>
      <div class="cards">${cards}</div>`);
    sh.querySelectorAll('[data-hire]').forEach(b => (b.onclick = () => doHire(b.dataset.hire, into)));
    A.snd.play('ui');
  };
  function doHire(sp, into) {
    const w = A.w;
    const r = M.hire(w, sp, into);
    if (!r.ok) { A.nope(r.msg); return; }
    A.snd.play('hire');
    const m = r.mon;
    let placed = false;
    if (into) { const p = M.place(w, m.id, into); placed = p.ok; }
    A.closeSheet();
    A.toast(`${M.monName(m)} 채용${r.free ? ' · 채용권 사용' : ` · 스마일 −${A.n(r.cost)}`}${placed ? ` · ${A.plotName(into)} 배치` : ''}`, { undo: () => M.unhire(w, m.id, r.free ? 'ticket' : r.cost) });
    A.handlers.forEach(f => f([{ type: 'hired', mon: m.id, placed }]));
    if (!placed) A.highlightBest(m.id);
    A.refresh();
  }

  // ── S3 진화: 결과를 월드 위에서 미리 본다 ────────────────
  A.openEvolve = monId => {
    const w = A.w, m = w.monsters.find(x => x.id === monId);
    if (!m || !M.canEvolve(m)) return;
    if (A.ui.mode === 'dungeon') A.closeDungeon();
    const sp = M.SPECIES[m.sp], next = m.stage + 1;
    const pv = M.preview(w, { evolve: m.id });
    const known = w.dex[m.sp + ':' + next];
    const bossClash = m.d && sp.boss && next === 3 && M.monsIn(w, m.d).some(x => x.id !== m.id && M.isBoss(x));
    let dex = '';
    sp.names.forEach((nm, i) => {
      const k = w.dex[m.sp + ':' + i];
      dex += `<div class="r ${i === m.stage ? 'now' : ''} ${!k && i !== next ? 'q' : ''}">${k ? A.img('m:' + sp.art[i], 1) : `<img class="px" src="${ART.silhouette('m:' + sp.art[i], 1)}">`}${k || i === next ? (k ? nm : '<b style="color:var(--evolve)">NEW?</b>') : '?'}${i === 3 ? ' (보스)' : ''}</div>`;
    });
    const D0 = m.d ? pv.before[m.d] : null, D1 = m.d ? pv.after[m.d] : null;
    let res, hint = '';
    if (bossClash) res = `<div class="res bad">✕ 보스는 던전에 한 마리만 — 다른 던전으로 옮긴 뒤 진화해요</div>`;
    else if (pv.lost.length) {
      res = `<div class="res bad">⚠ ${pv.lost.map(segTxt).join(', ')}가 비어요${pv.stranded ? ` · 모험가 ${pv.stranded}명이 갈 곳을 잃어요` : ''}</div>`;
      const need = pv.lost[0][0];
      const fix = Object.keys(M.SPECIES).filter(k => M.SPECIES[k].chapter <= w.chapter).sort((a, b) => Math.abs(M.SPECIES[a].base - need) - Math.abs(M.SPECIES[b].base - need))[0];
      if (fix && Math.abs(M.SPECIES[fix].base - need) <= 5) hint = `💡 ${A.josa(M.SPECIES[fix].names[0], '을', '를')} 뽑아 ${m.d ? A.plotName(m.d).replace('헤네시스 ', '') + '에 두면' : '두면'} 다시 이어져요 <button data-fix="${fix}">채용하러 가기</button>`;
    } else res = `<div class="res ok">✓ 빈틈이 생기지 않아요${pv.gained.length ? ` · ${pv.gained.map(segTxt).join(', ')} 새로 이어져요` : ''}</div>`;
    const sh = openSheet('evolve', 'var(--evolve)', `
      <div class="evs">
        <div class="idc"><div class="ph">${A.img(sp.art[m.stage], 3)}</div><b>${M.monName(m)}</b><span>Lv ${M.monLevel(m)} · ${m.stage + 1}단계</span></div>
        <div class="arrow">➜<small>사원증<br>사진 교체</small></div>
        <div class="idc after"><div class="ph">${known ? A.img(sp.art[next], 3) : `<img class="px" src="${ART.silhouette(sp.art[next], 3)}">`}</div><b>${known ? sp.names[next] : '???'}</b><span>Lv ${M.monLevel(m) + 8} · ${next + 1}단계${next === 3 ? ' · 보스' : ''}</span></div>
        <div class="dexrow"><b style="font-size:12px">${sp.names[0]} 계열 ${sp.trait ? M.TRAITS[sp.trait].icon : ''}</b>${dex}</div>
        <div class="conseq">
          <div class="lvch">${m.d ? `${A.plotName(m.d)} · 던전 Lv ${D0} → ${D1}` : '대기실에서 진화'}</div>
          ${res}
          <div class="hint">${hint || '보류해도 벌칙은 없어요. 근속은 계속 쌓여요'}</div>
        </div>
        <div class="btns"><button class="btn pri" data-go ${bossClash ? 'disabled style="opacity:.4"' : ''}>▲ 진화시키기</button><button class="btn" data-hold>보류</button></div>
      </div>`);
    A.world.setPreview(pv, { kind: 'evolve' });
    sh.querySelector('[data-hold]').onclick = () => { A.snd.play('ui'); A.closeSheet(); };
    const fixB = sh.querySelector('[data-fix]');
    if (fixB) fixB.onclick = () => { A.closeSheet(); A.openHire(); };
    sh.querySelector('[data-go]').onclick = () => doEvolve(m.id);
    A.snd.play('ui');
  };
  function doEvolve(monId) {
    const w = A.w, m = w.monsters.find(x => x.id === monId);
    const from = { art: A.monArt(m), name: M.monName(m), lv: M.monLevel(m) };
    const r = M.evolve(w, monId);
    if (!r.ok) { A.nope(r.msg); return; }
    A.closeSheet();
    const st = A.$('#stage');
    st.appendChild(A.h('<div class="flash"></div>'));
    setTimeout(() => A.$$('.flash').forEach(e => e.remove()), 800);
    const to = { art: A.monArt(m), name: M.monName(m), lv: M.monLevel(m) };
    const modal = A.$('#modal');
    modal.hidden = false; A.ui.modal = 'evolve';
    modal.innerHTML = `<div style="text-align:center"><div class="flipwrap"><div class="flipcard" id="flip">
        <div class="f"><div class="ph">${A.img(from.art, 5)}</div><b>${from.name}</b><span>Lv ${from.lv}</span></div>
        <div class="f b">${r.isNew ? '<span class="newrib">NEW · 도감 +1</span>' : ''}<div class="ph">${A.img(to.art, 5)}</div><b>${to.name}</b><span>Lv ${to.lv} · ${m.stage + 1}단계</span></div>
      </div></div><div class="evcap" id="evcap">사원증 사진 교체 중…</div></div>`;
    setTimeout(() => { A.$('#flip') && A.$('#flip').classList.add('flipped'); A.snd.play('evolve'); }, 250);
    setTimeout(() => { const c = A.$('#evcap'); if (c) c.innerHTML = `${A.josa(to.name, '이', '가')} 됐어요! <span style="opacity:.8;font-size:15px">(눌러서 닫기)</span>`; }, 1100);
    const close = () => { if (A.ui.modal !== 'evolve') return; modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null; A.refresh(); };
    modal.onclick = close;
    setTimeout(close, 3200);
    A.handlers.forEach(f => f([{ type: 'evolved', mon: m.id, isNew: r.isNew }]));
    A.refresh();
  }

  // ── 직원 말풍선 (탭) ────────────────────────────────────
  function closePop() { A.$$('.pop-mon').forEach(e => e.remove()); }
  A.openMonPop = (id, el) => {
    closePop();
    const w = A.w, m = w.monsters.find(x => x.id === id);
    if (!m) return;
    const r = A.rectOf(el), need = M.evolveNeed(m), sp = M.SPECIES[m.sp];
    const tr = sp.trait ? M.TRAITS[sp.trait] : null;
    const pop = A.h(`<div class="pop-mon">
      <div class="hd">${A.img(A.monArt(m), 2)}<div><b>${M.monName(m)} #${m.no}</b><div class="s">Lv ${M.monLevel(m)} · ${m.stage + 1}단계 · ${tr ? tr.icon + ' ' + tr.name : '표준'}${m.vet ? ' · 고참' : ''}</div></div></div>
      <div class="tenure"><div class="t"><span>근속(퇴근)</span><span>${need === Infinity ? '최종 단계' : A.n(Math.min(m.tenure, need)) + ' / ' + A.n(need)}</span></div><div class="bar"><i style="width:${need === Infinity ? 100 : Math.min(100, 100 * m.tenure / need)}%;background:${M.canEvolve(m) ? 'var(--evolve)' : '#b8a6ff'}"></i></div></div>
      <div class="row">${M.canEvolve(m) ? '<button class="pri" data-ev>▲ 진화</button>' : ''}${m.d ? '<button data-see>현장 보기</button><button data-tray>대기실로</button>' : ''}</div>
      <div class="tip">끌어서 다른 발판에 놓으면 옮겨져요. 놓기 전에 결과가 보여요</div></div>`);
    const x = A.clamp(r.x + r.w / 2 - 125, 8, 1280 - 258), y = r.y > 300 ? r.y - 170 : r.y + r.h + 8;
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    A.$('#stage').appendChild(pop);
    const ev = pop.querySelector('[data-ev]'); if (ev) ev.onclick = () => { closePop(); A.openEvolve(id); };
    const see = pop.querySelector('[data-see]'); if (see) see.onclick = () => { closePop(); A.openDungeon(m.d); };
    const tr2 = pop.querySelector('[data-tray]'); if (tr2) tr2.onclick = () => {
      closePop();
      const pv = M.preview(w, { move: { id, to: null } });
      const from = m.d, res = M.place(w, id, null);
      if (!res.ok) return A.nope(res.msg);
      A.snd.play('place');
      A.toast(`${M.monName(m)} 대기실로${pv.lost.length ? ` · ${pv.lost.map(segTxt).join(', ')} 비어요` : ''}`, { undo: () => { m.d = from; } });
      A.refresh();
    };
    A.snd.play('ui');
    setTimeout(() => {
      const off = e => { if (!pop.contains(e.target)) { closePop(); window.removeEventListener('pointerdown', off, true); } };
      window.addEventListener('pointerdown', off, true);
    }, 0);
  };

  // ── S6 결재함 ───────────────────────────────────────────
  A.openApproval = () => {
    const w = A.w, ch = M.chapterInfo(w);
    const segs = M.gapSegments(w), gapN = segs.reduce((s, g) => s + g[1] - g[0] + 1, 0), hc = M.happyCount(w);
    const ok1 = w.approvalReady || !gapN, ok2 = w.approvalReady || hc >= ch.happy;
    const next = M.CHAPTERS[ch.n];
    const protoEnd = ch.n >= 3; // 프로토타입 범위: 4장 계열·부지가 아직 없다
    const nextSp = Object.keys(M.SPECIES).filter(k => M.SPECIES[k].chapter === ch.n + 1).map(k => M.SPECIES[k].names[0]);
    const modal = A.$('#modal');
    modal.hidden = false; A.ui.modal = 'approval';
    modal.innerHTML = `<div class="paper appr">
      <div class="bigstamp" id="bigstamp">결재<small>머쉬맘</small></div>
      <h5>결재 서류 · ${ch.n}장</h5><h2>${ch.region}${ch.n === 1 ? '를' : '까지'} 잇자</h2>
      <div class="c ${ok1 ? 'ok' : ''}"><span class="ck">${ok1 ? '✓' : '1'}</span><span style="width:200px">Lv 1–${ch.road} 빈틈 없이</span><div class="bar"><i style="width:${Math.round(100 * (ch.road - gapN) / ch.road)}%"></i></div><span class="v">${ok1 ? '완료' : '빈틈 ' + gapN}</span></div>
      <div class="c ${ok2 ? 'ok' : ''}"><span class="ck">${ok2 ? '✓' : '2'}</span><span style="width:200px">즐기는 모험가 ${ch.happy}명 (동시)</span><div class="bar"><i style="width:${Math.min(100, 100 * hc / ch.happy)}%;background:var(--smile)"></i></div><span class="v">${ok2 ? '완료' : hc + ' / ' + ch.happy}</span></div>
      <div class="rw">결재 보상: <b>★ +1</b> · 모험가 도착 +3명/시간 ${next ? `· <b>${next.region}</b> 개방 · 부지 +3${nextSp.length ? ' · ' + nextSp.join(', ') + ' 채용' : ''} · 졸업선 Lv ${ch.road} → ${next.road}` : ''}${ch.n === 2 ? ' · 동시 이벤트 +1' : ''}</div>
      <div class="boss">${A.img('mom', 3)}<div class="say">${w.approvalReady ? '좋아요. 결재.' : `Lv ${ch.road}까지 잇고, ${ch.happy}명이 즐기면. 그럼 결재.`}</div></div>
      ${protoEnd ? '<div class="rw" style="border-color:#8b6cff;color:#5a3fcf">프로토타입은 3장 페리온까지예요. 4장 커닝시티부터는 다음 단계에서 만나요!</div>' : ''}
      <div class="foot"><button class="btn" data-close>닫기</button>${w.approvalReady && !protoEnd ? '<button class="btn red" data-stamp>결재 받기</button>' : ''}</div>
    </div>`;
    const close = () => { modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null; A.handlers.forEach(f => f([{ type: 'docSeen' }])); A.refresh(); };
    modal.querySelector('[data-close]').onclick = () => { A.snd.play('ui'); close(); };
    modal.onclick = e => { if (e.target === modal) close(); };
    const st = modal.querySelector('[data-stamp]');
    if (st) st.onclick = () => {
      st.disabled = true;
      const s = A.$('#bigstamp');
      s.classList.add('slam');
      setTimeout(() => { A.snd.play('stamp'); A.shake(); }, 280);
      setTimeout(() => {
        const r = M.approve(w);
        modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null;
        chapterCut(r.chapter);
      }, 1200);
    };
    A.snd.play('ui');
  };
  function chapterCut(n) {
    const w = A.w, ch = M.CHAPTERS[n - 1];
    const cut = A.h(`<div class="cut"><div>
      <h1><small>CHAPTER ${n}</small>${n}장 · ${ch.region}</h1>
      <div class="lines">
        <div class="ln">${A.img('mom', 2)}좋아요. 결재. 다음은 ${A.josa(ch.region, '이에요', '예요')}.</div>
        <div class="ln">${A.img('oren', 2)}매니저님!! ${ch.region}에 불이 켜졌어요!! 이제 Lv ${ch.road}까지 이어요!!</div>
      </div>
      <button class="btn go" style="margin:0 auto" data-go>불 켜러 가기 →</button></div></div>`);
    A.$('#stage').appendChild(cut);
    A.ui.modal = 'cut';
    cut.querySelector('[data-go]').onclick = () => {
      cut.remove(); A.ui.modal = null;
      A.world.dirty = true;
      A.snd.play('event');
      setTimeout(() => A.snd.play('pop'), 900);
      A.toast(`★ ${w.stars} · ${ch.region} 개방 · 졸업선 Lv ${ch.road}`);
      A.handlers.forEach(f => f([{ type: 'chapter', n }]));
      A.refresh();
    };
  }

  // ── S0 출근 리포트 ──────────────────────────────────────
  function scene(kind, data) {
    const w = A.w;
    const advs = n => Array.from({ length: n }, (_, i) => `<div class="a" style="left:${14 + i * 38}px;bottom:52px">${A.img('a' + (i % 6), 2)}</div>`).join('');
    if (kind === 'burst') return { cap: `✨ 한 시간에 레벨업 ${data.n}번`, html: advs(5) + Array.from({ length: 5 }, (_, i) => `<div class="a" style="left:${8 + i * 38}px;bottom:52px;width:40px;height:110px;background:linear-gradient(90deg,#fff0,#fff7c2cc,#fff0)"></div>`).join('') + `<div class="a" style="left:12px;top:8px;font:italic 900 26px 'Arial Black';color:#ffd84d;-webkit-text-stroke:2px #b35c00">×${data.n}</div>`, sub: A.plotName(data.d) };
    if (kind === 'grad') return { cap: data.first ? '🎓 첫 졸업!' : `🎓 ${data.n}명 졸업`, html: `<div class="a" style="left:80px;bottom:52px">${A.img('a4', 3)}</div><div class="a" style="left:92px;top:14px;font-size:30px">🎓</div><div class="a" style="left:24px;top:40px;font-size:22px">🎉</div><div class="a" style="left:160px;top:36px;font-size:22px">🎉</div>` };
    if (kind === 'crowd') return { cap: `🌀 ${A.plotName(data.d).replace('헤네시스 ', '')} 만원`, html: advs(5) + `<div class="a" style="left:20px;top:16px;font-size:22px">😠</div><div class="a" style="left:90px;top:10px;font-size:22px">😠</div><div class="a" style="left:150px;top:18px;font-size:22px">😊</div>` };
    if (kind === 'ready') { const m = w.monsters.find(x => x.id === data.mon); return { cap: `▲ ${M.monName(m)} 진화 준비`, html: `<div class="a" style="left:60px;bottom:52px;filter:drop-shadow(0 0 10px #8b6cff)">${A.img(A.monArt(m), 4)}</div><div class="a" style="left:150px;top:18px;width:30px;height:30px;border-radius:8px;background:#8B6CFF;color:#fff;font-weight:900;display:grid;place-items:center;border:2px solid #fff">▲</div>` }; }
    if (kind === 'doc') return { cap: '📋 결재 서류 도착', html: `<div class="a" style="left:50px;top:18px;width:110px;height:90px;background:#FFFDF6;border-radius:6px;box-shadow:0 3px 0 #0002;transform:rotate(-5deg)"></div><div class="a" style="left:110px;top:30px;width:52px;height:52px;border-radius:50%;border:4px solid #e0463c;color:#e0463c;font:15px Jua;display:grid;place-items:center;transform:rotate(-14deg)">결재</div>` };
    return null;
  }
  A.showReport = (rep, awayMin) => {
    const w = A.w;
    A.ui.modal = 'report';
    const picks = [];
    if (rep.approval) picks.push(['doc', {}]);
    if (rep.firstGrad) picks.push(['grad', { first: true, n: rep.grads }]);
    if (rep.bestBurst && rep.bestBurst.n >= 5 && M.levelsOf(w)[rep.bestBurst.d]) picks.push(['burst', rep.bestBurst]);
    if (rep.ready.length) picks.push(['ready', { mon: rep.ready[0] }]);
    if (rep.grads && !rep.firstGrad) picks.push(['grad', { n: rep.grads }]);
    if (rep.crowdMax && rep.crowdMax.n >= 3) picks.push(['crowd', rep.crowdMax]);
    const scenes = picks.slice(0, 3).map(([k, d]) => scene(k, d)).filter(Boolean);
    const sinceIn = rep.happy - (A.checkin.happy0 || 0);
    const king = rep.king && w.monsters.find(x => x.id === rep.king.id);
    const b = M.badges(w);
    const chips = [];
    if (w.approvalReady) chips.push(`<button class="tchip" data-go="doc"><i style="background:var(--alert)">📋</i>결재 받기</button>`);
    const gap = b.filter(x => x.kind === 'gap').sort((p, q) => q.n - p.n)[0];
    if (gap) chips.push(gap.n ? `<button class="tchip" data-go="gap"><i style="background:var(--alert)">!</i>빈틈 ${segTxt(gap.seg)} · ${gap.n}명</button>` : `<button class="tchip" data-go="gap"><i style="background:#b9c3cf">⋯</i>끊긴 길 ${segTxt(gap.seg)}</button>`);
    const evs = b.filter(x => x.kind === 'evolve'); if (evs.length) chips.push(`<button class="tchip" data-go="ev" data-mon="${evs[0].mon}"><i style="background:var(--evolve)">▲</i>진화 가능 ${evs.length}</button>`);
    const bz = b.filter(x => x.kind === 'busy').sort((p, q) => q.n - p.n)[0]; if (bz) chips.push(`<button class="tchip" data-go="busy" data-d="${bz.d}"><i style="background:var(--busy)">🌀</i>${A.plotName(bz.d).replace('헤네시스 ', '')} 과밀</button>`);
    const ch = M.chapterInfo(w), segs = M.gapSegments(w), gapN = segs.reduce((s, g) => s + g[1] - g[0] + 1, 0), hc = M.happyCount(w);
    const el = A.h(`<div class="report"><div class="paper rp">
      <div class="stamp" id="rstamp">출근<small>${A.clockText(w.t).split(' · ')[1]}</small></div>
      <h1>매니저님 출근!</h1><div class="sub">매니저님이 퇴근한 ${A.dur(awayMin)} 동안, 월드는 이렇게 돌았어요</div>
      <div class="tiles">
        <div class="tile main"><div class="k">😊 지금 월드를 즐기는 모험가</div><div class="v"><span data-count="${rep.happy}">0</span>${sinceIn > 0 ? `<span class="dd">▲ ${sinceIn}<small style="font:12px var(--body);font-weight:800;color:var(--ink2);margin-left:4px">지난 출근보다</small></span>` : ''}</div></div>
        <div class="tile"><div class="k">✨ 그동안 레벨업</div><div class="v"><span data-count="${rep.levelups}">0</span><span class="dd" style="color:var(--ink2)">회</span></div></div>
        <div class="tile"><div class="k">스마일</div><div class="v"><div class="can" style="width:30px;height:38px"></div>+<span data-count="${rep.smile}">0</span></div></div>
      </div>
      <div class="scenes">
        ${scenes.map(s => `<div class="scn"><div class="g"></div>${s.html}<div class="cap">${s.cap}</div></div>`).join('')}
        ${king ? `<div class="king"><h5>👑 밤사이 퇴근왕</h5><div class="ph"><span class="crown">👑</span>${A.img(A.monArt(king), 3)}</div><b>${M.monName(king)} #${king.no}</b><span>퇴근 ${A.n(rep.king.n)}회</span></div>` : ''}
      </div>
      <div class="todo"><span class="lbl">할 일</span>${chips.join('') || '<span style="font-weight:800;color:var(--ink2)">고칠 곳이 없어요. 구경하셔도 돼요!</span>'}<button class="cta" data-go="world">월드로 →</button></div>
      <div class="goal"><b>📋 ${ch.n}장 결재</b>① Lv 1–${ch.road} 잇기 <div class="bar"><i style="width:${Math.round(100 * (ch.road - gapN) / ch.road)}%"></i></div>${gapN && !w.approvalReady ? `<em style="color:var(--alert);font-style:normal;font-weight:900">빈틈 ${gapN}</em>` : '✓'}
        <span style="margin-left:14px">② 즐기는 모험가</span><div class="bar"><i style="width:${Math.min(100, 100 * hc / ch.happy)}%;background:var(--smile)"></i></div>${w.approvalReady ? '✓' : hc + ' / ' + ch.happy}</div>
    </div></div>`);
    A.$('#stage').appendChild(el);
    // 연출: 도장 → 숫자 → 명장면 → 퇴근왕
    setTimeout(() => { el.querySelector('#rstamp').classList.add('slam'); A.snd.play('tak'); }, 250);
    el.querySelectorAll('.tile').forEach((t, i) => setTimeout(() => t.classList.add('in'), 500 + i * 150));
    setTimeout(() => {
      el.querySelectorAll('[data-count]').forEach(s => {
        const to = +s.dataset.count, t0 = performance.now();
        if (A.demo) { s.textContent = A.n(to); return; }
        const f = now => { const p = A.clamp((now - t0) / 900, 0, 1); s.textContent = A.n(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
        requestAnimationFrame(f);
      });
      A.snd.play('coin');
    }, 700);
    el.querySelectorAll('.scn').forEach((s, i) => setTimeout(() => { s.classList.add('in'); A.snd.play('ui'); }, 1300 + i * 250));
    setTimeout(() => { const k = el.querySelector('.king'); if (k) k.classList.add('in'); }, 1300 + scenes.length * 250 + 150);
    const close = () => { el.remove(); A.ui.modal = null; A.world.snap = true; A.checkin.happy0 = M.happyCount(A.w); A.refresh(); };
    el.querySelectorAll('[data-go]').forEach(bt => bt.onclick = () => {
      const g = bt.dataset.go;
      close();
      if (g === 'doc') A.openApproval();
      else if (g === 'gap') A.openHire();
      else if (g === 'ev') A.openEvolve(+bt.dataset.mon);
      else if (g === 'busy') A.openDungeon(bt.dataset.d, { hl: 'seat' });
    });
  };

  /** 떠나 있던 시간을 서버처럼 한 번에 계산하고 리포트를 띄운다 */
  A.catchUp = (minutes) => {
    const w = A.w;
    const L = M.ledgerStart(w);
    const n = M.advance(w, minutes, L);
    const rep = M.ledgerReport(L, w);
    A.world.snap = true;
    A.showReport(rep, n);
    A.refresh();
  };

  // ── S7 매니저 퇴근 ──────────────────────────────────────
  A.offDuty = why => {
    if (A.ui.off) return;
    A.closeSheet();
    if (A.ui.mode === 'dungeon') A.closeDungeon();
    A.ui.off = true;
    A.ui.offAt = performance.now();
    A.ui.offSpeed = A.speed;
    A.save();
    const stars = Array.from({ length: 14 }, () => `<i style="left:${Math.random() * 140}px;top:${Math.random() * 100}px"></i>`).join('');
    const el = A.h(`<div class="offduty"><div>
      <div class="office"><div class="win">${stars}</div><div class="glow"></div><div class="lamp"></div><div class="desk"></div>
        <div style="position:absolute;left:170px;bottom:48px"><div class="can" style="width:26px;height:34px"></div></div>
        <div class="who">${A.img('oren', 4)}</div></div>
      <h2>매니저님 퇴근!</h2>
      <p>${why === 'idle' ? '한동안 입력이 없어서 퇴근 처리했어요. ' : ''}월드는 서버 시간으로 계속 돌아요. 오렌이 지키고 있을게요!!</p>
      <button class="btn go" data-in style="margin:0 auto;height:56px;font-size:19px">출근하기</button>
      ${A.speed > 1 ? `<div style="margin-top:14px;font-size:12px;opacity:.55">프로토타입: 퇴근해 있는 동안 현재 배속(×${A.speed})으로 시간이 흐른 것으로 계산해요</div>` : ''}
    </div></div>`);
    A.$('#stage').appendChild(el);
    el.querySelector('[data-in]').onclick = () => {
      const realMin = (performance.now() - A.ui.offAt) / 60000;
      const min = realMin * A.ui.offSpeed;
      el.remove(); A.ui.off = false;
      A.ui.lastInput = performance.now();
      A.snd.play('tak');
      if (min >= 1) A.catchUp(min); else { A.world.snap = true; A.refresh(); }
    };
  };

  // ── 도감 ────────────────────────────────────────────────
  A.openCodex = () => {
    const w = A.w;
    let rows = '';
    for (const sp in M.SPECIES) {
      const s = M.SPECIES[sp];
      const open = s.chapter <= w.chapter;
      rows += `<div class="rowc"><div class="nm">${open ? s.names[0] + ' 계열' : '???'}<br><small style="color:var(--ink2)">${s.trait ? M.TRAITS[s.trait].icon + ' ' + M.TRAITS[s.trait].name : '표준'}</small></div>`;
      s.names.forEach((nm, i) => {
        const k = w.dex[sp + ':' + i];
        rows += `<div class="cell"><div class="ph">${k ? A.img(s.art[i], 2) : `<img class="px" src="${ART.silhouette(s.art[i], 2)}">`}</div>${k ? nm : '?'}${i === 3 ? ' 👑' : ''}<br><span style="font-size:10.5px">Lv ${s.base + 8 * i}</span></div>`;
      });
      rows += '</div>';
    }
    rows += `<div class="rowc" style="color:#9aa3ae;font-weight:800;font-size:13px">숲 계열 · 멧돼지 계열 · 커닝시티 2계열 · 슬리피우드 2계열 · 주니어 발록 — 이후 챕터에서 만나요</div>`;
    const modal = A.$('#modal');
    modal.hidden = false; A.ui.modal = 'codex';
    modal.innerHTML = `<div class="codex"><button class="x" data-close>✕</button><h2>📖 직원 도감 <small style="font:14px var(--body);font-weight:800;color:var(--ink2)">${Object.keys(w.dex).length} / 36 · 높은 단계는 키워서만 얻어요</small></h2>${rows}</div>`;
    const close = () => { modal.hidden = true; modal.innerHTML = ''; A.ui.modal = null; };
    modal.querySelector('[data-close]').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };
    A.snd.play('ui');
  };
})();
