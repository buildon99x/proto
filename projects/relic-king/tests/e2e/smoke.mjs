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

// 실사 이미지(v0.4)는 jpg/webp로 들어온다 — 빠지면 octet-stream 으로 나가 브라우저가
// 그림으로 읽지 않는다.
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"
};

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

    // 검사 대상은 "이미 있던 칸이 손가락 밑에서 움직이는가"다. 새 종이 들어와
    // 칸이 하나 느는 건 정상이고(v0.3.4부터 발굴단이 다른 거점의 종을 계속
    // 물어 온다), 그때 "마지막 칸"은 아예 다른 종이 된다 — 그래서 위치를
    // 순번이 아니라 **종 id(data-aid)**로 짝지어 대조한다.
    const probe = `(() => {
      const b = [...document.querySelectorAll('.vault-grid .stack')];
      const pos = {};
      for (const el of b) {
        const x = el.getBoundingClientRect();
        pos[el.dataset.aid] = Math.round(x.x) + ',' + Math.round(x.y);
      }
      return { pending: document.querySelectorAll('.pending-list li').length, stacks: b.length, pos };
    })()`;
    const posA = await evaluate(probe);
    await new Promise((r) => setTimeout(r, 4500));
    const posB = await evaluate(probe);
    if (posA.stacks === 0) {
      failures.push("8시간 오프라인 후에도 소장고가 비어 있다");
    } else {
      const moved = Object.keys(posA.pos).filter((aid) => posB.pos[aid] && posB.pos[aid] !== posA.pos[aid]);
      if (moved.length) {
        const a = moved[0];
        failures.push(`소장고 칸이 움직였다: ${moved.length}종(예: ${a} ${posA.pos[a]} → ${posB.pos[a]})`);
      }
    }
    await evaluate(`document.querySelectorAll('.vault-grid .stack')[0]?.click()`);
    await new Promise((r) => setTimeout(r, 600));
    const detail = await evaluate(`document.querySelector('.detail')?.innerText ?? null`);
    if (!detail) failures.push("소장고 유물을 눌러도 상세가 열리지 않는다");
    await shoot("07-vault-detail");

    // 5.5) 실사 상세 블록 (v0.4) — 접힌 블록이 펼쳐지고 화면이 깨지지 않는가.
    //
    // T3·T4는 20초 방치로는 나오지 않으므로 세이브에 유일 유물 한 점을 주입한다.
    // 실사 디테일이 붙은 40종(손글씨 T3·T4)의 경로를 실제로 타야, "이미지 0장인데
    // 디테일만 있는 상태"에서 화면이 멀쩡한지 확인할 수 있다.
    const FIXTURE_ID = "gilt-bronze-maitreya-83";
    const FIXTURE_NAME = "금동미륵보살반가사유상";
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/__blank` });
    await new Promise((r) => setTimeout(r, 1200));
    await evaluate(`{
      const k = 'relic-king/save/v1';
      const w = JSON.parse(localStorage.getItem(k));
      const uid = 900001;
      w.vault.push({ uid, artifactId: ${JSON.stringify(FIXTURE_ID)}, value: 12345678, condition: 4 });
      w.codex[${JSON.stringify(FIXTURE_ID)}] = 'owned';
      const e = w.ledger[${JSON.stringify(FIXTURE_ID)}];
      if (e) { e.remaining = 0; e.owners = ['player']; }
      w.lastTickAt = Date.now();
      localStorage.setItem(k, JSON.stringify(w));
      true;
    }`);
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
    await new Promise((r) => setTimeout(r, 4000));
    await evaluate(`document.querySelector('.modal button')?.click()`);
    await new Promise((r) => setTimeout(r, 800));
    await evaluate(`document.querySelector('.onboarding-keep')?.click()`);
    await new Promise((r) => setTimeout(r, 400));

    // 소장고 상세에서 펼친다
    await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('소장고')).click()`);
    await new Promise((r) => setTimeout(r, 1000));
    // 소장고 칸에는 글자가 없다(도트 + 개수뿐) — title 속성으로 찾는다
    const clicked = await evaluate(`{
      const stacks = [...document.querySelectorAll('.vault-grid .stack')];
      const hit = stacks.find((el) => (el.title || '').includes(${JSON.stringify(FIXTURE_NAME)}));
      (hit ?? stacks[0])?.click();
      Boolean(hit);
    }`);
    if (!clicked) failures.push("주입한 유일 유물이 소장고에 보이지 않는다");
    await new Promise((r) => setTimeout(r, 700));
    const toggled = await evaluate(`{
      const t = document.querySelector('.detail .detail-toggle');
      t?.click();
      Boolean(t);
    }`);
    if (!toggled) failures.push("소장고 상세에 실사 상세 토글이 없다");
    await new Promise((r) => setTimeout(r, 500));
    const panelText = await evaluate(`document.querySelector('.detail .detail-panel')?.innerText ?? ''`);
    if (!panelText.includes("출처")) failures.push("실사 상세 블록에 출처 줄이 없다");
    if (!/소장 경위/.test(panelText)) failures.push("실사 상세 블록에 소장 경위가 없다");
    await shoot("09-vault-real-detail");

    // 도감 상세에서도 같은 블록이 뜬다
    await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('도감')).click()`);
    await new Promise((r) => setTimeout(r, 900));
    await evaluate(`{
      const btns = [...document.querySelectorAll('.codex-grid button')];
      const hit = btns.find((b) => (b.title || '').includes(${JSON.stringify(FIXTURE_NAME)}))
        ?? btns.find((b) => !b.querySelector('.sprite-unseen'));
      (hit ?? btns[0])?.click();
      true;
    }`);
    await new Promise((r) => setTimeout(r, 700));
    await evaluate(`document.querySelector('.codex-detail .detail-toggle')?.click()`);
    await new Promise((r) => setTimeout(r, 500));
    const codexPanel = await evaluate(`document.querySelector('.codex-detail .detail-panel')?.innerText ?? ''`);
    if (!codexPanel.includes("출처")) failures.push("도감 상세에 실사 상세 블록이 열리지 않는다");
    await shoot("10-codex-real-detail");

    // 상세 오버레이(드랍 연출)는 실사 블록을 쓰지 않는다 — 연출 보호(G73)가 지켜지는지 확인
    const revealHasDetail = await evaluate(`{
      const m = document.querySelector('.modal.reveal');
      m ? Boolean(m.querySelector('.artifact-detail')) : false;
    }`);
    if (revealHasDetail) failures.push("드랍 연출에 실사 상세 블록이 끼어들었다(G73 위반)");

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

    // 8) 세계지도 (데스크톱, 세계 줌 상태 — 결함3 라벨 겹침 고정 검증용, G57.5/G58)
    await evaluate(`document.querySelector('.onboarding-keep')?.click()`);
    await new Promise((r) => setTimeout(r, 300));
    await evaluate(`[...document.querySelectorAll('.tabs button')].find(b => b.innerText.trim().startsWith('발굴')).click()`);
    await new Promise((r) => setTimeout(r, 600));
    await evaluate(`{ document.querySelector('.worldmap-wrap')?.scrollIntoView({ block: 'center' }); true; }`);
    await new Promise((r) => setTimeout(r, 300));
    const mapRect = await evaluate(`{
      const el = document.querySelector('.worldmap-wrap');
      const r = el ? el.getBoundingClientRect() : null;
      // captureBeyondViewport 는 clip 좌표를 뷰포트가 아니라 페이지 기준으로 읽으므로
      // scroll 오프셋을 더해야 한다 — 안 그러면 스크롤된 만큼 위쪽(헤더)이 대신 찍힌다.
      r ? { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height } : null;
    }`);
    if (!mapRect) {
      failures.push("세계지도 패널을 찾지 못했다");
    } else {
      await shoot("08-worldmap", {
        x: Math.max(0, mapRect.x - 8), y: Math.max(0, mapRect.y - 8),
        width: mapRect.width + 16, height: mapRect.height + 16, scale: 1
      });
    }

    // 8a) 라벨 생략 0건 (v0.4 — 거점 표기가 나라명에서 도시명으로 길어지면서
    //     그리디 배치가 자리를 못 찾고 라벨을 버릴 수 있다. 렌더가 스스로 센 값을
    //     data-labels-omitted 로 내보내므로 그대로 읽는다.)
    const labelStats = await evaluate(`{
      const c = document.querySelector('.worldmap-canvas');
      c ? { drawn: Number(c.dataset.labelsDrawn), omitted: Number(c.dataset.labelsOmitted) } : null;
    }`);
    if (!labelStats) {
      failures.push("세계지도 캔버스를 찾지 못했다");
    } else {
      if (labelStats.omitted !== 0) failures.push(`세계 줌 라벨 생략 ${labelStats.omitted}건 (0이어야 한다)`);
      if (labelStats.drawn !== 12) failures.push(`세계 줌 라벨이 ${labelStats.drawn}개만 그려졌다 (12개여야 한다)`);
    }

    // 8b) 권역 줌 — 확대 배경에도 해안선이 있어야 한다(v0.3은 맨 바다였다).
    //     캔버스 픽셀을 직접 읽어 바다색(PALETTE.sky)이 아닌 픽셀의 비율을 센다.
    const zoomShot = await evaluate(`{
      const hits = [...document.querySelectorAll('.worldmap-hit')];
      const t = hits.find(b => (b.getAttribute('aria-label') || '').startsWith('경주'));
      if (t) t.click();
      !!t;
    }`);
    if (!zoomShot) failures.push("권역 줌: 경주 마커 타겟을 찾지 못했다");
    await new Promise((r) => setTimeout(r, 600));
    const regionState = await evaluate(`{
      const c = document.querySelector('.worldmap-canvas');
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      // PALETTE.sky = #2b3a4a. 바다·그리드선을 뺀 "그 밖의 픽셀" 비율 = 지형+마커+라벨.
      let other = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (!(Math.abs(d[i] - 0x2b) < 6 && Math.abs(d[i + 1] - 0x3a) < 6 && Math.abs(d[i + 2] - 0x4a) < 6)) other++;
      }
      ({
        ratio: other / (c.width * c.height),
        zoom: document.querySelector('.worldmap-wrap')?.dataset.zoom ?? '',
        omitted: Number(c.dataset.labelsOmitted)
      });
    }`);
    // 경주 권역(동아시아)은 화면의 상당 부분이 육지다. 5% 미만이면 배경이 맨 바다라는 뜻.
    if (regionState.ratio < 0.05) {
      failures.push(`권역 줌 배경에 해안선이 없다 (비-바다 픽셀 ${(regionState.ratio * 100).toFixed(1)}%)`);
    }
    if (regionState.zoom !== "korea") failures.push(`권역 줌으로 전환되지 않았다 (data-zoom="${regionState.zoom}")`);
    await shoot("08b-worldmap-region", {
      x: Math.max(0, mapRect.x - 8), y: Math.max(0, mapRect.y - 8),
      width: mapRect.width + 16, height: mapRect.height + 16, scale: 1
    });

    // 8c) ESC로 세계 줌 복귀
    await evaluate(`{
      const hits = [...document.querySelectorAll('.worldmap-hit')];
      hits[0]?.focus();
      hits[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      true;
    }`);
    await new Promise((r) => setTimeout(r, 500));
    const backToWorld = await evaluate(`(document.querySelector('.worldmap-wrap')?.dataset.zoom ?? 'x') === ''`);
    if (!backToWorld) failures.push("ESC를 눌러도 권역 줌이 풀리지 않았다");

    // 8d) 키보드만으로 거점 선택 → 파견 시트 도달
    //     Tab 순회 대신 실제 포커스 타겟에 focus() + Enter 를 넣는다 — CDP 로
    //     OS 레벨 Tab 을 쏘는 것보다 "그 요소가 포커스 가능하고 Enter 로 진행되는가"를
    //     더 정확히 본다. 순서(거리순)는 aria-label 로 따로 확인한다.
    const kbd = await evaluate(`{
      const hits = [...document.querySelectorAll('.worldmap-hit')];
      const labels = hits.map(b => b.getAttribute('aria-label'));
      const first = hits[1];   // [0] = 본거지(경주). 다음으로 가까운 거점을 고른다
      first.focus();
      const focused = document.activeElement === first;
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      first.click();           // 브라우저가 Enter 를 click 으로 바꾸는 그 동작
      ({ focused, labels, target: first.getAttribute('aria-label') });
    }`);
    if (!kbd.focused) failures.push("지도 마커가 키보드 포커스를 받지 못한다");
    if (kbd.labels.length !== 12) failures.push(`지도 포커스 타겟이 ${kbd.labels.length}개다 (12개여야 한다)`);
    const kmOf = (l) => Number((l.match(/·\s([\d,]+)km/) || [0, "0"])[1].replace(/,/g, ""));
    const distances = kbd.labels.map(kmOf);
    if (distances.some((d, i) => i > 0 && d < distances[i - 1])) {
      failures.push(`지도 포커스 순서가 거리순이 아니다: ${distances.join(" ")}`);
    }
    await new Promise((r) => setTimeout(r, 500));
    // 권역 줌으로 들어갔으니 같은 거점을 한 번 더 눌러 파견 시트까지 간다(3단계 규칙)
    await evaluate(`{
      const hits = [...document.querySelectorAll('.worldmap-hit')];
      const t = hits.find(b => b.getAttribute('aria-label') === ${JSON.stringify("__TARGET__")});
      (t || hits[1]).click();
      true;
    }`.replace(JSON.stringify("__TARGET__"), JSON.stringify(kbd.target.replace("권역으로 확대", "파견 시트 열기"))));
    await new Promise((r) => setTimeout(r, 700));
    const sheet = await evaluate(`document.querySelector('.modal-sheet-head h2')?.innerText ?? null`);
    if (!sheet || !/—/.test(sheet)) {
      failures.push(`키보드 경로로 파견 시트에 도달하지 못했다 (제목: ${sheet})`);
    } else {
      // 표시 규칙 — 제목은 "도시명 — 앵커 유적", 부제는 "나라 · 편도 N km"
      const sub = await evaluate(`document.querySelector('.modal-sheet-sub')?.innerText ?? ''`);
      if (!/·\s*편도\s/.test(sub)) failures.push(`파견 시트 부제가 표시 규칙과 다르다: "${sub}"`);
    }
    await evaluate(`document.querySelector('.modal-close')?.click()`);
    await new Promise((r) => setTimeout(r, 400));

    // 8e) 순위표 — 기록패 왕복(v0.5, notes/decisions.md G76)
    //     내 기록패를 복사해 그대로 다시 붙여 넣는다. 실제 UI 경로(클립보드 → prompt)를
    //     그대로 타므로, 코드 생성·파싱·고스트 주입·순위표 렌더가 한 번에 검증된다.
    await evaluate(`document.querySelector('.stat-rank')?.click()`);
    await new Promise((r) => setTimeout(r, 600));
    const rankOpen = await evaluate(`!!document.querySelector('.rank-list')`);
    if (!rankOpen) failures.push("헤더 순위 칩을 눌러도 순위표가 열리지 않는다");

    const cardRound = await evaluate(`(async () => {
      let captured = null;
      const origPrompt = window.prompt;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (t) => { captured = t; return Promise.resolve(); } }
      });
      const byText = (t) => [...document.querySelectorAll('.card-exchange button')].find(b => b.innerText.includes(t));
      byText('복사')?.click();
      await new Promise(r => setTimeout(r, 400));
      window.prompt = () => captured;
      byText('붙여넣기')?.click();
      await new Promise(r => setTimeout(r, 700));
      window.prompt = origPrompt;
      return {
        len: captured ? captured.length : 0,
        ghosts: document.querySelectorAll('.rank-list li.rank-ghost').length,
        rows: document.querySelectorAll('.rank-list li').length,
        race: document.querySelector('.race-line')?.innerText ?? ''
      };
    })()`);
    if (cardRound.len === 0) failures.push("기록패 복사에서 코드가 나오지 않았다");
    if (cardRound.len > 512) failures.push(`기록패가 ${cardRound.len}자다 (512자 이하여야 한다)`);
    if (cardRound.ghosts !== 1) failures.push(`붙여넣은 뒤 고스트 행이 ${cardRound.ghosts}개다 (1개여야 한다)`);
    if (cardRound.rows !== 8) failures.push(`순위표가 ${cardRound.rows}행이다 (나 + NPC 6 + 고스트 1 = 8행이어야 한다)`);
    if (!cardRound.race.trim()) failures.push("순위표에 추격 안내가 없다");
    await shoot("09-ranktable");

    // 고스트 행이 "언제 받은 기록인지"를 숨기지 않는가 — 이 표기가 사라지면 화면이
    // 실시간 상대인 것처럼 거짓말을 하게 된다(G76.0).
    const ghostAge = await evaluate(`document.querySelector('.rank-list li.rank-ghost')?.innerText ?? ''`);
    if (!/기록/.test(ghostAge)) failures.push(`고스트 행에 기록 시점 표기가 없다: "${ghostAge}"`);
    await evaluate(`document.querySelector('.modal-close')?.click()`);
    await new Promise((r) => setTimeout(r, 400));

    // 9) 콘솔 오류
    const errors = cdp.events
      .filter((e) => e.method === "Runtime.exceptionThrown"
        || (e.method === "Log.entryAdded" && e.params.entry.level === "error")
        || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error"))
      .map((e) => JSON.stringify(e.params).slice(0, 300))
      .filter((text) => !text.includes("favicon.ico"));
    if (errors.length) failures.push(`콘솔 오류 ${errors.length}건:\n  ${errors.join("\n  ")}`);

    // 10) 모바일 375px 스크린샷 (notes/ux-v02.md 가 설계한 모바일 레이아웃 검증용)
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

      if (label === "발굴") {
        // 세계지도는 "🗺 지도로 보기" 토글 뒤에 숨어 있다(결함3 검증, G58) — 펼친 상태로 찍는다.
        await evaluate(`document.querySelector('.explorer-map-toggle')?.click()`);
        await new Promise((r) => setTimeout(r, 700));
        const mapOpen = await evaluate(`document.querySelector('.explorer.mobile-map-open .worldmap-wrap') ? true : false`);
        if (!mapOpen) failures.push("모바일 지도로 보기 토글이 지도를 펼치지 않았다");
        // 앞 절(8d)이 권역 줌을 남겨 두고 왔을 수 있다 — 세계 줌에서 12마커를 센다
        await evaluate(`{
          const b = [...document.querySelectorAll('.worldmap-controls button')].find(x => x.innerText.includes('세계 지도로'));
          if (b) b.click();
          true;
        }`);
        await new Promise((r) => setTimeout(r, 500));
        // 12마커가 전부 뷰포트 안에 있고 가로 스크롤이 없어야 한다(작업 지시 C4)
        const mobileMap = await evaluate(`{
          const c = document.querySelector('.worldmap-canvas');
          const hits = [...document.querySelectorAll('.worldmap-hit')];
          const vw = document.documentElement.clientWidth;
          const inside = hits.filter(b => {
            const r = b.getBoundingClientRect();
            return r.left >= -1 && r.right <= vw + 1 && r.top >= -1;
          }).length;
          ({
            markers: hits.length,
            inside,
            omitted: Number(c.dataset.labelsOmitted),
            hOverflow: document.documentElement.scrollWidth - vw
          });
        }`);
        if (mobileMap.markers !== 12) failures.push(`모바일 지도 마커가 ${mobileMap.markers}개다 (12개여야 한다)`);
        if (mobileMap.inside !== mobileMap.markers) {
          failures.push(`모바일 지도 마커 ${mobileMap.markers - mobileMap.inside}개가 화면 밖이다`);
        }
        if (mobileMap.hOverflow > 0) failures.push(`모바일에서 가로 스크롤이 ${mobileMap.hOverflow}px 생겼다`);
        if (mobileMap.omitted !== 0) failures.push(`모바일 지도 라벨 생략 ${mobileMap.omitted}건`);
        await shoot("mobile-04-worldmap");
        await evaluate(`document.querySelector('.explorer-map-toggle')?.click()`);
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // 10a) 모바일 순위표 — 좁은 화면에서도 고스트가 "언제 받은 기록"인지 읽혀야 한다.
    //      `.rank-dig`는 모바일에서 숨기지만 고스트 행만은 예외로 남겨 뒀다(G76.0) —
    //      그 예외가 죽으면 모바일에서만 실시간 상대처럼 보인다.
    await evaluate(`document.querySelector('.stat-rank')?.click()`);
    await new Promise((r) => setTimeout(r, 700));
    const mobileRank = await evaluate(`{
      const ghost = document.querySelector('.rank-list li.rank-ghost');
      ({
        open: !!document.querySelector('.rank-list'),
        ghostText: ghost ? ghost.innerText : "",
        hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      });
    }`);
    if (!mobileRank.open) failures.push("모바일에서 순위표가 열리지 않는다");
    if (!/기록/.test(mobileRank.ghostText)) {
      failures.push(`모바일 고스트 행에 기록 시점 표기가 없다: "${mobileRank.ghostText}"`);
    }
    if (mobileRank.hOverflow > 0) failures.push(`모바일 순위표에서 가로 스크롤이 ${mobileRank.hOverflow}px 생겼다`);
    await shoot("mobile-05-ranktable");
    await evaluate(`document.querySelector('.modal-close')?.click()`);

    console.log("──────── SMOKE ────────");
    console.log(`스크린샷 ${shots.length}장 → ${OUT}`);
    console.log(`${SECONDS}초 방치 후 vault+pending ${dropCount}점`);
    console.log(`8시간 오프라인 후 소장고 ${posB.stacks}종 · 미감정 ${posB.pending}점, 칸 이동 ${Object.keys(posA.pos).every((aid) => !posB.pos[aid] || posB.pos[aid] === posA.pos[aid]) ? "없음" : "있음"}`);
    console.log(`조사 병기 ${badJosa.length === 0 ? "없음" : badJosa.join(" ")}`);
    console.log(`세계지도 라벨 ${labelStats ? `${labelStats.drawn}개 · 생략 ${labelStats.omitted}건` : "미측정"}`);
    console.log(`권역 줌 비-바다 픽셀 ${(regionState.ratio * 100).toFixed(1)}% · 키보드 파견 ${sheet ? "도달" : "실패"}`);
    console.log(`기록패 ${cardRound.len}자 · 왕복 후 순위표 ${cardRound.rows}행(고스트 ${cardRound.ghosts})`);
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
