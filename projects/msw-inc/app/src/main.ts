/*
 * MSW 주식회사 — 시작, 입사 컷, 매 프레임 루프, 버튼
 */
import './styles.css';
import { A, $, $$, must, h, img, snd, refit, refresh, renderDock, renderDoc, renderOren, renderBoss, hudTick, hudStatic, simLive, save, loadSave, clearSave, toast, plotName, heldEvolves, M } from './ui/app';
import './ui/world';
import './ui/dungeon';
import './ui/sheets';
import { T } from './ui/tut';
import { ART } from './ui/art';
import { runDemo } from './ui/demo';

const IDLE_MS = 10 * 60 * 1000; // 무입력 끊김 (플랫폼 값 확인 전 가정, 05 D4)

function newGame() {
  A.w = M.createWorld((Date.now() & 0xffffff) ^ 0x5eed);
  T.reset();
  A.checkin = { happy0: 0 };
  A.world.build();
}

// ── 입사 컷 (첫 출근) ───────────────────────────────────────
function intro() {
  A.ui.intro = true;
  const el = h(`<div class="cut intro"><div>
    <h1><small>MONSTER SMILE WORKS</small>MSW 주식회사</h1>
    <div class="lines">
      <div class="ln">${img('mom', 2)}신입 월드 매니저죠. 모험가들이 이 월드를 좋아하게 만들어요.</div>
      <div class="ln">${img('oren', 2)}매니저님!! 저는 비서 오렌이에요!! 간단하죠?!</div>
    </div>
    <button class="btn red big" data-go>첫 출근 도장 찍기</button>
    <div class="fine">몬스터가 직원인 회사의 월드 매니저 · 하루 몇 번, 몇 분이면 돼요 · 도트는 자리표시용</div>
  </div></div>`);
  must('#stage').appendChild(el);
  must('[data-go]', el).onclick = () => {
    snd.unlock(); snd.play('tak');
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).onfinish = () => el.remove();
    A.ui.intro = false;
    A.ui.lastInput = performance.now();
    refresh();
  };
}

function bind() {
  must('#bDex').onclick = () => A.openCodex();
  must('#bSound').onclick = () => { snd.on = !snd.on; hudStatic(); save(); };
  must('#bOff').onclick = () => A.offDuty('manual');
  $$<HTMLElement>('.proto [data-speed]').forEach(b => (b.onclick = () => { A.speed = +(b.dataset.speed || 1); hudStatic(); toast(`배속 ×${A.speed} (테스트 도구)`); }));
  must('#bSkip').onclick = () => { if (A.ui.modal || A.ui.off) return; A.closeSheet(); if (A.ui.mode === 'dungeon') A.closeDungeon(); snd.play('tak'); A.catchUp(480); };
  let resetArm = 0;
  must('#bReset').onclick = () => {
    if (performance.now() - resetArm > 2500) { resetArm = performance.now(); toast('처음부터 다시 하려면 ↺를 한 번 더 누르세요', { bad: true }); return; }
    clearSave(); location.reload();
  };
  must('#bHire').onclick = () => A.openHire();
  must('#bossCard').onclick = () => { const b = A.w.boss; if (!b) return; if (!b.d) A.openBoss(); else A.openDungeon(b.d); };
  must('#evChip').onclick = () => { const m = heldEvolves(A.w)[0]; if (m) A.openEvolve(m.id); };
  must('#oren').onclick = () => { snd.play('ui'); if (A.ui.orenGo) A.ui.orenGo(); };
  must('#docw').onclick = () => A.openApproval();
  must('#tutSkip').onclick = e => { e.stopPropagation(); T.skip(); toast('튜토리얼을 건너뛰었어요'); };
  must('#plots').addEventListener('click', e => {
    const p = (e.target as Element).closest('[data-plot]') as HTMLElement | null;
    if (p) { const id = p.dataset.plot!; toast(`직원을 끌어다 “${plotName(id)}”에 놓으면 ${A.w.plots[id].open ? '던전이 열려요' : '개업해요'}`); }
  });
  must('#tray').addEventListener('click', e => {
    if ((e.target as Element).closest('.tok.more')) toast(`대기실 ${M.tray(A.w).length}명 · 앞의 넷부터 보여요. 끌어서 놓거나 눌러서 본사로 보낼 수 있어요`);
  });
  window.addEventListener('keydown', e => {
    A.ui.lastInput = performance.now();
    if (e.key === 'Escape') {
      if (document.querySelector('.pop-mon')) $$('.pop-mon').forEach(x => x.remove());
      else if (A.ui.sheet) A.closeSheet();
      else if (A.ui.modal === 'codex' || A.ui.modal === 'approval' || A.ui.modal === 'fullclear') { const m = must('#modal'); m.hidden = true; m.innerHTML = ''; A.ui.modal = null; }
      else if (A.ui.mode === 'dungeon' && !A.ui.modal) A.closeDungeon();
    }
  });
  window.addEventListener('resize', refit);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
  A.world.bindInput();
  A.dv.bind();
  must<HTMLImageElement>('#orenImg').src = ART.url('oren', 3);
}

