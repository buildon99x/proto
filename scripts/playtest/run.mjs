#!/usr/bin/env node
// 재사용 가능한 브라우저 플레이테스트 + 스크린샷 하니스.
//
// 어떤 프로젝트(projects/<slug>/app, Vite 빌드 산출물)든 헤드리스 크롬으로
// 실제 구동하며 화면을 캡처하고 콘솔/페이지 에러를 수집한다.
//
//   node scripts/playtest/run.mjs --project <slug> [옵션]
//   pnpm playtest --project <slug>
//
// 옵션
//   --project <slug>   (필수) projects/<slug>
//   --out <dir>        스크린샷 출력 dir (기본 projects/<slug>/assets/screenshots/shots)
//   --scenario <path>  시나리오 모듈 (기본 projects/<slug>/tests/e2e/scenario.mjs, 없으면 기본 시나리오)
//   --port <n>         정적 서버 포트 (기본 4319)
//   --no-build         빌드 건너뛰기(기존 dist/ 사용)
//   --strict           콘솔 error도 실패로 처리(기본은 page error/uncaught만 실패)
//   --base-url <url>   puppeteer 크롬 다운로드 호스트(기본: chrome-for-testing 공개 버킷)
//
// 설계 노트
// - 브라우저 도구(puppeteer)는 프로젝트/루트 package.json에 넣지 않는다. postinstall이
//   크롬을 받아 `pnpm install --frozen-lockfile`(Vercel) 빌드를 깨뜨릴 수 있기 때문.
//   대신 .playtest/(gitignore)에 격리 설치하고 크롬은 ~/.cache/puppeteer에 캐시한다.
// - 정적 서버는 dist/를 직접 서빙(SPA 폴백) — vite preview 의존 없이 어떤 빌드든 동작.

import { spawnSync } from "node:child_process";
import http from "node:http";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");
const PLAYTEST_DIR = path.join(REPO_ROOT, ".playtest");
const DEFAULT_DL_BASE = "https://storage.googleapis.com/chrome-for-testing-public";
const CHROME_FLAGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-gpu",
  "--use-gl=swiftshader",
  "--enable-webgl",
  "--ignore-gpu-blocklist"
];

// ── 인자 파싱 ───────────────────────────────────────────────
function parseArgs(argv) {
  const a = { port: 4319, build: true, strict: false, baseUrl: DEFAULT_DL_BASE };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--project") a.project = argv[++i];
    else if (k === "--out") a.out = argv[++i];
    else if (k === "--scenario") a.scenario = argv[++i];
    else if (k === "--port") a.port = Number(argv[++i]);
    else if (k === "--no-build") a.build = false;
    else if (k === "--strict") a.strict = true;
    else if (k === "--base-url") a.baseUrl = argv[++i];
  }
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 브라우저 도구 보장(격리 설치) ──────────────────────────
function ensureBrowser(baseUrl) {
  const req = createRequire(path.join(PLAYTEST_DIR, "noop.cjs"));
  try {
    req.resolve("puppeteer");
    return req;
  } catch {
    /* 설치 필요 */
  }
  console.log("[playtest] puppeteer 격리 설치 (.playtest/) …");
  mkdirSync(PLAYTEST_DIR, { recursive: true });
  const pkg = path.join(PLAYTEST_DIR, "package.json");
  if (!existsSync(pkg)) {
    writeFileSync(pkg, JSON.stringify({ name: "playtest-tools", private: true, version: "0.0.0" }, null, 2));
  }
  const res = spawnSync("npm", ["install", "puppeteer@^25", "--no-fund", "--no-audit", "--loglevel=error"], {
    cwd: PLAYTEST_DIR,
    stdio: "inherit",
    env: { ...process.env, PUPPETEER_DOWNLOAD_BASE_URL: baseUrl }
  });
  if (res.status !== 0) {
    throw new Error(
      "puppeteer 설치 실패. 네트워크 정책에서 크롬 다운로드 호스트가 막혔을 수 있습니다.\n" +
        `현재 호스트: ${baseUrl}\n` +
        "다른 미러가 허용되면 --base-url 로 지정하세요."
    );
  }
  return createRequire(path.join(PLAYTEST_DIR, "noop.cjs"));
}

// ── 정적 서버(dist/ SPA 폴백) ──────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".map": "application/json"
};

function startStaticServer(rootDir, startPort) {
  const server = http.createServer(async (reqMsg, resMsg) => {
    try {
      const urlPath = decodeURIComponent((reqMsg.url || "/").split("?")[0]);
      let filePath = path.join(rootDir, urlPath);
      // 경로 이탈 방지.
      if (!filePath.startsWith(rootDir)) {
        resMsg.writeHead(403).end();
        return;
      }
      let body;
      try {
        if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
        body = await readFile(filePath);
      } catch {
        // SPA 폴백.
        filePath = path.join(rootDir, "index.html");
        body = await readFile(filePath);
      }
      resMsg.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      resMsg.end(body);
    } catch {
      resMsg.writeHead(404).end();
    }
  });
  // 점유 중이면 다음 포트로(최대 +20). 스테일 서버에 막히지 않게.
  return new Promise((resolve, reject) => {
    let port = startPort;
    const tryListen = () => {
      server.once("error", (err) => {
        if (err.code === "EADDRINUSE" && port < startPort + 20) {
          port += 1;
          tryListen();
        } else {
          reject(err);
        }
      });
      server.listen(port, "127.0.0.1", () => resolve({ server, port }));
    };
    tryListen();
  });
}

