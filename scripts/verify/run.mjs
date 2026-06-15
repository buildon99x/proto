#!/usr/bin/env node
// verify — 프로젝트 전체 테스트 과정을 한 번에 실행하는 오케스트레이터.
//
// 개별 명령(lint → build → playtest)을 순서대로 외워 치는 대신, 이 하나의 진입점이
// 전 과정을 돌리고 단계별 PASS/FAIL 통합 리포트를 낸다.
//
//   node scripts/verify/run.mjs --project <slug> [옵션]
//   pnpm verify --project <slug>
//
// 단계 (순차, 게이팅: 앞 단계가 실패하면 이후 단계는 skip)
//   1. lint      corepack pnpm --filter <slug> lint   (tsc --noEmit, 빠른 타입 선검사)
//   2. build     corepack pnpm --filter <slug> build  (tsc + vite build)
//   3. playtest  헤드리스 크롬 구동 + 스크린샷 + page/console 에러 수집
//                (2단계 산출 dist/ 재사용 → 중복 빌드 없음)
//
// 옵션
//   --project <slug>   (필수) projects/<slug>
//   --strict           playtest 콘솔 error도 실패로 처리
//   --port <n>         playtest 정적 서버 포트
//   --scenario <path>  playtest 시나리오 모듈
//   --base-url <url>   puppeteer 크롬 다운로드 호스트
//
// 산출물
//   - 콘솔 통합 요약(단계별 상태·시간)
//   - verify-report.json (스크린샷 출력 dir에 기록)
//   - 어느 단계든 실패하면 비0 종료코드.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runPlaytest, REPO_ROOT, DEFAULT_DL_BASE } from "../playtest/playtest.mjs";

// ── 인자 파싱 ───────────────────────────────────────────────
function parseArgs(argv) {
  const a = { strict: false, baseUrl: DEFAULT_DL_BASE };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--project") a.project = argv[++i];
    else if (k === "--strict") a.strict = true;
    else if (k === "--port") a.port = Number(argv[++i]);
    else if (k === "--scenario") a.scenario = argv[++i];
    else if (k === "--base-url") a.baseUrl = argv[++i];
  }
  return a;
}

const fmt = (ms) => `${(ms / 1000).toFixed(1)}s`;

function pnpmStage(project, script) {
  const started = Date.now();
  const r = spawnSync("corepack", ["pnpm", "--filter", project, script], {
    cwd: REPO_ROOT,
    stdio: "inherit"
  });
  return { passed: r.status === 0, ms: Date.now() - started };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    console.error("사용법: node scripts/verify/run.mjs --project <slug>");
    process.exit(2);
  }
  const { project } = args;
  console.log(`\n──── VERIFY: ${project} ────`);

  const stages = [
    { name: "lint", detail: "tsc", status: "skipped", ms: 0 },
    { name: "build", detail: "tsc + vite", status: "skipped", ms: 0 },
    { name: "playtest", detail: "", status: "skipped", ms: 0 }
  ];
  let playtestResult = null;

  // 1) lint
  console.log(`\n[verify] 1/3 lint …`);
  const lint = pnpmStage(project, "lint");
  stages[0].status = lint.passed ? "pass" : "fail";
  stages[0].ms = lint.ms;

  // 2) build (lint 통과 시)
  if (lint.passed) {
    console.log(`\n[verify] 2/3 build …`);
    const build = pnpmStage(project, "build");
    stages[1].status = build.passed ? "pass" : "fail";
    stages[1].ms = build.ms;

    // 3) playtest (build 통과 시, dist/ 재사용)
    if (build.passed) {
      console.log(`\n[verify] 3/3 playtest …`);
      const started = Date.now();
      try {
        playtestResult = await runPlaytest({
          project,
          build: false,
          strict: args.strict,
          port: args.port,
          scenario: args.scenario,
          baseUrl: args.baseUrl
        });
        stages[2].status = playtestResult.passed ? "pass" : "fail";
        stages[2].detail = `${playtestResult.screenshots.length} shots · ${playtestResult.pageErrors.length} err`;
      } catch (err) {
        stages[2].status = "fail";
        stages[2].detail = `오류: ${err.message}`;
      }
      stages[2].ms = Date.now() - started;
    }
  }

  // ── 통합 리포트 ──────────────────────────────────────────
  const overall = stages.every((s) => s.status === "pass");
  const icon = (s) => (s === "pass" ? "✅" : s === "fail" ? "❌" : "⏭️ ");

  console.log(`\n──── VERIFY: ${project} ────`);
  for (const s of stages) {
    const detail = s.detail ? s.detail : s.status === "skipped" ? "(앞 단계 실패로 skip)" : "";
    console.log(`${icon(s.status)} ${s.name.padEnd(10)} ${detail.padEnd(22)} ${s.status === "skipped" ? "" : fmt(s.ms)}`);
  }
  const shots = playtestResult ? playtestResult.screenshots.length : 0;

  // verify-report.json 기록(스크린샷 dir, 없으면 프로젝트 assets 기본 경로).
  // runPlaytest는 절대경로 outDir을 돌려준다.
  const outDir = playtestResult
    ? playtestResult.outDir
    : path.join(REPO_ROOT, "projects", project, "assets", "screenshots", "shots");
  mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, "verify-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        project,
        overall: overall ? "pass" : "fail",
        stages: stages.map((s) => ({ name: s.name, status: s.status, ms: s.ms, detail: s.detail })),
        screenshots: shots,
        pageErrors: playtestResult ? playtestResult.pageErrors : [],
        consoleErrors: playtestResult ? playtestResult.consoleErrors : [],
        verifiedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log(
    `overall: ${overall ? "✅ PASS" : "❌ FAIL"} → 스크린샷 ${shots}, report: ${path.relative(REPO_ROOT, reportPath)}`
  );
  process.exit(overall ? 0 : 1);
}

main().catch((err) => {
  console.error("[verify] 오류:", err.message);
  process.exit(1);
});
