// E2E 스모크/스크린샷 — 실제 브라우저로 전체 화면 플로우를 돌며 캡처한다.
//
// 사용법(테스트 도구는 빌드 의존성과 분리되어 있으므로 수동 설치):
//   1) cd projects/dragon-danmaku/app
//   2) PUPPETEER_DOWNLOAD_BASE_URL=https://storage.googleapis.com/chrome-for-testing-public \
//        pnpm dlx puppeteer@25 --version   # 또는 임시로 add -D puppeteer
//   3) pnpm build && pnpm exec vite preview --port 4319 --host 127.0.0.1 &
//   4) node ../tests/e2e/smoke.mjs
//
// puppeteer를 app/package.json에 영구 추가하지 않는 이유: postinstall이 크롬을
// 내려받아 `pnpm install --frozen-lockfile`(Vercel) 단계에서 네트워크 정책에 따라
// 빌드가 깨질 수 있다. 검증은 로컬/CI 잡에서 별도로 수행한다.

import puppeteer from "puppeteer";

const BASE = process.env.BASE || "http://127.0.0.1:4319";
const OUT = process.env.OUT || "../assets/screenshots/shots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
});
const page = await browser.newPage();
await page.setViewport({ width: 520, height: 820, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot:", name);
}
async function click(t, timeout = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const h = await page.evaluateHandle((t) => {
      const e = [...document.querySelectorAll("button, .dragon-card, .difficulty-card")];
      return e.find((x) => x.textContent && x.textContent.includes(t)) || null;
    }, t);
    const el = h.asElement();
    if (el) { await el.click(); await h.dispose(); return; }
    await h.dispose();
    await sleep(120);
  }
  throw new Error("not found: " + t);
}

await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(600);
await shot("01-title");
await click("게임 시작"); await sleep(400); await shot("02-dragon-select");
await click("난이도 선택"); await sleep(400); await shot("03-difficulty-select");
await click("출격"); await sleep(2500); await shot("04-ingame-early");
await page.keyboard.down("ShiftLeft"); await sleep(700); await page.keyboard.up("ShiftLeft");
await sleep(3500); await shot("05-ingame-chain");
await page.keyboard.press("KeyX"); await sleep(250); await shot("06-bomb");
await sleep(9000); await shot("07-ingame-later");
await page.keyboard.press("Escape"); await sleep(400); await shot("08-pause");
await click("포기하고 리절트로"); await sleep(800); await shot("09-result");
await click("용소로"); await sleep(500); await shot("10-hub");

console.log("ERRORS:", errors.length ? errors.join("\n") : "none");
await browser.close();
if (errors.length) process.exit(1);