// ── 시나리오 헬퍼 ──────────────────────────────────────────
function makeHelpers(page, outDir, manifest) {
  async function shot(name) {
    const file = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: file });
    manifest.push(name);
    console.log("[playtest] shot:", name);
  }
  async function clickText(text, { timeout = 4000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const handle = await page.evaluateHandle((t) => {
        const els = [...document.querySelectorAll("button, a, [role=button], .dragon-card, .difficulty-card")];
        return els.find((e) => e.textContent && e.textContent.includes(t)) || null;
      }, text);
      const el = handle.asElement();
      if (el) {
        await el.click();
        await handle.dispose();
        return true;
      }
      await handle.dispose();
      await sleep(120);
    }
    throw new Error(`clickText: 찾지 못함 "${text}"`);
  }
  return { page, sleep, shot, clickText, log: (...m) => console.log("[scenario]", ...m) };
}

// 프로젝트가 시나리오를 제공하지 않을 때의 기본 시나리오(로드 + 타임랩스 캡처).
async function defaultScenario({ page, sleep, shot }) {
  await sleep(800);
  await shot("01-load");
  await sleep(2500);
  await shot("02-after");
}

// ── 메인 ───────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    console.error("사용법: node scripts/playtest/run.mjs --project <slug>");
    process.exit(2);
  }
  const projectRoot = path.join(REPO_ROOT, "projects", args.project);
  const distDir = path.join(projectRoot, "app", "dist");
  const outDir = args.out ? path.resolve(args.out) : path.join(projectRoot, "assets", "screenshots", "shots");
  mkdirSync(outDir, { recursive: true });

  // 1) 빌드.
  if (args.build) {
    console.log(`[playtest] 빌드: ${args.project}`);
    const b = spawnSync("corepack", ["pnpm", "--filter", args.project, "build"], {
      cwd: REPO_ROOT,
      stdio: "inherit"
    });
    if (b.status !== 0) throw new Error("프로젝트 빌드 실패");
  }
  if (!existsSync(path.join(distDir, "index.html"))) {
    throw new Error(`dist 산출물이 없습니다: ${distDir} (--no-build를 뺐는지 확인)`);
  }

  // 2) 브라우저 도구 + 정적 서버.
  const req = ensureBrowser(args.baseUrl);
  const puppeteer = req("puppeteer");
  const { server, port } = await startStaticServer(distDir, args.port);
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[playtest] 서빙 ${distDir} → ${baseUrl}`);

  // 3) 시나리오 로딩.
  const scenarioPath = args.scenario
    ? path.resolve(args.scenario)
    : path.join(projectRoot, "tests", "e2e", "scenario.mjs");
  let scenarioMod = { run: defaultScenario, meta: {} };
  if (existsSync(scenarioPath)) {
    scenarioMod = await import(pathToFileURL(scenarioPath).href);
    console.log(`[playtest] 시나리오: ${path.relative(REPO_ROOT, scenarioPath)}`);
  } else {
    console.log("[playtest] 기본 시나리오 사용(프로젝트 시나리오 없음)");
  }
  const meta = scenarioMod.meta || {};
  const viewport = meta.viewport || { width: 1024, height: 768, deviceScaleFactor: 1 };

  // 4) 구동 + 캡처.
  const pageErrors = [];
  const consoleErrors = [];
  const manifest = [];
  const browser = await puppeteer.launch({ headless: true, args: CHROME_FLAGS });
  let passed = false;
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    page.on("pageerror", (e) => pageErrors.push(String(e.message || e)));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    await page.goto(baseUrl, { waitUntil: "networkidle0" });

    const helpers = makeHelpers(page, outDir, manifest);
    const run = scenarioMod.run || defaultScenario;
    await run({ ...helpers, baseUrl });

    passed = pageErrors.length === 0 && (!args.strict || consoleErrors.length === 0);
  } finally {
    await browser.close();
    server.close();
  }

  // 5) 리포트.
  const report = {
    project: args.project,
    passed,
    screenshots: manifest,
    outDir: path.relative(REPO_ROOT, outDir),
    pageErrors,
    consoleErrors,
    capturedAt: new Date().toISOString()
  };
  writeFileSync(path.join(outDir, "playtest-report.json"), JSON.stringify(report, null, 2));

  console.log("\n──────── PLAYTEST 결과 ────────");
  console.log(`프로젝트: ${args.project}`);
  console.log(`스크린샷: ${manifest.length}장 → ${report.outDir}`);
  console.log(`page errors: ${pageErrors.length}${pageErrors.length ? "\n  " + pageErrors.join("\n  ") : ""}`);
  console.log(`console errors: ${consoleErrors.length}${args.strict ? " (strict)" : " (비치명)"}`);
  console.log(`판정: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("[playtest] 오류:", err.message);
  process.exit(1);
});
