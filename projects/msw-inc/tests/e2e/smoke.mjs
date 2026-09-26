#!/usr/bin/env node
// 스모크 — 새 게임에서 입사 첫 10분 튜토리얼을 실제 클릭·드래그로 끝까지 밟는다.
//   pnpm --filter msw-inc smoke   (먼저 pnpm --filter msw-inc build)
// 시간은 페이지의 __msw.pump(초)로 결정적으로 흘린다(프레임 루프를 동기로 돌린다).
import path from "node:path";
import { launch, sleep, ROOT } from "./cdp.mjs";

const out = path.join(ROOT, "assets/screenshots/smoke");
const b = await launch({ port: 4361, cdpPort: 9261, profile: "/tmp/msw-inc-smoke" });
const log = [];
const step = async (name, fn) => { await fn(); log.push("✓ " + name); console.log("✓", name); };
const st = () => b.eval("(() => { const {A,M,T} = window.__msw; return { step: T.cur() && T.cur().id, done: T.st.done, mode: A.ui.mode, sheet: A.ui.sheet, modal: A.ui.modal, happy: M.happyCount(A.w), mons: A.w.monsters.map(m => [m.sp, m.stage, m.d]), gaps: M.gapSegments(A.w), t: A.w.t } })()");
const pump = s => b.eval(`window.__msw.pump(${s})`);
const until = async (cond, label, maxSec = 400) => {
  for (let i = 0; i < maxSec; i += 5) { const s = await st(); if (cond(s)) return s; await pump(5); }
  throw new Error("timeout: " + label + " " + JSON.stringify(await st()));
};
try {
  await b.goto("");
  await step("입사 컷 → 첫 출근 도장", async () => { await b.click(".cut [data-go]"); await sleep(500); });
  await until(s => s.step === "watch", "모험가 입장");
  await step("들판 발판을 눌러 현장 구경", async () => { await b.click('.plat[data-plat="h1"] .body'); await sleep(200); const s = await st(); if (s.mode !== "dungeon") throw new Error("현장 안 열림"); });
  await pump(15);
  await b.shot(path.join(out, "1-dungeon.png"));
  await until(s => s.step === "back", "레벨업 구경");
  await step("← 월드", async () => { await b.click("#dBack"); await sleep(200); });
  await until(s => s.step === "gap", "첫 빈틈");
  await pump(1);
  await b.shot(path.join(out, "2-gap.png"));
  await step("빨간 ! → 채용 시트", async () => { await b.click(".gapb"); await sleep(200); const s = await st(); if (s.sheet !== "hire") throw new Error("채용 시트 안 열림"); });
  await step("주황버섯 채용 (입사 선물)", async () => { await b.click('[data-hire="mush"]'); await sleep(300); });
  await step("대기실 토큰을 사냥터 부지로 끌어 놓기", async () => {
    const from = await b.center("#tray .tok[data-mon]");
    await b.eval("document.querySelector('#tray .tok[data-mon]').scrollIntoView()");
    // 끌기 시작하면 독의 부지 목록이 펼쳐진다 — 목적지는 펼친 뒤에 잰다
    await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0], y: from[1] });
    await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: from[0], y: from[1], button: "left", clickCount: 1 });
    await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + 20, y: from[1] - 20, button: "left", buttons: 1 });
    await sleep(100);
    const to = await b.center('[data-plot="h2"]');
    for (let i = 1; i <= 10; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + (to[0] - from[0]) * i / 10, y: from[1] + (to[1] - from[1]) * i / 10, button: "left", buttons: 1 }); await sleep(16); }
    await b.shot(path.join(out, "3-drag.png"));
    await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to[0], y: to[1], button: "left", clickCount: 1 });
    await sleep(300);
    const s = await st();
    if (!s.mons.some(m => m[0] === "mush" && m[2] === "h2")) throw new Error("배치 실패 " + JSON.stringify(s.mons));
  });
  await pump(3);
  await b.shot(path.join(out, "4-heal.png"));
  // v1.3.1: Lv 14–15는 고참 달팽이 승진 발령 한 번에 잇는다 (둘째 달팽이를 기다리지 않는다). 이벤트는 그 뒤
  await until(s => s.step === "promote", "고참 진화 대기", 60);
  await pump(1);
  await step("고참 달팽이 ▲ → [▲ 승진 발령] (개업권으로 버섯 언덕 → Lv 14–15)", async () => {
    const g = (await st()).gaps;
    if (JSON.stringify(g) !== "[[14,15]]") throw new Error("발령 전 빈틈이 Lv 14–15가 아니다 " + JSON.stringify(g));
    await b.click(".evb"); await sleep(250);
    const hasPromote = await b.eval("!!document.querySelector('#sheet [data-promote]')");
    if (!hasPromote) throw new Error("승진 발령 버튼이 없다");
    await b.shot(path.join(out, "5-promote.png"));
    await b.click("#sheet [data-promote]"); await sleep(1500);
    await b.shot(path.join(out, "6-flip.png"));
    await b.click("#modal"); await sleep(200);
    const s = await st();
    if (s.gaps.length) throw new Error("발령 뒤에도 빈틈 " + JSON.stringify(s.gaps));
  });
  await until(s => s.step === "event", "길 이은 뒤 이벤트", 30);
  await step("들판 → 경험치 2배 (첫 번 무료)", async () => { await b.click('.plat[data-plat="h1"] .body'); await sleep(200); await b.click('[data-evt="exp"]'); await sleep(200); await b.click("#dBack"); });
  await until(s => s.step === "doc", "결재 서류 안내", 60);
  await step("결재 서류 확인", async () => { await b.click("#docw"); await sleep(250); await b.shot(path.join(out, "7-doc.png")); await b.click("#modal [data-close]"); await sleep(200); });
  // v1.3 첫 10분 한 바퀴: 엘리트 → 결재 도장 → 새 지역 채용 → 보스 예고
  await until(s => s.step === "elite", "엘리트 출현", 30);
  await step("엘리트 출현 (대본 보장)", async () => { await pump(1); const e = await b.eval("!!window.__msw.A.w.elite"); if (!e) throw new Error("엘리트 없음"); await b.shot(path.join(out, "8-elite.png")); });
  await until(s => s.step === "stamp", "결재 막대 가득", 120);
  await step("결재 서류 → 결재 받기 → 챕터 컷 → 엘리니아", async () => {
    await b.click("#docw"); await sleep(250);
    await b.click("[data-stamp]"); await sleep(1600);
    await b.shot(path.join(out, "10-cut.png"));
    await b.click(".cut [data-go]"); await sleep(300);
    const ch = await b.eval("window.__msw.A.w.chapter");
    if (ch !== 2) throw new Error("2장이 아니다 " + ch);
  });
  await until(s => s.step === "newRegion", "새 지역 채용 안내", 20);
  await step("슬라임 채용권 → 대기실 → 엘리니아 빈 부지로 끌기 (개업권)", async () => {
    await b.click("#bHire"); await sleep(250);
    await b.click('[data-hire="slime"]'); await sleep(300);
    const from = await b.center("#tray .tok[data-mon]");
    await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0], y: from[1] });
    await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: from[0], y: from[1], button: "left", clickCount: 1 });
    await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + 20, y: from[1] - 20, button: "left", buttons: 1 });
    await sleep(100);
    const to = await b.center('[data-plot="e1"]');
    for (let i = 1; i <= 10; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + (to[0] - from[0]) * i / 10, y: from[1] + (to[1] - from[1]) * i / 10, button: "left", buttons: 1 }); await sleep(16); }
    await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to[0], y: to[1], button: "left", clickCount: 1 });
    await sleep(300);
    const s = await st();
    if (!s.mons.some(m => m[0] === "slime" && m[2] === "e1")) throw new Error("슬라임 배치 실패 " + JSON.stringify(s.mons));
    const t = await b.eval("window.__msw.A.w.tickets.plot");
    if (t !== 0) throw new Error("개업권이 남았다 " + t);
  });
  await until(s => s.step === "recruit", "모객 안내", 30);
  await step("📣 모객 → [신규 모객] (모객권으로 공짜, v1.7)", async () => {
    await b.click("#bRecruit"); await sleep(250);
    const sheet = (await st()).sheet;
    if (sheet !== "recruit") throw new Error("모객 시트 안 열림 " + sheet);
    await b.shot(path.join(out, "11a-recruit.png"));
    await b.click('[data-recruit="fresh"]'); await sleep(250);
    const r = await b.eval("(() => { const w = window.__msw.A.w; return { on: !!w.recruit && w.recruit.kind === 'fresh', t: w.tickets.recruit }; })()");
    if (!r.on) throw new Error("신규 모객이 안 걸렸다");
    if (r.t !== 0) throw new Error("모객권이 남았다 " + r.t);
  });
  await until(s => s.step === "bossTease", "필드 보스 예고", 30);
  await pump(1);
  await b.shot(path.join(out, "11-tease.png"));
  await until(s => s.done, "튜토리얼 끝", 60);
  await step("첫 세션은 10분 안에 결재 도장까지 끝난다", async () => {
    const real = await b.eval("window.__msw.A.playSec");
    console.log(`   첫 세션 ${Math.floor(real / 60)}:${String(Math.round(real % 60)).padStart(2, "0")} (실제 초, 입력 대기 제외 없이)`);
    if (real > 600) throw new Error("10분 넘음 " + real);
  });
  await step("퇴근 → 출근 (리포트)", async () => {
    // 밤새(약 10시간) 떠나 있다 돌아온다: 1.5초 × 배속 24,000 ≈ 600분
    await b.eval("window.__msw.A.speed = 24000");
    await b.click("#bOff"); await sleep(200);
    const blocked = await b.eval("!!document.querySelector('.offduty')");
    if (!blocked) { await b.click("#bOff"); await sleep(200); } // 입구 경고가 붙잡았으면 한 번 더
    await sleep(1500);
    await b.click(".offduty [data-in]"); await sleep(2500);
    await b.shot(path.join(out, "12-report.png"));
    const m = (await st()).modal;
    if (m !== "report") throw new Error("리포트 안 뜸 " + m);
    await b.click('.report [data-go="world"]'); await sleep(300);
  });
  await step("출근 뒤 오렌: 근속이 찬 직원을 두고 기다리라고 하지 않는다 (F4)", async () => {
    await pump(1);
    const r = await b.eval(`(() => { const {A,M} = window.__msw; const t = document.querySelector('#orenTxt').textContent;
      const ready = M.gapSegments(A.w).map(g => M.growingToward(A.w, g)).filter(m => m && M.canEvolve(m));
      return { t, bad: ready.length > 0 && t.includes('근속을 기다려요'), go: !!A.ui.orenGo, ready: ready.length }; })()`);
    if (r.bad) throw new Error("오렌이 진화 가능한 직원을 두고 기다리라고 한다: " + r.t);
    if (r.ready && !r.go) throw new Error("진화할 수 있는데 오렌을 눌러도 갈 곳이 없다: " + r.t);
    console.log("   오렌:", r.t);
  });
  await step("출근 뒤 📦 상자: 열어서 고르고, 5초 안에 되돌리고, 다시 연다 (v1.6)", async () => {
    await b.eval("window.__msw.A.speed = 1"); // 리포트 단계의 배속(24,000)이면 연 사이에 새 상자가 떨어진다
    await pump(1);
    const n0 = await b.eval("window.__msw.M.boxesOf(window.__msw.A.w).length");
    if (!n0) throw new Error("10시간 떠나 있었는데 상자가 없다");
    const tk = () => b.eval("(() => { const w = window.__msw.A.w; return { hire: w.tickets.hire.length, event: w.tickets.event, boxes: window.__msw.M.boxesOf(w).length }; })()");
    const t0 = await tk();
    await b.click("#world .pill.box"); await sleep(200);
    if (!(await b.eval("!!document.querySelector('.pop-box [data-pick].pri')"))) throw new Error("상자 말풍선에 오렌 추천이 없다");
    await b.shot(path.join(out, "12b-box.png"));
    await b.click(".pop-box [data-pick].pri"); await sleep(200);
    const t1 = await tk();
    if (t1.boxes !== t0.boxes - 1 || t1.hire + t1.event !== t0.hire + t0.event + 1) throw new Error("상자를 열었는데 권이 안 들어왔다 " + JSON.stringify([t0, t1]));
    await b.click("#toast button"); await sleep(200);
    const t2 = await tk();
    if (JSON.stringify(t2) !== JSON.stringify(t0)) throw new Error("되돌리기가 상자와 권을 돌려놓지 않았다 " + JSON.stringify([t0, t2]));
    await b.click("#world .pill.box"); await sleep(200);
    await b.click(".pop-box [data-pick]"); await sleep(200);
    console.log(`   상자 ${n0}개 · 연 뒤`, JSON.stringify(await tk()));
  });
  await step("도감 열고 닫기", async () => { await b.click("#bDex"); await sleep(200); await b.click("#modal [data-close]"); });
  await step("직원 말풍선 → 현장 보기", async () => { await b.eval("window.__msw.A.speed = 1"); await pump(1); await b.click("#world .mon"); await sleep(200); await b.click(".pop-mon [data-see]"); await sleep(200); await b.click("#dBack"); });
  await step("새로고침해도 세이브가 이어진다", async () => {
    const t0 = (await st()).t;
    await b.eval("window.dispatchEvent(new Event('pagehide'))");
    await b.goto("", { clear: false });
    const s = await st();
    if (!(s.t >= t0) || s.mons.length < 3) throw new Error("세이브 불러오기 실패 " + JSON.stringify(s));
  });
  await step("그냥 진화를 골라도: 오렌이 옮기기를 알려 주고, 파란 달팽이를 버섯 언덕으로 끌면 이어진다 (v1.3.1)", async () => {
    await b.goto("");
    await b.click(".cut [data-go]"); await sleep(400);
    for (let i = 0; i < 30 && (await b.eval("!!document.querySelector('.cut')")); i++) await sleep(100); // 입사 컷이 사라질 때까지
    await pump(1);
    await b.click("#tutSkip"); await sleep(200);
    if (!(await st()).done) throw new Error("튜토리얼 건너뛰기 실패");
    const vid = await b.eval(`(() => { const {A,M,pump} = window.__msw;
      for (let i = 0; i < 600 && !A.w.advs.some(a => a.st === 'search'); i++) pump(1);
      const h = M.hire(A.w, 'mush'); M.place(A.w, h.mon.id, 'h2');
      M.forceZone(A.w); // v1.4: 헤네시스 둘째 구간(Lv 11–15)
      const v = A.w.monsters.find(m => m.vet); v.tenure = M.evolveNeed(v); M.evolve(A.w, v.id); pump(1); return v.id; })()`);
    const t = await b.eval("document.querySelector('#orenTxt').textContent");
    if (!t.includes("옮기면")) throw new Error("오렌이 옮기기를 말하지 않는다: " + t);
    console.log("   오렌:", t);
    await b.click("#oren"); await sleep(200);
    const tg = await b.eval("[...document.querySelectorAll('#plots .plot.target')].map(e => e.dataset.plot)");
    if (!tg.includes("h3")) throw new Error("버섯 언덕이 빛나지 않는다 " + JSON.stringify(tg));
    await b.shot(path.join(out, "13-movefix.png"));
    const from = await b.center(`#world .mon[data-id="${vid}"]`);
    await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0], y: from[1] });
    await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: from[0], y: from[1], button: "left", clickCount: 1 });
    await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + 20, y: from[1] - 20, button: "left", buttons: 1 });
    await sleep(100);
    const to = await b.center('[data-plot="h3"]');
    for (let i = 1; i <= 10; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + (to[0] - from[0]) * i / 10, y: from[1] + (to[1] - from[1]) * i / 10, button: "left", buttons: 1 }); await sleep(16); }
    await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to[0], y: to[1], button: "left", clickCount: 1 });
    await sleep(300);
    const s = await st();
    if (s.gaps.length) throw new Error("옮긴 뒤에도 빈틈 " + JSON.stringify(s.gaps) + " " + JSON.stringify(s.mons));
  });
  if (b.errors.length) throw new Error("콘솔 오류: " + b.errors.join(" | "));
  console.log(`\n스모크 통과 (${log.length}단계)`);
} catch (e) {
  console.error("✕", e.message);
  await b.shot(path.join(out, "fail.png"));
  process.exitCode = 1;
} finally {
  await b.close();
}
