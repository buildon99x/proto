#!/usr/bin/env node
/**
 * 사망 지도 — 솔버의 여유 곡선 위에 실측 사망을 겹쳐 한 장으로 굽는다.
 *
 * 묻는 것은 하나다. **솔버가 예측한 최난 구간과 사람이 실제로 죽는 구간이 겹치는가.**
 * 겹치면 솔버의 수치가 체감의 대리변수로 성립하고, 어긋나면 어긋난 자리가 설계 결함이다.
 *
 * 브라우저 도구는 playtest 하네스가 격리 설치한 puppeteer 를 그대로 빌려 쓴다 —
 * 이 도구 때문에 프로젝트 의존성이 늘어나면 안 된다.
 *
 * 실행: node projects/wave-runner/tools/death-report/figure.mjs <요약.json> [출력.png]
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "../..");
const REPO = path.resolve(PROJECT, "../..");
const PLAYTEST = path.join(REPO, ".playtest");

const input = process.argv[2];
const out = process.argv[3] ?? path.join(PROJECT, "assets/screenshots/deaths.png");
if (!input) {
  console.error("사용법: node figure.mjs <요약.json> [출력.png]");
  process.exit(2);
}
if (!existsSync(path.join(PLAYTEST, "node_modules/puppeteer"))) {
  console.error("puppeteer 가 없다. 먼저 `pnpm playtest --project wave-runner` 를 한 번 돌려라.");
  process.exit(1);
}

const summary = JSON.parse(readFileSync(input, "utf8"));
if (!summary.figures?.length) {
  console.error("요약에 그림 데이터가 없다. report.ts 를 --json 과 함께 돌렸는지 확인.");
  process.exit(1);
}

const require = createRequire(path.join(PLAYTEST, "noop.cjs"));
const puppeteer = require("puppeteer");

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--use-gl=swiftshader"]
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1520, height: 1200 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(`file://${path.join(HERE, "figure.html")}`, { waitUntil: "load", timeout: 60000 });
  await page.evaluate((data) => { window.REPORT = data; }, summary);
  await page.evaluate(() => window.renderAll());
  await page.waitForFunction("window.__ready === true", { timeout: 60000 });

  const el = await page.$("#deaths");
  await el.screenshot({ path: out });
  const size = await page.evaluate(() => {
    const c = document.getElementById("deaths");
    return { w: c.width, h: c.height };
  });
  if (errors.length) {
    console.error("[deaths] 페이지 오류:", errors);
    process.exitCode = 1;
  } else {
    console.log(`[deaths] ${path.relative(REPO, out)}  ${size.w}×${size.h}`);
  }
} finally {
  await browser.close();
}
