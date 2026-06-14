import { existsSync } from "node:fs";
import path from "node:path";
import { copyDirectory, launcherRunsDir, readAllProjects, repoRoot, runPnpm } from "./project-utils";

const projectId = process.argv.slice(2).find((arg) => arg !== "--");

async function main() {
  if (!projectId) {
    throw new Error("Usage: pnpm build:project -- <project-id>");
  }

  const project = (await readAllProjects()).find((item) => item.id === projectId);

  if (!project) {
    throw new Error(`Unknown project: ${projectId}`);
  }

  if (project.runtime !== "static-artifact") {
    throw new Error(`Unsupported runtime for ${project.id}: ${project.runtime}`);
  }

  const appRoot = path.join(repoRoot, project.projectRoot, "app");
  const distDir = path.join(appRoot, "dist");
  const runDir = path.join(launcherRunsDir, project.id);

  await runPnpm(["--dir", appRoot, "build"]);

  if (!existsSync(distDir)) {
    throw new Error(`${path.relative(repoRoot, distDir)} was not created`);
  }

  await copyDirectory(distDir, runDir);
  console.log(`Copied ${project.id} build to ${path.relative(repoRoot, runDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
