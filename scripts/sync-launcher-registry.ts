import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gitLastCommitISO, readAllProjects, repoRoot } from "./project-utils";
import type { ProjectMetadata } from "../packages/registry/src/schema";

const outputPath = path.join(repoRoot, "packages", "registry", "src", "generated", "projects.ts");

/**
 * Loads the `updatedAt` values from the previously generated registry so they
 * survive environments where `git log` cannot see the relevant commit (for
 * example a shallow CI clone). Fresh git timestamps always take precedence.
 */
async function readPreviousUpdatedAt(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const module = (await import(pathToFileURL(outputPath).href)) as {
      projects?: readonly ProjectMetadata[];
    };
    for (const project of module.projects ?? []) {
      if (project.updatedAt) {
        map.set(project.id, project.updatedAt);
      }
    }
  } catch {
    // No previously generated registry (or it is unreadable); git will supply
    // fresh timestamps.
  }
  return map;
}

async function main() {
  const projects = await readAllProjects();
  const previousUpdatedAt = await readPreviousUpdatedAt();

  const enriched: ProjectMetadata[] = projects.map((project) => {
    const projectRoot = path.join(repoRoot, project.projectRoot);
    const updatedAt = gitLastCommitISO(projectRoot) ?? previousUpdatedAt.get(project.id);
    return updatedAt ? { ...project, updatedAt } : project;
  });

  const source = `import type { ProjectMetadata } from "../schema";

export const projects = ${JSON.stringify(enriched, null, 2)} as const satisfies readonly ProjectMetadata[];
`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");

  console.log(`Synced ${enriched.length} project(s) to ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
