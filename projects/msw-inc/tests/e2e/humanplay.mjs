#!/usr/bin/env node
// 사람처럼 플레이하기 — 브라우저를 띄워 둔 채 한 수씩 명령을 받아 화면을 누르고 그림을 돌려준다.
//   pnpm --filter msw-inc build && node tests/e2e/humanplay.mjs            (포트 7070에서 명령을 기다린다)
//   curl 'localhost:7070/shot?n=report'          화면 그림 + 화면에 보이는 글자
//   curl 'localhost:7070/click?text=승진 발령'     보이는 글자로 누르기 (sel=CSS, x=&y= 좌표도 된다)
//   curl 'localhost:7070/drag?from=<sel>&to=<sel>' 끌어 놓기 (fx,fy,tx,ty 좌표도 된다)
//   curl 'localhost:7070/wait?s=30'               실제 초만큼 지켜보기 (배속 없음)
//   curl 'localhost:7070/away?min=480'            탭을 닫고 min분 뒤 다시 열기 (세이브 시각만 당긴다 — 실제 재접속과 같은 길)
//   curl 'localhost:7070/hold?fx=38&fy=700&tx=495&ty=612'  끄는 도중 멈춰 그림 보기 → /move?tx=&ty= → /release
//   curl 'localhost:7070/place'                대기실 직원을 초록으로 빛나는 부지에 놓기 (끄는 중 결과 카드를 돌려준다)
//   curl 'localhost:7070/note?t=...'           소감 한 줄을 로그에 남기기
// 판단은 사람이(여기서는 리뷰어가) 그림과 보이는 글자만 보고 한다. 월드 내부 값은 로그에만 남기고 돌려주지 않는다.
// 로그: notes/data/humanplay-<HP_TAG>.jsonl (기본 v114), 원본 그림: notes/play-review/shots/human/<HP_TAG>/ — 보고서 그림은 골라서 shots/v114h/에 webp로 둔다
import path from "node:path";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { launch, sleep, ROOT } from "./cdp.mjs";

const TAG = process.env.HP_TAG || "v114";
const SHOTS = path.join(ROOT, "notes/play-review/shots/human", TAG); // 원본 그림 (커밋하지 않는다, .gitignore)
const LOG = path.join(ROOT, `notes/data/humanplay-${TAG}.jsonl`);
await mkdir(SHOTS, { recursive: true });

const b = await launch({ port: 4391, cdpPort: 9291, profile: "/tmp/msw-inc-human" });
let n = 0, inputs = 0, t0 = Date.now(), awayMin = 0, held = null;

// 화면에 보이는 글자만 읽는다 (사람이 읽는 것과 같게)
const VISIBLE = `(() => {
  const vis = e => { if (!e || e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < 720 && r.left < 1280; };
  const txt = e => (e ? e.innerText : '').replace(/\\s+/g, ' ').trim();
  const layer = [...document.querySelectorAll('#sheet, #modal, .report, .cut, .offduty')].filter(vis).map(txt).join(' ‖ ');
  const oren = txt(document.querySelector('#orenTxt'));
  const toasts = [...document.querySelectorAll('.toast, #toasts > *')].filter(vis).map(txt).join(' | ');
  const hud = txt(document.querySelector('#hud'));
  const dock = txt(document.querySelector('#dock'));
  const buttons = [...document.querySelectorAll('button, [data-go], .gapb, .evb, .pill.busy, .tok')].filter(vis).map(e => txt(e) || e.className).filter(Boolean).slice(0, 40);
  return { oren, toasts, hud, dock, layer: layer.slice(0, 900), buttons };
})()`;
// 로그에만 남기는 내부 값 (보고서의 사실 확인용, 판단에 쓰지 않는다)
const HIDDEN = `(() => { const { A, M, T } = window.__msw; const w = A.w; return { worldMin: Math.round(w.t), day: +(w.t / 1440).toFixed(2), ch: w.chapter, happy: M.happyCount(w), smile: Math.round(w.smile), dex: M.dexCount(w), gaps: M.gapSegments(w).length, tut: T.st.done ? 'done' : (T.cur() ? T.cur().id : null), ended: !!w.endedAt, cleared: !!w.clearedAt }; })()`;

async function shot(name) {
  const file = `${String(++n).padStart(3, "0")}-${name}.jpg`;
  const r = await b.send("Page.captureScreenshot", { format: "jpeg", quality: 72 });
  await writeFile(path.join(SHOTS, file), Buffer.from(r.data, "base64"));
  return path.join(SHOTS, file);
}
async function log(cmd, extra = {}) {
  let hidden = null; try { hidden = await b.eval(HIDDEN); } catch {}
  await appendFile(LOG, JSON.stringify({ realSec: Math.round((Date.now() - t0) / 1000), awayMin, inputs, cmd, hidden, ...extra }) + "\n");
}
async function textPoint(text) {
  return b.eval(`(() => {
    const want = ${JSON.stringify(text)};
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return !e.closest('[hidden]') && r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.top < 720 && r.left < 1280 && r.bottom > 0; };
    const all = [...document.querySelectorAll('button, [data-go], [data-hire], [data-promote], [data-stamp], [data-close], [data-evt], [data-recruit], [data-seat], [data-pick], a, .chip, .card, [role=button], div, span')].filter(vis);
    const hit = all.filter(e => e.innerText && e.innerText.replace(/\\s+/g, ' ').includes(want));
    hit.sort((a, b) => a.innerText.length - b.innerText.length);
    const e = hit[0]; if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, e.innerText.replace(/\\s+/g, ' ').slice(0, 60)];
  })()`);
}

