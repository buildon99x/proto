#!/usr/bin/env node
/**
 * 스테이지 통로 지도 — 12스테이지의 코스 전체와 그 위의 난이도를 PNG 로 굽는다.
 *
 * 그리는 것은 **생존 회랑**이다. 솔버가 "지금 이 높이에 있어야만 끝까지 갈 수 있다"고
 * 판정한 y 집합을 코스 전체에 걸쳐 칠하므로, 화면에 그려진 통로와 **실제로 플레이되는
 * 통로**의 차이가 그대로 보인다. 색은 그 지점의 여유(ms)이고 진할수록 빡빡하다.
 *
 * 브라우저 도구는 playtest 하네스가 격리 설치한 puppeteer 를 그대로 빌려 쓴다 —
 * 이 도구 때문에 프로젝트 의존성이 늘어나면 안 된다.
 *
 * 실행: node projects/wave-runner/tests/verify/course-map/run.mjs
 * 산출: projects/wave-runner/assets/screenshots/courses/*.png
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "../../..");
const REPO = path.resolve(PROJECT, "../..");
const OUT = path.join(PROJECT, "assets/screenshots/courses");
const PLAYTEST = path.join(REPO, ".playtest");

if (!existsSync(path.join(PLAYTEST, "node_modules/puppeteer"))) {
  console.error(
    "puppeteer 가 없다. 먼저 `pnpm playtest --project wave-runner` 를 한 번 돌려 .playtest/ 를 만들어라."
  );
  process.exit(1);
}
const require = createRequire(path.join(PLAYTEST, "noop.cjs"));
const puppeteer = require("puppeteer");

const work = mkdtempSync(path.join(tmpdir(), "wave-course-map-"));
const dataJs = path.join(work, "data.js");

console.log("[course-map] 12스테이지 × 16경로 솔브 …");
const ex = spawnSync("npx", ["tsx", path.join(HERE, "extract.ts"), dataJs], {
  cwd: REPO,
  stdio: "inherit"
});
if (ex.status !== 0) {
  rmSync(work, { recursive: true, force: true });
  process.exit(ex.status ?? 1);
}

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--use-gl=swiftshader"]
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(`file://${path.join(HERE, "page.html")}`, { waitUntil: "load", timeout: 120000 });
  await page.addScriptTag({ path: dataJs });
  await page.evaluate(() => window.renderAll());
  await page.waitForFunction("window.__ready === true", { timeout: 180000 });

  const canvases = await page.evaluate(() =>
    Array.from(document.querySelectorAll("canvas")).map((c) => ({ id: c.id, w: c.width, h: c.height }))
  );
  for (const { id, w, h } of canvases) {
    const el = await page.$(`#${id}`);
    await el.screenshot({ path: path.join(OUT, `${id}.png`) });
    console.log(`[course-map] ${id}.png  ${w}×${h}`);
  }
  if (errors.length) {
    console.error("[course-map] 페이지 오류:", errors);
    process.exitCode = 1;
  } else {
    console.log(`[course-map] ${canvases.length}장 → ${path.relative(REPO, OUT)}`);
  }
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
