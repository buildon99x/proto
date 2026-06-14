import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readAllProjects, repoRoot } from "./project-utils";

const outputPath = path.join(repoRoot, "packages", "registry", "src", "generated", "projects.ts");

async function main() {
  const projects = await readAllProjects();

  const source = `import type { ProjectMetadata } from "../schema";

export const projects = ${JSON.stringify(projects, null, 2)} as const satisfies readonly ProjectMetadata[];
`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");

  console.log(`Synced ${projects.length} project(s) to ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
