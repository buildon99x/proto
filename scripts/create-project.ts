import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  copyDirectory,
  repoRoot,
  runPnpm,
  slugify,
  writeJson
} from "./project-utils";
import type { ProjectMetadata } from "../packages/registry/src/schema";

function readNameArg(): string {
  const nameIndex = process.argv.indexOf("--name");
  if (nameIndex === -1 || !process.argv[nameIndex + 1]) {
    throw new Error('Usage: pnpm create:project -- --name "Customer Insight Dashboard"');
  }
  return process.argv[nameIndex + 1];
}

async function replaceInFile(filePath: string, replacements: Record<string, string>) {
  let content = await readFile(filePath, "utf8");
  for (const [from, to] of Object.entries(replacements)) {
    content = content.replaceAll(from, to);
  }
  await writeFile(filePath, content, "utf8");
}

const name = readNameArg();
const slug = slugify(name);

async function main() {
  if (!slug) {
    throw new Error("Project name must contain at least one letter or number");
  }

  const templateRoot = path.join(repoRoot, "templates", "vite-react-project");
  const projectRoot = path.join(repoRoot, "projects", slug);

  if (existsSync(projectRoot)) {
    throw new Error(`Project already exists: projects/${slug}`);
  }

  await copyDirectory(templateRoot, projectRoot);

  const metadata: ProjectMetadata = {
    id: slug,
    name,
    status: "prototype",
    type: "webapp",
    runtime: "static-artifact",
    version: "0.1.0",
    summary: `${name} prototype.`,
    tags: ["prototype"],
    projectRoot: `projects/${slug}`,
    entry: {
      kind: "iframe",
      path: `/runs/${slug}/index.html`
    },
    docs: {
      brief: "brief.md",
      spec: "spec.md",
      eval: "eval.md",
      readme: "README.md",
      changelog: "changelog.md"
    },
    assets: {
      cover: "assets/screenshots/cover.png"
    },
    commands: {
      dev: `pnpm --filter ${slug} dev`,
      build: `pnpm --filter ${slug} build`,
      test: `pnpm --filter ${slug} test`
    }
  };

  await writeJson(path.join(projectRoot, "project.json"), metadata);
  await writeJson(path.join(projectRoot, "app", "package.json"), {
    name: slug,
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
      "@vitejs/plugin-react": "^4.3.4",
      vite: "^6.0.7",
      typescript: "^5.7.3",
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      "@types/react": "^18.3.18",
      "@types/react-dom": "^18.3.5"
    },
    devDependencies: {}
  });

  await replaceInFile(path.join(projectRoot, "app", "src", "App.tsx"), {
    "Template Project": name,
    "template-project": slug
  });
  await replaceInFile(path.join(projectRoot, "README.md"), {
    "Template Project": name,
    "template-project": slug
  });

  await mkdir(path.join(projectRoot, "prompts"), { recursive: true });
  await writeFile(
    path.join(projectRoot, "prompts", "initial-request.md"),
    `# Initial Request\n\nRecord the creation request for ${name} here.\n`,
    "utf8"
  );

  await runPnpm(["sync:registry"]);
  console.log(`Created projects/${slug}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
