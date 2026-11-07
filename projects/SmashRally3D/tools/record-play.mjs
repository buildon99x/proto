import { createRequire } from "node:module";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const require = createRequire(path.resolve(".playtest/package.json")),
  p = require("puppeteer");
const label = process.argv[2] || "after",
  url = process.argv[3] || "http://127.0.0.1:5173/";
const out = path.resolve("projects/SmashRally3D/verification", label);
await mkdir(out, { recursive: true });
const b = await p.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await b.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForFunction(() => typeof window.smashDiagnostics === "function");
await page.select("#difficulty", "NORMAL");
await page.click('[data-action="start"]');
await page.waitForFunction(
  () => window.smashDiagnostics().phase === "SERVE_READY",
  { timeout: 15000 },
);
await page.screenshot({ path: path.join(out, "ready.png") });
const recorder = await page.screencast({
  path: path.join(out, "rally.webm"),
  format: "webm",
  fps: 20,
});
const read = () => page.evaluate(() => window.smashDiagnostics());
let d = await read();
const target = d.projectedTargets.find(
  (x) => x.world.x === 0 && x.world.z === 5.8,
).screen;
await page.mouse.click(target.x, target.y);
let cueBefore = false;
const deadline = Date.now() + 50000;
let captured = false;
while (Date.now() < deadline) {
  d = await read();
  if (d.phase === "SERVE_READY" && d.server === 0)
    await page.mouse.click(target.x, target.y);
  const cue = await page.$eval("#timing", (e) => e.textContent || "");
  if (cue.includes("HIT NOW") && !cueBefore) {
    await page.keyboard.down("Shift");
    await page.mouse.click(target.x, target.y);
    await page.keyboard.up("Shift");
  }
  cueBefore = cue.includes("HIT NOW");
  if (d.returns >= 3 && !captured) {
    await page.screenshot({ path: path.join(out, "rally.png") });
    captured = true;
  }
  await new Promise((r) => setTimeout(r, 25));
}
await recorder.stop();
await writeFile(
  path.join(out, "play.json"),
  JSON.stringify(
    {
      label,
      url,
      errors,
      final: d,
      method:
        "Real UI mouse events responding to visible HIT NOW; read-only telemetry observes outcomes, not internal timing; video is software Chromium, not physical-device latency or human play.",
    },
    null,
    2,
  ),
);
await b.close();
console.log(label, "recorded", d.returns, "returns", errors.length, "errors");
