#!/usr/bin/env node
// 실시간 스모크 테스트 + 스크린샷.
//
//   node tests/e2e/smoke.mjs [--seconds 20] [--out assets/screenshots]
//
// 레포 공용 playtest 하니스는 puppeteer 가 크롬을 내려받는데 이 환경은 외부
// 네트워크가 막혀 있다. 그래서 미리 깔린 크로미움을 CDP 로 직접 몬다.
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIST = path.join(ROOT, "app/dist");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 4322;
const CDP_PORT = 9223;

const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i > -1 ? args[i + 1] : d;
};
const SECONDS = Number(arg("--seconds", 20));
const OUT = path.resolve(ROOT, arg("--out", "assets/screenshots"));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

function serve() {
  const server = createServer(async (req, res) => {
    const url = (req.url || "/").split("?")[0];
    // 세이브를 되감는 동안 잠깐 머무를, 같은 오리진의 빈 문서
    if (url === "/__blank") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<!doctype html><title>blank</title>");
      return;
    }
    const file = path.join(DIST, url === "/" ? "index.html" : url);
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

async function waitFor(fn, timeout = 20000) {
  const started = Date.now();
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (Date.now() - started > timeout) throw err;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.waiting = new Map();
    this.events = [];
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.waiting.has(msg.id)) {
        const { resolve, reject } = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.waiting.set(id, { resolve, reject }));
  }
}