// ── 루프 ────────────────────────────────────────────────────
let last = performance.now(), slow = 0, saveT = 0;
function tick(dt: number, now: number) {
  if (A.ui.intro) return;
  if (!A.ui.off) A.playSec += dt;
  simLive(dt);
  A.world.tick(dt, now);
  A.dv.tick(dt, now);
  hudTick(dt);
  T.tick(dt);
  slow -= dt;
  if (slow <= 0) { slow = 0.5; renderOren(); renderDoc(); renderBoss(); if (!A.world.drag || !A.world.drag.started) renderDock(); }
  saveT -= dt;
  if (saveT <= 0) { saveT = 5; save(); }
  if (!A.ui.off && !A.ui.modal && !A.demo && now - A.ui.lastInput > IDLE_MS) A.offDuty('idle');
}
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!A.frozen) tick(dt, now);
  requestAnimationFrame(frame);
}
/** 테스트용: 화면이 가려져 프레임이 멈춘 환경에서도 sec초만큼 동기로 굴린다 */
function pump(sec: number) { let now = performance.now(); for (let t = 0; t < sec; t += 1 / 30) { now += 1000 / 30; tick(1 / 30, now); } A.ui.lastInput = performance.now(); }

// ── 시작 ────────────────────────────────────────────────────
refit();
bind();
const q = new URLSearchParams(location.search);
// 테스트 도구(배속·⏭8h·↺)는 ?dev를 붙여야만 보인다. 실제 게임에는 없다
if (q.get('dev') == null) must('.proto').hidden = true;
const demo = q.get('demo');
if (demo) {
  A.demo = demo;
  document.documentElement.classList.add('demo');
  runDemo(demo, { newGame, intro });
} else {
  const s = loadSave();
  if (s) s.w = M.migrate(s.w);
  if (s && M.isWorld(s.w)) {
    A.w = s.w;
    if (s.tut) T.load(s.tut as typeof T.st);
    A.checkin = s.checkin || { happy0: 0 };
    if (s.sound === false) snd.on = false;
    A.world.build();
    refresh();
    const away = (Date.now() - s.savedAt) / 60000;
    // 서버 시간 모델: 잠깐 새로고침해도 흐른 시간만큼 굴린다. 2분 넘게 떠나 있었으면 리포트
    if (away >= 2) { if (away > M.OFFLINE_CAP) A.ui.longAway = true; A.catchUp(away); }
    else if (away > 0.01) M.step(A.w, away);
  } else {
    newGame();
    refresh();
    intro();
  }
}
(window as unknown as { __msw: unknown }).__msw = { A, M, pump, T };
$('#boot')?.remove();
requestAnimationFrame(frame);
