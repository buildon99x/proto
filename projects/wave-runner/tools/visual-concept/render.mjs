#!/usr/bin/env node
/* 컨셉 시안 HTML 을 PNG 로 굽는다.
 *
 *   node tools/visual-concept/render.mjs [--out <dir>] [--scale 1]
 *
 * 저장소의 플레이테스트 하니스(scripts/playtest)는 실제 앱을 띄우는 도구라
 * 여기 쓰지 않는다. 이 시안은 앱이 아니라 판(plate) 규칙을 그린 그림이고,
 * 정적 HTML 하나면 끝나므로 헤드리스 크로미움에 직접 건다. */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGES = [
  { file: "main-screen.html", out: "main-screen.png", w: 780, h: 1440 },
  { file: "play-screen.html", out: "play-screen.png", w: 780, h: 1440 }
];

/* headless_shell 을 먼저 찾는다. 일반 chrome 바이너리는 창 높이에서 87px 를
 * 브라우저 몫으로 떼어 가고, 캡처는 창 높이로 나오므로 문서 아래 띠가 통째로
 * 비어 나온다(발행 정보 줄이 사라졌다). headless_shell 은 뷰포트 = 창 크기다. */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome"
].filter(Boolean);

function findChrome() {
  const hit = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!hit) {
    throw new Error(
      "크로미움을 찾지 못했다. CHROME_PATH 로 실행 파일 경로를 넘겨라."
    );
  }
  return hit;
}

function parseArgs(argv) {
  const a = { out: resolve(HERE, "../../assets/references/silkscreen"), scale: 1 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") a.out = resolve(argv[++i]);
    else if (argv[i] === "--scale") a.scale = Number(argv[++i]);
  }
  return a;
}

function shot(chrome, page, args) {
  return new Promise((ok, fail) => {
    const p = spawn(chrome, [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      `--force-device-scale-factor=${args.scale}`,
      `--window-size=${page.w},${page.h}`,
      "--virtual-time-budget=2500",
      `--screenshot=${resolve(args.out, page.out)}`,
      `file://${resolve(HERE, page.file)}`
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => (code === 0 ? ok() : fail(new Error(err || `exit ${code}`))));
  });
}

const args = parseArgs(process.argv.slice(2));
mkdirSync(args.out, { recursive: true });
const chrome = findChrome();
for (const page of PAGES) {
  await shot(chrome, page, args);
  console.log(`구움: ${resolve(args.out, page.out)}`);
}
