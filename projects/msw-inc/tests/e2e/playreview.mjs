#!/usr/bin/env node
// 플레이 리뷰 — 실제 화면을 사람처럼 눌러 보며 첫 진입과 화면별 복잡도를 잰다.
//   pnpm --filter msw-inc build && pnpm --filter msw-inc playreview:ui
// ① 새 게임: 입사 컷 → 튜토리얼 → 퇴근 → 출근 리포트 → Day 2 결정(진화·채용·결재) 을 클릭·드래그로 밟고,
//    단계마다 걸린 실제 초(A.playSec, 입사 컷 뒤부터), 입력 수, 화면 밀도를 적는다. 월드 초(world)도 함께.
//    사람은 안내가 뜨면 바로 누른다고 본다(읽는 시간은 없다). 그래서 실제 사람보다 짧게 나온다.
// ② 시연 장면(?demo=)을 열어 후반 화면의 밀도를 잰다.
// 결과: notes/data/playreview-ui.json, 그림: notes/play-review/shots/
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { launch, sleep, ROOT } from "./cdp.mjs";

// PR_TAG=v13 이면 notes/data/playreview-ui-v13.json, 그림은 shots/v13/ (기준 측정을 덮지 않는다)
const TAG = process.env.PR_TAG || "";
const SHOTS = path.join(ROOT, "notes/play-review/shots", TAG);
const OUT = path.join(ROOT, `notes/data/playreview-ui${TAG ? "-" + TAG : ""}.json`);
const rel = f => (TAG ? TAG + "/" + f : f);
await mkdir(SHOTS, { recursive: true });

// 화면 밀도: 보이는 것만 센다 (무대 1280×720 안, 크기 > 0, 숨김 아님)
const MEASURE = `(() => {
  const { A, M, T } = window.__msw;
  const vis = e => { if (!e || e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < 720 && r.left < 1280; };
  const q = s => [...document.querySelectorAll(s)].filter(vis);
  const CLICK = 'button, [data-go], [data-hire], [data-plot], [data-evt], [data-seat], [data-slotup], [data-stamp], [data-close], [data-promote], [data-ev], .plat .body, .evb, .gapb, .pill.busy, .tok, #oren, #docw, .mon';
  const txt = el => (el ? el.innerText : '').replace(/\\s+/g, ' ').trim();
  const stageTxt = txt(document.querySelector('#stage'));
  const layer = document.querySelector('#sheet:not([hidden])') || document.querySelector('#modal:not([hidden])') || document.querySelector('.report') || document.querySelector('.cut') || document.querySelector('.offduty');
  const layerTxt = layer ? txt(layer) : '';
  const nums = s => (s.match(/\\d[\\d,.]*/g) || []).length;
  return {
    clock: Math.round(A.playSec), world: Math.round(A.w.t * 60), step: T.st.done ? null : (T.cur() ? T.cur().id : null),
    oren: txt(document.querySelector('#orenTxt')),
    mode: A.ui.mode, sheet: A.ui.sheet, modal: A.ui.modal,
    clickables: q(CLICK).length,
    chars: stageTxt.replace(/\\s/g, '').length, numbers: nums(stageTxt),
    layer: layer ? { chars: layerTxt.replace(/\\s/g, '').length, numbers: nums(layerTxt), buttons: [...layer.querySelectorAll('button, [data-go], [data-hire], [data-promote], [data-stamp], [data-close]')].filter(vis).length, text: layerTxt.slice(0, 400) } : null,
    badges: { gap: q('.gapb').length, evolve: q('.evb').length, busy: q('.pill.busy').length, held: (() => { const c = document.querySelector('#evChip'); return c && !c.hidden ? +(c.querySelector('b') || {}).textContent || 0 : 0; })() },
    walkers: q('#walkers .wk').length, staff: q('#world .mon').length, plats: q('.plat').length,
    world: { happy: M.happyCount(A.w), smile: Math.round(A.w.smile), ch: A.w.chapter, gaps: M.gapSegments(A.w), dex: M.dexCount(A.w) },
  };
})()`;

