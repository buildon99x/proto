// 실제 React 앱을 사람처럼 조작하는 CDP 하니스.
//
// `smoke.mjs`는 "탭을 열고 스크린샷을 찍는" 레이아웃 검사기다. 이 모듈은 그보다
// 한 층 아래 — 클릭 한 번을 세고, 그 클릭이 월드 상태를 바꿨는지 확인하고,
// 게임 시각(world.t)을 기준으로 기다린다. `play.mjs`가 이걸 쓴다.
//
// ## 가상 시계 (이 하니스의 핵심이자, 결과를 왜곡할 수 있는 유일한 장치)
//
// 방치형은 실시간으로 20분을 기다려야 20분이 흐른다. 그래서 페이지 스크립트가
// 뜨기 전에 `Date.now`·`performance.now`·`requestAnimationFrame`의 타임스탬프를
// 한꺼번에 SPEED배로 늘린다. 셋을 같은 원점·같은 배율로 묶어야 한다 —
// `useGame.ts`의 프레임 루프는 rAF 콜백 인자(`now`)로 dt를 재고, 세이브는
// `Date.now()`를 쓴다. 하나만 건드리면 둘이 어긋나 오프라인 적분이 튄다.
//
// **왜곡 가능성과 그 통제**: 엔진이 한 프레임에 받는 dt가 SPEED배로 커진다.
// `useGame.ts`가 dt를 0.5초로 클램프하므로 SPEED가 너무 크면 시간이 잘려 나간다
// (60fps 기준 SPEED=30이 클램프 경계). 그래서 기본 SPEED는 12로 두고, **경과
// 시간을 실시간으로 추정하지 않고 항상 `world.t`를 직접 읽어서** 기다린다
// (`waitGame`). 클램프가 걸리면 실제로 더 오래 걸릴 뿐 측정값은 오염되지 않는다.
// 잘린 시간의 양 자체는 `clockDrift()`가 보고한다.
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIST = path.join(ROOT, "app/dist");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json"
};

export const SAVE_KEY = "relic-king/save/v1";
export const RECORD_KEY = "relic-king/record/v1";
export const ONBOARDING_KEY = "relic-king/onboarding-seen-v1";

