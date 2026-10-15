import { createRequire } from "node:module";
import http from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const require = createRequire(path.resolve(".playtest/package.json")),
  puppeteer = require("puppeteer");
const root = path.resolve(
    process.env.SMASH_DIST || "projects/SmashRally3D/app/dist",
  ),
  out = path.resolve(process.env.SMASH_EVIDENCE_DIR || "projects/SmashRally3D/assets/screenshots/shots");
await mkdir(out, { recursive: true });
const server = http
  .createServer(async (req, res) => {
    try {
      const p = path.join(root, (req.url || "/").split("?")[0]);
      const ext = path.extname(p);
      res.setHeader(
        "content-type",
        ext === ".js"
          ? "text/javascript"
          : ext === ".css"
            ? "text/css"
            : "text/html",
      );
      res.end(await readFile(ext ? p : path.join(p, "index.html")));
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(Number(process.env.SMASH_PORT || 4330), "127.0.0.1");
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
  protocolTimeout: 120000,
});
const page = await browser.newPage();
const scenario = await import(
  pathToFileURL(
    path.resolve(
      process.argv[2] || "projects/SmashRally3D/tests/e2e/scenario.mjs",
    ),
  )
);
await page.setViewport(scenario.meta?.viewport || { width: 1280, height: 720 });
const indexBytes = await readFile(path.join(root, "index.html"));
const sourceBundle = indexBytes.toString().match(/src="([^"]+\.js)"/)?.[1];
const sourceHash = sourceBundle
  ? createHash("sha256")
      .update(await readFile(path.join(root, sourceBundle)))
      .digest("hex")
  : null;
const buildEvidence = {
  sourceBundle,
  sha256: sourceHash,
  startedAt: new Date().toISOString(),
  renderer:
    "Chromium151 headless Angle SwiftShader (software); not a physical-device FPS measurement",
};
const errors = [];
page.on("pageerror", (e) => {
  errors.push(String(e));
  console.log("PAGE ERROR", String(e));
});
page.on("console", (m) => {
  if (m.type() === "error") {
    errors.push(m.text());
    console.log("CONSOLE ERROR", m.text());
  }
});
const logs = [];
try {
  await page.goto(`http://127.0.0.1:${process.env.SMASH_PORT || 4330}`);
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(out, "00-boot.png") });
  console.log("BOOT TEXT", await page.$eval("body", (e) => e.innerText));
  const { run } = scenario;
  await run({
    page,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    shot: async (n) => {
      await page.screenshot({ path: path.join(out, n + ".png") });
      console.log("SHOT", n);
    },
    log: (...v) => {
      logs.push(
        v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "),
      );
      console.log(...v);
    },
  });
  if (errors.length) throw new Error("Runtime errors: " + errors.join("\n"));
  await writeFile(
    path.join(
      out,
      (process.argv[2] ? path.basename(process.argv[2], ".mjs") : "ui") +
        "-report.json",
    ),
    JSON.stringify({ pass: true, buildEvidence, errors, logs }, null, 2),
  );
} catch (e) {
  console.error(String(e));
  await writeFile(
    path.join(
      out,
      (process.argv[2] ? path.basename(process.argv[2], ".mjs") : "ui") +
        "-report.json",
    ),
    JSON.stringify(
      { pass: false, buildEvidence, errors, logs, failure: String(e) },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
