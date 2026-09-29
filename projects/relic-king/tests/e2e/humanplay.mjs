#!/usr/bin/env node
// 사람처럼 플레이하기 — 브라우저를 띄워 둔 채 한 수씩 명령을 받아 화면을 누르고 그림을 돌려준다.
// msw-inc의 humanplay.mjs(플레이 리뷰 10절)와 같은 절차를 유물왕에 옮긴 것이다.
//   pnpm --filter relic-king build && pnpm --filter relic-king humanplay   (포트 7071에서 명령을 기다린다)
//   curl 'localhost:7071/start'                  새 판을 연다 (세이브를 지우고)
//   curl 'localhost:7071/shot?n=vault'           화면 그림 + 화면에 보이는 글자
//   curl 'localhost:7071/click?text=집중 굴착'     보이는 글자로 누르기 (sel=CSS, x=&y= 좌표도 된다)
//   curl 'localhost:7071/scroll?y=600'           창을 y만큼 굴린다 (음수면 위로)
//   curl 'localhost:7071/wait?s=30'              실제 초만큼 지켜보기 (배속 없음)
//   curl 'localhost:7071/away?min=480'           탭을 닫고 min분 뒤 다시 열기 (세이브의 lastTickAt만 당긴다 — 실제 재접속과 같은 길)
//   curl 'localhost:7071/note?t=...'             소감 한 줄을 로그에 남기기
// 판단은 사람이(여기서는 리뷰어가) 그림과 보이는 글자만 보고 한다. 월드 내부 값은 로그에만 남기고 돌려주지 않는다.
// 가상 시계를 걸지 않는다(harness clock:false) — 게임 안 1초는 실제 1초다.
// 로그: notes/data/humanplay-<HP_TAG>.jsonl (기본 v071), 원본 그림: notes/play-review/shots/human/<HP_TAG>/ (커밋하지 않는다)
import path from "node:path";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { launch, ROOT, SAVE_KEY } from "./harness.mjs";

const TAG = process.env.HP_TAG || "v071";
const W = 1180, H = 900;
const SHOTS = path.join(ROOT, "notes/play-review/shots/human", TAG);
const LOG = path.join(ROOT, `notes/data/humanplay-${TAG}.jsonl`);
await mkdir(SHOTS, { recursive: true });
await mkdir(path.dirname(LOG), { recursive: true });

const h = await launch({ clock: false, width: W, height: H, port: 4341, cdpPort: 9241, profile: "/tmp/relic-king-human", outDir: SHOTS });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0, inputs = 0, t0 = Date.now(), awayMin = 0;

// 화면에 보이는 글자만 읽는다 (사람이 읽는 것과 같게). 위에 뜬 층(모달·토스트·배너)을 먼저, 그다음 창 안 본문
const VISIBLE = `(() => {
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const txt = e => (e ? e.innerText : '').replace(/\\s+/g, ' ').trim();
  const layer = [...document.querySelectorAll('.modal-back, .offline-toast, .ending, .tip-banner, .reveal, [role=alert], [role=status]')].filter(vis).map(txt).filter(Boolean).join(' ‖ ');
  const header = txt(document.querySelector('.header'));
  const tabs = [...document.querySelectorAll('.tabs button')].map(e => (e.classList.contains('active') || e.getAttribute('aria-selected') === 'true' ? '▶' : '') + txt(e)).join(' | ');
  const w = document.createTreeWalker(document.querySelector('.app') || document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set(); const parts = []; let node;
  while ((node = w.nextNode())) {
    const t = node.textContent.replace(/\\s+/g, ' ').trim(); if (!t) continue;
    const el = node.parentElement; if (!vis(el) || el.closest('.header') || el.closest('.modal-back')) continue;
    const r = el.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight) continue;
    if (seen.has(el)) continue; seen.add(el); parts.push(t);
  }
  const body = parts.join(' · ');
  const buttons = [...document.querySelectorAll('button')].filter(vis).filter(e => !e.disabled).map(txt).filter(Boolean).slice(0, 50);
  return { layer: layer.slice(0, 1500), header, tabs, body: body.slice(0, 3500), buttons, scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight };
})()`;

// 로그에만 남기는 내부 값 (보고서의 사실 확인·그래프용, 판단에 쓰지 않는다)
const HIDDEN = `(() => { const w = JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}) || 'null'); if (!w) return null;
  const codex = Object.values(w.codex || {}); const owned = codex.filter(s => s === 'owned' || s === 'owned_unidentified').length;
  return { t: Math.round(w.t), hours: +(w.t / 3600).toFixed(2), funds: Math.round(w.funds), owned, vault: (w.vault || []).length, pending: (w.pending || []).length,
    teams: (w.teams || w.expeditions || []).length, ended: !!w.ended, clicks: w.stats ? w.stats.clicks : null,
    uniques: (w.vault || []).filter(v => v.tier === 4).length }; })()`;

