// 미리 깔린 크로미움을 CDP로 직접 모는 최소 하니스 (외부 네트워크 없이 돈다).
//   const b = await launch(); await b.goto('?demo=gap'); await b.shot('gap.png'); await b.close();
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
const DIST = path.join(ROOT, "app/dist");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

function serve(port) {
  const server = createServer(async (req, res) => {
    const url = (req.url || "/").split("?")[0];
    const file = path.join(DIST, url === "/" ? "index.html" : url);
    try { const body = await readFile(file); res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(body); }
    catch { res.writeHead(404).end("not found"); }
  });
  return new Promise(r => server.listen(port, "127.0.0.1", () => r(server)));
}
async function retry(fn, timeout = 20000) {
  const t0 = Date.now();
  for (;;) { try { return await fn(); } catch (e) { if (Date.now() - t0 > timeout) throw e; await new Promise(r => setTimeout(r, 200)); } }
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch({ width = 1280, height = 720, port = 4351, cdpPort = 9251, profile = "/tmp/msw-inc-e2e" } = {}) {
  await rm(profile, { recursive: true, force: true });
  const server = await serve(port);
  const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required",
    `--window-size=${width},${height}`, `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const target = await retry(async () => {
    const r = await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" });
    if (!r.ok) throw new Error("cdp " + r.status);
    return r.json();
  });
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  let id = 0; const waiting = new Map(); const errors = [];
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.rej(new Error(JSON.stringify(m.error))) : w.res(m.result); }
    else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a => a.value ?? a.description).join(" "));
  });
  const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => waiting.set(i, { res, rej })); };
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  const base = `http://127.0.0.1:${port}/`;
  const b = {
    errors, send,
    async goto(q = "", { clear = true } = {}) {
      if (clear) { await send("Page.navigate", { url: base + "__blank" }); await sleep(150); await b.eval("try{localStorage.clear()}catch(e){}"); }
      await send("Page.navigate", { url: base + q });
      await retry(async () => { const r = await b.eval("!!(window.__msw && document.readyState==='complete')"); if (!r) throw new Error("not ready"); });
      await sleep(300);
    },
    async eval(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async shot(file) {
      const r = await send("Page.captureScreenshot", { format: "png" });
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(r.data, "base64"));
    },
    /** 무대 좌표(1280×720) 기준으로 셀렉터 가운데를 누른다 */
    async click(sel) {
      const pt = await b.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()`);
      if (!pt) throw new Error("no element " + sel);
      await b.mouse(pt[0], pt[1]);
      return pt;
    },
    async mouse(x, y) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    },
    async drag(from, to) {
      const [x0, y0] = from, [x1, y1] = to;
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0, y: y0 });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x0, y: y0, button: "left", clickCount: 1 });
      for (let i = 1; i <= 12; i++) { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (x1 - x0) * i / 12, y: y0 + (y1 - y0) * i / 12, button: "left", buttons: 1 }); await sleep(16); }
      await sleep(80);
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x1, y: y1, button: "left", clickCount: 1 });
    },
    async center(sel) { return b.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()`); },
    async close() { try { ws.close(); } catch {} chrome.kill("SIGKILL"); server.close(); },
  };
  return b;
}
