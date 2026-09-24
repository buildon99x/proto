#!/usr/bin/env node
// 보고서를 한 번 찍어 본다 — 밝은 테마 데스크톱 전체, 어두운 테마 휴대폰 폭.
//   node snapshot.mjs REPORT.html OUT_DIR
// 차트 이름표 겹침·잘림은 데이터 검증으로 안 잡힌다. 게시 전에 한 번만 보고 한 번만 고친다.
import path from "node:path";
const [html, outDir] = process.argv.slice(2);
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = (await import("/opt/node22/lib/node_modules/playwright/index.js")).default); }
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
const errs = [];
for (const [name, vp, scheme] of [["light-desktop", { width: 1000, height: 900 }, "light"], ["dark-mobile", { width: 420, height: 900 }, "dark"]]) {
  const page = await browser.newPage({ viewport: vp, colorScheme: scheme });
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("file://" + path.resolve(html));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, `snapshot-${name}.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log(errs.length ? `페이지 오류: ${errs.join(" | ")}` : "페이지 오류 없음", "→", outDir);
