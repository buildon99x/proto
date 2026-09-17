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
    if (!/도감 [1-9]/.test(after) && !/소장고/.test(after)) failures.push("진행 신호를 찾지 못했다");
    const drops = /도감 (\d+)\/60/.exec(after);
    if (!drops || Number(drops[1]) < 1) failures.push(`${SECONDS}초 방치 후에도 유물이 0점이다`);
    await shoot("02-dig-running");

    // 3) 탭 전환이 모두 뜬다
    for (const [i, label] of ["소장고", "세계", "도감"].entries()) {
      await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('${label}')).click()`);
      await new Promise((r) => setTimeout(r, 900));
      const body = await evaluate(`document.querySelector('.body').innerText.length`);
      if (body < 30) failures.push(`${label} 탭이 비어 있다`);
      await shoot(`0${3 + i}-${["vault", "world", "codex"][i]}`);
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

    // 5) 표지 이미지 (런처 카드용)
    await new Promise((r) => setTimeout(r, 1200));
    await shoot("cover", { x: 0, y: 0, width: 1180, height: 640, scale: 0.82 });

    // 6) 콘솔 오류
    const errors = cdp.events
      .filter((e) => e.method === "Runtime.exceptionThrown"
        || (e.method === "Log.entryAdded" && e.params.entry.level === "error")
        || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error"))
      .map((e) => JSON.stringify(e.params).slice(0, 300))
      .filter((text) => !text.includes("favicon.ico"));
    if (errors.length) failures.push(`콘솔 오류 ${errors.length}건:\n  ${errors.join("\n  ")}`);

    console.log("──────── SMOKE ────────");
    console.log(`스크린샷 ${shots.length}장 → ${OUT}`);
    const codex = /도감 (\d+)\/60/.exec(after);
    console.log(`${SECONDS}초 방치 후 도감 ${codex ? codex[1] : "?"}점`);
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