async function hidden() {
  try {
    await h.evaluate(`(() => { document.dispatchEvent(new Event('visibilitychange')); return true; })()`);
    await sleep(60);
    return await h.evaluate(HIDDEN);
  } catch { return null; }
}
async function shot(name) {
  const file = path.join(SHOTS, `${String(++n).padStart(3, "0")}-${name}.png`);
  const { data } = await h.cdp.send("Page.captureScreenshot", { format: "png" });
  await writeFile(file, Buffer.from(data, "base64"));
  return file;
}
async function log(cmd, extra = {}) {
  await appendFile(LOG, JSON.stringify({ realSec: Math.round((Date.now() - t0) / 1000), awayMin, inputs, cmd, hidden: await hidden(), ...extra }) + "\n");
}
async function textPoint(text, within) {
  return h.evaluate(`(() => {
    const want = ${JSON.stringify(text)};
    const root = ${within ? `document.querySelector(${JSON.stringify(within)})` : "document"};
    if (!root) return null;
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.top < innerHeight && r.left < innerWidth && r.bottom > 0; };
    const pick = sel => [...root.querySelectorAll(sel)].filter(vis).filter(e => e.innerText && e.innerText.replace(/\\s+/g, ' ').includes(want));
    let hit = pick('button, a, [role=button], [role=tab], summary, label, select');
    if (!hit.length) hit = pick('li, div, span, p, td, canvas');
    hit.sort((a, b) => a.innerText.length - b.innerText.length);
    const e = hit[0]; if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, e.innerText.replace(/\\s+/g, ' ').slice(0, 60)];
  })()`);
}
async function mouse(x, y) {
  await h.cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await h.cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await sleep(40);
  await h.cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

const server = createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const q = (k) => u.searchParams.get(k);
  const out = {};
  try {
    switch (u.pathname) {
      case "/start":
        await h.clearStorage();
        await h.goto("/"); await h.ready(); t0 = Date.now(); inputs = 0; awayMin = 0; await sleep(800);
        await log("start");
        break;
      case "/click": {
        let pt;
        if (q("x")) pt = [+q("x"), +q("y")];
        else if (q("sel")) pt = await h.evaluate(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(q("sel"))})].find(e => e.offsetParent !== null) ; if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
        else pt = await textPoint(q("text"), q("in"));
        if (!pt) throw new Error("화면에서 못 찾음: " + (q("sel") || q("text")));
        const times = +(q("times") || 1);
        for (let i = 0; i < times; i++) { await mouse(pt[0], pt[1]); inputs++; if (times > 1) await sleep(+(q("gap") || 120)); }
        out.at = pt; await sleep(+(q("after") || 500));
        await log("click", { what: q("text") || q("sel") || `${q("x")},${q("y")}`, times, note: q("note") });
        break;
      }
      case "/scroll":
        await h.evaluate(`window.scrollBy(0, ${+q("y")})`); await sleep(300);
        break;
      case "/top":
        await h.evaluate(`window.scrollTo(0, 0)`); await sleep(200);
        break;
      case "/wait": await sleep(+q("s") * 1000); await log("wait", { s: +q("s"), note: q("note") }); break;
      case "/away": {
        // 탭을 닫고(빈 페이지로), 세이브의 lastTickAt을 min분 당긴 뒤 다시 연다 — useGame.ts의 첫 마운트 정산 길 그대로
        const min = +q("min");
        await h.cdp.send("Page.navigate", { url: h.base + "/__blank" }); await sleep(500);
        await h.evaluate(`(() => { const k = ${JSON.stringify(SAVE_KEY)}; const s = JSON.parse(localStorage.getItem(k)); s.lastTickAt -= ${min} * 60000; localStorage.setItem(k, JSON.stringify(s)); return true; })()`);
        awayMin += min;
        await h.goto("/"); await h.ready(); await sleep(1500);
        await log("away", { min, note: q("note") });
        break;
      }
      case "/note": await log("note", { note: q("t") }); break;
      case "/state": out.hidden = await hidden(); break; // 리뷰 뒤 사실 확인에만 쓴다
      case "/quit": res.end("bye"); await h.close(); process.exit(0);
    }
    if (!["/note", "/state"].includes(u.pathname)) {
      out.shot = await shot(q("n") || u.pathname.slice(1));
      out.screen = await h.evaluate(VISIBLE);
      out.errors = h.consoleErrors().slice(-3);
      out.realSec = Math.round((Date.now() - t0) / 1000); out.inputs = inputs;
    }
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(out, null, 1));
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }); res.end(String(e.message));
  }
});
server.listen(7071, "127.0.0.1", () => console.log("humanplay: http://127.0.0.1:7071 (로그 " + LOG + ")"));