function serve(port) {
  const server = createServer(async (req, res) => {
    const url = (req.url || "/").split("?")[0];
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
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

async function retry(fn, timeout = 20000) {
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

/** 페이지 스크립트보다 먼저 실행돼 시계 셋을 한 원점·한 배율로 묶는다. */
function clockScript(speed, epoch) {
  return `(() => {
    const SPEED = ${speed};
    const EPOCH = ${epoch};
    const realDateNow = Date.now.bind(Date);
    const rawPerfNow = performance.now.bind(performance);
    const realStart = realDateNow();
    const perfStart = rawPerfNow();
    const virtualPerf = () => (rawPerfNow() - perfStart) * SPEED;
    Date.now = () => Math.round(EPOCH + virtualPerf());
    performance.now = virtualPerf;
    const rawRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => rawRaf((ts) => cb((ts - perfStart) * SPEED));
    window.__vclock = {
      speed: SPEED, epoch: EPOCH, realStart,
      realElapsed: () => realDateNow() - realStart,
      virtualElapsed: () => virtualPerf()
    };
  })()`;
}

export async function launch({
  speed = 12,
  epoch = Date.UTC(2026, 8, 20, 0, 0, 0),
  width = 1180,
  height = 1000,
  port = 4331,
  cdpPort = 9231,
  profile = "/tmp/relic-king-play-profile",
  outDir = path.join(ROOT, "assets/screenshots/play")
} = {}) {
  await rm(profile, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const server = await serve(port);
  const chrome = spawn(CHROME, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    `--window-size=${width},${height}`, `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profile}`, "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const target = await retry(async () => {
    const res = await fetch(`http://127.0.0.1:${cdpPort}/json/new?http://127.0.0.1:${port}/__blank`, { method: "PUT" });
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
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: clockScript(speed, epoch) });

  const base = `http://127.0.0.1:${port}`;
  let shotCount = 0;

  const evaluate = async (expression) => {
    const res = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(`${res.exceptionDetails.text}: ${res.exceptionDetails.exception?.description ?? ""}`);
    }
    return res.result.value;
  };

  const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms));

  const h = {
    cdp, base, speed, outDir, shots: [],

    evaluate,
    sleepReal,
    /** 게임 시각 기준 대기 (실시간이 아니라 world.t 기준) */
    async sleepGame(seconds) {
      const t0 = (await h.world())?.t ?? 0;
      await h.waitGame(t0 + seconds);
    },

    async goto(url = "/") {
      await cdp.send("Page.navigate", { url: base + url });
      await retry(async () => {
        const ok = await evaluate(`document.readyState === 'complete'`);
        if (!ok) throw new Error("not loaded");
      });
      await sleepReal(300);
    },

    /** 앱 루트가 실제로 렌더될 때까지 */
    async ready(timeout = 20000) {
      await retry(async () => {
        const ok = await evaluate(`!!document.querySelector('.app')`);
        if (!ok) throw new Error("app not mounted");
      }, timeout);
    },

    /** localStorage 세이브(앱이 10 게임초마다 쓴다)를 읽는다 */
    async world() {
      return evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}) || 'null')`);
    },

    /**
     * 지금 이 순간의 월드를 읽는다. 세이브는 10 게임초마다만 쓰이므로 조작 직후에
     * `world()`를 읽으면 조작 이전 스냅샷이 잡힌다(실제로 이 하니스를 쓰다 처음
     * 만난 함정이다). 앱이 이미 갖고 있는 저장 경로 — `visibilitychange` 핸들러 —
     * 를 그대로 눌러 즉시 기록시킨 뒤 읽는다. 게임 상태를 바꾸지 않는 조작이다
     * (탭을 잠깐 가렸다 온 것과 같고, 실제 플레이에서도 늘 일어난다).
     */
    async state() {
      await evaluate(`(() => { document.dispatchEvent(new Event('visibilitychange')); return true; })()`);
      await sleepReal(90);
      return h.world();
    },

    async record() {
      return evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(RECORD_KEY)}) || 'null')`);
    },

    /** world.t 가 목표 게임초를 넘을 때까지 기다린다. 타임아웃은 실시간 기준. */
    async waitGame(targetT, { timeoutMs = 240000 } = {}) {
      const started = Date.now();
      for (;;) {
        const w = await h.world();
        if (w && w.t >= targetT) return w;
        if (Date.now() - started > timeoutMs) {
          throw new Error(`waitGame(${targetT}) 타임아웃 — 현재 t=${w ? w.t.toFixed(1) : "null"}`);
        }
        await sleepReal(120);
      }
    },

    /** 조건이 참이 될 때까지 (실시간 타임아웃) */
    async until(expression, { timeoutMs = 30000, label = expression } = {}) {
      const started = Date.now();
      for (;;) {
        if (await evaluate(`!!(${expression})`)) return true;
        if (Date.now() - started > timeoutMs) throw new Error(`until 타임아웃: ${label}`);
        await sleepReal(150);
      }
    },

    async text(selector = "body") {
      return evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`);
    },

    async count(selector) {
      return evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
    },

    async exists(selector) {
      return evaluate(`!!document.querySelector(${JSON.stringify(selector)})`);
    },

    /** 셀렉터 클릭. 없으면 false. 실제 사람 조작 1회를 뜻한다. */
    async click(selector, { settle = 260 } = {}) {
      const hit = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el || el.disabled) return false;
        el.click();
        return true;
      })()`);
      if (hit) await sleepReal(settle);
      return hit;
    },

    /** 텍스트로 버튼/요소를 찾아 클릭 */
    async clickText(selector, needle, { settle = 260, exact = false } = {}) {
      const hit = await evaluate(`(() => {
        const list = [...document.querySelectorAll(${JSON.stringify(selector)})];
        const needle = ${JSON.stringify(needle)};
        const el = list.find((e) => ${exact ? "e.innerText.trim() === needle" : "e.innerText.includes(needle)"});
        if (!el || el.disabled) return false;
        el.click();
        return true;
      })()`);
      if (hit) await sleepReal(settle);
      return hit;
    },

    async tab(label) {
      return h.clickText(".tabs button", label, { settle: 320 });
    },

    async subtab(label) {
      return h.clickText(".subtabs button", label, { settle: 320 });
    },

    /** select 요소에 값을 넣고 change 를 흘린다 (React onChange 경로) */
    async selectValue(selector, value) {
      return evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
    },

    async pointerDown(selector, times = 1) {
      return evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        for (let i = 0; i < ${times}; i++) {
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        }
        return true;
      })()`);
    },

    async shot(name, clip) {
      const params = clip ? { format: "png", clip, captureBeyondViewport: true } : { format: "png" };
      const { data } = await cdp.send("Page.captureScreenshot", params);
      const file = path.join(outDir, `${String(++shotCount).padStart(2, "0")}-${name}.png`);
      await writeFile(file, Buffer.from(data, "base64"));
      h.shots.push(path.relative(ROOT, file));
      return file;
    },

    async viewport(w, hgt, mobile = false) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: w, height: hgt, deviceScaleFactor: mobile ? 2 : 1, mobile
      });
      await sleepReal(250);
    },

    /**
     * 페이지를 떠난 상태에서 세이브를 고친다. 게임 페이지 위에서 고치면
     * beforeunload 세이브가 덮어쓴다(오프라인 시간 위조를 막는 정상 동작).
     */
    async patchSave(mutatorSource) {
      await cdp.send("Page.navigate", { url: base + "/__blank" });
      await sleepReal(500);
      const ok = await evaluate(`(() => {
        const k = ${JSON.stringify(SAVE_KEY)};
        const raw = localStorage.getItem(k);
        if (!raw) return false;
        const w = JSON.parse(raw);
        (${mutatorSource})(w);
        localStorage.setItem(k, JSON.stringify(w));
        return true;
      })()`);
      return ok;
    },

    async writeSave(worldJson) {
      await cdp.send("Page.navigate", { url: base + "/__blank" });
      await sleepReal(400);
      return evaluate(`(() => {
        localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(worldJson))});
        return true;
      })()`);
    },

    async clearStorage() {
      await cdp.send("Page.navigate", { url: base + "/__blank" });
      await sleepReal(300);
      return evaluate(`(() => { localStorage.clear(); return true; })()`);
    },

    /** 가상 시계가 실제로 얼마나 흘렀고 엔진이 얼마나 받았는지 — 클램프 손실 추정 */
    async clockDrift() {
      const v = await evaluate(`window.__vclock ? {
        real: window.__vclock.realElapsed(), virtual: window.__vclock.virtualElapsed(), speed: window.__vclock.speed
      } : null`);
      const w = await h.world();
      if (!v || !w) return null;
      return {
        speed: v.speed,
        virtualSeconds: v.virtual / 1000,
        gameSeconds: w.t,
        realSeconds: v.real / 1000
      };
    },

    consoleErrors() {
      return cdp.events
        .filter((e) => e.method === "Runtime.exceptionThrown"
          || (e.method === "Log.entryAdded" && e.params.entry.level === "error")
          || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error"))
        .map((e) => JSON.stringify(e.params).slice(0, 400))
        .filter((t) => !t.includes("favicon.ico"));
    },

    async close() {
      chrome.kill();
      server.close();
    }
  };

  return h;
}

export { ROOT };
