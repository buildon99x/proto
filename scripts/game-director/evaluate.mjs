#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = { label: "current" };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--project") args.project = argv[++index];
    else if (argv[index] === "--label") args.label = argv[++index];
  }
  return args;
}

function criterion(name, weight, passed, evidence, recommendation) {
  return {
    name,
    weight,
    score: passed ? weight : 0,
    passed,
    evidence,
    recommendation: passed ? null : recommendation
  };
}

function requireMetrics(metrics, project) {
  const requiredBooleans = [
    "onboardingVisible",
    "remainingClicksVisible",
    "craftCompleted",
    "recommendationVisible",
    "recommendationExecuted",
    "saleIncreasedGold",
    "upgradeGoalVisible",
    "upgradePurchased",
    "mobileHasHorizontalOverflow",
    "mobileModalActionsReachable"
  ];
  const requiredNumbers = [
    "clicksToFirstCraft",
    "clicksToSecondCraft",
    "actionCount",
    "explainedActions",
    "goldBeforeSale",
    "goldAfterSale",
    "affordableUpgrades"
  ];
  const invalid = [
    ...requiredBooleans.filter((field) => typeof metrics[field] !== "boolean"),
    ...requiredNumbers.filter((field) => typeof metrics[field] !== "number")
  ];
  if (metrics.project !== project || metrics.schemaVersion !== 1 || invalid.length > 0) {
    throw new Error(`계측 스키마가 올바르지 않습니다: ${invalid.join(", ") || "project/schemaVersion"}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    throw new Error("사용법: node scripts/game-director/evaluate.mjs --project <slug> [--label <name>]");
  }

  const repoRoot = process.cwd();
  const outDir = path.join(repoRoot, "projects", args.project, "assets", "screenshots", "shots");
  const metricsPath = path.join(outDir, "gameplay-metrics.json");
  const playtestPath = path.join(outDir, "playtest-report.json");
  if (!existsSync(metricsPath) || !existsSync(playtestPath)) {
    throw new Error("플레이테스트 산출물이 없습니다. 먼저 프로젝트 playtest를 실행하세요.");
  }

  const metrics = JSON.parse(await readFile(metricsPath, "utf8"));
  const playtest = JSON.parse(await readFile(playtestPath, "utf8"));
  requireMetrics(metrics, args.project);
  const metricsAt = Date.parse(metrics.capturedAt);
  const playtestAt = Date.parse(playtest.capturedAt);
  const now = Date.now();
  const artifactsFresh =
    playtest.project === args.project &&
    Number.isFinite(metricsAt) &&
    Number.isFinite(playtestAt) &&
    playtestAt >= metricsAt &&
    playtestAt - metricsAt < 120_000 &&
    now - playtestAt < 600_000;
  if (!artifactsFresh) {
    throw new Error("계측값과 플레이테스트 리포트가 같은 최근 실행에서 생성되지 않았습니다.");
  }

  const coreLoopPassed =
    metrics.craftCompleted &&
    metrics.recommendationExecuted &&
    metrics.saleIncreasedGold &&
    metrics.upgradePurchased;
  const choicesExplained =
    metrics.actionCount === 4 &&
    metrics.explainedActions === 4 &&
    metrics.recommendationVisible &&
    metrics.recommendedAction === "분해";
  const growthClear =
    metrics.upgradeGoalVisible &&
    metrics.upgradeGoalText.length > 0 &&
    (metrics.affordableUpgrades > 0 || metrics.upgradeGoalText.includes("까지"));
  const stable =
    playtest.pageErrors.length === 0 &&
    playtest.consoleErrors.length === 0 &&
    !metrics.mobileHasHorizontalOverflow &&
    metrics.mobileModalActionsReachable;

  const criteria = [
    criterion(
      "첫 행동 명확성",
      20,
      metrics.onboardingVisible,
      metrics.onboardingVisible ? "현재 단계와 모루 클릭 안내가 표시됨" : "전용 첫 행동 안내가 없음",
      "첫 화면 중앙에 현재 목표와 즉시 수행할 행동을 표시하세요."
    ),
    criterion(
      "진행 예측 가능성",
      15,
      metrics.remainingClicksVisible,
      metrics.remainingClicksVisible
        ? `첫 제작에 필요한 예상 클릭 수를 표시함(실측 ${metrics.clicksToFirstCraft}회)`
        : `게이지만 표시되며 남은 행동량은 알 수 없음(실측 ${metrics.clicksToFirstCraft}회)`,
      "진행 영역에 첫 제작까지 남은 예상 클릭 수를 표시하세요."
    ),
    criterion(
      "핵심 루프 완결성",
      25,
      coreLoopPassed,
      `제작=${metrics.craftCompleted}, 추천 실행=${metrics.recommendationExecuted}, 판매 골드=${metrics.goldBeforeSale}→${metrics.goldAfterSale}, 업그레이드=${metrics.upgradePurchased}`,
      "추천 행동, 제작·판매, 업그레이드 구매가 한 흐름에서 모두 완료되도록 수정하세요."
    ),
    criterion(
      "선택 이해도",
      20,
      choicesExplained,
      `선택 ${metrics.actionCount}개, 목적 설명 ${metrics.explainedActions}개, 추천=${metrics.recommendationVisible}`,
      "네 선택에 목적 설명을 추가하고 현재 상황에 맞는 추천 선택을 표시하세요."
    ),
    criterion(
      "성장 목표 명확성",
      10,
      growthClear,
      `구매 가능 ${metrics.affordableUpgrades}개, 목표 안내=${metrics.upgradeGoalVisible}, 문구=${metrics.upgradeGoalText}`,
      "구매 가능한 업그레이드와 다음 업그레이드까지 필요한 골드를 함께 표시하세요."
    ),
    criterion(
      "런타임 안정성",
      10,
      stable,
      `page errors ${playtest.pageErrors.length}, console errors ${playtest.consoleErrors.length}, mobile overflow=${metrics.mobileHasHorizontalOverflow}, modal reachable=${metrics.mobileModalActionsReachable}`,
      "페이지·콘솔 오류와 모바일 넘침 또는 접근 불가능한 모달 동작을 제거하세요."
    )
  ];

  const score = criteria.reduce((sum, item) => sum + item.score, 0);
  const requiredCriteriaPassed = coreLoopPassed && stable;
  const report = {
    project: args.project,
    label: args.label,
    score,
    maximumScore: 100,
    verdict: score >= 75 && requiredCriteriaPassed ? "pass" : "improve",
    requiredCriteriaPassed,
    criteria,
    priorities: criteria
      .filter((item) => !item.passed)
      .sort((a, b) => b.weight - a.weight)
      .map((item) => ({ criterion: item.name, weight: item.weight, action: item.recommendation })),
    metrics,
    evaluatedAt: new Date().toISOString()
  };

  await mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, `director-report-${args.label}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nAI GAME DIRECTOR — ${args.project} [${args.label}]`);
  for (const item of criteria) {
    console.log(`${item.passed ? "✅" : "❌"} ${item.name}: ${item.score}/${item.weight} — ${item.evidence}`);
  }
  console.log(`총점: ${score}/100 · 판정: ${report.verdict.toUpperCase()}`);
  console.log(`리포트: ${path.relative(repoRoot, reportPath)}`);
}

main().catch((error) => {
  console.error(`[game-director] ${error.message}`);
  process.exitCode = 1;
});
