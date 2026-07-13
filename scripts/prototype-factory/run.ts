import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { repoRoot, runCommand, runPnpm, writeJson } from "../project-utils";
import {
  createAiBlueprint,
  createOfflineBlueprint,
  readBlueprint,
  type FactoryBlueprint
} from "./blueprint";
import { readSavedBlueprint, writeProjectAtomically } from "./scaffold";

type FactoryArgs = {
  name?: string;
  prompt?: string;
  blueprint?: string;
  offline: boolean;
  verify: boolean;
  dryRun: boolean;
  resume: boolean;
};

type Stage = { name: string; status: "pass" | "fail" | "skipped"; ms: number; detail: string };

function parseArgs(argv: string[]): FactoryArgs {
  const args: FactoryArgs = { offline: false, verify: true, dryRun: false, resume: false };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--") continue;
    if (item === "--name") args.name = argv[++index];
    else if (item === "--prompt") args.prompt = argv[++index];
    else if (item === "--blueprint") args.blueprint = argv[++index];
    else if (item === "--offline") args.offline = true;
    else if (item === "--no-verify") args.verify = false;
    else if (item === "--dry-run") args.dryRun = true;
    else if (item === "--resume") args.resume = true;
    else throw new Error(`Unknown option: ${item}`);
  }
  if (!args.blueprint && (!args.name || !args.prompt)) {
    throw new Error('Usage: pnpm prototype:factory -- --name "Project Name" --prompt "one-line idea" [--offline]');
  }
  return args;
}

async function timedStage(stages: Stage[], name: string, task: () => Promise<string>) {
  const startedAt = Date.now();
  try {
    const detail = await task();
    stages.push({ name, status: "pass", ms: Date.now() - startedAt, detail });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    stages.push({ name, status: "fail", ms: Date.now() - startedAt, detail });
    throw error;
  }
}

async function resolveBlueprint(args: FactoryArgs) {
  if (args.blueprint) return readBlueprint(path.resolve(args.blueprint));
  const name = args.name as string;
  const prompt = args.prompt as string;
  if (args.offline || !process.env.OPENAI_API_KEY) {
    if (!args.offline) console.log("[factory] OPENAI_API_KEY 없음 — 재현 가능한 오프라인 블루프린트를 사용합니다.");
    return createOfflineBlueprint(name, prompt);
  }
  return createAiBlueprint(name, prompt);
}

async function writeReport(projectRoot: string | undefined, slug: string, report: unknown) {
  const runReportDir = path.join(repoRoot, ".factory-reports");
  await mkdir(runReportDir, { recursive: true });
  await writeJson(path.join(runReportDir, `${slug}.json`), report);
  if (projectRoot) {
    const outDir = path.join(projectRoot, "assets", "screenshots", "shots");
    await mkdir(outDir, { recursive: true });
    await writeJson(path.join(outDir, "factory-report.json"), report);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stages: Stage[] = [];
  let blueprint: FactoryBlueprint | undefined;
  let projectRoot: string | undefined;
  const startedAt = new Date().toISOString();

  try {
    await timedStage(stages, "blueprint", async () => {
      blueprint = await resolveBlueprint(args);
      return `${args.blueprint ? "file" : args.offline || !process.env.OPENAI_API_KEY ? "offline" : "openai"}: ${blueprint.slug}`;
    });

    if (args.dryRun) {
      console.log(JSON.stringify(blueprint, null, 2));
      return;
    }

    const source = args.blueprint ? `file:${path.resolve(args.blueprint)}` : args.offline || !process.env.OPENAI_API_KEY ? "offline" : "openai";
    await timedStage(stages, "scaffold", async () => {
      const existingRoot = path.join(repoRoot, "projects", (blueprint as FactoryBlueprint).slug);
      if (args.resume && existsSync(existingRoot)) {
        const savedBlueprint = await readSavedBlueprint(existingRoot);
        if (JSON.stringify(savedBlueprint) !== JSON.stringify(blueprint)) {
          throw new Error("existing project blueprint does not match the requested blueprint");
        }
        projectRoot = existingRoot;
        return `resumed ${path.relative(repoRoot, existingRoot)}`;
      }
      projectRoot = await writeProjectAtomically(
        blueprint as FactoryBlueprint,
        args.prompt ?? (blueprint as FactoryBlueprint).pitch,
        source
      );
      return path.relative(repoRoot, projectRoot as string);
    });

    await timedStage(stages, "registry", async () => {
      await runPnpm(["sync:registry"]);
      return "launcher registry synchronized";
    });

    await timedStage(stages, "dependencies", async () => {
      await runPnpm(["install", "--no-frozen-lockfile"]);
      return "workspace dependencies linked and lockfile updated";
    });

    if (args.verify) {
      await timedStage(stages, "build", async () => {
        await runPnpm(["--filter", (blueprint as FactoryBlueprint).slug, "build"]);
        return "TypeScript and Vite production build passed";
      });
      await timedStage(stages, "playtest", async () => {
        await runCommand("node", [
          "scripts/playtest/run.mjs",
          "--project",
          (blueprint as FactoryBlueprint).slug,
          "--no-build",
          "--strict"
        ]);
        const reportPath = path.join(projectRoot as string, "assets", "screenshots", "shots", "playtest-report.json");
        const metricsPath = path.join(projectRoot as string, "assets", "screenshots", "shots", "factory-metrics.json");
        const playtest = JSON.parse(await readFile(reportPath, "utf8"));
        const metrics = JSON.parse(await readFile(metricsPath, "utf8"));
        if (!playtest.passed || !metrics.resourceIncreased || !metrics.upgraded || !metrics.goalReached || metrics.mobileOverflow) {
          throw new Error("browser scenario metrics did not satisfy the factory gates");
        }
        return `${playtest.screenshots.length} screenshots, core loop and mobile gates passed`;
      });
    } else {
      stages.push({ name: "build", status: "skipped", ms: 0, detail: "--no-verify" });
      stages.push({ name: "playtest", status: "skipped", ms: 0, detail: "--no-verify" });
    }

    const report = {
      project: (blueprint as FactoryBlueprint).slug,
      status: "pass",
      startedAt,
      completedAt: new Date().toISOString(),
      stages,
      blueprint
    };
    await writeReport(projectRoot, (blueprint as FactoryBlueprint).slug, report);
    console.log(`\n[factory] PASS — projects/${(blueprint as FactoryBlueprint).slug}`);
    for (const stage of stages) console.log(`${stage.status === "pass" ? "✅" : "⏭"} ${stage.name}: ${stage.detail}`);
  } catch (error) {
    if (blueprint) {
      await writeReport(projectRoot, blueprint.slug, {
        project: blueprint.slug,
        status: "fail",
        startedAt,
        completedAt: new Date().toISOString(),
        stages,
        error: error instanceof Error ? error.message : String(error),
        blueprint
      });
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(`[factory] FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
