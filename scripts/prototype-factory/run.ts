import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectMetadata } from "../../packages/registry/src/schema";
import { copyDirectory, repoRoot, runCommand, runPnpm, writeJson } from "../project-utils";
import {
  createAiBlueprint,
  createOfflineBlueprint,
  readBlueprint,
  type FactoryBlueprint
} from "./blueprint";
import {
  renderApp,
  renderBrief,
  renderEval,
  renderReadme,
  renderScenario,
  renderSpec,
  renderStyles
} from "./templates";

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

function projectMetadata(blueprint: FactoryBlueprint): ProjectMetadata {
  return {
    id: blueprint.slug,
    name: blueprint.name,
    status: "prototype",
    type: "demo",
    runtime: "static-artifact",
    summary: blueprint.pitch,
    tags: blueprint.tags,
    projectRoot: `projects/${blueprint.slug}`,
    entry: { kind: "iframe", path: `/runs/${blueprint.slug}/index.html` },
    docs: {
      brief: "brief.md",
      spec: "spec.md",
      eval: "eval.md",
      readme: "README.md",
      changelog: "changelog.md"
    },
    assets: {},
    commands: {
      dev: `pnpm --filter ${blueprint.slug} dev`,
      build: `pnpm --filter ${blueprint.slug} build`,
      test: `pnpm --filter ${blueprint.slug} test`
    }
  };
}

async function writeProject(blueprint: FactoryBlueprint, prompt: string, source: string) {
  const templateRoot = path.join(repoRoot, "templates", "vite-react-project");
  const projectRoot = path.join(repoRoot, "projects", blueprint.slug);
  if (existsSync(projectRoot)) throw new Error(`Project already exists: projects/${blueprint.slug}`);

  await copyDirectory(templateRoot, projectRoot);
  await writeJson(path.join(projectRoot, "project.json"), projectMetadata(blueprint));
  await writeJson(path.join(projectRoot, "app", "package.json"), {
    name: blueprint.slug,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite --host 127.0.0.1",
      build: "tsc && vite build",
      lint: "tsc --noEmit",
      test: "tsc --noEmit"
    },
    dependencies: {
      "@types/react": "^18.3.18",
      "@types/react-dom": "^18.3.5",
      "@vitejs/plugin-react": "^4.3.4",
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      typescript: "^5.7.3",
      vite: "^6.0.7"
    }
  });
  const indexPath = path.join(projectRoot, "app", "index.html");
  const indexHtml = (await readFile(indexPath, "utf8")).replace("Template Project", blueprint.name);
  await writeFile(indexPath, indexHtml, "utf8");

  await Promise.all([
    writeFile(path.join(projectRoot, "brief.md"), renderBrief(blueprint), "utf8"),
    writeFile(path.join(projectRoot, "spec.md"), renderSpec(blueprint), "utf8"),
    writeFile(path.join(projectRoot, "eval.md"), renderEval(blueprint), "utf8"),
    writeFile(path.join(projectRoot, "README.md"), renderReadme(blueprint), "utf8"),
    writeFile(path.join(projectRoot, "changelog.md"), `# Changelog\n\n- Generated by AI Prototype Factory (${source}).\n`, "utf8"),
    writeFile(path.join(projectRoot, "app", "src", "App.tsx"), renderApp(blueprint), "utf8"),
    writeFile(path.join(projectRoot, "app", "src", "styles.css"), renderStyles(blueprint.theme), "utf8"),
    writeFile(path.join(projectRoot, "tests", "e2e", "scenario.mjs"), renderScenario(blueprint), "utf8")
  ]);
  await mkdir(path.join(projectRoot, "data"), { recursive: true });
  await writeJson(path.join(projectRoot, "data", "factory-blueprint.json"), blueprint);
  await mkdir(path.join(projectRoot, "prompts"), { recursive: true });
  await writeFile(
    path.join(projectRoot, "prompts", "initial-request.md"),
    `# Initial Request\n\n${prompt}\n\n## Blueprint source\n\n${source}\n`,
    "utf8"
  );
  return projectRoot;
}

async function writeReport(projectRoot: string, report: unknown) {
  const outDir = path.join(projectRoot, "assets", "screenshots", "shots");
  await mkdir(outDir, { recursive: true });
  await writeJson(path.join(outDir, "factory-report.json"), report);
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
        const savedBlueprint = JSON.parse(
          await readFile(path.join(existingRoot, "data", "factory-blueprint.json"), "utf8")
        );
        if (JSON.stringify(savedBlueprint) !== JSON.stringify(blueprint)) {
          throw new Error("existing project blueprint does not match the requested blueprint");
        }
        projectRoot = existingRoot;
        return `resumed ${path.relative(repoRoot, existingRoot)}`;
      }
      projectRoot = await writeProject(blueprint as FactoryBlueprint, args.prompt ?? (blueprint as FactoryBlueprint).pitch, source);
      return path.relative(repoRoot, projectRoot);
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
    await writeReport(projectRoot as string, report);
    console.log(`\n[factory] PASS — projects/${(blueprint as FactoryBlueprint).slug}`);
    for (const stage of stages) console.log(`${stage.status === "pass" ? "✅" : "⏭"} ${stage.name}: ${stage.detail}`);
  } catch (error) {
    if (projectRoot && blueprint) {
      await writeReport(projectRoot, {
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