const b = await launch({ port: 4371, cdpPort: 9271, profile: "/tmp/msw-inc-review" });
const m = () => b.eval(MEASURE);
const pump = s => b.eval(`window.__msw.pump(${s})`);
const flow = [];
let inputs = 0;
const shotName = (i, id) => `f${String(i).padStart(2, "0")}-${id}.webp`;
// 보고서에 싣는 그림이라 webp로 굽는다 (PNG의 약 1/5)
async function shot(file) { const r = await b.send("Page.captureScreenshot", { format: "webp", quality: 82 }); await writeFile(path.join(SHOTS, file), Buffer.from(r.data, "base64")); }
async function mark(id, label, extra = {}) {
  const s = await m();
  await sleep(320); // 튜토리얼 스팟 이동(0.3초)이 끝난 뒤에 굽는다 — 시각(clock)은 그 전에 잰다
  const file = shotName(flow.length, id);
  await shot(file);
  flow.push({ id, label, inputs, shot: rel(file), ...s, ...extra });
  console.log(`✓ ${String(s.clock).padStart(4)}s  입력 ${String(inputs).padStart(2)}  클릭 가능 ${String(s.clickables).padStart(3)}  글자 ${String(s.chars).padStart(4)}  ${label}`);
}
const click = async sel => { await b.click(sel); inputs++; await sleep(220); };
async function drag(fromSel, toSel) {
  const from = await b.center(fromSel);
  await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0], y: from[1] });
  await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: from[0], y: from[1], button: "left", clickCount: 1 });
  await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + 20, y: from[1] - 20, button: "left", buttons: 1 });
  await sleep(100);
  const to = await b.center(toSel);
  for (let i = 1; i <= 10; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + (to[0] - from[0]) * i / 10, y: from[1] + (to[1] - from[1]) * i / 10, button: "left", buttons: 1 }); await sleep(16); }
  return async () => { await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to[0], y: to[1], button: "left", clickCount: 1 }); inputs++; await sleep(300); };
}
const st = () => b.eval("(() => { const {A,M,T} = window.__msw; return { step: T.cur() && T.cur().id, done: T.st.done, sheet: A.ui.sheet, modal: A.ui.modal } })()");
async function until(cond, label, maxSec = 400) {
  for (let i = 0; i < maxSec; i += 1) { const s = await st(); if (cond(s)) return s; await pump(1); }
  throw new Error("timeout: " + label);
}