async function main() {
  // 프로필을 비워 매 실행이 새 플레이로 시작하게 한다(세이브가 남으면 오프라인 모달이 뜬다)
  await rm("/tmp/relic-king-profile", { recursive: true, force: true });
  const server = await serve();
  const chrome = spawn(CHROME, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    "--window-size=1180,1000", `--remote-debugging-port=${CDP_PORT}`,
    "--user-data-dir=/tmp/relic-king-profile", "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const failures = [];
  try {
    const target = await waitFor(async () => {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?http://127.0.0.1:${PORT}/`, { method: "PUT" });
      if (!res.ok) throw new Error(`cdp ${res.status}`);
      return res.json();
    });

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve);
      ws.addEventListener("error", reject);
    });
    const cdp = new Cdp(ws);
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("Log.enable");

    await mkdir(OUT, { recursive: true });
    const shots = [];
    const shoot = async (name, clip) => {
      const params = clip ? { format: "png", clip, captureBeyondViewport: true } : { format: "png" };
      const { data } = await cdp.send("Page.captureScreenshot", params);
      const file = path.join(OUT, `${name}.png`);
      await writeFile(file, Buffer.from(data, "base64"));
      shots.push(file);
    };

    const evaluate = async (expression) => {
      const res = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
      return res.result.value;
    };

    // 1) 첫 화면
    await new Promise((r) => setTimeout(r, 2500));
    await shoot("01-dig-start");
    const first = await evaluate(`document.querySelector('.app') ? document.body.innerText.slice(0, 200) : null`);
    if (!first) failures.push("앱이 렌더되지 않았다");

    // 2) 시간이 흐르면 진행된다 (방치만으로)
    const before = await evaluate(`window.__probe = () => {
      const t = document.body.innerText;
      return { funds: t.includes('자금'), text: t };
    }; document.querySelector('.stat-value').innerText`);
    await new Promise((r) => setTimeout(r, SECONDS * 1000));
    const after = await evaluate(`document.body.innerText`);
    if (!/소장고/.test(after)) failures.push("진행 신호를 찾지 못했다");
    // 드랍 여부는 텍스트 패턴이 아니라 저장된 world 상태(vault+pending)로 직접 확인한다 —
    // v0.2는 헤더에 "도감 X/Y" 같은 고정 문구를 더 이상 찍지 않는다(notes/ux-v02.md §1.1).
    const dropCount = await evaluate(`{
      const w = JSON.parse(localStorage.getItem('relic-king/save/v1') || 'null');
      w ? w.vault.length + w.pending.length : 0;
    }`);
    // 첫 드랍이 24초쯤이라 그보다 짧게 돌리면 0점이 정상이다
    if (SECONDS >= 35 && dropCount < 1) {
      failures.push(`${SECONDS}초 방치 후에도 유물이 0점이다`);
    }
    await shoot("02-dig-running");

    // 3) 탭 전환이 모두 뜬다(v0.2 5탭 — 발굴/소장고/시설/시장/도감)
    // 첫 감정 완료 후 20~40초 안에 "본거지를 정하자" 온보딩 오버레이가 자동으로 뜬다.
    // SECONDS 만큼 방치한 뒤라 이미 떠 있을 가능성이 높으므로, 탭을 누르기 전에
    // 먼저 닫아 둔다 — 안 그러면 아래 스크린샷들이 실제 화면이 아니라 오버레이만 찍힌다.
    await evaluate(`document.querySelector('.onboarding-keep')?.click()`);
    await new Promise((r) => setTimeout(r, 400));
    for (const [i, label] of ["소장고", "시설", "시장", "도감"].entries()) {
      // 탭을 옮기는 도중에도 온보딩이 뒤늦게 뜰 수 있어 매 클릭 전에 한 번 더 방어한다.
      await evaluate(`document.querySelector('.onboarding-keep')?.click()`);
      await new Promise((r) => setTimeout(r, 300));
      await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('${label}')).click()`);
      await new Promise((r) => setTimeout(r, 900));
      const body = await evaluate(`document.querySelector('.body').innerText.length`);
      if (body < 30) failures.push(`${label} 탭이 비어 있다`);
      await shoot(`0${3 + i}-${["vault", "facility", "market", "codex"][i]}`);
    }

    // 4) 클릭이 진척을 준다
    await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('발굴')).click()`);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate(`{
      const c = document.querySelector('.dig-canvas');
      for (let i = 0; i < 20; i++) c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      true;
    }`);
    await new Promise((r) => setTimeout(r, 600));

    // 5) 소장고: 미감정이 변해도 소장고 버튼이 제자리에 있는가
    //    미감정과 소장고를 한 열에 쌓아 두면 항목이 생기고 사라질 때마다 아래가 밀려
    //    겨냥한 버튼이 손가락 아래에서 움직인다. 열 분할 + 종류별 묶음으로 고쳤고,
    //    이 검사가 그 회귀를 잡는다.
    // 게임 페이지를 먼저 떠난다. beforeunload 가 현재 시각으로 세이브를 덮어쓰므로,
    // 세이브를 되감는 건 페이지를 떠난 **뒤여야** 한다. (되감기를 먼저 하면 덮어써진다 —
    // 이건 버그가 아니라 리로드로 오프라인 시간을 위조하지 못하게 막는 정상 동작이다.)
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/__blank` });
    await new Promise((r) => setTimeout(r, 1500));
    await evaluate(`{
      const k = 'relic-king/save/v1';
      const w = JSON.parse(localStorage.getItem(k));
      w.lastTickAt = Date.now() - 8 * 3600 * 1000;   // 8시간 자리 비우기
      localStorage.setItem(k, JSON.stringify(w));
      true;
    }`);
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
    await new Promise((r) => setTimeout(r, 6000));
    await evaluate(`document.querySelector('.modal button')?.click()`);
    await new Promise((r) => setTimeout(r, 1200));
    await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('소장고')).click()`);
    await new Promise((r) => setTimeout(r, 1200));
    await shoot("06-vault-full");

    const probe = `(() => {
      const b = [...document.querySelectorAll('.vault-grid .stack')];
      const r = (el) => { const x = el.getBoundingClientRect(); return [Math.round(x.x), Math.round(x.y)]; };
      return {
        pending: document.querySelectorAll('.pending-list li').length,
        stacks: b.length,
        first: b[0] ? r(b[0]).join(',') : null,
        last: b.length ? r(b[b.length - 1]).join(',') : null
      };
    })()`;
    const posA = await evaluate(probe);
    await new Promise((r) => setTimeout(r, 4500));
    const posB = await evaluate(probe);
    if (posA.stacks === 0) {
      failures.push("8시간 오프라인 후에도 소장고가 비어 있다");
    } else {
      if (posA.first !== posB.first) failures.push(`소장고 첫 칸이 움직였다: ${posA.first} → ${posB.first}`);
      if (posA.last !== posB.last) failures.push(`소장고 끝 칸이 움직였다: ${posA.last} → ${posB.last}`);
    }
    await evaluate(`document.querySelectorAll('.vault-grid .stack')[0]?.click()`);
    await new Promise((r) => setTimeout(r, 600));
    const detail = await evaluate(`document.querySelector('.detail')?.innerText ?? null`);
    if (!detail) failures.push("소장고 유물을 눌러도 상세가 열리지 않는다");
    await shoot("07-vault-detail");

    // 6) 조사: "이(가)" 같은 병기가 화면에 남아 있으면 안 된다
    // 활동 기록은 v0.2에서 도감 탭의 "원장" 서브탭으로 옮겨갔다(notes/ux-v02.md §1.6)
    await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('도감')).click()`);
    await new Promise((r) => setTimeout(r, 600));
    await evaluate(`[...document.querySelectorAll('.subtabs button')].find(b => b.innerText.trim().startsWith('원장')).click()`);
    await new Promise((r) => setTimeout(r, 800));
    const logText = await evaluate(`document.querySelector('.log-list')?.innerText ?? ''`);
    const badJosa = ["이(가)", "을(를)", "은(는)", "와(과)"].filter((j) => logText.includes(j));
    if (badJosa.length) failures.push(`조사 병기가 남아 있다: ${badJosa.join(" ")}`);
    if (!logText.trim()) failures.push("활동 기록이 비어 있다");

    // 7) 표지 이미지 (런처 카드용)
    await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('발굴')).click()`);
    await new Promise((r) => setTimeout(r, 800));
    await new Promise((r) => setTimeout(r, 1200));
    await shoot("cover", { x: 0, y: 0, width: 1180, height: 640, scale: 0.82 });

    // 8) 콘솔 오류
    const errors = cdp.events
      .filter((e) => e.method === "Runtime.exceptionThrown"
        || (e.method === "Log.entryAdded" && e.params.entry.level === "error")
        || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error"))
      .map((e) => JSON.stringify(e.params).slice(0, 300))
      .filter((text) => !text.includes("favicon.ico"));
    if (errors.length) failures.push(`콘솔 오류 ${errors.length}건:\n  ${errors.join("\n  ")}`);

    // 9) 모바일 375px 스크린샷 (notes/ux-v02.md 가 설계한 모바일 레이아웃 검증용)
    // 콘솔 오류 수집이 끝난 뒤라 여기서 뷰포트를 바꿔도 이후 로직(요약 출력뿐)에는
    // 영향이 없다 — 그래서 데스크톱 1180×1000 으로 되돌리지 않고 그대로 종료한다.
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    await new Promise((r) => setTimeout(r, 500));
    for (const [i, label] of ["발굴", "시장", "소장고"].entries()) {
      // 여기서도 온보딩이 뒤늦게 떠 있을 수 있으니 탭을 누르기 전에 먼저 닫는다.
      await evaluate(`document.querySelector('.onboarding-keep')?.click()`);
      await new Promise((r) => setTimeout(r, 300));
      await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('${label}')).click()`);
      await new Promise((r) => setTimeout(r, 900));
      const body = await evaluate(`document.querySelector('.body').innerText.length`);
      if (body < 30) failures.push(`모바일 ${label} 탭이 비어 있다`);
      await shoot(`mobile-0${i + 1}-${["dig", "market", "vault"][i]}`);
    }

    console.log("──────── SMOKE ────────");
    console.log(`스크린샷 ${shots.length}장 → ${OUT}`);
    console.log(`${SECONDS}초 방치 후 vault+pending ${dropCount}점`);
    console.log(`8시간 오프라인 후 소장고 ${posB.stacks}종 · 미감정 ${posB.pending}점, 칸 이동 ${posA.first === posB.first && posA.last === posB.last ? "없음" : "있음"}`);
    console.log(`조사 병기 ${badJosa.length === 0 ? "없음" : badJosa.join(" ")}`);
    console.log(failures.length ? `❌ FAIL\n- ${failures.join("\n- ")}` : "✅ PASS");
  } finally {
    chrome.kill();
    server.close();
  }
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error("[smoke] 오류:", err.message);
  process.exit(1);
});
