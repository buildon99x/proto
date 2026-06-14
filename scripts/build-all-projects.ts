import { mkdir, rm } from "node:fs/promises";
import { launcherRunsDir, readAllProjects, runPnpm } from "./project-utils";

async function main() {
  const projects = await readAllProjects();

  await rm(launcherRunsDir, { recursive: true, force: true });
  await mkdir(launcherRunsDir, { recursive: true });

  for (const project of projects) {
    if (project.runtime === "static-artifact") {
      await runPnpm(["build:project", "--", project.id]);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