const scenes = [];
try {
  // ── ① 새 게임, 첫 진입 ──
  await b.goto("");
  await mark("intro", "입사 컷 — 머쉬맘·오렌 두 줄, 버튼 하나");
  await click(".cut [data-go]"); await sleep(500);
  await pump(1);
  await mark("arrive", "첫 출근 — 모험가 입장");
  await until(s => s.step === "watch", "watch");
  await mark("watch", "오렌: 들판 발판을 눌러 구경해요");
  await click('.plat[data-plat="h1"] .body');
  await pump(6);
  await mark("dungeon", "던전 현장 — 레벨업 빛기둥");
  await until(s => s.step === "back", "back");
  await click("#dBack");
  await mark("world-grow", "월드 길 — 레벨 = 가로 위치 설명 3줄 순환");
  await until(s => s.step === "gap", "gap");
  await pump(1);
  await mark("gap", "첫 빈틈 — 빨간 ! 배지");
  await click(".gapb");
  await mark("hire", "채용 시트 — 입사 선물 채용권");
  await click('[data-hire="mush"]');
  await mark("tray", "대기실에 주황버섯 — 끌어 놓기 안내");
  const release = await drag("#tray .tok[data-mon]", '[data-plot="h2"]');
  await mark("drag", "드래그 중 — 결과 카드·유령 발판");
  await release();
  await pump(2);
  await mark("placed", "사냥터 개업 — 빈틈 해소");
  // v1.3.1: Lv 14–15는 채용으로 안 닿는다 → 고참 달팽이 승진 발령 한 번에 버섯 언덕을 열어 잇는다. 이벤트는 그 뒤
  await until(s => s.step === "vetwait", "vetwait");
  await mark("fixed", "뚫렸다!! — Lv 14–15는 채용으로 안 닿는다");
  await until(s => s.step === "promote", "promote", 60);
  await pump(1);
  await mark("evolve-badge", "보라 ▲ — 고참 달팽이 진화 가능");
  await click(".evb");
  await mark("promote-sheet", "진화 시트 — [▲ 승진 발령] 개업권으로 버섯 언덕");
  await click("#sheet [data-promote]"); await sleep(1500);
  await mark("promote-cut", "승진 발령 컷 — 파란 달팽이, 버섯 언덕 개업 · Lv 1–15 이어짐");
  await click("#modal"); await sleep(200);
  await until(s => s.step === "event", "event", 30);
  await mark("road", "길이 다 이어졌다 — 오렌이 이벤트를 권한다");
  await click('.plat[data-plat="h1"] .body');
  await click('[data-evt="exp"]');
  await mark("event", "경험치 2배 (첫 번 무료)");
  await click("#dBack");
  await until(s => s.step === "doc", "doc", 60);
  await mark("doc-hint", "오렌: 1장 결재 서류가 왔어요");
  await click("#docw");
  await mark("approval", "결재 서류 — 조건 ①② 막대");
  await click("#modal [data-close]");
  // ── v1.3 첫 10분 한 바퀴 ──
  await until(s => s.step === "elite", "elite", 30);
  await pump(1);
  await mark("elite", "엘리트 첫 출현 — 결재 막대 ×2");
  await until(s => s.step === "joy", "joy", 30);
  await mark("joy", "Lv 1–15 이어짐 — 결재 막대가 차기를 기다린다");
  await until(s => s.step === "stamp", "stamp", 200);
  await mark("stamp-ready", "결재 서류 도착 — 도장 받기");
  await click("#docw");
  await mark("approval-ready", "결재함 — 조건 두 개 ✓, 결재 받기");
  await click("[data-stamp]"); await sleep(1600);
  await mark("chapter-cut", "챕터 컷 — 2장 엘리니아, 필드 보스 예고");
  await click(".cut [data-go]"); await sleep(300);
  await until(s => s.step === "newRegion", "newRegion", 20);
  await click("#bHire");
  await mark("hire-slime", "채용 시트 — 슬라임 채용권");
  await click('[data-hire="slime"]');
  const rel2 = await drag("#tray .tok[data-mon]", '[data-plot="e1"]');
  await mark("drag-slime", "슬라임을 엘리니아로 — 개업권 사용");
  await rel2();
  await pump(1);
  await until(s => s.step === "bossTease", "bossTease", 30);
  await pump(1);
  await mark("boss-tease", "오렌: 막대 가운데 눈금에서 필드 보스가 온다");
  await until(s => s.done, "tutorial done", 60);
  await mark("tut-done", "튜토리얼 끝 — 2장에서 퇴근");
  // 퇴근 → 다음 날 아침 (10시간)
  await click("#bOff"); await sleep(200);
  if (!(await b.eval("!!document.querySelector('.offduty')"))) { await click("#bOff"); await sleep(200); }
  await sleep(1400);
  await mark("offduty", "퇴근 컷 — 사무실 소등");
  await b.eval("(() => { const el = document.querySelector('.offduty'); if (el) el.remove(); window.__msw.A.ui.off = false; window.__msw.A.catchUp(600); })()");
  await sleep(2600);
  await mark("report", "Day 2 출근 리포트 — 도장·세 숫자·명장면·할 일");
  const chips = await b.eval("[...document.querySelectorAll('.report [data-go]')].map(e => e.innerText.replace(/\\s+/g,' ').trim())");
  await click('.report [data-go="world"]');
  await pump(1);
  await mark("day2-world", "Day 2 월드 — 배지가 쌓여 있다", { chips });
  // Day 2의 핵심 결정: ▲ 진화 (승진 발령이 권해지는지)
  const hasEv = await b.eval("!!document.querySelector('.evb')");
  if (hasEv) {
    await click(".evb");
    await mark("day2-evolve", "Day 2 진화 시트 — 승진 발령 / 그냥 진화 / 보류");
    await b.eval("document.querySelector('#sheet [data-close], #sheet .x') ? document.querySelector('#sheet [data-close], #sheet .x').click() : null");
    await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await sleep(200);
  }
  await click("#bHire");
  await mark("day2-hire", "Day 2 채용 시트 — 추천 리본");
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await sleep(200);
  await click("#docw");
  await mark("day2-approval", "Day 2 결재함 — '지금 속도면 약 N일'");
  await click("#modal [data-close]");
  if (b.errors.length) console.log("콘솔 오류:", b.errors.join(" | "));

  // ── ② 시연 장면: 후반 화면 밀도 ──
  const DEMOS = [["gap", "1장 첫 빈틈"], ["hire", "채용 시트"], ["dungeon", "던전 현장"], ["evolve", "진화 시트"], ["report", "출근 리포트"], ["approval", "결재함"], ["ch2", "2장 엘리니아"], ["promote", "3장 승진 발령"], ["grow", "키워서 잇기"], ["elite", "엘리트 출현"], ["bossinv", "필드 보스 초대"], ["boss", "필드 보스 방문"], ["late", "4장 후반 월드"], ["ch5", "5장 슬리피우드"], ["codex", "도감"], ["ending", "엔딩"], ["fullclear", "완전 클리어"]];
  for (const [id, label] of DEMOS) {
    b.errors.length = 0;
    await b.goto("?demo=" + id);
    await sleep(id === "ending" ? 2200 : 1400);
    const s = await m();
    const file = `d-${id}.webp`;
    await shot(file);
    scenes.push({ id, label, shot: rel(file), errors: [...b.errors], ...s });
    console.log(`◇ ${id.padEnd(10)} 클릭 가능 ${String(s.clickables).padStart(3)}  글자 ${String(s.chars).padStart(4)}  숫자 ${String(s.numbers).padStart(3)}  배지 ${JSON.stringify(s.badges)}  발판 ${s.plats}  모험가 ${s.walkers}`);
  }
} catch (e) {
  console.error("✕", e.message);
  await shot("fail.webp");
  process.exitCode = 1;
} finally {
  await writeFile(OUT, JSON.stringify({ generated: "pnpm --filter msw-inc playreview:ui", flow, scenes }, null, 1));
  console.log("→", OUT);
  await b.close();
}