const server = createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const q = k => u.searchParams.get(k);
  const out = {};
  try {
    switch (u.pathname) {
      case "/start": await b.goto(q("q") || ""); t0 = Date.now(); await sleep(800); break;
      case "/click": {
        let pt;
        if (q("x")) pt = [+q("x"), +q("y")];
        else if (q("sel")) pt = await b.center(q("sel"));
        else pt = await textPoint(q("text"));
        if (!pt) throw new Error("화면에서 못 찾음: " + (q("sel") || q("text")));
        await b.mouse(pt[0], pt[1]); inputs++; out.at = pt; await sleep(+(q("after") || 500));
        await log("click", { what: q("text") || q("sel") || `${q("x")},${q("y")}`, note: q("note") });
        break;
      }
      case "/drag": {
        const from = q("from") ? await b.center(q("from")) : [+q("fx"), +q("fy")];
        const to = q("to") ? await b.center(q("to")) : [+q("tx"), +q("ty")];
        if (!from || !to) throw new Error("끌 곳을 못 찾음");
        await b.drag(from, to); inputs++; await sleep(600);
        await log("drag", { from: q("from") || from, to: q("to") || to, note: q("note") });
        break;
      }
      // 끄는 도중을 보려면: /hold(집어서 옮긴 채 멈춤) → 그림 확인 → /move → /release. 사람이 끌면서 초록 칸과 결과 카드를 읽는 것과 같다
      case "/hold": {
        const from = q("from") ? await b.center(q("from")) : [+q("fx"), +q("fy")];
        if (!from) throw new Error("집을 것을 못 찾음");
        const tx = +q("tx"), ty = +q("ty");
        await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0], y: from[1] });
        await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: from[0], y: from[1], button: "left", clickCount: 1 });
        for (let i = 1; i <= 12; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + (tx - from[0]) * i / 12, y: from[1] + (ty - from[1]) * i / 12, button: "left", buttons: 1 }); await sleep(20); }
        await sleep(300); held = [tx, ty];
        break;
      }
      case "/move": held = [+q("tx"), +q("ty")]; await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: held[0], y: held[1], button: "left", buttons: 1 }); await sleep(300); break;
      case "/release": {
        const [x, y] = q("tx") ? [+q("tx"), +q("ty")] : held;
        await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); inputs++; held = null; await sleep(600);
        await log("drag", { to: [x, y], note: q("note") });
        break;
      }
      // 대기실 토큰을 집어 초록으로 빛나는 부지(.plot.target)에 놓는다. 끄는 중 결과 카드 글자를 돌려준다
      case "/place": {
        const from = await b.center("#tray .tok[data-mon]");
        if (!from) throw new Error("대기실이 비었다");
        await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0], y: from[1] });
        await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: from[0], y: from[1], button: "left", clickCount: 1 });
        for (let i = 1; i <= 6; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + 40 * i, y: from[1] - 10 * i, button: "left", buttons: 1 }); await sleep(20); }
        await sleep(250);
        const to = (q("plot") && await b.center(`.plot[data-plot="${q("plot")}"]`)) || await b.center(".plot.target");
        if (!to) { await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: from[0], y: from[1], button: "left", clickCount: 1 }); throw new Error("초록 칸 없음"); }
        for (let i = 1; i <= 8; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from[0] + 240 + (to[0] - from[0] - 240) * i / 8, y: from[1] - 60 + (to[1] - from[1] + 60) * i / 8, button: "left", buttons: 1 }); await sleep(20); }
        await sleep(300);
        out.card = await b.eval(`(() => { const e = [...document.querySelectorAll('[class*=card]')].find(x => x.offsetParent && /→/.test(x.innerText)); return e ? e.innerText.replace(/\\s+/g, ' ') : null })()`);
        await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to[0], y: to[1], button: "left", clickCount: 1 }); inputs++; await sleep(600);
        await log("place", { card: out.card, note: q("note") });
        break;
      }
      case "/key": await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: q("k"), code: q("k") }); await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: q("k"), code: q("k") }); inputs++; await sleep(300); break;
      case "/wait": await sleep(+q("s") * 1000); await log("wait", { s: +q("s"), note: q("note") }); break;
      case "/away": {
        // 탭을 닫고(빈 페이지로), 세이브 시각을 min분 당긴 뒤 다시 연다 — main.ts의 재접속 길 그대로
        const min = +q("min");
        await b.send("Page.navigate", { url: "http://127.0.0.1:4391/__blank" }); await sleep(400);
        await b.eval(`(() => { const s = JSON.parse(localStorage.getItem('msw-inc-v2')); s.savedAt -= ${min} * 60000; localStorage.setItem('msw-inc-v2', JSON.stringify(s)); })()`);
        awayMin += min;
        await b.goto("", { clear: false }); await sleep(2500);
        await log("away", { min, note: q("note") });
        break;
      }
      case "/note": await log("note", { note: q("t") }); break;
      case "/state": out.hidden = await b.eval(HIDDEN); break; // 리뷰 뒤 사실 확인에만 쓴다
      case "/quit": res.end("bye"); await b.close(); process.exit(0);
    }
    if (u.pathname !== "/note" && u.pathname !== "/state") {
      out.shot = await shot(q("n") || u.pathname.slice(1));
      out.screen = await b.eval(VISIBLE);
      out.errors = b.errors.splice(0);
      out.realSec = Math.round((Date.now() - t0) / 1000); out.inputs = inputs;
    }
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(out, null, 1));
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }); res.end(String(e.message));
  }
});
server.listen(7070, "127.0.0.1", () => console.log("humanplay: http://127.0.0.1:7070 (로그 " + LOG + ")"));
