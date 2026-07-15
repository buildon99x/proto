import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { validateProjectMetadata, type ProjectMetadata } from "../packages/registry/src/schema";

export const repoRoot = process.cwd();
export const projectsDir = path.join(repoRoot, "projects");
export const launcherRunsDir = path.join(repoRoot, "launcher", "public", "runs");

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function readProjectMetadata(projectRoot: string): Promise<ProjectMetadata> {
  const metadataPath = path.join(projectRoot, "project.json");
  const raw = await readFile(metadataPath, "utf8");
  try {
    return validateProjectMetadata(JSON.parse(raw));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path.relative(repoRoot, metadataPath)}: ${message}`);
  }
}

export async function readAllProjects(): Promise<ProjectMetadata[]> {
  if (!existsSync(projectsDir)) {
    return [];
  }

  const entries = await readdir(projectsDir, { withFileTypes: true });
  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readProjectMetadata(path.join(projectsDir, entry.name)))
  );

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns the ISO-8601 committer date of the most recent commit that touched
 * `targetPath`, or null when git is unavailable, the path is untracked, or the
 * clone is too shallow to contain the relevant commit. Callers can fall back to
 * a previously computed value in that case.
 */
export function gitLastCommitISO(targetPath: string): string | null {
  const result = spawnSync(
    "git",
    ["log", "-1", "--format=%cI", "--", targetPath],
    { cwd: repoRoot, encoding: "utf8" }
  );

  if (result.status !== 0 || result.error) {
    return null;
  }

  const iso = result.stdout.trim();
  return iso === "" ? null : iso;
}

export async function copyDirectory(from: string, to: string): Promise<void> {
  await rm(to, { recursive: true, force: true });
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function runCommand(command: string, args: string[], cwd = repoRoot): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

export async function runPnpm(args: string[], cwd = repoRoot): Promise<void> {
  if (process.env.npm_execpath) {
    await runCommand(process.execPath, [process.env.npm_execpath, ...args], cwd);
    return;
  }

  await runCommand("corepack", ["pnpm", ...args], cwd);
}
