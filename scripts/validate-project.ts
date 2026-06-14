import { readAllProjects } from "./project-utils";

async function main() {
  const projects = await readAllProjects();

  if (projects.length === 0) {
    throw new Error("No projects found under projects/*/project.json");
  }

  for (const project of projects) {
    console.log(`Validated ${project.id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
