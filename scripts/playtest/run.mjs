#!/usr/bin/env node
// 재사용 가능한 브라우저 플레이테스트 + 스크린샷 하니스 (CLI 래퍼).
//
// 코어 로직은 `scripts/playtest/playtest.mjs`(runPlaytest)에 있다. 이 파일은
// 인자를 파싱해 호출하고 결과를 출력/종료코드로 변환하는 얇은 래퍼다.
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

import { runPlaytest, DEFAULT_DL_BASE } from "./playtest.mjs";

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    console.error("사용법: node scripts/playtest/run.mjs --project <slug>");
    process.exit(2);
  }

  const { passed, screenshots, pageErrors, consoleErrors, report } = await runPlaytest(args);

  console.log("\n──────── PLAYTEST 결과 ────────");
  console.log(`프로젝트: ${args.project}`);
  console.log(`스크린샷: ${screenshots.length}장 → ${report.outDir}`);
  console.log(`page errors: ${pageErrors.length}${pageErrors.length ? "\n  " + pageErrors.join("\n  ") : ""}`);
  console.log(`console errors: ${consoleErrors.length}${args.strict ? " (strict)" : " (비치명)"}`);
  console.log(`판정: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("[playtest] 오류:", err.message);
  process.exit(1);
});
